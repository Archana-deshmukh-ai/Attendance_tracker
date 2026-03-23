// timetable.js

// Original subject data
const subjects = [
    { id: 1, code: 'CS101', name: 'Data Structures', credits: 4, department: 'CSE' },
    { id: 2, code: 'CS102', name: 'Algorithms', credits: 4, department: 'CSE' },
    { id: 3, code: 'EC201', name: 'Digital Electronics', credits: 3, department: 'ECE' },
    { id: 4, code: 'ME301', name: 'Thermodynamics', credits: 4, department: 'ME' },
    { id: 5, code: 'CE401', name: 'Structural Analysis', credits: 3, department: 'CE' },
    { id: 6, code: 'EE501', name: 'Power Systems', credits: 4, department: 'EEE' }
];

// Department full names
const deptFullNames = {
    'CSE': 'Computer Science & Engineering',
    'ECE': 'Electronics & Communication Engg',
    'ME': 'Mechanical Engineering',
    'CE': 'Civil Engineering',
    'EEE': 'Electrical & Electronics Engg'
};

// Department icons
const deptIcons = {
    'CSE': 'fa-solid fa-laptop-code',
    'ECE': 'fa-solid fa-microchip',
    'ME': 'fa-solid fa-gears',
    'CE': 'fa-solid fa-helmet-safety',
    'EEE': 'fa-solid fa-bolt'
};

// Expanded subject pool for variety
const subjectPool = {
    'CSE': [
        { code: 'CS201', name: 'Database Systems', credits: 4 },
        { code: 'CS301', name: 'Operating Systems', credits: 4 },
        { code: 'CS401', name: 'Computer Networks', credits: 3 },
        { code: 'CS501', name: 'Artificial Intelligence', credits: 4 },
        { code: 'CS601', name: 'Compiler Design', credits: 3 }
    ],
    'ECE': [
        { code: 'EC301', name: 'Analog Circuits', credits: 4 },
        { code: 'EC401', name: 'Digital Signal Proc.', credits: 4 },
        { code: 'EC501', name: 'VLSI Design', credits: 3 },
        { code: 'EC601', name: 'Embedded Systems', credits: 4 },
        { code: 'EC701', name: 'Wireless Comm.', credits: 3 }
    ],
    'ME': [
        { code: 'ME401', name: 'Fluid Mechanics', credits: 4 },
        { code: 'ME501', name: 'Heat Transfer', credits: 4 },
        { code: 'ME601', name: 'Manufacturing Tech', credits: 3 },
        { code: 'ME701', name: 'CAD/CAM', credits: 4 },
        { code: 'ME801', name: 'Robotics', credits: 3 }
    ],
    'CE': [
        { code: 'CE501', name: 'Geotechnical Engg', credits: 4 },
        { code: 'CE601', name: 'Transportation Engg', credits: 4 },
        { code: 'CE701', name: 'Environmental Engg', credits: 3 },
        { code: 'CE801', name: 'Hydrology', credits: 4 },
        { code: 'CE901', name: 'Construction Mgmt', credits: 3 }
    ],
    'EEE': [
        { code: 'EE601', name: 'Control Systems', credits: 4 },
        { code: 'EE701', name: 'Electrical Machines', credits: 4 },
        { code: 'EE801', name: 'Power Electronics', credits: 3 },
        { code: 'EE901', name: 'Renewable Energy', credits: 4 },
        { code: 'EE951', name: 'Smart Grids', credits: 3 }
    ]
};

// Get current day name
function getCurrentDay() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    return days[today.getDay()];
}

// Generate daily schedule for a department
function getDailySubjects(dept) {
    const dayOfWeek = new Date().getDay();
    const baseSubjects = subjects.filter(s => s.department === dept);
    const pool = subjectPool[dept] || [];
    const allAvailable = [...baseSubjects, ...pool];
    
    const startIndex = dayOfWeek % allAvailable.length;
    const selected = [];
    
    for (let i = 0; i < 4; i++) {
        const index = (startIndex + i * 2) % allAvailable.length;
        selected.push(allAvailable[index]);
    }
    
    while (selected.length < 4) {
        selected.push({ 
            code: `${dept}99X`, 
            name: 'Special Topic', 
            credits: 3 
        });
    }
    
    return selected.slice(0, 4);
}

// Render timetable for selected department
function renderTimetable(dept) {
    const container = document.getElementById('timetableContainer');
    if (!container) return;
    
    const currentDay = getCurrentDay();
    const subjects = getDailySubjects(dept);
    
    let html = `
        <div class="dept-card">
            <div class="dept-header">
                <div class="dept-icon">
                    <i class="${deptIcons[dept] || 'fa-solid fa-book'}"></i>
                </div>
                <div class="dept-title">
                    <div class="dept-code">${dept}</div>
                    <div class="dept-name">${deptFullNames[dept]}</div>
                </div>
            </div>
            
            <div class="schedule-day">
                <i class="fas fa-calendar-day"></i> ${currentDay}'s Schedule
            </div>
            
            <ul class="subject-list">
    `;
    
    subjects.forEach((subject, index) => {
        html += `
            <li class="subject-item" style="--i: ${index + 1}">
                <span class="subject-code">${subject.code}</span>
                <span class="subject-name">${subject.name}</span>
                <span class="subject-credits">${subject.credits} cr</span>
            </li>
        `;
    });
    
    html += `
            </ul>
        </div>
    `;
    
    container.innerHTML = `<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading schedule...</div>`;
    
    setTimeout(() => {
        container.innerHTML = html;
    }, 400);
}

// Update day display
function updateDayDisplay() {
    const dayElement = document.getElementById('currentDay');
    if (dayElement) {
        dayElement.innerHTML = `<i class="fas fa-sun"></i> ${getCurrentDay()}`;
    }
}

// Mobile menu toggle
function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            
            // Toggle icon
            const icon = menuToggle.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuToggle.contains(e.target) && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Close menu when clicking a nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            });
        });
    }
}

// Set active nav link based on current page
function setActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        // Remove active class from all
        link.classList.remove('active');
        
        // Add active class to Home link by default (since we're on timetable page)
        if (link.querySelector('span').textContent === 'Home') {
            link.classList.add('active');
        }
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    const deptSelect = document.getElementById('deptSelect');
    
    // Set default to CSE
    if (deptSelect) {
        deptSelect.value = 'CSE';
        renderTimetable('CSE');
        
        deptSelect.addEventListener('change', (e) => {
            renderTimetable(e.target.value);
        });
    }
    
    updateDayDisplay();
    setupMobileMenu();
    setActiveNavLink();
    
    // Auto-refresh at midnight
    const now = new Date();
    const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
    );
    const msToMidnight = night.getTime() - now.getTime();
    
    setTimeout(() => {
        window.location.reload();
    }, msToMidnight);
});