// frontend/js/login.js

let failedAttempts = 0;
let isAccountLocked = false;
let unlockTime = null;

async function checkLoginStatus() {
    try {
        const response = await fetch('/api/login-status');
        const data = await response.json();
        
        if (data.logged_in) {
            if (data.role === 'student') {
                window.location.href = '/student-dashboard';
            } else if (data.role === 'lecturer') {
                window.location.href = '/lecturer-dashboard';
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error checking login status:', error);
        return false;
    }
}

function login() {
    const role = document.getElementById("role").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!role || !email || !password) {
        showStatusMessage("Please fill all fields", "error");
        return;
    }

    // Show loading state
    const loginBtn = document.getElementById("loginBtn");
    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = "Verifying...";

    // Add cooldown indicator
    showCooldownIndicator();

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            role,
            email,
            password
        })
    })
    .then(res => {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned non-JSON response");
        }
        return res.json();
    })
    .then(data => {
        // Remove cooldown indicator
        removeCooldownIndicator();
        
        if (data.success) {
            // Reset failed attempts on success
            failedAttempts = 0;
            isAccountLocked = false;
            
            showStatusMessage(data.security?.message || "Login successful! Redirecting...", "success");
            
            // Show security notification if there were previous failed attempts
            if (data.security?.previous_failed_attempts > 0) {
                showSecurityNotification(`There were ${data.security.previous_failed_attempts} failed login attempts on your account.`);
            }
            
            setTimeout(() => {
                if (data.role === "student") {
                    window.location.href = "/student-dashboard";
                } else if (data.role === "lecturer") {
                    window.location.href = "/lecturer-dashboard";
                } else {
                    window.location.href = "/";
                }
            }, 1500);
        } else {
            // Handle different types of failures
            if (data.locked) {
                // Account is locked
                isAccountLocked = true;
                unlockTime = data.unlock_time;
                showAccountLockedMessage(data.message, data.unlock_time);
            } else if (data.blocked) {
                // IP is blocked
                showIPBlockedMessage(data.message, data.cooldown);
            } else if (data.cooldown) {
                // In cooldown period
                showCooldownMessage(data.message, data.wait_time);
            } else {
                // Normal failed attempt
                failedAttempts++;
                const remainingAttempts = data.remaining_attempts || (5 - failedAttempts);
                
                if (remainingAttempts <= 3) {
                    showSecurityWarning(`⚠️ ${remainingAttempts} attempt(s) remaining before account lock`);
                }
                
                showStatusMessage(data.message || "Invalid credentials", "error");
                
                // Check if we should show CAPTCHA
                if (failedAttempts >= 3) {
                    showCaptchaChallenge();
                }
            }
            
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    })
    .catch(err => {
        console.error("Login error:", err);
        removeCooldownIndicator();
        showStatusMessage("Network error. Please check your connection.", "error");
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
    });
}

// Forgot Password functionality
function setupForgotPassword() {
    const forgotLink = document.getElementById('forgotPasswordLink');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const loginForm = document.querySelector('.login-box');
    const sendResetBtn = document.getElementById('sendResetBtn');
    const backToLoginBtn = document.getElementById('backToLogin');
    
    if (!forgotLink || !forgotForm) return;
    
    // Show forgot password form
    forgotLink.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Check if account is locked first
        const email = document.getElementById('email').value.trim();
        if (email) {
            try {
                const response = await fetch('/api/security/check-lock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                if (data.locked) {
                    showAccountLockedMessage(
                        "Account is locked. Please use the unlock option below.",
                        data.unlock_in
                    );
                    return;
                }
            } catch (error) {
                console.error('Error checking account lock:', error);
            }
        }
        
        forgotForm.style.display = 'block';
        loginForm.querySelectorAll('input, select, button').forEach(el => {
            if (el.id !== 'forgotPasswordLink') {
                el.style.opacity = '0.5';
                el.disabled = true;
            }
        });
    });
    
    // Send reset link
    sendResetBtn.addEventListener('click', async function() {
        const email = document.getElementById('resetEmail').value.trim();
        const messageDiv = document.getElementById('resetMessage');
        
        if (!validateEmail(email)) {
            showForgotMessage('Please enter a valid email address', 'error', messageDiv);
            return;
        }
        
        // Check if account is locked
        try {
            const lockCheck = await fetch('/api/security/check-lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const lockData = await lockCheck.json();
            if (lockData.locked) {
                showForgotMessage(
                    'Account is locked. Please use the unlock option below.',
                    'error',
                    messageDiv
                );
                
                // Show unlock option
                showUnlockOption(email, messageDiv);
                return;
            }
        } catch (error) {
            console.error('Error checking account lock:', error);
        }
        
        sendResetBtn.disabled = true;
        sendResetBtn.textContent = 'Sending...';
        
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showForgotMessage('Reset link sent to your email! Check your inbox.', 'success', messageDiv);
                // Redirect to full forgot password page for OTP entry
                setTimeout(() => {
                    window.location.href = '/forgot-password.html?email=' + encodeURIComponent(email);
                }, 2000);
            } else {
                showForgotMessage(data.message || 'Failed to send reset link', 'error', messageDiv);
            }
        } catch (error) {
            showForgotMessage('Network error. Please try again.', 'error', messageDiv);
        } finally {
            sendResetBtn.disabled = false;
            sendResetBtn.textContent = 'Send Reset Link';
        }
    });
    
    // Back to login
    backToLoginBtn.addEventListener('click', function() {
        forgotForm.style.display = 'none';
        loginForm.querySelectorAll('input, select, button').forEach(el => {
            el.style.opacity = '1';
            el.disabled = false;
        });
    });
}

// Security-related functions
function showCooldownIndicator() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;
    
    const cooldownDiv = document.createElement('div');
    cooldownDiv.id = 'cooldownIndicator';
    cooldownDiv.className = 'cooldown-indicator';
    cooldownDiv.innerHTML = `
        <div class="cooldown-spinner"></div>
        <span class="cooldown-text">Security check in progress...</span>
    `;
    
    loginBtn.parentNode.insertBefore(cooldownDiv, loginBtn.nextSibling);
}

function removeCooldownIndicator() {
    const indicator = document.getElementById('cooldownIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function showAccountLockedMessage(message, unlockTime) {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) return;
    
    // Calculate time until unlock
    const now = new Date();
    const unlockDate = new Date(unlockTime || now.getTime() + 15 * 60000); // Default 15 min
    const timeDiff = unlockDate - now;
    const minutes = Math.ceil(timeDiff / 60000);
    
    statusDiv.innerHTML = `
        <div class="locked-message">
            <div class="locked-icon">🔒</div>
            <div class="locked-content">
                <h4>Account Locked</h4>
                <p>${message}</p>
                <p>Account will be unlocked in <strong>${minutes} minutes</strong>.</p>
                <button class="unlock-btn" onclick="requestAccountUnlock()">Request Unlock via Email</button>
            </div>
        </div>
    `;
    statusDiv.className = 'status-message error';
    statusDiv.style.display = 'block';
}

function showIPBlockedMessage(message, cooldown) {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) return;
    
    const minutes = Math.ceil(cooldown / 60);
    
    statusDiv.innerHTML = `
        <div class="blocked-message">
            <div class="blocked-icon">🚫</div>
            <div class="blocked-content">
                <h4>Access Temporarily Blocked</h4>
                <p>${message}</p>
                <p>Please try again in <strong>${minutes} minutes</strong>.</p>
                <small>This is a security measure to prevent brute force attacks.</small>
            </div>
        </div>
    `;
    statusDiv.className = 'status-message error';
    statusDiv.style.display = 'block';
}

function showCooldownMessage(message, waitTime) {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = `
        <div class="cooldown-message">
            <div class="cooldown-icon">⏳</div>
            <div class="cooldown-content">
                <h4>Please Wait</h4>
                <p>${message}</p>
                <p>Waiting <strong>${waitTime} seconds</strong> before next attempt...</p>
                <div class="cooldown-timer">
                    <div class="cooldown-progress" id="cooldownProgress"></div>
                </div>
            </div>
        </div>
    `;
    statusDiv.className = 'status-message warning';
    statusDiv.style.display = 'block';
    
    // Animate the progress bar
    const progressBar = document.getElementById('cooldownProgress');
    let progress = 0;
    const interval = setInterval(() => {
        progress += 100 / (waitTime * 10); // Update every 100ms
        progressBar.style.width = `${Math.min(progress, 100)}%`;
        
        if (progress >= 100) {
            clearInterval(interval);
            statusDiv.style.display = 'none';
        }
    }, 100);
}

function showSecurityWarning(message) {
    // Create warning notification
    const warningDiv = document.createElement('div');
    warningDiv.className = 'security-warning';
    warningDiv.innerHTML = `
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">${message}</div>
        <button class="warning-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(warningDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (warningDiv.parentNode) {
            warningDiv.remove();
        }
    }, 5000);
}

function showSecurityNotification(message) {
    // Create security notification
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'security-notification';
    notificationDiv.innerHTML = `
        <div class="notification-icon">🔔</div>
        <div class="notification-content">
            <h4>Security Notice</h4>
            <p>${message}</p>
            <small>If this wasn't you, please change your password immediately.</small>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notificationDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notificationDiv.parentNode) {
            notificationDiv.remove();
        }
    }, 10000);
}

function showCaptchaChallenge() {
    // Simple CAPTCHA implementation
    const captchaDiv = document.createElement('div');
    captchaDiv.id = 'captchaChallenge';
    captchaDiv.className = 'captcha-challenge';
    
    // Generate simple math CAPTCHA
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '*'];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    
    let answer;
    switch(operator) {
        case '+': answer = num1 + num2; break;
        case '-': answer = num1 - num2; break;
        case '*': answer = num1 * num2; break;
    }
    
    captchaDiv.innerHTML = `
        <div class="captcha-header">
            <h4>Security Check Required</h4>
            <p>Please verify you're not a robot</p>
        </div>
        <div class="captcha-question">
            <span>${num1} ${operator} ${num2} = </span>
            <input type="number" id="captchaAnswer" placeholder="?">
        </div>
        <div class="captcha-actions">
            <button class="captcha-submit" onclick="verifyCaptcha(${answer})">Verify</button>
            <button class="captcha-refresh" onclick="refreshCaptcha()">↻ New Challenge</button>
        </div>
    `;
    
    // Insert before login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn && loginBtn.parentNode) {
        loginBtn.parentNode.insertBefore(captchaDiv, loginBtn);
    }
}

function verifyCaptcha(correctAnswer) {
    const userAnswer = parseInt(document.getElementById('captchaAnswer').value);
    const captchaDiv = document.getElementById('captchaChallenge');
    
    if (userAnswer === correctAnswer) {
        captchaDiv.innerHTML = `
            <div class="captcha-success">
                <span class="success-icon">✓</span>
                <span>Verification successful! You may proceed.</span>
            </div>
        `;
        setTimeout(() => {
            captchaDiv.remove();
        }, 2000);
    } else {
        captchaDiv.innerHTML = `
            <div class="captcha-error">
                <span class="error-icon">✗</span>
                <span>Incorrect answer. Please try again.</span>
                <button class="captcha-try-again" onclick="showCaptchaChallenge()">Try Again</button>
            </div>
        `;
    }
}

function refreshCaptcha() {
    const captchaDiv = document.getElementById('captchaChallenge');
    if (captchaDiv) {
        captchaDiv.remove();
        showCaptchaChallenge();
    }
}

async function requestAccountUnlock() {
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showStatusMessage('Please enter your email first', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/security/unlock-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('Unlock instructions sent to your email!', 'success');
        } else {
            showStatusMessage(data.message || 'Failed to send unlock request', 'error');
        }
    } catch (error) {
        showStatusMessage('Network error. Please try again.', 'error');
    }
}

function showUnlockOption(email, messageDiv) {
    const unlockDiv = document.createElement('div');
    unlockDiv.className = 'unlock-option';
    unlockDiv.innerHTML = `
        <p style="margin: 10px 0; color: #dc2626;">Your account is locked due to too many failed attempts.</p>
        <button class="unlock-request-btn" onclick="requestUnlockForEmail('${email}')">
            🔓 Send Unlock Instructions
        </button>
    `;
    
    messageDiv.parentNode.insertBefore(unlockDiv, messageDiv.nextSibling);
}

async function requestUnlockForEmail(email) {
    try {
        const response = await fetch('/api/security/unlock-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showStatusMessage('Unlock instructions sent to your email!', 'success');
        } else {
            showStatusMessage(data.message || 'Failed to send unlock request', 'error');
        }
    } catch (error) {
        showStatusMessage('Network error. Please try again.', 'error');
    }
}

// Helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) return;
    
    // Clear any existing content
    statusDiv.innerHTML = '';
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

function showForgotMessage(message, type, element) {
    element.textContent = message;
    element.className = `reset-message ${type}`;
    element.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    
    // Add event listener to login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
    
    // Also allow login on Enter key
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
    
    // Setup forgot password functionality
    setupForgotPassword();
});