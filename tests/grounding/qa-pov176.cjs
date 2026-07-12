// #176 서사 POV 실렌더 낭독 검증 (#139 마감): 서술문 1인칭 통일 + 인용 NPC 대사 2인칭 유지.
//   런타임 t()가 실제로 서빙하는 문자열을 읽어(dist/locales 오버라이드 경로), 서술=나/내·I/my,
//   인용부호("...") 안 NPC 대사만 당신/you 유지인지 확인. 훅(인트로)·페이오프(엔딩) 실낭독.
//   실행: npx electron tests/grounding/qa-pov176.cjs  (dist gd-2.0 필요)
const { boot, call, check, report } = require('../harness.cjs');

const stripQuotes = s => String(s ?? '').replace(/"[^"]*"/g, '');   // 인용부호 안 대사 제거 → 서술만
const NARR = ['intro.0','intro.1','intro.2','intro.firstShelter',
  'ending.line0','ending.line2','ending.line2cat','ending.line3','ending.note','ending.epilogue',
  'winter.ninth.title','winter.ninth.body','ev.cat.text','ev.cat.r1','ev.dog.r0',
  'ev.ending.text','ev.ending.r0','mode.zen.tag','jnl.help.p5.body','quest.clean.done'];
// 인용 대사 안 2인칭은 반드시 살아있어야 함(고립 캐논: 목소리는 흐른다)
const QUOTED_KEEP = { ko: { 'ev.ending.text': '당신의 불빛', 'ev.ending.r1': '당신 같은', 'ev.ending.textSignal': '당신 신호' },
                      en: { 'ev.ending.text': 'your light', 'ev.ending.r1': 'people like you', 'ev.ending.textSignal': 'your signal' } };

(async () => {
  await boot();

  // ── KO: 서술문에 당신 0 ──
  const ko = await call(`S.setLang('ko'); return JSON.stringify(${JSON.stringify(NARR)}.map(k => [k, S.t(k)]));`);
  const koPairs = JSON.parse(ko);
  let koLeak = koPairs.filter(([k, v]) => /당신/.test(stripQuotes(v)));
  check('KO 서술문 2인칭 당신 0건', koLeak.length === 0, koLeak.map(x => x[0]).join(', '));
  // 대표 낭독 (1인칭 육안 확인)
  check('KO intro.1 = 나는 살아남았다', /^나는 살아남았다/.test(koPairs.find(x=>x[0]==='intro.1')[1]), koPairs.find(x=>x[0]==='intro.1')[1].split('\n')[0]);
  check('KO ending.line3 = 내 집이었다', /내 집이었다/.test(koPairs.find(x=>x[0]==='ending.line3')[1]), '');
  check('KO winter.ninth.title = 나는 여전히', /그리고 나는 여전히/.test(koPairs.find(x=>x[0]==='winter.ninth.title')[1]), '');

  // ── KO: 인용 대사 2인칭 유지 ──
  const koQ = await call(`return JSON.stringify(${JSON.stringify(Object.keys(QUOTED_KEEP.ko))}.map(k => [k, S.t(k)]));`);
  for (const [k, v] of JSON.parse(koQ)) check(`KO 인용 유지 ${k} → "${QUOTED_KEEP.ko[k]}"`, v.includes(QUOTED_KEEP.ko[k]), v.slice(0, 40));

  // ── EN: 서술문에 you/your 0 ──
  const en = await call(`S.setLang('en'); return JSON.stringify(${JSON.stringify(NARR)}.map(k => [k, S.t(k)]));`);
  const enPairs = JSON.parse(en);
  const enRe = /\byou(rs|rself|r)?\b/i;
  let enLeak = enPairs.filter(([k, v]) => enRe.test(stripQuotes(v)));
  check('EN 서술문 2인칭 you/your 0건', enLeak.length === 0, enLeak.map(x => x[0]).join(', '));
  check('EN intro.1 = I survived', /^I survived/.test(enPairs.find(x=>x[0]==='intro.1')[1]), enPairs.find(x=>x[0]==='intro.1')[1].split('\n')[0]);
  check('EN ending.line3 = mine', /without a doubt, mine\./.test(enPairs.find(x=>x[0]==='ending.line3')[1]), '');

  // ── EN: 인용 대사 2인칭 유지 ──
  const enQ = await call(`return JSON.stringify(${JSON.stringify(Object.keys(QUOTED_KEEP.en))}.map(k => [k, S.t(k)]));`);
  for (const [k, v] of JSON.parse(enQ)) check(`EN 인용 유지 ${k} → "${QUOTED_KEEP.en[k]}"`, v.includes(QUOTED_KEEP.en[k]), v.slice(0, 40));

  const ok = report();
  try { require('electron').app.quit(); } catch (e) {}
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('E2E 예외:', e); process.exit(1); });
