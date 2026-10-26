/* SMILEY CYMOR MD — pair page  |  No one does it better than me */
(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let skipped = false;
const sleep = ms => new Promise(r => setTimeout(r, skipped ? 0 : ms));

/* ═══════════════ BACKGROUND CANVAS (red code-rain → cyan/violet network) ═══════════════ */
const cv = $('#bg'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, mode = 'rain', rainSpeed = 1;
let drops = [], fs = 16, parts = [];
const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789ABCDEF<>/\\{}$#%SMILEYCYMOR'.split('');

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  fs = W < 560 ? 14 : 16;
  drops = Array.from({ length: Math.ceil(W / fs) }, () => -Math.random() * (H / fs));
  const n = Math.min(70, Math.floor(W * H / 20000));
  parts = Array.from({ length: n }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6,
    h: Math.random() < .5 ? 187 : 265,
  }));
  cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
}

let last = 0, acc = 0;
function frame(t) {
  const dt = Math.min(64, t - last); last = t;
  if (mode === 'rain') {
    acc += dt * rainSpeed;
    cx.fillStyle = 'rgba(0,0,0,.1)'; cx.fillRect(0, 0, W, H);
    cx.font = fs + 'px "Share Tech Mono", monospace';
    if (acc > 38) {
      acc = 0;
      for (let i = 0; i < drops.length; i++) {
        const x = i * fs, y = drops[i] * fs;
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        cx.fillStyle = 'rgba(255,40,40,.85)'; cx.fillText(ch, x, y - fs);
        cx.fillStyle = '#ffd6d6'; cx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y);
        if (y > H && Math.random() > .975) drops[i] = -Math.random() * 20;
        drops[i]++;
      }
    }
  } else {
    cx.clearRect(0, 0, W, H);
    const g = cx.createRadialGradient(W * .5, H * .25, 0, W * .5, H * .25, Math.max(W, H) * .9);
    g.addColorStop(0, '#0b1533'); g.addColorStop(.55, '#050a1a'); g.addColorStop(1, '#03050c');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    for (let i = 0; i < parts.length; i++) {
      const a = parts[i];
      for (let j = i + 1; j < parts.length; j++) {
        const b = parts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 140) { cx.strokeStyle = `hsla(${a.h},90%,65%,${(1 - d / 140) * .22})`; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke(); }
      }
      cx.fillStyle = `hsla(${a.h},95%,70%,.85)`; cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 6.283); cx.fill();
    }
  }
  requestAnimationFrame(frame);
}
resize(); addEventListener('resize', resize); requestAnimationFrame(frame);

/* ═══════════════ INTRO ═══════════════ */
const LINES = [
  ['dim',  'root@cymor:~# ./smiley-cymor-md --boot'],
  ['ok',   '[  OK  ] loading kernel modules ........ done'],
  ['ok',   '[  OK  ] spawning pair-engine v1.0 ..... done'],
  ['ok',   '[  OK  ] opening encrypted WhatsApp tunnel'],
  ['warn', '[ WARN ] firewall detected ... bypassing'],
  ['ok',   '[  OK  ] multi-device handshake complete'],
  ['hot',  '> ALL SYSTEMS ONLINE'],
];

async function typeTerminal() {
  const term = $('#term');
  const cur = document.createElement('span'); cur.className = 'cur';
  term.appendChild(cur);
  for (const [cls, text] of LINES) {
    if (skipped) return;
    const line = document.createElement('span'); line.className = cls;
    term.insertBefore(line, cur);
    for (const ch of text) {
      if (skipped) return;
      line.textContent += ch;
      await sleep(ch === '.' ? 6 : 13 + Math.random() * 14);
    }
    term.insertBefore(document.createTextNode('\n'), cur);
    await sleep(120 + Math.random() * 120);
  }
}

function buildWordmark() {
  const wm = $('#wordmark'); wm.textContent = '';
  [...'SMILEY CYMOR MD'].forEach((ch, i) => {
    const s = document.createElement('span');
    s.style.setProperty('--i', i);
    if (ch === ' ') s.className = 'sp'; else s.textContent = ch;
    s.setAttribute('aria-hidden', 'true');
    wm.appendChild(s);
  });
}

async function typeMotto() {
  const el = $('#motto'); el.textContent = '';
  for (const ch of 'No one does it better than me') {
    if (skipped) { el.textContent = 'No one does it better than me'; return; }
    el.textContent += ch; await sleep(38);
  }
}

let introDone = false;
function endIntro() {
  if (introDone) return; introDone = true;
  const fl = $('#flash'); fl.classList.add('go');
  setTimeout(() => {
    mode = 'net'; cx.fillStyle = '#04070f'; cx.fillRect(0, 0, W, H);
    $('#intro').classList.add('out');
    document.body.classList.remove('intro-on');
    $('#site').hidden = false;
    scrollTo(0, 0);
    if (matchMedia('(pointer:fine)').matches) setTimeout(() => $('#num').focus({ preventScroll: true }), 900);
  }, reduce ? 0 : 260);
  setTimeout(() => $('#intro').remove(), 1400);
}

async function runIntro() {
  if (reduce) {
    $('#termBox').classList.add('hide');
    $('#stage').classList.add('reveal'); buildWordmark(); $('#wordmark').classList.add('show');
    $('#motto').textContent = 'No one does it better than me';
    await sleep(1200); return endIntro();
  }
  await sleep(700);
  await typeTerminal();
  if (skipped) return;
  await sleep(350);

  // glitch "ACCESS GRANTED"
  rainSpeed = 3.2;
  $('#termBox').classList.add('hide');
  $('#access').classList.add('on');
  document.body.classList.add('shake');
  await sleep(1000);
  document.body.classList.remove('shake');
  $('#access').classList.remove('on');
  if (skipped) return;

  // logo reveal
  rainSpeed = 1;
  $('#stage').classList.add('reveal');
  setTimeout(() => { if (!introDone) { mode = 'net'; cx.fillStyle = '#04070f'; cx.fillRect(0, 0, W, H); } }, skipped ? 0 : 1100);
  await sleep(1500);
  buildWordmark(); $('#wordmark').classList.add('show');
  await sleep(900);
  await typeMotto();
  await sleep(300);
  $('#enter').classList.add('show');
  await sleep(4200);
  endIntro();
}

$('#skip').addEventListener('click', () => { skipped = true; endIntro(); });
$('#enter').addEventListener('click', () => { skipped = true; endIntro(); });
addEventListener('keydown', e => { if (!introDone && (e.key === 'Enter' || e.key === 'Escape')) { skipped = true; endIntro(); } });
runIntro();

/* ═══════════════ HELPERS ═══════════════ */
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
}
async function copy(text, okMsg) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }
  toast(okMsg || 'Copied ✓');
}
function confetti() {
  if (reduce) return;
  const cols = ['#22d3ee', '#8b5cf6', '#e879f9', '#25d366', '#fbbf24', '#fff'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('i'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = cols[i % cols.length];
    c.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
    c.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    c.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
    c.style.animationDelay = (Math.random() * .5) + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 4500);
  }
}
async function api(path, opts) {
  const r = await fetch(path, opts);
  let j = {}; try { j = await r.json(); } catch {}
  if (!r.ok) { const e = new Error(j.error || 'Request failed'); e.status = r.status; e.data = j; throw e; }
  return j;
}

/* ═══════════════ CONFIG / LINKS ═══════════════ */
let CFG = { channel: 'https://whatsapp.com/channel/0029VbBq8Y1HQbS0YTkiYk0E', ownerNumber: '254113821327', owner: 'Legendary Smiley Cymor', repo: null };
api('/api/config').then(c => { CFG = { ...CFG, ...c }; applyConfig(); buildPlatforms(); }).catch(() => { applyConfig(); buildPlatforms(); });
function applyConfig() {
  for (const id of ['navChannel', 'chanLink']) { const a = $('#' + id); a.href = CFG.channel; }
  const o = $('#ownerLink'); o.href = 'https://wa.me/' + CFG.ownerNumber; o.textContent = CFG.owner;
}

/* ═══════════════ PAIRING FLOW ═══════════════ */
const S = { id: null, poll: null, tick: null, deadline: 0, session: null, fails: 0, number: '' };
const views = ['number', 'code', 'done', 'error'];
function show(v) {
  views.forEach(n => { $('#v-' + n).hidden = n !== v; });
  const step = { number: 1, code: 3, done: 4, error: 1 }[v];
  $$('#stepper li').forEach(li => {
    const n = +li.dataset.step;
    li.classList.toggle('on', n === step);
    li.classList.toggle('done', n < step);
  });
}
function stopTimers() { clearInterval(S.poll); clearInterval(S.tick); S.poll = S.tick = null; }

const num = $('#num'), hint = $('#numHint'), field = num.closest('.field');
const HINT_DEFAULT = hint.innerHTML;
function validate(v) {
  if (!v) return { ok: false, msg: HINT_DEFAULT, cls: '' };
  if (v.startsWith('0')) return { ok: false, msg: 'Remove the leading 0 — start with your country code (e.g. 254…).', cls: 'bad' };
  if (v.length < 8) return { ok: false, msg: `Keep typing… (${v.length}/8+ digits)`, cls: '' };
  if (v.length > 15) return { ok: false, msg: 'Too many digits.', cls: 'bad' };
  return { ok: true, msg: '✓ Looks good', cls: 'good' };
}
num.addEventListener('input', () => {
  num.value = num.value.replace(/\D/g, '');
  const r = validate(num.value);
  hint.className = 'hint ' + r.cls; if (r.msg === HINT_DEFAULT) hint.innerHTML = HINT_DEFAULT; else hint.textContent = r.msg;
  field.classList.toggle('bad', r.cls === 'bad');
});
$$('.cc button').forEach(b => b.addEventListener('click', () => {
  if (!num.value || num.value.length <= 3) { num.value = b.dataset.cc; num.dispatchEvent(new Event('input')); }
  num.focus();
}));

function renderCode(code) {
  const box = $('#codeBox'); box.textContent = '';
  [...code].forEach((ch, i) => {
    const s = document.createElement('span'); s.style.setProperty('--i', i);
    if (ch === '-') s.className = 'dash';
    s.textContent = ch; box.appendChild(s);
  });
  box.setAttribute('aria-label', 'Pairing code: ' + code.replace('-', '').split('').join(' '));
}
function fmt(sec) { const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + String(s).padStart(2, '0'); }

$('#pairForm').addEventListener('submit', async e => {
  e.preventDefault();
  const v = num.value.trim();
  const r = validate(v);
  if (!r.ok) { hint.className = 'hint bad'; hint.textContent = r.msg === HINT_DEFAULT ? 'Enter your number first.' : r.msg; field.classList.add('bad'); num.focus(); return; }
  const btn = $('#goBtn'); btn.disabled = true; btn.classList.add('loading'); $('.btn-t', btn).textContent = 'Contacting WhatsApp…';
  try {
    const res = await api('/api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: v }) });
    S.id = res.id; S.number = v; S.fails = 0;
    S.deadline = Date.now() + res.expiresIn * 1000;
    $('#shownNum').textContent = '+' + v;
    renderCode(res.code); S.code = res.code.replace('-', '');
    setStatus('Waiting for you to enter the code…', false);
    show('code');
    startPolling();
  } catch (err) {
    hint.className = 'hint bad'; hint.textContent = err.message; field.classList.add('bad');
  } finally {
    btn.disabled = false; btn.classList.remove('loading'); $('.btn-t', btn).textContent = 'Generate pairing code';
  }
});

function setStatus(msg, ok) { $('#statusTxt').textContent = msg; $('#status').classList.toggle('ok', !!ok); }

function startPolling() {
  stopTimers();
  S.tick = setInterval(() => {
    const left = Math.max(0, Math.round((S.deadline - Date.now()) / 1000));
    $('#timer').textContent = left ? 'closes in ' + fmt(left) : '';
  }, 500);
  S.poll = setInterval(async () => {
    try {
      const st = await api('/api/status/' + S.id);
      S.fails = 0;
      if (st.state === 'code') setStatus('Waiting for you to enter the code…', false);
      else if (st.state === 'linked') { setStatus('Linked! Creating your session ID…', true); $$('#stepper li').forEach(li => { const n = +li.dataset.step; li.classList.toggle('done', n < 4); li.classList.toggle('on', n === 4); }); }
      else if (st.state === 'done') { stopTimers(); success(st); }
      else if (['failed', 'expired', 'gone'].includes(st.state)) { stopTimers(); fail(st.message); }
    } catch (e) {
      if (e.status === 404) { stopTimers(); fail('This attempt no longer exists. Generate a new code.'); }
      else if (++S.fails > 6) { stopTimers(); fail('Lost connection to the server. Please try again.'); }
    }
  }, 2000);
}

function success(st) {
  S.session = st.sessionId || null;
  $('#doneMsg').textContent = st.sent
    ? 'Your Session ID was sent to your WhatsApp (check “Message yourself”).'
    : 'Linked! Sending the message failed, so copy your Session ID below.';
  $('#sessMask').textContent = S.session ? S.session.slice(0, 14) + ' •••••••••••••••• ' + S.session.slice(-6) : 'cymor~ (check your WhatsApp)';
  $('#sessLen').textContent = S.session ? S.session.length.toLocaleString() + ' chars' : '';
  $('#copySess').disabled = !S.session;
  const line = $('#envLine');
  line.textContent = S.session ? 'SESSION=' + S.session : 'SESSION=cymor~… (paste it from your WhatsApp message)';
  show('done'); confetti();
}
function fail(msg) { $('#errMsg').textContent = msg || 'Please try again.'; show('error'); }

$('#copyCode').addEventListener('click', () => copy(S.code, 'Code copied ✓'));
$('#copySess').addEventListener('click', () => S.session && copy(S.session, 'Session ID copied ✓'));
$('#copyEnv').addEventListener('click', () => copy(S.session ? 'SESSION=' + S.session : 'SESSION=', 'Copied ✓'));
const reset = () => { stopTimers(); S.id = null; show('number'); num.focus({ preventScroll: true }); };
$('#changeNum').addEventListener('click', reset);
$('#retry').addEventListener('click', reset);
$('#again').addEventListener('click', () => { S.session = null; $('#envLine').innerHTML = 'SESSION=<i>(pair above to fill this in)</i>'; num.value = ''; hint.className = 'hint'; hint.innerHTML = HINT_DEFAULT; reset(); });
$('#toDeploy').addEventListener('click', () => $('#deploy').scrollIntoView({ behavior: 'smooth' }));

/* ═══════════════ DEPLOY CARDS ═══════════════ */
function buildPlatforms() {
  const repo = CFG.repo;
  $('#repoNote').hidden = !!repo;
  const grid = $('#platGrid'); grid.textContent = '';
  const P = [
    { i: '🟣', n: 'Heroku', c: 'linear-gradient(90deg,#8b5cf6,#c084fc)', t: 'One-click deploy from your own fork.',
      steps: ['Create / log in to your Heroku account.', 'Press <b>Deploy to Heroku</b> and name your app (small letters).', 'Paste your Session ID in <code>SESSION</code> and your number in <code>DEV</code>.', 'Click <b>Deploy app</b>, then in <b>Resources</b> make sure the <code>web</code> dyno is ON.'],
      btn: repo && ['Deploy to Heroku', `https://heroku.com/deploy?template=${repo}`] },
    { i: '🟢', n: 'Render', c: 'linear-gradient(90deg,#22d3ee,#4ade80)', t: 'Free web service, deploys straight from GitHub.',
      steps: ['Create a Render account and press <b>Deploy to Render</b>.', 'Build command <code>npm install</code> · Start command <code>node index.js</code>.', 'Add environment variable <code>SESSION</code> = your Session ID.', 'Deploy. On the free plan add a monitor (e.g. UptimeRobot) pinging <code>/uptime</code> every 5 min so it never sleeps.'],
      btn: repo && ['Deploy to Render', `https://render.com/deploy?repo=${repo}`] },
    { i: '🖥️', n: 'Panel / VPS', c: 'linear-gradient(90deg,#fbbf24,#fb7185)', t: 'Game panels, Pterodactyl hosts or your own server.',
      steps: ['Download the bot ZIP and upload it to your panel (or server).', 'Open the file <code>.Env</code> and fill only <code>SESSION=</code> with your Session ID.', 'Startup command: <code>node index.js</code> (Node 22+).', 'VPS users, run:'],
      code: 'unzip smiley-cymor-md.zip && cd smiley-cymor-md\nnpm install\nnpm i -g pm2\npm2 start index.js --name smiley-cymor-md\npm2 save',
      btn: repo && ['Download ZIP', `${repo}/archive/refs/heads/main.zip`] },
    { i: '🐙', n: 'GitHub Fork', c: 'linear-gradient(90deg,#e879f9,#22d3ee)', t: 'Start here — Heroku and Render deploy from your fork.',
      steps: ['Log in to GitHub and <b>fork</b> the SMILEY CYMOR MD repo.', 'Keep your fork synced for updates.', 'Use the Heroku / Render buttons with your fork’s link.'],
      btn: repo && ['Fork on GitHub', `${repo}/fork`] },
  ];
  for (const p of P) {
    const el = document.createElement('article'); el.className = 'plat'; el.style.setProperty('--c', p.c);
    const h = document.createElement('h3'); h.innerHTML = `<i>${p.i}</i>${p.n}`;
    const tag = document.createElement('p'); tag.className = 'tag'; tag.textContent = p.t;
    const ol = document.createElement('ol'); ol.innerHTML = p.steps.map(s => `<li>${s}</li>`).join('');
    el.append(h, tag, ol);
    if (p.code) { const pre = document.createElement('pre'); pre.textContent = p.code; el.appendChild(pre); }
    if (p.btn) { const a = document.createElement('a'); a.className = 'go'; a.href = p.btn[1]; a.target = '_blank'; a.rel = 'noopener'; a.textContent = p.btn[0] + ' ↗'; el.appendChild(a); }
    grid.appendChild(el);
  }
}
})();
