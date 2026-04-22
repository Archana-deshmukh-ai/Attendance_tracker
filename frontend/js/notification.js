// ================= NOTIFICATION.JS - WORKS FOR ALL STUDENTS =================

// Get the actual logged-in student ID from session
async function getCurrentStudentId() {
    try {
        const response = await fetch('/api/current-student');
        const data = await response.json();
        
        if (data.success) {
            return data.student.student_id;
        } else {
            console.error('Not logged in');
            return null;
        }
    } catch (error) {
        console.error('Error fetching student:', error);
        return null;
    }
}

// Load notifications for the logged-in student
async function loadNotifications() {
    const studentId = await getCurrentStudentId();
    
    if (!studentId) {
        const container = document.getElementById("notification-container");
        if (container) {
            container.innerHTML = '<p>⚠️ Please login to see notifications</p>';
        }
        return;
    }
    
    console.log(`Loading notifications for student: ${studentId}`);
    
    try {
        const response = await fetch(`/api/subject-notifications/${studentId}`);
        const data = await response.json();
        
        const container = document.getElementById("notification-container");
        
        if (!container) return;
        
        if (data.length === 0) {
            container.innerHTML = '<div class="no-notifications">🎉 No new alerts! Great attendance!</div>';
            return;
        }
        
        // Clear existing notifications
        container.innerHTML = '';
        
        // Add each notification
        data.forEach((notification, index) => {
            const div = document.createElement("div");
            div.className = "notification";
            div.setAttribute('data-id', index);
            
            // Determine priority color based on percentage
            let priorityColor = '';
            let priorityText = '';
            if (notification.percentage < 60) {
                priorityColor = '#dc2626';
                priorityText = 'Critical';
            } else if (notification.percentage < 75) {
                priorityColor = '#f59e0b';
                priorityText = 'Warning';
            } else {
                priorityColor = '#10b981';
                priorityText = 'Good';
            }
            
            div.innerHTML = `
                <span class="close-btn" onclick="removeNotification(this)">✖</span>
                <div class="notification-subject" style="border-left-color: ${priorityColor}">
                    <strong>📚 ${notification.subject}</strong>
                    <span class="priority-badge" style="background: ${priorityColor}">${priorityText}</span>
                </div>
                <p>⚠️ ${notification.message}</p>
                <div class="notification-footer">
                    <small>🕐 ${notification.time}</small>
                    <small>📊 Attendance: ${notification.percentage}%</small>
                </div>
            `;
            
            container.appendChild(div);
        });
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        const container = document.getElementById("notification-container");
        if (container) {
            container.innerHTML = '<p>❌ Error loading notifications</p>';
        }
    }
}

// Remove notification (mark as read)
function removeNotification(element) {
    const card = element.parentElement;
    card.style.opacity = "0";
    card.style.transform = "translateX(100%)";
    
    setTimeout(() => {
        card.remove();
        
        // Check if no notifications left
        const container = document.getElementById("notification-container");
        if (container && container.children.length === 0) {
            container.innerHTML = '<div class="no-notifications">🎉 No more alerts! Great job!</div>';
        }
    }, 300);
}

// Auto-refresh notifications every 30 seconds
let refreshInterval = null;

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        loadNotifications();
    }, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Load notifications when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadNotifications();
    startAutoRefresh();
});

// Stop auto-refresh when page is hidden (optional)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        loadNotifications(); // Refresh immediately when page becomes visible
    }
});