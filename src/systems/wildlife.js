/* ============================================================
   wildlife.js — Nine Winters 야생동물 로밍 시스템 (F-1a 「세계가 살아 있다」)
   ------------------------------------------------------------
   목적: 셸터 주변 근접 야외에 지역별 야생동물을 "희소 조우" 모델로 등장시킨다.
         디렉터 오더(TLOU 레퍼런스): 정적이 기본값, 동물은 사건. 폐허는 고요한데
         가끔 사슴 한 마리가 지나가면 숨을 멈추게 되는 — 그 느낌.
   원칙: cat.js 선례와 동일한 팩토리+의존성 주입(game.js→systems 단방향).
         메시는 전부 자체 복셀 절차 생성(외부 에셋 0, cat.js buildCatMesh 문법 재사용).
         사람 형상 금지 캐논 준수 — 전부 동물. 이벤트/밸런스 로직 무참조(연출+엔티티만).
         비영속: 세이브 스키마 불변 — 모든 상태 런타임.
   조우 모델(BAL.wildlife):
     - 동시 최대 1마리(새 종만 무리 2~3 예외). 30~90 게임분에 1회 등장, 20~60초 체류 후 퇴장.
     - 겨울엔 더 드묾(×winterRareMult). 개막 첫 아침 새는 보장 등장.
     - 아침 동틀녘, 동물 대신 발자국 데칼만 남는 날("밤새 뭔가 지나갔다").
   종별 고유 행동: 사슴=경계→도약 퇴장 / 까마귀=두 번 깡총→날아오름 / 여우=멈춰 이쪽 응시(2초)→퇴장
     / 토끼=지그재그 도주 / 갈매기=활공 선회 / 쥐=벽 따라 질주.
   사운드 훅: playSfx('wl_<id>') 지점만 코드에 — 파일은 미배치(폴백 무음). 디렉터 공급 예정.
   ============================================================ */
export function makeWildlifeSystem(ctx) {
  const {
    THREE, B, lamb, disposeDeep, makeCanvasTex, BAL,
    scene, state, opts,
    getRoom, districtOf, playSfx, shadowDirty,
    gameHour, seasonId, camCenter, getGameMin, getSnowCover,
    WILDLIFE_SPECIES, DISTRICT_WILDLIFE, SHELTER_WILDLIFE,
    getObstacles, // #95: buildEnv 등록 마당 장애물 [{x,z,r}] — 통과 방지 (없으면 우회 비활성)
  } = ctx;

  const W = BAL.wildlife;
  const PX = 0.02;                 // cat.js 와 동일 복셀 단위
  const group = new THREE.Group(); // 야생동물 컨테이너 (loadShelter 마다 자식 교체)
  const printGroup = new THREE.Group(); // 발자국 데칼 컨테이너 (별도 — 동물 퇴장 후에도 잔류)
  scene.add(group); scene.add(printGroup);
  let animals = [];                // 활성 엔티티(희소: 보통 0~1, 새 무리만 2~3)
  let prints = [];                 // 활성 발자국 데칼 { mesh, life, max }
  let spec = null;                 // 현재 셸터 로밍 스펙
  let nextSpawnMin = 0;            // 다음 등장 예약 게임분(gameMin)
  let openingDone = false;         // 개막 새 보장 등장 소진

  // ── 종 리스트: 셸터 override > 구역 기본. birdOnly 필터. ──
  function speciesFor(shelterId) {
    const sw = SHELTER_WILDLIFE[shelterId];
    let list = (sw && sw.species) || DISTRICT_WILDLIFE[districtOf(shelterId)] || ['crow'];
    if (sw && sw.birdOnly) list = list.filter(id => WILDLIFE_SPECIES[id]?.kind === 'bird');
    if (!list.length) list = ['crow'];
    return list;
  }
  function isWinter() { return seasonId() === 'winter'; }
  function maxFlock() { return opts.lowSpec ? W.lowSpecFlockMax : W.flockMax; }

  /* ============================================================
     복셀 메시 빌더 — 고양이 수준 디테일. 관절 분리(head/ear/tail/leg 그룹)로
     걷기 게이트 + 미세 모션. 종별 실루엣 명확화(귀/뿔/꼬리/몸통 비율).
     B(parent,w,h,d,color,x,y,z) = cat.js/helpers.js 문법.
  ============================================================ */
  function buildQuad(sp) {
    const P = sp.palette, s = sp.sizeH / 0.24;
    const g = new THREE.Group();
    const fur = P.fur, belly = P.belly ?? P.fur, ear = P.ear ?? P.fur;
    const nose = P.nose ?? 0x1a1410, tailTip = P.tailTip ?? P.fur, antler = P.antler, eye = P.eye ?? 0x140f0a;
    const tall = sp.sizeH > 0.35;            // 사슴/산양: 긴 다리·긴 목
    const legH = (tall ? 9 : 6) * PX * s;
    // 몸통 (피벗=골반, +z 전개)
    const body = new THREE.Group();
    body.position.set(0, legH + 1 * PX * s, -3 * PX * s);
    g.add(body);
    B(body, 4 * PX * s, 3.6 * PX * s, 10 * PX * s, fur, 0, 0, 5 * PX * s);
    B(body, 4.06 * PX * s, 1.4 * PX * s, 8 * PX * s, belly, 0, -1.4 * PX * s, 5 * PX * s);
    // 어깨 융기(사슴/여우 실루엣)
    if (tall || sp.nameEn === 'fox') B(body, 4.1 * PX * s, 1.6 * PX * s, 3 * PX * s, fur, 0, 1.6 * PX * s, 8 * PX * s);
    // v1.5.1(디렉터 레퍼런스): 등 반점 — 밝은 모래빛 패치 4장(고정 좌표 — 결정론). spot 팔레트 보유 종만(사슴).
    if (P.spot) for (const [sx, sz, sw] of [[-1.0, 3.2, 1.4], [0.8, 4.6, 1.2], [-0.4, 6.4, 1.5], [1.0, 7.6, 1.1]])
      B(body, sw * PX * s, 0.24 * PX * s, 1.7 * PX * s, P.spot, sx * PX * s, 1.86 * PX * s, sz * PX * s);
    // 가슴 층위(레퍼런스: 배→가슴 밝음 연결) — tall 종은 몸통 앞면 하단에 밝은 가슴판.
    if (tall) B(body, 3.5 * PX * s, 2.4 * PX * s, 1.1 * PX * s, belly, 0, -0.7 * PX * s, 9.6 * PX * s);
    // 목(그룹 — 사슴 경계 시 치켜듦) + 머리
    const neck = new THREE.Group();
    neck.position.set(0, tall ? 2 * PX * s : 0.8 * PX * s, 10 * PX * s);
    body.add(neck);
    if (tall) B(neck, 2.4 * PX * s, 5 * PX * s, 2.4 * PX * s, fur, 0, 2.5 * PX * s, 0.5 * PX * s); // 긴 목
    const head = new THREE.Group();
    head.position.set(0, tall ? 5 * PX * s : 1.2 * PX * s, tall ? 1.5 * PX * s : 2 * PX * s);
    neck.add(head);
    B(head, 3.2 * PX * s, 3 * PX * s, (tall ? 4.5 : 4) * PX * s, fur, 0, 0, 0); // 연산자 우선순위 버그 수정(2026-07-11): tall일 때 머리 깊이가 리터럴 4.5로 튀어 사슴 머리가 4.5짜리 막대로 렌더됨(디렉터 "사슴 대가리" 신고). 괄호로 (tall?4.5:4)*PX*s.
    B(head, 1.2 * PX * s, 1 * PX * s, 1.6 * PX * s, nose, 0, -0.6 * PX * s, 2.4 * PX * s); // 주둥이
    if (sp.dog) { B(head, 1.7 * PX * s, 1.4 * PX * s, 2.6 * PX * s, fur, 0, -0.5 * PX * s, 2.6 * PX * s); B(head, 1.0 * PX * s, 0.8 * PX * s, 0.8 * PX * s, nose, 0, -0.35 * PX * s, 4.0 * PX * s); } // 개=긴 주둥이+코끝
    for (const ex of [-1.1, 1.1]) // 눈
      B(head, 0.7 * PX * s, 0.7 * PX * s, 0.4 * PX * s, eye, ex * PX * s, 0.4 * PX * s, 1.7 * PX * s);
    // 귀 (그룹 — 미세 파닥임). 토끼=김쭉, 여우=삼각 뾰족
    const earH = sp.dog ? 3.2 : sp.nameEn === 'rabbit' ? 5 : sp.nameEn === 'fox' ? 2.6 : 1.8;
    const earGroups = [];
    for (const [side, ex] of [['L', -1.2], ['R', 1.2]]) {
      const e = new THREE.Group(); e.position.set(ex * PX * s, 1.8 * PX * s, -0.4 * PX * s); head.add(e);
      B(e, 0.9 * PX * s, earH * PX * s, 0.7 * PX * s, ear, 0, earH / 2 * PX * s, 0);
      // v1.5.1: 귀 안쪽 분홍(레퍼런스) — earIn 보유 종만, 귀 앞면에 얇게.
      if (P.earIn) B(e, 0.55 * PX * s, earH * 0.55 * PX * s, 0.16 * PX * s, P.earIn, 0, earH * 0.42 * PX * s, 0.38 * PX * s);
      if (sp.dog) e.rotation.set(0.3, 0, side === 'L' ? 1.5 : -1.5); // 늘어진 귀(옆으로 처짐)
      earGroups.push(e);
    }
    // 뿔 (사슴 가지뿔 / 산양 뒤로 굽은 뿔)
    if (antler) {
      for (const ex of [-1, 1]) {
        const a = new THREE.Group(); a.position.set(ex * PX * s, 2.6 * PX * s, -0.3 * PX * s); head.add(a);
        // 사슴 가지뿔 (산양은 종 제외 — 디렉터 판단: 지리 정합. 뿔 문법은 사슴 단일)
        B(a, 0.5 * PX * s, 3.2 * PX * s, 0.5 * PX * s, antler, 0, 1.6 * PX * s, 0);
        B(a, 0.5 * PX * s, 1.8 * PX * s, 0.5 * PX * s, antler, ex * 1 * PX * s, 3 * PX * s, 0);
      }
    }
    // 꼬리 (그룹 — 살랑). 여우/쥐=길게, 토끼=뭉툭 흰공
    const tail = new THREE.Group();
    tail.position.set(0, 1 * PX * s, 0.2 * PX * s); body.add(tail);
    if (sp.nameEn === 'rabbit') {
      B(tail, 1.8 * PX * s, 1.8 * PX * s, 1.8 * PX * s, belly, 0, 0.6 * PX * s, -0.6 * PX * s);
    } else {
      const tl = sp.dog ? 6 : sp.nameEn === 'fox' ? 8 : sp.nameEn === 'rat' ? 9 : tall ? 3 : 4;
      tail.rotation.x = sp.dog ? -0.7 : sp.nameEn === 'fox' ? -0.3 : 0.2; // 개=치켜든 꼬리 / 여우=살짝 치켜
      B(tail, 1.5 * PX * s, 1.5 * PX * s, tl * PX * s, fur, 0, 0.3 * PX * s, -(tl / 2) * PX * s);
      B(tail, 1.55 * PX * s, 1.55 * PX * s, 1.6 * PX * s, tailTip, 0, 0.3 * PX * s, -tl * PX * s + 0.6 * PX * s);
    }
    // 다리 4개 (그룹 — 대각 보행 스윙). 하퇴 분절로 걷기 게이트 자연스럽게.
    const legs = {};
    for (const [key, x, z] of [['fl', -1.3, 8], ['fr', 1.3, 8], ['bl', -1.3, 1], ['br', 1.3, 1]]) {
      const leg = new THREE.Group();
      leg.position.set(x * PX * s, legH, (z - 4) * PX * s);
      g.add(leg); legs[key] = leg;
      const shin = new THREE.Group(); shin.position.set(0, -legH * 0.5, 0); leg.add(shin);
      B(leg, 1.3 * PX * s, legH * 0.5, 1.3 * PX * s, fur, 0, -legH * 0.25, 0);
      B(shin, 1.15 * PX * s, legH * 0.5, 1.15 * PX * s, (tall && P.sock) ? P.sock : fur, 0, -legH * 0.25, 0); // v1.5.1: 하퇴 = 흰 양말(레퍼런스)
      B(shin, 1.4 * PX * s, 0.9 * PX * s, 1.7 * PX * s, tall ? nose : fur, 0, -legH * 0.5 + 0.5 * PX * s, 0.2 * PX * s); // 발굽/발
      legs[key].shin = shin;
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return { g, parts: { body, neck, head, tail, ears: earGroups }, legs };
  }

  function buildBird(sp) {
    const P = sp.palette, s = sp.sizeH / 0.20;
    const g = new THREE.Group();
    const bodyC = P.body, wingC = P.wing ?? P.body, beak = P.beak ?? 0x2a2620, eye = P.eye ?? 0x0d0b09;
    const body = new THREE.Group();
    body.position.set(0, 3 * PX * s, 0);
    g.add(body);
    B(body, 2.8 * PX * s, 3 * PX * s, 6.5 * PX * s, bodyC, 0, 0, 1 * PX * s);           // 몸통
    // 목+머리 (그룹 — 두리번/쪼기)
    const head = new THREE.Group();
    if (sp.goose) { head.position.set(0, 3.6 * PX * s, 2.4 * PX * s); B(body, 1.5 * PX * s, 3.6 * PX * s, 1.5 * PX * s, P.neck ?? bodyC, 0, 2.0 * PX * s, 2.2 * PX * s); } // 기러기 긴 목
    else head.position.set(0, 1.4 * PX * s, 3.4 * PX * s);
    body.add(head);
    B(head, 2.4 * PX * s, 2.4 * PX * s, 2.6 * PX * s, sp.goose ? (P.neck ?? bodyC) : bodyC, 0, 0, 0);
    B(head, 1.4 * PX * s, 0.8 * PX * s, 2 * PX * s, beak, 0, -0.3 * PX * s, 1.8 * PX * s); // 부리
    for (const ex of [-0.8, 0.8])
      B(head, 0.5 * PX * s, 0.5 * PX * s, 0.4 * PX * s, eye, ex * PX * s, 0.5 * PX * s, 1 * PX * s);
    // 날개 2장 (그룹 — 퍼덕임/활공). 갈매기는 길고 뾰족(활공)
    const span = sp.nameEn === 'seagull' ? 5.5 : 4;
    const wings = {};
    for (const [key, sx] of [['wl', -1], ['wr', 1]]) {
      const w = new THREE.Group(); w.position.set(sx * 1.3 * PX * s, 0.6 * PX * s, 0.5 * PX * s); body.add(w);
      B(w, span * PX * s, 0.5 * PX * s, 4 * PX * s, wingC, sx * span / 2 * PX * s, 0, 0);
      if (sp.nameEn === 'seagull') B(w, 2 * PX * s, 0.5 * PX * s, 3 * PX * s, 0x2a2c30, sx * (span - 0.5) * PX * s, 0, -0.5 * PX * s); // 날개 끝 검정
      wings[key] = w;
    }
    B(body, 2.2 * PX * s, 0.5 * PX * s, 3.4 * PX * s, wingC, 0, -0.2 * PX * s, -3.6 * PX * s); // 꼬리깃
    const legs = {};
    for (const [key, ex] of [['ll', -0.7], ['lr', 0.7]]) {
      const l = new THREE.Group(); l.position.set(ex * PX * s, -1.2 * PX * s, 0.5 * PX * s); body.add(l);
      B(l, 0.4 * PX * s, 2.4 * PX * s, 0.4 * PX * s, beak, 0, -1.2 * PX * s, 0);
      legs[key] = l;
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return { g, parts: { body, head }, wings, legs };
  }

  // #182 B1 곤충 — 부유·점멸 소형 엔티티(반딧불·벌·매미·모기). 접지 안 함(hover). glow 있으면 발광 스프라이트.
  let _insectGlow = null;
  function insectGlowTex() {
    if (_insectGlow) return _insectGlow;
    _insectGlow = makeCanvasTex((g2, w) => {
      g2.clearRect(0, 0, w, w); const c = w / 2;
      const gr = g2.createRadialGradient(c, c, 0, c, c, c);
      gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(0.4, 'rgba(214,255,150,0.5)'); gr.addColorStop(1, 'rgba(190,255,130,0)');
      g2.fillStyle = gr; g2.fillRect(0, 0, w, w);
    }, 32, 32);
    return _insectGlow;
  }
  function buildInsect(sp) {
    const P = sp.palette, s = sp.sizeH / 0.06;
    const g = new THREE.Group();
    const bodyC = P.body ?? 0x2a2820;
    B(g, 1.3 * PX * s, 1.0 * PX * s, 2.8 * PX * s, bodyC, 0, 0, 0);
    B(g, 1.0 * PX * s, 0.9 * PX * s, 1.0 * PX * s, P.head ?? bodyC, 0, 0.1 * PX * s, 1.7 * PX * s);
    const wings = {};
    for (const [key, sx] of [['wl', -1], ['wr', 1]]) {
      const w = new THREE.Group(); w.position.set(sx * 0.5 * PX * s, 0.5 * PX * s, -0.2 * PX * s); g.add(w);
      B(w, 2.2 * PX * s, 0.1 * PX * s, 1.6 * PX * s, P.wing ?? 0xd8e0e0, sx * 1.1 * PX * s, 0, 0);
      wings[key] = w;
    }
    let glow = null;
    if (sp.glow) {
      glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: insectGlowTex(), color: sp.glow, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.6, depthWrite: false }));
      glow.scale.set(0.3, 0.3, 1); glow.position.set(0, 0, -1.3 * PX * s); g.add(glow);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    return { g, parts: { body: g }, wings, glow };
  }

  // #182 B1 거미줄 — 정적 프롭. 방사형 실 + 동심 나선 + 이슬 + 작은 거미를 캔버스에 그려 단일 평면에 매핑.
  //   가는 실선은 픽셀 저해상 다운샘플에서 사라지기 쉬워 선폭을 넉넉히(픽셀 스타일과 정합). unlit(밤에도 은빛).
  let _webTex = null;
  function webTex() {
    if (_webTex) return _webTex;
    _webTex = makeCanvasTex((g2, w) => {
      g2.clearRect(0, 0, w, w);
      const c = w / 2, R = w * 0.45, N = 9;
      g2.lineCap = 'round';
      // 방사 스포크
      g2.strokeStyle = 'rgba(214,220,228,0.82)'; g2.lineWidth = Math.max(2, w / 70);
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2;
        g2.beginPath(); g2.moveTo(c, c); g2.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g2.stroke();
      }
      // 동심 나선(고리) — 실이 살짝 처지게(sag) 불규칙
      g2.strokeStyle = 'rgba(204,212,222,0.6)'; g2.lineWidth = Math.max(1, w / 110);
      for (let r = 1; r <= 5; r++) {
        const rr = R * (r / 5.4);
        g2.beginPath();
        for (let i = 0; i <= N; i++) {
          const a = i / N * Math.PI * 2, sag = 1 - 0.1 * Math.sin(a * 2 + r * 0.7);
          const x = c + Math.cos(a) * rr * sag, y = c + Math.sin(a) * rr * sag;
          if (i === 0) g2.moveTo(x, y); else g2.lineTo(x, y);
        }
        g2.stroke();
      }
      // 이슬 방울(작은 발광 점)
      for (const [rx, ry, rad] of [[0.34, 0.6, 0.03], [0.62, 0.34, 0.026], [0.44, 0.72, 0.022], [0.7, 0.62, 0.02], [0.3, 0.34, 0.018]]) {
        const g3 = g2.createRadialGradient(rx * w, ry * w, 0, rx * w, ry * w, rad * w * 1.7);
        g3.addColorStop(0, 'rgba(232,246,255,0.96)'); g3.addColorStop(1, 'rgba(196,222,255,0)');
        g2.fillStyle = g3; g2.beginPath(); g2.arc(rx * w, ry * w, rad * w * 1.7, 0, 7); g2.fill();
      }
      // 작은 거미(중심에서 살짝 벗어난 자리) — 몸통·머리·다리
      const sx = c * 1.04, sy = c * 1.08;
      g2.fillStyle = 'rgba(30,26,22,0.96)';
      g2.beginPath(); g2.ellipse(sx, sy, w * 0.032, w * 0.042, 0, 0, 7); g2.fill();
      g2.beginPath(); g2.arc(sx, sy - w * 0.05, w * 0.02, 0, 7); g2.fill();
      g2.strokeStyle = 'rgba(30,26,22,0.9)'; g2.lineWidth = Math.max(1, w / 130);
      for (const dx of [-1, 1]) for (const dy of [-0.55, 0.15, 0.85]) {
        g2.beginPath(); g2.moveTo(sx, sy - w * 0.01); g2.lineTo(sx + dx * w * 0.07, sy + dy * w * 0.06); g2.stroke();
      }
    }, 160, 160);
    return _webTex;
  }
  function buildWeb(sp) {
    const g = new THREE.Group();
    const s = sp.sizeH * 2.2;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(s, s),
      new THREE.MeshBasicMaterial({ map: webTex(), transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }));
    g.add(plane);
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    return { g, parts: { body: g }, plane };
  }

  function buildMesh(sp) { return sp.kind === 'bird' ? buildBird(sp) : sp.kind === 'insect' ? buildInsect(sp) : sp.kind === 'web' ? buildWeb(sp) : buildQuad(sp); }

  /* ── #95 장애물 회피 (디렉터: "동물이 오브젝트를 통과하면 짜침") ──
     buildEnv가 등록한 소품 원기둥 + 방 풋프린트를 막는다. 목표 선정은 재추첨, 이동은 푸시아웃 스티어링.
     방은 사각(원 근사는 길쭉한 방의 장변 중앙을 뚫는다) — 돔 벙커만 SHELTER_WILDLIFE.avoidR 원형.
     실내(지하철)는 방이 곧 무대라 방 회피 없음. 비행(이륙 후)은 통과 허용 — 착지 지점만 검사. */
  function blockPad(a) { return 0.1 + a.sp.sizeH * 0.3; } // 덩치 비례 여유 (사슴 0.23, 토끼 0.15)
  function findBlock(x, z, pad) {
    if (!spec.indoor) {
      if (spec.avoidR) { // 원형 매스 (돔 벙커: 외피가 원이라 사각이 오히려 뚫린다)
        const rr = spec.avoidR + pad;
        if (Math.hypot(x, z) < rr) return { kind: 'circle', x: 0, z: 0, rr };
      } else {
        const room = getRoom();
        const hw = room.w / 2 + 0.4 + pad, hd = room.d / 2 + 0.4 + pad;
        if (Math.abs(x) < hw && Math.abs(z) < hd) return { kind: 'rect', hw, hd };
      }
    }
    const obs = getObstacles ? getObstacles() : null;
    if (obs) for (const o of obs) {
      const rr = o.r + pad;
      if (Math.hypot(x - o.x, z - o.z) < rr) return { kind: 'circle', x: o.x, z: o.z, rr };
    }
    return null;
  }

  // ── 로밍 존 지점 (방 밖 링, 방 풋프린트 회피) ──
  function roamSpot() {
    const band = spec.band || [3.4, 6.5];
    const room = getRoom();
    if (spec.edgeOnly) {
      // 지하철 승강장 가장자리: 한쪽 벽 근처 고정, x 밴드 유지 (쥐가 가장자리만)
      return { x: (Math.random() < 0.5 ? -1 : 1) * (room.d / 2 + 0.4), z: (Math.random() * 2 - 1) * (room.w / 2 - 0.3) };
    }
    // #209 B안(디렉터): 물위/탑 셸터 — 새가 실표면(갑판·발코니·갤러리)에 앉는다. 그 표면은 방을 두른 링/둘레라
    //   radial band로는 대각각에서 방 안(바닥 밑)에 떨어진다(폴백 지배 → 오배치). 그래서 밴드가 아니라
    //   퍼치 도형 위에 직접 배치한다. groundY = 그 표면 높이. ring=원형 갤러리(등대), 아니면 사각 데크 둘레.
    //   sides = 선실·상부구조가 있는 변을 뺀 열린 변만(예: 여객선 갑판은 선실 -z 제외 → +x/+z). 좌표는 데크
    //   실측(shelters.js buildRoom)에서 온 hw/hd 절대 반폭(방 증축과 무관한 고정 데크).
    if (spec.perch) {
      // findBlock을 쓰지 않는다: 그 안의 방 회피 사각(room.d/2+0.4)이 얕은 방(d2.9)에선 퍼치 데크(hd 1.6~1.9)를
      //   통째로 덮어 모든 퍼치점을 거절한다(실측: 전 스팟이 폴백행). 퍼치 표면은 원래 방을 두르는(겹치는) 데크라
      //   방 회피가 부적합 — 데크 도형 위에 바로 앉힌다.
      const p = spec.perch;
      if (p.ring) {
        const a = Math.random() * Math.PI * 2;
        return { x: Math.cos(a) * p.ring, z: Math.sin(a) * p.ring };
      }
      const sides = p.sides || ['+x', '-x', '+z', '-z'];
      const side = sides[Math.floor(Math.random() * sides.length)];
      const t = Math.random() * 2 - 1;
      // #239: roomClamp면 링을 (증축 반영된) 방 벽 밖으로 밀어 방 안 스폰 방지 — 기본(방5.6)은 room.w/2+0.25=3.05=hw로 불변.
      const hw = p.roomClamp ? Math.max(p.hw, room.w / 2 + 0.25) : p.hw;
      const hd = p.roomClamp ? Math.max(p.hd, room.d / 2 + 0.2) : p.hd;
      if (side === '+x') return { x: hw, z: t * hd };
      if (side === '-x') return { x: -hw, z: t * hd };
      if (side === '+z') return { x: t * hw, z: hd };
      return { x: t * hw, z: -hd };
    }
    // #209: avoidRect 있으면 방 사각 대신 그 사각(기단 등)을 회피 — 오두막 기단 위 매몰 방지.
    const avW = (spec.avoidRect ? spec.avoidRect.w : room.w) / 2 + 0.3;
    const avD = (spec.avoidRect ? spec.avoidRect.d : room.d) / 2 + 0.3;
    for (let k = 0; k < 10; k++) {
      const a = Math.random() * Math.PI * 2, r = band[0] + Math.random() * (band[1] - band[0]);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if ((Math.abs(x) > avW || Math.abs(z) > avD) && !findBlock(x, z, 0.15)) return { x, z }; // #95: 장애물 안 목표 재추첨
    }
    // 폴백(10회 실패): avoidRect면 기단 밖 x변으로 확정 배치(중점 추첨은 기단 대각에 걸릴 수 있어 매몰).
    if (spec.avoidRect) return { x: (Math.random() < 0.5 ? -1 : 1) * (avW + 0.4), z: (Math.random() * 2 - 1) * avD };
    const a = Math.random() * Math.PI * 2, r = (band[0] + band[1]) / 2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }
  /* ── #208 인카운터 진입점 (앰비언트 로밍과 분리) ──
     앰비언트 동물은 밴드 바깥 exitSpot(band[1]+4 ≈ 10.5)에서 어슬렁 걸어온다 — 배경 생명감엔 맞다.
     그러나 카드가 대기 중인 '조우'에 같은 진입점을 쓰면 개 걸음(gait 0.72)으로 5.5u = 8초짜리 빈 화면이
     된다(하네스 실측: 9초 내내 mode 'walk', 자동 카드가 안전망으로만 발화). 사람(visitorSpots: 집 앞
     1.9u ≈ 2.2초)과 같은 문법으로 맞춘다 — 카메라 쪽 앞마당으로 짧게 걸어 들어와 멈춘다.
     yaw는 game.js camState.yaw. 지하철 승강장(edgeOnly/indoor)은 무대 자체가 특수해 기존 추첨을 남긴다. */
  function encounterSpots(yaw) {
    const band = spec.band || [3.4, 6.5];
    let at = null;
    if (!spec.edgeOnly && !spec.indoor && typeof yaw === 'number') {
      let r = band[0];                                  // 밴드 안쪽 = 집에 가장 가까운 로밍 반경
      for (let k = 0; k < 10 && findBlock(Math.cos(yaw) * r, Math.sin(yaw) * r, 0.2); k++) r += 0.4; // 돔 avoidR·마당 소품 밖으로
      at = { x: Math.cos(yaw) * r, z: Math.sin(yaw) * r };
    }
    if (!at) at = roamSpot();
    const ar = Math.hypot(at.x, at.z) || 1;             // 목표의 방사 방향 2.2u 밖 = 진입점(화면 가장자리)
    return { at, from: { x: at.x / ar * (ar + 2.2), z: at.z / ar * (ar + 2.2) } };
  }
  // 밴드 바깥 퇴장점 (화면 밖으로)
  function exitSpot(fromX, fromZ) {
    const band = spec.band || [3.4, 6.5];
    const a = Math.atan2(fromZ, fromX) + (Math.random() - 0.5) * 1.2;
    const r = band[1] + 4;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }

  // ── 스폰 (희소: 보통 1마리, 새 종만 무리) ──
  function spawnEncounter(opening = false) {
    if (animals.length > 0) return;             // 이미 조우 중이면 스킵(동시 1)
    const id = randSpecies();
    const sp = WILDLIFE_SPECIES[id];
    const flock = sp.kind === 'bird' && (opening || Math.random() < W.flockChance);
    const n = flock ? (W.flockMin + Math.floor(Math.random() * (Math.min(maxFlock(), W.flockMax) - W.flockMin + 1))) : 1;
    for (let i = 0; i < n; i++) {
      const s = roamSpot();
      spawnOne(id, s, opening && sp.kind === 'bird', i);
    }
    // 사운드 훅 (파일 없으면 폴백 무음)
    sfx('wl_' + id);
  }

  function spawnOne(speciesId, atSpot, birdLanding, idx = 0, entry = null) {
    const sp = WILDLIFE_SPECIES[speciesId];
    if (!sp) return null;
    const built = buildMesh(sp);
    const s = atSpot || roamSpot();
    const groundY = spec.groundY ?? 0;
    built.g.position.set(s.x, groundY, s.z);
    built.g.rotation.y = Math.random() * Math.PI * 2;
    group.add(built.g);
    const a = {
      sp, id: speciesId, g: built.g, parts: built.parts, legs: built.legs, wings: built.wings,
      kind: sp.kind, groundY, mode: 'enter', timer: 0.4 + idx * 0.15,
      tgt: { x: s.x, z: s.z }, gait: 0, phase: Math.random() * 6,
      stay: (W.stayMinSec + Math.random() * (W.stayMaxSec - W.stayMinSec)),
      leaving: false, sig: 0, // sig = 종별 고유행동 서브스테이트
    };
    // 곤충: 접지 안 하고 부유 / 거미줄: 창틀 높이에 정적 부착 / 새 착지: 위에서 내려온다 / 지상: 화면 밖에서 걸어 들어옴
    if (sp.kind === 'insect') { a.g.position.set(s.x, groundY + 0.9, s.z); a.mode = 'hover'; a.center = { x: s.x, z: s.z }; a.glow = built.glow; }
    else if (sp.kind === 'web') { const by = groundY + 1.3; a.g.position.set(s.x, by, s.z); a.g.rotation.set(0, Math.atan2(-s.x, -s.z), 0); a.mode = 'web'; a.baseY = by; a.plane = built.plane; }
    else if (birdLanding || sp.kind === 'bird') { a.g.position.y = groundY + 1.6 + idx * 0.2; a.mode = 'landing'; }
    else { const e = (entry && entry.from) || exitSpot(s.x, s.z); a.g.position.set(e.x, groundY, e.z); a.tgt = { x: s.x, z: s.z }; a.mode = 'walk'; } // entry=#208 인카운터 근접 진입
    animals.push(a);
    shadowDirty();
    return a;
  }

  function randSpecies() { const l = spec.speciesList; return l[Math.floor(Math.random() * l.length)]; }

  // ── 발자국 데칼 (눈/흙 위) — 페이드아웃. "밤새 뭔가 지나갔다" 티저 + 로밍 흔적 ──
  function dropPrint(x, z, dark) {
    if (findBlock(x, z, 0)) return; // #95: 방/소품 위 발자국 금지 (밤새 자취가 집·폐차를 관통해 보이던 것)
    const size = 0.11;
    const tex = _printTex(dark);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, (spec.groundY ?? 0) + 0.012, z);
    m.rotation.z = Math.random() * Math.PI;
    printGroup.add(m);
    prints.push({ mesh: m, life: 0, max: W.printFadeSec });
  }
  let _printTexDark = null, _printTexLight = null;
  function _printTex(dark) {
    if (dark && _printTexDark) return _printTexDark;
    if (!dark && _printTexLight) return _printTexLight;
    const tex = makeCanvasTex((g2, w) => {
      g2.clearRect(0, 0, w, w);
      g2.fillStyle = dark ? 'rgba(30,26,22,0.9)' : 'rgba(90,96,104,0.85)';
      const cell = w / 8;
      const dot = (cx, cy, r) => { g2.beginPath(); g2.arc(cx * cell, cy * cell, r * cell, 0, 7); g2.fill(); };
      dot(3, 3, 0.9); dot(5, 3, 0.9);       // 앞발 두 점
      dot(2.5, 5.5, 0.7); dot(5.5, 5.5, 0.7); // 뒷발 두 점
    }, 32, 32);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    if (dark) _printTexDark = tex; else _printTexLight = tex;
    return tex;
  }
  // 지나간 자취를 따라 발자국 여러 개 (한 줄)
  function trailPrints(x0, z0, x1, z1, dark) {
    const d = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.min(6, Math.max(2, Math.floor(d / 0.5)));
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      dropPrint(x0 + (x1 - x0) * u + (Math.random() - 0.5) * 0.08, z0 + (z1 - z0) * u + (Math.random() - 0.5) * 0.08, dark);
    }
  }

  // ── 셸터 로드 시 재구성 ──
  function respawn(shelterId) {
    despawnAll();
    clearPrints();
    const sw = SHELTER_WILDLIFE[shelterId] || { groundY: -0.75, band: [3.4, 6.5] };
    spec = { ...sw, speciesList: speciesFor(shelterId) };
    openingDone = false;
    scheduleNext(true);
    // 아침 동틀녘 로드 시 낮은 확률로 밤새 발자국만 (동물 없이) — "지난밤 흔적"
    if (state.day > 1 && gameHour() >= 6 && gameHour() < 10 && Math.random() < W.printOnlyChance) {
      leaveNightPrints();
    }
  }
  function scheduleNext(first) {
    const gap = W.spawnGapMin + Math.random() * (W.spawnGapMax - W.spawnGapMin);
    const mult = isWinter() ? 1 / W.winterRareMult : 1;
    nextSpawnMin = (getGameMin() || 0) + gap * mult * (first ? 0.4 : 1); // 첫 조우는 조금 빨리
  }
  function leaveNightPrints() {
    const dark = getSnowCover() < 0.15; // 눈 없으면 흙(어두운) 발자국
    const s0 = roamSpot(), s1 = exitSpot(s0.x, s0.z);
    trailPrints(s0.x, s0.z, s1.x, s1.z, dark);
  }

  function despawnAll() { for (const a of animals) { group.remove(a.g); disposeDeep(a.g); } animals = []; shadowDirty(); }
  function despawnOne(a) { group.remove(a.g); disposeDeep(a.g); animals = animals.filter(x => x !== a); if (!animals.length) scheduleNext(false); }
  function clearPrints() { for (const p of prints) { printGroup.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); } prints = []; }

  // v1.5.1(디렉터: "동물 소리가 생각보다 잦다"): 스폰 주기(30~90게임분)가 배속상 실시간 20~60초라
  //   스폰당 1회도 촘촘하게 들림 → 실시간 쿨다운 120초 + 재생 확률 55% (개막 새 등 보장 재생은 force).
  let lastSfxAt = -1e9;
  function sfx(id, force = false) {
    if (typeof playSfx !== 'function') return;
    if (!force) {
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (now - lastSfxAt < 120000 || Math.random() > 0.55) return;
      lastSfxAt = now;
    }
    try { playSfx(id, { jitter: 0.05 }); } catch (e) {}
  }

  // ── 개막 생명감: Day1 08~10시 새 2~3마리 착지 1회 보장(랜덤 아님) ──
  function tryOpeningSequence() {
    if (openingDone) return;
    if (state.day !== 1) { openingDone = true; return; }
    const h = gameHour();
    if (h < 8 || h >= 10) return;
    openingDone = true;
    if (animals.length) return;
    // 새 종 강제(구역에 새가 없으면 crow)
    const birds = spec.speciesList.filter(id => WILDLIFE_SPECIES[id].kind === 'bird');
    const birdId = birds[0] || 'crow';
    const n = W.flockMin + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < Math.min(n, maxFlock()); i++) spawnOne(birdId, roamSpot(), true, i);
    sfx('wl_' + birdId, true); // 개막 새 울음은 1회 보장 (쿨다운 무관)
  }

  // ── 매 프레임 업데이트 ──
  function update(t, dt) {
    if (!spec) return;
    tryOpeningSequence();
    // 발자국 페이드
    for (const p of prints) {
      p.life += dt;
      p.mesh.material.opacity = 0.55 * Math.max(0, 1 - p.life / p.max);
      if (p.life >= p.max) { printGroup.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    }
    prints = prints.filter(p => p.life < p.max);
    // 희소 등장 스케줄
    if (!animals.length && (getGameMin() || 0) >= nextSpawnMin) {
      spawnEncounter(false);
      if (!animals.length) scheduleNext(false); // 조건상 안 뜬 경우 재예약
    }
    // 플레이어 접근 → 조기 도망(체류 무관)
    for (const a of animals) {
      if (!a.leaving && a.mode !== 'landing' && a.mode !== 'enter') {
        // #209 퍼치: 착지면이 높은 탑(등대 갤러리 y2.92)이면 수평거리만으론 카메라 중심(원점 부근)에 shy 안으로
        //   들어와 소환 즉시 전부 이탈한다(실측). 퍼치 새는 수직 간극도 포함한 3D 거리로 판정 — 머리 위 새는
        //   플레이어가 못 닿으니 안 도망친다. 지상종(perch 없음)은 종전 수평거리 유지(카메라 y0.9 기준 회귀 방지).
        const d = spec.perch
          ? Math.hypot(a.g.position.x - camCenter.x, a.g.position.y - camCenter.y, a.g.position.z - camCenter.z)
          : distToCam(a);
        if (d < a.sp.shy) startLeaving(a, true);
      }
      // 체류 시간 만료 → 종별 퇴장
      if (!a.leaving && a.mode !== 'landing' && a.mode !== 'enter') {
        a.stay -= dt;
        if (a.stay <= 0) startLeaving(a, false);
      }
      stepAnimal(a, t, dt);
    }
  }

  function distToCam(a) { return Math.hypot(a.g.position.x - camCenter.x, a.g.position.z - camCenter.z); }

  // 종별 고유 퇴장 행동 시작
  function startLeaving(a, scared) {
    a.leaving = true; a.scared = scared; a.sig = 0; a.sigT = 0;
    const name = a.sp.nameEn;
    if (name === 'deer') { a.mode = 'alert'; a.sigT = 0; }         // 고개 들어 경계 후 도약
    else if (a.sp.kind === 'bird') { a.mode = 'takeoff'; }          // 까마귀 깡총2→비상, 갈매기 활공
    else if (name === 'fox') { a.mode = 'stare'; a.sigT = 0; }      // 멈춰 이쪽 응시 2초
    else if (name === 'rabbit') { a.mode = 'flee'; a.zig = 1; }     // 지그재그
    else if (name === 'rat') { a.mode = 'flee'; a.wallRun = true; } // 벽 따라 질주
    else if (a.sp.kind === 'insect') { a.mode = 'hover'; }         // 곤충: hover 유지 — leaving 플래그로 상승·이탈(지상 flee 금지)
    else if (a.sp.kind === 'web') { a.mode = 'web'; }              // 거미줄: 위치 유지하며 페이드아웃(지상 flee 금지)
    else { a.mode = 'flee'; }
    a._exit = exitSpot(a.g.position.x, a.g.position.z);
    a._trailFrom = { x: a.g.position.x, z: a.g.position.z };
  }

  // ── 개체 스텝: 이동 + 종별 포즈 + 고유행동 ──
  function stepAnimal(a, t, dt) {
    const g = a.g, sp = a.sp, name = sp.nameEn;

    // ── 곤충 부유(hover) — 접지 안 함, 중심 주변 드리프트+상하 부유, 반딧불은 점멸, 날개 파닥 ──
    //   수명은 공용 a.stay(20~60s, 메인 루프)가 관장. 만료/접근 시 startLeaving이 leaving 플래그를 세우고,
    //   여기서 중심을 퇴장점으로 끌며 서서히 상승 → 화면 밖으로 소멸(지상 flee 금지 — 곤충은 날아 떠난다).
    if (a.mode === 'hover') {
      a.hoverT = (a.hoverT || 0) + dt;
      const c = a.center;
      if (a.leaving && a._exit) {
        c.x += (a._exit.x - c.x) * Math.min(1, dt * 0.5);
        c.z += (a._exit.z - c.z) * Math.min(1, dt * 0.5);
        a._riseY = (a._riseY || 0) + dt * 0.6;
        if (a._riseY > 2.6 || Math.hypot(c.x - a._exit.x, c.z - a._exit.z) < 1.2) return void despawnOne(a);
      }
      g.position.x = c.x + Math.sin(a.hoverT * 0.7 + a.phase) * 0.55 + Math.sin(a.hoverT * 2.1) * 0.14;
      g.position.z = c.z + Math.cos(a.hoverT * 0.6 + a.phase) * 0.55 + Math.cos(a.hoverT * 1.9) * 0.14;
      g.position.y = a.groundY + 0.85 + (a._riseY || 0) + Math.sin(a.hoverT * 1.3 + a.phase) * 0.32;
      g.rotation.y = Math.atan2(g.position.x - a._px, g.position.z - a._pz) || g.rotation.y; // 진행 방향
      a._px = g.position.x; a._pz = g.position.z;
      if (a.glow) a.glow.material.opacity = 0.12 + 0.88 * Math.pow(0.5 + 0.5 * Math.sin(a.hoverT * 2.0 + a.phase), 3); // 반딧불 점멸
      if (a.wings) for (const k in a.wings) a.wings[k].rotation.z = (k === 'wl' ? 1 : -1) * (0.4 + 0.4 * Math.sin(t * 45));
      return;
    }

    // ── 거미줄(정적 프롭) — 바람에 미세 흔들림, 퇴장 시 페이드아웃(위치 유지) ──
    if (a.mode === 'web') {
      a.webT = (a.webT || 0) + dt;
      g.rotation.z = Math.sin(a.webT * 0.8 + a.phase) * 0.04;
      g.position.y = a.baseY + Math.sin(a.webT * 0.6) * 0.015;
      if (a.leaving && a.plane) {
        a.plane.material.opacity = Math.max(0, a.plane.material.opacity - dt * 0.8);
        if (a.plane.material.opacity <= 0.02) return void despawnOne(a);
      }
      return;
    }

    // ── 착지(새) ──
    if (a.mode === 'landing') {
      if (!a.tgt) { a.mode = 'idle'; a.timer = 1; return; } // 널 가드: 어떤 경로로든 tgt가 비면 우아하게 복구
      const tx = a.tgt.x, tz = a.tgt.z;
      g.position.x += (tx - g.position.x) * Math.min(1, dt * 2.5);
      g.position.z += (tz - g.position.z) * Math.min(1, dt * 2.5);
      g.position.y += (a.groundY - g.position.y) * Math.min(1, dt * 3);
      if (g.position.y < a.groundY + 0.03) { g.position.y = a.groundY; a.mode = 'idle'; a.timer = 1 + Math.random() * 2; }
      poseBird(a, t, dt, true);
      return;
    }
    // ── 등장 걷기(지상) ──
    if (a.mode === 'enter') { a.mode = 'walk'; }

    // ── 고유 퇴장 행동 서브스테이트 ──
    if (a.mode === 'alert') { // 사슴: 고개 들어 경계
      a.sigT += dt;
      if (a.parts.neck) a.parts.neck.rotation.x += (-0.6 - a.parts.neck.rotation.x) * Math.min(1, dt * 5); // 목 치켜듦
      if (a.parts.ears) for (const e of a.parts.ears) e.rotation.x = -0.3; // 귀 쫑긋
      if (a.sigT > 1.0) { a.mode = 'leap'; a.leapT = 0; sfx('wl_deer'); }
      poseQuad(a, t, dt);
      return;
    }
    if (a.mode === 'leap') { // 사슴: 도약 퇴장 (포물선 + 빠른 이동)
      a.leapT += dt;
      moveToward(a, a._exit, dt, 2.6);
      const bound = Math.abs(Math.sin(a.leapT * 4)) * 0.25;
      g.position.y = a.groundY + bound;
      poseQuad(a, t, dt, true);
      if (reached(a, a._exit, 0.4)) return void despawnOne(a);
      return;
    }
    if (a.mode === 'stare') { // 여우: 멈춰 이쪽 응시 2초
      a.sigT += dt;
      const want = Math.atan2(camCenter.x - g.position.x, camCenter.z - g.position.z);
      let dr = want - g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
      g.rotation.y += dr * Math.min(1, dt * 4);
      if (a.parts.ears) for (const e of a.parts.ears) e.rotation.x = -0.2;
      if (a.sigT > 2.0) { a.mode = 'flee'; sfx('wl_fox'); }
      poseQuad(a, t, dt);
      return;
    }

    // ── 새 이륙 (까마귀 깡총2→비상 / 갈매기 활공 선회) ──
    if (a.mode === 'takeoff') {
      if (name === 'crow' && a.sig < 2) { // 두 번 깡총
        a.sigT += dt;
        g.position.y = a.groundY + Math.abs(Math.sin(a.sigT * 9)) * 0.08;
        if (a.sigT > 0.3) { a.sigT = 0; a.sig++; if (a.sig >= 2) { sfx('wl_crow'); } }
        poseBird(a, t, dt, false);
        return;
      }
      // 비상: 상승 + 퇴장. 갈매기는 크게 선회
      moveToward(a, a._exit, dt, name === 'seagull' ? 1.8 : 2.2);
      if (name === 'seagull') { a.orbit = (a.orbit || 0) + dt * 1.5; g.position.x += Math.cos(a.orbit) * 0.02; g.position.z += Math.sin(a.orbit) * 0.02; }
      g.position.y += (a.groundY + 2.2 - g.position.y) * Math.min(1, dt * 1.8);
      poseBird(a, t, dt, true);
      if (g.position.y > a.groundY + 1.8 && reached(a, a._exit, 1.2)) return void despawnOne(a);
      return;
    }

    // ── 지상 도망 (토끼 지그재그 / 쥐 벽따라) ──
    if (a.mode === 'flee') {
      let tgt = a._exit;
      if (a.zig) { // 토끼 지그재그
        a.zigT = (a.zigT || 0) + dt;
        const perp = Math.atan2(a._exit.z - g.position.z, a._exit.x - g.position.x) + Math.PI / 2;
        tgt = { x: a._exit.x + Math.cos(perp) * Math.sin(a.zigT * 8) * 0.6, z: a._exit.z + Math.sin(perp) * Math.sin(a.zigT * 8) * 0.6 };
      }
      moveToward(a, tgt, dt, 2.2);
      // v1.5.2: 토끼 지그재그 도주도 바운드(도주 gait 16/s × 1.6 → 초당 약 4홉) — 활주 방지는 도주에도 동일.
      if (a.zig) g.position.y = a.groundY + Math.abs(Math.sin(a.gait * 1.6)) * 0.09;
      poseQuad(a, t, dt, true);
      if (reached(a, a._exit, 0.4)) { trailLeaveIfSnow(a); return void despawnOne(a); }
      return;
    }

    // ── 평상 로밍 (걷기/멈춤/풀뜯기/쪼기/두리번) ──
    if (a.mode === 'walk' && a.tgt) {
      const done = moveToward(a, a.tgt, dt, a.kind === 'bird' ? 0.7 : 1);
      if (done) { pickIdle(a); }
    } else {
      a.timer -= dt;
      if (a.timer <= 0) pickWalkOrIdle(a);
    }
    // v1.5.2(디렉터: "새가 땅을 기어간다"): 지상 이동에 홉 게이트 — y가 평평하면 활주로 읽힌다.
    //   새 = 두 발 콩콩(까마귀 실제 보행), 토끼 = hopGait(F-1a 데이터 선언의 이행 — 그간 사문화돼 있었다).
    //   gait 위상(9/s)에 ×1.6 → 초당 약 2.3홉. idle 복귀 시 지면으로 스냅.
    const hopA = a.kind === 'bird' ? 0.05 : (sp.hopGait ? 0.06 : 0);
    if (hopA) {
      if (a.mode === 'walk') g.position.y = a.groundY + Math.abs(Math.sin(a.gait * 1.6)) * hopA;
      else if (g.position.y !== a.groundY) g.position.y += (a.groundY - g.position.y) * Math.min(1, dt * 8);
    }
    if (a.kind === 'bird') poseBird(a, t, dt, false); else poseQuad(a, t, dt);
    // 발자국(눈): 걷는 중 저빈도로 남김
    if (a.mode === 'walk' && getSnowCover() > 0.15 && a.kind !== 'bird') {
      a._pT = (a._pT || 0) + dt;
      if (a._pT > 0.6) { a._pT = 0; dropPrint(g.position.x, g.position.z, false); }
    }
  }

  function pickWalkOrIdle(a) {
    if (Math.random() < 0.5) { a.mode = 'walk'; a.tgt = roamSpot(); }
    else pickIdle(a);
  }
  function pickIdle(a) {
    a.mode = 'idle'; a.tgt = null; a.timer = 1.5 + Math.random() * 3;
    a.idleAct = a.kind === 'bird' ? (Math.random() < 0.5 ? 'peck' : 'lookaround')
                                  : (Math.random() < 0.5 ? 'graze' : 'lookaround');
  }

  // 대상으로 이동. 반환 = 도착 여부. speedMul: gait 배수.
  function moveToward(a, tgt, dt, speedMul) {
    const g = a.g, dx = tgt.x - g.position.x, dz = tgt.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;
    const step = a.sp.gait * speedMul * dt;
    let nx = g.position.x + dx / dist * Math.min(step, dist);
    let nz = g.position.z + dz / dist * Math.min(step, dist);
    // #95 접선 슬라이드 스티어링: 다음 걸음이 장애물 안이면 '전 속도'를 접선/벽면 방향으로 돌려 두른다.
    //   순수 방사 푸시아웃은 정면 대치에서 접선 성분 0 → 제자리 정체(프로브 실측: reached=false) — 그 교정.
    //   사이드는 스티키(_avSide, 1.2초 유지): 우회 중 좌/우가 프레임마다 뒤집히는 디더 방지.
    //   비행(이륙 상승)은 제외 — 지상 보행/도주/도약만.
    if (!(a.kind === 'bird' && a.mode === 'takeoff')) {
      const bl = findBlock(nx, nz, blockPad(a));
      if (bl) {
        a._avSideT = 1.2;
        // 사이드는 '슬라이드 축'별로 스티키 — 코너에서 축이 바뀌면 목표 방향으로 재선택.
        //   (축 무관 스티키는 모서리에서 이전 부호를 물려받아 후진 → 코너 왕복 라이브록, 프로브 실측)
        const pick = (axis, want) => {
          const s = (a._avAxis === axis && a._avSide != null) ? a._avSide : (want >= 0 ? 1 : -1);
          a._avAxis = axis; a._avSide = s; return s;
        };
        if (bl.kind === 'rect') { // 방 사각: 침투 얕은 축은 경계에 고정, 나머지 축으로 전 속도 슬라이드(코너를 돈다)
          const px = bl.hw - Math.abs(nx), pz = bl.hd - Math.abs(nz);
          if (px < pz) {
            nx = (nx < 0 ? -1 : 1) * bl.hw;
            nz = g.position.z + pick('z', dz) * step;
          } else {
            nz = (nz < 0 ? -1 : 1) * bl.hd;
            nx = g.position.x + pick('x', dx) * step;
          }
        } else { // 원: 현 위치 기준 접선으로 전 속도 이동 + 잔여 침투는 림 사영
          const ox = g.position.x - bl.x, oz = g.position.z - bl.z, od = Math.hypot(ox, oz) || 0.001;
          const tx = -oz / od, tz = ox / od;
          const s = pick('c', tx * dx + tz * dz);
          nx = g.position.x + tx * s * step; nz = g.position.z + tz * s * step;
          const o2x = nx - bl.x, o2z = nz - bl.z, o2d = Math.hypot(o2x, o2z) || 0.001;
          if (o2d < bl.rr) { nx = bl.x + o2x / o2d * bl.rr; nz = bl.z + o2z / o2d * bl.rr; }
        }
      } else if (a._avSide != null && (a._avSideT = (a._avSideT || 0) - dt) <= 0) { a._avSide = null; a._avAxis = null; }
    }
    g.position.x = nx;
    g.position.z = nz;
    const want = Math.atan2(dx, dz);
    let dr = want - g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
    g.rotation.y += dr * Math.min(1, dt * 8);
    a.gait += dt * (speedMul > 1.5 ? 16 : 9);
    a._shT = (a._shT || 0) + dt; if (a._shT > 0.12) { a._shT = 0; shadowDirty(); }
    return dist <= step;
  }
  function reached(a, tgt, tol) { return Math.hypot(a.g.position.x - tgt.x, a.g.position.z - tgt.z) < tol; }
  function trailLeaveIfSnow(a) { if (getSnowCover() > 0.15 && a._trailFrom) trailPrints(a._trailFrom.x, a._trailFrom.z, a.g.position.x, a.g.position.z, false); }

  // ── 포즈: 네발 (대각 보행 + 하퇴 굽힘 + 귀/꼬리 미세모션 + graze/두리번) ──
  function poseQuad(a, t, dt, running) {
    const L = a.legs; if (!L) return;
    const moving = a.mode === 'walk' || a.mode === 'flee' || a.mode === 'leap';
    const amp = running ? 0.9 : 0.6;
    const stride = moving ? Math.sin(a.gait) * amp : 0;
    const setLeg = (leg, sw) => { if (!leg) return; leg.rotation.x = sw; if (leg.shin) leg.shin.rotation.x = Math.max(0, -sw) * 0.8; };
    setLeg(L.fl, stride); setLeg(L.br, stride);
    setLeg(L.fr, -stride); setLeg(L.bl, -stride);
    // 머리/목: graze=숙임, lookaround=두리번 (퇴장행동에서 직접 제어할 땐 스킵)
    if (a.parts.head && !a.leaving) {
      let hrx = 0, hry = 0;
      if (a.mode === 'idle' && a.idleAct === 'graze') hrx = 0.7 + Math.sin(t * 3) * 0.08;
      else if (a.mode === 'idle' && a.idleAct === 'lookaround') hry = Math.sin(t * 0.7 + a.phase) * 0.55;
      const target = a.parts.neck || a.parts.head;
      target.rotation.x += (hrx - target.rotation.x) * Math.min(1, dt * 4);
      a.parts.head.rotation.y += (hry - a.parts.head.rotation.y) * Math.min(1, dt * 4);
    }
    // 귀 파닥임 (미세)
    if (a.parts.ears && !a.leaving) {
      const kick = Math.max(0, Math.sin(t * 1.3 + a.phase)) > 0.985 ? 0.4 : 0;
      a.parts.ears[0].rotation.z += (kick - a.parts.ears[0].rotation.z) * Math.min(1, dt * 8);
    }
    // 꼬리 살랑
    if (a.parts.tail) a.parts.tail.rotation.y = Math.sin(t * (moving ? 5 : 1.8) + a.phase) * (a.sp.nameEn === 'fox' ? 0.4 : 0.25);
  }

  // ── 포즈: 새 (퍼덕임/활공 + 쪼기 + 두리번 + 걷기 뒤뚱) ──
  function poseBird(a, t, dt, flying) {
    const Wg = a.wings; if (!Wg) return;
    let flap;
    if (flying) flap = a.sp.nameEn === 'seagull' && a.mode === 'takeoff' && (a.orbit || 0) > 1
      ? 0.5 + Math.sin(t * 3) * 0.15   // 갈매기 활공(느린 유지)
      : Math.sin(t * 20) * 1.0;         // 강한 퍼덕임
    else flap = a.mode === 'walk' ? Math.sin(t * 8) * 0.1 : Math.sin(t * 2) * 0.04;
    if (Wg.wl) Wg.wl.rotation.z = flap;
    if (Wg.wr) Wg.wr.rotation.z = -flap;
    // 머리: 쪼기 / 두리번
    if (a.parts.head && !flying) {
      let hrx = 0, hry = 0;
      if (a.mode === 'idle' && a.idleAct === 'peck') hrx = Math.max(0, Math.sin(t * 6)) * 0.7;
      else if (a.mode === 'idle' && a.idleAct === 'lookaround') hry = (Math.sin(t * 1.2 + a.phase) > 0 ? 0.5 : -0.5);
      a.parts.head.rotation.x += (hrx - a.parts.head.rotation.x) * Math.min(1, dt * 6);
      a.parts.head.rotation.y += (hry - a.parts.head.rotation.y) * Math.min(1, dt * 5);
    }
    // 걷기 뒤뚱
    if (a.mode === 'walk' && a.parts.body) a.parts.body.rotation.z = Math.sin(a.gait) * 0.08;
  }

  // ── API ──
  return {
    respawn, despawnAll, update,
    getGroup: () => group,
    count: () => animals.length,
    // 재현/검증용 (코디네이터): 강제 등장/발자국/퇴장 트리거
    _forceSpawn: (opening) => spawnEncounter(!!opening),
    _roamSpot: () => roamSpot(), // #209 QA: 로밍 스팟 추첨 검증 (avoidRect·band 실측)
    _groundY: () => (spec.groundY ?? 0), // #209 QA: 착지 지면 y (새 퍼치면 검증)
    _spawnSpecies: (id) => spawnOne(id, roamSpot()), // #182 B1: 특정 종 강제 소환(검증/디버그) — 앰비언트 진입점
    // #208 인카운터 스폰(실사용): 집 앞 카메라 쪽으로 짧게 걸어 들어온다. yaw = camState.yaw.
    _spawnEncounter: (id, yaw) => { const e = encounterSpots(yaw); return spawnOne(id, e.at, false, 0, e); },
    _forceNightPrints: () => leaveNightPrints(),
    _forceLeaveAll: () => { for (const a of animals.slice()) startLeaving(a, false); },
    _debug: () => ({ n: animals.length, prints: prints.length, next: Math.round(nextSpawnMin - (getGameMin() || 0)),
      list: animals.map(a => ({ id: a.id, mode: a.mode, leaving: a.leaving, x: +a.g.position.x.toFixed(2), z: +a.g.position.z.toFixed(2), y: +a.g.position.y.toFixed(2) })) }),
    // QA 전용: 클로즈업 검수용 강제 이동 (팬 카메라 부재 보완 — 게임 로직 미사용, 하네스 전용)
    // tgt=null 대신 idle 전환 — walk/landing 업데이트가 tgt를 읽으므로 널을 남기면 프레임 크래시(검증에서 실측)
    _nudge: (i, x, z) => { const a = animals[i]; if (a) { a.g.position.x = x; a.g.position.z = z; a.tgt = null; a.mode = 'idle'; a.timer = 30; } },
    // #95 QA 전용: 강제 보행 목표 — 장애물 정중앙을 지나는 직선을 시켜 스티어링 실작동을 실증한다.
    _walkTo: (i, x, z) => { const a = animals[i]; if (a) { a.tgt = { x, z }; a.mode = 'walk'; a.stay = 999; } },
  };
}
