// 회귀 테스트 하네스 (오프스크린 Electron 표준) — dist를 로드해 window.__shelter로 코어 로직을 실측.
//   리팩토링 안전망: 현재 동작을 핀으로 박아두고, 모듈 이동 후에도 동일함을 강제한다.
//   Python 불요(이 머신 Python 없음) · Node/Electron만. dist가 빌드돼 있어야 함(npm run build:electron).
const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');

const DIST = process.env.TEST_DIST || path.resolve(__dirname, '..', 'dist');
let _win = null;

async function boot() {
  app.commandLine.appendSwitch('no-sandbox');
  app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-test-' + Date.now()));
  await app.whenReady();
  // webPreferences는 시뮬 프로브(probe22/24)와 동일하게 config를 일치시킨다.
  //   (F1 비-헤르메틱성은 2026-07-07 해결 — simReset 완전 리셋 + 렌더부수효과 _simRunning 가드. FINDINGS.md F1.)
  _win = new BrowserWindow({ show: false, width: 900, height: 600,
    webPreferences: { backgroundThrottling: false, offscreen: true } });
  _win.webContents.setFrameRate(30);
  await _win.loadFile(path.join(DIST, 'index.html'));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 90; i++) {
    if (await evalJs(`!!(window.__shelter && window.__shelter.simDays)`).catch(() => false)) return;
    await sleep(500);
  }
  throw new Error('window.__shelter 부팅 실패 — dist 빌드 확인');
}
// 페이지 컨텍스트에서 표현식 평가(값 반환). async 코드는 IIFE 문자열로 넘긴다.
function evalJs(expr) { return _win.webContents.executeJavaScript(expr, true); }
function call(body) { return _win.webContents.executeJavaScript(`(()=>{ const S=window.__shelter; ${body} })()`, true); }

// ── 미니 어서션 프레임워크 (외부 의존 0) ──
const _results = [];
function check(name, cond, detail = '') {
  _results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}
function near(name, actual, expect, tol) {
  const ok = Math.abs(actual - expect) <= tol;
  check(name, ok, `실측 ${Math.round(actual)} / 기대 ${expect}±${tol}`);
}
function report() {
  const pass = _results.filter(r => r.pass).length, total = _results.length;
  console.log(`\nRESULT ${pass}/${total} ${pass === total ? 'ALL GREEN' : 'FAIL'}`);
  return pass === total;
}

module.exports = { boot, evalJs, call, check, near, report, app };
