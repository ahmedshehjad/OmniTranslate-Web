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
  settings:Object.assign({bubble:false,autoBubble:false,autoType:false,history:true,compact:false,theme:'dark'}, store.get('ot_settings',{})),
  bubblePos:store.get('ot_bubble_pos',null), lastMode:'—', deferredInstall:null
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
function listenInto(inputEl, langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ toast('Voice input not supported in this browser'); return; }
  const rec = new SR(); rec.lang=SPEECH_CODES[langCode]||'en-US'; rec.interimResults=false; rec.maxAlternatives=1;
  rec.onresult = e=>{ inputEl.value = (inputEl.value?inputEl.value+' ':'') + e.results[0][0].transcript; inputEl.dispatchEvent(new Event('input')); toast('Voice captured'); };
  rec.onerror = ()=>toast('Voice input failed');
  try{ rec.start(); toast('Listening…'); }catch(_){ toast('Voice input failed'); }
}
async function copyText(text){
  const t=String(text||'').trim(); if(!t){ toast('Nothing to copy'); return; }
  try{ await navigator.clipboard.writeText(t); }
  catch(_){ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(_){} ta.remove(); }
  toast('Copied');
}
async function shareText(text){
  const t=String(text||'').trim(); if(!t){ toast('Nothing to share'); return; }
  if(navigator.share){ try{ await navigator.share({title:'Omni Translate', text:t}); return; }catch(_){} }
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
  $('#statLast').textContent = state.lastMode || '—';
  $('#bubbleBtn').classList.toggle('active', !!state.settings.bubble);
  $('#bubble').classList.toggle('hidden', !state.settings.bubble);
  if(!state.settings.bubble) $('#miniCard').classList.add('hidden');
  document.body.classList.toggle('compact', !!state.settings.compact);
  document.body.classList.toggle('light', state.settings.theme==='light');
  $('#themeBtn').textContent = state.settings.theme==='light' ? '☀️' : '◐';
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
function loadScript(src){
  return new Promise((resolve,reject)=>{ if(document.querySelector('script[data-src="'+src+'"]')) return resolve(); const s=document.createElement('script'); s.src=src; s.async=true; s.dataset.src=src; s.onload=resolve; s.onerror=()=>reject(new Error('Failed to load '+src)); document.head.appendChild(s); });
}
async function runOCR(){
  const file=$('#ocrFile').files[0];
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
  const bubble=$('#bubble'); const card=$('#miniCard');
  if(state.bubblePos){ bubble.style.left=state.bubblePos.x+'px'; bubble.style.top=state.bubblePos.y+'px'; bubble.style.right='auto'; bubble.style.bottom='auto'; }
  let dragging=false, moved=false, startX=0, startY=0, offX=0, offY=0;
  function placeCard(x,y){ card.style.left=Math.min(x, window.innerWidth-320)+'px'; card.style.top=Math.max(8,y-210)+'px'; card.style.right='auto'; card.style.bottom='auto'; }
  bubble.addEventListener('pointerdown', e=>{ dragging=true; moved=false; startX=e.clientX; startY=e.clientY; const r=bubble.getBoundingClientRect(); offX=e.clientX-r.left; offY=e.clientY-r.top; bubble.setPointerCapture(e.pointerId); });
  bubble.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const x=Math.max(6, Math.min(window.innerWidth-66, e.clientX-offX));
    const y=Math.max(6, Math.min(window.innerHeight-66, e.clientY-offY));
    if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>6) moved=true;
    bubble.style.left=x+'px'; bubble.style.top=y+'px'; bubble.style.right='auto'; bubble.style.bottom='auto';
    state.bubblePos={x,y}; placeCard(x,y);
  });
  bubble.addEventListener('pointerup', ()=>{ if(!dragging) return; dragging=false; store.set('ot_bubble_pos', state.bubblePos); if(!moved) card.classList.toggle('hidden'); });
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
  $('#tMic').onclick=()=>listenInto($('#tInput'), $('#tFrom').value==='auto'?'en':$('#tFrom').value);
  $('#qMic').onclick=()=>listenInto($('#qInput'), $('#qFrom').value==='auto'?'en':$('#qFrom').value);
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
  $('#ocrFile').addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ $('#ocrPreview').src=ev.target.result; $('#ocrPreview').classList.add('show'); }; r.readAsDataURL(f); });
  $('#ocrRun').onclick=runOCR;
  $('#ocrCopy').onclick=()=>copyText($('#ocrText').value);
  $('#ocrToTranslator').onclick=()=>{ const t=$('#ocrText').value.trim(); if(!t){ toast('No text to send'); return; } $('#tInput').value=t; $('#tInput').dispatchEvent(new Event('input')); setTab(1); };

  // settings
  $('#setBubble').checked=!!state.settings.bubble;
  $('#setAutoBubble').checked=!!state.settings.autoBubble;
  $('#setAutoType').checked=!!state.settings.autoType;
  $('#setHistory').checked=!!state.settings.history;
  $('#setCompact').checked=!!state.settings.compact;
  $('#setBubble').addEventListener('change', e=>{ state.settings.bubble=e.target.checked; store.set('ot_settings',state.settings); renderAll(); });
  $('#setAutoBubble').addEventListener('change', e=>{ state.settings.autoBubble=e.target.checked; store.set('ot_settings',state.settings); });
  $('#setAutoType').addEventListener('change', e=>{ state.settings.autoType=e.target.checked; store.set('ot_settings',state.settings); });
  $('#setHistory').addEventListener('change', e=>{ state.settings.history=e.target.checked; store.set('ot_settings',state.settings); });
  $('#setCompact').addEventListener('change', e=>{ state.settings.compact=e.target.checked; store.set('ot_settings',state.settings); renderAll(); });

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
  initInstall(); wire(); initBubble(); renderAll(); initSplash(); setTab(0);
});
