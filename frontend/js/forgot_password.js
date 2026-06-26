// frontend/js/forgot_password.js

class ForgotPassword {
    constructor() {
        this.currentStep = 1;
        this.userEmail = '';
        this.otp = '';
        this.timerInterval = null;
        this.timeLeft = 120;
        this.init();
    }
    
    init() { 
        this.bindEvents(); 
        this.startTimer();
        // Add initial state for step 2
        document.getElementById('step2Content')?.classList.add('hidden');
    }
    
    bindEvents() {
        // Step 1: Send Reset Link
        document.getElementById('sendResetBtn')?.addEventListener('click', () => this.sendResetLink());
        
        // OTP Inputs
        document.querySelectorAll('.otp-input').forEach((input, i) => {
            input.addEventListener('input', (e) => this.handleOtpInput(e, i));
            input.addEventListener('keydown', (e) => this.handleOtpKeydown(e, i));
            input.addEventListener('paste', (e) => this.handleOtpPaste(e));
        });
        
        // Step 2: Verify OTP
        document.getElementById('verifyOtpBtn')?.addEventListener('click', () => this.verifyOtp());
        document.getElementById('resendOtp')?.addEventListener('click', () => this.resendOtp());
        
        // Step 3: Reset Password
        document.getElementById('newPassword')?.addEventListener('input', () => this.checkPasswordStrength());
        document.getElementById('confirmPassword')?.addEventListener('input', () => this.checkPasswordMatch());
        document.getElementById('resetPasswordBtn')?.addEventListener('click', () => this.resetPassword());
        
        // Navigation
        document.getElementById('backToStep1')?.addEventListener('click', () => this.goToStep(1));
        document.getElementById('backToStep2')?.addEventListener('click', () => this.goToStep(2));
        
        // Enter key handlers
        const emailInput = document.getElementById('resetEmail');
        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendResetLink();
            });
        }
        
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach((input, index) => {
            if (index === otpInputs.length - 1) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && this.checkOtpComplete()) {
                        this.verifyOtp();
                    }
                });
            }
        });
        
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        if (newPassword && confirmPassword) {
            confirmPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const btn = document.getElementById('resetPasswordBtn');
                    if (btn && !btn.disabled) this.resetPassword();
                }
            });
        }
    }
    
    async sendResetLink() {
        const email = document.getElementById('resetEmail')?.value.trim();
        const msgDiv = document.getElementById('step1Message');
        
        if (!this.validateEmail(email)) { 
            this.showMessage(msgDiv, 'Please enter a valid email address', 'error'); 
            return; 
        }
        
        const btn = document.getElementById('sendResetBtn');
        if (btn) { 
            btn.disabled = true; 
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            const res = await fetch('/api/forgot-password', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ email }) 
            });
            const data = await res.json();
            
            if (data.success) { 
                this.userEmail = email; 
                this.showMessage(msgDiv, data.message || 'Reset link sent! Check your email.', 'success'); 
                setTimeout(() => this.goToStep(2), 2000);
            } else {
                // For security, don't reveal if email exists or not
                this.showMessage(msgDiv, data.message || 'If the email exists, reset instructions will be sent', 'info');
                // Don't proceed to step 2 if email doesn't exist
                if (!data.email) {
                    setTimeout(() => {
                        if (btn) btn.disabled = false;
                        btn.innerHTML = 'Send Reset Link';
                    }, 3000);
                } else {
                    setTimeout(() => this.goToStep(2), 2000);
                }
            }
        } catch(e) { 
            this.showMessage(msgDiv, 'Network error. Please try again.', 'error'); 
        } finally { 
            if (btn && btn.disabled) {
                setTimeout(() => {
                    btn.disabled = false; 
                    btn.innerHTML = 'Send Reset Link';
                }, 3000);
            }
        }
    }
    
    handleOtpInput(e, index) {
        // Only allow numbers
        if (!/^\d*$/.test(e.target.value)) {
            e.target.value = '';
            return;
        }
        
        // Auto-advance to next input
        if (e.target.value && index < 5) {
            const next = document.querySelector(`.otp-input[data-index="${index + 2}"]`);
            if (next) next.focus();
        }
        
        this.checkOtpComplete();
    }
    
    handleOtpKeydown(e, index) {
        // Handle backspace to move to previous input
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            const prev = document.querySelector(`.otp-input[data-index="${index}"]`);
            if (prev) {
                prev.focus();
                prev.value = '';
            }
        }
        
        // Handle delete key
        if (e.key === 'Delete' && !e.target.value && index < 5) {
            const next = document.querySelector(`.otp-input[data-index="${index + 2}"]`);
            if (next) next.focus();
        }
    }
    
    handleOtpPaste(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        const otpDigits = pastedData.replace(/\D/g, '').slice(0, 6);
        
        const inputs = document.querySelectorAll('.otp-input');
        for (let i = 0; i < otpDigits.length && i < inputs.length; i++) {
            inputs[i].value = otpDigits[i];
        }
        
        this.checkOtpComplete();
        
        // Focus the next empty input or last input
        const lastFilled = Math.min(otpDigits.length, inputs.length - 1);
        if (lastFilled < inputs.length - 1 && otpDigits.length === 6) {
            inputs[lastFilled + 1]?.focus();
        } else if (otpDigits.length === 6) {
            inputs[inputs.length - 1].focus();
        }
    }
    
    checkOtpComplete() {
        const inputs = document.querySelectorAll('.otp-input');
        let otp = '';
        let allFilled = true;
        
        inputs.forEach(i => {
            otp += i.value;
            if (!i.value) allFilled = false;
        });
        
        this.otp = otp;
        const btn = document.getElementById('verifyOtpBtn');
        if (btn) btn.disabled = !allFilled;
        
        return allFilled;
    }
    
    async verifyOtp() {
        if (this.otp.length !== 6) { 
            this.showMessage(document.getElementById('step2Message'), 'Please enter the 6-digit verification code', 'error'); 
            return; 
        }
        
        if (!this.userEmail) { 
            this.showMessage(document.getElementById('step2Message'), 'Session expired. Please start again.', 'error'); 
            setTimeout(() => this.goToStep(1), 2000);
            return; 
        }
        
        const btn = document.getElementById('verifyOtpBtn');
        if (btn) { 
            btn.disabled = true; 
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        }
        
        try {
            const res = await fetch('/api/verify-otp', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ email: this.userEmail, otp: this.otp }) 
            });
            const data = await res.json();
            
            if (data.success) { 
                this.showMessage(document.getElementById('step2Message'), 'Code verified successfully!', 'success'); 
                setTimeout(() => this.goToStep(3), 1500);
            } else { 
                this.showMessage(document.getElementById('step2Message'), data.message || 'Invalid verification code', 'error');
                // Clear OTP inputs on error
                document.querySelectorAll('.otp-input').forEach(input => input.value = '');
                this.otp = '';
                document.getElementById('verifyOtpBtn').disabled = true;
            }
        } catch(e) { 
            this.showMessage(document.getElementById('step2Message'), 'Network error. Please try again.', 'error'); 
        } finally { 
            if (btn) { 
                btn.disabled = false; 
                btn.innerHTML = 'Verify Code';
            }
        }
    }
    
    async resendOtp() {
        if (!this.userEmail) { 
            this.showMessage(document.getElementById('step2Message'), 'Session expired. Please start again.', 'error'); 
            setTimeout(() => this.goToStep(1), 2000);
            return; 
        }
        
        const link = document.getElementById('resendOtp');
        if (link?.classList.contains('disabled')) return;
        
        if (link) { 
            link.classList.add('disabled'); 
            link.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resending...';
        }
        
        try {
            const res = await fetch('/api/resend-otp', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ email: this.userEmail }) 
            });
            const data = await res.json();
            
            if (data.success) { 
                this.showMessage(document.getElementById('step2Message'), 'New code sent to your email!', 'success'); 
                this.resetTimer();
                // Clear OTP inputs
                document.querySelectorAll('.otp-input').forEach(input => input.value = '');
                this.otp = '';
                document.getElementById('verifyOtpBtn').disabled = true;
            } else { 
                this.showMessage(document.getElementById('step2Message'), data.message || 'Failed to resend code', 'error'); 
            }
        } catch(e) { 
            this.showMessage(document.getElementById('step2Message'), 'Network error. Please try again.', 'error'); 
        } finally { 
            setTimeout(() => { 
                if (link) { 
                    link.classList.remove('disabled'); 
                    link.innerHTML = "Didn't receive code? Resend";
                } 
            }, 30000);
        }
    }
    
    checkPasswordStrength() {
        const pwd = document.getElementById('newPassword')?.value || '';
        const strengthBar = document.getElementById('strengthBar');
        const strengthText = document.getElementById('strengthText');
        
        // Check requirements
        const hasLength = pwd.length >= 8;
        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
        
        // Update requirement indicators
        this.updateRequirement('reqLength', hasLength);
        this.updateRequirement('reqUpper', hasUpper);
        this.updateRequirement('reqLower', hasLower);
        this.updateRequirement('reqNumber', hasNumber);
        this.updateRequirement('reqSpecial', hasSpecial);
        
        // Calculate strength
        let strength = 0;
        if (hasLength) strength++;
        if (hasUpper) strength++;
        if (hasLower) strength++;
        if (hasNumber) strength++;
        if (hasSpecial) strength++;
        
        // Update strength bar
        if (strengthBar) {
            strengthBar.className = 'strength-bar';
            if (strength <= 2) {
                strengthBar.classList.add('weak');
                if (strengthText) strengthText.textContent = 'Weak password';
            } else if (strength <= 4) {
                strengthBar.classList.add('medium');
                if (strengthText) strengthText.textContent = 'Medium password';
            } else {
                strengthBar.classList.add('strong');
                if (strengthText) strengthText.textContent = 'Strong password';
            }
        }
        
        this.checkResetButton();
    }
    
    checkPasswordMatch() {
        const password = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const matchDiv = document.getElementById('passwordMatch');
        
        if (!password) {
            if (matchDiv) matchDiv.textContent = '';
            return;
        }
        
        if (confirmPassword) {
            if (password === confirmPassword) {
                if (matchDiv) {
                    matchDiv.textContent = '✓ Passwords match';
                    matchDiv.style.color = '#10b981';
                }
            } else {
                if (matchDiv) {
                    matchDiv.textContent = '✗ Passwords do not match';
                    matchDiv.style.color = '#ef4444';
                }
            }
        } else {
            if (matchDiv) matchDiv.textContent = '';
        }
        
        this.checkResetButton();
    }
    
    checkResetButton() {
        const password = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        const btn = document.getElementById('resetPasswordBtn');
        
        // Check all requirements
        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        const passwordsMatch = password === confirmPassword && password.length > 0;
        
        const isValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;
        
        if (btn) btn.disabled = !isValid;
        return isValid;
    }
    
    updateRequirement(elementId, isValid) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('valid', 'invalid');
            element.classList.add(isValid ? 'valid' : 'invalid');
            if (isValid) {
                element.innerHTML = element.innerHTML.replace('❌', '✓').replace('✗', '✓');
            } else {
                element.innerHTML = element.innerHTML.replace('✓', '❌').replace('✓', '✗');
            }
        }
    }
    
    async resetPassword() {
        if (!this.userEmail) { 
            this.showMessage(document.getElementById('step3Message'), 'Session expired. Please start again.', 'error'); 
            setTimeout(() => this.goToStep(1), 2000);
            return; 
        }
        
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const btn = document.getElementById('resetPasswordBtn');
        const msgDiv = document.getElementById('step3Message');
        
        if (newPassword !== confirmPassword) {
            this.showMessage(msgDiv, 'Passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 8) {
            this.showMessage(msgDiv, 'Password must be at least 8 characters', 'error');
            return;
        }
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
        }
        
        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: this.userEmail, 
                    newPassword: newPassword 
                })
            });
            
            const data = await res.json();
            
            if (data.success) {
                this.showMessage(msgDiv, 'Password reset successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 3000);
            } else {
                this.showMessage(msgDiv, data.message || 'Failed to reset password', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = 'Reset Password';
                }
            }
        } catch (error) {
            console.error('Reset password error:', error);
            this.showMessage(msgDiv, 'Network error. Please try again.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Reset Password';
            }
        }
    }
    
    // Navigation methods
    goToStep(step) {
        this.currentStep = step;
        
        // Update progress steps
        document.querySelectorAll('.step').forEach((stepEl, index) => {
            stepEl.classList.remove('active', 'completed');
            if (index + 1 < step) {
                stepEl.classList.add('completed');
            } else if (index + 1 === step) {
                stepEl.classList.add('active');
            }
        });
        
        // Show/hide content
        const step1Content = document.getElementById('step1Content');
        const step2Content = document.getElementById('step2Content');
        const step3Content = document.getElementById('step3Content');
        const successContent = document.getElementById('successContent');
        
        if (step1Content) step1Content.style.display = step === 1 ? 'block' : 'none';
        if (step2Content) step2Content.style.display = step === 2 ? 'block' : 'none';
        if (step3Content) step3Content.style.display = step === 3 ? 'block' : 'none';
        if (successContent) successContent.style.display = 'none';
        
        // Clear messages when changing steps
        ['step1Message', 'step2Message', 'step3Message'].forEach(id => {
            const div = document.getElementById(id);
            if (div) {
                div.style.display = 'none';
                div.textContent = '';
            }
        });
        
        // Reset timer when going to step 2
        if (step === 2) {
            this.resetTimer();
            // Clear OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => {
                input.value = '';
            });
            this.otp = '';
            document.getElementById('verifyOtpBtn').disabled = true;
        }
        
        // Focus on first input of step
        if (step === 1) {
            document.getElementById('resetEmail')?.focus();
        } else if (step === 2) {
            document.querySelector('.otp-input')?.focus();
        } else if (step === 3) {
            document.getElementById('newPassword')?.focus();
        }
    }
    
    showSuccess() {
        const step1Content = document.getElementById('step1Content');
        const step2Content = document.getElementById('step2Content');
        const step3Content = document.getElementById('step3Content');
        const successContent = document.getElementById('successContent');
        
        if (step1Content) step1Content.style.display = 'none';
        if (step2Content) step2Content.style.display = 'none';
        if (step3Content) step3Content.style.display = 'none';
        if (successContent) successContent.style.display = 'block';
        
        // Update progress steps to show all completed
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.classList.remove('active');
            stepEl.classList.add('completed');
        });
    }
    
    // Timer functions
    startTimer() {
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                const timerEl = document.getElementById('timer');
                if (timerEl) timerEl.textContent = 'Code expired';
                
                const verifyBtn = document.getElementById('verifyOtpBtn');
                if (verifyBtn) verifyBtn.disabled = true;
                
                const resendLink = document.getElementById('resendOtp');
                if (resendLink) resendLink.classList.remove('disabled');
                
                this.showMessage(document.getElementById('step2Message'), 'Code expired. Please resend.', 'warning');
            }
        }, 1000);
    }
    
    resetTimer() {
        clearInterval(this.timerInterval);
        this.timeLeft = 120;
        this.startTimer();
        
        const resendLink = document.getElementById('resendOtp');
        if (resendLink) resendLink.classList.add('disabled');
        
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.style.color = '#102094';
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timerEl = document.getElementById('timer');
        
        if (timerEl) {
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when time is low
            if (this.timeLeft < 30) {
                timerEl.style.color = '#f59e0b';
            } else if (this.timeLeft < 10) {
                timerEl.style.color = '#ef4444';
            } else {
                timerEl.style.color = '#102094';
            }
        }
    }
    
    // Helper functions
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    showMessage(element, message, type) {
        if (!element) return;
        
        element.textContent = message;
        element.className = `reset-message ${type}`;
        element.style.display = 'block';
        
        // Auto-hide messages after 5 seconds (except errors on critical steps)
        if (type !== 'error' || this.currentStep !== 2) {
            setTimeout(() => {
                if (element.style.display !== 'none') {
                    element.style.display = 'none';
                }
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ForgotPassword();
});

// code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
// end of the code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.