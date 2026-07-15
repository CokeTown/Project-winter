// #117-A Steam Cloud 파일 미러 검증 (REQ-STEAM-01 A안).
//   A단계(기기1): 세이브 → userData/steamcloud/ 에 슬롯 파일 생성 확인.
//   B단계(새 기기): 파일을 새 userData로 복사(Auto-Cloud 다운로드 모사) → 부팅 시 하이드레이트로 복원 확인.
//   preload를 실제로 태워야 window.nineCloud가 붙는다. main.cjs의 cloud IPC 핸들러를 동일 재현.
//   실행: electron tests/grounding/qa-cloudsave.cjs <A|B> <userDataDir>
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path'); const fs = require('node:fs');
const PHASE = process.argv[2], UDIR = process.argv[3];
const MARK = 4242; // 세이브 마커 (state.day)

// main.cjs와 동일한 cloud IPC (검증 대상 계약).
const CLOUD_DIR = path.join(UDIR, 'steamcloud');
const ensure = () => { try { fs.mkdirSync(CLOUD_DIR, { recursive: true }); } catch (e) {} };
const cfile = k => path.join(CLOUD_DIR, encodeURIComponent(String(k)) + '.json');
ipcMain.on('cloud:read-all', (e) => { ensure(); const o = {}; try { for (const f of fs.readdirSync(CLOUD_DIR)) { if (f.endsWith('.json')) try { o[decodeURIComponent(f.slice(0, -5))] = fs.readFileSync(path.join(CLOUD_DIR, f), 'utf8'); } catch (_) {} } } catch (_) {} e.returnValue = o; });
ipcMain.handle('cloud:write', (e, k, v) => { ensure(); const d = cfile(k), t = d + '.tmp'; try { fs.writeFileSync(t, String(v), 'utf8'); fs.renameSync(t, d); return true; } catch (er) { return false; } });
ipcMain.handle('cloud:remove', (e, k) => { try { fs.unlinkSync(cfile(k)); } catch (er) {} return true; });

const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  app.commandLine.appendSwitch('no-sandbox');
  app.disableHardwareAcceleration();
  app.setPath('userData', UDIR);
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: 900, height: 700, webPreferences: {
    contextIsolation: true, nodeIntegration: false, sandbox: false,
    preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
    offscreen: true,
  } });
  await win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  const ev = e => win.webContents.executeJavaScript(e, true);
  for (let i = 0; i < 60; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.flushSave)`).catch(() => false)) break; await sleep(400); }

  let ok = false;
  if (PHASE === 'A') {
    // 세이브 생성: 타이틀 숨기고 마커 심고 flushSave → 미러가 파일로 씀.
    await ev(`(()=>{const S=window.__shelter;S.hideTitle&&S.hideTitle();S.state.day=${MARK};S.state.blueprints=Object.assign(S.state.blueprints||{},{cloudtest:1});S.flushSave&&S.flushSave();return 1;})()`);
    await sleep(1200); // 비동기 파일 write 완료 대기
    const hasBridge = await ev(`!!(window.nineCloud&&window.nineCloud.available)`);
    const files = fs.existsSync(CLOUD_DIR) ? fs.readdirSync(CLOUD_DIR).filter(f => f.endsWith('.json')) : [];
    const slotFile = files.find(f => /-slot\d/.test(f)); // lastslot 아닌 실제 슬롯 파일
    let slotHasMark = false;
    if (slotFile) { try { slotHasMark = JSON.parse(fs.readFileSync(path.join(CLOUD_DIR, slotFile), 'utf8')).state.day === MARK; } catch (e) {} }
    console.log('A: nineCloud 브릿지 =', hasBridge, '| 파일 수 =', files.length, '| 슬롯파일 =', slotFile || '없음', '| 마커일치 =', slotHasMark);
    ok = hasBridge && !!slotFile && slotHasMark;
  } else {
    // 새 기기 부팅: game.js 하이드레이트가 파일→localStorage 반영했는지 확인.
    const r = await ev(`(()=>{const S=window.__shelter;
      const ls=S.currentSlot?S.currentSlot():1; // 노출 안되면 1
      let restored=false, day=null;
      try{ // 하이드레이트된 슬롯을 직접 읽음
        const keys=Object.keys(localStorage).filter(k=>/project-shelter-slot/.test(k));
        for(const k of keys){try{const d=JSON.parse(localStorage.getItem(k));if(d&&d.state&&d.state.day===${MARK}){restored=true;day=d.state.day;break;}}catch(e){}}
      }catch(e){}
      return JSON.stringify({restored, day, slotKeys:Object.keys(localStorage).filter(k=>/project-shelter-slot/.test(k)).length, bridge:!!(window.nineCloud&&window.nineCloud.available)});
    })()`);
    const o = JSON.parse(r);
    console.log('B: 하이드레이트 복원 =', o.restored, '| day =', o.day, '| 슬롯키 =', o.slotKeys, '| 브릿지 =', o.bridge);
    ok = o.restored === true && o.day === MARK;
  }
  console.log(PHASE + '_RESULT', ok ? 'PASS' : 'FAIL');
  app.quit(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('E2E 예외:', e); app.quit(); process.exit(1); });
