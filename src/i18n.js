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
  'title.ver':      { ko: 'Nine Winters · v0.9.1 Beta', en: 'Nine Winters · v0.9.1 Beta' },
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
  'settings.title':   { ko: '■ 설정', en: '■ Settings' },
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
  'display.title':       { ko: '🖥️ 디스플레이', en: '🖥️ Display' },
  'opt.dispmode':        { ko: '화면 모드', en: 'Screen mode' },
  'disp.windowed':       { ko: '창 화면', en: 'Windowed' },
  'disp.fullscreen':     { ko: '전체화면', en: 'Fullscreen' },
  'disp.borderless':     { ko: '창없는 전체화면', en: 'Borderless fullscreen' },
  'opt.dispres':         { ko: '해상도', en: 'Resolution' },
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
  'toast.emptySlot':      { ko: '빈 슬롯입니다', en: 'Empty slot' },
  'none':                 { ko: '없음', en: 'None' },
  'free':                 { ko: '무료', en: 'free' },
  'current':              { ko: '(현재)', en: '(current)' },

  /* ── 취침 ── */
  'sleep.cantDuringExp':  { ko: '탐험대가 돌아오기 전엔 잘 수 없습니다', en: 'You cannot sleep until the expedition returns' },
  'sleep.noteBed':        { ko: '😴 침대에서 푹 잤습니다. (에너지 {e})', en: '😴 Slept soundly in the bed. (energy {e})' },
  'sleep.noteFloor':      { ko: '😴 바닥에서 웅크리고 잤습니다. (에너지 {e})', en: '😴 Curled up and slept on the floor. (energy {e})' },
  'sleep.autoBed':        { ko: '😴 지쳐 곯아떨어졌다... 침대에서 아침을 맞았다 (⚡{e})', en: '😴 Collapsed from exhaustion... woke in the bed to morning (⚡{e})' },
  'sleep.autoFloor':      { ko: '😴 지쳐 곯아떨어졌다... 바닥에서 아침을 맞았다 (⚡{e})', en: '😴 Collapsed from exhaustion... woke on the floor to morning (⚡{e})' },
  'sleep.wakeBed':        { ko: '😴 침대에서 푹 잤다 — 아침이 밝았다 (⚡{e})', en: '😴 Slept soundly in the bed — morning has come (⚡{e})' },
  'sleep.wakeFloor':      { ko: '😴 바닥에서 웅크리고 잤다 — 아침이 밝았다 (⚡{e})', en: '😴 Curled up on the floor — morning has come (⚡{e})' },
  'day.napMorning':       { ko: '😴 결국 졸음을 이기지 못했다 — 눈을 뜨니 아침이다 (⚡{e})', en: "😴 Sleep finally won — you wake and it's morning (⚡{e})" },
  'day.expNight':         { ko: '🌒 밤새 폐허를 뒤졌다 — 동틀 녘에야 돌아왔다', en: '🌒 You scavenged through the night — back only at first light' },

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
  'auto.depart':  { ko: '🤖 [자동] {emoji} {name}(으)로 탐험을 떠났습니다', en: '🤖 [Auto] Departed for {emoji} {name}' },
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
  'weather.changed':  { ko: '날씨가 {name}(으)로 바뀌었습니다', en: 'The weather turned to {name}' },
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
  'mode.hard.desc':   { ko: '탐험 전리품 −30% · 배고픔/갈증 소모 +50%. 첫 겨울이 진짜 시험이 된다.', en: 'Expedition loot −30% · hunger/thirst drain +50%. The first winter becomes a real test.' },
  'mode.back':        { ko: '◂ 뒤로', en: '◂ Back' },

  /* ── 지도 / 탐험 ── */
  'map.title':        { ko: '🗺️ 탐험 지도 — 어디로 가시겠습니까?', en: '🗺️ Expedition Map — where will you go?' },
  'map.pick':         { ko: '지도의 파밍 지역(테두리 박스)을 선택하세요.', en: 'Pick a scavenging region (boxed) on the map.' },
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
  'move.journeyNote': { ko: '🚶 {name}(으)로 이동 — 여정에 3시간이 걸렸습니다.', en: '🚶 Traveled to {name} — the journey took 3 hours.' },
  'move.done':        { ko: '{emoji} {name}(으)로 이주했습니다{journey}', en: 'Relocated to {emoji} {name}{journey}' },
  'move.journeyTag':  { ko: ' (여정 3시간)', en: ' (3h journey)' },
  'move.confirmFurniture':{ ko: '배치된 가구 {n}개는 이 거처에 남습니다. 이주할까요?', en: 'Your {n} placed furnishings will stay behind. Move anyway?' },
  'move.newShelter':  { ko: '🏠 새 거처 발견 — 이주 지도를 확인하자', en: '🏠 New shelter found — check the relocation map' },
  'move.badge.title': { ko: '이주 가능한 거처가 있습니다', en: 'A shelter is ready to relocate to' },

  /* ── 거처 모달 ── */
  'shelter.modalTitle':{ ko: '🗺️ 구역과 거처', en: '🗺️ Districts & Shelters' },
  'shelter.intro':    { ko: '같은 구역 안에서는 자유롭게 오가지만, <b>다른 구역으로의 이주는 물자(🥫1+💧1)와 시간(3시간)</b>이 듭니다. 처음 입주하는 거처는 <b>정비 자원</b>이 필요합니다. 배치한 가구는 각 거처에 남고 인벤토리는 공유됩니다.', en: 'You can move freely within a district, but <b>relocating to another district costs supplies (🥫1+💧1) and time (3h)</b>. Moving into a shelter for the first time requires <b>refit resources</b>. Placed furniture stays with each shelter; your inventory is shared.' },
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
  'shelter.reqLabel': { ko: '필요 물자', en: 'Required' },
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
  'craft.noteRes':    { ko: '🔨 제작: {name}', en: '🔨 Crafted: {name}' },
  'craft.modDone':    { ko: '{emoji} {name} 설치 완료!', en: '{emoji} {name} installed!' },
  'craft.modNote':    { ko: '🔧 거처 개조: {name} 설치', en: '🔧 Shelter mod: installed {name}' },

  /* ── 일지 ── */
  'journal.title':    { ko: '📖 생존 일지', en: '📖 Survival Journal' },
  'journal.statsTitle':{ ko: '통계', en: 'Statistics' },
  'journal.statsLine':{ ko: 'Day {day} {sicon} · 탐험 {exp}회 (성공 {succ}) · 제작 {craft}회 · 연속 거주 {stay}일', en: 'Day {day} {sicon} · {exp} expeditions ({succ} succeeded) · {craft} crafts · {stay} days settled' },
  'journal.colTitle': { ko: '도감 — 배치해 본 가구 색상 {n}/84', en: 'Collection — furniture colors placed {n}/84' },
  'journal.achTitle': { ko: '업적 {n}/{total}', en: 'Achievements {n}/{total}' },
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
  /* ── 한파 (겨울 보스) ── */
  'coldsnap.forecast':{ ko: '📻 한파가 온다 — {n}일 뒤. 단열과 난방을 준비하세요.', en: '📻 A cold snap is coming — in {n} days. Ready your insulation and heating.' },
  'coldsnap.hit':     { ko: '❄️ 한파가 닥쳤습니다. 기온이 뚝 떨어졌습니다.', en: '❄️ A cold snap has hit. The temperature plunged.' },
  'coldsnap.toast':   { ko: '❄️ 한파 시작', en: '❄️ Cold snap begins' },
  'coldsnap.exposed': { ko: '🥶 찬바람이 벽 틈으로 파고들었습니다. 배고픔이 빨리 도집니다.', en: '🥶 The cold wind bites through the cracks. Hunger sets in fast.' },
  'coldsnap.defended':{ ko: '🔥 난로 곁에서 한파를 버텨냈습니다.', en: '🔥 You weathered the cold snap by the stove.' },
  'coldsnap.ended':   { ko: '🌤️ 한파가 물러갔습니다.', en: '🌤️ The cold snap has passed.' },
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
  'cat.pet':            { ko: '🐈 그르릉...', en: '🐈 Purr...' },

  'ev.ending.title':    { ko: '하늘에서 온 손님', en: 'A Visitor from the Sky' },
  'ev.ending.text':     { ko: '요란한 프로펠러 소리가 폐허의 정적을 갈랐다. 헬리콥터다.<br>방호복을 입은 백발의 과학자가 내려와 당신에게 걸어온다.<br>"믿을 수가 없군요. 관측 위성이 당신의 불빛을 10,000일 넘게 기록했습니다.<br>정화 구역이 완성됐습니다 — 함께 갑시다."', en: 'A roar of rotors tore through the silence of the ruins. A helicopter.<br>A white-haired scientist in a hazmat suit steps down and walks toward you.<br>"I can’t believe it. Our satellite recorded your light for over 10,000 days.<br>The cleansed zone is finished — come with us."' },
  'ev.ending.c0':       { ko: '🚁 박사와 함께 떠난다 (엔딩)', en: '🚁 Leave with the doctor (ending)' },
  'ev.ending.c1':       { ko: '아직은 여기 남는다', en: 'Stay here, for now' },
  'ev.ending.r0':       { ko: '당신은 천천히 고개를 끄덕이고, 마지막으로 집을 돌아보았다.', en: 'You nod slowly and take one last look back at your home.' },
  'ev.ending.r1':       { ko: '"...당신 같은 사람들 덕분에 이 별이 아직 살아있는 거겠죠."<br>박사는 통신기를 남기고 떠났다. 부르면 언제든 다시 온다고 했다.', en: '"...it’s people like you who keep this planet alive."<br>The doctor leaves a radio behind and departs — call, and they’ll return anytime.' },
  'ev.noResource':      { ko: ' (자원 부족)', en: ' (not enough)' },

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
  'quest.depart.text': { ko: '🎒 지도를 열어 첫 탐험을 보내보자', en: 'Open the 🎒 map and send your first expedition' },
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
