// markAttendance.js - Main logic for mark attendance page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Attendance page loaded');
    
    // Initialize attendance manager
    const manager = new AttendanceManager();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateSelect').value = today;
    
    // Load subjects from backend
    manager.loadSubjects()
        .then(subjects => {
            console.log('Subjects loaded:', subjects);
            updateSubjectDropdown(subjects);
        })
        .catch(error => {
            console.error('Error loading subjects:', error);
            showError('Failed to load subjects. Please refresh the page.');
        });
    
    // Load students from backend
    manager.loadStudents()
        .then(students => {
            console.log('Students loaded:', students.length);
            displayStudents(students);
            updateSummary();
        })
        .catch(error => {
            console.error('Error loading students:', error);
            showError('Failed to load students. Please check backend connection.');
        });
    
    // Event Listeners
    document.getElementById('studentSearch').addEventListener('input', filterStudents);
    document.getElementById('subjectSelect').addEventListener('change', updateSubmitButton);
    document.getElementById('dateSelect').addEventListener('change', updateSubmitButton);
    
    // Bulk action buttons
    document.getElementById('selectAllBtn').addEventListener('click', selectAllStudents);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllStudents);
    document.getElementById('markPresentBtn').addEventListener('click', markAllPresent);
    document.getElementById('markAbsentBtn').addEventListener('click', markAllAbsent);
    
    // Submit button
    document.getElementById('submitBtn').addEventListener('click', submitAttendance);
    
    // Department filter buttons
    document.querySelectorAll('.dept-filter').forEach(button => {
        button.addEventListener('click', function() {
            const dept = this.dataset.dept;
            filterByDepartment(dept);
            
            // Update active state
            document.querySelectorAll('.dept-filter').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Functions
    function updateSubjectDropdown(subjects) {
        const select = document.getElementById('subjectSelect');
        select.innerHTML = '<option value="">Select Subject</option>';
        
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.subject_id;
            option.textContent = `${subject.code} - ${subject.name}`;
            select.appendChild(option);
        });
    }
    
    function displayStudents(students) {
        const container = document.getElementById('studentList');
        const loading = document.getElementById('loadingIndicator');
        
        // Hide loading indicator
        loading.style.display = 'none';
        
        // Clear container
        container.innerHTML = '';
        
        // Display students
        students.forEach(student => {
            const studentDiv = document.createElement('div');
            studentDiv.className = `student ${student.department}`;
            studentDiv.dataset.id = student.student_id;
            studentDiv.dataset.dept = student.department;
            
            studentDiv.innerHTML = `
                <div class="student-info">
                    <span class="student-id">${student.student_id}</span>
                    <span class="student-name">${student.name}</span>
                    <span class="department-badge ${student.department}">${student.department}</span>
                    <span class="batch">Batch ${student.batch}</span>
                </div>
                <div class="attendance-toggle">
                    <label class="switch">
                        <input type="checkbox" class="attendance-checkbox" data-id="${student.student_id}">
                        <span class="slider round">
                            <span class="present-text">Present</span>
                            <span class="absent-text">Absent</span>
                        </span>
                    </label>
                </div>
            `;
            
            // Add change event to checkbox
            const checkbox = studentDiv.querySelector('.attendance-checkbox');
            checkbox.addEventListener('change', updateSummary);
            
            container.appendChild(studentDiv);
        });
        
        // Show total count
        document.getElementById('totalCount').textContent = students.length;
    }
    
    function updateSummary() {
        const checkboxes = document.querySelectorAll('.attendance-checkbox');
        const presentCount = document.querySelectorAll('.attendance-checkbox:checked').length;
        const totalCount = checkboxes.length;
        const absentCount = totalCount - presentCount;
        const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
        
        document.getElementById('presentCount').textContent = presentCount;
        document.getElementById('absentCount').textContent = absentCount;
        document.getElementById('percentage').textContent = `${percentage}%`;
        
        // Update percentage color
        const percentageElement = document.getElementById('percentage');
        if (percentage >= 75) {
            percentageElement.style.color = '#4CAF50';
        } else if (percentage >= 50) {
            percentageElement.style.color = '#FF9800';
        } else {
            percentageElement.style.color = '#F44336';
        }
    }
    
    function filterStudents() {
        const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
        const students = document.querySelectorAll('.student');
        
        students.forEach(student => {
            const id = student.dataset.id;
            const name = student.querySelector('.student-name').textContent.toLowerCase();
            const text = `${id} ${name}`;
            
            if (text.includes(searchTerm)) {
                student.style.display = 'flex';
            } else {
                student.style.display = 'none';
            }
        });
    }
    
    function filterByDepartment(dept) {
        const students = document.querySelectorAll('.student');
        
        students.forEach(student => {
            if (dept === 'all' || student.dataset.dept === dept) {
                student.style.display = 'flex';
            } else {
                student.style.display = 'none';
            }
        });
        
        // Update summary for visible students only
        setTimeout(updateSummary, 100);
    }
    
    function selectAllStudents() {
        document.querySelectorAll('.student:not([style*="display: none"]) .attendance-checkbox')
            .forEach(checkbox => {
                checkbox.checked = true;
            });
        updateSummary();
    }
    
    function clearAllStudents() {
        document.querySelectorAll('.student:not([style*="display: none"]) .attendance-checkbox')
            .forEach(checkbox => {
                checkbox.checked = false;
            });
        updateSummary();
    }
    
    function markAllPresent() {
        selectAllStudents();
    }
    
    function markAllAbsent() {
        clearAllStudents();
    }
    
    function updateSubmitButton() {
        const subject = document.getElementById('subjectSelect').value;
        const date = document.getElementById('dateSelect').value;
        const submitBtn = document.getElementById('submitBtn');
        
        if (subject && date) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '📤 Submit Attendance';
        } else {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '📤 Submit Attendance';
        }
    }
    
    async function submitAttendance() {
        const subjectId = document.getElementById('subjectSelect').value;
        const subjectName = document.getElementById('subjectSelect').selectedOptions[0].text;
        const date = document.getElementById('dateSelect').value;
        
        // Validation
        if (!subjectId || !date) {
            showError('Please select both subject and date');
            return;
        }
        
        // Get attendance data
        const presentIds = [];
        const absentIds = [];
        
        document.querySelectorAll('.student').forEach(student => {
            if (student.style.display !== 'none') {
                const checkbox = student.querySelector('.attendance-checkbox');
                const studentId = parseInt(checkbox.dataset.id);
                
                if (checkbox.checked) {
                    presentIds.push(studentId);
                } else {
                    absentIds.push(studentId);
                }
            }
        });
        
        // Confirm submission
        const confirmed = confirm(
            `Submit attendance for ${subjectName} on ${date}?\n\n` +
            `✅ Present: ${presentIds.length} students\n` +
            `❌ Absent: ${absentIds.length} students\n\n` +
            `Click OK to confirm.`
        );
        
        if (!confirmed) return;
        
        // Submit to backend
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Submitting...';
        
        try {
            const response = await manager.submitAttendance(subjectId, date, presentIds, absentIds);
            
            if (response.success) {
                showSuccess('Attendance submitted successfully!');
                // Reset after successful submission
                clearAllStudents();
                document.getElementById('dateSelect').value = today;
                updateSubmitButton();
            } else {
                showError(response.error || 'Failed to submit attendance');
            }
        } catch (error) {
            showError('Network error. Please check backend connection.');
            console.error('Submission error:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '📤 Submit Attendance';
        }
    }
    
    function showSuccess(message) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = 'status-message success';
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
    
    function showError(message) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.textContent = message;
        statusDiv.className = 'status-message error';
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
});