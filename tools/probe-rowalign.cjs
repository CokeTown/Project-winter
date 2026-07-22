/* #219 준비물 행 정렬 붕괴 진단 — 언어별 span 박스·폰트·아이콘 실측 */
const { BrowserWindow } = require('electron');
const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 240000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(1920, 1080); await sleep(500);
  await H.evalJs(`(async()=>{ const S=window.__shelter; S.simReset(); if(S.hideTitle)S.hideTitle(); S.loadShelter('container');
    await new Promise(r=>setTimeout(r,900)); const t=document.querySelector('.paper-tip,.notebook,#tip-pop'); if(t)t.remove();
    for(const rid of ['water','canned','battery','cloth','bandage','antiseptic']) S.state.res[rid]=(S.state.res[rid]||0)+5;
    S.setWeather('clear'); S.openObsMap(); S.setAerialHour(15);
    await new Promise(r=>setTimeout(r,2400)); return 1 })()`);
  const out = {};
  for (const lg of ['ko', 'en', 'ja']) {
    out[lg] = await H.evalJs(`(async()=>{
      const S=window.__shelter; S.setLang('${lg}');
      const rows=document.querySelectorAll('#obs-panel .obs-region');
      if(rows.length>1){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; rows[1].dispatchEvent(ev); }
      await new Promise(r=>setTimeout(r,1300));
      const row=document.querySelector('#obs-panel .prep-row[data-prep]');
      if(!row) return {err:'no row'};
      const rr=row.getBoundingClientRect();
      const info=[...row.children].map(el=>{
        const cs=getComputedStyle(el); const r=el.getBoundingClientRect();
        // 텍스트 노드만의 실제 잉크 박스 — Range로 잰다(span 박스와 다를 수 있음)
        let tb=null;
        for(const n of el.childNodes){ if(n.nodeType===3 && n.textContent.trim()){ const rg=document.createRange(); rg.selectNode(n); const b=rg.getBoundingClientRect(); tb={top:+(b.top-rr.top).toFixed(1), h:+b.height.toFixed(1)}; break; } }
        return { cls: el.className||'(none)', top:+(r.top-rr.top).toFixed(1), h:+r.height.toFixed(1),
          fs: cs.fontSize, lh: cs.lineHeight, ff: cs.fontFamily.split(',')[0].replace(/"/g,''),
          va: cs.verticalAlign, disp: cs.display, text: tb };
      });
      const ic=row.querySelector('.px-icon, img, svg');
      const icInfo = ic ? (()=>{ const c=getComputedStyle(ic); const r=ic.getBoundingClientRect();
        return { tag: ic.tagName, cls: ic.className.baseVal||ic.className, w:+r.width.toFixed(1), h:+r.height.toFixed(1), disp:c.display, va:c.verticalAlign }; })() : null;
      return { rowH:+rr.height.toFixed(1), align:getComputedStyle(row).alignItems, spans:info, firstIcon:icInfo };
    })()`);
    await H.evalJs(`(async()=>{ const b=document.querySelector('#obs-panel #obs-back-btn');
      if(b){ const ev=new MouseEvent('click',{bubbles:true}); ev.__bulgeTest=true; b.dispatchEvent(ev); }
      await new Promise(r=>setTimeout(r,900)); return 1 })()`);
  }
  console.log('ALIGN ' + JSON.stringify(out, null, 1));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
