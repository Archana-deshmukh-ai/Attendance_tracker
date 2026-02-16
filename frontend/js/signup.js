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
    document.querySelectorAll('.role-option').forEach(option => {
        option.addEventListener('click', function() {
            selectRole(this.dataset.role);
        });
    });
    
    // Form validation
    document.getElementById('name').addEventListener('input', validateForm);
    document.getElementById('email').addEventListener('input', validateForm);
    document.getElementById('password').addEventListener('input', function() {
        checkPasswordStrength();
        validateForm();
    });
    document.getElementById('confirmPassword').addEventListener('input', validateForm);
    document.getElementById('terms').addEventListener('change', validateForm);
    
    // Role-specific fields
    document.getElementById('rollno')?.addEventListener('input', validateForm);
    document.getElementById('batch')?.addEventListener('change', validateForm);
    document.getElementById('department')?.addEventListener('change', validateForm);
    document.getElementById('empid')?.addEventListener('input', validateForm);
    document.getElementById('lecturerDepartment')?.addEventListener('change', validateForm);
}

function selectRole(role) {
    selectedRole = role;
    
    // Update UI
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.role === role) {
            option.classList.add('selected');
        }
    });
    
    // Show/hide role-specific fields
    if (role === 'student') {
        document.getElementById('studentFields').style.display = 'block';
        document.getElementById('lecturerFields').style.display = 'none';
    } else if (role === 'lecturer') {
        document.getElementById('studentFields').style.display = 'none';
        document.getElementById('lecturerFields').style.display = 'block';
    }
    
    // Enable next button
    document.querySelector('.next-btn').disabled = false;
    
    // Update progress
    document.getElementById('stepRole').classList.add('completed');
    document.getElementById('stepDetails').classList.add('active');
}

function nextStep() {
    if (!selectedRole) return;
    
    // Hide current step, show next step
    document.getElementById('roleStep').classList.remove('active');
    document.getElementById('detailsStep').classList.add('active');
    
    // Update progress
    currentStep = 2;
    updateProgress();
}

function prevStep() {
    // Hide current step, show previous step
    document.getElementById('detailsStep').classList.remove('active');
    document.getElementById('roleStep').classList.add('active');
    
    // Update progress
    currentStep = 1;
    updateProgress();
}

function updateProgress() {
    // Update step indicators
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    for (let i = 1; i <= currentStep; i++) {
        const step = document.getElementById(`step${i === 1 ? 'Role' : i === 2 ? 'Details' : 'Complete'}`);
        if (i < currentStep) {
            step.classList.add('completed');
        } else if (i === currentStep) {
            step.classList.add('active');
        }
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('password').value;
    const strengthBar = document.getElementById('strengthBar');
    
    // Check requirements
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    // Update requirement indicators
    updateRequirement('reqLength', hasLength);
    updateRequirement('reqUpper', hasUpper);
    updateRequirement('reqLower', hasLower);
    updateRequirement('reqNumber', hasNumber);
    updateRequirement('reqSpecial', hasSpecial);
    
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
}

function updateRequirement(elementId, isValid) {
    const element = document.getElementById(elementId);
    element.classList.remove('valid', 'invalid');
    element.classList.add(isValid ? 'valid' : 'invalid');
}

function validateForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;
    
    // Password strength requirements
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const passwordValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
    
    // Basic validation
    let isValid = true;
    
    // Name validation
    if (name.length < 2) {
        showError('nameError', 'Name must be at least 2 characters');
        isValid = false;
    } else {
        clearError('nameError');
    }
    
    // Email validation
    if (!validateEmail(email)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
    } else {
        clearError('emailError');
    }
    
    // Password validation (using all criteria)
    if (!passwordValid) {
        // We don't show a separate error; the requirement list is enough
        isValid = false;
    }
    
    // Confirm password
    if (password !== confirmPassword) {
        showError('confirmError', 'Passwords do not match');
        isValid = false;
    } else {
        clearError('confirmError');
    }
    
    // Role-specific validation
    if (selectedRole === 'student') {
        const rollno = document.getElementById('rollno').value.trim();
        const batch = document.getElementById('batch').value;
        const department = document.getElementById('department').value;
        
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
        const empid = document.getElementById('empid').value.trim();
        const department = document.getElementById('lecturerDepartment').value;
        
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
    
    // Terms agreement
    if (!terms) {
        showError('termsError', 'You must agree to the terms');
        isValid = false;
    } else {
        clearError('termsError');
    }
    
    // Enable/disable submit button
    document.querySelector('.submit-btn').disabled = !isValid;
    
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
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

async function signup() {
    if (!validateForm()) {
        showStatusMessage('Please fix the errors in the form', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Creating Account...</span>';
    
    // Prepare data with correct field names for backend
    const data = {
        role: selectedRole,
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };
    
    // Add role-specific data
    if (selectedRole === 'student') {
        data.student_id = document.getElementById('rollno').value.trim();   // map rollno to student_id
        data.batch = document.getElementById('batch').value;
        data.department = document.getElementById('department').value;
    } else {
        data.lecturer_id = document.getElementById('empid').value.trim();   // map empid to lecturer_id
        data.department = document.getElementById('lecturerDepartment').value;
    }
    
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success step
            showSuccessStep(data);
        } else {
            showStatusMessage(result.message || 'Signup failed', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-icon">✅</span><span>Create Account</span>';
        }
    } catch (error) {
        console.error('Signup error:', error);
        showStatusMessage('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-icon">✅</span><span>Create Account</span>';
    }
}

function showSuccessStep(userData) {
    // Hide current step, show success step
    document.getElementById('detailsStep').classList.remove('active');
    document.getElementById('completeStep').classList.add('active');
    
    // Update progress
    currentStep = 3;
    updateProgress();
    document.getElementById('stepComplete').classList.add('completed');
    
    // Display account info
    const accountInfo = document.getElementById('accountInfo');
    accountInfo.innerHTML = `
        <div class="account-detail">
            <strong>Name:</strong> ${userData.name}
        </div>
        <div class="account-detail">
            <strong>Email:</strong> ${userData.email}
        </div>
        <div class="account-detail">
            <strong>Role:</strong> ${selectedRole === 'student' ? 'Student' : 'Lecturer'}
        </div>
        ${selectedRole === 'student' ? `
            <div class="account-detail">
                <strong>Roll No:</strong> ${userData.student_id}
            </div>
            <div class="account-detail">
                <strong>Batch:</strong> ${userData.batch}
            </div>
            <div class="account-detail">
                <strong>Department:</strong> ${userData.department}
            </div>
        ` : `
            <div class="account-detail">
                <strong>Employee ID:</strong> ${userData.lecturer_id}
            </div>
            <div class="account-detail">
                <strong>Department:</strong> ${userData.department}
            </div>
        `}
        <div class="account-note">
            <p>📧 A confirmation email has been sent to your email address.</p>
            <p>🔐 You can now login with your credentials.</p>
        </div>
    `;
}

function goToLogin() {
    window.location.href = '/login.html';
}

function goToHome() {
    window.location.href = '/';
}

// Make functions available globally
window.nextStep = nextStep;
window.prevStep = prevStep;
window.signup = signup;
window.goToLogin = goToLogin;
window.goToHome = goToHome;