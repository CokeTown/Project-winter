const { contextBridge, ipcRenderer } = require('electron');

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
