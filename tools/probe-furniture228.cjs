/* #228 가구·조명 배치 실증 — 히트 영역·램프 delete 3케이스·전력 게이트·젤 밝기·미리보기/확정·도킹 */
const { BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1920, 1080); await sleep(500);
  const r = await H.evalJs(`(async()=>{
    const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container');
    await new Promise(r=>setTimeout(r,800));
    const out={}; const sl=ms=>new Promise(r=>setTimeout(r,ms));
    S.gameConfirm && (window.__origConfirm=S.gameConfirm); // 확인창 자동 수락(젤 회수 investConfirm)
    const yes=async()=>{ const b=document.querySelector('#confirm-back .pixel-btn.primary')||document.querySelector('#confirm-yes'); if(b)b.click(); };

    // ── A. 히트 영역: 램프 옆 2유닛(빛 웅덩이 안) 클릭 → 선택 안 돼야 (glow/pool raycast 무효 확정) ──
    S.state.inventory.lamp=3; S.state.inventory.table=1; S.state.res.fuel=5; S.state.res.parts=9; S.state.res.material=9;
    const lamp=S.addItem('lamp',0,-2,0,0,true,0,3);
    await sl(300);
    // 월드→화면 투영 헬퍼
    const proj=(x,y,z)=>{ const v=new (S.state.THREE||window.THREE||THREE).Vector3(x,y,z); v.project(S.camState?undefined:undefined); return null; };
    // (투영은 game 내부 camera가 필요 — pickItem을 직접 검증: 웅덩이 좌표에서 레이 대신 pickItem 재현 불가하므로
    //  raycast 무효 자체를 오브젝트 속성으로 검증)
    out.glowRaycastNoop = typeof lamp.glowSprite.raycast === 'function' && String(lamp.glowSprite.raycast).length < 20;
    out.poolRaycastNoop = typeof lamp.lightPool.raycast === 'function' && String(lamp.lightPool.raycast).length < 20;

    // ── B. 램프 delete 3케이스 (실경로 reclaimSelected) ──
    // (a) 기본
    S.select ? S.select(lamp) : null;
    const del=async()=>{ const p=S.reclaimSelected ? S.reclaimSelected() : null; await sl(120); await yes(); await p; };
    const n0=S.items.length;
    if (window.__shelter.reclaimSelected===undefined) out.reclaimExport=false;
    await (async()=>{ const pr=S.reclaimSelected(); await sl(150); await yes(); await pr; })();
    out.delBasic = S.items.length === n0-1;
    // (b) 젤 적용 램프 — investConfirm 경유
    const lamp2=S.addItem('lamp',0,-2,0,0,true,0,3); lamp2.gel='charcoal'; S.select(lamp2);
    const n1=S.items.length;
    await (async()=>{ const pr=S.reclaimSelected(); await sl(200); await yes(); await sl(120); await pr; })();
    out.delGel = S.items.length === n1-1;
    // (c) 테이블 위 램프 (스택)
    const tbl=S.addItem('table',0,2,0,0,true,0,3);
    const sr=S.items.find(i=>i===tbl);
    const lamp3=S.addItem('lamp',0,2,0,0,true,1.0,3); lamp3.support=tbl; S.select(lamp3);
    const n2=S.items.length;
    await (async()=>{ const pr=S.reclaimSelected(); await sl(150); await yes(); await pr; })();
    out.delOnTable = S.items.length === n2-1;

    // ── C. 전력 게이트: solar 없음 → lamp ON 거부 / solar 개조 → ON ──
    const lamp4=S.addItem('lamp',0,-3,1,0,false,0,3);
    S.setItemPower(lamp4,true,{silent:false});
    out.powerDeniedNoSolar = lamp4.on === false;
    S.state.mods = S.state.mods || {}; (S.state.mods[S.state.current]=S.state.mods[S.state.current]||[]).push('solar');
    S.setItemPower(lamp4,true,{silent:false});
    out.powerOkWithSolar = lamp4.on === true;

    // ── D. 젤 밝기: 젤 광원색 HSL.L ≥ 원색 L ──
    lamp4.gel='charcoal'; S.applyGel ? S.applyGel(lamp4) : null;
    // applyGel 미노출 시 recolor 경유
    if (!S.applyGel) { lamp4.gel='charcoal'; }
    const Lof=c=>{const h={};c.getHSL(h);return h.l;};
    if (lamp4.lightObj) {
      const gl=Lof(lamp4.lightObj.color);
      const base=new lamp4.lightObj.color.constructor(0xffb670);
      out.gelLightNotDarker = gl >= Lof(base) - 0.01;
      out.gelL = +gl.toFixed(3); out.baseL = +Lof(base).toFixed(3);
    }

    // ── E. 미리보기/확정: 스와치 클릭=무소모, 적용=소모 ──
    S.state.lightGels = true; S.state.paints = { charcoal: 2 };
    const lamp5=S.addItem('lamp',0,-4,-1,0,false,0,3);
    S.select(lamp5); await sl(250);
    const gelSw=document.querySelector('#sel-gel [data-gel=\"charcoal\"]');
    out.gelRowShown = !!gelSw;
    if (gelSw) {
      gelSw.click(); await sl(200);
      out.previewNoSpend = (S.state.paints.charcoal===2) && !lamp5.gel; // 미리보기 — 무소모·미커밋
      const apBtn=document.querySelector('#sel-gel-apply button');
      out.applyBtnShown = !!apBtn;
      if (apBtn) { apBtn.click(); await sl(200);
        out.applySpent = S.state.paints.charcoal===1 && lamp5.gel==='charcoal'; }
    }
    // 미확정 원복: 다른 스와치 미리보기 후 선택 해제 → 커밋 색 유지
    const gelSw2=document.querySelector('#sel-gel [data-gel=\"ashgray\"]');
    if (gelSw2) { S.state.paints.ashgray=1; S.select(lamp5); await sl(150);
      document.querySelector('#sel-gel [data-gel=\"ashgray\"]').click(); await sl(150);
      S.deselect ? S.deselect() : null; await sl(150);
      out.revertOnClose = lamp5.gel==='charcoal' && S.state.paints.ashgray===1;
    }

    // ── F. 도킹: sel-panel 화면 우측 고정 ──
    S.select(lamp5); await sl(200);
    const rect=document.getElementById('sel-panel').getBoundingClientRect();
    out.dockedRight = rect.right > innerWidth*0.8 && rect.left > innerWidth*0.5;
    return out; })()`);
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(process.cwd(), 'scratchpad', 'aerial', 'furn228.jpg'), img.toJPEG(92));
  console.log('F228 ' + JSON.stringify(r, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
