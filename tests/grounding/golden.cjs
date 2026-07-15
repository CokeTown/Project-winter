/* 골든 스크린샷 게이트 (Phase0 · 시각 회귀 안전망) — QA 전용, 프로덕션 무관.
 *   목적: Phase1 렌더 리팩토링(game.js 셸터/컬링/조명/날씨FX/카메라 추출) 중 눈에 보이는 회귀를
 *         자동 검출한다. 코드를 옮기기만 하면 픽셀은 동일해야 하므로, 골든과 어긋나면 회귀 신호.
 *
 *   결정론(왜 신뢰 가능한가):
 *     freezeForGolden(seed) = ①Math.random 시드 고정 ②렌더 시간 동결(dt=0) ③배회 엔티티
 *     (고양이/야생동물/아바타 — 별도 모듈, 리팩토링 대상 아님) 스킵+숨김.
 *     실측 노이즈 바닥(같은 dist 리로드): 픽셀 ~0.4% · 블록(60px) ~0.67%.
 *     임계값을 그 5×(픽셀 2.0%) / ~4×(블록 2.5%)로 잡아 로드 지터는 흡수하고 회귀만 잡는다.
 *
 *   사용:
 *     npm run golden          — 커밋된 기준과 비교 (초과 시 exit 1)
 *     npm run golden:update   — 기준 재생성 (의도된 시각 변경 후에만!)
 *   기준 PNG: tests/grounding/golden/<id>.png (커밋 대상).
 */
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const H = require('../harness.cjs');

const GOLDEN_DIR = path.join(__dirname, 'golden');
const CW = 900, CH = 600;           // 하네스 창 (harness.cjs와 일치)
const UPDATE = process.argv.includes('--update');
const SEED = 12345;
const PIX_TOL = 6;                   // 채널당 픽셀 동일 판정 여유
const FAIL_PIX = 2.0;                // 픽셀 diff 임계 (노이즈 0.4% 대비 5×)
const FAIL_BLK = 2.5;                // 블록(60px) diff 임계 (노이즈 0.67% 대비 ~4×)
const BLK = 60;

// 12 셸터(전 지역) × 맑음·낮 = 지오메트리/조명/재질 커버 + 환경 변주 3종(눈/밤/비).
const SHELTERS = ['container', 'bunker', 'rooftop', 'cabin', 'bus', 'subway',
  'greenhouse', 'ship', 'lighthouse', 'tugboat', 'controltower', 'lodge'];
const SCENES = [
  ...SHELTERS.map(s => ({ id: s, shelter: s, weather: 'clear', hour: 8 })),
  { id: 'z_container_snow', shelter: 'container', weather: 'snow', hour: 8, snow: 0.8 },
  { id: 'z_container_night', shelter: 'container', weather: 'clear', hour: 22 },
  { id: 'z_rooftop_rain', shelter: 'rooftop', weather: 'rain', hour: 8 },
  // 동역학 씬(steps): 정적 세팅 후 stepGolden으로 고정 dt N프레임 진행 → dt구동 날씨(적설 누적/젖음 페이드)를
  //   결정론적으로 박제. weatherfx 이관이 누적/페이드 수식을 바꾸면 이 씬들이 diff로 검거한다(정적 씬은 못 잡음).
  { id: 'd_snow_accum', shelter: 'container', weather: 'snow', hour: 8, snow: 0, steps: 220 },
  { id: 'd_rain_wet', shelter: 'rooftop', weather: 'rain', hour: 8, snow: 0, steps: 220 },
  // bunker 뒷문 해금 상태: 후면 돔 반쪽이 wallList에 직접 push돼 컬링에 편입(잠김=불투명, 해금=투시).
  //   이 분기를 골든으로 커버해야 bunker build의 wallList 직접조작 이관이 무손실 검증된다.
  { id: 'z_bunker_backdoor', shelter: 'bunker', weather: 'clear', hour: 8, flags: { bunkerBackdoor: true } },
  // §9.6 히든 루트: 통로 발견 후 조명 분기(붉은 비상등만·출구 표지 꺼짐) + 개척 완공 사다리.
  //   발견 전 subway 골든은 조건부 분기라 불변 — 이 씬만 flags 주입 신규 커버(z_bunker_backdoor 문법).
  { id: 'z_subway_hidden', shelter: 'subway', weather: 'clear', hour: 8, flags: { subwayHidden: true, hiddenGateDone: true, subwayHub: true, projects: { hiddenGate: { stage: 3, invested: 0 } } } },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = e => H.evalJs(e);

function bgra2rgba(b) { // 캡처(BGRA) → PNG/비교(RGBA)
  const o = Buffer.alloc(b.length);
  for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; }
  return o;
}
function diffPct(a, b) { // RGBA 픽셀 diff %
  let diff = 0; const px = a.length / 4;
  for (let i = 0; i < a.length; i += 4)
    if (Math.abs(a[i] - b[i]) > PIX_TOL || Math.abs(a[i + 1] - b[i + 1]) > PIX_TOL || Math.abs(a[i + 2] - b[i + 2]) > PIX_TOL) diff++;
  return +(100 * diff / px).toFixed(3);
}
function downscale(buf, blk) { // 블록 평균 → 구조적 변화만 (RGBA)
  const bw = Math.floor(CW / blk), bh = Math.floor(CH / blk), out = new Float64Array(bw * bh * 3);
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    let r = 0, g = 0, bl = 0;
    for (let y = 0; y < blk; y++) for (let x = 0; x < blk; x++) {
      const i = ((by * blk + y) * CW + (bx * blk + x)) * 4; r += buf[i]; g += buf[i + 1]; bl += buf[i + 2];
    }
    const o = (by * bw + bx) * 3, n = blk * blk; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = bl / n;
  }
  return { data: out, n: bw * bh };
}
function blockDiffPct(a, b, blk = BLK, tol = 4) {
  const A = downscale(a, blk), B = downscale(b, blk); let diff = 0;
  for (let i = 0; i < A.data.length; i += 3)
    if (Math.abs(A.data[i] - B.data[i]) > tol || Math.abs(A.data[i + 1] - B.data[i + 1]) > tol || Math.abs(A.data[i + 2] - B.data[i + 2]) > tol) diff++;
  return +(100 * diff / A.n).toFixed(3);
}

async function setup(sc) {
  // freezeForGolden는 loadShelter의 Math.random 소비 전에 시드를 고정해야 하므로 로드 직전 호출.
  await ev(`(()=>{const S=window.__shelter;const c=document.getElementById('modal-close');if(c)c.click();
    S.simReset(); if(S.hideTitle)S.hideTitle(); if(S.setPaused)S.setPaused(true);
    S.state.current=${JSON.stringify(sc.shelter)};
    if(S.freezeForGolden)S.freezeForGolden(${SEED});
    ${sc.flags ? `Object.assign(S.state, ${JSON.stringify(sc.flags)});` : ''}
    if(S.loadShelter)S.loadShelter(${JSON.stringify(sc.shelter)});
    if(S.setHour)S.setHour(${sc.hour});
    if(S.setWeather)S.setWeather(${JSON.stringify(sc.weather)});
    ${sc.snow != null ? `if(S.setSnow)S.setSnow(${sc.snow});` : ''}
    if(S.setYaw)S.setYaw(0.6); if(S.setPitch)S.setPitch(0.42); if(S.setZoom)S.setZoom(1.7);
    return 1;})()`);
}
const cap = async (win) => bgra2rgba((await win.webContents.capturePage()).toBitmap());
// 정착 폴링: 씬은 프레임에 걸쳐 비동기로 빌드된다(rooftop 야외 ~700ms). dt=0으로 시간은 얼렸어도
//   지오메트리 구축은 진행되므로, 연속 2캡처가 안정될 때까지 기다린 뒤의 프레임을 최종 캡처로 쓴다.
async function settleCapture(win) {
  await sleep(150);
  let prev = await cap(win), stable = 0;
  for (let i = 0; i < 30; i++) { // 최대 ~4.6s
    await sleep(150);
    const cur = await cap(win);
    // rooftop 야외는 빌드 도중 <1% plateau가 잠깐 생겨 조기 확정→플레이크. 연속 2회 안정 + 최소 5반복(~750ms) 경과 후에만 확정.
    if (diffPct(prev, cur) < 1.0) { if (++stable >= 2 && i >= 4) { await sleep(80); return await cap(win); } }
    else stable = 0;
    prev = cur;
  }
  return prev; // 타임아웃 방어(정착 실패 시 마지막 캡처)
}

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  if (UPDATE && !fs.existsSync(GOLDEN_DIR)) fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  let pass = 0, fail = 0, skip = 0, worstP = 0, worstB = 0;
  for (const sc of SCENES) {
    await setup(sc);
    let cur = await settleCapture(win); // 빌드 정착(+정적 씬은 이게 최종)
    if (sc.steps) { // 동역학: 정착 후 고정 dt 스테핑으로 날씨 진행 → 재캡처
      await ev(`window.__shelter.stepGolden(${sc.steps}, ${sc.dt || 0.1})`);
      await sleep(60);
      cur = await cap(win);
    }
    const file = path.join(GOLDEN_DIR, sc.id + '.png');
    if (UPDATE) {
      const png = new PNG({ width: CW, height: CH }); cur.copy(png.data);
      fs.writeFileSync(file, PNG.sync.write(png));
      console.log('WROTE  ' + sc.id);
      pass++;
    } else if (!fs.existsSync(file)) {
      console.log('MISS   ' + sc.id + ' — 기준 없음 (golden:update 먼저 실행)');
      skip++;
    } else {
      const ref = PNG.sync.read(fs.readFileSync(file)).data;
      const p = diffPct(cur, ref), bk = blockDiffPct(cur, ref);
      worstP = Math.max(worstP, p); worstB = Math.max(worstB, bk);
      const ok = p <= FAIL_PIX && bk <= FAIL_BLK;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${sc.id.padEnd(18)} 픽셀 ${p}%  블록 ${bk}%`);
      ok ? pass++ : fail++;
    }
  }
  console.log(`\nGOLDEN ${UPDATE ? 'UPDATE' : 'CHECK'}: ${pass} pass, ${fail} fail, ${skip} skip` +
    (UPDATE ? '' : `  (worst 픽셀 ${worstP}% / 블록 ${worstB}%  · 임계 ${FAIL_PIX}%/${FAIL_BLK}%)`));
  await sleep(100); H.app.quit(); process.exit(fail || skip ? 1 : 0);
})().catch(e => { console.error(e); H.app.quit(); process.exit(2); });
