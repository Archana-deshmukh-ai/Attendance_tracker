from flask import Flask, jsonify, request, render_template, session, redirect, url_for, send_file
from flask_cors import CORS
import pandas as pd
import csv, os, random, string, hashlib, time, json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from functools import wraps
import sqlite3
import io

# CORRECTED Flask configuration
app = Flask(__name__, 
            template_folder='../frontend',    # HTML files
            static_folder='../frontend',      # ALL static files (CSS, JS, images)
            static_url_path='')               # Important!

app.secret_key = "attendance-atlas-secret-key"
CORS(app)

# FIXED: Correct file paths
DATA_DIR = os.path.join("Backend", "data")
DB_PATH = os.path.join(DATA_DIR, "institute.db")

# Add these constants for password reset
PASSWORD_RESET_FILE = os.path.join(DATA_DIR, "password_resets.json")
OTP_EXPIRY_MINUTES = 10

# Email configuration (Update with your email settings)
EMAIL_CONFIG = {
    'smtp_server': 'smtp.gmail.com',  # Change if using different provider
    'smtp_port': 587,
    'sender_email': 'your_email@gmail.com',  # Change to your email
    'sender_password': 'your_app_password',  # Use app password for Gmail
    'use_tls': True
}

# Add security-related constants
SECURITY_DIR = os.path.join(DATA_DIR, "security")
LOGIN_ATTEMPTS_FILE = os.path.join(SECURITY_DIR, "login_attempts.json")
ACCOUNT_LOCK_FILE = os.path.join(SECURITY_DIR, "account_locks.json")
SECURITY_CONFIG = {
    'max_login_attempts': 5,  # Maximum failed attempts before lock
    'lockout_duration': 15,   # Lockout duration in minutes
    'cooldown_period': 2,     # Cooldown between attempts in seconds
    'ip_block_threshold': 10, # Max attempts from same IP
    'ip_block_duration': 30,  # IP block duration in minutes
}

def get_db():
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")   # Enforce foreign keys
    return conn

def init_db():
    """Create all tables if they don't exist, and import from CSV if empty."""
    with get_db() as conn:
        # --- Students table ---
        conn.execute('''
            CREATE TABLE IF NOT EXISTS students (
                student_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                batch TEXT,
                department TEXT
            )
        ''')
        # --- Lecturers table ---
        conn.execute('''
            CREATE TABLE IF NOT EXISTS lecturers (
                lecturer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                department TEXT
            )
        ''')
        # --- Subjects table ---
        conn.execute('''
            CREATE TABLE IF NOT EXISTS subjects (
                subject_id INTEGER PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                credits INTEGER,
                department TEXT,
                lecturer_id TEXT,
                FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id)
            )
        ''')
        # --- Attendance table ---
        conn.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_id INTEGER NOT NULL,
                student_id TEXT NOT NULL,
                date TEXT NOT NULL,
                status TEXT CHECK(status IN ('present','absent','late')),
                marked_by TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(subject_id, student_id, date)
            )
        ''')
        conn.commit()

def import_csv_to_db():
    """If tables are empty, import data from existing CSV files."""
    # Check if students table is empty
    with get_db() as conn:
        cur = conn.execute("SELECT COUNT(*) as count FROM students")
        if cur.fetchone()['count'] == 0:
            # Import students.csv if it exists
            students_csv = os.path.join(DATA_DIR, "students.csv")
            if os.path.exists(students_csv):
                import pandas as pd
                df = pd.read_csv(students_csv)
                for _, row in df.iterrows():
                    conn.execute(
                        "INSERT OR IGNORE INTO students (student_id, name, email, password, batch, department) VALUES (?,?,?,?,?,?)",
                        (str(row['student_id']), row['name'], row['email'], row['password'], row.get('batch',''), row.get('department',''))
                    )
                conn.commit()
                print(f"Imported {len(df)} students from CSV.")

        cur = conn.execute("SELECT COUNT(*) as count FROM lecturers")
        if cur.fetchone()['count'] == 0:
            lecturers_csv = os.path.join(DATA_DIR, "lecturers.csv")
            if os.path.exists(lecturers_csv):
                df = pd.read_csv(lecturers_csv)
                for _, row in df.iterrows():
                    conn.execute(
                        "INSERT OR IGNORE INTO lecturers (lecturer_id, name, email, password, department) VALUES (?,?,?,?,?)",
                        (row['lecturer_id'], row['name'], row['email'], row['password'], row.get('department',''))
                    )
                conn.commit()
                print(f"Imported {len(df)} lecturers from CSV.")

        cur = conn.execute("SELECT COUNT(*) as count FROM subjects")
        if cur.fetchone()['count'] == 0:
            subjects_csv = os.path.join(DATA_DIR, "subjects.csv")
            if os.path.exists(subjects_csv):
                df = pd.read_csv(subjects_csv)
                for _, row in df.iterrows():
                    conn.execute(
                        "INSERT OR IGNORE INTO subjects (subject_id, code, name, credits, department, lecturer_id) VALUES (?,?,?,?,?,?)",
                        (row['subject_id'], row['code'], row['name'], row['credits'], row['department'], row.get('lecturer_id',''))
                    )
                conn.commit()
                print(f"Imported {len(df)} subjects from CSV.")

# ========== HTML PAGES ==========

@app.route('/')
def home_page():
    """Serve the home page HTML"""
    return render_template('index.html')

@app.route('/mark-attendance')
def mark_attendance_page():
    """Serve the mark attendance page HTML"""
    return render_template('mark_attendance.html')

@app.route('/report')
def report_page():
    """Serve the reports page HTML"""
    return render_template('report.html')

@app.route('/about')
def about_page():
    return render_template('about.html')

@app.route("/student-dashboard")
def student_dashboard():
    if not session.get("logged_in") or session.get("role") != "student":
        return redirect(url_for("home_page"))
    return render_template("student_dashboard.html")

@app.route("/lecturer-dashboard")
def lecturer_dashboard():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return redirect(url_for("home_page"))
    return render_template("lecturer_dashboard.html")

@app.route('/forgot-password')
def forgot_password_page():
    """Serve the forgot password page"""
    return render_template('forgot_password.html')

# ========== SECURITY DECORATORS ==========

def check_login_attempts(f):
    """Decorator to check and track login attempts"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        ip_address = request.remote_addr
        email = request.json.get('email') if request.is_json else None
        
        # Check if IP is blocked
        if is_ip_blocked(ip_address):
            return jsonify({
                "success": False,
                "message": "Too many failed attempts. Please try again later.",
                "blocked": True,
                "cooldown": get_ip_block_remaining(ip_address)
            }), 429
        
        # Check if account is locked
        if email and is_account_locked(email):
            return jsonify({
                "success": False,
                "message": "Account is temporarily locked due to too many failed attempts.",
                "locked": True,
                "unlock_time": get_account_unlock_time(email)
            }), 423
        
        # Check cooldown period
        if email and is_in_cooldown(email, ip_address):
            return jsonify({
                "success": False,
                "message": "Please wait before trying again.",
                "cooldown": True,
                "wait_time": SECURITY_CONFIG['cooldown_period']
            }), 429
        
        return f(*args, **kwargs)
    return decorated_function

# ========== SECURITY UTILITY FUNCTIONS ==========

def initialize_security_files():
    """Initialize security tracking files"""
    os.makedirs(SECURITY_DIR, exist_ok=True)
    
    if not os.path.exists(LOGIN_ATTEMPTS_FILE):
        with open(LOGIN_ATTEMPTS_FILE, 'w') as f:
            json.dump({}, f)
    
    if not os.path.exists(ACCOUNT_LOCK_FILE):
        with open(ACCOUNT_LOCK_FILE, 'w') as f:
            json.dump({}, f)

def record_login_attempt(email, ip_address, success=False):
    """Record a login attempt"""
    try:
        # Load existing attempts
        with open(LOGIN_ATTEMPTS_FILE, 'r') as f:
            attempts = json.load(f)
        
        current_time = datetime.now().isoformat()
        
        # Initialize records if they don't exist
        if email not in attempts:
            attempts[email] = {
                'attempts': [],
                'failed_count': 0,
                'last_attempt': None
            }
        
        # Record attempt
        attempt_record = {
            'timestamp': current_time,
            'ip': ip_address,
            'success': success
        }
        
        attempts[email]['attempts'].append(attempt_record)
        attempts[email]['last_attempt'] = current_time
        
        # Keep only last 20 attempts
        attempts[email]['attempts'] = attempts[email]['attempts'][-20:]
        
        # Update failed count
        if not success:
            attempts[email]['failed_count'] += 1
            
            # Check if account should be locked
            if attempts[email]['failed_count'] >= SECURITY_CONFIG['max_login_attempts']:
                lock_account(email, ip_address)
        else:
            # Reset failed count on successful login
            attempts[email]['failed_count'] = 0
            # Clear any existing lock
            clear_account_lock(email)
        
        # Track IP attempts
        if ip_address not in attempts:
            attempts[ip_address] = {'failed_attempts': 0}
        
        if not success:
            attempts[ip_address]['failed_attempts'] = attempts[ip_address].get('failed_attempts', 0) + 1
            
            # Check if IP should be blocked
            if attempts[ip_address]['failed_attempts'] >= SECURITY_CONFIG['ip_block_threshold']:
                block_ip(ip_address)
        else:
            # Reset IP failed attempts on success
            attempts[ip_address]['failed_attempts'] = 0
            clear_ip_block(ip_address)
        
        # Save attempts
        with open(LOGIN_ATTEMPTS_FILE, 'w') as f:
            json.dump(attempts, f, indent=2)
            
    except Exception as e:
        print(f"Error recording login attempt: {str(e)}")

def lock_account(email, ip_address):
    """Lock an account due to too many failed attempts"""
    try:
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        unlock_time = datetime.now() + timedelta(minutes=SECURITY_CONFIG['lockout_duration'])
        
        locks[email] = {
            'locked_at': datetime.now().isoformat(),
            'unlocks_at': unlock_time.isoformat(),
            'locked_by_ip': ip_address,
            'reason': 'too_many_failed_attempts'
        }
        
        with open(ACCOUNT_LOCK_FILE, 'w') as f:
            json.dump(locks, f, indent=2)
        
        # Log the lock event
        print(f"Account {email} locked until {unlock_time}")
        
    except Exception as e:
        print(f"Error locking account: {str(e)}")

def clear_account_lock(email):
    """Clear account lock (e.g., after successful login)"""
    try:
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        if email in locks:
            del locks[email]
            
        with open(ACCOUNT_LOCK_FILE, 'w') as f:
            json.dump(locks, f, indent=2)
            
    except Exception as e:
        print(f"Error clearing account lock: {str(e)}")

def is_account_locked(email):
    """Check if an account is locked"""
    try:
        if not os.path.exists(ACCOUNT_LOCK_FILE):
            return False
        
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        if email not in locks:
            return False
        
        lock_info = locks[email]
        unlock_time = datetime.fromisoformat(lock_info['unlocks_at'])
        
        if datetime.now() < unlock_time:
            return True
        else:
            # Lock has expired, clear it
            clear_account_lock(email)
            return False
            
    except Exception as e:
        print(f"Error checking account lock: {str(e)}")
        return False

def get_account_unlock_time(email):
    """Get remaining lock time for an account"""
    try:
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        if email in locks:
            unlock_time = datetime.fromisoformat(locks[email]['unlocks_at'])
            remaining = unlock_time - datetime.now()
            return max(0, int(remaining.total_seconds()))
        
        return 0
    except:
        return 0

def block_ip(ip_address):
    """Block an IP address"""
    try:
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        block_key = f"ip_{ip_address}"
        unblock_time = datetime.now() + timedelta(minutes=SECURITY_CONFIG['ip_block_duration'])
        
        locks[block_key] = {
            'blocked_at': datetime.now().isoformat(),
            'unblocks_at': unblock_time.isoformat(),
            'reason': 'too_many_failed_attempts'
        }
        
        with open(ACCOUNT_LOCK_FILE, 'w') as f:
            json.dump(locks, f, indent=2)
            
    except Exception as e:
        print(f"Error blocking IP: {str(e)}")

def clear_ip_block(ip_address):
    """Clear IP block"""
    try:
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        block_key = f"ip_{ip_address}"
        if block_key in locks:
            del locks[block_key]
            
        with open(ACCOUNT_LOCK_FILE, 'w') as f:
            json.dump(locks, f, indent=2)
            
    except Exception as e:
        print(f"Error clearing IP block: {str(e)}")

def is_ip_blocked(ip_address):
    """Check if IP is blocked"""
    try:
        if not os.path.exists(ACCOUNT_LOCK_FILE):
            return False
        
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        block_key = f"ip_{ip_address}"
        if block_key not in locks:
            return False
        
        block_info = locks[block_key]
        unblock_time = datetime.fromisoformat(block_info['unblocks_at'])
        
        if datetime.now() < unblock_time:
            return True
        else:
            # Block has expired, clear it
            clear_ip_block(ip_address)
            return False
            
    except Exception as e:
        print(f"Error checking IP block: {str(e)}")
        return False

def get_ip_block_remaining(ip_address):
    """Get remaining block time for IP"""
    try:
        with open(ACCOUNT_LOCK_FILE, 'r') as f:
            locks = json.load(f)
        
        block_key = f"ip_{ip_address}"
        if block_key in locks:
            unblock_time = datetime.fromisoformat(locks[block_key]['unblocks_at'])
            remaining = unblock_time - datetime.now()
            return max(0, int(remaining.total_seconds()))
        
        return 0
    except:
        return 0

def is_in_cooldown(email, ip_address):
    """Check if user/IP is in cooldown period"""
    try:
        if not os.path.exists(LOGIN_ATTEMPTS_FILE):
            return False
        
        with open(LOGIN_ATTEMPTS_FILE, 'r') as f:
            attempts = json.load(f)
        
        # Check email cooldown
        if email in attempts and attempts[email].get('last_attempt'):
            last_attempt = datetime.fromisoformat(attempts[email]['last_attempt'])
            time_since = (datetime.now() - last_attempt).total_seconds()
            
            if time_since < SECURITY_CONFIG['cooldown_period']:
                return True
        
        # Check IP cooldown
        if ip_address in attempts and attempts[ip_address].get('last_attempt'):
            last_attempt = datetime.fromisoformat(attempts[ip_address].get('last_attempt', datetime.now().isoformat()))
            time_since = (datetime.now() - last_attempt).total_seconds()
            
            if time_since < SECURITY_CONFIG['cooldown_period']:
                return True
        
        return False
        
    except Exception as e:
        print(f"Error checking cooldown: {str(e)}")
        return False

def get_failed_attempts_count(email, ip_address):
    """Get number of recent failed attempts"""
    try:
        if not os.path.exists(LOGIN_ATTEMPTS_FILE):
            return {'email': 0, 'ip': 0}
        
        with open(LOGIN_ATTEMPTS_FILE, 'r') as f:
            attempts = json.load(f)
        
        email_attempts = attempts.get(email, {}).get('failed_count', 0)
        ip_attempts = attempts.get(ip_address, {}).get('failed_attempts', 0)
        
        return {
            'email': email_attempts,
            'ip': ip_attempts
        }
        
    except Exception as e:
        print(f"Error getting failed attempts: {str(e)}")
        return {'email': 0, 'ip': 0}

# ========== AUTH ENDPOINTS ==========

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    role = data["role"]

    try:
        with get_db() as conn:
            if role == "student":
                conn.execute('''
                    INSERT INTO students (student_id, name, email, password, batch, department)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    data.get("student_id", ""),
                    data["name"],
                    data["email"],
                    data["password"],
                    data.get("batch", ""),
                    data.get("department", "")
                ))
            else:  # lecturer
                conn.execute('''
                    INSERT INTO lecturers (lecturer_id, name, email, password, department)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    data.get("lecturer_id", ""),
                    data["name"],
                    data["email"],
                    data["password"],
                    data.get("department", "")
                ))
            conn.commit()
        return jsonify(success=True, message="Account created successfully")
    except sqlite3.IntegrityError as e:
        return jsonify(success=False, message="Email or ID already exists"), 400
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

@app.route("/login", methods=["POST"])
@check_login_attempts
def login():
    data = request.json
    role = data["role"]
    email = data["email"]
    password = data["password"]
    ip_address = request.remote_addr

    print(f"Login attempt - Role: {role}, Email: {email}, IP: {ip_address}")

    try:
        with get_db() as conn:
            if role == "student":
                row = conn.execute(
                    "SELECT * FROM students WHERE email = ? AND password = ?",
                    (email, password)
                ).fetchone()
            else:
                row = conn.execute(
                    "SELECT * FROM lecturers WHERE email = ? AND password = ?",
                    (email, password)
                ).fetchone()

            if row:
                # Successful login
                clear_account_lock(email)
                clear_ip_block(ip_address)
                record_login_attempt(email, ip_address, success=True)

                # Convert row to dict
                user = dict(row)

                session["logged_in"] = True
                session["email"] = user["email"]
                session["role"] = role
                session["name"] = user["name"]
                session["login_time"] = datetime.now().isoformat()
                session["ip_address"] = ip_address

                if role == "student":
                    session["student_id"] = user["student_id"]
                    session["rollno"] = user["student_id"]
                else:
                    session["lecturer_id"] = user["lecturer_id"]
                    session["empid"] = user["lecturer_id"]

                print(f"Login successful for {user['name']}")
                return jsonify({"success": True, "role": role})

            # Failed login
            record_login_attempt(email, ip_address, success=False)
            failed_attempts = get_failed_attempts_count(email, ip_address)
            remaining_attempts = SECURITY_CONFIG['max_login_attempts'] - failed_attempts['email']

            if remaining_attempts <= 0:
                return jsonify({
                    "success": False,
                    "message": "Account locked due to too many failed attempts.",
                    "locked": True,
                    "unlock_time": get_account_unlock_time(email)
                }), 423

            return jsonify({
                "success": False,
                "message": f"Invalid credentials. {remaining_attempts} attempts remaining.",
                "remaining_attempts": remaining_attempts
            }), 401

    except Exception as e:
        print(f"Login error: {str(e)}")
        record_login_attempt(email, ip_address, success=False)
        return jsonify(success=False, message="Database error"), 500

@app.route("/logout")
def logout():
    session.clear()
    return render_template("logout.html")       #goes to logout.html

# ========== PASSWORD RESET ENDPOINTS ==========

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset OTP to email (using database)"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400
        
        # Check if email exists in students or lecturers using database
        user = None
        role = None
        
        with get_db() as conn:
            # Check students
            student = conn.execute("SELECT * FROM students WHERE email = ?", (email,)).fetchone()
            if student:
                user = dict(student)
                role = 'student'
            else:
                # Check lecturers
                lecturer = conn.execute("SELECT * FROM lecturers WHERE email = ?", (email,)).fetchone()
                if lecturer:
                    user = dict(lecturer)
                    role = 'lecturer'
        
        if not user:
            # For security, don't reveal that email doesn't exist
            return jsonify({"success": True, "message": "If email exists, reset instructions will be sent"})
        
        # Generate 6-digit OTP
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Store OTP with expiry
        reset_data = {
            'email': email,
            'otp': otp,
            'role': role,
            'created_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat(),
            'used': False
        }
        
        # Load existing resets
        resets = []
        if os.path.exists(PASSWORD_RESET_FILE):
            with open(PASSWORD_RESET_FILE, 'r') as f:
                resets = json.load(f)
        
        # Remove old resets for this email
        resets = [r for r in resets if r['email'] != email or r['used']]
        
        # Add new reset
        resets.append(reset_data)
        
        # Save resets
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)
        
        # Send email (in production)
        if send_reset_email(email, otp, user.get('name', 'User')):
            return jsonify({
                "success": True,
                "message": "Reset instructions sent to your email",
                "email": email  # Return email for frontend
            })
        else:
            # For development/demo, return OTP directly
            return jsonify({
                "success": True,
                "message": f"Demo: OTP for {email} is {otp}",
                "otp": otp,  # Only for development!
                "email": email
            })
            
    except Exception as e:
        print(f"Forgot password error: {str(e)}")
        return jsonify({"success": False, "message": "Error processing request"}), 500

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP for password reset"""
    try:
        data = request.json
        email = data.get('email')
        otp = data.get('otp')
        
        if not email or not otp:
            return jsonify({"success": False, "message": "Email and OTP are required"}), 400
        
        # Load resets
        if not os.path.exists(PASSWORD_RESET_FILE):
            return jsonify({"success": False, "message": "No reset request found"}), 400
        
        with open(PASSWORD_RESET_FILE, 'r') as f:
            resets = json.load(f)
        
        # Find matching reset
        current_time = datetime.now()
        valid_reset = None
        
        for reset in resets:
            if (reset['email'] == email and 
                reset['otp'] == otp and 
                not reset['used'] and
                datetime.fromisoformat(reset['expires_at']) > current_time):
                valid_reset = reset
                break
        
        if not valid_reset:
            return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400
        
        # Mark OTP as used
        valid_reset['verified_at'] = current_time.isoformat()
        valid_reset['verified'] = True
        
        # Save updated resets
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)
        
        return jsonify({
            "success": True,
            "message": "OTP verified successfully",
            "email": email,
            "role": valid_reset['role']
        })
        
    except Exception as e:
        print(f"Verify OTP error: {str(e)}")
        return jsonify({"success": False, "message": "Error verifying OTP"}), 500

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        email = data.get('email')
        new_password = data.get('newPassword')

        if not email or not new_password:
            return jsonify({"success": False, "message": "Email and new password are required"}), 400

        if len(new_password) < 8:
            return jsonify({"success": False, "message": "Password must be at least 8 characters"}), 400

        # Load resets to check if OTP was verified
        if not os.path.exists(PASSWORD_RESET_FILE):
            return jsonify({"success": False, "message": "No reset request found"}), 400

        with open(PASSWORD_RESET_FILE, 'r') as f:
            resets = json.load(f)

        verified_reset = None
        for reset in resets:
            if (reset['email'] == email and
                reset.get('verified') and
                not reset.get('password_reset')):
                verified_reset = reset
                break

        if not verified_reset:
            return jsonify({"success": False, "message": "Please verify OTP first"}), 400

        role = verified_reset['role']

        # Update password in database
        with get_db() as conn:
            if role == 'student':
                conn.execute(
                    "UPDATE students SET password = ? WHERE email = ?",
                    (new_password, email)
                )
            else:
                conn.execute(
                    "UPDATE lecturers SET password = ? WHERE email = ?",
                    (new_password, email)
                )
            conn.commit()

        # Mark as reset
        verified_reset['password_reset'] = True
        verified_reset['reset_at'] = datetime.now().isoformat()
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)

        send_password_changed_email(email)
        return jsonify({"success": True, "message": "Password reset successfully"})

    except Exception as e:
        print(f"Reset password error: {str(e)}")
        return jsonify({"success": False, "message": "Error resetting password"}), 500

@app.route('/api/resend-otp', methods=['POST'])
def resend_otp():
    """Resend OTP for password reset"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400
        
        # Generate new OTP
        otp = ''.join(random.choices(string.digits, k=6))
        
        # Load resets
        resets = []
        if os.path.exists(PASSWORD_RESET_FILE):
            with open(PASSWORD_RESET_FILE, 'r') as f:
                resets = json.load(f)
        
        # Update existing reset or create new
        updated = False
        for reset in resets:
            if reset['email'] == email and not reset['used']:
                reset['otp'] = otp
                reset['created_at'] = datetime.now().isoformat()
                reset['expires_at'] = (datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()
                updated = True
                break
        
        if not updated:
            # Create new reset (user should go through forgot-password first)
            return jsonify({"success": False, "message": "Please request password reset first"}), 400
        
        # Save updated resets
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)
        
        # Send email
        if send_reset_email(email, otp, "User"):
            return jsonify({
                "success": True,
                "message": "New OTP sent to your email"
            })
        else:
            # For development
            return jsonify({
                "success": True,
                "message": f"Demo: New OTP for {email} is {otp}",
                "otp": otp  # Only for development!
            })
            
    except Exception as e:
        print(f"Resend OTP error: {str(e)}")
        return jsonify({"success": False, "message": "Error resending OTP"}), 500

# ========== NEW SECURITY ENDPOINTS ==========

@app.route("/api/security/login-attempts", methods=["GET"])
def get_login_attempts():
    """Get login attempts for the current user (admin/self view)"""
    if not session.get("logged_in"):
        return jsonify({"success": False, "message": "Not logged in"}), 401
    
    email = session.get("email")
    
    try:
        if not os.path.exists(LOGIN_ATTEMPTS_FILE):
            return jsonify({"success": True, "attempts": []})
        
        with open(LOGIN_ATTEMPTS_FILE, 'r') as f:
            attempts = json.load(f)
        
        user_attempts = attempts.get(email, {}).get('attempts', [])
        
        # Filter and format attempts (last 10 only)
        recent_attempts = []
        for attempt in user_attempts[-10:]:
            recent_attempts.append({
                'timestamp': attempt.get('timestamp', ''),
                'ip': attempt.get('ip', ''),
                'success': attempt.get('success', False),
                'time_ago': get_time_ago(attempt.get('timestamp', ''))
            })
        
        return jsonify({
            "success": True,
            "attempts": recent_attempts,
            "total_attempts": len(user_attempts)
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/security/check-lock", methods=["POST"])
def check_account_lock():
    """Check if an account is locked (for forgot password, etc.)"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
    
    locked = is_account_locked(email)
    
    if locked:
        unlock_time = get_account_unlock_time(email)
        return jsonify({
            "success": False,
            "locked": True,
            "message": "Account is temporarily locked",
            "unlock_in": unlock_time,
            "unlock_time": (datetime.now() + timedelta(seconds=unlock_time)).isoformat()
        }), 423
    
    return jsonify({
        "success": True,
        "locked": False,
        "message": "Account is not locked"
    })

@app.route("/api/security/unlock-request", methods=["POST"])
def request_account_unlock():
    """Request account unlock via email"""
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400
    
    # Check if account is actually locked
    if not is_account_locked(email):
        return jsonify({
            "success": True,
            "message": "Account is not locked"
        })
    
    # Generate unlock token
    unlock_token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    
    # Store unlock request
    unlock_requests = {}
    unlock_file = os.path.join(SECURITY_DIR, "unlock_requests.json")
    
    if os.path.exists(unlock_file):
        with open(unlock_file, 'r') as f:
            unlock_requests = json.load(f)
    
    unlock_requests[unlock_token] = {
        'email': email,
        'created_at': datetime.now().isoformat(),
        'expires_at': (datetime.now() + timedelta(hours=1)).isoformat(),
        'used': False
    }
    
    with open(unlock_file, 'w') as f:
        json.dump(unlock_requests, f, indent=2)
    
    # Send unlock email
    send_unlock_email(email, unlock_token)
    
    return jsonify({
        "success": True,
        "message": "Unlock instructions sent to your email"
    })

@app.route("/api/security/unlock-account/<token>", methods=["POST"])
def unlock_account(token):
    """Unlock account using token"""
    unlock_file = os.path.join(SECURITY_DIR, "unlock_requests.json")
    
    if not os.path.exists(unlock_file):
        return jsonify({"success": False, "message": "Invalid token"}), 400
    
    with open(unlock_file, 'r') as f:
        unlock_requests = json.load(f)
    
    if token not in unlock_requests:
        return jsonify({"success": False, "message": "Invalid token"}), 400
    
    request_data = unlock_requests[token]
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(request_data['expires_at'])
    if datetime.now() > expires_at:
        del unlock_requests[token]
        with open(unlock_file, 'w') as f:
            json.dump(unlock_requests, f, indent=2)
        return jsonify({"success": False, "message": "Token has expired"}), 400
    
    # Check if token already used
    if request_data['used']:
        return jsonify({"success": False, "message": "Token already used"}), 400
    
    # Unlock the account
    email = request_data['email']
    clear_account_lock(email)
    
    # Mark token as used
    unlock_requests[token]['used'] = True
    unlock_requests[token]['used_at'] = datetime.now().isoformat()
    
    with open(unlock_file, 'w') as f:
        json.dump(unlock_requests, f, indent=2)
    
    return jsonify({
        "success": True,
        "message": "Account unlocked successfully"
    })

# ========== EMAIL FUNCTIONS ==========

def send_reset_email(to_email, otp, name):
    """Send password reset email with OTP"""
    try:
        # Email content
        subject = "Attendance Atlas - Password Reset"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #102094; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #102094; text-align: center; margin: 20px 0; letter-spacing: 10px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
                .button {{ display: inline-block; background-color: #102094; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Attendance Atlas</h1>
                    <h2>Password Reset</h2>
                </div>
                <div class="content">
                    <p>Hello {name},</p>
                    <p>You have requested to reset your password for Attendance Atlas.</p>
                    <p>Use the following OTP code to verify your identity:</p>
                    
                    <div class="otp-code">{otp}</div>
                    
                    <p>This code will expire in {OTP_EXPIRY_MINUTES} minutes.</p>
                    
                    <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
                    
                    <p>Best regards,<br>
                    <strong>Attendance Atlas Team</strong></p>
                </div>
                <div class="footer">
                    <p>© 2026 Attendance Atlas. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # For development: print email instead of sending
        print(f"\n{'='*50}")
        print(f"Password Reset Email to: {to_email}")
        print(f"OTP: {otp}")
        print(f"Name: {name}")
        print(f"{'='*50}\n")
        
        # In production, uncomment and configure email sending
        """
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = EMAIL_CONFIG['sender_email']
        msg['To'] = to_email
        
        # Attach HTML content
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            if EMAIL_CONFIG['use_tls']:
                server.starttls()
            server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
            server.send_message(msg)
        """
        
        return True
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

def send_password_changed_email(to_email):
    """Send confirmation email for password change"""
    try:
        subject = "Attendance Atlas - Password Changed Successfully"
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
                .success-icon { font-size: 60px; color: #10b981; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Password Changed</h1>
                </div>
                <div class="content">
                    <div class="success-icon">✓</div>
                    <h2>Password Updated Successfully</h2>
                    <p>Your Attendance Atlas password has been reset successfully.</p>
                    <p>You can now login with your new password.</p>
                    <p>If you did not make this change, please contact our support team immediately.</p>
                    
                    <p>Best regards,<br>
                    <strong>Attendance Atlas Team</strong></p>
                </div>
                <div class="footer">
                    <p>© 2026 Attendance Atlas. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        print(f"\n{'='*50}")
        print(f"Password Changed Confirmation sent to: {to_email}")
        print(f"{'='*50}\n")
        
        # In production, add email sending code here
        
        return True
        
    except Exception as e:
        print(f"Error sending confirmation email: {str(e)}")
        return False

def send_unlock_email(email, token):
    """Send account unlock email"""
    try:
        unlock_url = f"http://localhost:5000/unlock-account/{token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #102094; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }}
                .unlock-btn {{ display: inline-block; background-color: #102094; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔓 Account Unlock Request</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to unlock your Attendance Atlas account.</p>
                    <p>Click the button below to unlock your account:</p>
                    
                    <div style="text-align: center;">
                        <a href="{unlock_url}" class="unlock-btn">Unlock My Account</a>
                    </div>
                    
                    <p>Or copy and paste this link in your browser:</p>
                    <p style="word-break: break-all; color: #102094;">{unlock_url}</p>
                    
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request this unlock, please ignore this email.</p>
                    
                    <p>Best regards,<br>
                    <strong>Attendance Atlas Security Team</strong></p>
                </div>
                <div class="footer">
                    <p>© 2026 Attendance Atlas. All rights reserved.</p>
                    <p>This is an automated security message.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        print(f"\n{'='*50}")
        print(f"Account Unlock Email to: {email}")
        print(f"Unlock URL: {unlock_url}")
        print(f"{'='*50}\n")
        
        return True
        
    except Exception as e:
        print(f"Error sending unlock email: {str(e)}")
        return False

# ========== HELPER FUNCTIONS ==========

def get_time_ago(timestamp_str):
    """Convert timestamp to human-readable time ago"""
    try:
        timestamp = datetime.fromisoformat(timestamp_str)
        now = datetime.now()
        diff = now - timestamp
        
        if diff.days > 0:
            return f"{diff.days} day(s) ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour(s) ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute(s) ago"
        else:
            return "Just now"
    except:
        return "Unknown time"

# ========== GENERAL API ENDPOINTS ==========

@app.route('/api/health')
def health():
    return jsonify({"status": "running", "version": "1.0"})

@app.route('/api/students')
def get_students():
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM students").fetchall()
            students = [dict(row) for row in rows]
            return jsonify({"success": True, "count": len(students), "students": students})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturers')
def get_lecturers():
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM lecturers").fetchall()
            lecturers = [dict(row) for row in rows]
            return jsonify({"success": True, "count": len(lecturers), "lecturers": lecturers})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/subjects')
def get_subjects():
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM subjects").fetchall()
            subjects = [dict(row) for row in rows]
            return jsonify({"success": True, "count": len(subjects), "subjects": subjects})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/login-status")
def login_status():
    if session.get("logged_in"):
        return jsonify(
            logged_in=True,
            name=session.get("name"),
            role=session.get("role"),
            email=session.get("email"),
            student_id=session.get("student_id"),
            lecturer_id=session.get("lecturer_id"),
            login_time=session.get("login_time"),
            ip_address=session.get("ip_address")
        )
    return jsonify(logged_in=False)

# ========== ATTENDANCE ENDPOINTS ==========

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    """Record attendance using SQLite."""
    try:
        data = request.json
        subject_id = data.get('subject_id')
        date = data.get('date')
        present_ids = data.get('present', [])
        absent_ids = data.get('absent', [])
        lecturer_id = session.get('lecturer_id')   # who is marking

        if not subject_id or not date:
            return jsonify({"success": False, "error": "subject_id and date are required"}), 400

        conn = get_db()
        cursor = conn.cursor()
        try:
            # Insert present students
            for student_id in present_ids:
                cursor.execute(
                    '''INSERT OR REPLACE INTO attendance 
                       (subject_id, student_id, date, status, marked_by) 
                       VALUES (?, ?, ?, ?, ?)''',
                    (subject_id, student_id, date, 'present', lecturer_id)
                )
            # Insert absent students
            for student_id in absent_ids:
                cursor.execute(
                    '''INSERT OR REPLACE INTO attendance 
                       (subject_id, student_id, date, status, marked_by) 
                       VALUES (?, ?, ?, ?, ?)''',
                    (subject_id, student_id, date, 'absent', lecturer_id)
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            return jsonify({"success": False, "error": str(e)}), 500
        finally:
            conn.close()

        return jsonify({
            "success": True,
            "message": f"Attendance recorded for {len(present_ids) + len(absent_ids)} students",
            "present_count": len(present_ids),
            "absent_count": len(absent_ids)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/attendance')
def get_attendance():
    """Get all attendance records from SQLite."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM attendance ORDER BY date DESC, subject_id')
        rows = cursor.fetchall()
        # Convert rows to list of dicts
        attendance_list = [dict(row) for row in rows]
        conn.close()
        return jsonify({
            "success": True,
            "count": len(attendance_list),
            "attendance": attendance_list
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== NEW LECTURER-SPECIFIC ENDPOINTS =================

@app.route('/api/lecturer/profile')
def lecturer_profile():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    lecturer_id = session.get("lecturer_id")
    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT lecturer_id, name, email, department FROM lecturers WHERE lecturer_id = ?",
                (lecturer_id,)
            ).fetchone()
            if not row:
                return jsonify({"success": False, "message": "Lecturer not found"}), 404

            lecturer = dict(row)
            lecturer['last_login'] = session.get('login_time', datetime.now().isoformat())
            return jsonify(lecturer)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/statistics')
def lecturer_statistics():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    lecturer_id = session.get("lecturer_id")
    period = request.args.get('period', 'week')

    try:
        with get_db() as conn:
            # Total subjects taught by this lecturer
            total_subjects = conn.execute(
                "SELECT COUNT(*) as cnt FROM subjects WHERE lecturer_id = ?",
                (lecturer_id,)
            ).fetchone()['cnt']

            # Total students (distinct) across all subjects taught
            total_students = conn.execute("""
                SELECT COUNT(DISTINCT student_id) as cnt 
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                WHERE s.lecturer_id = ?
            """, (lecturer_id,)).fetchone()['cnt'] or 0

            # Today's attendance percentage
            today = datetime.now().strftime('%Y-%m-%d')
            today_stats = conn.execute("""
                SELECT 
                    COUNT(CASE WHEN status='present' THEN 1 END) as present,
                    COUNT(*) as total
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                WHERE s.lecturer_id = ? AND a.date = ?
            """, (lecturer_id, today)).fetchone()
            today_attendance = round((today_stats['present'] / today_stats['total'] * 100) if today_stats['total'] > 0 else 0, 1)

            # Average attendance overall
            overall_stats = conn.execute("""
                SELECT 
                    COUNT(CASE WHEN status='present' THEN 1 END) as present,
                    COUNT(*) as total
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                WHERE s.lecturer_id = ?
            """, (lecturer_id,)).fetchone()
            avg_attendance = round((overall_stats['present'] / overall_stats['total'] * 100) if overall_stats['total'] > 0 else 0, 1)

            # Mock changes (you can compute actual differences later)
            student_change = 5
            attendance_change = 2
            subjects_status = "All active"
            performance_status = "Meeting target"

            return jsonify({
                "total_students": total_students,
                "today_attendance": today_attendance,
                "total_subjects": total_subjects,
                "average_attendance": avg_attendance,
                "student_change": student_change,
                "attendance_change": attendance_change,
                "subjects_status": subjects_status,
                "performance_status": performance_status
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/subjects')
def lecturer_subjects():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    lecturer_id = session.get("lecturer_id")
    try:
        with get_db() as conn:
            rows = conn.execute(
                "SELECT subject_id, code, name, credits FROM subjects WHERE lecturer_id = ?",
                (lecturer_id,)
            ).fetchall()

            subjects = []
            for row in rows:
                subj = dict(row)
                # Count students enrolled (distinct) for this subject
                student_count = conn.execute(
                    "SELECT COUNT(DISTINCT student_id) as cnt FROM attendance WHERE subject_id = ?",
                    (subj['subject_id'],)
                ).fetchone()['cnt'] or 0

                # Total classes conducted (distinct dates) for this subject
                classes_count = conn.execute(
                    "SELECT COUNT(DISTINCT date) as cnt FROM attendance WHERE subject_id = ?",
                    (subj['subject_id'],)
                ).fetchone()['cnt'] or 0

                # Average attendance for this subject
                att_stats = conn.execute(
                    "SELECT COUNT(CASE WHEN status='present' THEN 1 END) as present, COUNT(*) as total FROM attendance WHERE subject_id = ?",
                    (subj['subject_id'],)
                ).fetchone()
                avg_att = round((att_stats['present'] / att_stats['total'] * 100) if att_stats['total'] > 0 else 0, 1)

                subj['students'] = student_count
                subj['classes'] = classes_count
                subj['attendance'] = avg_att
                subj['description'] = f"{subj['code']} - {subj['name']}"
                subjects.append(subj)

            return jsonify({"subjects": subjects})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/schedule')
def lecturer_schedule():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    date = request.args.get('date')
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')

    lecturer_id = session.get("lecturer_id")
    try:
        with get_db() as conn:
            # Get subjects taught by this lecturer
            subjects = conn.execute(
                "SELECT subject_id, code, name FROM subjects WHERE lecturer_id = ?",
                (lecturer_id,)
            ).fetchall()

            schedule = []
            for subj in subjects:
                # For each subject, we need to know if there's a class on that date (i.e., attendance recorded)
                # For demo, we'll generate a fixed time slot based on subject_id
                class_time = f"{8 + (subj['subject_id'] % 8)}:00"  # mock hour
                room = f"Room {100 + subj['subject_id']}"
                batch = "2024"  # placeholder
                in_progress = False  # you can compute based on current time

                schedule.append({
                    "subject": subj['name'],
                    "code": subj['code'],
                    "time": f"{date}T{class_time}:00",
                    "room": room,
                    "batch": batch,
                    "in_progress": in_progress
                })

            return jsonify({"schedule": schedule})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/activity')
def lecturer_activity():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    lecturer_id = session.get("lecturer_id")
    try:
        with get_db() as conn:
            # Recent attendance markings by this lecturer
            rows = conn.execute("""
                SELECT a.timestamp, s.name as subject_name, COUNT(*) as students_marked
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                WHERE a.marked_by = ?
                GROUP BY a.timestamp, s.name
                ORDER BY a.timestamp DESC
                LIMIT 10
            """, (lecturer_id,)).fetchall()

            activities = []
            for row in rows:
                activities.append({
                    "type": "attendance",
                    "description": f"Marked attendance for {row['students_marked']} students in {row['subject_name']}",
                    "timestamp": row['timestamp']
                })

            # If no activities yet, add some mock ones
            if not activities:
                activities = [
                    {"type": "attendance", "description": "Marked attendance for Data Structures (32 students)", "timestamp": (datetime.now() - timedelta(hours=2)).isoformat()},
                    {"type": "attendance", "description": "Marked attendance for Algorithms (28 students)", "timestamp": (datetime.now() - timedelta(hours=5)).isoformat()},
                    {"type": "report", "description": "Generated weekly report", "timestamp": (datetime.now() - timedelta(days=1)).isoformat()}
                ]

            return jsonify({"activities": activities})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/notifications')
def lecturer_notifications():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    try:
        # Mock notifications – replace with database table if needed
        notifications = [
            {"id": 1, "title": "New attendance deadline", "message": "Attendance for CS101 closes at 5 PM", "type": "deadline", "timestamp": (datetime.now() - timedelta(hours=1)).isoformat(), "unread": True},
            {"id": 2, "title": "System update", "message": "Scheduled maintenance on Sunday", "type": "system", "timestamp": (datetime.now() - timedelta(days=1)).isoformat(), "unread": False}
        ]
        return jsonify({"notifications": notifications})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/notifications/mark-read', methods=['POST'])
def mark_notifications_read():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    # In a real system you'd update a database
    return jsonify({"success": True})

@app.route('/api/lecturer/deadlines')
def lecturer_deadlines():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    try:
        deadlines = [
            {"id": 1, "title": "Submit grades", "description": "Final grades for CS101", "type": "report", "due_date": (datetime.now() + timedelta(days=2)).isoformat(), "priority": "high"},
            {"id": 2, "title": "Attendance entry", "description": "Mark attendance for Algorithms lab", "type": "attendance", "due_date": (datetime.now() + timedelta(hours=5)).isoformat(), "priority": "medium"}
        ]
        return jsonify({"deadlines": deadlines})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/chart-data')
def lecturer_chart_data():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    chart_type = request.args.get('type', 'weekly')
    lecturer_id = session.get("lecturer_id")

    try:
        with get_db() as conn:
            if chart_type == 'weekly':
                # Last 7 days attendance percentage
                labels = []
                values = []
                for i in range(6, -1, -1):
                    day = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
                    labels.append((datetime.now() - timedelta(days=i)).strftime('%a'))
                    stats = conn.execute("""
                        SELECT 
                            COUNT(CASE WHEN status='present' THEN 1 END) as present,
                            COUNT(*) as total
                        FROM attendance a
                        JOIN subjects s ON a.subject_id = s.subject_id
                        WHERE s.lecturer_id = ? AND a.date = ?
                    """, (lecturer_id, day)).fetchone()
                    pct = round((stats['present'] / stats['total'] * 100) if stats['total'] > 0 else 0, 1)
                    values.append(pct)

                data = {
                    "labels": labels,
                    "values": values,
                    "label": "Attendance % (Weekly)"
                }

            elif chart_type == 'subject':
                # Attendance per subject
                rows = conn.execute("""
                    SELECT s.name, 
                           COUNT(CASE WHEN a.status='present' THEN 1 END) as present,
                           COUNT(*) as total
                    FROM attendance a
                    JOIN subjects s ON a.subject_id = s.subject_id
                    WHERE s.lecturer_id = ?
                    GROUP BY s.subject_id
                """, (lecturer_id,)).fetchall()
                labels = []
                values = []
                for row in rows:
                    labels.append(row['name'])
                    pct = round((row['present'] / row['total'] * 100) if row['total'] > 0 else 0, 1)
                    values.append(pct)

                data = {
                    "labels": labels,
                    "values": values,
                    "label": "Attendance by Subject"
                }

            else:
                data = {"labels": [], "values": [], "label": "No data"}

            return jsonify(data)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/export')
def lecturer_export():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    lecturer_id = session.get("lecturer_id")
    try:
        with get_db() as conn:
            # Get all attendance records for this lecturer's subjects
            rows = conn.execute("""
                SELECT a.date, s.code as subject_code, s.name as subject_name,
                       st.student_id, st.name as student_name, a.status
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                JOIN students st ON a.student_id = st.student_id
                WHERE s.lecturer_id = ?
                ORDER BY a.date DESC, s.code
            """, (lecturer_id,)).fetchall()

            # Convert to CSV
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['Date', 'Subject Code', 'Subject Name', 'Student ID', 'Student Name', 'Status'])
            for row in rows:
                writer.writerow([row['date'], row['subject_code'], row['subject_name'], row['student_id'], row['student_name'], row['status']])

            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'attendance_export_{datetime.now().strftime("%Y%m%d")}.csv'
            )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== INITIALIZATION ==========

def initialize_data():
    """Initialize data directory, database, and import from CSVs."""
    os.makedirs(DATA_DIR, exist_ok=True)
    initialize_security_files()
    
    # Create database tables
    init_db()
    
    # Import existing CSV data (if any)
    import_csv_to_db()
    
    print(f"SQLite database initialized at: {DB_PATH}")

if __name__ == '__main__':
    # Initialize data files
    initialize_data()
    
    print("=" * 60)
    print("ATTENDANCE ATLAS SERVER STARTING...")
    print("=" * 60)
    print(f"Data directory: {DATA_DIR}")
    print(f"Database path: {DB_PATH}")
    print(f"Password reset file: {PASSWORD_RESET_FILE}")
    print(f"Security directory: {SECURITY_DIR}")
    print("=" * 60)
    print("\n🔐 SECURITY CONFIGURATION:")
    print(f"• Max login attempts: {SECURITY_CONFIG['max_login_attempts']}")
    print(f"• Lockout duration: {SECURITY_CONFIG['lockout_duration']} minutes")
    print(f"• Cooldown period: {SECURITY_CONFIG['cooldown_period']} seconds")
    print(f"• IP block threshold: {SECURITY_CONFIG['ip_block_threshold']} attempts")
    print(f"• IP block duration: {SECURITY_CONFIG['ip_block_duration']} minutes")
    print("=" * 60)
    print("\n👤 TEST CREDENTIALS:")
    print("Student: aarav.sharma@uni.edu / student@1001")
    print("Lecturer: rajesh.iyer@uni.edu / prof@201")
    print("\n🌐 ACCESS POINTS:")
    print("Home page: http://localhost:5000")
    print("Forgot Password: http://localhost:5000/forgot-password")
    print("API endpoints: http://localhost:5000/api/*")
    print("Security endpoints: http://localhost:5000/api/security/*")
    print("=" * 60)
    print("\n⚠️  SECURITY FEATURES ENABLED:")
    print("• Brute force protection with account lockout")
    print("• IP blocking after multiple failed attempts")
    print("• Cooldown period between login attempts")
    print("• Password reset with OTP verification")
    print("• Account unlock via email")
    print("• Login attempt tracking")
    print("=" * 60)
    
    app.run(debug=True, port=5000)