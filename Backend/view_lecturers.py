# check_plain_passwords.py - Find plain text passwords

import sqlite3

DB_PATH = r'C:\Users\User\project git\Attendance_tracker\Backend\data\institute.db'

def check_plain_text_passwords():
    """Check for lecturers with plain text passwords"""
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get all lecturers
    cursor.execute('SELECT lecturer_id, name, email, password FROM lecturers')
    lecturers = cursor.fetchall()
    
    print("\n" + "="*80)
    print("🔐 PASSWORD TYPE CHECK - LECTURERS")
    print("="*80)
    
    hashed_count = 0
    plain_count = 0
    null_count = 0
    
    for lecturer in lecturers:
        password = lecturer['password']
        
        if password is None:
            print(f"⚠️ {lecturer['lecturer_id']} - {lecturer['name']}: NO PASSWORD SET")
            null_count += 1
        elif password.startswith('$2b$'):
            print(f"✅ {lecturer['lecturer_id']} - {lecturer['name']}: HASHED (bcrypt)")
            hashed_count += 1
        else:
            print(f"🔓 {lecturer['lecturer_id']} - {lecturer['name']}: PLAIN TEXT = '{password}'")
            plain_count += 1
    
    print("\n" + "="*80)
    print("📊 SUMMARY:")
    print(f"   Hashed passwords: {hashed_count}")
    print(f"   Plain text passwords: {plain_count}")
    print(f"   No password: {null_count}")
    print(f"   Total: {len(lecturers)}")
    print("="*80)
    
    conn.close()

def check_students_plain_passwords():
    """Check for students with plain text passwords"""
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT student_id, name, email, password FROM students LIMIT 20')
    students = cursor.fetchall()
    
    print("\n" + "="*80)
    print("🔐 PASSWORD TYPE CHECK - STUDENTS (First 20)")
    print("="*80)
    
    plain_found = False
    
    for student in students:
        password = student['password']
        
        if password and not password.startswith('$2b$'):
            print(f"🔓 {student['student_id']} - {student['name']}: PLAIN TEXT = '{password}'")
            plain_found = True
    
    if not plain_found:
        print("✅ No plain text passwords found in students table!")
    
    conn.close()

if __name__ == "__main__":
    check_plain_text_passwords()
    check_students_plain_passwords()