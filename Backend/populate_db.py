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
    
    # Delete all records
    cursor.execute("DELETE FROM attendance")
    cursor.execute("DELETE FROM subjects")
    cursor.execute("DELETE FROM students")
    cursor.execute("DELETE FROM lecturers")
    
    # Reset auto-increment
    cursor.execute("DELETE FROM sqlite_sequence")
    
    conn.commit()
    conn.close()
    print("✓ Database cleared successfully")

def create_lecturers():
    """Create lecturers with ALL columns filled"""
    lecturers = [
        # CSE Department
        {
            'lecturer_id': 'L001',
            'name': 'Dr. Rajesh Iyer',
            'email': 'rajesh.iyer@uni.edu',
            'password': 'prof@201',
            'department': 'Computer Science'
        },
        {
            'lecturer_id': 'L002',
            'name': 'Prof. Sarah Johnson',
            'email': 'sarah.johnson@uni.edu',
            'password': 'prof@202',
            'department': 'Computer Science'
        },
        {
            'lecturer_id': 'L003',
            'name': 'Dr. Amit Sharma',
            'email': 'amit.sharma@uni.edu',
            'password': 'prof@203',
            'department': 'Computer Science'
        },
        {
            'lecturer_id': 'L004',
            'name': 'Prof. Priya Patel',
            'email': 'priya.patel@uni.edu',
            'password': 'prof@204',
            'department': 'Electronics'
        },
        {
            'lecturer_id': 'L005',
            'name': 'Dr. Vikram Singh',
            'email': 'vikram.singh@uni.edu',
            'password': 'prof@205',
            'department': 'Electronics'
        },
        {
            'lecturer_id': 'L006',
            'name': 'Prof. Meera Reddy',
            'email': 'meera.reddy@uni.edu',
            'password': 'prof@206',
            'department': 'Mechanical'
        },
        {
            'lecturer_id': 'L007',
            'name': 'Dr. Anand Kumar',
            'email': 'anand.kumar@uni.edu',
            'password': 'prof@207',
            'department': 'Mechanical'
        },
        {
            'lecturer_id': 'L008',
            'name': 'Prof. Neha Gupta',
            'email': 'neha.gupta@uni.edu',
            'password': 'prof@208',
            'department': 'Civil'
        },
        {
            'lecturer_id': 'L009',
            'name': 'Dr. Ramesh Choudhary',
            'email': 'ramesh.choudhary@uni.edu',
            'password': 'prof@209',
            'department': 'Civil'
        },
        {
            'lecturer_id': 'L010',
            'name': 'Prof. Kavita Singh',
            'email': 'kavita.singh@uni.edu',
            'password': 'prof@210',
            'department': 'Mathematics'
        }
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
    """Create subjects with ALL columns filled and assigned to lecturers"""
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
        
        # Common Subjects (for all departments)
        {'code': 'MA101', 'name': 'Engineering Mathematics', 'credits': 4, 'department': 'Mathematics', 'lecturer_id': 'L010'},
        {'code': 'PH101', 'name': 'Engineering Physics', 'credits': 4, 'department': 'Mathematics', 'lecturer_id': 'L010'},
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
    """Create students with ALL columns filled across multiple departments"""
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
    
    # Generate students for each department
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
    """Create realistic attendance records for last 2 months"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all subjects and students
    cursor.execute("SELECT subject_id, code, department FROM subjects")
    subjects = cursor.fetchall()
    
    cursor.execute("SELECT student_id, department FROM students")
    students = cursor.fetchall()
    
    # Create a mapping of students by department
    students_by_dept = {}
    for student in students:
        dept = student[1]
        if dept not in students_by_dept:
            students_by_dept[dept] = []
        students_by_dept[dept].append(student[0])
    
    # Generate attendance for the last 60 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)
    
    attendance_count = 0
    total_days = 0
    
    print("   Generating attendance records...")
    
    # For each subject, generate attendance records
    for subject in subjects:
        subject_id, subject_code, subject_dept = subject
        
        # Students from the same department take this subject
        # Also, common subjects (Mathematics) are taken by all departments
        if subject_dept == 'Mathematics':
            # All students take mathematics
            eligible_students = [s[0] for s in students]
        elif subject_dept in students_by_dept:
            eligible_students = students_by_dept[subject_dept]
        else:
            continue
        
        # Generate attendance for each day
        current_date = start_date
        while current_date <= end_date:
            # Skip weekends (Saturday and Sunday)
            if current_date.weekday() < 5:  # Monday to Friday
                date_str = current_date.strftime('%Y-%m-%d')
                total_days += 1
                
                # Determine if class was conducted (80% chance)
                # Some subjects have more classes than others
                class_probability = 0.85 if subject_code.startswith('CS') else 0.80
                
                if random.random() < class_probability:
                    for student_id in eligible_students:
                        # Generate realistic attendance pattern based on student performance
                        # Create a seed based on student_id to make patterns consistent
                        seed = int(student_id[3:]) if student_id[3:].isdigit() else 0
                        random.seed(seed + current_date.toordinal())
                        
                        # Different attendance patterns for different students
                        # Some students have high attendance (90-100%), some medium (70-90%), some low (50-70%)
                        student_num = int(student_id[3:]) if student_id[3:].isdigit() else 0
                        
                        if student_num % 10 < 2:  # 20% students - low attendance
                            attendance_rate = random.uniform(0.50, 0.70)
                        elif student_num % 10 < 6:  # 40% students - medium attendance
                            attendance_rate = random.uniform(0.70, 0.85)
                        else:  # 40% students - high attendance
                            attendance_rate = random.uniform(0.85, 0.98)
                        
                        is_present = random.random() < attendance_rate
                        
                        if is_present:
                            # Sometimes mark as late (10% of present students)
                            if random.random() < 0.10:
                                status = 'late'
                            else:
                                status = 'present'
                        else:
                            status = 'absent'
                        
                        # Get lecturer who marked attendance
                        lecturer_id = get_lecturer_for_subject(cursor, subject_id)
                        
                        # Add remarks for some absent students
                        remarks = None
                        if status == 'absent' and random.random() < 0.15:
                            remarks_list = [
                                'Medical leave',
                                'Family emergency',
                                'Sports event',
                                'Technical event',
                                'Personal reason',
                                'Travel'
                            ]
                            remarks = random.choice(remarks_list)
                        
                        cursor.execute("""
                            INSERT INTO attendance 
                            (subject_id, student_id, date, status, marked_by, timestamp, remarks)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        """, (subject_id, student_id, date_str, status, lecturer_id, 
                              datetime.now().isoformat(), remarks))
                        
                        attendance_count += 1
            
            current_date += timedelta(days=1)
        
        # Reset random seed
        random.seed()
    
    conn.commit()
    conn.close()
    print(f"   ✓ Created {attendance_count} attendance records across {total_days} days")

def get_lecturer_for_subject(cursor, subject_id):
    """Get the lecturer assigned to a subject"""
    cursor.execute("SELECT lecturer_id FROM subjects WHERE subject_id = ?", (subject_id,))
    result = cursor.fetchone()
    return result[0] if result else None

def add_special_data_patterns():
    """Add interesting data patterns for demonstration"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("   Adding special data patterns...")
    
    # 1. Mark some students with perfect attendance
    cursor.execute("""
        UPDATE attendance 
        SET remarks = 'Perfect attendance' 
        WHERE student_id IN ('CSE001', 'CSE005', 'ECE003', 'ME010', 'CE002') 
        AND status = 'present'
        AND date > date('now', '-30 days')
    """)
    
    # 2. Mark some students with very low attendance
    cursor.execute("""
        UPDATE attendance 
        SET remarks = 'Low attendance warning' 
        WHERE student_id IN ('CSE020', 'ECE015', 'ME018', 'CE012') 
        AND status = 'absent'
        AND date > date('now', '-15 days')
    """)
    
    # 3. Add late marks for certain students
    cursor.execute("""
        UPDATE attendance 
        SET status = 'late' 
        WHERE student_id IN ('CSE010', 'ECE008', 'ME005', 'CE008') 
        AND date > date('now', '-7 days')
        AND random() % 100 < 40
    """)
    
    # 4. Add some attendance with remarks for special events
    cursor.execute("""
        UPDATE attendance 
        SET remarks = 'Cultural fest participation' 
        WHERE student_id IN ('CSE015', 'ECE020', 'ME022', 'CE015') 
        AND status = 'absent'
        AND date = date('now', '-12 days')
    """)
    
    cursor.execute("""
        UPDATE attendance 
        SET remarks = 'Technical symposium' 
        WHERE student_id IN ('CSE025', 'ECE012', 'ME008') 
        AND status = 'absent'
        AND date = date('now', '-5 days')
    """)
    
    conn.commit()
    conn.close()
    print("   ✓ Special data patterns added")

def print_complete_statistics():
    """Print detailed database statistics"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n" + "="*70)
    print("COMPLETE DATABASE STATISTICS")
    print("="*70)
    
    # Count records
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
    
    # Students by department
    print(f"\n👥 STUDENTS BY DEPARTMENT:")
    cursor.execute("""
        SELECT department, COUNT(*) as count 
        FROM students 
        GROUP BY department
        ORDER BY count DESC
    """)
    dept_students = cursor.fetchall()
    for dept, count in dept_students:
        print(f"   • {dept}: {count} students")
    
    # Subjects by department
    print(f"\n📚 SUBJECTS BY DEPARTMENT:")
    cursor.execute("""
        SELECT department, COUNT(*) as count 
        FROM subjects 
        GROUP BY department
        ORDER BY count DESC
    """)
    dept_subjects = cursor.fetchall()
    for dept, count in dept_subjects:
        print(f"   • {dept}: {count} subjects")
    
    # Get date range
    cursor.execute("SELECT MIN(date), MAX(date) FROM attendance")
    date_range = cursor.fetchone()
    
    print(f"\n📅 ATTENDANCE DATE RANGE:")
    if date_range[0] and date_range[1]:
        print(f"   • From: {date_range[0]}")
        print(f"   • To: {date_range[1]}")
        start = datetime.strptime(date_range[0], '%Y-%m-%d')
        end = datetime.strptime(date_range[1], '%Y-%m-%d')
        days = (end - start).days + 1
        print(f"   • Total Days: {days} days")
    
    # Attendance summary
    cursor.execute("""
        SELECT 
            COUNT(CASE WHEN status='present' THEN 1 END) as present,
            COUNT(CASE WHEN status='absent' THEN 1 END) as absent,
            COUNT(CASE WHEN status='late' THEN 1 END) as late
        FROM attendance
    """)
    stats = cursor.fetchone()
    total = stats[0] + stats[1] + stats[2]
    
    print(f"\n✅ ATTENDANCE SUMMARY:")
    if total > 0:
        present_pct = (stats[0] / total * 100)
        absent_pct = (stats[1] / total * 100)
        late_pct = (stats[2] / total * 100)
        print(f"   • Present: {stats[0]:,} ({present_pct:.1f}%)")
        print(f"   • Absent: {stats[1]:,} ({absent_pct:.1f}%)")
        print(f"   • Late: {stats[2]:,} ({late_pct:.1f}%)")
        print(f"   • Total Records: {total:,}")
    
    # Lecturers with most classes
    print(f"\n👨‍🏫 TOP LECTURERS (by classes conducted):")
    cursor.execute("""
        SELECT l.name, COUNT(DISTINCT a.date) as classes
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.subject_id
        JOIN lecturers l ON s.lecturer_id = l.lecturer_id
        GROUP BY l.lecturer_id
        ORDER BY classes DESC
        LIMIT 5
    """)
    top_lecturers = cursor.fetchall()
    for name, classes in top_lecturers:
        print(f"   • {name}: {classes} classes")
    
    # Students with highest attendance
    print(f"\n🏆 TOP 5 STUDENTS (highest attendance %):")
    cursor.execute("""
        SELECT s.name, 
               COUNT(CASE WHEN a.status='present' THEN 1 END) as present,
               COUNT(*) as total,
               ROUND(100.0 * COUNT(CASE WHEN a.status='present' THEN 1 END) / COUNT(*), 1) as percentage
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        GROUP BY a.student_id
        ORDER BY percentage DESC
        LIMIT 5
    """)
    top_students = cursor.fetchall()
    for name, present, total, pct in top_students:
        print(f"   • {name}: {pct}% ({present}/{total})")
    
    # Students with lowest attendance
    print(f"\n⚠️  BOTTOM 5 STUDENTS (lowest attendance %):")
    cursor.execute("""
        SELECT s.name, 
               COUNT(CASE WHEN a.status='present' THEN 1 END) as present,
               COUNT(*) as total,
               ROUND(100.0 * COUNT(CASE WHEN a.status='present' THEN 1 END) / COUNT(*), 1) as percentage
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        GROUP BY a.student_id
        ORDER BY percentage ASC
        LIMIT 5
    """)
    bottom_students = cursor.fetchall()
    for name, present, total, pct in bottom_students:
        print(f"   • {name}: {pct}% ({present}/{total})")
    
    conn.close()
    print("="*70)

def main():
    """Main function to populate database"""
    print("\n" + "="*70)
    print("ATTENDANCE ATLAS - COMPLETE DATABASE POPULATOR")
    print("="*70)
    print("\nThis script will create:")
    print("   • 10 Lecturers")
    print("   • 110 Students (CSE:40, ECE:25, ME:25, Civil:20)")
    print("   • 25 Subjects across 5 departments")
    print("   • Attendance records for last 60 days")
    print("   • Realistic attendance patterns (50-98%)")
    print("   • Special remarks and late marks")
    
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print("\n❌ Database not found! Please run the app first to create the database.")
        print("   Run: python app.py")
        return
    
    # Ask for confirmation
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
    
    print("\n📊 Generating attendance records for last 60 days...")
    create_attendance()
    
    print("\n✨ Adding special data patterns...")
    add_special_data_patterns()
    
    print("\n📈 Generating complete statistics...")
    print_complete_statistics()
    
    print("\n" + "="*70)
    print("✅ DATABASE POPULATION COMPLETE!")
    print("="*70)
    print("\n🎯 TEST CREDENTIALS:")
    print("\n   STUDENTS:")
    print("   • Aarav Sharma: aarav.sharma@uni.edu / student@1001")
    print("   • Diya Reddy: diya.reddy@uni.edu / student@1001")
    print("   • Any student email: [firstname.lastname]@uni.edu")
    print("\n   LECTURERS:")
    print("   • Dr. Rajesh Iyer: rajesh.iyer@uni.edu / prof@201")
    print("   • Prof. Sarah Johnson: sarah.johnson@uni.edu / prof@202")
    print("   • Dr. Amit Sharma: amit.sharma@uni.edu / prof@203")
    print("\n🔍 Visit: http://localhost:5000/report")
    print("\n💡 TIPS:")
    print("   • Login as lecturer to see all department data")
    print("   • Login as student to see personal attendance")
    print("   • Use filters to analyze specific subjects/students")
    print("   • Export data in CSV format for further analysis")
    print("="*70)

if __name__ == "__main__":
    main()