// REQ-BAL-04 게이트: BAL 미경유 밸런스 수치 하드코딩 "신규 유입" 검사
// 베이스라인 방식: 현재 위반 목록을 tools/hardcode-baseline.json에 고정하고,
// 이후 실행에서 베이스라인에 없는 신규 위반만 실패 처리(기존 부채는 점진 상환).
// 사용: node tools/check-hardcode.mjs [--rebase]
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
const lines = src.split('\n');
// 휴리스틱: 게이지/확률/소모 맥락 근처의 리터럴 숫자 (BAL. 참조 없는 줄)
const PAT = /(hunger|thirst|energy|comfort|clean|spoil|decay|chance|prob|cost|drain)\b[^\n]*[-+*/=<>]\s*\d+\.?\d*/i;
const hits = [];
lines.forEach((ln, i) => {
  if (PAT.test(ln) && !/BAL\.|const |let |\/\/|\/\*|Math\.(min|max|floor|round)\(0|\b(100|0)\b[^0-9.]/.test(ln.trim().slice(0, 4)) ) {
    if (!ln.includes('BAL.') && !ln.trim().startsWith('//') && !ln.trim().startsWith('*')) hits.push(`${i + 1}: ${ln.trim().slice(0, 90)}`);
  }
});
const basePath = new URL('./hardcode-baseline.json', import.meta.url);
if (process.argv.includes('--rebase')) {
  fs.writeFileSync(basePath, JSON.stringify(hits, null, 2));
  console.log(`베이스라인 재설정: ${hits.length}건`);
  process.exit(0);
}
let base = [];
try { base = JSON.parse(fs.readFileSync(basePath, 'utf8')); } catch (e) { /* 첫 실행 */ }
const baseSet = new Set(base.map(s => s.replace(/^\d+: /, ''))); // 라인번호 무시 비교
const fresh = hits.filter(h => !baseSet.has(h.replace(/^\d+: /, '')));
console.log(`후보 ${hits.length}건 (베이스라인 ${base.length}건)`);
if (fresh.length) { console.error('신규 하드코딩 의심:\n' + fresh.join('\n')); process.exit(1); }
console.log('신규 유입 없음 ✓');
