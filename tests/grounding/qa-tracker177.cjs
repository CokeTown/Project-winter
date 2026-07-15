// #177 보급원 트래커 실렌더러 검증 (게임 리뷰 레버5): 지역 정보판에 미수집 시그니처 드랍 + 숙련 다음 티어까지.
//   slum 25회 방문(★1) + 시그니처 미수집 → "여기서만: 드럼통 화로, 그래피티" + "★2까지 25회" 표기.
//   실행: npx electron tests/grounding/qa-tracker177.cjs  (dist gd-2.0 필요)
const { boot, evalJs, call, check, report } = require('../harness.cjs');

(async () => {
  await boot();
  const html = await call(`
    S.hideTitle();
    S.state.regionVisits = { slum: 25 };   // ★1 (>=20), ★2까지 25회
    S.state.blueprints = {};                // 시그니처 미수집
    S.openMapModal();                       // #map-info DOM 생성
    S.showMapInfo('slum');
    return document.getElementById('map-info').innerHTML || '';
  `);
  const txt = String(html).replace(/<[^>]+>/g, ' ');
  check('드랍(미수집 시그니처) 표기', /여기서만|Only here/.test(txt), txt.slice(0, 140));
  check('숙련 다음 티어까지 표기 (★2까지 25회)', /★2까지 25|★2 in 25/.test(txt), '');
  check('현 숙련 ★1 표기', /★1/.test(txt), '');

  // 전부 수집 시: 드랍 대신 "모두 수집"
  const html2 = await call(`
    S.state.blueprints = { barrelfire:1, graffiti:1 };
    S.showMapInfo('slum');
    return document.getElementById('map-info').innerHTML || '';
  `);
  const txt2 = String(html2).replace(/<[^>]+>/g, ' ');
  check('전부 수집 시 "모두 수집" 전환', /모두 수집|All signatures/.test(txt2) && !/여기서만|Only here/.test(txt2), txt2.slice(0, 100));

  const ok = report();
  try { require('electron').app.quit(); } catch (e) {}
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('E2E 예외:', e); process.exit(1); });
