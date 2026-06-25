from flask import Flask, jsonify, request, render_template, session, redirect, url_for, send_file
from flask_cors import CORS
from flask_admin import Admin, BaseView, expose
import pandas as pd
import csv
import os
import random
import string
import hashlib
import time
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from functools import wraps
import sqlite3
import io
import bcrypt

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, '../frontend'),
    static_folder=os.path.join(BASE_DIR, '../frontend'),
    static_url_path=''
)




app.secret_key = "attendance-atlas-secret-key"
CORS(app)

# Directory Configuration
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "institute.db")
PASSWORD_RESET_FILE = os.path.join(DATA_DIR, "password_resets.json")
SECURITY_DIR = os.path.join(DATA_DIR, "security")
LOGIN_ATTEMPTS_FILE = os.path.join(SECURITY_DIR, "login_attempts.json")
ACCOUNT_LOCK_FILE = os.path.join(SECURITY_DIR, "account_locks.json")

# Security Configuration
SECURITY_CONFIG = {
    'max_login_attempts': 5,
    'lockout_duration': 15,
    'cooldown_period': 2,
    'ip_block_threshold': 10,
    'ip_block_duration': 30,
}

# Email Configuration
EMAIL_CONFIG = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'sender_email': 'your_email@gmail.com',
    'sender_password': 'your_app_password',
    'use_tls': True
}

OTP_EXPIRY_MINUTES = 10

# ============================================================================
# DATABASE FUNCTIONS
# ============================================================================

def get_db():
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        # Students table
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
        
        # Lecturers table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS lecturers (
                lecturer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                department TEXT
            )
        ''')
        
        # Subjects table
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
        
        # Attendance table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                subject_id INTEGER NOT NULL,
                student_id TEXT NOT NULL,
                date TEXT NOT NULL,
                status TEXT CHECK(status IN ('present', 'absent', 'late')),
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                marked_by TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                remarks TEXT,
                UNIQUE(subject_id, student_id, date)
            )
        ''')
        conn.commit()

def import_csv_to_db():
    """Import data from CSV files to database if tables are empty."""
    with get_db() as conn:
        # Import students
        cur = conn.execute("SELECT COUNT(*) as count FROM students")
        if cur.fetchone()['count'] == 0:
            students_csv = os.path.join(DATA_DIR, "students.csv")
            if os.path.exists(students_csv):
                df = pd.read_csv(students_csv)
                for _, row in df.iterrows():
                    raw_password = row['password'] if 'password' in row else 'default123'
                    hashed_password = hash_password(raw_password)
                    
                    conn.execute(
                        "INSERT OR IGNORE INTO students (student_id, name, email, password, batch, department) VALUES (?,?,?,?,?,?)",
                        (str(row['student_id']), row['name'], row['email'], hashed_password, 
                         row.get('batch', ''), row.get('department', ''))
                    )
                conn.commit()
                print(f"✓ Imported {len(df)} students from CSV")

        # Import lecturers
        cur = conn.execute("SELECT COUNT(*) as count FROM lecturers")
        if cur.fetchone()['count'] == 0:
            lecturers_csv = os.path.join(DATA_DIR, "lecturers.csv")
            if os.path.exists(lecturers_csv):
                df = pd.read_csv(lecturers_csv)
                for _, row in df.iterrows():
                    raw_password = row['password'] if 'password' in row else 'default123'
                    hashed_password = hash_password(raw_password)
                    
                    conn.execute(
                        "INSERT OR IGNORE INTO lecturers (lecturer_id, name, email, password, department) VALUES (?,?,?,?,?)",
                        (row['lecturer_id'], row['name'], row['email'], hashed_password, row.get('department', ''))
                    )
                conn.commit()
                print(f"✓ Imported {len(df)} lecturers from CSV")

        # Import subjects
        cur = conn.execute("SELECT COUNT(*) as count FROM subjects")
        if cur.fetchone()['count'] == 0:
            subjects_csv = os.path.join(DATA_DIR, "subjects.csv")
            if os.path.exists(subjects_csv):
                df = pd.read_csv(subjects_csv)
                for _, row in df.iterrows():
                    conn.execute(
                        "INSERT OR IGNORE INTO subjects (subject_id, code, name, credits, department, lecturer_id) VALUES (?,?,?,?,?,?)",
                        (row['subject_id'], row['code'], row['name'], row['credits'], 
                         row['department'], row.get('lecturer_id', ''))
                    )
                conn.commit()
                print(f"✓ Imported {len(df)} subjects from CSV")

# ============================================================================
# SECURITY FUNCTIONS
# ============================================================================

def hash_password(password):
    """Hash a password using bcrypt"""
    if not password:
        return None
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password, hashed):
    """Verify a password against its hash"""
    if not hashed or not password:
        return False
    try:
        if hashed.startswith('$2b$'):
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        return password == hashed
    except Exception as e:
        print(f"Password check error: {str(e)}")
        return False

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
        with open(LOGIN_ATTEMPTS_FILE, 'r') as f:
            attempts = json.load(f)
        
        current_time = datetime.now().isoformat()
        
        if email not in attempts:
            attempts[email] = {'attempts': [], 'failed_count': 0, 'last_attempt': None}
        
        attempt_record = {'timestamp': current_time, 'ip': ip_address, 'success': success}
        attempts[email]['attempts'].append(attempt_record)
        attempts[email]['last_attempt'] = current_time
        attempts[email]['attempts'] = attempts[email]['attempts'][-20:]
        
        if not success:
            attempts[email]['failed_count'] = attempts[email].get('failed_count', 0) + 1
            if attempts[email]['failed_count'] >= SECURITY_CONFIG['max_login_attempts']:
                lock_account(email, ip_address)
        else:
            attempts[email]['failed_count'] = 0
            clear_account_lock(email)
        
        if ip_address not in attempts:
            attempts[ip_address] = {'failed_attempts': 0, 'last_attempt': None}
        
        if not success:
            attempts[ip_address]['failed_attempts'] = attempts[ip_address].get('failed_attempts', 0) + 1
            attempts[ip_address]['last_attempt'] = current_time
            if attempts[ip_address]['failed_attempts'] >= SECURITY_CONFIG['ip_block_threshold']:
                block_ip(ip_address)
        else:
            attempts[ip_address]['failed_attempts'] = 0
            clear_ip_block(ip_address)
        
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
        print(f"🔒 Account {email} locked until {unlock_time.strftime('%H:%M:%S')}")
        
    except Exception as e:
        print(f"Error locking account: {str(e)}")

def clear_account_lock(email):
    """Clear account lock"""
    try:
        if os.path.exists(ACCOUNT_LOCK_FILE):
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
        
        unlock_time = datetime.fromisoformat(locks[email]['unlocks_at'])
        if datetime.now() < unlock_time:
            return True
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
        print(f"🌐 IP {ip_address} blocked until {unblock_time.strftime('%H:%M:%S')}")
            
    except Exception as e:
        print(f"Error blocking IP: {str(e)}")

def clear_ip_block(ip_address):
    """Clear IP block"""
    try:
        if os.path.exists(ACCOUNT_LOCK_FILE):
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
        
        unblock_time = datetime.fromisoformat(locks[block_key]['unblocks_at'])
        if datetime.now() < unblock_time:
            return True
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
        
        if email in attempts and attempts[email].get('last_attempt'):
            last_attempt = datetime.fromisoformat(attempts[email]['last_attempt'])
            if (datetime.now() - last_attempt).total_seconds() < SECURITY_CONFIG['cooldown_period']:
                return True
        
        if ip_address in attempts and attempts[ip_address].get('last_attempt'):
            last_attempt = datetime.fromisoformat(attempts[ip_address]['last_attempt'])
            if (datetime.now() - last_attempt).total_seconds() < SECURITY_CONFIG['cooldown_period']:
                return True
        
        return False
        
    except Exception as e:
        print(f"Error checking cooldown: {str(e)}")
        return False

def get_failed_attempts_count(email, ip_address):
    """Get number of recent failed attempts for a specific email"""
    try:
        if not os.path.exists(LOGIN_ATTEMPTS_FILE):
            return {'email': 0, 'ip': 0}
        
        with open(LOGIN_ATTEMPTS_FILE, 'r') as f:
            attempts = json.load(f)
        
        email_attempts = attempts.get(email, {}).get('failed_count', 0) if email in attempts else 0
        ip_attempts = attempts.get(ip_address, {}).get('failed_attempts', 0) if ip_address in attempts else 0
        
        return {'email': email_attempts, 'ip': ip_attempts}
        
    except Exception as e:
        print(f"Error getting failed attempts: {str(e)}")
        return {'email': 0, 'ip': 0}

def check_login_attempts(f):
    """Decorator to check and track login attempts"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        ip_address = request.remote_addr
        email = request.json.get('email') if request.is_json else None
        
        if is_ip_blocked(ip_address):
            return jsonify({
                "success": False,
                "message": "Too many failed attempts. Please try again later.",
                "blocked": True,
                "cooldown": get_ip_block_remaining(ip_address)
            }), 429
        
        if email and is_account_locked(email):
            return jsonify({
                "success": False,
                "message": "Account is temporarily locked due to too many failed attempts.",
                "locked": True,
                "unlock_time": get_account_unlock_time(email)
            }), 423
        
        if email and is_in_cooldown(email, ip_address):
            return jsonify({
                "success": False,
                "message": "Please wait before trying again.",
                "cooldown": True,
                "wait_time": SECURITY_CONFIG['cooldown_period']
            }), 429
        
        return f(*args, **kwargs)
    return decorated_function

# ============================================================================
# EMAIL FUNCTIONS
# ============================================================================

def send_reset_email(to_email, otp, name):
    """Send password reset email with OTP"""
    try:
        print(f"\n{'='*50}")
        print(f"📧 Password Reset Email")
        print(f"   To: {to_email}")
        print(f"   OTP: {otp}")
        print(f"   Name: {name}")
        print(f"{'='*50}\n")
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

def send_password_changed_email(to_email):
    """Send confirmation email for password change"""
    try:
        print(f"\n{'='*50}")
        print(f"📧 Password Changed Confirmation")
        print(f"   To: {to_email}")
        print(f"{'='*50}\n")
        return True
    except Exception as e:
        print(f"Error sending confirmation email: {str(e)}")
        return False

# ============================================================================
# FLASK-ADMIN SETUP
# ============================================================================

class SecureModelView(BaseView):
    """Base secure admin view with authentication"""
    
    def is_accessible(self):
        """Check if user is logged in and has admin role"""
        return session.get('logged_in') and session.get('role') == 'admin'
    
    def inaccessible_callback(self, name, **kwargs):
        """Redirect to admin login if not authorized"""
        return redirect(url_for('admin_login'))

class StudentAdminView(SecureModelView):
    """Admin view for managing students"""
    
    @expose('/')
    def index(self):
        with get_db() as conn:
            students = conn.execute("SELECT * FROM students ORDER BY student_id").fetchall()
        return self.render('admin/students.html', students=students)
    
    @expose('/create', methods=['GET', 'POST'])
    def create(self):
        if request.method == 'POST':
            student_id = request.form.get('student_id')
            name = request.form.get('name')
            email = request.form.get('email')
            password = request.form.get('password')
            batch = request.form.get('batch')
            department = request.form.get('department')
            
            if not all([student_id, name, email, password]):
                return "All fields are required!", 400
            
            hashed_password = hash_password(password)
            
            try:
                with get_db() as conn:
                    conn.execute(
                        "INSERT INTO students (student_id, name, email, password, batch, department) VALUES (?, ?, ?, ?, ?, ?)",
                        (student_id, name, email, hashed_password, batch, department)
                    )
                    conn.commit()
                return redirect(url_for('students.index'))
            except sqlite3.IntegrityError:
                return "Student ID or Email already exists!", 400
        
        return self.render('admin/create_student.html')
    
    @expose('/edit/<string:student_id>', methods=['GET', 'POST'])
    def edit(self, student_id):
        if request.method == 'POST':
            name = request.form.get('name')
            email = request.form.get('email')
            batch = request.form.get('batch')
            department = request.form.get('department')
            
            with get_db() as conn:
                conn.execute(
                    "UPDATE students SET name=?, email=?, batch=?, department=? WHERE student_id=?",
                    (name, email, batch, department, student_id)
                )
                conn.commit()
            return redirect(url_for('students.index'))
        
        with get_db() as conn:
            student = conn.execute(
                "SELECT * FROM students WHERE student_id = ?", (student_id,)
            ).fetchone()
        return self.render('admin/edit_student.html', student=student)
    
    @expose('/delete/<string:student_id>')
    def delete(self, student_id):
        with get_db() as conn:
            conn.execute("DELETE FROM students WHERE student_id = ?", (student_id,))
            conn.commit()
        return redirect(url_for('students.index'))

class LecturerAdminView(SecureModelView):
    """Admin view for managing lecturers"""
    
    @expose('/')
    def index(self):
        with get_db() as conn:
            lecturers = conn.execute("SELECT * FROM lecturers ORDER BY lecturer_id").fetchall()
        return self.render('admin/lecturers.html', lecturers=lecturers)
    
    @expose('/create', methods=['GET', 'POST'])
    def create(self):
        if request.method == 'POST':
            lecturer_id = request.form.get('lecturer_id')
            name = request.form.get('name')
            email = request.form.get('email')
            password = request.form.get('password')
            department = request.form.get('department')
            
            if not all([lecturer_id, name, email, password]):
                return "All fields are required!", 400
            
            hashed_password = hash_password(password)
            
            try:
                with get_db() as conn:
                    conn.execute(
                        "INSERT INTO lecturers (lecturer_id, name, email, password, department) VALUES (?, ?, ?, ?, ?)",
                        (lecturer_id, name, email, hashed_password, department)
                    )
                    conn.commit()
                return redirect(url_for('lecturers.index'))
            except sqlite3.IntegrityError:
                return "Lecturer ID or Email already exists!", 400
        
        return self.render('admin/create_lecturer.html')
    
    @expose('/edit/<string:lecturer_id>', methods=['GET', 'POST'])
    def edit(self, lecturer_id):
        if request.method == 'POST':
            name = request.form.get('name')
            email = request.form.get('email')
            department = request.form.get('department')
            
            with get_db() as conn:
                conn.execute(
                    "UPDATE lecturers SET name=?, email=?, department=? WHERE lecturer_id=?",
                    (name, email, department, lecturer_id)
                )
                conn.commit()
            return redirect(url_for('lecturers.index'))
        
        with get_db() as conn:
            lecturer = conn.execute(
                "SELECT * FROM lecturers WHERE lecturer_id = ?", (lecturer_id,)
            ).fetchone()
        return self.render('admin/edit_lecturer.html', lecturer=lecturer)
    
    @expose('/delete/<string:lecturer_id>')
    def delete(self, lecturer_id):
        with get_db() as conn:
            conn.execute("DELETE FROM lecturers WHERE lecturer_id = ?", (lecturer_id,))
            conn.commit()
        return redirect(url_for('lecturers.index'))

class SubjectAdminView(SecureModelView):
    """Admin view for managing subjects"""
    
    @expose('/')
    def index(self):
        with get_db() as conn:
            subjects = conn.execute("""
                SELECT s.*, l.name as lecturer_name 
                FROM subjects s
                LEFT JOIN lecturers l ON s.lecturer_id = l.lecturer_id
                ORDER BY s.code
            """).fetchall()
        return self.render('admin/subjects.html', subjects=subjects)
    
    @expose('/create', methods=['GET', 'POST'])
    def create(self):
        if request.method == 'POST':
            code = request.form.get('code')
            name = request.form.get('name')
            credits = request.form.get('credits')
            department = request.form.get('department')
            lecturer_id = request.form.get('lecturer_id')
            
            if not all([code, name, credits]):
                return "Code, Name, and Credits are required!", 400
            
            try:
                with get_db() as conn:
                    cur = conn.execute("SELECT MAX(subject_id) as max_id FROM subjects")
                    max_id = cur.fetchone()['max_id']
                    subject_id = (max_id or 0) + 1
                    
                    conn.execute(
                        "INSERT INTO subjects (subject_id, code, name, credits, department, lecturer_id) VALUES (?, ?, ?, ?, ?, ?)",
                        (subject_id, code, name, credits, department, lecturer_id)
                    )
                    conn.commit()
                return redirect(url_for('subjects.index'))
            except sqlite3.IntegrityError:
                return "Subject code already exists!", 400
        
        with get_db() as conn:
            lecturers = conn.execute("SELECT lecturer_id, name FROM lecturers ORDER BY name").fetchall()
        return self.render('admin/create_subject.html', lecturers=lecturers)
    
    @expose('/edit/<int:subject_id>', methods=['GET', 'POST'])
    def edit(self, subject_id):
        if request.method == 'POST':
            code = request.form.get('code')
            name = request.form.get('name')
            credits = request.form.get('credits')
            department = request.form.get('department')
            lecturer_id = request.form.get('lecturer_id')
            
            with get_db() as conn:
                conn.execute(
                    "UPDATE subjects SET code=?, name=?, credits=?, department=?, lecturer_id=? WHERE subject_id=?",
                    (code, name, credits, department, lecturer_id, subject_id)
                )
                conn.commit()
            return redirect(url_for('subjects.index'))
        
        with get_db() as conn:
            subject = conn.execute(
                "SELECT * FROM subjects WHERE subject_id = ?", (subject_id,)
            ).fetchone()
            lecturers = conn.execute("SELECT lecturer_id, name FROM lecturers ORDER BY name").fetchall()
        return self.render('admin/edit_subject.html', subject=subject, lecturers=lecturers)
    
    @expose('/delete/<int:subject_id>')
    def delete(self, subject_id):
        with get_db() as conn:
            conn.execute("DELETE FROM subjects WHERE subject_id = ?", (subject_id,))
            conn.commit()
        return redirect(url_for('subjects.index'))

class AttendanceAdminView(SecureModelView):
    """Admin view for managing attendance records"""
    
    @expose('/')
    def index(self):
        with get_db() as conn:
            records = conn.execute("""
                SELECT a.*, s.code as subject_code, s.name as subject_name, 
                       st.name as student_name
                FROM attendance a
                LEFT JOIN subjects s ON a.subject_id = s.subject_id
                LEFT JOIN students st ON a.student_id = st.student_id
                ORDER BY a.date DESC, a.timestamp DESC
                LIMIT 100
            """).fetchall()
        return self.render('admin/attendance.html', records=records)
    
    @expose('/delete/<int:record_id>')
    def delete(self, record_id):
        with get_db() as conn:
            conn.execute("DELETE FROM attendance WHERE id = ?", (record_id,))
            conn.commit()
        return redirect(url_for('attendance.index'))

# ============================================================================
# INITIALIZE FLASK-ADMIN (SIMPLE APPROACH)
# ============================================================================

# Simply initialize admin with default settings
admin = Admin(app, name='Attendance Atlas Admin')

# Add views
admin.add_view(StudentAdminView(name='Students', endpoint='students'))
admin.add_view(LecturerAdminView(name='Lecturers', endpoint='lecturers'))
admin.add_view(SubjectAdminView(name='Subjects', endpoint='subjects'))
admin.add_view(AttendanceAdminView(name='Attendance', endpoint='attendance'))

print("✅ Flask-Admin initialized successfully!")

# ============================================================================
# ADMIN LOGIN ROUTES
# ============================================================================

@app.route('/admin-login')
def admin_login():
    """Admin login page"""
    return render_template('admin_login.html')

@app.route('/admin')
def admin_home():
    """Admin home page"""
    return render_template('admin_index.html')

@app.route('/admin-login-submit', methods=['POST'])
def admin_login_submit():
    """Handle admin login submission"""
    email = request.form.get('email')
    password = request.form.get('password')
    
    if not email or not password:
        return render_template('admin_login.html', error="Email and password are required")
    
    try:
        with get_db() as conn:
            user = conn.execute(
                "SELECT * FROM lecturers WHERE email = ?", (email,)
            ).fetchone()
            
            if user and check_password(password, user['password']):
                if user['lecturer_id'] == 'ADMIN001':
                    session["logged_in"] = True
                    session["email"] = user["email"]
                    session["role"] = "admin"
                    session["name"] = user["name"]
                    session["lecturer_id"] = user["lecturer_id"]
                    return redirect(url_for('admin.index'))
                else:
                    return render_template('admin_login.html', 
                                         error="You are not authorized as admin.")
            else:
                return render_template('admin_login.html', 
                                     error="Invalid email or password.")
    except Exception as e:
        print(f"Admin login error: {str(e)}")
        return render_template('admin_login.html', error="Database error occurred")

@app.route('/admin-logout')
def admin_logout():
    """Logout from admin panel"""
    session.clear()
    return redirect(url_for('home_page'))

# ============================================================================
# ROUTES - HTML PAGES
# ============================================================================

@app.route('/')
def home_page():
    return render_template('index.html')

@app.route('/mark-attendance')
def mark_attendance_page():
    return render_template('mark_attendance.html')

@app.route('/report')
def report_page():
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
    return render_template('forgot_password.html')

@app.route("/logout")
def logout():
    session.clear()
    return render_template("logout.html")

# ============================================================================
# ROUTES - AUTHENTICATION
# ============================================================================

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    role = data["role"]
    plain_password = data["password"]
    hashed_password = hash_password(plain_password)

    try:
        with get_db() as conn:
            if role == "student":
                conn.execute('''
                    INSERT INTO students (student_id, name, email, password, batch, department)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (data.get("student_id", ""), data["name"], data["email"], 
                      hashed_password, data.get("batch", ""), data.get("department", "")))
            else:
                conn.execute('''
                    INSERT INTO lecturers (lecturer_id, name, email, password, department)
                    VALUES (?, ?, ?, ?, ?)
                ''', (data.get("lecturer_id", ""), data["name"], data["email"], 
                      hashed_password, data.get("department", "")))
            conn.commit()
        return jsonify(success=True, message="Account created successfully")
    except sqlite3.IntegrityError:
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

    print(f"🔐 Login attempt - Role: {role}, Email: {email}, IP: {ip_address}")

    try:
        with get_db() as conn:
            if role == "student":
                row = conn.execute("SELECT * FROM students WHERE email = ?", (email,)).fetchone()
            else:
                row = conn.execute("SELECT * FROM lecturers WHERE email = ?", (email,)).fetchone()

            if row and check_password(password, row['password']):
                clear_account_lock(email)
                clear_ip_block(ip_address)
                record_login_attempt(email, ip_address, success=True)

                user = dict(row)
                session["logged_in"] = True
                session["email"] = user["email"]
                session["role"] = role
                session["name"] = user["name"]
                session["login_time"] = datetime.now().isoformat()
                session["ip_address"] = ip_address

                if role == "student":
                    session["student_id"] = user["student_id"]
                else:
                    session["lecturer_id"] = user["lecturer_id"]

                print(f"✅ Login successful for {user['name']}")
                return jsonify({"success": True, "role": role})
            
            record_login_attempt(email, ip_address, success=False)
            failed_attempts = get_failed_attempts_count(email, ip_address)
            remaining_attempts = max(0, SECURITY_CONFIG['max_login_attempts'] - failed_attempts['email'])

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

# ============================================================================
# ROUTES - PASSWORD RESET
# ============================================================================

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400
        
        with get_db() as conn:
            student = conn.execute("SELECT * FROM students WHERE email = ?", (email,)).fetchone()
            lecturer = conn.execute("SELECT * FROM lecturers WHERE email = ?", (email,)).fetchone()
            
            if not student and not lecturer:
                return jsonify({"success": True, "message": "If email exists, reset instructions will be sent"})
            
            user = dict(student) if student else dict(lecturer)
            role = 'student' if student else 'lecturer'
        
        otp = ''.join(random.choices(string.digits, k=6))
        
        reset_data = {
            'email': email,
            'otp': otp,
            'role': role,
            'created_at': datetime.now().isoformat(),
            'expires_at': (datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat(),
            'used': False
        }
        
        resets = []
        if os.path.exists(PASSWORD_RESET_FILE):
            with open(PASSWORD_RESET_FILE, 'r') as f:
                resets = json.load(f)
        
        resets = [r for r in resets if r['email'] != email or r['used']]
        resets.append(reset_data)
        
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)
        
        if send_reset_email(email, otp, user.get('name', 'User')):
            return jsonify({"success": True, "message": "Reset instructions sent to your email", "email": email})
        else:
            return jsonify({"success": True, "message": f"Demo: OTP for {email} is {otp}", "otp": otp, "email": email})
            
    except Exception as e:
        print(f"Forgot password error: {str(e)}")
        return jsonify({"success": False, "message": "Error processing request"}), 500

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    try:
        data = request.json
        email = data.get('email')
        otp = data.get('otp')
        
        if not email or not otp:
            return jsonify({"success": False, "message": "Email and OTP are required"}), 400
        
        if not os.path.exists(PASSWORD_RESET_FILE):
            return jsonify({"success": False, "message": "No reset request found"}), 400
        
        with open(PASSWORD_RESET_FILE, 'r') as f:
            resets = json.load(f)
        
        current_time = datetime.now()
        valid_reset = None
        
        for reset in resets:
            if (reset['email'] == email and reset['otp'] == otp and 
                not reset.get('used', False) and
                datetime.fromisoformat(reset['expires_at']) > current_time):
                valid_reset = reset
                break
        
        if not valid_reset:
            return jsonify({"success": False, "message": "Invalid or expired OTP"}), 400
        
        valid_reset['verified_at'] = current_time.isoformat()
        valid_reset['verified'] = True
        
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)
        
        return jsonify({"success": True, "message": "OTP verified successfully", "email": email, "role": valid_reset['role']})
        
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

        if not os.path.exists(PASSWORD_RESET_FILE):
            return jsonify({"success": False, "message": "No reset request found"}), 400

        with open(PASSWORD_RESET_FILE, 'r') as f:
            resets = json.load(f)

        verified_reset = None
        for reset in resets:
            if (reset['email'] == email and reset.get('verified', False) and 
                not reset.get('password_reset', False)):
                verified_reset = reset
                break

        if not verified_reset:
            return jsonify({"success": False, "message": "Please verify OTP first"}), 400

        role = verified_reset['role']
        hashed_password = hash_password(new_password)

        with get_db() as conn:
            if role == 'student':
                conn.execute("UPDATE students SET password = ? WHERE email = ?", (hashed_password, email))
            else:
                conn.execute("UPDATE lecturers SET password = ? WHERE email = ?", (hashed_password, email))
            conn.commit()

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
    try:
        data = request.json
        email = data.get('email')
        
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400
        
        otp = ''.join(random.choices(string.digits, k=6))
        
        resets = []
        if os.path.exists(PASSWORD_RESET_FILE):
            with open(PASSWORD_RESET_FILE, 'r') as f:
                resets = json.load(f)
        
        updated = False
        for reset in resets:
            if reset['email'] == email and not reset.get('used', False):
                reset['otp'] = otp
                reset['created_at'] = datetime.now().isoformat()
                reset['expires_at'] = (datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()
                reset['verified'] = False
                updated = True
                break
        
        if not updated:
            return jsonify({"success": False, "message": "Please request password reset first"}), 400
        
        with open(PASSWORD_RESET_FILE, 'w') as f:
            json.dump(resets, f, indent=2)
        
        if send_reset_email(email, otp, "User"):
            return jsonify({"success": True, "message": "New OTP sent to your email"})
        else:
            return jsonify({"success": True, "message": f"Demo: New OTP for {email} is {otp}", "otp": otp})
            
    except Exception as e:
        print(f"Resend OTP error: {str(e)}")
        return jsonify({"success": False, "message": "Error resending OTP"}), 500

# ============================================================================
# ROUTES - API ENDPOINTS
# ============================================================================

@app.route('/api/health')
def health():
    return jsonify({"status": "running", "version": "2.0", "timestamp": datetime.now().isoformat()})

@app.route('/api/students')
def get_students():
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT student_id, name, email, batch, department FROM students").fetchall()
            return jsonify({"success": True, "count": len(rows), "students": [dict(row) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturers')
def get_lecturers():
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT lecturer_id, name, email, department FROM lecturers").fetchall()
            return jsonify({"success": True, "count": len(rows), "lecturers": [dict(row) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/subjects')
def get_subjects():
    try:
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM subjects").fetchall()
            return jsonify({"success": True, "count": len(rows), "subjects": [dict(row) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/attendance')
def get_attendance():
    try:
        with get_db() as conn:
            rows = conn.execute('''
                SELECT a.*, s.name as subject_name, st.name as student_name
                FROM attendance a
                LEFT JOIN subjects s ON a.subject_id = s.subject_id
                LEFT JOIN students st ON a.student_id = st.student_id
                ORDER BY a.date DESC, a.subject_id
            ''').fetchall()
            return jsonify({"success": True, "count": len(rows), "attendance": [dict(row) for row in rows]})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/attendance/student/<string:student_id>')
def get_student_attendance(student_id):
    try:
        with get_db() as conn:
            rows = conn.execute('''
                SELECT a.*, s.code as subject_code, s.name as subject_name
                FROM attendance a
                LEFT JOIN subjects s ON a.subject_id = s.subject_id
                WHERE a.student_id = ?
                ORDER BY a.date DESC, s.code
            ''', (student_id,)).fetchall()
            
            attendance_list = [dict(row) for row in rows]
            total_classes = len(attendance_list)
            present_count = sum(1 for r in attendance_list if r['status'] == 'present')
            attendance_percentage = round((present_count / total_classes * 100), 2) if total_classes > 0 else 0
            
            return jsonify({
                "success": True,
                "student_id": student_id,
                "total_classes": total_classes,
                "present_count": present_count,
                "attendance_percentage": attendance_percentage,
                "records": attendance_list
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================================================
# ROUTES - ATTENDANCE MANAGEMENT
# ============================================================================

@app.route('/api/mark_attendance', methods=['POST'])
def mark_attendance():
    try:
        data = request.json
        subject_id = data.get('subject_id')
        date = data.get('date')
        present_ids = data.get('present', [])
        absent_ids = data.get('absent', [])
        lecturer_id = session.get('lecturer_id')

        if not subject_id or not date:
            return jsonify({"success": False, "error": "subject_id and date are required"}), 400

        conn = get_db()
        cursor = conn.cursor()
        
        try:
            for student_id in present_ids:
                cursor.execute('''
                    INSERT OR REPLACE INTO attendance 
                    (subject_id, student_id, date, status, marked_by, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (subject_id, student_id, date, 'present', lecturer_id, datetime.now().isoformat()))
            
            for student_id in absent_ids:
                cursor.execute('''
                    INSERT OR REPLACE INTO attendance 
                    (subject_id, student_id, date, status, marked_by, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (subject_id, student_id, date, 'absent', lecturer_id, datetime.now().isoformat()))
            
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

# ============================================================================
# ROUTES - LECTURER DASHBOARD
# ============================================================================

@app.route('/api/lecturer/profile')
def lecturer_profile():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    try:
        with get_db() as conn:
            row = conn.execute(
                "SELECT lecturer_id, name, email, department FROM lecturers WHERE lecturer_id = ?",
                (session.get("lecturer_id"),)
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

    try:
        with get_db() as conn:
            total_subjects = conn.execute(
                "SELECT COUNT(*) as cnt FROM subjects WHERE lecturer_id = ?", (lecturer_id,)
            ).fetchone()['cnt']

            total_students = conn.execute("""
                SELECT COUNT(DISTINCT a.student_id) as cnt 
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                WHERE s.lecturer_id = ?
            """, (lecturer_id,)).fetchone()['cnt'] or 0

            today = datetime.now().strftime('%Y-%m-%d')
            today_stats = conn.execute("""
                SELECT COUNT(CASE WHEN status='present' THEN 1 END) as present, COUNT(*) as total
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                WHERE s.lecturer_id = ? AND a.date = ?
            """, (lecturer_id, today)).fetchone()
            
            today_attendance = round((today_stats['present'] / today_stats['total'] * 100), 1) if today_stats['total'] > 0 else 0

            overall_stats = conn.execute("""
                SELECT COUNT(CASE WHEN status='present' THEN 1 END) as present, COUNT(*) as total
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                WHERE s.lecturer_id = ?
            """, (lecturer_id,)).fetchone()
            
            avg_attendance = round((overall_stats['present'] / overall_stats['total'] * 100), 1) if overall_stats['total'] > 0 else 0

            return jsonify({
                "total_students": total_students,
                "today_attendance": today_attendance,
                "total_subjects": total_subjects,
                "average_attendance": avg_attendance,
                "student_change": 0,
                "attendance_change": 0,
                "subjects_status": "All active",
                "performance_status": "Meeting target"
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
            rows = conn.execute("""
                SELECT s.subject_id, s.code, s.name, s.credits,
                       COUNT(DISTINCT a.student_id) as student_count,
                       COUNT(DISTINCT a.date) as classes_count
                FROM subjects s
                LEFT JOIN attendance a ON s.subject_id = a.subject_id
                WHERE s.lecturer_id = ?
                GROUP BY s.subject_id
            """, (lecturer_id,)).fetchall()

            subjects = []
            for row in rows:
                subj = dict(row)
                att_stats = conn.execute("""
                    SELECT COUNT(CASE WHEN status='present' THEN 1 END) as present, COUNT(*) as total 
                    FROM attendance WHERE subject_id = ?
                """, (subj['subject_id'],)).fetchone()
                
                avg_att = round((att_stats['present'] / att_stats['total'] * 100), 1) if att_stats['total'] > 0 else 0
                subj['attendance'] = avg_att
                subj['description'] = f"{subj['code']} - {subj['name']}"
                subjects.append(subj)

            return jsonify({"subjects": subjects})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/lecturer/export')
def lecturer_export():
    if not session.get("logged_in") or session.get("role") != "lecturer":
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    lecturer_id = session.get("lecturer_id")
    
    try:
        with get_db() as conn:
            rows = conn.execute("""
                SELECT a.date, s.code as subject_code, s.name as subject_name,
                       st.student_id, st.name as student_name, a.status
                FROM attendance a
                JOIN subjects s ON a.subject_id = s.subject_id
                JOIN students st ON a.student_id = st.student_id
                WHERE s.lecturer_id = ?
                ORDER BY a.date DESC, s.code
            """, (lecturer_id,)).fetchall()

            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['Date', 'Subject Code', 'Subject Name', 'Student ID', 'Student Name', 'Status'])
            
            for row in rows:
                writer.writerow([row['date'], row['subject_code'], row['subject_name'], 
                               row['student_id'], row['student_name'], row['status']])

            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'attendance_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def migrate_existing_passwords():
    """Migrate existing plain text passwords to hashed ones"""
    print("\n" + "="*60)
    print("🔐 CHECKING FOR PASSWORDS TO MIGRATE...")
    print("="*60)
    
    with get_db() as conn:
        students = conn.execute("SELECT email, password FROM students WHERE password IS NOT NULL").fetchall()
        lecturers = conn.execute("SELECT email, password FROM lecturers WHERE password IS NOT NULL").fetchall()
        migrated_count = 0
        
        for student in students:
            if student['password'] and not student['password'].startswith('$2b$'):
                hashed = hash_password(student['password'])
                conn.execute("UPDATE students SET password = ? WHERE email = ?", (hashed, student['email']))
                migrated_count += 1
                print(f"✓ Migrated student: {student['email']}")
        
        for lecturer in lecturers:
            if lecturer['password'] and not lecturer['password'].startswith('$2b$'):
                hashed = hash_password(lecturer['password'])
                conn.execute("UPDATE lecturers SET password = ? WHERE email = ?", (hashed, lecturer['email']))
                migrated_count += 1
                print(f"✓ Migrated lecturer: {lecturer['email']}")
        
        conn.commit()
        
        if migrated_count > 0:
            print(f"\n✅ Successfully migrated {migrated_count} passwords to bcrypt hash!")
        else:
            print("\n✅ All passwords are already hashed. No migration needed.")
    
    print("="*60 + "\n")

def create_admin_user():
    """Create an admin user for accessing the admin panel"""
    admin_email = 'admin@attendance.com'
    admin_password = 'admin@123'
    
    with get_db() as conn:
        admin_exists = conn.execute(
            "SELECT * FROM lecturers WHERE email = ?", (admin_email,)
        ).fetchone()
        
        if not admin_exists:
            hashed_password = hash_password(admin_password)
            conn.execute("""
                INSERT INTO lecturers (lecturer_id, name, email, password, department)
                VALUES (?, ?, ?, ?, ?)
            """, ('ADMIN001', 'System Administrator', admin_email, hashed_password, 'Administration'))
            conn.commit()
            print(f"✅ Admin user created: {admin_email} / {admin_password}")
        else:
            print(f"ℹ️ Admin user already exists: {admin_email}")

def initialize_data():
    """Initialize data directory, database, and import from CSVs."""
    os.makedirs(DATA_DIR, exist_ok=True)
    initialize_security_files()
    init_db()
    import_csv_to_db()
    migrate_existing_passwords()
    create_admin_user()
    print(f"📁 SQLite database initialized at: {DB_PATH}")

# ============================================================================
# APPLICATION ENTRY POINT
# ============================================================================

if __name__ == '__main__':
    initialize_data()
    
    print("\n" + "="*60)
    print("📊 ATTENDANCE ATLAS SERVER STARTING...")
    print("="*60)
    print(f"📁 Data directory: {DATA_DIR}")
    print(f"🗄️  Database path: {DB_PATH}")
    print(f"🔐 Security directory: {SECURITY_DIR}")
    print("="*60)
    print("\n🔐 SECURITY CONFIGURATION:")
    print(f"   • Max login attempts: {SECURITY_CONFIG['max_login_attempts']}")
    print(f"   • Lockout duration: {SECURITY_CONFIG['lockout_duration']} minutes")
    print(f"   • Cooldown period: {SECURITY_CONFIG['cooldown_period']} seconds")
    print(f"   • IP block threshold: {SECURITY_CONFIG['ip_block_threshold']} attempts")
    print(f"   • IP block duration: {SECURITY_CONFIG['ip_block_duration']} minutes")
    print("="*60)
    print("\n👤 TEST CREDENTIALS:")
    print("   👨‍🎓 Student: aarav.sharma@uni.edu / student@1001")
    print("   👨‍🏫 Lecturer: rajesh.iyer@uni.edu / prof@201")
    print("   👨‍💼 Admin: admin@attendance.com / admin@123")
    print("\n🌐 ACCESS POINTS:")
    print("   🏠 Home: http://localhost:5000")
    print("   🔐 Forgot Password: http://localhost:5000/forgot-password")
    print("   📊 Reports: http://localhost:5000/report")
    print("   📝 Mark Attendance: http://localhost:5000/mark-attendance")
    print("   👑 Admin Panel: http://localhost:5000/admin")
    print("="*60)
    print("\n✅ ALL ENDPOINTS ARE USING DATABASE")
    print("🚀 Server is ready to handle requests...")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5000)