/* =========================================================
   Life Dashboard - app logic (vanilla JavaScript)
   All data is stored in the browser with the Local Storage API.
   ========================================================= */
'use strict';

/* ---------- Helpers ---------- */
const KEYS = {
  theme: 'lifeDashboard.theme',
  name: 'lifeDashboard.name',
  tasks: 'lifeDashboard.tasks',
  sort: 'lifeDashboard.sort',
  links: 'lifeDashboard.links',
  focusMinutes: 'lifeDashboard.focusMinutes'
};

// Local Storage can be unavailable (private mode, blocked cookies), so never let it crash the app.
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* ignore: the app still works for this visit */
    }
  }
};

const $ = (selector) => document.querySelector(selector);
const pad = (n) => String(n).padStart(2, '0');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const normalizeText = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase();

function flashError(element, message, shakeTarget) {
  element.textContent = message;
  if (shakeTarget) {
    shakeTarget.classList.remove('shake');
    void shakeTarget.offsetWidth; // restart the animation
    shakeTarget.classList.add('shake');
  }
}

function svgIcon(paths) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  paths.forEach((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  return svg;
}

const ICONS = {
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  edit: ['M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z', 'M13.5 6.5l4 4'],
  trash: ['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12', 'M9 7V4h6v3']
};

/* =========================================================
   Theme (challenge: light / dark mode)
   ========================================================= */
const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

root.dataset.theme = storage.get(KEYS.theme, null) || (systemDark.matches ? 'dark' : 'light');

$('#themeToggle').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  storage.set(KEYS.theme, next);
});

/* =========================================================
   Greeting, clock and date (challenge: custom name)
   ========================================================= */
const clockMain = $('#clockMain');
const clockSec = $('#clockSec');
const dateEl = $('#date');
const greetingText = $('#greetingText');
const nameBtn = $('#nameBtn');
const nameForm = $('#nameForm');
const nameInput = $('#nameInput');

let userName = storage.get(KEYS.name, '');

function greetingFor(hour) {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function updateClock() {
  const now = new Date();
  clockMain.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  clockSec.textContent = `:${pad(now.getSeconds())}`;
  dateEl.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  greetingText.textContent = greetingFor(now.getHours());
}

function renderName() {
  nameBtn.textContent = userName || 'add your name';
  nameBtn.classList.toggle('is-empty', !userName);
}

function openNameEditor() {
  nameInput.value = userName;
  nameBtn.hidden = true;
  nameForm.hidden = false;
  nameInput.focus();
  nameInput.select();
}

function closeNameEditor(save) {
  if (nameForm.hidden) return;
  if (save) {
    userName = nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 24);
    storage.set(KEYS.name, userName);
  }
  nameForm.hidden = true;
  nameBtn.hidden = false;
  renderName();
}

nameBtn.addEventListener('click', openNameEditor);
nameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  closeNameEditor(true);
  nameBtn.focus();
});
nameInput.addEventListener('blur', () => closeNameEditor(true));
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeNameEditor(false);
    nameBtn.focus();
  }
});

/* =========================================================
   Focus timer (challenge: change Pomodoro time)
   ========================================================= */
const RING_LENGTH = 2 * Math.PI * 96;

const timerCard = $('.timer');
const timerTime = $('#timerTime');
const timerCaption = $('#timerCaption');
const timerState = $('#timerState');
const ringProgress = $('#ringProgress');
const startBtn = $('#timerStart');
const stopBtn = $('#timerStop');
const resetBtn = $('#timerReset');
const durationInput = $('#durationInput');
const durationDown = $('#durationDown');
const durationUp = $('#durationUp');

let focusMinutes = clamp(Number(storage.get(KEYS.focusMinutes, 25)) || 25, 1, 120);
let remainingSeconds = focusMinutes * 60;
let endsAt = 0;
let timerInterval = null;
let timerFinished = false;

const isRunning = () => timerInterval !== null;
const formatTime = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

function renderTimer() {
  const total = focusMinutes * 60;
  const time = formatTime(remainingSeconds);

  timerTime.textContent = time;
  timerCaption.textContent = `${focusMinutes} min session`;
  ringProgress.style.strokeDasharray = `${RING_LENGTH}px`;
  ringProgress.style.strokeDashoffset = `${RING_LENGTH * (1 - remainingSeconds / total)}px`;

  const paused = !isRunning() && !timerFinished && remainingSeconds < total;
  timerState.textContent = isRunning() ? 'Focusing' : timerFinished ? 'Done' : paused ? 'Paused' : 'Ready';
  timerState.classList.toggle('is-running', isRunning());
  timerState.classList.toggle('is-done', timerFinished);
  timerCard.classList.toggle('is-running', isRunning());

  startBtn.textContent = paused ? 'Resume' : 'Start';
  startBtn.disabled = isRunning();
  stopBtn.disabled = !isRunning();
  durationInput.value = focusMinutes;
  durationInput.disabled = isRunning();
  durationDown.disabled = isRunning() || focusMinutes <= 1;
  durationUp.disabled = isRunning() || focusMinutes >= 120;

  document.title = isRunning() ? `${time} · Focus` : 'Life Dashboard';
}

function tickTimer() {
  remainingSeconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  if (remainingSeconds === 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    timerFinished = true;
    playChime();
  }
  renderTimer();
}

function startTimer() {
  if (isRunning()) return;
  if (remainingSeconds <= 0) remainingSeconds = focusMinutes * 60;
  timerFinished = false;
  endsAt = Date.now() + remainingSeconds * 1000;
  timerInterval = setInterval(tickTimer, 250);
  renderTimer();
}

function stopTimer() {
  if (!isRunning()) return;
  clearInterval(timerInterval);
  timerInterval = null;
  renderTimer();
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerFinished = false;
  remainingSeconds = focusMinutes * 60;
  renderTimer();
}

function setFocusMinutes(minutes) {
  if (isRunning()) return;
  focusMinutes = clamp(Math.round(minutes) || 25, 1, 120);
  storage.set(KEYS.focusMinutes, focusMinutes);
  resetTimer();
}

// Short three-note chime with the Web Audio API, so no sound file is needed.
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    [660, 880, 1046].forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.65);
    });
  } catch (err) {
    /* audio not available */
  }
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);
durationDown.addEventListener('click', () => setFocusMinutes(focusMinutes === 1 ? 1 : Math.max(1, focusMinutes - 5)));
durationUp.addEventListener('click', () => setFocusMinutes(focusMinutes === 1 ? 5 : focusMinutes + 5));
durationInput.addEventListener('change', () => setFocusMinutes(Number(durationInput.value)));

/* =========================================================
   To-do list (challenges: prevent duplicates, sort tasks)
   ========================================================= */
const todoForm = $('#todoForm');
const todoInput = $('#todoInput');
const todoError = $('#todoError');
const todoList = $('#todoList');
const todoEmpty = $('#todoEmpty');
const todoFooter = $('#todoFooter');
const todoCount = $('#todoCount');
const todoProgress = $('#todoProgress');
const sortSelect = $('#sortSelect');
const clearDoneBtn = $('#clearDone');
const summary = $('#summary');

let tasks = storage.get(KEYS.tasks, []);
let sortMode = storage.get(KEYS.sort, 'newest');
let editingId = null;

if (!Array.isArray(tasks)) tasks = [];
if (!['newest', 'oldest', 'az', 'pending'].includes(sortMode)) sortMode = 'newest';
sortSelect.value = sortMode;

const saveTasks = () => storage.set(KEYS.tasks, tasks);
const findTask = (id) => tasks.find((task) => task.id === id);

function isDuplicateTask(text, ignoreId) {
  const wanted = normalizeText(text);
  return tasks.some((task) => task.id !== ignoreId && normalizeText(task.text) === wanted);
}

function sortedTasks() {
  const list = tasks.slice();
  switch (sortMode) {
    case 'oldest':
      return list.sort((a, b) => a.createdAt - b.createdAt);
    case 'az':
      return list.sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));
    case 'pending':
      return list.sort((a, b) => Number(a.done) - Number(b.done) || b.createdAt - a.createdAt);
    default:
      return list.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function createTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (task.done ? ' is-done' : '');
  li.dataset.id = task.id;

  const check = document.createElement('button');
  check.type = 'button';
  check.className = 'check';
  check.dataset.action = 'toggle';
  check.setAttribute('aria-pressed', String(task.done));
  check.setAttribute('aria-label', task.done ? `Mark "${task.text}" as not done` : `Mark "${task.text}" as done`);
  check.appendChild(svgIcon(ICONS.check));
  li.appendChild(check);

  if (task.id === editingId) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'todo-edit';
    input.maxLength = 120;
    input.value = task.text;
    input.setAttribute('aria-label', 'Edit task');
    li.appendChild(input);
  } else {
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = task.text;
    text.title = 'Double-click to edit';
    li.appendChild(text);
  }

  const actions = document.createElement('div');
  actions.className = 'todo-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'action-btn';
  editBtn.dataset.action = 'edit';
  editBtn.setAttribute('aria-label', `Edit "${task.text}"`);
  editBtn.title = 'Edit';
  editBtn.appendChild(svgIcon(ICONS.edit));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'action-btn danger';
  deleteBtn.dataset.action = 'delete';
  deleteBtn.setAttribute('aria-label', `Delete "${task.text}"`);
  deleteBtn.title = 'Delete';
  deleteBtn.appendChild(svgIcon(ICONS.trash));

  actions.append(editBtn, deleteBtn);
  li.appendChild(actions);
  return li;
}

function renderTasks() {
  todoList.replaceChildren(...sortedTasks().map(createTaskItem));

  const total = tasks.length;
  const done = tasks.filter((task) => task.done).length;
  const left = total - done;

  todoEmpty.hidden = total > 0;
  todoFooter.hidden = done === 0;
  todoProgress.style.width = total ? `${(done / total) * 100}%` : '0%';
  todoCount.textContent = total ? `${left} left · ${done} done` : 'No tasks yet';

  if (!total) summary.textContent = 'Your list is empty. Plan something small to start the day.';
  else if (!left) summary.textContent = 'Everything is done. Nice work!';
  else summary.textContent = `You have ${left} task${left === 1 ? '' : 's'} left today. One step at a time.`;

  const editInput = todoList.querySelector('.todo-edit');
  if (editInput) {
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
  }
}

function addTask(text) {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) {
    flashError(todoError, 'Please type a task first.', todoForm);
    return false;
  }
  if (isDuplicateTask(clean)) {
    flashError(todoError, `"${clean}" is already on your list.`, todoForm);
    return false;
  }
  tasks.push({ id: makeId(), text: clean, done: false, createdAt: Date.now() });
  saveTasks();
  renderTasks();
  return true;
}

function startEditing(id) {
  editingId = id;
  todoError.textContent = '';
  renderTasks();
}

function finishEditing(save) {
  if (editingId === null) return;
  const task = findTask(editingId);
  const input = todoList.querySelector('.todo-edit');

  if (save && task && input) {
    const clean = input.value.trim().replace(/\s+/g, ' ');
    if (clean && isDuplicateTask(clean, task.id)) {
      flashError(todoError, `"${clean}" is already on your list.`, input.closest('.todo-item'));
      input.focus();
      return;
    }
    if (clean) {
      task.text = clean;
      saveTasks();
    }
  }
  editingId = null;
  todoError.textContent = '';
  renderTasks();
}

todoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (addTask(todoInput.value)) {
    todoInput.value = '';
    todoError.textContent = '';
  }
  todoInput.focus();
});

todoInput.addEventListener('input', () => {
  todoError.textContent = '';
});

todoList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const id = button.closest('.todo-item').dataset.id;
  const task = findTask(id);
  if (!task) return;

  if (button.dataset.action === 'toggle') {
    task.done = !task.done;
    saveTasks();
    if (editingId === id) finishEditing(true);
    else renderTasks();
  } else if (button.dataset.action === 'edit') {
    if (editingId === id) finishEditing(true);
    else startEditing(id);
  } else if (button.dataset.action === 'delete') {
    tasks = tasks.filter((item) => item.id !== id);
    if (editingId === id) editingId = null;
    saveTasks();
    renderTasks();
  }
});

todoList.addEventListener('dblclick', (event) => {
  const text = event.target.closest('.todo-text');
  if (text) startEditing(text.closest('.todo-item').dataset.id);
});

todoList.addEventListener('keydown', (event) => {
  if (!event.target.classList.contains('todo-edit')) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    finishEditing(true);
  } else if (event.key === 'Escape') {
    finishEditing(false);
  }
});

// Save the edit when focus leaves the input (but not when clicking that row's own buttons).
todoList.addEventListener('focusout', (event) => {
  if (!event.target.classList.contains('todo-edit')) return;
  const row = event.target.closest('.todo-item');
  if (event.relatedTarget && row.contains(event.relatedTarget)) return;
  finishEditing(true);
});

sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  storage.set(KEYS.sort, sortMode);
  renderTasks();
});

clearDoneBtn.addEventListener('click', () => {
  tasks = tasks.filter((task) => !task.done);
  saveTasks();
  renderTasks();
});

/* =========================================================
   Quick links
   ========================================================= */
const DEFAULT_LINKS = [
  { id: 'gh', name: 'GitHub', url: 'https://github.com/' },
  { id: 'yt', name: 'YouTube', url: 'https://www.youtube.com/' },
  { id: 'gm', name: 'Gmail', url: 'https://mail.google.com/' },
  { id: 'kr', name: 'Kiro', url: 'https://kiro.dev/' }
];

const linkList = $('#linkList');
const linkEmpty = $('#linkEmpty');
const linkForm = $('#linkForm');
const linkName = $('#linkName');
const linkUrl = $('#linkUrl');
const linkError = $('#linkError');
const linkAddToggle = $('#linkAddToggle');
const linkCancel = $('#linkCancel');

let links = storage.get(KEYS.links, DEFAULT_LINKS);
if (!Array.isArray(links)) links = DEFAULT_LINKS.slice();

const saveLinks = () => storage.set(KEYS.links, links);

function normalizeUrl(value) {
  let text = value.trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
    return url.href;
  } catch (err) {
    return null;
  }
}

function colorFor(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return `hsl(${hash} 65% 52%)`;
}

function createLinkTile(link) {
  const li = document.createElement('li');
  li.className = 'link-tile';
  li.dataset.id = link.id;

  const a = document.createElement('a');
  a.href = link.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = link.url;

  const icon = document.createElement('span');
  icon.className = 'link-icon';
  icon.style.background = colorFor(link.name);
  icon.textContent = link.name.charAt(0).toUpperCase();

  const host = new URL(link.url).hostname;
  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  img.addEventListener('error', () => img.remove()); // fall back to the coloured letter
  icon.appendChild(img);

  const label = document.createElement('span');
  label.className = 'link-label';
  label.textContent = link.name;

  a.append(icon, label);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'link-remove';
  remove.dataset.action = 'remove-link';
  remove.setAttribute('aria-label', `Remove ${link.name}`);
  remove.title = 'Remove';
  remove.textContent = '×';

  li.append(a, remove);
  return li;
}

function renderLinks() {
  linkList.replaceChildren(...links.map(createLinkTile));
  linkEmpty.hidden = links.length > 0;
}

function toggleLinkForm(open) {
  linkForm.hidden = !open;
  linkAddToggle.setAttribute('aria-expanded', String(open));
  linkAddToggle.textContent = open ? 'Close' : '+ Add';
  linkError.textContent = '';
  if (open) {
    linkName.focus();
  } else {
    linkForm.reset();
  }
}

linkAddToggle.addEventListener('click', () => toggleLinkForm(linkForm.hidden));
linkCancel.addEventListener('click', () => toggleLinkForm(false));

linkForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const url = normalizeUrl(linkUrl.value);
  let name = linkName.value.trim().replace(/\s+/g, ' ');

  if (!url) {
    flashError(linkError, 'Please enter a valid website, e.g. github.com', linkForm);
    linkUrl.focus();
    return;
  }
  if (!name) name = new URL(url).hostname.replace(/^www\./, '');
  if (links.some((link) => link.url === url)) {
    flashError(linkError, 'That link is already saved.', linkForm);
    return;
  }

  links.push({ id: makeId(), name: name.slice(0, 24), url });
  saveLinks();
  renderLinks();
  toggleLinkForm(false);
});

linkList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="remove-link"]');
  if (!button) return;
  const id = button.closest('.link-tile').dataset.id;
  links = links.filter((link) => link.id !== id);
  saveLinks();
  renderLinks();
});

/* ---------- Start ---------- */
updateClock();
setInterval(updateClock, 1000);
renderName();
renderTimer();
renderTasks();
renderLinks();
