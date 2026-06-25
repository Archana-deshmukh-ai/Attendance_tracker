# test_password.py - Check if a password matches the hash

import sqlite3
import bcrypt

DB_PATH = r'C:\Users\User\project git\Attendance_tracker\Backend\data\institute.db'

def check_password(lecturer_id, test_password):
    """Check if a password matches the stored hash"""
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT name, password FROM lecturers WHERE lecturer_id = ?', (lecturer_id,))
    lecturer = cursor.fetchone()
    conn.close()
    
    if lecturer:
        stored_hash = lecturer['password']
        
        # Check if password matches
        if bcrypt.checkpw(test_password.encode('utf-8'), stored_hash.encode('utf-8')):
            print(f"✅ YES! '{test_password}' is the correct password for {lecturer['name']}")
            return True
        else:
            print(f"❌ NO. '{test_password}' is NOT the password for {lecturer['name']}")
            return False
    else:
        print(f"❌ Lecturer {lecturer_id} not found")
        return False

# Test common passwords
print("\n" + "="*60)
print("🔐 TESTING COMMON PASSWORDS FOR LECTURERS")
print("="*60)

# Try common passwords
check_password('L001', 'password123')
check_password('L001', 'lecturer@201')
check_password('L001', 'default123')
check_password('L001', 'admin123')
check_password('L001', '12345678')