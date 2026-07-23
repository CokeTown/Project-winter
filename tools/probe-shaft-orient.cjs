// 빛기둥 결선 방향 전수 감사 (#229) — 착지광이 방 안쪽(+z 로컬)으로 뻗는 게 규약인데,
//   벽 rotY/normal 결선이 어긋난 셸터가 있으면 빔이 실외 지면으로 쏟아진다("창문이 아닌데 햇살").
//   판정: 벽 그룹의 월드 forward(로컬 +z)가 방 중심→벽 방향(원심)과 같은 쪽이면 OUTWARD=결함.
//   실행: ./node_modules/.bin/electron.cmd tools/probe-shaft-orient.cjs
const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 300000);

(async () => {
  await H.boot();
  const ids = await H.evalJs(`Object.keys(window.__shelter.SHELTERS)`);
  let bad = 0;
  for (const id of ids) {
    const rows = await H.evalJs(`(async()=>{const S=window.__shelter;
      S.simReset(); if(S.hideTitle)S.hideTitle();
      S.state.current='${id}'; S.loadShelter('${id}');
      await new Promise(r=>setTimeout(r,500));
      const out=[];
      // 착지광(pool)만 표본: 창 1개당 1개, parent=벽 그룹
      const T=S.THREE;
      const fw=new T.Vector3(), wp=new T.Vector3();
      for (const b of (S.__sunShafts||[])) {
        if (b.userData.opMul!==0.8) continue; // pool 식별(빔 3겹은 opMul 1/0.45/0.7)
        const g=b.parent; if(!g) continue;
        g.getWorldDirection(fw); g.getWorldPosition(wp);
        const cl=Math.hypot(wp.x,wp.z);
        const dot=cl>0.5 ? (fw.x*wp.x+fw.z*wp.z)/cl : -1; // 원심 성분(>0=바깥으로 쏨)
        const pw=new T.Vector3(); b.getWorldPosition(pw);
        out.push({dot:+dot.toFixed(2), wall:[+wp.x.toFixed(1),+wp.z.toFixed(1)], pool:[+pw.x.toFixed(1),+pw.y.toFixed(2),+pw.z.toFixed(1)]});
      }
      return out;})()`);
    const flags = rows.filter(r => r.dot > 0.3);
    console.log(`${id}: 창 ${rows.length} · OUTWARD ${flags.length}` + (flags.length ? ' ← ' + JSON.stringify(flags) : ''));
    bad += flags.length;
  }
  console.log(bad ? `RESULT: OUTWARD ${bad}건 — 결선 결함` : 'RESULT: 전 셸터 INWARD — 결선 정상');
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
