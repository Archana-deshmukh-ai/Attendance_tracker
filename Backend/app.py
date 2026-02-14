from flask import Flask, jsonify, request, render_template, session, redirect, url_for
from flask_cors import CORS
import pandas as pd
import csv, os, random, string, hashlib, time, json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from functools import wraps

# CORRECTED Flask configuration
app = Flask(__name__, 
            template_folder='../frontend',    # HTML files
            static_folder='../frontend',      # ALL static files (CSS, JS, images)
            static_url_path='')               # Important!

app.secret_key = "attendance-atlas-secret-key"
CORS(app)

# FIXED: Correct file paths
DATA_DIR = os.path.join("Backend", "data")
STUDENTS_FILE = os.path.join(DATA_DIR, "students.csv")
LECTURERS_FILE = os.path.join(DATA_DIR, "lecturers.csv")
SUBJECTS_FILE = os.path.join(DATA_DIR, "subjects.csv")
ATTENDANCE_FILE = os.path.join(DATA_DIR, "attendance.csv")

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

    file_path = STUDENTS_FILE if role == "student" else LECTURERS_FILE
    file_exists = os.path.isfile(file_path)

    with open(file_path, "a", newline="") as f:
        writer = csv.writer(f)

        if not file_exists:
            if role == "student":
                writer.writerow(["student_id", "name", "email", "password", "batch", "department"])
            else:
                writer.writerow(["lecturer_id", "name", "email", "password", "department"])

        if role == "student":
            writer.writerow([
                data.get("student_id", ""),
                data["name"], 
                data["email"], 
                data["password"], 
                data.get("batch", ""),
                data.get("department", "")
            ])
        else:
            writer.writerow([
                data.get("lecturer_id", ""),
                data["name"], 
                data["email"], 
                data["password"], 
                data.get("department", "")
            ])

    return jsonify(success=True, message="Account created successfully")

@app.route("/login", methods=["POST"])
@check_login_attempts
def login():
    """Login endpoint with brute force protection"""
    data = request.json
    role = data["role"]
    email = data["email"]
    password = data["password"]
    ip_address = request.remote_addr
    
    print(f"Login attempt - Role: {role}, Email: {email}, IP: {ip_address}")
    
    file_path = STUDENTS_FILE if role == "student" else LECTURERS_FILE
    
    # Check if file exists
    if not os.path.isfile(file_path):
        # Record failed attempt (even if user doesn't exist for security)
        record_login_attempt(email, ip_address, success=False)
        return jsonify(success=False, message="Invalid credentials"), 401
    
    try:
        with open(file_path, "r") as f:
            reader = csv.DictReader(f)
            users = list(reader)
            
            for row in users:
                if 'email' in row and 'password' in row:
                    if row["email"] == email and row["password"] == password:
                        # ✅ SUCCESSFUL LOGIN
                        
                        # Clear any locks or blocks
                        clear_account_lock(email)
                        clear_ip_block(ip_address)
                        
                        # Record successful attempt
                        record_login_attempt(email, ip_address, success=True)
                        
                        # Store session info
                        session["logged_in"] = True
                        session["email"] = row["email"]
                        session["role"] = role
                        session["name"] = row["name"]
                        session["login_time"] = datetime.now().isoformat()
                        session["ip_address"] = ip_address
                        
                        if role == "student":
                            session["student_id"] = row.get("student_id", "")
                            session["rollno"] = row.get("student_id", "")
                        else:
                            session["lecturer_id"] = row.get("lecturer_id", "")
                            session["empid"] = row.get("lecturer_id", "")
                        
                        print(f"Login successful for {row['name']}")
                        
                        # Return additional security info
                        failed_attempts = get_failed_attempts_count(email, ip_address)
                        
                        return jsonify({
                            "success": True, 
                            "role": role,
                            "security": {
                                "previous_failed_attempts": failed_attempts['email'],
                                "message": "Login successful"
                            }
                        })
        
        # ❌ FAILED LOGIN (wrong password)
        record_login_attempt(email, ip_address, success=False)
        
        # Get current attempt count
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
        print(f"Error reading CSV: {str(e)}")
        record_login_attempt(email, ip_address, success=False)
        return jsonify(success=False, message=f"Error reading user data: {str(e)}"), 500

@app.route("/logout")
def logout():
    session.clear()
    return render_template("logout.html")

# ========== PASSWORD RESET ENDPOINTS ==========

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset OTP to email"""
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400
        
        # Check if email exists in students or lecturers
        user = None
        role = None
        
        # Check students
        if os.path.exists(STUDENTS_FILE):
            df_students = pd.read_csv(STUDENTS_FILE)
            student = df_students[df_students['email'] == email]
            if not student.empty:
                user = student.iloc[0].to_dict()
                role = 'student'
        
        # Check lecturers
        if not user and os.path.exists(LECTURERS_FILE):
            df_lecturers = pd.read_csv(LECTURERS_FILE)
            lecturer = df_lecturers[df_lecturers['email'] == email]
            if not lecturer.empty:
                user = lecturer.iloc[0].to_dict()
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
    """Reset password with new password"""
    try:
        data = request.json
        email = data.get('email')
        new_password = data.get('newPassword')
        
        if not email or not new_password:
            return jsonify({"success": False, "message": "Email and new password are required"}), 400
        
        # Validate password strength
        if len(new_password) < 8:
            return jsonify({"success": False, "message": "Password must be at least 8 characters"}), 400
        
        # Load resets to check if OTP was verified
        if not os.path.exists(PASSWORD_RESET_FILE):
            return jsonify({"success": False, "message": "No reset request found"}), 400
        
        with open(PASSWORD_RESET_FILE, 'r') as f:
            resets = json.load(f)
        
        # Find verified reset
        verified_reset = None
        for reset in resets:
            if (reset['email'] == email and 
                reset.get('verified') and 
                not reset.get('password_reset')):
                verified_reset = reset
                break
        
        if not verified_reset:
            return jsonify({"success": False, "message": "Please verify OTP first"}), 400
        
        # Determine which file to update
        role = verified_reset['role']
        file_path = STUDENTS_FILE if role == 'student' else LECTURERS_FILE
        
        if not os.path.exists(file_path):
            return jsonify({"success": False, "message": "User data file not found"}), 500
        
        # Update password in CSV
        if role == 'student':
            df = pd.read_csv(STUDENTS_FILE)
            if email not in df['email'].values:
                return jsonify({"success": False, "message": "User not found"}), 404
            df.loc[df['email'] == email, 'password'] = new_password
            df.to_csv(STUDENTS_FILE, index=False)
        else:
            df = pd.read_csv(LECTURERS_FILE)
            if email not in df['email'].values:
                return jsonify({"success": False, "message": "User not found"}), 404
            df.loc[df['email'] == email, 'password'] = new_password
            df.to_csv(LECTURERS_FILE, index=False)
        
        # Mark password as reset
        verified_reset['password_reset'] = True
        verified_reset['reset_at'] = datetime.now().isoformat()
        
        # Save updated resets
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)
        
        # Send confirmation email
        send_password_changed_email(email)
        
        return jsonify({
            "success": True,
            "message": "Password reset successfully"
        })
        
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

# ========== API ENDPOINTS ==========

@app.route('/api/health')
def health():
    return jsonify({"status": "running", "version": "1.0"})

@app.route('/api/students')
def get_students():
    """Get all students from CSV"""
    try:
        df = pd.read_csv(STUDENTS_FILE)
        return jsonify({
            "success": True,
            "count": len(df),
            "students": df.to_dict('records')
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/subjects')
def get_subjects():
    """Get all subjects from CSV"""
    try:
        df = pd.read_csv(SUBJECTS_FILE)
        return jsonify({
            "success": True,
            "count": len(df),
            "subjects": df.to_dict('records')
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturers')
def get_lecturers():
    """Get all lecturers from CSV"""
    try:
        df = pd.read_csv(LECTURERS_FILE)
        return jsonify({
            "success": True,
            "count": len(df),
            "lecturers": df.to_dict('records')
        })
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
    """Record attendance for a subject"""
    try:
        data = request.json
        subject_id = data.get('subject_id')
        date = data.get('date')
        present_ids = data.get('present', [])
        absent_ids = data.get('absent', [])
        
        # Read existing attendance or create new file
        file_exists = os.path.exists(ATTENDANCE_FILE)
        
        new_records = []
        for student_id in present_ids:
            new_records.append({
                'subject_id': subject_id,
                'student_id': student_id,
                'date': date,
                'status': 'present'
            })
        
        for student_id in absent_ids:
            new_records.append({
                'subject_id': subject_id,
                'student_id': student_id,
                'date': date,
                'status': 'absent'
            })
        
        # Save to CSV
        if new_records:
            df_new = pd.DataFrame(new_records)
            if file_exists:
                df_existing = pd.read_csv(ATTENDANCE_FILE)
                df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                df_combined.to_csv(ATTENDANCE_FILE, index=False)
            else:
                df_new.to_csv(ATTENDANCE_FILE, index=False)
        
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
    """Get all attendance records"""
    try:
        if os.path.exists(ATTENDANCE_FILE):
            df = pd.read_csv(ATTENDANCE_FILE)
            return jsonify({
                "success": True,
                "count": len(df),
                "attendance": df.to_dict('records')
            })
        else:
            return jsonify({
                "success": True,
                "count": 0,
                "attendance": []
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ========== INITIALIZATION ==========

def initialize_data():
    """Initialize data files if they don't exist"""
    # Create data directory
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Initialize security files
    initialize_security_files()
    
    # Initialize students.csv if it doesn't exist
    if not os.path.exists(STUDENTS_FILE):
        print("Creating students.csv...")
        students_data = [
            ["student_id", "name", "email", "password", "batch", "department"],
            [1001, "Aarav Sharma", "aarav.sharma@uni.edu", "student@1001", "2024", "CSE"],
            [1002, "Vivaan Singh", "vivaan.singh@uni.edu", "student@1002", "2024", "CSE"],
            [1003, "Aditya Kumar", "aditya.kumar@uni.edu", "student@1003", "2024", "ECE"],
        ]
        with open(STUDENTS_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(students_data)
    
    # Initialize lecturers.csv if it doesn't exist
    if not os.path.exists(LECTURERS_FILE):
        print("Creating lecturers.csv...")
        lecturers_data = [
            ["lecturer_id", "name", "email", "password", "department"],
            ["L201", "Dr. Rajesh Iyer", "rajesh.iyer@uni.edu", "prof@201", "CSE"],
            ["L202", "Dr. Meera Nandakumar", "meera.n@uni.edu", "prof@202", "ECE"],
            ["L203", "Dr. Anil Verma", "anil.verma@uni.edu", "prof@203", "ME"],
        ]
        with open(LECTURERS_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(lecturers_data)
    
    # Initialize subjects.csv if it doesn't exist
    if not os.path.exists(SUBJECTS_FILE):
        print("Creating subjects.csv...")
        subjects_data = [
            ["subject_id", "code", "name", "credits", "department", "lecturer_id"],
            [1, "CS101", "Data Structures", 4, "CSE", "L201"],
            [2, "CS102", "Algorithms", 4, "CSE", "L206"],
            [3, "EC201", "Digital Electronics", 3, "ECE", "L202"],
            [4, "ME301", "Thermodynamics", 4, "ME", "L203"],
            [5, "CE401", "Structural Analysis", 3, "CE", "L204"],
            [6, "EE501", "Power Systems", 4, "EEE", "L205"],
        ]
        with open(SUBJECTS_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(subjects_data)
    
    # Initialize attendance.csv if it doesn't exist
    if not os.path.exists(ATTENDANCE_FILE):
        print("Creating attendance.csv...")
        attendance_data = [
            ["attendance_id", "subject_id", "student_id", "date", "status"],
            [1, 1, 1001, "2024-03-20", "present"],
            [2, 1, 1002, "2024-03-20", "present"],
            [3, 1, 1003, "2024-03-20", "absent"],
        ]
        with open(ATTENDANCE_FILE, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerows(attendance_data)
    
    # Initialize password resets file
    if not os.path.exists(PASSWORD_RESET_FILE):
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump([], f)

if __name__ == '__main__':
    # Initialize data files
    initialize_data()
    
    print("=" * 60)
    print("ATTENDANCE ATLAS SERVER STARTING...")
    print("=" * 60)
    print(f"Data directory: {DATA_DIR}")
    print(f"Students file: {STUDENTS_FILE}")
    print(f"Lecturers file: {LECTURERS_FILE}")
    print(f"Subjects file: {SUBJECTS_FILE}")
    print(f"Attendance file: {ATTENDANCE_FILE}")
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
    