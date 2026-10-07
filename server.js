const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'requests.json');

// Railway змінні можуть перевизначити ці значення без редагування коду.
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'ADMIN';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ojkasodak123aksd77o!Kiala';
const sessions = new Map();

const seedRequests = [];

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(seedRequests, null, 2));
}

function readRequests() {
  ensureDataFile();
  try {
    const value = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function writeRequests(requests) {
  ensureDataFile();
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(requests, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 1024 * 1024) reject(new Error('Payload too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (_) { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function tokenFrom(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

function requireAdmin(req, res) {
  const token = tokenFrom(req);
  if (!token || !sessions.has(token) || sessions.get(token) < Date.now()) { send(res, 401, { error: 'Unauthorized' }); return false; }
  sessions.set(token, Date.now() + 1000 * 60 * 60 * 12);
  return true;
}

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relative);
  return resolved.startsWith(ROOT) ? resolved : null;
}

function contentType(file) {
  return { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true, storage: DATA_DIR });
  if (req.method === 'POST' && url.pathname === '/api/login') {
    try {
      const body = await readBody(req);
      if (body.login !== ADMIN_LOGIN || body.password !== ADMIN_PASSWORD) return send(res, 401, { error: 'Invalid credentials' });
      const token = crypto.randomBytes(24).toString('hex');
      sessions.set(token, Date.now() + 1000 * 60 * 60 * 12);
      return send(res, 200, { token, user: ADMIN_LOGIN });
    } catch (_) { return send(res, 400, { error: 'Invalid request' }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/requests') {
    if (!requireAdmin(req, res)) return;
    return send(res, 200, { requests: readRequests() });
  }
  if (req.method === 'POST' && url.pathname === '/api/requests') {
    try {
      const body = await readBody(req);
      const firstName = String(body.firstName || '').trim();
      const lastName = String(body.lastName || '').trim();
      const title = String(body.title || '').trim();
      const detail = String(body.detail || '').trim();
      if (firstName.length < 2 || lastName.length < 2 || title.length < 4 || detail.length < 15) return send(res, 422, { error: 'Validation failed' });
      const request = { id: `GS-${String(Date.now()).slice(-4)}`, firstName, lastName, title, detail, category: body.category || 'other', status: 'new', note: '', createdAt: new Date().toISOString() };
      const requests = readRequests(); requests.unshift(request); writeRequests(requests);
      return send(res, 201, { request });
    } catch (_) { return send(res, 400, { error: 'Invalid request' }); }
  }
  const match = url.pathname.match(/^\/api\/requests\/([^/]+)$/);
  if (req.method === 'PATCH' && match) {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req); const requests = readRequests(); const target = requests.find(item => item.id === match[1]);
      if (!target) return send(res, 404, { error: 'Not found' });
      if (body.status && ['new', 'review', 'approved', 'rejected'].includes(body.status)) target.status = body.status;
      if (typeof body.note === 'string') target.note = body.note.trim();
      writeRequests(requests); return send(res, 200, { request: target });
    } catch (_) { return send(res, 400, { error: 'Invalid request' }); }
  }
  return send(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed');
  const file = safePath(url.pathname);
  if (!file) return send(res, 403, 'Forbidden');
  fs.readFile(file, (error, data) => {
    if (error) return send(res, 404, 'Not Found');
    res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    res.end(data);
  });
});

ensureDataFile();
server.listen(PORT, '0.0.0.0', () => console.log(`Голос школи запущено на порту ${PORT}. Сховище: ${DATA_DIR}`));
