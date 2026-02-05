// frontend/js/forgot_password.js

class ForgotPassword {
    constructor() {
        this.currentStep = 1;
        this.userEmail = '';
        this.otp = '';
        this.timerInterval = null;
        this.timeLeft = 120; // 2 minutes in seconds
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.startTimer();
    }
    
    bindEvents() {
        // Step 1: Send Reset Link
        document.getElementById('sendResetBtn').addEventListener('click', () => this.sendResetLink());
        
        // Step 2: OTP Input
        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => this.handleOtpInput(e, index));
            input.addEventListener('keydown', (e) => this.handleOtpKeydown(e, index));
        });
        
        // Verify OTP Button
        document.getElementById('verifyOtpBtn').addEventListener('click', () => this.verifyOtp());
        
        // Resend OTP Link
        document.getElementById('resendOtp').addEventListener('click', () => this.resendOtp());
        
        // Step 3: Password Input
        document.getElementById('newPassword').addEventListener('input', () => this.checkPasswordStrength());
        document.getElementById('confirmPassword').addEventListener('input', () => this.checkPasswordMatch());
        
        // Reset Password Button
        document.getElementById('resetPasswordBtn').addEventListener('click', () => this.resetPassword());
        
        // Navigation Buttons
        document.getElementById('backToStep1').addEventListener('click', () => this.goToStep(1));
    }
    
    // Step 1: Send Reset Link
    async sendResetLink() {
        const email = document.getElementById('resetEmail').value.trim();
        const messageDiv = document.getElementById('step1Message');
        
        if (!this.validateEmail(email)) {
            this.showMessage(messageDiv, 'Please enter a valid email address', 'error');
            return;
        }
        
        const btn = document.getElementById('sendResetBtn');
        btn.disabled = true;
        btn.textContent = 'Sending...';
        
        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.userEmail = email;
                this.showMessage(messageDiv, 'Reset link sent to your email!', 'success');
                setTimeout(() => this.goToStep(2), 1500);
            } else {
                this.showMessage(messageDiv, data.message || 'Failed to send reset link', 'error');
            }
        } catch (error) {
            this.showMessage(messageDiv, 'Network error. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
        }
    }
    
    // Step 2: OTP Verification
    handleOtpInput(event, index) {
        const value = event.target.value;
        
        // Only allow numbers
        if (!/^\d*$/.test(value)) {
            event.target.value = '';
            return;
        }
        
        // Move to next input
        if (value && index < 5) {
            const nextInput = document.querySelector(`.otp-input[data-index="${index + 2}"]`);
            nextInput.focus();
        }
        
        // Check if all inputs are filled
        this.checkOtpComplete();
    }
    
    handleOtpKeydown(event, index) {
        // Handle backspace
        if (event.key === 'Backspace' && !event.target.value && index > 0) {
            const prevInput = document.querySelector(`.otp-input[data-index="${index}"]`);
            prevInput.focus();
        }
    }
    
    checkOtpComplete() {
        const otpInputs = document.querySelectorAll('.otp-input');
        let otp = '';
        let allFilled = true;
        
        otpInputs.forEach(input => {
            otp += input.value;
            if (!input.value) allFilled = false;
        });
        
        this.otp = otp;
        document.getElementById('verifyOtpBtn').disabled = !allFilled;
        
        return allFilled;
    }
    
    async verifyOtp() {
        if (this.otp.length !== 6) {
            this.showMessage(document.getElementById('step2Message'), 'Please enter a 6-digit code', 'error');
            return;
        }
        
        const btn = document.getElementById('verifyOtpBtn');
        btn.disabled = true;
        btn.textContent = 'Verifying...';
        
        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: this.userEmail, 
                    otp: this.otp 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(document.getElementById('step2Message'), 'Code verified successfully!', 'success');
                setTimeout(() => this.goToStep(3), 1500);
            } else {
                this.showMessage(document.getElementById('step2Message'), data.message || 'Invalid verification code', 'error');
            }
        } catch (error) {
            this.showMessage(document.getElementById('step2Message'), 'Network error. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Verify Code';
        }
    }
    
    async resendOtp() {
        const resendLink = document.getElementById('resendOtp');
        
        // Prevent multiple clicks
        if (resendLink.classList.contains('disabled')) return;
        
        resendLink.classList.add('disabled');
        resendLink.textContent = 'Resending...';
        
        try {
            const response = await fetch('/api/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: this.userEmail })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(document.getElementById('step2Message'), 'New code sent to your email!', 'success');
                this.resetTimer();
            } else {
                this.showMessage(document.getElementById('step2Message'), data.message || 'Failed to resend code', 'error');
            }
        } catch (error) {
            this.showMessage(document.getElementById('step2Message'), 'Network error. Please try again.', 'error');
        } finally {
            setTimeout(() => {
                resendLink.classList.remove('disabled');
                resendLink.textContent = "Didn't receive code? Resend";
            }, 30000); // 30 seconds cooldown
        }
    }
    
    // Step 3: Password Reset
    checkPasswordStrength() {
        const password = document.getElementById('newPassword').value;
        const strengthBar = document.getElementById('strengthBar');
        
        // Check requirements
        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        
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
        strengthBar.className = 'strength-bar';
        if (strength <= 2) {
            strengthBar.classList.add('weak');
        } else if (strength <= 4) {
            strengthBar.classList.add('medium');
        } else {
            strengthBar.classList.add('strong');
        }
        
        // Enable/disable reset button
        this.checkResetButton();
    }
    
    checkPasswordMatch() {
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const matchDiv = document.getElementById('passwordMatch');
        
        if (!password) return;
        
        if (confirmPassword) {
            if (password === confirmPassword) {
                matchDiv.textContent = '✓ Passwords match';
                matchDiv.style.color = '#10b981';
            } else {
                matchDiv.textContent = '✗ Passwords do not match';
                matchDiv.style.color = '#ef4444';
            }
        } else {
            matchDiv.textContent = '';
        }
        
        this.checkResetButton();
    }
    
    checkResetButton() {
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const btn = document.getElementById('resetPasswordBtn');
        
        // Check all requirements
        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);
        const passwordsMatch = password === confirmPassword && password.length > 0;
        
        const isValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch;
        btn.disabled = !isValid;
    }
    
    async resetPassword() {
        const newPassword = document.getElementById('newPassword').value;
        const btn = document.getElementById('resetPasswordBtn');
        const messageDiv = document.getElementById('step3Message');
        
        btn.disabled = true;
        btn.textContent = 'Resetting...';
        
        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: this.userEmail, 
                    newPassword: newPassword 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(messageDiv, 'Password reset successfully!', 'success');
                setTimeout(() => this.showSuccess(), 1500);
            } else {
                this.showMessage(messageDiv, data.message || 'Failed to reset password', 'error');
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        } catch (error) {
            this.showMessage(messageDiv, 'Network error. Please try again.', 'error');
            btn.disabled = false;
            btn.textContent = 'Reset Password';
        }
    }
    
    // Navigation
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
        document.getElementById('step1Content').style.display = step === 1 ? 'block' : 'none';
        document.getElementById('step2Content').style.display = step === 2 ? 'block' : 'none';
        document.getElementById('step3Content').style.display = step === 3 ? 'block' : 'none';
        
        // Clear messages
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
        }
        
        // Clear OTP inputs when leaving step 2
        if (step !== 2) {
            document.querySelectorAll('.otp-input').forEach(input => {
                input.value = '';
            });
            this.otp = '';
        }
    }
    
    showSuccess() {
        document.getElementById('step1Content').style.display = 'none';
        document.getElementById('step2Content').style.display = 'none';
        document.getElementById('step3Content').style.display = 'none';
        document.getElementById('successContent').style.display = 'block';
        
        // Update progress steps to show all completed
        document.querySelectorAll('.step').forEach(stepEl => {
            stepEl.classList.remove('active');
            stepEl.classList.add('completed');
        });
    }
    
    // Timer Functions
    startTimer() {
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                document.getElementById('timer').textContent = 'Code expired';
                document.getElementById('verifyOtpBtn').disabled = true;
                document.getElementById('resendOtp').classList.remove('disabled');
            }
        }, 1000);
    }
    
    resetTimer() {
        clearInterval(this.timerInterval);
        this.timeLeft = 120;
        this.startTimer();
        document.getElementById('resendOtp').classList.add('disabled');
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Helper Functions
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    updateRequirement(elementId, isValid) {
        const element = document.getElementById(elementId);
        element.classList.remove('valid', 'invalid');
        element.classList.add(isValid ? 'valid' : 'invalid');
    }
    
    showMessage(element, message, type) {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ForgotPassword();
});