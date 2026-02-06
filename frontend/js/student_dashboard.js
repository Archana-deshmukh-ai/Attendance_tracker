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
    isRefreshing: false
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
    loadStudentData();
    
    // Load overview statistics
    loadOverviewStatistics();
    
    // Load today's classes
    loadTodaysClasses();
    
    // Load subject performance
    loadSubjectPerformance();
    
    // Load recent attendance
    loadRecentAttendance();
    
    // Load notifications
    loadNotifications();
    
    // Load important alerts
    loadImportantAlerts();
    
    // Initialize chart
    initAttendanceChart();
    
    // Update goals progress
    updateGoalsProgress();
    
    // Update performance summary
    updatePerformanceSummary();
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update navigation
    updateNavigation();
    
    // Update auth area
    updateAuthArea();
    
    // Highlight current page
    highlightCurrentPage();
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
        }
        
        // Fetch detailed student info
        const studentsRes = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/students`);
        if (studentsRes.ok) {
            const studentsData = await studentsRes.json();
            if (studentsData.success) {
                const student = studentsData.students.find(s => 
                    s.email === statusData.email || s.student_id == statusData.student_id
                );
                
                if (student) {
                    studentState.studentData = student;
                    
                    if (elements.studentDept && student.department) {
                        elements.studentDept.textContent = student.department;
                    }
                    if (elements.studentSemester && student.semester) {
                        elements.studentSemester.textContent = student.semester;
                        
                        // Update semester progress
                        updateSemesterProgress(student.semester);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Error loading student data:', error);
        showErrorMessage('Failed to load student information');
    }
}

async function loadOverviewStatistics(period = 'month') {
    try {
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/statistics?period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch statistics');
        
        const data = await response.json();
        
        // Update statistics with animation
        if (elements.totalClasses && data.total_classes !== undefined) {
            animateNumber(elements.totalClasses, data.total_classes);
        }
        if (elements.presentCount && data.present_count !== undefined) {
            animateNumber(elements.presentCount, data.present_count);
        }
        if (elements.absentCount && data.absent_count !== undefined) {
            animateNumber(elements.absentCount, data.absent_count);
        }
        if (elements.attendancePercent && data.attendance_percent !== undefined) {
            animateNumber(elements.attendancePercent, data.attendance_percent, '%');
        }
        
        // Update change indicators
        if (elements.classChange && data.class_change !== undefined) {
            elements.classChange.textContent = `${data.class_change >= 0 ? '+' : ''}${data.class_change} this week`;
            elements.classChange.className = `overview-change ${data.class_change >= 0 ? '' : 'negative'}`;
        }
        if (elements.presentChange && data.present_change !== undefined) {
            elements.presentChange.textContent = `${data.present_change >= 0 ? '+' : ''}${data.present_change} this week`;
            elements.presentChange.className = `overview-change ${data.present_change >= 0 ? '' : 'negative'}`;
        }
        if (elements.absentChange && data.absent_change !== undefined) {
            elements.absentChange.textContent = `${data.absent_change >= 0 ? '+' : ''}${data.absent_change} this week`;
            elements.absentChange.className = `overview-change ${data.absent_change >= 0 ? '' : 'negative'}`;
        }
        if (elements.percentChange && data.percent_change !== undefined) {
            elements.percentChange.textContent = `${data.percent_change >= 0 ? '+' : ''}${data.percent_change}% from last week`;
            elements.percentChange.className = `overview-change ${data.percent_change >= 0 ? '' : 'negative'}`;
        }
        
        // Update footer stats
        if (elements.footerTotalClasses && data.total_classes !== undefined) {
            elements.footerTotalClasses.textContent = data.total_classes;
        }
        if (elements.footerAttendanceRate && data.attendance_percent !== undefined) {
            elements.footerAttendanceRate.textContent = `${data.attendance_percent}%`;
        }
        
        // Update attendance status
        updateAttendanceStatus(data.attendance_percent);
        
        // Store attendance data for other calculations
        if (data.attendance_percent !== undefined) {
            studentState.currentAttendance = data.attendance_percent;
        }
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadTodaysClasses() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/schedule?date=${today}`);
        if (!response.ok) throw new Error('Failed to fetch schedule');
        
        const data = await response.json();
        
        // Update today's classes list
        renderTodaysClasses(data.classes || []);
        
    } catch (error) {
        console.error('Error loading today\'s classes:', error);
    }
}

function renderTodaysClasses(classes) {
    if (!elements.todaysClasses) return;
    
    if (!classes.length) {
        elements.todaysClasses.innerHTML = `
            <div class="class-empty">
                <i class="fas fa-calendar-times"></i>
                <p>No classes scheduled for today</p>
            </div>
        `;
        return;
    }
    
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
    
    elements.todaysClasses.innerHTML = classesHTML;
}

async function loadSubjectPerformance() {
    try {
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/subjects/performance`);
        if (!response.ok) throw new Error('Failed to fetch subject performance');
        
        const data = await response.json();
        studentState.subjects = data.subjects || [];
        
        // Update subjects performance list
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
                <div class="attendance-rate">${subject.attendance_rate || 0}%</div>
                <div class="performance-bar">
                    <div class="performance-fill" style="width: ${subject.attendance_rate || 0}%"></div>
                </div>
            </div>
        </div>
    `).join('');
    
    elements.subjectsPerformance.innerHTML = subjectsHTML;
}

async function loadRecentAttendance(filter = 'all') {
    try {
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/attendance?filter=${filter}&page=${studentState.currentPage}&limit=${studentState.pageSize}`);
        if (!response.ok) throw new Error('Failed to fetch attendance');
        
        const data = await response.json();
        studentState.attendanceData = data.attendance || [];
        studentState.totalRecords = data.total_records || 0;
        
        // Update attendance table
        renderAttendanceTable();
        
        // Update record count
        if (elements.recordCount) {
            elements.recordCount.textContent = studentState.attendanceData.length;
        }
        
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function renderAttendanceTable() {
    if (!elements.attendanceTableBody) return;
    
    if (!studentState.attendanceData.length) {
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
    
    const tableHTML = studentState.attendanceData.map(record => {
        const statusClass = record.status === 'present' ? 'status-present' : 'status-absent';
        const statusIcon = record.status === 'present' ? 'fa-check-circle' : 'fa-times-circle';
        const statusText = record.status === 'present' ? 'Present' : 'Absent';
        
        return `
            <tr>
                <td>${formatDate(record.date)}</td>
                <td>${record.subject || 'N/A'}</td>
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
    try {
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/notifications`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const data = await response.json();
        studentState.notifications = data.notifications || [];
        
        // Update notifications list
        renderNotifications();
        
        // Update notification count
        updateNotificationCount();
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
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
    try {
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/alerts`);
        if (!response.ok) throw new Error('Failed to fetch alerts');
        
        const data = await response.json();
        
        // Update alerts list
        renderImportantAlerts(data.alerts || []);
        
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
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
    window.attendanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
            datasets: [{
                label: 'Attendance %',
                data: [85, 88, 82, 90, 87, 92],
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
                data: [82, 84, 81, 85, 83, 86],
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
                        font: {
                            size: 12,
                            family: 'Arial'
                        }
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
                    grid: {
                        color: 'rgba(226, 232, 240, 0.5)'
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: 'Attendance Percentage',
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: 'Weeks',
                        color: '#64748b',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'linear'
                }
            }
        }
    });
    
    // Load actual chart data
    loadChartData('weekly');
}

async function loadChartData(type = 'weekly') {
    try {
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/chart-data?type=${type}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        
        const data = await response.json();
        
        // Update chart with real data
        if (window.attendanceChartInstance && data) {
            window.attendanceChartInstance.data.labels = data.labels || [];
            window.attendanceChartInstance.data.datasets[0].data = data.values || [];
            window.attendanceChartInstance.data.datasets[0].label = data.label || 'Your Attendance';
            
            if (data.average_values) {
                window.attendanceChartInstance.data.datasets[1].data = data.average_values;
                window.attendanceChartInstance.data.datasets[1].label = 'Class Average';
            }
            
            window.attendanceChartInstance.update();
        }
        
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
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
    // This would be calculated from actual data
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
    // This would be calculated from actual data
    if (elements.attendanceRanking) {
        elements.attendanceRanking.textContent = 'Top 15%';
    }
    
    if (elements.consistencyScore) {
        elements.consistencyScore.textContent = '92%';
    }
    
    if (elements.daysSinceAbsent) {
        elements.daysSinceAbsent.textContent = '28';
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
    try {
        // Create a temporary link for download
        const link = document.createElement('a');
        link.href = '/api/student/report/pdf';
        link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccessMessage('Report download started!');
        
    } catch (error) {
        console.error('Error downloading report:', error);
        showErrorMessage('Failed to download report');
    }
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
    loadMoreAttendanceData();
}

async function loadMoreAttendanceData() {
    try {
        const filter = document.getElementById('attendanceFilter')?.value || 'all';
        const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/attendance?filter=${filter}&page=${studentState.currentPage}&limit=${studentState.pageSize}`);
        if (!response.ok) throw new Error('Failed to fetch more attendance');
        
        const data = await response.json();
        const newRecords = data.attendance || [];
        
        // Append new records to existing data
        studentState.attendanceData = [...studentState.attendanceData, ...newRecords];
        
        // Update table
        renderAttendanceTable();
        
        // Update record count
        if (elements.recordCount) {
            elements.recordCount.textContent = studentState.attendanceData.length;
        }
        
        // Hide load more button if no more records
        const loadMoreBtn = document.querySelector('.load-more');
        if (loadMoreBtn && studentState.attendanceData.length >= studentState.totalRecords) {
            loadMoreBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error loading more attendance:', error);
    }
}

function markAllAsRead() {
    // Mark all notifications as read locally
    studentState.notifications.forEach(notification => {
        notification.unread = false;
    });
    
    // Update UI
    renderNotifications();
    updateNotificationCount();
    
    // Send to server
    fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/notifications/mark-read`, {
        method: 'POST'
    });
    
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
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
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
    // Overview period change
    const overviewPeriod = document.getElementById('overviewPeriod');
    if (overviewPeriod) {
        overviewPeriod.addEventListener('change', updateOverview);
    }
    
    // Chart type buttons
    const chartButtons = document.querySelectorAll('.chart-btn');
    chartButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            chartButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Load chart data for selected type
            const chartType = this.dataset.type;
            loadChartData(chartType);
        });
    });
    
    // Attendance filter change
    const attendanceFilter = document.getElementById('attendanceFilter');
    if (attendanceFilter) {
        attendanceFilter.addEventListener('change', filterAttendance);
    }
    
    // Quick action buttons
    const actionCards = document.querySelectorAll('.action-card[onclick]');
    actionCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (this.getAttribute('href')) {
                // It's a link, let it navigate
                return;
            }
            // Execute the onclick function
            const onclick = this.getAttribute('onclick');
            if (onclick) {
                eval(onclick);
            }
        });
    });
}

// ================= AUTO REFRESH =================
function setupAutoRefresh() {
    // Refresh dashboard every configured interval
    setInterval(() => {
        if (!document.hidden) {
            refreshDashboard();
        }
    }, STUDENT_CONFIG.refreshInterval);
}

function refreshDashboard() {
    if (studentState.isRefreshing) return;
    
    studentState.isRefreshing = true;
    
    // Update session info
    updateSessionInfo();
    
    // Refresh all data
    Promise.all([
        loadOverviewStatistics(),
        loadTodaysClasses(),
        loadSubjectPerformance(),
        loadRecentAttendance(),
        loadNotifications(),
        loadImportantAlerts()
    ]).finally(() => {
        studentState.isRefreshing = false;
        studentState.lastUpdate = new Date();
    });
}

// ================= NAVIGATION HELPERS =================
function updateNavigation() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    navLinks.innerHTML = `
        <a href="/">Home</a>
        <a href="/report">Reports</a>
        <a href="/about">About</a>
        <a href="/timetable">Timetable</a>
    `;
}

function updateAuthArea() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    
    authArea.innerHTML = `
        <span class="user-name">👤 Student Dashboard</span>
        <a href="/profile" class="nav-btn">Profile</a>
        <button class="logout-btn" id="logoutBtn">Logout</button>
    `;
    
    // Add logout event listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }
}

function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.getElementById('nav-links');
    
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
}

// ================= MESSAGE FUNCTIONS =================
function showSuccessMessage(message) {
    showMessage(message, 'success');
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

function showInfoMessage(message) {
    showMessage(message, 'info');
}

function showMessage(message, type) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = 'dashboard-message';
    messageDiv.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: ${
            type === 'success' ? '#d1fae5' :
            type === 'error' ? '#fee2e2' : '#dbeafe'
        }; color: ${
            type === 'success' ? '#065f46' :
            type === 'error' ? '#991b1b' : '#1e40af'
        }; padding: 15px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); z-index: 9999; max-width: 300px; animation: slideIn 0.3s ease-out;">
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
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// ================= INITIALIZE DASHBOARD =================
document.addEventListener('DOMContentLoaded', initStudentDashboard);

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