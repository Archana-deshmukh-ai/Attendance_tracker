// frontend/js/script.js

// ================= API BASE URL =================
const API_BASE_URL = 'http://localhost:5000/api';

// ================= COMMON FETCH FUNCTIONS =================

// Fetch all students
async function fetchStudents() {
    try {
        const response = await fetch(`${API_BASE_URL}/students`);
        if (!response.ok) throw new Error('Failed to fetch students');
        return await response.json();
    } catch (error) {
        console.error('Error fetching students:', error);
        return { success: false, students: [] };
    }
}

// Fetch all subjects
async function fetchSubjects() {
    try {
        const response = await fetch(`${API_BASE_URL}/subjects`);
        if (!response.ok) throw new Error('Failed to fetch subjects');
        return await response.json();
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return { success: false, subjects: [] };
    }
}

// Fetch all lecturers
async function fetchLecturers() {
    try {
        const response = await fetch(`${API_BASE_URL}/lecturers`);
        if (!response.ok) throw new Error('Failed to fetch lecturers');
        return await response.json();
    } catch (error) {
        console.error('Error fetching lecturers:', error);
        return { success: false, lecturers: [] };
    }
}

// Fetch attendance data
async function fetchAttendance() {
    try {
        const response = await fetch(`${API_BASE_URL}/attendance`);
        if (!response.ok) throw new Error('Failed to fetch attendance');
        return await response.json();
    } catch (error) {
        console.error('Error fetching attendance:', error);
        return { success: false, attendance: [] };
    }
}

// ================= NEW HOME PAGE FEATURES =================

// Live statistics animation
async function updateLiveStats() {
    try {
        const [studentsRes, lecturersRes, attendanceRes, subjectsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/students`),
            fetch(`${API_BASE_URL}/lecturers`),
            fetch(`${API_BASE_URL}/attendance`),
            fetch(`${API_BASE_URL}/subjects`)
        ]);
        
        const studentsData = await studentsRes.json();
        const lecturersData = await lecturersRes.json();
        const attendanceData = await attendanceRes.json();
        const subjectsData = await subjectsRes.json();
        
        const stats = {
            students: studentsData.students?.length || 0,
            lecturers: lecturersData.lecturers?.length || 0,
            attendance: attendanceData.attendance?.length || 0,
            subjects: subjectsData.subjects?.length || 0
        };
        
        // Animate counting up
        Object.keys(stats).forEach(key => {
            const element = document.getElementById(`${key}Count`);
            if (element) animateCount(element, stats[key]);
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        // Set default values if API fails
        const defaultStats = {
            studentCount: 0,
            lecturerCount: 0,
            attendanceCount: 0,
            subjectsCount: 0
        };
        Object.keys(defaultStats).forEach(key => {
            const element = document.getElementById(key);
            if (element) animateCount(element, defaultStats[key]);
        });
    }
}

function animateCount(element, target) {
    if (!element) return;
    
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 20);
}

// Interactive demo tabs
function initDemoTabs() {
    const tabs = document.querySelectorAll('.demo-tab');
    const panels = document.querySelectorAll('.demo-panel');
    
    if (tabs.length === 0) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.target;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show target panel, hide others
            panels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === targetId) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

// Initialize mini chart
function initMiniChart() {
    const ctx = document.getElementById('miniChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Attendance %',
                data: [85, 88, 82, 90, 87, 80],
                borderColor: '#102094',
                backgroundColor: 'rgba(16, 32, 148, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        display: false
                    },
                    ticks: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// FAQ Accordion
function initFAQAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    if (faqQuestions.length === 0) return;
    
    // Initially collapse all answers
    faqQuestions.forEach(question => {
        const answer = question.nextElementSibling;
        const toggle = question.querySelector('.faq-toggle');
        if (answer) {
            answer.style.maxHeight = '0';
            answer.style.overflow = 'hidden';
        }
        if (toggle) toggle.textContent = '+';
    });

    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const toggle = question.querySelector('.faq-toggle');
            if (!answer || !toggle) return;
            
            question.parentElement.classList.toggle('active');
            
            if (answer.style.maxHeight !== '0px') {
                answer.style.maxHeight = '0';
                toggle.textContent = '+';
            } else {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                toggle.textContent = '−';
            }
        });
    });
}

// Initialize all home page features
function initHomePageFeatures() {
    updateLiveStats();
    initDemoTabs();
    initMiniChart();
    initFAQAccordion();
}

// ================= AUTH / NAVBAR =================

async function updateAuthArea() {
    const authArea = document.getElementById("auth-area");
    if (!authArea) return;

    try {
        const response = await fetch("/api/login-status");
        const data = await response.json();

        if (data.logged_in) {
            // User is logged in – link to dashboard
            const dashboardUrl = data.role === 'student' ? '/student-dashboard' : '/lecturer-dashboard';
            authArea.innerHTML = `
                <span class="user-name">👤 ${data.name} (${data.role})</span>
                <a href="${dashboardUrl}" class="nav-btn">Dashboard</a>
                <button class="logout-btn" id="logoutBtn">Logout</button>
            `;

            const logoutBtn = document.getElementById("logoutBtn");
            if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

        } else {
            // User is not logged in
            authArea.innerHTML = `
                <a href="/login.html" class="nav-btn">Sign In</a>
                <a href="/signup.html" class="nav-btn signup">Sign Up</a>
            `;
        }
    } catch (error) {
        console.error("Auth check failed:", error);
    }
}

async function updateNavigation() {
    const navLinks = document.getElementById("nav-links");
    if (!navLinks) return;

    try {
        const response = await fetch("/api/login-status");
        const data = await response.json();

        let navHTML = '';
        
        if (data.logged_in) {
            // User-specific navigation
            navHTML += `<a href="/">Home</a>`;
            
            if (data.role === 'lecturer') {
                navHTML += `<a href="/mark-attendance">Mark Attendance</a>`;
                navHTML += `<a href="/lecturer-dashboard">Lecturer Dashboard</a>`;
            } else if (data.role === 'student') {
                navHTML += `<a href="/student-dashboard">Student Dashboard</a>`;
            }
            
            navHTML += `<a href="/report">Reports</a>`;
            navHTML += `<a href="/about">About Us</a>`;
        } else {
            // Default navigation for non-logged in users
            navHTML = `
                <a href="/">Home</a>
                <a href="/about">About Us</a>
                <a href="/login.html">Login</a>
                <a href="/signup.html">Sign Up</a>
            `;
        }
        
        navLinks.innerHTML = navHTML;
        
        // Highlight active page
        const currentPath = window.location.pathname;
        navLinks.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
        
    } catch (error) {
        console.error("Navigation update failed:", error);
    }
}

function updateHomeContent() {
    const heroButtons = document.getElementById('hero-buttons');
    const statusInfo = document.getElementById('status-info');
    
    if (!heroButtons || !statusInfo) return;
    
    fetch("/api/login-status")
        .then(res => res.json())
        .then(data => {
            if (data.logged_in) {
                // User is logged in
                statusInfo.innerHTML = `
                    <div class="status-card">
                        <h3>Welcome back, ${data.name}!</h3>
                        <p>You are logged in as ${data.role}</p>
                        <div class="quick-actions">
                            ${data.role === 'student' 
                                ? '<a href="/student-dashboard" class="btn">Go to Dashboard</a>' 
                                : '<a href="/lecturer-dashboard" class="btn">Go to Dashboard</a>'
                            }
                            <a href="/report" class="btn secondary">View Reports</a>
                        </div>
                    </div>
                `;
                
                if (data.role === 'student') {
                    heroButtons.innerHTML = `
                        <a href="/student-dashboard" class="btn primary-btn">Student Dashboard</a>
                        <a href="/report" class="btn secondary-btn">View My Reports</a>
                    `;
                } else if (data.role === 'lecturer') {
                    heroButtons.innerHTML = `
                        <a href="/lecturer-dashboard" class="btn primary-btn">Lecturer Dashboard</a>
                        <a href="/mark-attendance" class="btn secondary-btn">Mark Attendance</a>
                    `;
                }
            } else {
                // User is not logged in
                statusInfo.innerHTML = `
                    <div class="status-card">
                        <h3>Get Started</h3>
                        <p>Login to access your attendance dashboard</p>
                        <div class="quick-actions">
                            <a href="/login.html" class="btn">Login Now</a>
                            <a href="/signup.html" class="btn secondary">Sign Up Free</a>
                        </div>
                    </div>
                `;
                
                heroButtons.innerHTML = `
                    <a href="/login.html" class="btn primary-btn">Login</a>
                    <a href="/signup.html" class="btn secondary-btn">Sign Up Free</a>
                `;
            }
        })
        .catch(error => {
            console.error("Error updating home content:", error);
        });
}

function logoutUser() {
    fetch("/logout")
        .then(() => {
            window.location.href = "/";
        })
        .catch(error => {
            console.error("Logout error:", error);
            window.location.href = "/logout";
        });
}

// ================= LOGIN PAGE =================

function initializeLoginPage() {
    const loginBtn = document.getElementById("loginBtn");
    if (!loginBtn) return;

    loginBtn.addEventListener("click", loginUser);
    
    // Also handle Enter key press
    const passwordField = document.getElementById("password");
    if (passwordField) {
        passwordField.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                loginUser();
            }
        });
    }
}

async function loginUser() {
    const roleSelect = document.getElementById("role");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    
    if (!roleSelect || !emailInput || !passwordInput) {
        alert("Form elements not found");
        return;
    }
    
    const role = roleSelect.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!role || !email || !password) {
        alert("Please fill all fields");
        return;
    }

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role, email, password })
        });

        const data = await response.json();

        if (data.success) {
            alert("Login successful");

            if (role === "student") {
                window.location.href = "/student-dashboard";
            } else if (role === "lecturer") {
                window.location.href = "/lecturer-dashboard";
            }
        } else {
            alert(data.message || "Invalid credentials");
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Login failed. Please check if the server is running.");
    }
}

// ================= INITIALIZE =================

document.addEventListener('DOMContentLoaded', () => {
    console.log("Enhanced Attendance Atlas loaded");

    // Always update auth area and navigation
    updateAuthArea();
    updateNavigation();
    
    // Update home page content if on home page
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        updateHomeContent();
        initHomePageFeatures();
    }
    
    // Initialize login page if on login page
    if (window.location.pathname.includes('login.html')) {
        initializeLoginPage();
    }
    
    // Update auth area every minute (keeps session info fresh)
    setInterval(updateAuthArea, 60000);
});

// Update the updateNavigation function to include Settings link
async function updateNavigation() {
    const navLinks = document.getElementById("nav-links");
    if (!navLinks) return;

    try {
        const response = await fetch("/api/login-status");
        const data = await response.json();

        let navHTML = '';
        
        if (data.logged_in) {
            // User-specific navigation
            navHTML += `<a href="/">Home</a>`;
            
            if (data.role === 'lecturer') {
                navHTML += `<a href="/mark-attendance">Mark Attendance</a>`;
                navHTML += `<a href="/lecturer-dashboard">Lecturer Dashboard</a>`;
            } else if (data.role === 'student') {
                navHTML += `<a href="/student-dashboard">Student Dashboard</a>`;
            }
            
            navHTML += `<a href="/report">Reports</a>`;
            navHTML += `<a href="/settings">Settings</a>`;  // ADDED: Settings link
            navHTML += `<a href="/about">About Us</a>`;
        } else {
            // Default navigation for non-logged in users
            navHTML = `
                <a href="/">Home</a>
                <a href="/about">About Us</a>
                <a href="/login.html">Login</a>
                <a href="/signup.html">Sign Up</a>
            `;
        }
        
        navLinks.innerHTML = navHTML;
        
        // Highlight active page
        const currentPath = window.location.pathname;
        navLinks.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
        
    } catch (error) {
        console.error("Navigation update failed:", error);
    }
}

// Make functions available globally
window.updateAuthArea = updateAuthArea;
window.updateNavigation = updateNavigation;
window.logoutUser = logoutUser;

// code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }
});
// end of the code for theme.css as for appearance purpose is added in all the html files since it is related to appearance of the website and not specific to any page.