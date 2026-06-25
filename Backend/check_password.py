import sqlite3
import bcrypt

DB_PATH = 'Backend/data/institute.db'

def check_password(password, hashed):
    """Verify a password against its hash"""
    if not hashed or not password:
        return False
    try:
        # Check if it's a bcrypt hash (starts with $2b$)
        if hashed.startswith('$2b$'):
            print(f"  🔍 Checking bcrypt hash...")
            result = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
            print(f"  🔍 bcrypt check result: {result}")
            return result
        else:
            # For plain text passwords, compare directly
            print(f"  🔍 Comparing plain text...")
            result = password == hashed
            print(f"  🔍 Plain text result: {result}")
            return result
    except Exception as e:
        print(f"Password check error: {str(e)}")
        return False

print("="*60)
print("PASSWORD CHECKER TOOL")
print("="*60)

# Connect to database
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get all students
cursor.execute("SELECT student_id, name, email, password FROM students")
students = cursor.fetchall()

print(f"\n📊 Total students found: {len(students)}")
print("\n" + "="*60)
print("CHECKING PASSWORDS")
print("="*60)

# Check each student
for student in students:
    student_id, name, email, stored_pwd = student
    
    # Show password format
    pwd_type = "HASHED" if stored_pwd.startswith('$2b$') else "PLAIN TEXT"
    
    print(f"\n📚 Student: {name}")
    print(f"   Email: {email}")
    print(f"   Password type: {pwd_type}")
    print(f"   Stored: {stored_pwd[:50]}...")
    
    # Test with common passwords
    test_passwords = ['student@1001', 'password123', 'Test@123']
    
    for test_pwd in test_passwords:
        print(f"\n   Testing password: '{test_pwd}'")
        result = check_password(test_pwd, stored_pwd)
        if result:
            print(f"   ✅ CORRECT PASSWORD: '{test_pwd}' works for {name}")
            break
    else:
        print(f"   ❌ None of the common passwords worked for {name}")

print("\n" + "="*60)
print("RECOMMENDATIONS")
print("="*60)

# Find students with plain text passwords
cursor.execute("SELECT name, email FROM students WHERE password NOT LIKE '$2b$%'")
plain_text_students = cursor.fetchall()

if plain_text_students:
    print(f"\n⚠️ Found {len(plain_text_students)} students with PLAIN TEXT passwords:")
    for name, email in plain_text_students:
        print(f"   - {name} ({email})")
    print("\n💡 These students can login with their plain text passwords.")
    print("   The check_password function will work correctly with them.")

# Find students with hashed passwords
cursor.execute("SELECT name, email FROM students WHERE password LIKE '$2b$%'")
hashed_students = cursor.fetchall()

if hashed_students:
    print(f"\n✅ Found {len(hashed_students)} students with HASHED passwords:")
    for name, email in hashed_students:
        print(f"   - {name} ({email})")

conn.close()

print("\n" + "="*60)
print("TO TEST A SPECIFIC STUDENT:")
print("="*60)

# Let user test a specific student
email_input = input("\nEnter email to test (or press Enter to skip): ").strip()

if email_input:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name, password FROM students WHERE email = ?", (email_input,))
    row = cursor.fetchone()
    
    if row:
        name, stored_pwd = row
        print(f"\n📚 Testing: {name}")
        print(f"Email: {email_input}")
        
        password_input = input("Enter password to test: ")
        result = check_password(password_input, stored_pwd)
        
        if result:
            print(f"\n✅ SUCCESS! '{password_input}' is the correct password for {name}")
        else:
            print(f"\n❌ FAILED! '{password_input}' is NOT the correct password for {name}")
    else:
        print(f"\n❌ Student not found with email: {email_input}")
    
    conn.close()