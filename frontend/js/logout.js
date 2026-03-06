// frontend/js/logout.js

// ================= CONFIGURATION =================
const LOGOUT_CONFIG = {
    redirectDelay: 10000, // 10 seconds
    countdownInterval: 100, // Update every 100ms for smoother progress
    localStorageKeys: [
        'user_token',
        'login_security_state',
        'session_data',
        'temp_auth_data',
        'form_data'
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
const elements = {
    countdown: document.getElementById('countdown'),
    progressBar: document.getElementById('progressBar'),
    submitFeedback: document.getElementById('submitFeedback'),
    totalSessions: document.getElementById('totalSessions'),
    stars: document.querySelectorAll('.star')
};

// ================= INITIALIZATION =================
function initLogoutPage() {
    console.log('Logout page initialized');
    
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
    
    // Update statistics (mock data for now)
    updateStatistics();
    
    // Highlight current page
    highlightCurrentPage();
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
        
        // Clear cookies (except essential ones)
        clearSessionCookies();
        
        // Clear any temporary data
        clearTemporaryData();
        
        console.log('User data cleared successfully');
        
        // Show success message in console
        showDataClearedMessage();
        
    } catch (error) {
        console.error('Error clearing user data:', error);
    }
}

function clearSessionCookies() {
    // Clear cookies by setting expiration to past
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // Don't clear essential cookies (e.g., those starting with 'essential_')
        if (!name.startsWith('essential_')) {
            document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        }
    });
}

function clearTemporaryData() {
    // Clear any indexedDB or other storage
    if ('indexedDB' in window && 'databases' in indexedDB) {
        indexedDB.databases().then(databases => {
            databases.forEach(db => {
                if (db.name && (db.name.includes('temp_') || db.name.includes('user_'))) {
                    indexedDB.deleteDatabase(db.name);
                }
            });
        }).catch(err => console.warn('IndexedDB cleanup skipped:', err));
    }
    
    // Clear service worker caches if exists
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                if (cacheName.includes('user-') || cacheName.includes('auth-')) {
                    caches.delete(cacheName);
                }
            });
        }).catch(err => console.warn('Cache cleanup skipped:', err));
    }
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
        
        // Update display
        if (elements.countdown) {
            elements.countdown.textContent = Math.max(0, Math.ceil(logoutState.countdownValue));
        }
        
        if (elements.progressBar) {
            elements.progressBar.style.width = `${Math.max(0, logoutState.progressPercentage)}%`;
        }
        
        // Redirect when countdown reaches 0
        if (logoutState.countdownValue <= 0) {
            clearInterval(countdownInterval);
            redirectToHome();
        }
    }, interval);
    
    // Add cancel functionality
    setupCountdownControls(countdownInterval);
}

function setupCountdownControls(interval) {
    const actionButtons = document.querySelectorAll('.action-buttons .btn');
    actionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Clear the countdown
            clearInterval(interval);
            
            // Get the target URL
            const targetUrl = button.getAttribute('href');
            
            // Add a smooth transition
            document.querySelector('.logout-card').style.opacity = '0.9';
            
            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 300);
        });
    });
}

function redirectToHome() {
    if (logoutState.isRedirecting) return;
    
    logoutState.isRedirecting = true;
    
    // Add exit animation
    const logoutCard = document.querySelector('.logout-card');
    if (logoutCard) {
        logoutCard.style.transform = 'scale(0.95)';
        logoutCard.style.opacity = '0.8';
        logoutCard.style.transition = 'all 0.5s ease';
    }
    
    // Redirect after animation
    setTimeout(() => {
        window.location.href = '/';
    }, 500);
}

// ================= FEEDBACK SYSTEM =================
function initFeedbackSystem() {
    if (!elements.stars.length || !elements.submitFeedback) return;
    
    // Star rating
    elements.stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.dataset.value);
            logoutState.rating = value;
            
            // Update star display
            elements.stars.forEach((s, index) => {
                if (index < value) {
                    s.innerHTML = '<i class="fas fa-star"></i>';
                    s.classList.add('active');
                } else {
                    s.innerHTML = '<i class="far fa-star"></i>';
                    s.classList.remove('active');
                }
            });
            
            // Enable submit button
            elements.submitFeedback.disabled = false;
        });
        
        // Hover effect
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
    
    // Submit feedback
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
        
        // Simulate API call (replace with actual endpoint if needed)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Show success message
        showFeedbackSuccess();
        
        logoutState.hasSubmittedFeedback = true;
        
        // Store feedback locally
        localStorage.setItem('logout_feedback', JSON.stringify(feedbackData));
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showFeedbackError();
    }
}

function showFeedbackSuccess() {
    elements.submitFeedback.innerHTML = '<i class="fas fa-check"></i> Thank You!';
    elements.submitFeedback.style.background = 'linear-gradient(135deg, #10b981 0%, #0da271 100%)';
    
    // Show success message
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
    
    // Hide stars
    const rating = document.querySelector('.rating');
    if (rating) rating.style.opacity = '0.5';
}

function showFeedbackError() {
    elements.submitFeedback.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Try Again';
    elements.submitFeedback.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    
    setTimeout(() => {
        elements.submitFeedback.disabled = false;
        elements.submitFeedback.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
        elements.submitFeedback.style.background = 'linear-gradient(135deg, #10b981 0%, #0da271 100%)';
    }, 2000);
}

// ================= STATISTICS =================
function updateStatistics() {
    if (!elements.totalSessions) return;
    
    // Get today's date
    const today = new Date().toDateString();
    
    // Get session count from localStorage (mock data for demo)
    let sessionData = JSON.parse(localStorage.getItem('session_statistics') || '{}');
    
    if (!sessionData[today]) {
        sessionData[today] = {
            count: 1,
            lastLogout: new Date().toISOString()
        };
    } else {
        sessionData[today].count++;
        sessionData[today].lastLogout = new Date().toISOString();
    }
    
    // Save updated data
    localStorage.setItem('session_statistics', JSON.stringify(sessionData));
    
    // Display the count
    elements.totalSessions.textContent = sessionData[today].count;
    
    // Animate the number
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
    
    // Set navigation for logged out state
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
    
    // Show login/signup buttons
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

// ================= INITIALIZE ON LOAD =================
document.addEventListener('DOMContentLoaded', initLogoutPage);

// ================= EXPORT FUNCTIONS =================
window.clearUserData = clearUserData;
window.submitFeedback = submitFeedback;