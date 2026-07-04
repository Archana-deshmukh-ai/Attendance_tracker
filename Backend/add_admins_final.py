# add_admins_final.py
import sqlite3
import bcrypt
import os

DB_PATH = r'C:\Users\User\project git\Attendance_tracker\Backend\data\institute.db'

def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def add_admins():
    """Add two admins to the database AND add Super Admin to lecturers table"""
    
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # ==================== PART 1: CREATE/UPDATE ADMINS TABLE ====================
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    ''')
    print("✅ Admins table created/verified")
    
    # Delete existing admins to avoid conflicts
    cursor.execute("DELETE FROM admins")
    print("✅ Cleared existing admins")
    
    # Two admins with strong passwords
    admins = [
        {
            'admin_id': 'ADMIN001',
            'name': 'System Administrator',
            'email': 'admin@attendance.com',
            'password': 'Admin@2024#Secure'
        },
        {
            'admin_id': 'ADMIN002',
            'name': 'Super Admin',
            'email': 'superadmin@attendance.com',
            'password': 'Super@2024#Secure'
        }
    ]
    
    # Insert admins
    for admin in admins:
        hashed_password = hash_password(admin['password'])
        cursor.execute('''
            INSERT INTO admins (admin_id, name, email, password, role)
            VALUES (?, ?, ?, ?, ?)
        ''', (admin['admin_id'], admin['name'], admin['email'], hashed_password, 'admin'))
        print(f"✅ Added admin: {admin['email']}")
    
    # ==================== PART 2: ADD SUPER ADMIN TO LECTURERS TABLE ====================
    # Check if Super Admin already exists in lecturers
    cursor.execute("SELECT * FROM lecturers WHERE lecturer_id = 'ADMIN002'")
    existing = cursor.fetchone()
    
    if existing:
        print("✅ Super Admin already exists in lecturers table")
    else:
        # Add Super Admin as lecturer
        hashed_password = hash_password('Super@2024#Secure')
        cursor.execute('''
            INSERT INTO lecturers (lecturer_id, name, email, password, department)
            VALUES (?, ?, ?, ?, ?)
        ''', ('ADMIN002', 'Super Admin', 'superadmin@attendance.com', hashed_password, 'Administration'))
        print("✅ Added Super Admin to lecturers table")
    
    # ==================== PART 3: VERIFY ====================
    conn.commit()
    
    print("\n" + "="*60)
    print("✅ ADMIN SETUP COMPLETE!")
    print("="*60)
    
    print("\n👑 ADMINS IN DATABASE:")
    cursor.execute("SELECT admin_id, name, email FROM admins")
    admins_result = cursor.fetchall()
    for row in admins_result:
        print(f"   • {row[0]} - {row[1]} ({row[2]})")
    
    print("\n👑 SUPER ADMIN IN LECTURERS:")
    cursor.execute("SELECT lecturer_id, name, email, department FROM lecturers WHERE lecturer_id = 'ADMIN002'")
    lecturer_result = cursor.fetchone()
    if lecturer_result:
        print(f"   • {lecturer_result[0]} - {lecturer_result[1]} ({lecturer_result[2]}) - {lecturer_result[3]}")
    else:
        print("   ❌ Super Admin not found in lecturers!")
    
    conn.close()
    
    print("\n" + "="*60)
    print("📋 LOGIN CREDENTIALS:")
    print("="*60)
    print("\n👑 Admin 1:")
    print("   Email: admin@attendance.com")
    print("   Password: Admin@2024#Secure")
    print("\n👑 Admin 2 (Super Admin):")
    print("   Email: superadmin@attendance.com")
    print("   Password: Super@2024#Secure")
    print("\n💡 Super Admin also appears in Lecturers page!")
    print("="*60)

if __name__ == "__main__":
    add_admins()