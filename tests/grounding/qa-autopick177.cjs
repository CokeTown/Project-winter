// #177 레버5 오토픽커 goals-bias 검증: 미수집 시그니처 도면 보유 지역으로 자동 탐험이 조향되는가.
//   결정론 위해 wishlistWeight를 일시 증폭(×100) → 편향이 실제로 배선됐는지 확실히 관찰:
//     (A) 미수집 시그니처 지역이 있으면 그리로 픽.  (B) 전부 수집하면 편향 소멸 → 자연 선택(가중=1)로 복귀.
//   + 실제 밸런스 값(1.35) 로드 확인.  실행: npx electron tests/grounding/qa-autopick177.cjs  (dist gd-2.0)
const { boot, call, check, report } = require('../harness.cjs');

(async () => {
  await boot();

  // 시그니처 지역·전체 시그니처 도면 집합을 런타임 밸런스에서 취득
  const meta = JSON.parse(await call(`
    return JSON.stringify({
      real: S.BAL.auto.wishlistWeight,
      regionItems: S.BAL.blueprint.regionItems,
    });
  `));
  check('실제 wishlistWeight = 1.35 (밸런스 로드)', meta.real === 1.35, 'val=' + meta.real);
  const sigRegions = Object.keys(meta.regionItems);
  const allSigs = [].concat(...sigRegions.map(r => meta.regionItems[r]));

  // 통제 상태: 신선 프리셋, 직전지역 없음, 시그니처 전부 미수집
  const res = JSON.parse(await call(`
    S.hideTitle();
    S.state.lastAutoRegion = null;
    S.state.blueprints = {};
    // 자연 선택(편향 off): wishlistWeight=1
    S.BAL.auto.wishlistWeight = 1;
    const baseline = S.pickAutoRegion();
    // 편향 증폭(×100): 미수집 시그니처 지역이 있으면 반드시 그리로
    S.BAL.auto.wishlistWeight = 100;
    const biased = S.pickAutoRegion();
    // 전부 수집 → 편향 조건 소멸 → 자연 선택으로 복귀 (가중 여전히 100이어도 걸릴 지역이 없음)
    const collected = {};
    ${JSON.stringify(allSigs)}.forEach(bp => collected[bp] = 1);
    S.state.blueprints = collected;
    const afterCollect = S.pickAutoRegion();
    S.BAL.auto.wishlistWeight = 1.35;  // 원복
    // 어느 시그니처 지역이 해금+미수집인지 (baseline 상태 기준)
    const unlockedSig = ${JSON.stringify(sigRegions)}.filter(r => S.regionUnlocked(r));
    return JSON.stringify({ baseline, biased, afterCollect, unlockedSig });
  `));

  check('해금된 시그니처 지역 1곳 이상 존재', res.unlockedSig.length >= 1, 'unlocked=' + res.unlockedSig.join(','));
  check('편향 증폭 시 미수집 시그니처 지역으로 조향', res.unlockedSig.includes(res.biased),
    `biased=${res.biased} ∈ {${res.unlockedSig.join(',')}}?`);
  check('전부 수집 시 편향 소멸 → 자연 선택 복귀', res.afterCollect === res.baseline,
    `afterCollect=${res.afterCollect} vs baseline=${res.baseline}`);
  // 편향이 자연 선택을 실제로 뒤집었는지(트래커 pull이 의미있으려면): baseline이 이미 시그니처 지역이 아니면 flip 관찰
  check('편향이 선택을 바꿈(자연 픽≠시그니처일 때 flip 관찰)',
    res.biased !== res.baseline || res.unlockedSig.includes(res.baseline),
    `baseline=${res.baseline} biased=${res.biased}`);

  const ok = report();
  try { require('electron').app.quit(); } catch (e) {}
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('E2E 예외:', e); process.exit(1); });
