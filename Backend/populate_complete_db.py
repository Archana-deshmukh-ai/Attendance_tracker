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

def determine_attendance_pattern(student_num, dept):
    """
    Determine attendance pattern for a student
    Returns: dict with attendance rate range and pattern type
    """
    # Create varied attendance patterns across all students
    # Use deterministic but varied pattern based on student number and department
    seed_string = f"{dept}_{student_num}"
    hash_value = int(hashlib.md5(seed_string.encode()).hexdigest()[:8], 16)
    seed = hash_value % 100
    
    # Distribution to test notification system thoroughly:
    # - 20% students: Very Low Attendance (below 60%) - CRITICAL notifications
    # - 25% students: Low Attendance (60-74%) - WARNING notifications  
    # - 20% students: Borderline (75-79%) - Close to threshold
    # - 20% students: Average (80-84%) - Safe zone
    # - 15% students: Good Attendance (85%+) - Excellent
    
    if seed < 20:  # 20% students - Very Low Attendance (below 60%) - CRITICAL
        rate_min, rate_max = 40, 59
        pattern_type = "critical"
    elif seed < 45:  # 25% students - Low Attendance (60-74%) - WARNING
        rate_min, rate_max = 60, 74
        pattern_type = "warning"
    elif seed < 65:  # 20% students - Borderline (75-79%)
        rate_min, rate_max = 75, 79
        pattern_type = "borderline"
    elif seed < 85:  # 20% students - Average (80-84%)
        rate_min, rate_max = 80, 84
        pattern_type = "average"
    else:  # 15% students - Good Attendance (85%+)
        rate_min, rate_max = 85, 98
        pattern_type = "good"
    
    return {
        'rate_min': rate_min,
        'rate_max': rate_max,
        'pattern_type': pattern_type,
        'expected_attendance': (rate_min + rate_max) / 2
    }

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
    
    # Generate students for each department with varied attendance patterns
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
    
    # Return students with patterns for attendance generation
    return students

def create_attendance(students_with_patterns):
    """Create realistic attendance records - students only attend subjects from their department + common subjects"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all subjects and create mapping
    cursor.execute("SELECT subject_id, code, department FROM subjects")
    subjects = cursor.fetchall()
    
    # Create a mapping of subjects by department
    subjects_by_dept = {}
    for subject in subjects:
        subject_id, subject_code, subject_dept = subject
        if subject_dept not in subjects_by_dept:
            subjects_by_dept[subject_dept] = []
        subjects_by_dept[subject_dept].append({
            'id': subject_id,
            'code': subject_code,
            'dept': subject_dept
        })
    
    # Create student mapping by department
    student_patterns = {}
    for student in students_with_patterns:
        student_patterns[student['student_id']] = student['attendance_pattern']
    
    # Generate attendance for the last 60 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=60)
    
    attendance_count = 0
    total_possible_records = 0
    
    print("   Generating attendance records with varied patterns...")
    print("   (This may take a moment...)")
    
    # For each student, generate attendance only for their department subjects + common subjects
    for student in students_with_patterns:
        student_id = student['student_id']
        student_dept = student['department']
        
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
        
        # Generate attendance for each subject
        for subject in student_subjects:
            subject_id = subject['id']
            subject_code = subject['code']
            subject_dept = subject['dept']
            
            # Generate attendance for last 60 days
            current_date = start_date
            days_with_class = 0
            
            while current_date <= end_date:
                # Skip weekends
                if current_date.weekday() < 5:
                    date_str = current_date.strftime('%Y-%m-%d')
                    
                    # Determine if class was conducted (80-90% probability)
                    class_probability = random.uniform(0.80, 0.90)
                    
                    if random.random() < class_probability:
                        days_with_class += 1
                        total_possible_records += 1
                        
                        # Get attendance pattern for this student
                        pattern = student_patterns.get(student_id, {
                            'rate_min': 85, 'rate_max': 95, 'pattern_type': 'good'
                        })
                        
                        # Create deterministic but realistic attendance pattern
                        # Use student_id and date to create consistent pattern
                        seed_value = hash(f"{student_id}_{date_str}_{subject_id}") % 1000
                        random.seed(seed_value)
                        
                        # Base attendance probability from pattern
                        base_rate = random.uniform(pattern['rate_min'], pattern['rate_max']) / 100
                        
                        # Add some variation based on day of week
                        weekday = current_date.weekday()
                        if weekday == 0:  # Monday - lower attendance
                            variation = -0.05
                        elif weekday == 4:  # Friday - slightly lower
                            variation = -0.03
                        elif weekday == 2:  # Wednesday - higher attendance
                            variation = 0.03
                        else:
                            variation = 0
                        
                        attendance_probability = max(0.30, min(0.98, base_rate + variation))
                        
                        # For students with very low attendance, sometimes they skip multiple days
                        if pattern['pattern_type'] == 'critical' and random.random() < 0.35:
                            attendance_probability *= 0.5
                        elif pattern['pattern_type'] == 'warning' and random.random() < 0.25:
                            attendance_probability *= 0.7
                        elif pattern['pattern_type'] == 'borderline' and random.random() < 0.15:
                            attendance_probability *= 0.85
                        
                        is_present = random.random() < attendance_probability
                        
                        if is_present:
                            # Sometimes mark as late (15% of present students)
                            if random.random() < 0.15:
                                status = 'late'
                            else:
                                status = 'present'
                        else:
                            status = 'absent'
                        
                        # Get lecturer
                        cursor.execute("SELECT lecturer_id FROM subjects WHERE subject_id = ?", (subject_id,))
                        lecturer_result = cursor.fetchone()
                        lecturer_id = lecturer_result[0] if lecturer_result else None
                        
                        # Add remarks for notification testing
                        remarks = None
                        if status == 'absent':
                            if pattern['pattern_type'] == 'critical' and random.random() < 0.30:
                                remarks_list = [
                                    '⚠️ CRITICAL: Attendance below 60% - Urgent action required',
                                    '⚠️ Multiple consecutive absences - Parent notification sent',
                                    '⚠️ Attendance critically low - Intervention needed',
                                    '⚠️ Below minimum attendance requirement - Warning issued'
                                ]
                                remarks = random.choice(remarks_list)
                            elif pattern['pattern_type'] == 'warning' and random.random() < 0.20:
                                remarks_list = [
                                    '⚠️ Warning: Attendance below 75%',
                                    '⚠️ Low attendance - Improvement needed',
                                    '⚠️ Regular absentee - Monitoring required'
                                ]
                                remarks = random.choice(remarks_list)
                            elif pattern['pattern_type'] == 'borderline' and random.random() < 0.10:
                                remarks_list = [
                                    'Borderline attendance - Need to improve',
                                    'Close to warning threshold'
                                ]
                                remarks = random.choice(remarks_list)
                            elif random.random() < 0.08:
                                remarks_list = [
                                    'Medical leave',
                                    'Family emergency',
                                    'Sports event participation',
                                    'Technical symposium',
                                    'Personal reason',
                                    'Travel'
                                ]
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
            
            # Reset random seed
            random.seed()
            
            if days_with_class > 0:
                print(f"      {subject_code}: {days_with_class} classes")
    
    conn.commit()
    conn.close()
    print(f"   ✓ Created {attendance_count:,} attendance records")
    print(f"   ✓ Total possible records: {total_possible_records:,}")
    
    return total_possible_records

def calculate_attendance_statistics():
    """Calculate and display attendance statistics for notification testing"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n   📊 Calculating attendance statistics...")
    
    # Calculate attendance percentage for each student
    cursor.execute("""
        SELECT s.student_id, s.name, s.department,
               COUNT(CASE WHEN a.status='present' THEN 1 END) as present,
               COUNT(CASE WHEN a.status='late' THEN 1 END) as late,
               COUNT(CASE WHEN a.status='absent' THEN 1 END) as absent,
               COUNT(*) as total
        FROM students s
        LEFT JOIN attendance a ON s.student_id = a.student_id
        GROUP BY s.student_id
        HAVING total > 0
        ORDER BY (present * 1.0 / total) ASC
    """)
    
    student_attendance = cursor.fetchall()
    
    # Categorize students for notification system
    critical_students = []  # Below 60%
    warning_students = []   # 60-74%
    borderline_students = [] # 75-79%
    safe_students = []      # 80%+
    
    for student in student_attendance:
        student_id, name, dept, present, late, absent, total = student
        percentage = (present / total * 100) if total > 0 else 0
        
        if percentage < 60:
            critical_students.append((name, student_id, dept, percentage, present, late, absent, total))
        elif percentage < 75:
            warning_students.append((name, student_id, dept, percentage, present, late, absent, total))
        elif percentage < 80:
            borderline_students.append((name, student_id, dept, percentage, present, late, absent, total))
        else:
            safe_students.append((name, student_id, dept, percentage, present, late, absent, total))
    
    print(f"\n   🔴 CRITICAL (Below 60%): {len(critical_students)} students")
    for name, sid, dept, pct, present, late, absent, total in critical_students[:10]:
        print(f"      • {name} ({sid}) - {dept}: {pct:.1f}% (P:{present}, L:{late}, A:{absent})")
    
    print(f"\n   🟠 WARNING (60-74%): {len(warning_students)} students")
    for name, sid, dept, pct, present, late, absent, total in warning_students[:10]:
        print(f"      • {name} ({sid}) - {dept}: {pct:.1f}% (P:{present}, L:{late}, A:{absent})")
    
    print(f"\n   🟡 BORDERLINE (75-79%): {len(borderline_students)} students")
    for name, sid, dept, pct, present, late, absent, total in borderline_students[:10]:
        print(f"      • {name} ({sid}) - {dept}: {pct:.1f}% (P:{present}, L:{late}, A:{absent})")
    
    print(f"\n   🟢 SAFE (80%+): {len(safe_students)} students")
    for name, sid, dept, pct, present, late, absent, total in safe_students[:5]:
        print(f"      • {name} ({sid}) - {dept}: {pct:.1f}% (P:{present}, L:{late}, A:{absent})")
    
    conn.close()
    
    return {
        'critical': len(critical_students),
        'warning': len(warning_students),
        'borderline': len(borderline_students),
        'safe': len(safe_students)
    }

def add_special_notification_patterns():
    """Add special patterns specifically for testing notification system"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n   🔔 Adding special notification patterns...")
    
    # Add specific remarks for students with very low attendance to trigger notifications
    cursor.execute("""
        UPDATE attendance 
        SET remarks = '⚠️ URGENT: Attendance critically low - Below 60% - Parent notification sent'
        WHERE student_id IN (
            SELECT student_id FROM attendance 
            GROUP BY student_id 
            HAVING (COUNT(CASE WHEN status='present' THEN 1 END) * 1.0 / COUNT(*)) < 0.6
        ) 
        AND status = 'absent'
        AND date > date('now', '-15 days')
        AND remarks IS NULL
    """)
    
    # Add warning remarks for students with 60-74% attendance
    cursor.execute("""
        UPDATE attendance 
        SET remarks = '⚠️ Warning: Attendance below 75% - Improvement needed'
        WHERE student_id IN (
            SELECT student_id FROM attendance 
            GROUP BY student_id 
            HAVING (COUNT(CASE WHEN status='present' THEN 1 END) * 1.0 / COUNT(*)) BETWEEN 0.6 AND 0.74
        ) 
        AND status = 'absent'
        AND date > date('now', '-10 days')
        AND remarks IS NULL
    """)
    
    # Add consecutive absence patterns for critical students
    cursor.execute("""
        UPDATE attendance 
        SET remarks = '⚠️ Multiple consecutive absences detected - Automatic notification triggered'
        WHERE student_id IN (
            SELECT DISTINCT a1.student_id 
            FROM attendance a1
            WHERE a1.status = 'absent'
            AND EXISTS (
                SELECT 1 FROM attendance a2 
                WHERE a2.student_id = a1.student_id 
                AND a2.date = date(a1.date, '+1 day')
                AND a2.status = 'absent'
            )
            AND a1.date > date('now', '-30 days')
        )
        AND status = 'absent'
        AND date > date('now', '-15 days')
        AND remarks IS NULL
    """)
    
    conn.commit()
    conn.close()
    print("   ✓ Special notification patterns added")

def print_complete_statistics(attendance_stats):
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
    
    print(f"\n✅ OVERALL ATTENDANCE SUMMARY:")
    if total > 0:
        present_pct = (stats[0] / total * 100)
        absent_pct = (stats[1] / total * 100)
        late_pct = (stats[2] / total * 100)
        print(f"   • Present: {stats[0]:,} ({present_pct:.1f}%)")
        print(f"   • Absent: {stats[1]:,} ({absent_pct:.1f}%)")
        print(f"   • Late: {stats[2]:,} ({late_pct:.1f}%)")
        print(f"   • Total Records: {total:,}")
    
    # Notification System Summary
    print(f"\n🔔 NOTIFICATION SYSTEM TESTING SUMMARY:")
    print(f"   • Students needing CRITICAL notifications (<60%): {attendance_stats['critical']}")
    print(f"   • Students needing WARNING notifications (60-74%): {attendance_stats['warning']}")
    print(f"   • Students on BORDERLINE (75-79%): {attendance_stats['borderline']}")
    print(f"   • Students with SAFE attendance (80%+): {attendance_stats['safe']}")
    
    # Sample low attendance students for testing
    print(f"\n📋 SAMPLE STUDENTS FOR NOTIFICATION TESTING:")
    cursor.execute("""
        SELECT s.student_id, s.name, s.email, s.department,
               COUNT(CASE WHEN a.status='present' THEN 1 END) as present,
               COUNT(*) as total,
               ROUND(100.0 * COUNT(CASE WHEN a.status='present' THEN 1 END) / COUNT(*), 1) as percentage
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        GROUP BY a.student_id
        HAVING percentage < 75
        ORDER BY percentage ASC
        LIMIT 10
    """)
    low_attendance = cursor.fetchall()
    
    for sid, name, email, dept, present, total, pct in low_attendance:
        status = "CRITICAL" if pct < 60 else "WARNING"
        print(f"   • {status}: {name} ({sid}) - {dept} - {pct}% attendance")
        print(f"     Email: {email}")
    
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
    print("   • 25 Subjects (Department-specific + Common subjects)")
    print("   • Attendance records for last 60 days")
    print("   • Students ONLY attend subjects from their department + Common subjects")
    print("   • RANDOM attendance patterns (40% to 98%)")
    print("   • 45% students below 75% attendance for notification testing")
    print("   • Special remarks and notification triggers")
    
    # Check if database exists
    if not os.path.exists(DB_PATH):
        print("\n❌ Database not found! Please run the app first.")
        print("   Run: python app.py first to create the database structure")
        return
    
    # Check if data already exists
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
    
    print("\n📝 Creating lecturers...")
    create_lecturers()
    
    print("\n📚 Creating subjects...")
    create_subjects()
    
    print("\n👥 Creating students with varied attendance patterns...")
    students_with_patterns = create_students()
    
    print("\n📊 Generating attendance records (department-specific)...")
    create_attendance(students_with_patterns)
    
    print("\n✨ Adding special notification patterns...")
    add_special_notification_patterns()
    
    print("\n📈 Calculating attendance statistics...")
    attendance_stats = calculate_attendance_statistics()
    
    print("\n📊 Generating complete statistics...")
    print_complete_statistics(attendance_stats)
    
    print("\n" + "="*70)
    print("✅ DATABASE POPULATION COMPLETE!")
    print("="*70)
    print("\n🎯 TEST CREDENTIALS:")
    print("\n   STUDENTS (Use any of these emails with password: student@1001):")
    print("   • CSE Student: aarav.sharma@uni.edu")
    print("   • ECE Student: akash.verma@uni.edu")
    print("   • ME Student: amit.trivedi@uni.edu")
    print("   • CE Student: ankit.sharma@uni.edu")
    print("\n   LECTURERS:")
    print("   • Dr. Rajesh Iyer: rajesh.iyer@uni.edu / prof@201")
    print("   • Prof. Sarah Johnson: sarah.johnson@uni.edu / prof@202")
    print("\n🔔 NOTIFICATION SYSTEM TESTING:")
    print("   • 45% of students have attendance below 75%")
    print("   • 20% of students have CRITICAL attendance (<60%)")
    print("   • 25% of students have WARNING attendance (60-74%)")
    print("\n💡 TIPS FOR TESTING NOTIFICATIONS:")
    print("   • Login as a lecturer to see all low attendance students")
    print("   • Check the notification system for students with remarks")
    print("   • Students with CRITICAL status need immediate attention")
    print("   • Use the report section to filter by attendance percentage")
    print("="*70)

if __name__ == "__main__":
    main()