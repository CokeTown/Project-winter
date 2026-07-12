// 데모 고립→응답 비트(리뷰 레버1·6) 실렌더러 검증.
//   세 비트(demo_far_light·demo_procession·demo_radio_light)가 showEvent로 실제 모달에 뜨고,
//   시그니처 라디오 비트의 선택지가 첫 응답 불빛(survivorLights=1)을 켜는지 실측한다.
//   실행 전제: dist가 데모 빌드. 실행: npx electron tests/grounding/qa-demo-beats.cjs
const { boot, evalJs, call, check, report } = require('../harness.cjs');

(async () => {
  await boot();
  await call(`S.hideTitle();`); // 인게임 진입 — 모달 표시 가능 상태

  const beats = [
    { id: 'demo_far_light', titleKey: 'ev.demofarlight.title' },
    { id: 'demo_procession', titleKey: 'ev.demoprocession.title' },
    { id: 'demo_radio_light', titleKey: 'ev.demoradiolight.title' },
  ];
  for (const b of beats) {
    const r = JSON.parse(await evalJs(`(()=>{ const S=window.__shelter;
      document.getElementById('modal-back')?.classList.remove('show');
      S.showEvent('${b.id}');
      const shown = !!document.getElementById('modal-back')?.classList.contains('show');
      const body = document.getElementById('modal-body')?.textContent || '';
      return JSON.stringify({ shown, bodyLen: body.length, hasChoice: !!document.querySelector('#modal-body button') });
    })()`));
    check('비트 ' + b.id + ' 모달 표시+선택지', r.shown && r.bodyLen > 10 && r.hasChoice, `shown=${r.shown} len=${r.bodyLen} choice=${r.hasChoice}`);
  }

  // 시그니처: 라디오 비트 첫 선택지 run() → 첫 응답 불빛 점등(0→1).
  const lit = await call(`
    S.state.survivorLights = 0;
    S.EVENTS.demo_radio_light.choices[0].run();
    return S.state.survivorLights;
  `);
  check('라디오→응답: 첫 불빛 점등 (survivorLights 0→1)', lit === 1, `survivorLights=${lit}`);

  const ok = report();
  try { require('electron').app.quit(); } catch (e) {}
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('E2E 예외:', e); process.exit(1); });
