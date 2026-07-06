/* ============================================================
   경량 i18n (라이브러리 없음)
   - lang: 'ko' | 'en'
   - setLang(l): 언어 전환 (부팅 시 opts.lang 적용용)
   - t(id, vars): id 기반 문자열 조회 + {x} 치환
   - LN / LD / LT / LE: 데이터 테이블 병기 필드 표시 헬퍼
   - applyStaticI18n(): index.html 정적 텍스트(data-i18n) 치환
   three 임포트가 없으므로 node에서 바로 실행 가능하다.
============================================================ */

export let lang = 'ko';

// 앱 버전 — vite.config의 define(__APP_VER__)이 package.json version을 주입한다.
// (v0.9.1 하드코딩이 11번의 버전업 동안 방치됐던 실기기 신고 — 단일 출처로 교정)
// typeof 가드는 node 직실행(게이트 스크립트) 폴백.
const APP_VER = (typeof __APP_VER__ !== 'undefined') ? __APP_VER__ : 'dev';
// 빌드 스탬프(KST): 같은 버전 라벨로 웹 핫픽스가 하루 여러 번 나갈 때 "지금 무슨 빌드인지" 분간용 (디렉터 피드백 루프)
const BUILD_STAMP = (typeof __BUILD_STAMP__ !== 'undefined') ? __BUILD_STAMP__ : '';
// #74 Next Fest 데모 빌드 표기 — 버전줄에 DEMO 병기 (스샷·제보에서 정식판과 즉시 분간)
const DEMO_TAG = (typeof __DEMO__ !== 'undefined' && __DEMO__) ? ' · DEMO' : '';

export function setLang(l) {
  lang = (l === 'en') ? 'en' : 'ko';
  return lang;
}
export function isEn() { return lang === 'en'; }

// {key} 플레이스홀더 치환
function fill(str, vars) {
  if (vars == null) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/* ---- 데이터 테이블 병기 필드 헬퍼 ----
   영어 모드에서 obj.<field>En 이 있으면 그것을, 없으면 원본(한국어) 필드를 쓴다.
   → ko 모드는 항상 원본 그대로 (무변화 원칙). */
export function LF(obj, field) {
  if (!obj) return '';
  if (lang === 'en') {
    const en = obj[field + 'En'];
    if (en != null) return en;
  }
  return obj[field] ?? '';
}
export const LN = (obj) => LF(obj, 'name');     // name / nameEn
export const LD = (obj) => LF(obj, 'desc');     // desc / descEn
export const LT = (obj) => LF(obj, 'text');     // text / textEn
export const LL = (obj) => LF(obj, 'label');    // label / labelEn

export function t(id, vars) {
  const table = STR[id];
  if (table == null) return id; // 누락 시 id를 그대로 노출 (개발 중 잔여물 탐지에 유용)
  const s = (lang === 'en' && table.en != null) ? table.en : table.ko;
  return fill(s, vars);
}

// index.html: data-i18n="id" → textContent, data-i18n-title="id" → title, data-i18n-html="id" → innerHTML
export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang;
  }
}

/* ============================================================
   문자열 테이블 { id: { ko, en } }
============================================================ */
export const STR = {
  /* ── index.html 정적 ── */
  'doc.title':      { ko: 'Nine Winters', en: 'Nine Winters' },
  'title.continue': { ko: '▶ 이어하기', en: '▶ Continue' },
  'title.new':      { ko: '✚ 새 게임', en: '✚ New Game' },
  'title.load':     { ko: '💾 불러오기', en: '💾 Load' },
  'title.help':     { ko: '📖 생존 수첩', en: '📖 Survivor\'s Journal' },
  'title.ver':      { ko: `Nine Winters · v${APP_VER} Beta${DEMO_TAG}${BUILD_STAMP ? ` · ${BUILD_STAMP}` : ''}`, en: `Nine Winters · v${APP_VER} Beta${DEMO_TAG}${BUILD_STAMP ? ` · ${BUILD_STAMP}` : ''}` },
  'title.tools.export':  { ko: '세이브 내보내기', en: 'Export save' },
  'title.tools.import':  { ko: '세이브 가져오기', en: 'Import save' },
  'title.tools.settings':{ ko: '설정', en: 'Settings' },
  'intro.next':     { ko: '계속 ▸', en: 'Continue ▸' },
  'loading':        { ko: 'SHELTER LOADING . . .', en: 'SHELTER LOADING . . .' },
  'hud.shelter':    { ko: '🏚️ 셸터', en: '🏚️ Shelter' },
  'hud.stat':       { ko: '성공한 탐험 0회', en: '0 successful expeditions' },
  'g.hunger.title': { ko: '배고픔 — 클릭하면 음식을 먹습니다', en: 'Hunger — click to eat food' },
  'g.thirst.title': { ko: '갈증 — 클릭하면 물을 마십니다', en: 'Thirst — click to drink water' },
  'g.energy.title': { ko: '에너지 — 탐험마다 소모, 취침으로 회복', en: 'Energy — spent on expeditions, restored by sleep' },
  'btn.exp.title':    { ko: '탐험 (지도)', en: 'Expedition (map)' },
  'btn.move.title':   { ko: '이주', en: 'Relocate' },
  'btn.craft.title':  { ko: '제작대', en: 'Workbench' },
  'btn.clean.title':  { ko: '청소 (물 1 → 청결 +20)', en: 'Clean (water 1 → cleanliness +20)' },
  'btn.sleep.title':  { ko: '취침 — 내일 아침까지 자고 에너지 회복', en: 'Sleep — rest until morning and restore energy' },
  'btn.journal.title':{ ko: '일지 (도감·업적·통계)', en: 'Journal (collection · achievements · stats)' },
  'btn.help.title':   { ko: '생존 수첩 — 이전 거주자의 기록', en: 'Survivor\'s Journal — notes from the previous occupant' },
  'cam.rotl.title':   { ko: '시점 좌회전 (Q)', en: 'Rotate view left (Q)' },
  'cam.rotr.title':   { ko: '시점 우회전 (E)', en: 'Rotate view right (E)' },
  'cam.zin.title':    { ko: '줌 인', en: 'Zoom in' },
  'cam.zout.title':   { ko: '줌 아웃', en: 'Zoom out' },
  'cam.home.title':   { ko: '시점 초기화', en: 'Reset view' },
  'btn.pause.title':  { ko: '일시정지 (P)', en: 'Pause (P)' },
  'btn.gear.title':   { ko: '설정', en: 'Settings' },
  'pause.ind':        { ko: '⏸ 일시정지', en: '⏸ Paused' },
  'btn.cancelPlace':  { ko: '✖ 배치 취소', en: '✖ Cancel placement' },
  'exp.panel.title':  { ko: '■ 지역 탐험', en: '■ Regional Expedition' },
  'settings.title':   { ko: '⚙️ 환경설정', en: '⚙️ Settings' },
  'settings.tab.graphics': { ko: '그래픽', en: 'Graphics' },
  'settings.tab.sound':    { ko: '사운드', en: 'Sound' },
  'settings.tab.gameplay': { ko: '게임 플레이', en: 'Gameplay' },
  'settings.tab.controls': { ko: '컨트롤', en: 'Controls' },
  'settings.default':      { ko: '↺ 기본값', en: '↺ Defaults' },
  'settings.defaultDone':  { ko: '이 탭 설정을 기본값으로 되돌렸다.', en: 'Restored this tab to defaults.' },
  'settings.close':        { ko: '닫기', en: 'Close' },
  'ctrl.esc':        { ko: '환경설정 열기 / 닫기', en: 'Open / close settings' },
  'ctrl.pause':      { ko: '일시정지', en: 'Pause' },
  'ctrl.rotview':    { ko: '시점 회전 (좌 / 우)', en: 'Rotate view (left / right)' },
  'ctrl.rotate':     { ko: '가구 회전 (배치 중)', en: 'Rotate furniture (while placing)' },
  'ctrl.reclaim':    { ko: '선택한 가구 회수', en: 'Reclaim selected furniture' },
  'ctrl.tap':        { ko: '가구 선택 · 기능 사용', en: 'Select furniture · use function' },
  'ctrl.tap.k':      { ko: '탭', en: 'Tap' },
  'ctrl.drag':       { ko: '시점 회전 · 가구 이동(배치 모드)', en: 'Rotate view · move furniture (edit mode)' },
  'ctrl.drag.k':     { ko: '드래그', en: 'Drag' },
  'ctrl.pinch':      { ko: '줌 인 / 아웃', en: 'Zoom in / out' },
  'ctrl.pinch.k':    { ko: '핀치', en: 'Pinch' },
  'ctrl.reserved':    { ko: '(시스템 예약)', en: '(system-reserved)' },
  'ctrl.pressKey':    { ko: '키 입력 대기…', en: 'Press a key…' },
  'ctrl.rebindDefault': { ko: '↺ 기본 키', en: '↺ Default keys' },
  'ctrl.rebindDone':  { ko: '키를 저장했다.', en: 'Key binding saved.' },
  'ctrl.swap':        { ko: '교체', en: 'Swap' },
  'ctrl.swapConfirm': { ko: '{key} 키는 이미 "{from}"에 배정되어 있다. "{to}"와 서로 바꿀까?', en: 'The {key} key is already bound to "{from}". Swap it with "{to}"?' },
  'ctrl.mobileNote':  { ko: '터치 조작은 재설정 대상이 아닙니다.', en: 'Touch controls are not rebindable.' },
  'ctrl.act.map':        { ko: '탐험 지도', en: 'Expedition map' },
  'ctrl.act.migrate':    { ko: '이주', en: 'Migrate' },
  'ctrl.act.craft':      { ko: '제작대', en: 'Crafting' },
  'ctrl.act.clean':      { ko: '청소', en: 'Clean' },
  'ctrl.act.sleep':      { ko: '취침', en: 'Sleep' },
  'ctrl.act.journal':    { ko: '일지', en: 'Journal' },
  'ctrl.act.pause':      { ko: '일시정지', en: 'Pause' },
  'ctrl.act.editMode':   { ko: '배치 모드', en: 'Edit mode' },
  'ctrl.act.rotViewL':   { ko: '시점 회전 (좌)', en: 'Rotate view (left)' },
  'ctrl.act.rotViewR':   { ko: '시점 회전 (우)', en: 'Rotate view (right)' },
  'ctrl.act.rotateItem': { ko: '가구 회전', en: 'Rotate furniture' },
  'ctrl.act.reclaim':    { ko: '선택 가구 회수', en: 'Reclaim selected' },
  'acc.title':          { ko: '♿ 접근성', en: '♿ Accessibility' },
  'opt.fontscale':      { ko: '글자 크기', en: 'Font size' },
  'acc.font.normal':    { ko: '보통', en: 'Normal' },
  'acc.font.large':     { ko: '크게', en: 'Large' },
  'acc.font.max':       { ko: '최대', en: 'Largest' },
  'opt.colorblind':     { ko: '색약 팔레트', en: 'Colorblind palette' },
  'opt.colorblind.title': { ko: '게이지와 요구 표시의 초록/빨강을 파랑/주황으로 바꿉니다', en: 'Swaps green/red in gauges and requirement chips for blue/orange' },
  'opt.reducemotion':   { ko: '흔들림 · 깜빡임 감소', en: 'Reduce motion' },
  'opt.reducemotion.title': { ko: '게이지 깜빡임·배지 흔들림 등 반복 애니메이션을 멈춥니다', en: 'Stops looping animations like gauge blinking and badge pulsing' },
  'opt.pixel':        { ko: '픽셀 크기', en: 'Pixel size' },
  'opt.quant':        { ko: '색상 양자화', en: 'Color quantize' },
  'opt.dither':       { ko: '디더링', en: 'Dithering' },
  'opt.ceil':         { ko: '실내 조명', en: 'Indoor light' },
  'opt.autoeat':      { ko: '자동 섭취', en: 'Auto-eat' },
  'opt.autoeat.title':{ ko: '배고픔/갈증이 40 아래로 내려가면 자동으로 먹고 마십니다', en: 'Automatically eat and drink when hunger/thirst drops below 40' },
  'opt.fps':          { ko: 'FPS 제한', en: 'FPS cap' },
  'opt.lowspec':      { ko: '저사양 모드', en: 'Low-spec mode' },
  'opt.bgidle':       { ko: '백그라운드 소리', en: 'Background sound' },
  'opt.bgm':          { ko: 'BGM', en: 'BGM' },
  'opt.bgmvol':       { ko: '🔊 음량', en: '🔊 Volume' },
  'opt.sfxvol':       { ko: '🔔 효과음', en: '🔔 Sound FX' },
  'opt.lang':         { ko: '언어 / Language', en: 'Language / 언어' },
  'btn.saveExp':      { ko: '💾 내보내기', en: '💾 Export' },
  'btn.saveImp':      { ko: '📂 가져오기', en: '📂 Import' },
  'btn.reset':        { ko: '🚪 타이틀로', en: '🚪 To Title' },
  'sel.name':         { ko: '아이템', en: 'Item' },
  'btn.rotate':       { ko: '회전 (R)', en: 'Rotate (R)' },
  'btn.delete':       { ko: '회수 (Del)', en: 'Reclaim (Del)' },
  'modal.close':      { ko: '닫기', en: 'Close' },
  'lcd.sub':          { ko: '🌅 아침 · 🌤️', en: '🌅 Morning · 🌤️' },

  /* ── 언어 전환 확인 ── */
  'lang.confirm':     { ko: '언어를 바꾸면 게임을 다시 불러옵니다. 계속할까요?', en: 'Changing the language will reload the game. Continue?' },

  /* ── 위젯 모드 (Electron 전용) ── */
  /* ── 자동 진행 해금 안내 (Day 10, 1회) ── */
  'auto.unlocked.title': { ko: '🤖 자동 진행 해금', en: '🤖 Auto-Play Unlocked' },
  'auto.unlocked.body':  { ko: '열흘을 버텨냈다. 이제 몸이 루틴을 기억한다.<br><br>자동 진행을 켜면 매 정시마다 <b>치료 → 청소 → 최적 지역 탐험</b>을 알아서 처리한다. 우측의 🤖 버튼이나 설정에서 언제든 켜고 끌 수 있다.', en: 'Ten days survived. The routine lives in your hands now.<br><br>With auto-play on, every hour handles <b>treating → cleaning → the best expedition</b> for you. Toggle it anytime with the 🤖 button or in settings.' },
  'auto.unlocked.on':    { ko: '🤖 지금 켠다', en: '🤖 Turn it on now' },
  'auto.unlocked.toast': { ko: '🤖 자동 진행 시작 — 이제 거처가 스스로 굴러간다', en: '🤖 Auto-play on — the shelter runs itself now' },
  /* ── 인게임 확인창 버튼 (행동 동사 원칙) ── */
  'confirm.yes':      { ko: '그렇게 한다', en: 'Do it' },
  'confirm.no':       { ko: '그만둔다', en: 'Never mind' },
  'confirm.move':     { ko: '이주한다', en: 'Move' },
  'confirm.stay':     { ko: '남는다', en: 'Stay' },
  'confirm.depart':   { ko: '출발한다', en: 'Set out' },
  'confirm.delete':   { ko: '삭제한다', en: 'Delete' },
  'confirm.overwrite':{ ko: '덮어쓴다', en: 'Overwrite' },
  'confirm.cancel':   { ko: '취소', en: 'Cancel' },
  'confirm.change':   { ko: '바꾼다', en: 'Change' },
  'confirm.enable':   { ko: '켠다', en: 'Turn on' },
  'display.title':       { ko: '🖥️ 디스플레이', en: '🖥️ Display' },
  'opt.dispmode':        { ko: '화면 모드', en: 'Screen mode' },
  'disp.windowed':       { ko: '창 화면', en: 'Windowed' },
  'disp.fullscreen':     { ko: '전체화면', en: 'Fullscreen' },
  'disp.borderless':     { ko: '창없는 전체화면', en: 'Borderless fullscreen' },
  'opt.dispres':         { ko: '해상도', en: 'Resolution' },
  'disp.apply':          { ko: '✓ 적용', en: '✓ Apply' },
  'disp.applied':        { ko: '🖥️ 디스플레이 설정 적용됨', en: '🖥️ Display settings applied' },
  'widget.title':        { ko: '🪟 위젯 모드', en: '🪟 Widget Mode' },
  'widget.opacity':       { ko: '투명도', en: 'Opacity' },
  'widget.alwaysontop':   { ko: '항상 위', en: 'Always on top' },
  'widget.mini':          { ko: '미니 창', en: 'Mini window' },
  'widget.clickthrough':  { ko: '클릭 통과', en: 'Click-through' },
  'widget.clickthrough.title': { ko: '켜면 게임 조작이 불가능해집니다. 해제는 트레이/작업표시줄에서 하세요.', en: 'While on, you cannot interact with the game. Turn it off from the tray/taskbar.' },
  'widget.clickthrough.confirm': { ko: '클릭 통과를 켜면 마우스 조작이 게임을 그대로 통과합니다. 10초 후 안전을 위해 자동으로 꺼집니다. 계속할까요?', en: 'Turning on click-through lets mouse clicks pass through the game. It will auto-disable after 10 seconds for safety. Continue?' },
  'widget.clickthrough.toast': { ko: '10초 후 클릭 통과가 자동으로 해제됩니다', en: 'Click-through will auto-disable in 10 seconds' },
  'widget.clickthrough.restored': { ko: '클릭 통과가 자동으로 해제되었습니다', en: 'Click-through has been auto-disabled' },

  /* ── 시간대 라벨 (timeLabel) ── */
  'time.night': { ko: '밤',   en: 'Night' },
  'time.dawn':  { ko: '새벽', en: 'Dawn' },
  'time.morning':{ ko: '아침', en: 'Morning' },
  'time.day':   { ko: '낮',   en: 'Day' },
  'time.evening':{ ko: '저녁', en: 'Evening' },
  'time.dusk':  { ko: '황혼', en: 'Dusk' },

  /* ── 인트로 ── */
  'intro.start': { ko: '▶ 시작하기', en: '▶ Begin' },
  'intro.0': {
    ko: '세상이 무너진 지 3년, 겨울의 끝자락.\n녹다 만 눈이 갈라진 도로 틈에 남아 있고,\n그 틈으로 이른 봄풀이 고개를 내밀었다.',
    en: 'Three years since the world fell, at the tail end of winter.\nHalf-melted snow still clings to the cracked roads,\nwhere early spring grass has just begun to push through.',
  },
  'intro.1': {
    ko: '당신은 살아남았다.\n그리고 깨달았다 —\n살아남는 것만으로는 부족하다는 걸.',
    en: 'You survived.\nAnd then you realized —\nsurviving alone is not enough.',
  },
  'intro.2': {
    ko: '황무지 한가운데, 버려진 컨테이너 하나.\n오늘부터 여기가 당신의 집이다.\n\n폐허 속에서, 나만의 집을.',
    en: 'In the middle of the wasteland, one abandoned container.\nFrom today, this is your home.\n\nA home of my own, amid the ruins.',
  },
  'intro.firstShelter': { ko: '📦 버려진 컨테이너 — 당신의 첫 거처입니다', en: '📦 Abandoned Container — your first shelter' },

  /* ── 엔딩 ── */
  'ending.line0': {
    ko: '헬리콥터의 굉음이 잦아들고,<br>박사는 말없이 당신의 집을 한참 바라보았다.',
    en: 'As the roar of the helicopter faded,<br>the scientist gazed silently at your home for a long while.',
  },
  'ending.line1': {
    ko: '"{day}일... 정말 그 세월을<br>여기서 살아냈단 말입니까."',
    en: '"{day} days... you truly lived out<br>all those years here?"',
  },
  'ending.line2': {
    ko: '당신은 마지막으로 집을 돌아보았다.<br>손때 묻은 가구들, 창가의 불빛, 벽의 흠집 하나까지.',
    en: 'You looked back at your home one last time.<br>The well-worn furniture, the light by the window, every scratch on the wall.',
  },
  'ending.line2cat': {
    ko: '<br><br>고양이가 당연하다는 듯 당신의 품에 뛰어올랐다.<br>함께 간다.',
    en: '<br><br>The cat leapt into your arms as if it were the most natural thing.<br>It comes with you.',
  },
  'ending.line3': {
    ko: '폐허는 점점 작아졌다.<br><br>그러나 저 집은 — 분명, 당신의 집이었다.',
    en: 'The ruins grew smaller and smaller.<br><br>But that home — it was, without a doubt, yours.',
  },
  'ending.line4': {
    ko: '🚁 <b>ENDING — 폐허 너머로</b><br><br><span style="font-size:12px;color:var(--text-dim)">생존 {day}일 · 탐험 성공 {succ}회{cat}</span>',
    en: '🚁 <b>ENDING — Beyond the Ruins</b><br><br><span style="font-size:12px;color:var(--text-dim)">Survived {day} days · {succ} successful expeditions{cat}</span>',
  },
  'ending.catTag':  { ko: ' · 고양이와 함께 🐈', en: ' · together with the cat 🐈' },
  'ending.back':    { ko: '🏠 폐허로 돌아간다 (계속하기)', en: '🏠 Return to the ruins (continue)' },
  'ending.note':    { ko: '🚁 당신은 구조를 경험했지만, 결국 집으로 돌아왔다.', en: '🚁 You were rescued, yet in the end you returned home.' },
  'ending.epilogue':{ ko: '🏠 에필로그 — 당신은 이 폐허의 집을 선택했다', en: '🏠 Epilogue — you chose this home among the ruins' },

  /* ── 공용 toast / 상태 ── */
  'toast.needResource':   { ko: '자원이 부족합니다', en: 'Not enough resources' },
  'toast.needMaterial':   { ko: '재료가 부족합니다', en: 'Not enough materials' },
  'toast.exhausted':      { ko: '탈진 상태입니다 — 먹고 마셔야 움직일 수 있습니다', en: 'You are exhausted — eat and drink before you can move' },
  'toast.tooTired':       { ko: '⚡ 너무 지쳤습니다 — 🛌 취침으로 회복하세요', en: '⚡ Too tired — 🛌 sleep to recover' },
  'toast.expLimit':       { ko: '오늘은 이미 {n}번 나갔다 왔습니다 — 🛌 쉬어야 합니다', en: 'You have already been out {n} times today — 🛌 you must rest' },
  // #88 탐험 피로 — 한도 소진 시 강제 취침 대신 안내만. 밤을 새우면 취침 회복 페널티가 커진다.
  'exp.fatigue':          { ko: '몸이 납덩이 같습니다 — 오늘은 일찍 눕는 게 좋겠습니다', en: 'Dead tired — better turn in early tonight' },
  'toast.emptySlot':      { ko: '빈 슬롯입니다', en: 'Empty slot' },
  'none':                 { ko: '없음', en: 'None' },
  'free':                 { ko: '무료', en: 'free' },
  'current':              { ko: '(현재)', en: '(current)' },

  /* ── 취침 ── */
  'sleep.cantDuringExp':  { ko: '탐험에서 돌아오기 전엔 잘 수 없습니다', en: "You can't sleep until you return from the expedition" },
  'sleep.noteBed':        { ko: '😴 침대에서 푹 잤습니다. (에너지 {e})', en: '😴 Slept soundly in the bed. (energy {e})' },
  'sleep.noteFloor':      { ko: '😴 바닥에서 웅크리고 잤습니다. (에너지 {e})', en: '😴 Curled up and slept on the floor. (energy {e})' },
  'sleep.autoBed':        { ko: '😴 지쳐 곯아떨어졌다... 침대에서 아침을 맞았다 (⚡{e})', en: '😴 Collapsed from exhaustion... woke in the bed to morning (⚡{e})' },
  'sleep.autoFloor':      { ko: '😴 지쳐 곯아떨어졌다... 바닥에서 아침을 맞았다 (⚡{e})', en: '😴 Collapsed from exhaustion... woke on the floor to morning (⚡{e})' },
  'sleep.wakeBed':        { ko: '😴 침대에서 푹 잤다 — 아침이 밝았다 (⚡{e})', en: '😴 Slept soundly in the bed — morning has come (⚡{e})' },
  'sleep.wakeFloor':      { ko: '😴 바닥에서 웅크리고 잤다 — 아침이 밝았다 (⚡{e})', en: '😴 Curled up on the floor — morning has come (⚡{e})' },
  'day.napMorning':       { ko: '😴 결국 졸음을 이기지 못했다 — 눈을 뜨니 아침이다 (⚡{e})', en: "😴 Sleep finally won — you wake and it's morning (⚡{e})" },
  'day.expNight':         { ko: '🌒 밤새 폐허를 뒤졌다 — 동틀 녘에야 돌아왔다', en: '🌒 You scavenged through the night — back only at first light' },
  /* v1.2.0 취침 자율화 — 05시 쓰러짐 전용 문구(무방비 톤) + 취침 확인창 */
  'sleep.noteCollapse':   { ko: '😵 결국 쓰러지듯 잠들었다 — 눈을 뜨니 아침이다 (⚡{e})', en: "😵 Finally collapsed into sleep — waking, it's already morning (⚡{e})" },
  'sleep.collapse':       { ko: '😵 새벽까지 버티다 쓰러지듯 잠들었다 (⚡{e})', en: '😵 Held out till dawn, then collapsed into sleep (⚡{e})' },
  'sleep.confirm':        { ko: '지금 자면 에너지가 {cur} → {to}로 회복됩니다. 잘까요?', en: 'Sleeping now restores energy {cur} → {to}. Turn in?' },
  'sleep.confirmYes':     { ko: '잔다', en: 'Sleep' },

  /* ── 먹기/마시기 ── */
  'eat.noFood':    { ko: '음식이 없습니다 — 주거지역을 탐험하세요', en: 'No food — explore the residential district' },
  'eat.full':      { ko: '아직 배부릅니다', en: 'Still full' },
  'eat.done':      { ko: '🍎 식사했습니다 (+45)', en: '🍎 Had a meal (+45)' },
  'eat.doneCanned':{ ko: '🥫 통조림으로 식사했습니다 (+45)', en: '🥫 Had a meal of canned food (+45)' },
  'drink.noWater': { ko: '깨끗한 물이 없습니다', en: 'No clean water' },
  'drink.full':    { ko: '목마르지 않습니다', en: 'Not thirsty' },
  'drink.done':    { ko: '💧 물을 마셨습니다 (+45)', en: '💧 Drank water (+45)' },

  /* ── 일시정지 차단 ── */
  'pause.blocked': { ko: '일시정지 중입니다', en: 'Game is paused' },

  /* ── 자동 진행 모드 (v0.9.1) ── */
  'opt.autoplay':       { ko: '자동 진행', en: 'Auto-play' },
  'opt.autoplay.title': { ko: 'Day 10부터 사용 가능 — 치료·청소·탐험을 자동으로 처리합니다', en: 'Available from Day 10 — automatically handles treatment, cleaning, and expeditions' },
  'opt.autoplay.locked':{ ko: 'Day 10부터', en: 'From Day 10' },
  'auto.treat':   { ko: '🤖 [자동] {name}을(를) 치료했습니다', en: '🤖 [Auto] Treated {name}' },
  'auto.clean':   { ko: '🤖 [자동] 셸터를 청소했습니다', en: '🤖 [Auto] Cleaned the shelter' },
  'auto.depart':  { ko: '🤖 [자동] {emoji} {name}{josa} 탐험을 떠났습니다', en: '🤖 [Auto] Departed for {emoji} {name}' },
  'auto.locked':  { ko: 'Day 10부터 사용 가능', en: 'Unlocks on Day 10' },
  'auto.on':      { ko: '🤖 자동 진행 켜짐', en: '🤖 Auto-play on' },
  'auto.off':     { ko: '🤖 자동 진행 꺼짐', en: '🤖 Auto-play off' },
  'btn.auto.title': { ko: '자동 진행 (Day 10+)', en: 'Auto-play (Day 10+)' },
  'btn.edit.title': { ko: '배치 모드 — 가구 이동/회수', en: 'Arrange mode — move/reclaim furniture' },
  'edit.on':  { ko: '🔧 배치 모드 — 가구를 옮기고 회수할 수 있다', en: '🔧 Arrange mode — you can move and reclaim furniture' },
  'edit.off': { ko: '배치 모드 해제', en: 'Arrange mode off' },

  /* ── 드래그 패널 제목 ── */
  'panel.collapse':   { ko: '접기/펼치기', en: 'Collapse / expand' },
  'panel.hud':        { ko: '거점', en: 'Base' },
  'panel.exp':        { ko: '탐험', en: 'Expedition' },
  'panel.render':     { ko: '설정', en: 'Settings' },
  'panel.clock':      { ko: '시계', en: 'Clock' },
  'panel.res':        { ko: '자원', en: 'Resources' },

  /* ── 날씨 변화 / 회전 / 회수 ── */
  'weather.changed':  { ko: '날씨가 {name}{josa} 바뀌었습니다', en: 'The weather turned to {name}' },
  'rotate.noSpace':   { ko: '회전할 공간이 없어요', en: 'No room to rotate' },
  'drop.child':       { ko: '{emoji} {name}이(가) 자리를 잃어 회수되었습니다', en: '{emoji} {name} lost its spot and was reclaimed' },

  /* ── 청소 ── */
  'clean.already':   { ko: '이미 깨끗합니다', en: 'Already clean' },
  'clean.tooTired':  { ko: '⚡ 너무 지쳐서 청소할 힘이 없습니다', en: '⚡ Too tired to clean' },
  'clean.needWater': { ko: '깨끗한 물이 필요합니다 (💧1)', en: 'You need clean water (💧1)' },
  'clean.done':      { ko: '🧹 청소 완료 — 청결도 {n} (💧물 -1)', en: '🧹 Cleaned — cleanliness {n} (💧water -1)' },
  'clean.note':      { ko: '셸터를 청소했습니다. (+20)', en: 'Cleaned the shelter. (+20)' },

  /* ── 세이브 파일 ── */
  'save.corrupt':      { ko: '⚠️ 세이브가 손상되어 어제 백업으로 복구했습니다', en: '⚠️ Save was corrupted — restored from yesterday’s backup' },
  'err.global':        { ko: '⚠️ 오류가 발생했지만 세이브는 안전합니다', en: '⚠️ An error occurred, but your save is safe' },
  'save.exportNone':   { ko: '내보낼 세이브가 없습니다', en: 'No save to export' },
  'save.exported':     { ko: '💾 세이브 파일을 내보냈습니다', en: '💾 Save file exported' },
  'save.invalidFile':  { ko: '올바른 세이브 파일이 아닙니다', en: 'Not a valid save file' },
  'save.overwrite':    { ko: '슬롯 {n}(현재)의 세이브를 덮어쓸까요?', en: 'Overwrite the save in slot {n} (current)?' },
  'save.failed':       { ko: '저장에 실패했습니다', en: 'Failed to save' },
  'save.done':         { ko: '💾 저장 완료 (슬롯 {n})', en: '💾 Saved (slot {n})' },
  'btn.saveNow':       { ko: '💾 저장', en: '💾 Save' },
  'btn.saveNow.title': { ko: '지금 저장 — 로비에서 이 세이브를 불러올 수 있습니다', en: 'Save now — this save can be loaded from the lobby' },

  /* ── 슬롯 모달 ── */
  'slot.new':         { ko: '✚ 새 게임 — 슬롯 선택', en: '✚ New Game — choose a slot' },
  'slot.load':        { ko: '💾 불러오기', en: '💾 Load' },
  'slot.empty':       { ko: '빈 슬롯', en: 'Empty slot' },
  'slot.del.title':   { ko: '세이브 삭제', en: 'Delete save' },
  'slot.delConfirm':  { ko: '슬롯 {n}의 세이브를 삭제할까요? 되돌릴 수 없습니다.', en: 'Delete the save in slot {n}? This cannot be undone.' },
  'slot.newConfirm':  { ko: '슬롯 {n}의 기존 세이브를 덮어쓰고 새로 시작할까요?', en: 'Overwrite the existing save in slot {n} and start anew?' },
  'slot.meta':        { ko: '탐험 성공 {succ}회 · 저장 {saved}', en: '{succ} successful expeditions · saved {saved}' },
  'title.continueInfo':{ ko: '슬롯 {slot} · Day {day} {sicon} · {semoji} {sname}', en: 'Slot {slot} · Day {day} {sicon} · {semoji} {sname}' },
  'slot.hardBadge.title': { ko: '하드 모드', en: 'Hard mode' },

  /* ── 난이도 모드 선택 (v0.9.2) ── */
  'mode.pick.title':  { ko: '어떤 겨울을 살아갈까', en: 'Choose Your Winter' },
  'mode.normal':      { ko: '🌿 노말', en: '🌿 Normal' },
  'mode.normal.tag':  { ko: '폐허에도 온기는 남아 있다', en: 'Warmth still lingers in the ruins' },
  'mode.normal.desc': { ko: '표준 밸런스. 느긋하게 셸터를 가꾸는 코지 생존.', en: 'Standard balance. Cozy survival at your own pace.' },
  'mode.hard':        { ko: '🔥 하드', en: '🔥 Hard' },
  'mode.hard.tag':    { ko: '폐허는 아무것도 거저 주지 않는다', en: 'The ruins give nothing for free' },
  'mode.hard.desc':   { ko: '탐험 전리품 −30% · 배고픔/갈증 소모 +50% · 한파가 더 잦다. 첫 겨울이 진짜 시험이 된다.', en: 'Expedition loot −30% · hunger/thirst drain +50% · cold snaps strike more often. The first winter becomes a real test.' },
  'mode.zen':         { ko: '♾️ 무한', en: '♾️ Endless' },
  'mode.zen.tag':     { ko: '끝도, 재촉도 없다 — 폐허의 시간은 당신 것이다', en: 'No end, no rush — the ruins keep your hours' },
  'mode.zen.desc':    { ko: '노말 밸런스에 넉넉한 시작 물자. 자동 진행이 처음부터 열려 있다. 느긋한 방치에 최적.', en: 'Normal balance with a generous start. Auto-play unlocked from day one. Made for idling.' },
  'mode.back':        { ko: '◂ 뒤로', en: '◂ Back' },
  'slot.zenBadge.title': { ko: '무한 모드', en: 'Endless mode' },
  /* ── 배치 D: 하드코어 · 배경화면 모드 ── */
  'mode.hardcore':      { ko: '💀 하드코어', en: '💀 Hardcore' },
  'mode.hardcore.tag':  { ko: '폐허는 두 번 묻지 않는다', en: 'The ruins do not bury you twice' },
  'mode.hardcore.desc': { ko: '하드 밸런스 그대로, 구제는 없다. 문 앞의 꾸러미도 헬기의 소리도 오지 않는다. 온기는 오직 손수 지핀 것뿐.', en: 'Hard balance, and no rescue. No parcel at the door, no sound of a helicopter. The only warmth is what you kindle yourself.' },
  'mode.wallpaper':      { ko: '🖼️ 배경화면', en: '🖼️ Wallpaper' },
  'mode.wallpaper.tag':  { ko: '살아남기 없이, 살아보기', en: 'To dwell, without surviving' },
  'mode.wallpaper.desc': { ko: '자원은 무한(∞), 셸터는 전부 열려 있다. 게이지도 겨울의 압박도 없이 배치와 꾸미기만 남는다. 계절과 날씨는 그저 흐른다 — 꾸민 집을 바탕화면에 켜두기 좋다.', en: 'Resources endless (∞), every shelter open. No gauges, no winter pressure — only placing and decorating. Seasons and weather simply drift by; a home to leave glowing on your desktop.' },
  'mode.wallpaper.lock': { ko: '노말 모드로 {n}일을 살아본 사람의 것이다.', en: 'It belongs to those who have lived {n} days in Normal.' },
  'mode.wallpaper.lockToast': { ko: '노말 모드 {n}일을 넘긴 뒤에 열린다.', en: 'Opens after passing day {n} in Normal.' },
  'slot.hardcoreBadge.title': { ko: '하드코어 모드', en: 'Hardcore mode' },
  'slot.wallpaperBadge.title': { ko: '배경화면 모드', en: 'Wallpaper mode' },
  'slot.endedTag':    { ko: '끝난 기록', en: 'closed record' },
  'wallpaper.noAction': { ko: '배경화면 모드에서는 탐험을 나서지 않는다.', en: 'In Wallpaper mode, no one heads out to scavenge.' },

  /* ── 배치 D: 무력 구제 (노말/하드 1회) ── */
  'rescue.parcel.title': { ko: '문 앞의 꾸러미', en: 'A Parcel at the Door' },
  'rescue.parcel.body':  { ko: '아침, 문 앞에 낡은 상자가 놓여 있었다. 누가 두고 갔는지는 알 수 없다.\n안에는 며칠을 버틸 만한 것들. 쪽지도, 이름도 없다.\n\n끝내 만나지 못한 누군가가, 딱 한 번 이쪽의 온기를 대신 지펴 주었다.', en: 'At dawn, a worn box sat by the door. No telling who left it.\nInside, enough to last a few days. No note, no name.\n\nSomeone you never met kindled this warmth, just once, in your place.' },
  'rescue.parcel.note':  { ko: '🎁 문 앞에 누가 꾸러미를 두고 갔다.', en: '🎁 Someone left a parcel at the door.' },
  'rescue.heli.title':   { ko: '먼 프로펠러 소리', en: 'A Far-off Rotor' },
  'rescue.heli.body':    { ko: '지붕 너머로 프로펠러 소리가 지나갔다. 곧 낙하산 하나가 눈밭에 내려앉는다.\n헬기는 멈추지 않았다. 다만 보급 상자 하나를 남기고 갔다.\n\n스치듯 지나간 온기가, 딱 한 번 이쪽을 붙들어 주었다.', en: 'A rotor passed beyond the roof. Soon a single chute settles onto the snow.\nThe helicopter never stopped. It left one supply crate behind.\n\nA warmth that only grazed you held you up, just once.' },
  'rescue.heli.note':    { ko: '🚁 헬기가 보급 상자를 떨어뜨리고 갔다.', en: '🚁 A helicopter dropped a supply crate.' },

  /* ── 배치 D: 런 종료 · 끝난 기록 (GD-THESIS §4.5) ── */
  'ended.title':        { ko: '마지막 페이지', en: 'The Last Page' },
  'ended.page1':        { ko: '여기까지 기록이 남아 있다.\n\n펜이 멈춘 자리에서, 하루가 조용히 닫혔다. 이 집이 품었던 온기는, 기록으로 남는다.', en: 'The record reaches this far.\n\nWhere the pen stopped, a day quietly closed. The warmth this home once held stays on, as a record.' },
  'ended.summaryTitle': { ko: '그 겨울들의 기록', en: 'A Record of Those Winters' },
  'ended.summary':      { ko: 'Day {day}까지 살았다.\n넘긴 겨울 ❄️ {winters}\n모은 기록 {collected}가지{cat}', en: 'Lived until Day {day}.\nWinters passed ❄️ {winters}\nRecords gathered: {collected}{cat}' },
  'ended.summary.cat':  { ko: '\n난롯가에 고양이 한 마리', en: '\nA cat by the hearth' },
  'ended.toTitle':      { ko: '기록은 슬롯에 남는다.', en: 'The record remains in its slot.' },

  /* ── 배치 D: 전체 수거 ── */
  'inv.collectAll':       { ko: '전체 수거', en: 'Collect All' },
  'inv.collectAll.title': { ko: '놓인 가구 {n}개를 전부 거둔다.', en: 'Gather all {n} placed pieces.' },
  'inv.collectAll.none':  { ko: '거둘 가구가 없다.', en: 'Nothing placed to gather.' },
  'reclaimAll.confirm':   { ko: '가구 {n}개를 전부 거둔다.', en: 'Gather all {n} pieces.' },
  'reclaimAll.ok':        { ko: '전부 거둔다', en: 'Gather all' },
  'reclaimAll.cancel':    { ko: '그만둔다', en: 'Leave them' },
  'reclaimAll.done':      { ko: '📦 가구 {n}개를 인벤토리로 거뒀다.', en: '📦 Gathered {n} pieces into inventory.' },
  'reclaimAll.applianceOff': { ko: '가전 {n}대의 효과가 멈췄다.', en: '{n} appliances stopped running.' },
  'shelter.leftover':     { ko: '이 집에 놓인 가구 {n}개는 옮겨도 인벤토리에 남는다.', en: 'The {n} pieces here stay in inventory when you move.' },

  /* ── 지도 / 탐험 ── */
  // 수사 의문·지시조 안내문 금지 — UI는 어포던스로 스스로 읽혀야 한다 (2026-07-05 디렉터 지침)
  'map.title':        { ko: '🗺️ 탐험 지도', en: '🗺️ Expedition Map' },
  'map.pick':         { ko: '', en: '' },
  // #85 그려지는 발견
  'map.sketchInfo':   { ko: '아직 가 보지 않았다 — 소문뿐이다. 다녀오면 지도에 잉크로 남는다.', en: 'Not yet visited — rumors only. Come back and it stays in ink.' },
  'map.visits':       { ko: '다녀옴 ×{n}', en: 'Visited ×{n}' },
  'map.home':         { ko: '내 거처', en: 'Home' },
  'map.go':           { ko: '🎒 준비하고 출발', en: '🎒 Prepare and depart' },
  'map.riskLine':     { ko: '위험 {risk} · 이동 포함 <b>{dur}</b> (거리 ×{mult}) · {wicon} {wname}{forecast}', en: 'Risk {risk} · incl. travel <b>{dur}</b> (distance ×{mult}) · {wicon} {wname}{forecast}' },
  'dur.min':          { ko: '{n}분', en: '{n} min' },
  'dur.h':            { ko: '{h}시간', en: '{h}h' },
  'dur.hm':           { ko: '{h}시간 {m}분', en: '{h}h {m}m' },
  'map.regionLine':   { ko: '{emoji} <b>{pct}%</b> {name} — {desc}', en: '{emoji} <b>{pct}%</b> {name} — {desc}' },
  'forecast.prefix':  { ko: ' · 📻 {text}', en: ' · 📻 {text}' },
  'forecast.tomorrowSame': { ko: '내일도 {icon} {name}', en: 'Tomorrow: still {icon} {name}' },
  'forecast.tomorrowChange':{ ko: '내일 날씨 변동 예상', en: 'Weather expected to change tomorrow' },

  /* ── 준비 모달 ── */
  'prep.title':       { ko: '{emoji} {name} 탐험 준비', en: '{emoji} {name} — Expedition Prep' },
  'prep.base':        { ko: '기본 성공률 {pct}%', en: 'Base success {pct}%' },
  'prep.shelter':     { ko: '거처 +{pct}%', en: 'Shelter +{pct}%' },
  'prep.district':    { ko: '위치 +{pct}%', en: 'Location +{pct}%' },
  'prep.comfort':     { ko: '쾌적함 +{pct}%', en: 'Comfort +{pct}%' },
  'prep.gear':        { ko: '장비 +{pct}%', en: 'Gear +{pct}%' },
  'prep.buff':        { ko: '✨ {label} {sign}{pct}%', en: '✨ {label} {sign}{pct}%' },
  'prep.weatherPen':  { ko: '날씨 -{pct}%', en: 'Weather -{pct}%' },
  'prep.injuryPen':   { ko: '부상 -{pct}%', en: 'Injury -{pct}%' },
  'prep.hungryPen':   { ko: '허기 -{pct}%', en: 'Hunger -{pct}%' },
  'prep.event':       { ko: '이벤트', en: 'event' },
  'prep.rateLine':    { ko: '{emoji} <b>{pct}%</b> · {lines}', en: '{emoji} <b>{pct}%</b> · {lines}' },
  'prep.riskLine':    { ko: '위험도: {risk} · 소요 {dur}{sprain}{mobile} · {wicon} {wname}{forecast}', en: 'Risk: {risk} · takes {dur}{sprain}{mobile} · {wicon} {wname}{forecast}' },
  'prep.sprainTag':   { ko: ' <span style="color:var(--bad)">(염좌 +30%)</span>', en: ' <span style="color:var(--bad)">(sprain +30%)</span>' },
  'prep.mobileTag':   { ko: ' <span style="color:var(--good)">(이동형 -25%)</span>', en: ' <span style="color:var(--good)">(mobile -25%)</span>' },
  'prep.expectCost':  { ko: '예상 소비: {cost}', en: 'Expected use: {cost}' },
  'prep.depart':      { ko: '🎒 출발 ({dur})', en: '🎒 Depart ({dur})' },
  'prep.needFor':     { ko: '{name} 준비에 필요한 자원이 부족합니다', en: 'Not enough resources to prepare {name}' },

  /* ── 탐험 진행 / 결과 ── */
  'exp.start':        { ko: '{emoji} {name} 탐험 시작 — 성공률 {pct}%', en: '{emoji} {name} expedition started — success {pct}%' },
  'exp.inProgress':   { ko: '{emoji} {name} 탐험 중...', en: '{emoji} {name} — exploring...' },
  'exp.timeLeft':     { ko: '돌아오기까지 {d}', en: 'back in {d}' },
  'exp.openMap':      { ko: '🗺️ 탐험 지도 열기', en: '🗺️ Open expedition map' },
  'exp.successTitle': { ko: '✅ {name} 탐험 성공!', en: '✅ {name} expedition succeeded!' },
  'exp.successBody':  { ko: '쓸 만한 물자를 찾아냈습니다.', en: 'You found some useful supplies.' },
  'exp.partialTitle': { ko: '⚠️ {name} — 겨우 빠져나왔다', en: '⚠️ {name} — you barely made it out' },
  'exp.partialBody':  { ko: '위험했지만 조금은 건졌습니다.', en: 'It was risky, but you salvaged a little.' },
  'exp.failTitle':    { ko: '❌ {name} 탐험 실패', en: '❌ {name} expedition failed' },
  'exp.failBody':     { ko: '빈손으로 돌아왔습니다.', en: 'You came back empty-handed.' },
  'exp.failSalvageBody':{ ko: '실패했지만, 뱃사람의 근성으로 몇 가지는 건져 왔습니다.', en: 'A failure, but with a sailor’s grit you brought a few things back.' },
  'exp.note.loot2':   { ko: '📡 방송의 좌표가 정확했다 — 은닉처에서 자원을 두 배로 회수했습니다!', en: '📡 The broadcast’s coordinates were true — you recovered double the supplies from the cache!' },
  'exp.note.furniture':{ ko: '🛋️ 폐허 속에서 온전한 가구를 발견했습니다 — 흔치 않은 행운!', en: '🛋️ You found an intact piece of furniture in the ruins — a rare stroke of luck!' },
  'exp.note.rooftopSalvage':{ ko: '📡 옥탑방의 시야 덕분에 가구를 건졌습니다.', en: '📡 Thanks to the rooftop’s vantage, you salvaged a piece of furniture.' },
  'exp.note.shipSalvage':{ ko: '🎣 구명창고 특성 — 실패에도 자원 일부를 회수했습니다.', en: '🎣 Lifeboat locker trait — recovered some supplies even in failure.' },
  'exp.note.dirty5':  { ko: '🧹 흙투성이로 돌아와 청결도가 떨어졌습니다. (-5)', en: '🧹 You came back covered in dirt and cleanliness dropped. (-5)' },
  'exp.note.firstaid':{ ko: '⛑️ 응급키트 덕분에 깊은 상처를 가벼운 부상으로 막았습니다.', en: '⛑️ The first-aid kit turned a deep wound into a minor injury.' },
  'exp.note.gloves':  { ko: '🧤 장갑 덕분에 다치지 않았습니다.', en: '🧤 The gloves kept you from getting hurt.' },
  'exp.note.wet3':    { ko: '{icon} 젖은 채로 돌아와 청결도가 떨어졌습니다. (-3)', en: '{icon} You came back soaked and cleanliness dropped. (-3)' },
  'exp.unlock':       { ko: '<div style="margin-top:10px;color:var(--accent)">🔓 새로운 거처 발견: <b>{emoji} {name}</b> — [🏠 이주] 메뉴에서 이동할 수 있습니다!</div>', en: '<div style="margin-top:10px;color:var(--accent)">🔓 New shelter discovered: <b>{emoji} {name}</b> — relocate via the [🏠 Relocate] menu!</div>' },
  'exp.usedPrep':     { ko: '사용한 준비물: {list}', en: 'Prep used: {list}' },
  'exp.confirmRisky': { ko: '성공률 {p}%. 그래도 출발할까요?', en: 'Success rate {p}%. Depart anyway?' },
  /* ── 탐험 인과문 (#29 Living Shelter) — 건조한 생존 문체, 조건부 최대 2줄 ── */
  'exp.cause.injured':   { ko: '🩹 다친 몸이 내내 발목을 잡았다.', en: '🩹 The injury dragged at you the whole way.' },
  'exp.cause.coldsnap':  { ko: '🥶 얼어붙은 손이 좀처럼 말을 듣지 않았다.', en: '🥶 Frozen fingers barely obeyed you.' },
  'exp.cause.flashlight':{ ko: '🔦 손전등으로 어두운 구석까지 뒤질 수 있었다.', en: '🔦 The flashlight let you search every dark corner.' },
  'exp.cause.raincoat':  { ko: '{icon} 우의가 궂은 날씨를 대신 맞아 주었다.', en: '{icon} The raincoat took the worst of the weather for you.' },
  'exp.cause.bottle':    { ko: '🥤 물병 덕분에 목이 타들어 가진 않았다.', en: '🥤 The water bottle kept your throat from burning dry.' },
  'exp.cause.canned':    { ko: '🥫 통조림으로 허기를 눌러 두고 버텼다.', en: '🥫 Canned rations held the hunger back.' },

  /* ── 부상 ── */
  'injury.applied':   { ko: '{icon} <b>{name}</b>을(를) 입었습니다 — 탐험 성공률 -{pen}%p, 자연 회복까지 약 {h}시간(게임).', en: '{icon} You suffered <b>{name}</b> — expedition success -{pen}%p, ~{h}h (game) until natural recovery.' },
  'injury.needCure':  { ko: '치료 재료가 부족합니다 ({cost})', en: 'Not enough treatment materials ({cost})' },
  'injury.treated':   { ko: '{icon} {name} 치료 완료 ({cost} 사용)', en: '{icon} {name} treated ({cost} used)' },
  'injury.treatedNote':{ ko: '{name} 치료 완료.', en: '{name} treated.' },
  'injury.recovered': { ko: '{icon} {name}이(가) 자연 회복되었습니다', en: '{icon} {name} healed on its own' },
  'injury.card':      { ko: '<span class="i-name">{icon} {name}</span> — 탐험 성공률 -{pen}%p{time}<br>자연 회복까지 약 <span id="injury-eta">{h}</span> (휴식)', en: '<span class="i-name">{icon} {name}</span> — expedition success -{pen}%p{time}<br>~<span id="injury-eta">{h}</span> until natural recovery (rest)' },
  'injury.card.time': { ko: ', 탐험 시간 +30%', en: ', expedition time +30%' },
  'injury.treat':     { ko: '💊 치료 ({cost})', en: '💊 Treat ({cost})' },
  'injury.tip':       { ko: '{name} 치료 재료: {cost}', en: '{name} treatment: {cost}' },

  /* ── 이주 ── */
  'move.needSupplies':{ ko: '이주 물자가 부족합니다 — {cost}', en: 'Not enough supplies to relocate — {cost}' },
  'move.renovNote':   { ko: '🔧 {name} 정비 완료 ({cost})', en: '🔧 {name} refit complete ({cost})' },
  'move.journeyNote': { ko: '🚶 {name}{josa} 이동 — 여정에 3시간이 걸렸습니다.', en: '🚶 Traveled to {name} — the journey took 3 hours.' },
  'move.done':        { ko: '{emoji} {name}{josa} 이주했습니다{journey}', en: 'Relocated to {emoji} {name}{journey}' },
  'move.journeyTag':  { ko: ' (여정 3시간)', en: ' (3h journey)' },
  'move.confirmFurniture':{ ko: '배치된 가구 {n}개는 이 거처에 남습니다. 이주할까요?', en: 'Your {n} placed furnishings will stay behind. Move anyway?' },
  'move.newShelter':  { ko: '🏠 새 거처 발견 — 이주 지도를 확인하자', en: '🏠 New shelter found — check the relocation map' },
  'move.badge.title': { ko: '이주 가능한 거처가 있습니다', en: 'A shelter is ready to relocate to' },
  'edit.enterAsk':    { ko: '{name} — 옮기거나 회수하려면 배치 모드가 필요하다.', en: '{name} — you need placement mode to move or reclaim it.' },
  'edit.enterYes':    { ko: '🔧 배치 모드 켜기', en: '🔧 Enter placement mode' },
  'edit.enterNo':     { ko: '닫기', en: 'Close' },
  'edit.enterHint':   { ko: '🔧 배치 모드에서 옮길 수 있다', en: '🔧 You can move it in placement mode' },

  /* ── 거처 모달 ── */
  'shelter.modalTitle':{ ko: '🗺️ 구역과 거처', en: '🗺️ Districts & Shelters' },
  'shelter.intro':    { ko: '같은 구역 안에서는 자유롭게 오갑니다. 하지만 <b>다른 구역으로 이주하려면 물자(🥫1+💧1)와 시간(3시간)</b>이 듭니다. 처음 들어가는 거처는 <b>정비 자원</b>이 필요합니다. 배치한 가구는 각 거처에 남고 인벤토리는 함께 씁니다.', en: 'You can move freely within a district, but <b>relocating to another district costs supplies (🥫1+💧1) and time (3h)</b>. Moving into a shelter for the first time requires <b>refit resources</b>. Placed furniture stays with each shelter; your inventory is shared.' },
  'shelter.districtHeader':{ ko: '{emoji} <b>{name}</b>{here}<span style="font-size:10px"> · {bonus}</span><br><span style="font-size:10px;color:var(--text-dim)">{desc}</span>', en: '{emoji} <b>{name}</b>{here}<span style="font-size:10px"> · {bonus}</span><br><span style="font-size:10px;color:var(--text-dim)">{desc}</span>' },
  'shelter.hereTag':  { ko: ' — 현재 구역', en: ' — current district' },
  'shelter.unrefit':  { ko: ' <span style="color:var(--text-dim);font-size:10px">(미정비)</span>', en: ' <span style="color:var(--text-dim);font-size:10px">(unrefit)</span>' },
  'shelter.locked':   { ko: '탐험 성공 {need}회 달성 시 발견 (현재 {cur}회)', en: 'Discovered after {need} successful expeditions (currently {cur})' },
  'shelter.baseComfort':{ ko: '기본 쾌적함 +{n} · 유지비: {upkeep}', en: 'Base comfort +{n} · upkeep: {upkeep}' },
  'shelter.moveCost': { ko: '이주 비용: {parts}', en: 'Relocation cost: {parts}' },
  'shelter.refitPart':{ ko: '🔧 정비 {cost}', en: '🔧 Refit {cost}' },
  'shelter.journeyPart':{ ko: '🚶 여정 🥫1+💧1 · 3시간', en: '🚶 Journey 🥫1+💧1 · 3h' },
  'shelter.moveRefit':{ ko: '정비 후 이주', en: 'Refit & move' },
  'shelter.move':     { ko: '이주', en: 'Move' },
  'shelter.noCostNeed':{ ko: '자원 부족: {cost}', en: 'Not enough: {cost}' },
  'shelter.reqLabel': { ko: '필요 물자 (보유/필요)', en: 'Required (have / need)' },
  'upkeep.none':      { ko: '없음', en: 'none' },

  /* ── 제작대 ── */
  'craft.title':      { ko: '🔨 제작대', en: '🔨 Workbench' },
  'craft.intro':      { ko: '탐험에서 모은 재료로 물자와 가구를 만듭니다.', en: 'Craft supplies and furniture from materials gathered on expeditions.' },
  'craft.modHeader':  { ko: '🔧 거처 개조 — {emoji} {name}', en: '🔧 Shelter Modifications — {emoji} {name}' },
  'craft.modIntro':   { ko: '개조는 이 거처에 영구 설치됩니다.', en: 'Modifications are permanently installed in this shelter.' },
  'craft.noMods':     { ko: '이 거처에 설치할 수 있는 개조가 없습니다.', en: 'No modifications available for this shelter.' },
  'craft.make':       { ko: '제작', en: 'Craft' },
  'craft.installed':  { ko: '✓ 설치됨', en: '✓ Installed' },
  'craft.install':    { ko: '설치', en: 'Install' },
  'craft.doneRes':    { ko: '{emoji} {name} ×{n} 제작 완료', en: '{emoji} {name} ×{n} crafted' },
  'craft.doneFurn':   { ko: '{emoji} {name} 제작 완료 — 인벤토리에 추가', en: '{emoji} {name} crafted — added to inventory' },
  // #86④ 의류 제작·옷장 (라벨은 keep-all 조판 대상 — 짧게)
  'craft.doneOutfit': { ko: '🧥 {name} 완성 — 바로 갈아입었다', en: '🧥 {name} finished — worn right away' },
  'craft.owned':      { ko: '✓ 옷장에 있음', en: '✓ In wardrobe' },
  'btn.wardrobe.title': { ko: '옷장 — 만든 옷을 갈아입는다', en: 'Wardrobe — change into crafted clothes' },
  'wardrobe.title':   { ko: '옷장', en: 'Wardrobe' },
  'wardrobe.hint':    { ko: '옷은 제작대에서 천으로 짓는다. 화면 속 나를 눌러도 이 창이 열린다.', en: 'Clothes are sewn from cloth at the bench. Tapping yourself in the scene opens this too.' },
  'wardrobe.wear':    { ko: '입기', en: 'Wear' },
  'wardrobe.wearing': { ko: '✓ 입는 중', en: '✓ Wearing' },
  'wardrobe.worn':    { ko: '🧥 {name} — 갈아입었다', en: '🧥 Changed into {name}' },
  'wardrobe.locked':  { ko: '아직 없다 — 제작대에서', en: 'Not yet — see the bench' },
  'craft.noteRes':    { ko: '🔨 제작: {name}', en: '🔨 Crafted: {name}' },
  'craft.modDone':    { ko: '{emoji} {name} 설치 완료!', en: '{emoji} {name} installed!' },
  'craft.modNote':    { ko: '🔧 거처 개조: {name} 설치', en: '🔧 Shelter mod: installed {name}' },

  /* ── 일지 ── */
  'journal.title':    { ko: '📖 생존 일지', en: '📖 Survival Journal' },
  'journal.statsTitle':{ ko: '통계', en: 'Statistics' },
  'journal.statsLine':{ ko: 'Day {day} {sicon} · 탐험 {exp}회 (성공 {succ}) · 제작 {craft}회 · 연속 거주 {stay}일', en: 'Day {day} {sicon} · {exp} expeditions ({succ} succeeded) · {craft} crafts · {stay} days settled' },
  'journal.colTitle': { ko: '도감 — 배치해 본 가구 색상 {n}/{total}', en: 'Collection — furniture colors placed {n}/{total}' },
  'journal.achTitle': { ko: '업적 {n}/{total}', en: 'Achievements {n}/{total}' },
  /* ── 꾸미기 (#13 벽지/바닥재/테마 세트) ── */
  'deco.header':    { ko: '🎨 꾸미기 — 벽지 · 바닥재', en: '🎨 Decorate — Wallpaper & Flooring' },
  'deco.intro':     { ko: '지금 머무는 거처의 벽과 바닥을 바꾼다. 거처마다 따로 기억된다.', en: 'Change the walls and floor of this shelter. Remembered per shelter.' },
  'deco.wall':      { ko: '벽지', en: 'Wallpaper' },
  'deco.floor':     { ko: '바닥재', en: 'Flooring' },
  'deco.free':      { ko: '무료', en: 'Free' },
  'deco.noWall':    { ko: '유리 벽엔 벽지를 바를 곳이 없다. 바닥재는 얼마든지.', en: 'Glass walls leave nowhere for wallpaper. The floor is fair game.' },
  'deco.applied':   { ko: '🎨 {name} 적용', en: '🎨 Applied {name}' },
  'deco.themeHeader':{ ko: '🏅 테마 세트', en: '🏅 Theme Sets' },
  'deco.themeBonus': { ko: '분위기 +{n}', en: 'Ambience +{n}' },
  'deco.themeDone':  { ko: '완성 ✓', en: 'Complete ✓' },
  'deco.themeTodo':  { ko: '미완성', en: 'Incomplete' },
  'deco.themeBadgeTitle': { ko: '테마 세트 {n}/{total}', en: 'Theme Sets {n}/{total}' },
  'comfort.log.theme': { ko: '테마 세트', en: 'Theme set' },
  /* ── 쾌적함 4요소 (#29 Living Shelter) ── */
  'comfort.breakdownTitle': { ko: '쾌적함 {score} — 무엇이 이 집을 살 만하게 하는가', en: 'Comfort {score} — what makes this place livable' },
  'comfort.warmth':   { ko: '온기', en: 'Warmth' },
  'comfort.clean':    { ko: '청결', en: 'Cleanliness' },
  'comfort.security': { ko: '안정감', en: 'Security' },
  'comfort.mood':     { ko: '분위기', en: 'Ambience' },
  'comfort.log.heater':    { ko: '온풍기 가동', en: 'Space heater running' },
  'comfort.log.cat':       { ko: '고양이의 온기', en: 'A cat\'s warmth' },
  'comfort.log.cold':      { ko: '외풍이 스민다', en: 'A cold draft seeps in' },
  'comfort.log.coldsnap':  { ko: '한파에 노출됨', en: 'Exposed to the cold snap' },
  'comfort.log.cleanState':{ ko: '청소한 지 며칠 ({n})', en: 'Days since cleaning ({n})' },
  'comfort.log.base':      { ko: '지붕이 있다는 것', en: 'A roof over your head' },
  'comfort.log.shelter':   { ko: '거처의 견고함', en: 'The shelter holds' },
  'comfort.log.settled':   { ko: '정든 집 {n}일', en: 'Settled in {n} days' },
  'comfort.log.injury':    { ko: '몸이 성치 않다', en: 'Body worn down' },
  'comfort.log.furn':      { ko: '가구가 채운 공간', en: 'Furniture fills the room' },
  'comfort.log.dark':      { ko: '어둠이 짙다', en: 'Too dark in here' },
  'ach.unlocked':     { ko: '🏆 업적 달성 — {icon} {name}', en: '🏆 Achievement unlocked — {icon} {name}' },
  'ach.note':         { ko: '🏆 업적: {name}', en: '🏆 Achievement: {name}' },

  /* ── 이벤트 결과 공용 ── */
  'event.metNote':    { ko: '{icon} {title} — 만남이 있었다.', en: '{icon} {title} — an encounter.' },
  'event.stolen':     { ko: '어두운 틈을 타 <b>{name} 1개</b>를 도둑맞았다.<br>밤에는 조명을 켜두는 게 좋겠다.', en: 'Under cover of darkness, <b>1 {name}</b> was stolen.<br>Best to keep a light on at night.' },
  'event.minimize':   { ko: '⌄ 잠시 내려두기', en: '⌄ Set aside' },
  'event.chip.title': { ko: '내려둔 이벤트 — 클릭해서 다시 열기', en: 'Set-aside event — click to reopen' },

  /* ── 배치 / 회수 / 전원 ── */
  'place.noStock':    { ko: '{name} 재고가 없습니다 — 🎒 탐험으로 획득하세요', en: 'No {name} in stock — 🎒 obtain it on an expedition' },
  'place.maxItems':   { ko: '{shelter}에는 가구를 {n}개까지만 놓을 수 있습니다', en: 'The {shelter} holds at most {n} pieces of furniture' },
  'place.cantHere':   { ko: '그 자리엔 놓을 수 없어요', en: 'You can’t place it there' },
  'inv.place':        { ko: '{name} 배치하기', en: 'Place {name}' },
  'inv.getByExp':     { ko: '탐험으로 획득하세요', en: 'Obtain it on an expedition' },
  'reclaim.utilityOff':{ ko: '{name} 회수 — {effect} 중단', en: '{name} reclaimed — {effect} stopped' },
  'reclaim.eff.fridge':{ ko: '부패 방지', en: 'spoilage prevention' },
  'reclaim.eff.water':{ ko: '물 생산', en: 'water production' },
  'reclaim.eff.power':{ ko: '전력 공급', en: 'power supply' },
  'power.on':         { ko: '🔆 켜짐 — 끄기', en: '🔆 On — turn off' },
  'power.off':        { ko: '🌑 꺼짐 — 켜기', en: '🌑 Off — turn on' },
  'power.fuelLine':   { ko: '{emoji} {name} {have}개 보유 · 켜두면 1일 1개 소비 {status}', en: '{emoji} {name} ×{have} · consumes 1/day while on {status}' },
  'power.empty':      { ko: '<span style="color:var(--bad)">(잔량 없음!)</span>', en: '<span style="color:var(--bad)">(none left!)</span>' },
  'power.lasts':      { ko: '({n}일 유지 가능)', en: '(lasts {n} days)' },
  'power.turnedOn':   { ko: '{name}을(를) 켰습니다', en: 'Turned on {name}' },
  'power.turnedOff':  { ko: '{name}을(를) 껐습니다 — 쾌적함 보너스 제외', en: 'Turned off {name} — comfort bonus removed' },

  /* ── HUD ── */
  'hud.shelterLine':  { ko: '{demoji} {dname} · {semoji} {sname}', en: '{demoji} {dname} · {semoji} {sname}' },
  'hud.comfortTip':   { ko: '쾌적함 {score}점 = 가구 {furn} + 조명 {light} + 청결 {clean} + 거처 {shelter}{settled}{cat}{injury}{limit}{bonus}', en: 'Comfort {score} = furniture {furn} + light {light} + cleanliness {clean} + shelter {shelter}{settled}{cat}{injury}{limit}{bonus}' },
  'hud.comfortSettled':{ ko: ' + 정든 집 {n}', en: ' + settled home {n}' },
  'hud.comfortCat':   { ko: ' + 고양이 {n}', en: ' + cat {n}' },
  'hud.comfortInjury':{ ko: ' + 상태 {n}', en: ' + condition {n}' },
  'hud.comfortLimit': { ko: ' + 제약 {n}', en: ' + penalty {n}' },
  'hud.comfortBonus': { ko: ' → 탐험 +{n}%', en: ' → expedition +{n}%' },
  'hud.cleanTip':     { ko: '청결도 — 🧹 청소로 회복', en: 'Cleanliness — restore with 🧹 cleaning' },
  'hud.expTip':       { ko: '오늘 탐험 {n}/{max}회 (5회면 자동 취침)', en: 'Expeditions today {n}/{max} (auto-sleep at 5)' },
  'hud.succTip':      { ko: '탐험 성공 누적', en: 'Total successful expeditions' },
  'gauge.exhausted':  { ko: ' 탈진!', en: ' Exhausted!' },

  /* ── 클럭 ── */
  'clock.dayLine':    { ko: 'DAY {day} · {sicon} {sname} {sd}/{total}', en: 'DAY {day} · {sicon} {sname} {sd}/{total}' },

  /* ── 계절 전환 ── */
  'season.arrived':   { ko: '{icon} {name}이 왔습니다 — {desc}.', en: '{icon} {name} has arrived — {desc}.' },
  'season.changed':   { ko: '{icon} 계절이 바뀌었습니다: {name}', en: '{icon} The season has turned: {name}' },

  /* ── 정든 집 ── */
  'settled.3':        { ko: '🕯️ 이 집이 조금씩 편안해집니다. (정든 집 +3)', en: '🕯️ This home grows more comfortable. (settled +3)' },
  'settled.8':        { ko: '🏡 이제 여기가 진짜 집처럼 느껴집니다. (정든 집 +8, 최대)', en: '🏡 Now it truly feels like home. (settled +8, max)' },

  /* ── 하루 처리 노트 ── */
  'day.genRun':       { ko: '⚡ 발전기 가동 — 오늘 배터리 소비가 무료입니다. (연료 -1)', en: '⚡ Generator running — battery use is free today. (fuel -1)' },
  'day.genStop':      { ko: '⚠️ 연료 부족 — 발전기가 멈췄습니다.', en: '⚠️ Out of fuel — the generator stopped.' },
  'day.fuelOut':      { ko: '⚠️ {fuel} 부족 — {name}이(가) 꺼졌습니다.', en: '⚠️ Out of {fuel} — {name} turned off.' },
  'day.purifier':     { ko: '🚰 정수기가 깨끗한 물을 만들었습니다. (+1)', en: '🚰 The purifier produced clean water. (+1)' },
  'day.autopurifier': { ko: '⛲ 자동 급수기가 물을 끌어올렸습니다. (+{n})', en: '⛲ The auto water station drew up water. (+{n})' },
  'day.gardenFrozen': { ko: '❄️ 겨울 — 텃밭이 얼어 수확이 없습니다.', en: '❄️ Winter — the garden is frozen; no harvest.' },
  'day.produce':      { ko: '{note} ({emoji}+{n})', en: '{note} ({emoji}+{n})' },
  'day.foodSpoiled':  { ko: '🍎 냉장고가 없어 신선식품이 상했습니다. (-1)', en: '🍎 Without a fridge, fresh food spoiled. (-1)' },
  'day.foodSpoiledSummer': { ko: '🍎 여름 더위에 신선식품이 더 빨리 상했습니다.', en: '🍎 In the summer heat, fresh food spoiled faster.' },
  'day.foodFresh':    { ko: '🧊 냉장고 덕분에 음식이 신선하게 보관됐습니다.', en: '🧊 Thanks to the fridge, food stayed fresh.' },
  'day.seaDamp':      { ko: '💧 바다의 습기로 셸터가 눅눅해집니다.', en: '💧 Sea damp leaves the shelter clammy.' },
  'day.openWet':      { ko: '{icon} 노천 거처가 비바람에 그대로 젖었습니다.', en: '{icon} The open-air shelter was soaked by the weather.' },
  'day.roofRepair':   { ko: '🔧 악천후 — 건축재 1로 지붕을 보수했습니다.', en: '🔧 Bad weather — repaired the roof with 1 material.' },
  'day.roofLeak':     { ko: '⚠️ 건축재가 없어 빗물이 새어 들어옵니다! (청결 -8)', en: '⚠️ No material — rainwater leaks in! (cleanliness -8)' },
  'day.rooftopRain':  { ko: '🌧️ 옥상 빗물받이에 깨끗한 물이 모였습니다. (+{n})', en: '🌧️ The rooftop catchment collected clean water. (+{n})' },
  'day.raincatch':    { ko: '🪣 빗물받이에 물이 모였습니다. (+1)', en: '🪣 The rain barrel collected water. (+1)' },
  'day.bigraincatch': { ko: '🛢️ 대형 빗물받이에 물이 그득히 고였습니다. (+{n})', en: '🛢️ The large rain catch filled up with water. (+{n})' },
  'day.gardenBoxFrozen':{ ko: '🌱 텃밭 상자가 얼어 수확이 없습니다.', en: '🌱 The garden box is frozen; no harvest.' },
  'day.gardenBox':    { ko: '🌱 텃밭 상자에서 수확했습니다. (+1)', en: '🌱 Harvested from the garden box. (+1)' },
  'day.solar':        { ko: '🔆 태양광 패널이 배터리를 충전했습니다. (+1)', en: '🔆 The solar panel charged a battery. (+1)' },
  'day.veryDirty':    { ko: '🧹 셸터가 매우 더럽습니다. 청소가 필요합니다.', en: '🧹 The shelter is very dirty. It needs cleaning.' },
  'day.upkeepPaid':   { ko: '🏠 거처 유지비 지불 ({emoji}{name} -{n})', en: '🏠 Shelter upkeep paid ({emoji}{name} -{n})' },
  'day.upkeepUnpaid': { ko: '⚠️ 유지비({label}) 미납 — 거처 쾌적함 보너스가 꺼졌습니다.', en: '⚠️ Upkeep unpaid ({label}) — shelter comfort bonus is off.' },
  'day.infectWorse':  { ko: '🤒 상처를 방치해 감염 위험으로 악화되었습니다.', en: '🤒 The neglected wound worsened into an infection risk.' },
  'day.catHint':      { ko: '🐈 어디선가 가냘픈 울음소리가 들려온다...', en: '🐈 A faint mew drifts in from somewhere...' },
  'day.catPrints':    { ko: '🐾 문 앞 눈밭에 작은 발자국이 찍혀 있다. 밤새 무언가 다녀갔다.', en: '🐾 Small paw prints dot the snow by the door. Something passed through in the night.' },
  'day.cat0':         { ko: '🐈 고양이가 창가에서 하루 종일 볕을 쬐었습니다.', en: '🐈 The cat basked by the window all day.' },
  'day.cat1':         { ko: '🐈 고양이가 문 앞에 쥐 한 마리를 놓아두었습니다. 선물인 모양입니다.', en: '🐈 The cat left a mouse at the door. A gift, it seems.' },
  'day.cat2':         { ko: '🐈 고양이가 침대 한가운데를 차지하고 잤습니다. 당신은 구석에서.', en: '🐈 The cat claimed the middle of the bed. You slept in the corner.' },
  'day.cat3':         { ko: '🐈 고양이가 어디선가 실뭉치를 물어 와 밤새 굴리며 놀았습니다.', en: '🐈 The cat found a ball of yarn and batted it around all night.' },
  'day.catJoined':    { ko: '🐈 고양이가 함께 살게 되었습니다.', en: '🐈 The cat has come to live with you.' },
  'day.catHungry':    { ko: '🐈 고양이가 배고파합니다... (먹이가 없어 쾌적 보너스가 멈췄습니다)', en: '🐈 The cat looks hungry... (no food — its comfort bonus has paused)' },

  /* ── 결산 리포트 ── */
  'report.title':     { ko: '📋 Day {day} 결산', en: '📋 Day {day} Report' },
  'report.gain':      { ko: '획득', en: 'Gained' },
  'report.spend':     { ko: '소비', en: 'Spent' },
  'report.notes':     { ko: '기록', en: 'Log' },
  'report.warn':      { ko: '⚠️ 바닥난 자원: {list}', en: '⚠️ Depleted: {list}' },
  'report.forecast':  { ko: '📻 예보: {text}', en: '📻 Forecast: {text}' },
  'report.noForecast':{ ko: '내일 날씨는 알 수 없습니다. (라디오를 배치하면 예보를 들을 수 있습니다)', en: 'Tomorrow’s weather is unknown. (Place a radio to hear forecasts.)' },
  'report.winterPrep':{ ko: '❄️ 겨울까지 {n}일 — 연료 {fuel} · 보존식 {canned} 권장', en: '❄️ {n} days to winter — recommended fuel {fuel} · preserved food {canned}' },
  /* ── 아침 브리핑 (#29 Living Shelter) ── */
  'brief.title':      { ko: '오늘', en: 'Today' },
  'brief.coldNow':    { ko: '🥶 한파가 몰아친다. 벽 틈으로 찬바람이 든다.', en: '🥶 A cold snap rages. Wind bites through the cracks.' },
  'brief.coldDefended':{ ko: '🔥 한파가 이어지지만, 난방이 버텨 주고 있다.', en: '🔥 The cold snap holds, but your heating is holding too.' },
  'brief.coldSoon':   { ko: '📻 한파가 {n}일 뒤 닥친다.', en: '📻 A cold snap hits in {n} days.' },
  'brief.winter':     { ko: '❄️ 겨울이다. 열량과 연료가 빠르게 준다.', en: '❄️ It is winter. Calories and fuel drain fast.' },
  'brief.winterSoon': { ko: '🍂 겨울까지 {n}일 남았다.', en: '🍂 {n} days until winter.' },
  'brief.advice.cold':      { ko: '단열 개조와 난로/온풍기를 켜 한파를 막아라.', en: 'Insulate and fire up the stove/heater against the cold.' },
  'brief.advice.winterPrep':{ ko: '연료와 보존식을 겨울 몫만큼 비축해 두어라.', en: 'Stockpile fuel and preserved food for the winter.' },
  'brief.advice.shortage':  { ko: '바닥난 자원을 채워라: {list}', en: 'Restock what ran out: {list}' },
  'brief.advice.calm':      { ko: '오늘은 창밖이 고요하다. 집을 돌볼 여유가 있다.', en: 'All quiet outside today. Time to tend the shelter.' },
  /* ── 한파 (겨울 보스) ── */
  'coldsnap.forecast':{ ko: '📻 한파가 온다 — {n}일 뒤. 단열과 난방을 준비하세요.', en: '📻 A cold snap is coming — in {n} days. Ready your insulation and heating.' },
  'coldsnap.hit':     { ko: '❄️ 한파가 닥쳤습니다. 기온이 뚝 떨어졌습니다.', en: '❄️ A cold snap has hit. The temperature plunged.' },
  'coldsnap.toast':   { ko: '❄️ 한파 시작', en: '❄️ Cold snap begins' },
  'coldsnap.exposed': { ko: '🥶 찬바람이 벽 틈으로 파고들었습니다. 배고픔이 빨리 도집니다.', en: '🥶 The cold wind bites through the cracks. Hunger sets in fast.' },
  'coldsnap.defended':{ ko: '🔥 난로 곁에서 한파를 버텨냈습니다.', en: '🔥 You weathered the cold snap by the stove.' },
  'coldsnap.ended':   { ko: '🌤️ 한파가 물러갔습니다.', en: '🌤️ The cold snap has passed.' },

  /* ── Nine Winters(#11): 겨울을 넘기다 ── */
  'winter.passed':    { ko: '❄️ {n}번째 겨울을 넘겼습니다.', en: '❄️ You made it through winter number {n}.' },
  'winter.badge.tip': { ko: '넘긴 겨울 {n}번', en: '{n} winters weathered' },
  'title.continueWinters': { ko: ' · ❄️{n}/9', en: ' · ❄️{n}/9' },
  // ── #74 Next Fest 데모 「첫 번째 겨울」 종료 화면 ──
  'demo.end.title':  { ko: '첫 번째 겨울을 넘었습니다', en: 'You Made It Through the First Winter' },
  'demo.end.body':   { ko: '{d}일. 봄이 왔고, 나는 아직 여기 있다.<br>데모는 여기까지입니다.', en: 'Day {d}. Spring came, and I\'m still here.<br>This is where the demo ends.' },
  'demo.end.sub':    { ko: '정식판에는 아홉 번의 겨울이 기다립니다 — 열두 곳의 거처, 지하 노선, 봉쇄 너머의 이야기. 위시리스트에 담아 두면 겨울이 올 때 알려 드립니다.', en: 'Nine winters await in the full game — twelve shelters, the metro line, and what lies beyond the blockade. Wishlist it and we\'ll let you know when winter comes.' },
  'demo.end.back':   { ko: '타이틀로', en: 'Back to Title' },
  'demo.end.locked': { ko: '데모는 첫 번째 겨울까지 — 이 이야기는 정식판에서 이어집니다.', en: 'The demo ends after the first winter — the story continues in the full game.' },
  // "그 해 겨울" 자동 수첩 페이지
  'winter.page.title':{ ko: '{n}번째 겨울', en: 'Winter №{n}' },
  'winter.page.title.first': { ko: '첫 겨울', en: 'The First Winter' }, // n=1 전용(규칙 이탈 "1번째 겨울" 교정)
  // 땔감 단위 명시("{fuel}개를")로 조사 오류 원천 해소.
  'winter.page.body': { ko: '거처에서 {days}일을 버텼다.<br>한파 {cold}번, 그중 {defended}일은 막아냈다.<br>탐험으로 {exp}번 무언가를 건졌다.<br>땔감 {fuel}개를 태웠다.<br>{cat}<br><br>{closing}',
                        en: 'Held out {days} days in the shelter.<br>{cold} cold snaps, {defended} of them held off.<br>Brought something back {exp} times.<br>Burned {fuel} fuel.<br>{cat}<br><br>{closing}' },
  // 탐험 0회 겨울: 기계문("0번 건졌다") 대신 나서지 못한 겨울을 서술.
  'winter.page.body.noexp': { ko: '거처에서 {days}일을 버텼다.<br>한파 {cold}번, 그중 {defended}일은 막아냈다.<br>탐험은 나서지 못한 겨울이었다.<br>땔감 {fuel}개를 태웠다.<br>{cat}<br><br>{closing}',
                        en: 'Held out {days} days in the shelter.<br>{cold} cold snaps, {defended} of them held off.<br>It was a winter you never set out to explore.<br>Burned {fuel} fuel.<br>{cat}<br><br>{closing}' },
  'winter.memoir.catYes': { ko: '고양이가 곁에 있었다.', en: 'The cat stayed close.' },
  'winter.memoir.catNo':  { ko: '혼자였다.', en: 'You were alone.' },
  // 겨울 번호별 마무리 1줄 (건조한 생존 문체, 번역투 금지)
  'winter.memoir.1':  { ko: '첫 겨울은 그저 견디는 것이었다.', en: 'The first winter was just about lasting.' },
  'winter.memoir.2':  { ko: '두 번째 겨울. 이번엔 준비가 있었다.', en: 'A second winter. This time you were ready for it.' },
  'winter.memoir.3':  { ko: '세 번째. 추위가 언제 오는지 몸이 먼저 안다.', en: 'The third. Your body knows the cold before it comes now.' },
  'winter.memoir.4':  { ko: '네 번째 겨울. 버티는 게 아니라 사는 것에 가까워졌다.', en: 'A fourth winter. Less enduring now, closer to living.' },
  'winter.memoir.5':  { ko: '다섯 번째. 눈 내리는 소리가 더는 무섭지 않다.', en: 'The fifth. The sound of falling snow no longer frightens you.' },
  'winter.memoir.6':  { ko: '여섯 번째 겨울. 이 자리에 익숙해졌다.', en: 'A sixth winter. This place has become familiar.' },
  'winter.memoir.7':  { ko: '일곱 번째. 겨울도 이제 지나가는 계절일 뿐이다.', en: 'The seventh. Winter is just a season that passes now.' },
  'winter.memoir.8':  { ko: '여덟 번째 겨울. 여기는 버티는 곳이 아니라 집이다.', en: 'An eighth winter. This isn\'t a place you endure — it\'s home.' },
  'winter.memoir.9':  { ko: '아홉 번째 겨울. 제목이 약속한 그 겨울이다.', en: 'The ninth winter. The one the title promised.' },
  'winter.memoir.beyond': { ko: '또 한 번의 겨울. 약속했던 아홉을 이미 넘었다.', en: 'Another winter. You are already past the nine you were promised.' },
  // 아홉 번째 겨울 특별 페이지 (통산 총결산)
  'winter.ninth.title': { ko: '아홉 번째 겨울 — 그리고 당신은 여전히 여기에 있다', en: 'Nine Winters — And You Are Still Here' },
  'winter.ninth.body':  { ko: '아홉 번의 겨울을 넘겼다.<br><br>Day {day}까지 살아남았다.<br>탐험 {exp}번을 성공했고, {craft}번을 만들었다.<br>{cat}<br><br>이 게임의 제목은 이제 지나간 시간이 되었다.',
                          en: 'Nine winters, all weathered.<br><br>You survived to Day {day}.<br>Succeeded on {exp} expeditions, crafted {craft} things.<br>{cat}<br><br>The title of this game is now behind you.' },
  // 박사 첫 무전 이벤트
  'ev.doctor.title':  { ko: '지직거리는 무전', en: 'A Crackling Transmission' },
  'ev.doctor.text':   { ko: '한밤중, 라디오가 저 혼자 지직거린다. 잡음 사이로 사람의 목소리가 끊겼다 이어진다.<br><br>"…들리는가. …9년을 버틴 신호를 봤다. 우리는 아직 관측하고 있다. — Dr. ___"',
                        en: 'Deep in the night, the radio crackles on its own. Between the static, a human voice cuts in and out.<br><br>"…do you read me. …we saw the signal that held nine years. We are still watching. — Dr. ___"' },
  'ev.doctor.c0':     { ko: '무전을 오래 들었다', en: 'You listen for a long while' },
  'ev.doctor.r0':     { ko: '목소리는 다시 잡음에 묻혔다. 하지만 누군가 당신을 보고 있었다.', en: 'The voice sinks back into static. But someone had been watching you.' },
  'report.tip.bandage':{ ko: '붕대가 없습니다 — 주거지역에서 구할 수 있습니다.', en: 'You have no bandages — find them in the residential district.' },
  'report.tip.water': { ko: '깨끗한 물이 없습니다 — 청소와 치료에 필요합니다.', en: 'You have no clean water — needed for cleaning and treatment.' },
  'report.tip.battery':{ ko: '벙커 전력용 배터리가 없습니다 — 상업지구를 탐험하세요.', en: 'No batteries for shelter power — explore the commercial district.' },
  'report.tip.clean': { ko: '청결도가 낮습니다 — 🧹 청소로 쾌적함을 회복하세요.', en: 'Cleanliness is low — 🧹 clean to restore comfort.' },

  /* ── 튜토리얼 ── */
  'help.title':       { ko: '🎓 튜토리얼', en: '🎓 Tutorial' },
  'help.exp.t':       { ko: '탐험', en: 'Expeditions' },
  'help.exp.b':       { ko: '지도에서 지역 선택 → 준비물 챙기면 성공률↑. 하루 5회, 다녀오면 시간이 흐릅니다.', en: 'Pick a region on the map → gear up to raise success. 5/day; time passes when you return.' },
  'help.survive.t':   { ko: '생존', en: 'Survival' },
  'help.survive.b':   { ko: '게이지 클릭 = 먹기/마시기/취침. ⚡가 없으면 🛌 자야 합니다. 침대가 있으면 푹 잡니다.', en: 'Click a gauge = eat/drink/sleep. Out of ⚡ means 🛌 sleep. A bed gives deeper rest.' },
  'help.craft.t':     { ko: '제작', en: 'Crafting' },
  'help.craft.b':     { ko: '가구는 파밍이 아니라 제작이 기본. 재료(천·부품·건축재)를 탐험으로 모으세요.', en: 'Furniture is mainly crafted, not scavenged. Gather materials (cloth, parts, building material) on expeditions.' },
  'help.comfort.t':   { ko: '쾌적함', en: 'Comfort' },
  'help.comfort.b':   { ko: '가구·조명·청결·정든 집이 쾌적함을 만들고, 탐험 성공률과 회복 속도를 올립니다.', en: 'Furniture, light, cleanliness and a settled home build comfort, raising expedition success and recovery speed.' },
  'help.shelter.t':   { ko: '거처', en: 'Shelters' },
  'help.shelter.b':   { ko: '구역마다 특성·유지비·제약이 다릅니다. 개조(빗물받이·텃밭...)로 자급자족.', en: 'Each district has its own traits, upkeep and limits. Modify (rain catch, garden...) for self-sufficiency.' },
  'help.time.t':      { ko: '세월', en: 'Seasons' },
  'help.time.b':      { ko: '날씨는 며칠 단위, 계절은 12일 주기. 겨울을 대비해 비축하세요. 저장은 자동.', en: 'Weather shifts over days; seasons cycle every 12 days. Stockpile for winter. Saving is automatic.' },
  'help.camera':      { ko: '<b>카메라</b>: <kbd>우클릭 드래그</kbd> 또는 <kbd>Q</kbd>/<kbd>E</kbd> 회전 · 휠 줌 (줌아웃하면 주변 폐허가 보입니다)<br>진행 상황은 자동 저장됩니다.', en: '<b>Camera</b>: <kbd>right-click drag</kbd> or <kbd>Q</kbd>/<kbd>E</kbd> to rotate · wheel to zoom (zoom out to see the ruins around you)<br>Progress saves automatically.' },

  /* ── 이벤트 본문 (title / text / choices / results) ── */
  'ev.wanderer.title':  { ko: '떠돌이 생존자', en: 'Wandering Survivor' },
  'ev.wanderer.text':   { ko: '누더기를 걸친 생존자가 거처 앞에 서 있다. 눈이 퀭하다.<br>"...먹을 것 좀... 나눠줄 수 있소?"', en: 'A survivor in rags stands before your shelter, hollow-eyed.<br>"...could you... spare a little food?"' },
  'ev.wanderer.c0':     { ko: '🥫 음식 2개를 나눠준다', en: '🥫 Share 2 food' },
  'ev.wanderer.c1':     { ko: '조용히 고개를 젓는다', en: 'Quietly shake your head' },
  'ev.wanderer.r0':     { ko: '생존자가 고개를 숙이며 지도에 뭔가를 표시해준다.<br>"이 은혜는 잊지 않겠소. 저쪽 구역엔 아직 물자가 남아있다오."<br><b>(다음 탐험 성공률 +10%p)</b>', en: 'The survivor bows and marks something on your map.<br>"I won’t forget this. That district still has supplies left."<br><b>(next expedition success +10%p)</b>' },
  'ev.wanderer.r1':     { ko: '생존자는 말없이 어둠 속으로 사라졌다.', en: 'The survivor vanished into the dark without a word.' },
  'buff.wanderer':      { ko: '선행의 보답', en: 'Reward for kindness' },

  'ev.trader.title':    { ko: '행상인', en: 'Traveling Merchant' },
  'ev.trader.text':     { ko: '낡은 수레를 끈 행상인이 찾아왔다.<br>"배터리 두 개면 약품 세트를 드리리다. 어떻소?"', en: 'A merchant with a battered cart comes calling.<br>"Two batteries for a medicine set. What do you say?"' },
  'ev.trader.c0':       { ko: '🔋 배터리 2 ↔ 🩹 붕대 + 🧴 소독약', en: '🔋 Battery 2 ↔ 🩹 Bandage + 🧴 Antiseptic' },
  'ev.trader.c1':       { ko: '거절한다', en: 'Decline' },
  'ev.trader.r0':       { ko: '"좋은 거래였소." 행상인이 약품을 건네고 수레를 끌고 떠났다.', en: '"A fair trade." The merchant hands over the medicine and rolls his cart away.' },
  'ev.trader.r1':       { ko: '행상인은 어깨를 으쓱하고 다음 거처로 향했다.', en: 'The merchant shrugs and moves on to the next shelter.' },

  'ev.dog.title':       { ko: '떠돌이 개', en: 'Stray Dog' },
  'ev.dog.text':        { ko: '비쩍 마른 개 한 마리가 꼬리를 살랑거리며 다가온다.<br>이 폐허에서 용케도 살아남았구나.', en: 'A scrawny dog approaches, tail wagging.<br>Somehow it survived in these ruins.' },
  'ev.dog.c0':          { ko: '🥫 음식 1개를 나눠준다', en: '🥫 Share 1 food' },
  'ev.dog.c1':          { ko: '모른 척한다', en: 'Ignore it' },
  'ev.dog.r0':          { ko: '개가 허겁지겁 먹더니 당신 곁에 앉는다.<br>다음 탐험에 따라나설 모양이다. <b>(다음 탐험 +10%p)</b>', en: 'The dog wolfs it down and settles beside you.<br>It seems it will come along on your next expedition. <b>(next expedition +10%p)</b>' },
  'ev.dog.r1':          { ko: '개는 한참을 서성이다 절뚝이며 떠났다.', en: 'The dog lingers a while, then limps away.' },
  'buff.dog':           { ko: '든든한 동행', en: 'A trusty companion' },

  'ev.storm.title':     { ko: '폭풍 전조', en: 'Storm Warning' },
  'ev.storm.text':      { ko: '하늘이 심상치 않다. 새들이 낮게 날고, 공기가 무겁다.<br>오늘 밤 강풍이 불 것 같다.', en: 'The sky looks ominous. Birds fly low, the air is heavy.<br>A gale is coming tonight.' },
  'ev.storm.c0':        { ko: '🧱 건축재 1로 거처를 보강한다', en: '🧱 Reinforce the shelter with 1 material' },
  'ev.storm.c1':        { ko: '그냥 버텨본다', en: 'Just ride it out' },
  'ev.storm.r0':        { ko: '문틈과 창을 단단히 보강했다.<br>밤새 바람이 몰아쳤지만 거처는 끄떡없었다.', en: 'You sealed the gaps and windows tight.<br>The wind raged all night, but the shelter held firm.' },
  'ev.storm.r1':        { ko: '밤새 바람이 창틈을 파고들어 모든 것에 흙먼지를 끼얹었다. <b>(청결 -10)</b>', en: 'Wind poured through the cracks all night, coating everything in grit. <b>(cleanliness -10)</b>' },

  'ev.broken.title':    { ko: '장비 고장', en: 'Gear Breakdown' },
  'ev.broken.text':     { ko: '손전등 스위치가 헐거워졌고, 공구 손잡이에 금이 갔다.<br>폐허에서 장비는 곧 생명이다.', en: 'The flashlight switch is loose and a tool handle has cracked.<br>In the ruins, your gear is your life.' },
  'ev.broken.c0':       { ko: '⚙️ 부품 1로 수리한다', en: '⚙️ Repair with 1 parts' },
  'ev.broken.c1':       { ko: '대충 쓴다', en: 'Make do' },
  'ev.broken.r0':       { ko: '말끔히 수리했다. 역시 장비는 관리가 생명이다.', en: 'Repaired good as new. Gear well kept is gear that keeps you alive.' },
  'ev.broken.r1':       { ko: '어떻게든 쓸 수는 있겠지만, 영 미덥지 않다. <b>(다음 탐험 -5%p)</b>', en: 'It’ll work, somehow — but you can’t quite trust it. <b>(next expedition -5%p)</b>' },
  'buff.broken':        { ko: '삐걱대는 장비', en: 'Creaky gear' },

  'ev.thief.title':     { ko: '침입의 흔적', en: 'Signs of Intrusion' },
  'ev.thief.text':      { ko: '밤사이 누군가 거처 주변을 뒤진 흔적이 있다.<br>발자국이 어지럽다.', en: 'Someone rifled around your shelter in the night.<br>Footprints are scattered everywhere.' },
  'ev.thief.c0':        { ko: '없어진 게 있는지 확인한다', en: 'Check what’s missing' },
  'ev.thief.r.safe':    { ko: '조명이 켜져 있던 덕분인지 아무것도 없어지지 않았다.<br>불빛이 도둑을 쫓아낸 모양이다. <b>(조명의 가치!)</b>', en: 'Thanks to the lights being on, nothing was taken.<br>The glow must have scared the thief off. <b>(the value of light!)</b>' },
  'ev.thief.r.none':    { ko: '다행히 가져갈 만한 게 없었다... 그게 더 서글프다.', en: 'Luckily there was nothing worth taking... which is somehow sadder.' },

  'ev.seeds.title':     { ko: '낯선 노인', en: 'A Strange Old Man' },
  'ev.seeds.text':      { ko: '"물 두 통만 주게. 대신 이 씨앗을 주지.<br>이 세상에 아직 싹이 트는 씨앗이야."', en: '"Just two bottles of water. In return, take these seeds.<br>Seeds that still sprout, even in this world."' },
  'ev.seeds.c0':        { ko: '💧 물 2를 건넨다', en: '💧 Hand over 2 water' },
  'ev.seeds.c1':        { ko: '거절한다', en: 'Decline' },
  'ev.seeds.r.green':   { ko: '온실 텃밭에 씨앗을 심었다. 놀랍게도 금세 자랐다! <b>(음식 +3)</b>', en: 'You planted the seeds in the greenhouse garden. Astonishingly, they grew at once! <b>(food +3)</b>' },
  'ev.seeds.r.plain':   { ko: '씨앗을 받았지만 심을 곳이 마땅치 않다. <b>(음식 +1)</b><br>온실이 있었다면 더 좋았을 텐데.', en: 'You took the seeds but have nowhere good to plant them. <b>(food +1)</b><br>A greenhouse would have helped.' },
  'ev.seeds.r1':        { ko: '노인은 혀를 차며 지팡이를 끌고 떠났다.', en: 'The old man clicks his tongue and hobbles off with his cane.' },

  'ev.radio.title':     { ko: '수수께끼의 방송', en: 'A Mysterious Broadcast' },
  'ev.radio.text':      { ko: '라디오에서 잡음 섞인 목소리가 흘러나온다.<br>"...좌표... 창고... 물자가 아직 남아있다..."', en: 'A static-laced voice crackles from the radio.<br>"...coordinates... warehouse... supplies still remain..."' },
  'ev.radio.c0':        { ko: '좌표를 기록한다', en: 'Note the coordinates' },
  'ev.radio.c1':        { ko: '무시한다', en: 'Ignore it' },
  'ev.radio.r0':        { ko: '지도에 좌표를 옮겨 적었다. <b>(다음 탐험 성공 시 자원 2배)</b>', en: 'You copied the coordinates onto your map. <b>(double resources on next successful expedition)</b>' },
  'ev.radio.r1':        { ko: '잡음뿐인 방송은 곧 끊겼다.', en: 'The broadcast, nothing but static, soon cut out.' },
  'buff.radio':         { ko: '물자 은닉처 좌표', en: 'Cache coordinates' },

  'ev.cat.title':       { ko: '야윈 고양이', en: 'A Gaunt Cat' },
  'ev.cat.text':        { ko: '문틈으로 야윈 고양이 한 마리가 들어와 당신을 빤히 올려다본다.<br>얼룩진 털, 조심스러운 발걸음 — 그러나 눈만은 또렷하다.', en: 'A gaunt cat slips in through the door and stares up at you.<br>Patchy fur, cautious steps — yet its eyes are clear and bright.' },
  'ev.cat.c0':          { ko: '🥫 음식 1개를 내어준다 (가족으로 맞이하기)', en: '🥫 Offer 1 food (welcome it as family)' },
  'ev.cat.c1':          { ko: '조용히 지켜본다', en: 'Watch quietly' },
  'ev.cat.r0':          { ko: '고양이는 그릇을 싹 비우더니, 당연하다는 듯 가장 아늑한 자리를 차지했다.<br>이제 이 집엔 심장이 두 개 뛴다. <b>(쾌적함 +6)</b>', en: 'The cat licks the bowl clean and claims the coziest spot as if it were owed.<br>Now two hearts beat in this home. <b>(comfort +6)</b>' },
  'ev.cat.r1':          { ko: '고양이는 어둠 속으로 사라졌다. 다시는 볼 수 없을 것 같다.', en: 'The cat vanished into the dark. It seems you will never see it again.' },
  // 코트 1줄 분기 (입양 시 랜덤 확정). 명령/지시조 금지 — 관찰 서술.
  'ev.cat.coat.tabby':  { ko: '먼지를 털어내자 드러난 건 치즈빛 줄무늬 태비였다.', en: 'Once the dust was gone, a cheese-striped tabby coat showed through.' },
  'ev.cat.coat.black':  { ko: '온몸이 새까만 털, 그 사이에서 앰버빛 두 눈이 반짝였다.', en: 'Its coat was all black, and two amber eyes glinted within it.' },
  'ev.cat.coat.siamese':{ ko: '크림빛 몸에 초콜릿빛 귀와 발, 그리고 파란 눈의 샴이었다.', en: 'A cream body with chocolate ears and paws, and blue eyes—a Siamese.' },
  'ev.cat.coat.ragdoll':{ ko: '흰크림빛 털에 갈색 포인트, 파란 눈이 맑은 래그돌이었다.', en: 'A white-cream coat with brown points and clear blue eyes—a Ragdoll.' },
  'cat.pet':            { ko: '🐈 그르릉...', en: '🐈 Purr...' },

  'ev.ending.title':    { ko: '하늘에서 온 손님', en: 'A Visitor from the Sky' },
  'ev.ending.text':     { ko: '요란한 프로펠러 소리가 폐허의 정적을 갈랐다. 헬리콥터다.<br>방호복을 입은 백발의 과학자가 내려와 당신에게 걸어온다.<br>"믿을 수가 없군요. 관측 위성이 당신의 불빛을 10,000일 넘게 기록했습니다.<br>정화 구역이 완성됐습니다 — 함께 갑시다."', en: 'A roar of rotors tore through the silence of the ruins. A helicopter.<br>A white-haired scientist in a hazmat suit steps down and walks toward you.<br>"I can’t believe it. Our satellite recorded your light for over 10,000 days.<br>The cleansed zone is finished — come with us."' },
  'ev.ending.c0':       { ko: '🚁 박사와 함께 떠난다 (엔딩)', en: '🚁 Leave with the doctor (ending)' },
  'ev.ending.c1':       { ko: '아직은 여기 남는다', en: 'Stay here, for now' },
  'ev.ending.r0':       { ko: '당신은 천천히 고개를 끄덕이고, 마지막으로 집을 돌아보았다.', en: 'You nod slowly and take one last look back at your home.' },
  'ev.ending.r1':       { ko: '"...당신 같은 사람들 덕분에 이 별이 아직 살아있는 거겠죠."<br>박사는 통신기를 남기고 떠났다. 부르면 언제든 다시 온다고 했다.', en: '"...it’s people like you who keep this planet alive."<br>The doctor leaves a radio behind and departs — call, and they’ll return anytime.' },
  'ev.noResource':      { ko: ' (자원 부족)', en: ' (not enough)' },

  /* ── Phase D 신규 인카운터 12종 (#12) ── */
  // 1. coldsnap_stranger
  'ev.coldstranger.title': { ko: '문밖의 온기', en: 'Warmth Beyond the Door' },
  'ev.coldstranger.text':  { ko: '한파가 몰아치는 밤. 문 밖에 누군가 웅크린 채 쓰러져 있다. 숨은 붙어 있다.<br>깨워도 말이 없다. 그저 떨고 있을 뿐이다.', en: 'A cold-snap night. Someone lies curled and fallen beyond the door, still breathing.<br>They don’t answer when I shake them. They only shiver.' },
  'ev.coldstranger.c0':    { ko: '🔥 안으로 들여 불을 나눈다 (연료 2)', en: '🔥 Bring them in, share the fire (2 fuel)' },
  'ev.coldstranger.c1':    { ko: '문을 닫는다', en: 'Close the door' },
  'ev.coldstranger.r0':    { ko: '난롯가에 앉혀 언 몸을 녹였다. 아침이 오자 자리엔 아무도 없었다.<br>문틈에 쪽지 한 장. 고맙다는 한 줄. 이름은 없다.', en: 'I set them by the stove until the frost left their skin. By morning the spot was empty.<br>A note wedged in the doorframe. One line of thanks. No name.' },
  'ev.coldstranger.note0': { ko: '문밖의 사람을 들여 불을 나눴다.', en: 'Took in the one outside and shared the fire.' },
  'ev.coldstranger.r1':    { ko: '문을 닫았다. 바람 소리에 다른 소리는 묻혔다.<br>날이 밝고 문을 열었을 때, 그 자리엔 눌린 눈자국만 남아 있었다.', en: 'I closed the door. The wind swallowed whatever sound was left.<br>When light came and I opened it, only a pressed shape in the snow remained.' },
  'ev.coldstranger.note1': { ko: '문밖의 사람을 못 본 척했다.', en: 'Pretended I never saw the one outside.' },
  // 2. spoil_merchant
  'ev.spoilmerchant.title': { ko: '반값의 상인', en: 'The Half-Price Trader' },
  'ev.spoilmerchant.text':  { ko: '한 사람이 수레를 끌고 왔다. 통조림을 반값에 넘기겠단다.<br>웃는 낯이 지나치게 붙임성 있다. 캔 몇 개는 이음매가 부풀어 있다.', en: 'Someone rolls up a cart. Canned goods, half price, they say.<br>The smile is a touch too eager. A few of the cans bulge at the seams.' },
  'ev.spoilmerchant.c0':    { ko: '부푼 캔을 짚어 돌려보낸다', en: 'Point at the swollen cans, wave them off' },
  'ev.spoilmerchant.c1':    { ko: '🔋 배터리 1로 두 개 산다', en: '🔋 Buy two for 1 battery' },
  'ev.spoilmerchant.r0':    { ko: '부푼 이음매를 손끝으로 짚자, 상인은 말없이 수레를 돌렸다.<br>속지 않았다. 그거면 됐다.', en: 'I press a swollen seam. The trader turns the cart without a word.<br>Not fooled. That’s enough.' },
  'ev.spoilmerchant.note0': { ko: '상한 통조림을 간파해 돌려보냈다.', en: 'Spotted the spoiled cans and sent them off.' },
  'ev.spoilmerchant.r1ok':  { ko: '통조림 두 개를 받았다. 흔들어보니 멀쩡한 것 같다. 운이 좋았다. <b>(통조림 +2)</b>', en: 'Two cans in hand. A shake says they’re fine. Lucky. <b>(canned +2)</b>' },
  'ev.spoilmerchant.r1bad': { ko: '통조림 두 개를 받았다. 그날 밤부터 속이 뒤집혔다. 하나가 상해 있었다. <b>(감염 위험)</b>', en: 'Two cans in hand. By nightfall my gut turned. One of them was rotten. <b>(infection risk)</b>' },
  // 3. leaky_roof
  'ev.leakyroof.title': { ko: '천장에서 떨어지는 것', en: 'Something Drips from the Ceiling' },
  'ev.leakyroof.text':  { ko: '빗줄기가 굵어지자 천장 한구석에서 물이 떨어지기 시작한다.<br>바닥에 고인 자국이 점점 넓어진다.', en: 'As the rain thickens, water begins to fall from one corner of the ceiling.<br>The pool on the floor spreads, wider and wider.' },
  'ev.leakyroof.c0':    { ko: '🧱 건축재 1로 급히 막는다', en: '🧱 Patch it fast with 1 material' },
  'ev.leakyroof.c1':    { ko: '양동이만 받쳐둔다', en: 'Just set a bucket under it' },
  'ev.leakyroof.r0':    { ko: '천장에 자재를 덧대 물길을 막았다. 빗소리가 다시 바깥의 것이 되었다.', en: 'I braced the ceiling with scrap and cut off the trickle. The rain became an outside sound again.' },
  'ev.leakyroof.r1':    { ko: '밤새 물이 새 방 안이 눅눅해졌다. 벽에 곰팡이 냄새가 밴다. <b>(청결 -12)</b>', en: 'Water seeped all night and the room turned damp. The walls carry a mildew smell now. <b>(cleanliness -12)</b>' },
  // 4. snow_prints
  'ev.snowprints.title': { ko: '밤사이 발자국', en: 'Prints in the Night Snow' },
  'ev.snowprints.text':  { ko: '아침에 문을 여니 눈밭에 발자국이 거처를 빙 둘러 나 있다.<br>안을 들여다본 흔적은 없다. 그저 한 바퀴 돌고 저편으로 이어진다.', en: 'I open the door to find prints circling the shelter through the snow.<br>No sign anyone looked in. They just went around once and trailed off yonder.' },
  'ev.snowprints.c0':    { ko: '발자국을 따라가 본다', en: 'Follow the tracks' },
  'ev.snowprints.c1':    { ko: '쓸어 지운다', en: 'Sweep them away' },
  'ev.snowprints.r0good':{ ko: '발자국은 눈 속에 묻힌 보따리 하나로 이어졌다. 주인은 이미 멀리 갔다. <b>(통조림 +1, 천 +1)</b>', en: 'The tracks led to a bundle half-buried in snow. Its owner was long gone. <b>(canned +1, cloth +1)</b>' },
  'ev.snowprints.note0': { ko: '발자국을 따라가 버려진 보따리를 주웠다.', en: 'Followed the tracks to an abandoned bundle.' },
  'ev.snowprints.r0bad': { ko: '발자국을 따라가다 빙판에 미끄러졌다. 발목이 시큰하다. 주인은 끝내 보이지 않았다.', en: 'Following the tracks, I slipped on ice. My ankle throbs. I never did see who left them.' },
  'ev.snowprints.r1':    { ko: '발자국을 말끔히 쓸어냈다. 누가 다녀갔든, 이제 없던 일이다.', en: 'I swept the prints clean. Whoever passed, it never happened now.' },
  // 5. lighthouse_ship
  'ev.lighthouseship.title': { ko: '먼바다의 신호', en: 'A Signal Far Out at Sea' },
  'ev.lighthouseship.text':  { ko: '한밤, 먼바다에서 불빛이 두 번 깜빡였다. 잠시 뒤 다시 두 번.<br>누군가 등대를 보고 있다.', en: 'Deep in the night, a light blinks twice, far out at sea. A pause, then twice more.<br>Someone out there is watching the lighthouse.' },
  'ev.lighthouseship.c0':    { ko: '🔥 등을 밝혀 응답한다 (연료 1)', en: '🔥 Light the lamp and answer (1 fuel)' },
  'ev.lighthouseship.c1':    { ko: '지켜보기만 한다', en: 'Only watch' },
  'ev.lighthouseship.r0':    { ko: '등을 크게 밝혀 두 번 깜빡였다. 먼 불빛도 두 번 답하고는, 천천히 수평선 너머로 사라졌다.<br>이름도 모르고, 만나지도 못했다. 그래도 밤바다가 조금 덜 넓어졌다.', en: 'I flared the lamp and blinked twice. The far light answered twice, then slid slowly past the horizon.<br>No name, no meeting. Still, the night sea felt a little less wide.' },
  'ev.lighthouseship.note0': { ko: '먼바다의 불빛에 등을 밝혀 답했다.', en: 'Answered the far sea-light with the lamp.' },
  'ev.lighthouseship.r1':    { ko: '불빛은 얼마간 더 깜빡이다 잦아들었다. 이윽고 바다는 다시 캄캄해졌다.', en: 'The light blinked a while longer, then dimmed. Before long the sea went black again.' },
  // 6. greenhouse_birds
  'ev.greenhousebirds.title': { ko: '씨앗 도둑', en: 'Seed Thieves' },
  'ev.greenhousebirds.text':  { ko: '깨진 유리 틈으로 새 몇 마리가 들어와 텃밭 씨앗을 쪼고 있다.<br>날 보고도 달아나지 않는다. 오래 굶은 눈치다.', en: 'A few birds have slipped through the cracked glass to peck at the garden seeds.<br>They don’t flee when they see me. They have the look of long hunger.' },
  'ev.greenhousebirds.c0':    { ko: '팔을 저어 쫓는다', en: 'Wave them off' },
  'ev.greenhousebirds.c1':    { ko: '🍎 씨앗을 조금 나눠준다 (음식 1)', en: '🍎 Share a little seed (1 food)' },
  'ev.greenhousebirds.r0':    { ko: '새들은 푸드덕 날아 유리 밖으로 사라졌다. 텃밭은 지켰다.', en: 'The birds burst up and vanished past the glass. The garden’s safe.' },
  'ev.greenhousebirds.r1':    { ko: '씨앗을 한 줌 흩뿌리자 새들이 모여들었다. 배를 채운 뒤에도 한참을 머물다 떠났다.', en: 'I scattered a handful and the birds gathered close. Fed, they lingered a long while before leaving.' },
  'ev.greenhousebirds.r1shiny':{ ko: '씨앗을 흩뿌리자 새 한 마리가 반짝이는 것을 떨어뜨리고 갔다. 작은 부품이다. <b>(부품 +1)</b>', en: 'As I scattered the seed, one bird dropped something bright and flew off. A small part. <b>(parts +1)</b>' },
  'ev.greenhousebirds.note1': { ko: '새가 반짝이는 부품을 물어다 떨궜다.', en: 'A bird dropped a shiny part behind.' },
  // 7. distant_light (REQ-EVT-03) — 장소별 변형 3종은 r0 에서 분기
  'ev.distantlight.title': { ko: '먼 불빛', en: 'A Distant Light' },
  'ev.distantlight.text':  { ko: '맑은 밤, 폐허 너머 어딘가에 불빛 하나가 켜져 있다.<br>깜빡이지도, 다가오지도 않는다. 그저 저기 있다.', en: 'A clear night. Somewhere beyond the ruins, a single light is lit.<br>It doesn’t blink, doesn’t draw nearer. It just is there.' },
  'ev.distantlight.c0':    { ko: '한참을 바라본다', en: 'Watch it a long while' },
  'ev.distantlight.r0':    { ko: '한참을 바라봤다. 누가 켰는지, 왜 켜져 있는지 알 길이 없다.<br>그래도 저 불빛이 있는 동안은, 이 폐허에 나 혼자만은 아니었다.', en: 'I watched a long time. No way to know who lit it, or why.<br>Still — while that light burns, I am not the only one left in these ruins.' },
  'ev.distantlight.r0.rooftop': { ko: '옥상 난간에 기대 한참을 바라봤다. 무너진 빌딩숲 너머, 창문 하나에 불이 켜져 있다.<br>손을 흔들 뻔했다. 그래봐야 닿지 않을 텐데.', en: 'Leaning on the rooftop rail, I watched a long while. Past the fallen skyline, one window is lit.<br>I nearly waved. It would never reach, of course.' },
  'ev.distantlight.r0.cabin': { ko: '숲 나무 사이로 저 아래 골짜기에 불빛 하나가 깜빡인다. 사람일까, 짐승의 눈일까.<br>내려가 보진 않았다. 어떤 불빛은 멀리 둘 때 더 오래 남는다.', en: 'Through the trees, a light flickers down in the valley. A person, or an animal’s eyes?<br>I didn’t go down. Some lights last longer kept at a distance.' },
  'ev.distantlight.r0.bunker': { ko: '깨진 외피 틈으로 벌판 끝을 봤다. 폐허 도시 쪽에 불빛 하나가 켜져 있다.<br>여기까지 오려면 며칠은 걸릴 거리다. 그래도, 저기 누군가 있다.', en: 'Through a crack in the shell I looked to the far field. Toward the ruined city, one light burns.<br>Days of walking away, at least. Still — someone is out there.' },
  // 8. radio_ghost
  'ev.radioghost.title': { ko: '주파수 사이의 목소리', en: 'A Voice Between Frequencies' },
  'ev.radioghost.text':  { ko: '늦은 밤, 라디오 다이얼을 돌리다 잡음 사이에 사람 목소리가 걸린다.<br>말인지 노래인지, 끊겼다 이어진다.', en: 'Late at night, turning the dial, a human voice catches between the static.<br>Speech or song, I can’t tell — it breaks and returns.' },
  'ev.radioghost.c0':    { ko: '주파수를 붙잡아 본다', en: 'Try to hold the frequency' },
  'ev.radioghost.c1':    { ko: '다이얼을 끈다', en: 'Turn the dial off' },
  'ev.radioghost.r0':    { ko: '잡음을 헤치자 방송 하나가 또렷해졌다. — {title}<br>수첩 라디오 기록에 남겨두었다.', en: 'Cutting through the static, one broadcast came clear. — {title}<br>I set it down in the journal’s radio log.' },
  'ev.radioghost.r0none':{ ko: '주파수를 붙잡았지만 이미 들어본 것들뿐이다. 목소리는 곧 잡음에 묻혔다.', en: 'I held the frequency, but it was all things I’d heard before. The voice sank back into static.' },
  'ev.radioghost.r1':    { ko: '다이얼을 끄자 방은 다시 조용해졌다. 무슨 말이었는지는 끝내 알 수 없었다.', en: 'I killed the dial and the room went quiet again. What it said, I’ll never know.' },
  // 9. old_calendar
  'ev.oldcalendar.title': { ko: '벽에 걸린 달력', en: 'A Calendar on the Wall' },
  'ev.oldcalendar.text':  { ko: '벽 틈에서 오래된 달력 한 장을 찾았다. 붕괴 이전의 날짜에 동그라미가 그려져 있다.<br>무슨 날이었는지는 적혀 있지 않다.', en: 'I found an old calendar page in a gap in the wall. A date from before the fall is circled.<br>What day it was, no one wrote down.' },
  'ev.oldcalendar.c0':    { ko: '달력을 살펴본다', en: 'Look the calendar over' },
  'ev.oldcalendar.r0':    { ko: '달력 뒷면에 빼곡한 메모가 있다. — {title}<br>수첩 기록에 옮겨 적었다.', en: 'The back of the calendar is dense with notes. — {title}<br>I copied it into the journal.' },
  'ev.oldcalendar.r0none':{ ko: '달력 뒷면은 이미 옮겨 적은 것과 같은 내용이었다. 벽에 도로 끼워두었다.', en: 'The back held the same notes I’d already copied. I tucked it back into the wall.' },
  // 10. cat_gift
  'ev.catgift.title': { ko: '고양이의 선물', en: 'The Cat’s Gift' },
  'ev.catgift.text':  { ko: '고양이가 뭔가를 입에 물고 와 발치에 툭 떨어뜨린다. 뿌듯한 얼굴이다.', en: 'The cat trots up with something in its mouth and drops it at my feet. A very proud face.' },
  'ev.catgift.c0':    { ko: '뭔지 살펴본다', en: 'See what it is' },
  'ev.catgift.r0rare':{ ko: '어디서 물어왔는지 쓸 만한 부품 두 개다. 머리를 쓰다듬어줬다. <b>(부품 +2)</b>', en: 'Two decent parts, from who knows where. I scratched its head. <b>(parts +2)</b>' },
  'ev.catgift.r0junk':{ ko: '낡은 헝겊 조각이다. 그래도 천은 천이다. <b>(천 +1)</b>', en: 'A ragged scrap of cloth. Still, cloth is cloth. <b>(cloth +1)</b>' },
  'ev.catgift.r0rat': { ko: '죽은 쥐다. 고양이는 자랑스러운 눈치다. 나는 웃어야 할지 울어야 할지 모르겠다.', en: 'A dead rat. The cat looks immensely proud. I don’t know whether to laugh or cry.' },
  // 11. frozen_pipe
  'ev.frozenpipe.title': { ko: '얼어붙은 수도관', en: 'A Frozen Pipe' },
  'ev.frozenpipe.text':  { ko: '밤새 기온이 뚝 떨어져 수도관이 얼어붙었다. 두드리니 안에서 얼음이 걸리는 소리가 난다.<br>이대로 두면 갈라질지도 모른다.', en: 'The temperature dropped hard overnight and the pipe froze solid. Tapping it, I hear ice catch inside.<br>Left alone, it might crack.' },
  'ev.frozenpipe.c0':    { ko: '⚙️ 부품 1로 손본다', en: '⚙️ Fix it with 1 parts' },
  'ev.frozenpipe.c1':    { ko: '녹기를 기다린다', en: 'Wait for it to thaw' },
  'ev.frozenpipe.r0':    { ko: '이음매를 갈고 단열재를 감았다. 물이 다시 흐른다.', en: 'I replaced the joint and wrapped it in insulation. The water runs again.' },
  'ev.frozenpipe.r1':    { ko: '그냥 두었다. 관이 녹을 때까지 정수기는 며칠 멎어 있을 것이다. <b>(정수기 3일 정지)</b>', en: 'I left it. Until the pipe thaws, the purifier will sit dead for a few days. <b>(purifier stalled 3 days)</b>' },
  'ev.frozenpipe.note1': { ko: '수도관을 방치했다 — 정수기가 며칠 멎는다.', en: 'Left the pipe frozen — the purifier stalls for days.' },
  // 12. caravan_pass
  'ev.caravanpass.title': { ko: '지나가는 행렬', en: 'A Procession Passing' },
  'ev.caravanpass.text':  { ko: '멀리 능선을 따라 사람들의 행렬이 지나간다. 짐수레와 등짐, 아이의 손을 잡은 어른.<br>이쪽을 알아채지 못한 채, 그저 지나간다.', en: 'Far along the ridge, a line of people passes. Carts and packs, a grown-up holding a child’s hand.<br>Never noticing me, they simply move on.' },
  'ev.caravanpass.c0':    { ko: '지나갈 때까지 지켜본다', en: 'Watch until they’ve gone' },
  'ev.caravanpass.r0':    { ko: '행렬은 능선 너머로 사라질 때까지 한 번도 멈추지 않았다.<br>부르지 않았고, 그들도 돌아보지 않았다. 그게 맞는 것 같았다.', en: 'The line never once stopped before it vanished over the ridge.<br>I didn’t call out, and they didn’t look back. It felt right that way.' },
  'ev.caravanpass.r0detail':{ ko: '망원경으로 오래 지켜봤다. 지친 얼굴들, 그래도 앞선 이가 이따금 뒤를 챙긴다.<br>어디로 가는지는 모른다. 다만 함께 간다는 것만은 분명했다.', en: 'I watched a long while through the scope. Weary faces — yet the one in front keeps glancing back for the others.<br>Where they go, I can’t say. That they go together was the one clear thing.' },
  // ── 박사 무전 문안 조각 (REQ-RADIO-01) ──
  'ev.doctor.textFrag': { ko: '…그 일지를 들었다면, 이제 이해했을 것이다. 아홉 해를 버틴 불빛 하나면 충분하다는 걸.', en: '…if you heard those logs, you understand now. One light that lasts nine years is enough.' },

  /* ── 세계관 메모 / 라디오 수집 (#35 · #12) ── */
  'memo.foundNote':     { ko: '📄 기록을 하나 찾았다 — {title}', en: '📄 Found a record — {title}' },
  'memo.foundWillNote': { ko: '✉️ 누군가의 마지막 글을 찾았다 — {title}', en: '✉️ Found someone’s last words — {title}' },
  'memo.tagWill':       { ko: '남겨진 마지막 글', en: 'Someone’s last words' },
  'memo.tagRegion.residential': { ko: '주거지역에서 — 무너진 일상', en: 'From the residential zone — a daily life undone' },
  'memo.tagRegion.commercial':  { ko: '상업지구에서 — 사재기와 폭동', en: 'From the commercial zone — hoarding and riots' },
  'memo.tagRegion.industrial':  { ko: '공업지대에서 — 폐쇄 명령', en: 'From the industrial zone — the shutdown order' },
  'memo.tagRegion.slum':        { ko: '슬럼가에서 — 남겨진 사람들', en: 'From the slums — those left behind' },
  'memo.tagRegion.bunker':      { ko: '벙커 하강 계단에서 — 아래로 난 자국', en: 'From the bunker stairs — marks leading down' },
  // #87 스윕: 열람 시 키 원문이 노출되던 누락 2종 (페리 에이전트 검거 — 1.2/1.3 때 태그만 빠졌던 것)
  'memo.tagRegion.subway':      { ko: '지하 승강장에서 — 내려간 사람들', en: 'From the underground platform — those who went below' },
  'memo.tagRegion.resort':      { ko: '고원 리조트에서 — 마지막 휴가객들', en: 'From the highland resort — the last vacationers' },
  'radio.heardNote':    { ko: '📻 라디오에서 방송을 하나 들었다 — {title}', en: '📻 Heard a broadcast on the radio — {title}' },
  'radio.logged':       { ko: '📻 수첩에 기록했다', en: '📻 Logged in the journal' },

  /* ── 수첩 기록 탭 (REQ-LORE-02) ── */
  'record.tabTitle':    { ko: '기록', en: 'Records' },
  'record.memoTitle':   { ko: '세계의 조각 ({n}/{total})', en: 'Fragments of the World ({n}/{total})' },
  'record.radioTitle':  { ko: '라디오 기록 ({n}/{total})', en: 'Radio Log ({n}/{total})' },
  'record.distantTitle':{ ko: '먼 불빛 목격 {n}회', en: 'Distant light sighted {n} time(s)' },
  'record.regionRes':   { ko: '주거지역', en: 'Residential' },
  'record.regionCom':   { ko: '상업지구', en: 'Commercial' },
  'record.regionInd':   { ko: '공업지대', en: 'Industrial' },
  'record.regionSlum':  { ko: '슬럼가', en: 'Slums' },
  'record.regionBunker':{ ko: '벙커 지하 통로', en: 'Bunker Undercroft' },
  'record.regionWill':  { ko: '남겨진 글', en: 'Last Words' },
  'record.locked':      { ko: '…아직 찾지 못함', en: '…not yet found' },
  'record.empty':       { ko: '아직 아무것도 모으지 못했다.', en: 'Nothing gathered yet.' },
  'record.readHint':    { ko: '펼쳐 읽기', en: 'Read' },

  /* ── 돔 벙커 리워크 (#36) ── */
  'bunker.roofTitle':   { ko: '천장 구멍', en: 'The Hole in the Ceiling' },
  'bunker.roofHole':    { ko: '갈라진 천장으로 비가 샌다. 별은 보이지만, 비 오는 날엔 대가를 치른다.', en: 'Rain leaks through the cracked ceiling. You can see the stars — but rainy days cost you.' },
  'bunker.roofTemp':    { ko: '임시 덮개를 씌웠다. 비는 더 새지 않는다. 아직 완전하진 않다.', en: 'A makeshift cover is up. No more leaks. Not quite whole yet.' },
  'bunker.roofFull':    { ko: '천장을 완전히 수리했다. 벙커가 처음으로 온전히 아늑하다. <b>(쾌적 +4)</b>', en: 'The ceiling is fully repaired. For the first time the bunker feels wholly snug. <b>(comfort +4)</b>' },
  'bunker.roofStage1Btn':{ ko: '🛠️ 임시 덮개 씌우기 (건축재 1)', en: '🛠️ Put up a cover (1 material)' },
  'bunker.roofStage2Btn':{ ko: '🛠️ 완전 수리 (건축재 3)', en: '🛠️ Full repair (3 material)' },
  'bunker.roofDoneStage1':{ ko: '천장에 임시 덮개를 씌웠다. 이제 비가 새지 않는다.', en: 'Covered the ceiling for now. No more leaking rain.' },
  'bunker.roofDoneStage2':{ ko: '천장을 완전히 수리했다. 벙커가 온전해졌다.', en: 'Fully repaired the ceiling. The bunker is whole now.' },
  'bunker.backdoorFound':{ ko: '절단기를 손에 넣었다. 뒷벽을 뚫으면 그 너머 공간이 드러난다.', en: 'Got hold of a cutter. Breach the back wall and the space beyond opens up.' },
  'bunker.backdoorBtn': { ko: '🔩 뒷문 개방 (건축재 3)', en: '🔩 Open the back door (3 material)' },
  'bunker.backdoorDone':{ ko: '뒷벽을 갈라 문을 열었다. 콘크리트 전실과, 그 바닥으로 이어지는 하강 계단이 드러났다. <b>(쾌적 +4)</b>', en: 'Cut the back wall open. A concrete anteroom — and stairs descending from its floor. <b>(comfort +4)</b>' },
  'bunker.stairToast':  { ko: '내려가 봤자 어둠뿐이다. …아직은.', en: 'Nothing down there but darkness. …For now.' },
  'bunker.roofNote':    { ko: '천장 구멍으로 비가 들이쳤다.', en: 'Rain drove in through the ceiling hole.' },
  /* ── 옥탑방 리워크 (#53) ── */
  'rooftop.slateTitle': { ko: '빠진 슬레이트', en: 'The Missing Slates' },
  'rooftop.slateGapped':{ ko: '지붕에서 두 장이 빠져 하늘이 보인다. 비 오는 날엔 대가를 치른다.', en: 'Two slates are gone; you can see sky. Rainy days cost you.' },
  'rooftop.slateFull':  { ko: '슬레이트를 채워 지붕이 온전해졌다.', en: 'The slates are filled in; the roof is whole.' },
  'rooftop.slateBtn':   { ko: '🪨 슬레이트 보수 (건축재 1)', en: '🪨 Patch the slates (1 material)' },
  'rooftop.slateDone':  { ko: '빠진 슬레이트를 채웠다. 이제 비가 새지 않는다.', en: 'Filled in the missing slates. No more leaking rain.' },
  'rooftop.slateNote':  { ko: '빠진 슬레이트 사이로 빗물이 스몄다.', en: 'Rainwater seeped through the gaps in the slates.' },
  'rooftop.gardenHarvest':{ ko: '🌱 옥상 텃밭에서 먹을 것을 거뒀다 (+{n})', en: '🌱 Harvested food from the rooftop garden (+{n})' },
  'rooftop.gardenDormant':{ ko: '🌱 겨울 — 옥상 텃밭이 잠들어 있다.', en: '🌱 Winter — the rooftop garden lies dormant.' },
  'cutter.foundNote':   { ko: '🔩 공업지대에서 절단기를 찾았다.', en: '🔩 Found a cutter in the industrial zone.' },
  /* ── 대형 프로젝트 (1.1 ARC-02) ── */
  'proj.header':        { ko: '큰 공사', en: 'The Big Work' },
  'proj.intro':         { ko: '여러 날에 걸쳐 자재를 조금씩 붓는 일이다. 하루에 손이 닿는 만큼만 나아간다.', en: 'Work that takes days — a little material at a time. Each day I get only as far as my hands reach.' },
  'proj.done':          { ko: '끝냈다.', en: 'Finished.' },
  'proj.stageOf':       { ko: '{cur}/{total}단계', en: 'stage {cur}/{total}' },
  'proj.progress':      { ko: '{pct}% ({inv}/{need})', en: '{pct}% ({inv}/{need})' },
  'proj.stageRemain':   { ko: '이 단계 {n}번 더', en: '{n} more this stage' },
  'proj.workBtn':       { ko: '🛠️ 손대기', en: '🛠️ Work on it' },
  'proj.worked':        { ko: '오늘도 조금 나아갔다.', en: 'A little further along today.' },
  'proj.stageDone':     { ko: '한 단계를 넘겼다.', en: 'One stage done.' },
  'proj.memoir.title':  { ko: '그 해의 공사', en: 'The Year’s Work' },
  // 파일럿: 벙커 지하 통로 정리 (1.4 복선)
  'proj.clearPassage.name':      { ko: '막힌 통로 정리', en: 'Clearing the Blocked Passage' },
  'proj.clearPassage.stage1':    { ko: '계단 아래를 큰 돌덩이가 막고 있다. 하나씩 굴려 치운다.', en: 'Big stones block the foot of the stairs. I roll them aside, one by one.' },
  'proj.clearPassage.stage2':    { ko: '남은 잔해와 부스러기를 쓸어낸다. 통로의 윤곽이 드러난다.', en: 'I sweep out the last rubble and grit. The passage begins to take shape.' },
  'proj.clearPassage.workNote':  { ko: '지하 계단 아래 돌무더기를 하나씩 걷어냈다.', en: 'Cleared the rubble at the foot of the undercroft stairs, stone by stone.' },
  'proj.clearPassage.doneToast': { ko: '돌무더기를 다 치웠다. 통로 저편에서 서늘한 바람이 새어 든다. …아직 들어갈 순 없다.', en: 'The rubble is all cleared. A cold draft seeps from beyond the passage. …I can’t go in yet.' },
  'proj.clearPassage.memoir':    { ko: '{day}일째. 지하 계단 아래를 막고 있던 돌무더기를 며칠에 걸쳐 다 걷어냈다. 통로 저편은 아직 어둠이지만, 이제 바람이 지나간다. 언젠가 저 아래로 내려갈 날이 올까.', en: 'Day {day}. Over several days I cleared the rubble that blocked the foot of the undercroft stairs. Beyond is still dark, but now the air moves through. Will there come a day I go down there?' },
  // 1.1 방파제 오두막 (대형 프로젝트)
  'proj.breakwaterHut.name':      { ko: '방파제 오두막', en: 'Breakwater Hut' },
  'proj.breakwaterHut.stage1':    { ko: '방파제 끝에 밀려온 잔해를 걷어낸다. 터를 고르는 일부터다.', en: 'I clear the debris washed up at the breakwater’s end. First, level the ground.' },
  'proj.breakwaterHut.stage2':    { ko: '주워 모은 각목으로 뼈대를 세운다. 바닷바람에 흔들리지 않게.', en: 'I raise a frame from salvaged timber — braced against the sea wind.' },
  'proj.breakwaterHut.stage3':    { ko: '벽을 두르고 지붕을 인다. 방수천을 덧대 마감한다.', en: 'I wall it in and lay the roof, sealing it with tarp.' },
  'proj.breakwaterHut.workNote':  { ko: '방파제 끝 오두막 공사를 조금 진척시켰다.', en: 'Made some progress on the hut at the breakwater’s end.' },
  'proj.breakwaterHut.doneToast': { ko: '방파제 오두막을 완성했다. 이제 부두 일이 한결 빨라지고, 얼음낚시 구멍도 하나 더 뚫을 수 있다.', en: 'The breakwater hut is done. Dock work goes faster now, and I can cut one more ice-fishing hole.' },
  'proj.breakwaterHut.memoir':    { ko: '{day}일째. 방파제 끝에 작은 오두막을 세웠다. 잔해를 고르고, 뼈대를 세우고, 지붕을 이는 데 며칠이 걸렸다. 이제 이 항구는 조금 더 내 것 같다.', en: 'Day {day}. I built a small hut at the end of the breakwater. Days of leveling rubble, raising a frame, laying a roof. This harbor feels a little more like mine now.' },

  // 1.1 지역 (항구)
  'map.regionUnlockHarbor':{ ko: '항구 구역이 지도에 나타났다.', en: 'The harbor district appears on the map.' },

  // 1.1 얼음낚시
  'icefish.title':      { ko: '얼음낚시', en: 'Ice Fishing' },
  'icefish.action':     { ko: '빙판에 구멍을 뚫고 낚싯줄을 드리운다', en: 'Cut a hole in the ice and drop a line' },
  'icefish.hint':       { ko: '에너지 {e} · 스팟 {left}/{spots}', en: 'Energy {e} · spots {left}/{spots}' },
  'icefish.go':         { ko: '🎣 낚시', en: '🎣 Fish' },
  'icefish.caught':     { ko: '얼음 구멍에서 물고기를 {n} 낚았다.', en: 'Pulled {n} fish from the ice hole.' },
  'icefish.salt':       { ko: '구멍 가장자리에서 소금 결정을 {n} 긁어냈다.', en: 'Scraped {n} salt crystal from the hole’s rim.' },
  'icefish.bottle':     { ko: '낚싯줄에 낡은 병이 걸려 올라왔다. 안에 젖은 쪽지가 들어 있다.', en: 'An old bottle came up on the line. A damp note inside.' },
  'icefish.noSpot':     { ko: '오늘은 더 뚫을 구멍이 없다.', en: 'No more holes to cut today.' },

  // 1.1 밀수꾼 행상인
  'ev.smuggler.title':  { ko: '밀수꾼', en: 'The Smuggler' },
  'ev.smuggler.text':   { ko: '부두에 낯선 배가 잠깐 닿는다. 후드를 쓴 사내가 짐을 풀며 나를 힐끗 본다. 오래 머물 사람은 아니다.', en: 'A strange boat touches the pier a moment. A hooded man unpacks his cargo, glancing at me. Not one to linger.' },
  'ev.smuggler.c0':     { ko: '연료를 산다 (배터리)', en: 'Buy fuel (batteries)' },
  'ev.smuggler.c1':     { ko: '소금 3으로 부품을 바꾼다', en: 'Trade 3 salt for parts' },
  'ev.smuggler.c2':     { ko: '고개만 젓는다', en: 'Just shake my head' },
  'ev.smuggler.r0':     { ko: '연료 한 통을 받아 들었다. 그는 값을 세더니 배로 돌아간다.', en: 'I take a can of fuel. He counts his price and heads back to the boat.' },
  'ev.smuggler.r0winter':{ ko: '겨울값이라며 그가 배를 세 배로 부른다. 연료 한 통이 이렇게 비쌌던 적은 없다.', en: 'Winter rates, he says — triple the price. Fuel has never cost me this much.' },
  'ev.smuggler.r1':     { ko: '소금 자루를 넘기자 그가 부품 두 개를 던져준다. 항구의 소금은 값이 나간다.', en: 'I hand over the salt; he tosses me two parts. Harbor salt is worth something.' },
  'ev.smuggler.r2':     { ko: '그는 어깨를 으쓱하곤 닻을 올린다. 배는 안개 속으로 사라진다.', en: 'He shrugs and weighs anchor. The boat vanishes into the fog.' },

  /* ── 1.2 「지하 노선도」 ── */
  // 허브 승격
  'subway.hubTitle':    { ko: '지하철 허브 승격', en: 'Promote to Subway Hub' },
  'subway.hubDesc':     { ko: '핸드카를 손보고 노선도를 복원한다 — 선로 복구와 암시장이 열린다', en: 'Repair the hand-car and restore the route map — unlocks rail recovery and the black market' },
  'subway.hubBtn':      { ko: '승격', en: 'Promote' },
  'subway.hubDone':     { ko: '이 승강장은 이제 허브다', en: 'This platform is a hub now' },
  'subway.hubDoneToast':{ ko: '승강장을 허브로 손봤다. 먼지 앉은 노선도를 다시 벽에 걸었다. 이제 선로를 되살리면, 저 어둠이 길이 된다.', en: 'I fixed the platform into a hub. Hung the dusty route map back on the wall. Bring the rails back to life, and that dark becomes a road.' },
  // 폭설 봉쇄
  'subway.blizzardBlocked': { ko: '폭설로 지상 길이 파묻혔다. 개통한 지하 노선으로만 오갈 수 있다.', en: 'Snow has buried the surface routes. Only opened subway lines get through.' },
  // 버섯 재배칸
  'subway.mushroomHarvest': { ko: '🍄 어둠 속 균상에서 버섯을 {n} 땄다.', en: '🍄 Picked {n} mushroom from the bed in the dark.' },
  'subway.mushroomWater':   { ko: '균상에 물을 {n} 주었다.', en: 'Watered the mushroom bed ({n}).' },
  'subway.mushroomDry':     { ko: '물이 없어 균상이 말랐다. 오늘은 딸 것이 없다.', en: 'No water — the bed dried out. Nothing to pick today.' },
  // 암시장 (교환대)
  'subway.marketTitle':   { ko: '암시장 교환대', en: 'Black-Market Counter' },
  'subway.marketIntro':   { ko: '얼굴 없는 교환대. 쪽지와 물건만 오간다 — 남는 것을 덜 흔한 것으로.', en: 'A faceless counter. Only notes and goods change hands — surplus for something rarer.' },
  'subway.marketRateNote':{ ko: '개통 구간 {n}개만큼 산출이 늘었다.', en: 'Opened segments (×{n}) sweeten the yield.' },
  'subway.marketSlots':   { ko: '({left}/{total} 남음)', en: '({left}/{total} left)' },
  'subway.marketWinter':  { ko: '겨울값', en: 'winter rate' },
  'subway.marketTradeBtn':{ ko: '교환', en: 'Trade' },
  'subway.marketNoSlot':  { ko: '오늘은 더 교환할 수 없다.', en: 'No more trades today.' },
  'subway.marketTraded':  { ko: '{give}을(를) 놓고 {emoji} {name} ×{n}을(를) 챙겼다.', en: 'Left {give}, took {emoji} {name} ×{n}.' },
  // 선로 복구 프로젝트 ×3
  'proj.subRail1.name':   { ko: '선로 복구 · 1구간 (주거지 방면)', en: 'Rail Recovery · Segment 1 (Residential)' },
  'proj.subRail1.stage1': { ko: '무너진 잔해로 막힌 선로부터 걷어낸다. 첫 삽이 제일 무겁다.', en: 'I clear the caved-in rubble blocking the rails. The first shovel is the heaviest.' },
  'proj.subRail1.stage2': { ko: '썩은 침목을 걷어내고 새 침목을 깐다. 어둠 속에서 손끝으로 간격을 잰다.', en: 'I pull the rotted ties and lay new ones, gauging the spacing by fingertip in the dark.' },
  'proj.subRail1.stage3': { ko: '레일을 이어 체결한다. 핸드카를 굴려 끝까지 밀어본다 — 통한다.', en: 'I couple the rails and bolt them down. I roll the hand-car to the end — it runs through.' },
  'proj.subRail1.workNote': { ko: '주거지 방면 선로를 조금 되살렸다.', en: 'Brought the Residential-bound rails a little further back to life.' },
  'proj.subRail1.doneToast':{ ko: '1구간이 개통됐다. 주거지까지 어둠 속 지름길이 열렸다 — 절반의 시간에 닿고, 폭설도 이 길은 막지 못한다.', en: 'Segment 1 is open. A shortcut to Residential runs through the dark now — half the time, and no blizzard closes this road.' },
  'proj.subRail1.memoir': { ko: '{day}일째. 주거지 방면 첫 구간을 개통했다. 잔해를 치우고, 침목을 깔고, 레일을 이었다. 핸드카가 어둠 속을 굴러간다. 이제 눈이 아무리 쌓여도 이 길만은 열려 있다.', en: 'Day {day}. Opened the first segment toward Residential. Cleared rubble, laid ties, coupled rails. The hand-car rolls through the dark. However deep the snow, this one road stays open.' },
  'proj.subRail2.name':   { ko: '선로 복구 · 2구간 (상업지구 방면)', en: 'Rail Recovery · Segment 2 (Commercial)' },
  'proj.subRail2.stage1': { ko: '더 깊은 구간이다. 물이 고인 잔해를 퍼내는 일부터 시작한다.', en: 'A deeper segment. I start by bailing out the flooded rubble.' },
  'proj.subRail2.stage2': { ko: '침목을 깐다. 벽을 타고 흐르는 물소리가 유일한 동행이다.', en: 'I lay the ties. Water running down the walls is my only company.' },
  'proj.subRail2.stage3': { ko: '레일을 체결하고 이음매를 점검한다. 상업지구까지 길이 뚫렸다.', en: 'I bolt the rails and check the joints. The way to Commercial is through.' },
  'proj.subRail2.workNote': { ko: '상업지구 방면 선로 공사를 진척시켰다.', en: 'Made progress on the Commercial-bound rails.' },
  'proj.subRail2.doneToast':{ ko: '2구간이 개통됐다. 상업지구도 이제 지하로 닿는다.', en: 'Segment 2 is open. Commercial is within reach underground now.' },
  'proj.subRail2.memoir': { ko: '{day}일째. 상업지구 방면 구간을 개통했다. 고인 물을 퍼내며 며칠을 보냈다. 이 어둠이 조금씩 내 길이 되어간다.', en: 'Day {day}. Opened the Commercial-bound segment. Days spent bailing standing water. This dark is slowly becoming my road.' },
  'proj.subRail3.name':   { ko: '선로 복구 · 3구간 (공업지대 방면)', en: 'Rail Recovery · Segment 3 (Industrial)' },
  'proj.subRail3.stage1': { ko: '가장 먼 구간. 무너진 천장 조각까지 치워야 한다.', en: 'The farthest segment. Even fallen ceiling has to be cleared.' },
  'proj.subRail3.stage2': { ko: '길고 곧은 구간에 침목을 놓는다. 끝이 보이지 않는다.', en: 'I set ties along a long straight run. I can’t see the end of it.' },
  'proj.subRail3.stage3': { ko: '마지막 레일을 잇는다. 핸드카를 굴리자, 공업지대의 찬 공기가 밀려온다.', en: 'I join the last rail. I push the hand-car, and the cold air of the Industrial yard rolls in.' },
  'proj.subRail3.workNote': { ko: '공업지대 방면 선로를 이어붙였다.', en: 'Extended the Industrial-bound rails.' },
  'proj.subRail3.doneToast':{ ko: '3구간이 개통됐다. 가장 먼 공업지대까지 노선이 이어졌다 — 이제 겨울이 나를 가두지 못한다.', en: 'Segment 3 is open. The line reaches the far Industrial yard — winter can’t wall me in now.' },
  'proj.subRail3.memoir': { ko: '{day}일째. 마지막 구간, 공업지대 방면을 개통했다. 무너진 천장을 치우고 긴 직선에 침목을 놓았다. 세 갈래 노선이 어둠 아래로 뻗는다. 도시의 혈관은 아직 뛴다 — 내가 되살렸다.', en: 'Day {day}. Opened the last segment, toward the Industrial yard. Cleared collapsed ceiling, laid ties down a long straight. Three lines now reach under the dark. The city’s veins still beat — I brought them back.' },
  // 기록 탭 지하 섹션 제목
  'record.regionSubway':  { ko: '지하 노선', en: 'The Underground Line' },

  /* ── 1.3 「고요한 고원」 ── */
  // 대형 프로젝트: 케이블카 복구
  'proj.cablecar.name':   { ko: '케이블카 복구', en: 'Cable Car Recovery' },
  'proj.cablecar.stage1': { ko: '무너진 승강장 잔해를 걷어내고 지주를 세운다. 산바람이 세다.', en: 'Clear the collapsed platform debris and raise the pylons. The mountain wind is fierce.' },
  'proj.cablecar.stage2': { ko: '끊어진 케이블을 절벽 너머로 다시 건다. 손이 곱는다.', en: 'String the snapped cable back across the cliff. My hands go numb.' },
  'proj.cablecar.stage3': { ko: '곤돌라를 매달고 구동부를 손본다. 삐걱, 한 칸이 움직인다.', en: 'Hang the gondola and mend the drive. With a creak, one car moves.' },
  'proj.cablecar.workNote': { ko: '케이블카 복구 작업을 했다.', en: 'Worked on the cable car recovery.' },
  'proj.cablecar.doneToast':{ ko: '케이블카가 다시 움직인다. 이제 고원까지 오르는 길이 훨씬 짧아졌다.', en: 'The cable car runs again. The climb to the highland is far shorter now.' },
  'proj.cablecar.memoir': { ko: '{day}일째. 케이블카를 되살렸다. 잔해를 걷고, 케이블을 걸고, 곤돌라를 매다는 데 며칠이 걸렸다. 산이 조금 더 가까워졌다.', en: 'Day {day}. I brought the cable car back. Days of clearing rubble, stringing cable, hanging a gondola. The mountain feels a little closer now.' },
  // 대형 프로젝트: 관측소
  'proj.observatory.name':   { ko: '관측소 건설', en: 'Observatory Build' },
  'proj.observatory.stage1': { ko: '언덕 위에 콘크리트 기초를 붓는다. 밤이면 하늘이 유난히 가깝다.', en: 'Pour a concrete base on the hill. At night the sky feels unusually close.' },
  'proj.observatory.stage2': { ko: '돔의 골조를 둥글게 세운다. 별빛이 골조 사이로 샌다.', en: 'Raise the dome frame in a ring. Starlight leaks between the ribs.' },
  'proj.observatory.stage3': { ko: '돔을 씌우고 망원경을 앉힌다. 슬릿을 열자, 하늘이 눈에 들어온다.', en: 'Cap the dome and seat the telescope. I open the slit, and the sky comes in.' },
  'proj.observatory.workNote': { ko: '관측소 건설 작업을 했다.', en: 'Worked on the observatory build.' },
  'proj.observatory.doneToast':{ ko: '관측소가 완성됐다. 맑은 밤이면 이제 하늘이 무언가를 보여줄 것이다.', en: 'The observatory is done. On clear nights the sky will show me things now.' },
  'proj.observatory.memoir': { ko: '{day}일째. 언덕 위에 관측소를 세웠다. 기초를 붓고, 돔을 올리고, 망원경을 앉혔다. 이제 맑은 밤이면 나는 오래 서서 하늘을 본다.', en: 'Day {day}. I built an observatory on the hill. Poured a base, raised a dome, seated a telescope. On clear nights now, I stand a long while and watch the sky.' },
  // 고도 페널티 (스키 로지)
  'highland.altitudeFuel':{ ko: '🏔️ 고도가 높아 난방에 연료가 {n} 더 들었다.', en: '🏔️ The altitude burned {n} more fuel to stay warm.' },
  'highland.altitudeCold':{ ko: '🏔️ 고도 난방 연료가 떨어졌다 — 벽난로의 온기가 잦아든다.', en: '🏔️ Ran out of altitude heating fuel — the hearth’s warmth fades.' },
  // 눈사태 (겨울 고원 재난)
  'avalanche.forecast':   { ko: '🏔️ 능선에서 낮은 우르릉 소리가 난다. 눈사태가 임박했다 — 오늘 고원에 오르려면 각오해야 한다.', en: '🏔️ A low rumble rolls off the ridge. An avalanche is near — think twice before climbing today.' },
  'avalanche.blocked':    { ko: '🏔️ 눈사태가 길을 덮었다. 고원(리조트)이 며칠간 막혔다.', en: '🏔️ An avalanche buried the path. The highland resort is closed for a few days.' },
  'avalanche.cleared':    { ko: '🏔️ 눈이 다져졌다. 고원으로 가는 길이 다시 열렸다.', en: '🏔️ The snow has settled. The way to the highland is open again.' },
  'avalanche.blockedToast':{ ko: '눈사태로 길이 막혔다. {n}일 뒤 다시 열린다.', en: 'The path is blocked by avalanche. It reopens in {n} days.' },
  'avalanche.title':      { ko: '🏔️ 눈사태 경보', en: '🏔️ Avalanche Warning' },
  'avalanche.body':       { ko: '능선이 우르릉거린다. 리조트로 가는 정규 경로가 위태롭다. 위험을 무릅쓰고 우회로로 오를 수도, 오늘은 돌아설 수도 있다.', en: 'The ridge is rumbling. The usual route to the resort is unsafe. You can take the risky detour up, or turn back for today.' },
  'avalanche.detour':     { ko: '⚠️ 위험 우회로로 오른다 (성공률 -15%p · 시간 증가 · 보상 1.5배 · 부상 위험)', en: '⚠️ Take the risky detour (success -15%p · slower · loot ×1.5 · injury risk)' },
  'avalanche.turnback':   { ko: '오늘은 돌아선다 (고원이 며칠 막힘)', en: 'Turn back for today (highland closed for a few days)' },
  'avalanche.turnedback': { ko: '돌아섰다. 눈사태가 지나갈 때까지 고원은 막힌다.', en: 'You turned back. The highland is closed until the avalanche passes.' },
  'avalanche.detourLoot': { ko: '⚠️ 위험을 무릅쓴 만큼, 남들이 못 가는 곳까지 뒤졌다 — 전리품이 넉넉하다.', en: '⚠️ The risk paid off — you reached what others couldn’t. The haul is generous.' },
  'avalanche.detourHurt': { ko: '⚠️ 우회로의 눈길에서 미끄러졌다.', en: '⚠️ You slipped on the detour’s icy path.' },
  // 밤하늘 수집 (관측소 완공 후 맑은 밤)
  'nightsky.foundNote':   { ko: '🌌 맑은 밤, 하늘이 무언가를 보여줬다 — 수첩에 「{title}」을 스케치했다.', en: '🌌 On a clear night, the sky showed something — you sketched “{title}” in your notebook.' },
  'sketch.tag':           { ko: '밤하늘 스케치', en: 'A Night-Sky Sketch' },
  'record.sketchTitle':   { ko: '밤하늘 스케치 ({n}/{total})', en: 'Night-Sky Sketches ({n}/{total})' },
  'record.regionResort':  { ko: '리조트 폐허', en: 'The Resort Ruins' },

  /* ── 1.4 「금지 구역」 ── */
  // 금지 구역 지역/구역
  'memo.tagRegion.research': { ko: '금지 구역에서 — 봉쇄선 너머의 기록', en: 'From the forbidden zone — records past the cordon' },
  'record.regionResearch': { ko: '기밀 문서', en: 'Classified Documents' },
  /* ── v1.5 페리 리워크: 좌초 여객선 메모 풀 ── */
  'memo.tagRegion.harbor': { ko: '좌초한 여객선에서 — 갑판 판잣집의 내력', en: 'From the grounded liner — how the deck shanty came to be' },
  'record.regionHarbor':  { ko: '좌초한 여객선', en: 'The Grounded Liner' },
  'record.truthTitle':    { ko: '📖 그날의 진실', en: '📖 The Truth of That Day' },
  'map.survivorLight':    { ko: '응답한 먼 불빛', en: 'A distant light, answering' },
  'forbidden.intro':      { ko: '봉쇄선 너머의 일이다. 방호복 없이는 한 걸음도 들일 수 없다.', en: 'This is beyond the cordon. Without a suit, not one step in.' },
  // 방호복
  'hazmat.name':          { ko: '방호복', en: 'Hazmat Suit' },
  'hazmat.craftHint':     { ko: '금지 구역에 들어가려면 필요하다 (내구 {dur}회 · 탐험마다 닳는다)', en: 'Needed to enter the forbidden zone (durability {dur} · wears each expedition)' },
  'hazmat.craftBtn':      { ko: '만들기', en: 'Make' },
  'hazmat.repairBtn':     { ko: '수선', en: 'Mend' },
  'hazmat.ready':         { ko: '온전함', en: 'Intact' },
  'hazmat.durLine':       { ko: '내구 {dur}/{max}회', en: 'Durability {dur}/{max}' },
  'hazmat.crafted':       { ko: '방호복을 지어 입었다. 내구 {dur}회.', en: 'You made the hazmat suit and put it on. Durability {dur}.' },
  'hazmat.craftedNote':   { ko: '🥽 방호복을 완성했다 — 이제 봉쇄선을 넘을 수 있다.', en: '🥽 Finished the hazmat suit — you can cross the cordon now.' },
  'hazmat.firstHint':     { ko: '봉쇄선 너머, 검문소부터 하나씩.', en: 'Past the cordon — start at the checkpoint.' },
  'hazmat.repaired':      { ko: '방호복을 수선했다. 내구 {dur}회로 돌아왔다.', en: 'You mended the suit. Back to {dur} durability.' },
  'hazmat.alreadyFull':   { ko: '방호복은 이미 온전하다.', en: 'The suit is already intact.' },
  'hazmat.needCraft':     { ko: '먼저 방호복을 만들어야 한다.', en: 'You need to make a suit first.' },
  'hazmat.blocked':       { ko: '방호복 없이는 봉쇄선을 넘을 수 없다.', en: 'You can’t cross the cordon without a hazmat suit.' },
  'hazmat.wornOut':       { ko: '방호복이 다 닳았다. 수선해야 다시 들어갈 수 있다.', en: 'The suit is worn out. Mend it before going back in.' },
  'hazmat.wearNote':      { ko: '🥽 방호복이 조금 닳았다 (내구 {dur}회 남음).', en: '🥽 The suit wore down a little (durability {dur} left).' },
  // 무전 송출
  'radio.broadcastName':  { ko: '무전 송출', en: 'Broadcast' },
  'radio.broadcastHint':  { ko: '수집한 방송·기록을 하나씩 내보낸다 (에너지 {e} · 송출 {sent}/{total} · 불빛 {lit})', en: 'Send out what you gathered, one at a time (energy {e} · sent {sent}/{total} · lights {lit})' },
  'radio.broadcastBtn':   { ko: '송출', en: 'Send' },
  'radio.allSentBtn':     { ko: '다 보냄', en: 'All sent' },
  'radio.needBase':       { ko: '무전 기지를 먼저 세워야 한다.', en: 'You need to raise the radio base first.' },
  'radio.allSent':        { ko: '모아둔 것은 이미 다 내보냈다.', en: 'You’ve sent out all you had.' },
  'radio.sentLit':        { ko: '📡 신호를 실어 보냈다. 지도 저편에서 불빛이 하나 켜진다 — 이제 {n}개.', en: '📡 You sent the signal out. Far off on the map, one more light comes on — {n} now.' },
  'radio.sentNoLit':      { ko: '📡 신호를 실어 보냈다. 어둠 속으로 퍼져 나간다.', en: '📡 You sent the signal out. It spreads into the dark.' },
  // 무전 기지 (대형 프로젝트)
  'proj.radioBase.name':      { ko: '무전 기지 복구', en: 'Radio Base Recovery' },
  'proj.radioBase.stage1':    { ko: '쓰러진 안테나 마스트를 다시 세운다. 접시를 하늘로 돌려놓는다.', en: 'I raise the fallen antenna mast again, turning the dish back to the sky.' },
  'proj.radioBase.stage2':    { ko: '송신기 회로를 잇는다. 끊긴 배선을 하나씩 되살린다.', en: 'I wire the transmitter back together, reviving the broken circuits one by one.' },
  'proj.radioBase.stage3':    { ko: '발전·축전 계통을 붙인다. 계기에 바늘이 처음으로 움찔한다.', en: 'I hook up the power and battery lines. For the first time, a needle twitches on the gauge.' },
  'proj.radioBase.workNote':  { ko: '무전 기지 복구를 조금 진척시켰다.', en: 'Made some progress recovering the radio base.' },
  'proj.radioBase.doneToast': { ko: '무전 기지가 살아났다. 이제 모아둔 방송과 기록을 저 위로 실어 보낼 수 있다.', en: 'The radio base has come alive. Now I can send what I gathered up there.' },
  'proj.radioBase.memoir':    { ko: '{day}일째. 봉쇄선 너머의 무전 기지를 되살렸다. 안테나를 세우고, 송신기를 잇고, 전원을 붙이는 데 며칠이 걸렸다. 이제 이 폐허에서도 신호 하나를 내보낼 수 있다.', en: 'Day {day}. I brought the radio base beyond the cordon back to life. Days of raising the antenna, wiring the transmitter, hooking up power. Even from this ruin, I can send out one signal now.' },
  // 통로 복선 회수
  'proj.clearPassage.revealNote': { ko: '🕯️ 정리한 통로 저편의 어둠이, 봉쇄선 아래로 이어지는 지하 길이었다. 이제 저 아래로 내려갈 수 있다.', en: '🕯️ The dark beyond the cleared passage was an underground way leading below the cordon. I can go down there now.' },
  // 박사 정기 교신 (Day10000 다리)
  'ev.doctorReg.title':   { ko: '정기 교신', en: 'A Regular Contact' },
  'ev.doctorReg.text':    { ko: '무전 기지가 궤도의 관측소와 이어졌다. 잡음 사이로 그 목소리가, 이번엔 정해진 시각에 또렷이 들어온다.<br><br>"신호 잘 받았다. 네가 켠 불빛을 여기서 세고 있다. 아홉 해를 버틴 자리가 있다는 건, 우리가 내려갈 이유가 된다."', en: 'The radio base has linked to the station in orbit. Through the static, the voice comes in clear now, at a set hour.<br><br>"Signal received. I’m counting the lights you lit, from up here. That a place has lasted nine winters — that gives us a reason to come down."' },
  'ev.doctorReg.textTruth': { ko: '"…그 문서들을 다 읽었구나. 그럼 내가 누구였는지도 알겠지. 나는 그 겨울을 막지 못한 사람이고, 그래서 네 불빛을 끝까지 지켜보는 사람이다."', en: '"…so you read all the files. Then you know who I was. I’m the one who couldn’t stop that winter — and so, the one who watches your light to the end."' },
  'ev.doctorReg.c0':      { ko: '오래 응답을 나눴다', en: 'You trade word for a long while' },
  'ev.doctorReg.r0':      { ko: '교신은 잡음에 묻혔다. 하지만 이 신호는 이제 혼자 울리지 않는다.', en: 'The contact sinks into static. But this signal no longer sounds alone.' },
  // 엔딩 다리 (송출 이력 반영)
  'ev.ending.textSignal': { ko: '무전병이 덧붙인다. "당신 신호를 따라왔습니다. 지도에 불빛이 하나씩 켜지는 걸, 우리도 봤어요."', en: 'The radio operator adds: "We followed your signal. We saw them too — the lights coming on across the map, one by one."' },
  // 최종장 "그날의 진실"
  'truth.title':          { ko: '그날의 진실', en: 'The Truth of That Day' },
  'truth.tag':            { ko: '흩어진 기록을 이어 붙인 정리', en: 'Scattered records, pieced together' },
  'truth.p1':             { ko: '처음엔 병이었다. 도시를 잠그고, 사람들을 안으로 몰았다. 봉쇄가 사람을 살리려던 것인지 가두려던 것인지는, 이제 그들 자신도 몰랐다.\n모형은 번번이 빗나갔다. 전파는 언제나 조금씩 빨랐다.', en: 'First it was a sickness. They locked the cities, and drove people inward. Whether the cordon was to save people or to hold them in — by the end, even they no longer knew.\nThe models kept missing. The spread was always a little faster.' },
  'truth.p2':             { ko: '멈출 방법은 하나뿐이라고 그들은 적었다. 가장 안쪽 원을 불로 지우기로. 대기에 남을 그을음이 몇 해의 겨울을 부를 걸 알면서도, 그들은 그것을 눌렀다.\n반대한 세 사람의 이름은 지워졌다. 그중 하나가 이 아래에 남았다.', en: 'There was only one way to stop it, they wrote. Erase the innermost ring with fire. Knowing the soot it left would call down years of winter, they pressed it anyway.\nThe names of the three who dissented were struck out. One of them stayed down here.' },
  'truth.p3':             { ko: '그 사람은 내려가지 못하는 대신, 위에서 지켜보기로 했다. 궤도의 관측소로 지상의 신호를 세면서. 버티는 불빛이 하나라도 있는 한, 이건 실패가 아니라고.\n아홉 번의 겨울이면 대기가 가라앉는다고 그는 계산했다. 그리고 그때까지 켜져 있을 불빛 하나를, 이름도 없이 기다렸다.', en: 'That one could not go down, so they chose to watch from above — counting ground signals from the orbital station. As long as one light held out, they wrote, this was not a failure.\nNine winters, and the air would settle, was the calculation. And they waited, nameless, for the one light that would still be burning by then.' },

  /* ── BGM ── */
  'bgm.notFound':     { ko: 'BGM 파일을 찾을 수 없습니다 (BGM 폴더)', en: 'BGM files not found (BGM folder)' },

  /* ── 계절 desc (SEASONS) — LN/LD가 아닌 direct 참조는 없지만 병기용으로 game.js에서 desc/nameEn 사용 ── */

  /* ── 생존 수첩 (구 튜토리얼 모달 → 전 거주자의 수첩) ── */
  'journalpg.next':      { ko: '다음 장 ▸', en: 'Next page ▸' },
  'journalpg.close':     { ko: '수첩 덮기', en: 'Close notebook' },
  'journalpg.indicator': { ko: '{cur} / {total}', en: '{cur} / {total}' },

  'jnl.help.p1.title': { ko: '낡은 수첩', en: 'A Worn Notebook' },
  'jnl.help.p1.body':  {
    ko: '누군가 이 컨테이너에 먼저 살았다. 침대 밑에서 손때 묻은 수첩을 발견했다.<br>첫 장에 급하게 휘갈긴 글씨.<br><br>🎒 <b>탐험</b> — 지도에서 지역을 골라 준비물을 챙기면 성공률이 오른다. 하루 5번까지, 다녀오면 시간이 흐른다.',
    en: 'Someone lived in this container before you. You found a worn notebook under the bed.<br>The first page is scrawled in a hurry.<br><br>🎒 <b>Expeditions</b> — pick a region on the map and gear up to raise your odds. Up to 5 a day; time passes when you return.',
  },
  'jnl.help.p2.title': { ko: '두 번째 장', en: 'The Second Page' },
  'jnl.help.p2.body':  {
    ko: '글씨가 조금 차분해진다. 살아가는 법을 적어둔 모양이다.<br><br>🥫💧⚡ <b>생존</b> — 게이지를 클릭하면 먹고, 마시고, 잔다. 에너지가 바닥나면 반드시 🛌 자야 한다. 침대가 있으면 훨씬 푹 잔다.',
    en: 'The handwriting settles a little — notes on how to get by.<br><br>🥫💧⚡ <b>Survival</b> — click a gauge to eat, drink, or sleep. Run out of energy and you must 🛌 sleep. A bed makes for far deeper rest.',
  },
  'jnl.help.p3.title': { ko: '얼룩진 페이지', en: 'A Stained Page' },
  'jnl.help.p3.body':  {
    ko: '얼룩이 진 페이지 — 손끝에 자재 부스러기가 묻어난다.<br><br>🔨 <b>제작</b> — 가구는 줍는 게 아니라 만드는 것. 천·부품·건축재를 모아 제작대에서 만든다.<br>😊 <b>쾌적함</b> — 가구·조명·청결·정든 집이 쾌적함을 쌓고, 탐험 성공률과 회복 속도를 끌어올린다.',
    en: 'This page is stained — flecks of building material still cling to it.<br><br>🔨 <b>Crafting</b> — furniture is mostly built, not found. Gather cloth, parts and material, then craft it at the workbench.<br>😊 <b>Comfort</b> — furniture, light, cleanliness and a settled home build comfort, boosting expedition success and recovery.',
  },
  'jnl.help.p4.title': { ko: '접힌 모서리', en: 'A Folded Corner' },
  'jnl.help.p4.body':  {
    ko: '모서리가 접혀 있다. 자주 들춰본 페이지인 듯.<br><br>🏠 <b>거처</b> — 구역마다 특성·유지비·제약이 다르다. 빗물받이·텃밭 같은 개조로 자급자족할 수 있다.<br>🌤️ <b>세월</b> — 날씨는 며칠 단위로, 계절은 12일 주기로 바뀐다. 겨울을 대비해 미리 쌓아두어라.',
    en: 'A dog-eared corner — this page must have been read often.<br><br>🏠 <b>Shelters</b> — every district has its own traits, upkeep and limits. Mods like rain catches and garden boxes help you become self-sufficient.<br>🌤️ <b>Seasons</b> — weather shifts over a few days, and seasons turn every 12 days. Stock up before winter arrives.',
  },
  'jnl.help.p5.title': { ko: '마지막 장', en: 'The Last Page' },
  'jnl.help.p5.body':  {
    ko: '마지막 장엔 딱 한 줄. 서두르다 만 듯, 그러나 또박또박.<br><br><b>카메라</b>: <kbd>우클릭 드래그</kbd> 또는 <kbd>Q</kbd>/<kbd>E</kbd> 회전 · 휠 줌 (줌아웃하면 주변 폐허가 보인다)<br><br>진행 상황은 자동으로 저장된다. 그리고 이 수첩은, 이제 당신의 것이다.',
    en: 'Only one line on the last page — written in haste, but carefully all the same.<br><br><b>Camera</b>: <kbd>right-click drag</kbd> or <kbd>Q</kbd>/<kbd>E</kbd> to rotate · wheel to zoom (zoom out to see the ruins around you)<br><br>Progress saves automatically. And this notebook — it\'s yours now.',
  },

  /* ── 신규 3일 튜토리얼 (첫 게임 한정) ── */
  'jnl.tut1.title': { ko: 'Day 1 — 첫 장', en: 'Day 1 — The First Page' },
  'jnl.tut1.body':  {
    ko: '수첩 맨 앞장에 다급하게 적힌 메모.<br><br>"뭐부터 해야 할지 모르겠다면 — 갈증부터 해결해라. 배고픔보다 먼저 사람을 지치게 하는 건 갈증이다."<br><br>💧 게이지를 클릭하면 마신다. 인벤토리의 가구는 클릭해서 바닥에 배치할 수 있다 — 배치한 뒤 다시 클릭하면 회전·회수도 가능하다.',
    en: 'A hurried note on the notebook\'s first page.<br><br>"If you don\'t know where to start — deal with thirst first. It wears you down faster than hunger ever will."<br><br>💧 Click a gauge to drink. Furniture in your inventory can be clicked to place it on the floor — click a placed piece again to rotate or reclaim it.',
  },
  'jnl.tut2.title': { ko: 'Day 2 — 두 번째 메모', en: 'Day 2 — A Second Note' },
  'jnl.tut2.body':  {
    ko: '다음 장엔 지도가 손으로 그려져 있다.<br><br>"곳간은 저절로 차지 않는다. 지도를 펴고 위험이 적은 지역부터 나가보아라. 준비물을 챙기면 훨씬 안전하다."<br><br>🎒 HUD의 배낭 아이콘으로 탐험 지도를 열 수 있다.',
    en: 'The next page has a map sketched by hand.<br><br>"The pantry doesn\'t fill itself. Open the map and start with the safer regions. Gearing up first makes it far safer."<br><br>🎒 Use the backpack icon on the HUD to open the expedition map.',
  },
  'jnl.tut3.title': { ko: 'Day 3 — 세 번째 메모', en: 'Day 3 — A Third Note' },
  'jnl.tut3.body':  {
    ko: '페이지 끝에 짧게 덧붙여진 말.<br><br>"주운 것만으로는 오래 못 버틴다 — 제작대에서 필요한 걸 직접 만들어라. 그리고 가끔은 청소도 해라, 지저분한 채로 오래 버틴 사람은 없었다."<br><br>🔨 제작대, 🧹 청소 버튼이 HUD에 있다.',
    en: 'A short line added at the bottom of the page.<br><br>"Scavenging alone won\'t carry you far — craft what you need at the workbench. And clean now and then; no one lasted long living in filth."<br><br>🔨 Workbench and 🧹 Clean buttons are on the HUD.',
  },

  /* ── 찢어진 쪽지 (일회성 팁) ── */
  'tip.rain':   { ko: '"빗물을 받아둘 걸 마련해라 — 하늘이 주는 건 공짜다." — 빗물받이를 만들면 비 오는 날 물을 모을 수 있다.', en: '"Set something up to catch the rain — what the sky gives is free." — a rain catch collects water on rainy days.' },
  'tip.snow':   { ko: '"눈이 내리면 거처가 더 시린 법이다. 단열재를 들이는 걸 고려해봐라." — 악천후엔 쾌적함이 떨어지니 대비하자.', en: '"Snow makes a shelter colder than it looks. Consider getting some insulation." — comfort drops in bad weather, so plan ahead.' },
  'tip.injury': { ko: '"다친 채로 버티지 마라. 방치하면 곪는다." — 부상은 탐험 패널에서 재료를 모아 치료할 수 있다.', en: '"Don\'t just tough out an injury. Left alone, it festers." — treat injuries from the expedition panel once you have the materials.' },
  'tip.event':  { ko: '"가끔 낯선 이가 문을 두드린다. 매번 같은 답이 정답은 아니다." — 인카운터의 선택은 상황에 따라 다르게 두는 게 좋다.', en: '"Now and then a stranger knocks. The same answer isn\'t always right." — weigh each encounter\'s choice on its own.' },
  'tip.energy': { ko: '"눈이 침침해질 때까지 버티지 마라. 그만 자라는 뜻이다." — 에너지가 낮으면 취침으로 회복해야 한다.', en: '"Don\'t push on until your eyes blur. That\'s your body telling you to sleep." — rest with sleep once energy runs low.' },
  'tip.winter': { ko: '"겨울이 왔다. 곳간을 미리 채워두지 않은 자에게는 길고 매서운 계절이다." — 겨울엔 허기가 더 빨리 지고 텃밭도 얼어붙는다.', en: '"Winter\'s here. For those who didn\'t stock up, it\'s a long, bitter season." — hunger drains faster and gardens freeze in winter.' },
  'tip.stack':  { ko: '"상판이 있는 가구 위엔 작은 소품을 올려둘 수 있다." — 테이블 같은 가구 위에 다른 소품을 겹쳐 배치해보자.', en: '"Furniture with a flat top can hold smaller things on it." — try placing small items on top of tables and the like.' },
  'tip.freshfood': { ko: '신선식품은 오래 못 간다. 냉장고가 없다면 — 오늘 먹는 게 남는 것이다.', en: "Fresh food doesn't keep. No fridge? Eating it today is how you save it." },

  /* ── 퀘스트 트래커 (신규 게임 온보딩) ── */
  'quest.head': { ko: '할 일', en: 'To Do' },
  'quest.drink.text': { ko: '💧 게이지를 클릭해 물을 마셔보자', en: 'Click the 💧 gauge to drink water' },
  'quest.eat.text': { ko: '🥫 게이지를 클릭해 뭔가 먹어보자', en: 'Click the 🥫 gauge to eat something' },
  'quest.place.text': { ko: '🔧 배치 모드를 켜고 가구를 1개 놓아보자 (침대 추천)', en: 'Turn on 🔧 edit mode and place 1 furnishing (bed recommended)' },
  'quest.depart.text': { ko: '🎒 지도를 열어 첫 탐험을 나서보자', en: 'Open the 🎒 map and set out on your first expedition' },
  'quest.sleep.text': { ko: '🛌 취침으로 하루를 마무리하자', en: 'End the day with 🛌 sleep' },
  'quest.craft.text': { ko: '🔨 제작대에서 무엇이든 1개 만들어보자', en: 'Craft anything once at the 🔨 workbench' },
  'quest.clean.text': { ko: '🧹 청소를 1회 해보자', en: 'Clean the shelter 🧹 once' },
  'quest.progress': { ko: '{cur}/{total}', en: '{cur}/{total}' },
  'quest.doneToast': { ko: '🎉 이제 스스로 살아남을 차례', en: '🎉 Now it\'s up to you to survive' },
  // ── 퀘스트 서사 (이전 거주자의 수첩 목소리) — lore(도입) / done(완료 payoff) ──
  'quest.drink.lore':  { ko: "수첩 첫 장 — '눈 뜨면 제일 먼저 물부터. 목이 마르면 판단력이 먼저 죽는다.'", en: "First page — 'Water first, always. Thirst kills your judgment before it kills you.'" },
  'quest.drink.done':  { ko: '몸이 조금 깨어난다. 수첩 주인의 말이 맞았다.', en: "Your body wakes a little. The notebook's owner was right." },
  'quest.eat.lore':    { ko: "'빈속으로는 반나절도 못 버틴다. 그리고 신선한 건 먼저 먹어라 — 냉장고가 없으면 내일이면 상한다.'", en: "'An empty stomach won't last half a day. And eat the fresh stuff first — without a fridge, it won't see tomorrow.'" },
  'quest.eat.done':    { ko: '끔찍한 통조림 맛. 하지만 살아있다는 맛이기도 하다.', en: 'The can tastes awful. It also tastes like being alive.' },
  'quest.place.lore':  { ko: "'집이라 부르려면 뭐라도 놓아야지. 나는 침대부터 들였다. 잘 곳이 정해지면 마음도 정해진다.'", en: "'To call it home, put something in it. I started with a bed. Settle where you sleep, and the heart follows.'" },
  'quest.place.done':  { ko: '방이 조금 덜 비어 보인다. 이상하게 든든하다.', en: 'The room looks a little less empty. Strangely reassuring.' },
  'quest.depart.lore': { ko: "'해가 높을 때 나가라. 가까운 주거지역부터. 욕심은 부상으로 돌아온다.'", en: "'Go out while the sun is high. Start with the houses nearby. Greed comes back as injuries.'" },
  'quest.depart.done': { ko: '문을 나선다 — 하루의 절반은 바깥에 있다.', en: 'Out the door. Half of every day lives outside.' },
  'quest.sleep.lore': { ko: "'기운이 없을 땐 자야지. 별수 없다 — 몸이 장부고, 잠이 결산이다.'", en: "'When the strength is gone, sleep. No way around it — the body keeps the ledger, and sleep settles it.'" },
  'quest.sleep.done': { ko: '눈꺼풀이 무겁다. 아침이 알아서 하루를 정리해줄 것이다.', en: 'Your eyelids are heavy. Morning will sort the day out for you.' },
  'quest.craft.lore':  { ko: "'주운 것은 재료일 뿐. 손을 움직여야 물건이 된다. 천 두 장이면 붕대 하나.'", en: "'What you scavenge is only material. Hands make it into things. Two cloth makes one bandage.'" },
  'quest.craft.done':  { ko: '손끝에서 뭔가 만들어지는 감각 — 오랜만이다.', en: "The feeling of making something. It's been a while." },
  'quest.clean.lore':  { ko: "'마지막으로 — 집을 닦아라. 더러운 집엔 병이 먼저 이사 온다.'", en: "'Last — keep it clean. Sickness moves into a dirty home before you do.'" },
  'quest.clean.done':  { ko: '수첩의 첫 장이 끝났다. 이제 이 하루의 리듬은 당신의 것이다.', en: "The notebook's first chapter ends here. The rhythm of these days is yours now." },
};
