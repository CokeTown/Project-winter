// 번역 시트 추출 (TR-1) — 게임메카 번역가 인터뷰 규격(2026-07-10, 디렉터 공유 자료) 반영:
//   스프레드시트 1행 제목 · 셀 병합 없음 · ID/문맥/어투/변수/원문/번역문 컬럼 · 글자수 참고.
//   어투(tone)는 #139 어투 대개편 규칙에서 자동 유도(프리픽스 휴리스틱 — 권고값, 최종 판단은 번역자).
//   사용: node tools/export-l10n-sheet.mjs  →  docs/l10n/translation-sheet.tsv (탭 구분, 시트/CAT 도구 직행)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ko = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/ko.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en.json'), 'utf8'));
const ja = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/ja.json'), 'utf8')); // #191 완역분 — 시트에 현행 반영

// 프리픽스 → 출력 위치/용도 설명 (인터뷰: "UI 텍스트 ID는 용도를 알 수 있는 것" — 부족분을 문맥 칼럼으로 보강)
const CONTEXT = {
  ev: '인카운터(랜덤 사건) 본문·선택지 — 플레이어가 겪는 이야기', proj: '대형 프로젝트(건설) 이름·단계·완공 문구',
  end3: '엔딩 3분기 대사·연출 텍스트(스포일러 주의)', day: '하루 결산/일지 문구', exp: '탐험 준비·정산·노트',
  btn: '버튼 라벨(짧게 — 잘림 주의)', ctrl: '키/패드 바인딩 UI', winter: '겨울·대한파 이벤트/경고',
  prep: '탐험 준비 품목 행', quest: '온보딩 목표 트래커', opt: '환경설정 항목', front: '대한파 프론트(하드 규율) UI',
  record: '일지 기록탭(메모/라디오 수집)', mode: '난이도 모드 선택 카드', comfort: '쾌적함(안락) 시스템 라벨',
  hidden: '히든 루트 「침묵」(스포일러 최상급 — 톤 유지 필수)', craft: '제작창', subway: '지하 노선(1.2) 콘텐츠',
  jnl: '생존 일지 항목', shelter: '셸터 이름·설명', hazmat: '방호복·금지구역', help: '도움말 페이지',
  bunker: '돔 벙커 전용 문구', hud: '메인 HUD 라벨(아주 짧게)', slot: '세이브 슬롯 UI', deco: '꾸미기(벽지/바닥재)',
  report: '오프라인 복귀 리포트', memo: '수집 메모 관련 UI(메모 본문은 별도 테이블)', title: '타이틀 화면',
  sleep: '취침·기상 문구', map: '탐험 지도 UI', avalanche: '눈사태(1.3) 이벤트', auto: '자동 진행 에이전트',
  confirm: '확인 대화상자(행동 확정)', ending: '엔드게임 마일스톤 연출', brief: '아침 보고 연출', radio: '라디오 UI',
  widget: '데스크톱 위젯 모드', injury: '부상 서사(§9.4)', dye: '염료 상인', gun: '총·정비(§9.3)',
  settings: '설정 탭', move: '이주 UX', rooftop: '옥탑 전용(텃밭 등)', icefish: '얼음낚시(1.1)', tip: '종이 팁 팝업',
  save: '저장 관련', power: '가구 전원/연료', paint: '도료(팔레트) 시스템', intro: '인트로 생존 서사(문어체)',
  know: '지식(책) 트리', toast: '토스트 알림(짧게)', wardrobe: '옷장(복장)', coldsnap: '한파 이벤트',
  hostile: '적대 조우(§9.2)', demo: '데모 전용 문구(티저 등)', truth: '그날의 진실(1.4 회고 — 문어체)',
  journal: '생존 일지 UI', sel: '가구 선택 카드(색/티어)', bp: '시그니처 도면', pause: '일시정지',
};
// 어투(tone) — #139: 플레이어 행동=혼잣말 반말(monologue) · 시스템=다나까(system) · 기록/회고=문어체(document) · 명사 라벨(label)
const TONE = {
  monologue: ['ev', 'exp', 'day', 'jnl', 'quest', 'eat', 'drink', 'sleep', 'tip', 'winter', 'coldsnap', 'avalanche', 'hostile', 'injury', 'icefish', 'dye', 'hidden', 'end3', 'ending', 'brief', 'report', 'subway', 'hazmat', 'bunker', 'rooftop', 'proj', 'move', 'rescue', 'ended', 'season', 'settled', 'offline', 'nightsky', 'sketch'],
  document: ['intro', 'truth', 'doc', 'memo', 'will'],
  system: ['opt', 'settings', 'confirm', 'save', 'slot', 'mode', 'ctrl', 'disp', 'lang', 'pause', 'help', 'auto', 'widget', 'cam', 'acc', 'err', 'loading', 'modal', 'wallpaper', 'front', 'gun', 'know'],
};
const toneOf = (pre) => TONE.monologue.includes(pre) ? '혼잣말·반말' : TONE.document.includes(pre) ? '문어체(기록)' : TONE.system.includes(pre) ? '시스템·다나까' : '라벨(명사구)';
// ja/zh 매핑 권고(가이드 문서와 동일): 혼잣말→일본어 独白体(だ・である/タメ口), 시스템→です・ます, 문어→書き言葉

const esc = (s) => String(s).replace(/\t/g, ' ').replace(/\r?\n/g, '\\n'); // 탭·개행 이스케이프 — \n은 게임이 개행으로 복원
const rows = [['id', 'context', 'tone', 'vars', 'chars_ko', 'ko', 'en', 'ja', 'zh_cn']];
for (const k of Object.keys(ko)) {
  const pre = k.split('.')[0];
  const vars = [...String(ko[k]).matchAll(/\{(\w+)\}/g)].map(m => m[0]).join(' ');
  rows.push([k, CONTEXT[pre] || '일반 UI', toneOf(pre), vars, String(String(ko[k]).length), esc(ko[k]), esc(en[k] ?? ''), esc(ja[k] ?? ''), '']);
}
const outDir = path.join(ROOT, 'docs/l10n');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'translation-sheet.tsv');
fs.writeFileSync(out, '﻿' + rows.map(r => r.join('\t')).join('\n') + '\n'); // BOM — 엑셀 한글 인코딩
console.log('keys:', rows.length - 1, '→', path.relative(ROOT, out));
const tones = rows.slice(1).reduce((a, r) => { a[r[2]] = (a[r[2]] || 0) + 1; return a; }, {});
console.log('tone 분포:', JSON.stringify(tones));
