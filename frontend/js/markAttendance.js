// markAttendance.js - Enhanced Main logic for mark attendance page

class AttendanceManager {
    constructor() {
        this.subjects = [];
        this.students = [];
        this.currentSubject = null;
        this.currentDate = null;
        this.attendanceData = new Map();
        this.selectedStudents = new Set();
        this.searchTerm = '';
        this.currentFilter = 'all';
        this.currentDept = 'all';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filteredStudents = [];
        this.autoSaveTimer = null;
        this.noteData = new Map();
        
        // Load saved draft
        this.loadDraft();
    }
    
    async loadSubjects() {
        try {
            const response = await fetch('/api/subjects');
            const data = await response.json();
            if (data.success) {
                this.subjects = data.subjects;
                return this.subjects;
            }
            return [];
        } catch (error) {
            console.error('Error loading subjects:', error);
            return [];
        }
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
            return [];
        } catch (error) {
            console.error('Error loading students:', error);
            return [];
        }
    }
    
    filterStudents() {
        this.filteredStudents = this.students.filter(student => {
            if (this.currentDept !== 'all' && student.department !== this.currentDept) return false;
            if (this.searchTerm) {
                const searchLower = this.searchTerm.toLowerCase();
                const searchIn = `${student.student_id} ${student.name} ${student.department}`.toLowerCase();
                if (!searchIn.includes(searchLower)) return false;
            }
            if (this.currentFilter !== 'all') {
                const status = this.attendanceData.get(student.student_id) || 'absent';
                if (this.currentFilter !== status) return false;
            }
            return true;
        });
        
        this.currentPage = 1;
        return this.filteredStudents;
    }
    
    getPaginatedStudents() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        return this.filteredStudents.slice(start, start + this.itemsPerPage);
    }
    
    getTotalPages() {
        return Math.ceil(this.filteredStudents.length / this.itemsPerPage);
    }
    
    setAttendance(studentId, status) {
        this.attendanceData.set(studentId, status);
        this.saveDraft();
        return status;
    }
    
    getAttendance(studentId) {
        return this.attendanceData.get(studentId) || 'absent';
    }
    
    setNote(studentId, note) {
        this.noteData.set(studentId, note);
        this.saveDraft();
    }
    
    getNote(studentId) {
        return this.noteData.get(studentId) || '';
    }
    
    getAttendanceStats() {
        const present = Array.from(this.attendanceData.values()).filter(s => s === 'present').length;
        const absent = Array.from(this.attendanceData.values()).filter(s => s === 'absent').length;
        const late = Array.from(this.attendanceData.values()).filter(s => s === 'late').length;
        const total = this.filteredStudents.length;
        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        
        return { present, absent, late, total, percentage };
    }
    
    async submitAttendance(subjectId, date, lectureType, timeSlot) {
        try {
            const presentIds = [];
            const absentIds = [];
            const lateIds = [];
            
            this.filteredStudents.forEach(student => {
                const status = this.getAttendance(student.student_id);
                if (status === 'present') presentIds.push(student.student_id);
                else if (status === 'late') lateIds.push(student.student_id);
                else absentIds.push(student.student_id);
            });
            
            const notes = [];
            this.noteData.forEach((note, studentId) => {
                if (note) notes.push({ studentId, note });
            });
            
            const response = await fetch('/api/mark_attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_id: subjectId,
                    date: date,
                    present: presentIds,
                    absent: absentIds,
                    late: lateIds,
                    lecture_type: lectureType,
                    time_slot: timeSlot,
                    notes: notes
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.clearDraft();
                this.attendanceData.clear();
                this.noteData.clear();
                this.selectedStudents.clear();
            }
            
            return data;
        } catch (error) {
            console.error('Error submitting attendance:', error);
            throw error;
        }
    }
    
    saveDraft() {
        const draft = {
            attendanceData: Array.from(this.attendanceData.entries()),
            noteData: Array.from(this.noteData.entries()),
            selectedStudents: Array.from(this.selectedStudents),
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('attendance_draft', JSON.stringify(draft));
        
        // Update last sync time
        const lastSync = document.getElementById('lastSync');
        if (lastSync) lastSync.textContent = 'Just now';
    }
    
    loadDraft() {
        const saved = localStorage.getItem('attendance_draft');
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                this.attendanceData = new Map(draft.attendanceData);
                this.noteData = new Map(draft.noteData);
                this.selectedStudents = new Set(draft.selectedStudents);
                return true;
            } catch (error) {
                console.error('Error loading draft:', error);
            }
        }
        return false;
    }
    
    clearDraft() {
        localStorage.removeItem('attendance_draft');
        this.attendanceData.clear();
        this.noteData.clear();
        this.selectedStudents.clear();
    }
    
    startAutoSave() {
        if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = setInterval(() => {
            this.saveDraft();
            const lastSync = document.getElementById('lastSync');
            if (lastSync) lastSync.textContent = 'Just now';
        }, 30000);
    }
    
    exportToCSV() {
        const headers = ['Student ID', 'Name', 'Department', 'Batch', 'Status', 'Note'];
        const rows = this.filteredStudents.map(student => [
            student.student_id,
            student.name,
            student.department || 'N/A',
            student.batch || '2024',
            this.getAttendance(student.student_id),
            this.getNote(student.student_id)
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Global manager instance
let attendanceManager = null;

function initializeAttendancePage() {
    console.log('Enhanced Attendance page loaded');
    
    attendanceManager = new AttendanceManager();
    
    const today = new Date().toISOString().split('T')[0];
    const dateSelect = document.getElementById('dateSelect');
    if (dateSelect) dateSelect.value = today;
    
    attendanceManager.loadSubjects()
        .then(subjects => updateSubjectDropdown(subjects))
        .catch(error => showError('Failed to load subjects. Please refresh the page.'));
    
    attendanceManager.loadStudents()
        .then(() => {
            attendanceManager.filterStudents();
            displayStudents();
            updateAllStats();
            checkForDraft();
            attendanceManager.startAutoSave();
        })
        .catch(error => showError('Failed to load students. Please check backend connection.'));
    
    setupEventListeners();
}

function setupEventListeners() {
    const studentSearch = document.getElementById('studentSearch');
    if (studentSearch) studentSearch.addEventListener('input', handleSearch);
    
    const clearSearch = document.getElementById('clearSearch');
    if (clearSearch) clearSearch.addEventListener('click', clearSearchInput);
    
    const deptFilter = document.getElementById('deptFilter');
    if (deptFilter) deptFilter.addEventListener('change', handleDepartmentFilter);
    
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => btn.addEventListener('click', () => handleFilter(btn.dataset.filter)));
    
    const listViewBtn = document.getElementById('listViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');
    if (listViewBtn) listViewBtn.addEventListener('click', () => setViewMode('list'));
    if (gridViewBtn) gridViewBtn.addEventListener('click', () => setViewMode('grid'));
    
    const subjectSelect = document.getElementById('subjectSelect');
    if (subjectSelect) subjectSelect.addEventListener('change', updateSessionInfo);
    
    const dateSelect = document.getElementById('dateSelect');
    if (dateSelect) dateSelect.addEventListener('change', updateSessionInfo);
    
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllStudents);
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllStudents);
    
    const markPresentBtn = document.getElementById('markPresentBtn');
    if (markPresentBtn) markPresentBtn.addEventListener('click', () => bulkMarkStatus('present'));
    
    const markAbsentBtn = document.getElementById('markAbsentBtn');
    if (markAbsentBtn) markAbsentBtn.addEventListener('click', () => bulkMarkStatus('absent'));
    
    const markLateBtn = document.getElementById('markLateBtn');
    if (markLateBtn) markLateBtn.addEventListener('click', () => bulkMarkStatus('late'));
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => attendanceManager.exportToCSV());
    
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    if (saveDraftBtn) saveDraftBtn.addEventListener('click', () => {
        attendanceManager.saveDraft();
        showSuccess('Draft saved successfully!');
    });
    
    const clearDraftBtn = document.getElementById('clearDraftBtn');
    if (clearDraftBtn) clearDraftBtn.addEventListener('click', () => {
        if (confirm('Clear all unsaved attendance data?')) {
            attendanceManager.clearDraft();
            attendanceManager.attendanceData.clear();
            displayStudents();
            updateAllStats();
            showSuccess('Draft cleared');
        }
    });
    
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.addEventListener('click', showSubmitConfirmation);
    
    const itemsPerPage = document.getElementById('itemsPerPage');
    if (itemsPerPage) itemsPerPage.addEventListener('change', function() {
        attendanceManager.itemsPerPage = parseInt(this.value);
        attendanceManager.currentPage = 1;
        displayStudents();
    });
    
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) closeModal.addEventListener('click', closeConfirmationModal);
    
    const closeNoteModal = document.querySelector('.close-note-modal');
    if (closeNoteModal) closeNoteModal.addEventListener('click', closeNoteModalFunc);
    
    const cancelBtn = document.querySelector('.modal-btn.cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeConfirmationModal);
    
    const cancelNote = document.querySelector('.cancel-note');
    if (cancelNote) cancelNote.addEventListener('click', closeNoteModalFunc);
    
    const confirmBtn = document.querySelector('.modal-btn.confirm');
    if (confirmBtn) confirmBtn.addEventListener('click', submitAttendance);
    
    const confirmNote = document.querySelector('.confirm-note');
    if (confirmNote) confirmNote.addEventListener('click', saveNote);
    
    const closeBulkEdit = document.querySelector('.close-bulk-edit');
    if (closeBulkEdit) closeBulkEdit.addEventListener('click', () => {
        document.getElementById('bulkEditPanel').style.display = 'none';
        attendanceManager.selectedStudents.clear();
    });
    
    const bulkOptions = document.querySelectorAll('.bulk-option');
    bulkOptions.forEach(option => {
        option.addEventListener('click', function() {
            const action = this.classList[1];
            if (action === 'note') showBulkNoteModal();
            else bulkMarkStatus(action);
        });
    });
}

function handleSearch(e) {
    attendanceManager.searchTerm = e.target.value;
    attendanceManager.filterStudents();
    displayStudents();
    updateAllStats();
}

function clearSearchInput() {
    const searchInput = document.getElementById('studentSearch');
    if (searchInput) {
        searchInput.value = '';
        handleSearch({ target: searchInput });
    }
}

function handleDepartmentFilter(e) {
    attendanceManager.currentDept = e.target.value;
    attendanceManager.filterStudents();
    displayStudents();
    updateAllStats();
}

function handleFilter(filter) {
    attendanceManager.currentFilter = filter;
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) btn.classList.add('active');
    });
    attendanceManager.filterStudents();
    displayStudents();
    updateAllStats();
}

function updateSubjectDropdown(subjects) {
    const select = document.getElementById('subjectSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Subject</option>';
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.subject_id;
        option.textContent = `${subject.code} - ${subject.name} (${subject.credits} credits)`;
        select.appendChild(option);
    });
}

function updateSessionInfo() {
    const subject = document.getElementById('subjectSelect').value;
    const date = document.getElementById('dateSelect').value;
    const lectureType = document.getElementById('lectureType').value;
    const timeSlot = document.getElementById('timeSlot').value;
    const submitBtn = document.getElementById('submitBtn');
    const summaryDiv = document.getElementById('sessionSummary');
    
    if (subject && date) {
        submitBtn.disabled = false;
        const subjectName = document.getElementById('subjectSelect').selectedOptions[0]?.text || 'Selected Subject';
        summaryDiv.innerHTML = `
            <p><i class="fas fa-check-circle" style="color: #10b981;"></i> Session Ready</p>
            <p><strong>Subject:</strong> ${subjectName}</p>
            <p><strong>Date:</strong> ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Type:</strong> ${lectureType.replace('regular', 'Regular Lecture').replace('lab', 'Lab Session').replace('tutorial', 'Tutorial').replace('seminar', 'Seminar').replace('workshop', 'Workshop')}</p>
            <p><strong>Time:</strong> ${timeSlot.replace('-', ' - ')}</p>
        `;
    } else {
        submitBtn.disabled = true;
        summaryDiv.innerHTML = '<p><i class="fas fa-info-circle"></i> Select subject and date to start</p>';
    }
}

function displayStudents() {
    const container = document.getElementById('studentListContainer');
    const loading = document.getElementById('loadingIndicator');
    const paginatedStudents = attendanceManager.getPaginatedStudents();
    
    if (loading) loading.style.display = 'none';
    if (!container) return;
    
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
    
    const isGridView = container.classList.contains('grid-view');
    
    paginatedStudents.forEach(student => {
        const status = attendanceManager.getAttendance(student.student_id);
        const isSelected = attendanceManager.selectedStudents.has(student.student_id);
        const note = attendanceManager.getNote(student.student_id);
        
        const studentDiv = document.createElement('div');
        studentDiv.className = `student-item ${isSelected ? 'selected' : ''}`;
        studentDiv.dataset.id = student.student_id;
        studentDiv.dataset.dept = student.department || 'General';
        
        const deptClass = (student.department || 'General').toLowerCase().replace(/\s+/g, '-');
        
        if (isGridView) {
            studentDiv.innerHTML = `
                <div class="student-avatar">${student.name.charAt(0).toUpperCase()}</div>
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-id">ID: ${student.student_id}</div>
                    <div class="student-meta">
                        <span class="department-badge ${deptClass}">${student.department || 'General'}</span>
                        <span class="batch-badge">Batch ${student.batch || '2024'}</span>
                    </div>
                    ${note ? `<div class="student-note"><i class="fas fa-sticky-note"></i> ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}</div>` : ''}
                </div>
                <div class="attendance-control">
                    <select class="status-select ${status}" data-id="${student.student_id}">
                        <option value="present" ${status === 'present' ? 'selected' : ''}>✅ Present</option>
                        <option value="absent" ${status === 'absent' ? 'selected' : ''}>❌ Absent</option>
                        <option value="late" ${status === 'late' ? 'selected' : ''}>⏰ Late</option>
                    </select>
                    <button class="action-icon note" data-id="${student.student_id}" title="Add Note">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="action-icon select" data-id="${student.student_id}" title="Select">
                        <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i>
                    </button>
                </div>
            `;
        } else {
            studentDiv.innerHTML = `
                <div class="student-avatar">${student.name.charAt(0).toUpperCase()}</div>
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-id">ID: ${student.student_id}</div>
                    <div class="student-meta">
                        <span class="department-badge ${deptClass}">${student.department || 'General'}</span>
                        <span class="batch-badge">Batch ${student.batch || '2024'}</span>
                    </div>
                    ${note ? `<div class="student-note"><i class="fas fa-sticky-note"></i> ${note.substring(0, 50)}${note.length > 50 ? '...' : ''}</div>` : ''}
                </div>
                <div class="attendance-control">
                    <select class="status-select ${status}" data-id="${student.student_id}">
                        <option value="present" ${status === 'present' ? 'selected' : ''}>✅ Present</option>
                        <option value="absent" ${status === 'absent' ? 'selected' : ''}>❌ Absent</option>
                        <option value="late" ${status === 'late' ? 'selected' : ''}>⏰ Late</option>
                    </select>
                    <button class="action-icon note" data-id="${student.student_id}" title="Add Note">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                    <button class="action-icon select" data-id="${student.student_id}" title="Select">
                        <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i>
                    </button>
                </div>
            `;
        }
        
        const statusSelect = studentDiv.querySelector('.status-select');
        const noteBtn = studentDiv.querySelector('.action-icon.note');
        const selectBtn = studentDiv.querySelector('.action-icon.select');
        
        statusSelect.addEventListener('change', function(e) {
            const newStatus = e.target.value;
            attendanceManager.setAttendance(student.student_id, newStatus);
            this.className = `status-select ${newStatus}`;
            updateAllStats();
        });
        
        noteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showNoteModal(student);
        });
        
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStudentSelection(student.student_id);
            const icon = selectBtn.querySelector('i');
            icon.className = attendanceManager.selectedStudents.has(student.student_id) ? 'fas fa-check-square' : 'fas fa-square';
            studentDiv.classList.toggle('selected');
            updateBulkEditPanel();
        });
        
        studentDiv.addEventListener('click', () => {
            toggleStudentSelection(student.student_id);
            const icon = selectBtn.querySelector('i');
            icon.className = attendanceManager.selectedStudents.has(student.student_id) ? 'fas fa-check-square' : 'fas fa-square';
            studentDiv.classList.toggle('selected');
            updateBulkEditPanel();
        });
        
        container.appendChild(studentDiv);
    });
    
    updatePagination();
    updatePageInfo();
}

function updatePageInfo() {
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
    
    let html = `<button class="page-prev" ${attendanceManager.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= attendanceManager.currentPage - 2 && i <= attendanceManager.currentPage + 2)) {
            html += `<button class="${attendanceManager.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === attendanceManager.currentPage - 3 || i === attendanceManager.currentPage + 3) {
            html += `<button class="page-dots" disabled>...</button>`;
        }
    }
    
    html += `<button class="page-next" ${attendanceManager.currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    paginationDiv.innerHTML = html;
    
    paginationDiv.querySelector('.page-prev')?.addEventListener('click', () => {
        if (attendanceManager.currentPage > 1) {
            attendanceManager.currentPage--;
            displayStudents();
        }
    });
    
    paginationDiv.querySelector('.page-next')?.addEventListener('click', () => {
        if (attendanceManager.currentPage < totalPages) {
            attendanceManager.currentPage++;
            displayStudents();
        }
    });
    
    paginationDiv.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            attendanceManager.currentPage = parseInt(btn.dataset.page);
            displayStudents();
        });
    });
}

function updateAllStats() {
    const stats = attendanceManager.getAttendanceStats();
    
    document.getElementById('quickTotal').textContent = stats.total;
    document.getElementById('quickPresent').textContent = stats.present;
    document.getElementById('quickAbsent').textContent = stats.absent;
    document.getElementById('quickPercentage').textContent = `${stats.percentage}%`;
    
    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('presentCount').textContent = stats.present;
    document.getElementById('absentCount').textContent = stats.absent;
    document.getElementById('lateCount').textContent = stats.late;
    document.getElementById('percentage').textContent = `${stats.percentage}%`;
}

function setViewMode(mode) {
    const container = document.getElementById('studentListContainer');
    const listBtn = document.getElementById('listViewBtn');
    const gridBtn = document.getElementById('gridViewBtn');
    
    if (!container) return;
    
    if (mode === 'list') {
        container.classList.remove('grid-view');
        container.classList.add('list-view');
        listBtn?.classList.add('active');
        gridBtn?.classList.remove('active');
    } else {
        container.classList.remove('list-view');
        container.classList.add('grid-view');
        gridBtn?.classList.add('active');
        listBtn?.classList.remove('active');
    }
    
    displayStudents();
}

function selectAllStudents() {
    attendanceManager.getPaginatedStudents().forEach(student => {
        attendanceManager.selectedStudents.add(student.student_id);
    });
    displayStudents();
    updateBulkEditPanel();
}

function clearAllStudents() {
    attendanceManager.selectedStudents.clear();
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
        document.getElementById('bulkCount').textContent = count;
    } else {
        panel.style.display = 'none';
    }
}

function showNoteModal(student) {
    const modal = document.getElementById('noteModal');
    const message = document.getElementById('noteModalMessage');
    const textarea = document.getElementById('noteText');
    const currentNote = attendanceManager.getNote(student.student_id);
    
    message.textContent = `Add a note for ${student.name} (${student.student_id}):`;
    textarea.value = currentNote;
    modal.dataset.studentId = student.student_id;
    modal.style.display = 'flex';
}

function saveNote() {
    const modal = document.getElementById('noteModal');
    const studentId = modal.dataset.studentId;
    const note = document.getElementById('noteText').value;
    
    if (studentId) {
        attendanceManager.setNote(studentId, note);
        displayStudents();
        showSuccess('Note saved successfully!');
    }
    
    closeNoteModalFunc();
}

function showBulkNoteModal() {
    const modal = document.getElementById('noteModal');
    const message = document.getElementById('noteModalMessage');
    
    message.textContent = `Add a note to ${attendanceManager.selectedStudents.size} selected students:`;
    document.getElementById('noteText').value = '';
    modal.dataset.bulk = 'true';
    modal.style.display = 'flex';
}

function closeNoteModalFunc() {
    document.getElementById('noteModal').style.display = 'none';
    document.getElementById('noteText').value = '';
    delete document.getElementById('noteModal').dataset.studentId;
    delete document.getElementById('noteModal').dataset.bulk;
}

function showSubmitConfirmation() {
    const subjectId = document.getElementById('subjectSelect').value;
    const subjectName = document.getElementById('subjectSelect').selectedOptions[0]?.text;
    const date = document.getElementById('dateSelect').value;
    const lectureType = document.getElementById('lectureType').value;
    const timeSlot = document.getElementById('timeSlot').value;
    
    if (!subjectId || !date) {
        showError('Please select both subject and date');
        return;
    }
    
    const stats = attendanceManager.getAttendanceStats();
    const modal = document.getElementById('confirmModal');
    const message = document.getElementById('modalMessage');
    const details = document.getElementById('modalDetails');
    
    message.textContent = `Submit attendance for ${subjectName} on ${new Date(date).toLocaleDateString()}?`;
    details.innerHTML = `
        <div class="submission-details">
            <p><strong><i class="fas fa-chalkboard-teacher"></i> Lecture Type:</strong> ${lectureType.replace('regular', 'Regular Lecture').replace('lab', 'Lab Session').replace('tutorial', 'Tutorial').replace('seminar', 'Seminar').replace('workshop', 'Workshop')}</p>
            <p><strong><i class="fas fa-clock"></i> Time Slot:</strong> ${timeSlot.replace('-', ' - ')}</p>
            <hr>
            <p><strong><i class="fas fa-chart-line"></i> Attendance Summary:</strong></p>
            <p><i class="fas fa-user-check" style="color: #10b981;"></i> Present: ${stats.present} students</p>
            <p><i class="fas fa-user-times" style="color: #ef4444;"></i> Absent: ${stats.absent} students</p>
            <p><i class="fas fa-clock" style="color: #f59e0b;"></i> Late: ${stats.late} students</p>
            <p><i class="fas fa-users"></i> Total: ${stats.total} students (${stats.percentage}% attendance)</p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

function closeConfirmationModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

async function submitAttendance() {
    const subjectId = document.getElementById('subjectSelect').value;
    const date = document.getElementById('dateSelect').value;
    const lectureType = document.getElementById('lectureType').value;
    const timeSlot = document.getElementById('timeSlot').value;
    const submitBtn = document.getElementById('submitBtn');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }
    
    try {
        const response = await attendanceManager.submitAttendance(subjectId, date, lectureType, timeSlot);
        
        if (response.success) {
            showSuccess('Attendance submitted successfully!');
            clearAllStudents();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('dateSelect').value = today;
            updateSessionInfo();
            attendanceManager.filterStudents();
            displayStudents();
            updateAllStats();
        } else {
            showError(response.error || 'Failed to submit attendance');
        }
    } catch (error) {
        showError('Network error. Please check backend connection.');
        console.error('Submission error:', error);
    } finally {
        closeConfirmationModal();
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit to Database';
        }
    }
}

function checkForDraft() {
    if (attendanceManager.loadDraft()) {
        showWarning('A saved draft was found. Would you like to restore it?', {
            confirmText: 'Restore',
            onConfirm: () => {
                attendanceManager.filterStudents();
                displayStudents();
                updateAllStats();
                showSuccess('Draft restored');
            }
        });
    }
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
        if (statusDiv.style.display !== 'none') statusDiv.style.display = 'none';
    }, 5000);
}

function showStatusMessage(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeAttendancePage);