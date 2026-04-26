/**
 * NoteVault — Main Application Logic
 */

// ============================================================
// STATE
// ============================================================
const state = {
  user: null,
  notes: [],
  reminders: [],
  editingNoteId: null,
  viewingNoteId: null,
};

// ============================================================
// UTILITIES
// ============================================================

function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 250ms ease forwards';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === id.replace('-view', ''));
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}

function setButtonLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text?.classList.toggle('hidden', loading);
  loader?.classList.toggle('hidden', !loading);
}

function confirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    modal.style.display = 'flex';

    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');

    const cleanup = () => { modal.style.display = 'none'; };
    const onOk = () => { cleanup(); ok.removeEventListener('click', onOk); cancel.removeEventListener('click', onCancel); resolve(true); };
    const onCancel = () => { cleanup(); ok.removeEventListener('click', onOk); cancel.removeEventListener('click', onCancel); resolve(false); };

    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
}

// ============================================================
// AUTH
// ============================================================

async function checkAuth() {
  try {
    const res = await API.auth.me();
    state.user = res.user;
    initApp();
  } catch {
    showScreen('auth-screen');
  }
}

function initApp() {
  showScreen('app-screen');
  updateUserDisplay();
  loadNotes();
  loadReminders();
  startTriggeredChecker();
}

function updateUserDisplay() {
  const u = state.user;
  if (!u) return;
  document.getElementById('user-display-name').textContent = u.username;
  document.getElementById('user-display-email').textContent = u.email;
  document.getElementById('user-avatar').textContent = u.username.charAt(0).toUpperCase();
}

// Password strength meter
document.getElementById('reg-password').addEventListener('input', function () {
  const val = this.value;
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  let score = 0;

  if (val.length >= 8) score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/\d/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = [
    { pct: '0%', color: '#a83232', label: 'Weak' },
    { pct: '25%', color: '#c4622d', label: 'Fair' },
    { pct: '50%', color: '#c9a84c', label: 'Moderate' },
    { pct: '75%', color: '#3d7a5a', label: 'Strong' },
    { pct: '100%', color: '#2a5c40', label: 'Excellent' },
  ];

  const lvl = levels[Math.min(score, 4)];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent = lvl.label;
  label.style.color = lvl.color;
});

// Toggle password visibility
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// Auth tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
  });
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  setButtonLoading(btn, true);
  try {
    const res = await API.auth.login({ email, password });
    state.user = res.user;
    initApp();
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed. Please try again.';
  } finally {
    setButtonLoading(btn, false);
  }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const errorEl = document.getElementById('register-error');
  errorEl.textContent = '';

  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  if (!username || !email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  setButtonLoading(btn, true);
  try {
    const res = await API.auth.register({ username, email, password });
    state.user = res.user;
    showToast('Welcome to NoteVault!', 'success');
    initApp();
  } catch (err) {
    if (err.errors) {
      errorEl.textContent = err.errors[0]?.message || err.message;
    } else {
      errorEl.textContent = err.message || 'Registration failed.';
    }
  } finally {
    setButtonLoading(btn, false);
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await API.auth.logout();
  } catch {}
  state.user = null;
  state.notes = [];
  state.reminders = [];
  showScreen('auth-screen');
  showToast('Signed out successfully.', 'info');
});

// Nav
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    showView(`${btn.dataset.view}-view`);
    if (btn.dataset.view === 'notes') loadNotes();
    if (btn.dataset.view === 'reminders') loadReminders();
  });
});

// ============================================================
// NOTES
// ============================================================

async function loadNotes() {
  try {
    const res = await API.notes.list();
    state.notes = res.notes;
    renderNotes();
    document.getElementById('notes-count').textContent = res.notes.length;

    // Update subtitle
    document.getElementById('notes-subtitle').textContent =
      res.notes.length === 0 ? 'Your private workspace' :
      `${res.notes.length} note${res.notes.length !== 1 ? 's' : ''}`;

    // Update reminder note dropdown
    updateNoteDropdown();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderNotes() {
  const grid = document.getElementById('notes-grid');
  const empty = document.getElementById('notes-empty');

  // Remove existing note cards (not the empty state)
  grid.querySelectorAll('.note-card').forEach(c => c.remove());

  if (state.notes.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  state.notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.id = note._id;

    const tagsHtml = (note.tags || []).slice(0, 3).map(t =>
      `<span class="tag">${escapeHtml(t)}</span>`
    ).join('');

    card.innerHTML = `
      <div class="note-card-title">${escapeHtml(note.title)}</div>
      <div class="note-card-preview">${escapeHtml(note.content)}</div>
      <div class="note-card-footer">
        <span class="note-date">${formatDate(note.updatedAt)}</span>
        <div class="note-card-tags">${tagsHtml}</div>
      </div>
    `;

    card.addEventListener('click', () => openNoteModal(note._id));
    grid.appendChild(card);
  });
}

function openNoteModal(noteId) {
  const note = state.notes.find(n => n._id === noteId);
  if (!note) return;

  state.viewingNoteId = noteId;
  document.getElementById('modal-note-title').textContent = note.title;
  document.getElementById('modal-note-content').textContent = note.content;
  document.getElementById('modal-note-meta').textContent =
    `Created ${formatDateTime(note.createdAt)} · Updated ${formatDateTime(note.updatedAt)}`;

  const tagsEl = document.getElementById('modal-note-tags');
  tagsEl.innerHTML = (note.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  document.getElementById('note-modal').style.display = 'flex';
}

document.getElementById('modal-close-btn').addEventListener('click', () => {
  document.getElementById('note-modal').style.display = 'none';
  state.viewingNoteId = null;
});

document.getElementById('note-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('note-modal').style.display = 'none';
  }
});

document.getElementById('modal-edit-btn').addEventListener('click', () => {
  document.getElementById('note-modal').style.display = 'none';
  openNoteEditor(state.viewingNoteId);
});

document.getElementById('modal-delete-btn').addEventListener('click', () => {
  document.getElementById('note-modal').style.display = 'none';
  deleteNote(state.viewingNoteId);
});

// Note Editor
document.getElementById('new-note-btn').addEventListener('click', () => {
  openNoteEditor(null);
});

document.getElementById('cancel-note-btn').addEventListener('click', () => {
  closeNoteEditor();
});

function openNoteEditor(noteId) {
  state.editingNoteId = noteId;
  const editor = document.getElementById('note-editor');
  const titleLabel = document.getElementById('editor-title-label');
  const titleInput = document.getElementById('note-title');
  const contentInput = document.getElementById('note-content');
  const tagsInput = document.getElementById('note-tags');
  const errorEl = document.getElementById('note-error');

  if (noteId) {
    const note = state.notes.find(n => n._id === noteId);
    if (!note) return;
    titleLabel.textContent = 'Edit Note';
    titleInput.value = note.title;
    contentInput.value = note.content;
    tagsInput.value = (note.tags || []).join(', ');
  } else {
    titleLabel.textContent = 'New Note';
    titleInput.value = '';
    contentInput.value = '';
    tagsInput.value = '';
  }

  errorEl.textContent = '';
  document.getElementById('content-chars').textContent = contentInput.value.length;
  editor.style.display = 'block';
  titleInput.focus();

  // Scroll to editor
  editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeNoteEditor() {
  document.getElementById('note-editor').style.display = 'none';
  state.editingNoteId = null;
}

// Character counter
document.getElementById('note-content').addEventListener('input', function () {
  document.getElementById('content-chars').textContent = this.value.length;
});

document.getElementById('save-note-btn').addEventListener('click', async () => {
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  const tagsRaw = document.getElementById('note-tags').value.trim();
  const errorEl = document.getElementById('note-error');

  errorEl.textContent = '';

  if (!title) { errorEl.textContent = 'Title is required.'; return; }
  if (!content) { errorEl.textContent = 'Content is required.'; return; }

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const btn = document.getElementById('save-note-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    if (state.editingNoteId) {
      await API.notes.update(state.editingNoteId, { title, content, tags });
      showToast('Note updated.', 'success');
    } else {
      await API.notes.create({ title, content, tags });
      showToast('Note saved.', 'success');
    }
    closeNoteEditor();
    await loadNotes();
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to save note.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Note';
  }
});

async function deleteNote(noteId) {
  const note = state.notes.find(n => n._id === noteId);
  if (!note) return;

  const confirmed = await confirm('Delete Note', `Delete "${note.title}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await API.notes.delete(noteId);
    showToast('Note deleted.', 'info');
    await loadNotes();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// REMINDERS
// ============================================================

async function loadReminders() {
  try {
    const res = await API.reminders.list();
    state.reminders = res.reminders;
    renderReminders();
    document.getElementById('reminders-count').textContent = res.reminders.length;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderReminders() {
  const list = document.getElementById('reminders-list');
  const empty = document.getElementById('reminders-empty');

  list.querySelectorAll('.reminder-item').forEach(r => r.remove());

  if (state.reminders.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  state.reminders.forEach(rem => {
    const item = document.createElement('div');
    item.className = `reminder-item${rem.triggered ? ' triggered' : ''}`;
    item.dataset.id = rem._id;

    const isRecurring = rem.recurrence?.type !== 'none';
    const recLabel = isRecurring ? rem.recurrence.type : '';

    let timeLine = '';
    if (!isRecurring && rem.dateTime) {
      timeLine = formatDateTime(rem.dateTime);
    } else if (isRecurring) {
      timeLine = `${rem.recurrence.type.charAt(0).toUpperCase() + rem.recurrence.type.slice(1)} reminder`;
    }

    const noteLink = rem.note ? `<span class="reminder-badge">📎 ${escapeHtml(rem.note.title || 'Note')}</span>` : '';
    const triggeredBadge = rem.triggered ? `<span class="reminder-badge triggered-badge">✓ Triggered</span>` : '';
    const recurBadge = isRecurring ? `<span class="reminder-badge recurring">${recLabel}</span>` : '';

    item.innerHTML = `
      <div class="reminder-icon">${rem.triggered ? '◎' : '◉'}</div>
      <div class="reminder-body">
        <div class="reminder-title">${escapeHtml(rem.title)}</div>
        ${rem.description ? `<div style="font-size:0.9rem;color:var(--muted);margin-bottom:0.375rem;">${escapeHtml(rem.description)}</div>` : ''}
        <div class="reminder-meta">
          ${timeLine ? `<span>${timeLine}</span>` : ''}
          ${recurBadge}${triggeredBadge}${noteLink}
        </div>
      </div>
      <div class="reminder-actions">
        <button class="icon-btn delete-reminder-btn" data-id="${rem._id}" title="Delete reminder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;

    item.querySelector('.delete-reminder-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteReminder(rem._id, rem.title);
    });

    list.appendChild(item);
  });
}

function updateNoteDropdown() {
  const select = document.getElementById('rem-note');
  const currentVal = select.value;
  select.innerHTML = '<option value="">— None —</option>';
  state.notes.forEach(note => {
    const opt = document.createElement('option');
    opt.value = note._id;
    opt.textContent = note.title.length > 40 ? note.title.slice(0, 40) + '…' : note.title;
    select.appendChild(opt);
  });
  select.value = currentVal;
}

// Reminder form toggle
document.getElementById('new-reminder-btn').addEventListener('click', () => {
  const card = document.getElementById('reminder-form-card');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';

  // Set default datetime to 1 hour from now
  if (card.style.display === 'block') {
    const dt = document.getElementById('rem-datetime');
    const soon = new Date(Date.now() + 60 * 60 * 1000);
    // Format for datetime-local
    const pad = n => String(n).padStart(2, '0');
    dt.value = `${soon.getFullYear()}-${pad(soon.getMonth()+1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`;
    updateNoteDropdown();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

document.getElementById('cancel-reminder-btn').addEventListener('click', () => {
  document.getElementById('reminder-form-card').style.display = 'none';
  document.getElementById('reminder-error').textContent = '';
});

// Recurrence field visibility
document.getElementById('rem-recurrence').addEventListener('change', function () {
  const val = this.value;
  const dateGroup = document.getElementById('datetime-group');
  const dowGroup = document.getElementById('day-of-week-group');
  const domGroup = document.getElementById('day-of-month-group');
  const monthGroup = document.getElementById('month-group');

  // Reset all
  dowGroup.classList.add('hidden');
  domGroup.classList.add('hidden');
  monthGroup.classList.add('hidden');

  if (val === 'none' || val === 'daily') {
    dateGroup.querySelector('label').textContent = val === 'none' ? 'Date & Time *' : 'Time of Day *';
  } else if (val === 'weekly') {
    dateGroup.querySelector('label').textContent = 'Time of Day *';
    dowGroup.classList.remove('hidden');
  } else if (val === 'monthly') {
    dateGroup.querySelector('label').textContent = 'Time of Day *';
    domGroup.classList.remove('hidden');
  } else if (val === 'yearly') {
    dateGroup.querySelector('label').textContent = 'Time of Day *';
    domGroup.classList.remove('hidden');
    monthGroup.classList.remove('hidden');
  }
});

// Save reminder
document.getElementById('save-reminder-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('reminder-error');
  errorEl.textContent = '';

  const title = document.getElementById('rem-title').value.trim();
  const description = document.getElementById('rem-description').value.trim();
  const recurrenceType = document.getElementById('rem-recurrence').value;
  const dateTimeVal = document.getElementById('rem-datetime').value;
  const noteId = document.getElementById('rem-note').value;

  if (!title) { errorEl.textContent = 'Title is required.'; return; }
  if (!dateTimeVal) { errorEl.textContent = 'Date & time is required.'; return; }

  const recurrence = { type: recurrenceType };

  if (recurrenceType === 'weekly') {
    recurrence.dayOfWeek = parseInt(document.getElementById('rem-day-of-week').value);
  }
  if (recurrenceType === 'monthly' || recurrenceType === 'yearly') {
    recurrence.dayOfMonth = parseInt(document.getElementById('rem-day-of-month').value);
  }
  if (recurrenceType === 'yearly') {
    recurrence.month = parseInt(document.getElementById('rem-month').value);
  }

  const payload = {
    title,
    description,
    dateTime: new Date(dateTimeVal).toISOString(),
    recurrence,
    note: noteId || undefined,
  };

  const btn = document.getElementById('save-reminder-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    await API.reminders.create(payload);
    showToast('Reminder created!', 'success');
    document.getElementById('reminder-form-card').style.display = 'none';
    document.getElementById('rem-title').value = '';
    document.getElementById('rem-description').value = '';
    await loadReminders();
  } catch (err) {
    errorEl.textContent = err.message || 'Failed to create reminder.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Reminder';
  }
});

async function deleteReminder(id, title) {
  const confirmed = await confirm('Delete Reminder', `Delete "${title}"?`);
  if (!confirmed) return;

  try {
    await API.reminders.delete(id);
    showToast('Reminder deleted.', 'info');
    await loadReminders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================================
// TRIGGERED REMINDER CHECKER
// ============================================================

let triggeredCheckInterval;

async function checkTriggered() {
  try {
    const res = await API.reminders.triggered();
    const triggered = res.reminders || [];

    const banner = document.getElementById('triggered-banner');
    const textEl = document.getElementById('triggered-text');

    if (triggered.length > 0) {
      const names = triggered.slice(0, 3).map(r => `"${r.title}"`).join(', ');
      const more = triggered.length > 3 ? ` and ${triggered.length - 3} more` : '';
      textEl.textContent = `Reminder${triggered.length > 1 ? 's' : ''} triggered: ${names}${more}`;
      banner.style.display = 'block';

      // Refresh the reminder list to show updated status
      await loadReminders();
    } else {
      banner.style.display = 'none';
    }
  } catch {}
}

function startTriggeredChecker() {
  // Check immediately then every 60 seconds
  checkTriggered();
  triggeredCheckInterval = setInterval(checkTriggered, 60 * 1000);
}

document.getElementById('triggered-close').addEventListener('click', () => {
  document.getElementById('triggered-banner').style.display = 'none';
});

// Close modals on overlay click
document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    e.currentTarget.style.display = 'none';
  }
});

// ============================================================
// INIT
// ============================================================
checkAuth();
