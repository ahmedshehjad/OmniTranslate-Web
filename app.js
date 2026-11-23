/* OmniTranslate — Web Demo
 * Local preview of the Android UI/flows. No build step, no external libraries.
 * Translation: MyMemory public API when online, small built-in demo dictionary otherwise.
 */

const LANGS = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' }
];

const API_CODES = { zh: 'zh-CN', id: 'id', bn: 'bn', ur: 'ur' };
const SPEECH_CODES = {
  en: 'en-US', bn: 'bn-BD', es: 'es-ES', hi: 'hi-IN', ar: 'ar-SA', fr: 'fr-FR',
  de: 'de-DE', ja: 'ja-JP', zh: 'zh-CN', pt: 'pt-BR', ru: 'ru-RU', it: 'it-IT',
  tr: 'tr-TR', ko: 'ko-KR', id: 'id-ID', ur: 'ur-PK', vi: 'vi-VN'
};

// Small offline fallback so the UI still works without internet.
const OFFLINE = {
  'en|bn': {
    'hello': 'নমস্তে', 'how are you': 'কেমন আছেন?', 'good morning': 'শুভ সকাল',
    'thank you': 'ধন্যবাদ', 'thanks': 'ধন্যবাদ', 'yes': 'হ্যাঁ', 'no': 'না',
    'translate': 'অনুবাদ', 'clipboard': 'ক্লিপবোর্ড', 'floating bubble': 'ভাসমান বাবল',
    'i love you': 'আমি তোমাকে ভালোবাসি', 'good night': 'শুভ রাত্রি', 'welcome': 'স্বাগতম',
    'what is your name': 'আপনার নাম কী?', 'my name is omni': 'আমার নাম ওম্নি'
  },
  'bn|en': {
    'নমস্তে': 'Hello', 'ধন্যবাদ': 'Thank you', 'হ্যাঁ': 'Yes', 'না': 'No',
    'অনুবাদ': 'Translate', 'ক্লিপবোর্ড': 'Clipboard', 'শুভ সকাল': 'Good morning',
    'শুভ রাত্রি': 'Good night', 'স্বাগতম': 'Welcome', 'কেমন আছেন?': 'How are you?'
  },
  'en|hi': { 'hello': 'नमस्ते', 'thank you': 'धन्यवाद', 'yes': 'हाँ', 'no': 'नहीं' },
  'en|es': { 'hello': 'Hola', 'thank you': 'Gracias', 'yes': 'Sí', 'no': 'No' },
  'en|fr': { 'hello': 'Bonjour', 'thank you': 'Merci', 'yes': 'Oui', 'no': 'Non' },
  'en|ar': { 'hello': 'مرحبا', 'thank you': 'شكرا', 'yes': 'نعم', 'no': 'لا' }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch (_) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
};

const state = {
  tab: 0,
  history: store.get('ot_history', []),
  models: store.get('ot_models', []),
  settings: Object.assign(
    { bubble: false, auto: false, history: true, access: false },
    store.get('ot_settings', {})
  ),
  bubblePos: store.get('ot_bubble_pos', null),
  lastMode: null
};

let toastTimer = null;
function toast(message) {
  const t = $('#toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

function langName(code) {
  const l = LANGS.find(x => x.code === code);
  return l ? `${l.flag} ${l.native}` : code.toUpperCase();
}

function populateSelect(sel, selected) {
  if (!sel) return;
  sel.innerHTML = '<option value="auto">🌐 Auto detect</option>' + LANGS
    .map(l => `<option value="${l.code}">${l.flag} ${l.native} · ${l.name}</option>`)
    .join('');
  sel.value = selected || (sel.id === 'tTo' || sel.id === 'qTo' || sel.id === 'miniTo' ? 'bn' : 'en');
}

function detectLanguage(text) {
  const s = text.trim();
  if (/[\u0980-\u09FF]/.test(s)) return 'bn';
  if (/[\u0900-\u097F]/.test(s)) return 'hi';
  if (/[\u0600-\u06FF]/.test(s)) return 'ar';
  if (/[\u3040-\u30FF]/.test(s)) return 'ja';
  if (/[\uAC00-\uD7AF]/.test(s)) return 'ko';
  if (/[\u4E00-\u9FFF]/.test(s)) return 'zh';
  if (/[\u0400-\u04FF]/.test(s)) return 'ru';
  return 'en';
}

function decodeEntities(text) {
  const el = document.createElement('textarea');
  el.innerHTML = String(text);
  return el.value;
}

function offlineTranslate(text, from, to) {
  const key = `${from}|${to}`;
  const dict = OFFLINE[key] || {};
  const lower = text.trim().toLowerCase();
  if (dict[lower]) return dict[lower];
  for (const [phrase, value] of Object.entries(dict)) {
    if (lower.includes(phrase)) return lower.replace(phrase, value);
  }
  const name = (LANGS.find(l => l.code === to) || { native: to }).native;
  return `【offline demo · ${name}】 ${text}`;
}

async function translate(text, from, to) {
  const clean = String(text || '').trim();
  if (!clean) return { text: '', mode: 'empty', detected: from };
  const detected = from === 'auto' ? detectLanguage(clean) : from;
  const pair = `${detected}|${to}`;

  if (navigator.onLine) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${API_CODES[detected] || detected}|${API_CODES[to] || to}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const out = data && data.responseData && data.responseData.translatedText;
      if (out && !/MYMEMORY WARNING|INVALID/i.test(out)) {
        return { text: decodeEntities(out), mode: 'online', detected };
      }
    } catch (_) { /* fall through to offline demo */ }
  }
  return { text: offlineTranslate(clean, detected, to), mode: 'offline', detected };
}

function speak(text, code) {
  if (!text || !('speechSynthesis' in window)) { toast('Text-to-speech not available in this browser'); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH_CODES[code] || code;
  u.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

async function copyText(text) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); }
  catch (_) {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
  }
  toast('Copied to clipboard');
}

function saveHistory(from, to, input, output, mode) {
  if (!state.settings.history) return;
  state.history.unshift({
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    from, to, input, output, mode, time: new Date().toLocaleString()
  });
  state.history = state.history.slice(0, 100);
  store.set('ot_history', state.history);
  renderAll();
}

function renderHistory() {
  const list = $('#historyList');
  const recent = $('#recentList');
  const q = ($('#histSearch').value || '').toLowerCase().trim();
  const items = state.history.filter(h => !q || (h.input + h.output).toLowerCase().includes(q));

  list.innerHTML = items.length ? items.map(h => `
    <div class="history-item">
      <div class="history-meta">
        <span><b>${esc(langName(h.from))}</b> → <b>${esc(langName(h.to))}</b></span>
        <span>${esc(h.time)} · ${esc(h.mode)}</span>
      </div>
      <div class="history-pair">
        <div>${esc(h.input)}</div>
        <div>${esc(h.output)}</div>
      </div>
      <div class="history-actions">
        <button class="chip" data-copy="${esc(h.output)}">📋 Copy</button>
        <button class="chip" data-reuse="${esc(h.input)}">↺ Reuse</button>
        <button class="chip" data-del="${esc(h.id)}">🗑 Delete</button>
      </div>
    </div>`).join('') : '<div class="empty-note">No saved translations yet.</div>';

  recent.innerHTML = state.history.length ? state.history.slice(0, 3).map(h => `
    <div class="recent-item">
      <div class="langs">${esc(langName(h.from))} → ${esc(langName(h.to))}</div>
      <p>${esc(h.output.length > 110 ? h.output.slice(0, 110) + '…' : h.output)}</p>
    </div>`).join('') : '<div class="empty-note">No translations yet.</div>';

  $('#statHistory').textContent = state.history.length;
  $('#histClear').disabled = !state.history.length;
}

function renderModels() {
  const box = $('#modelList');
  box.innerHTML = LANGS.map(l => {
    const done = state.models.includes(l.code);
    return `<div class="model ${done ? 'done' : ''}" data-lang="${l.code}">
      <span class="flag">${l.flag}</span>
      <div class="meta"><b>${esc(l.native)}</b><small>${esc(l.name)} · ~${18 + LANGS.indexOf(l) % 5 * 6} MB</small>
        <div class="progress"><i style="width:${done ? 100 : 0}%"></i></div>
      </div>
      <button class="pill" data-model="${l.code}">${done ? 'DOWNLOADED' : 'DOWNLOAD'}</button>
    </div>`;
  }).join('');
  $('#modelCount').textContent = `${state.models.length} / ${LANGS.length} downloaded`;
  $('#statModels').textContent = state.models.length;
}

function renderAll() {
  renderHistory();
  renderModels();
  const live = state.settings.bubble;
  $('#liveBadge').className = 'live-badge ' + (live ? 'live' : 'idle');
  $('#liveBadge span').textContent = live ? 'LIVE' : 'IDLE';
  $('#bubbleBtn').classList.toggle('active', live);
  $('#bubble').classList.toggle('hidden', !live);
  if (!live) $('#miniCard').classList.add('hidden');
  $('#statBubble').textContent = live ? 'LIVE' : 'IDLE';
  $('#statMode').textContent = state.lastMode ? state.lastMode.toUpperCase() : '—';
}

function setTab(index) {
  state.tab = Number(index);
  $$('.screen').forEach(s => s.classList.toggle('active', Number(s.dataset.screen) === state.tab));
  $$('.nav-item').forEach(n => n.classList.toggle('active', Number(n.dataset.tab) === state.tab));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- translation flows ---------- */
async function runTranslator() {
  const input = $('#tInput').value.trim();
  const from = $('#tFrom').value === 'auto' ? 'auto' : $('#tFrom').value;
  const to = $('#tTo').value;
  const out = $('#tOutput');
  const btn = $('#tTranslate');
  if (!input) { toast('Type some text first'); return; }
  btn.disabled = true; out.textContent = 'Translating…';
  const r = await translate(input, from, to);
  btn.disabled = false;
  out.textContent = r.text;
  out.classList.remove('empty');
  const mode = r.mode === 'online' ? 'ONLINE' : 'OFFLINE DEMO';
  $('#tMode').textContent = mode;
  $('#tMode').className = 'mode-pill ' + (r.mode === 'online' ? 'online' : 'offline');
  $('#detectLabel').textContent = 'auto-detect: ' + langName(r.detected);
  state.lastMode = r.mode;
  $('#statMode').textContent = mode;
  if ($('#tAutoSave').checked) saveHistory(from, to, input, r.text, r.mode);
}

async function runQuick() {
  const input = $('#qInput').value.trim();
  if (!input) { toast('Type some text first'); return; }
  const from = $('#qFrom').value, to = $('#qTo').value;
  $('#qMode').textContent = 'Translating…';
  const r = await translate(input, from, to);
  $('#qResult').textContent = r.text;
  $('#qResult').classList.remove('empty');
  $('#qMode').textContent = r.mode === 'online' ? 'Online translation' : 'Offline demo result';
  state.lastMode = r.mode;
  if (state.settings.history) saveHistory(from, to, input, r.text, r.mode);
}

async function runMini() {
  const input = $('#miniInput').value.trim();
  if (!input) return;
  $('#miniOutput').textContent = 'Translating…';
  const r = await translate(input, $('#miniFrom').value, $('#miniTo').value);
  $('#miniOutput').textContent = r.text;
  $('#miniOutput').classList.remove('empty');
  $('#miniMode').textContent = r.mode === 'online' ? 'online' : 'offline demo';
  state.lastMode = r.mode;
}

function swap(selA, selB) {
  const a = $(selA), b = $(selB);
  const tmp = a.value; a.value = b.value === 'auto' ? 'en' : b.value; b.value = tmp === 'auto' ? 'en' : tmp;
}

/* ---------- bubble ---------- */
function initBubble() {
  const bubble = $('#bubble');
  if (state.bubblePos) {
    bubble.style.left = state.bubblePos.x + 'px';
    bubble.style.top = state.bubblePos.y + 'px';
    bubble.style.right = 'auto'; bubble.style.bottom = 'auto';
  }
  let dragging = false, moved = false, startX = 0, startY = 0, offX = 0, offY = 0;

  bubble.addEventListener('pointerdown', e => {
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    const r = bubble.getBoundingClientRect();
    offX = e.clientX - r.left; offY = e.clientY - r.top;
    bubble.setPointerCapture(e.pointerId);
  });
  bubble.addEventListener('pointermove', e => {
    if (!dragging) return;
    const x = Math.max(4, Math.min(window.innerWidth - 64, e.clientX - offX));
    const y = Math.max(4, Math.min(window.innerHeight - 64, e.clientY - offY));
    if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 6) moved = true;
    bubble.style.left = x + 'px'; bubble.style.top = y + 'px';
    bubble.style.right = 'auto'; bubble.style.bottom = 'auto';
    state.bubblePos = { x, y };
    const card = $('#miniCard');
    card.style.left = Math.min(x, window.innerWidth - 320) + 'px';
    card.style.top = Math.max(8, y - 180) + 'px';
    card.style.right = 'auto'; card.style.bottom = 'auto';
  });
  bubble.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    store.set('ot_bubble_pos', state.bubblePos);
    if (!moved) $('#miniCard').classList.toggle('hidden');
  });
  bubble.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') $('#miniCard').classList.toggle('hidden');
  });

  let miniTimer = null;
  $('#miniInput').addEventListener('input', () => {
    clearTimeout(miniTimer);
    if (state.settings.auto) miniTimer = setTimeout(runMini, 600);
  });
}

/* ---------- OCR ---------- */
function demoOcrText(fileName) {
  const samples = {
    'omni': 'OmniTranslate — Floating Screen & Smart Translation Hub\nOn-device translation · OCR · Clipboard history',
    'bill': 'Invoice #1042\nTotal: 1,250.00\nThank you for your business.',
    'note': 'Shubho Bijoya!\nPlease translate this paragraph into Bengali.'
  };
  const key = Object.keys(samples).find(k => (fileName || '').toLowerCase().includes(k));
  return key ? samples[key] : 'OmniTranslate vision OCR demo\nবাংলা: স্ক্রিন থেকে টেক্সট উদ্ধার\nEnglish: Text extracted from image';
}

async function runOcr() {
  const img = $('#ocrPreview');
  const out = $('#ocrText');
  if (!img.classList.contains('show')) { toast('Choose an image first'); return; }
  const btn = $('#ocrRun');
  btn.disabled = true; out.textContent = 'Recognizing text…';
  let text = null;
  try {
    if ('TextDetector' in window) {
      const detector = new TextDetector();
      const blocks = await detector.detect(img);
      text = blocks.map(b => b.rawValue || b.boundingBox && '').filter(Boolean).join('\n');
    }
  } catch (_) { text = null; }
  if (!text) text = demoOcrText($('#ocrFile').files[0] && $('#ocrFile').files[0].name);
  out.value = text;
  $('#ocrSource').textContent = 'demo extract · editable';
  btn.disabled = false;
}

/* ---------- wiring ---------- */
function wire() {
  $$('.nav-item').forEach(n => n.addEventListener('click', () => setTab(n.dataset.tab)));
  $$('[data-goto]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.goto)));

  [$('#tFrom'), $('#tTo'), $('#qFrom'), $('#qTo'), $('#miniFrom'), $('#miniTo')]
    .forEach((sel, i) => populateSelect(sel, (i === 1 || i === 3 || i === 5) ? 'bn' : 'en'));

  $('#tSwap').addEventListener('click', () => swap('#tFrom', '#tTo'));
  $('#qSwap').addEventListener('click', () => swap('#qFrom', '#qTo'));
  $('#tTranslate').addEventListener('click', runTranslator);
  $('#qTranslate').addEventListener('click', runQuick);
  $('#miniTranslate').addEventListener('click', runMini);
  $('#miniClose').addEventListener('click', () => $('#miniCard').classList.add('hidden'));

  $('#tInput').addEventListener('input', () => { $('#tCount').textContent = $('#tInput').value.length + ' chars'; });
  $('#tClear').addEventListener('click', () => { $('#tInput').value = ''; $('#tCount').textContent = '0 chars'; $('#tOutput').textContent = 'Translation will appear here.'; $('#tOutput').classList.add('empty'); });
  $('#tSpeakSrc').addEventListener('click', () => speak($('#tInput').value, $('#tFrom').value === 'auto' ? detectLanguage($('#tInput').value) : $('#tFrom').value));
  $('#tSpeakOut').addEventListener('click', () => speak($('#tOutput').textContent, $('#tTo').value));
  $('#tCopy').addEventListener('click', () => copyText($('#tOutput').textContent));
  $('#tSave').addEventListener('click', () => {
    saveHistory($('#tFrom').value, $('#tTo').value, $('#tInput').value, $('#tOutput').textContent, state.lastMode || 'demo');
    toast('Saved to history');
  });

  $('#histSearch').addEventListener('input', renderHistory);
  $('#histClear').addEventListener('click', () => {
    if (!state.history.length) return;
    if (!confirm('Clear all saved history?')) return;
    state.history = []; store.set('ot_history', []); renderAll(); toast('History cleared');
  });
  $('#historyList').addEventListener('click', e => {
    const copy = e.target.closest('[data-copy]');
    const reuse = e.target.closest('[data-reuse]');
    const del = e.target.closest('[data-del]');
    if (copy) copyText(copy.dataset.copy);
    if (reuse) { $('#tInput').value = reuse.dataset.reuse; setTab(1); $('#tInput').dispatchEvent(new Event('input')); }
    if (del) {
      state.history = state.history.filter(h => h.id !== del.dataset.del);
      store.set('ot_history', state.history); renderAll();
    }
  });

  $('#ocrFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { $('#ocrPreview').src = ev.target.result; $('#ocrPreview').classList.add('show'); };
    reader.readAsDataURL(file);
  });
  $('#ocrRun').addEventListener('click', runOcr);
  $('#ocrToTranslator').addEventListener('click', () => {
    const text = $('#ocrText').value.trim();
    if (!text) { toast('No text to send'); return; }
    $('#tInput').value = text;
    $('#tInput').dispatchEvent(new Event('input'));
    setTab(1);
  });

  $('#modelList').addEventListener('click', e => {
    const btn = e.target.closest('[data-model]');
    if (!btn) return;
    const code = btn.dataset.model;
    if (state.models.includes(code)) {
      state.models = state.models.filter(x => x !== code);
      store.set('ot_models', state.models); renderModels(); toast('Model removed');
      return;
    }
    const row = btn.closest('.model');
    const bar = row.querySelector('.progress i');
    btn.textContent = '0%'; btn.disabled = true;
    let p = 0;
    const timer = setInterval(() => {
      p += 8 + Math.random() * 18;
      if (p >= 100) {
        clearInterval(timer);
        state.models.push(code);
        store.set('ot_models', state.models);
        renderModels();
        toast(langName(code) + ' model ready (simulated)');
      } else {
        bar.style.width = p + '%';
        btn.textContent = Math.round(p) + '%';
      }
    }, 160);
  });

  const settingsMap = [
    ['#setBubble', 'bubble', (v) => { state.settings.bubble = v; renderAll(); }],
    ['#setAuto', 'auto', v => state.settings.auto = v],
    ['#setHistory', 'history', v => state.settings.history = v],
    ['#setAccess', 'access', v => { state.settings.access = v; if (v) toast('Simulated: screen inspection enabled'); }]
  ];
  settingsMap.forEach(([sel, key, apply]) => {
    const el = $(sel);
    el.checked = !!state.settings[key];
    el.addEventListener('change', () => { apply(el.checked); store.set('ot_settings', state.settings); });
  });

  $('#settingsBtn').addEventListener('click', () => setTab(5));
  $('#dashBubbleBtn').addEventListener('click', toggleBubble);
  $('#bubbleBtn').addEventListener('click', toggleBubble);
  $('#promoBtn').addEventListener('click', () => $('#promoModal').classList.remove('hidden'));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.close).classList.add('hidden')));
  $('#promoModal').addEventListener('click', e => { if (e.target.id === 'promoModal') e.currentTarget.classList.add('hidden'); });
}

function toggleBubble() {
  state.settings.bubble = !state.settings.bubble;
  $('#setBubble').checked = state.settings.bubble;
  store.set('ot_settings', state.settings);
  renderAll();
  toast(state.settings.bubble ? 'Floating bubble ON' : 'Floating bubble OFF');
}

function initSplash() {
  if (sessionStorage.getItem('ot_splash_seen')) { $('#splash').classList.add('gone'); return; }
  setTimeout(() => {
    $('#splash').classList.add('gone');
    sessionStorage.setItem('ot_splash_seen', '1');
  }, 1700);
}

document.addEventListener('DOMContentLoaded', () => {
  wire();
  initBubble();
  renderAll();
  initSplash();
  setTab(0);
});
