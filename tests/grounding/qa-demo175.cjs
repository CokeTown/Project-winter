// #175 데모 프리즈+가드 E2E — 리뷰 rank-1 회귀 네트.
//   트렁크의 옛 데모게이트는 seasonOf() 객체를 문자열과 비교해 항상 false였다(컷/크레딧/CTA 미발동).
//   정본 브랜치(demo-vertical-slice)의 Day-15 컷이 실제 렌더러에서 제대로 도는지 실측:
//     (1) Day-15 게이트가 실 tickTime에서 pre-credits→credits로 전환되는가 (object===string이면 절대 불변)
//     (2) 크레딧 페이로드(카드 5장 demo.credits.0~4 + 위시리스트 CTA close)가 실 빌드 i18n에 존재/구별되는가
//   실행 전제: dist가 데모 빌드여야 함 →  $env:DEMO_BUILD=1; npx vite build --mode electron
//   실행:      npx electron tests/grounding/qa-demo175.cjs
const { boot, evalJs, call, check, report } = require('../harness.cjs');

(async () => {
  await boot();

  // (1) 실 게이트(tickTime:7124): day14 + pre-credits에서 gameMin을 Day15 경계 너머로 밀고 renderFrame 1회.
  //     전환되면 DEMO_ED=true도 동시 증명(게이트가 DEMO_ED 가드 안). object===string이면 절대 안 바뀐다.
  const gate = await call(`
    S.hideTitle();
    S.state.demoPhase = 'pre-credits';
    S.state.day = 14;
    S.state.gameMin = 14 * 1440 + 1200;   // newDay=15 → 롤오버 루프가 14→15에서 게이트 발화
    S.renderFrame();
    return S.state.demoPhase;
  `);
  check('Day-15 게이트 발화 (pre-credits→credits, 실 tickTime)', gate === 'credits', `demoPhase=${gate}`);

  // (2) 크레딧 페이로드: runDemoCredits가 렌더하는 정확한 키(카드0~4 + close CTA)가 실 빌드에서 번역·존재·구별.
  const pay = JSON.parse(await evalJs(`(()=>{ const S=window.__shelter;
    const cards=[0,1,2,3,4].map(i=>S.t('demo.credits.'+i));
    return JSON.stringify({ cards, close: S.t('demo.credits.close') });
  })()`));
  const filled = pay.cards.every(c => c && c.length > 3 && !c.startsWith('demo.credits'));
  const distinct = new Set(pay.cards).size === 5;
  const ctaOk = !!pay.close && pay.close.length > 1 && !pay.close.startsWith('demo.credits');
  check('크레딧 카드 5장 번역 존재', filled, `filled=${filled}`);
  check('크레딧 카드 5장 서로 다른 문안', distinct, `distinct=${new Set(pay.cards).size}/5`);
  check('위시리스트 CTA(demo.credits.close) 존재', ctaOk, `close="${(pay.close || '').slice(0, 20)}"`);

  const ok = report();
  try { require('electron').app.quit(); } catch (e) {}
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('E2E 예외:', e); process.exit(1); });
