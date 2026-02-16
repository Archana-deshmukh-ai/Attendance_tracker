// frontend/js/student_dashboard.js

// ================= CONFIGURATION =================
const STUDENT_CONFIG = {
    refreshInterval: 30000, // 30 seconds
    apiBaseUrl: 'http://localhost:5000/api',
    attendanceThresholds: {
        minRequirement: 75,
        goodStanding: 85,
        excellence: 95
    },
    chartColors: {
        primary: '#102094',
        secondary: '#38bdf8',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444'
    }
};

// ================= STATE MANAGEMENT =================
let studentState = {
    studentData: null,
    attendanceData: [],
    subjects: [],
    notifications: [],
    currentPage: 1,
    pageSize: 10,
    totalRecords: 0,
    lastUpdate: null,
    isRefreshing: false,
    studentId: null
};

// ================= DOM ELEMENTS =================
const elements = {
    // Student Info
    studentName: document.getElementById('studentName'),
    studentId: document.getElementById('studentId'),
    studentDept: document.getElementById('studentDept'),
    studentSemester: document.getElementById('studentSemester'),
    
    // Overview Statistics
    totalClasses: document.getElementById('totalClasses'),
    presentCount: document.getElementById('presentCount'),
    absentCount: document.getElementById('absentCount'),
    attendancePercent: document.getElementById('attendancePercent'),
    classChange: document.getElementById('classChange'),
    presentChange: document.getElementById('presentChange'),
    absentChange: document.getElementById('absentChange'),
    percentChange: document.getElementById('percentChange'),
    
    // Progress Indicators
    attendanceStatus: document.getElementById('attendanceStatus'),
    semesterProgress: document.getElementById('semesterProgress'),
    progressFill: document.getElementById('progressFill'),
    
    // Footer Stats
    footerTotalClasses: document.getElementById('footerTotalClasses'),
    footerAttendanceRate: document.getElementById('footerAttendanceRate'),
    
    // Goals Progress
    minRequirementProgress: document.getElementById('minRequirementProgress'),
    goodStandingProgress: document.getElementById('goodStandingProgress'),
    excellenceProgress: document.getElementById('excellenceProgress'),
    minRequirementFill: document.getElementById('minRequirementFill'),
    goodStandingFill: document.getElementById('goodStandingFill'),
    excellenceFill: document.getElementById('excellenceFill'),
    
    // Performance Summary
    attendanceRanking: document.getElementById('attendanceRanking'),
    consistencyScore: document.getElementById('consistencyScore'),
    daysSinceAbsent: document.getElementById('daysSinceAbsent'),
    
    // Lists & Tables
    todaysClasses: document.getElementById('todaysClasses'),
    subjectsPerformance: document.getElementById('subjectsPerformance'),
    attendanceTableBody: document.getElementById('attendanceTableBody'),
    recordCount: document.getElementById('recordCount'),
    notificationsList: document.getElementById('notificationsList'),
    notificationCount: document.getElementById('notificationCount'),
    importantAlerts: document.getElementById('importantAlerts'),
    
    // Chart
    attendanceChart: document.getElementById('attendanceChart'),
    
    // Session Info
    sessionInfo: document.getElementById('sessionInfo')
};

// ================= INITIALIZATION =================
function initStudentDashboard() {
    console.log('Student Dashboard initialized');
    
    // Update session info
    updateSessionInfo();
    
    // Load student data
    loadStudentData().then(() => {
        // After we have studentId, load everything else
        loadAllData();
    });
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    // Setup event listeners
    setupEventListeners();
    
    // Use global navigation functions from script.js
    if (typeof window.updateNavigation === 'function') {
        window.updateNavigation();
    }
    if (typeof window.updateAuthArea === 'function') {
        window.updateAuthArea();
    }
    
    // Highlight current page
    highlightCurrentPage();
}

async function loadAllData() {
    await Promise.all([
        loadOverviewStatistics(),
        loadTodaysClasses(),
        loadSubjectPerformance(),
        loadRecentAttendance(),
        loadNotifications(),
        loadImportantAlerts()
    ]);
    
    // Initialize chart after data is loaded
    initAttendanceChart();
    
    // Update goals and summary
    updateGoalsProgress();
    updatePerformanceSummary();
}

// ================= DATA LOADING FUNCTIONS =================
async function loadStudentData() {
    try {
        // Get login status
        const statusRes = await fetch('/api/login-status');
        const statusData = await statusRes.json();
        
        if (!statusData.logged_in || statusData.role !== 'student') {
            window.location.href = '/';
            return;
        }
        
        // Update basic info
        if (elements.studentName && statusData.name) {
            elements.studentName.textContent = statusData.name;
        }
        if (elements.studentId && statusData.student_id) {
            elements.studentId.textContent = statusData.student_id;
            studentState.studentId = statusData.student_id;
        }
        
        // Fetch detailed student info (optional, for department)
        const studentsRes = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/students`);
        if (studentsRes.ok) {
            const studentsData = await studentsRes.json();
            if (studentsData.success) {
                const student = studentsData.students.find(s => 
                    s.student_id == statusData.student_id
                );
                
                if (student) {
                    studentState.studentData = student;
                    
                    if (elements.studentDept && student.department) {
                        elements.studentDept.textContent = student.department;
                    }
                    // Semester not in CSV – set default or leave as placeholder
                    if (elements.studentSemester) {
                        elements.studentSemester.textContent = student.semester || '6';
                    }
                    
                    // Update semester progress (using default semester)
                    updateSemesterProgress(student.semester || 6);
                }
            }
        }
        
    } catch (error) {
        console.error('Error loading student data:', error);
        showErrorMessage('Failed to load student information');
    }
}

// Compute statistics from attendance data
function computeStatistics(period = 'month') {
    if (!studentState.studentId) return null;
    
    const now = new Date();
    let startDate = new Date(now);
    
    // Determine date range based on period
    switch(period) {
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'semester':
            startDate.setMonth(now.getMonth() - 6);
            break;
        default:
            startDate = new Date(0); // all time
    }
    
    // Filter attendance for this student and within date range
    const filtered = studentState.attendanceData.filter(record => {
        if (record.student_id != studentState.studentId) return false;
        const recordDate = new Date(record.date);
        return recordDate >= startDate;
    });
    
    const total = filtered.length;
    const present = filtered.filter(r => r.status === 'present').length;
    const absent = total - present;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    
    // Compute changes compared to previous period
    let prevStartDate = new Date(startDate);
    let prevEndDate = new Date(now);
    if (period === 'week') {
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate = startDate;
    } else if (period === 'month') {
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        prevEndDate = startDate;
    } else {
        prevStartDate = startDate; // no previous data
    }
    
    const prevFiltered = studentState.attendanceData.filter(record => {
        if (record.student_id != studentState.studentId) return false;
        const recordDate = new Date(record.date);
        return recordDate >= prevStartDate && recordDate < prevEndDate;
    });
    
    const prevTotal = prevFiltered.length;
    const prevPresent = prevFiltered.filter(r => r.status === 'present').length;
    const prevPercent = prevTotal > 0 ? Math.round((prevPresent / prevTotal) * 100) : 0;
    
    return {
        total_classes: total,
        present_count: present,
        absent_count: absent,
        attendance_percent: percent,
        class_change: total - prevTotal,
        present_change: present - prevPresent,
        absent_change: absent - prevPresent, // not exact but ok
        percent_change: percent - prevPercent
    };
}

async function loadOverviewStatistics(period = 'month') {
    try {
        // First, ensure attendance data is loaded
        if (studentState.attendanceData.length === 0) {
            await loadAttendanceData();
        }
        
        const stats = computeStatistics(period);
        if (!stats) return;
        
        // Update statistics with animation
        if (elements.totalClasses) animateNumber(elements.totalClasses, stats.total_classes);
        if (elements.presentCount) animateNumber(elements.presentCount, stats.present_count);
        if (elements.absentCount) animateNumber(elements.absentCount, stats.absent_count);
        if (elements.attendancePercent) animateNumber(elements.attendancePercent, stats.attendance_percent, '%');
        
        // Update change indicators
        if (elements.classChange) {
            elements.classChange.textContent = `${stats.class_change >= 0 ? '+' : ''}${stats.class_change} this week`;
            elements.classChange.className = `overview-change ${stats.class_change >= 0 ? '' : 'negative'}`;
        }
        if (elements.presentChange) {
            elements.presentChange.textContent = `${stats.present_change >= 0 ? '+' : ''}${stats.present_change} this week`;
            elements.presentChange.className = `overview-change ${stats.present_change >= 0 ? '' : 'negative'}`;
        }
        if (elements.absentChange) {
            elements.absentChange.textContent = `${stats.absent_change >= 0 ? '+' : ''}${stats.absent_change} this week`;
            elements.absentChange.className = `overview-change ${stats.absent_change >= 0 ? '' : 'negative'}`;
        }
        if (elements.percentChange) {
            elements.percentChange.textContent = `${stats.percent_change >= 0 ? '+' : ''}${stats.percent_change}% from last week`;
            elements.percentChange.className = `overview-change ${stats.percent_change >= 0 ? '' : 'negative'}`;
        }
        
        // Update footer stats
        if (elements.footerTotalClasses) elements.footerTotalClasses.textContent = stats.total_classes;
        if (elements.footerAttendanceRate) elements.footerAttendanceRate.textContent = `${stats.attendance_percent}%`;
        
        // Update attendance status
        updateAttendanceStatus(stats.attendance_percent);
        
        // Store current attendance for other calculations
        studentState.currentAttendance = stats.attendance_percent;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadAttendanceData() {
    try {
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/attendance`);
        if (!response.ok) throw new Error('Failed to fetch attendance');
        
        const data = await response.json();
        if (data.success) {
            studentState.attendanceData = data.attendance || [];
        }
    } catch (error) {
        console.error('Error loading attendance data:', error);
    }
}

async function loadTodaysClasses() {
    // Mock data for today's classes – replace with real timetable if available
    const mockClasses = [
        { time: new Date().setHours(9,0), subject: 'Data Structures', room: 'Room 201', lecturer: 'Dr. Sharma', attended: false },
        { time: new Date().setHours(11,0), subject: 'Algorithms', room: 'Room 305', lecturer: 'Dr. Iyer', attended: false },
        { time: new Date().setHours(14,0), subject: 'Database Systems', room: 'Lab 4', lecturer: 'Prof. Rao', attended: false }
    ];
    
    renderTodaysClasses(mockClasses);
}

function renderTodaysClasses(classes) {
    if (!elements.todaysClasses) return;
    
    const now = new Date();
    const classesHTML = classes.map(cls => {
        const classTime = new Date(cls.time);
        const isPast = classTime < now;
        const status = cls.attended ? 'attended' : (isPast ? 'missed' : 'upcoming');
        const statusText = cls.attended ? 'Attended' : (isPast ? 'Missed' : 'Upcoming');
        
        return `
            <div class="class-item">
                <div class="class-time">${formatTime(cls.time)}</div>
                <div class="class-details">
                    <h4>${cls.subject}</h4>
                    <p>${cls.room} | ${cls.lecturer}</p>
                </div>
                <span class="class-status ${status}">${statusText}</span>
            </div>
        `;
    }).join('');
    
    elements.todaysClasses.innerHTML = classesHTML || `
        <div class="class-empty">
            <i class="fas fa-calendar-times"></i>
            <p>No classes scheduled for today</p>
        </div>
    `;
}

async function loadSubjectPerformance() {
    try {
        // Load subjects and attendance to compute per-subject stats
        const subjectsRes = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/subjects`);
        if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
        const subjectsData = await subjectsRes.json();
        if (!subjectsData.success) return;
        
        if (studentState.attendanceData.length === 0) {
            await loadAttendanceData();
        }
        
        const subjects = subjectsData.subjects;
        const studentAttendance = studentState.attendanceData.filter(r => r.student_id == studentState.studentId);
        
        const subjectStats = {};
        studentAttendance.forEach(record => {
            if (!subjectStats[record.subject_id]) {
                subjectStats[record.subject_id] = { total: 0, present: 0 };
            }
            subjectStats[record.subject_id].total++;
            if (record.status === 'present') {
                subjectStats[record.subject_id].present++;
            }
        });
        
        const performance = subjects.map(subj => {
            const stats = subjectStats[subj.subject_id] || { total: 0, present: 0 };
            const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
            return {
                code: subj.code,
                name: subj.name,
                attendance_rate: rate
            };
        });
        
        studentState.subjects = performance;
        renderSubjectsPerformance();
        
    } catch (error) {
        console.error('Error loading subject performance:', error);
    }
}

function renderSubjectsPerformance() {
    if (!elements.subjectsPerformance) return;
    
    if (!studentState.subjects.length) {
        elements.subjectsPerformance.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>No subject data available</p>
            </div>
        `;
        return;
    }
    
    const subjectsHTML = studentState.subjects.map(subject => `
        <div class="subject-item">
            <div class="subject-info">
                <div class="subject-code">${subject.code}</div>
                <div class="subject-name">${subject.name}</div>
            </div>
            <div class="subject-performance">
                <div class="attendance-rate">${subject.attendance_rate}%</div>
                <div class="performance-bar">
                    <div class="performance-fill" style="width: ${subject.attendance_rate}%"></div>
                </div>
            </div>
        </div>
    `).join('');
    
    elements.subjectsPerformance.innerHTML = subjectsHTML;
}

async function loadRecentAttendance(filter = 'all') {
    try {
        if (studentState.attendanceData.length === 0) {
            await loadAttendanceData();
        }
        
        let filtered = studentState.attendanceData.filter(r => r.student_id == studentState.studentId);
        
        // Apply filter
        if (filter === 'present') {
            filtered = filtered.filter(r => r.status === 'present');
        } else if (filter === 'absent') {
            filtered = filtered.filter(r => r.status === 'absent');
        } else if (filter === 'week') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filtered = filtered.filter(r => new Date(r.date) >= oneWeekAgo);
        }
        
        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        studentState.totalRecords = filtered.length;
        
        // Paginate
        const start = (studentState.currentPage - 1) * studentState.pageSize;
        const paginated = filtered.slice(start, start + studentState.pageSize);
        studentState.attendanceData = paginated; // store paginated for display
        
        renderAttendanceTable(paginated);
        
        if (elements.recordCount) {
            elements.recordCount.textContent = paginated.length;
        }
        
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function renderAttendanceTable(attendance) {
    if (!elements.attendanceTableBody) return;
    
    if (!attendance.length) {
        elements.attendanceTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No attendance records found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const tableHTML = attendance.map(record => {
        const statusClass = record.status === 'present' ? 'status-present' : 'status-absent';
        const statusIcon = record.status === 'present' ? 'fa-check-circle' : 'fa-times-circle';
        const statusText = record.status === 'present' ? 'Present' : 'Absent';
        
        return `
            <tr>
                <td>${formatDate(record.date)}</td>
                <td>${record.subject_name || `Subject ${record.subject_id}`}</td>
                <td>${record.time || 'N/A'}</td>
                <td class="${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    ${statusText}
                </td>
                <td>${record.remarks || '-'}</td>
            </tr>
        `;
    }).join('');
    
    elements.attendanceTableBody.innerHTML = tableHTML;
}

async function loadNotifications() {
    // Mock notifications – replace with real endpoint when available
    const mockNotifications = [
        { id: 1, title: 'Attendance Deadline', message: 'Mark attendance for CS101 by 5 PM', type: 'deadline', timestamp: new Date(Date.now() - 3600000).toISOString(), unread: true },
        { id: 2, title: 'New Report Available', message: 'Your monthly attendance report is ready', type: 'report', timestamp: new Date(Date.now() - 86400000).toISOString(), unread: false }
    ];
    studentState.notifications = mockNotifications;
    renderNotifications();
    updateNotificationCount();
}

function renderNotifications() {
    if (!elements.notificationsList) return;
    
    if (!studentState.notifications.length) {
        elements.notificationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    const notificationsHTML = studentState.notifications.map(notification => `
        <div class="notification-item ${notification.unread ? 'unread' : ''}">
            <div class="notification-icon">
                <i class="fas ${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <small class="notification-time">${formatTimeAgo(notification.timestamp)}</small>
            </div>
        </div>
    `).join('');
    
    elements.notificationsList.innerHTML = notificationsHTML;
}

async function loadImportantAlerts() {
    // Mock alerts
    const mockAlerts = [
        { type: 'attendance', priority: 'warning', title: 'Attendance Review Week', message: 'Check your attendance and report discrepancies', due_date: new Date(Date.now() + 3*86400000).toISOString() }
    ];
    renderImportantAlerts(mockAlerts);
}

function renderImportantAlerts(alerts) {
    if (!elements.importantAlerts) return;
    
    if (!alerts.length) {
        elements.importantAlerts.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No important alerts</p>
            </div>
        `;
        return;
    }
    
    const alertsHTML = alerts.map(alert => `
        <div class="alert-item ${alert.priority}">
            <div class="alert-icon">
                <i class="fas ${getAlertIcon(alert.type)}"></i>
            </div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.message}</p>
                <small><i class="fas fa-clock"></i> ${formatTimeAgo(alert.due_date)}</small>
            </div>
        </div>
    `).join('');
    
    elements.importantAlerts.innerHTML = alertsHTML;
}

// ================= CHART FUNCTIONS =================
function initAttendanceChart() {
    if (!elements.attendanceChart) return;
    
    // Destroy existing chart if it exists
    if (window.attendanceChartInstance) {
        window.attendanceChartInstance.destroy();
    }
    
    const ctx = elements.attendanceChart.getContext('2d');
    
    // Compute weekly data from actual attendance
    const weeklyData = getWeeklyAttendanceData();
    
    window.attendanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeklyData.labels,
            datasets: [{
                label: 'Your Attendance %',
                data: weeklyData.yourAttendance,
                borderColor: STUDENT_CONFIG.chartColors.primary,
                backgroundColor: 'rgba(16, 32, 148, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: STUDENT_CONFIG.chartColors.primary,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }, {
                label: 'Class Average',
                data: weeklyData.classAverage,
                borderColor: STUDENT_CONFIG.chartColors.secondary,
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointBackgroundColor: STUDENT_CONFIG.chartColors.secondary,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#64748b',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(16, 32, 148, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    cornerRadius: 6
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 70,
                    max: 100,
                    grid: { color: 'rgba(226, 232, 240, 0.5)' },
                    ticks: { color: '#64748b', font: { size: 12 } },
                    title: {
                        display: true,
                        text: 'Attendance Percentage',
                        color: '#64748b',
                        font: { size: 12, weight: 'bold' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 12 } },
                    title: {
                        display: true,
                        text: 'Weeks',
                        color: '#64748b',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

function getWeeklyAttendanceData() {
    // Compute last 6 weeks of attendance for this student and class average
    const weeks = [];
    const yourAttendance = [];
    const classAverage = [];
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7) - 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        weeks.push(`Week ${6 - i}`);
        
        // Student's attendance this week
        const studentRecords = studentState.attendanceData.filter(r => {
            if (r.student_id != studentState.studentId) return false;
            const d = new Date(r.date);
            return d >= weekStart && d < weekEnd;
        });
        const studentTotal = studentRecords.length;
        const studentPresent = studentRecords.filter(r => r.status === 'present').length;
        yourAttendance.push(studentTotal > 0 ? Math.round((studentPresent / studentTotal) * 100) : 0);
        
        // Class average this week
        const classRecords = studentState.attendanceData.filter(r => {
            const d = new Date(r.date);
            return d >= weekStart && d < weekEnd;
        });
        // Group by student and compute per-student average, then average across students
        const studentMap = {};
        classRecords.forEach(r => {
            if (!studentMap[r.student_id]) {
                studentMap[r.student_id] = { total: 0, present: 0 };
            }
            studentMap[r.student_id].total++;
            if (r.status === 'present') studentMap[r.student_id].present++;
        });
        const classPercents = Object.values(studentMap).map(s => s.total > 0 ? (s.present / s.total) * 100 : 0);
        const avg = classPercents.length > 0 ? Math.round(classPercents.reduce((a,b) => a+b, 0) / classPercents.length) : 0;
        classAverage.push(avg);
    }
    
    return { labels: weeks, yourAttendance, classAverage };
}

// ================= UPDATE FUNCTIONS =================
function updateOverview() {
    const period = document.getElementById('overviewPeriod')?.value || 'month';
    loadOverviewStatistics(period);
}

function updateAttendanceStatus(attendancePercent) {
    if (!elements.attendanceStatus) return;
    
    let status = 'Good';
    let icon = 'fa-check-circle';
    let color = '#10b981';
    
    if (attendancePercent >= STUDENT_CONFIG.attendanceThresholds.excellence) {
        status = 'Excellent';
        icon = 'fa-trophy';
        color = '#8b5cf6';
    } else if (attendancePercent >= STUDENT_CONFIG.attendanceThresholds.goodStanding) {
        status = 'Good';
        icon = 'fa-check-circle';
        color = '#10b981';
    } else if (attendancePercent >= STUDENT_CONFIG.attendanceThresholds.minRequirement) {
        status = 'Satisfactory';
        icon = 'fa-exclamation-circle';
        color = '#f59e0b';
    } else {
        status = 'Needs Improvement';
        icon = 'fa-exclamation-triangle';
        color = '#ef4444';
    }
    
    elements.attendanceStatus.innerHTML = `
        <i class="fas ${icon}" style="color: ${color};"></i>
        <span>Attendance Status: <strong>${status}</strong></span>
    `;
}

function updateSemesterProgress(semester) {
    if (!elements.semesterProgress || !elements.progressFill) return;
    
    const totalSemesters = 8; // Assuming 8 semesters total
    const currentSemester = parseInt(semester) || 1;
    const progress = Math.round((currentSemester / totalSemesters) * 100);
    
    elements.semesterProgress.textContent = `${progress}%`;
    elements.progressFill.style.width = `${progress}%`;
}

function updateGoalsProgress() {
    const currentAttendance = studentState.currentAttendance || 85;
    
    if (elements.minRequirementProgress && elements.minRequirementFill) {
        const minProgress = Math.min(100, (currentAttendance / STUDENT_CONFIG.attendanceThresholds.minRequirement) * 100);
        elements.minRequirementProgress.textContent = `${Math.round(minProgress)}%`;
        elements.minRequirementFill.style.width = `${minProgress}%`;
    }
    
    if (elements.goodStandingProgress && elements.goodStandingFill) {
        const goodProgress = Math.min(100, (currentAttendance / STUDENT_CONFIG.attendanceThresholds.goodStanding) * 100);
        elements.goodStandingProgress.textContent = `${Math.round(goodProgress)}%`;
        elements.goodStandingFill.style.width = `${goodProgress}%`;
    }
    
    if (elements.excellenceProgress && elements.excellenceFill) {
        const excellenceProgress = Math.min(100, (currentAttendance / STUDENT_CONFIG.attendanceThresholds.excellence) * 100);
        elements.excellenceProgress.textContent = `${Math.round(excellenceProgress)}%`;
        elements.excellenceFill.style.width = `${excellenceProgress}%`;
    }
}

function updatePerformanceSummary() {
    // Compute simple performance metrics from attendance data
    if (!studentState.attendanceData.length) return;
    
    // Consistency score: percentage of days with attendance above 80%? Simplified.
    const consistency = studentState.currentAttendance || 85;
    if (elements.consistencyScore) {
        elements.consistencyScore.textContent = `${consistency}%`;
    }
    
    // Days since last absent
    const studentRecords = studentState.attendanceData.filter(r => r.student_id == studentState.studentId);
    studentRecords.sort((a,b) => new Date(b.date) - new Date(a.date));
    let daysSince = 0;
    for (let i = 0; i < studentRecords.length; i++) {
        if (studentRecords[i].status === 'absent') break;
        daysSince++;
    }
    if (elements.daysSinceAbsent) {
        elements.daysSinceAbsent.textContent = daysSince;
    }
    
    // Ranking – hard to compute without all students, so keep placeholder
    if (elements.attendanceRanking) {
        elements.attendanceRanking.textContent = 'Top 25%';
    }
}

function updateNotificationCount() {
    if (!elements.notificationCount) return;
    
    const unreadCount = studentState.notifications.filter(n => n.unread).length;
    elements.notificationCount.textContent = unreadCount;
    elements.notificationCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

function updateSessionInfo() {
    if (!elements.sessionInfo) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    elements.sessionInfo.textContent = `Active • Last updated: ${timeString}`;
}

// ================= ACTION FUNCTIONS =================
function viewDetailedReport() {
    window.location.href = '/report';
}

function downloadReport() {
    // Mock download – in reality you'd generate PDF from backend
    showInfoMessage('Report download feature coming soon!');
}

function requestAttendanceCertificate() {
    if (studentState.currentAttendance >= STUDENT_CONFIG.attendanceThresholds.excellence) {
        if (confirm('You are eligible for an attendance excellence certificate! Would you like to request it?')) {
            showSuccessMessage('Certificate request submitted successfully!');
        }
    } else {
        showInfoMessage(`You need ${STUDENT_CONFIG.attendanceThresholds.excellence}% attendance for certificate eligibility. Current: ${studentState.currentAttendance || 0}%`);
    }
}

function downloadAttendanceCertificate() {
    showInfoMessage('Certificate download feature coming soon!');
}

function viewFullSchedule() {
    window.location.href = '/timetable';
}

function refreshSubjects() {
    loadSubjectPerformance();
}

function filterAttendance() {
    const filter = document.getElementById('attendanceFilter')?.value || 'all';
    studentState.currentPage = 1;
    loadRecentAttendance(filter);
}

function loadMoreAttendance() {
    studentState.currentPage++;
    loadRecentAttendance(document.getElementById('attendanceFilter')?.value || 'all');
}

function markAllAsRead() {
    studentState.notifications.forEach(n => n.unread = false);
    renderNotifications();
    updateNotificationCount();
    fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/notifications/mark-read`, { method: 'POST' }).catch(() => {});
    showSuccessMessage('All notifications marked as read');
}

// ================= UTILITY FUNCTIONS =================
function animateNumber(element, target, suffix = '') {
    const current = parseInt(element.textContent.replace(suffix, '')) || 0;
    const difference = target - current;
    const duration = 1000;
    const steps = 60;
    const increment = difference / steps;
    let currentValue = current;
    
    const timer = setInterval(() => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= target) || 
            (increment < 0 && currentValue <= target)) {
            element.textContent = target + suffix;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(currentValue) + suffix;
        }
    }, duration / steps);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNotificationIcon(type) {
    const icons = {
        attendance: 'fa-clipboard-check',
        deadline: 'fa-clock',
        system: 'fa-cog',
        alert: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        certificate: 'fa-award',
        default: 'fa-bell'
    };
    return icons[type] || icons.default;
}

function getAlertIcon(type) {
    const icons = {
        attendance: 'fa-clipboard-check',
        exam: 'fa-graduation-cap',
        deadline: 'fa-clock',
        holiday: 'fa-calendar-day',
        default: 'fa-exclamation-circle'
    };
    return icons[type] || icons.default;
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
    const overviewPeriod = document.getElementById('overviewPeriod');
    if (overviewPeriod) overviewPeriod.addEventListener('change', updateOverview);
    
    const chartButtons = document.querySelectorAll('.chart-btn');
    chartButtons.forEach(button => {
        button.addEventListener('click', function() {
            chartButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            // For simplicity, we keep chart type but not change data yet
        });
    });
    
    const attendanceFilter = document.getElementById('attendanceFilter');
    if (attendanceFilter) attendanceFilter.addEventListener('change', filterAttendance);
}

// ================= AUTO REFRESH =================
function setupAutoRefresh() {
    setInterval(() => {
        if (!document.hidden) refreshDashboard();
    }, STUDENT_CONFIG.refreshInterval);
}

function refreshDashboard() {
    if (studentState.isRefreshing) return;
    studentState.isRefreshing = true;
    updateSessionInfo();
    loadAllData().finally(() => {
        studentState.isRefreshing = false;
        studentState.lastUpdate = new Date();
    });
}

// ================= NAVIGATION HELPERS (using global) =================
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') === currentPath) link.classList.add('active');
        });
    }
}

// ================= MESSAGE FUNCTIONS =================
function showSuccessMessage(message) { showMessage(message, 'success'); }
function showErrorMessage(message) { showMessage(message, 'error'); }
function showInfoMessage(message) { showMessage(message, 'info'); }

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'dashboard-message';
    messageDiv.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: ${
            type === 'success' ? '#d1fae5' :
            type === 'error' ? '#fee2e2' : '#dbeafe'
        }; color: ${
            type === 'success' ? '#065f46' :
            type === 'error' ? '#991b1b' : '#1e40af'
        }; padding: 15px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 9999; max-width: 300px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'
                }"></i>
                <span>${message}</span>
            </div>
        </div>
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
}

// ================= EXPORT FUNCTIONS =================
window.updateOverview = updateOverview;
window.viewDetailedReport = viewDetailedReport;
window.downloadReport = downloadReport;
window.requestAttendanceCertificate = requestAttendanceCertificate;
window.downloadAttendanceCertificate = downloadAttendanceCertificate;
window.viewFullSchedule = viewFullSchedule;
window.refreshSubjects = refreshSubjects;
window.filterAttendance = filterAttendance;
window.loadMoreAttendance = loadMoreAttendance;
window.markAllAsRead = markAllAsRead;
window.refreshDashboard = refreshDashboard;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initStudentDashboard);