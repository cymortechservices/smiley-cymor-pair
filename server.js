'use strict';

/**
 * SMILEY CYMOR MD — Pair server
 * "No one does it better than me"
 *
 *  POST /api/pair        {number}  -> {id, code, expiresIn}   start pairing, get 8-char code
 *  GET  /api/status/:id            -> {state, message, sessionId?}  poll progress
 *  GET  /code?number=              -> {code}                  used by the bot's .pair command
 *  GET  /api/config                -> branding + deploy links for the web page
 *  GET  /health                    -> ok
 *
 * Session ID format (what the bot expects in SESSION):  cymor~<base64(gzip(creds.json))>
 * Nothing is written to a database. Temporary auth files are deleted as soon as the
 * session ID has been delivered (or the attempt expires), and session IDs are never logged.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const crypto = require('crypto');

const pino = require('pino');
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default || baileys.makeWASocket;
const {
  useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion,
  Browsers, delay, jidNormalizedUser,
} = baileys;

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
const LINK_TIMEOUT_MS = (Number(process.env.LINK_TIMEOUT_SECONDS) || 180) * 1000;   // how long a user has to link
const MAX_ACTIVE = Number(process.env.MAX_ACTIVE_PAIRINGS) || 12;
const IP_LIMIT = Number(process.env.RATE_LIMIT_PER_IP) || 5;                        // per 10 minutes
const NUMBER_LIMIT = 3;                                                              // per 10 minutes
const WINDOW_MS = 10 * 60 * 1000;
const RESULT_TTL_MS = 10 * 60 * 1000;                                                // keep finished result this long
const PUBLIC_DIR = path.join(__dirname, 'public');

const BRAND = {
  name: 'SMILEY CYMOR MD',
  owner: 'Legendary Smiley Cymor',
  ownerNumber: '254113821327',
  motto: 'No one does it better than me',
  channelName: 'SMILEY CYMOR MD USERS',
  channel: 'https://whatsapp.com/channel/0029VbBq8Y1HQbS0YTkiYk0E',
  poweredBy: 'CymorTechServices',
};
// Your GitHub repo URL of the BOT, e.g. https://github.com/yourname/smiley-cymor-md
const BOT_REPO = (process.env.BOT_REPO || '').replace(/\/+$/, '').replace(/\.git$/, '');

const logger = pino({ level: 'silent' });
const mask = n => String(n).slice(0, 4) + '****' + String(n).slice(-2);
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ─── State ───────────────────────────────────────────────────────────────────
const jobs = new Map();            // id -> job
const ipHits = new Map();          // ip -> [timestamps]
const numberHits = new Map();      // number -> [timestamps]

function hit(map, key, limit) {
  const now = Date.now();
  const arr = (map.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (arr.length >= limit) { map.set(key, arr); return false; }
  arr.push(now); map.set(key, arr); return true;
}

function activeCount() {
  let n = 0;
  for (const j of jobs.values()) if (['starting', 'code', 'linked'].includes(j.state)) n++;
  return n;
}

// ─── Session ID ──────────────────────────────────────────────────────────────
function makeSessionId(credsJson) {
  return 'cymor~' + zlib.gzipSync(Buffer.from(credsJson, 'utf8'), { level: 9 }).toString('base64');
}

// ─── Pairing job ─────────────────────────────────────────────────────────────
function cleanupFiles(job) {
  if (job.dir) { try { fs.rmSync(job.dir, { recursive: true, force: true }); } catch {} job.dir = null; }
}

function closeSock(job) {
  try { job.sock && job.sock.ev && job.sock.ev.removeAllListeners(); } catch {}
  try { job.sock && job.sock.end && job.sock.end(undefined); } catch {}
  job.sock = null;
}

function finish(job, state, message) {
  if (job.finished) return;
  job.finished = true;
  job.state = state;
  job.message = message;
  job.finishedAt = Date.now();
  clearTimeout(job.timer);
  closeSock(job);
  cleanupFiles(job);
  if (job.rejectCode) job.rejectCode(new Error(message));
  log(`job ${job.id.slice(0, 6)} ${mask(job.number)} -> ${state}`);
  if (state !== 'done') job.sessionId = null;
  // wipe the session from memory after TTL
  setTimeout(() => jobs.delete(job.id), RESULT_TTL_MS).unref();
}

function welcomeText() {
  const repoLine = BOT_REPO ? `💻 Source: ${BOT_REPO}\n` : '';
  return (
    `╭━━━〔 😄 *${BRAND.name}* 〕━━━╮\n` +
    `┃ ✅ *Linked successfully!*\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
    `🔑 Your *Session ID* is in the message above (starts with \`cymor\`).\n\n` +
    `*How to deploy*\n` +
    `1️⃣ Copy the WHOLE session ID.\n` +
    `2️⃣ Open the pair website and pick a platform (Heroku / Render / Panel / VPS).\n` +
    `3️⃣ Set it as the *SESSION* variable and start the bot.\n\n` +
    `⚠️ *Never share your session ID.* Anyone who has it controls your WhatsApp.\n\n` +
    repoLine +
    `📣 ${BRAND.channelName}: ${BRAND.channel}\n` +
    `👑 Owner: ${BRAND.owner} — wa.me/${BRAND.ownerNumber}\n\n` +
    `_${BRAND.motto}_ 💫`
  );
}

async function deliver(job, sock, sessionId) {
  const jid = jidNormalizedUser(sock.user.id);
  const attempt = async fn => { try { await fn(); return true; } catch { await delay(1500); try { await fn(); return true; } catch { return false; } } };
  const ok1 = await attempt(() => sock.sendMessage(jid, { text: sessionId }));
  await delay(1200);
  let image = null;
  try { image = fs.readFileSync(path.join(PUBLIC_DIR, 'logo.png')); } catch {}
  await attempt(() => image
    ? sock.sendMessage(jid, { image, caption: welcomeText() })
    : sock.sendMessage(jid, { text: welcomeText() }));
  job.sent = ok1;
}

async function runJob(job) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cymor-pair-'));
  job.dir = dir;
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch {}

  let codeRequested = false;
  let restarts = 0;

  const open = async () => {
    if (job.finished) return;
    const sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: Browsers && Browsers.ubuntu ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });
    job.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
      if (job.finished) return;
      const { connection, lastDisconnect } = u;

      if (connection === 'open') {
        job.state = 'linked';
        job.message = 'Linked! Creating your session ID…';
        try {
          await delay(3500);                       // let WhatsApp finish writing credentials
          await saveCreds();
          const raw = fs.readFileSync(path.join(dir, 'creds.json'), 'utf8');
          JSON.parse(raw);                         // sanity check
          job.sessionId = makeSessionId(raw);
          await deliver(job, sock, job.sessionId);
          await delay(2000);
          // NOTE: we deliberately do NOT log out — that would invalidate the session.
          finish(job, 'done', job.sent
            ? 'Session ID sent to your WhatsApp.'
            : 'Linked, but sending the message failed — copy the session ID from this page.');
        } catch (e) {
          log('finalize error', e && e.message);
          finish(job, 'failed', 'Linked, but creating the session failed. Please try again.');
        }
        return;
      }

      if (connection === 'close') {
        const code = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;
        if (code === DisconnectReason.loggedOut) return finish(job, 'failed', 'WhatsApp rejected the link. Please try again.');
        // After the code is entered WhatsApp always asks for a restart (515): reopen with the same auth state.
        if (restarts < 6) {
          restarts++;
          closeSock(job);
          await delay(800);
          return open().catch(e => finish(job, 'failed', 'Connection error: ' + (e && e.message)));
        }
        finish(job, 'failed', 'Connection to WhatsApp was lost. Please try again.');
      }
    });

    if (!codeRequested && !sock.authState.creds.registered) {
      codeRequested = true;
      await delay(1800);
      const raw = await sock.requestPairingCode(job.number);
      job.code = String(raw).match(/.{1,4}/g).join('-');
      job.state = 'code';
      job.message = 'Enter the code in WhatsApp → Linked devices.';
      job.resolveCode(job.code);
    }
  };

  await open();
}

function createJob(number) {
  const job = {
    id: crypto.randomBytes(16).toString('hex'),
    number, state: 'starting', message: 'Contacting WhatsApp…',
    code: null, sessionId: null, sent: false, finished: false,
    createdAt: Date.now(), dir: null, sock: null,
  };
  job.codePromise = new Promise((res, rej) => { job.resolveCode = res; job.rejectCode = rej; });
  job.codePromise.catch(() => {});
  jobs.set(job.id, job);
  job.timer = setTimeout(() => finish(job, 'expired', 'This attempt expired. Please generate a new code.'), LINK_TIMEOUT_MS);
  runJob(job).catch(e => {
    log('job error', mask(number), e && e.message);
    finish(job, 'failed', 'Could not get a pairing code. Check the number and try again.');
  });
  return job;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function baseHeaders(extra = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': CSP,
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...extra,
  };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, baseHeaders({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) }));
  res.end(body);
}

function clientIp(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  // The right-most entry is the one added by our own platform proxy (Render/Heroku/etc.)
  return xff.length ? xff[xff.length - 1] : (req.socket.remoteAddress || 'unknown');
}

function readJson(req, limit = 2048) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad json')); } });
    req.on('error', reject);
  });
}

function normalizeNumber(input) {
  const n = String(input || '').replace(/[^0-9]/g, '');
  if (n.length < 8 || n.length > 15) return { error: 'Enter your full WhatsApp number with country code, digits only (8–15 digits).' };
  if (n.startsWith('0')) return { error: 'Remove the leading 0 and start with your country code (e.g. 254113821327).' };
  return { number: n };
}

async function startPairing(req, res, rawNumber, legacy) {
  const { number, error } = normalizeNumber(rawNumber);
  if (error) return sendJson(res, 400, { error });
  const ip = clientIp(req);
  if (!hit(ipHits, ip, IP_LIMIT) || !hit(numberHits, number, NUMBER_LIMIT)) {
    return sendJson(res, 429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
  }
  if (activeCount() >= MAX_ACTIVE) return sendJson(res, 503, { error: 'The pair server is busy right now. Please try again in a minute.' });

  const job = createJob(number);
  try {
    const code = await Promise.race([
      job.codePromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 30000)),
    ]);
    log(`job ${job.id.slice(0, 6)} ${mask(number)} code issued`);
    if (legacy) return sendJson(res, 200, { code });
    return sendJson(res, 200, { id: job.id, code, expiresIn: Math.round(LINK_TIMEOUT_MS / 1000) });
  } catch (e) {
    finish(job, 'failed', 'Could not get a pairing code.');
    return sendJson(res, 502, { error: 'Could not get a pairing code from WhatsApp. Check the number and try again.' });
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const p = url.pathname;

    if (req.method === 'GET' && p === '/health') return sendJson(res, 200, { ok: true, active: activeCount() });

    if (req.method === 'GET' && p === '/api/config') {
      return sendJson(res, 200, { ...BRAND, repo: BOT_REPO || null });
    }

    if (req.method === 'POST' && p === '/api/pair') {
      let body; try { body = await readJson(req); } catch { return sendJson(res, 400, { error: 'Bad request.' }); }
      return startPairing(req, res, body.number, false);
    }

    if (req.method === 'GET' && p === '/code') {            // used by the bot's .pair command
      return startPairing(req, res, url.searchParams.get('number'), true);
    }

    const m = p.match(/^\/api\/status\/([a-f0-9]{32})$/);
    if (req.method === 'GET' && m) {
      const job = jobs.get(m[1]);
      if (!job) return sendJson(res, 404, { state: 'gone', message: 'This attempt no longer exists. Generate a new code.' });
      const left = Math.max(0, Math.round((job.createdAt + LINK_TIMEOUT_MS - Date.now()) / 1000));
      const out = { state: job.state, message: job.message, expiresIn: left };
      if (job.state === 'done') { out.sessionId = job.sessionId; out.sent = job.sent; }
      return sendJson(res, 200, out);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      let rel = decodeURIComponent(p);
      if (rel === '/') rel = '/index.html';
      const file = path.normalize(path.join(PUBLIC_DIR, rel));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404, baseHeaders({ 'Content-Type': 'text/plain' })); return res.end('Not found'); }
        const ext = path.extname(file).toLowerCase();
        const cache = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
        res.writeHead(200, baseHeaders({ 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, 'Content-Length': data.length }));
        res.end(req.method === 'HEAD' ? undefined : data);
      });
      return;
    }

    res.writeHead(405, baseHeaders()); res.end();
  } catch (e) {
    log('request error', e && e.message);
    try { sendJson(res, 500, { error: 'Server error.' }); } catch {}
  }
});

process.on('unhandledRejection', e => log('unhandledRejection', e && e.message));
process.on('uncaughtException', e => log('uncaughtException', e && e.message));

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => {
  for (const j of jobs.values()) { closeSock(j); cleanupFiles(j); }
  process.exit(0);
});

// periodic sweep of stale jobs / rate limit maps
setInterval(() => {
  const now = Date.now();
  for (const [id, j] of jobs) if (now - j.createdAt > LINK_TIMEOUT_MS + RESULT_TTL_MS + 60000) { closeSock(j); cleanupFiles(j); jobs.delete(id); }
  for (const m of [ipHits, numberHits]) for (const [k, arr] of m) if (!arr.some(t => now - t < WINDOW_MS)) m.delete(k);
}, 60000).unref();

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => log(`😄 SMILEY CYMOR MD pair server on http://localhost:${PORT}`));
}

module.exports = { server, makeSessionId, normalizeNumber };
