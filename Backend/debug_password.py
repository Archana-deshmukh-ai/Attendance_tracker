import sqlite3
import bcrypt

DB_PATH = 'Backend/data/institute.db'

def check_password(password, hashed):
    """Verify a password against its hash"""
    if not hashed or not password:
        return False
    try:
        if hashed.startswith('$2b$'):
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        else:
            return password == hashed
    except Exception as e:
        print(f"Error: {e}")
        return False

print("="*60)
print("PASSWORD DEBUG TOOL")
print("="*60)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check specific student
email_to_check = input("\nEnter email to check (or press Enter for aditya.kumar@uni.edu): ").strip()
if not email_to_check:
    email_to_check = 'aditya.kumar@uni.edu'

cursor.execute("SELECT name, email, password, department FROM students WHERE email = ?", (email_to_check,))
row = cursor.fetchone()

if row:
    name, email, stored_pwd, dept = row
    print(f"\n📋 STUDENT FOUND:")
    print(f"   Name: {name}")
    print(f"   Email: {email}")
    print(f"   Department: {dept}")
    print(f"   Password (first 50 chars): {stored_pwd[:50]}...")
    print(f"   Is hashed: {stored_pwd.startswith('$2b$')}")
    
    # Test with common passwords
    test_passwords = ['student@1001', 'password123', 'Test@123']
    
    print(f"\n🔍 TESTING PASSWORDS:")
    for test_pwd in test_passwords:
        result = check_password(test_pwd, stored_pwd)
        print(f"   '{test_pwd}': {result}")
    
    # If none worked, ask user to enter password
    print(f"\n💡 Try entering the actual password:")
    user_pwd = input("Enter password to test: ")
    result = check_password(user_pwd, stored_pwd)
    print(f"   Result: {result}")
    
    if not result and stored_pwd.startswith('$2b$'):
        print(f"\n⚠️ The password is hashed but verification failed.")
        print(f"   This means the password you entered doesn't match the stored hash.")
        print(f"   You may need to reset this password.")
        
        # Offer to reset
        reset = input("\nDo you want to reset this password to 'student@1001'? (yes/no): ")
        if reset.lower() == 'yes':
            new_hash = bcrypt.hashpw('student@1001'.encode('utf-8'), bcrypt.gensalt())
            cursor.execute("UPDATE students SET password = ? WHERE email = ?", (new_hash.decode('utf-8'), email))
            conn.commit()
            print(f"✅ Password reset for {email} to 'student@1001'")
else:
    print(f"\n❌ Student not found with email: {email_to_check}")
    print("\nAvailable students:")
    cursor.execute("SELECT name, email FROM students LIMIT 10")
    for name, email in cursor.fetchall():
        print(f"   - {name}: {email}")

conn.close()