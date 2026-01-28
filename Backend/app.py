from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
import pandas as pd
import os

# CORRECTED Flask configuration
app = Flask(__name__, 
            template_folder='../frontend',    # HTML files
            static_folder='../frontend',      # ALL static files (CSS, JS, images)
            static_url_path='')               # Important!

CORS(app)

# ========== HTML PAGES ==========

@app.route('/')
def home_page():
    """Serve the home page HTML"""
    return render_template('index.html')

@app.route('/mark-attendance')
def mark_attendance_page():
    """Serve the mark attendance page HTML"""
    return render_template('mark_attendance.html')

# ========== API ENDPOINTS ==========

@app.route('/api/health')
def health():
    return jsonify({"status": "running", "version": "1.0"})

@app.route('/api/students')
def get_students():
    """Get all students from CSV"""
    try:
        df = pd.read_csv('data/students.csv')
        return jsonify({
            "success": True,
            "count": len(df),
            "students": df.to_dict('records')
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/subjects')
def get_subjects():
    """Get all subjects from CSV"""
    try:
        df = pd.read_csv('data/subjects.csv')
        return jsonify({
            "success": True,
            "count": len(df),
            "subjects": df.to_dict('records')
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Add other API endpoints here...

if __name__ == '__main__':
    # Create data folder if not exists
    os.makedirs('data', exist_ok=True)
    
    # Initialize sample data if needed
    if not os.path.exists('data/students.csv'):
        # Create sample students
        students = pd.DataFrame({
            'student_id': list(range(1001, 1041)),
            'name': [f'Student {i}' for i in range(1, 41)],
            'email': [f'student{1000+i}@uni.edu' for i in range(1, 41)],
            'batch': ['2024', '2025', '2026'] * 13 + ['2024'],
            'department': ['CSE', 'ECE', 'ME', 'CE', 'EEE'] * 8
        })
        students.to_csv('data/students.csv', index=False)
    #create sample subjects
    if not os.path.exists('data/subjects.csv'):
        subjects = pd.DataFrame({
            'subject_id': [1, 2, 3, 4, 5, 6],
            'code': ['CS101', 'CS102', 'EC201', 'ME301', 'CE401', 'EE501'],
            'name': ['Data Structures', 'Algorithms', 'Digital Electronics', 
                    'Thermodynamics', 'Structural Analysis', 'Power Systems'],
            'credits': [4, 4, 3, 4, 3, 4],
            'department': ['CSE', 'CSE', 'ECE', 'ME', 'CE', 'EEE']
        })
        subjects.to_csv('data/subjects.csv', index=False)
    
    print("Starting Flask server...")
    print("Home page: http://localhost:5000")
    print("API endpoints: http://localhost:5000/api/*")
    app.run(debug=True, port=5000)