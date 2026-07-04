const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('node:path');

let mainWin = null;

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

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
