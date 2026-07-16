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

/* ── #202 trigger 컬럼(디렉터 2026-07-17: "어떤 상황·어떤 조건에서 출력되는지") ──
   ① ev.*: data/events.js를 정적 파싱해 인카운터별 when 게이트(계절/날씨/지구/셸터/밤낮/모드…)를
      사람 문장으로 풀고, 키 서픽스(.title/.text/.c0/.r0…)의 역할을 붙인다.
   ② 그 외: 프리픽스별 발동 상황 사전 + 공통 서픽스 규칙(.done=완료 토스트 등). */
const SEASON_KO = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const WEATHER_KO = { clear: '맑음', snow: '눈', rain: '비', storm: '폭풍', overcast: '흐림', heavyrain: '폭우' };
const DISTRICT_KO = { outskirts: '외곽', city: '도심', meadow: '초원', forest: '숲', coast: '해안', harbor: '항구', slum: '슬럼', industrial: '공업', downtown: '중심지', highland: '고원', eastgate: '동부 관문', eastbridge: '동부 대교', eaststation: '동부 역세권', eastcore: '동부 심부' };
const ARRIVE_KO = { foot: '도보 방문자(수레) 도착 연출', door: '문 앞 방문자 도착 연출', boat: '배 접안 방문자 연출' };
const shelterKo = (id) => ko[`data.shelter.${id}.name`] || id;
function parseEventGates() {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/events.js'), 'utf8');
  const gates = {};
  // 이벤트 블록: 들여쓰기 4의 `id: {` — 다음 블록 전까지에서 when/arrive만 훑는다(선언 필드 한정).
  const re = /\n    (\w+): \{([\s\S]*?)(?=\n    \w+: \{|\n  \};)/g;
  let m;
  while ((m = re.exec(src))) {
    const [, id, body] = m;
    const parts = [];
    const wm = body.match(/when: \{([^}]*)\}/);
    if (wm) {
      const w = wm[1];
      const list = (name) => { const lm = w.match(new RegExp(name + ":\\s*\\[([^\\]]*)\\]")); return lm ? lm[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean) : null; };
      const num = (name) => { const nm = w.match(new RegExp(name + ':\\s*(\\d+)')); return nm ? +nm[1] : null; };
      const seasons = list('seasons'); if (seasons) parts.push(seasons.map(s => SEASON_KO[s] || s).join('·') + ' 한정');
      const weather = list('weather'); if (weather) parts.push('날씨 ' + weather.map(s => WEATHER_KO[s] || s).join('·'));
      const districts = list('districts'); if (districts) parts.push(districts.map(d => DISTRICT_KO[d] || d).join('·') + ' 지구');
      const shelters = list('shelters'); if (shelters) parts.push(shelters.map(shelterKo).join('·') + ' 거점');
      const modes = list('modes'); if (modes) parts.push('모드 ' + modes.join('·'));
      if (/night: true/.test(w)) parts.push('밤');
      if (/dayOnly: true/.test(w)) parts.push('낮');
      const minDay = num('minDay'); if (minDay) parts.push(`Day ${minDay} 이후`);
      const minWinters = num('minWinters'); if (minWinters) parts.push(`겨울 ${minWinters}회차 이후`);
      if (/needsRadio/.test(w)) parts.push('라디오 보유');
      if (/needsCat/.test(w)) parts.push('고양이 동거');
      const hm = w.match(/hasMod:\s*'(\w+)'/); if (hm) parts.push(`개조 ${hm[1]} 보유`);
    }
    const am = body.match(/arrive: '(\w+)'/);
    if (am) parts.push(ARRIVE_KO[am[1]] || am[1]);
    const gate = parts.length ? parts.join(' · ') : '조건 없음(전 상황 랜덤 풀)';
    gates[id] = gate;
    // 로케일 키 세그먼트는 EVENTS 객체 키와 다르다(first_frost → ev.firstfrost.*) — titleId에서 실키를 뽑아 함께 등록.
    const tm = body.match(/titleId: 'ev\.(\w+)\./);
    if (tm) gates[tm[1]] = gate;
  }
  return gates;
}
const EV_GATES = parseEventGates();
const EV_SUFFIX = [
  [/^title$/, '카드 제목'], [/^text/, '카드 본문'], [/^c(\d+)$/, '선택지 버튼'],
  [/^r\d+/, '선택 결과 문구(해당 선택지를 고른 뒤 카드에 표시)'], [/^chip/, '내려둔 이벤트 칩 라벨'],
];
// 공통 서픽스 규칙(전 프리픽스): 뭘 하면 뜨는 문구인지
const SUFFIX_RULES = [
  [/\.done(Toast)?$/, '완료 시 토스트'], [/\.lore$/, '카드 하단 인용문(이전 거주자 수첩)'],
  [/\.(note|memoir)$/, '하루 결산 일지에 적히는 문장'], [/\.warn/, '경고 문구'], [/\.hint$/, '힌트 문구'],
  [/\.locked/, '해금 전 잠김 안내'], [/\.title$/, '제목'], [/\.desc$/, '설명문'],
];
// 프리픽스별 발동 상황(정밀) — 디렉터 혼란 신고가 잦은 계열 위주
const TRIGGER = {
  quest: '신규 게임(코지) 첫날 좌측 할 일 카드 — 7단계 온보딩 체크리스트(물→식사→배치→탐험→취침→제작→청소 순서)',
  jnl: '생존 일지(수첩) — jnl.tut1~3은 신규 게임 Day 1 아침에 한 권으로 열리는 튜토리얼 메모',
  tip: '해당 기능을 처음 만났을 때 1회만 뜨는 찢어진 쪽지 팁(키 이름이 그 상황)',
  front: '겨울 대한파(하드·혹한) 진행 중 전선 단계가 바뀔 때 상태 토스트',
  winter: '겨울 진입/한파 경보 등 계절 이벤트 시점',
  coldsnap: '한파 발생~해제 사이 노출',
  brief: '아침 기상 직후 자동으로 열리는 아침 보고 카드',
  day: '취침 후 하루 결산 화면',
  exp: '탐험 준비 창(출발 전)과 귀환 정산 카드',
  prep: '탐험 준비 창의 품목 행(체크리스트)',
  rescue: '무력(쓰러짐) 상태에서 구조 1회 사용 시',
  avalanche: '고원(스키 로지) 눈사태 발생 시',
  hostile: '적대 조우(§9.2) — 하드·혹한 탐험 중 확률 발생',
  injury: '탐험 실패/리스크 선택에서 부상을 입었을 때 상태·회복 문구',
  proj: '대형 프로젝트(공사) — workNote=진척 결산 노트, doneToast=완공 토스트, memoir=완공 회고 일지',
  know: '지식 앱(책 읽기) — 책 획득/완독/효과 발동 시',
  paint: '도료 시스템 — 탐험에서 안료 획득/도색 시',
  bp: '시그니처 가구 도면 — 지역 첫 발견/제작 해금 시',
  memo: '탐험 중 수집 메모 발견 시(본문은 데이터 테이블 별도)',
  radio: '라디오 배치 후 방송 수신 시 UI',
  auto: '자동 진행(에이전트) 모드 동작 중 상태 표시',
  report: '오프라인(자리 비움) 후 복귀 시 요약 리포트',
  offline: '오프라인 정산 요약',
  end3: '엔딩 분기 진입 시(초대장/교신/재건 — 스포일러)',
  hidden: '히든 루트 「침묵」 진행 중(최상급 스포일러)',
  truth: '금지구역 연구실 진실 메모 열람 시(문어체)',
  demo: '데모 빌드 전용(15일 컷 안내·위시리스트 티저)',
  toast: '조건 충족 순간 화면 상단 토스트(1~3초)',
  confirm: '위험/되돌리기 어려운 행동 직전 확인창',
  slot: '타이틀 이어하기/세이브 슬롯 목록',
  mode: '새 게임 난이도 선택 카드',
  wallpaper: '꾸미기(배경화면) 모드 진입/제약 안내',
  zen: '무한 모드 전용 문구',
  season: '계절이 바뀌는 아침 연출',
  settled: '정착도/거점 상태 표시',
  move: '이주 지도(거처 목록·이주 확정) UI',
  shelter: '이주 지도 셸터 카드(해금 조건 포함)',
  gun: '총 정비/사용(§9.3) — 하드·혹한 한정',
  hazmat: '방호복 제작/금지구역 진입 게이트',
  sketch: '탐험 스케치(수집품) 획득/액자 전시 시',
  nightsky: '겨울 밤하늘 관측 이벤트',
  icefish: '항구 얼음낚시(겨울 방파제) 시',
  dye: '염료 상인 방문 시 교환 UI',
  mastery: '지역 숙련(재방문 보너스) 달성 시',
  fatigue: '탐험 피로 누적/회복 상태',
  bag: '내구성 가방(빈손 방지) 관련',
  data: '도감·카드에 상시 표시되는 명칭/설명(데이터 테이블)',
  // 2차 보강(공백 상위 프리픽스): 상시 UI·설정류는 "어디에 떠 있는지"가 조건
  ctrl: '환경설정 > 컨트롤 탭(키/패드 바인딩 목록) — 상시',
  pda: '우측 PDA 도킹 패널(계기판) — 인게임 상시',
  opt: '환경설정 창 항목 — 설정 열 때 상시',
  map: '탐험 지도 화면(지역 마커·상태 표기) — 지도 열 때 상시',
  record: '일지 > 기록 탭(수집 메모·라디오 방송 목록)',
  craft: '제작창(제작대 클릭) — 레시피 행·재료 부족 안내',
  comfort: '쾌적함 패널(안락 4요소) — 거점 정보에서 상시',
  subway: '지하철 역사(1.2) 전용 — 선로/버섯/암시장 UI와 관련 이벤트',
  spot: '지도 특수 스팟(떠오른 자리 등) — 한시 출현 시 지도·카드에 표시',
  btn: '버튼 라벨 — 해당 창이 열려 있는 동안 상시(짧게, 잘림 주의)',
  help: '도움말 페이지(? 버튼) — 열람 시 상시',
  bunker: '돔 벙커 거점 전용 문구(문 개방·터널 등)',
  hud: '메인 HUD 상시 라벨(거점 정보판·게이지)',
  deco: '꾸미기 창(벽지/바닥재/벽걸이 스와치)',
  title: '타이틀 화면(시작/이어하기/설정 버튼 주변) — 부팅 시 상시',
  sleep: '취침 버튼/기상 연출 — 취침 시도·아침 기상 시',
  nt: '밤 시간대 안내(어둠·조명 관련) 문구',
  ending: '엔드게임 마일스톤(아홉 번째 겨울) 연출 진입 시',
  power: '가구 전원/연료 상태 — 배치 가구 카드·급전 안내',
  gel: '조명 젤(색 필터) — 파밍 획득/장착 UI',
  col: '일지 > 도감 탭(수집 현황)',
  rooftop: '옥탑 거점 전용(텃밭 개조 등)',
  settings: '환경설정 탭 공통 UI',
  widget: '데스크톱 위젯 모드(미니창) 전용',
  reclaim: '수거(가구 회수) 버튼·확인 — 배치 모드에서',
  intro: '새 게임 시작 직후 인트로 서사(문어체) — 1회',
  time: '시계 위젯/시간 표기 — 상시',
  edit: '배치(편집) 모드 UI — 연필 버튼으로 진입 시',
  panel: '거점 정보 패널 라벨 — 상시',
  save: '저장/불러오기 동작 시 안내',
  // 3차 스윕(잔여 소형 프리픽스 전량)
  journal: '생존 일지 창 상단(통계·도감·업적 탭 라벨)',
  disp: '환경설정 > 디스플레이(창/전체화면/해상도)',
  ended: '런 종료(무력 최종) 후 회고 요약 화면',
  inv: '인벤토리(보관 가구) — 전체 배치/수거 버튼과 안내',
  reclaimAll: '배치 가구 전체 수거 버튼 → 확인창',
  sel: '가구 선택 미니 카드(가구 클릭 시 옆에 뜸) — 이름/업그레이드',
  ui: 'UI 표시/숨김 토글(눈 버튼) 상태 안내',
  place: '가구 배치 시도 실패 안내(재고 없음/자리 없음/최대치)',
  buff: '인카운터 보상 버프 라벨 — 거점 정보판에 지속 표시',
  acc: '환경설정 > 접근성(글자 크기)',
  eat: '식사 시도 결과(음식 없음/배부름/통조림 섭취) 토스트',
  clean: '청소 시도 결과(이미 깨끗함/기력 부족/물 부족) 토스트',
  dur: '시간 표기 단위(분/시간) — 여러 UI 공용',
  forecast: '시계 위젯 일기예보 줄 — 상시',
  wardrobe: '옷장(복장 착용) 버튼·상태',
  event: '이벤트 카드 공통 버튼(내려두기)·결산 메모',
  journalpg: '수첩 페이지 넘김 UI(다음/닫기/쪽수)',
  pause: '일시정지 표시·차단 안내',
  drink: '물 마시기 시도 결과(물 없음/충분함) 토스트',
  frame: '스케치 액자(수집품 전시) 상태',
  highland: '고원 지대 패널티 안내(연료 소모·한파 빈도)',
  sight: '발코니 전망 비네트(정글의 해·금문교) 첫 관람 시',
  fallout: '낙진 시계/금지구역 오염 관련 안내',
  loading: '로딩 화면 문구',
  modal: '모달 공통 닫기 버튼',
  lcd: 'LCD 정보판 보조 라인',
  lang: '언어 변경 확인창',
  none: '빈 목록 공통 표시(없음)',
  free: '비용 없음 표시(무료)',
  current: '현재 값 표시 라벨',
  weather: '날씨 급변 안내 토스트',
  rotate: '가구 회전 실패(자리 없음) 안내',
  drop: '드랍(전리품) 관련 안내',
  err: '전역 오류 화면(크래시 안내)',
  upkeep: '유지비 없음 표시',
  ach: '업적 달성 토스트',
  gauge: '게이지 소진(기력 방전) 안내',
  clock: '시계 위젯 날짜 줄 — 상시',
  cat: '고양이 쓰다듬기 등 상호작용 토스트',
  east: '동부 영토(2.0) 소문/개통 관련 노트',
  cutter: '절단기 발견(벙커 확장) 결산 노트',
  discovery: '희귀 발견 컷(디오라마) 헤더',
  forbidden: '금지구역 첫 진입 인트로',
  bgm: 'BGM 파일 누락 안내(개발/포터블 환경)',
};
const esc = (s) => String(s).replace(/\t/g, ' ').replace(/\r?\n/g, '\\n'); // 탭·개행 이스케이프 — \n은 게임이 개행으로 복원
function triggerOf(k) {
  const [pre, second, ...rest] = k.split('.');
  if (pre === 'ev' && second) {
    const gate = EV_GATES[second];
    const suf = rest.join('.') || '';
    const role = (EV_SUFFIX.find(([re]) => re.test(suf)) || [])[1] || suf;
    const name = ko[`ev.${second}.title`] ? `「${ko[`ev.${second}.title`]}」` : second;
    return `인카운터 ${name} ${role || ''} — 발동: ${gate || '동적 조건(코드 게이트)'}`.trim();
  }
  const sufRule = (SUFFIX_RULES.find(([re]) => re.test(k)) || [])[1];
  const base = TRIGGER[pre];
  if (base && sufRule) return `${base} — ${sufRule}`;
  if (base) return base;
  return sufRule || '';
}
const rows = [['id', 'context', 'trigger', 'tone', 'vars', 'chars_ko', 'ko', 'en', 'ja', 'zh_cn']];
for (const k of Object.keys(ko)) {
  const pre = k.split('.')[0];
  const vars = [...String(ko[k]).matchAll(/\{(\w+)\}/g)].map(m => m[0]).join(' ');
  rows.push([k, CONTEXT[pre] || '일반 UI', esc(triggerOf(k)), toneOf(pre), vars, String(String(ko[k]).length), esc(ko[k]), esc(en[k] ?? ''), esc(ja[k] ?? ''), '']);
}
const outDir = path.join(ROOT, 'docs/l10n');
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'translation-sheet.tsv');
fs.writeFileSync(out, '﻿' + rows.map(r => r.join('\t')).join('\n') + '\n'); // BOM — 엑셀 한글 인코딩
console.log('keys:', rows.length - 1, '→', path.relative(ROOT, out));
const tones = rows.slice(1).reduce((a, r) => { a[r[3]] = (a[r[3]] || 0) + 1; return a; }, {});
console.log('tone 분포:', JSON.stringify(tones));
console.log('trigger 공백:', rows.slice(1).filter(r => !r[2]).length, '/', rows.length - 1);
