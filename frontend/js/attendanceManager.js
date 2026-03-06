// attendanceManager.js - Enhanced Version with Real-time Features
class AttendanceManager {
    constructor() {
        this.students = [];
        this.subjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filteredStudents = [];
        this.selectedStudents = new Set();
        this.attendanceData = new Map(); // student_id -> status
        this.currentView = 'list';
        this.searchTerm = '';
        this.currentFilter = 'all';
        this.currentDept = 'all';
        
        // Initialize from localStorage if available
        this.loadFromLocalStorage();
    }
    
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('attendance_draft');
            if (saved) {
                const data = JSON.parse(saved);
                this.attendanceData = new Map(data.attendanceData);
                this.selectedStudents = new Set(data.selectedStudents);
                return true;
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
        return false;
    }
    
    saveToLocalStorage() {
        try {
            const data = {
                attendanceData: Array.from(this.attendanceData.entries()),
                selectedStudents: Array.from(this.selectedStudents),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('attendance_draft', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    async loadSubjects() {
        try {
            const response = await fetch('/api/subjects');
            const data = await response.json();
            if (data.success) {
                this.subjects = data.subjects;
                return this.subjects;
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
        return [];
    }
    
    async loadStudents() {
        try {
            const response = await fetch('/api/students');
            const data = await response.json();
            if (data.success) {
                this.students = data.students;
                this.filteredStudents = [...this.students];
                return this.students;
            }
        } catch (error) {
            console.error('Error loading students:', error);
        }
        return [];
    }
    
    filterStudents() {
        this.filteredStudents = this.students.filter(student => {
            // Department filter
            if (this.currentDept !== 'all' && student.department !== this.currentDept) {
                return false;
            }
            
            // Search filter
            if (this.searchTerm) {
                const searchLower = this.searchTerm.toLowerCase();
                const searchIn = `${student.student_id} ${student.name} ${student.department}`.toLowerCase();
                if (!searchIn.includes(searchLower)) {
                    return false;
                }
            }
            
            // Status filter
            if (this.currentFilter !== 'all') {
                const status = this.attendanceData.get(student.student_id) || 'absent';
                if (this.currentFilter !== status) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.currentPage = 1; // Reset to first page after filtering
        return this.filteredStudents;
    }
    
    getPaginatedStudents() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return this.filteredStudents.slice(start, end);
    }
    
    getTotalPages() {
        return Math.ceil(this.filteredStudents.length / this.itemsPerPage);
    }
    
    setAttendance(studentId, status) {
        this.attendanceData.set(studentId, status);
        this.saveToLocalStorage();
        return this.attendanceData.get(studentId);
    }
    
    getAttendance(studentId) {
        return this.attendanceData.get(studentId) || 'absent';
    }
    
    getAttendanceStats() {
        const present = Array.from(this.attendanceData.values()).filter(s => s === 'present').length;
        const absent = Array.from(this.attendanceData.values()).filter(s => s === 'absent').length;
        const late = Array.from(this.attendanceData.values()).filter(s => s === 'late').length;
        const total = this.filteredStudents.length;
        const percentage = total > 0 ? Math.round((present + late) / total * 100) : 0; // late counts as present for percentage
        
        return { present, absent, late, total, percentage };
    }
    
    async submitAttendance(subjectId, date, lectureType, timeSlot) {
        try {
            // Prepare present and absent arrays as expected by backend
            const presentIds = [];
            const absentIds = [];
            
            this.filteredStudents.forEach(student => {
                const status = this.getAttendance(student.student_id);
                if (status === 'present' || status === 'late') {
                    presentIds.push(student.student_id);
                } else {
                    absentIds.push(student.student_id);
                }
            });
            
            const payload = {
                subject_id: subjectId,
                date: date,
                present: presentIds,
                absent: absentIds,
                lecture_type: lectureType,
                time_slot: timeSlot
            };
            
            const response = await fetch('/api/mark_attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear local storage on successful submission
                localStorage.removeItem('attendance_draft');
                this.attendanceData.clear();
                this.selectedStudents.clear();
            }
            
            return data;
        } catch (error) {
            console.error('Error submitting attendance:', error);
            throw error;
        }
    }
    
    exportToCSV() {
        const headers = ['Student ID', 'Name', 'Department', 'Batch', 'Status'];
        const rows = this.filteredStudents.map(student => [
            student.student_id,
            student.name,
            student.department,
            student.batch,
            this.getAttendance(student.student_id)
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Main initialization
let attendanceManager;

function initializeAttendancePage() {
    console.log('Enhanced Attendance page loaded');
    
    // Initialize attendance manager
    attendanceManager = new AttendanceManager();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('dateSelect').value = today;
    
    // Load subjects from backend
    attendanceManager.loadSubjects()
        .then(subjects => {
            updateSubjectDropdown(subjects);
        })
        .catch(error => {
            console.error('Error loading subjects:', error);
            showError('Failed to load subjects. Please refresh the page.');
        });
    
    // Load students from backend
    attendanceManager.loadStudents()
        .then(() => {
            displayStudents();
            updateAllStats();
        })
        .catch(error => {
            console.error('Error loading students:', error);
            showError('Failed to load students. Please check backend connection.');
        });
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for saved draft
    checkForDraft();
}

function setupEventListeners() {
    // Search and filter
    document.getElementById('studentSearch').addEventListener('input', function(e) {
        attendanceManager.searchTerm = e.target.value;
        filterAndDisplay();
    });
    
    document.getElementById('clearSearch').addEventListener('click', function() {
        document.getElementById('studentSearch').value = '';
        attendanceManager.searchTerm = '';
        filterAndDisplay();
    });
    
    document.getElementById('deptFilter').addEventListener('change', function(e) {
        attendanceManager.currentDept = e.target.value;
        filterAndDisplay();
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            attendanceManager.currentFilter = this.dataset.filter;
            filterAndDisplay();
        });
    });
    
    // View controls
    document.getElementById('listViewBtn').addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            document.getElementById('listViewBtn').classList.add('active');
            document.getElementById('gridViewBtn').classList.remove('active');
            attendanceManager.currentView = 'list';
            document.getElementById('studentListContainer').className = 'student-list-container list-view';
        }
    });
    
    document.getElementById('gridViewBtn').addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            document.getElementById('gridViewBtn').classList.add('active');
            document.getElementById('listViewBtn').classList.remove('active');
            attendanceManager.currentView = 'grid';
            document.getElementById('studentListContainer').className = 'student-list-container grid-view';
        }
    });
    
    // Items per page
    document.getElementById('itemsPerPage').addEventListener('change', function(e) {
        attendanceManager.itemsPerPage = parseInt(e.target.value);
        displayStudents();
    });
    
    // Form controls
    document.getElementById('subjectSelect').addEventListener('change', updateSessionInfo);
    document.getElementById('dateSelect').addEventListener('change', updateSessionInfo);
    document.getElementById('lectureType').addEventListener('change', updateSessionInfo);
    document.getElementById('timeSlot').addEventListener('change', updateSessionInfo);
    
    // Bulk action buttons
    document.getElementById('selectAllBtn').addEventListener('click', selectAllStudents);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllStudents);
    document.getElementById('markPresentBtn').addEventListener('click', () => bulkMarkStatus('present'));
    document.getElementById('markAbsentBtn').addEventListener('click', () => bulkMarkStatus('absent'));
    document.getElementById('exportBtn').addEventListener('click', exportAttendance);
    document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
    
    // Submit button
    document.getElementById('submitBtn').addEventListener('click', showSubmitConfirmation);
    
    // Modal events
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.querySelector('.modal-btn.cancel').addEventListener('click', closeModal);
    document.querySelector('.modal-btn.confirm').addEventListener('click', submitAttendance);
    
    // Update sync time
    setInterval(() => {
        document.getElementById('lastSync').textContent = 'Just now';
    }, 60000); // Update every minute
}

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

function updateSessionInfo() {
    const subject = document.getElementById('subjectSelect').value;
    const date = document.getElementById('dateSelect').value;
    const lectureType = document.getElementById('lectureType').value;
    const timeSlot = document.getElementById('timeSlot').value;
    
    const submitBtn = document.getElementById('submitBtn');
    
    if (subject && date) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit to Database';
        
        // Update session summary
        const subjectName = document.getElementById('subjectSelect').selectedOptions[0].text;
        const summary = document.getElementById('sessionSummary');
        summary.innerHTML = `
            <p><i class="fas fa-check-circle"></i> Session Ready</p>
            <p><strong>Subject:</strong> ${subjectName}</p>
            <p><strong>Date:</strong> ${formatDate(date)}</p>
            <p><strong>Type:</strong> ${lectureType}</p>
            <p><strong>Time:</strong> ${timeSlot.replace('-', ' - ')}</p>
        `;
    } else {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit to Database';
        
        document.getElementById('sessionSummary').innerHTML = 
            '<p><i class="fas fa-info-circle"></i> Select subject and date to start</p>';
    }
}

function displayStudents() {
    const container = document.getElementById('studentListContainer');
    const loading = document.getElementById('loadingIndicator');
    const paginatedStudents = attendanceManager.getPaginatedStudents();
    
    // Hide loading indicator
    loading.style.display = 'none';
    
    // Clear container
    container.innerHTML = '';
    
    if (paginatedStudents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <h3>No Students Found</h3>
                <p>Try adjusting your search or filters</p>
            </div>
        `;
        return;
    }
    
    // Display students
    paginatedStudents.forEach(student => {
        const status = attendanceManager.getAttendance(student.student_id);
        const isSelected = attendanceManager.selectedStudents.has(student.student_id);
        
        const studentDiv = document.createElement('div');
        studentDiv.className = `student ${isSelected ? 'selected' : ''}`;
        studentDiv.dataset.id = student.student_id;
        
        studentDiv.innerHTML = `
            <div class="student-info">
                <div class="student-avatar">
                    ${student.name.charAt(0).toUpperCase()}
                </div>
                <div class="student-details">
                    <div class="student-name">
                        ${student.name}
                        ${attendanceManager.selectedStudents.has(student.student_id) ? 
                            '<i class="fas fa-check-circle selected-icon"></i>' : ''}
                    </div>
                    <div class="student-id">ID: ${student.student_id}</div>
                    <div class="student-meta">
                        <span class="department-badge ${student.department}">${student.department}</span>
                        <span class="batch-badge">Batch ${student.batch}</span>
                    </div>
                </div>
            </div>
            <div class="attendance-control">
                <select class="status-select ${status}" data-id="${student.student_id}">
                    <option value="present" ${status === 'present' ? 'selected' : ''}>Present</option>
                    <option value="absent" ${status === 'absent' ? 'selected' : ''}>Absent</option>
                    <option value="late" ${status === 'late' ? 'selected' : ''}>Late</option>
                </select>
                <div class="attendance-actions">
                    <button class="action-icon note" data-id="${student.student_id}" title="Add Note">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="action-icon select" data-id="${student.student_id}" title="Select">
                        <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const statusSelect = studentDiv.querySelector('.status-select');
        const noteBtn = studentDiv.querySelector('.action-icon.note');
        const selectBtn = studentDiv.querySelector('.action-icon.select');
        
        statusSelect.addEventListener('change', function(e) {
            const newStatus = e.target.value;
            attendanceManager.setAttendance(student.student_id, newStatus);
            this.className = `status-select ${newStatus}`;
            updateAllStats();
        });
        
        noteBtn.addEventListener('click', function() {
            showNoteModal(student);
        });
        
        selectBtn.addEventListener('click', function() {
            toggleStudentSelection(student.student_id);
            this.querySelector('i').className = 
                attendanceManager.selectedStudents.has(student.student_id) ? 
                'fas fa-check-square' : 'fas fa-square';
            studentDiv.classList.toggle('selected');
            updateBulkEditPanel();
        });
        
        studentDiv.addEventListener('click', function(e) {
            if (!e.target.closest('.attendance-control') && !e.target.closest('.action-icon')) {
                toggleStudentSelection(student.student_id);
                selectBtn.querySelector('i').className = 
                    attendanceManager.selectedStudents.has(student.student_id) ? 
                    'fas fa-check-square' : 'fas fa-square';
                studentDiv.classList.toggle('selected');
                updateBulkEditPanel();
            }
        });
        
        container.appendChild(studentDiv);
    });
    
    // Update pagination
    updatePagination();
    
    // Update showing info
    const start = (attendanceManager.currentPage - 1) * attendanceManager.itemsPerPage + 1;
    const end = Math.min(start + attendanceManager.itemsPerPage - 1, attendanceManager.filteredStudents.length);
    document.getElementById('startIndex').textContent = start;
    document.getElementById('endIndex').textContent = end;
    document.getElementById('totalStudents').textContent = attendanceManager.filteredStudents.length;
}

function updatePagination() {
    const paginationDiv = document.getElementById('pagination');
    const totalPages = attendanceManager.getTotalPages();
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="page-prev" ${attendanceManager.currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, attendanceManager.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="${attendanceManager.currentPage === i ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button class="page-next" ${attendanceManager.currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationDiv.innerHTML = paginationHTML;
    
    // Add event listeners
    paginationDiv.querySelector('.page-prev').addEventListener('click', () => {
        if (attendanceManager.currentPage > 1) {
            attendanceManager.currentPage--;
            displayStudents();
        }
    });
    
    paginationDiv.querySelector('.page-next').addEventListener('click', () => {
        if (attendanceManager.currentPage < totalPages) {
            attendanceManager.currentPage++;
            displayStudents();
        }
    });
    
    paginationDiv.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', function() {
            attendanceManager.currentPage = parseInt(this.dataset.page);
            displayStudents();
        });
    });
}

function updateAllStats() {
    const stats = attendanceManager.getAttendanceStats();
    
    // Update quick stats
    document.getElementById('quickTotal').textContent = stats.total;
    document.getElementById('quickPresent').textContent = stats.present;
    document.getElementById('quickAbsent').textContent = stats.absent;
    document.getElementById('quickPercentage').textContent = `${stats.percentage}%`;
    
    // Update detailed summary
    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('presentCount').textContent = stats.present;
    document.getElementById('absentCount').textContent = stats.absent;
    document.getElementById('lateCount').textContent = stats.late;
    document.getElementById('percentage').textContent = `${stats.percentage}%`;
}

function filterAndDisplay() {
    attendanceManager.filterStudents();
    displayStudents();
    updateAllStats();
}

function selectAllStudents() {
    const visibleStudents = attendanceManager.getPaginatedStudents();
    visibleStudents.forEach(student => {
        attendanceManager.selectedStudents.add(student.student_id);
    });
    displayStudents();
    updateBulkEditPanel();
}

function clearAllStudents() {
    const visibleStudents = attendanceManager.getPaginatedStudents();
    visibleStudents.forEach(student => {
        attendanceManager.selectedStudents.delete(student.student_id);
    });
    displayStudents();
    updateBulkEditPanel();
}

function bulkMarkStatus(status) {
    attendanceManager.selectedStudents.forEach(studentId => {
        attendanceManager.setAttendance(studentId, status);
    });
    displayStudents();
    updateAllStats();
}

function toggleStudentSelection(studentId) {
    if (attendanceManager.selectedStudents.has(studentId)) {
        attendanceManager.selectedStudents.delete(studentId);
    } else {
        attendanceManager.selectedStudents.add(studentId);
    }
}

function updateBulkEditPanel() {
    const panel = document.getElementById('bulkEditPanel');
    const count = attendanceManager.selectedStudents.size;
    
    if (count > 0) {
        panel.style.display = 'block';
        panel.querySelector('h4').innerHTML = 
            `<i class="fas fa-users"></i> Bulk Edit (${count} selected)`;
        
        // Update bulk edit buttons
        panel.querySelectorAll('.bulk-option').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.classList[1]; // present, absent, late, note
                if (action === 'note') {
                    showBulkNoteModal();
                } else {
                    bulkMarkStatus(action);
                }
            });
        });
        
        panel.querySelector('.close-bulk-edit').addEventListener('click', function() {
            panel.style.display = 'none';
            attendanceManager.selectedStudents.clear();
            displayStudents();
        });
    } else {
        panel.style.display = 'none';
    }
}

function showNoteModal(student) {
    const modal = document.getElementById('confirmModal');
    modal.querySelector('.modal-header h3').innerHTML = 
        '<i class="fas fa-sticky-note"></i> Add Note for ' + student.name;
    
    modal.querySelector('#modalMessage').textContent = 
        `Add a note for ${student.name} (${student.student_id}):`;
    
    modal.querySelector('#modalDetails').innerHTML = `
        <div class="note-form">
            <textarea id="noteText" placeholder="Enter note here..." rows="3"></textarea>
            <small>Note will be saved with attendance record</small>
        </div>
    `;
    
    modal.querySelector('.modal-btn.confirm').textContent = 'Save Note';
    modal.querySelector('.modal-btn.confirm').onclick = () => {
        const note = document.getElementById('noteText').value;
        // Save note logic here
        showSuccess(`Note added for ${student.name}`);
        closeModal();
    };
    
    modal.style.display = 'flex';
}

function showBulkNoteModal() {
    const modal = document.getElementById('confirmModal');
    modal.querySelector('.modal-header h3').innerHTML = 
        '<i class="fas fa-sticky-note"></i> Add Note to Selected Students';
    
    modal.querySelector('#modalMessage').textContent = 
        `Add a note to ${attendanceManager.selectedStudents.size} selected students:`;
    
    modal.querySelector('#modalDetails').innerHTML = `
        <div class="note-form">
            <textarea id="bulkNoteText" placeholder="Enter note here..." rows="3"></textarea>
            <small>Note will be added to all selected students</small>
        </div>
    `;
    
    modal.querySelector('.modal-btn.confirm').textContent = 'Save Note';
    modal.querySelector('.modal-btn.confirm').onclick = () => {
        const note = document.getElementById('bulkNoteText').value;
        // Save bulk note logic here
        showSuccess(`Note added to ${attendanceManager.selectedStudents.size} students`);
        closeModal();
    };
    
    modal.style.display = 'flex';
}

function showSubmitConfirmation() {
    const subjectId = document.getElementById('subjectSelect').value;
    const subjectName = document.getElementById('subjectSelect').selectedOptions[0].text;
    const date = document.getElementById('dateSelect').value;
    const lectureType = document.getElementById('lectureType').value;
    const timeSlot = document.getElementById('timeSlot').value;
    
    if (!subjectId || !date) {
        showError('Please select both subject and date');
        return;
    }
    
    const stats = attendanceManager.getAttendanceStats();
    const modal = document.getElementById('confirmModal');
    
    modal.querySelector('#modalMessage').textContent = 
        `Submit attendance for ${subjectName} on ${formatDate(date)}?`;
    
    modal.querySelector('#modalDetails').innerHTML = `
        <div class="submission-details">
            <p><strong>Lecture Type:</strong> ${lectureType}</p>
            <p><strong>Time Slot:</strong> ${timeSlot.replace('-', ' to ')}</p>
            <hr>
            <p><strong>Attendance Summary:</strong></p>
            <p>✅ Present: ${stats.present + stats.late} students (including late)</p>
            <p>❌ Absent: ${stats.absent} students</p>
            <p>⏰ Late: ${stats.late} students</p>
            <p>📊 Total: ${stats.total} students (${stats.percentage}%)</p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function submitAttendance() {
    const subjectId = document.getElementById('subjectSelect').value;
    const date = document.getElementById('dateSelect').value;
    const lectureType = document.getElementById('lectureType').value;
    const timeSlot = document.getElementById('timeSlot').value;
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    attendanceManager.submitAttendance(subjectId, date, lectureType, timeSlot)
        .then(response => {
            if (response.success) {
                showSuccess('Attendance submitted successfully!');
                // Reset after successful submission
                clearAllStudents();
                document.getElementById('dateSelect').value = new Date().toISOString().split('T')[0];
                updateSessionInfo();
                filterAndDisplay();
            } else {
                showError(response.error || 'Failed to submit attendance');
            }
        })
        .catch(error => {
            showError('Network error. Please check backend connection.');
            console.error('Submission error:', error);
        })
        .finally(() => {
            closeModal();
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit to Database';
        });
}

function exportAttendance() {
    attendanceManager.exportToCSV();
    showSuccess('Attendance exported to CSV');
}

function saveDraft() {
    attendanceManager.saveToLocalStorage();
    showSuccess('Draft saved successfully');
}

function checkForDraft() {
    if (attendanceManager.loadFromLocalStorage()) {
        showWarning('A saved draft was found. Would you like to restore it?', {
            confirmText: 'Restore',
            cancelText: 'Ignore',
            onConfirm: () => {
                filterAndDisplay();
                showSuccess('Draft restored');
            }
        });
    }
}

// Utility functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function closeModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function showSuccess(message) {
    showStatusMessage(message, 'success');
}

function showError(message) {
    showStatusMessage(message, 'error');
}

function showWarning(message, options = {}) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message warning';
    statusDiv.style.display = 'block';
    
    // Add action buttons if provided
    if (options.confirmText) {
        const actions = document.createElement('div');
        actions.className = 'status-actions';
        actions.innerHTML = `
            <button class="status-btn confirm">${options.confirmText}</button>
            <button class="status-btn cancel">${options.cancelText || 'Cancel'}</button>
        `;
        statusDiv.appendChild(actions);
        
        actions.querySelector('.confirm').addEventListener('click', () => {
            options.onConfirm && options.onConfirm();
            statusDiv.style.display = 'none';
        });
        
        actions.querySelector('.cancel').addEventListener('click', () => {
            options.onCancel && options.onCancel();
            statusDiv.style.display = 'none';
        });
    }
    
    setTimeout(() => {
        if (statusDiv.style.display !== 'none') {
            statusDiv.style.display = 'none';
        }
    }, 5000);
}

function showStatusMessage(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Make initialize function globally available
window.initializeAttendancePage = initializeAttendancePage;