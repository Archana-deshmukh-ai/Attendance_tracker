// attendanceManager.js - Enhanced Version
class AttendanceManager {
    constructor() {
        this.students = [];
        this.subjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filteredStudents = [];
        this.selectedStudents = new Set();
        this.attendanceData = new Map();
        this.currentView = 'list';
        this.searchTerm = '';
        this.currentFilter = 'all';
        this.currentDept = 'all';
        this.loadFromLocalStorage();
    }
    
    loadFromLocalStorage() { try { const saved = localStorage.getItem('attendance_draft'); if (saved) { const data = JSON.parse(saved); this.attendanceData = new Map(data.attendanceData); this.selectedStudents = new Set(data.selectedStudents); return true; } } catch(e) { console.error(e); } return false; }
    saveToLocalStorage() { try { localStorage.setItem('attendance_draft', JSON.stringify({ attendanceData: Array.from(this.attendanceData.entries()), selectedStudents: Array.from(this.selectedStudents), timestamp: new Date().toISOString() })); } catch(e) { console.error(e); } }
    
    async loadSubjects() { try { const res = await fetch('/api/subjects'); const data = await res.json(); if (data.success) this.subjects = data.subjects; return this.subjects; } catch(e) { console.error(e); return []; } }
    async loadStudents() { try { const res = await fetch('/api/students'); const data = await res.json(); if (data.success) { this.students = data.students; this.filteredStudents = [...this.students]; } return this.students; } catch(e) { console.error(e); return []; } }
    
    filterStudents() {
        this.filteredStudents = this.students.filter(s => {
            if (this.currentDept !== 'all' && s.department !== this.currentDept) return false;
            if (this.searchTerm) { const search = `${s.student_id} ${s.name} ${s.department}`.toLowerCase(); if (!search.includes(this.searchTerm.toLowerCase())) return false; }
            if (this.currentFilter !== 'all') { const status = this.attendanceData.get(s.student_id) || 'absent'; if (this.currentFilter !== status) return false; }
            return true;
        });
        this.currentPage = 1;
        return this.filteredStudents;
    }
    
    getPaginatedStudents() { const start = (this.currentPage - 1) * this.itemsPerPage; return this.filteredStudents.slice(start, start + this.itemsPerPage); }
    getTotalPages() { return Math.ceil(this.filteredStudents.length / this.itemsPerPage); }
    setAttendance(studentId, status) { this.attendanceData.set(studentId, status); this.saveToLocalStorage(); return status; }
    getAttendance(studentId) { return this.attendanceData.get(studentId) || 'absent'; }
    getAttendanceStats() { const present = Array.from(this.attendanceData.values()).filter(s => s === 'present').length; const absent = Array.from(this.attendanceData.values()).filter(s => s === 'absent').length; const late = Array.from(this.attendanceData.values()).filter(s => s === 'late').length; const total = this.filteredStudents.length; const percentage = total > 0 ? Math.round((present + late) / total * 100) : 0; return { present, absent, late, total, percentage }; }
    
    async submitAttendance(subjectId, date, lectureType, timeSlot) {
        try {
            const presentIds = [], absentIds = [];
            this.filteredStudents.forEach(s => { const status = this.getAttendance(s.student_id); if (status === 'present' || status === 'late') presentIds.push(s.student_id); else absentIds.push(s.student_id); });
            const res = await fetch('/api/mark_attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_id: subjectId, date, present: presentIds, absent: absentIds, lecture_type: lectureType, time_slot: timeSlot }) });
            const data = await res.json();
            if (data.success) { localStorage.removeItem('attendance_draft'); this.attendanceData.clear(); this.selectedStudents.clear(); }
            return data;
        } catch(e) { console.error(e); throw e; }
    }
    
    exportToCSV() {
        const headers = ['Student ID', 'Name', 'Department', 'Batch', 'Status'];
        const rows = this.filteredStudents.map(s => [s.student_id, s.name, s.department, s.batch, this.getAttendance(s.student_id)]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

let attendanceManager;
function initializeAttendancePage() {
    console.log('Attendance page loaded');
    attendanceManager = new AttendanceManager();
    const today = new Date().toISOString().split('T')[0];
    const dateSelect = document.getElementById('dateSelect');
    if (dateSelect) dateSelect.value = today;
    
    attendanceManager.loadSubjects().then(subjects => { updateSubjectDropdown(subjects); }).catch(e => { showError('Failed to load subjects'); });
    attendanceManager.loadStudents().then(() => { displayStudents(); updateAllStats(); }).catch(e => { showError('Failed to load students'); });
    setupEventListeners();
    if (attendanceManager.loadFromLocalStorage()) showWarning('Saved draft found. Restore?', { onConfirm: () => { displayStudents(); showSuccess('Draft restored'); } });
}

function setupEventListeners() {
    document.getElementById('studentSearch')?.addEventListener('input', e => { attendanceManager.searchTerm = e.target.value; filterAndDisplay(); });
    document.getElementById('clearSearch')?.addEventListener('click', () => { document.getElementById('studentSearch').value = ''; attendanceManager.searchTerm = ''; filterAndDisplay(); });
    document.getElementById('deptFilter')?.addEventListener('change', e => { attendanceManager.currentDept = e.target.value; filterAndDisplay(); });
    document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', function() { document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); this.classList.add('active'); attendanceManager.currentFilter = this.dataset.filter; filterAndDisplay(); }));
    document.getElementById('listViewBtn')?.addEventListener('click', () => { document.getElementById('listViewBtn').classList.add('active'); document.getElementById('gridViewBtn').classList.remove('active'); document.getElementById('studentListContainer').className = 'student-list-container list-view'; });
    document.getElementById('gridViewBtn')?.addEventListener('click', () => { document.getElementById('gridViewBtn').classList.add('active'); document.getElementById('listViewBtn').classList.remove('active'); document.getElementById('studentListContainer').className = 'student-list-container grid-view'; });
    document.getElementById('itemsPerPage')?.addEventListener('change', e => { attendanceManager.itemsPerPage = parseInt(e.target.value); displayStudents(); });
    document.getElementById('subjectSelect')?.addEventListener('change', updateSessionInfo);
    document.getElementById('dateSelect')?.addEventListener('change', updateSessionInfo);
    document.getElementById('selectAllBtn')?.addEventListener('click', selectAllStudents);
    document.getElementById('clearAllBtn')?.addEventListener('click', clearAllStudents);
    document.getElementById('markPresentBtn')?.addEventListener('click', () => bulkMarkStatus('present'));
    document.getElementById('markAbsentBtn')?.addEventListener('click', () => bulkMarkStatus('absent'));
    document.getElementById('exportBtn')?.addEventListener('click', () => attendanceManager.exportToCSV());
    document.getElementById('saveDraftBtn')?.addEventListener('click', () => { attendanceManager.saveToLocalStorage(); showSuccess('Draft saved'); });
    document.getElementById('submitBtn')?.addEventListener('click', showSubmitConfirmation);
    document.querySelector('.close-modal')?.addEventListener('click', closeModal);
    document.querySelector('.modal-btn.cancel')?.addEventListener('click', closeModal);
    document.querySelector('.modal-btn.confirm')?.addEventListener('click', submitAttendance);
}

function updateSubjectDropdown(subjects) { const select = document.getElementById('subjectSelect'); if (!select) return; select.innerHTML = '<option value="">Select Subject</option>'; subjects.forEach(s => { const opt = document.createElement('option'); opt.value = s.subject_id; opt.textContent = `${s.code} - ${s.name}`; select.appendChild(opt); }); }
function updateSessionInfo() { const subject = document.getElementById('subjectSelect')?.value; const date = document.getElementById('dateSelect')?.value; const btn = document.getElementById('submitBtn'); if (btn) btn.disabled = !subject || !date; }
function displayStudents() { const container = document.getElementById('studentListContainer'); if (!container) return; const paginated = attendanceManager.getPaginatedStudents(); container.innerHTML = ''; if (!paginated.length) { container.innerHTML = '<div class="empty-state"><i class="fas fa-users-slash"></i><h3>No Students Found</h3></div>'; return; } paginated.forEach(s => { const status = attendanceManager.getAttendance(s.student_id); const isSelected = attendanceManager.selectedStudents.has(s.student_id); const div = document.createElement('div'); div.className = `student ${isSelected ? 'selected' : ''}`; div.dataset.id = s.student_id; div.innerHTML = `<div class="student-info"><div class="student-avatar">${s.name.charAt(0)}</div><div class="student-details"><div class="student-name">${s.name}${isSelected ? '<i class="fas fa-check-circle selected-icon"></i>' : ''}</div><div class="student-id">ID: ${s.student_id}</div><div class="student-meta"><span class="department-badge">${s.department}</span><span class="batch-badge">Batch ${s.batch}</span></div></div></div><div class="attendance-control"><select class="status-select ${status}" data-id="${s.student_id}"><option value="present" ${status === 'present' ? 'selected' : ''}>Present</option><option value="absent" ${status === 'absent' ? 'selected' : ''}>Absent</option><option value="late" ${status === 'late' ? 'selected' : ''}>Late</option></select><div class="attendance-actions"><button class="action-icon select" data-id="${s.student_id}" title="Select"><i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i></button></div></div>`; div.querySelector('.status-select').addEventListener('change', e => { attendanceManager.setAttendance(s.student_id, e.target.value); e.target.className = `status-select ${e.target.value}`; updateAllStats(); }); div.querySelector('.select').addEventListener('click', () => { if (attendanceManager.selectedStudents.has(s.student_id)) attendanceManager.selectedStudents.delete(s.student_id); else attendanceManager.selectedStudents.add(s.student_id); const icon = div.querySelector('.select i'); icon.className = attendanceManager.selectedStudents.has(s.student_id) ? 'fas fa-check-square' : 'fas fa-square'; div.classList.toggle('selected'); updateBulkEditPanel(); }); container.appendChild(div); }); updatePagination(); }
function updatePagination() { const pagination = document.getElementById('pagination'); if (!pagination) return; const total = attendanceManager.getTotalPages(); if (total <= 1) { pagination.innerHTML = ''; return; } let html = `<button class="page-prev" ${attendanceManager.currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`; for (let i = 1; i <= total; i++) { html += `<button class="${attendanceManager.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`; } html += `<button class="page-next" ${attendanceManager.currentPage === total ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`; pagination.innerHTML = html; pagination.querySelector('.page-prev')?.addEventListener('click', () => { if (attendanceManager.currentPage > 1) { attendanceManager.currentPage--; displayStudents(); } }); pagination.querySelector('.page-next')?.addEventListener('click', () => { if (attendanceManager.currentPage < total) { attendanceManager.currentPage++; displayStudents(); } }); pagination.querySelectorAll('button[data-page]').forEach(b => b.addEventListener('click', () => { attendanceManager.currentPage = parseInt(b.dataset.page); displayStudents(); })); }
function updateAllStats() { const stats = attendanceManager.getAttendanceStats(); const qTotal = document.getElementById('quickTotal'); const qPresent = document.getElementById('quickPresent'); const qAbsent = document.getElementById('quickAbsent'); const qPercent = document.getElementById('quickPercentage'); if (qTotal) qTotal.textContent = stats.total; if (qPresent) qPresent.textContent = stats.present; if (qAbsent) qAbsent.textContent = stats.absent; if (qPercent) qPercent.textContent = `${stats.percentage}%`; const totalC = document.getElementById('totalCount'); const presentC = document.getElementById('presentCount'); const absentC = document.getElementById('absentCount'); const percentC = document.getElementById('percentage'); if (totalC) totalC.textContent = stats.total; if (presentC) presentC.textContent = stats.present; if (absentC) absentC.textContent = stats.absent; if (percentC) percentC.textContent = `${stats.percentage}%`; }
function filterAndDisplay() { attendanceManager.filterStudents(); displayStudents(); updateAllStats(); }
function selectAllStudents() { attendanceManager.getPaginatedStudents().forEach(s => attendanceManager.selectedStudents.add(s.student_id)); displayStudents(); updateBulkEditPanel(); }
function clearAllStudents() { attendanceManager.getPaginatedStudents().forEach(s => attendanceManager.selectedStudents.delete(s.student_id)); displayStudents(); updateBulkEditPanel(); }
function bulkMarkStatus(status) { attendanceManager.selectedStudents.forEach(id => attendanceManager.setAttendance(id, status)); displayStudents(); updateAllStats(); }
function updateBulkEditPanel() { const panel = document.getElementById('bulkEditPanel'); if (!panel) return; const count = attendanceManager.selectedStudents.size; if (count > 0) { panel.style.display = 'block'; panel.querySelector('h4').innerHTML = `<i class="fas fa-users"></i> Bulk Edit (${count} selected)`; panel.querySelectorAll('.bulk-option').forEach(btn => btn.addEventListener('click', function() { const action = this.classList[1]; if (action === 'note') showBulkNoteModal(); else bulkMarkStatus(action); })); } else panel.style.display = 'none'; }
function showSubmitConfirmation() { const subjectId = document.getElementById('subjectSelect')?.value; const subjectName = document.getElementById('subjectSelect')?.selectedOptions[0]?.text; const date = document.getElementById('dateSelect')?.value; if (!subjectId || !date) { showError('Select subject and date'); return; } const stats = attendanceManager.getAttendanceStats(); const modal = document.getElementById('confirmModal'); if (!modal) return; modal.querySelector('#modalMessage').textContent = `Submit attendance for ${subjectName} on ${date}?`; modal.querySelector('#modalDetails').innerHTML = `<div class="submission-details"><p><strong>Attendance Summary:</strong></p><p>✅ Present: ${stats.present} students</p><p>❌ Absent: ${stats.absent} students</p><p>⏰ Late: ${stats.late} students</p><p>📊 Total: ${stats.total} students (${stats.percentage}%)</p></div>`; modal.style.display = 'flex'; }
function submitAttendance() { const subjectId = document.getElementById('subjectSelect')?.value; const date = document.getElementById('dateSelect')?.value; const btn = document.getElementById('submitBtn'); if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; } attendanceManager.submitAttendance(subjectId, date, 'Theory', 'Morning').then(res => { if (res.success) { showSuccess('Attendance submitted!'); clearAllStudents(); if (dateSelect) dateSelect.value = new Date().toISOString().split('T')[0]; updateSessionInfo(); filterAndDisplay(); } else showError(res.error || 'Failed'); }).catch(e => showError('Network error')).finally(() => { closeModal(); if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Submit to Database'; } }); }
function closeModal() { const modal = document.getElementById('confirmModal'); if (modal) modal.style.display = 'none'; }
function showBulkNoteModal() { showInfo('Bulk note feature coming soon'); }
function showSuccess(msg) { showStatusMessage(msg, 'success'); }
function showError(msg) { showStatusMessage(msg, 'error'); }
function showWarning(msg, opts = {}) { const div = document.getElementById('statusMessage'); if (div) { div.textContent = msg; div.className = 'status-message warning'; div.style.display = 'block'; if (opts.onConfirm) { const actions = document.createElement('div'); actions.className = 'status-actions'; actions.innerHTML = `<button class="status-btn confirm">Restore</button><button class="status-btn cancel">Ignore</button>`; div.appendChild(actions); actions.querySelector('.confirm').onclick = () => { opts.onConfirm(); div.style.display = 'none'; }; actions.querySelector('.cancel').onclick = () => div.style.display = 'none'; } setTimeout(() => { if (div.style.display !== 'none') div.style.display = 'none'; }, 5000); } }
function showInfo(msg) { const div = document.getElementById('statusMessage'); if (div) { div.textContent = msg; div.className = 'status-message info'; div.style.display = 'block'; setTimeout(() => div.style.display = 'none', 3000); } }
function showStatusMessage(msg, type) { const div = document.getElementById('statusMessage'); if (div) { div.textContent = msg; div.className = `status-message ${type}`; div.style.display = 'block'; setTimeout(() => div.style.display = 'none', 5000); } }
window.initializeAttendancePage = initializeAttendancePage;