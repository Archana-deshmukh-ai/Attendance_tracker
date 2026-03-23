// frontend/js/signup.js

let selectedRole = '';
let currentStep = 1;

// Initialize signup page
document.addEventListener('DOMContentLoaded', function() {
    initializeSignupPage();
});

function initializeSignupPage() {
    console.log('Signup page initialized');
    
    // Role selection
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectRole(this.dataset.role);
        });
    });
    
    // Form validation
    const nameInput = document.getElementById('name');
    if (nameInput) nameInput.addEventListener('input', validateForm);
    
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.addEventListener('input', validateForm);
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength();
            validateForm();
        });
    }
    
    const confirmInput = document.getElementById('confirmPassword');
    if (confirmInput) confirmInput.addEventListener('input', validateForm);
    
    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox) termsCheckbox.addEventListener('change', validateForm);
    
    // Role-specific fields
    const rollno = document.getElementById('rollno');
    if (rollno) rollno.addEventListener('input', validateForm);
    
    const batch = document.getElementById('batch');
    if (batch) batch.addEventListener('change', validateForm);
    
    const department = document.getElementById('department');
    if (department) department.addEventListener('change', validateForm);
    
    const empid = document.getElementById('empid');
    if (empid) empid.addEventListener('input', validateForm);
    
    const lecturerDept = document.getElementById('lecturerDepartment');
    if (lecturerDept) lecturerDept.addEventListener('change', validateForm);
}

function selectRole(role) {
    selectedRole = role;
    
    // Update UI
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.role === role) {
            option.classList.add('selected');
        }
    });
    
    // Show/hide role-specific fields
    const studentFields = document.getElementById('studentFields');
    const lecturerFields = document.getElementById('lecturerFields');
    
    if (studentFields) studentFields.style.display = role === 'student' ? 'block' : 'none';
    if (lecturerFields) lecturerFields.style.display = role === 'lecturer' ? 'block' : 'none';
    
    // Enable next button
    const nextBtn = document.querySelector('.next-btn');
    if (nextBtn) nextBtn.disabled = false;
    
    // Update progress
    const stepRole = document.getElementById('stepRole');
    const stepDetails = document.getElementById('stepDetails');
    
    if (stepRole) stepRole.classList.add('completed');
    if (stepDetails) stepDetails.classList.add('active');
}

function nextStep() {
    if (!selectedRole) return;
    
    const roleStep = document.getElementById('roleStep');
    const detailsStep = document.getElementById('detailsStep');
    
    if (roleStep) roleStep.classList.remove('active');
    if (detailsStep) detailsStep.classList.add('active');
    
    currentStep = 2;
    updateProgress();
}

function prevStep() {
    const detailsStep = document.getElementById('detailsStep');
    const roleStep = document.getElementById('roleStep');
    
    if (detailsStep) detailsStep.classList.remove('active');
    if (roleStep) roleStep.classList.add('active');
    
    currentStep = 1;
    updateProgress();
}

function updateProgress() {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach(step => step.classList.remove('active', 'completed'));
    
    for (let i = 1; i <= currentStep; i++) {
        const stepId = i === 1 ? 'stepRole' : i === 2 ? 'stepDetails' : 'stepComplete';
        const step = document.getElementById(stepId);
        if (step) {
            if (i < currentStep) step.classList.add('completed');
            else if (i === currentStep) step.classList.add('active');
        }
    }
}

function checkPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    const strengthBar = document.getElementById('strengthBar');
    
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    updateRequirement('reqLength', hasLength);
    updateRequirement('reqUpper', hasUpper);
    updateRequirement('reqLower', hasLower);
    updateRequirement('reqNumber', hasNumber);
    updateRequirement('reqSpecial', hasSpecial);
    
    let strength = 0;
    if (hasLength) strength++;
    if (hasUpper) strength++;
    if (hasLower) strength++;
    if (hasNumber) strength++;
    if (hasSpecial) strength++;
    
    if (strengthBar) {
        strengthBar.className = 'strength-bar';
        if (strength <= 2) strengthBar.classList.add('weak');
        else if (strength <= 4) strengthBar.classList.add('medium');
        else strengthBar.classList.add('strong');
    }
}

function updateRequirement(elementId, isValid) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('valid', 'invalid');
        element.classList.add(isValid ? 'valid' : 'invalid');
    }
}

function validateForm() {
    const name = document.getElementById('name')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const terms = document.getElementById('terms')?.checked || false;
    
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const passwordValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
    
    let isValid = true;
    
    if (name.length < 2) {
        showError('nameError', 'Name must be at least 2 characters');
        isValid = false;
    } else {
        clearError('nameError');
    }
    
    if (!validateEmail(email)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
    } else {
        clearError('emailError');
    }
    
    if (!passwordValid) isValid = false;
    
    if (password !== confirmPassword) {
        showError('confirmError', 'Passwords do not match');
        isValid = false;
    } else {
        clearError('confirmError');
    }
    
    if (selectedRole === 'student') {
        const rollno = document.getElementById('rollno')?.value.trim() || '';
        const batch = document.getElementById('batch')?.value || '';
        const department = document.getElementById('department')?.value || '';
        
        if (!rollno) {
            showError('rollnoError', 'Roll number is required');
            isValid = false;
        } else {
            clearError('rollnoError');
        }
        
        if (!batch) {
            showError('batchError', 'Please select batch year');
            isValid = false;
        } else {
            clearError('batchError');
        }
        
        if (!department) {
            showError('departmentError', 'Please select department');
            isValid = false;
        } else {
            clearError('departmentError');
        }
    } else if (selectedRole === 'lecturer') {
        const empid = document.getElementById('empid')?.value.trim() || '';
        const department = document.getElementById('lecturerDepartment')?.value || '';
        
        if (!empid) {
            showError('empidError', 'Employee ID is required');
            isValid = false;
        } else {
            clearError('empidError');
        }
        
        if (!department) {
            showError('lecturerDeptError', 'Please select department');
            isValid = false;
        } else {
            clearError('lecturerDeptError');
        }
    }
    
    if (!terms) {
        showError('termsError', 'You must agree to the terms');
        isValid = false;
    } else {
        clearError('termsError');
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) submitBtn.disabled = !isValid;
    
    return isValid;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

async function signup() {
    if (!validateForm()) {
        showStatusMessage('Please fix the errors in the form', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Creating Account...</span>';
    }
    
    const data = {
        role: selectedRole,
        name: document.getElementById('name')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim() || '',
        password: document.getElementById('password')?.value || ''
    };
    
    if (selectedRole === 'student') {
        data.student_id = document.getElementById('rollno')?.value.trim() || '';
        data.batch = document.getElementById('batch')?.value || '';
        data.department = document.getElementById('department')?.value || '';
    } else {
        data.lecturer_id = document.getElementById('empid')?.value.trim() || '';
        data.department = document.getElementById('lecturerDepartment')?.value || '';
    }
    
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessStep(data);
        } else {
            showStatusMessage(result.message || 'Signup failed', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="btn-icon">✅</span><span>Create Account</span>';
            }
        }
    } catch (error) {
        console.error('Signup error:', error);
        showStatusMessage('Network error. Please try again.', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-icon">✅</span><span>Create Account</span>';
        }
    }
}

function showSuccessStep(userData) {
    const detailsStep = document.getElementById('detailsStep');
    const completeStep = document.getElementById('completeStep');
    
    if (detailsStep) detailsStep.classList.remove('active');
    if (completeStep) completeStep.classList.add('active');
    
    currentStep = 3;
    updateProgress();
    
    const stepComplete = document.getElementById('stepComplete');
    if (stepComplete) stepComplete.classList.add('completed');
    
    const accountInfo = document.getElementById('accountInfo');
    if (accountInfo) {
        accountInfo.innerHTML = `
            <div class="account-detail"><strong>Name:</strong> ${userData.name}</div>
            <div class="account-detail"><strong>Email:</strong> ${userData.email}</div>
            <div class="account-detail"><strong>Role:</strong> ${selectedRole === 'student' ? 'Student' : 'Lecturer'}</div>
            ${selectedRole === 'student' ? `
                <div class="account-detail"><strong>Roll No:</strong> ${userData.student_id}</div>
                <div class="account-detail"><strong>Batch:</strong> ${userData.batch}</div>
                <div class="account-detail"><strong>Department:</strong> ${userData.department}</div>
            ` : `
                <div class="account-detail"><strong>Employee ID:</strong> ${userData.lecturer_id}</div>
                <div class="account-detail"><strong>Department:</strong> ${userData.department}</div>
            `}
            <div class="account-note">
                <p>📧 A confirmation email has been sent to your email address.</p>
                <p>🔐 You can now login with your credentials.</p>
            </div>
        `;
    }
}

function goToLogin() {
    window.location.href = '/login.html';
}

function goToHome() {
    window.location.href = '/';
}

// Add these improvements to signup.js

// Enhanced password toggle with better accessibility
function setupPasswordToggles() {
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirm = document.getElementById('toggleConfirmPassword');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    
    function toggleVisibility(input, button) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        const icon = button.querySelector('i');
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        
        // Announce for screen readers
        const announcement = type === 'text' ? 'Password visible' : 'Password hidden';
        const ariaLive = document.createElement('div');
        ariaLive.setAttribute('aria-live', 'polite');
        ariaLive.classList.add('sr-only');
        ariaLive.textContent = announcement;
        document.body.appendChild(ariaLive);
        setTimeout(() => ariaLive.remove(), 1000);
    }
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => toggleVisibility(passwordInput, togglePassword));
    }
    
    if (toggleConfirm && confirmInput) {
        toggleConfirm.addEventListener('click', () => toggleVisibility(confirmInput, toggleConfirm));
    }
}

// Enhanced password strength with visual feedback
function checkPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    const strengthBar = document.getElementById('strengthBar');
    
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    updateRequirement('reqLength', hasLength);
    updateRequirement('reqUpper', hasUpper);
    updateRequirement('reqLower', hasLower);
    updateRequirement('reqNumber', hasNumber);
    updateRequirement('reqSpecial', hasSpecial);
    
    let strength = 0;
    if (hasLength) strength++;
    if (hasUpper) strength++;
    if (hasLower) strength++;
    if (hasNumber) strength++;
    if (hasSpecial) strength++;
    
    if (strengthBar) {
        strengthBar.className = 'strength-bar';
        if (strength <= 2) {
            strengthBar.classList.add('weak');
            strengthBar.style.width = '33%';
        } else if (strength <= 4) {
            strengthBar.classList.add('medium');
            strengthBar.style.width = '66%';
        } else {
            strengthBar.classList.add('strong');
            strengthBar.style.width = '100%';
        }
    }
    
    // Update password match check if confirm password exists
    const confirmPassword = document.getElementById('confirmPassword');
    if (confirmPassword && confirmPassword.value) {
        checkPasswordMatch();
    }
}

// Enhanced password match check
function checkPasswordMatch() {
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    const confirmError = document.getElementById('confirmError');
    
    if (!confirmPassword) {
        if (confirmError) confirmError.textContent = '';
        return;
    }
    
    if (password !== confirmPassword) {
        showError('confirmError', 'Passwords do not match');
        return false;
    } else {
        clearError('confirmError');
        return true;
    }
}

// Enhanced updateRequirement with icons
function updateRequirement(elementId, isValid) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('valid', 'invalid');
        element.classList.add(isValid ? 'valid' : 'invalid');
        const icon = element.querySelector('i');
        if (icon) {
            icon.className = isValid ? 'fas fa-check-circle' : 'fas fa-times-circle';
        }
    }
}

// Enhanced showError with icon
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        element.style.display = 'block';
    }
}

// Enhanced clearError
function clearError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
        element.style.display = 'none';
    }
}

// Enhanced showStatusMessage with icon
function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    if (statusDiv) {
        statusDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        statusDiv.className = `status-message ${type}`;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// Add real-time validation for email
function setupEmailValidation() {
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            const isValid = validateEmail(this.value);
            if (isValid) {
                this.style.borderColor = '#10b981';
                clearError('emailError');
            } else if (this.value) {
                this.style.borderColor = '#ef4444';
                showError('emailError', 'Please enter a valid email address');
            } else {
                this.style.borderColor = '#e2e8f0';
                clearError('emailError');
            }
        });
    }
}

// Add real-time validation for name
function setupNameValidation() {
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.addEventListener('input', function() {
            if (this.value.length >= 2) {
                this.style.borderColor = '#10b981';
                clearError('nameError');
            } else if (this.value) {
                this.style.borderColor = '#ef4444';
                showError('nameError', 'Name must be at least 2 characters');
            } else {
                this.style.borderColor = '#e2e8f0';
                clearError('nameError');
            }
        });
    }
}

// Enhanced initializeSignupPage
function initializeSignupPage() {
    console.log('Signup page initialized');
    
    // Role selection
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectRole(this.dataset.role);
        });
        // Add keyboard accessibility
        option.setAttribute('tabindex', '0');
        option.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectRole(this.dataset.role);
            }
        });
    });
    
    // Form validation
    const nameInput = document.getElementById('name');
    if (nameInput) nameInput.addEventListener('input', validateForm);
    
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.addEventListener('input', validateForm);
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength();
            validateForm();
        });
    }
    
    const confirmInput = document.getElementById('confirmPassword');
    if (confirmInput) confirmInput.addEventListener('input', validateForm);
    
    const termsCheckbox = document.getElementById('terms');
    if (termsCheckbox) termsCheckbox.addEventListener('change', validateForm);
    
    // Role-specific fields
    const rollno = document.getElementById('rollno');
    if (rollno) rollno.addEventListener('input', validateForm);
    
    const batch = document.getElementById('batch');
    if (batch) batch.addEventListener('change', validateForm);
    
    const department = document.getElementById('department');
    if (department) department.addEventListener('change', validateForm);
    
    const empid = document.getElementById('empid');
    if (empid) empid.addEventListener('input', validateForm);
    
    const lecturerDept = document.getElementById('lecturerDepartment');
    if (lecturerDept) lecturerDept.addEventListener('change', validateForm);
    
    // Setup additional validations
    setupPasswordToggles();
    setupEmailValidation();
    setupNameValidation();
}

// Add screen reader support class
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

// Make functions available globally
window.nextStep = nextStep;
window.prevStep = prevStep;
window.signup = signup;
window.goToLogin = goToLogin;
window.goToHome = goToHome;
