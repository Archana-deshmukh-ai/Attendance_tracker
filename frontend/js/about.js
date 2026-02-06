// frontend/js/about.js

// ================= CONFIGURATION =================
const ABOUT_CONFIG = {
    animationDuration: 1000,
    scrollOffset: 100,
    autoScrollDelay: 500
};

// ================= DOM ELEMENTS =================
const elements = {
    studentsCount: document.getElementById('studentsCount'),
    institutionsCount: document.getElementById('institutionsCount'),
    accuracyCount: document.getElementById('accuracyCount'),
    sessionsCount: document.getElementById('sessionsCount'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    contactForm: document.getElementById('contactForm'),
    starRating: null
};

// ================= INITIALIZATION =================
function initAboutPage() {
    console.log('About page initialized');
    
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
        easing: 'ease-in-out'
    });
    
    // Animate statistics counters
    animateStatistics();
    
    // Initialize tab system
    initTabSystem();
    
    // Initialize contact form
    initContactForm();
    
    // Update navigation
    updateNavigation();
    
    // Update auth area
    updateAuthArea();
    
    // Highlight current page
    highlightCurrentPage();
    
    // Add scroll animations
    initScrollAnimations();
}

// ================= STATISTICS ANIMATION =================
function animateStatistics() {
    const statistics = {
        students: 5000,
        institutions: 50,
        accuracy: 99.9,
        sessions: 100000
    };
    
    // Animate each counter
    if (elements.studentsCount) {
        animateCounter(elements.studentsCount, statistics.students, '+');
    }
    
    if (elements.institutionsCount) {
        animateCounter(elements.institutionsCount, statistics.institutions, '+');
    }
    
    if (elements.accuracyCount) {
        animateCounter(elements.accuracyCount, statistics.accuracy, '%');
    }
    
    if (elements.sessionsCount) {
        animateCounter(elements.sessionsCount, statistics.sessions, '+');
    }
}

function animateCounter(element, target, suffix = '') {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString() + suffix;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString() + suffix;
        }
    }, duration / steps);
}

// ================= TAB SYSTEM =================
function initTabSystem() {
    if (!elements.tabButtons.length) return;
    
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            
            // Remove active class from all buttons
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Hide all panels
            elements.tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Show target panel
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                
                // Add animation effect
                targetPanel.style.opacity = '0';
                targetPanel.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    targetPanel.style.transition = 'opacity 0.5s, transform 0.5s';
                    targetPanel.style.opacity = '1';
                    targetPanel.style.transform = 'translateY(0)';
                }, 50);
            }
        });
    });
}

// ================= CONTACT FORM =================
function initContactForm() {
    if (!elements.contactForm) return;
    
    elements.contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Show loading state
        const submitBtn = this.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        try {
            // Simulate API call (replace with actual API endpoint)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Show success message
            showFormSuccess();
            
            // Reset form
            this.reset();
            
        } catch (error) {
            console.error('Error submitting form:', error);
            showFormError();
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

function showFormSuccess() {
    const successMessage = document.createElement('div');
    successMessage.className = 'form-success';
    successMessage.innerHTML = `
        <div style="background: #d1fae5; color: #065f46; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: center; border: 1px solid #a7f3d0;">
            <i class="fas fa-check-circle"></i>
            <span style="margin-left: 10px;">Thank you! Your message has been sent successfully.</span>
        </div>
    `;
    
    elements.contactForm.appendChild(successMessage);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        if (successMessage.parentNode) {
            successMessage.remove();
        }
    }, 5000);
}

function showFormError() {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'form-error';
    errorMessage.innerHTML = `
        <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: center; border: 1px solid #fecaca;">
            <i class="fas fa-exclamation-circle"></i>
            <span style="margin-left: 10px;">Something went wrong. Please try again.</span>
        </div>
    `;
    
    elements.contactForm.appendChild(errorMessage);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        if (errorMessage.parentNode) {
            errorMessage.remove();
        }
    }, 5000);
}

// ================= SCROLL ANIMATIONS =================
function initScrollAnimations() {
    // Add parallax effect to hero
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.about-hero');
        
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
    
    // Add intersection observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, observerOptions);
    
    // Observe all feature cards and process steps
    document.querySelectorAll('.feature-card, .process-step, .tech-card').forEach(el => {
        observer.observe(el);
    });
}

// ================= NAVIGATION HELPERS =================
function updateNavigation() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    // Set navigation for non-logged in state
    navLinks.innerHTML = `
        <a href="/">Home</a>
        <a href="/about">About Us</a>
        <a href="/login.html">Login</a>
        <a href="/signup.html">Sign Up</a>
    `;
}

function updateAuthArea() {
    const authArea = document.getElementById('auth-area');
    if (!authArea) return;
    
    // Show login/signup buttons
    authArea.innerHTML = `
        <a href="/login.html" class="nav-btn">Sign In</a>
        <a href="/signup.html" class="nav-btn signup">Sign Up</a>
    `;
}

function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.getElementById('nav-links');
    
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
}

// ================= UTILITY FUNCTIONS =================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ================= INITIALIZE ON LOAD =================
document.addEventListener('DOMContentLoaded', initAboutPage);

// ================= EXPORT FUNCTIONS =================
window.initAboutPage = initAboutPage;
window.animateStatistics = animateStatistics;