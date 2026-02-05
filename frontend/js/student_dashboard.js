// Student Dashboard JavaScript

// DOM Elements
let studentNameEl, studentIdEl, studentDeptEl;
let totalClassesEl, presentCountEl, absentCountEl, attendancePercentEl;
let attendanceTableBody;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Student Dashboard loaded');
    
    // Initialize DOM references
    studentNameEl = document.getElementById('studentName');
    studentIdEl = document.getElementById('studentId');
    studentDeptEl = document.getElementById('studentDept');
    
    totalClassesEl = document.getElementById('totalClasses');
    presentCountEl = document.getElementById('presentCount');
    absentCountEl = document.getElementById('absentCount');
    attendancePercentEl = document.getElementById('attendancePercent');
    
    attendanceTableBody = document.querySelector('#attendanceTable tbody');
    
    // Initialize auth area
    updateAuthArea();
    
    // Load student data
    loadStudentData();
    
    // Setup event listeners
    setupEventListeners();
});

// Update auth area
async function updateAuthArea() {
    const authArea = document.getElementById("auth-area");
    if (!authArea) return;

    try {
        const response = await fetch("/api/login-status");
        const data = await response.json();

        if (data.logged_in) {
            authArea.innerHTML = `
                <span class="user-name">👤 ${data.name} (Student)</span>
                <button class="logout-btn" id="logoutBtn">Logout</button>
            `;

            document.getElementById("logoutBtn").addEventListener("click", function() {
                window.location.href = "/logout";
            });

        } else {
            // If not logged in, redirect to home
            window.location.href = "/";
        }
    } catch (error) {
        console.error("Auth check failed:", error);
    }
}

// Load student data
async function loadStudentData() {
    try {
        // Get login status to get student info
        const statusRes = await fetch('/api/login-status');
        const statusData = await statusRes.json();
        
        if (!statusData.logged_in || statusData.role !== 'student') {
            window.location.href = '/';
            return;
        }
        
        // Update student info
        studentNameEl.textContent = statusData.name;
        studentIdEl.textContent = statusData.student_id || 'N/A';
        
        // Fetch student details from API
        const studentsRes = await fetch('/api/students');
        const studentsData = await studentsRes.json();
        
        if (studentsData.success) {
            const student = studentsData.students.find(s => 
                s.email === statusData.email || s.student_id == statusData.student_id
            );
            
            if (student) {
                studentDeptEl.textContent = student.department || 'N/A';
            }
        }
        
        // Load attendance data
        await loadAttendanceData(statusData.student_id);
        
    } catch (error) {
        console.error('Error loading student data:', error);
        showError('Failed to load student data');
    }
}

// Load attendance data
async function loadAttendanceData(studentId) {
    try {
        const response = await fetch('/api/attendance');
        const data = await response.json();
        
        if (data.success) {
            // Filter attendance for this student
            const studentAttendance = data.attendance.filter(
                record => record.student_id == studentId
            );
            
            // Calculate statistics
            const totalClasses = studentAttendance.length;
            const presentCount = studentAttendance.filter(a => a.status === 'present').length;
            const absentCount = totalClasses - presentCount;
            const attendancePercent = totalClasses > 0 ? 
                Math.round((presentCount / totalClasses) * 100) : 0;
            
            // Update statistics display
            totalClassesEl.textContent = totalClasses;
            presentCountEl.textContent = presentCount;
            absentCountEl.textContent = absentCount;
            attendancePercentEl.textContent = attendancePercent + '%';
            
            // Populate recent attendance table
            populateAttendanceTable(studentAttendance.slice(-10).reverse());
            
            // Update subject chart
            updateSubjectChart(studentAttendance);
            
        } else {
            showError('Failed to load attendance data');
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        showError('Error loading attendance data');
    }
}

// Populate attendance table
function populateAttendanceTable(attendanceRecords) {
    attendanceTableBody.innerHTML = '';
    
    if (attendanceRecords.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="4" style="text-align: center; color: #64748b; padding: 20px;">
                No attendance records found
            </td>
        `;
        attendanceTableBody.appendChild(row);
        return;
    }
    
    attendanceRecords.forEach(record => {
        const row = document.createElement('tr');
        
        // Get subject name
        let subjectName = `Subject ${record.subject_id}`;
        
        row.innerHTML = `
            <td>${record.date || 'N/A'}</td>
            <td>${subjectName}</td>
            <td class="${record.status === 'present' ? 'status-present' : 'status-absent'}">
                ${record.status === 'present' ? '✅ Present' : '❌ Absent'}
            </td>
            <td>${record.remarks || '-'}</td>
        `;
        
        attendanceTableBody.appendChild(row);
    });
}

// Update subject chart (simplified version)
function updateSubjectChart(attendanceRecords) {
    const chartEl = document.getElementById('subjectChart');
    
    if (attendanceRecords.length === 0) {
        chartEl.innerHTML = '<p class="loading">No attendance data available</p>';
        return;
    }
    
    // Group by subject
    const subjectStats = {};
    attendanceRecords.forEach(record => {
        const subjectId = record.subject_id;
        if (!subjectStats[subjectId]) {
            subjectStats[subjectId] = { total: 0, present: 0 };
        }
        subjectStats[subjectId].total++;
        if (record.status === 'present') {
            subjectStats[subjectId].present++;
        }
    });
    
    // Create chart HTML
    let html = '<div class="subject-stats">';
    for (const [subjectId, stats] of Object.entries(subjectStats)) {
        const percent = Math.round((stats.present / stats.total) * 100);
        html += `
            <div class="subject-stat-item">
                <div class="subject-header">
                    <span class="subject-id">Subject ${subjectId}</span>
                    <span class="subject-percent">${percent}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="subject-details">
                    <span>Present: ${stats.present}/${stats.total}</span>
                </div>
            </div>
        `;
    }
    html += '</div>';
    
    chartEl.innerHTML = html;
    
    // Add CSS for progress bars
    const style = document.createElement('style');
    style.textContent = `
        .subject-stats { display: grid; gap: 15px; }
        .subject-stat-item { background: #f1f5f9; padding: 15px; border-radius: 8px; }
        .subject-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .subject-id { font-weight: bold; color: #102094; }
        .subject-percent { font-weight: bold; color: #8b5cf6; }
        .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #102094, #38bdf8); border-radius: 4px; }
        .subject-details { margin-top: 8px; font-size: 0.9rem; color: #64748b; }
    `;
    chartEl.appendChild(style);
}

// Setup event listeners
function setupEventListeners() {
    // Download Report Button
    const downloadBtn = document.getElementById('downloadReportBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            alert('PDF report generation feature coming soon!');
        });
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #fee2e2;
        color: #dc2626;
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(errorDiv, content.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}