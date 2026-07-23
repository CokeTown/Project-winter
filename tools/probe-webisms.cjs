// 웹 잔재 차단 E2E — '실제 main.cjs'로 부팅한 실앱을 CDP로 열어 검증한다 (2026-07-23 전수 감사).
//   기존 하네스는 자체 창을 만들어 main.cjs의 메뉴 제거·내비 가드가 검증 사각이었다.
//   NW_QA_HIDDEN(화면 플래시·소리 차단) + --remote-debugging-port(렌더러) + --inspect(메인)로
//   프로브 사본이 아닌 '출고 코드 그 자체'를 계측한다.
//   실행: node tools/probe-webisms.cjs   (electron 아님 — 일반 node, Node22 내장 WebSocket 사용)
const { spawn } = require('child_process');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ELECTRON = path.join(ROOT, 'node_modules', '.bin', 'electron.cmd');
const RDP = 9223, INSP = 9224;
setTimeout(() => { console.error('TIMEOUT'); cleanup(3); }, 180000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
const check = (name, cond, detail) => { results.push(!!cond); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  — ${detail}`); };

let child = null;
function cleanup(code) {
  try { if (child && !child.killed) child.kill('SIGTERM'); } catch (e) { /* */ }
  setTimeout(() => process.exit(code), 400);
}

// ── 미니 CDP 클라이언트 (Runtime.evaluate만) ──
function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0; const pend = new Map();
    ws.onopen = () => resolve({
      eval: (expr, awaitP = true) => new Promise((res, rej) => {
        const mid = ++id; pend.set(mid, { res, rej });
        ws.send(JSON.stringify({ id: mid, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: awaitP, returnByValue: true } }));
      }),
      close: () => { try { ws.close(); } catch (e) { /* */ } },
    });
    ws.onmessage = m => {
      const d = JSON.parse(m.data); const p = pend.get(d.id);
      if (p) { pend.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result && d.result.result ? d.result.result.value : undefined); }
    };
    ws.onerror = e => reject(new Error('ws fail'));
  });
}
async function targets(port) {
  const r = await fetch(`http://127.0.0.1:${port}/json/list`).catch(() => null);
  return r && r.ok ? r.json() : [];
}

(async () => {
  child = spawn(ELECTRON, ['.', `--remote-debugging-port=${RDP}`, `--inspect=${INSP}`], {
    cwd: ROOT, shell: true, stdio: 'ignore',
    env: { ...process.env, NW_QA_HIDDEN: '1' },
  });

  // ── 렌더러 타깃 대기 → 게임 부팅 대기 ──
  let page = null;
  for (let i = 0; i < 60 && !page; i++) { const ts = await targets(RDP); page = ts.find(t => t.type === 'page' && /index\.html/.test(t.url)); if (!page) await sleep(500); }
  if (!page) { console.error('FATAL 렌더러 타깃 없음'); return cleanup(2); }
  let R = await cdp(page.webSocketDebuggerUrl);
  for (let i = 0; i < 60; i++) { if (await R.eval(`!!(window.__shelter && window.__shelter.simDays)`, false).catch(() => false)) break; await sleep(500); }

  // ① 메인 프로세스: 기본 메뉴가 정말 제거됐나 (Alt 메뉴바·Ctrl+R·Ctrl+Shift+I·Ctrl+W의 뿌리)
  const insp = (await targets(INSP))[0];
  if (insp) {
    const M = await cdp(insp.webSocketDebuggerUrl);
    // Node 인스펙터의 evaluate 전역엔 require가 없다(모듈 스코프 전용) — mainModule 경유로 진입
    const REQ = `process.mainModule.require('electron')`;
    const menuNull = await M.eval(`${REQ}.Menu.getApplicationMenu() === null`, false).catch(e => 'ERR:' + e.message);
    check('기본 메뉴 제거(실앱 main)', menuNull === true, `getApplicationMenu()===null → ${JSON.stringify(menuNull)}`);
    const title = await M.eval(`${REQ}.BrowserWindow.getAllWindows()[0].getTitle()`, false).catch(e => 'ERR:' + e.message);
    check('창 타이틀 리브랜딩', title === 'Nine Winters', `getTitle()=${JSON.stringify(title)}`);
    M.close();
  } else check('메인 인스펙터 접속', false, 'inspect 타깃 없음');

  // ② 내비게이션 가드: 외부 URL 이동은 차단, location.reload()(언어 전환 6곳)는 살아야 한다
  const before = await R.eval(`location.href`, false);
  await R.eval(`(()=>{ try { location.href='https://example.com/'; } catch(e){} return 1; })()`, false);
  await sleep(1200);
  const after = await R.eval(`location.href`, false).catch(() => 'DEAD');
  check('외부 내비 차단(will-navigate)', after === before, `이동 시도 후 URL 불변: ${after === before}`);

  // ③ 렌더러 가드: 합성 이벤트의 defaultPrevented 실측
  const ev = await R.eval(`(()=>{
    const fire = (t, init, Ctor) => { const e = new (Ctor||Event)(t, Object.assign({bubbles:true,cancelable:true},init)); document.body.dispatchEvent(e); return e.defaultPrevented; };
    return {
      drop:     fire('drop', {}, DragEvent),
      dragover: fire('dragover', {}, DragEvent),
      ctrlWheel: fire('wheel', {ctrlKey:true, deltaY:120}, WheelEvent),
      plainWheel: fire('wheel', {deltaY:120}, WheelEvent),
      midClick: fire('mousedown', {button:1}, MouseEvent),
    };})()`, false);
  check('파일 드롭 차단', ev && ev.drop && ev.dragover, JSON.stringify(ev));
  check('Ctrl+휠 줌 차단 (일반 휠은 통과)', ev && ev.ctrlWheel && !ev.plainWheel, `ctrl=${ev && ev.ctrlWheel} plain=${ev && ev.plainWheel}`);
  check('가운데 클릭 오토스크롤 차단', ev && ev.midClick, `mid=${ev && ev.midClick}`);

  // ④ location.reload() 생존 — 가드가 리로드까지 막으면 언어 전환·타이틀 복귀가 죽는다
  await R.eval(`(()=>{ setTimeout(()=>location.reload(), 50); return 1; })()`, false);
  R.close();
  await sleep(2500);
  let page2 = null;
  for (let i = 0; i < 40 && !page2; i++) { const ts = await targets(RDP); page2 = ts.find(t => t.type === 'page' && /index\.html/.test(t.url)); if (!page2) await sleep(500); }
  if (page2) {
    const R2 = await cdp(page2.webSocketDebuggerUrl);
    let booted = false;
    for (let i = 0; i < 60; i++) { if (await R2.eval(`!!(window.__shelter && window.__shelter.simDays)`, false).catch(() => false)) { booted = true; break; } await sleep(500); }
    check('location.reload() 생존(같은 URL 허용)', booted, `리로드 후 재부팅 ${booted}`);
    R2.close();
  } else check('location.reload() 생존(같은 URL 허용)', false, '리로드 후 타깃 소실');

  const ok = results.every(Boolean);
  console.log(`\nRESULT ${results.filter(Boolean).length}/${results.length} ${ok ? 'ALL GREEN' : 'FAIL'}`);
  cleanup(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); cleanup(2); });
