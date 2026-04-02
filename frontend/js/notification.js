// notification.js - Complete Notification System for Student Dashboard

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container
        this.createNotificationContainer();
        // Load notifications from localStorage
        this.loadNotifications();
        // Fetch attendance data and generate notifications
        this.checkAttendanceAndNotify();
    }

    createNotificationContainer() {
        // Check if container already exists
        if (document.getElementById('notificationContainer')) return;
        
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'notificationContainer';
        this.container.className = 'notification-container';
        
        // Insert after navbar (or at top of content)
        const navbar = document.querySelector('.navbar');
        if (navbar && navbar.nextSibling) {
            navbar.parentNode.insertBefore(this.container, navbar.nextSibling);
        } else {
            document.body.insertBefore(this.container, document.body.firstChild);
        }
    }

    loadNotifications() {
        const saved = localStorage.getItem('attendance_notifications');
        if (saved) {
            this.notifications = JSON.parse(saved);
            // Remove old notifications (older than 24 hours)
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            this.notifications = this.notifications.filter(n => n.timestamp > oneDayAgo);
            this.saveNotifications();
        }
    }

    saveNotifications() {
        localStorage.setItem('attendance_notifications', JSON.stringify(this.notifications));
    }

    async checkAttendanceAndNotify() {
        try {
            const response = await fetch('/api/student/performance');
            if (!response.ok) return;
            
            const subjects = await response.json();
            const lowAttendanceSubjects = subjects.filter(s => s.attendance.percentage < 75);
            
            if (lowAttendanceSubjects.length > 0) {
                this.showLowAttendanceAlert(lowAttendanceSubjects);
            }
            
            // Also show existing notifications
            this.renderNotifications();
            
        } catch (error) {
            console.error('Error checking attendance:', error);
        }
    }

    showLowAttendanceAlert(subjects) {
        const newNotifications = [];
        
        subjects.forEach(subject => {
            const percentage = subject.attendance.percentage;
            const status = percentage < 60 ? 'critical' : (percentage < 75 ? 'warning' : 'good');
            
            // Check if notification already exists for this subject today
            const today = new Date().toDateString();
            const alreadyNotified = this.notifications.some(n => 
                n.subjectCode === subject.subject_code && 
                new Date(n.timestamp).toDateString() === today
            );
            
            if (!alreadyNotified) {
                newNotifications.push({
                    id: Date.now() + Math.random(),
                    subjectCode: subject.subject_code,
                    subjectName: subject.subject_name,
                    attendance: percentage,
                    status: status,
                    message: this.getNotificationMessage(subject.subject_name, percentage, status),
                    timestamp: Date.now(),
                    read: false
                });
            }
        });
        
        if (newNotifications.length > 0) {
            this.notifications = [...newNotifications, ...this.notifications];
            this.saveNotifications();
            this.renderNotifications();
            this.playNotificationSound();
        }
    }

    getNotificationMessage(subjectName, percentage, status) {
        if (status === 'critical') {
            return `⚠️ CRITICAL: Your attendance in ${subjectName} is only ${percentage}%! Please contact your instructor immediately.`;
        } else if (status === 'warning') {
            return `⚠️ WARNING: Your attendance in ${subjectName} is ${percentage}% which is below 75%. Please improve your attendance.`;
        }
        return `ℹ️ Your attendance in ${subjectName} is ${percentage}%. Keep it above 75% to avoid issues.`;
    }

    playNotificationSound() {
        // Optional: Play a soft sound (you can enable if needed)
        // const audio = new Audio('/notification-sound.mp3');
        // audio.play().catch(e => console.log('Audio play failed'));
    }

    renderNotifications() {
        if (!this.container) return;
        
        const unreadCount = this.notifications.filter(n => !n.read).length;
        
        if (this.notifications.length === 0) {
            this.container.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <span>No new notifications</span>
                </div>
            `;
            return;
        }
        
        this.container.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <i class="fas fa-bell"></i>
                    <span>Notifications</span>
                    ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}
                </div>
                <button class="notification-clear-all" onclick="notificationSystem.clearAllNotifications()">
                    <i class="fas fa-trash-alt"></i> Clear All
                </button>
            </div>
            <div class="notification-list">
                ${this.notifications.map(notification => `
                    <div class="notification-item ${notification.read ? 'read' : 'unread'} ${notification.status}" data-id="${notification.id}">
                        <div class="notification-icon">
                            <i class="fas ${notification.status === 'critical' ? 'fa-exclamation-triangle' : (notification.status === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
                        </div>
                        <div class="notification-content">
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">${this.formatTime(notification.timestamp)}</div>
                        </div>
                        <button class="notification-close" onclick="notificationSystem.dismissNotification(${notification.id})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Add animation to new notifications
        const newItems = this.container.querySelectorAll('.notification-item.unread');
        newItems.forEach(item => {
            item.style.animation = 'slideInRight 0.5s ease-out';
        });
    }

    dismissNotification(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.saveNotifications();
            this.renderNotifications();
        }
    }

    clearAllNotifications() {
        if (confirm('Clear all notifications?')) {
            this.notifications = [];
            this.saveNotifications();
            this.renderNotifications();
        }
    }

    formatTime(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Initialize notification system when page loads
let notificationSystem;

document.addEventListener('DOMContentLoaded', () => {
    notificationSystem = new NotificationSystem();
});

// Also check for new notifications every 5 minutes
setInterval(() => {
    if (notificationSystem) {
        notificationSystem.checkAttendanceAndNotify();
    }
}, 5 * 60 * 1000);