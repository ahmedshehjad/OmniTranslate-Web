/* Omni Translate Web v2 */
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
const API_CODES = { zh: 'zh-CN' };
const SPEECH_CODES = { en:'en-US',bn:'bn-BD',es:'es-ES',hi:'hi-IN',ar:'ar-SA',fr:'fr-FR',de:'de-DE',ja:'ja-JP',zh:'zh-CN',pt:'pt-BR',ru:'ru-RU',it:'it-IT',tr:'tr-TR',ko:'ko-KR',id:'id-ID',ur:'ur-PK',vi:'vi-VN' };

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k,f){ try{ const v=localStorage.getItem(k); return v===null?f:JSON.parse(v);}catch(_){return f;} },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} }
};
const state = {
  tab:0, history:store.get('ot_history',[]), favorites:store.get('ot_favorites',[]), cache:store.get('ot_cache',{}),
  settings:Object.assign({mascot:true,dock:true,bubble:false,autoBubble:false,autoType:false,history:true,compact:false,theme:'dark'}, store.get('ot_settings',{})),
  bubblePos:store.get('ot_bubble_pos',null),
  mascotPos:store.get('ot_mascot_pos',null),
  dockPos:store.get('ot_dock_pos',null),
  floatHidden:store.get('ot_float_hidden',false),
  lastMode:'—', deferredInstall:null
};

let toastTimer=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2400); }
function lang(code){ return LANGS.find(l=>l.code===code); }
function langLabel(code){ const l=lang(code); return l ? l.flag+' '+l.native : String(code||'').toUpperCase(); }
function populateSelect(sel, selected){
  if(!sel) return;
  const auto = (sel.id==='tFrom'||sel.id==='qFrom'||sel.id==='miniFrom') ? '<option value="auto">✨ Auto detect</option>' : '';
  sel.innerHTML = auto + LANGS.map(l=>'<option value="'+l.code+'">'+l.flag+' '+l.native+' · '+l.name+'</option>').join('');
  sel.value = selected || ((sel.id==='tTo'||sel.id==='qTo'||sel.id==='miniTo')?'bn':'en');
}
function detectLanguage(text){
  const s=String(text||'');
  if(/[\u0980-\u09FF]/.test(s)) return 'bn';
  if(/[\u0900-\u097F]/.test(s)) return 'hi';
  if(/[\u0600-\u06FF]/.test(s)) return 'ar';
  if(/[\u3040-\u30FF]/.test(s)) return 'ja';
  if(/[\uAC00-\uD7AF]/.test(s)) return 'ko';
  if(/[\u4E00-\u9FFF]/.test(s)) return 'zh';
  if(/[\u0400-\u04FF]/.test(s)) return 'ru';
  if(/[àâçéèêëîïôûùüÿœæ]/i.test(s)) return 'fr';
  if(/[äöüß]/i.test(s)) return 'de';
  if(/[ãõç]/i.test(s)) return 'pt';
  if(/[áéíóúñ¿¡]/i.test(s)) return 'es';
  return 'en';
}
function decodeEntities(text){ const el=document.createElement('textarea'); el.innerHTML=String(text); return el.value; }
function countStats(text){ const t=String(text||''); const w=t.trim()?t.trim().split(/\s+/).length:0; return t.length+' chars · '+w+' words'; }

async function translate(text, from, to){
  const clean = String(text||'').trim();
  if(!clean) return {text:'', mode:'empty', detected: from==='auto'?'en':from};
  const detected = from==='auto' ? detectLanguage(clean) : from;
  if(detected===to) return {text:clean, mode:'same', detected};
  const key = detected+'|'+to+'|'+clean;
  if(state.cache[key]) return {text:state.cache[key], mode:'cache', detected};
  if(!navigator.onLine) return {text:'', mode:'offline', detected, error:'You are offline. Connect to the internet to translate.'};
  try{
    const url = 'https://api.mymemory.translated.net/get?q='+encodeURIComponent(clean)+'&langpair='+encodeURIComponent((API_CODES[detected]||detected)+'|'+(API_CODES[to]||to));
    const ctrl = new AbortController(); const timer=setTimeout(()=>ctrl.abort(),10000);
    const res = await fetch(url,{signal:ctrl.signal}); clearTimeout(timer);
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    const out = data && data.responseData && data.responseData.translatedText;
    if(out && !/MYMEMORY WARNING|INVALID|QUERY LENGTH LIMIT/i.test(out)){
      const decoded = decodeEntities(out);
      state.cache[key]=decoded;
      const keys=Object.keys(state.cache); if(keys.length>150) delete state.cache[keys[0]];
      store.set('ot_cache', state.cache);
      return {text:decoded, mode:'online', detected};
    }
    throw new Error('No translation returned');
  }catch(e){
    return {text:'', mode:'error', detected, error:'Translation failed. Check your connection and try again.'};
  }
}

function speak(text, code){
  const t=String(text||'').trim();
  if(!t){ toast('Nothing to speak'); return; }
  if(!('speechSynthesis' in window)){ toast('Speech not supported in this browser'); return; }
  const u=new SpeechSynthesisUtterance(t); u.lang=SPEECH_CODES[code]||code||'en-US'; u.rate=0.95;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

/* Voice / Speech-to-Text */
const VOICE_LANG = Object.assign({}, SPEECH_CODES, { auto:'en-US' });
const voiceState = { activeBtn:null, rec:null, target:null, baseText:'', finalText:'', interimText:'', lastFinal:'', manualStop:false, starting:false };

function voiceSupported(){ return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function secureVoiceContext(){ return window.isSecureContext === true; }
function voiceLangFor(code){
  const c = String(code||'auto');
  if(c === 'auto') return { lang:'en-US', auto:true };
  return { lang: VOICE_LANG[c] || SPEECH_CODES[c] || 'en-US', auto:false };
}

function setVoiceBtnState(btn, state, msg){
  if(!btn) return;
  btn.classList.remove('listening','processing','voice-error');
  btn.disabled = false;
  btn.dataset.voiceState = state || 'ready';
  if(state === 'listening'){ btn.classList.add('listening'); btn.textContent = '🔴 Listening...'; btn.setAttribute('aria-pressed','true'); }
  else if(state === 'processing'){ btn.classList.add('processing'); btn.textContent = '⏳ Processing...'; btn.setAttribute('aria-pressed','true'); }
  else if(state === 'error'){ btn.classList.add('voice-error'); btn.textContent = '🎙️ Voice'; btn.setAttribute('aria-pressed','false'); }
  else { btn.textContent = '🎙️ Voice'; btn.setAttribute('aria-pressed','false'); }
  if(msg) btn.title = msg;
}

function voiceErrorMessage(err, eventErr){
  const code = err || (eventErr && eventErr.error) || 'unknown';
  const map = {
    'not-allowed': 'Microphone permission denied. To enable it: Chrome menu → Settings → Site settings → Microphone, allow this site, then reload and tap Voice again.',
    'service-not-allowed': 'Speech service was not allowed by the browser. Check microphone/site permissions and try again.',
    'no-speech': 'No speech detected. Please tap Voice and speak clearly near your microphone.',
    'audio-capture': 'No microphone was found or audio capture failed. Check your microphone connection/permissions.',
    'network': 'Network error during speech recognition. Speech-to-text may need internet access in this browser. Check connection and try again.',
    'aborted': 'Voice input was stopped.',
    'language-not-supported': 'Selected recognition language is not supported by this browser. Try another source language.',
    'unsupported': 'Speech recognition is not supported in this browser. Try Android Chrome or a browser with Web Speech API support.',
    'insecure': 'Microphone/speech recognition requires a secure context (HTTPS or localhost). Current page is not secure, so the browser may block it.',
    'busy': 'Voice input is already active. Tap the listening button to stop it first.'
  };
  return map[code] || 'Voice input failed: ' + code + '. Check microphone permission, secure context (HTTPS/localhost), and browser support.';
}

function cleanupVoice(rec){
  if(!rec) return;
  rec.onstart = rec.onresult = rec.onerror = rec.onend = rec.onaudiostart = rec.onaudioend = null;
  try{ rec.abort(); }catch(_){ }
}

function stopActiveVoice(opts={}){
  const { silent=false, message='', state='ready' } = opts;
  const btn = voiceState.activeBtn;
  const rec = voiceState.rec;
  voiceState.manualStop = true;
  voiceState.activeBtn = null; voiceState.rec = null; voiceState.target = null;
  voiceState.baseText=''; voiceState.finalText=''; voiceState.interimText=''; voiceState.lastFinal=''; voiceState.starting=false;
  if(rec){
    try{ rec.onresult = rec.onerror = rec.onend = null; rec.stop(); }catch(_){ try{ rec.abort(); }catch(__){} }
  }
  if(btn) setVoiceBtnState(btn, state, message || 'Voice input');
  if(message && !silent) toast(message);
}

async function ensureMicPermission(){
  if(!secureVoiceContext()) return { ok:false, code:'insecure' };
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return { ok:true, code:'unknown' }; // SpeechRecognition may still prompt
  try{
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t=>t.stop());
    return { ok:true, code:'granted' };
  }catch(e){
    const name = e && e.name;
    if(name === 'NotAllowedError' || name === 'SecurityError') return { ok:false, code:'not-allowed' };
    if(name === 'NotFoundError' || name === 'DevicesNotFoundError') return { ok:false, code:'audio-capture' };
    if(name === 'NotReadableError' || name === 'TrackStartError') return { ok:false, code:'audio-capture' };
    return { ok:false, code:'not-allowed' };
  }
}

function insertVoiceText(inputEl, baseText, finalText, interimText){
  const base = String(baseText||'');
  const final = String(finalText||'').trim();
  const interim = String(interimText||'').trim();
  let spacer = '';
  if(base && (final || interim)){
    spacer = /\s$/.test(base) ? '' : ' ';
  }
  let combined = base + spacer + final;
  if(interim){
    combined += (combined && !/\s$/.test(combined) ? ' ' : '') + interim;
  }
  if(inputEl.value !== combined){
    inputEl.value = combined;
    inputEl.dispatchEvent(new Event('input', { bubbles:true }));
  }
}

function startVoiceInput(btn, inputEl, langCode){
  if(voiceState.activeBtn && voiceState.activeBtn !== btn){
    toast(voiceErrorMessage('busy'));
    return;
  }
  if(voiceState.activeBtn === btn){
    stopActiveVoice({ silent:false, message:'Voice input stopped.' });
    return;
  }
  if(!voiceSupported()){
    setVoiceBtnState(btn,'error');
    toast(voiceErrorMessage('unsupported'));
    return;
  }
  if(!secureVoiceContext()){
    setVoiceBtnState(btn,'error');
    toast(voiceErrorMessage('insecure'));
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const { lang, auto } = voiceLangFor(langCode);
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;

  voiceState.activeBtn = btn;
  voiceState.rec = rec;
  voiceState.target = inputEl;
  voiceState.baseText = String(inputEl.value || '');
  voiceState.finalText = '';
  voiceState.interimText = '';
  voiceState.lastFinal = '';
  voiceState.manualStop = false;
  voiceState.starting = true;

  setVoiceBtnState(btn, 'processing', 'Requesting microphone...');
  if(auto) toast('Auto-detect source selected: using English (en-US) for speech recognition. Select a specific source language for best results.');

  rec.onstart = ()=>{ voiceState.starting=false; setVoiceBtnState(btn,'listening','Listening... tap again to stop'); toast('Listening… speak now'); };
  rec.onresult = (e)=>{
    let finalChunk = '';
    let interimChunk = '';
    for(let i=e.resultIndex; i<e.results.length; i++){
      const res = e.results[i];
      const txt = (res && res[0] && res[0].transcript ? res[0].transcript : '').trim();
      if(!txt) continue;
      if(res.isFinal){
        if(txt !== voiceState.lastFinal){ finalChunk += (finalChunk ? ' ' : '') + txt; voiceState.lastFinal = txt; }
      } else {
        interimChunk = txt; // latest interim for current segment
      }
    }
    if(finalChunk){
      voiceState.finalText = (voiceState.finalText + (voiceState.finalText ? ' ' : '') + finalChunk).trim();
      voiceState.interimText = '';
    } else if(interimChunk) {
      voiceState.interimText = interimChunk;
    }
    insertVoiceText(inputEl, voiceState.baseText, voiceState.finalText, voiceState.interimText);
  };
  rec.onerror = (e)=>{
    const err = e && e.error ? e.error : 'unknown';
    if(err === 'aborted' && voiceState.manualStop) return;
    if(err === 'no-speech'){
      setVoiceBtnState(btn,'listening','No speech detected yet. Keep speaking or tap to stop.');
      toast(voiceErrorMessage('no-speech'));
      return; // allow onend to decide; some browsers continue
    }
    const msg = voiceErrorMessage(err, e);
    setVoiceBtnState(btn,'error', msg);
    cleanupVoice(rec);
    voiceState.activeBtn=null; voiceState.rec=null; voiceState.target=null; voiceState.starting=false;
    toast(msg);
  };
  rec.onend = ()=>{
    const btnWasActive = voiceState.activeBtn === btn;
    if(!btnWasActive) return;
    if(voiceState.manualStop){ setVoiceBtnState(btn,'ready'); voiceState.manualStop=false; return; }
    // If we got text, finish cleanly. If no text and not manually stopped, treat as ready.
    const gotText = !!(String(voiceState.finalText||'').trim());
    voiceState.activeBtn=null; voiceState.rec=null; voiceState.target=null; voiceState.starting=false;
    setVoiceBtnState(btn,'ready', gotText ? 'Voice input captured' : 'Voice input ended');
    if(gotText) toast('Voice captured');
  };

  // explicit permission flow before starting recognition when possible
  ensureMicPermission().then((perm)=>{
    if(voiceState.rec !== rec || voiceState.activeBtn !== btn) return; // user stopped
    if(!perm.ok){
      const msg = voiceErrorMessage(perm.code);
      setVoiceBtnState(btn,'error', msg);
      cleanupVoice(rec);
      voiceState.activeBtn=null; voiceState.rec=null; voiceState.target=null; voiceState.starting=false;
      toast(msg);
      return;
    }
    try{ rec.start(); }
    catch(err){
      const msg = voiceErrorMessage('unsupported');
      setVoiceBtnState(btn,'error', msg);
      cleanupVoice(rec);
      voiceState.activeBtn=null; voiceState.rec=null; voiceState.target=null; voiceState.starting=false;
      toast(msg);
    }
  }).catch(()=>{
    if(voiceState.rec !== rec) return;
    try{ rec.start(); }catch(_){ setVoiceBtnState(btn,'error'); toast(voiceErrorMessage('unknown')); stopActiveVoice({silent:true}); }
  });
}

function bindVoiceButton(btnId, inputId, getLang){
  const btn = $('#'+btnId); const input = $('#'+inputId);
  if(!btn || !input) return;
  btn.setAttribute('aria-pressed','false');
  btn.addEventListener('click', ()=>startVoiceInput(btn, input, getLang()));
  // Clean up if page hidden/unloaded
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden && voiceState.activeBtn===btn) stopActiveVoice({silent:true}); });
  window.addEventListener('pagehide', ()=>{ if(voiceState.activeBtn===btn) stopActiveVoice({silent:true}); });
  window.addEventListener('beforeunload', ()=>{ if(voiceState.activeBtn===btn) stopActiveVoice({silent:true}); });
}
async function copyText(text){
  const t=String(text||'').trim(); if(!t){ toast('Nothing to copy'); return; }
  try{ await navigator.clipboard.writeText(t); }
  catch(_){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
  toast('Copied');
}
async function shareText(text){
  const t=String(text||'').trim(); if(!t){ toast('Nothing to share'); return; }
  if(navigator.share){ try{ await navigator.share({title:'Omni Translate Web', text:t}); return; }catch(_){} }
  await copyText(t);
}

function saveHistory(from,to,input,output,mode){
  if(!state.settings.history) return;
  state.history.unshift({id:Date.now()+'-'+Math.random().toString(36).slice(2,7),from,to,input,output,mode,time:new Date().toISOString()});
  state.history = state.history.slice(0,200);
  store.set('ot_history', state.history);
}
function toggleFavorite(item){
  const idx = state.favorites.findIndex(f=>f.input===item.input && f.output===item.output && f.to===item.to);
  if(idx>=0){ state.favorites.splice(idx,1); toast('Removed from favorites'); }
  else { state.favorites.unshift(Object.assign({id:Date.now()+''}, item)); state.favorites=state.favorites.slice(0,80); toast('Saved to favorites'); }
  store.set('ot_favorites', state.favorites); renderAll();
}

function modeLabel(mode){ return ({online:'ONLINE',cache:'CACHED',offline:'OFFLINE',error:'ERROR',same:'SAME',empty:'READY'})[mode] || String(mode||'READY').toUpperCase(); }
function modeClass(mode){ if(mode==='online') return 'online'; if(mode==='cache') return 'cache'; if(mode==='offline'||mode==='error') return 'offline'; return 'ready'; }

function renderHistory(){
  const list=$('#historyList'); const recent=$('#recentList');
  const q=($('#histSearch')?.value||'').toLowerCase().trim();
  const items=state.history.filter(h=>!q || (h.input+' '+h.output+' '+langLabel(h.from)+' '+langLabel(h.to)).toLowerCase().includes(q));
  list.innerHTML = items.length ? items.map(h=>`
    <div class="history-item">
      <div class="history-meta"><span><b>${esc(langLabel(h.from))}</b> → <b>${esc(langLabel(h.to))}</b></span><span>${new Date(h.time).toLocaleString()} · ${esc(modeLabel(h.mode))}</span></div>
      <div class="history-pair"><div>${esc(h.input)}</div><div>${esc(h.output)}</div></div>
      <div class="history-actions">
        <button class="chip" data-hact="copy" data-id="${h.id}">📋 Copy</button>
        <button class="chip" data-hact="reuse" data-id="${h.id}">↺ Reuse</button>
        <button class="chip" data-hact="fav" data-id="${h.id}">⭐ Favorite</button>
        <button class="chip" data-hact="del" data-id="${h.id}">🗑 Delete</button>
      </div>
    </div>`).join('') : '<div class="empty-note">No history yet.</div>';
  recent.innerHTML = state.history.length ? state.history.slice(0,4).map(h=>`
    <div class="recent-item"><div class="langs">${esc(langLabel(h.from))} → ${esc(langLabel(h.to))}</div><p>${esc(h.output.length>120?h.output.slice(0,120)+'…':h.output)}</p></div>
  `).join('') : '<div class="empty-note">No translations yet. Start from the Translator.</div>';
  $('#statHistory').textContent = state.history.length;
}

function renderFavorites(){
  const box=$('#favList'); if(!box) return;
  box.innerHTML = state.favorites.length ? state.favorites.slice(0,12).map(f=>`
    <div class="fav-item">
      <div class="fav-meta">${esc(langLabel(f.from))} → ${esc(langLabel(f.to))}</div>
      <div class="fav-text">${esc(f.output.length>100?f.output.slice(0,100)+'…':f.output)}</div>
      <div class="fav-actions">
        <button class="chip" data-fact="use" data-id="${f.id}">Use</button>
        <button class="chip" data-fact="copy" data-id="${f.id}">Copy</button>
        <button class="chip" data-fact="del" data-id="${f.id}">✕</button>
      </div>
    </div>`).join('') : '<div class="empty-note">No favorites yet. Star a translation to keep it here.</div>';
  $('#statFav').textContent = state.favorites.length;
}

function updateNetBadge(){
  const on=navigator.onLine; const b=$('#netBadge');
  b.className='live-badge '+(on?'live':'offline');
  b.querySelector('span').textContent = on ? 'ONLINE' : 'OFFLINE';
}
function renderAll(){
  renderHistory(); renderFavorites(); updateNetBadge();
  $('#statBubble').textContent = state.settings.bubble ? 'ON':'OFF';
  const sm=$('#statMascot'); if(sm) sm.textContent = (state.settings.mascot && !state.floatHidden) ? 'ON':'OFF';
  const sd=$('#statDock'); if(sd) sd.textContent = (state.settings.dock && !state.floatHidden) ? 'ON':'OFF';
  $('#statLast').textContent = state.lastMode || '—';
  $('#bubbleBtn').classList.toggle('active', !!state.settings.bubble);
  $('#bubble').classList.toggle('hidden', !state.settings.bubble);
  if(!state.settings.bubble) $('#miniCard').classList.add('hidden');
  document.body.classList.toggle('compact', !!state.settings.compact);
  document.body.classList.toggle('light', state.settings.theme==='light');
  $('#themeBtn').textContent = state.settings.theme==='light' ? '☀️' : '◐';
  if(typeof applyFloatingVisibility==='function') applyFloatingVisibility();
}

function setTab(i){
  state.tab=Number(i);
  $$('.screen').forEach(s=>s.classList.toggle('active', Number(s.dataset.screen)===state.tab));
  $$('.nav-item[data-tab]').forEach(n=>n.classList.toggle('active', Number(n.dataset.tab)===state.tab));
  window.scrollTo({top:0,behavior:'smooth'});
}

async function runTranslationUI({fromSel,toSel,inputEl,outEl,modeEl,detectEl,cacheEl,btn,save,source}){
  const input = String(inputEl.value||'').trim();
  if(!input){ toast('Type some text first'); return null; }
  const from=fromSel.value, to=toSel.value;
  if(btn){ btn.disabled=true; btn.dataset.old=btn.textContent; btn.textContent='Translating…'; }
  if(modeEl){ modeEl.textContent='…'; if(modeEl.classList.contains('mode-pill')) modeEl.className='mode-pill'; }
  outEl.textContent = 'Translating…'; outEl.classList.remove('empty','error-text');
  const r = await translate(input, from, to);
  if(btn){ btn.disabled=false; btn.textContent=btn.dataset.old||'Translate'; }
  if(r.error){
    outEl.textContent = r.error; outEl.classList.add('empty','error-text');
    if(modeEl){ modeEl.textContent=modeLabel(r.mode); if(modeEl.classList.contains('mode-pill')) modeEl.className='mode-pill '+modeClass(r.mode); }
  } else {
    outEl.textContent = r.text || '—';
    if(!r.text) outEl.classList.add('empty');
  }
  if(detectEl) detectEl.textContent = 'auto-detect: ' + langLabel(r.detected);
  if(cacheEl) cacheEl.textContent = r.mode==='cache' ? 'from cache' : r.mode==='online' ? 'live' : r.mode;
  state.lastMode = modeLabel(r.mode);
  $('#statLast').textContent = state.lastMode;
  if(save && r.text && !r.error){ saveHistory(from,to,input,r.text,r.mode); renderAll(); }
  return r;
}

function getCurrentTranslation(){
  const input=$('#tInput').value.trim(); const output=$('#tOutput').textContent.trim();
  const from=$('#tFrom').value==='auto'?detectLanguage(input):$('#tFrom').value; const to=$('#tTo').value;
  if(!input || !output || $('#tOutput').classList.contains('empty')) return null;
  return {from,to,input,output,mode:state.lastMode.toLowerCase()};
}

async function onTranslateMain(){
  await runTranslationUI({fromSel:$('#tFrom'),toSel:$('#tTo'),inputEl:$('#tInput'),outEl:$('#tOutput'),modeEl:$('#tMode'),detectEl:$('#detectLabel'),cacheEl:$('#tCache'),btn:$('#tTranslate'),save:$('#tAutoSave').checked});
}
async function onTranslateQuick(){
  const r = await runTranslationUI({fromSel:$('#qFrom'),toSel:$('#qTo'),inputEl:$('#qInput'),outEl:$('#qResult'),modeEl:$('#qMode'),save:state.settings.history});
  if(r && r.text){ $('#qResult').classList.remove('empty'); }
}
async function onTranslateMini(){
  const r = await runTranslationUI({fromSel:$('#miniFrom'),toSel:$('#miniTo'),inputEl:$('#miniInput'),outEl:$('#miniOutput'),modeEl:$('#miniMode'),save:false});
}

function swapLangs(a,b){
  const av=a.value, bv=b.value; a.value=bv==='auto'?'en':bv; b.value=av==='auto'?'en':av;
}

/* OCR */
let cameraStream = null;
let ocrSelectedFile = null;
function loadScript(src){
  return new Promise((resolve,reject)=>{ if(document.querySelector('script[data-src="'+src+'"]')) return resolve(); const s=document.createElement('script'); s.src=src; s.async=true; s.dataset.src=src; s.onload=resolve; s.onerror=()=>reject(new Error('Failed to load '+src)); document.head.appendChild(s); });
}
function loadOCRFile(file){
  if(!file) return;
  ocrSelectedFile = file;
  const r=new FileReader();
  r.onload=ev=>{ const img=$('#ocrPreview'); img.src=ev.target.result; img.classList.add('show'); $('#ocrSource').textContent = file.name ? `Selected · ${file.name}` : 'Image selected'; };
  r.readAsDataURL(file);
}
function openScanChoice(){ const m=$('#scanChoiceModal'); if(m){ m.classList.remove('hidden'); const b=$('#scanGalleryBtn'); if(b) b.focus(); } }
function closeScanChoice(){ const m=$('#scanChoiceModal'); if(m) m.classList.add('hidden'); }
function stopCameraStream(){ if(cameraStream){ cameraStream.getTracks().forEach(t=>t.stop()); cameraStream=null; } const v=$('#cameraVideo'); if(v){ v.srcObject=null; } }
function closeCameraCapture(){ stopCameraStream(); const m=$('#cameraModal'); if(m) m.classList.add('hidden'); }
async function openCameraCapture(){
  if(!window.isSecureContext){ toast('Camera requires a secure context (HTTPS or localhost). Use Gallery upload or a secure origin.'); $('#ocrCameraFallback').click(); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    toast('Live camera API unavailable. Opening camera/file fallback.'); $('#ocrCameraFallback').click(); return;
  }
  const modal=$('#cameraModal'), video=$('#cameraVideo'), hint=$('#cameraHint');
  modal.classList.remove('hidden'); hint.textContent='Requesting camera permission…';
  try{
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal:'environment' } }, audio:false });
    video.srcObject = cameraStream; await video.play?.();
    hint.textContent='Camera ready. Capture a photo for OCR.';
  }catch(e){
    stopCameraStream(); modal.classList.add('hidden');
    const name = e && e.name;
    if(name==='NotAllowedError' || name==='SecurityError') toast('Camera permission denied. Enable camera in browser site settings, or use Upload from Gallery.');
    else if(name==='NotFoundError' || name==='DevicesNotFoundError') toast('No camera found. Use Upload from Gallery.');
    else toast('Camera unavailable. Use Upload from Gallery.');
    // fallback to file input capture where supported
    try{ $('#ocrCameraFallback').click(); }catch(_){ }
  }
}
function captureCameraPhoto(){
  const video=$('#cameraVideo'); const canvas=$('#cameraCanvas');
  if(!video || !cameraStream){ toast('Camera is not ready.'); return; }
  const w=video.videoWidth||1280, h=video.videoHeight||720;
  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d'); ctx.drawImage(video,0,0,w,h);
  canvas.toBlob(blob=>{
    if(!blob){ toast('Could not capture photo.'); return; }
    const file=new File([blob], `camera-capture-${Date.now()}.jpg`, {type:'image/jpeg'});
    loadOCRFile(file);
    closeCameraCapture();
    toast('Photo captured for OCR');
  }, 'image/jpeg', 0.92);
}

async function runOCR(){
  const file=ocrSelectedFile || ($('#ocrFile').files && $('#ocrFile').files[0]);
  if(!file){ toast('Choose an image first'); return; }
  $('#ocrRun').disabled=true; $('#ocrProgressWrap').classList.remove('hidden'); $('#ocrProgress').style.width='10%'; $('#ocrStatus').textContent='Loading OCR engine…';
  try{
    if(!window.Tesseract){ await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'); }
    const langGuess = detectLanguage($('#tInput').value||'');
    const ocrLang = (langGuess==='en'?'eng':'eng+'+( {bn:'ben',es:'spa',hi:'hin',ar:'ara',fr:'fra',de:'deu',ja:'jpn',zh:'chi_sim',pt:'por',ru:'rus',it:'ita',tr:'tur',ko:'kor',id:'ind',ur:'urd',vi:'vie'}[langGuess]||'eng'));
    $('#ocrStatus').textContent='Recognizing text…';
    const res = await Tesseract.recognize(file, ocrLang, { logger: m=>{ if(m.status==='recognizing text'){ $('#ocrProgress').style.width=Math.round((m.progress||0)*100)+'%'; $('#ocrStatus').textContent='Recognizing… '+Math.round((m.progress||0)*100)+'%'; } } });
    const text = (res?.data?.text||'').trim();
    $('#ocrText').value = text || 'No text detected. Try a clearer image.';
    $('#ocrSource').textContent = text ? ('Extracted · '+text.length+' chars') : 'No text found';
    $('#ocrStatus').textContent = text ? 'Done' : 'Finished';
    $('#ocrProgress').style.width='100%';
  }catch(e){
    $('#ocrText').value='OCR failed. Check your connection (first run downloads the OCR engine) and try again.';
    $('#ocrStatus').textContent='Failed';
    toast('OCR failed');
  }finally{
    $('#ocrRun').disabled=false;
    setTimeout(()=>$('#ocrProgressWrap').classList.add('hidden'),1200);
  }
}

/* Bubble */
function initBubble(){
  if(initBubble._done) return;
  const bubble=$('#bubble'); const card=$('#miniCard');
  if(!bubble || !card) return;
  initBubble._done = true;
  const clampBubblePos = (pos)=>{
    const w=bubble.offsetWidth||60, h=bubble.offsetHeight||60;
    const x=clamp((pos&&typeof pos.x==='number')?pos.x:window.innerWidth-82, 6, Math.max(6, window.innerWidth-w-6));
    const y=clamp((pos&&typeof pos.y==='number')?pos.y:window.innerHeight-146, 6, Math.max(6, window.innerHeight-h-6));
    return {x,y};
  };
  if(state.bubblePos){
    state.bubblePos = clampBubblePos(state.bubblePos);
    bubble.style.left=state.bubblePos.x+'px'; bubble.style.top=state.bubblePos.y+'px'; bubble.style.right='auto'; bubble.style.bottom='auto';
  }
  let dragging=false, moved=false, startX=0, startY=0, offX=0, offY=0;
  function placeCard(x,y){ card.style.left=Math.min(x, window.innerWidth-320)+'px'; card.style.top=Math.max(8,y-210)+'px'; card.style.right='auto'; card.style.bottom='auto'; }
  window.addEventListener('resize', ()=>{
    if(!state.bubblePos) return;
    state.bubblePos = clampBubblePos(state.bubblePos);
    bubble.style.left=state.bubblePos.x+'px'; bubble.style.top=state.bubblePos.y+'px'; bubble.style.right='auto'; bubble.style.bottom='auto';
    placeCard(state.bubblePos.x, state.bubblePos.y);
    store.set('ot_bubble_pos', state.bubblePos);
  });
  bubble.addEventListener('pointerdown', e=>{ dragging=true; moved=false; startX=e.clientX; startY=e.clientY; const r=bubble.getBoundingClientRect(); offX=e.clientX-r.left; offY=e.clientY-r.top; bubble.setPointerCapture(e.pointerId); });
  bubble.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const x=Math.max(6, Math.min(window.innerWidth-66, e.clientX-offX));
    const y=Math.max(6, Math.min(window.innerHeight-66, e.clientY-offY));
    if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>6) moved=true;
    bubble.style.left=x+'px'; bubble.style.top=y+'px'; bubble.style.right='auto'; bubble.style.bottom='auto';
    state.bubblePos={x,y}; placeCard(x,y);
  });
  bubble.addEventListener('pointerup', (e)=>{ if(!dragging) return; dragging=false; try{ bubble.releasePointerCapture(e.pointerId); }catch(_){} store.set('ot_bubble_pos', state.bubblePos); if(!moved) card.classList.toggle('hidden'); });
  bubble.addEventListener('pointercancel', (e)=>{ if(!dragging) return; dragging=false; try{ bubble.releasePointerCapture(e.pointerId); }catch(_){} });
  bubble.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); card.classList.toggle('hidden'); }});
  let t=null; $('#miniInput').addEventListener('input', ()=>{ clearTimeout(t); if(state.settings.autoBubble) t=setTimeout(onTranslateMini, 650); });
}

/* Install */
function initInstall(){
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); state.deferredInstall=e; $('#installBtn').classList.remove('hidden'); $('#dashInstallBtn').disabled=false; });
  window.addEventListener('appinstalled', ()=>{ state.deferredInstall=null; $('#installBtn').classList.add('hidden'); toast('App installed'); });
}
async function triggerInstall(){
  if(state.deferredInstall){ state.deferredInstall.prompt(); try{ await state.deferredInstall.userChoice; }catch(_){} state.deferredInstall=null; $('#installBtn').classList.add('hidden'); }
  else toast('Use browser menu → Add to Home screen / Install app');
}

/* Wiring */
function wire(){
  $$('.nav-item[data-tab]').forEach(n=>n.addEventListener('click', ()=>setTab(n.dataset.tab)));
  $$('[data-goto]').forEach(b=>b.addEventListener('click', ()=>setTab(b.dataset.goto)));

  ['tFrom','tTo','qFrom','qTo','miniFrom','miniTo'].forEach((id,i)=>populateSelect($('#'+id), (id.endsWith('To')?'bn':'en')));

  $('#tSwap').onclick=()=>swapLangs($('#tFrom'),$('#tTo'));
  $('#qSwap').onclick=()=>swapLangs($('#qFrom'),$('#qTo'));
  $('#tTranslate').onclick=onTranslateMain;
  $('#qTranslate').onclick=onTranslateQuick;
  $('#miniTranslate').onclick=onTranslateMini;
  $('#miniClose').onclick=()=>$('#miniCard').classList.add('hidden');
  $('#miniCopy').onclick=()=>copyText($('#miniOutput').textContent);

  $('#tInput').addEventListener('input', ()=>{ $('#tCount').textContent=countStats($('#tInput').value); if(state.settings.autoType){ clearTimeout($('#tInput')._t); $('#tInput')._t=setTimeout(onTranslateMain, 700); } });
  $('#qInput').addEventListener('keydown', e=>{ if(e.key==='Enter' && (e.ctrlKey||e.metaKey)) onTranslateQuick(); });
  $('#tInput').addEventListener('keydown', e=>{ if(e.key==='Enter' && (e.ctrlKey||e.metaKey)) onTranslateMain(); });

  $('#tClear').onclick=()=>{ $('#tInput').value=''; $('#tOutput').textContent='Translation will appear here.'; $('#tOutput').className='textarea big output empty'; $('#tCount').textContent='0 chars · 0 words'; };
  $('#tPaste').onclick=async()=>{ try{ const t=await navigator.clipboard.readText(); if(t){ $('#tInput').value=t; $('#tInput').dispatchEvent(new Event('input')); } }catch(_){ toast('Clipboard read not allowed'); } };
  $('#tSpeakSrc').onclick=()=>speak($('#tInput').value, $('#tFrom').value==='auto'?detectLanguage($('#tInput').value):$('#tFrom').value);
  $('#tSpeakOut').onclick=()=>speak($('#tOutput').textContent, $('#tTo').value);
  $('#tCopy').onclick=()=>copyText($('#tOutput').textContent);
  $('#tShare').onclick=()=>shareText($('#tOutput').textContent);
  $('#tFav').onclick=()=>{ const it=getCurrentTranslation(); if(it) toggleFavorite(it); else toast('Translate something first'); };
  bindVoiceButton('tMic','tInput', ()=>$('#tFrom').value);
  bindVoiceButton('qMic','qInput', ()=>$('#qFrom').value);
  $('#qCopy').onclick=()=>copyText($('#qResult').textContent);
  $('#qSpeak').onclick=()=>speak($('#qResult').textContent, $('#qTo').value);
  $('#qFav').onclick=()=>{ const input=$('#qInput').value.trim(); const out=$('#qResult').textContent.trim(); if(!input||!out||$('#qResult').classList.contains('empty')) return toast('Translate something first'); const from=$('#qFrom').value==='auto'?detectLanguage(input):$('#qFrom').value; toggleFavorite({from,to:$('#qTo').value,input,output:out}); };

  // history actions
  $('#histSearch').addEventListener('input', renderHistory);
  $('#histClear').onclick=()=>{ if(!state.history.length) return; if(!confirm('Clear all history?')) return; state.history=[]; store.set('ot_history',[]); renderAll(); toast('History cleared'); };
  $('#histExport').onclick=()=>{ const blob=new Blob([JSON.stringify({history:state.history,favorites:state.favorites},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='omnitranslate-history.json'; a.click(); URL.revokeObjectURL(a.href); };
  $('#histImport').addEventListener('change', async e=>{ const f=e.target.files[0]; if(!f) return; try{ const data=JSON.parse(await f.text()); if(Array.isArray(data.history)) state.history=data.history.concat(state.history).slice(0,200); if(Array.isArray(data.favorites)) state.favorites=data.favorites.concat(state.favorites).slice(0,80); store.set('ot_history',state.history); store.set('ot_favorites',state.favorites); renderAll(); toast('Import complete'); }catch(_){ toast('Invalid JSON file'); } e.target.value=''; });
  $('#historyList').addEventListener('click', e=>{
    const btn=e.target.closest('[data-hact]'); if(!btn) return;
    const h=state.history.find(x=>x.id===btn.dataset.id); if(!h) return;
    const act=btn.dataset.hact;
    if(act==='copy') copyText(h.output);
    if(act==='reuse'){ $('#tFrom').value=h.from; $('#tTo').value=h.to; $('#tInput').value=h.input; $('#tOutput').textContent=h.output; $('#tOutput').classList.remove('empty','error-text'); $('#tCount').textContent=countStats(h.input); setTab(1); }
    if(act==='fav') toggleFavorite(h);
    if(act==='del'){ state.history=state.history.filter(x=>x.id!==h.id); store.set('ot_history',state.history); renderAll(); }
  });
  $('#favList').addEventListener('click', e=>{
    const btn=e.target.closest('[data-fact]'); if(!btn) return;
    const f=state.favorites.find(x=>String(x.id)===String(btn.dataset.id)); if(!f) return;
    const act=btn.dataset.fact;
    if(act==='use'){ $('#tFrom').value=f.from; $('#tTo').value=f.to; $('#tInput').value=f.input; $('#tOutput').textContent=f.output; $('#tOutput').classList.remove('empty','error-text'); $('#tCount').textContent=countStats(f.input); setTab(1); }
    if(act==='copy') copyText(f.output);
    if(act==='del'){ state.favorites=state.favorites.filter(x=>String(x.id)!==String(f.id)); store.set('ot_favorites',state.favorites); renderAll(); }
  });

  // OCR
  $('#ocrFile').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) loadOCRFile(f); e.target.value=''; });
  $('#ocrCameraFallback').addEventListener('change', e=>{ const f=e.target.files[0]; if(f) loadOCRFile(f); e.target.value=''; });
  $('#dropzone').addEventListener('click', (e)=>{ if(e.target.closest('#ocrFile,#ocrCameraFallback')) return; openScanChoice(); });
  $('#dropzone').addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openScanChoice(); } });
  $('#scanGalleryBtn').onclick=()=>{ closeScanChoice(); $('#ocrFile').click(); };
  $('#scanCameraBtn').onclick=()=>{ closeScanChoice(); openCameraCapture(); };
  $('#scanCancelBtn').onclick=closeScanChoice;
  $('#scanChoiceModal').addEventListener('click', (e)=>{ if(e.target.id==='scanChoiceModal') closeScanChoice(); });
  $('#cameraCloseBtn').onclick=closeCameraCapture;
  $('#cameraCaptureBtn').onclick=captureCameraPhoto;
  $('#cameraModal').addEventListener('click', (e)=>{ if(e.target.id==='cameraModal') closeCameraCapture(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ if(!$('#cameraModal').classList.contains('hidden')) closeCameraCapture(); if(!$('#scanChoiceModal').classList.contains('hidden')) closeScanChoice(); } });
  $('#ocrRun').onclick=runOCR;
  $('#ocrCopy').onclick=()=>copyText($('#ocrText').value);
  $('#ocrToTranslator').onclick=()=>{ const t=$('#ocrText').value.trim(); if(!t){ toast('No text to send'); return; } $('#tInput').value=t; $('#tInput').dispatchEvent(new Event('input')); setTab(1); };

  // settings
  const bindSet=(id,key,onChange)=>{ const el=$('#'+id); if(!el) return; el.checked=!!state.settings[key]; el.addEventListener('change', e=>{ state.settings[key]=e.target.checked; if(onChange) onChange(e.target.checked); store.set('ot_settings',state.settings); renderAll(); }); };
  bindSet('setMascot','mascot', v=>{ if(v) state.floatHidden=false; store.set('ot_float_hidden',state.floatHidden); });
  bindSet('setDock','dock', v=>{ if(v) state.floatHidden=false; store.set('ot_float_hidden',state.floatHidden); });
  bindSet('setBubble','bubble');
  bindSet('setAutoBubble','autoBubble');
  bindSet('setAutoType','autoType');
  bindSet('setHistory','history');
  bindSet('setCompact','compact');

  // top actions
  $('#settingsBtn').onclick=()=>setTab(4);
  $('#bubbleBtn').onclick=()=>{ state.settings.bubble=!state.settings.bubble; $('#setBubble').checked=state.settings.bubble; store.set('ot_settings',state.settings); renderAll(); toast(state.settings.bubble?'Quick bubble ON':'Quick bubble OFF'); };
 
  $('#themeBtn').onclick=()=>{ state.settings.theme=state.settings.theme==='light'?'dark':'light'; store.set('ot_settings',state.settings); renderAll(); };
  $('#installBtn').onclick=triggerInstall; $('#installBtn2').onclick=triggerInstall; $('#dashInstallBtn').onclick=triggerInstall;

  // keyboard shortcuts
  document.addEventListener('keydown', e=>{
    if((e.ctrlKey||e.metaKey) && e.key==='Enter'){ if(state.tab===1) { e.preventDefault(); onTranslateMain(); } }
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setTab(1); $('#tInput').focus(); }
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='l'){ e.preventDefault(); if(state.tab===1){ swapLangs($('#tFrom'),$('#tTo')); } }
  });

  window.addEventListener('online', updateNetBadge); window.addEventListener('offline', updateNetBadge);
}

function initSplash(){
  if(sessionStorage.getItem('ot_splash_seen')) { $('#splash').classList.add('gone'); return; }
  setTimeout(()=>{ $('#splash').classList.add('gone'); sessionStorage.setItem('ot_splash_seen','1'); }, 1400);
}

document.addEventListener('DOMContentLoaded', ()=>{
  initInstall(); wire(); initBubble(); initMascotAndDock(); renderAll(); initSplash(); setTab(0);
});

/* =========================
   Mascot + Independent Action Dock
   ========================= */
const MASCOT_DIALOGUES = [
  "Tap me for a quick translate! ✨",
  "Ready when you are.",
  "I can open the Translator panel.",
  "Need words? I’ve got you.",
  "Try the dock: Scan, Translate, Close.",
  "Your text stays yours. 🔒",
  "Small bubble, big language power.",
  "Wheee! I love bouncing! 💜",
  "Carrom mode: activated!",
  "Boing! That tickled.",
  "Catch me if you can!",
  "I’m tiny but turbo!"
];
let mascotTimer = null;
let mascotDialogueTimer = null;
let mascotNudgeTimer = null;
let mascotLastPointer = {x: window.innerWidth/2, y: window.innerHeight/2};
const mascotPhysics = {
  x: 18, y: window.innerHeight - 240, vx: 0, vy: 0,
  dragging: false, pointerId: null, lastMoveTs: 0,
  samples: [], raf: null, lastTs: 0, running: false,
  settled: true, impactCooldown: 0, grabOffsetX: 0, grabOffsetY: 0,
  moved: false, startX: 0, startY: 0, suppressClick: false
};

function prefersReducedMotion(){ return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

function placeFloating(el, pos, fallback){
  if(!el) return;
  const r = el.getBoundingClientRect();
  const w = r.width || el.offsetWidth || 100;
  const h = r.height || el.offsetHeight || 100;
  const maxX = Math.max(8, window.innerWidth - w - 8);
  const maxY = Math.max(8, window.innerHeight - h - 8);
  const x = clamp((pos && typeof pos.x==='number') ? pos.x : fallback.x, 8, maxX);
  const y = clamp((pos && typeof pos.y==='number') ? pos.y : fallback.y, 8, maxY);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  return {x,y};
}

function applyFloatingVisibility(){
  const mascot = $('#mascotWrap');
  const dock = $('#actionDock');
  const restore = $('#floatRestoreBtn');
  const showMascot = !!state.settings.mascot && !state.floatHidden;
  const showDock = !!state.settings.dock && !state.floatHidden;
  if(mascot){ mascot.classList.toggle('hidden', !showMascot); mascot.setAttribute('aria-hidden', showMascot?'false':'true'); }
  if(dock){ dock.classList.toggle('hidden', !showDock); dock.setAttribute('aria-hidden', showDock?'false':'true'); }
  if(restore){ restore.classList.toggle('hidden', !state.floatHidden || (!state.settings.mascot && !state.settings.dock)); }
  if(!showMascot){ hideMascotSpeech(); stopMascotPhysics(); cancelMascotNudge(); }
}

function openRealTranslator(focus=true){
  setTab(1);
  if(focus){
    setTimeout(()=>{ const inp=$('#tInput'); if(inp){ inp.focus(); inp.scrollIntoView({block:'center',behavior:prefersReducedMotion()?'auto':'smooth'}); } }, 60);
  }
}

function hideMascotSpeech(){ const s=$('#mascotSpeech'); if(s){ s.classList.add('hidden'); s.textContent=''; } }
function showMascotSpeech(text, ms=3200){
  const s=$('#mascotSpeech'); if(!s || state.floatHidden || !state.settings.mascot) return;
  s.textContent = text;
  s.classList.remove('hidden');
  clearTimeout(mascotDialogueTimer);
  mascotDialogueTimer = setTimeout(hideMascotSpeech, ms);
}
function randomMascotDialogue(){
  const msg = MASCOT_DIALOGUES[Math.floor(Math.random()*MASCOT_DIALOGUES.length)];
  showMascotSpeech(msg, 2800);
}

function setMascotExpression(expr, ms=1400){
  const wrap = $('#mascotWrap'); if(!wrap) return;
  wrap.dataset.expression = expr || '';
  clearTimeout(wrap._exprTimer);
  if(expr){
    wrap._exprTimer = setTimeout(()=>{ if(wrap.dataset.expression===expr) wrap.dataset.expression=''; }, ms);
  }
}
function mascotSetPhysicsTransform(rot=0, sx=1, sy=1){
  const g = $('#mascotPhysics');
  if(g) g.style.transform = `rotate(${rot}deg) scale(${sx}, ${sy})`;
}
function mascotBodySize(){
  const el = $('#mascotWrap');
  return { w: (el && el.offsetWidth) || 90, h: (el && el.offsetHeight) || 105 };
}
function mascotClampPos(x,y){
  const {w,h} = mascotBodySize();
  return { x: clamp(x,8, Math.max(8, window.innerWidth-w-8)), y: clamp(y,8, Math.max(8, window.innerHeight-h-8)) };
}
function mascotApplyPos(x,y){
  const wrap = $('#mascotWrap'); if(!wrap) return;
  const p = mascotClampPos(x,y);
  mascotPhysics.x = p.x; mascotPhysics.y = p.y;
  wrap.style.left = p.x+'px'; wrap.style.top = p.y+'px'; wrap.style.right='auto'; wrap.style.bottom='auto';
  return p;
}
function stopMascotPhysics(){
  mascotPhysics.running = false;
  mascotPhysics.settled = true;
  mascotPhysics.vx = 0; mascotPhysics.vy = 0;
  if(mascotPhysics.raf){ cancelAnimationFrame(mascotPhysics.raf); mascotPhysics.raf=null; }
  mascotSetPhysicsTransform(0,1,1);
  const wrap = $('#mascotWrap'); if(wrap) wrap.classList.remove('moving');
}
function startMascotPhysics(){
  if(prefersReducedMotion()) { stopMascotPhysics(); return; }
  if(mascotPhysics.running) return;
  mascotPhysics.running = true; mascotPhysics.settled = false; mascotPhysics.lastTs = 0;
  const wrap = $('#mascotWrap'); if(wrap) wrap.classList.add('moving');
  const step = (ts)=>{
    if(!mascotPhysics.running){ mascotPhysics.raf=null; return; }
    if(document.hidden){ mascotPhysics.lastTs = ts; mascotPhysics.raf = requestAnimationFrame(step); return; }
    if(mascotPhysics.dragging){ mascotPhysics.lastTs = ts; mascotPhysics.raf = requestAnimationFrame(step); return; }
    const dt = Math.min(0.032, Math.max(0.008, mascotPhysics.lastTs ? (ts-mascotPhysics.lastTs)/1000 : 0.016));
    mascotPhysics.lastTs = ts;
    let {x,y,vx,vy} = mascotPhysics;
    const {w,h} = mascotBodySize();
    const maxX = Math.max(8, window.innerWidth-w-8);
    const maxY = Math.max(8, window.innerHeight-h-8);
    x += vx * dt; y += vy * dt;
    let collided = false, impact = 0;
    if(x < 8){ x=8; vx = Math.abs(vx)*0.82; collided=true; impact=Math.max(impact, Math.abs(vx)); }
    if(x > maxX){ x=maxX; vx = -Math.abs(vx)*0.82; collided=true; impact=Math.max(impact, Math.abs(vx)); }
    if(y < 8){ y=8; vy = Math.abs(vy)*0.82; collided=true; impact=Math.max(impact, Math.abs(vy)); }
    if(y > maxY){ y=maxY; vy = -Math.abs(vy)*0.82; collided=true; impact=Math.max(impact, Math.abs(vy)); }
    // friction / exponential decay
    const damp = Math.pow(0.985, dt*60);
    vx *= damp; vy *= damp;
    if(Math.abs(vx) < 8) vx = 0;
    if(Math.abs(vy) < 8) vy = 0;
    mascotPhysics.x=x; mascotPhysics.y=y; mascotPhysics.vx=vx; mascotPhysics.vy=vy;
    const wrap = $('#mascotWrap');
    if(wrap){ wrap.style.left=x+'px'; wrap.style.top=y+'px'; wrap.style.right='auto'; wrap.style.bottom='auto'; }
    // visual reaction
    const speed = Math.hypot(vx,vy);
    mascotPhysics.impactCooldown = Math.max(0, mascotPhysics.impactCooldown - dt);
    if(collided && impact > 120 && mascotPhysics.impactCooldown <= 0){
      mascotPhysics.impactCooldown = 0.08;
      const sx = impact>800 ? 1.18 : 1.1, sy = impact>800 ? 0.84 : 0.9;
      mascotSetPhysicsTransform(clamp(vx/90,-18,18), sx, sy);
      setMascotExpression(speed>900?'dizzy':'surprised', 700);
      if(Math.random()<0.35) showMascotSpeech(['Boing!','Oof!','Wheee!','Bonk!'][Math.floor(Math.random()*4)], 900);
    } else {
      const rot = clamp(vx/110, -16, 16);
      const stretch = clamp(speed/4500, 0, 0.08);
      mascotSetPhysicsTransform(rot, 1+stretch, 1-stretch*0.8);
    }
    if(vx===0 && vy===0){
      mascotApplyPos(x,y);
      stopMascotPhysics();
      state.mascotPos = {x:mascotPhysics.x, y:mascotPhysics.y};
      store.set('ot_mascot_pos', state.mascotPos);
      setMascotExpression('happy', 900);
      return;
    }
    mascotPhysics.raf = requestAnimationFrame(step);
  };
  mascotPhysics.raf = requestAnimationFrame(step);
}
function addMascotVelocitySample(x,y,ts){
  const arr = mascotPhysics.samples;
  arr.push({x,y,ts});
  while(arr.length>6) arr.shift();
}
function computeMascotFlickVelocity(){
  const arr = mascotPhysics.samples;
  if(arr.length < 2) return {vx:0, vy:0};
  const last = arr[arr.length-1];
  let first = arr[0];
  for(let i=arr.length-2;i>=0;i--){ if(last.ts-arr[i].ts <= 120){ first = arr[i]; } }
  const dt = Math.max(0.016, (last.ts-first.ts)/1000);
  let vx = (last.x-first.x)/dt;
  let vy = (last.y-first.y)/dt;
  const speed = Math.hypot(vx,vy);
  const maxSpeed = 4200;
  if(speed > maxSpeed){ const k=maxSpeed/speed; vx*=k; vy*=k; }
  if(speed < 120) return {vx:0,vy:0};
  return {vx,vy};
}

function updateMascotPupils(clientX, clientY){
  const wrap = $('#mascotWrap'); if(!wrap || wrap.classList.contains('hidden')) return;
  const rect = wrap.getBoundingClientRect();
  const cx = rect.left + rect.width*0.5;
  const cy = rect.top + rect.height*0.45;
  const dx = clamp((clientX-cx)/60, -1, 1);
  const dy = clamp((clientY-cy)/60, -1, 1);
  const px = dx*3.2, py = dy*2.6;
  $$('.mascot-pupil-g', wrap).forEach(g=>{ g.style.transform = `translate(${px}px, ${py}px)`; });
}

function startMascotIdle(){
  stopMascotIdle();
  if(prefersReducedMotion()) return;
  const tick = ()=>{
    mascotTimer = setTimeout(()=>{
      const wrap = $('#mascotWrap');
      const moving = mascotPhysics.running || mascotPhysics.dragging;
      if(wrap && !wrap.classList.contains('hidden') && !wrap.classList.contains('dragging') && !moving && !state.floatHidden){
        const r = Math.random();
        if(r < 0.35) randomMascotDialogue();
        if(r < 0.55) setMascotExpression(['happy','surprised','wink','excited'][Math.floor(Math.random()*4)], 1600);
        if(r > 0.68) autonomousMascotNudge();
      }
      tick();
    }, 4200 + Math.random()*3600);
  };
  tick();
}
function stopMascotIdle(){ clearTimeout(mascotTimer); mascotTimer=null; }
function cancelMascotNudge(){
  clearTimeout(mascotNudgeTimer); mascotNudgeTimer=null;
  const wrap = $('#mascotWrap');
  if(wrap) wrap.style.transition = '';
}

function autonomousMascotNudge(){
  const wrap = $('#mascotWrap'); if(!wrap || wrap.classList.contains('hidden') || prefersReducedMotion() || wrap.classList.contains('dragging') || mascotPhysics.running || state.floatHidden) return;
  cancelMascotNudge();
  const rect = wrap.getBoundingClientRect();
  const maxX = Math.max(8, window.innerWidth - rect.width - 8);
  const maxY = Math.max(8, window.innerHeight - rect.height - 8);
  const nx = clamp(rect.left + (Math.random()*160 - 80), 8, maxX);
  const ny = clamp(rect.top + (Math.random()*120 - 60), 8, maxY);
  wrap.style.transition = 'left .45s cubic-bezier(.2,.8,.2,1), top .45s cubic-bezier(.2,.8,.2,1)';
  wrap.style.left = nx+'px'; wrap.style.top = ny+'px'; wrap.style.right='auto'; wrap.style.bottom='auto';
  mascotNudgeTimer = setTimeout(()=>{
    mascotNudgeTimer = null;
    const w = $('#mascotWrap');
    if(!w || w.classList.contains('dragging') || mascotPhysics.running || w.classList.contains('hidden') || state.floatHidden) return;
    w.style.transition='';
    state.mascotPos = {x:nx, y:ny}; // only commit if nudge completed without user drag
    store.set('ot_mascot_pos', state.mascotPos);
  }, 470);
}

function makeDraggable(el, opts){
  if(!el) return;
  let dragging=false, moved=false, startX=0,startY=0,offX=0,offY=0,pid=null;
  const suppressClick = (e)=>{ if(el._suppressClick){ e.preventDefault(); e.stopPropagation(); el._suppressClick=false; } };
  el.addEventListener('click', suppressClick, true);
  const onDown = (e)=>{
    if(e.button!==undefined && e.button!==0) return;
    if(opts.handle && !e.target.closest(opts.handle)) return;
    dragging=true; moved=false; pid=e.pointerId;
    const r=el.getBoundingClientRect();
    startX=e.clientX; startY=e.clientY; offX=e.clientX-r.left; offY=e.clientY-r.top;
    el.classList.add('dragging');
    if(opts.onStart) opts.onStart(e);
    try{ el.setPointerCapture(pid); }catch(_){ }
  };
  const onMove = (e)=>{
    mascotLastPointer = {x:e.clientX, y:e.clientY};
    if(el.id==='mascotWrap') updateMascotPupils(e.clientX,e.clientY);
    if(!dragging || pid!==e.pointerId) return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    if(Math.abs(dx)>4 || Math.abs(dy)>4) moved=true;
    if(!moved) return;
    const w=el.offsetWidth||100, h=el.offsetHeight||100;
    const x=clamp(e.clientX-offX, 8, Math.max(8, window.innerWidth-w-8));
    const y=clamp(e.clientY-offY, 8, Math.max(8, window.innerHeight-h-8));
    el.style.left=x+'px'; el.style.top=y+'px'; el.style.right='auto'; el.style.bottom='auto';
    if(opts.onMove) opts.onMove(x,y,e);
  };
  const finish = (e)=>{
    if(!dragging || (pid!==null && e.pointerId!==pid)) return;
    dragging=false; el.classList.remove('dragging');
    try{ el.releasePointerCapture(pid); }catch(_){ }
    const r=el.getBoundingClientRect();
    let x=r.left, y=r.top;
    if(opts.snapEdge){
      const w=r.width, h=r.height;
      const maxX=Math.max(8, window.innerWidth-w-8);
      const maxY=Math.max(8, window.innerHeight-h-8);
      if(x < window.innerWidth/2) x=8; else x=maxX;
      y=clamp(y,8,maxY);
      el.style.transition = prefersReducedMotion() ? '' : 'left .18s ease, top .18s ease';
      el.style.left=x+'px'; el.style.top=y+'px';
      setTimeout(()=>{ el.style.transition=''; }, 200);
    }
    const pos={x,y};
    if(moved) el._suppressClick = true;
    if(opts.onEnd) opts.onEnd(pos, moved, e);
  };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
}

function initMascotAndDock(){
  if(initMascotAndDock._done) return;
  const mascot=$('#mascotWrap'), mascotBtn=$('#mascotBtn');
  const dock=$('#actionDock');
  const restore=$('#floatRestoreBtn');
  if(!mascot || !dock) return;
  initMascotAndDock._done = true;

  // default positions
  state.mascotPos = placeFloating(mascot, state.mascotPos, {x:18, y:window.innerHeight-240});
  mascotPhysics.x = state.mascotPos.x; mascotPhysics.y = state.mascotPos.y;
  placeFloating(dock, state.dockPos, {x:window.innerWidth-92, y:window.innerHeight-320});

  // Custom mascot drag+flick physics (carrom-like)
  const mascotSuppressClick = (e)=>{ if(mascotPhysics.suppressClick){ e.preventDefault(); e.stopPropagation(); mascotPhysics.suppressClick=false; } };
  mascot.addEventListener('click', mascotSuppressClick, true);
  const mascotDown = (e)=>{
    if(e.button!==undefined && e.button!==0) return;
    if(!e.target.closest('#mascotBtn')) return;
    cancelMascotNudge(); mascot.style.transition=''; stopMascotPhysics();
    mascotPhysics.dragging=true; mascotPhysics.moved=false; mascotPhysics.pointerId=e.pointerId;
    mascotPhysics.startX=e.clientX; mascotPhysics.startY=e.clientY;
    const r=mascot.getBoundingClientRect();
    mascotPhysics.grabOffsetX=e.clientX-r.left; mascotPhysics.grabOffsetY=e.clientY-r.top;
    mascotPhysics.samples=[]; addMascotVelocitySample(e.clientX,e.clientY,performance.now());
    mascot.classList.add('dragging');
    try{ mascot.setPointerCapture(e.pointerId); }catch(_){ }
  };
  const mascotMove = (e)=>{
    mascotLastPointer={x:e.clientX,y:e.clientY};
    updateMascotPupils(e.clientX,e.clientY);
    if(!mascotPhysics.dragging || mascotPhysics.pointerId!==e.pointerId) return;
    const dx=e.clientX-mascotPhysics.startX, dy=e.clientY-mascotPhysics.startY;
    if(Math.abs(dx)>4||Math.abs(dy)>4) mascotPhysics.moved=true;
    if(!mascotPhysics.moved) return;
    const x=e.clientX-mascotPhysics.grabOffsetX;
    const y=e.clientY-mascotPhysics.grabOffsetY;
    mascotApplyPos(x,y);
    addMascotVelocitySample(e.clientX,e.clientY,performance.now());
    if(state.settings.mascot && Math.random()<0.08) setMascotExpression('surprised',350);
  };
  const mascotFinish = (e)=>{
    if(!mascotPhysics.dragging || mascotPhysics.pointerId!==e.pointerId) return;
    mascotPhysics.dragging=false; mascot.classList.remove('dragging');
    try{ mascot.releasePointerCapture(e.pointerId); }catch(_){ }
    const pos = mascotClampPos(mascotPhysics.x, mascotPhysics.y);
    mascotApplyPos(pos.x,pos.y);
    if(mascotPhysics.moved){
      mascotPhysics.suppressClick = true;
      state.mascotPos=pos; store.set('ot_mascot_pos', pos); // user drag end is authoritative
      const {vx,vy} = computeMascotFlickVelocity();
      const speed = Math.hypot(vx,vy);
      if(!prefersReducedMotion() && speed >= 180){
        mascotPhysics.vx=vx; mascotPhysics.vy=vy;
        setMascotExpression(speed>1400?'excited':'surprised', 900);
        showMascotSpeech(speed>1800?'Wheee!':'Whoosh!', 900);
        startMascotPhysics();
      } else {
        setMascotExpression('dizzy', 700);
        mascotSetPhysicsTransform(0,1,1);
      }
    } else {
      setMascotExpression('happy', 900); openRealTranslator(true); showMascotSpeech('Opening Translator…', 1500);
    }
  };
  mascot.addEventListener('pointerdown', mascotDown);
  window.addEventListener('pointermove', mascotMove);
  window.addEventListener('pointerup', mascotFinish);
  window.addEventListener('pointercancel', mascotFinish);

  makeDraggable(dock, {
    handle:'#actionDock, .dock-grip, .dock-btn',
    snapEdge:true,
    onEnd:(pos)=>{ state.dockPos=pos; store.set('ot_dock_pos', pos); }
  });

  mascotBtn.addEventListener('click', (e)=>{ e.preventDefault(); /* click handled on drag end when not moved */ });
  mascotBtn.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); setMascotExpression('happy',900); openRealTranslator(true); showMascotSpeech('Opening Translator…',1500); } });

  $('#dockTranslateBtn').addEventListener('click', ()=>{ openRealTranslator(true); showMascotSpeech('Translator opened!', 1400); setMascotExpression('happy',1200); });
  $('#dockScanBtn').addEventListener('click', ()=>{ openTextScan(); });
  $('#dockCloseBtn').addEventListener('click', ()=>{ closeFloatingControls(); });
  restore.addEventListener('click', ()=>{ restoreFloatingControls(); });

  window.addEventListener('resize', ()=>{
    state.mascotPos = mascotClampPos(state.mascotPos?.x ?? mascotPhysics.x, state.mascotPos?.y ?? mascotPhysics.y);
    mascotApplyPos(state.mascotPos.x, state.mascotPos.y);
    state.dockPos = placeFloating(dock, state.dockPos, {x:window.innerWidth-92,y:window.innerHeight-320});
    store.set('ot_mascot_pos', state.mascotPos); store.set('ot_dock_pos', state.dockPos);
  });
  window.addEventListener('orientationchange', ()=>setTimeout(()=>window.dispatchEvent(new Event('resize')), 60));
  document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ stopMascotPhysics(); cancelMascotNudge(); } });
  document.addEventListener('pointermove', (e)=>{ mascotLastPointer={x:e.clientX,y:e.clientY}; if(!prefersReducedMotion()) updateMascotPupils(e.clientX,e.clientY); }, {passive:true});

  startMascotIdle();
  applyFloatingVisibility();
  // occasional first greeting
  setTimeout(()=>{ if(!state.floatHidden && state.settings.mascot) showMascotSpeech('Hi! Tap me to translate.', 2600); }, 1800);
}

function closeFloatingControls(){
  state.floatHidden = true;
  store.set('ot_float_hidden', true);
  hideMascotSpeech();
  renderAll();
  toast('Mascot and dock hidden');
}
function restoreFloatingControls(){
  state.floatHidden = false;
  if(!state.settings.mascot && !state.settings.dock){ state.settings.mascot=true; state.settings.dock=true; store.set('ot_settings', state.settings); $('#setMascot').checked=true; $('#setDock').checked=true; }
  store.set('ot_float_hidden', false);
  renderAll();
  showMascotSpeech('I am back! 💜', 1800);
}

function openTextScan(){
  // Real capability: existing in-browser OCR (Tesseract.js) in OCR tab.
  setTab(3);
  showMascotSpeech('Opening Text Scan (OCR)…', 1800);
  setMascotExpression('happy', 1200);
  setTimeout(()=>{
    const dz=$('#dropzone');
    if(dz) dz.scrollIntoView({block:'center',behavior:prefersReducedMotion()?'auto':'smooth'});
    openScanChoice();
  }, 80);
}
