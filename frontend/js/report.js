// frontend/js/report.js

let reportData = {
    attendance: [],
    students: [],
    subjects: [],
    filteredData: []
};

let currentUser = {
    logged_in: false,
    role: '',
    name: '',
    id: ''
};

// Store chart instances to destroy before recreating
let chartInstances = {
    statusChart: null,
    trendChart: null,
    subjectChart: null,
    departmentChart: null
};

// Initialize reports page
window.initializeReportsPage = async function(role, userData) {
    console.log('Initializing reports page for:', role);
    
    currentUser = {
        logged_in: true,
        role: role,
        name: userData.name,
        id: userData.student_id || userData.lecturer_id
    };
    
    // Load data
    await loadAllData();
    
    // Setup UI based on role
    setupRoleBasedUI();
    
    // Load initial reports
    loadRoleBasedReports();
    
    // Setup event listeners
    setupEventListeners();
};

// Load all required data
async function loadAllData() {
    try {
        // Load attendance data
        const attendanceRes = await fetch('/api/attendance');
        const attendanceData = await attendanceRes.json();
        if (attendanceData.success) {
            reportData.attendance = attendanceData.attendance;
        }
        
        // Load students data
        const studentsRes = await fetch('/api/students');
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
            reportData.students = studentsData.students;
        }
        
        // Load subjects data
        const subjectsRes = await fetch('/api/subjects');
        const subjectsData = await subjectsRes.json();
        if (subjectsData.success) {
            reportData.subjects = subjectsData.subjects;
        }
        
        console.log('Data loaded:', {
            attendance: reportData.attendance.length,
            students: reportData.students.length,
            subjects: reportData.subjects.length
        });
        
    } catch (error) {
        console.error('Error loading report data:', error);
        showError('Failed to load report data');
    }
}

// Setup UI based on user role
function setupRoleBasedUI() {
    // Update table headers based on role
    const tableHeader = document.getElementById('reportTableHeader');
    if (currentUser.role === 'lecturer') {
        tableHeader.innerHTML = `
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Status</th>
            <th>Department</th>
        `;
        
        // Show subject filter
        document.getElementById('subject-filter-group').style.display = 'block';
        populateSubjectFilter();
        
        // Show student filter
        document.getElementById('student-filter-group').style.display = 'block';
        populateStudentFilter();
        
    } else if (currentUser.role === 'student') {
        tableHeader.innerHTML = `
            <th>Date</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Remarks</th>
        `;
        
        // Hide filters that don't apply to students
        document.getElementById('subject-filter-group').style.display = 'none';
        document.getElementById('student-filter-group').style.display = 'none';
        
        // Update report actions
        const reportActions = document.getElementById('report-actions');
        reportActions.innerHTML = `
            <button class="action-btn" onclick="downloadStudentReport()">📥 Download My Report</button>
        `;
    }
}

// Load role-based reports
function loadRoleBasedReports() {
    if (currentUser.role === 'student') {
        loadStudentReports();
    } else if (currentUser.role === 'lecturer') {
        loadLecturerReports();
    }
}

// Load reports for students
function loadStudentReports() {
    // Filter attendance for this student
    const studentAttendance = reportData.attendance.filter(
        record => record.student_id == currentUser.id
    );
    
    reportData.filteredData = studentAttendance;
    
    // Update statistics
    updateStatistics(studentAttendance);
    
    // Populate table
    populateTable(studentAttendance);
    
    // Load charts
    loadStudentCharts(studentAttendance);
}

// Load reports for lecturers
function loadLecturerReports() {
    // For now, show all attendance
    reportData.filteredData = reportData.attendance;
    
    // Update statistics
    updateStatistics(reportData.attendance);
    
    // Populate table
    populateTable(reportData.attendance);
    
    // Load charts
    loadLecturerCharts(reportData.attendance);
}

// Update statistics
function updateStatistics(attendanceData) {
    const total = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'present').length;
    const absent = total - present;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    document.getElementById('total-classes').textContent = total;
    document.getElementById('total-present').textContent = present;
    document.getElementById('total-absent').textContent = absent;
    document.getElementById('attendance-percent').textContent = percentage + '%';
    
    // Update progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
}

// Populate data table
function populateTable(data) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="no-data">No attendance records found</td>`;
        tbody.appendChild(row);
        return;
    }
    
    // Show only first 50 records for performance
    const displayData = data.slice(0, 50);
    
    displayData.forEach(record => {
        const row = document.createElement('tr');
        
        if (currentUser.role === 'lecturer') {
            // Get student name
            const student = reportData.students.find(s => s.student_id == record.student_id);
            const studentName = student ? student.name : 'Unknown';
            const department = student ? student.department : 'N/A';
            
            // Get subject name
            const subject = reportData.subjects.find(s => s.subject_id == record.subject_id);
            const subjectName = subject ? subject.name : `Subject ${record.subject_id}`;
            
            row.innerHTML = `
                <td>${record.student_id}</td>
                <td>${studentName}</td>
                <td>${subjectName}</td>
                <td>${record.date}</td>
                <td class="status-${record.status}">${record.status}</td>
                <td>${department}</td>
            `;
        } else {
            // Student view
            const subject = reportData.subjects.find(s => s.subject_id == record.subject_id);
            const subjectName = subject ? subject.name : `Subject ${record.subject_id}`;
            
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${subjectName}</td>
                <td class="status-${record.status}">${record.status}</td>
                <td>${record.remarks || '-'}</td>
            `;
        }
        
        tbody.appendChild(row);
    });
}

// Helper to destroy existing charts
function destroyCharts() {
    Object.keys(chartInstances).forEach(key => {
        if (chartInstances[key]) {
            chartInstances[key].destroy();
            chartInstances[key] = null;
        }
    });
}

// Load charts for students
function loadStudentCharts(attendanceData) {
    destroyCharts(); // Destroy previous charts
    
    // Status Chart (doughnut)
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    const presentCount = attendanceData.filter(r => r.status === 'present').length;
    const absentCount = attendanceData.filter(r => r.status === 'absent').length;
    
    chartInstances.statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent'],
            datasets: [{
                data: [presentCount, absentCount],
                backgroundColor: ['#10b981', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Trend Chart (by date)
    const dates = [...new Set(attendanceData.map(r => r.date))].sort();
    const dateCounts = dates.map(date => {
        const dayRecords = attendanceData.filter(r => r.date === date);
        const present = dayRecords.filter(r => r.status === 'present').length;
        const total = dayRecords.length;
        return total > 0 ? Math.round((present / total) * 100) : 0;
    });
    
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    chartInstances.trendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Attendance %',
                data: dateCounts,
                borderColor: '#102094',
                backgroundColor: 'rgba(16, 32, 148, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
    
    // Subject-wise chart (bar)
    const subjectMap = {};
    attendanceData.forEach(record => {
        if (!subjectMap[record.subject_id]) {
            subjectMap[record.subject_id] = { total: 0, present: 0 };
        }
        subjectMap[record.subject_id].total++;
        if (record.status === 'present') {
            subjectMap[record.subject_id].present++;
        }
    });
    
    const subjectCtx = document.getElementById('subjectChart').getContext('2d');
    const subjectLabels = Object.keys(subjectMap).map(id => {
        const subject = reportData.subjects.find(s => s.subject_id == id);
        return subject ? subject.code : `Sub ${id}`;
    });
    const subjectData = Object.values(subjectMap).map(s => 
        s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
    );
    
    chartInstances.subjectChart = new Chart(subjectCtx, {
        type: 'bar',
        data: {
            labels: subjectLabels,
            datasets: [{
                label: 'Attendance %',
                data: subjectData,
                backgroundColor: '#38bdf8'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Load charts for lecturers
function loadLecturerCharts(attendanceData) {
    // First load the same student charts (status, trend, subject)
    loadStudentCharts(attendanceData);
    
    // Department chart (additional for lecturers)
    const deptCtx = document.getElementById('departmentChart').getContext('2d');
    
    // Group by department
    const deptMap = {};
    attendanceData.forEach(record => {
        const student = reportData.students.find(s => s.student_id == record.student_id);
        if (student && student.department) {
            if (!deptMap[student.department]) {
                deptMap[student.department] = { total: 0, present: 0 };
            }
            deptMap[student.department].total++;
            if (record.status === 'present') {
                deptMap[student.department].present++;
            }
        }
    });
    
    const deptLabels = Object.keys(deptMap);
    const deptData = deptLabels.map(dept => {
        const stats = deptMap[dept];
        return stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    });
    
    // Destroy previous department chart if exists
    if (chartInstances.departmentChart) {
        chartInstances.departmentChart.destroy();
    }
    
    chartInstances.departmentChart = new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: deptLabels,
            datasets: [{
                label: 'Attendance % by Department',
                data: deptData,
                backgroundColor: '#8b5cf6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Populate subject filter
function populateSubjectFilter() {
    const subjectFilter = document.getElementById('subjectFilter');
    subjectFilter.innerHTML = '<option value="all">All Subjects</option>';
    
    reportData.subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.subject_id;
        option.textContent = `${subject.code} - ${subject.name}`;
        subjectFilter.appendChild(option);
    });
}

// Populate student filter
function populateStudentFilter() {
    const studentFilter = document.getElementById('studentFilter');
    studentFilter.innerHTML = '<option value="all">All Students</option>';
    
    // Show only first 100 students for performance
    const displayStudents = reportData.students.slice(0, 100);
    
    displayStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.student_id;
        option.textContent = `${student.student_id} - ${student.name}`;
        studentFilter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Apply filters button
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    
    // Reset filters button
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Export buttons (CSV, PDF, Excel, Print, Email)
    document.getElementById('exportCsv').addEventListener('click', () => downloadReport('csv'));
    document.getElementById('exportPdf').addEventListener('click', () => downloadReport('pdf'));
    document.getElementById('exportExcel').addEventListener('click', () => downloadReport('excel'));
    document.getElementById('printReport').addEventListener('click', () => window.print());
    document.getElementById('emailReport').addEventListener('click', () => downloadReport('email'));
    
    // Refresh button
    document.getElementById('refreshReports').addEventListener('click', () => {
        loadAllData().then(() => loadRoleBasedReports());
    });
}

// Apply filters
function applyFilters() {
    let filtered = [...reportData.attendance];
    
    // Date filter
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    if (fromDate) {
        filtered = filtered.filter(record => record.date >= fromDate);
    }
    if (toDate) {
        filtered = filtered.filter(record => record.date <= toDate);
    }
    
    // Subject filter (for lecturers)
    if (currentUser.role === 'lecturer') {
        const subjectFilter = document.getElementById('subjectFilter').value;
        if (subjectFilter !== 'all') {
            filtered = filtered.filter(record => record.subject_id == subjectFilter);
        }
        
        // Student filter
        const studentFilter = document.getElementById('studentFilter').value;
        if (studentFilter !== 'all') {
            filtered = filtered.filter(record => record.student_id == studentFilter);
        }
    } else {
        // For students, filter only their data
        filtered = filtered.filter(record => record.student_id == currentUser.id);
    }
    
    reportData.filteredData = filtered;
    
    // Update display
    updateStatistics(filtered);
    populateTable(filtered);
    
    // Update charts based on filtered data
    if (currentUser.role === 'student') {
        loadStudentCharts(filtered);
    } else {
        loadLecturerCharts(filtered);
    }
}

// Reset filters
function resetFilters() {
    document.getElementById('fromDate').value = '';
    document.getElementById('toDate').value = '';
    document.getElementById('subjectFilter').value = 'all';
    document.getElementById('studentFilter').value = 'all';
    
    applyFilters();
}

// Download report
function downloadReport(type) {
    const data = reportData.filteredData;
    const filename = `attendance_report_${new Date().toISOString().slice(0,10)}.${type === 'csv' ? 'csv' : type}`;
    
    if (type === 'csv') {
        const csvContent = convertToCSV(data);
        downloadCSV(csvContent, filename);
    } else {
        // For other formats, you can integrate a library or show a message
        alert(`${type.toUpperCase()} export feature coming soon!\n\nFiltered data: ${data.length} records`);
    }
}

// Download student report (called from button)
window.downloadStudentReport = function() {
    const data = reportData.filteredData;
    const csvContent = convertToCSV(data);
    downloadCSV(csvContent, `student_report_${currentUser.id}.csv`);
};

// Convert data to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = currentUser.role === 'lecturer' 
        ? ['Student ID', 'Student Name', 'Subject', 'Date', 'Status', 'Department']
        : ['Date', 'Subject', 'Status', 'Remarks'];
    
    const rows = data.map(record => {
        if (currentUser.role === 'lecturer') {
            const student = reportData.students.find(s => s.student_id == record.student_id);
            const studentName = student ? student.name : 'Unknown';
            const department = student ? student.department : 'N/A';
            const subject = reportData.subjects.find(s => s.subject_id == record.subject_id);
            const subjectName = subject ? subject.name : `Subject ${record.subject_id}`;
            
            return [
                record.student_id,
                studentName,
                subjectName,
                record.date,
                record.status,
                department
            ].join(',');
        } else {
            const subject = reportData.subjects.find(s => s.subject_id == record.subject_id);
            const subjectName = subject ? subject.name : `Subject ${record.subject_id}`;
            
            return [
                record.date,
                subjectName,
                record.status,
                record.remarks || ''
            ].join(',');
        }
    });
    
    return [headers.join(','), ...rows].join('\n');
}

// Download CSV file
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
