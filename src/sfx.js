/* ── 효과음(SFX) 매니저 — WebAudio ──
 * initSfx()            : 첫 pointerdown에서 AudioContext 생성 (자동재생 정책 우회)
 * playSfx(name, opts)  : 원샷 재생. fetch+decode 캐시(lazy), 재생속도 ±jitter 랜덤
 * setSfxVol(v)         : 마스터 볼륨 (BGM과 별개)
 * setAmbience(name)    : 날씨 앰비언트 루프 (amb_rain/amb_wind/amb_storm/null) — 1.2s 크로스페이드
 * setFire(on)          : 난롯불 루프 (amb_fire)
 * setRadio(on, vol)    : 라디오 노이즈 루프 (radio_static)
 * 경로: sfx/{name}.ogg (BGM과 동일한 상대경로 방식)
 */

let ctx = null;          // AudioContext (첫 사용자 제스처 후 생성)
let master = null;       // 마스터 GainNode
let masterVol = 0.7;

const bufCache = new Map();   // name → AudioBuffer | Promise<AudioBuffer>
const XFADE = 1.2;            // 루프 크로스페이드 시간(초)

/* ── 초기화 ── */
export function initSfx() {
  const boot = () => {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = masterVol;
      master.connect(ctx.destination);
    } catch (e) { /* WebAudio 미지원 — 무음 진행 */ }
  };
  addEventListener('pointerdown', boot, { once: true });
}

export function setSfxVol(v) {
  masterVol = v;
  if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

/* ── 버퍼 로드 (lazy + 캐시) ── */
function loadBuf(name) {
  if (bufCache.has(name)) return Promise.resolve(bufCache.get(name));
  const p = fetch(`sfx/${name}.ogg`)
    .then(r => { if (!r.ok) throw new Error(name); return r.arrayBuffer(); })
    .then(ab => ctx.decodeAudioData(ab))
    .then(buf => { bufCache.set(name, buf); return buf; })
    .catch(() => { bufCache.delete(name); return null; });
  bufCache.set(name, p);
  return p;
}

/* ── 원샷 재생 ── */
export function playSfx(name, { vol = 1, rate = 1, jitter = 0.06 } = {}) {
  if (!ctx) return;
  loadBuf(name).then(buf => {
    if (!buf || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * jitter);
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g); g.connect(master);
    src.start(0);
  });
}

/* ── 루프 채널 (크로스페이드) ── */
function makeChannel() {
  return { name: null, src: null, gain: null };
}

function channelStop(chan) {
  if (!chan.src) { chan.name = null; return; }
  const g = chan.gain, s = chan.src;
  g.gain.setTargetAtTime(0, ctx.currentTime, XFADE / 4);
  setTimeout(() => { try { s.stop(); } catch (e) {} s.disconnect(); g.disconnect(); }, XFADE * 1000 + 200);
  chan.name = null; chan.src = null; chan.gain = null;
}

function channelPlay(chan, name, vol) {
  if (chan.name === name) return;     // 같은 이름 재호출 무시
  channelStop(chan);                  // 기존 소스 페이드아웃
  chan.name = name;
  loadBuf(name).then(buf => {
    if (!buf || !ctx || chan.name !== name) return;  // 로딩 중 상태 바뀌면 폐기
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(vol, ctx.currentTime, XFADE / 4);   // 페이드인 램프
    src.connect(g); g.connect(master);
    src.start(0);
    chan.src = src; chan.gain = g;
  });
}

const ambChan = makeChannel();   // 날씨 앰비언트
const fireChan = makeChannel();  // 난롯불
const radioChan = makeChannel(); // 라디오 노이즈

export function setAmbience(name, vol = 0.8) {
  if (!ctx) return;
  if (!name) { channelStop(ambChan); return; }
  channelPlay(ambChan, name, vol);
}

export function setFire(on, vol = 0.5) {
  if (!ctx) return;
  if (on) channelPlay(fireChan, 'amb_fire', vol);
  else channelStop(fireChan);
}

export function setRadio(on, vol = 0.25) {
  if (!ctx) return;
  if (on) channelPlay(radioChan, 'radio_static', vol);
  else channelStop(radioChan);
}
