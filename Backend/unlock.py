import sqlite3
import os
import json

print("="*50)
print("UNLOCKING ACCOUNT")
print("="*50)

# First, get a student email from database
try:
    conn = sqlite3.connect('Backend/data/institute.db')
    cursor = conn.cursor()
    cursor.execute("SELECT email FROM students LIMIT 1")
    row = cursor.fetchone()
    if row:
        email = row[0]
        print(f"Found student: {email}")
    else:
        email = "aarav.sharma@uni.edu"
        print(f"Using default: {email}")
    conn.close()
except:
    email = "aarav.sharma@uni.edu"
    print(f"Using default: {email}")

# Clear account locks
security_dir = 'Backend/data/security'
lock_file = os.path.join(security_dir, 'account_locks.json')

print(f"\nChecking lock file: {lock_file}")

if os.path.exists(lock_file):
    try:
        with open(lock_file, 'r') as f:
            locks = json.load(f)
        
        print(f"Found {len(locks)} locked accounts")
        
        # Remove the specific account
        if email in locks:
            del locks[email]
            print(f"✅ Removed lock for {email}")
        else:
            print(f"✅ {email} is not locked")
        
        # Save the updated locks
        with open(lock_file, 'w') as f:
            json.dump(locks, f, indent=2)
        
        print("✅ Lock file updated!")
    except Exception as e:
        print(f"Error: {e}")
else:
    print("No lock file found - account is not locked")

# Also clear the login attempts file
attempts_file = os.path.join(security_dir, 'login_attempts.json')
if os.path.exists(attempts_file):
    try:
        with open(attempts_file, 'r') as f:
            attempts = json.load(f)
        
        # Reset failed counts
        if email in attempts and isinstance(attempts[email], dict):
            attempts[email]['failed_count'] = 0
            print(f"✅ Reset failed attempts for {email}")
        
        with open(attempts_file, 'w') as f:
            json.dump(attempts, f, indent=2)
    except:
        pass

print("\n" + "="*50)
print("✅ ACCOUNT UNLOCKED!")
print("="*50)
print("\n🔑 Now login with:")
print(f"   Email: {email}")
print("   Password: student@1001")
print("\nMake sure your Flask app is running:")
print("   python app.py")