// frontend/js/login.js

// ================= SECURITY CONFIGURATION =================
const SECURITY_CONFIG = {
    maxAttempts: 5,
    lockDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    cooldownDuration: 30 * 1000, // 30 seconds
    captchaThreshold: 3, // Show CAPTCHA after 3 failed attempts
    warningThreshold: 2 // Show warning after 2 attempts remaining
};

// ================= STATE MANAGEMENT =================
let securityState = {
    failedAttempts: 0,
    isAccountLocked: false,
    unlockTime: null,
    isCooldown: false,
    cooldownEnd: null,
    lastAttemptTime: null
};

// ================= DOM ELEMENTS =================
let elements = {
    loginBtn: null,
    roleSelect: null,
    emailInput: null,
    passwordInput: null,
    togglePassword: null,
    statusMessage: null,
    securityMessages: null,
    attemptCounter: null,
    attemptText: null,
    captchaArea: null,
    forgotPasswordLink: null,
    forgotPasswordForm: null,
    sendResetBtn: null,
    backToLoginBtn: null,
    resetMessage: null,
    resetEmail: null
};

// ================= INITIALIZATION =================
function initLoginPage() {
    console.log("Login page initialized");
    
    // Cache DOM elements
    cacheElements();
    
    // Check if user is already logged in
    checkLoginStatus();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize security state from localStorage
    loadSecurityState();
    
    // Update attempt counter display
    updateAttemptCounter();
    
    // Setup forgot password functionality
    setupForgotPassword();
}

function cacheElements() {
    elements.loginBtn = document.getElementById('loginBtn');
    elements.roleSelect = document.getElementById('role');
    elements.emailInput = document.getElementById('email');
    elements.passwordInput = document.getElementById('password');
    elements.togglePassword = document.getElementById('togglePassword');
    elements.statusMessage = document.getElementById('statusMessage');
    elements.securityMessages = document.getElementById('securityMessages');
    elements.attemptCounter = document.getElementById('attemptCounter');
    elements.attemptText = document.getElementById('attemptText');
    elements.captchaArea = document.getElementById('captchaArea');
    elements.forgotPasswordLink = document.getElementById('forgotPasswordLink');
    elements.forgotPasswordForm = document.getElementById('forgotPasswordForm');
    elements.sendResetBtn = document.getElementById('sendResetBtn');
    elements.backToLoginBtn = document.getElementById('backToLoginBtn');
    elements.resetMessage = document.getElementById('resetMessage');
    elements.resetEmail = document.getElementById('resetEmail');
}

function setupEventListeners() {
    // Login button
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', handleLogin);
    }
    
    // Password visibility toggle
    if (elements.togglePassword) {
        elements.togglePassword.addEventListener('click', togglePasswordVisibility);
    }
    
    // Login on Enter key
    if (elements.passwordInput) {
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // Email input for auto-fill detection
    if (elements.emailInput) {
        elements.emailInput.addEventListener('input', () => {
            checkAccountStatus(elements.emailInput.value.trim());
        });
    }
}

// ================= SECURITY STATE MANAGEMENT =================
function loadSecurityState() {
    const savedState = localStorage.getItem('loginSecurityState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            const now = Date.now();
            
            // Check if lock has expired
            if (state.unlockTime && state.unlockTime > now) {
                securityState = state;
            } else {
                // Reset if lock expired
                resetSecurityState();
            }
            
            // Check cooldown
            if (state.cooldownEnd && state.cooldownEnd > now) {
                securityState.isCooldown = true;
                securityState.cooldownEnd = state.cooldownEnd;
                showCooldownMessage('Please wait before trying again.', Math.ceil((state.cooldownEnd - now) / 1000));
            }
        } catch (error) {
            console.error('Error loading security state:', error);
            resetSecurityState();
        }
    }
}

function saveSecurityState() {
    localStorage.setItem('loginSecurityState', JSON.stringify(securityState));
}

function resetSecurityState() {
    securityState = {
        failedAttempts: 0,
        isAccountLocked: false,
        unlockTime: null,
        isCooldown: false,
        cooldownEnd: null,
        lastAttemptTime: null
    };
    saveSecurityState();
    updateAttemptCounter();
}

function updateAttemptCounter() {
    if (!elements.attemptCounter || !elements.attemptText) return;
    
    const remaining = SECURITY_CONFIG.maxAttempts - securityState.failedAttempts;
    
    if (remaining <= 0) {
        elements.attemptCounter.style.display = 'none';
        return;
    }
    
    elements.attemptCounter.style.display = 'flex';
    elements.attemptText.textContent = `${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`;
    
    // Update styling based on remaining attempts
    elements.attemptCounter.className = 'attempt-counter';
    if (remaining <= SECURITY_CONFIG.warningThreshold) {
        elements.attemptCounter.classList.add('warning');
    }
    if (remaining === 1) {
        elements.attemptCounter.classList.add('critical');
    }
}

// ================= LOGIN FUNCTIONALITY =================
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

async function checkAccountStatus(email) {
    if (!email) return;
    
    try {
        const response = await fetch('/api/security/check-lock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        if (response.status === 423) {
            const data = await response.json();
            // Account is locked
            showAccountLockedMessage(data.message || 'Account is locked', data.unlock_time);
            disableLoginForm();
        }
        // else: account not locked – do nothing
    } catch (error) {
        console.error('Error checking account status:', error);
    }
}

async function handleLogin() {
    // Check cooldown first
    if (securityState.isCooldown && securityState.cooldownEnd > Date.now()) {
        const remaining = Math.ceil((securityState.cooldownEnd - Date.now()) / 1000);
        showStatusMessage(`Please wait ${remaining} seconds before trying again`, 'warning');
        return;
    }
    
    const role = elements.roleSelect ? elements.roleSelect.value : '';
    const email = elements.emailInput ? elements.emailInput.value.trim() : '';
    const password = elements.passwordInput ? elements.passwordInput.value : '';
    
    // Validation
    if (!role || !email || !password) {
        showStatusMessage('Please fill all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showStatusMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Update security state
    securityState.lastAttemptTime = Date.now();
    
    // Show loading state
    setLoginButtonState(true);
    showCooldownIndicator();
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, email, password })
        });
        
        const data = await response.json();
        removeCooldownIndicator();
        
        if (data.success) {
            // Successful login
            handleSuccessfulLogin(data);
        } else {
            // Failed login
            handleFailedLogin(data);
        }
    } catch (error) {
        console.error('Login error:', error);
        removeCooldownIndicator();
        showStatusMessage('Network error. Please check your connection.', 'error');
        setLoginButtonState(false);
    }
}

function handleSuccessfulLogin(data) {
    // Reset security state on success
    resetSecurityState();
    
    // Show success message
    showStatusMessage(data.message || 'Login successful! Redirecting...', 'success');
    
    // Show security notification if needed
    if (data.security_notice) {
        showSecurityNotification(data.security_notice);
    }
    
    // Redirect based on role
    setTimeout(() => {
        if (data.role === 'student') {
            window.location.href = '/student-dashboard';
        } else if (data.role === 'lecturer') {
            window.location.href = '/lecturer-dashboard';
        }
    }, 1500);
}

function handleFailedLogin(data) {
    // Increment failed attempts
    securityState.failedAttempts++;
    saveSecurityState();
    updateAttemptCounter();
    
    // Handle different failure types
    if (data.locked) {
        // Account is locked
        securityState.isAccountLocked = true;
        securityState.unlockTime = data.unlock_time ? new Date(data.unlock_time).getTime() : Date.now() + SECURITY_CONFIG.lockDuration;
        showAccountLockedMessage(data.message, securityState.unlockTime);
        disableLoginForm();
    } else if (data.cooldown) {
        // IP cooldown
        securityState.isCooldown = true;
        securityState.cooldownEnd = Date.now() + (data.wait_time || SECURITY_CONFIG.cooldownDuration);
        showCooldownMessage(data.message || 'Please wait before trying again.', data.wait_time || 30);
    } else {
        // Normal failure
        showStatusMessage(data.message || 'Invalid credentials', 'error');
        
        // Check if we should show CAPTCHA
        if (securityState.failedAttempts >= SECURITY_CONFIG.captchaThreshold) {
            showCaptchaChallenge();
        }
        
        // Check for remaining attempts warning
        const remaining = SECURITY_CONFIG.maxAttempts - securityState.failedAttempts;
        if (remaining <= SECURITY_CONFIG.warningThreshold && remaining > 0) {
            showSecurityWarning(`⚠️ ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before account lock`);
        }
    }
    
    setLoginButtonState(false);
}

// ================= SECURITY FEATURES =================
function showCooldownIndicator() {
    if (!elements.loginBtn) return;
    
    const cooldownDiv = document.createElement('div');
    cooldownDiv.id = 'cooldownIndicator';
    cooldownDiv.className = 'cooldown-indicator';
    cooldownDiv.innerHTML = `
        <div class="cooldown-spinner"></div>
        <span class="cooldown-text">Security verification in progress...</span>
    `;
    
    elements.loginBtn.parentNode.insertBefore(cooldownDiv, elements.loginBtn.nextSibling);
}

function removeCooldownIndicator() {
    const indicator = document.getElementById('cooldownIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function showAccountLockedMessage(message, unlockTime) {
    const now = Date.now();
    const unlockTimestamp = new Date(unlockTime).getTime();
    const minutes = Math.ceil((unlockTimestamp - now) / 60000);
    
    const messageDiv = createSecurityMessage('locked', `
        <div class="locked-message">
            <div class="locked-icon">🔒</div>
            <div class="locked-content">
                <h4>Account Locked</h4>
                <p>${message}</p>
                <p>Account will be unlocked in <strong>${minutes} minute${minutes !== 1 ? 's' : ''}</strong>.</p>
                <button class="unlock-btn" onclick="requestAccountUnlock()">
                    <i class="fas fa-envelope"></i> Request Unlock via Email
                </button>
            </div>
        </div>
    `);
    
    // Start countdown timer
    if (unlockTimestamp > now) {
        startUnlockCountdown(unlockTimestamp, messageDiv);
    }
}

function showCooldownMessage(message, waitTime) {
    const messageDiv = createSecurityMessage('cooldown', `
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
    `);
    
    // Start progress bar animation
    let progress = 0;
    const interval = setInterval(() => {
        progress += 100 / (waitTime * 10); // Update every 100ms
        const progressBar = messageDiv.querySelector('#cooldownProgress');
        if (progressBar) {
            progressBar.style.width = `${Math.min(progress, 100)}%`;
        }
        
        if (progress >= 100) {
            clearInterval(interval);
            messageDiv.remove();
            securityState.isCooldown = false;
            securityState.cooldownEnd = null;
            saveSecurityState();
        }
    }, 100);
}

function showSecurityWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'security-warning';
    warningDiv.innerHTML = `
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
            <h4>Security Warning</h4>
            <p>${message}</p>
        </div>
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
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'security-notification';
    notificationDiv.innerHTML = `
        <div class="notification-icon">🔔</div>
        <div class="notification-content">
            <h4>Security Notice</h4>
            <p>${message}</p>
            <small>If this wasn't you, please secure your account.</small>
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

function createSecurityMessage(type, content) {
    // Clear existing security messages
    if (elements.securityMessages) {
        elements.securityMessages.innerHTML = '';
    }
    
    // Create message container
    const messageDiv = document.createElement('div');
    messageDiv.className = `security-message ${type}`;
    messageDiv.innerHTML = content;
    
    // Add to DOM
    if (elements.securityMessages) {
        elements.securityMessages.appendChild(messageDiv);
    } else {
        // Fallback to status message area
        if (elements.statusMessage) {
            elements.statusMessage.innerHTML = content;
            elements.statusMessage.className = `status-message ${type}`;
            elements.statusMessage.style.display = 'block';
        }
    }
    
    return messageDiv;
}

function startUnlockCountdown(unlockTimestamp, container) {
    const updateCountdown = () => {
        const now = Date.now();
        const remaining = unlockTimestamp - now;
        
        if (remaining <= 0) {
            // Unlock time reached
            securityState.isAccountLocked = false;
            securityState.unlockTime = null;
            securityState.failedAttempts = 0;
            saveSecurityState();
            
            if (container.parentNode) {
                container.remove();
            }
            
            enableLoginForm();
            showStatusMessage('Account is now unlocked. You may try logging in again.', 'success');
            return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        const timeElement = container.querySelector('.locked-content strong');
        if (timeElement) {
            timeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Continue countdown
        requestAnimationFrame(updateCountdown);
    };
    
    updateCountdown();
}

// ================= CAPTCHA FUNCTIONALITY =================
function showCaptchaChallenge() {
    if (!elements.captchaArea) return;
    
    // Clear existing CAPTCHA
    elements.captchaArea.innerHTML = '';
    
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
    
    const captchaId = `captcha-${Date.now()}`;
    
    elements.captchaArea.innerHTML = `
        <div class="captcha-challenge" id="${captchaId}">
            <div class="captcha-header">
                <h4><i class="fas fa-robot"></i> Security Verification</h4>
                <p>Please solve this challenge to continue</p>
            </div>
            <div class="captcha-question">
                <span>${num1} ${operator} ${num2} = </span>
                <input type="number" id="captchaAnswer" placeholder="?" autocomplete="off">
            </div>
            <div class="captcha-actions">
                <button class="captcha-submit" onclick="verifyCaptcha(${answer}, '${captchaId}')">
                    <i class="fas fa-check"></i> Verify
                </button>
                <button class="captcha-refresh" onclick="refreshCaptcha()">
                    <i class="fas fa-redo"></i> New Challenge
                </button>
            </div>
        </div>
    `;
}

function verifyCaptcha(correctAnswer, captchaId) {
    const captchaDiv = document.getElementById(captchaId);
    if (!captchaDiv) return;
    
    const userAnswer = parseInt(captchaDiv.querySelector('#captchaAnswer').value);
    
    if (userAnswer === correctAnswer) {
        captchaDiv.innerHTML = `
            <div class="captcha-success" style="background: #d1fae5; padding: 15px; border-radius: 8px; color: #065f46; text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p style="margin: 0; font-weight: 600;">Verification successful!</p>
                <p style="margin: 5px 0 0; font-size: 14px;">You may proceed with login.</p>
            </div>
        `;
        
        // Remove CAPTCHA after success
        setTimeout(() => {
            if (captchaDiv.parentNode) {
                captchaDiv.remove();
            }
        }, 2000);
    } else {
        captchaDiv.innerHTML = `
            <div class="captcha-error" style="background: #fee2e2; padding: 15px; border-radius: 8px; color: #991b1b; text-align: center;">
                <i class="fas fa-times-circle" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p style="margin: 0; font-weight: 600;">Incorrect answer</p>
                <p style="margin: 10px 0; font-size: 14px;">Please try again.</p>
                <button onclick="showCaptchaChallenge()" style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
    }
}

function refreshCaptcha() {
    showCaptchaChallenge();
}

// ================= FORGOT PASSWORD =================
function setupForgotPassword() {
    if (!elements.forgotPasswordLink || !elements.forgotPasswordForm) return;
    
    elements.forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordForm();
    });
    
    if (elements.backToLoginBtn) {
        elements.backToLoginBtn.addEventListener('click', hideForgotPasswordForm);
    }
    
    if (elements.sendResetBtn) {
        elements.sendResetBtn.addEventListener('click', sendResetLink);
    }
}

function showForgotPasswordForm() {
    if (elements.forgotPasswordForm) {
        elements.forgotPasswordForm.style.display = 'block';
    }
    
    // Disable login form
    disableLoginForm();
}

function hideForgotPasswordForm() {
    if (elements.forgotPasswordForm) {
        elements.forgotPasswordForm.style.display = 'none';
    }
    
    // Enable login form
    enableLoginForm();
    
    // Clear reset message
    if (elements.resetMessage) {
        elements.resetMessage.style.display = 'none';
        elements.resetMessage.textContent = '';
    }
}

async function sendResetLink() {
    const email = elements.resetEmail ? elements.resetEmail.value.trim() : '';
    
    if (!validateEmail(email)) {
        showResetMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Show loading state
    const originalText = elements.sendResetBtn.innerHTML;
    elements.sendResetBtn.disabled = true;
    elements.sendResetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        const response = await fetch('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showResetMessage('Reset link sent to your email! Check your inbox.', 'success');
            
            // Auto-hide form after success
            setTimeout(() => {
                hideForgotPasswordForm();
                if (elements.resetEmail) {
                    elements.resetEmail.value = '';
                }
            }, 3000);
        } else {
            showResetMessage(data.message || 'Failed to send reset link', 'error');
        }
    } catch (error) {
        showResetMessage('Network error. Please try again.', 'error');
    } finally {
        elements.sendResetBtn.disabled = false;
        elements.sendResetBtn.innerHTML = originalText;
    }
}

async function requestAccountUnlock() {
    const email = elements.emailInput ? elements.emailInput.value.trim() : '';
    
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

// ================= HELPER FUNCTIONS =================
function setLoginButtonState(isLoading) {
    if (!elements.loginBtn) return;
    
    if (isLoading) {
        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    } else {
        elements.loginBtn.disabled = false;
        elements.loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    }
}

function togglePasswordVisibility() {
    if (!elements.passwordInput || !elements.togglePassword) return;
    
    const type = elements.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    elements.passwordInput.setAttribute('type', type);
    
    // Update icon
    const icon = elements.togglePassword.querySelector('i');
    if (icon) {
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    }
}

function disableLoginForm() {
    if (elements.roleSelect) elements.roleSelect.disabled = true;
    if (elements.emailInput) elements.emailInput.disabled = true;
    if (elements.passwordInput) elements.passwordInput.disabled = true;
    if (elements.loginBtn) elements.loginBtn.disabled = true;
}

function enableLoginForm() {
    if (elements.roleSelect) elements.roleSelect.disabled = false;
    if (elements.emailInput) elements.emailInput.disabled = false;
    if (elements.passwordInput) elements.passwordInput.disabled = false;
    if (elements.loginBtn) elements.loginBtn.disabled = false;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showStatusMessage(message, type) {
    if (!elements.statusMessage) return;
    
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    elements.statusMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds (except for success messages during redirect)
    if (type !== 'success') {
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 5000);
    }
}

function showResetMessage(message, type) {
    if (!elements.resetMessage) return;
    
    elements.resetMessage.textContent = message;
    elements.resetMessage.className = `reset-message ${type}`;
    elements.resetMessage.style.display = 'block';
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            elements.resetMessage.style.display = 'none';
        }, 5000);
    }
}

// ================= INITIALIZE ON LOAD =================
document.addEventListener('DOMContentLoaded', initLoginPage);

// Make functions available globally
window.verifyCaptcha = verifyCaptcha;
window.refreshCaptcha = refreshCaptcha;
window.requestAccountUnlock = requestAccountUnlock;