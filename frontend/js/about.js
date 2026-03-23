// frontend/js/about.js

// ================= CONFIGURATION =================
const ABOUT_CONFIG = {
    animationDuration: 1000,
    scrollOffset: 100,
    autoScrollDelay: 500
};

// ================= DOM ELEMENTS =================
let elements = {
    studentsCount: null,
    institutionsCount: null,
    accuracyCount: null,
    sessionsCount: null,
    tabButtons: [],
    tabPanels: [],
    contactForm: null
};

// ================= INITIALIZATION =================
function initAboutPage() {
    console.log('About page initialized');
    
    cacheElements();
    
    // Check if AOS is available
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100,
            easing: 'ease-in-out'
        });
    }
    
    // Animate statistics counters
    animateStatistics();
    
    // Initialize tab system
    initTabSystem();
    
    // Initialize contact form
    initContactForm();
    
    // Add scroll animations
    initScrollAnimations();
}

function cacheElements() {
    elements.studentsCount = document.getElementById('studentsCount');
    elements.institutionsCount = document.getElementById('institutionsCount');
    elements.accuracyCount = document.getElementById('accuracyCount');
    elements.sessionsCount = document.getElementById('sessionsCount');
    elements.tabButtons = document.querySelectorAll('.tab-btn');
    elements.tabPanels = document.querySelectorAll('.tab-panel');
    elements.contactForm = document.getElementById('contactForm');
}

// ================= STATISTICS ANIMATION =================
function animateStatistics() {
    const statistics = {
        students: 5000,
        institutions: 50,
        accuracy: 99.9,
        sessions: 100000
    };
    
    if (elements.studentsCount) animateCounter(elements.studentsCount, statistics.students, '+');
    if (elements.institutionsCount) animateCounter(elements.institutionsCount, statistics.institutions, '+');
    if (elements.accuracyCount) animateCounter(elements.accuracyCount, statistics.accuracy, '%');
    if (elements.sessionsCount) animateCounter(elements.sessionsCount, statistics.sessions, '+');
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
            
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            elements.tabPanels.forEach(panel => panel.classList.remove('active'));
            
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                
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
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        const submitBtn = this.querySelector('.submit-btn');
        if (!submitBtn) return;
        
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            showFormSuccess();
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
    if (!elements.contactForm) return;
    
    const successMessage = document.createElement('div');
    successMessage.className = 'form-success';
    successMessage.innerHTML = `
        <div style="background: #d1fae5; color: #065f46; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: center; border: 1px solid #a7f3d0;">
            <i class="fas fa-check-circle"></i>
            <span style="margin-left: 10px;">Thank you! Your message has been sent successfully.</span>
        </div>
    `;
    
    elements.contactForm.appendChild(successMessage);
    
    setTimeout(() => {
        if (successMessage.parentNode) successMessage.remove();
    }, 5000);
}

function showFormError() {
    if (!elements.contactForm) return;
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'form-error';
    errorMessage.innerHTML = `
        <div style="background: #fee2e2; color: #991b1b; padding: 15px; border-radius: 10px; margin-top: 20px; text-align: center; border: 1px solid #fecaca;">
            <i class="fas fa-exclamation-circle"></i>
            <span style="margin-left: 10px;">Something went wrong. Please try again.</span>
        </div>
    `;
    
    elements.contactForm.appendChild(errorMessage);
    
    setTimeout(() => {
        if (errorMessage.parentNode) errorMessage.remove();
    }, 5000);
}

// ================= SCROLL ANIMATIONS =================
function initScrollAnimations() {
    // Parallax effect
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.about-hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    });
    
    // Intersection Observer
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
    
    document.querySelectorAll('.feature-card, .process-step, .tech-card').forEach(el => {
        observer.observe(el);
    });
}

// ================= INITIALIZE ON LOAD =================
document.addEventListener('DOMContentLoaded', initAboutPage);