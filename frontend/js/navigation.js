// navigation.js - For enhanced navigation
document.addEventListener('DOMContentLoaded', function() {
    // Update navigation based on login status
    updateNavigation();
    updateAuthArea();
});

async function updateNavigation() {
    const navLinks = document.getElementById("nav-links");
    if (!navLinks) return;

    try {
        const response = await fetch("/api/login-status");
        const data = await response.json();

        let navHTML = '';
        
        if (data.logged_in) {
            // User-specific navigation
            navHTML += `<a href="/"><i class="fas fa-home"></i> Home</a>`;
            
            if (data.role === 'lecturer') {
                navHTML += `<a href="/mark-attendance" class="active">
                    <i class="fas fa-edit"></i> Mark Attendance</a>`;
                navHTML += `<a href="/lecturer-dashboard">
                    <i class="fas fa-tachometer-alt"></i> Dashboard</a>`;
            } else if (data.role === 'student') {
                navHTML += `<a href="/student-dashboard">
                    <i class="fas fa-tachometer-alt"></i> Student Dashboard</a>`;
            }
            
            navHTML += `<a href="/report">
                <i class="fas fa-chart-bar"></i> Reports</a>`;
            navHTML += `<a href="/about">
                <i class="fas fa-info-circle"></i> About</a>`;
        } else {
            // Default navigation for non-logged in users
            navHTML = `
                <a href="/"><i class="fas fa-home"></i> Home</a>
                <a href="/about"><i class="fas fa-info-circle"></i> About</a>
                <a href="/login.html"><i class="fas fa-sign-in-alt"></i> Login</a>
                <a href="/signup.html"><i class="fas fa-user-plus"></i> Sign Up</a>
            `;
        }
        
        navLinks.innerHTML = navHTML;
        
        // Highlight active page
        const currentPath = window.location.pathname;
        navLinks.querySelectorAll('a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath || 
                (currentPath.includes('mark-attendance') && link.href.includes('mark-attendance'))) {
                link.classList.add('active');
            }
        });
        
    } catch (error) {
        console.error("Navigation update failed:", error);
    }
}

async function updateAuthArea() {
    const authArea = document.getElementById("auth-area");
    if (!authArea) return;

    try {
        const response = await fetch("/api/login-status");
        const data = await response.json();

        if (data.logged_in) {
            // User is logged in
            authArea.innerHTML = `
                <span class="user-name">
                    <i class="fas fa-user"></i> ${data.name} (${data.role})
                </span>
                <a href="/profile" class="nav-btn">
                    <i class="fas fa-user-circle"></i> Profile
                </a>
                <button class="logout-btn" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            `;

            document.getElementById("logoutBtn").addEventListener("click", logoutUser);

        } else {
            // User is not logged in
            authArea.innerHTML = `
                <a href="/login.html" class="nav-btn">
                    <i class="fas fa-sign-in-alt"></i> Sign In
                </a>
                <a href="/signup.html" class="nav-btn signup">
                    <i class="fas fa-user-plus"></i> Sign Up
                </a>
            `;
        }
    } catch (error) {
        console.error("Auth check failed:", error);
    }
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