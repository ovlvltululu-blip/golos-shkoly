const app = document.getElementById('app');
const toast = document.getElementById('toast');
const REQUESTS_KEY = 'school-voice-requests';
const SESSION_KEY = 'school-voice-admin-session';
const TOKEN_KEY = 'school-voice-admin-token';
const API_ENABLED = window.location.protocol !== 'file:';
let adminRequests = null;

async function apiRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

const icons = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6 6-6-6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.2 4L19 6"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>'
};

const categories = {
  study: 'Навчання',
  events: 'Події та спільнота',
  space: 'Простір школи',
  wellbeing: 'Добробут учнів',
  other: 'Інше'
};

const statuses = {
  new: { label: 'Нова', className: 'status-new' },
  review: { label: 'На розгляді', className: 'status-review' },
  approved: { label: 'Схвалена', className: 'status-approved' },
  rejected: { label: 'Відхилена', className: 'status-rejected' }
};

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}

function getRequests() {
  try {
    const saved = JSON.parse(localStorage.getItem(REQUESTS_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (_) {}
  const seed = [
    { id: 'GS-2401', firstName: 'Софія', lastName: 'Мельник', title: 'Тиждень учнівських клубів', category: 'events', detail: 'Хочу запропонувати зробити один тиждень, коли кожен клуб зможе розповісти про себе та запросити нових учасників. Так буде простіше знайти однодумців.', status: 'review', note: '', createdAt: '2026-10-06T09:30:00.000Z' },
    { id: 'GS-2398', firstName: 'Артем', lastName: 'Коваль', title: 'Більше місць для тихої роботи', category: 'space', detail: 'Було б добре облаштувати кілька тихих місць у бібліотеці або коридорі для підготовки до контрольних між уроками.', status: 'new', note: '', createdAt: '2026-10-05T12:15:00.000Z' },
    { id: 'GS-2384', firstName: 'Марія', lastName: 'Бондар', title: 'День без одноразового пластику', category: 'wellbeing', detail: 'Пропоную провести тематичний день і разом придумати, як зменшити кількість одноразових стаканчиків у школі.', status: 'approved', note: 'Ідею беремо в план на наступний місяць.', createdAt: '2026-10-02T08:00:00.000Z' }
  ];
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(seed));
  return seed;
}

function saveRequests(requests) { localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests)); }
async function fetchAdminRequests() {
  const payload = await apiRequest('/requests');
  adminRequests = payload.requests || [];
  saveRequests(adminRequests);
  return adminRequests;
}
function formatDate(value) { return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }
function formatDateTime(value) { return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function statusPill(status) { const item = statuses[status] || statuses.new; return `<span class="status-pill ${item.className}">${item.label}</span>`; }
function slugFromHash() { return window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '') || 'home'; }
function navigate(path) { window.location.hash = path; }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3400); }

function publicLayout(content) {
  return `<div class="shell"><div class="container"><header class="topbar"><a class="brand" href="#home" aria-label="Голос школи"><span class="brand-mark"><span>↗</span></span>Голос школи</a><nav class="top-nav"><a href="#how-it-works">Як це працює</a><a class="nav-admin" href="#admin-login">${icons.lock} Вхід для адміністрації</a></nav></header>${content}</div><footer class="footer"><div class="container footer-inner"><span>Голос школи · простір для важливих ідей</span><span>© 2026</span></div></footer></div>`;
}

function renderHome() {
  app.innerHTML = publicLayout(`<main><section class="hero"><div class="hero-intro"><span class="eyebrow">Ініціативи учнів</span><h1>Твоя ідея може змінити школу.</h1><p class="hero-copy">Розкажи, що можна зробити краще. Ми прочитаємо кожне звернення та передамо його команді школи на розгляд.</p><div class="hero-note"><div class="avatar-stack"><span class="avatar">О</span><span class="avatar">М</span><span class="avatar">А</span></div><span>Тут починаються зміни <small>— з однієї пропозиції</small></span></div></div>${ideaForm()}</section><section id="how-it-works" class="steps-section"><div class="section-intro"><div><span class="eyebrow">Три прості кроки</span><h2>Від думки до дії</h2></div><p>Не потрібно готувати довгий документ. Поділись ідеєю так, як розповів би її друзям.</p></div><div class="steps"><article class="step"><div class="step-number">01</div><h3>Запропонуй</h3><p>Опиши, що хочеш змінити та чому це буде корисно для учнів.</p></article><article class="step"><div class="step-number">02</div><h3>Дочекайся розгляду</h3><p>Адміністрація побачить звернення в єдиному списку заявок.</p></article><article class="step"><div class="step-number">03</div><h3>Побач рішення</h3><p>Ідея отримає статус — так буде видно, на якому вона етапі.</p></article></div></section></main>`);
  bindIdeaForm();
}

function ideaForm() {
  return `<section class="form-card" id="idea-card"><div class="card-heading"><div><h2>Поділись ідеєю</h2><p>Поля з позначкою <strong>*</strong> обовʼязкові</p></div><div class="mini-icon">${icons.send}</div></div><form id="idea-form" novalidate><div class="field-grid"><div class="field" data-field="firstName"><label for="firstName">Імʼя <span class="required">*</span></label><input id="firstName" name="firstName" autocomplete="given-name" placeholder="Наприклад, Олена" /><span class="error-text"></span></div><div class="field" data-field="lastName"><label for="lastName">Прізвище <span class="required">*</span></label><input id="lastName" name="lastName" autocomplete="family-name" placeholder="Наприклад, Шевченко" /><span class="error-text"></span></div><div class="field full" data-field="title"><label for="title">Назва ідеї <span class="required">*</span></label><input id="title" name="title" maxlength="90" placeholder="Коротко: що ти пропонуєш?" /><span class="error-text"></span></div><div class="field" data-field="category"><label for="category">Категорія</label><select id="category" name="category"><option value="">Обери категорію</option><option value="study">Навчання</option><option value="events">Події та спільнота</option><option value="space">Простір школи</option><option value="wellbeing">Добробут учнів</option><option value="other">Інше</option></select><span class="error-text"></span></div><div class="field full" data-field="detail"><label for="detail">Розкажи детальніше <span class="required">*</span></label><textarea id="detail" name="detail" maxlength="1000" placeholder="Опиши ідею та поясни, чому вона допоможе учням..."></textarea><span class="error-text"></span></div></div><label class="consent"><input type="checkbox" id="consent" name="consent" /> <span>Погоджуюсь, щоб моє імʼя та звернення побачила адміністрація школи.</span></label><button class="primary-btn" type="submit">Надіслати на розгляд ${icons.arrow}</button></form></section>`;
}

function bindIdeaForm() {
  const form = document.getElementById('idea-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const fields = { firstName: data.firstName.trim(), lastName: data.lastName.trim(), title: data.title.trim(), detail: data.detail.trim() };
    const errors = {};
    if (fields.firstName.length < 2) errors.firstName = 'Вкажи імʼя';
    if (fields.lastName.length < 2) errors.lastName = 'Вкажи прізвище';
    if (fields.title.length < 4) errors.title = 'Додай коротку назву';
    if (fields.detail.length < 15) errors.detail = 'Розкажи трохи детальніше (від 15 символів)';
    Object.keys(fields).forEach(name => { const el = form.querySelector(`[data-field="${name}"]`); el.classList.toggle('has-error', Boolean(errors[name])); el.querySelector('.error-text').textContent = errors[name] || ''; });
    if (Object.keys(errors).length) return;
    const request = { id: `GS-${String(Date.now()).slice(-4)}`, ...fields, category: data.category || 'other', status: 'new', note: '', createdAt: new Date().toISOString() };
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true; submit.innerHTML = 'Надсилаємо…';
    (async () => {
      let savedRequest = request;
      if (API_ENABLED) {
        try { savedRequest = (await apiRequest('/requests', { method: 'POST', body: JSON.stringify(request) })).request; }
        catch (_) { showToast('Не вдалося підключитися до сервера. Спробуй ще раз.'); submit.disabled = false; submit.innerHTML = `Надіслати на розгляд ${icons.arrow}`; return; }
      }
      saveRequests([savedRequest, ...getRequests().filter(item => item.id !== savedRequest.id)]);
      renderSuccess(savedRequest.id);
    })();
  });
  form.querySelectorAll('input, textarea, select').forEach(input => input.addEventListener('input', () => { const field = input.closest('.field'); if (field) { field.classList.remove('has-error'); field.querySelector('.error-text').textContent = ''; } }));
}

function renderSuccess(id) {
  const card = document.getElementById('idea-card');
  card.innerHTML = `<div class="success-state"><div class="success-check">${icons.check}</div><h2>Ідею надіслано!</h2><p>Дякуємо, що допомагаєш робити школу кращою. Адміністрація вже побачить звернення у списку заявок.</p><span class="success-id">Номер звернення: ${escapeHTML(id)}</span><button class="secondary-btn" id="new-idea">Запропонувати ще одну ідею</button></div>`;
  document.getElementById('new-idea').addEventListener('click', () => { card.outerHTML = ideaForm(); bindIdeaForm(); });
}

function renderLogin() {
  app.innerHTML = `<div class="login-shell"><aside class="login-aside"><a class="brand" href="#home"><span class="brand-mark"><span>↗</span></span>Голос школи</a><div class="login-message"><span class="eyebrow">Панель команди</span><h1>Ідеї, які не губляться.</h1><p>Переглядай звернення учнів, залишай внутрішні нотатки та відмічай прогрес кожної пропозиції.</p></div><footer>Адміністративний доступ · демо-версія</footer></aside><main class="login-panel"><div class="login-box"><a href="#home" class="back-link">${icons.arrowLeft} Повернутися до форми</a><h2>Вхід для адміністрації</h2><p>Увійди, щоб переглянути та опрацювати ідеї учнів.</p><div id="login-error" class="login-error">Невірний логін або пароль. Спробуй ще раз.</div><form class="login-form" id="login-form"><div class="field"><label for="login">Логін</label><input id="login" name="login" autocomplete="username" placeholder="Введи логін" required /></div><div class="field"><label for="password">Пароль</label><input id="password" type="password" name="password" autocomplete="current-password" placeholder="Введи пароль" required /></div><button class="primary-btn" type="submit">Увійти в панель ${icons.arrow}</button></form><p class="demo-hint">Демо-доступ: <code>ADMIN</code> · <code>ojkasodak123aksd77o!Kiala</code></p></div></main></div>`;
  document.getElementById('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    try {
      if (API_ENABLED) {
        const payload = await apiRequest('/login', { method: 'POST', body: JSON.stringify(data) });
        sessionStorage.setItem(TOKEN_KEY, payload.token);
      } else if (data.login !== 'ADMIN' || data.password !== 'ojkasodak123aksd77o!Kiala') throw new Error('Invalid credentials');
      sessionStorage.setItem(SESSION_KEY, 'true'); navigate('admin');
    } catch (_) { document.getElementById('login-error').classList.add('visible'); }
  });
}

function renderAdmin() {
  if (sessionStorage.getItem(SESSION_KEY) !== 'true') { navigate('admin-login'); return; }
  app.innerHTML = `<div class="admin-shell"><header class="admin-topbar"><a class="brand" href="#admin"><span class="brand-mark"><span>↗</span></span>Голос школи</a><div class="admin-top-actions"><span class="muted">Ви увійшли як адміністратор</span><button class="ghost-btn" id="logout">${icons.logout} Вийти</button></div></header><div class="admin-layout"><aside class="admin-sidebar"><p class="sidebar-label">Робочий простір</p><button class="sidebar-link active">${icons.grid} Заявки</button><a class="sidebar-link" href="#home">${icons.arrowLeft} До публічної форми</a></aside><main class="admin-main"><div class="admin-title-row"><div><p class="admin-kicker">Огляд звернень</p><h1>Ідеї учнів</h1></div><button class="ghost-btn" id="refresh-list">Оновити список</button></div><div class="stats" id="stats"></div><div class="filters"><div class="search-wrap">${icons.search}<input class="search-input" id="search" placeholder="Пошук за назвою або автором" /></div><select class="filter-select" id="status-filter"><option value="all">Усі статуси</option><option value="new">Нові</option><option value="review">На розгляді</option><option value="approved">Схвалені</option><option value="rejected">Відхилені</option></select><select class="filter-select" id="category-filter"><option value="all">Усі категорії</option>${Object.entries(categories).map(([key, value]) => `<option value="${key}">${value}</option>`).join('')}</select></div><div class="request-list" id="request-list"></div></main></div></div><div class="overlay" id="overlay"><aside class="drawer" id="drawer"></aside></div>`;
  const state = { search: '', status: 'all', category: 'all' };
  const update = async () => { let requests = getRequests(); if (API_ENABLED) { try { requests = await fetchAdminRequests(); } catch (_) { showToast('Сервер недоступний, показуємо локальні дані.'); } } renderStats(requests); renderList(requests, state); };
  document.getElementById('logout').addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(TOKEN_KEY); navigate('admin-login'); });
  document.getElementById('refresh-list').addEventListener('click', () => { update(); showToast('Список оновлено'); });
  document.getElementById('search').addEventListener('input', event => { state.search = event.target.value.toLowerCase(); renderList(adminRequests || getRequests(), state); });
  document.getElementById('status-filter').addEventListener('change', event => { state.status = event.target.value; renderList(adminRequests || getRequests(), state); });
  document.getElementById('category-filter').addEventListener('change', event => { state.category = event.target.value; renderList(adminRequests || getRequests(), state); });
  document.getElementById('overlay').addEventListener('click', event => { if (event.target.id === 'overlay' || event.target.closest('#close-drawer')) closeDrawer(); });
  update();
}

function renderStats(requests) {
  const counts = { all: requests.length, new: requests.filter(r => r.status === 'new').length, review: requests.filter(r => r.status === 'review').length, approved: requests.filter(r => r.status === 'approved').length };
  document.getElementById('stats').innerHTML = [['Усього заявок', counts.all], ['Нові', counts.new], ['На розгляді', counts.review], ['Схвалені', counts.approved]].map(([label, count]) => `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${count}</div></div>`).join('');
}

function renderList(requests, state) {
  const filtered = requests.filter(request => { const haystack = `${request.title} ${request.firstName} ${request.lastName}`.toLowerCase(); return (!state.search || haystack.includes(state.search)) && (state.status === 'all' || request.status === state.status) && (state.category === 'all' || request.category === state.category); });
  const list = document.getElementById('request-list');
  if (!filtered.length) { list.innerHTML = `<div class="empty-state"><strong>${requests.length ? 'Нічого не знайдено' : 'Заявок поки немає'}</strong><p>${requests.length ? 'Спробуй змінити пошук або фільтр.' : 'Нові ідеї зʼявляться тут після надсилання форми.'}</p></div>`; return; }
  list.innerHTML = filtered.map(request => `<article class="request-row"><div class="request-title"><button data-request="${request.id}">${escapeHTML(request.title)}</button><small>${escapeHTML(request.id)}</small></div><div class="request-cell"><strong>${escapeHTML(request.firstName)} ${escapeHTML(request.lastName)}</strong><small>${escapeHTML(categories[request.category] || categories.other)}</small></div><div class="request-cell"><small>${formatDate(request.createdAt)}</small></div><div>${statusPill(request.status)}</div><button class="row-arrow" data-request="${request.id}" aria-label="Відкрити заявку">${icons.arrow}</button></article>`).join('');
  list.querySelectorAll('[data-request]').forEach(button => button.addEventListener('click', () => openDrawer(button.dataset.request)));
}

function openDrawer(id) {
  const request = (adminRequests || getRequests()).find(item => item.id === id); if (!request) return;
  const drawer = document.getElementById('drawer');
  drawer.innerHTML = `<div class="drawer-top"><span>Заявка ${escapeHTML(request.id)}</span><button class="close-btn" id="close-drawer" aria-label="Закрити">${icons.x}</button></div><h2>${escapeHTML(request.title)}</h2><p class="drawer-meta">${escapeHTML(request.firstName)} ${escapeHTML(request.lastName)} · ${escapeHTML(categories[request.category] || categories.other)} · ${formatDateTime(request.createdAt)}</p><section class="drawer-section"><span class="drawer-label">Опис ідеї</span><p class="drawer-description">${escapeHTML(request.detail)}</p></section><section class="drawer-section"><div class="field"><label for="drawer-status">Статус заявки</label><select id="drawer-status">${Object.entries(statuses).map(([key, item]) => `<option value="${key}" ${request.status === key ? 'selected' : ''}>${item.label}</option>`).join('')}</select></div></section><section class="drawer-section"><div class="field"><label for="drawer-note">Внутрішня нотатка</label><textarea id="drawer-note" placeholder="Наприклад, що потрібно уточнити…">${escapeHTML(request.note || '')}</textarea></div></section><section class="drawer-section drawer-actions"><button class="secondary-btn" id="cancel-drawer">Скасувати</button><button class="primary-btn" id="save-drawer">Зберегти зміни</button></section>`;
  const overlay = document.getElementById('overlay'); overlay.classList.add('open');
  document.getElementById('cancel-drawer').addEventListener('click', closeDrawer);
  document.getElementById('save-drawer').addEventListener('click', async () => { const requests = adminRequests || getRequests(); const target = requests.find(item => item.id === id); target.status = document.getElementById('drawer-status').value; target.note = document.getElementById('drawer-note').value.trim(); try { if (API_ENABLED) await apiRequest(`/requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: target.status, note: target.note }) }); saveRequests(requests); adminRequests = requests; closeDrawer(); renderStats(requests); const state = { search: document.getElementById('search').value.toLowerCase(), status: document.getElementById('status-filter').value, category: document.getElementById('category-filter').value }; renderList(requests, state); showToast('Зміни збережено'); } catch (_) { showToast('Не вдалося зберегти зміни.'); } });
}
function closeDrawer() { document.getElementById('overlay')?.classList.remove('open'); }

function route() { const page = slugFromHash(); if (page === 'admin-login') renderLogin(); else if (page === 'admin') renderAdmin(); else renderHome(); window.scrollTo(0, 0); }
window.addEventListener('hashchange', route);
if (!window.location.hash) window.location.hash = 'home'; else route();
