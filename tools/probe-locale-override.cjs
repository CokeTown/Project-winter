// 번역 런타임 오버라이드 실증 — 디렉터 질문(2026-07-23): "JSON으로 빼서 내가 조회·변경할 수 있나?"
//   실제 앱과 동일하게 electron/preload.cjs를 붙인 창으로 3케이스를 검증한다:
//   ① userData/locales/ko.json 부분 파일(키 1개) → 그 키만 화면에서 바뀐다 (신설 1순위 경로)
//   ② 깨진 JSON → 조용히 무시, 내장 기본값 유지 (안전망)
//   ③ 파일 없음 → 기본값 그대로 (무해)
//   실행: ./node_modules/.bin/electron.cmd tools/probe-locale-override.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs'), os = require('os'), path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const PRELOAD = path.resolve(__dirname, '..', 'electron', 'preload.cjs');
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 120000);
const results = [];
const check = (name, cond, detail) => { results.push(!!cond); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}  — ${detail}`); };

// main.cjs가 등록하는 핸들러를 프로브 main에서 재현 (preload는 이 두 채널을 부팅 시 sendSync로 부른다)
let userDataDir = null;
ipcMain.on('paths:user-data', evt => { evt.returnValue = userDataDir; });
ipcMain.on('cloud:read-all', evt => { evt.returnValue = {}; });
ipcMain.on('steam:info', evt => { evt.returnValue = { available: false, lang: null }; });

async function bootWith(udDir) {
  userDataDir = udDir;
  // 실앱(main.cjs)과 동일한 webPreferences — sandbox:false가 핵심(켜져 있으면 preload의 require('fs')가 죽는다)
  const win = new BrowserWindow({ show: false, width: 900, height: 600,
    webPreferences: { backgroundThrottling: false, offscreen: true, preload: PRELOAD,
      contextIsolation: true, nodeIntegration: false, sandbox: false } });
  win.webContents.setAudioMuted(true);
  await win.loadFile(path.join(DIST, 'index.html'));
  for (let i = 0; i < 60; i++) {
    if (await win.webContents.executeJavaScript(`!!(window.__shelter && window.__shelter.simDays)`, true).catch(() => false)) break;
    await new Promise(r => setTimeout(r, 400));
  }
  const state = await win.webContents.executeJavaScript(`({
    dir: window.nineLocale && window.nineLocale.dir,
    expLbl: (document.querySelector('[data-i18n="btn.exp.lbl"]')||{}).textContent,
    craftLbl: (document.querySelector('[data-i18n="btn.craft.lbl"]')||{}).textContent,
  })`, true);
  win.destroy();
  return state;
}

(async () => {
  app.on('window-all-closed', () => { /* 케이스 사이 창 0개 자동 종료 방지 (trailer-cap5 함정 재발 방지) */ });
  app.commandLine.appendSwitch('no-sandbox');
  app.disableHardwareAcceleration();
  await app.whenReady();

  // ① 부분 오버라이드 — 탐험 버튼 라벨 하나만 바꾼 ko.json
  const ud1 = path.join(os.tmpdir(), 'nw-loc-ovr-' + Date.now());
  fs.mkdirSync(path.join(ud1, 'locales'), { recursive: true });
  fs.writeFileSync(path.join(ud1, 'locales', 'ko.json'), JSON.stringify({ 'btn.exp.lbl': '수색테스트' }), 'utf8');
  const a = await bootWith(ud1);
  check('userData 부분 오버라이드 적용', a.expLbl === '수색테스트', `탐험→${JSON.stringify(a.expLbl)} · dir=${a.dir}`);
  check('미지정 키는 기본값 유지', a.craftLbl === '제작', `제작=${JSON.stringify(a.craftLbl)}`);

  // ② 깨진 JSON — 문법 오류 파일은 무시되고 기본값
  const ud2 = path.join(os.tmpdir(), 'nw-loc-bad-' + Date.now());
  fs.mkdirSync(path.join(ud2, 'locales'), { recursive: true });
  fs.writeFileSync(path.join(ud2, 'locales', 'ko.json'), '{ "btn.exp.lbl": 깨짐', 'utf8');
  const b = await bootWith(ud2);
  check('깨진 JSON은 무시(기본값 유지)', b.expLbl === '탐험', `탐험=${JSON.stringify(b.expLbl)}`);

  // ③ 파일 없음 — mkdir만 되고 기본값 (빈 폴더가 자동 생성돼 유저가 찾기 쉬움)
  const ud3 = path.join(os.tmpdir(), 'nw-loc-none-' + Date.now());
  const c = await bootWith(ud3);
  check('파일 없으면 기본값 + 폴더 자동 생성', c.expLbl === '탐험' && fs.existsSync(path.join(ud3, 'locales')), `탐험=${JSON.stringify(c.expLbl)}`);

  for (const d of [ud1, ud2, ud3]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* */ } }
  const ok = results.every(Boolean);
  console.log(`\nRESULT ${results.filter(Boolean).length}/${results.length} ${ok ? 'ALL GREEN' : 'FAIL'}`);
  app.quit(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); app.quit(); process.exit(2); });
