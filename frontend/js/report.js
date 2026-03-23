// frontend/js/report.js - Complete updated version

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

// Helper functions for empty states
function showEmptyChartMessage(chartId, message) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    
    const container = canvas.closest('.chart-container');
    if (!container) return;
    
    // Check if container already has empty state
    if (container.querySelector('.empty-chart-message')) return;
    
    // Hide canvas
    canvas.style.display = 'none';
    
    // Add empty state message
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-chart-message';
    emptyDiv.innerHTML = `
        <i class="fas fa-chart-line"></i>
        <p>${message || 'No data available'}</p>
        <small>Try selecting a different date range or check back later</small>
    `;
    container.appendChild(emptyDiv);
}

function clearEmptyChartMessage(chartId) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    
    const container = canvas.closest('.chart-container');
    if (!container) return;
    
    // Remove empty state message
    const emptyMsg = container.querySelector('.empty-chart-message');
    if (emptyMsg) {
        emptyMsg.remove();
    }
    
    // Show canvas
    canvas.style.display = 'block';
}

// Destroy existing charts
function destroyCharts() {
    Object.keys(chartInstances).forEach(key => {
        if (chartInstances[key]) {
            try {
                chartInstances[key].destroy();
            } catch(e) {
                console.warn(`Error destroying chart ${key}:`, e);
            }
            chartInstances[key] = null;
        }
    });
}

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
    
    // Update last updated time
    updateLastUpdated();
};

// Load all required data
async function loadAllData() {
    try {
        // Load attendance data
        const attendanceRes = await fetch('/api/attendance');
        const attendanceData = await attendanceRes.json();
        if (attendanceData.success) {
            reportData.attendance = attendanceData.attendance;
            console.log(`Loaded ${reportData.attendance.length} attendance records`);
        }
        
        // Load students data
        const studentsRes = await fetch('/api/students');
        const studentsData = await studentsRes.json();
        if (studentsData.success) {
            reportData.students = studentsData.students;
            console.log(`Loaded ${reportData.students.length} students`);
        }
        
        // Load subjects data
        const subjectsRes = await fetch('/api/subjects');
        const subjectsData = await subjectsRes.json();
        if (subjectsData.success) {
            reportData.subjects = subjectsData.subjects;
            console.log(`Loaded ${reportData.subjects.length} subjects`);
        }
        
        // Update quick stats
        updateQuickStats();
        
    } catch (error) {
        console.error('Error loading report data:', error);
        showError('Failed to load report data');
    }
}

// Update quick stats
function updateQuickStats() {
    const totalClasses = reportData.attendance.length;
    const totalPresent = reportData.attendance.filter(r => r.status === 'present').length;
    const totalAbsent = reportData.attendance.filter(r => r.status === 'absent').length;
    const attendancePercent = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
    
    const quickTotalClasses = document.getElementById('quickTotalClasses');
    const quickTotalPresent = document.getElementById('quickTotalPresent');
    const quickTotalAbsent = document.getElementById('quickTotalAbsent');
    const quickAttendancePercent = document.getElementById('quickAttendancePercent');
    
    if (quickTotalClasses) quickTotalClasses.textContent = totalClasses;
    if (quickTotalPresent) quickTotalPresent.textContent = totalPresent;
    if (quickTotalAbsent) quickTotalAbsent.textContent = totalAbsent;
    if (quickAttendancePercent) quickAttendancePercent.textContent = `${attendancePercent}%`;
}

// Setup UI based on user role
function setupRoleBasedUI() {
    const tableHeader = document.getElementById('reportTableHeader');
    if (!tableHeader) return;
    
    if (currentUser.role === 'lecturer') {
        tableHeader.innerHTML = `
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Department</th>
            <th>Subject</th>
            <th>Date</th>
            <th>Status</th>
            <th>Remarks</th>
        `;
        
        // Show filters for lecturers
        const subjectFilterGroup = document.getElementById('subject-filter-group');
        const studentFilterGroup = document.getElementById('student-filter-group');
        const departmentFilterGroup = document.getElementById('department-filter-group');
        
        if (subjectFilterGroup) subjectFilterGroup.style.display = 'block';
        if (studentFilterGroup) studentFilterGroup.style.display = 'block';
        if (departmentFilterGroup) departmentFilterGroup.style.display = 'block';
        
        populateSubjectFilter();
        populateStudentFilter();
        
    } else if (currentUser.role === 'student') {
        tableHeader.innerHTML = `
            <th>Date</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Remarks</th>
        `;
        
        // Hide filters for students
        const subjectFilterGroup = document.getElementById('subject-filter-group');
        const studentFilterGroup = document.getElementById('student-filter-group');
        const departmentFilterGroup = document.getElementById('department-filter-group');
        
        if (subjectFilterGroup) subjectFilterGroup.style.display = 'none';
        if (studentFilterGroup) studentFilterGroup.style.display = 'none';
        if (departmentFilterGroup) departmentFilterGroup.style.display = 'none';
        
        // Update report actions
        const reportActions = document.getElementById('report-actions');
        if (reportActions) {
            reportActions.innerHTML = `
                <button class="action-btn refresh-btn" id="refreshReports">
                    <i class="fas fa-sync-alt"></i> Refresh Data
                </button>
                <button class="action-btn" onclick="downloadStudentReport()">
                    <i class="fas fa-download"></i> Download My Report
                </button>
                <div class="last-updated">
                    <i class="fas fa-clock"></i> Last updated: <span id="lastUpdated">Just now</span>
                </div>
            `;
        }
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
    
    const totalClasses = document.getElementById('total-classes');
    const totalPresent = document.getElementById('total-present');
    const totalAbsent = document.getElementById('total-absent');
    const attendancePercent = document.getElementById('attendance-percent');
    const progressFill = document.getElementById('progressFill');
    
    if (totalClasses) totalClasses.textContent = total;
    if (totalPresent) totalPresent.textContent = present;
    if (totalAbsent) totalAbsent.textContent = absent;
    if (attendancePercent) attendancePercent.textContent = percentage + '%';
    if (progressFill) progressFill.style.width = percentage + '%';
}

// Populate data table
function populateTable(data) {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        const row = document.createElement('tr');
        const colspan = currentUser.role === 'lecturer' ? 7 : 4;
        row.innerHTML = `<td colspan="${colspan}" class="no-data">No attendance records found</td>`;
        tbody.appendChild(row);
        return;
    }
    
    // Show first 100 records for performance
    const displayData = data.slice(0, 100);
    
    displayData.forEach(record => {
        const row = document.createElement('tr');
        
        if (currentUser.role === 'lecturer') {
            const student = reportData.students.find(s => s.student_id == record.student_id);
            const studentName = student ? student.name : 'Unknown';
            const department = student ? student.department : 'N/A';
            const subject = reportData.subjects.find(s => s.subject_id == record.subject_id);
            const subjectName = subject ? subject.name : `Subject ${record.subject_id}`;
            
            row.innerHTML = `
                <td>${record.student_id}</td>
                <td>${studentName}</td>
                <td>${department}</td>
                <td>${subjectName}</td>
                <td>${record.date}</td>
                <td class="status-${record.status}">${record.status}</td>
                <td>${record.remarks || '-'}</td>
            `;
        } else {
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
    
    // Update records count
    const recordsCount = document.getElementById('recordsCount');
    const totalRecords = document.getElementById('totalRecords');
    if (recordsCount) recordsCount.textContent = displayData.length;
    if (totalRecords) totalRecords.textContent = data.length;
}

// Load charts for students
function loadStudentCharts(attendanceData) {
    destroyCharts();
    
    // Check if there's data
    if (!attendanceData || attendanceData.length === 0) {
        showEmptyChartMessage('statusChart', 'No attendance data available');
        showEmptyChartMessage('trendChart', 'No trend data available');
        showEmptyChartMessage('subjectChart', 'No subject data available');
        if (document.getElementById('departmentChart')) {
            showEmptyChartMessage('departmentChart', 'No department data available');
        }
        return;
    }
    
    // Clear empty states
    clearEmptyChartMessage('statusChart');
    clearEmptyChartMessage('trendChart');
    clearEmptyChartMessage('subjectChart');
    if (document.getElementById('departmentChart')) {
        clearEmptyChartMessage('departmentChart');
    }
    
    // Status Chart
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
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
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 12 } } }
                }
            }
        });
        
        // Update stat labels
        const presentStat = document.getElementById('presentStat');
        const absentStat = document.getElementById('absentStat');
        const total = presentCount + absentCount;
        if (presentStat) presentStat.textContent = total > 0 ? `${Math.round((presentCount / total) * 100)}%` : '0%';
        if (absentStat) absentStat.textContent = total > 0 ? `${Math.round((absentCount / total) * 100)}%` : '0%';
    }
    
    // Trend Chart
    const dates = [...new Set(attendanceData.map(r => r.date))].sort();
    if (dates.length > 0) {
        const dateCounts = dates.map(date => {
            const dayRecords = attendanceData.filter(r => r.date === date);
            const present = dayRecords.filter(r => r.status === 'present').length;
            const total = dayRecords.length;
            return total > 0 ? Math.round((present / total) * 100) : 0;
        });
        
        const trendCtx = document.getElementById('trendChart')?.getContext('2d');
        if (trendCtx) {
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
                    maintainAspectRatio: true,
                    scales: {
                        y: { beginAtZero: true, max: 100, title: { display: true, text: 'Attendance Percentage (%)' } },
                        x: { title: { display: true, text: 'Date' } }
                    }
                }
            });
        }
    } else {
        showEmptyChartMessage('trendChart', 'No trend data available');
    }
    
    // Subject Chart
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
    
    if (Object.keys(subjectMap).length > 0) {
        const subjectCtx = document.getElementById('subjectChart')?.getContext('2d');
        if (subjectCtx) {
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
                    maintainAspectRatio: true,
                    scales: {
                        y: { beginAtZero: true, max: 100, title: { display: true, text: 'Attendance Percentage (%)' } }
                    }
                }
            });
        }
    } else {
        showEmptyChartMessage('subjectChart', 'No subject data available');
    }
}

// Load charts for lecturers
function loadLecturerCharts(attendanceData) {
    loadStudentCharts(attendanceData);
    
    // Department chart
    const deptCtx = document.getElementById('departmentChart')?.getContext('2d');
    if (!deptCtx) return;
    
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
    
    if (Object.keys(deptMap).length === 0) {
        showEmptyChartMessage('departmentChart', 'No department data available');
        return;
    }
    
    clearEmptyChartMessage('departmentChart');
    
    const deptLabels = Object.keys(deptMap);
    const deptData = deptLabels.map(dept => {
        const stats = deptMap[dept];
        return stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    });
    
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
            maintainAspectRatio: true,
            scales: {
                y: { beginAtZero: true, max: 100, title: { display: true, text: 'Attendance Percentage (%)' } }
            }
        }
    });
}

// Populate subject filter
function populateSubjectFilter() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (!subjectFilter) return;
    
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
    if (!studentFilter) return;
    
    studentFilter.innerHTML = '<option value="all">All Students</option>';
    
    const displayStudents = reportData.students.slice(0, 100);
    displayStudents.forEach(student => {
        const option = document.createElement('option');
        option.value = student.student_id;
        option.textContent = `${student.student_id} - ${student.name}`;
        studentFilter.appendChild(option);
    });
}

// Populate department filter
function populateDepartmentFilter() {
    const deptFilter = document.getElementById('departmentFilter');
    if (!deptFilter) return;
    
    const departments = [...new Set(reportData.students.map(s => s.department).filter(d => d))];
    deptFilter.innerHTML = '<option value="all">All Departments</option>';
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        deptFilter.appendChild(option);
    });
}

// Setup event listeners
function setupEventListeners() {
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
    
    const exportCsv = document.getElementById('exportCsv');
    if (exportCsv) exportCsv.addEventListener('click', () => downloadReport('csv'));
    
    const refreshBtn = document.getElementById('refreshReports');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
        loadAllData().then(() => loadRoleBasedReports());
    });
    
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) periodFilter.addEventListener('change', handlePeriodChange);
}

// Apply filters
function applyFilters() {
    let filtered = [...reportData.attendance];
    
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    
    if (fromDate) filtered = filtered.filter(record => record.date >= fromDate);
    if (toDate) filtered = filtered.filter(record => record.date <= toDate);
    
    if (currentUser.role === 'lecturer') {
        const subjectFilter = document.getElementById('subjectFilter')?.value;
        if (subjectFilter && subjectFilter !== 'all') {
            filtered = filtered.filter(record => record.subject_id == subjectFilter);
        }
        
        const studentFilter = document.getElementById('studentFilter')?.value;
        if (studentFilter && studentFilter !== 'all') {
            filtered = filtered.filter(record => record.student_id == studentFilter);
        }
        
        const deptFilter = document.getElementById('departmentFilter')?.value;
        if (deptFilter && deptFilter !== 'all') {
            filtered = filtered.filter(record => {
                const student = reportData.students.find(s => s.student_id == record.student_id);
                return student && student.department === deptFilter;
            });
        }
    } else {
        filtered = filtered.filter(record => record.student_id == currentUser.id);
    }
    
    reportData.filteredData = filtered;
    updateStatistics(filtered);
    populateTable(filtered);
    
    if (currentUser.role === 'student') {
        loadStudentCharts(filtered);
    } else {
        loadLecturerCharts(filtered);
    }
}

// Reset filters
function resetFilters() {
    const fromDate = document.getElementById('fromDate');
    const toDate = document.getElementById('toDate');
    const subjectFilter = document.getElementById('subjectFilter');
    const studentFilter = document.getElementById('studentFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    
    if (fromDate) fromDate.value = '';
    if (toDate) toDate.value = '';
    if (subjectFilter) subjectFilter.value = 'all';
    if (studentFilter) studentFilter.value = 'all';
    if (departmentFilter) departmentFilter.value = 'all';
    
    applyFilters();
}

// Handle period change
function handlePeriodChange() {
    const period = document.getElementById('periodFilter').value;
    const today = new Date();
    let fromDate = '', toDate = '';
    
    switch(period) {
        case 'today':
            fromDate = today.toISOString().split('T')[0];
            toDate = fromDate;
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            fromDate = yesterday.toISOString().split('T')[0];
            toDate = fromDate;
            break;
        case 'this_week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            fromDate = weekStart.toISOString().split('T')[0];
            toDate = today.toISOString().split('T')[0];
            break;
        case 'last_week':
            const lastWeekStart = new Date(today);
            lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            fromDate = lastWeekStart.toISOString().split('T')[0];
            toDate = lastWeekEnd.toISOString().split('T')[0];
            break;
        case 'this_month':
            fromDate = today.toISOString().split('T')[0].substring(0, 7) + '-01';
            toDate = today.toISOString().split('T')[0];
            break;
        case 'last_month':
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            fromDate = lastMonth.toISOString().split('T')[0];
            toDate = lastMonthEnd.toISOString().split('T')[0];
            break;
    }
    
    const fromDateInput = document.getElementById('fromDate');
    const toDateInput = document.getElementById('toDate');
    if (fromDateInput && fromDate) fromDateInput.value = fromDate;
    if (toDateInput && toDate) toDateInput.value = toDate;
    
    applyFilters();
}

// Download report
function downloadReport(type) {
    const data = reportData.filteredData;
    const filename = `attendance_report_${new Date().toISOString().slice(0,10)}.csv`;
    
    if (type === 'csv') {
        const csvContent = convertToCSV(data);
        downloadCSV(csvContent, filename);
    } else {
        alert(`${type.toUpperCase()} export feature coming soon!\n\nFiltered data: ${data.length} records`);
    }
}

// Download student report
window.downloadStudentReport = function() {
    const data = reportData.filteredData;
    const csvContent = convertToCSV(data);
    downloadCSV(csvContent, `student_report_${currentUser.id}.csv`);
};

// Convert data to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = currentUser.role === 'lecturer' 
        ? ['Student ID', 'Student Name', 'Department', 'Subject', 'Date', 'Status', 'Remarks']
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
                department,
                subjectName,
                record.date,
                record.status,
                record.remarks || ''
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
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Update last updated time
function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        const now = new Date();
        lastUpdated.textContent = now.toLocaleTimeString();
    }
}

// Show error message
function showError(message) {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-message error';
        statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-message success';
        statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    }
}
// Add these functions to your existing report.js

// Late stat handling
function updateLateStat() {
    const lateCount = reportData.filteredData.filter(r => r.status === 'late').length;
    const total = reportData.filteredData.length;
    const lateStat = document.getElementById('lateStat');
    if (lateStat) {
        lateStat.textContent = total > 0 ? `${Math.round((lateCount / total) * 100)}%` : '0%';
    }
}

// Update the loadStudentCharts function to include late data
function loadStudentCharts(attendanceData) {
    destroyCharts();
    
    if (!attendanceData || attendanceData.length === 0) {
        showEmptyChartMessage('statusChart', 'No attendance data available');
        showEmptyChartMessage('trendChart', 'No trend data available');
        showEmptyChartMessage('subjectChart', 'No subject data available');
        return;
    }
    
    clearEmptyChartMessage('statusChart');
    clearEmptyChartMessage('trendChart');
    clearEmptyChartMessage('subjectChart');
    
    // Status Chart with Late
    const statusCtx = document.getElementById('statusChart')?.getContext('2d');
    if (statusCtx) {
        const presentCount = attendanceData.filter(r => r.status === 'present').length;
        const absentCount = attendanceData.filter(r => r.status === 'absent').length;
        const lateCount = attendanceData.filter(r => r.status === 'late').length;
        
        chartInstances.statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Absent', 'Late'],
                datasets: [{
                    data: [presentCount, absentCount, lateCount],
                    backgroundColor: ['#10b981', '#ef4444', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = presentCount + absentCount + lateCount;
                                const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        const total = presentCount + absentCount + lateCount;
        const presentStat = document.getElementById('presentStat');
        const absentStat = document.getElementById('absentStat');
        const lateStat = document.getElementById('lateStat');
        if (presentStat) presentStat.textContent = total > 0 ? `${Math.round((presentCount / total) * 100)}%` : '0%';
        if (absentStat) absentStat.textContent = total > 0 ? `${Math.round((absentCount / total) * 100)}%` : '0%';
        if (lateStat) lateStat.textContent = total > 0 ? `${Math.round((lateCount / total) * 100)}%` : '0%';
    }
    
    // Rest of the chart code remains the same...
    // [Keep existing trend chart and subject chart code]
}

// Update loadLecturerCharts function
function loadLecturerCharts(attendanceData) {
    loadStudentCharts(attendanceData);
    
    const deptCtx = document.getElementById('departmentChart')?.getContext('2d');
    if (!deptCtx) return;
    
    const deptMap = {};
    attendanceData.forEach(record => {
        const student = reportData.students.find(s => s.student_id == record.student_id);
        if (student && student.department) {
            if (!deptMap[student.department]) {
                deptMap[student.department] = { total: 0, present: 0, late: 0 };
            }
            deptMap[student.department].total++;
            if (record.status === 'present') deptMap[student.department].present++;
            else if (record.status === 'late') deptMap[student.department].late++;
        }
    });
    
    if (Object.keys(deptMap).length === 0) {
        showEmptyChartMessage('departmentChart', 'No department data available');
        return;
    }
    
    clearEmptyChartMessage('departmentChart');
    
    const deptLabels = Object.keys(deptMap);
    const deptPresentData = deptLabels.map(dept => {
        const stats = deptMap[dept];
        return stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    });
    const deptLateData = deptLabels.map(dept => {
        const stats = deptMap[dept];
        return stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0;
    });
    
    if (chartInstances.departmentChart) chartInstances.departmentChart.destroy();
    
    chartInstances.departmentChart = new Chart(deptCtx, {
        type: 'bar',
        data: {
            labels: deptLabels,
            datasets: [
                { label: 'Present %', data: deptPresentData, backgroundColor: '#10b981' },
                { label: 'Late %', data: deptLateData, backgroundColor: '#f59e0b' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Percentage (%)' } } },
            plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%` } } }
        }
    });
}

// Table search functionality
function setupTableSearch() {
    const searchInput = document.getElementById('tableSearch');
    const clearSearch = document.getElementById('clearTableSearch');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#reportTableBody tr');
        let visibleCount = 0;
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const isVisible = text.includes(searchTerm);
            row.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleCount++;
        });
        
        const recordsCount = document.getElementById('recordsCount');
        if (recordsCount) recordsCount.textContent = visibleCount;
        
        if (clearSearch) {
            clearSearch.style.display = searchTerm ? 'block' : 'none';
        }
    });
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        });
    }
}

// Column toggle functionality
function setupColumnToggle() {
    const toggleBtn = document.getElementById('toggleColumns');
    if (!toggleBtn) return;
    
    const columnPreferences = JSON.parse(localStorage.getItem('report_columns') || '{}');
    const thElements = document.querySelectorAll('#reportTableHeader th');
    
    toggleBtn.addEventListener('click', () => {
        const columnSelector = document.createElement('div');
        columnSelector.className = 'column-selector';
        columnSelector.innerHTML = `
            <div class="column-selector-header">
                <h4>Toggle Columns</h4>
                <button class="close-column-selector">&times;</button>
            </div>
            <div class="column-selector-body">
                ${Array.from(thElements).map((th, idx) => `
                    <label class="column-option">
                        <input type="checkbox" data-col="${idx}" ${!columnPreferences[idx] ? 'checked' : ''}>
                        <span>${th.textContent}</span>
                    </label>
                `).join('')}
            </div>
            <div class="column-selector-footer">
                <button class="reset-columns">Reset to Default</button>
            </div>
        `;
        
        document.body.appendChild(columnSelector);
        
        const closeBtn = columnSelector.querySelector('.close-column-selector');
        closeBtn.addEventListener('click', () => columnSelector.remove());
        
        const checkboxes = columnSelector.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                const colIdx = parseInt(this.dataset.col);
                if (this.checked) {
                    delete columnPreferences[colIdx];
                } else {
                    columnPreferences[colIdx] = false;
                }
                localStorage.setItem('report_columns', JSON.stringify(columnPreferences));
                applyColumnVisibility();
            });
        });
        
        const resetBtn = columnSelector.querySelector('.reset-columns');
        resetBtn.addEventListener('click', () => {
            Object.keys(columnPreferences).forEach(key => delete columnPreferences[key]);
            localStorage.setItem('report_columns', JSON.stringify({}));
            applyColumnVisibility();
            columnSelector.remove();
        });
        
        function applyColumnVisibility() {
            thElements.forEach((th, idx) => {
                const shouldHide = columnPreferences[idx] === false;
                th.style.display = shouldHide ? 'none' : '';
                document.querySelectorAll(`#reportTableBody tr`).forEach(row => {
                    const cell = row.children[idx];
                    if (cell) cell.style.display = shouldHide ? 'none' : '';
                });
            });
        }
        
        applyColumnVisibility();
    });
}

// Export all reports
function exportAllReports() {
    showLoadingOverlay();
    
    setTimeout(() => {
        const csvContent = convertToCSV(reportData.filteredData);
        downloadCSV(csvContent, `full_report_${new Date().toISOString().slice(0,10)}.csv`);
        hideLoadingOverlay();
        showSuccess('All reports exported successfully!');
    }, 500);
}

// Loading overlay controls
function showLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
    
    let progress = 0;
    const progressFill = document.getElementById('loadingProgress');
    const percentSpan = document.getElementById('loadingPercent');
    const interval = setInterval(() => {
        progress += 10;
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (percentSpan) percentSpan.textContent = `${progress}%`;
        if (progress >= 100) clearInterval(interval);
    }, 100);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Update the setupEventListeners function
function setupEventListeners() {
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFilters);
    
    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
    
    const exportCsv = document.getElementById('exportCsv');
    if (exportCsv) exportCsv.addEventListener('click', () => downloadReport('csv'));
    
    const exportExcel = document.getElementById('exportExcel');
    if (exportExcel) exportExcel.addEventListener('click', () => downloadReport('excel'));
    
    const printReport = document.getElementById('printReport');
    if (printReport) printReport.addEventListener('click', () => window.print());
    
    const emailReport = document.getElementById('emailReport');
    if (emailReport) emailReport.addEventListener('click', () => showInfo('Email report feature coming soon!'));
    
    const refreshBtn = document.getElementById('refreshReports');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
        showLoadingOverlay();
        loadAllData().then(() => {
            loadRoleBasedReports();
            hideLoadingOverlay();
            showSuccess('Reports refreshed!');
        });
    });
    
    const exportAllBtn = document.getElementById('exportAllReports');
    if (exportAllBtn) exportAllBtn.addEventListener('click', exportAllReports);
    
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) periodFilter.addEventListener('change', handlePeriodChange);
    
    const subjectSort = document.getElementById('subjectSort');
    if (subjectSort) subjectSort.addEventListener('change', () => loadRoleBasedReports());
    
    // Insight buttons
    const viewLowAttendance = document.getElementById('viewLowAttendance');
    if (viewLowAttendance) viewLowAttendance.addEventListener('click', () => {
        const lowAttendance = reportData.filteredData.filter(r => r.status === 'absent').length;
        showInfo(`${lowAttendance} students have low attendance records.`);
    });
    
    const viewTrend = document.getElementById('viewTrend');
    if (viewTrend) viewTrend.addEventListener('click', () => {
        document.querySelector('.chart-type[data-type="weekly"]')?.click();
        document.querySelector('.chart-dashboard').scrollIntoView({ behavior: 'smooth' });
    });
    
    const viewTopPerformers = document.getElementById('viewTopPerformers');
    if (viewTopPerformers) viewTopPerformers.addEventListener('click', () => {
        const topStudents = reportData.students.slice(0, 5);
        showInfo(`Top performers: ${topStudents.map(s => s.name).join(', ')}`);
    });
    
    const optimizeSchedule = document.getElementById('optimizeSchedule');
    if (optimizeSchedule) optimizeSchedule.addEventListener('click', () => {
        showInfo('Schedule optimization recommendations will be available soon!');
    });
    
    // Template buttons
    document.querySelectorAll('.template-use').forEach(btn => {
        btn.addEventListener('click', function() {
            const template = this.dataset.template;
            showLoadingOverlay();
            setTimeout(() => {
                hideLoadingOverlay();
                showSuccess(`${template.charAt(0).toUpperCase() + template.slice(1)} report generated!`);
            }, 1000);
        });
    });
    
    // Setup additional features
    setupTableSearch();
    setupColumnToggle();
    
    // Chart fullscreen
    document.querySelectorAll('.chart-fullscreen').forEach(btn => {
        btn.addEventListener('click', function() {
            const chartId = this.dataset.chart;
            const modal = document.getElementById('fullscreenModal');
            const canvas = document.getElementById('fullscreenChart');
            const originalCanvas = document.getElementById(chartId);
            
            if (modal && canvas && originalCanvas) {
                const modalTitle = document.getElementById('modalTitle');
                if (modalTitle) modalTitle.textContent = `${chartId === 'trendChart' ? 'Attendance Trend' : chartId === 'statusChart' ? 'Attendance Distribution' : 'Chart'} - Fullscreen`;
                
                const ctx = canvas.getContext('2d');
                const originalChart = chartInstances[chartId];
                if (originalChart) {
                    new Chart(ctx, {
                        type: originalChart.config.type,
                        data: originalChart.config.data,
                        options: { ...originalChart.config.options, maintainAspectRatio: true }
                    });
                }
                modal.style.display = 'flex';
            }
        });
    });
    
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) closeModal.addEventListener('click', () => {
        document.getElementById('fullscreenModal').style.display = 'none';
    });
    
    const downloadChart = document.getElementById('downloadChart');
    if (downloadChart) {
        downloadChart.addEventListener('click', () => {
            const canvas = document.getElementById('fullscreenChart');
            if (canvas) {
                const link = document.createElement('a');
                link.download = 'chart.png';
                link.href = canvas.toDataURL();
                link.click();
                showSuccess('Chart downloaded!');
            }
        });
    }
    
    const printChart = document.getElementById('printChart');
    if (printChart) {
        printChart.addEventListener('click', () => {
            window.print();
        });
    }
}

// Show info message
function showInfo(message) {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = 'status-message info';
        statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
    }
}

// Add late count to statistics
function updateStatistics(attendanceData) {
    const total = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'present').length;
    const absent = attendanceData.filter(r => r.status === 'absent').length;
    const late = attendanceData.filter(r => r.status === 'late').length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    
    document.getElementById('total-classes').textContent = total;
    document.getElementById('total-present').textContent = present;
    document.getElementById('total-absent').textContent = absent;
    document.getElementById('attendance-percent').textContent = percentage + '%';
    
    const progressFill = document.getElementById('progressFill');
    if (progressFill) progressFill.style.width = percentage + '%';
    
    // Update late count if element exists
    const lateCountEl = document.getElementById('total-late');
    if (lateCountEl) lateCountEl.textContent = late;
}