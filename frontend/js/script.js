// frontend/js/script.js

// ========== API BASE URL ==========
const API_BASE_URL = 'http://localhost:5000/api';

// ========== COMMON FUNCTIONS ==========

// Fetch all students
async function fetchStudents() {
    try {
        const response = await fetch(`${API_BASE_URL}/students`);
        if (!response.ok) throw new Error('Failed to fetch students');
        return await response.json();
    } catch (error) {
        console.error('Error fetching students:', error);
        return [];
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
        return [];
    }
}

// Submit attendance to backend
async function submitAttendance(subjectId, date, presentIds, absentIds) {
    try {
        const response = await fetch(`${API_BASE_URL}/mark_attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subject_id: parseInt(subjectId),
                date: date,
                present: presentIds,
                absent: absentIds
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error submitting attendance:', error);
        return { success: false, error: error.message };
    }
}

// ========== PAGE-SPECIFIC FUNCTIONS ==========

// For mark_attendance.html
async function initializeMarkAttendancePage() {
    // Only run on mark attendance page
    if (!document.querySelector('.attendance-list')) return;
    
    // Load students and populate list
    const students = await fetchStudents();
    const attendanceList = document.querySelector('.attendance-list');
    
    // Clear existing hardcoded students
    attendanceList.innerHTML = '';
    
    // Add students dynamically
    students.forEach(student => {
        const studentDiv = document.createElement('div');
        studentDiv.className = 'student';
        studentDiv.innerHTML = `
            <span>${student.student_id} - ${student.name}</span>
            <input type="checkbox" class="attendance-checkbox" 
                   data-id="${student.student_id}">
        `;
        attendanceList.appendChild(studentDiv);
    });
    
    
    // Load subjects into dropdown
    const subjects = await fetchSubjects();
    const dropdown = document.querySelector('.dropdown');
    
    // Clear existing options
    dropdown.innerHTML = '<option>Select Subject</option>';
    
    // Add subjects dynamically
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.subject_id;
        option.textContent = subject.name;
        dropdown.appendChild(option);
    });
    
    // Update counters
    updateAttendanceCounters();
    
    // Add event listeners
    document.querySelectorAll('.attendance-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateAttendanceCounters);
    });
    
    // Add submit button event
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmitAttendance);
    }
}

// Update present/absent counters
function updateAttendanceCounters() {
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const presentCount = document.querySelectorAll('.attendance-checkbox:checked').length;
    const absentCount = checkboxes.length - presentCount;
    
    document.querySelector('.present').textContent = presentCount;
    document.querySelector('.absent').textContent = absentCount;
}

// Handle attendance submission
async function handleSubmitAttendance() {
    const subjectId = document.querySelector('.dropdown').value;
    const date = document.querySelector('.date-picker').value;
    
    if (!subjectId || subjectId === 'Select Subject') {
        alert('Please select a subject');
        return;
    }
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    // Get present student IDs
    const presentIds = [];
    document.querySelectorAll('.attendance-checkbox:checked').forEach(checkbox => {
        presentIds.push(parseInt(checkbox.dataset.id));
    });
    
    // Get absent student IDs (all unchecked)
    const absentIds = [];
    document.querySelectorAll('.attendance-checkbox:not(:checked)').forEach(checkbox => {
        absentIds.push(parseInt(checkbox.dataset.id));
    });
    
    // Submit to backend
    const result = await submitAttendance(subjectId, date, presentIds, absentIds);
    
    if (result.success) {
        alert('Attendance submitted successfully!');
        // Reset form
        document.querySelectorAll('.attendance-checkbox').forEach(cb => cb.checked = false);
        updateAttendanceCounters();
    } else {
        alert(`Error: ${result.error || 'Failed to submit attendance'}`);
    }
}

// ========== INITIALIZE ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script loaded successfully');
    
    // Initialize based on current page
    if (window.location.pathname.includes('mark_attendance')) {
        initializeMarkAttendancePage();
    }
});