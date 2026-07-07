/* 모달 DOM 스냅샷 게이트 (Phase1-⑤ ui/modals 추출 안전망) — QA 전용.
 *   골든 픽셀 게이트는 3D 렌더/2D 오버레이를 잡지만 DOM UI(모달 패널)는 못 잡는다.
 *   여기서 각 모달을 결정론적 상태(simReset)로 열고 #modal-body innerHTML을 텍스트 골든으로 박제 →
 *   재빌드 시 diff. 모달 구조/텍스트/버튼/핸들러(onclick 인라인) 변화를 사람이 읽는 형태로 검출.
 *   실측: 모달 DOM은 simReset 후 결정론적(재개·리로드 동일). ui/modals 이관이 무손실인지 이 게이트가 지킨다.
 *
 *   사용: npm run modal-golden  (비교) / npm run modal-golden:update (기준 재생성, 의도된 UI 변경 후에만)
 *   기준: tests/grounding/modal-golden/<id>.html (커밋 대상)
 */
const fs = require('fs');
const path = require('path');
const H = require('../harness.cjs');

const DIR = path.join(__dirname, 'modal-golden');
const UPDATE = process.argv.includes('--update');
// 결정론적으로 열리는 주요 모달. precond=열기 전 세팅(치트/해금 등). skipIfErr=전제 미충족 시 스킵 허용.
const MODALS = [
  { id: 'craft', open: 'openCraftModal' },
  { id: 'knowledge', open: 'openKnowledgeModal' },
  { id: 'map', open: 'openMapModal' },
  { id: 'journal', open: 'openJournalModal' },
  { id: 'mode', open: 'openModeModal' },
  { id: 'wardrobe', open: 'openWardrobeModal' },
];

async function snap(fn) {
  // simReset로 상태를 고정 → modal-body 선청소(이전 모달 잔류 유출 방지) → 모달 열기 → innerHTML 회수.
  //   ※ setPaused 금지: 일부 모달(craft/knowledge 등)은 일시정지 중 pause-blocked로 안 열린다.
  //   빈 결과('')는 모달이 안 열린 것 → 게이트가 ERR로 잡게 한다.
  return await H.evalJs(`(()=>{const S=window.__shelter;S.simReset();if(S.hideTitle)S.hideTitle();
    const b=document.getElementById('modal-body'); if(b)b.innerHTML='';
    try{ S.${fn}(); }catch(e){ return 'ERR:'+(e&&e.message||e); }
    const h=b?b.innerHTML:'(no modal-body)'; return h===''?'ERR:모달 미개봉(빈 modal-body)':h;})()`);
}

(async () => {
  await H.boot();
  if (UPDATE && !fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  let pass = 0, fail = 0, skip = 0;
  for (const m of MODALS) {
    const html = await snap(m.open);
    const file = path.join(DIR, m.id + '.html');
    if (typeof html !== 'string' || html.startsWith('ERR') || html.startsWith('(no')) {
      console.log('ERR   ' + m.id.padEnd(12) + ' ' + html); fail++; continue;
    }
    if (UPDATE) {
      fs.writeFileSync(file, html);
      console.log('WROTE ' + m.id.padEnd(12) + ' (' + html.length + 'B)'); pass++;
    } else if (!fs.existsSync(file)) {
      console.log('MISS  ' + m.id.padEnd(12) + ' — 기준 없음 (modal-golden:update 먼저)'); skip++;
    } else {
      const ref = fs.readFileSync(file, 'utf8');
      const ok = ref === html;
      console.log((ok ? 'PASS  ' : 'FAIL  ') + m.id.padEnd(12) + (ok ? `(${html.length}B)` : ` — DOM 변경 ${ref.length}→${html.length}B`));
      ok ? pass++ : fail++;
    }
  }
  console.log(`\nMODAL ${UPDATE ? 'UPDATE' : 'CHECK'}: ${pass} pass, ${fail} fail, ${skip} skip`);
  H.app.quit(); process.exit(fail || skip ? 1 : 0);
})().catch(e => { console.error(e); H.app.quit(); process.exit(2); });
