# populate_complete_db.py
import sqlite3
import os
import random
from datetime import datetime, timedelta
import bcrypt

# Database path
DB_PATH = os.path.join("data", "institute.db")

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
    cursor.execute("DELETE FROM sqlite_sequence")
    
    conn.commit()
    conn.close()
    print("✓ Database cleared successfully")

def create_lecturers():
    """Create lecturers with ALL columns filled"""
    lecturers = [
        # CSE Department
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
    print(f"✓ Created {len(lecturers)} lecturers")

def create_subjects():
    """Create subjects with department-specific subjects only"""
    subjects = [
        # Computer Science Subjects (Only CSE students take these)
        {'code': 'CS101', 'name': 'Programming Fundamentals', 'credits': 4, 'department': 'Computer Science', 'lecturer_id': 'L001'},
        {'code': 'CS201', 'name': 'Data Structures and Algorithms', 'credits': 4, 'department': 'Computer Science', 'lecturer_id': 'L001'},
        {'code': 'CS301', 'name': 'Database Management Systems', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L002'},
        {'code': 'CS401', 'name': 'Operating Systems', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L002'},
        {'code': 'CS501', 'name': 'Computer Networks', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L003'},
        {'code': 'CS601', 'name': 'Web Development', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L003'},
        {'code': 'CS701', 'name': 'Artificial Intelligence', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L001'},
        {'code': 'CS801', 'name': 'Machine Learning', 'credits': 3, 'department': 'Computer Science', 'lecturer_id': 'L002'},
        
        # Electronics Subjects (Only ECE students take these)
        {'code': 'EC101', 'name': 'Digital Electronics', 'credits': 4, 'department': 'Electronics', 'lecturer_id': 'L004'},
        {'code': 'EC201', 'name': 'Analog Circuits', 'credits': 4, 'department': 'Electronics', 'lecturer_id': 'L004'},
        {'code': 'EC301', 'name': 'Microprocessors', 'credits': 3, 'department': 'Electronics', 'lecturer_id': 'L005'},
        {'code': 'EC401', 'name': 'Embedded Systems', 'credits': 3, 'department': 'Electronics', 'lecturer_id': 'L005'},
        {'code': 'EC501', 'name': 'VLSI Design', 'credits': 3, 'department': 'Electronics', 'lecturer_id': 'L004'},
        
        # Mechanical Subjects (Only ME students take these)
        {'code': 'ME101', 'name': 'Engineering Mechanics', 'credits': 4, 'department': 'Mechanical', 'lecturer_id': 'L006'},
        {'code': 'ME201', 'name': 'Thermodynamics', 'credits': 4, 'department': 'Mechanical', 'lecturer_id': 'L006'},
        {'code': 'ME301', 'name': 'Fluid Mechanics', 'credits': 3, 'department': 'Mechanical', 'lecturer_id': 'L007'},
        {'code': 'ME401', 'name': 'Heat Transfer', 'credits': 3, 'department': 'Mechanical', 'lecturer_id': 'L007'},
        {'code': 'ME501', 'name': 'Manufacturing Processes', 'credits': 3, 'department': 'Mechanical', 'lecturer_id': 'L006'},
        
        # Civil Subjects (Only CE students take these)
        {'code': 'CE101', 'name': 'Building Materials', 'credits': 4, 'department': 'Civil', 'lecturer_id': 'L008'},
        {'code': 'CE201', 'name': 'Surveying', 'credits': 4, 'department': 'Civil', 'lecturer_id': 'L008'},
        {'code': 'CE301', 'name': 'Structural Analysis', 'credits': 3, 'department': 'Civil', 'lecturer_id': 'L009'},
        {'code': 'CE401', 'name': 'Geotechnical Engineering', 'credits': 3, 'department': 'Civil', 'lecturer_id': 'L009'},
        
        # Common Subjects (All departments take these)
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

def create_students():
    """Create students with department-specific IDs"""
    students = []
    
    # Computer Science Students (40 students)
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
    
    # Electronics Students (25 students)
    ece_names = [
        "Akash Verma", "Bhumi Patel", "Chirag Shah", "Disha Mehta", "Eshan Gupta",
        "Falak Khan", "Gaurav Singh", "Heena Sharma", "Ishan Joshi", "Jiya Reddy",
        "Kunal Desai", "Lakshya Kumar", "Mira Nair", "Neel Iyer", "Ojasvi Singh",
        "Parth Mehta", "Qurat Khan", "Rishi Sharma", "Sana Patel", "Tejas Joshi",
        "Urvi Desai", "Vedant Kumar", "Wafa Khan", "Xavier D'Souza", "Yamini Reddy"
    ]
    
    # Mechanical Students (25 students)
    me_names = [
        "Amit Trivedi", "Bhavya Shah", "Chetan Patil", "Divya Sharma", "Eshaan Gupta",
        "Fatima Khan", "Girish Rao", "Harshita Mehta", "Ishwar Singh", "Jatin Verma",
        "Komal Joshi", "Lokesh Reddy", "Manisha Patel", "Nikhil Kumar", "Omkar Desai",
        "Pooja Singh", "Quinn D'Souza", "Rahul Mehta", "Simran Kaur", "Tanay Joshi",
        "Ujjwal Sharma", "Vidya Patel", "Waseem Khan", "Yashika Reddy", "Zubin Mehta"
    ]
    
    # Civil Students (20 students)
    civil_names = [
        "Ankit Sharma", "Barkha Singh", "Chirag Mehta", "Deepa Patel", "Ekansh Gupta",
        "Farah Khan", "Gaurav Joshi", "Himani Reddy", "Ishaan Verma", "Jasmine Kaur",
        "Karan Sharma", "Lata Patel", "Manoj Kumar", "Neha Singh", "Om Prakash",
        "Priyanka Mehta", "Rahul Sharma", "Sneha Reddy", "Tushar Gupta", "Usha Devi"
    ]
    
    # CSE Students
    for i, name in enumerate(cse_names, 1):
        students.append({
            'student_id': f'CSE{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Computer Science'
        })
    
    # ECE Students
    for i, name in enumerate(ece_names, 1):
        students.append({
            'student_id': f'ECE{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Electronics'
        })
    
    # ME Students
    for i, name in enumerate(me_names, 1):
        students.append({
            'student_id': f'ME{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Mechanical'
        })
    
    # Civil Students
    for i, name in enumerate(civil_names, 1):
        students.append({
            'student_id': f'CE{i:03d}',
            'name': name,
            'email': f'{name.lower().replace(" ", ".")}@uni.edu',
            'password': 'student@1001',
            'batch': '2024',
            'department': 'Civil'
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
    print(f"✓ Created {len(students)} students")

def create_attendance():
    """Create realistic attendance records - students only attend subjects from their department + common subjects"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all subjects
    cursor.execute("SELECT subject_id, code, department FROM subjects")
    subjects = cursor.fetchall()
    
    # Get all students with their departments
    cursor.execute("SELECT student_id, department FROM students")
    students = cursor.fetchall()
    
    # Create mapping of subjects by department
    subjects_by_dept = {}
    for subject in subjects:
        subject_id, code, dept = subject
        if dept not in subjects_by_dept:
            subjects_by_dept[dept] = []
        subjects_by_dept[dept].append((subject_id, code))
    
    attendance_count = 0
    total_days = 0
    
    print("   Generating attendance records...")
    
    # For each student, generate attendance only for their department subjects + common subjects
    for student in students:
        student_id, student_dept = student
        
        # Determine which subjects this student takes
        student_subjects = []
        
        # Add department-specific subjects
        if student_dept in subjects_by_dept:
            student_subjects.extend(subjects_by_dept[student_dept])
        
        # Add common subjects (Mathematics, Physics)
        if 'Common' in subjects_by_dept:
            student_subjects.extend(subjects_by_dept['Common'])
        
        if not student_subjects:
            continue
        
        # Generate attendance for last 60 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=60)
        
        current_date = start_date
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() < 5:
                date_str = current_date.strftime('%Y-%m-%d')
                total_days += 1
                
                # For each subject this student takes
                for subject_id, subject_code in student_subjects:
                    # Determine class probability (80% for core subjects, 90% for common)
                    if subject_code.startswith(('CS', 'EC', 'ME', 'CE')):
                        class_probability = 0.85  # Core subjects
                    else:
                        class_probability = 0.90  # Common subjects
                    
                    if random.random() < class_probability:
                        # Generate attendance based on student pattern
                        student_num = int(student_id[3:]) if student_id[3:].isdigit() else 0
                        
                        # Different attendance patterns
                        if student_num % 10 < 2:  # 20% students - low attendance
                            attendance_rate = random.uniform(0.50, 0.70)
                        elif student_num % 10 < 6:  # 40% students - medium attendance
                            attendance_rate = random.uniform(0.70, 0.85)
                        else:  # 40% students - high attendance
                            attendance_rate = random.uniform(0.85, 0.98)
                        
                        is_present = random.random() < attendance_rate
                        
                        if is_present:
                            status = 'late' if random.random() < 0.10 else 'present'
                        else:
                            status = 'absent'
                        
                        # Get lecturer
                        cursor.execute("SELECT lecturer_id FROM subjects WHERE subject_id = ?", (subject_id,))
                        lecturer = cursor.fetchone()
                        lecturer_id = lecturer[0] if lecturer else None
                        
                        # Add remarks
                        remarks = None
                        if status == 'absent' and random.random() < 0.15:
                            remarks_list = ['Medical leave', 'Family emergency', 'Sports event', 'Technical event', 'Personal reason']
                            remarks = random.choice(remarks_list)
                        elif status == 'late' and random.random() < 0.20:
                            remarks = 'Arrived late to class'
                        
                        cursor.execute("""
                            INSERT INTO attendance 
                            (subject_id, student_id, date, status, marked_by, timestamp, remarks)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (subject_id, student_id, date_str, status, lecturer_id, 
                              datetime.now().isoformat(), remarks))
                        
                        attendance_count += 1
            
            current_date += timedelta(days=1)
        
        # Show progress
        if len([s for s in students if s[0] == student_id]) % 20 == 0:
            print(f"      Processed {student_id}...")
        
        # Reset random seed
        random.seed()
    
    conn.commit()
    conn.close()
    print(f"   ✓ Created {attendance_count:,} attendance records")

def print_complete_statistics():
    """Print detailed database statistics"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n" + "="*70)
    print("COMPLETE DATABASE STATISTICS")
    print("="*70)
    
    cursor.execute("SELECT COUNT(*) FROM students")
    student_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM lecturers")
    lecturer_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM subjects")
    subject_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM attendance")
    attendance_count = cursor.fetchone()[0]
    
    print(f"\n📊 TOTAL RECORDS:")
    print(f"   • Students: {student_count}")
    print(f"   • Lecturers: {lecturer_count}")
    print(f"   • Subjects: {subject_count}")
    print(f"   • Attendance Records: {attendance_count:,}")
    
    print(f"\n👥 STUDENTS BY DEPARTMENT:")
    cursor.execute("SELECT department, COUNT(*) FROM students GROUP BY department")
    for dept, count in cursor.fetchall():
        print(f"   • {dept}: {count} students")
    
    print(f"\n📚 SUBJECTS BY DEPARTMENT:")
    cursor.execute("SELECT department, COUNT(*) FROM subjects GROUP BY department")
    for dept, count in cursor.fetchall():
        print(f"   • {dept}: {count} subjects")
    
    # Verify department-specific attendance
    print(f"\n✅ VERIFYING DEPARTMENT-SPECIFIC ATTENDANCE:")
    cursor.execute("""
        SELECT s.department, COUNT(DISTINCT a.student_id) as students_with_attendance
        FROM students s
        JOIN attendance a ON s.student_id = a.student_id
        GROUP BY s.department
    """)
    for dept, count in cursor.fetchall():
        print(f"   • {dept}: {count} students have attendance records")
    
    cursor.execute("SELECT MIN(date), MAX(date) FROM attendance")
    date_range = cursor.fetchone()
    if date_range[0] and date_range[1]:
        print(f"\n📅 ATTENDANCE DATE RANGE:")
        print(f"   • From: {date_range[0]}")
        print(f"   • To: {date_range[1]}")
    
    conn.close()
    print("="*70)

def main():
    # Add a flag to check if data already exists
    def is_data_populated():
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM students")
        count = cursor.fetchone()[0]
        conn.close()
        return count > 0


    if is_data_populated():
        print("✅ Database already has data!")
        print("   Skipping population...")
        return
    # ... rest of the script
    """Main function to populate database"""
    print("\n" + "="*70)
    print("ATTENDANCE ATLAS - COMPLETE DATABASE POPULATOR")
    print("="*70)
    print("\nThis script will create:")
    print("   • 10 Lecturers")
    print("   • 110 Students (CSE:40, ECE:25, ME:25, Civil:20)")
    print("   • 25 Subjects (Department-specific + Common subjects)")
    print("   • Attendance records for last 60 days")
    print("   • Students ONLY attend subjects from their department + Common subjects")
    
    if not os.path.exists(DB_PATH):
        print("\n❌ Database not found! Please run the app first.")
        return
    
    print("\n⚠️  WARNING: This will DELETE all existing data!")
    confirm = input("\nType 'yes' to continue: ")
    
    if confirm.lower() != 'yes':
        print("\n❌ Operation cancelled.")
        return
    
    print("\n🔄 Clearing existing data...")
    clear_database()
    
    print("\n📝 Creating lecturers...")
    create_lecturers()
    
    print("\n📚 Creating subjects...")
    create_subjects()
    
    print("\n👥 Creating students...")
    create_students()
    
    print("\n📊 Generating attendance records (department-specific)...")
    create_attendance()
    
    print("\n📈 Generating statistics...")
    print_complete_statistics()
    
    print("\n" + "="*70)
    print("✅ DATABASE POPULATION COMPLETE!")
    print("="*70)
    print("\n🎯 TEST CREDENTIALS:")
    print("\n   STUDENTS (CSE):")
    print("   • Aarav Sharma: aarav.sharma@uni.edu / student@1001")
    print("\n   LECTURERS:")
    print("   • Dr. Rajesh Iyer: rajesh.iyer@uni.edu / prof@201")
    print("\n🔍 Visit: http://localhost:5000/report")
    print("\n💡 NOTE: Students only see subjects from their department!")
    print("="*70)

if __name__ == "__main__":
    main()