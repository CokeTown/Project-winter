/* ── 효과음(SFX) 매니저 — WebAudio ──
 * initSfx()            : 첫 pointerdown에서 AudioContext 생성 (자동재생 정책 우회)
 * playSfx(name, opts)  : 원샷 재생. fetch+decode 캐시(lazy), 재생속도 ±jitter 랜덤
 * setSfxVol(v)         : 마스터 볼륨 (BGM과 별개)
 * setAmbience(name)    : 날씨 앰비언트 루프 (amb_rain/amb_wind/amb_storm/rain_xxx/null) — 1.2s 크로스페이드
 * setFire(on)          : 난롯불 루프 (amb_fire)
 * 경로: sfx/{name}.ogg (BGM과 동일한 상대경로 방식)
 * (라디오 상시 잡음 루프는 #22에서 제거됨 — 라디오는 클릭 시 playSfx('radio_noise')로 1회 재생)
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
  // ogg 우선, 없으면 mp3 폴백 (#93 purr.mp3 — 이 머신에 ffmpeg가 없어 원본 그대로 탑재. decodeAudioData는 mp3 지원)
  const p = fetch(`sfx/${name}.ogg`)
    .then(r => { if (!r.ok) throw new Error('ogg'); return r.arrayBuffer(); })
    .catch(() => fetch(`sfx/${name}.mp3`).then(r => { if (!r.ok) throw new Error(name); return r.arrayBuffer(); }))
    .then(ab => ctx.decodeAudioData(ab))
    .then(buf => { bufCache.set(name, buf); return buf; })
    .catch(() => { bufCache.delete(name); return null; });
  bufCache.set(name, p);
  return p;
}

/* ── 원샷 재생 ──
 * dur(초) 지정 시 그 시점에서 fade(초)로 잦아들며 정지 — 긴 소스(purr 등)를 짧게 쓰는 용도 */
export function playSfx(name, { vol = 1, rate = 1, jitter = 0.06, dur = 0, fade = 0.4 } = {}) {
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
    if (dur > 0 && buf.duration > dur) {
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.setTargetAtTime(0, ctx.currentTime + Math.max(0, dur - fade), fade / 3);
      src.stop(ctx.currentTime + dur + fade);
    }
  });
}

/* ── 루프 채널 (크로스페이드) ── */
function makeChannel() {
  return { name: null, src: null, gain: null };
}

function channelStop(chan, fadeSec = XFADE) {
  if (!chan.src) { chan.name = null; return; }
  const g = chan.gain, s = chan.src;
  g.gain.setTargetAtTime(0, ctx.currentTime, fadeSec / 4);
  setTimeout(() => { try { s.stop(); } catch (e) {} s.disconnect(); g.disconnect(); }, fadeSec * 1000 + 200);
  chan.name = null; chan.src = null; chan.gain = null;
}

function channelPlay(chan, name, vol, fadeSec = XFADE) {
  if (chan.name === name) return;     // 같은 이름 재호출 무시
  channelStop(chan, fadeSec);         // 기존 소스 페이드아웃 (같은 길이로)
  chan.name = name;
  loadBuf(name).then(buf => {
    if (!buf || !ctx || chan.name !== name) return;  // 로딩 중 상태 바뀌면 폐기
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(vol, ctx.currentTime, fadeSec / 4);   // 페이드인 램프
    src.connect(g); g.connect(master);
    src.start(0);
    chan.src = src; chan.gain = g;
  });
}

const ambChan = makeChannel();   // 날씨 앰비언트
const fireChan = makeChannel();  // 난롯불

// fadeSec: 날씨 전이(#83)처럼 천천히 스며들어야 하는 전환은 긴 페이드를 넘긴다 (기본 XFADE 유지)
export function setAmbience(name, vol = 0.3, fadeSec) {
  if (!ctx) return;
  if (!name) { channelStop(ambChan, fadeSec); return; }
  channelPlay(ambChan, name, vol, fadeSec);
}

export function setFire(on, vol = 0.22) {
  if (!ctx) return;
  if (on) channelPlay(fireChan, 'amb_fire', vol);
  else channelStop(fireChan);
}

/* ── 계절 앰비언스 (#13 사운드 빈칸) ──
 * 봄 새소리 / 여름 벌레 / 가을 바람 / 겨울 삭풍 — 맑은 날 실외 셸터의 배경 루프.
 * 전용 채널(seasonChan)로 날씨 앰비언스(ambChan)와 독립 크로스페이드.
 * 에셋 파일명은 SEASON_AMB 매핑. 파일이 아직 없으면 loadBuf가 조용히 null → 무음(크래시 없음).
 * 코디네이터가 아래 4개 ogg를 public/sfx에 배치하면 즉시 활성화된다:
 *   amb_spring_birds.ogg · amb_summer_insects.ogg · amb_autumn_wind.ogg · amb_winter_gale.ogg
 */
const SEASON_AMB = {
  spring: 'amb_spring_birds',
  summer: 'amb_summer_insects',
  autumn: 'amb_autumn_wind',
  winter: 'amb_winter_gale',
};
const seasonChan = makeChannel();
export function setSeasonAmbience(season, vol = 0.18) {
  if (!ctx) return;
  const name = season && SEASON_AMB[season];
  if (!name) { channelStop(seasonChan); return; }
  channelPlay(seasonChan, name, vol);
}
// 에셋 존재 여부를 하네스가 확인할 수 있게 매핑을 노출.
export function seasonAmbienceName(season) { return SEASON_AMB[season] || null; }
