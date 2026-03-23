# create_db_first.py
import sqlite3
import os

# Create data directory if it doesn't exist
os.makedirs("data", exist_ok=True)

# Database path
DB_PATH = os.path.join("data", "institute.db")

def create_tables():
    """Create all tables if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            student_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            batch TEXT,
            department TEXT
        )
    ''')
    
    # Create lecturers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lecturers (
            lecturer_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            department TEXT
        )
    ''')
    
    # Create subjects table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            subject_id INTEGER PRIMARY KEY,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            credits INTEGER,
            department TEXT,
            lecturer_id TEXT,
            FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id)
        )
    ''')
    
    # Create attendance table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            student_id TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT CHECK(status IN ('present','absent','late')),
            marked_by TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            remarks TEXT,
            UNIQUE(subject_id, student_id, date)
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✓ Database tables created successfully")

if __name__ == "__main__":
    print("Creating database tables...")
    create_tables()
    print(f"Database created at: {DB_PATH}")