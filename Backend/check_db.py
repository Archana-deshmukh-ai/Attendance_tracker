import sqlite3
import os

DB_PATH = os.path.join("Backend", "data", "institute.db")

def check_db():
    if not os.path.exists(DB_PATH):
        print("❌ Database file not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    tables = ['students', 'lecturers', 'subjects', 'attendance']
    for table in tables:
        count = cursor.execute(f"SELECT COUNT(*) as cnt FROM {table}").fetchone()['cnt']
        print(f"📊 {table}: {count} rows")

    # Show sample students
    print("\n👥 Sample students (first 3):")
    rows = cursor.execute("SELECT student_id, name, email, department FROM students LIMIT 3").fetchall()
    for r in rows:
        print(dict(r))

    # Show sample subjects with lecturer_id
    print("\n📚 Sample subjects (first 3):")
    rows = cursor.execute("SELECT subject_id, code, name, lecturer_id FROM subjects LIMIT 3").fetchall()
    for r in rows:
        print(dict(r))

    conn.close()

if __name__ == "__main__":
    check_db()