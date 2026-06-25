import sqlite3

DB_PATH = 'Backend/data/institute.db'

print("="*60)
print("ALL STUDENTS IN DATABASE")
print("="*60)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get all students
cursor.execute("SELECT student_id, name, email, department FROM students ORDER BY department")
students = cursor.fetchall()

print(f"\n📊 Total students: {len(students)}\n")

# Group by department
departments = {}
for student in students:
    dept = student[3]
    if dept not in departments:
        departments[dept] = []
    departments[dept].append(student)

# Display by department
for dept, students_list in departments.items():
    print(f"\n📚 {dept} Department ({len(students_list)} students):")
    print("-" * 50)
    for student in students_list:
        print(f"   {student[0]}: {student[1]} - {student[2]}")

conn.close()

print("\n" + "="*60)
print(f"Total: {len(students)} students across {len(departments)} departments")