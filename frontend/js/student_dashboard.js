// frontend/js/student_dashboard.js

const STUDENT_CONFIG = { refreshInterval: 30000, apiBaseUrl: '/api', attendanceThresholds: { minRequirement: 75, goodStanding: 85, excellence: 95 }, chartColors: { primary: '#102094', secondary: '#38bdf8', success: '#10b981', warning: '#f59e0b', danger: '#ef4444' } };

let studentState = { studentData: null, attendanceData: [], subjects: [], notifications: [], currentPage: 1, pageSize: 10, totalRecords: 0, lastUpdate: null, isRefreshing: false, studentId: null, currentAttendance: 0 };

const elements = { studentName: null, studentId: null, studentDept: null, studentSemester: null, totalClasses: null, presentCount: null, absentCount: null, attendancePercent: null, classChange: null, presentChange: null, absentChange: null, percentChange: null, attendanceStatus: null, semesterProgress: null, progressFill: null, footerTotalClasses: null, footerAttendanceRate: null, minRequirementProgress: null, goodStandingProgress: null, excellenceProgress: null, minRequirementFill: null, goodStandingFill: null, excellenceFill: null, attendanceRanking: null, consistencyScore: null, daysSinceAbsent: null, todaysClasses: null, subjectsPerformance: null, attendanceTableBody: null, recordCount: null, notificationsList: null, notificationCount: null, importantAlerts: null, attendanceChart: null, sessionInfo: null };

function cacheElements() { Object.keys(elements).forEach(key => { elements[key] = document.getElementById(key); }); }

function initStudentDashboard() {
    console.log('Student Dashboard initialized');
    cacheElements();
    updateSessionInfo();
    loadStudentData().then(() => loadAllData());
    setupAutoRefresh();
    setupEventListeners();
    if (typeof window.updateNavigation === 'function') window.updateNavigation();
    if (typeof window.updateAuthArea === 'function') window.updateAuthArea();
    highlightCurrentPage();
}


async function loadAllData() { await Promise.all([loadOverviewStatistics(), loadTodaysClasses(), loadSubjectPerformance(), loadRecentAttendance(), loadNotifications(), loadImportantAlerts()]); initAttendanceChart(); updateGoalsProgress(); updatePerformanceSummary(); }

async function loadStudentData() {
    try {
        const statusRes = await fetch('/api/login-status');
        const statusData = await statusRes.json();
        if (!statusData.logged_in || statusData.role !== 'student') { window.location.href = '/'; return; }
        if (elements.studentName && statusData.name) elements.studentName.textContent = statusData.name;
        if (elements.studentId && statusData.student_id) { elements.studentId.textContent = statusData.student_id; studentState.studentId = statusData.student_id; }
        const studentsRes = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/students`);
        if (studentsRes.ok) {
            const studentsData = await studentsRes.json();
            if (studentsData.success) {
                const student = studentsData.students.find(s => s.student_id == statusData.student_id);
                if (student) { studentState.studentData = student; if (elements.studentDept && student.department) elements.studentDept.textContent = student.department; if (elements.studentSemester) elements.studentSemester.textContent = student.semester || '6'; updateSemesterProgress(student.semester || 6); }
            }
        }
    } catch (error) { console.error('Error loading student data:', error); showErrorMessage('Failed to load student information'); }
}

async function loadAttendanceData() { try { const response = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/attendance`); const data = await response.json(); if (data.success) studentState.attendanceData = data.attendance || []; } catch (error) { console.error('Error loading attendance:', error); } }

function computeStatistics(period = 'month') {
    if (!studentState.studentId) return null;
    const now = new Date();
    let startDate = new Date(now);
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (period === 'semester') startDate.setMonth(now.getMonth() - 6);
    else startDate = new Date(0);
    const filtered = studentState.attendanceData.filter(r => r.student_id == studentState.studentId && new Date(r.date) >= startDate);
    const total = filtered.length, present = filtered.filter(r => r.status === 'present').length, percent = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total_classes: total, present_count: present, absent_count: total - present, attendance_percent: percent };
}

async function loadOverviewStatistics(period = 'month') {
    if (studentState.attendanceData.length === 0) await loadAttendanceData();
    const stats = computeStatistics(period);
    if (!stats) return;
    if (elements.totalClasses) animateNumber(elements.totalClasses, stats.total_classes);
    if (elements.presentCount) animateNumber(elements.presentCount, stats.present_count);
    if (elements.absentCount) animateNumber(elements.absentCount, stats.absent_count);
    if (elements.attendancePercent) animateNumber(elements.attendancePercent, stats.attendance_percent, '%');
    if (elements.footerTotalClasses) elements.footerTotalClasses.textContent = stats.total_classes;
    if (elements.footerAttendanceRate) elements.footerAttendanceRate.textContent = `${stats.attendance_percent}%`;
    updateAttendanceStatus(stats.attendance_percent);
    studentState.currentAttendance = stats.attendance_percent;
}

function updateAttendanceStatus(percent) {
    if (!elements.attendanceStatus) return;
    let status = 'Good', icon = 'fa-check-circle', color = '#10b981';
    if (percent >= STUDENT_CONFIG.attendanceThresholds.excellence) { status = 'Excellent'; icon = 'fa-trophy'; color = '#8b5cf6'; }
    else if (percent >= STUDENT_CONFIG.attendanceThresholds.goodStanding) { status = 'Good'; icon = 'fa-check-circle'; color = '#10b981'; }
    else if (percent >= STUDENT_CONFIG.attendanceThresholds.minRequirement) { status = 'Satisfactory'; icon = 'fa-exclamation-circle'; color = '#f59e0b'; }
    else { status = 'Needs Improvement'; icon = 'fa-exclamation-triangle'; color = '#ef4444'; }
    elements.attendanceStatus.innerHTML = `<i class="fas ${icon}" style="color: ${color};"></i><span>Attendance Status: <strong>${status}</strong></span>`;
}

function updateSemesterProgress(semester) { if (elements.semesterProgress && elements.progressFill) { const progress = Math.round((parseInt(semester) / 8) * 100); elements.semesterProgress.textContent = `${progress}%`; elements.progressFill.style.width = `${progress}%`; } }
function updateGoalsProgress() { const att = studentState.currentAttendance || 85; if (elements.minRequirementProgress && elements.minRequirementFill) { const prog = Math.min(100, (att / STUDENT_CONFIG.attendanceThresholds.minRequirement) * 100); elements.minRequirementProgress.textContent = `${Math.round(prog)}%`; elements.minRequirementFill.style.width = `${prog}%`; } if (elements.goodStandingProgress && elements.goodStandingFill) { const prog = Math.min(100, (att / STUDENT_CONFIG.attendanceThresholds.goodStanding) * 100); elements.goodStandingProgress.textContent = `${Math.round(prog)}%`; elements.goodStandingFill.style.width = `${prog}%`; } if (elements.excellenceProgress && elements.excellenceFill) { const prog = Math.min(100, (att / STUDENT_CONFIG.attendanceThresholds.excellence) * 100); elements.excellenceProgress.textContent = `${Math.round(prog)}%`; elements.excellenceFill.style.width = `${prog}%`; } }
function updatePerformanceSummary() { if (elements.consistencyScore) elements.consistencyScore.textContent = `${studentState.currentAttendance || 85}%`; if (elements.attendanceRanking) elements.attendanceRanking.textContent = 'Top 25%'; }

async function loadTodaysClasses() { if (elements.todaysClasses) elements.todaysClasses.innerHTML = `<div class="schedule-empty"><i class="fas fa-calendar-times"></i><p>No classes scheduled for today</p></div>`; }
async function loadSubjectPerformance() {
    try {
        const subjectsRes = await fetch(`${STUDENT_CONFIG.apiBaseUrl}/subjects`);
        if (!subjectsRes.ok) throw new Error('Failed');
        const subjectsData = await subjectsRes.json();
        if (!subjectsData.success) return;
        if (studentState.attendanceData.length === 0) await loadAttendanceData();
        const subjects = subjectsData.subjects;
        const studentAttendance = studentState.attendanceData.filter(r => r.student_id == studentState.studentId);
        const subjectStats = {};
        studentAttendance.forEach(r => { if (!subjectStats[r.subject_id]) subjectStats[r.subject_id] = { total: 0, present: 0 }; subjectStats[r.subject_id].total++; if (r.status === 'present') subjectStats[r.subject_id].present++; });
        studentState.subjects = subjects.map(subj => { const stats = subjectStats[subj.subject_id] || { total: 0, present: 0 }; return { code: subj.code, name: subj.name, attendance_rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0 }; });
        renderSubjectsPerformance();
    } catch (error) { console.error('Error loading subjects:', error); }
}


function renderSubjectsPerformance() { if (!elements.subjectsPerformance) return; if (!studentState.subjects.length) { elements.subjectsPerformance.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><p>No subject data</p></div>`; return; } elements.subjectsPerformance.innerHTML = studentState.subjects.map(s => `<div class="subject-item"><div class="subject-info"><div class="subject-code">${s.code}</div><div class="subject-name">${s.name}</div></div><div class="subject-performance"><div class="attendance-rate">${s.attendance_rate}%</div><div class="performance-bar"><div class="performance-fill" style="width: ${s.attendance_rate}%"></div></div></div></div>`).join(''); } 

// Add this to your student_dashboard.html

// Load student info and performance
// student_dashboard.html - Corrected JavaScript
// student_dashboard.html - Corrected JavaScript

async function loadStudentInfo() {
    try {
        const response = await fetch('/api/student/info');
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        const data = await response.json();
        
        document.getElementById('studentName').innerHTML = `<i class="fas fa-user-graduate"></i> ${data.name}`;
        document.getElementById('studentDept').innerHTML = `<i class="fas fa-building"></i> Department: ${data.department}`;
        document.getElementById('studentId').innerHTML = `<i class="fas fa-id-card"></i> ID: ${data.id}`;
        
        console.log("Student department:", data.department);
        
    } catch (error) {
        console.error('Error loading student info:', error);
    }
}

async function loadPerformance() {
    try {
        const response = await fetch('/api/student/performance');
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        const subjects = await response.json();
        const container = document.getElementById('performanceContainer');
        
        console.log("Subjects received:", subjects);
        
        if (!container) return;
        
        if (subjects.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-info-circle"></i>
                    <p>No subjects found for your department. Please contact your coordinator.</p>
                </div>
            `;
            return;
        }
        
        const studentDept = sessionStorage.getItem('studentDept') || 'your';
        
        container.innerHTML = `
            <div class="dept-banner">
                <i class="fas fa-graduation-cap"></i>
                <span>${studentDept} Department - ${subjects.length} Subjects</span>
            </div>
            <div class="subjects-grid">
                ${subjects.map(subject => `
                    <div class="subject-card ${subject.attendance.percentage < 75 ? 'warning' : 'good'}">
                        <div class="subject-header">
                            <span class="subject-code">${subject.subject_code}</span>
                            <span class="subject-credits">${subject.credits} Credits</span>
                        </div>
                        <div class="subject-name">${subject.subject_name}</div>
                        
                        <div class="performance-metrics">
                            <div class="metric">
                                <div class="metric-label">
                                    <span>Attendance</span>
                                    <span>${subject.attendance.percentage}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill ${subject.attendance.percentage < 75 ? 'warning-fill' : 'good-fill'}" 
                                         style="width: ${Math.min(subject.attendance.percentage, 100)}%"></div>
                                </div>
                                <div class="attendance-details">
                                    <small>✅ Present: ${subject.attendance.present}</small>
                                    <small>⏰ Late: ${subject.attendance.late || 0}</small>
                                    <small>❌ Absent: ${(subject.attendance.total - subject.attendance.present)}</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="status-badge ${subject.attendance.percentage < 75 ? 'status-warning' : 'status-good'}">
                            <i class="fas ${subject.attendance.percentage < 75 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                            ${subject.status}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading performance:', error);
        const container = document.getElementById('performanceContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load performance data. Please refresh the page.</p>
                </div>
            `;
        }
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadStudentInfo();
    loadPerformance();
    
    setTimeout(() => {
        const deptElement = document.getElementById('studentDept');
        if (deptElement) {
            const deptText = deptElement.innerText.replace('Department: ', '');
            sessionStorage.setItem('studentDept', deptText);
        }
    }, 1000);
});

async function loadPerformance() {
    try {
        const response = await fetch('/api/student/performance');
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        const subjects = await response.json();
        const container = document.getElementById('performanceContainer');
        
        console.log("Subjects received:", subjects); // Debug - check what subjects are returned
        
        if (!container) return;
        
        if (subjects.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-info-circle"></i>
                    <p>No subjects found for your department. Please contact your coordinator.</p>
                </div>
            `;
            return;
        }
        
        // Show department name and subject count
        const studentDept = sessionStorage.getItem('studentDept') || 'your';
        
        container.innerHTML = `
            <div class="dept-banner">
                <i class="fas fa-graduation-cap"></i>
                <span>${studentDept} Department - ${subjects.length} Subjects</span>
            </div>
            <div class="subjects-grid">
                ${subjects.map(subject => `
                    <div class="subject-card ${subject.attendance.percentage < 75 ? 'warning' : 'good'}">
                        <div class="subject-header">
                            <span class="subject-code">${subject.subject_code}</span>
                            <span class="subject-credits">${subject.credits} Credits</span>
                        </div>
                        <div class="subject-name">${subject.subject_name}</div>
                        
                        <div class="performance-metrics">
                            <div class="metric">
                                <div class="metric-label">
                                    <span>Attendance</span>
                                    <span>${subject.attendance.percentage}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill ${subject.attendance.percentage < 75 ? 'warning-fill' : 'good-fill'}" 
                                         style="width: ${Math.min(subject.attendance.percentage, 100)}%"></div>
                                </div>
                                <div class="attendance-details">
                                    <small>✅ Present: ${subject.attendance.present}</small>
                                    <small>⏰ Late: ${subject.attendance.late || 0}</small>
                                    <small>❌ Absent: ${(subject.attendance.total - subject.attendance.present)}</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="status-badge ${subject.attendance.percentage < 75 ? 'status-warning' : 'status-good'}">
                            <i class="fas ${subject.attendance.percentage < 75 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                            ${subject.status}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading performance:', error);
        const container = document.getElementById('performanceContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Failed to load performance data. Please refresh the page.</p>
                </div>
            `;
        }
    }
}

// Also add sessionStorage for department
document.addEventListener('DOMContentLoaded', () => {
    loadStudentInfo();
    loadPerformance();
    
    // Store department in sessionStorage after loading
    setTimeout(() => {
        const deptElement = document.getElementById('studentDept');
        if (deptElement) {
            const deptText = deptElement.innerText.replace('Department: ', '');
            sessionStorage.setItem('studentDept', deptText);
        }
    }, 1000);
});

// async function loadPerformance() {
//     try {
//         const response = await fetch('/api/student/performance');
//         if (response.status === 401) {
//             window.location.href = '/login';
//             return;
//         }
        
//         const subjects = await response.json();
//         const container = document.getElementById('performanceContainer');
        
//         if (!container) return;
        
//         if (subjects.length === 0) {
//             container.innerHTML = `
//                 <div class="loading">
//                     <i class="fas fa-info-circle"></i>
//                     <p>No subjects found for your department. Please contact your coordinator.</p>
//                 </div>
//             `;
//             return;
//         }
        
//         // Show department name
//         const studentDept = sessionStorage.getItem('studentDept') || 'your';
        
//         container.innerHTML = `
//             <div class="dept-banner">
//                 <i class="fas fa-graduation-cap"></i>
//                 <span>${studentDept} Department - Semester Subjects</span>
//             </div>
//             <div class="subjects-grid">
//                 ${subjects.map(subject => `
//                     <div class="subject-card ${subject.status_class}">
//                         <div class="subject-header">
//                             <span class="subject-code">${subject.subject_code}</span>
//                             <span class="subject-credits">${subject.credits} Credits</span>
//                         </div>
//                         <div class="subject-name">${subject.subject_name}</div>
                        
//                         <div class="performance-metrics">
//                             <div class="metric">
//                                 <div class="metric-label">
//                                     <span>Attendance</span>
//                                     <span>${subject.attendance.percentage}%</span>
//                                 </div>
//                                 <div class="progress-bar">
//                                     <div class="progress-fill ${subject.attendance.percentage < 75 ? 'warning-fill' : 'good-fill'}" 
//                                          style="width: ${Math.min(subject.attendance.percentage, 100)}%"></div>
//                                 </div>
//                                 <div class="attendance-details">
//                                     <small>✅ Present: ${subject.attendance.present}</small>
//                                     <small>⏰ Late: ${subject.attendance.late}</small>
//                                     <small>❌ Absent: ${subject.attendance.absent}</small>
//                                 </div>
//                             </div>
//                         </div>
                        
//                         <div class="status-badge ${subject.status_class}">
//                             <i class="fas ${subject.status_class === 'good' ? 'fa-check-circle' : (subject.status_class === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle')}"></i>
//                             ${subject.status}
//                         </div>
//                     </div>
//                 `).join('')}
//             </div>
//         `;
        
//     } catch (error) {
//         console.error('Error loading performance:', error);
//         const container = document.getElementById('performanceContainer');
//         if (container) {
//             container.innerHTML = `
//                 <div class="error-message">
//                     <i class="fas fa-exclamation-circle"></i>
//                     <p>Failed to load performance data. Please refresh the page.</p>
//                 </div>
//             `;
//         }
//     }
// }

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    loadStudentInfo();
    loadPerformance();
});

async function loadRecentAttendance(filter = 'all') {
    if (studentState.attendanceData.length === 0) await loadAttendanceData();
    let filtered = studentState.attendanceData.filter(r => r.student_id == studentState.studentId);
    if (filter === 'present') filtered = filtered.filter(r => r.status === 'present');
    else if (filter === 'absent') filtered = filtered.filter(r => r.status === 'absent');
    else if (filter === 'week') { const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); filtered = filtered.filter(r => new Date(r.date) >= weekAgo); }
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    studentState.totalRecords = filtered.length;
    const start = (studentState.currentPage - 1) * studentState.pageSize;
    const paginated = filtered.slice(start, start + studentState.pageSize);
    renderAttendanceTable(paginated);
    if (elements.recordCount) elements.recordCount.textContent = paginated.length;
}
function renderAttendanceTable(attendance) { if (!elements.attendanceTableBody) return; if (!attendance.length) { elements.attendanceTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;"><i class="fas fa-clipboard-list"></i><p>No attendance records</p></td></tr>`; return; } elements.attendanceTableBody.innerHTML = attendance.map(r => `<tr><td>${formatDate(r.date)}</td><td>Subject ${r.subject_id}</td><td>N/A</td><td class="${r.status === 'present' ? 'status-present' : 'status-absent'}"><i class="fas ${r.status === 'present' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${r.status === 'present' ? 'Present' : 'Absent'}</td><td>${r.remarks || '-'}</td></tr>`).join(''); }

async function loadNotifications() { const mock = [{ id: 1, title: 'Attendance Deadline', message: 'Mark attendance for CS101 by 5 PM', type: 'deadline', timestamp: new Date(Date.now() - 3600000).toISOString(), unread: true }]; studentState.notifications = mock; renderNotifications(); updateNotificationCount(); }
function renderNotifications() { if (!elements.notificationsList) return; if (!studentState.notifications.length) { elements.notificationsList.innerHTML = `<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>`; return; } elements.notificationsList.innerHTML = studentState.notifications.map(n => `<div class="notification-item ${n.unread ? 'unread' : ''}"><div class="notification-icon"><i class="fas fa-bell"></i></div><div class="notification-content"><h4>${n.title}</h4><p>${n.message}</p><small>${formatTimeAgo(n.timestamp)}</small></div></div>`).join(''); }
function updateNotificationCount() { if (!elements.notificationCount) return; const unread = studentState.notifications.filter(n => n.unread).length; elements.notificationCount.textContent = unread; elements.notificationCount.style.display = unread > 0 ? 'inline-block' : 'none'; }
async function loadImportantAlerts() { if (elements.importantAlerts) elements.importantAlerts.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>No important alerts</p></div>`; }

function initAttendanceChart() { if (!elements.attendanceChart) return; if (window.attendanceChartInstance) window.attendanceChartInstance.destroy(); const ctx = elements.attendanceChart.getContext('2d'); const weekly = getWeeklyAttendanceData(); window.attendanceChartInstance = new Chart(ctx, { type: 'line', data: { labels: weekly.labels, datasets: [{ label: 'Your Attendance %', data: weekly.yourAttendance, borderColor: STUDENT_CONFIG.chartColors.primary, backgroundColor: 'rgba(16,32,148,0.1)', fill: true, tension: 0.4 }, { label: 'Class Average', data: weekly.classAverage, borderColor: STUDENT_CONFIG.chartColors.secondary, borderDash: [5,5], fill: false }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 70, max: 100 } } } }); }
function getWeeklyAttendanceData() { const weeks = [], your = [], avg = []; const now = new Date(); for (let i = 5; i >= 0; i--) { const weekStart = new Date(now); weekStart.setDate(now.getDate() - (i * 7) - 7); const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7); weeks.push(`Week ${6 - i}`); const studentRecords = studentState.attendanceData.filter(r => r.student_id == studentState.studentId && new Date(r.date) >= weekStart && new Date(r.date) < weekEnd); const studentPresent = studentRecords.filter(r => r.status === 'present').length; your.push(studentRecords.length > 0 ? Math.round((studentPresent / studentRecords.length) * 100) : 0); const classRecords = studentState.attendanceData.filter(r => new Date(r.date) >= weekStart && new Date(r.date) < weekEnd); const studentMap = {}; classRecords.forEach(r => { if (!studentMap[r.student_id]) studentMap[r.student_id] = { total: 0, present: 0 }; studentMap[r.student_id].total++; if (r.status === 'present') studentMap[r.student_id].present++; }); const percents = Object.values(studentMap).map(s => s.total > 0 ? (s.present / s.total) * 100 : 0); avg.push(percents.length > 0 ? Math.round(percents.reduce((a,b) => a+b, 0) / percents.length) : 0); } return { labels: weeks, yourAttendance: your, classAverage: avg }; }

function updateSessionInfo() { if (elements.sessionInfo) { const now = new Date(); elements.sessionInfo.textContent = `Active • Last updated: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`; } }
function animateNumber(element, target, suffix = '') { let current = parseInt(element.textContent.replace(suffix, '')) || 0; const diff = target - current; const steps = 60; const inc = diff / steps; let val = current; const timer = setInterval(() => { val += inc; if ((inc > 0 && val >= target) || (inc < 0 && val <= target)) { element.textContent = target + suffix; clearInterval(timer); } else { element.textContent = Math.round(val) + suffix; } }, 1000 / steps); }
function formatDate(dateString) { return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatTimeAgo(dateString) { const date = new Date(dateString), now = new Date(), diff = Math.floor((now - date) / 1000); if (diff < 60) return 'Just now'; if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`; if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`; if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`; return date.toLocaleDateString(); }

function setupEventListeners() { const period = document.getElementById('overviewPeriod'); if (period) period.addEventListener('change', () => loadOverviewStatistics(period.value)); const filter = document.getElementById('attendanceFilter'); if (filter) filter.addEventListener('change', () => loadRecentAttendance(filter.value)); }
function setupAutoRefresh() { setInterval(() => { if (!document.hidden) refreshDashboard(); }, STUDENT_CONFIG.refreshInterval); }
function refreshDashboard() { if (studentState.isRefreshing) return; studentState.isRefreshing = true; updateSessionInfo(); loadAllData().finally(() => { studentState.isRefreshing = false; }); }
function highlightCurrentPage() { const currentPath = window.location.pathname; const navLinks = document.getElementById('nav-links'); if (navLinks) navLinks.querySelectorAll('a').forEach(link => { if (link.getAttribute('href') === currentPath) link.classList.add('active'); }); }
function showSuccessMessage(message) { showMessage(message, 'success'); }
function showErrorMessage(message) { showMessage(message, 'error'); }
function showMessage(message, type) { const div = document.createElement('div'); div.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'success' ? '#d1fae5' : '#fee2e2'};color:${type === 'success' ? '#065f46' : '#991b1b'};padding:15px;border-radius:10px;z-index:9999;max-width:300px;`; div.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`; document.body.appendChild(div); setTimeout(() => div.remove(), 5000); }

function viewDetailedReport() { window.location.href = '/report'; }
function downloadReport() { showInfoMessage('Report download coming soon!'); }
function markAllAsRead() { studentState.notifications.forEach(n => n.unread = false); renderNotifications(); updateNotificationCount(); fetch(`${STUDENT_CONFIG.apiBaseUrl}/student/notifications/mark-read`, { method: 'POST' }); showSuccessMessage('All marked as read'); }
function showInfoMessage(message) { const div = document.createElement('div'); div.style.cssText = `position:fixed;top:20px;right:20px;background:#dbeafe;color:#1e40af;padding:15px;border-radius:10px;z-index:9999;max-width:300px;`; div.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`; document.body.appendChild(div); setTimeout(() => div.remove(), 5000); }

document.addEventListener('DOMContentLoaded', initStudentDashboard);
window.viewDetailedReport = viewDetailedReport;
window.downloadReport = downloadReport;
window.markAllAsRead = markAllAsRead;
window.refreshDashboard = refreshDashboard;
// Add these functions to your existing student_dashboard.js

// Update the initAttendanceChart function to include chart stats
function initAttendanceChart() {
    if (!elements.attendanceChart) return;
    if (window.attendanceChartInstance) window.attendanceChartInstance.destroy();
    const ctx = elements.attendanceChart.getContext('2d');
    const weekly = getWeeklyAttendanceData();
    
    // Calculate chart stats
    const yourAvg = weekly.yourAttendance.reduce((a, b) => a + b, 0) / weekly.yourAttendance.length;
    const classAvg = weekly.classAverage.reduce((a, b) => a + b, 0) / weekly.classAverage.length;
    const diff = yourAvg - classAvg;
    
    document.getElementById('yourAvg').textContent = `${Math.round(yourAvg)}%`;
    document.getElementById('classAvg').textContent = `${Math.round(classAvg)}%`;
    document.getElementById('avgDiff').textContent = `${diff >= 0 ? '+' : ''}${Math.round(diff)}%`;
    document.getElementById('avgDiff').style.color = diff >= 0 ? '#10b981' : '#ef4444';
    
    window.attendanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekly.labels,
            datasets: [
                {
                    label: 'Your Attendance %',
                    data: weekly.yourAttendance,
                    borderColor: STUDENT_CONFIG.chartColors.primary,
                    backgroundColor: 'rgba(16,32,148,0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: STUDENT_CONFIG.chartColors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'Class Average',
                    data: weekly.classAverage,
                    borderColor: STUDENT_CONFIG.chartColors.secondary,
                    backgroundColor: 'rgba(56,189,248,0.05)',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: STUDENT_CONFIG.chartColors.secondary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(16,32,148,0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 70,
                    max: 100,
                    grid: { color: 'rgba(226,232,240,0.5)' },
                    ticks: { color: '#64748b', font: { size: 11 } },
                    title: {
                        display: true,
                        text: 'Attendance Percentage (%)',
                        color: '#64748b',
                        font: { size: 11, weight: 'bold' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11 } },
                    title: {
                        display: true,
                        text: 'Weeks',
                        color: '#64748b',
                        font: { size: 11, weight: 'bold' }
                    }
                }
            },
            interaction: { intersect: false, mode: 'index' },
            animations: {
                tension: { duration: 1000, easing: 'linear' }
            }
        }
    });
}

// Update loadMoreAttendance function
function loadMoreAttendance() {
    studentState.currentPage++;
    const filter = document.getElementById('attendanceFilter')?.value || 'all';
    loadRecentAttendance(filter);
}

// Update refreshSubjects function
function refreshSubjects() {
    loadSubjectPerformance();
    showSuccessMessage('Subject performance refreshed!');
}

// Update filterAttendance function
function filterAttendance() {
    const filter = document.getElementById('attendanceFilter')?.value || 'all';
    studentState.currentPage = 1;
    loadRecentAttendance(filter);
}

// Update updateOverview function
function updateOverview() {
    const period = document.getElementById('overviewPeriod')?.value || 'month';
    loadOverviewStatistics(period);
}

// Update days since last absent calculation
function updateDaysSinceLastAbsent() {
    const studentRecords = studentState.attendanceData
        .filter(r => r.student_id == studentState.studentId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let daysSince = 0;
    for (let i = 0; i < studentRecords.length; i++) {
        if (studentRecords[i].status === 'absent') break;
        daysSince++;
    }
    
    if (elements.daysSinceAbsent) elements.daysSinceAbsent.textContent = daysSince;
    
    // Update streak color
    if (daysSince >= 30) {
        elements.daysSinceAbsent.style.color = '#10b981';
    } else if (daysSince >= 14) {
        elements.daysSinceAbsent.style.color = '#f59e0b';
    } else {
        elements.daysSinceAbsent.style.color = '#ef4444';
    }
}

// Update the performance summary function
function updatePerformanceSummary() {
    if (elements.consistencyScore) {
        const consistency = studentState.currentAttendance || 85;
        elements.consistencyScore.textContent = `${Math.round(consistency)}%`;
    }
    
    if (elements.attendanceRanking) {
        // Calculate approximate ranking based on attendance
        const attendance = studentState.currentAttendance || 85;
        if (attendance >= 95) elements.attendanceRanking.textContent = 'Top 5%';
        else if (attendance >= 90) elements.attendanceRanking.textContent = 'Top 15%';
        else if (attendance >= 85) elements.attendanceRanking.textContent = 'Top 25%';
        else if (attendance >= 75) elements.attendanceRanking.textContent = 'Top 50%';
        else elements.attendanceRanking.textContent = 'Below Average';
    }
    
    updateDaysSinceLastAbsent();
}



// Update the loadAllData function to include days since absent
async function loadAllData() {
    await Promise.all([
        loadOverviewStatistics(),
        loadTodaysClasses(),
        loadSubjectPerformance(),
        loadRecentAttendance(),
        loadNotifications(),
        loadImportantAlerts()
    ]);
    initAttendanceChart();
    updateGoalsProgress();
    updatePerformanceSummary();
    updateDaysSinceLastAbsent();
}

// Update the renderAttendanceTable function to include better formatting
function renderAttendanceTable(attendance) {
    if (!elements.attendanceTableBody) return;
    if (!attendance.length) {
        elements.attendanceTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:40px;">
                    <i class="fas fa-clipboard-list" style="font-size:48px;margin-bottom:15px;opacity:0.5;"></i>
                    <p>No attendance records found</p>
                    <small>Try changing the filter or check back later</small>
                </td>
            </tr>
        `;
        return;
    }
    
    elements.attendanceTableBody.innerHTML = attendance.map(record => {
        const subject = reportData?.subjects?.find(s => s.subject_id == record.subject_id);
        const subjectName = subject ? subject.name : `Subject ${record.subject_id}`;
        const statusClass = record.status === 'present' ? 'status-present' : 
                           record.status === 'late' ? 'status-late' : 'status-absent';
        const statusIcon = record.status === 'present' ? 'fa-check-circle' : 
                          record.status === 'late' ? 'fa-clock' : 'fa-times-circle';
        const statusText = record.status === 'present' ? 'Present' : 
                          record.status === 'late' ? 'Late' : 'Absent';
        
        return `
            <tr>
                <td>${formatDate(record.date)}</td>
                <td>${subjectName}</td>
                <td>${record.time || 'N/A'}</td>
                <td class="${statusClass}">
                    <i class="fas ${statusIcon}"></i> ${statusText}
                </td>
                <td>${record.remarks || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Add late status to attendance status function
function updateAttendanceStatus(percent) {
    if (!elements.attendanceStatus) return;
    
    let status = 'Good', icon = 'fa-check-circle', color = '#10b981';
    if (percent >= STUDENT_CONFIG.attendanceThresholds.excellence) {
        status = 'Excellent';
        icon = 'fa-trophy';
        color = '#8b5cf6';
    } else if (percent >= STUDENT_CONFIG.attendanceThresholds.goodStanding) {
        status = 'Good';
        icon = 'fa-check-circle';
        color = '#10b981';
    } else if (percent >= STUDENT_CONFIG.attendanceThresholds.minRequirement) {
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
        <small style="margin-left: 10px; opacity: 0.8;">${percent}% overall</small>
    `;
}

 

// Add this function to student_dashboard.js
function goToSettings() {
    window.location.href = '/settings';
}

// Also add a settings button in your dashboard UI
// For example, in the header section:
function addSettingsButton() {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'settings-btn';
        settingsBtn.innerHTML = '<i class="fas fa-cog"></i> Settings';
        settingsBtn.onclick = goToSettings;
        headerActions.appendChild(settingsBtn);
    }
}

// code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
// end of the code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.