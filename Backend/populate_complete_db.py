# populate_complete_db.py
import sqlite3
import os
import random
from datetime import datetime, timedelta
import bcrypt
import hashlib

# Database path
DB_PATH = "Backend/data/institute.db"

def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def clear_database():
    """Clear all existing data from tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("DELETE FROM attendance")
    cursor.execute("DELETE FROM subjects")
    cursor.execute("DELETE FROM students")
    cursor.execute("DELETE FROM lecturers")
    cursor.execute("DELETE FROM admins")
    cursor.execute("DELETE FROM sqlite_sequence")
    
    conn.commit()
    conn.close()
    print("✓ Database cleared successfully")

# ================= ADMINS =================
def create_admins():
    """Create admins table and add two admins"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create admins table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check if admins already exist
    cursor.execute("SELECT COUNT(*) FROM admins")
    count = cursor.fetchone()[0]
    
    if count == 0:
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
        
        for admin in admins:
            hashed_pwd = hash_password(admin['password'])
            cursor.execute("""
                INSERT INTO admins (admin_id, name, email, password, role)
                VALUES (?, ?, ?, ?, ?)
            """, (admin['admin_id'], admin['name'], admin['email'], hashed_pwd, 'admin'))
        
        conn.commit()
        print(f"✓ Created {len(admins)} admins")
    else:
        print(f"✓ Admins already exist ({count} admins)")
    
    conn.close()

# ================= LECTURERS =================
def create_lecturers():
    """Create lecturers including Super Admin"""
    lecturers = [
        # Regular Lecturers
        {'lecturer_id': 'L001', 'name': 'Dr. Rajesh Iyer', 'email': 'rajesh.iyer@uni.edu', 'password': 'prof@201', 'department': 'Computer Science'},
        {'lecturer_id': 'L002', 'name': 'Prof. Sarah Johnson', 'email': 'sarah.johnson@uni.edu', 'password': 'prof@202', 'department': 'Computer Science'},
        {'lecturer_id': 'L003', 'name': 'Dr. Amit Sharma', 'email': 'amit.sharma@uni.edu', 'password': 'prof@203', 'department': 'Computer Science'},
        {'lecturer_id': 'L004', 'name': 'Prof. Priya Patel', 'email': 'priya.patel@uni.edu', 'password': 'prof@204', 'department': 'Electronics'},
        {'lecturer_id': 'L005', 'name': 'Dr. Vikram Singh', 'email': 'vikram.singh@uni.edu', 'password': 'prof@205', 'department': 'Electronics'},
        {'lecturer_id': 'L006', 'name': 'Prof. Meera Reddy', 'email': 'meera.reddy@uni.edu', 'password': 'prof@206', 'department': 'Mechanical'},
        {'lecturer_id': 'L007', 'name': 'Dr. Anand Kumar', 'email': 'anand.kumar@uni.edu', 'password': 'prof@207', 'department': 'Mechanical'},
        {'lecturer_id': 'L008', 'name': 'Prof. Neha Gupta', 'email': 'neha.gupta@uni.edu', 'password': 'prof@208', 'department': 'Civil'},
        {'lecturer_id': 'L009', 'name': 'Dr. Ramesh Choudhary', 'email': 'ramesh.choudhary@uni.edu', 'password': 'prof@209', 'department': 'Civil'},
        {'lecturer_id': 'L010', 'name': 'Prof. Kavita Singh', 'email': 'kavita.singh@uni.edu', 'password': 'prof@210', 'department': 'Mathematics'},
        
        # Super Admin as Lecturer
        {'lecturer_id': 'ADMIN002', 'name': 'Super Admin', 'email': 'superadmin@attendance.com', 'password': 'Super@2024#Secure', 'department': 'Administration'},
    ]
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for lec in lecturers:
        hashed_pwd = hash_password(lec['password'])
        cursor.execute("""
            INSERT INTO lecturers (lecturer_id, name, email, password, department)
            VALUES (?, ?, ?, ?, ?)
        """, (lec['lecturer_id'], lec['name'], lec['email'], hashed_pwd, lec['department']))
    
    conn.commit()
    conn.close()
    print(f"✓ Created {len(lecturers)} lecturers (including Super Admin)")

# ================= SUBJECTS =================
def create_subjects():
    """Create subjects"""
    subjects = [
        # Computer Science Subjects
        {'code': 'CS101', 'name': 'Programming Fundamentals', 'credits': 4, 'department': 'Computer Science', 'lecturer_id': 'L001'},
        {'code': 'CS201', 'name': 'Data Structures and Algorithms', 'credits': 4, 'department': 'Computer Science', 'lecturer_id': 'L001'},
        {'code': 'CS301', 'name': 'Database Management Systems', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L002'},
        {'code': 'CS401', 'name': 'Operating Systems', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L002'},
        {'code': 'CS501', 'name': 'Computer Networks', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L003'},
        {'code': 'CS601', 'name': 'Web Development', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L003'},
        {'code': 'CS701', 'name': 'Artificial Intelligence', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L001'},
        {'code': 'CS801', 'name': 'Machine Learning', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L002'},
        
        # Electronics Subjects
        {'code': 'EC101', 'name': 'Digital Electronics', 'credits': 4, 'department': 'Electronics', 'lecturer_id': 'L004'},
        {'code': 'EC201', 'name': 'Analog Circuits', 'credits': 4, 'department': 'Electronics', 'lecturer_id': 'L004'},
        {'code': 'EC301', 'name': 'Microprocessors', 'credits': 3, 'department': 'Electronics', 'lecturer_id': 'L005'},
        {'code': 'EC401', 'name': 'Embedded Systems', 'credits': 3, 'department': 'Electronics', 'lecturer_id': 'L005'},
        {'code': 'EC501', 'name': 'VLSI Design', 'credits': 3, 'department': 'Electronics', 'lecturer_id': 'L004'},
        
        # Mechanical Subjects
        {'code': 'ME101', 'name': 'Engineering Mechanics', 'credits': 4, 'department': 'Mechanical', 'lecturer_id': 'L006'},
        {'code': 'ME201', 'name': 'Thermodynamics', 'credits': 4, 'department': 'Mechanical', 'lecturer_id': 'L006'},
        {'code': 'ME301', 'name': 'Fluid Mechanics', 'credits': 3, 'department': 'Mechanical', 'lecturer_id': 'L007'},
        {'code': 'ME401', 'name': 'Heat Transfer', 'credits': 3, 'department': 'Mechanical', 'lecturer_id': 'L007'},
        {'code': 'ME501', 'name': 'Manufacturing Processes', 'credits': 3, 'department': 'Mechanical', 'lecturer_id': 'L006'},
        
        # Civil Subjects
        {'code': 'CE101', 'name': 'Building Materials', 'credits': 4, 'department': 'Civil', 'lecturer_id': 'L008'},
        {'code': 'CE201', 'name': 'Surveying', 'credits': 4, 'department': 'Civil', 'lecturer_id': 'L008'},
        {'code': 'CE301', 'name': 'Structural Analysis', 'credits': 3, 'department': 'Civil', 'lecturer_id': 'L009'},
        {'code': 'CE401', 'name': 'Geotechnical Engineering', 'credits': 3, 'department': 'Civil', 'lecturer_id': 'L009'},
        
        # Common Subjects
        {'code': 'MA101', 'name': 'Engineering Mathematics', 'credits': 4, 'department': 'Common', 'lecturer_id': 'L010'},
        {'code': 'PH101', 'name': 'Engineering Physics', 'credits': 4, 'department': 'Common', 'lecturer_id': 'L010'},
    ]
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    subject_id = 1
    for subj in subjects:
        cursor.execute("""
            INSERT INTO subjects (subject_id, code, name, credits, department, lecturer_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (subject_id, subj['code'], subj['name'], subj['credits'], subj['department'], subj['lecturer_id']))
        subject_id += 1
    
    conn.commit()
    conn.close()
    print(f"✓ Created {len(subjects)} subjects")

# ================= STUDENTS =================
def determine_attendance_pattern(student_num, dept):
    """Determine attendance pattern for a student"""
    seed_string = f"{dept}_{student_num}"
    hash_value = int(hashlib.md5(seed_string.encode()).hexdigest()[:8], 16)
    seed = hash_value % 100
    
    if seed < 20:
        rate_min, rate_max = 40, 59
        pattern_type = "critical"
    elif seed < 45:
        rate_min, rate_max = 60, 74
        pattern_type = "warning"
    elif seed < 65:
        rate_min, rate_max = 75, 79
        pattern_type = "borderline"
    elif seed < 85:
        rate_min, rate_max = 80, 84
        pattern_type = "average"
    else:
        rate_min, rate_max = 85, 98
        pattern_type = "good"
    
    return {'rate_min': rate_min, 'rate_max': rate_max, 'pattern_type': pattern_type}

def create_students():
    """Create students"""
    students = []
    
    # Computer Science Students (40)
    cse_names = [
        "Aarav Sharma", "Vihaan Gupta", "Vivaan Patel", "Anaya Singh", "Diya Reddy",
        "Krishna Iyer", "Sai Kumar", "Aditya Verma", "Ishaan Malhotra", "Aanya Joshi",
        "Advik Mehta", "Ananya Nair", "Arjun Krishnan", "Ishita Kapoor", "Kabir Singh",
        "Lavanya Sharma", "Mohit Agarwal", "Naina Bhatt", "Pranav Desai", "Riya Fernandes",
        "Rohan Choudhary", "Sanjana Reddy", "Shaurya Khanna", "Tanvi Shah", "Yash Gupta",
        "Zara Khan", "Aryan Singh", "Kavya Patel", "Reyansh Kumar", "Sia Mehta",
        "Arnav Singh", "Myra Reddy", "Darsh Patel", "Kiara Sharma", "Ayaan Khan",
        "Anvi Mehta", "Rudra Iyer", "Ira Gupta", "Shaan Verma", "Tara Nair"
    ]
    
    # Electronics Students (25)
    ece_names = [
        "Akash Verma", "Bhumi Patel", "Chirag Shah", "Disha Mehta", "Eshan Gupta",
        "Falak Khan", "Gaurav Singh", "Heena Sharma", "Ishan Joshi", "Jiya Reddy",
        "Kunal Desai", "Lakshya Kumar", "Mira Nair", "Neel Iyer", "Ojasvi Singh",
        "Parth Mehta", "Qurat Khan", "Rishi Sharma", "Sana Patel", "Tejas Joshi",
        "Urvi Desai", "Vedant Kumar", "Wafa Khan", "Xavier D'Souza", "Yamini Reddy"
    ]
    
    # Mechanical Students (25)
    me_names = [
        "Amit Trivedi", "Bhavya Shah", "Chetan Patil", "Divya Sharma", "Eshaan Gupta",
        "Fatima Khan", "Girish Rao", "Harshita Mehta", "Ishwar Singh", "Jatin Verma",
        "Komal Joshi", "Lokesh Reddy", "Manisha Patel", "Nikhil Kumar", "Omkar Desai",
        "Pooja Singh", "Quinn D'Souza", "Rahul Mehta", "Simran Kaur", "Tanay Joshi",
        "Ujjwal Sharma", "Vidya Patel", "Waseem Khan", "Yashika Reddy", "Zubin Mehta"
    ]
    
    # Civil Students (20)
    civil_names = [
        "Ankit Sharma", "Barkha Singh", "Chirag Mehta", "Deepa Patel", "Ekansh Gupta",
        "Farah Khan", "Gaurav Joshi", "Himani Reddy", "Ishaan Verma", "Jasmine Kaur",
        "Karan Sharma", "Lata Patel", "Manoj Kumar", "Neha Singh", "Om Prakash",
        "Priyanka Mehta", "Rahul Sharma", "Sneha Reddy", "Tushar Gupta", "Usha Devi"
    ]
    
    # CSE Students
    for i, name in enumerate(cse_names, 1):
        pattern = determine_attendance_pattern(i, 'CSE')
        students.append({
            'student_id': f'CSE{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Computer Science',
            'attendance_pattern': pattern
        })
    
    # ECE Students
    for i, name in enumerate(ece_names, 1):
        pattern = determine_attendance_pattern(i, 'ECE')
        students.append({
            'student_id': f'ECE{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Electronics',
            'attendance_pattern': pattern
        })
    
    # ME Students
    for i, name in enumerate(me_names, 1):
        pattern = determine_attendance_pattern(i, 'ME')
        students.append({
            'student_id': f'ME{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Mechanical',
            'attendance_pattern': pattern
        })
    
    # Civil Students
    for i, name in enumerate(civil_names, 1):
        pattern = determine_attendance_pattern(i, 'CE')
        students.append({
            'student_id': f'CE{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Civil',
            'attendance_pattern': pattern
        })
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    for student in students:
        hashed_pwd = hash_password(student['password'])
        cursor.execute("""
            INSERT INTO students (student_id, name, email, password, batch, department)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (student['student_id'], student['name'], student['email'], hashed_pwd, 
              student['batch'], student['department']))
    
    conn.commit()
    conn.close()
    
    return students

# ================= ATTENDANCE =================
def create_attendance(students_with_patterns):
    """Create attendance records"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT subject_id, code, department FROM subjects")
    subjects = cursor.fetchall()
    
    subjects_by_dept = {}
    for subject in subjects:
        subject_id, subject_code, subject_dept = subject
        if subject_dept not in subjects_by_dept:
            subjects_by_dept[subject_dept] = []
        subjects_by_dept[subject_dept].append({'id': subject_id, 'code': subject_code, 'dept': subject_dept})
    
    student_patterns = {}
    for student in students_with_patterns:
        student_patterns[student['student_id']] = student['attendance_pattern']
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)
    
    attendance_count = 0
    
    print("   Generating attendance records...")
    
    for student in students_with_patterns:
        student_id = student['student_id']
        student_dept = student['department']
        
        student_subjects = []
        if student_dept in subjects_by_dept:
            student_subjects.extend(subjects_by_dept[student_dept])
        if 'Common' in subjects_by_dept:
            student_subjects.extend(subjects_by_dept['Common'])
        
        if not student_subjects:
            continue
        
        for subject in student_subjects:
            subject_id = subject['id']
            subject_code = subject['code']
            
            current_date = start_date
            while current_date <= end_date:
                if current_date.weekday() < 5:
                    date_str = current_date.strftime('%Y-%m-%d')
                    
                    if random.random() < 0.85:
                        pattern = student_patterns.get(student_id, {'rate_min': 85, 'rate_max': 95})
                        seed_value = hash(f"{student_id}_{date_str}_{subject_id}") % 1000
                        random.seed(seed_value)
                        
                        base_rate = random.uniform(pattern['rate_min'], pattern['rate_max']) / 100
                        attendance_probability = max(0.30, min(0.98, base_rate))
                        
                        is_present = random.random() < attendance_probability
                        
                        if is_present:
                            status = 'late' if random.random() < 0.15 else 'present'
                        else:
                            status = 'absent'
                        
                        cursor.execute("""
                            INSERT INTO attendance 
                            (subject_id, student_id, date, status, marked_by, timestamp)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (subject_id, student_id, date_str, status, 'system', datetime.now().isoformat()))
                        
                        attendance_count += 1
                
                current_date += timedelta(days=1)
            
            random.seed()
    
    conn.commit()
    conn.close()
    print(f"   ✓ Created {attendance_count:,} attendance records")

# ================= PRINT STATISTICS =================
def print_statistics():
    """Print database statistics"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n" + "="*70)
    print("DATABASE STATISTICS")
    print("="*70)
    
    cursor.execute("SELECT COUNT(*) FROM students")
    student_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM lecturers")
    lecturer_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM subjects")
    subject_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM attendance")
    attendance_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM admins")
    admin_count = cursor.fetchone()[0]
    
    print(f"\n📊 TOTAL RECORDS:")
    print(f"   • Admins: {admin_count}")
    print(f"   • Students: {student_count}")
    print(f"   • Lecturers: {lecturer_count} (including Super Admin)")
    print(f"   • Subjects: {subject_count}")
    print(f"   • Attendance Records: {attendance_count:,}")
    
    print(f"\n👥 STUDENTS BY DEPARTMENT:")
    cursor.execute("SELECT department, COUNT(*) FROM students GROUP BY department")
    for dept, count in cursor.fetchall():
        print(f"   • {dept}: {count} students")
    
    print(f"\n👑 ADMINS:")
    cursor.execute("SELECT admin_id, name, email, role FROM admins")
    for admin in cursor.fetchall():
        print(f"   • {admin[1]} ({admin[0]}): {admin[2]} - {admin[3]}")
    
    print("="*70)
    conn.close()

# ================= MAIN =================
def main():
    print("\n" + "="*70)
    print("ATTENDANCE ATLAS - COMPLETE DATABASE POPULATOR")
    print("="*70)
    print("\nThis script will create:")
    print("   • 2 Admins (with strong passwords)")
    print("   • 11 Lecturers (including Super Admin)")
    print("   • 110 Students (CSE:40, ECE:25, ME:25, Civil:20)")
    print("   • 25 Subjects")
    print("   • Attendance records for last 60 days")
    
    if not os.path.exists(DB_PATH):
        print("\n❌ Database not found! Please run the app first.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM students")
    count = cursor.fetchone()[0]
    conn.close()
    
    if count > 0:
        print("\n✅ Database already has data!")
        print("   Skipping population...")
        return
    
    print("\n⚠️  WARNING: This will DELETE all existing data!")
    confirm = input("\nType 'yes' to continue: ")
    
    if confirm.lower() != 'yes':
        print("\n❌ Operation cancelled.")
        return
    
    print("\n🔄 Clearing existing data...")
    clear_database()
    
    print("\n👑 Creating admins...")
    create_admins()
    
    print("\n📝 Creating lecturers...")
    create_lecturers()
    
    print("\n📚 Creating subjects...")
    create_subjects()
    
    print("\n👥 Creating students...")
    students = create_students()
    
    print("\n📊 Generating attendance...")
    create_attendance(students)
    
    print("\n📊 Generating statistics...")
    print_statistics()
    
    print("\n" + "="*70)
    print("✅ DATABASE POPULATION COMPLETE!")
    print("="*70)
    print("\n🎯 ADMIN CREDENTIALS:")
    print("   👑 Admin 1: admin@attendance.com / Admin@2024#Secure")
    print("   👑 Admin 2: superadmin@attendance.com / Super@2024#Secure")
    print("\n🎯 STUDENT TEST CREDENTIALS (password: student@1001):")
    print("   • CSE Student: aarav.sharma@uni.edu")
    print("   • ECE Student: akash.verma@uni.edu")
    print("   • ME Student: amit.trivedi@uni.edu")
    print("   • CE Student: ankit.sharma@uni.edu")
    print("\n🎯 LECTURER CREDENTIALS (password: prof@201):")
    print("   • Dr. Rajesh Iyer: rajesh.iyer@uni.edu")
    print("   • Super Admin: superadmin@attendance.com / Super@2024#Secure")
    print("="*70)

if __name__ == "__main__":
    main()