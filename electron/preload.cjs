const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 위젯 모드 IPC 브릿지 — contextIsolation 유지, 렌더러엔 최소 표면만 노출.
contextBridge.exposeInMainWorld('nineWidget', {
  available: true,
  setOpacity: (v) => ipcRenderer.send('widget:opacity', v),
  setAlwaysOnTop: (v) => ipcRenderer.send('widget:alwaysOnTop', v),
  setMini: (v) => ipcRenderer.send('widget:mini', v),
  setClickThrough: (v) => ipcRenderer.send('widget:clickThrough', v),
  // 디스플레이 모드/해상도 (PC 전용 설정 UI에서 호출)
  setDisplay: (cfg) => ipcRenderer.send('display:set', cfg),
});

// ── 번역 loose 파일(런타임 오버라이드) ──────────────────────────────────
// 설치 폴더의 locales/{ko,en}.json 을 유저가 편집하면 재빌드 없이 번역이 바뀐다.
// 패키징 시 extraResources 로 asar 밖(resources/locales)에 배치 → 여기서 fs 동기 읽기 →
// 렌더러 i18n 이 부팅 시 STR 위에 병합(오버라이드). 파일 없거나 깨지면 내장 기본값 유지.
// preload 는 페이지 스크립트보다 먼저 실행되므로, 데이터를 미리 읽어 동기로 노출한다(플래시 없음).
function readLocaleOverrides() {
  const dirs = [];
  try { if (process.resourcesPath) dirs.push(path.join(process.resourcesPath, 'locales')); } catch (e) { /* */ }
  dirs.push(path.join(__dirname, '..', 'dist', 'locales')); // 언팩/개발 폴백
  const load = (dir, name) => {
    try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch (e) { return null; }
  };
  for (const d of dirs) {
    const ko = load(d, 'ko.json'), en = load(d, 'en.json');
    if (ko || en) return { ko, en, dir: d };
  }
  return { ko: null, en: null, dir: null };
}
let overrides = { ko: null, en: null, dir: null };
try { overrides = readLocaleOverrides(); } catch (e) { /* fs 불가 환경 무시 */ }
contextBridge.exposeInMainWorld('nineLocale', overrides);
