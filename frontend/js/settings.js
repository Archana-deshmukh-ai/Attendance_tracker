// CORRECTED SETTINGS.JS - Matches your database columns

document.addEventListener('DOMContentLoaded', function() {
    loadStudentData();
    setupNavigation();
});

async function loadStudentData() {
    console.log('Loading student data...');
    
    try {
        const response = await fetch('/api/current-student');
        const data = await response.json();
        
        if (data.success) {
            const s = data.student;
            
            // Update header
            document.getElementById('displayName').textContent = s.name;
            document.getElementById('userRole').textContent = 'Student';
            document.getElementById('userEmail').textContent = s.email;
            
            // Update form fields (no semester field)
            document.getElementById('fullName').value = s.name;
            document.getElementById('email').value = s.email;
            document.getElementById('studentId').value = s.student_id;
            document.getElementById('department').value = s.department || '';
            document.getElementById('batch').value = s.batch || '';
            
            // Avatar
            const avatar = document.getElementById('profileAvatar');
            if (avatar) {
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=102094&color=fff`;
            }
            
            // Show student fields
            document.body.classList.add('student');
            
            console.log('Loaded student:', s.name);
        } else {
            document.querySelector('.settings-container').innerHTML = `
                <div style="text-align:center; padding:50px">
                    <h2>${data.message || 'Please login as student'}</h2>
                    <a href="/" style="color:#102094">Go to Home</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        document.querySelector('.settings-container').innerHTML = `
            <div style="text-align:center; padding:50px">
                <h2>Error Loading Data</h2>
                <p>Make sure server is running</p>
                <a href="/" style="color:#102094">Go to Home</a>
            </div>
        `;
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            this.classList.add('active');
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
        });
    });
}

function saveProfile() { alert('Profile saved!'); }
function saveAllSettings() { alert('All settings saved!'); }
function changePassword() { alert('Password change feature coming soon'); }
function deleteAccount() { if(confirm('Delete account?')) alert('Contact admin'); }
function togglePassword(id) { 
    const i = document.getElementById(id); 
    if(i) i.type = i.type === 'password' ? 'text' : 'password';
}

window.saveProfile = saveProfile;
window.saveAllSettings = saveAllSettings;
window.changePassword = changePassword;
window.deleteAccount = deleteAccount;
window.togglePassword = togglePassword;