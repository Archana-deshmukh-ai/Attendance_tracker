// attendanceManager.js - Handles all backend communication

class AttendanceManager {
    constructor() {
        this.baseUrl = 'http://localhost:5000/api';
        this.students = [];
        this.subjects = [];
    }
    
    // Load all students from backend
    async loadStudents() {
        try {
            const response = await fetch(`${this.baseUrl}/students`);
            const data = await response.json();
            
            if (data.success) {
                this.students = data.students;
                return this.students;
            } else {
                throw new Error(data.error || 'Failed to load students');
            }
        } catch (error) {
            console.error('Error loading students:', error);
            throw error;
        }
    }
    
    // Load all subjects from backend
    async loadSubjects() {
        try {
            const response = await fetch(`${this.baseUrl}/subjects`);
            const data = await response.json();
            
            if (data.success) {
                this.subjects = data.subjects;
                return this.subjects;
            } else {
                throw new Error(data.error || 'Failed to load subjects');
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
            throw error;
        }
    }
    
    // Submit attendance to backend
    async submitAttendance(subjectId, date, presentIds, absentIds) {
        try {
            const response = await fetch(`${this.baseUrl}/mark_attendance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject_id: parseInt(subjectId),
                    date: date,
                    present: presentIds,
                    absent: absentIds
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error submitting attendance:', error);
            throw error;
        }
    }
    
    // Get attendance summary for a student
    async getStudentSummary(studentId) {
        try {
            const response = await fetch(`${this.baseUrl}/attendance_summary?student_id=${studentId}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching summary:', error);
            throw error;
        }
    }
    
    // Get attendance for a specific subject and date
    async getAttendance(subjectId = null, date = null) {
        try {
            let url = `${this.baseUrl}/get_attendance`;
            const params = [];
            
            if (subjectId) params.push(`subject_id=${subjectId}`);
            if (date) params.push(`date=${date}`);
            
            if (params.length > 0) {
                url += '?' + params.join('&');
            }
            
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('Error fetching attendance:', error);
            throw error;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendanceManager;
}