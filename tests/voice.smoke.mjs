import fs from 'fs';
import assert from 'assert';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
function ok(cond,msg){ assert.ok(cond,msg); console.log('PASS',msg); }

// Existing buttons repaired, no duplicate
ok((html.match(/id="qMic"/g)||[]).length===1, 'single quick voice button');
ok((html.match(/id="tMic"/g)||[]).length===1, 'single translator voice button');
ok(js.includes("bindVoiceButton('tMic','tInput'"), 'tMic bound');
ok(js.includes("bindVoiceButton('qMic','qInput'"), 'qMic bound');
ok(!js.includes('Voice input failed\'\);'), 'generic Voice input failed removed');

// API support
ok(js.includes('window.SpeechRecognition || window.webkitSpeechRecognition'), 'SpeechRecognition + webkit supported');
ok(js.includes('function voiceSupported()'), 'voiceSupported helper');
ok(js.includes("toast(voiceErrorMessage('unsupported'))"), 'unsupported browser handled');

// Permission/secure context
ok(js.includes('navigator.mediaDevices.getUserMedia'), 'getUserMedia permission flow');
ok(js.includes("Chrome menu → Settings → Site settings → Microphone"), 'denied permission actionable instructions');
ok(js.includes('secureVoiceContext()') && js.includes('isSecureContext'), 'secure context check');
ok(js.includes('requires a secure context (HTTPS or localhost)'), 'secure context diagnostic');
ok(js.includes("code:'insecure'"), 'insecure handled');

// Error handling
['not-allowed','service-not-allowed','no-speech','audio-capture','network','language-not-supported','unsupported','insecure'].forEach(c=>ok(js.includes(`'${c}'`)||js.includes(`"${c}"`), `error mapping has ${c}`));
ok(js.includes('rec.onerror = (e)=>{'), 'onerror handler present');
ok(js.includes('setVoiceBtnState(btn,\'error\'') || js.includes('setVoiceBtnState(btn,\"error\"'), 'error state set');

// State/UI
ok(js.includes('🔴 Listening...'), 'listening state text');
ok(js.includes('⏳ Processing...'), 'processing state text');
ok(js.includes("btn.setAttribute('aria-pressed','true')"), 'aria-pressed true');
ok(js.includes("btn.setAttribute('aria-pressed','false')"), 'aria-pressed false');
ok(css.includes('.chip.listening') && css.includes('@keyframes voicePulse'), 'listening animation CSS');
ok(js.includes("stopActiveVoice({ silent:false, message:'Voice input stopped.' })"), 'tap again stops recognition');

// Result insertion
ok(js.includes('rec.interimResults = true'), 'interim results enabled');
ok(js.includes('rec.continuous = true'), 'continuous enabled where supported');
ok(js.includes('insertVoiceText(inputEl, voiceState.baseText, voiceState.finalText, voiceState.interimText)'), 'inserts into existing textarea');
ok(js.includes("inputEl.dispatchEvent(new Event('input', { bubbles:true }))"), 'dispatches input event');
ok(js.includes("if(txt !== voiceState.lastFinal)"), 'duplicate final prevention');
ok(js.includes('voiceState.baseText = String(inputEl.value || \'\')'), 'preserves existing text base');

// Language mapping
ok(js.includes('VOICE_LANG') && js.includes('voiceLangFor'), 'language mapping present');
ok(js.includes("c === 'auto'") && js.includes('en-US'), 'auto-detect fallback');
ok(js.includes('Auto-detect source selected: using English (en-US) for speech recognition.'), 'auto-detect explanation');

// Cleanup
ok(js.includes('cleanupVoice(rec)'), 'cleanup helper');
ok(js.includes('window.addEventListener(\'pagehide\'') || js.includes('window.addEventListener("pagehide"'), 'pagehide cleanup');
ok(js.includes("document.addEventListener('visibilitychange'"), 'visibilitychange cleanup');
ok(js.includes('window.addEventListener(\'beforeunload\'') || js.includes('window.addEventListener("beforeunload"'), 'beforeunload cleanup');
ok(js.includes('stopActiveVoice({silent:true})'), 'silent cleanup available');

console.log('ALL_PASS');
