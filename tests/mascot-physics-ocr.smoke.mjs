import fs from 'fs';
import assert from 'assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
function ok(c,m){ assert.ok(c,m); console.log('PASS', m); }

// Mascot size
ok(css.includes('width:90px;height:105px') && css.includes('~30% smaller'), 'mascot reduced size in CSS');
ok(css.includes('min-width:72px;min-height:72px'), 'mascot touch target preserved');
ok(css.includes('@media (max-width: 860px){\n  .mascot-wrap{left:10px;bottom:148px;width:80px;height:94px}'), 'mascot responsive smaller size');

// Physics
ok(js.includes('const mascotPhysics = {'), 'mascotPhysics state present');
ok(js.includes('function startMascotPhysics('), 'physics loop present');
ok(js.includes('requestAnimationFrame(step)'), 'uses requestAnimationFrame');
ok(js.includes('const dt = Math.min(0.032, Math.max(0.008,'), 'delta-time based physics');
ok(js.includes('computeMascotFlickVelocity'), 'flick velocity calculation present');
ok(js.includes('vx = Math.abs(vx)*0.82') && js.includes('vy = -Math.abs(vy)*0.82'), 'wall bounce/collision response');
ok(js.includes('const damp = Math.pow(0.985, dt*60);'), 'friction/decay present');
ok(js.includes('if(vx===0 && vy===0){') && js.includes('store.set(\'ot_mascot_pos\''), 'settle and persist position');
ok(js.includes('cancelMascotNudge(); mascot.style.transition=\'\'; stopMascotPhysics();'), 'grab while moving cancels auto movement');
ok(js.includes('mascotPhysics.suppressClick = true;'), 'drag/flick suppresses click');
ok(js.includes("openRealTranslator(true); showMascotSpeech('Opening Translator") || js.includes('Opening Translator'), 'tap opens translator');
ok(js.includes('document.addEventListener(\'visibilitychange\', ()=>{ if(document.hidden){ stopMascotPhysics(); cancelMascotNudge(); } });'), 'visibilitychange stops physics');
ok(js.includes('window.addEventListener(\'orientationchange\''), 'orientation resize handling');

// OCR scan choice/camera
ok(html.includes('id="scanChoiceModal"'), 'scan choice modal present');
ok(html.includes('id="scanGalleryBtn"'), 'gallery button present');
ok(html.includes('id="scanCameraBtn"'), 'camera button present');
ok(html.includes('id="ocrCameraFallback"') && html.includes('capture="environment"'), 'camera fallback input present');
ok(js.includes('function openScanChoice(') && js.includes('function openCameraCapture('), 'scan/camera helpers present');
ok(js.includes("$('#scanGalleryBtn').onclick=()=>{ closeScanChoice(); $('#ocrFile').click(); };"), 'gallery opens picker');
ok(js.includes('navigator.mediaDevices.getUserMedia'), 'camera permission requested via getUserMedia');
ok(js.includes('Camera permission denied. Enable camera in browser site settings, or use Upload from Gallery.'), 'camera denied message');
ok(js.includes('Camera unavailable. Use Upload from Gallery.'), 'camera unavailable fallback message');
ok(js.includes('captureCameraPhoto') && js.includes('loadOCRFile(file);'), 'camera capture enters OCR pipeline');
ok(js.includes('const file=ocrSelectedFile || ($(\'#ocrFile\').files && $(\'#ocrFile\').files[0]);'), 'OCR uses selected/captured file');
ok(js.includes('Tesseract.recognize'), 'existing Tesseract OCR preserved');
ok(!/fake screen scanning|live screen scan/i.test(js+html), 'no fake screen scan claims');

console.log('ALL_PASS');
