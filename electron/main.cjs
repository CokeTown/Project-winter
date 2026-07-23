const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// userData 폴더명을 productName으로 고정 — app.getName()이 dev('nine-winters')/packaged 간 갈리는 걸 막아
// Steam Auto-Cloud 경로(%APPDATA%/Nine Winters/steamcloud)를 결정론적으로 만든다. getPath 호출 전에 세팅.
app.setName('Nine Winters');

let mainWin = null;

// ── Steam Cloud 파일 미러 (REQ-STEAM-01 A안: Auto-Cloud) ─────────────────────
//   진행 세이브(localStorage)를 userData/steamcloud/ 아래 키별 파일로도 저장한다.
//   Steam Auto-Cloud가 이 폴더를 앱 시작/종료 시 동기화(경로: WinAppDataRoaming/<productName>/steamcloud/*.json).
//   원자적 쓰기(tmp→rename)로 부분 파일 손상을 막는다. localStorage는 여전히 truth, 이건 미러.
const CLOUD_DIR = path.join(app.getPath('userData'), 'steamcloud');
function cloudEnsure() { try { fs.mkdirSync(CLOUD_DIR, { recursive: true }); } catch (e) { /* */ } }
function cloudFile(key) { return path.join(CLOUD_DIR, encodeURIComponent(String(key)) + '.json'); }
function cloudReadAll() {
  cloudEnsure();
  const out = {};
  try {
    for (const f of fs.readdirSync(CLOUD_DIR)) {
      if (!f.endsWith('.json')) continue;
      try { out[decodeURIComponent(f.slice(0, -5))] = fs.readFileSync(path.join(CLOUD_DIR, f), 'utf8'); } catch (e) { /* 개별 파일 손상 무시 */ }
    }
  } catch (e) { /* 폴더 없음 등 */ }
  return out;
}
// 부팅 하이드레이션용 동기 읽기 (preload가 sendSync로 호출).
ipcMain.on('cloud:read-all', (evt) => { try { evt.returnValue = cloudReadAll(); } catch (e) { evt.returnValue = {}; } });
// 번역 오버라이드 폴더용 userData 경로 (preload가 sendSync로 호출) — 포터블 exe는 resources가
// 실행마다 %TEMP%에 새로 풀려 편집이 증발하므로, 항상 같은 자리(%APPDATA%/Nine Winters)를 알려준다.
ipcMain.on('paths:user-data', (evt) => { try { evt.returnValue = app.getPath('userData'); } catch (e) { evt.returnValue = null; } });

// ── Steamworks (#34 언어 연동 · #117 DLC 게이트) ─────────────────────────────
// Steam 클라이언트 밖(웹/포터블/개발/캡처 하네스)에선 init이 던진다 — null 폴백으로 전 기능 무해.
// 앱ID: init() 무인자 = Steam 런처 실행 컨텍스트 또는 steam_appid.txt(개발)가 공급.
let steamClient = null;
try { steamClient = require('steamworks.js').init(); } catch (e) { steamClient = null; }
ipcMain.on('steam:info', (evt) => {
  try {
    evt.returnValue = steamClient
      ? { available: true, lang: steamClient.apps.currentGameLanguage() }
      : { available: false, lang: null };
  } catch (e) { evt.returnValue = { available: false, lang: null }; }
});
ipcMain.on('steam:dlc', (evt, appId) => {
  try { evt.returnValue = steamClient ? steamClient.apps.isDlcInstalled(Number(appId)) : false; }
  catch (e) { evt.returnValue = false; }
});
// #117 업적 해금 중계 — 렌더러 nineSteam.unlock → 여기 → steamworks.js. 비Steam(웹/개발/캡처)이면 null 폴백으로 무해.
ipcMain.handle('steam:achieve', (evt, achId) => {
  try { if (!steamClient) return false; steamClient.achievement.activate(String(achId)); return true; }
  catch (e) { return false; }
});
// 원자적 쓰기: tmp에 쓴 뒤 rename (부분 쓰기 방지).
ipcMain.handle('cloud:write', (evt, key, val) => {
  cloudEnsure();
  const dest = cloudFile(key), tmp = dest + '.tmp';
  try { fs.writeFileSync(tmp, String(val), 'utf8'); fs.renameSync(tmp, dest); return true; }
  catch (e) { try { fs.unlinkSync(tmp); } catch (_) { /* */ } return false; }
});
ipcMain.handle('cloud:remove', (evt, key) => { try { fs.unlinkSync(cloudFile(key)); } catch (e) { /* 이미 없음 */ } return true; });

// 미니 모드 진입 전 창 bounds를 저장해뒀다가 해제 시 복원한다.
let savedBounds = null;
let isMini = false;

const MINI_W = 480;
const MINI_H = 300;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0e1014',
    title: 'Project Shelter',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // Electron 20+는 렌더러 sandbox가 기본 ON — preload의 require('fs')(로케일 loose 오버라이드)가
      // 모듈 로드에서 죽어 contextBridge 전체(nineWidget: 종료 버튼·위젯 모드·디스플레이 IPC)가 증발한다.
      // 로컬 파일만 로드하는 셸이라 sandbox만 끄고 contextIsolation/nodeIntegration 방어선은 유지.
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // 개발 중엔 Vite dev 서버를, 패키징된 빌드에선 dist/index.html을 로드
  const devUrl = process.env.SHELTER_DEV_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWin = win;
  win.on('closed', () => { mainWin = null; });
  return win;
}

// ── 위젯 모드 IPC 핸들러 ──
ipcMain.on('widget:opacity', (evt, v) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return;
  const clamped = Math.min(1, Math.max(0.3, Number(v) || 1));
  win.setOpacity(clamped);
});

ipcMain.on('widget:alwaysOnTop', (evt, v) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return;
  win.setAlwaysOnTop(!!v, 'screen-saver');
});

ipcMain.on('widget:clickThrough', (evt, v) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return;
  win.setIgnoreMouseEvents(!!v, { forward: true });
});

// 미니 모드: 창 재생성 없이 frame은 유지한 채 크기를 축소해 화면 우하단에 스냅한다.
// (frame 유무 토글은 재생성 없이는 불가능하므로, 구현 난이도가 낮은 "축소+스냅" 방식으로 타협)
ipcMain.on('widget:mini', (evt, v) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return;
  const on = !!v;
  if (on === isMini) return;

  if (on) {
    savedBounds = win.getBounds();
    const display = screen.getDisplayMatching(savedBounds);
    const wa = display.workArea;
    const x = wa.x + wa.width - MINI_W - 12;
    const y = wa.y + wa.height - MINI_H - 12;
    // 최소 크기(960x600)가 축소를 가로막아 어정쩡한 크기가 되던 버그 — 미니 동안 해제
    win.setMinimumSize(1, 1);
    win.setResizable(false);
    win.setBounds({ x, y, width: MINI_W, height: MINI_H });
    isMini = true;
  } else {
    win.setResizable(true);
    win.setMinimumSize(960, 600);
    if (savedBounds) win.setBounds(savedBounds);
    isMini = false;
  }
});

// ── 디스플레이 모드/해상도 IPC ──
// mode: 'fullscreen' | 'borderless' | 'windowed' (+ windowed일 때 width/height)
// 주의: Chromium엔 배타적 전체화면이 없다 — fullscreen과 borderless는 동일하게
// "테두리 없는 전체화면"으로 동작한다 (라벨만 구분, PC 게임 관례상 옵션은 둘 다 노출).
ipcMain.on('display:set', (evt, cfg) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win || isMini) return; // 미니 모드 중엔 무시 (해제 후 적용)
  const { mode, width, height } = cfg || {};
  if (mode === 'fullscreen' || mode === 'borderless') {
    win.setFullScreen(true);
  } else if (mode === 'windowed') {
    win.setFullScreen(false);
    const w = Math.max(640, Number(width) || 1280);
    const h = Math.max(400, Number(height) || 800);
    win.setMinimumSize(Math.min(960, w), Math.min(600, h));
    win.setSize(w, h);
    win.center();
  }
});

// ── 단일 인스턴스 강제 (#48) ──
// 이미 실행 중이면 두 번째 인스턴스는 즉시 종료하고, 기존 창을 복원·포커스한다.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.show();
      mainWin.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  // 종료 직전 위젯 모드 상태(항상 위/클릭 통과)를 해제해 유령 오버레이가 남지 않게 한다.
  app.on('before-quit', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      try {
        mainWin.setAlwaysOnTop(false);
        mainWin.setIgnoreMouseEvents(false);
      } catch (e) {}
    }
  });
}
