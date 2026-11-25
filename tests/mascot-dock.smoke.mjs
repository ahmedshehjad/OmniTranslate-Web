import fs from 'fs';
import assert from 'assert';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function ok(cond, msg){ assert.ok(cond, msg); console.log('PASS', msg); }

ok(html.includes('id="mascotWrap"'), 'mascot wrapper present');
ok(html.includes('id="mascotBtn"'), 'mascot button present');
ok(html.includes('id="actionDock"'), 'action dock present');
ok(html.includes('id="dockScanBtn"'), 'dock scan button present');
ok(html.includes('id="dockTranslateBtn"'), 'dock translate button present');
ok(html.includes('id="dockCloseBtn"'), 'dock close button present');
ok(html.includes('id="floatRestoreBtn"'), 'restore button present');
ok(html.includes('id="setMascot"') && html.includes('id="setDock"'), 'settings toggles present');
ok(js.includes('function initMascotAndDock('), 'initMascotAndDock defined');
ok(js.includes('function makeDraggable('), 'makeDraggable defined');
ok(js.includes('openRealTranslator(true)'), 'mascot opens real translator');
ok(js.includes("setTab(3)"), 'text scan routes to OCR tab');
ok(js.includes('closeFloatingControls(') && js.includes('restoreFloatingControls('), 'close/restore defined');
ok(js.includes("prefers-reduced-motion"), 'reduced motion respected in JS');
ok(css.includes('.mascot-wrap') && css.includes('.action-dock'), 'CSS for mascot/dock present');
ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced motion CSS present');
ok(!/fake OCR|simulated OCR|placeholder translation engine/i.test(js+html), 'no fake OCR/translation claims added');
// P1 race-condition guards
ok(js.includes('let mascotNudgeTimer = null'), 'mascotNudgeTimer declared');
ok(js.includes('function cancelMascotNudge()'), 'cancelMascotNudge defined');
ok(js.includes('cancelMascotNudge(); mascot.style.transition=\'\';'), 'drag start cancels nudge');
ok(js.includes("if(!w || w.classList.contains('dragging') || mascotPhysics.running || w.classList.contains('hidden') || state.floatHidden) return;"), 'nudge callback guards against dragging/hidden');
ok(js.includes('user drag end is authoritative'), 'drag end authoritative comment/guard present');
// P2 guards
ok(js.includes('if(initMascotAndDock._done) return;'), 'initMascotAndDock idempotent');
ok(js.includes('initMascotAndDock._done = true;'), 'initMascotAndDock sets guard');
ok(!js.includes('mascotIdleRAF'), 'unused mascotIdleRAF removed');
ok(js.includes('clampBubblePos') && js.includes("window.addEventListener('resize', ()=>{") && js.includes('state.bubblePos = clampBubblePos(state.bubblePos);'), 'quick bubble resize clamp present');
ok(css.includes('z-index:1400') && css.includes('.toast{position:fixed;z-index:1400'), 'toast z-index above mascot/dock');
ok(js.includes("bubble.addEventListener('pointercancel'"), 'bubble pointercancel handled');
ok(js.includes("try{ bubble.releasePointerCapture(e.pointerId); }catch(_){}"), 'bubble pointer capture released');
ok(js.includes('if(initBubble._done) return;'), 'initBubble idempotent');
ok(html.includes('id="setMascot"') && html.includes('id="setDock"') && html.includes('id="setBubble"'), 'settings toggles include mascot/dock/bubble');
ok(js.includes('mascot:true,dock:true,bubble:false,autoBubble:false,autoType:false,history:true,compact:false,theme:\'dark\''), 'settings defaults/backfill present');
ok(js.includes("setTab(1)") && js.includes("setTab(3)"), 'translator/OCR routing present');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
ok(sw.includes("const CACHE = 'omnitranslate-web-v3'"), 'service worker cache v3');
console.log('ALL_PASS');
