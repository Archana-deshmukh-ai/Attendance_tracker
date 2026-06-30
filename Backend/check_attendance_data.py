# check_attendance_data.py
import sqlite3

DB_PATH = r'C:\Users\User\project git\Attendance_tracker\Backend\data\institute.db'

def check_attendance():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Check total attendance records
    cursor.execute("SELECT COUNT(*) as count FROM attendance")
    total = cursor.fetchone()['count']
    print(f"\n📋 Total Attendance Records: {total}")
    
    if total == 0:
        print("\n❌ No attendance records found in database!")
        print("You need to mark attendance first.")
        conn.close()
        return
    
    # Check students with attendance
    cursor.execute("""
        SELECT DISTINCT student_id, COUNT(*) as count 
        FROM attendance 
        GROUP BY student_id 
        ORDER BY count DESC 
        LIMIT 10
    """)
    
    students = cursor.fetchall()
    print(f"\n👨‍🎓 Students with attendance records:")
    for s in students:
        print(f"   {s['student_id']}: {s['count']} records")
    
    # Check sample attendance records
    cursor.execute("""
        SELECT a.*, s.name as student_name 
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        LIMIT 10
    """)
    
    records = cursor.fetchall()
    print(f"\n📊 Sample attendance records:")
    for r in records:
        print(f"   {r['student_id']} - {r['student_name']} | {r['subject_id']} | {r['date']} | {r['status']}")
    
    conn.close()

if __name__ == "__main__":
    check_attendance()