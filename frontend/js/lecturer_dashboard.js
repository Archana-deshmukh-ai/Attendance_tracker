// frontend/js/lecturer_dashboard.js

// ================= CONFIGURATION =================
const DASHBOARD_CONFIG = {
    refreshInterval: 30000, // 30 seconds
    sessionTimeout: 3600000, // 1 hour
    apiBaseUrl: '/api',
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
    lecturerName: null,
    lecturerId: null,
    lecturerDept: null,
    currentDate: null,
    currentTime: null,
    totalStudents: null,
    todayAttendance: null,
    totalSubjects: null,
    avgAttendance: null,
    studentChange: null,
    attendanceChange: null,
    subjectChange: null,
    performanceChange: null,
    footerTotalStudents: null,
    footerAvgAttendance: null,
    todaySchedule: null,
    subjectsList: null,
    recentActivity: null,
    upcomingDeadlines: null,
    notificationsList: null,
    notificationCount: null,
    attendanceChart: null,
    sessionTimer: null,
    lastLoginTime: null,
    activeSessionCount: null
};

// Cache DOM elements
function cacheElements() {
    elements.lecturerName = document.getElementById('lecturerName');
    elements.lecturerId = document.getElementById('lecturerId');
    elements.lecturerDept = document.getElementById('lecturerDept');
    elements.currentDate = document.getElementById('currentDate');
    elements.currentTime = document.getElementById('currentTime');
    elements.totalStudents = document.getElementById('totalStudents');
    elements.todayAttendance = document.getElementById('todayAttendance');
    elements.totalSubjects = document.getElementById('totalSubjects');
    elements.avgAttendance = document.getElementById('avgAttendance');
    elements.studentChange = document.getElementById('studentChange');
    elements.attendanceChange = document.getElementById('attendanceChange');
    elements.subjectChange = document.getElementById('subjectChange');
    elements.performanceChange = document.getElementById('performanceChange');
    elements.footerTotalStudents = document.getElementById('footerTotalStudents');
    elements.footerAvgAttendance = document.getElementById('footerAvgAttendance');
    elements.todaySchedule = document.getElementById('todaySchedule');
    elements.subjectsList = document.getElementById('subjectsList');
    elements.recentActivity = document.getElementById('recentActivity');
    elements.upcomingDeadlines = document.getElementById('upcomingDeadlines');
    elements.notificationsList = document.getElementById('notificationsList');
    elements.notificationCount = document.getElementById('notificationCount');
    elements.attendanceChart = document.getElementById('attendanceChart');
    elements.sessionTimer = document.getElementById('sessionTimer');
    elements.lastLoginTime = document.getElementById('lastLoginTime');
    elements.activeSessionCount = document.getElementById('activeSessionCount');
}

// ================= INITIALIZATION =================
function initDashboard() {
    console.log('Lecturer Dashboard initialized');
    
    cacheElements();
    
    updateDateTime();
    startRealTimeClock();
    
    loadLecturerData();
    loadStatistics();
    loadSubjects();
    loadTodaysSchedule();
    loadRecentActivity();
    loadNotifications();
    loadDeadlines();
    initAttendanceChart();
    setupAutoRefresh();
    setupSessionTimer();
    setupEventListeners();
    
    if (typeof window.updateNavigation === 'function') window.updateNavigation();
    if (typeof window.updateAuthArea === 'function') window.updateAuthArea();
    
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
        elements.currentTime.textContent = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
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
        
        if (elements.lecturerName && data.name) elements.lecturerName.textContent = data.name;
        if (elements.lecturerId && data.lecturer_id) elements.lecturerId.textContent = data.lecturer_id;
        if (elements.lecturerDept && data.department) elements.lecturerDept.textContent = data.department;
        if (elements.lastLoginTime && data.last_login) elements.lastLoginTime.textContent = formatTimeAgo(data.last_login);
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
        updateStatisticsDisplay(data);
        updateFooterStats(data);
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function updateStatisticsDisplay(data) {
    if (elements.totalStudents && data.total_students) animateNumber(elements.totalStudents, data.total_students);
    if (elements.todayAttendance && data.today_attendance !== undefined) animateNumber(elements.todayAttendance, data.today_attendance, '%');
    if (elements.totalSubjects && data.total_subjects) animateNumber(elements.totalSubjects, data.total_subjects);
    if (elements.avgAttendance && data.average_attendance !== undefined) animateNumber(elements.avgAttendance, data.average_attendance, '%');
    
    if (elements.studentChange && data.student_change !== undefined) {
        elements.studentChange.textContent = `${data.student_change >= 0 ? '+' : ''}${data.student_change}% this week`;
        elements.studentChange.className = `stat-change ${data.student_change >= 0 ? 'positive' : 'negative'}`;
    }
    if (elements.attendanceChange && data.attendance_change !== undefined) {
        elements.attendanceChange.textContent = `${data.attendance_change >= 0 ? '+' : ''}${data.attendance_change}% from yesterday`;
        elements.attendanceChange.className = `stat-change ${data.attendance_change >= 0 ? 'positive' : 'negative'}`;
    }
    if (elements.subjectChange) elements.subjectChange.textContent = data.subjects_status || 'All active';
    if (elements.performanceChange) elements.performanceChange.textContent = data.performance_status || 'Meeting target';
}

function updateFooterStats(data) {
    if (elements.footerTotalStudents && data.total_students) elements.footerTotalStudents.textContent = data.total_students;
    if (elements.footerAvgAttendance && data.average_attendance !== undefined) elements.footerAvgAttendance.textContent = `${data.average_attendance}%`;
}

async function loadSubjects() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/subjects`);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        const data = await response.json();
        dashboardState.subjects = data.subjects || [];
        renderSubjectsList();
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function renderSubjectsList() {
    if (!elements.subjectsList) return;
    if (!dashboardState.subjects.length) {
        elements.subjectsList.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><p>No subjects assigned</p></div>`;
        return;
    }
    elements.subjectsList.innerHTML = dashboardState.subjects.map(subject => `
        <div class="subject-card" data-subject-id="${subject.subject_id}">
            <div class="subject-header"><div><div class="subject-code">${subject.code}</div><div class="subject-name">${subject.name}</div></div><div class="subject-attendance">${subject.attendance || '--'}%</div></div>
            <p class="subject-description">${subject.description || 'No description available'}</p>
            <div class="subject-stats"><div class="subject-stat"><div class="subject-stat-value">${subject.students || 0}</div><div class="subject-stat-label">Students</div></div><div class="subject-stat"><div class="subject-stat-value">${subject.classes || 0}</div><div class="subject-stat-label">Classes</div></div><div class="subject-stat"><div class="subject-stat-value">${subject.credits || 0}</div><div class="subject-stat-label">Credits</div></div></div>
            <button class="subject-action" onclick="viewSubjectDetails('${subject.subject_id}')">View Details</button>
        </div>
    `).join('');
}

async function loadTodaysSchedule() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/schedule?date=${today}`);
        if (!response.ok) throw new Error('Failed to fetch schedule');
        const data = await response.json();
        dashboardState.schedule = data.schedule || [];
        renderScheduleList();
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

function renderScheduleList() {
    if (!elements.todaySchedule) return;
    if (!dashboardState.schedule.length) {
        elements.todaySchedule.innerHTML = `<div class="schedule-empty"><i class="fas fa-calendar-times"></i><p>No classes scheduled for today</p></div>`;
        return;
    }
    const now = new Date();
    elements.todaySchedule.innerHTML = dashboardState.schedule.map(item => {
        const classTime = new Date(item.time);
        const isCompleted = classTime < now;
        let status = isCompleted ? 'completed' : 'upcoming';
        let statusText = isCompleted ? 'Completed' : 'Upcoming';
        if (item.in_progress) { status = 'in-progress'; statusText = 'In Progress'; }
        return `<div class="schedule-item"><div class="schedule-time">${formatTime(item.time)}</div><div class="schedule-details"><h4>${item.subject}</h4><p>${item.room} | ${item.batch}</p></div><span class="schedule-status ${status}">${statusText}</span></div>`;
    }).join('');
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/activity`);
        if (!response.ok) throw new Error('Failed to fetch activity');
        const data = await response.json();
        renderActivityList(data.activities || []);
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function renderActivityList(activities) {
    if (!elements.recentActivity) return;
    if (!activities.length) {
        elements.recentActivity.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><p>No recent activity</p></div>`;
        return;
    }
    elements.recentActivity.innerHTML = activities.map(activity => `
        <div class="activity-item"><div class="activity-icon"><i class="fas ${getActivityIcon(activity.type)}"></i></div><div class="activity-content"><p>${activity.description}</p><small>${formatTimeAgo(activity.timestamp)}</small></div></div>
    `).join('');
}

async function loadNotifications() {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/notifications`);
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();
        dashboardState.notifications = data.notifications || [];
        renderNotificationsList();
        updateNotificationCount();
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderNotificationsList() {
    if (!elements.notificationsList) return;
    if (!dashboardState.notifications.length) {
        elements.notificationsList.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>`;
        return;
    }
    elements.notificationsList.innerHTML = dashboardState.notifications.map(notification => `
        <div class="notification-item ${notification.unread ? 'unread' : ''}"><div class="notification-icon"><i class="fas ${getNotificationIcon(notification.type)}"></i></div><div class="notification-content"><h4>${notification.title}</h4><p>${notification.message}</p><small class="notification-time">${formatTimeAgo(notification.timestamp)}</small></div></div>
    `).join('');
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
        renderDeadlinesList(data.deadlines || []);
    } catch (error) {
        console.error('Error loading deadlines:', error);
    }
}

function renderDeadlinesList(deadlines) {
    if (!elements.upcomingDeadlines) return;
    if (!deadlines.length) {
        elements.upcomingDeadlines.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming deadlines</p></div>`;
        return;
    }
    elements.upcomingDeadlines.innerHTML = deadlines.map(deadline => `
        <div class="deadline-item ${deadline.priority}"><div class="deadline-icon"><i class="fas ${getDeadlineIcon(deadline.type)}"></i></div><div class="deadline-content"><h4>${deadline.title}</h4><p>${deadline.description}</p><div class="deadline-meta"><span class="deadline-time"><i class="fas fa-calendar"></i> ${formatDeadlineTime(deadline.due_date)}</span><span class="deadline-status ${deadline.priority}">${deadline.priority}</span></div></div></div>
    `).join('');
}

// ================= CHART FUNCTIONS =================
function initAttendanceChart() {
    if (!elements.attendanceChart) return;
    if (window.attendanceChartInstance) window.attendanceChartInstance.destroy();
    const ctx = elements.attendanceChart.getContext('2d');
    window.attendanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], datasets: [{ label: 'Attendance %', data: [85, 88, 82, 90, 87, 80], borderColor: DASHBOARD_CONFIG.chartColors.primary, backgroundColor: 'rgba(16, 32, 148, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { backgroundColor: 'rgba(16, 32, 148, 0.9)' } }, scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: 'Attendance Percentage' } }, x: { title: { display: true, text: 'Days of Week' } } } }
    });
    loadChartData('weekly');
}

async function loadChartData(type = 'weekly') {
    try {
        const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/chart-data?type=${type}`);
        if (!response.ok) throw new Error('Failed to fetch chart data');
        const data = await response.json();
        dashboardState.chartData = data;
        if (window.attendanceChartInstance && data) {
            window.attendanceChartInstance.data.labels = data.labels || [];
            window.attendanceChartInstance.data.datasets[0].data = data.values || [];
            window.attendanceChartInstance.update();
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

// ================= SESSION MANAGEMENT =================
function setupSessionTimer() {
    if (!elements.sessionTimer) return;
    let timeLeft = DASHBOARD_CONFIG.sessionTimeout / 1000;
    dashboardState.sessionTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) { clearInterval(dashboardState.sessionTimer); logoutDueToInactivity(); return; }
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        elements.sessionTimer.textContent = `Session expires in: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft === 300) showSessionWarning();
    }, 1000);
}

function logoutDueToInactivity() { showErrorMessage('Session expired due to inactivity. Redirecting...'); setTimeout(() => window.location.href = '/logout', 3000); }
function showSessionWarning() { /* warning removed for brevity */ }
function extendSession() { if (dashboardState.sessionTimer) clearInterval(dashboardState.sessionTimer); setupSessionTimer(); showSuccessMessage('Session extended!'); }

// ================= EVENT LISTENERS =================
function setupEventListeners() {
    const statPeriod = document.getElementById('statPeriod');
    if (statPeriod) statPeriod.addEventListener('change', loadStatistics);
    document.querySelectorAll('.chart-btn').forEach(btn => btn.addEventListener('click', function() {
        document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        loadChartData(this.dataset.type);
    }));
    document.querySelector('.refresh-btn')?.addEventListener('click', refreshDashboard);
}

// ================= UTILITY FUNCTIONS =================
function animateNumber(element, target, suffix = '') {
    const current = parseInt(element.textContent.replace(suffix, '')) || 0;
    const difference = target - current;
    const steps = 60;
    const increment = difference / steps;
    let currentValue = current;
    const timer = setInterval(() => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= target) || (increment < 0 && currentValue <= target)) {
            element.textContent = target + suffix;
            clearInterval(timer);
        } else { element.textContent = Math.round(currentValue) + suffix; }
    }, 1000 / steps);
}

function formatTime(dateString) { return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDeadlineTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function getActivityIcon(type) { const icons = { attendance: 'fa-clipboard-check', report: 'fa-chart-bar', export: 'fa-file-export', default: 'fa-history' }; return icons[type] || icons.default; }
function getNotificationIcon(type) { const icons = { attendance: 'fa-clipboard-check', deadline: 'fa-clock', system: 'fa-cog', alert: 'fa-exclamation-circle', default: 'fa-bell' }; return icons[type] || icons.default; }
function getDeadlineIcon(type) { const icons = { attendance: 'fa-clipboard-check', report: 'fa-file-alt', meeting: 'fa-users', exam: 'fa-graduation-cap', default: 'fa-calendar-day' }; return icons[type] || icons.default; }

// ================= ACTION FUNCTIONS =================
function markAttendanceQuick() { window.location.href = '/mark-attendance'; }
function generateReport() { window.location.href = '/report'; }
async function exportData() { try { const response = await fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/export`); if (!response.ok) throw new Error('Failed to export'); const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.csv`; a.click(); window.URL.revokeObjectURL(url); showSuccessMessage('Data exported!'); } catch (error) { showErrorMessage('Export failed'); } }
function viewSubjectDetails(subjectId) { window.location.href = `/report?subject=${subjectId}`; }
function refreshDashboard() { if (dashboardState.isRefreshing) return; dashboardState.isRefreshing = true; Promise.all([loadStatistics(), loadSubjects(), loadTodaysSchedule(), loadRecentActivity(), loadNotifications(), loadDeadlines()]).finally(() => { dashboardState.isRefreshing = false; showSuccessMessage('Dashboard refreshed!'); }); }
function markAllAsRead() { dashboardState.notifications.forEach(n => n.unread = false); renderNotificationsList(); updateNotificationCount(); fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/lecturer/notifications/mark-read`, { method: 'POST' }); showSuccessMessage('All marked as read'); }
function changePassword() { window.location.href = '/change-password'; }
function logoutOtherSessions() { if (confirm('Logout from other devices?')) fetch(`${DASHBOARD_CONFIG.apiBaseUrl}/security/logout-other-sessions`, { method: 'POST' }).then(r => r.ok ? showSuccessMessage('Other sessions terminated') : showErrorMessage('Failed')); }

// ================= AUTO REFRESH =================
function setupAutoRefresh() { setInterval(() => { if (!document.hidden) refreshDashboard(); }, DASHBOARD_CONFIG.refreshInterval); }
function highlightCurrentPage() { const currentPath = window.location.pathname; const navLinks = document.getElementById('nav-links'); if (navLinks) navLinks.querySelectorAll('a').forEach(link => { if (link.getAttribute('href') === currentPath) link.classList.add('active'); }); }
function showSuccessMessage(message) { showMessage(message, 'success'); }
function showErrorMessage(message) { showMessage(message, 'error'); }
function showMessage(message, type) { const msgDiv = document.createElement('div'); msgDiv.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'success' ? '#d1fae5' : '#fee2e2'};color:${type === 'success' ? '#065f46' : '#991b1b'};padding:15px;border-radius:10px;z-index:9999;max-width:300px;`; msgDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`; document.body.appendChild(msgDiv); setTimeout(() => msgDiv.remove(), 5000); }

// ================= INITIALIZE =================
document.addEventListener('DOMContentLoaded', initDashboard);
window.viewSubjectDetails = viewSubjectDetails;
window.markAttendanceQuick = markAttendanceQuick;
window.generateReport = generateReport;
window.exportData = exportData;
window.refreshDashboard = refreshDashboard;
window.markAllAsRead = markAllAsRead;
window.changePassword = changePassword;
window.logoutOtherSessions = logoutOtherSessions;
window.extendSession = extendSession;

