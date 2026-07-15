// gif_signal — 스토어 최상단 훅 GIF: 라디오→응답 불빛.
//   밤 옥탑(따뜻한 집) + 어두운 죽은 도시. 먼 창 하나가 깜빡 켜진다(응답).
//   캡처 1232×692(오프스크린) → 2:1 다운스케일 616×346 → gif-encoder. dist(gd-2.0) 필요.
//   실행: npx electron tools/gif-signal.cjs
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const os = require('os');
const GIFEncoder = require('gif-encoder');

const DIST = path.resolve(__dirname, '..', 'dist');
const OUT = path.resolve(__dirname, '..', 'docs', 'steam', 'gifs', 'gif_signal.gif');
const CW = 1232, CH = 692, W = CW / 2, H = CH / 2; // 616×346

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
function down2(src) { const dst = Buffer.alloc(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let r = 0, g = 0, b = 0; for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const i = ((y * 2 + dy) * CW + (x * 2 + dx)) * 4; r += src[i]; g += src[i + 1]; b += src[i + 2]; } const o = (y * W + x) * 4; dst[o] = r >> 2; dst[o + 1] = g >> 2; dst[o + 2] = b >> 2; dst[o + 3] = 255; } return dst; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-gif-' + process.pid));
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: CW, height: CH, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setAudioMuted(true); // 게임 소리 스피커 유출 차단 (디렉터 신고 2026-07-15)
  win.webContents.setFrameRate(30);
  await win.loadFile(path.join(DIST, 'index.html'));
  const ev = e => win.webContents.executeJavaScript(e, true);
  for (let i = 0; i < 90; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => false)) break; await sleep(500); }

  // 밤 옥탑 + 꾸민 실내 (샷 02와 동일 세팅/프레이밍)
  await ev(`(()=>{const S=window.__shelter;const c=document.getElementById('modal-close');if(c)c.click();
    S.simReset();S.hideTitle&&S.hideTitle();S.setPaused&&S.setPaused(true);
    S.state.current='rooftop';S.loadShelter&&S.loadShelter('rooftop');
    S.setWeather&&S.setWeather('clear');S.setHour&&S.setHour(22);return 1;})()`);
  await sleep(500);
  await ev(`(()=>{const S=window.__shelter;const R=(S.SHELTERS.rooftop&&S.SHELTERS.rooftop.room)||{w:5.6,d:4.4};const w=R.w,d=R.d;
    const cl=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));const cx=Math.min(-w/2+2.5,-0.3),cz=Math.min(-d/2+2.0,-0.3);
    const P=(x,z)=>({x:cl(cx+x,-w/2+0.4,w/2-0.4),z:cl(cz+z,-d/2+0.4,d/2-0.4)});
    const it=(dd,x,z)=>{const p=P(x,z);try{S.addItem(dd,0,p.x,p.z,0,true,0,3);}catch(e){}};
    it('bed',-1.4,-0.9);it('bookshelf',0.1,-1.6);it('sofa',1.5,-0.6);it('rug',0,1.0);it('teatable',0,1.0);it('cushion',-1.1,1.0);it('stove',1.9,-1.5);it('plant',-1.8,1.3);it('lamp',1.7,0.7);
    S.setPan&&S.setPan(1.5,-3);S.setYaw&&S.setYaw(0.62);S.setPitch&&S.setPitch(0.52);S.setZoom&&S.setZoom(0.92);return 1;})()`);
  await ev(`(()=>{let css=document.getElementById('shotcss');if(!css){css=document.createElement('style');css.id='shotcss';document.head.appendChild(css);}css.textContent='body > *:not(#c):not(#fx){display:none!important}';return 1;})()`);
  for (let k = 0; k < 24; k++) { await ev(`window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(25); }

  const gif = new GIFEncoder(W, H); gif.setRepeat(0); gif.setDelay(95); gif.setQuality(15);
  const chunks = []; gif.on('data', c => chunks.push(c));
  const done = new Promise(res => gif.on('end', res));
  gif.writeHeader();
  const cap = async () => down2(bgra2rgba((await win.webContents.capturePage()).toBitmap()));

  // 1) 어둠 (먼 불빛 없음) — 8프레임
  for (let k = 0; k < 8; k++) { await ev(`window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(45); gif.addFrame(await cap()); }
  // 2) 먼 창이 켜진다 (응답 불빛 배치) — 자연 깜빡임
  await ev(`(()=>{const S=window.__shelter;try{S.addItem('lantern',0,10,-7,0,true,4.5,3);}catch(e){}return 1;})()`);
  for (let k = 0; k < 18; k++) { await ev(`window.__shelter.renderFrame&&window.__shelter.renderFrame()`); await sleep(45); gif.addFrame(await cap()); }
  gif.finish();
  await Promise.race([done, sleep(2000)]);
  const buf = Buffer.concat(chunks);
  fs.writeFileSync(OUT, buf);
  console.log('WROTE ' + OUT + '  (' + (buf.length / 1024 / 1024).toFixed(2) + ' MB, 26 frames, 616x346)');
  app.quit(); process.exit(0);
}
main().catch(e => { console.error(e); app.quit(); process.exit(1); });
