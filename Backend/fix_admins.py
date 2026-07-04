# fix_admins.py
import sqlite3
import bcrypt
import os

DB_PATH = r'C:\Users\User\project git\Attendance_tracker\Backend\data\institute.db'

def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

print("\n" + "="*50)
print("🔧 ADDING ADMINS TO DATABASE")
print("="*50)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create admins table WITHOUT last_login column
cursor.execute('''
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
    )
''')
print("✅ Admin table created")

# Clear existing admins
cursor.execute("DELETE FROM admins")
print("✅ Cleared old admins")

# Add two admins
admins = [
    ('ADMIN001', 'System Administrator', 'admin@attendance.com', 'Admin@2024#Secure'),
    ('ADMIN002', 'Super Admin', 'superadmin@attendance.com', 'Super@2024#Secure')
]

for admin in admins:
    hashed = hash_password(admin[3])
    cursor.execute('''
        INSERT INTO admins (admin_id, name, email, password, role)
        VALUES (?, ?, ?, ?, ?)
    ''', (admin[0], admin[1], admin[2], hashed, 'admin'))
    print(f"✅ Added: {admin[1]}")

conn.commit()
conn.close()

print("\n" + "="*50)
print("✅ DONE! NOW LOGIN TO ADMIN PANEL")
print("="*50)
print("\n👑 ADMIN 1:")
print("   Email: admin@attendance.com")
print("   Password: Admin@2024#Secure")
print("\n👑 ADMIN 2:")
print("   Email: superadmin@attendance.com")
print("   Password: Super@2024#Secure")
print("="*50)