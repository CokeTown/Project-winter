/* ============================================================
   cat.js — Nine Winters 고양이 동반자 시스템 (엔지니어링 분리 Phase 2)
   ------------------------------------------------------------
   목적: 고양이 메시(복셀/리깅)·텍스처·AI(모드 전환/걷기/회피/퍼치)·애니메이션·
         스폰/디스폰을 game.js에서 분리한다. 함수들이 game.js 내부 심볼(scene·items·
         DEFS·state 및 유틸 B/lamb/makeCanvasTex/disposeDeep/footprintOf/surfaceRectOf/
         itemsOn/shadowDirty)을 참조하므로, 팩토리 makeCatSystem(ctx)로 내보내고
         game.js가 ctx를 주입한다(events.js 선례와 동일한 의존성 주입).
   원칙: import 방향은 game→systems 단방향(여긴 game.js를 import하지 않는다).
         본문은 원본과 문자열 동일 — 단 한 곳, ROOM(셸터 로드 시 새 객체로 재할당되는
         가변 바인딩) 참조 4개소만 getRoom()으로 바꿔 '현재 방'을 읽게 한다(캡처 stale 방지,
         행동 보존). 그 외 로직은 한 글자도 바꾸지 않는다.
   잔류(이동 안 함): 클로즈업 카메라(catCam/enterCatCloseup/exitCatCloseup)는 camera
         상태와 공유·입력 핸들러에 얽혀 있어 game.js에 남긴다. despawnCat이 exitCatCloseup를
         호출하므로 ctx로 주입받는다. 쓰다듬기(pickCat/petCatResponse)도 레이캐스트·입력
         결합이라 game.js 잔류 — catObj를 getCat()로 읽고 petHappy/petPurr를 직접 쓴다.
   ctx 필드: THREE, GLTFLoader (three addons) / B, lamb, makeCanvasTex, disposeDeep,
         footprintOf, surfaceRectOf, itemsOn, shadowDirty (game.js 유틸) / scene, items,
         DEFS, state (상태·씬 참조 — 재할당 안 됨) / CAT_POSES, CAT_PERCH_Y (data/items) /
         getRoom (() => ROOM 라이브 게터) / catCam, exitCatCloseup (game.js 클로즈업 잔류부).
   출처: game.js 고양이 블록(원본 그대로 이동, 팩토리로 래핑 + ROOM→getRoom()만 조정).
   ============================================================ */
export function makeCatSystem(ctx) {
  const {
    THREE, GLTFLoader,
    B, lamb, makeCanvasTex, disposeDeep,
    footprintOf, surfaceRectOf, itemsOn, shadowDirty,
    scene, items, DEFS, state,
    CAT_POSES, CAT_PERCH_Y, PET_HAPPY_MS,
    getRoom, catCam, exitCatCloseup,
  } = ctx;
  let catObj = null, _catSpawning = false;
  let catSupportDirty = false; // ⑥a: 가구 제거 직후 1틱 플래그 — 퍼치 고양이 지지면 재검사 트리거
  // 관절형 치즈 태비 (v1.9.1) — 몸통(호흡)·머리·귀·꼬리 2마디·다리 4개가 따로 움직인다
  /* ============================================================
     리깅된 GLB 고양이 (public/models/riggedcat.glb)
     - Rigify DEF 본만 추출된 스킨드 메시, 애니 클립 없음 → 본 프로시저럴 구동
     - 로드 실패 시 아래 buildCatMesh() 복셀 고양이로 폴백
  ============================================================ */
  const CAT_GLB_URL = 'models/riggedcat.glb';
  const CAT_TARGET_H = 0.32;            // 선 자세 월드 높이 목표 (복셀 고양이 크기와 동일)
  let _catGlbBuf = null;                // 최초 1회 fetch 캐시 (ArrayBuffer)
  let _catGlbTried = false, _catGlbFailed = false;
  const _gltfLoader = new GLTFLoader();

  // 매핑에 쓰는 실측 본 이름 — GLTFLoader 가 노드명에서 '.' 을 제거하므로 로드 후 이름 기준
  // (GLB 원본: DEF-spine.001, DEF-thigh.L 등 → 로드 후: DEF-spine001, DEF-thighL)
  const CAT_BONES = {
    spine:   ['DEF-spine', 'DEF-spine001', 'DEF-spine002', 'DEF-spine003', 'DEF-spine004', 'DEF-spine005'],
    head:    'DEF-spine006',                            // 두개골 (얼굴/귀 본은 로드 시 이 밑으로 attach)
    tail:    ['DEF-tail004', 'DEF-tail003', 'DEF-tail002', 'DEF-tail001'],   // 루트→끝 순
    legFL:   'DEF-upper_armL', legFR: 'DEF-upper_armR', // 앞다리(어깨)
    foreFL:  'DEF-forearmL',   foreFR: 'DEF-forearmR',
    legBL:   'DEF-thighL',     legBR: 'DEF-thighR',     // 뒷다리(골반)
    shinBL:  'DEF-shinL',      shinBR: 'DEF-shinR',
    earL:    'DEF-earL',       earR:  'DEF-earR',
  };
  // 회전 부호 실측 결과 (scratchpad/bone-axes.mjs: rest×offset 적용 후 말단 본 월드 이동 측정):
  //   thigh +X = 발끝 위·뒤로 접힘 / shin -X = 발끝 앞으로 (접힘 상쇄)
  //   spine -X = 가슴·머리 세움 (+X = 숙임) / tail +X = 내림, ±Z = 좌우 스윙 (Y는 축 트위스트라 안 보임)
  //   모델 정면 = 월드 -z (머리 z<0, 꼬리 z>0) → 래퍼 안에서 180° 회전시켜 +z 진행 코드와 일치시킴
  //   얼굴/귀/턱 본은 rig 직속(두개골 체인 밖) → 척추 회전 시 얼굴이 남겨지므로 스컬 본에 attach 필수

  async function loadCatGlbScene() {
    if (_catGlbFailed) return null;
    if (!_catGlbBuf) {
      if (_catGlbTried) return null;
      _catGlbTried = true;
      try {
        const res = await fetch(CAT_GLB_URL);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        _catGlbBuf = await res.arrayBuffer();
      } catch (e) { _catGlbFailed = true; console.warn('[cat] GLB fetch 실패, 복셀 폴백:', e.message); return null; }
    }
    // 매 스폰마다 새 스켈레톤을 얻기 위해 캐시된 버퍼를 재파싱 (인스턴스 1개뿐이라 비용 무시 가능)
    let gltf;
    try {
      gltf = await _gltfLoader.parseAsync(_catGlbBuf.slice(0), '');
    } catch (e) { _catGlbFailed = true; console.warn('[cat] GLB decode 실패, 복셀 폴백:', e.message); return null; }
    return gltf.scene;
  }

  // 로드된 씬을 래퍼에 넣고 크기/발바닥 정규화, 본 참조·rest 쿼터니언 수집
  function normalizeCatGlb(root) {
    const wrap = new THREE.Group();
    wrap.add(root);
    root.rotation.y = Math.PI;   // 모델 정면(-z) → 래퍼 +z (걷기 heading 코드와 일치)
    // 머티리얼 정리 + 컬링/그림자, 부위 색 (원본 텍스처 없음 → 턱시도 단색)
    root.traverse(o => {
      if (o.isSkinnedMesh || o.isMesh) {
        o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          if ('metalness' in m) m.metalness = 0;
          if ('roughness' in m) m.roughness = 1;
          if (m.emissive) m.emissive.setRGB(0, 0, 0);
          const nm = (m.name || '').toLowerCase();
          if (nm === 'eye') { m.color && m.color.setHex(0x2a2a20); }   // 눈/짙은 부위
          else { m.color && m.color.setHex(0xe8e4da); }                // 몸통 흰색(턱시도)
          m.flatShading = false;
        }
      }
    });
    wrap.updateMatrixWorld(true);
    // 실측 → 목표 높이로 스케일 (rig 노드 자체 scale 4.7153 을 Box3 실측이 자동 흡수)
    let box = new THREE.Box3().setFromObject(root);
    let h = box.max.y - box.min.y;
    if (!isFinite(h) || h <= 1e-4) h = CAT_TARGET_H;   // 실측 불가 시 무보정
    const s = CAT_TARGET_H / h;
    wrap.scale.setScalar(s);
    wrap.updateMatrixWorld(true);
    // 발바닥 y=0 정렬 (스케일 적용 후 재실측)
    box = new THREE.Box3().setFromObject(root);
    root.position.y -= box.min.y / (wrap.scale.y || 1);
    wrap.updateMatrixWorld(true);
    // 본 수집 (혹시 로더가 '.' 을 보존하는 버전이어도 매핑이 살도록 정규화 키를 함께 인덱스)
    const bones = {};
    root.traverse(o => {
      if (!o.isBone) return;
      bones[o.name] = o;
      const alt = o.name.replace(/\./g, '');
      if (!(alt in bones)) bones[alt] = o;
    });
    // 얼굴/귀/턱 본은 rig 직속(스컬 체인 밖)이라 척추를 돌리면 얼굴이 제자리에 남는다
    // → 두개골 본(spine006) 밑으로 attach (월드 변환 보존) 해서 머리를 따라오게 한다
    const skull = bones[CAT_BONES.head];
    if (skull) {
      const faceRe = /^DEF-(forehead|temple|brow|lid|nose|cheek|jaw|chin|lip|tongue|ear)/;
      const faceBones = [];
      root.traverse(o => { if (o.isBone && faceRe.test(o.name)) faceBones.push(o); });
      for (const fb of faceBones) skull.attach(fb);
      wrap.updateMatrixWorld(true);
    }
    const rest = {};   // 이름 → rest quaternion(clone). 매 프레임 rest×offset 으로 재계산 (누적 금지)
    for (const name in bones) rest[name] = bones[name].quaternion.clone();
    return { wrap, bones, rest };
  }

  // ── 코트 팔레트 (4종). 입양 시 랜덤(state.catCoat 저장, 구세이브=tabby).
  //   각 코트는 몸통(fur)·등줄무늬(stripe)·배/가슴(belly)·귀/발끝/꼬리끝(point)·코(nose) 색과
  //   얼굴 텍스처 파라미터(faceBg=주둥이 패치색, eyeDark/eyeHi=눈색, mask=콜러포인트 얼굴 마스크)를 가진다.
  //   초록 눈 금지: black=앰버, siamese/ragdoll=파랑, tabby만 기존 초록 유지(불변).
  //   tabby는 원본과 색·구조가 문자열까지 동일(point=belly=white, ear=fur, mask 없음) → 구세이브 외형 불변.
  const CAT_COLORS = {
    tabby:   { fur: 0xdf9038, stripe: 0xb96f24, belly: 0xf2eee4, point: 0xf2eee4, ear: 0xdf9038, nose: 0xcf9088,
               faceBg: '#df9038', faceMuzzle: '#f2eee4', eyeDark: '#243d1c', eyeHi: '#6fae3e', mask: null, mouth: '#5a3a24', lid: '#3a2c18' },
    // 올블랙 + 앰버 눈 (줄무늬 거의 안 보이게 fur에 근접, 배도 검정 계열 — 흰 부위 없음)
    black:   { fur: 0x262529, stripe: 0x201f23, belly: 0x2c2b2f, point: 0x201f23, ear: 0x262529, nose: 0x3a3436,
               faceBg: '#262529', faceMuzzle: '#2c2b2f', eyeDark: '#7a4f12', eyeHi: '#e6a52c', mask: null, mouth: '#151316', lid: '#1a181b' },
    // 시암: 크림 바디 + 초콜릿 콜러포인트(귀/얼굴 마스크/발/꼬리) + 파란 눈
    siamese: { fur: 0xddd2bc, stripe: 0xd3c7ad, belly: 0xefe7d4, point: 0x4a3528, ear: 0x4a3528, nose: 0x6b4a3c,
               faceBg: '#ddd2bc', faceMuzzle: '#efe7d4', eyeDark: '#27476a', eyeHi: '#6fa8d6', mask: '#4a3528', mouth: '#3a2a20', lid: '#3a2c22' },
    // 래그돌: 흰크림 바디 + 갈색 포인트(귀/얼굴 마스크/발/꼬리) + 파란 눈 (시암보다 밝은 포인트)
    ragdoll: { fur: 0xefe9dd, stripe: 0xe6dfce, belly: 0xf6f2ea, point: 0x6b4f3a, ear: 0x6b4f3a, nose: 0xcf9088,
               faceBg: '#efe9dd', faceMuzzle: '#f6f2ea', eyeDark: '#2e5074', eyeHi: '#7ab0da', mask: '#6b4f3a', mouth: '#5a4636', lid: '#4a3c2e' },
  };
  function catCoatId() { return CAT_COLORS[state.catCoat] ? state.catCoat : 'tabby'; }
  function catPalette() { return CAT_COLORS[catCoatId()]; }

  // 마인크래프트 고양이 스타일 — 각진 박스만으로 구성 (B 헬퍼 전용, 곡면 없음)
  // 단위: PX = 0.02 월드유닛/px (MC 원본 텍스처 px 그대로 치수 대입)
  //   머리 5×4×5px, 몸통 4×4×12px(낮고 긴 수평 박스), 다리 2×6×2px×4, 꼬리 1×1×6px×2마디
  // 마인크래프트 얼룩 고양이식 얼굴 — 정면 면에 픽셀 페인팅(별도 눈 지오메트리 대신).
  //   바탕은 털색(faceBg)과 동일해 박스 이음새가 안 보이고, 눈은 흰 공막 없이 코트별 눈색 세로 픽셀 + 위 하이라이트.
  //   콜러포인트 코트(siamese/ragdoll)는 눈 주위·이마에 mask 색을 얹어 얼굴 가면을 표현.
  //   16×16 그리드에 그려 NearestFilter로 픽셀 유지. 코트별로 캐시(코트 바뀌면 새 텍스처).
  const _catFaceTexByCoat = {};      // coatId → CanvasTexture (기본 눈)
  const _catFaceHappyByCoat = {};    // coatId → CanvasTexture (감은 눈)
  function _drawFaceCommon(g2, w, closed) {
    const P = catPalette();
    const cell = w / 16;
    const px = (cx, cy, cw, ch, col) => { g2.fillStyle = col; g2.fillRect(cx * cell, cy * cell, cw * cell, ch * cell); };
    px(0, 0, 16, 16, P.faceBg);       // 바탕 = 털색(faceBg)
    // 콜러포인트 마스크: 눈~이마 영역을 point 색으로 덮는다 (시암/래그돌 얼굴 가면)
    if (P.mask) {
      px(2, 2, 12, 7, P.mask);        // 이마~눈높이 가로 밴드
      px(2, 9, 3, 3, P.mask);         // 좌 볼로 흘러내림
      px(11, 9, 3, 3, P.mask);        // 우 볼로 흘러내림
    }
    px(4, 10, 8, 4, P.faceMuzzle);    // 주둥이 밝은 하관 패치 (코·입 주변 밝게)
    // 큰 눈 (좌 x=3, 우 x=10, 3×4) — 디렉터(2026-07): 종전 어두운 눈(eyeDark 본체)이 "기괴" → MC식으로
    //   밝은 홍채(eyeHi)를 크게 + 세로 동공(eyeDark) + 흰 반짝임 1px → 또렷하고 귀여운 눈.
    for (const ex of [3, 10]) {
      if (closed) {
        px(ex, 8, 3, 1, P.lid);                          // 감은 눈(⌒): 윗선
        px(ex, 9, 1, 1, P.lid); px(ex + 2, 9, 1, 1, P.lid); // 처진 양끝
      } else {
        px(ex, 6, 3, 4, P.eyeHi);                         // 밝은 홍채 (크게)
        px(ex + 1, 6, 1, 3, P.eyeDark);                   // 세로 동공(어둡게)
        px(ex + (ex < 8 ? 0 : 2), 6, 1, 1, '#f6f2ea');    // 눈 반짝임(스파클) 1px — 바깥 위 모서리
      }
    }
    // 작은 분홍 코 + 입(ω) — 귀여운 하관
    px(7, 11, 2, 1, '#d98a86');       // 코 (분홍)
    px(7, 12, 2, 1, P.mouth);         // 인중
    px(6, 13, 1, 1, P.mouth); px(9, 13, 1, 1, P.mouth); // 입꼬리
  }
  function catFaceTex() {
    const id = catCoatId();
    if (_catFaceTexByCoat[id]) return _catFaceTexByCoat[id];
    const tex = makeCanvasTex((g2, w) => _drawFaceCommon(g2, w, false), 16, 16);
    tex.repeat.set(1, 1);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    _catFaceTexByCoat[id] = tex;
    return tex;
  }
  // ② 클로즈업 쓰다듬기 연출용 — 눈 감은 얼굴(만족). 기존 얼굴 문법 재사용(눈 픽셀만 감은 호선으로 교체).
  function catFaceHappyTex() {
    const id = catCoatId();
    if (_catFaceHappyByCoat[id]) return _catFaceHappyByCoat[id];
    const tex = makeCanvasTex((g2, w) => _drawFaceCommon(g2, w, true), 16, 16);
    tex.repeat.set(1, 1);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    _catFaceHappyByCoat[id] = tex;
    return tex;
  }
  function buildCatMesh() {
    const g = new THREE.Group();
    const PX = 0.02;
    // 코트 팔레트에서 부위 색을 읽는다 (tabby=원본 색과 동일 → 구세이브 외형 불변).
    //   fur=몸통/머리, stripe=등줄무늬, belly=배/가슴, point=발끝/꼬리끝, ear=귀, nose=코.
    const C = catPalette();
    const fur = C.fur, stripe = C.stripe, belly = C.belly, point = C.point, ear = C.ear, nose = C.nose;
    const P = {};
    // ── 몸통 (피벗 = 엉덩이/골반 관절, 4×4×12px 낮고 긴 수평 박스) — 앉기/기지개 때 이 지점을 축으로 기운다
    //   기립 시 어깨~골반 높이 0.13 부근에 박스 중심을 두고, 몸이 앞(+z)으로 길게 뻗도록 배치
    const body = new THREE.Group();
    body.position.set(0, 0.13, -0.15);
    g.add(body); P.body = body;
    B(body, 4 * PX, 4 * PX, 12 * PX, fur, 0, 0, 6 * PX);              // 몸통 본체 (피벗에서 +z로 12px 길이, 중심 +6px)
    B(body, 4.06 * PX, 1.6 * PX, 10 * PX, belly, 0, -1.6 * PX, 6 * PX); // 배쪽 밴드 (아랫면에 얇게 덧대어 파묻힘 없이 보이게)
    for (const [sz, w] of [[3 * PX, 4.06 * PX], [7 * PX, 4.06 * PX], [10.5 * PX, 4.06 * PX]])
      B(body, w, 3.2 * PX, 2.2 * PX, stripe, 0, 0.3 * PX, sz);          // 등 줄무늬 3개 — 측면 돌출을 배 밴드와 동일(+0.03px)로 플러시(#87: 측면 요철 오독 마감)
    // 가슴 필러 — 앉아서 가슴이 들려도 어깨와 앞다리 사이가 비어 보이지 않게 몸통 앞쪽 아래를 채움
    B(body, 3.4 * PX, 3 * PX, 3.2 * PX, belly, 0, -2 * PX, 10.2 * PX);
    // ── 머리 (5×4×5px, 몸통 앞쪽에 자식으로 부착)
    const head = new THREE.Group();
    head.position.set(0, 1.5 * PX, 12 * PX + 2.5 * PX);   // 몸통 앞면(6+6=12px)에서 머리 반경(2.5px)만큼 더 앞
    body.add(head); P.head = head;
    // 두상 — 정면(+Z=BoxGeometry 4번 면)만 얼굴 텍스처, 나머지 5면은 털색. 눈은 텍스처 픽셀로 표현.
    {
      const furMat = lamb(fur);
      const faceMat = new THREE.MeshLambertMaterial({ map: catFaceTex() }); // 코트별 얼굴 텍스처(눈색/마스크)
      // BoxGeometry 면 순서: [+X, -X, +Y, -Y, +Z, -Z] — 고양이는 +Z를 바라본다
      const headMesh = new THREE.Mesh(
        new THREE.BoxGeometry(5 * PX, 4 * PX, 5 * PX),
        [furMat, furMat, furMat, furMat, faceMat, furMat]);
      headMesh.castShadow = true;
      head.add(headMesh);
      P.faceMat = faceMat; // ② 쓰다듬기 눈 감김 연출용 — map 스왑 대상
    }
    // ⑴ 코 블록 부착 수정: 종전 z=3.5px(얼굴면 2.5px 앞 0.85px 부유) → z=2.65px 로 당겨
    //   코 뒷면(z=2.5px)이 얼굴면과 맞닿게 한다(전 포즈 공용 — head 자식이라 포즈 무관 부착).
    B(head, 0.8 * PX, 0.6 * PX, 0.3 * PX, nose, 0, -0.2 * PX, 2.5 * PX + 0.15 * PX); // 튀어나온 코 (코트별 코색)
    // ── 귀 (1×2×1px 두 개, 머리 위 모서리) — 콜러포인트 코트는 귀가 point/ear 색
    const earL = new THREE.Group(); earL.position.set(-1.7 * PX, 2 * PX + 1 * PX, -1.7 * PX); head.add(earL); P.earL = earL;
    const earR = new THREE.Group(); earR.position.set(1.7 * PX, 2 * PX + 1 * PX, -1.7 * PX); head.add(earR); P.earR = earR;
    B(earL, 1 * PX, 2 * PX, 1 * PX, ear, 0, 0, 0);
    B(earR, 1 * PX, 2 * PX, 1 * PX, ear, 0, 0, 0);
    // ── 꼬리 2마디 (1×1×6px, 매우 길게, body 자식·-z 방향, 기본각은 살짝 아래로 처짐)
    const tail1 = new THREE.Group();
    tail1.position.set(0, 0.5 * PX, 0.5 * PX);   // 몸통 뒷면 안쪽에서 시작 (회전해도 틈 없음)
    body.add(tail1); P.tail1 = tail1;
    // 마디 박스를 관절 쪽으로 0.6px 연장해 겹침 — 회전 시 관절 틈이 벌어지지 않는다
    B(tail1, 1 * PX, 1 * PX, 6.6 * PX, fur, 0, 0, -2.7 * PX);
    const tail2 = new THREE.Group();
    tail2.position.set(0, 0, -6 * PX);        // 첫 마디 끝에서 이어짐
    tail1.add(tail2); P.tail2 = tail2;
    B(tail2, 1 * PX, 1 * PX, 6.6 * PX, fur, 0, 0, -2.7 * PX);
    B(tail2, 1.05 * PX, 1.05 * PX, 1.2 * PX, point, 0, 0, -6 * PX + 0.6 * PX); // 꼬리 끝 팁 (코트별 point)
    // ── 다리 4개 (2×6×2px, 가늘고 짧게 — 어깨/골반 피벗, 발끝 흰색)
    //   기립 시 다리 상단(피벗)을 어깨높이 6px(=0.12)에 두면 다리 박스(6px 길이, 중심 -3px)의 하단이 y=0(바닥)에 닿는다
    P.legs = {}; P.fore = {}; P.shin = {};
    for (const [key, x, z] of [['fl', -1.4 * PX, 5 * PX], ['fr', 1.4 * PX, 5 * PX], ['bl', -1.4 * PX, -5 * PX], ['br', 1.4 * PX, -5 * PX]]) {
      const leg = new THREE.Group();
      leg.position.set(x, 6 * PX, z);
      g.add(leg); P.legs[key] = leg;
      const front = z > 0;
      // 모든 다리 2마디(상단 3px + 하단 3px). 하단 회전 0이면 6px 단일다리와 동일 실루엣 → walk 등 회귀 없음.
      //   앞다리 전완(P.fore): 기지개 ㄴ자로 앞팔 전방 접지. 뒷다리 정강이(P.shin): 앉기 무릎접어 낮은 엉덩이(MC 레퍼런스).
      B(leg, 2 * PX, 3 * PX, 2 * PX, fur, 0, -1.5 * PX, 0);          // 상단(상완/허벅지) 3px
      const lo = new THREE.Group();
      lo.position.set(0, -3 * PX, 0);                               // 하단 피벗 = 팔꿈치/무릎
      leg.add(lo); (front ? P.fore : P.shin)[key] = lo;
      B(lo, 2 * PX, 3 * PX, 2 * PX, fur, 0, -1.5 * PX, 0);          // 하단(전완/정강이) 3px
      B(lo, 2.05 * PX, 1.4 * PX, 2.05 * PX, point, 0, -3 * PX + 0.7 * PX, 0); // 발끝
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return { g, parts: P };
  }
  /* 고양이 무브셋: walk(다리 스윙 보행) · sit(마인크래프트 시그니처 앉기) · sleep(식빵 자세 숨쉬기)
     · groom(앞발/가슴 핥기) · stretch(기지개) · play(제자리 콩콩 사냥놀이)
     새 지오메트리(PX=0.02): 몸통 4×4×12px(피벗=엉덩이, 박스는 로컬 z 0~12px 즉 pivot에서 +z로 전개),
     다리 2×6×2px(루트 자식, 피벗=어깨/골반 높이 6px=0.12, 서있을 때 발끝이 y=0에 닿음),
     꼬리 1×1×6px×2마디(t1 음수=아래로 처짐, 기존 부호 유지) */
  // 다리 rotation.x: 음수 = 앞(+z)으로 접힘(배 밑으로 튐), 양수 = 뒤로 뻗음
  // body.rotation.x 부호: box가 로컬 +z(전방)에 있으므로 음수 회전 = 전방(가슴/머리)이 들림, 양수 = 전방이 숙여짐(엎드림)
  // CAT_POSES(고양이 자세 테이블)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).
  // 지면(baseY≈0)에서 (x,z)가 가구 풋프린트와 겹치는지 — 회피용 저비용 AABB 전수 검사.
  //   noCollide/support(상판 위 소품)/얹힘 가구는 통과 허용. 고양이 몸통 반경 여유 0.14.
  function catPointBlocked(x, z, baseY) {
    if ((baseY || 0) > 0.12) return false; // 가구 위(퍼치)에서는 회피 안 함
    const PAD = 0.18;  // 고양이 몸통 반폭 여유 (검증 하네스의 판정폭 0.16보다 크게 잡아 겹침 0 보장)
    for (const i of items) {
      if (DEFS[i.defId].noCollide || i.support) continue;
      if ((i.y || 0) > 0.12) continue; // 상판 위에 얹힌 소품은 바닥 이동에 방해 안 됨
      const fp = footprintOf(i);
      if (Math.abs(x - i.x) < fp.w / 2 + PAD && Math.abs(z - i.z) < fp.d / 2 + PAD) return true;
    }
    return false;
  }
  // ⑵ 걷기 → 정지 전환 시 사지 스윙 잔류를 제거한다. gait(보행 위상 누산)를 0으로 리셋하면
  //   다음 프레임 stride=sin(gait)=0 이 되어 다리가 위로 들린 채 굳는 현상이 사라진다.
  //   (종전: gait가 마지막 스윙값을 유지 → sit/sprawl 진입 순간 다리 한쪽이 위로 튐)
  function resetGait(c) { c.gait = 0; c._catStuck = 0; }
  function pickNextCatMode(c) {
    const roll = Math.random();
    if (roll < 0.34) { c.tgt = catFreeSpot(); c.mode = 'walk'; resetGait(c); return; }
    resetGait(c); // 정지 계열 진입 — 걷기 스윙 잔류 제거
    if (roll < 0.53) { c.mode = 'groom'; c.timer = 5 + Math.random() * 5; }
    else if (roll < 0.68) { c.mode = 'sprawl'; c.timer = 25 + Math.random() * 35; } // 눕기 = 엎드려 뻗기(sprawl)만. 디렉터(2026-07): sleep(식빵)은 sprawl과 중복·이상 → 풀에서 제거
    else if (roll < 0.8) { c.mode = 'stretch'; c.timer = 2.2; }
    else if (roll < 0.9) { c.mode = 'play'; c.timer = 3.5 + Math.random() * 2; }
    else { c.mode = 'sit'; c.timer = 8 + Math.random() * 14; }
  }
  // 고양이가 올라앉을 수 있는 가구 상면 높이 (surface 정의가 없는 것들)
  // CAT_PERCH_Y(고양이 퍼치 높이)는 src/data/items.js로 분리(콘텐츠 데이터 Phase 1).
  // ⑥a: 퍼치 중인 고양이 발밑에 아직 지지면이 있는가 — findSupport/AABB 문법 재사용.
  //   (x,z)가 어떤 가구 상면 사각 안이고 그 상면 높이가 baseY와 대략 일치하면 유효.
  function catSupportValid(c) {
    const x = c.g.position.x, z = c.g.position.z;
    for (const i of items) {
      if (i.support) continue; // 상판 위 소품은 지지면이 아니다
      const sr = surfaceRectOf(i);
      const topY = sr ? sr.y : CAT_PERCH_Y[i.defId];
      if (topY == null) continue;
      if (Math.abs(topY - c.baseY) > 0.12) continue; // 높이 불일치 — 다른 층
      const rw = sr ? sr.w : footprintOf(i).w * 0.6;
      const rd = sr ? sr.d : footprintOf(i).d * 0.5;
      if (Math.abs(x - i.x) <= rw / 2 + 0.15 && Math.abs(z - i.z) <= rd / 2 + 0.15) return true;
    }
    return false;
  }
  // ⑥a: 지지 가구가 회수되어 허공에 뜬 고양이를 기존 hop 연출로 바닥에 착지시킨다 (순간이동 금지).
  function catDropToFloor(c) {
    const x = c.g.position.x, z = c.g.position.z;
    // 착지점: 바라보는 방향부터 8방위로 훑어 막히지 않은 바닥 지점. 전부 막히면 제자리 수직 착지.
    let tx = x, tz = z;
    for (let k = 0; k < 8; k++) {
      const a = c.g.rotation.y + k * (Math.PI / 4);
      const cx = THREE.MathUtils.clamp(x + Math.sin(a) * 0.55, -(getRoom().w / 2 - 0.4), getRoom().w / 2 - 0.4);
      const cz = THREE.MathUtils.clamp(z + Math.cos(a) * 0.55, -(getRoom().d / 2 - 0.4), getRoom().d / 2 - 0.4);
      if (!catPointBlocked(cx, cz, 0)) { tx = cx; tz = cz; break; }
    }
    c.hop = { t: 0, fx: x, fz: z, fy: c.baseY, tx, tz, ty: 0 };
    c.modeAfterHop = 'sit';
    c.mode = 'hop';
    c.tgt = null;
  }
  function catFreeSpot() {
    // ⑥b: 어떤 경우에도 예외를 던지지 않는다 — 여기서 예외가 새면 spawnCat 가드(_catSpawning)가
    //   영구 잔류해 이주 후 고양이가 다시는 소환되지 않는 회귀(1.0→1.2 신고)의 유력 경로였다.
    //   (예: 레이아웃에 남은 미지의 defId → footprintOf가 DEFS[undefined].fp 참조로 크래시)
    try {
      return catFreeSpotInner();
    } catch (e) {
      return { x: 0, z: 0, y: 0 }; // 셸터 중앙 폴백 (예외 금지)
    }
  }
  function catFreeSpotInner() {
    // 가구 위를 좋아한다 — 테이블/상자/서랍장 상판(surface), 침대/소파/러그/방석
    if (Math.random() < 0.45) {
      const climbs = items.filter(i => !i.support && (DEFS[i.defId].surface || CAT_PERCH_Y[i.defId] != null));
      if (climbs.length) {
        const f = climbs[Math.floor(Math.random() * climbs.length)];
        const sr = surfaceRectOf(f);
        const topY = sr ? sr.y : CAT_PERCH_Y[f.defId];
        const rw = sr ? sr.w : footprintOf(f).w * 0.6;
        const rd = sr ? sr.d : footprintOf(f).d * 0.5;
        for (let k = 0; k < 6; k++) {
          const x = f.x + (Math.random() - 0.5) * Math.max(0.05, rw - 0.3);
          const z = f.z + (Math.random() - 0.5) * Math.max(0.05, rd - 0.3);
          // 상판 위에 놓인 소품과 겹침 회피
          const clash = itemsOn(f).some(ch =>
            Math.abs(x - ch.x) < footprintOf(ch).w / 2 + 0.16 && Math.abs(z - ch.z) < footprintOf(ch).d / 2 + 0.16);
          if (!clash) return { x, z, y: topY };
        }
      }
    }
    for (let k = 0; k < 14; k++) {
      const x = (Math.random() * 2 - 1) * (getRoom().w / 2 - 0.5);
      const z = (Math.random() * 2 - 1) * (getRoom().d / 2 - 0.5);
      const blocked = items.some(i => !DEFS[i.defId].noCollide && !i.support &&
        Math.abs(x - i.x) < footprintOf(i).w / 2 + 0.18 && Math.abs(z - i.z) < footprintOf(i).d / 2 + 0.18);
      if (!blocked) return { x, z, y: 0 };
    }
    return { x: 0, z: 0, y: 0 };
  }
  // 사용자 결정: GLB 리깅 고양이는 앉기 실루엣 불만족으로 보류.
  // 마인크래프트풍 각진 복셀 고양이가 이 복셀 게임 스타일에 더 자연스럽다고 판단해 기본 비활성.
  // GLB 관련 코드(loadCatGlbScene/normalizeCatGlb/updateCatBones 등)는 향후 재검토를 위해 삭제하지 않고 보존한다.
  const USE_RIGGED_CAT = false;
  async function spawnCat() {
    if (!state.cat || catObj || _catSpawning) return;
    _catSpawning = true;
    // ⑥b: 가드는 try/finally로 반드시 해제한다. 종전엔 이 함수 안에서 예외가 나면 _catSpawning=true가
    //   영구 잔류해 이후 모든 spawnCat이 조기 반환 — "이주하면 고양이가 안 따라온다" 회귀(1.0→1.2)의 브릭 경로.
    try {
      const s = catFreeSpot();
      let g, parts = null, rig = null;
      const glbScene = USE_RIGGED_CAT ? await loadCatGlbScene() : null;
      // 로드 대기 중 상태가 바뀌었으면 취소
      if (!state.cat || catObj) { if (glbScene) disposeDeep(glbScene); return; }
      if (glbScene) {
        const n = normalizeCatGlb(glbScene);
        g = n.wrap; rig = { bones: n.bones, rest: n.rest };
      } else {
        const built = buildCatMesh();
        g = built.g; parts = built.parts;
      }
      g.position.set(s.x, s.y, s.z);
      g.rotation.y = Math.random() * Math.PI * 2;
      scene.add(g);
      catObj = {
        g, p: parts, rig, rigged: !!rig,
        mode: 'sit', timer: 5 + Math.random() * 8, tgt: null,
        gait: 0, earKick: 0, earNext: 2 + Math.random() * 5, baseY: s.y,
      };
      shadowDirty();
    } finally {
      _catSpawning = false;
    }
  }
  function despawnCat() {
    if (!catObj) return;
    if (catCam.active) exitCatCloseup(); // 고양이가 사라지면 클로즈업도 해제(카메라 원복)
    scene.remove(catObj.g);
    disposeDeep(catObj.g);
    catObj = null;
  }
  function updateCat(t, dt) {
    if (!catObj) return;
    const c = catObj, p = c.p;
    // ⑥a: 가구 제거 직후 1회 — 퍼치(baseY>0.12) 중인데 발밑 지지면이 사라졌으면 hop으로 바닥 착지.
    //   (종전: baseY가 유지된 채 허공 보행 — 코디네이터 재현 확정 버그. 순간이동 금지, 기존 hop 연출 재사용)
    //   hop 진행 중엔 플래그를 유지했다가 착지 후 틱에서 검사한다 (제거된 가구로 점프 중이던 경우 커버).
    if (catSupportDirty && c.mode !== 'hop') {
      catSupportDirty = false;
      if (c.baseY > 0.12 && !catSupportValid(c)) catDropToFloor(c);
    }
    // ── 모드 전환
    if (c.mode !== 'walk') {
      c.timer -= dt;
      if (c.timer <= 0) pickNextCatMode(c);
    }
    // ── 걷기: 이동 + 대각 보행 (FL+BR / FR+BL 스윙)
    let stride = 0;
    // ── 폴짝 점프 (가구 오르내리기) — 포물선 아치
    if (c.mode === 'hop' && c.hop) {
      const h = c.hop;
      h.t = Math.min(1, h.t + dt / 0.32);
      const u = h.t;
      c.g.position.x = h.fx + (h.tx - h.fx) * u;
      c.g.position.z = h.fz + (h.tz - h.fz) * u;
      c.baseY = h.fy + (h.ty - h.fy) * u + Math.sin(u * Math.PI) * 0.17;
      if (u >= 1) {
        c.baseY = h.ty;
        c.hop = null;
        c.mode = c.modeAfterHop || 'sit';
        c.modeAfterHop = null;
        if (c.mode !== 'walk') c.timer = 8 + Math.random() * 16;
        shadowDirty();
      }
    }
    if (c.mode === 'walk' && c.tgt) {
      const dx = c.tgt.x - c.g.position.x, dz = c.tgt.z - c.g.position.z;
      const dist = Math.hypot(dx, dz);
      if (c.baseY > 0.12 && (c.tgt.y || 0) < c.baseY - 0.12 && dist > 0.5) {
        // 높은 곳에서 먼 목적지로 — 먼저 바닥으로 폴짝 뛰어내리고 계속 걷는다
        const d = dist || 1;
        c.hop = { t: 0, fx: c.g.position.x, fz: c.g.position.z, fy: c.baseY,
                  tx: c.g.position.x + dx / d * 0.55, tz: c.g.position.z + dz / d * 0.55, ty: 0 };
        c.modeAfterHop = 'walk';
        c.mode = 'hop';
      } else if (dist < 0.05) {
        c.baseY = c.tgt.y; c.tgt = null;
        c.mode = 'sit'; c.timer = 6 + Math.random() * 12;
        resetGait(c); // ⑵ 도착해 앉을 때 걷기 스윙 잔류 제거(다리 위로 들림 방지)
        shadowDirty();
      } else if (dist < 0.42 && Math.abs((c.tgt.y || 0) - c.baseY) > 0.12) {
        // 높이가 다른 목적지 근처 — 폴짝 뛰어오르거나 내려앉는다
        c.hop = { t: 0, fx: c.g.position.x, fz: c.g.position.z, fy: c.baseY,
                  tx: c.tgt.x, tz: c.tgt.z, ty: c.tgt.y || 0 };
        c.tgt = null;
        c.modeAfterHop = 'sit';
        c.mode = 'hop';
      } else {
        c.gait += dt * 10;
        stride = Math.sin(c.gait) * 0.65;
        // ── 장애물 회피: 이번 스텝의 도착 지점(그리고 그 조금 앞)이 가구 풋프린트와 겹치면 진행각을 틀어 우회.
        //   후보각을 baseHeading부터 좌우로 넓혀가며(먼저 좌, 다음 우) 처음으로 뚫리는 각을 채택.
        const step = 0.5 * dt;
        const baseHeading = Math.atan2(dx, dz);
        const stepBlocked = h => {
          // 도착 지점 + 그 앞 0.25(선행 감지) 두 점 모두 확인 → 코너로 파고드는 것 방지
          const s = Math.sin(h), co = Math.cos(h);
          return catPointBlocked(c.g.position.x + s * step, c.g.position.z + co * step, c.baseY)
              || catPointBlocked(c.g.position.x + s * (step + 0.25), c.g.position.z + co * (step + 0.25), c.baseY);
        };
        let heading = baseHeading, found = !stepBlocked(baseHeading);
        if (!found) {
          // 좌우 대칭으로 각을 벌려가며 탐색 (0.6 → 1.1 → 1.6 rad)
          for (const off of [0.6, 1.1, 1.6]) {
            if (!stepBlocked(baseHeading - off)) { heading = baseHeading - off; found = true; break; }
            if (!stepBlocked(baseHeading + off)) { heading = baseHeading + off; found = true; break; }
          }
        }
        if (found) {
          c._catStuck = 0;
          c.g.position.x += Math.sin(heading) * step;
          c.g.position.z += Math.cos(heading) * step;
        } else {
          // 사방 봉쇄 — 이동 금지(파묻힘 방지). 3회 연속이면 목표 재선정.
          c._catStuck = (c._catStuck || 0) + 1;
          if (c._catStuck >= 3) { c._catStuck = 0; c._bestDist = undefined; c.tgt = catFreeSpot(); }
        }
        // 진척 없음 감지: 목표까지 거리가 3초간 개선되지 않으면(우회로도 못 뚫으면) 목표 재선정
        if (c._bestDist === undefined || dist < c._bestDist - 0.1) { c._bestDist = dist; c._noProg = 0; }
        else { c._noProg = (c._noProg || 0) + dt; if (c._noProg > 3) { c._noProg = 0; c._bestDist = undefined; c.tgt = catFreeSpot(); } }
        // 그림자맵은 autoUpdate=false(배터리) — 이동 중엔 10Hz로 갱신해 그림자가 실시간으로 따라온다
        c._shT = (c._shT || 0) + dt;
        if (c._shT > 0.1) { c._shT = 0; shadowDirty(); }
        // 부드러운 방향 전환 (우회 중엔 실제 진행각을 바라본다)
        const want = heading;
        let dr = want - c.g.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        c.g.rotation.y += dr * Math.min(1, dt * 8);
      }
    }
    // ── 목표 포즈로 부드럽게 — 기본값(pv)을 따로 lerp하고, 오버레이는 매 프레임 합산만 한다
    const pose = CAT_POSES[c.mode] || CAT_POSES.sit;
    // sit/sprawl 진입은 즉시성을 높여(러프 계수 ×2) 전환 중 어색한 중간 실루엣 노출을 줄인다
    const k = Math.min(1, dt * ((c.mode === 'sit' || c.mode === 'sprawl') ? 12 : 6));
    const pv = c.pv || (c.pv = { by: 0.13, brx: 0, hrx: 0, hry: 0, fl: 0, fr: 0, bl: 0, br: 0, t1: -0.5 });
    pv.by += (pose.by - pv.by) * k;
    pv.brx += (pose.brx - pv.brx) * k;
    // ⑷ 배 노출(몸통 롤 brz) 폐기 — 눕기는 엎드림(배 바닥)만. 몸통 z축 회전은 어떤 포즈에서도 걸지 않는다.
    pv.hrx += (pose.hrx - pv.hrx) * k;
    pv.fl += (pose.legF - pv.fl) * k;
    pv.fr += (pose.legF - pv.fr) * k;
    pv.bl += (pose.legB - pv.bl) * k;
    pv.br += (pose.legB - pv.br) * k;
    pv.t1 += (pose.t1 - pv.t1) * k;
    // ── 모드별 오버레이 (누적 없이 pv + 오버레이로 매번 재계산)
    let headRX = pv.hrx, headRY = 0, flX = pv.fl + stride, frX = pv.fr - stride;
    const walkBob = c.mode === 'walk' ? Math.abs(Math.sin(c.gait)) * 0.018 : 0;
    const hop = c.mode === 'play' ? Math.abs(Math.sin(t * 7.5)) * 0.055 : 0; // 사냥놀이 콩콩
    let bodyBr = 1;
    if (c.mode === 'sleep') bodyBr = 1 + Math.sin(t * 1.7) * 0.035;          // 식빵 자세 숨쉬기
    else if (c.mode === 'groom') {
      headRX += Math.sin(t * 7.5) * 0.16;                                    // 가슴/앞발 핥는 고갯짓
      headRY = Math.sin(t * 0.9) > 0 ? 0.4 : -0.4;
      flX += Math.max(0, Math.sin(t * 0.9)) * -0.5;                          // 한쪽 앞발 들기
    } else if (c.mode === 'sit') headRY = Math.sin(t * 0.4) * 0.55;          // 느긋한 두리번
    else if (c.mode === 'play') headRY = Math.sin(t * 5) * 0.3;              // 사냥감 쫓는 시선
    // rigged: CAT_POSES.by 의 기립값(0.14) 대비 편차 ×2.0 을 래퍼 y 하강으로
    //   → sit 0.075 = -0.13 (기립높이 0.32 의 41% ↓, 골반이 바닥에 닿음), sleep 0.05 = -0.18
    const rigDrop = c.rigged ? Math.max(0, 0.14 - pv.by) * 2.0 : 0;
    c.g.position.y = c.baseY + walkBob + hop - rigDrop;
    // ② 쓰다듬기 반응 타이머: 눈 감김(petHappy)·꼬리 가속(petPurr) 감쇠
    if (c.petHappy > 0) {
      c.petHappy = Math.max(0, c.petHappy - dt);
      if (c.petHappy === 0 && p && p.faceMat) { p.faceMat.map = catFaceTex(); p.faceMat.needsUpdate = true; }
    }
    if (c.petPurr > 0) c.petPurr = Math.max(0, c.petPurr - dt / (PET_HAPPY_MS / 1000));
    // 눈 감은 얼굴로 스왑 (활성 동안 유지). 복셀 경로 전용(faceMat) — 리깅 경로는 사운드/꼬리만.
    if (p && p.faceMat) {
      const want = c.petHappy > 0 ? catFaceHappyTex() : catFaceTex();
      if (p.faceMat.map !== want) { p.faceMat.map = want; p.faceMat.needsUpdate = true; }
    }
    // ── 꼬리 살랑 파라미터 (양 경로 공용) — 쓰다듬기 중엔 속도·진폭을 키워 만족한 살랑임
    const petBoost = c.petPurr > 0 ? 1 + c.petPurr * 0.7 : 1; // ② 꼬리 가속(최대 ×1.7 — 종전 ×2.4는 과함)
    // 디렉터(2026-07 라이브, 확대): "꼬리가 헬리콥터마냥 돈다" → 좌우(Y)+상하(X) 위상차가 원뿔 궤적을 만든다.
    //   상하 X성분을 0.2→0.08로 크게 줄여 '회전'을 잔잔한 좌우 살랑으로, 진폭(0.4→0.26)·2마디 증폭(1.3→1.1)·pet 가속도 완화.
    const tailSpd = (c.mode === 'play' ? 8 : c.mode === 'walk' ? 4.5 : c.mode === 'sleep' ? 0.7 : 1.4) * petBoost;
    const tailAmp = (c.mode === 'play' ? 0.5 : c.mode === 'sleep' ? 0.1 : 0.26) * (c.petPurr > 0 ? 1 + c.petPurr * 0.3 : 1);
    const tailY0 = Math.sin(t * tailSpd) * tailAmp;
    const tailY1 = Math.sin(t * tailSpd - 0.7) * tailAmp * 1.1;
    const tailX0 = Math.sin(t * tailSpd * 0.6) * 0.08 - (c.mode === 'walk' ? 0.4 : 0);
    // ── 귀 털기 타이머 (양 경로 공용)
    c.earNext -= dt;
    if (c.earNext <= 0) { c.earKick = 1; c.earNext = 3 + Math.random() * 8; c.earSide = Math.random() < 0.5 ? 'earL' : 'earR'; }
    if (c.earKick > 0) c.earKick = Math.max(0, c.earKick - dt * 4);
    const earKickV = c.earKick > 0 ? Math.sin(c.earKick * 28) * 0.35 * c.earKick : 0;

    if (c.rigged) {
      updateCatBones(c, {
        pv, stride, headRX, headRY, flX, frX, bodyBr,
        tailY0, tailY1, tailX0, earKickV, earSide: c.earSide,
      }, dt);
      return;
    }
    // ── 복셀 폴백: 기존 메시 포즈 적용
    p.body.scale.set(bodyBr, bodyBr, 1);
    p.body.position.y = pv.by;
    p.body.rotation.x = pv.brx;
    p.body.rotation.z = 0;        // ⑷ 몸통 롤 없음 — 배 노출(드러눕기) 폐기, 눕기는 엎드림 계열만
    p.head.rotation.x = headRX;
    p.head.rotation.y += (headRY - p.head.rotation.y) * Math.min(1, dt * 4);
    p.legs.fl.rotation.x = flX;
    p.legs.fr.rotation.x = frX;
    p.legs.bl.rotation.x = pv.bl - stride;
    p.legs.br.rotation.x = pv.br + stride;
    // 뒷다리 정강이(무릎) 굽힘 — 앉기(MC 레퍼런스: 낮게 웅크린 엉덩이): 정강이를 앞으로 접어 뒷발이 앞·아래로,
    //   + 뒷다리 피벗(엉덩이)을 낮춰 엉덩이가 바닥에 붙는다. 그 외 포즈는 0/6PX(곧은 다리)라 회귀 없음.
    {
      const shinTgt = c.mode === 'sit' ? 1.3 : 0; // 앉기만 정강이 접어 웅크림. 엎드리기(superman)는 정강이 곧게 편 채 legB로 뒤로 쭉.
      c._shin = (c._shin || 0) + (shinTgt - (c._shin || 0)) * Math.min(1, dt * 5);
      if (p.shin) { if (p.shin.bl) p.shin.bl.rotation.x = c._shin; if (p.shin.br) p.shin.br.rotation.x = c._shin; }
      const bpivTgt = c.mode === 'sit' ? 3.4 * 0.02 : (c.mode === 'sprawl' ? 1.6 * 0.02 : 6 * 0.02); // 엎드리기: 엉덩이 피벗 바닥 근처로 → 수평 뒷다리가 뒤로 바닥에 눕는다
      c._bpiv = (c._bpiv === undefined ? 0.12 : c._bpiv) + (bpivTgt - (c._bpiv === undefined ? 0.12 : c._bpiv)) * Math.min(1, dt * 5);
      p.legs.bl.position.y = c._bpiv; p.legs.br.position.y = c._bpiv;
    }
    // 그루밍: 접힌 뒷다리 발끝 옆삐짐 방지 축소 (앉기는 무릎접힘으로 대체 — 그루밍만 유지)
    {
      const hs = c.mode === 'groom' ? 0.6 : 1;
      const cur = p.legs.bl.scale.y;
      const nv = cur + (hs - cur) * Math.min(1, dt * 6);
      p.legs.bl.scale.y = nv;
      p.legs.br.scale.y = nv;
    }
    // 앞다리 전완(팔꿈치) 굽힘 — 앞다리는 2마디(상완+전완). 기지개(stretch)만 ㄴ자로 접어 앞팔을 바닥 전방에 납작하게
    //   뻗는다(디렉터 신고 — 확대: "진짜 다리 뻗는 건 ㄴ자여야"). 그 외 포즈는 0(곧게)이라 단일 6px 다리처럼 보인다.
    //   + 기지개는 앞다리 피벗(어깨)을 낮춰 팔꿈치가 바닥 근처로 내려와 앞팔이 실제로 접지한다.
    {
      const foreTgt = c.mode === 'stretch' ? 1.35 : 0; // 기지개만 앞팔 접힘(ㄴ자). 엎드리기(superman)는 앞다리 곧게 편 채 legF로 앞으로 쭉.
      c._fore = (c._fore || 0) + (foreTgt - (c._fore || 0)) * Math.min(1, dt * 5);
      if (p.fore) { if (p.fore.fl) p.fore.fl.rotation.x = c._fore; if (p.fore.fr) p.fore.fr.rotation.x = c._fore; }
      const pivTgt = c.mode === 'stretch' ? 3.6 * 0.02 : (c.mode === 'sprawl' ? 1.6 * 0.02 : 6 * 0.02); // 엎드리기: 어깨 피벗 바닥 근처로 → 수평 앞다리가 앞으로 바닥에 눕는다
      c._fpiv = (c._fpiv === undefined ? 0.12 : c._fpiv) + (pivTgt - (c._fpiv === undefined ? 0.12 : c._fpiv)) * Math.min(1, dt * 5);
      p.legs.fl.position.y = c._fpiv; p.legs.fr.position.y = c._fpiv;
    }
    p.tail1.rotation.x = pv.t1;
    p.tail1.rotation.y = tailY0;
    p.tail2.rotation.y = tailY1;
    p.tail2.rotation.x = tailX0;
    p[c.earSide || 'earL'].rotation.z = earKickV;
  }

  // rest 쿼터니언에서 오프셋을 곱해 본을 구동 (누적 금지: 매 프레임 rest×offset 재계산)
  const _qOff = new THREE.Quaternion(), _eul = new THREE.Euler();
  function _setBone(rig, name, rx, ry, rz) {
    const b = rig.bones[name], r = rig.rest[name];
    if (!b || !r) return;
    _eul.set(rx || 0, ry || 0, rz || 0, 'XYZ');
    _qOff.setFromEuler(_eul);
    b.quaternion.copy(r).multiply(_qOff);
  }
  function updateCatBones(c, a, dt) {
    const rig = c.rig, B = CAT_BONES;
    // 척추: CAT_POSES.brx ×2.0 을 6마디에 균등 분산 (실측: -X = 가슴·머리 세움)
    //   sit brx -0.3 → 총 -0.6rad: 골반(래퍼 하강으로 바닥) 위로 가슴이 들려 '앉음' 삼각 실루엣
    const perSpine = a.pv.brx * 2.0 / B.spine.length;
    for (const sn of B.spine) _setBone(rig, sn, perSpine, 0, 0);
    // sleep 숨쉬기: 척추 루트 스케일 (얼굴 본이 스컬에 attach 돼 있어 머리도 함께 따라옴)
    const spineRoot = rig.bones[B.spine[0]];
    if (spineRoot) spineRoot.scale.setScalar(a.bodyBr);
    // 머리(두개골 spine006): 끄덕임(+X=숙임, 복셀과 동일 부호) + 두리번(Y)
    //   척추 세움만큼 고개를 되숙여 시선을 수평으로 보정
    c._hry = (c._hry || 0) + (a.headRY - (c._hry || 0)) * Math.min(1, dt * 4);
    _setBone(rig, B.head, a.headRX - a.pv.brx * 1.4, c._hry, 0);
    // 앞다리(어깨+앞무릎) — 복셀 부호(-=앞으로 접힘)를 실측 부호로 변환:
    //   기본 게인 -0.9 (접힘 → +X: 발이 몸 뒤·아래로 턱 = 웅크림), stretch 만 +0.9 (발 앞으로 뻗는 플레이보우)
    const fgTgt = c.mode === 'stretch' ? 0.9 : -0.9;
    c._fg = (c._fg === undefined ? -0.9 : c._fg) + (fgTgt - c._fg) * Math.min(1, dt * 6);
    // ⑦ MC 앉기: 가슴이 spine으로 들리면(brx 음수) 어깨 피벗도 함께 회전해 앞다리가 몸통을 뚫는다.
    //   척추 총 리프트(brx*2.0)만큼 앞다리 루트를 되돌려(counter) 다리를 바닥 수직으로 세운다 — 관통 0.
    //   sit/groom(가슴 세우는 포즈)에서만 보정. 다른 포즈(brx≈0)는 보정량 0이라 영향 없음.
    const shoulderComp = (c.mode === 'sit' || c.mode === 'groom') ? a.pv.brx * 2.0 : 0;
    _setBone(rig, B.legFL, c._fg * a.flX - shoulderComp, 0, 0);
    _setBone(rig, B.legFR, c._fg * a.frX - shoulderComp, 0, 0);
    _setBone(rig, B.foreFL, 0.55 * Math.min(0, a.flX), 0, 0);   // 접을 때만 앞무릎 역굽힘
    _setBone(rig, B.foreFR, 0.55 * Math.min(0, a.frX), 0, 0);
    // 뒷다리 — 실측: thigh +X = 접힘(발끝 위·뒤), shin -X = 발끝 앞 (상쇄 굽힘)
    //   sit legB -1.15 → thigh +1.32rad(76°) 접힘 + shin -0.80: 다리가 내려앉은 몸 밑에 숨음
    _setBone(rig, B.legBL, -(a.pv.bl - a.stride) * 1.15, 0, 0);
    _setBone(rig, B.legBR, -(a.pv.br + a.stride) * 1.15, 0, 0);
    _setBone(rig, B.shinBL, 1.0 * Math.min(0, a.pv.bl), 0, 0);
    _setBone(rig, B.shinBR, 1.0 * Math.min(0, a.pv.br), 0, 0);
    // 꼬리 4마디 (루트 tail004 → 끝 tail001) — 실측: +X=내림, ±Z=좌우 스윙
    //   CAT_POSES.t1(음수=내림) ×-0.45 를 루트 X 로, 살랑임은 Z 위상 지연 사행,
    //   sit/groom/sleep 은 옆으로 감기(컬) 를 마디별로 누진 가산 → 바닥에 일자로 안 끌림
    const curlTgt = (c.mode === 'sit' || c.mode === 'groom' || c.mode === 'sleep') ? 0.85 : 0;
    c._curl = (c._curl || 0) + (curlTgt - c._curl) * Math.min(1, dt * 3);
    const T = B.tail, cu = c._curl;
    _setBone(rig, T[0], -a.pv.t1 * 0.45, 0, a.tailY0 * 0.5 + cu * 0.5);
    _setBone(rig, T[1], a.tailX0 * 0.3, 0, a.tailY1 * 0.6 + cu * 0.8);
    _setBone(rig, T[2], 0, 0, a.tailY0 * 0.7 + cu * 1.0);
    _setBone(rig, T[3], 0, 0, a.tailY1 * 0.8 + cu * 1.1);
    // 귀 털기 (z축 파르르)
    _setBone(rig, B.earL, 0, 0, a.earSide === 'earL' ? a.earKickV : 0);
    _setBone(rig, B.earR, 0, 0, a.earSide === 'earR' ? -a.earKickV : 0);
  }

  // ── game.js로 노출하는 API (외부 호출·상태 접근) ──
  //   catObj/_catSpawning/catSupportDirty는 이 클로저의 모듈 상태다. game.js는 아래
  //   접근자를 통해서만 읽고, 쓰기가 필요한 곳(petHappy/petPurr·mode·timer·catSupportDirty)은
  //   getCat()가 돌려주는 객체 참조나 전용 setter로 원본과 동일하게 조작한다.
  return {
    spawnCat, despawnCat, updateCat,
    catPointBlocked, catSupportValid,
    catFaceTex, catFaceHappyTex,
    getCat: () => catObj,
    isSpawning: () => _catSpawning,
    getCatSupportDirty: () => catSupportDirty,
    setCatSupportDirty: (v) => { catSupportDirty = v; },
  };
}
