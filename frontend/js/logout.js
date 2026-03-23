// frontend/js/logout.js

// ================= CONFIGURATION =================
const LOGOUT_CONFIG = {
    redirectDelay: 10000,
    countdownInterval: 100,
    localStorageKeys: [
        'user_token',
        'loginSecurityState',
        'session_data',
        'temp_auth_data',
        'form_data',
        'loginSecurityState'
    ]
};

// ================= STATE MANAGEMENT =================
let logoutState = {
    countdownValue: 10,
    progressPercentage: 100,
    isRedirecting: false,
    hasSubmittedFeedback: false,
    rating: 0
};

// ================= DOM ELEMENTS =================
let elements = {
    countdown: null,
    progressBar: null,
    submitFeedback: null,
    totalSessions: null,
    stars: []
};

// ================= INITIALIZATION =================
function initLogoutPage() {
    console.log('Logout page initialized');
    
    cacheElements();
    
    // Clear all user data
    clearUserData();
    
    // Initialize countdown
    startCountdown();
    
    // Initialize feedback system
    initFeedbackSystem();
    
    // Update navigation
    updateNavigation();
    
    // Update auth area
    updateAuthArea();
    
    // Update statistics
    updateStatistics();
    
    // Highlight current page
    highlightCurrentPage();
}

function cacheElements() {
    elements.countdown = document.getElementById('countdown');
    elements.progressBar = document.getElementById('progressBar');
    elements.submitFeedback = document.getElementById('submitFeedback');
    elements.totalSessions = document.getElementById('totalSessions');
    elements.stars = document.querySelectorAll('.star');
}

// ================= DATA CLEARING =================
function clearUserData() {
    try {
        // Clear localStorage items
        LOGOUT_CONFIG.localStorageKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear cookies
        clearSessionCookies();
        
        console.log('User data cleared successfully');
        showDataClearedMessage();
        
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
}

function clearSessionCookies() {
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        if (!name.startsWith('essential_')) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        }
    });
}

function showDataClearedMessage() {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <div class="activity-icon">
            <i class="fas fa-database"></i>
        </div>
        <div class="activity-content">
            <p>Local data cleared</p>
            <small>Session data removed from browser</small>
        </div>
    `;
    activityList.appendChild(activityItem);
}

// ================= COUNTDOWN TIMER =================
function startCountdown() {
    if (!elements.countdown || !elements.progressBar) return;
    
    const totalTime = LOGOUT_CONFIG.redirectDelay;
    const interval = LOGOUT_CONFIG.countdownInterval;
    const steps = totalTime / interval;
    const decrement = 100 / steps;
    
    const countdownInterval = setInterval(() => {
        logoutState.countdownValue -= interval / 1000;
        logoutState.progressPercentage -= decrement;
        
        if (elements.countdown) {
            elements.countdown.textContent = Math.max(0, Math.ceil(logoutState.countdownValue));
        }
        
        if (elements.progressBar) {
            elements.progressBar.style.width = `${Math.max(0, logoutState.progressPercentage)}%`;
        }
        
        if (logoutState.countdownValue <= 0) {
            clearInterval(countdownInterval);
            redirectToHome();
        }
    }, interval);
    
    setupCountdownControls(countdownInterval);
}

function setupCountdownControls(interval) {
    const actionButtons = document.querySelectorAll('.action-buttons .btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            clearInterval(interval);
            
            const targetUrl = button.getAttribute('href');
            const logoutCard = document.querySelector('.logout-card');
            if (logoutCard) logoutCard.style.opacity = '0.9';
            
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 300);
        });
    });
}

function redirectToHome() {
    if (logoutState.isRedirecting) return;
    
    logoutState.isRedirecting = true;
    
    const logoutCard = document.querySelector('.logout-card');
    if (logoutCard) {
        logoutCard.style.transform = 'scale(0.95)';
        logoutCard.style.opacity = '0.8';
        logoutCard.style.transition = 'all 0.5s ease';
    }
    
    setTimeout(() => {
        window.location.href = '/';
    }, 500);
}

// ================= FEEDBACK SYSTEM =================
function initFeedbackSystem() {
    if (!elements.stars.length || !elements.submitFeedback) return;
    
    elements.stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.dataset.value);
            logoutState.rating = value;
            
            elements.stars.forEach((s, index) => {
                if (index < value) {
                    s.innerHTML = '<i class="fas fa-star"></i>';
                    s.classList.add('active');
                } else {
                    s.innerHTML = '<i class="far fa-star"></i>';
                    s.classList.remove('active');
                }
            });
            
            elements.submitFeedback.disabled = false;
        });
        
        star.addEventListener('mouseover', () => {
            const value = parseInt(star.dataset.value);
            elements.stars.forEach((s, index) => {
                if (index < value) {
                    s.innerHTML = '<i class="fas fa-star"></i>';
                }
            });
        });
        
        star.addEventListener('mouseout', () => {
            elements.stars.forEach((s, index) => {
                if (!s.classList.contains('active')) {
                    s.innerHTML = '<i class="far fa-star"></i>';
                }
            });
        });
    });
    
    elements.submitFeedback.addEventListener('click', submitFeedback);
}

async function submitFeedback() {
    if (logoutState.hasSubmittedFeedback) return;
    
    const feedbackData = {
        rating: logoutState.rating,
        timestamp: new Date().toISOString(),
        page: 'logout',
        userAgent: navigator.userAgent
    };
    
    try {
        elements.submitFeedback.disabled = true;
        elements.submitFeedback.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        showFeedbackSuccess();
        logoutState.hasSubmittedFeedback = true;
        
        localStorage.setItem('logout_feedback', JSON.stringify(feedbackData));
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showFeedbackError();
    }
}

function showFeedbackSuccess() {
    if (elements.submitFeedback) {
        elements.submitFeedback.innerHTML = '<i class="fas fa-check"></i> Thank You!';
        elements.submitFeedback.style.background = 'linear-gradient(135deg, #10b981 0%, #0da271 100%)';
    }
    
    const feedbackSection = document.querySelector('.feedback-section');
    if (!feedbackSection) return;
    
    const successMessage = document.createElement('div');
    successMessage.className = 'feedback-success';
    successMessage.innerHTML = `
        <div style="background: #d1fae5; color: #065f46; padding: 10px; border-radius: 8px; margin-top: 10px; text-align: center;">
            <i class="fas fa-check-circle"></i> Feedback submitted successfully!
        </div>
    `;
    feedbackSection.appendChild(successMessage);
    
    const rating = document.querySelector('.rating');
    if (rating) rating.style.opacity = '0.5';
}

function showFeedbackError() {
    if (elements.submitFeedback) {
        elements.submitFeedback.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Try Again';
        elements.submitFeedback.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        
        setTimeout(() => {
            elements.submitFeedback.disabled = false;
            elements.submitFeedback.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
            elements.submitFeedback.style.background = 'linear-gradient(135deg, #10b981 0%, #0da271 100%)';
        }, 2000);
    }
}

// ================= STATISTICS =================
function updateStatistics() {
    if (!elements.totalSessions) return;
    
    const today = new Date().toDateString();
    let sessionData = JSON.parse(localStorage.getItem('session_statistics') || '{}');
    
    if (!sessionData[today]) {
        sessionData[today] = { count: 1, lastLogout: new Date().toISOString() };
    } else {
        sessionData[today].count++;
        sessionData[today].lastLogout = new Date().toISOString();
    }
    
    localStorage.setItem('session_statistics', JSON.stringify(sessionData));
    
    elements.totalSessions.textContent = sessionData[today].count;
    animateNumber(elements.totalSessions, sessionData[today].count);
}

function animateNumber(element, target) {
    let current = 0;
    const increment = target / 20;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 50);
}

// ================= NAVIGATION HELPERS =================
function updateNavigation() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    navLinks.innerHTML = `
        <a href="/">Home</a>
        <a href="/about">About Us</a>
        <a href="/login.html">Login</a>
        <a href="/signup.html">Sign Up</a>
    `;
}

function updateAuthArea() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    
    authArea.innerHTML = `
        <a href="/login.html" class="nav-btn">Sign In</a>
        <a href="/signup.html" class="nav-btn signup">Sign Up</a>
    `;
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
// Add these improvements to logout.js

// Enhanced clearUserData with more thorough cleanup
function clearUserData() {
    try {
        // Clear localStorage items
        LOGOUT_CONFIG.localStorageKeys.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Clear any attendance drafts
        localStorage.removeItem('attendance_draft');
        localStorage.removeItem('notification_preferences');
        localStorage.removeItem('appearance_preferences');
        localStorage.removeItem('privacy_settings');
        localStorage.removeItem('goal_settings');
        localStorage.removeItem('teaching_settings');
        localStorage.removeItem('academic_settings');
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear cookies
        clearSessionCookies();
        
        // Clear IndexedDB if exists
        clearIndexedDB();
        
        // Clear service worker caches if exists
        clearCaches();
        
        console.log('User data cleared successfully');
        showDataClearedMessage();
        
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
}

// Clear IndexedDB databases
function clearIndexedDB() {
    if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
            databases.forEach(db => {
                if (db.name && (db.name.includes('attendance') || db.name.includes('user_'))) {
                    indexedDB.deleteDatabase(db.name);
                }
            });
        }).catch(err => console.warn('IndexedDB cleanup skipped:', err));
    }
}

// Clear service worker caches
function clearCaches() {
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                if (cacheName.includes('attendance-') || cacheName.includes('user-')) {
                    caches.delete(cacheName);
                }
            });
        }).catch(err => console.warn('Cache cleanup skipped:', err));
    }
}

// Enhanced showFeedbackSuccess with better animation
function showFeedbackSuccess() {
    if (elements.submitFeedback) {
        elements.submitFeedback.innerHTML = '<i class="fas fa-check"></i> Thank You!';
        elements.submitFeedback.style.background = 'linear-gradient(135deg, #10b981 0%, #0da271 100%)';
    }
    
    const feedbackSection = document.querySelector('.feedback-section');
    if (!feedbackSection) return;
    
    // Remove any existing success message
    const existingMessage = feedbackSection.querySelector('.feedback-success');
    if (existingMessage) existingMessage.remove();
    
    const successMessage = document.createElement('div');
    successMessage.className = 'feedback-success';
    successMessage.innerHTML = `
        <div style="background: #d1fae5; color: #065f46; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center; border-left: 4px solid #10b981;">
            <i class="fas fa-check-circle"></i> Feedback submitted successfully! Thank you for helping us improve.
        </div>
    `;
    feedbackSection.appendChild(successMessage);
    
    const rating = document.querySelector('.rating');
    if (rating) rating.style.opacity = '0.6';
    
    // Animate the success message
    successMessage.style.animation = 'slideDown 0.5s ease-out';
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successMessage.parentNode) successMessage.remove();
    }, 5000);
}

// Enhanced showFeedbackError
function showFeedbackError() {
    if (elements.submitFeedback) {
        elements.submitFeedback.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Try Again';
        elements.submitFeedback.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        
        setTimeout(() => {
            elements.submitFeedback.disabled = false;
            elements.submitFeedback.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
            elements.submitFeedback.style.background = 'linear-gradient(135deg, #10b981 0%, #0da271 100%)';
        }, 2000);
    }
    
    // Show error message
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'feedback-error';
        errorMessage.innerHTML = `
            <div style="background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center; border-left: 4px solid #ef4444;">
                <i class="fas fa-exclamation-circle"></i> Failed to submit feedback. Please try again.
            </div>
        `;
        feedbackSection.appendChild(errorMessage);
        setTimeout(() => errorMessage.remove(), 3000);
    }
}

// Enhanced updateStatistics with real data simulation
function updateStatistics() {
    if (!elements.totalSessions) return;
    
    const today = new Date().toDateString();
    let sessionData = JSON.parse(localStorage.getItem('session_statistics') || '{}');
    
    if (!sessionData[today]) {
        sessionData[today] = { count: 1, lastLogout: new Date().toISOString() };
    } else {
        sessionData[today].count++;
        sessionData[today].lastLogout = new Date().toISOString();
    }
    
    localStorage.setItem('session_statistics', JSON.stringify(sessionData));
    
    animateNumber(elements.totalSessions, sessionData[today].count);
}

// Enhanced animateNumber with easing
function animateNumber(element, target) {
    let current = 0;
    const duration = 1000;
    const steps = 60;
    const increment = target / steps;
    let startTime = null;
    
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    function update(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeOutCubic(progress);
        const value = Math.floor(target * easedProgress);
        
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }
    
    requestAnimationFrame(update);
}

// Add keyboard navigation for stars
function setupStarKeyboardNavigation() {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        star.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextStar = stars[index + 1];
                if (nextStar) nextStar.focus();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevStar = stars[index - 1];
                if (prevStar) prevStar.focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                star.click();
            }
        });
    });
}

// Add screen reader announcements
function announce(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.classList.add('sr-only');
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
}

// Update initLogoutPage to include new features
function initLogoutPage() {
    console.log('Logout page initialized');
    
    cacheElements();
    clearUserData();
    startCountdown();
    initFeedbackSystem();
    updateNavigation();
    updateAuthArea();
    updateStatistics();
    highlightCurrentPage();
    setupStarKeyboardNavigation();
    
    // Announce to screen readers
    setTimeout(() => announce('You have been successfully logged out. Redirecting to home page in 10 seconds.'), 1000);
}

// Add sr-only class if not exists
const srStyle = document.createElement('style');
srStyle.textContent = `
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
`;
document.head.appendChild(srStyle);

// ================= INITIALIZE ON LOAD =================
document.addEventListener('DOMContentLoaded', initLogoutPage);

// Make functions available globally
window.clearUserData = clearUserData;
window.submitFeedback = submitFeedback;