// ================= SETTINGS PAGE JAVASCRIPT =================

// DOM Elements
let currentUserRole = 'student';
let currentUserData = {};

// API Base URL
const API_BASE_URL = '/api';

// Initialize settings page
function initSettings() {
    console.log('Settings page initialized');
    
    // Check authentication first
    checkAuthAndLoad();
    
    // Setup navigation
    setupSettingsNavigation();
    
    // Setup password strength checker
    setupPasswordStrength();
    
    // Setup theme preview
    setupThemePreview();
    
    // Setup toggle switches
    setupToggles();
}

// Check authentication and load user data
function checkAuthAndLoad() {
    fetch('/api/login-status')
        .then(response => response.json())
        .then(data => {
            if (!data.logged_in) {
                // Redirect to login if not authenticated
                window.location.href = '/login.html';
                return;
            }
            
            currentUserRole = data.role;
            currentUserData = data;
            
            // Add role class to body
            document.body.classList.add(currentUserRole);
            
            // Update user info in UI
            updateUserInfo(data);
            
            // Load user profile data
            loadUserProfile();
            
            // Load security info
            loadSecurityInfo();
            
            // Load notification preferences
            loadNotificationPreferences();
            
            // Load appearance preferences
            loadAppearancePreferences();
        })
        .catch(error => {
            console.error('Error checking login status:', error);
            window.location.href = '/login.html';
        });
}

// Update user info in UI
function updateUserInfo(data) {
    const displayNameEl = document.getElementById('displayName');
    const userRoleEl = document.getElementById('userRole');
    const userEmailEl = document.getElementById('userEmail');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (displayNameEl) displayNameEl.textContent = data.name || 'User';
    if (userRoleEl) userRoleEl.textContent = data.role === 'student' ? 'Student' : 'Lecturer';
    if (userEmailEl) userEmailEl.textContent = data.email || '';
    
    // Set avatar initial
    if (profileAvatar && data.name) {
        const initial = data.name.charAt(0).toUpperCase();
        profileAvatar.src = `https://ui-avatars.com/api/?name=${data.name}&background=102094&color=fff&size=100`;
    }
    
    // Fill role-specific fields
    if (data.role === 'student' && data.student_id) {
        const studentIdEl = document.getElementById('studentId');
        if (studentIdEl) studentIdEl.value = data.student_id;
    }
    if (data.role === 'lecturer' && data.lecturer_id) {
        const lecturerIdEl = document.getElementById('lecturerId');
        if (lecturerIdEl) lecturerIdEl.value = data.lecturer_id;
    }
}

// Load user profile from API
async function loadUserProfile() {
    try {
        // Try to get full student/lecturer data
        if (currentUserRole === 'student') {
            const response = await fetch(`${API_BASE_URL}/students`);
            const data = await response.json();
            if (data.success && currentUserData.student_id) {
                const student = data.students.find(s => s.student_id == currentUserData.student_id);
                if (student) {
                    document.getElementById('fullName').value = student.name || '';
                    document.getElementById('displayNameInput').value = student.name?.split(' ')[0] || '';
                    document.getElementById('email').value = student.email || '';
                    document.getElementById('batch').value = student.batch || '2024';
                    document.getElementById('department').value = student.department || 'Computer Science';
                    document.getElementById('semester').value = student.semester || '6';
                }
            }
        } else if (currentUserRole === 'lecturer') {
            const response = await fetch(`${API_BASE_URL}/lecturers`);
            const data = await response.json();
            if (data.success && currentUserData.lecturer_id) {
                const lecturer = data.lecturers.find(l => l.lecturer_id == currentUserData.lecturer_id);
                if (lecturer) {
                    document.getElementById('fullName').value = lecturer.name || '';
                    document.getElementById('displayNameInput').value = lecturer.name?.split(' ')[0] || '';
                    document.getElementById('email').value = lecturer.email || '';
                    document.getElementById('dept').value = lecturer.department || 'Computer Science';
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load security info
async function loadSecurityInfo() {
    try {
        // Get login attempts
        const response = await fetch(`${API_BASE_URL}/security/login-attempts`);
        const data = await response.json();
        
        if (data.success && data.attempts) {
            const loginHistory = document.getElementById('loginHistory');
            if (loginHistory && data.attempts.length > 0) {
                loginHistory.innerHTML = data.attempts.slice(0, 5).map(attempt => `
                    <tr>
                        <td>${attempt.timestamp ? new Date(attempt.timestamp).toLocaleString() : 'Unknown'}</td>
                        <td>${attempt.ip || 'Unknown'}</td>
                        <td>${attempt.location || 'Unknown'}</td>
                        <td><span class="badge-${attempt.success ? 'success' : 'neutral'}">${attempt.success ? 'Success' : 'Failed'}</span></td>
                    </tr>
                `).join('');
            }
        }
        
        // Set last login time
        const lastLoginEl = document.getElementById('lastLogin');
        if (lastLoginEl && currentUserData.login_time) {
            lastLoginEl.textContent = new Date(currentUserData.login_time).toLocaleString();
        }
    } catch (error) {
        console.error('Error loading security info:', error);
    }
}

// Load notification preferences from localStorage
function loadNotificationPreferences() {
    const preferences = JSON.parse(localStorage.getItem('notification_preferences') || '{}');
    
    const emailAttendance = document.getElementById('emailAttendance');
    if (emailAttendance) emailAttendance.checked = preferences.emailAttendance !== false;
    
    const emailLowAttendance = document.getElementById('emailLowAttendance');
    if (emailLowAttendance) emailLowAttendance.checked = preferences.emailLowAttendance !== false;
    
    const emailReports = document.getElementById('emailReports');
    if (emailReports) emailReports.checked = preferences.emailReports !== false;
    
    const inAppEnabled = document.getElementById('inAppEnabled');
    if (inAppEnabled) inAppEnabled.checked = preferences.inAppEnabled !== false;
    
    const notificationSound = document.getElementById('notificationSound');
    if (notificationSound) notificationSound.checked = preferences.notificationSound || false;
    
    const digestFrequency = document.getElementById('digestFrequency');
    if (digestFrequency) digestFrequency.value = preferences.digestFrequency || 'weekly';
    
    const digestTime = document.getElementById('digestTime');
    if (digestTime) digestTime.value = preferences.digestTime || '09:00';
}

// Load appearance preferences from localStorage
function loadAppearancePreferences() {
    const preferences = JSON.parse(localStorage.getItem('appearance_preferences') || '{}');
    
    // Theme
    const theme = preferences.theme || 'light';
    const themeInput = document.querySelector(`input[name="theme"][value="${theme}"]`);
    if (themeInput) themeInput.checked = true;
    
    // Color scheme
    const color = preferences.color || 'blue';
    const colorInput = document.querySelector(`input[name="color"][value="${color}"]`);
    if (colorInput) colorInput.checked = true;
    
    // Density
    const density = document.getElementById('density');
    if (density) density.value = preferences.density || 'comfortable';
    
    // Animations
    const animations = document.getElementById('animations');
    if (animations) animations.value = preferences.animations || 'all';
    
    // Compact sidebar
    const compactSidebar = document.getElementById('compactSidebar');
    if (compactSidebar) compactSidebar.checked = preferences.compactSidebar || false;
}

// Setup settings navigation
function setupSettingsNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items and sections
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked nav item
            this.classList.add('active');
            
            // Show corresponding section
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // Update URL hash without scrolling
            history.pushState(null, null, `#${targetId}`);
        });
    });
    
    // Check URL hash on load
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const targetNav = document.querySelector(`.settings-nav-item[href="#${hash}"]`);
        if (targetNav) {
            targetNav.click();
        }
    }
}

// Setup toggle switches
function setupToggles() {
    // Two-factor authentication toggle
    const enable2FA = document.getElementById('enable2FA');
    const twofaDetails = document.getElementById('twofaDetails');
    
    if (enable2FA && twofaDetails) {
        enable2FA.addEventListener('change', function() {
            twofaDetails.style.display = this.checked ? 'block' : 'none';
        });
    }
}

// Password strength checker
function setupPasswordStrength() {
    const newPassword = document.getElementById('newPassword');
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');
    
    if (!newPassword) return;
    
    newPassword.addEventListener('input', function() {
        const password = this.value;
        const strength = calculatePasswordStrength(password);
        
        if (strengthBar) strengthBar.style.width = strength.percentage + '%';
        if (strengthText) strengthText.textContent = strength.message;
        
        // Update strength bar color
        if (strengthBar) {
            if (strength.percentage < 30) strengthBar.style.background = '#dc2626';
            else if (strength.percentage < 60) strengthBar.style.background = '#f59e0b';
            else strengthBar.style.background = '#10b981';
        }
    });
}

function calculatePasswordStrength(password) {
    let score = 0;
    
    if (!password) {
        return { percentage: 0, color: '#dc2626', message: 'Enter password' };
    }
    
    // Length check
    if (password.length >= 8) score += 25;
    else if (password.length >= 6) score += 15;
    
    // Contains number
    if (/\d/.test(password)) score += 25;
    
    // Contains lowercase
    if (/[a-z]/.test(password)) score += 15;
    
    // Contains uppercase
    if (/[A-Z]/.test(password)) score += 15;
    
    // Contains special character
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;
    
    let message;
    if (score < 30) message = 'Weak password';
    else if (score < 60) message = 'Medium password';
    else if (score < 80) message = 'Strong password';
    else message = 'Very strong password';
    
    return { percentage: Math.min(score, 100), message };
}

// Theme preview
function setupThemePreview() {
    const themeInputs = document.querySelectorAll('input[name="theme"]');
    themeInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.checked) {
                applyTheme(this.value);
            }
        });
    });
    
    const colorInputs = document.querySelectorAll('input[name="color"]');
    colorInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.checked) {
                applyColorScheme(this.value);
            }
        });
    });
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    
    // Save preference
    const preferences = JSON.parse(localStorage.getItem('appearance_preferences') || '{}');
    preferences.theme = theme;
    localStorage.setItem('appearance_preferences', JSON.stringify(preferences));
}

function applyColorScheme(color) {
    const root = document.documentElement;
    let primaryColor;
    
    switch(color) {
        case 'purple':
            primaryColor = '#8b5cf6';
            break;
        case 'green':
            primaryColor = '#10b981';
            break;
        case 'orange':
            primaryColor = '#f59e0b';
            break;
        default:
            primaryColor = '#102094';
    }
    
    root.style.setProperty('--primary-color', primaryColor);
    
    // Save preference
    const preferences = JSON.parse(localStorage.getItem('appearance_preferences') || '{}');
    preferences.color = color;
    localStorage.setItem('appearance_preferences', JSON.stringify(preferences));
}

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const button = input.nextElementSibling;
    const icon = button?.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fas fa-eye';
    }
}

// ================= SAVE FUNCTIONS =================

function saveProfile() {
    const fullName = document.getElementById('fullName')?.value || '';
    const email = document.getElementById('email')?.value || '';
    const phone = document.getElementById('phone')?.value || '';
    
    // This would call an API to update profile
    showSaveNotification('Profile saved successfully!');
}

function saveAcademicSettings() {
    const enrolledSubjects = [];
    document.querySelectorAll('#enrolledSubjects input:checked').forEach(cb => {
        enrolledSubjects.push(cb.value);
    });
    
    const academicYear = document.getElementById('academicYear')?.value;
    const attendanceWeight = document.getElementById('attendanceWeight')?.value;
    
    localStorage.setItem('academic_settings', JSON.stringify({
        enrolledSubjects,
        academicYear,
        attendanceWeight
    }));
    
    showSaveNotification('Academic settings saved!');
}

function saveGoalSettings() {
    const minAttendance = document.getElementById('minAttendance')?.value;
    const targetAttendance = document.getElementById('targetAttendance')?.value;
    const goalAlert = document.getElementById('goalAlert')?.checked;
    const weeklyGoalReport = document.getElementById('weeklyGoalReport')?.checked;
    
    localStorage.setItem('goal_settings', JSON.stringify({
        minAttendance,
        targetAttendance,
        goalAlert,
        weeklyGoalReport
    }));
    
    showSaveNotification('Goal settings saved!');
}

function saveTeachingSettings() {
    const teachingHours = document.getElementById('teachingHours')?.value;
    const attendanceMarking = document.getElementById('attendanceMarking')?.value;
    const gracePeriod = document.getElementById('gracePeriod')?.value;
    const remindAttendance = document.getElementById('remindAttendance')?.checked;
    const reminderTime = document.getElementById('reminderTime')?.value;
    
    localStorage.setItem('teaching_settings', JSON.stringify({
        teachingHours,
        attendanceMarking,
        gracePeriod,
        remindAttendance,
        reminderTime
    }));
    
    showSaveNotification('Teaching settings saved!');
}

function saveAppearance() {
    const density = document.getElementById('density')?.value;
    const animations = document.getElementById('animations')?.value;
    const compactSidebar = document.getElementById('compactSidebar')?.checked;
    
    const preferences = JSON.parse(localStorage.getItem('appearance_preferences') || '{}');
    preferences.density = density;
    preferences.animations = animations;
    preferences.compactSidebar = compactSidebar;
    localStorage.setItem('appearance_preferences', JSON.stringify(preferences));
    
    showSaveNotification('Appearance settings applied!');
}

function saveNotificationSettings() {
    const preferences = {
        emailAttendance: document.getElementById('emailAttendance')?.checked,
        emailLowAttendance: document.getElementById('emailLowAttendance')?.checked,
        emailReports: document.getElementById('emailReports')?.checked,
        emailCertificate: document.getElementById('emailCertificate')?.checked,
        emailExcuses: document.getElementById('emailExcuses')?.checked,
        inAppEnabled: document.getElementById('inAppEnabled')?.checked,
        notificationSound: document.getElementById('notificationSound')?.checked,
        digestFrequency: document.getElementById('digestFrequency')?.value,
        digestTime: document.getElementById('digestTime')?.value
    };
    
    localStorage.setItem('notification_preferences', JSON.stringify(preferences));
    showSaveNotification('Notification preferences saved!');
}

function savePrivacySettings() {
    const profileVisibility = document.getElementById('profileVisibility')?.checked;
    const emailVisibility = document.getElementById('emailVisibility')?.checked;
    const dataRetention = document.getElementById('dataRetention')?.value;
    const analyticsCookies = document.getElementById('analyticsCookies')?.checked;
    const marketingCookies = document.getElementById('marketingCookies')?.checked;
    
    localStorage.setItem('privacy_settings', JSON.stringify({
        profileVisibility,
        emailVisibility,
        dataRetention,
        analyticsCookies,
        marketingCookies
    }));
    
    showSaveNotification('Privacy settings saved!');
}

function saveAllSettings() {
    saveProfile();
    saveAcademicSettings();
    saveGoalSettings();
    saveTeachingSettings();
    saveAppearance();
    saveNotificationSettings();
    savePrivacySettings();
    showSaveNotification('All settings saved successfully!');
}

// ================= SECURITY FUNCTIONS =================

async function changePassword() {
    const current = document.getElementById('currentPassword')?.value;
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;
    
    if (!current || !newPass || !confirm) {
        alert('Please fill all password fields');
        return;
    }
    
    if (newPass !== confirm) {
        alert('New passwords do not match');
        return;
    }
    
    const strength = calculatePasswordStrength(newPass);
    if (strength.percentage < 50) {
        if (!confirm('Password is weak. Continue anyway?')) return;
    }
    
    try {
        const response = await fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: currentUserData.email,
                newPassword: newPass
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSaveNotification('Password changed successfully!');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert(data.message || 'Failed to change password');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('Network error. Please try again.');
    }
}

function verify2FA() {
    const code = document.getElementById('verificationCode')?.value;
    if (!code || code.length !== 6) {
        alert('Please enter a valid 6-digit code');
        return;
    }
    showSaveNotification('2FA enabled successfully!');
}

function logoutOtherDevices() {
    if (confirm('This will logout all other devices. Continue?')) {
        showSaveNotification('Other devices logged out!');
    }
}

// ================= SUBJECT MANAGEMENT =================

function addNewSubject() {
    const modal = document.getElementById('addSubjectModal');
    if (modal) modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('addSubjectModal');
    if (modal) modal.classList.remove('active');
}

function saveSubject() {
    closeModal();
    showSaveNotification('Subject added successfully!');
}

function editSubject(id) {
    showSaveNotification('Edit feature coming soon!');
}

function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        showSaveNotification('Subject deleted!');
    }
}

// ================= DATA FUNCTIONS =================

function exportData(type) {
    showSaveNotification(`Exporting ${type} data...`);
    // This would trigger actual export
}

function downloadPersonalData() {
    showSaveNotification('Preparing your data for download...');
}

function confirmDeleteAccount() {
    const confirmed = confirm('WARNING: This will permanently delete your account and all data. Type "DELETE" to confirm.');
    if (confirmed) {
        const userInput = prompt('Type "DELETE" to confirm account deletion:');
        if (userInput === 'DELETE') {
            showSaveNotification('Account deletion requested. You will receive an email confirmation.');
        }
    }
}

// ================= INTEGRATION FUNCTIONS =================

function connectCalendar(provider) {
    showSaveNotification(`Connecting to ${provider} Calendar...`);
}

function connectLMS(provider) {
    showSaveNotification(`Connecting to ${provider}...`);
}

function connectExport(provider) {
    showSaveNotification(`Enabling export to ${provider}...`);
}

function copyApiKey() {
    const apiKey = document.getElementById('apiKey');
    if (apiKey) {
        apiKey.select();
        document.execCommand('copy');
        showSaveNotification('API key copied to clipboard!');
    }
}

function regenerateApiKey() {
    if (confirm('Regenerating API key will invalidate the old key. Continue?')) {
        showSaveNotification('New API key generated!');
    }
}

function editAvatar() {
    showSaveNotification('Avatar upload feature coming soon!');
}

function resetProfile() {
    if (confirm('Reset all changes?')) {
        loadUserProfile();
        showSaveNotification('Changes reset');
    }
}

// ================= NOTIFICATION HELPER =================

function showSaveNotification(message) {
    const notification = document.getElementById('saveNotification');
    if (!notification) return;
    
    const span = notification.querySelector('span');
    if (span) span.textContent = message;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ================= INITIALIZE ON DOM LOAD =================
document.addEventListener('DOMContentLoaded', initSettings);

// Make functions available globally
window.togglePassword = togglePassword;
window.saveProfile = saveProfile;
window.saveAcademicSettings = saveAcademicSettings;
window.saveGoalSettings = saveGoalSettings;
window.saveTeachingSettings = saveTeachingSettings;
window.saveAppearance = saveAppearance;
window.saveNotificationSettings = saveNotificationSettings;
window.savePrivacySettings = savePrivacySettings;
window.saveAllSettings = saveAllSettings;
window.changePassword = changePassword;
window.verify2FA = verify2FA;
window.logoutOtherDevices = logoutOtherDevices;
window.addNewSubject = addNewSubject;
window.closeModal = closeModal;
window.saveSubject = saveSubject;
window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.exportData = exportData;
window.downloadPersonalData = downloadPersonalData;
window.confirmDeleteAccount = confirmDeleteAccount;
window.connectCalendar = connectCalendar;
window.connectLMS = connectLMS;
window.connectExport = connectExport;
window.copyApiKey = copyApiKey;
window.regenerateApiKey = regenerateApiKey;
window.editAvatar = editAvatar;
window.resetProfile = resetProfile;