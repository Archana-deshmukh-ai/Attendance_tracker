// frontend/js/lecturer_dashboard.js

// ================= CONFIGURATION =================
const DASHBOARD_CONFIG = {
    refreshInterval: 30000, // 30 seconds
    sessionTimeout: 3600000, // 1 hour
    apiBaseUrl: 'http://localhost:5000/api',
    chartColors: {
        primary: '#102094',
        secondary: '#38bdf8',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#8b5cf6'
    }
};

// ================= STATE MANAGEMENT =================
let dashboardState = {
    lecturerData: null,
    statistics: null,
    subjects: [],
    schedule: [],
    notifications: [],
    chartData: null,
    sessionTimer: null,
    isRefreshing: false
};

// ================= DOM ELEMENTS =================
const elements = {
    // Lecturer Info
    lecturerName: document.getElementById('lecturerName'),
    lecturerId: document.getElementById('lecturerId'),
    lecturerDept: document.getElementById('lecturerDept'),
    
    // Date & Time
    currentDate: document.getElementById('currentDate'),
    currentTime: document.getElementById('currentTime'),
    
    // Statistics
    totalStudents: document.getElementById('totalStudents'),
    todayAttendance: document.getElementById('todayAttendance'),
    totalSubjects: document.getElementById('totalSubjects'),
    avgAttendance: document.getElementById('avgAttendance'),
    studentChange: document.getElementById('studentChange'),
    attendanceChange: document.getElementById('attendanceChange'),
    subjectChange: document.getElementById('subjectChange'),
    performanceChange: document.getElementById('performanceChange'),
    
    // Footer Stats
    footerTotalStudents: document.getElementById('footerTotalStudents'),
    footerAvgAttendance: document.getElementById('footerAvgAttendance'),
    
    // Lists
    todaySchedule: document.getElementById('todaySchedule'),
    subjectsList: document.getElementById('subjectsList'),
    recentActivity: document.getElementById('recentActivity'),
    upcomingDeadlines: document.getElementById('upcomingDeadlines'),
    notificationsList: document.getElementById('notificationsList'),
    notificationCount: document.getElementById('notificationCount'),
    
    // Chart
    attendanceChart: document.getElementById('attendanceChart'),
    
    // Session Timer
    sessionTimer: document.getElementById('sessionTimer'),
    
    // Security
    lastLoginTime: document.getElementById('lastLoginTime'),
    activeSessionCount: document.getElementById('activeSessionCount')
};

// ================= INITIALIZATION =================
function initDashboard() {
    console.log('Lecturer Dashboard initialized');
    
    // Update date and time immediately
    updateDateTime();
    
    // Start real-time clock
    startRealTimeClock();
    
    // Load lecturer data
    loadLecturerData();
    
    // Load dashboard statistics
    loadStatistics();
    
    // Load subjects
    loadSubjects();
    
    // Load today's schedule
    loadTodaysSchedule();
    
    // Load recent activity
    loadRecentActivity();
    
    // Load notifications
    loadNotifications();
    
    // Load deadlines
    loadDeadlines();
    
    // Initialize chart
    initAttendanceChart();
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    // Setup session timer
    setupSessionTimer();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update navigation
    updateNavigation();
    
    // Update auth area
    updateAuthArea();
    
    // Highlight current page
    highlightCurrentPage();
}

// ================= DATE & TIME =================
function updateDateTime() {
    if (!elements.currentDate) return;
    
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.currentDate.textContent = now.toLocaleDateString('en-US', options);
}

function startRealTimeClock() {
    if (!elements.currentTime) return;
    
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        elements.currentTime.textContent = timeString;
    }
    
    // Update immediately and every second
    updateClock();
    setInterval(updateClock, 1000);
}

// ================= DATA LOADING FUNCTIONS =================
async function loadLecturerData() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/profile`);
        if (!response.ok) throw new Error('Failed to fetch lecturer data');
        
        const data = await response.json();
        dashboardState.lecturerData = data;
        
        // Update DOM elements
        if (elements.lecturerName && data.name) {
            elements.lecturerName.textContent = data.name;
        }
        if (elements.lecturerId && data.id) {
            elements.lecturerId.textContent = data.id;
        }
        if (elements.lecturerDept && data.department) {
            elements.lecturerDept.textContent = data.department;
        }
        
        // Update last login time
        if (elements.lastLoginTime && data.last_login) {
            elements.lastLoginTime.textContent = formatTimeAgo(data.last_login);
        }
        
    } catch (error) {
        console.error('Error loading lecturer data:', error);
        showErrorMessage('Failed to load lecturer profile');
    }
}

async function loadStatistics() {
    try {
        const period = document.getElementById('statPeriod')?.value || 'week';
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/statistics?period=${period}`);
        if (!response.ok) throw new Error('Failed to fetch statistics');
        
        const data = await response.json();
        dashboardState.statistics = data;
        
        // Update statistics cards
        updateStatisticsDisplay(data);
        
        // Update footer statistics
        updateFooterStats(data);
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function updateStatisticsDisplay(data) {
    // Total Students
    if (elements.totalStudents && data.total_students) {
        animateNumber(elements.totalStudents, data.total_students);
    }
    
    if (elements.studentChange && data.student_change) {
        const change = data.student_change;
        const changeText = `${change >= 0 ? '+' : ''}${change}% this week`;
        elements.studentChange.textContent = changeText;
        elements.studentChange.className = `stat-change ${change >= 0 ? '' : 'negative'}`;
    }
    
    // Today's Attendance
    if (elements.todayAttendance && data.today_attendance !== undefined) {
        animateNumber(elements.todayAttendance, data.today_attendance, '%');
    }
    
    if (elements.attendanceChange && data.attendance_change) {
        const change = data.attendance_change;
        const changeText = `${change >= 0 ? '+' : ''}${change}% from yesterday`;
        elements.attendanceChange.textContent = changeText;
        elements.attendanceChange.className = `stat-change ${change >= 0 ? '' : 'negative'}`;
    }
    
    // Total Subjects
    if (elements.totalSubjects && data.total_subjects) {
        animateNumber(elements.totalSubjects, data.total_subjects);
    }
    
    if (elements.subjectChange) {
        elements.subjectChange.textContent = data.subjects_status || 'All active';
    }
    
    // Average Attendance
    if (elements.avgAttendance && data.average_attendance !== undefined) {
        animateNumber(elements.avgAttendance, data.average_attendance, '%');
    }
    
    if (elements.performanceChange) {
        const performance = data.performance_status || 'Meeting target';
        elements.performanceChange.textContent = performance;
        elements.performanceChange.className = `stat-change ${
            performance.includes('Above') ? '' : 
            performance.includes('Below') ? 'negative' : ''
        }`;
    }
}

function updateFooterStats(data) {
    if (elements.footerTotalStudents && data.total_students) {
        elements.footerTotalStudents.textContent = data.total_students;
    }
    
    if (elements.footerAvgAttendance && data.average_attendance !== undefined) {
        elements.footerAvgAttendance.textContent = `${data.average_attendance}%`;
    }
}

async function loadSubjects() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/subjects`);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        
        const data = await response.json();
        dashboardState.subjects = data.subjects || [];
        
        // Update subjects list
        renderSubjectsList();
        
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function renderSubjectsList() {
    if (!elements.subjectsList) return;
    
    if (!dashboardState.subjects.length) {
        elements.subjectsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>No subjects assigned</p>
            </div>
        `;
        return;
    }
    
    const subjectsHTML = dashboardState.subjects.map(subject => `
        <div class="subject-card" data-subject-id="${subject.id}">
            <div class="subject-header">
                <div>
                    <div class="subject-code">${subject.code}</div>
                    <div class="subject-name">${subject.name}</div>
                </div>
                <div class="subject-attendance">${subject.attendance || '--'}%</div>
            </div>
            <p class="subject-description">${subject.description || 'No description available'}</p>
            <div class="subject-stats">
                <div class="subject-stat">
                    <div class="subject-stat-value">${subject.students || 0}</div>
                    <div class="subject-stat-label">Students</div>
                </div>
                <div class="subject-stat">
                    <div class="subject-stat-value">${subject.classes || 0}</div>
                    <div class="subject-stat-label">Classes</div>
                </div>
                <div class="subject-stat">
                    <div class="subject-stat-value">${subject.credits || 0}</div>
                    <div class="subject-stat-label">Credits</div>
                </div>
            </div>
            <button class="subject-action" onclick="viewSubjectDetails('${subject.id}')">
                View Details
            </button>
        </div>
    `).join('');
    
    elements.subjectsList.innerHTML = subjectsHTML;
}

async function loadTodaysSchedule() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/schedule?date=${today}`);
        if (!response.ok) throw new Error('Failed to fetch schedule');
        
        const data = await response.json();
        dashboardState.schedule = data.schedule || [];
        
        // Update schedule list
        renderScheduleList();
        
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

function renderScheduleList() {
    if (!elements.todaySchedule) return;
    
    if (!dashboardState.schedule.length) {
        elements.todaySchedule.innerHTML = `
            <div class="schedule-empty">
                <i class="fas fa-calendar-times"></i>
                <p>No classes scheduled for today</p>
            </div>
        `;
        return;
    }
    
    const now = new Date();
    const scheduleHTML = dashboardState.schedule.map(item => {
        const classTime = new Date(item.time);
        const isCompleted = classTime < now;
        const isUpcoming = classTime > now;
        
        let status = 'upcoming';
        let statusText = 'Upcoming';
        
        if (isCompleted) {
            status = 'completed';
            statusText = 'Completed';
        } else if (item.in_progress) {
            status = 'in-progress';
            statusText = 'In Progress';
        }
        
        return `
            <div class="schedule-item">
                <div class="schedule-time">${formatTime(item.time)}</div>
                <div class="schedule-details">
                    <h4>${item.subject}</h4>
                    <p>${item.room} | ${item.batch}</p>
                </div>
                <span class="schedule-status ${status}">${statusText}</span>
            </div>
        `;
    }).join('');
    
    elements.todaySchedule.innerHTML = scheduleHTML;
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/activity`);
        if (!response.ok) throw new Error('Failed to fetch activity');
        
        const data = await response.json();
        
        // Update activity list
        renderActivityList(data.activities || []);
        
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function renderActivityList(activities) {
    if (!elements.recentActivity) return;
    
    if (!activities.length) {
        elements.recentActivity.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }
    
    const activityHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.description}</p>
                <small>${formatTimeAgo(activity.timestamp)}</small>
            </div>
        </div>
    `).join('');
    
    elements.recentActivity.innerHTML = activityHTML;
}

async function loadNotifications() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/notifications`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const data = await response.json();
        dashboardState.notifications = data.notifications || [];
        
        // Update notifications list
        renderNotificationsList();
        
        // Update notification count
        updateNotificationCount();
        
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderNotificationsList() {
    if (!elements.notificationsList) return;
    
    if (!dashboardState.notifications.length) {
        elements.notificationsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    const notificationsHTML = dashboardState.notifications.map(notification => `
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

function updateNotificationCount() {
    if (!elements.notificationCount) return;
    
    const unreadCount = dashboardState.notifications.filter(n => n.unread).length;
    elements.notificationCount.textContent = unreadCount;
    elements.notificationCount.style.display = unreadCount > 0 ? 'inline-block' : 'none';
}

async function loadDeadlines() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/deadlines`);
        if (!response.ok) throw new Error('Failed to fetch deadlines');
        
        const data = await response.json();
        
        // Update deadlines list
        renderDeadlinesList(data.deadlines || []);
        
    } catch (error) {
        console.error('Error loading deadlines:', error);
    }
}

function renderDeadlinesList(deadlines) {
    if (!elements.upcomingDeadlines) return;
    
    if (!deadlines.length) {
        elements.upcomingDeadlines.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-check"></i>
                <p>No upcoming deadlines</p>
            </div>
        `;
        return;
    }
    
    const deadlinesHTML = deadlines.map(deadline => `
        <div class="deadline-item ${deadline.priority}">
            <div class="deadline-icon">
                <i class="fas ${getDeadlineIcon(deadline.type)}"></i>
            </div>
            <div class="deadline-content">
                <h4>${deadline.title}</h4>
                <p>${deadline.description}</p>
                <div class="deadline-meta">
                    <span class="deadline-time">
                        <i class="fas fa-calendar"></i> ${formatDeadlineTime(deadline.due_date)}
                    </span>
                    <span class="deadline-status ${deadline.priority}">${deadline.priority}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    elements.upcomingDeadlines.innerHTML = deadlinesHTML;
}

// ================= CHART FUNCTIONS =================
function initAttendanceChart() {
    if (!elements.attendanceChart) return;
    
    // Destroy existing chart if it exists
    if (window.attendanceChartInstance) {
        window.attendanceChartInstance.destroy();
    }
    
    // Default data (will be updated with real data)
    const ctx = elements.attendanceChart.getContext('2d');
    window.attendanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Attendance %',
                data: [85, 88, 82, 90, 87, 80],
                borderColor: DASHBOARD_CONFIG.chartColors.primary,
                backgroundColor: 'rgba(16, 32, 148, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: DASHBOARD_CONFIG.chartColors.primary,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
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
                    beginAtZero: true,
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
                        text: 'Days of Week',
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
    
    // Load chart data
    loadChartData('weekly');
}

async function loadChartData(type = 'weekly') {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/chart-data?type=${type}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        
        const data = await response.json();
        dashboardState.chartData = data;
        
        // Update chart
        updateChart(data);
        
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

function updateChart(data) {
    if (!window.attendanceChartInstance || !data) return;
    
    window.attendanceChartInstance.data.labels = data.labels || [];
    window.attendanceChartInstance.data.datasets[0].data = data.values || [];
    window.attendanceChartInstance.data.datasets[0].label = data.label || 'Attendance';
    
    // Update colors based on chart type
    if (data.type === 'subject') {
        window.attendanceChartInstance.data.datasets[0].backgroundColor = [
            'rgba(16, 32, 148, 0.2)',
            'rgba(56, 189, 248, 0.2)',
            'rgba(16, 185, 129, 0.2)',
            'rgba(245, 158, 11, 0.2)',
            'rgba(139, 92, 246, 0.2)'
        ];
        window.attendanceChartInstance.type = 'bar';
    } else {
        window.attendanceChartInstance.data.datasets[0].backgroundColor = 'rgba(16, 32, 148, 0.1)';
        window.attendanceChartInstance.type = 'line';
    }
    
    window.attendanceChartInstance.update();
}

// ================= SESSION MANAGEMENT =================
function setupSessionTimer() {
    if (!elements.sessionTimer) return;
    
    let timeLeft = DASHBOARD_CONFIG.sessionTimeout / 1000; // Convert to seconds
    
    dashboardState.sessionTimer = setInterval(() => {
        timeLeft--;
        
        if (timeLeft <= 0) {
            clearInterval(dashboardState.sessionTimer);
            logoutDueToInactivity();
            return;
        }
        
        // Update timer display
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        elements.sessionTimer.textContent = `Session expires in: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Warning when 5 minutes left
        if (timeLeft === 300) {
            showSessionWarning();
        }
        
    }, 1000);
}

function logoutDueToInactivity() {
    showErrorMessage('Session expired due to inactivity. Redirecting to login...');
    
    setTimeout(() => {
        window.location.href = '/logout';
    }, 3000);
}

function showSessionWarning() {
    // Create warning notification
    const warningDiv = document.createElement('div');
    warningDiv.className = 'session-warning';
    warningDiv.innerHTML = `
        <div style="position: fixed; bottom: 20px; right: 20px; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 10px; padding: 15px; max-width: 300px; z-index: 9999; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-exclamation-triangle" style="color: #d97706; font-size: 20px;"></i>
                <h4 style="margin: 0; color: #92400e;">Session Expiring Soon</h4>
            </div>
            <p style="margin: 0; color: #92400e; font-size: 14px;">Your session will expire in 5 minutes. Please save your work.</p>
            <button onclick="extendSession()" style="margin-top: 10px; padding: 8px 16px; background: #d97706; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                Extend Session
            </button>
        </div>
    `;
    
    document.body.appendChild(warningDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (warningDiv.parentNode) {
            warningDiv.remove();
        }
    }, 10000);
}

function extendSession() {
    // Reset session timer
    if (dashboardState.sessionTimer) {
        clearInterval(dashboardState.sessionTimer);
    }
    setupSessionTimer();
    
    // Remove warning
    const warning = document.querySelector('.session-warning');
    if (warning) {
        warning.remove();
    }
    
    // Show success message
    showSuccessMessage('Session extended successfully!');
}

// ================= EVENT LISTENERS =================
function setupEventListeners() {
    // Statistics period change
    const statPeriod = document.getElementById('statPeriod');
    if (statPeriod) {
        statPeriod.addEventListener('change', updateStatistics);
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
    
    // Auto-refresh button
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboard);
    }
    
    // Toggle switches
    const switches = document.querySelectorAll('.switch input');
    switches.forEach(switchEl => {
        switchEl.addEventListener('change', function() {
            saveToggleSetting(this.id, this.checked);
        });
    });
    
    // Export data button
    const exportBtn = document.querySelector('.action-card[onclick="exportData()"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
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

function formatDeadlineTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7) return `In ${diffInDays} days`;
    
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getActivityIcon(type) {
    const icons = {
        attendance: 'fa-clipboard-check',
        report: 'fa-chart-bar',
        export: 'fa-file-export',
        login: 'fa-sign-in-alt',
        logout: 'fa-sign-out-alt',
        default: 'fa-history'
    };
    return icons[type] || icons.default;
}

function getNotificationIcon(type) {
    const icons = {
        attendance: 'fa-clipboard-check',
        deadline: 'fa-clock',
        system: 'fa-cog',
        alert: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        default: 'fa-bell'
    };
    return icons[type] || icons.default;
}

function getDeadlineIcon(type) {
    const icons = {
        attendance: 'fa-clipboard-check',
        report: 'fa-file-alt',
        meeting: 'fa-users',
        exam: 'fa-graduation-cap',
        default: 'fa-calendar-day'
    };
    return icons[type] || icons.default;
}

// ================= ACTION FUNCTIONS =================
function markAttendanceQuick() {
    window.location.href = '/mark-attendance';
}

function generateReport() {
    window.location.href = '/report';
}

async function exportData() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/export`);
        if (!response.ok) throw new Error('Failed to export data');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccessMessage('Data exported successfully!');
        
    } catch (error) {
        console.error('Error exporting data:', error);
        showErrorMessage('Failed to export data');
    }
}

function viewSubjectDetails(subjectId) {
    window.location.href = `/subject/${subjectId}`;
}

function viewFullSchedule() {
    window.location.href = '/schedule';
}

function addNewSubject() {
    // Implement modal or redirect to add subject page
    showInfoMessage('Feature coming soon!');
}

function refreshDashboard() {
    if (dashboardState.isRefreshing) return;
    
    dashboardState.isRefreshing = true;
    const refreshBtn = document.querySelector('.refresh-btn');
    if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        refreshBtn.disabled = true;
    }
    
    // Refresh all data
    Promise.all([
        loadStatistics(),
        loadSubjects(),
        loadTodaysSchedule(),
        loadRecentActivity(),
        loadNotifications(),
        loadDeadlines()
    ]).finally(() => {
        dashboardState.isRefreshing = false;
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            refreshBtn.disabled = false;
        }
        showSuccessMessage('Dashboard refreshed!');
    });
}

function markAllAsRead() {
    // Mark all notifications as read
    dashboardState.notifications.forEach(notification => {
        notification.unread = false;
    });
    
    // Update UI
    renderNotificationsList();
    updateNotificationCount();
    
    // Send to server
    fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/notifications/mark-read`, {
        method: 'POST'
    });
    
    showSuccessMessage('All notifications marked as read');
}

function changePassword() {
    window.location.href = '/change-password';
}

function logoutOtherSessions() {
    if (confirm('Are you sure you want to logout from all other devices?')) {
        fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/security/logout-other-sessions`, {
            method: 'POST'
        }).then(response => {
            if (response.ok) {
                showSuccessMessage('All other sessions have been terminated');
            } else {
                showErrorMessage('Failed to logout other sessions');
            }
        });
    }
}

function saveToggleSetting(settingId, value) {
    // Save to localStorage
    localStorage.setItem(`lecturer_${settingId}`, value);
    
    // Send to server
    fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/settings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            setting: settingId,
            value: value
        })
    });
}

// ================= AUTO REFRESH =================
function setupAutoRefresh() {
    // Refresh dashboard every configured interval
    setInterval(() => {
        if (!document.hidden) {
            refreshDashboard();
        }
    }, DASHBOARD_CONFIG.refreshInterval);
}

// ================= NAVIGATION HELPERS =================
function updateNavigation() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    navLinks.innerHTML = `
        <a href="/">Home</a>
        <a href="/mark-attendance">Mark Attendance</a>
        <a href="/report">Reports</a>
        <a href="/about">About</a>
    `;
}

function updateAuthArea() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    
    authArea.innerHTML = `
        <span class="user-name">👤 Lecturer Dashboard</span>
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
    messageDiv.className = `dashboard-message ${type}`;
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
document.addEventListener('DOMContentLoaded', initDashboard);

// ================= EXPORT FUNCTIONS =================
window.updateStatistics = loadStatistics;
window.refreshActivity = loadRecentActivity;
window.refreshDashboard = refreshDashboard;
window.exportData = exportData;
window.markAttendanceQuick = markAttendanceQuick;
window.generateReport = generateReport;
window.viewSubjectDetails = viewSubjectDetails;
window.viewFullSchedule = viewFullSchedule;
window.addNewSubject = addNewSubject;
window.markAllAsRead = markAllAsRead;
window.changePassword = changePassword;
window.logoutOtherSessions = logoutOtherSessions;
window.extendSession = extendSession;