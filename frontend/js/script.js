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

// ================= AUTH / NAVBAR =================

async function updateAuthArea() {
    const authArea = document.getElementById("auth-area");
    if (!authArea) return;

    try {
        const response = await fetch("/api/login-status");
        const data = await response.json();

        if (data.logged_in) {
            // User is logged in
            authArea.innerHTML = `
                <span class="user-name">👤 ${data.name} (${data.role})</span>
                <a href="/profile" class="nav-btn">Profile</a>
                <button class="logout-btn" id="logoutBtn">Logout</button>
            `;

            document.getElementById("logoutBtn").addEventListener("click", logoutUser);

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
                    </div>
                `;
                
                heroButtons.innerHTML = `
                    <a href="/login.html" class="btn primary-btn">Login</a>
                    <a href="/signup.html" class="btn secondary-btn">Sign Up</a>
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
}

async function loginUser() {
    const role = document.getElementById("role").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

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
        alert("Login failed");
    }
}

// ================= INITIALIZE =================

document.addEventListener('DOMContentLoaded', () => {
    console.log("script.js loaded");

    // Always update auth area and navigation
    updateAuthArea();
    updateNavigation();
    
    // Update home page content if on home page
    if (window.location.pathname === '/') {
        updateHomeContent();
    }
    
    // Initialize login page if on login page
    if (window.location.pathname.includes('login.html')) {
        initializeLoginPage();
    }
    
    // Update navbar on all pages
    setInterval(updateAuthArea, 60000); // Update every minute
});

// Make functions available globally
window.updateAuthArea = updateAuthArea;
window.updateNavigation = updateNavigation;
window.logoutUser = logoutUser;