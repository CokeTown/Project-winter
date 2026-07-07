/* ============================================================
   avatar.js — Nine Winters 주인공 아바타 (#86 「정착자는 나뿐」의 그 '나')
   ------------------------------------------------------------
   목적: 화면에 늘 비어 있던 '나'를 세운다 — 복셀 생존자 1인. 셸터 실내를 낮은 빈도로
         오가고, 창가에 서고, 소파에 앉고, 난로에 손을 쬐고, 기상 땐 침대 위에서 눈뜬다.
         게임은 여전히 클릭-방치형: 아바타는 조작 대상이 아니라 "삶의 증거" 연출이다.
   캐논: 사람 형상 금지 캐논의 **유일한 예외**가 이 아바타다(디렉터 오더 #86 — 그 '나').
         저널·탐험 1인칭 문구와 화면이 이제 일치한다. NPC/타 생존자는 계속 금지.
   원칙: cat.js/wildlife.js 선례 — 팩토리+의존성 주입(game→systems 단방향), 외부 에셋 0
         (전부 B() 복셀), 비영속(세이브 스키마 불변), 전 모드 동일(패리티 캐논), 동시 1인.
   2차(디렉터 오더 — 통과 신고 + 상호작용 + 설치 가드):
     - 충돌 완결: noCollide(러그/커튼)는 밟고 지나감, 스택 소품(y>0.3) 무시, 슬라이드 후
       재검사(이웃 가구로 미끄러져 들어가던 구멍), 정체 1.2s면 목표 재추첨, 폴백은 격자 스캔.
     - 고유 상호작용: 앉기(sofa/chair/cushion — 퍼치 높이표), 불쬐기(appliance.effect=heat,
       켜진 것만 — 양손을 불 쪽으로), 창가, 기상 연출(침대 위에서 2.6초 누웠다 일어남).
     - 설치 가드: blocksPlacement(x,z,fp) — '내'가 선 자리엔 설치 불가(collides 편입).
       프리뷰가 가까이 오면 nudgeAwayFrom으로 비켜선다(같은 호출 지점에서 트리거).
   ctx: THREE, B, lamb, disposeDeep, shadowDirty / scene, state, items, DEFS / getRoom,
        getBlockers, footprintOf, gameHour, opts. 전부 game.js 주입.
   ============================================================ */
export function makeAvatarSystem(ctx) {
  const {
    THREE, B, lamb, disposeDeep, shadowDirty,
    scene, state, items, DEFS,
    getRoom, getBlockers, footprintOf, gameHour, opts,
    OUTFITS, getOutfit, // #86④ 복장 (없으면 기본 팔레트 — 하위호환)
  } = ctx;

  const PX = 0.02;                  // cat.js 공유 복셀 단위
  const H = 1.58;                   // 선 자세 높이(m)
  const s = H / (79 * PX);
  const LEG_H = 26 * PX * s;        // 골반 높이 (앉기 좌표 계산 공용)
  // 앉는 표면 높이 — CAT_PERCH_Y와 같은 실측 계보(bed/sofa는 동일 값, chair는 좌판 실측)
  const SEAT_Y = { sofa: 0.56, chair: 0.45, cushion: 0.2, bed: 0.63 };
  const group = new THREE.Group();
  scene.add(group);
  let av = null;

  /* ── 복셀 생존자 메시 (1차와 동일 실루엣: 방한 코트+목도리+비니) ── */
  const PAL = {
    coat: 0x5a5648, coatHem: 0x4a463a, sleeve: 0x53503f,
    pants: 0x3e3a32, boots: 0x2e2a24, sole: 0x1e1b16,
    skin: 0xd8b090, scarf: 0xb8862e, beanie: 0x4a3f33, eye: 0x1a1410,
  };
  function buildMesh() {
    // #86④ 복장: 기본 팔레트 위에 착용 의류(OUTFITS[state.outfit].pal) 오버라이드 — 제작으로 획득, 옷장에서 착용
    const ov = (OUTFITS && getOutfit && OUTFITS[getOutfit()]) ? OUTFITS[getOutfit()].pal : null;
    const P = ov ? { ...PAL, ...ov } : PAL;
    const g = new THREE.Group();
    const legH = LEG_H, torsoH = 30 * PX * s;
    const legs = {};
    for (const [key, lx] of [['l', -3.2], ['r', 3.2]]) {
      const leg = new THREE.Group();
      leg.position.set(lx * PX * s, legH, 0);
      g.add(leg); legs[key] = leg;
      B(leg, 5 * PX * s, legH - 4 * PX * s, 6 * PX * s, P.pants, 0, -(legH - 4 * PX * s) / 2, 0);
      B(leg, 5.6 * PX * s, 4 * PX * s, 8.5 * PX * s, P.boots, 0, -legH + 2 * PX * s, 1 * PX * s);
      B(leg, 6 * PX * s, 1.2 * PX * s, 9 * PX * s, P.sole, 0, -legH + 0.6 * PX * s, 1 * PX * s);
    }
    const body = new THREE.Group();
    body.position.set(0, legH, 0);
    g.add(body);
    B(body, 13 * PX * s, torsoH, 8.5 * PX * s, P.coat, 0, torsoH / 2, 0);
    B(body, 15 * PX * s, 7 * PX * s, 10 * PX * s, P.coatHem, 0, 3.5 * PX * s, 0);
    B(body, 1.2 * PX * s, torsoH - 8 * PX * s, 0.8 * PX * s, P.coatHem, 0, torsoH / 2 - 2 * PX * s, 4.4 * PX * s);
    const arms = {};
    for (const [key, ax] of [['l', -8.2], ['r', 8.2]]) {
      const arm = new THREE.Group();
      arm.position.set(ax * PX * s, torsoH - 3 * PX * s, 0);
      body.add(arm); arms[key] = arm;
      B(arm, 4.2 * PX * s, 20 * PX * s, 5.5 * PX * s, P.sleeve, 0, -10 * PX * s, 0);
      B(arm, 3.4 * PX * s, 3.4 * PX * s, 4 * PX * s, P.skin, 0, -21 * PX * s, 0);
    }
    B(body, 11 * PX * s, 4 * PX * s, 9.5 * PX * s, P.scarf, 0, torsoH - 1 * PX * s, 0);
    B(body, 3.6 * PX * s, 9 * PX * s, 1.4 * PX * s, P.scarf, 2.4 * PX * s, torsoH - 7 * PX * s, 4.6 * PX * s);
    const head = new THREE.Group();
    head.position.set(0, torsoH + 1.5 * PX * s, 0);
    body.add(head);
    B(head, 9 * PX * s, 9.5 * PX * s, 8.5 * PX * s, P.skin, 0, 5 * PX * s, 0);
    B(head, 10 * PX * s, 5 * PX * s, 9.5 * PX * s, P.beanie, 0, 9.5 * PX * s, -0.4 * PX * s);
    B(head, 10.4 * PX * s, 2 * PX * s, 9.9 * PX * s, P.beanie, 0, 7.2 * PX * s, -0.4 * PX * s);
    for (const ex of [-2, 2])
      B(head, 1.1 * PX * s, 1.4 * PX * s, 0.5 * PX * s, P.eye, ex * PX * s, 4.6 * PX * s, 4.3 * PX * s);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return { g, parts: { body, head }, legs, arms };
  }

  /* ── 충돌: 방 안 자유 지점 + 가구/붙박이 사각 (러그·커튼·스택 소품 제외) ── */
  function hitBlock(x, z, pad) {
    const bl = getBlockers ? getBlockers() : [];
    for (const b of bl) if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return b;
    for (const it of items) {
      if (DEFS[it.defId]?.noCollide) continue;      // 러그/커튼: 밟고 지나간다
      if ((it.y || 0) > 0.3 || it.support) continue; // 상판 위 소품: 바닥 이동과 무관
      const fp = footprintOf(it);
      if (fp && Math.abs(x - it.x) < fp.w / 2 + pad && Math.abs(z - it.z) < fp.d / 2 + pad)
        return { x: it.x, z: it.z, w: fp.w, d: fp.d };
    }
    return null;
  }
  function freeSpot(avoidX, avoidZ, avoidR) {
    const room = getRoom();
    const ok = (x, z) => !hitBlock(x, z, 0.3) && (avoidR == null || Math.hypot(x - avoidX, z - avoidZ) > avoidR);
    for (let k = 0; k < 14; k++) {
      const x = (Math.random() * 2 - 1) * (room.w / 2 - 0.55);
      const z = (Math.random() * 2 - 1) * (room.d / 2 - 0.55);
      if (ok(x, z)) return { x, z };
    }
    // 폴백: 격자 스캔 — 가구로 꽉 찬 방에서 (0,0) 고정 폴백이 가구 안이던 결함의 교정
    for (let gz = -room.d / 2 + 0.5; gz <= room.d / 2 - 0.5; gz += 0.55)
      for (let gx = -room.w / 2 + 0.5; gx <= room.w / 2 - 0.5; gx += 0.55)
        if (ok(gx, gz)) return { x: gx, z: gz };
    return { x: 0, z: room.d / 2 - 0.7 }; // 최후: 문가
  }

  /* ── 경유점 라우팅 (디렉터: "우회가 아니라 비비기를 한다") ──
     반응형 슬라이드(부딪힌 뒤 면을 따라 밀림)는 큰 가구에서 '문지르는 그림'이 된다.
     걷기 목표를 잡는 순간 직선이 가구 사각을 지나는지 검사하고, 지나면 그 사각의
     자유 모서리(+0.5 여유)를 경유점으로 삽입 — 부딪히기 전에 도는 걸음이 된다.
     슬라이드는 잔여 안전망(0.9s 상한)으로만 남는다. */
  function segHitsRect(x0, z0, x1, z1, r, pad) { // 2D 슬랩 판정
    const hw = r.w / 2 + pad, hd = r.d / 2 + pad;
    const dx = x1 - x0, dz = z1 - z0;
    let t0 = 0, t1 = 1;
    const p = [-dx, dx, -dz, dz];
    const q = [x0 - (r.x - hw), (r.x + hw) - x0, z0 - (r.z - hd), (r.z + hd) - z0];
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; continue; }
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t1) t1 = t; if (t < t0) return false; }
    }
    return t0 <= t1 && t1 > 0 && t0 < 1;
  }
  function firstRectOnPath(x0, z0, x1, z1, pad) {
    const bl = getBlockers ? getBlockers() : [];
    for (const b of bl) if (segHitsRect(x0, z0, x1, z1, b, pad)) return b;
    for (const it of items) {
      if (DEFS[it.defId]?.noCollide || (it.y || 0) > 0.3 || it.support) continue;
      const fp = footprintOf(it);
      if (fp && segHitsRect(x0, z0, x1, z1, { x: it.x, z: it.z, w: fp.w, d: fp.d }, pad)) return { x: it.x, z: it.z, w: fp.w, d: fp.d };
    }
    return null;
  }
  function routeTo(tgt) { // 경유점 계산 — 직행 가능하면 null
    const g = av.g;
    const R = firstRectOnPath(g.position.x, g.position.z, tgt.x, tgt.z, 0.3);
    if (!R) return null;
    const hw = R.w / 2 + 0.5, hd = R.d / 2 + 0.5;
    const room = getRoom();
    let best = null, bestCost = 1e9;
    for (const [cx, cz] of [[R.x - hw, R.z - hd], [R.x + hw, R.z - hd], [R.x - hw, R.z + hd], [R.x + hw, R.z + hd]]) {
      if (Math.abs(cx) > room.w / 2 - 0.3 || Math.abs(cz) > room.d / 2 - 0.3) continue; // 방 밖 코너 제외
      if (Math.hypot(cx - g.position.x, cz - g.position.z) < 0.25) continue; // 지금 선 코너 재선택 금지 — 비용 최소로 계속 뽑혀 제자리 루프(프로브 검거)
      if (hitBlock(cx, cz, 0.24)) continue;
      if (segHitsRect(g.position.x, g.position.z, cx, cz, R, 0.24)) continue; // 코너행이 같은 사각을 뚫으면 무효
      const cost = Math.hypot(cx - g.position.x, cz - g.position.z) + Math.hypot(tgt.x - cx, tgt.z - cz);
      if (cost < bestCost) { bestCost = cost; best = { x: cx, z: cz }; }
    }
    return best;
  }
  function setTarget(tgt) { av.tgt = tgt; av.way = tgt ? routeTo(tgt) : null; }

  function respawn() {
    despawn();
    const built = buildMesh();
    const spot = freeSpot();
    built.g.position.set(spot.x, 0, spot.z);
    built.g.rotation.y = Math.random() * Math.PI * 2;
    group.add(built.g);
    av = { ...built, mode: 'idle', timer: 2 + Math.random() * 3, tgt: null, gait: 0, phase: Math.random() * 6,
      use: null, blockedT: 0, wakeT: 0 };
    shadowDirty();
  }
  function despawn() { if (av) { group.remove(av.g); disposeDeep(av.g); av = null; shadowDirty(); } }

  /* ── 상호작용 대상 탐색 ── */
  const seatOf = it => SEAT_Y[it.defId];
  function pickSeat() {
    // 침대 포함(디렉터: "침대랑 상호작용을 안 한다") — 침대는 startSit에서 모서리 걸터앉기로 처리
    const list = items.filter(it => seatOf(it) != null && !(it.y > 0.3) && !it.support);
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  function pickHeat() {
    // 불 쬘 대상 = 불꽃 광원(난로/벽난로급: flicker + 광반경 6↑ — 촛불 제외) 또는 온열 가전(appliance heat)
    const list = items.filter(it => {
      if (it.support || it.on === false) return false;
      const D = DEFS[it.defId] || {};
      return (D.light && D.light.flicker && (D.light.dist || 0) >= 6) || D.appliance?.effect === 'heat';
    });
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }
  function approachPoint(it, dist) {
    // 가구 정면(rot 기준 +z가 정면인 배치 관례) 우선, 막히면 반대편 — 방 경계 밖(벽 자리)은 제외
    //   (경계 검사 누락 시 벽에 붙은 난로의 정면 후보가 벽 속으로 떨어져 '벽 보고 불쬐기'가 된다 — 프로브 육안 검거)
    const fp = footprintOf(it) || { w: 0.8, d: 0.8 };
    const fr = (it.rot || 0) * Math.PI / 2;
    const room = getRoom();
    const inRoom = c => Math.abs(c.x) < room.w / 2 - 0.35 && Math.abs(c.z) < room.d / 2 - 0.35;
    const cand = [
      { x: it.x + Math.sin(fr) * (fp.d / 2 + dist), z: it.z + Math.cos(fr) * (fp.d / 2 + dist) },
      { x: it.x - Math.sin(fr) * (fp.d / 2 + dist), z: it.z - Math.cos(fr) * (fp.d / 2 + dist) },
      { x: it.x + Math.cos(fr) * (fp.w / 2 + dist), z: it.z - Math.sin(fr) * (fp.w / 2 + dist) },
      { x: it.x - Math.cos(fr) * (fp.w / 2 + dist), z: it.z + Math.sin(fr) * (fp.w / 2 + dist) },
    ];
    for (const c of cand) if (inRoom(c) && !hitBlock(c.x, c.z, 0.24)) return c;
    return cand.find(inRoom) || { x: it.x, z: it.z + fp.d / 2 + dist };
  }

  // 창가 지점(디렉터 양초대 제보로 검거): 고정점(0, 창벽+0.6)이 가구에 점유되면 그 가구를
  //   창가 갈 때마다 밀어대는 '재발 비비기'가 된다 — x 스캔으로 빈 창가를 찾고, 다 막혔으면 창가 포기.
  function windowSpot() {
    const room = getRoom();
    const z = -room.d / 2 + 0.6;
    // 후보 셔플 + 지터: 매번 정확히 같은 창가 지점에 서는 것도 '순찰' 인상의 한 축
    const xs = [0, -0.6, 0.6, -1.2, 1.2, -1.8, 1.8].sort(() => Math.random() - 0.5);
    for (const x0 of xs) {
      const x = x0 + (Math.random() - 0.5) * 0.4;
      if (Math.abs(x) < room.w / 2 - 0.5 && !hitBlock(x, z, 0.32)) return { x, z };
    }
    return freeSpot();
  }
  function pickIdle() { if (!av) return; unseat(); av.mode = 'idle'; av.tgt = null; av.way = null; av.use = null; av.timer = 6 + Math.random() * 10; }
  // 착석/눕기 해제 — 일어날 땐 앉기 전 접근점으로 내려선다(좌판 중앙에서 걸어 나오면 가구 관통으로 보인다)
  function unseat() {
    if (!av) return;
    if (av.mode === 'sit' || av.mode === 'wake') {
      const g = av.g;
      g.rotation.x = 0; g.position.y = 0; resetPose();
      if (av.exitSpot) g.position.set(av.exitSpot.x, 0, av.exitSpot.z);
      shadowDirty(); // 위치 점프 — 그림자 즉시 갱신 (정적 씬 신고 의무)
    }
    av.exitSpot = null;
  }
  function pickNext() {
    if (!av) return;
    unseat();
    // '순찰' 교정(디렉터: "좁은 범위를 페트롤하듯"): 사는 사람의 리듬은 대부분 머무르고 가끔 움직인다.
    //   가중 풀 추첨 + 직전 행동 가중 ×0.35(같은 목적지 왕복 억제) + 걷기 목표는 먼 곳 선호.
    const seatIt = pickSeat(), heatIt = pickHeat();
    const pool = [['walk', 0.26], ['window', 0.16], ['idle', 0.3]];
    if (seatIt) pool.push(['sit', 0.22]);
    if (heatIt) pool.push(['warm', 0.18]);
    let tot = 0;
    for (const p of pool) { if (p[0] === av.lastAct) p[1] *= 0.35; tot += p[1]; }
    let r = Math.random() * tot, act = 'idle';
    for (const p of pool) { r -= p[1]; if (r <= 0) { act = p[0]; break; } }
    av.lastAct = act;
    if (act === 'walk') { av.mode = 'walk'; setTarget(farSpot()); }
    else if (act === 'window') { av.mode = 'window'; av.timer = 8 + Math.random() * 12; setTarget(windowSpot()); }
    else if (act === 'sit') { av.mode = 'gosit'; av.use = seatIt; setTarget(approachPoint(seatIt, 0.42)); }
    else if (act === 'warm') { av.mode = 'gowarm'; av.use = heatIt; setTarget(approachPoint(heatIt, 0.62)); }
    else pickIdle();
  }
  // 걷기 목표는 현 위치에서 먼 곳 선호 — 좁은 방에서 제자리 근처 재추첨이 만들던 잔걸음 왕복 제거
  function farSpot() {
    const room = getRoom();
    const minD = Math.min(room.w, room.d) * 0.55;
    let best = null, bestD = -1;
    for (let k = 0; k < 6; k++) {
      const s = freeSpot();
      const d = Math.hypot(s.x - av.g.position.x, s.z - av.g.position.z);
      if (d > bestD) { bestD = d; best = s; }
      if (d >= minD) return s;
    }
    return best || freeSpot();
  }

  /* ── 기상 연출: 취침(암전) 직후 침대 위에서 눈뜨는 2.6초 — sleepUntilMorning이 호출 ──
     rect가 null이면 바닥 취침(침대 없음): 제자리 바닥에서 잠깐 누웠다 일어난다. */
  function wakeOnBed(rect) {
    if (!av) return;
    av.mode = 'wake'; av.wakeT = 2.6; av.tgt = null; av.use = rect;
    const g = av.g;
    if (rect) { g.position.set(rect.x, (rect.y ?? 0.63) + 0.1, rect.z); g.rotation.y = ((rect.rot || 0) * Math.PI / 2) + Math.PI / 2; }
    else g.position.y = 0.08;
    g.rotation.x = -Math.PI / 2 + 0.05;
    resetPose();
    shadowDirty(); // 침대 위 눕기 점프 — 즉시 갱신
  }
  function resetPose() {
    if (!av) return;
    for (const k of ['l', 'r']) { av.legs[k].rotation.x = 0; av.arms[k].rotation.x = 0; }
    av.parts.body.rotation.x = 0;
  }

  /* ── #86③ 설치 가드: '나'가 선 자리 설치 불가 + 프리뷰 접근 시 비켜서기 ──
     collides(배치 유효성)가 프리뷰 이동마다 호출하는 단일 지점 — 겹침 판정과 회피 트리거를 겸한다. */
  function blocksPlacement(x, z, fp) {
    if (!av || !av.g.visible || av.mode === 'wake') return false;
    const g = av.g;
    const near = Math.hypot(x - g.position.x, z - g.position.z);
    // 프리뷰가 다가오면(1.4 이내) 서 있던 자리를 비켜준다 — 앉아 있었으면 일어나서
    if (near < 1.4 && av.mode !== 'walk') {
      const sp = freeSpot(x, z, 1.7);
      resetPose(); av.g.position.y = 0; av.g.rotation.x = 0;
      av.mode = 'walk'; av.use = null; setTarget(sp);
    }
    return Math.abs(x - g.position.x) < fp.w / 2 + 0.24 && Math.abs(z - g.position.z) < fp.d / 2 + 0.24;
  }

  function update(t, dt) {
    if (!av) return;
    const g = av.g;
    // 1인칭 정합: 탐험 중엔 집에 없다
    const away = !!state.exp;
    if (g.visible === away) {
      g.visible = !away; shadowDirty();
      if (!away) { const sp = freeSpot(); g.rotation.x = 0; g.position.set(sp.x, 0, sp.z); resetPose(); pickIdle(); }
    }
    if (away) return;

    // 기상 연출: 누운 채 잠깐 → 일어나 침대 옆으로
    if (av.mode === 'wake') {
      av.wakeT -= dt;
      av.parts.body.scale.y = 1 + Math.sin(t * 1.2) * 0.006;
      if (av.wakeT <= 0) {
        g.rotation.x = 0; g.position.y = 0;
        if (av.use) { const sp = freeSpot(); const bx = av.use.x + 0.9, bz = av.use.z; g.position.set(hitBlock(bx, bz, 0.26) ? sp.x : bx, 0, hitBlock(bx, bz, 0.26) ? sp.z : bz); }
        shadowDirty(); // 기립 점프 — 즉시 갱신
        pickIdle();
      }
      return;
    }

    // 이동 (walk / window·gosit·gowarm 접근)
    const approaching = (av.mode === 'walk' || av.mode === 'window' || av.mode === 'gosit' || av.mode === 'gowarm') && av.tgt;
    if (approaching) {
      const aim = av.way || av.tgt; // 경유점 우선 — 가구 모서리를 돌아서 간다
      const dx = aim.x - g.position.x, dz = aim.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < (av.way ? 0.14 : 0.08)) {
        if (av.way) { av.way = routeTo(av.tgt); } // 경유점 도착 → 남은 길 재검사(둘째 가구 대응)
        else if (av.mode === 'walk') pickIdle();
        else if (av.mode === 'window') av.tgt = null;
        else if (av.mode === 'gosit') startSit();
        else if (av.mode === 'gowarm') startWarm();
      } else {
        const step = 0.62 * dt;
        let nx = g.position.x + dx / dist * Math.min(step, dist);
        let nz = g.position.z + dz / dist * Math.min(step, dist);
        const b = hitBlock(nx, nz, 0.26);
        if (b) { // 사각 슬라이드: 침투 얕은 축 고정
          const px = b.w / 2 + 0.26 - Math.abs(nx - b.x), pz = b.d / 2 + 0.26 - Math.abs(nz - b.z);
          if (px < pz) nx = b.x + Math.sign(nx - b.x || 1) * (b.w / 2 + 0.26);
          else nz = b.z + Math.sign(nz - b.z || 1) * (b.d / 2 + 0.26);
          // 비비적 상한(디렉터: "침대에 비빈다"): 큰 가구를 따라 긴 슬라이드가 이어지면
          //   문지르는 그림이 된다 — 0.9초 넘게 쓸면 경로를 다시 뽑는다(돌아가는 척이라도).
          av.slideT = (av.slideT || 0) + dt;
          if (av.slideT > 0.9) { av.slideT = 0; if (av.mode === 'walk') setTarget(freeSpot()); else return pickIdle(); }
          // 슬라이드 결과가 또 다른 가구 안이면 제자리 — 1.2초 넘게 막히면 목표 재추첨 (이웃 침투/정체 교정)
          if (hitBlock(nx, nz, 0.24)) {
            nx = g.position.x; nz = g.position.z;
            av.blockedT += dt;
            if (av.blockedT > 1.2) { av.blockedT = 0; if (av.mode === 'walk') av.tgt = freeSpot(); else pickIdle(); }
          } else av.blockedT = 0;
        } else { av.blockedT = 0; av.slideT = 0; }
        g.position.x = nx; g.position.z = nz;
        const want = Math.atan2(dx, dz);
        let dr = want - g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
        g.rotation.y += dr * Math.min(1, dt * 6);
        av.gait += dt * 7;
        // 그림자 실시간화(디렉터 실기기: "그림자가 뒤늦게 따라온다"): 씬은 정적 최적화(autoUpdate=false)라
        //   움직이는 놈이 직접 신고해야 한다. 20Hz로 상향해 스텝감 제거(디렉터: 실시간).
        av._shT = (av._shT || 0) + dt;
        if (av._shT > 0.05) { av._shT = 0; shadowDirty(); }
      }
    } else if (av.mode === 'sit' || av.mode === 'warm') {
      av.timer -= dt;
      if (av.timer <= 0) pickNext(); // 착석 해제(unseat)는 pickNext가 처리 — 접근점으로 내려선 뒤 다음 행동
    } else if (av.mode === 'window' && !av.tgt) {
      let dr = Math.PI - g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
      g.rotation.y += dr * Math.min(1, dt * 4);
      av.timer -= dt;
      if (av.timer <= 0) pickNext();
    } else {
      av.timer -= dt;
      if (av.timer <= 0) pickNext();
    }

    // 포즈
    const moving = approaching && av.mode !== 'sit';
    const sw = moving ? Math.sin(av.gait) * 0.5 : 0;
    if (av.mode === 'sit') {
      // 앉기: 다리 앞으로, 몸 살짝 뒤로 — 좌판 높이는 SEAT_Y (고양이 퍼치 계보)
      for (const k of ['l', 'r']) { av.legs[k].rotation.x += (-1.35 - av.legs[k].rotation.x) * Math.min(1, dt * 8); av.arms[k].rotation.x += (-0.2 - av.arms[k].rotation.x) * Math.min(1, dt * 8); }
      av.parts.body.rotation.x += (-0.08 - av.parts.body.rotation.x) * Math.min(1, dt * 8);
      av.parts.body.scale.y = 1 + Math.sin(t * 1.6 + av.phase) * 0.008;
    } else if (av.mode === 'warm') {
      // 불쬐기: 양손을 불 쪽으로 — 코지 아포칼립스의 핵심 포즈
      for (const k of ['l', 'r']) { av.legs[k].rotation.x *= 0.9; av.arms[k].rotation.x += (-0.62 - av.arms[k].rotation.x) * Math.min(1, dt * 6); }
      av.parts.body.scale.y = 1 + Math.sin(t * 2.2 + av.phase) * 0.01;
    } else {
      if (av.legs.l) av.legs.l.rotation.x += (sw - av.legs.l.rotation.x) * Math.min(1, dt * 10);
      if (av.legs.r) av.legs.r.rotation.x += (-sw - av.legs.r.rotation.x) * Math.min(1, dt * 10);
      if (av.arms.l) av.arms.l.rotation.x += (-sw * 0.7 - av.arms.l.rotation.x) * Math.min(1, dt * 10);
      if (av.arms.r) av.arms.r.rotation.x += (sw * 0.7 - av.arms.r.rotation.x) * Math.min(1, dt * 10);
      av.parts.body.scale.y = 1 + (moving ? 0 : Math.sin(t * 1.6 + av.phase) * 0.008);
    }
    if (!moving && av.mode !== 'sit' && av.mode !== 'warm') av.parts.head.rotation.y = Math.sin(t * 0.5 + av.phase) * 0.4;
    else if (moving) av.parts.head.rotation.y *= 0.9;
  }

  function startSit() {
    const it = av.use;
    if (!it || !items.includes(it)) return pickIdle(); // 앉으러 가는 새 가구가 수거됐으면 무산
    const g = av.g;
    av.exitSpot = { x: g.position.x, z: g.position.z }; // 도착점(접근점) 기억 — 일어날 때 여기로
    const y = seatOf(it) ?? 0.45;
    let sx = it.x, sz = it.z, ry = (it.rot || 0) * Math.PI / 2; // 기본: 가구 정면 방향 정좌 (관례: rot0=+z)
    if (it.defId === 'bed') {
      // 침대는 걸터앉기(디렉터: "침대랑 상호작용") — 접근한 쪽 모서리에 앉아 바깥을 본다
      const fp = footprintOf(it) || { w: 1.8, d: 2.3 };
      const cl = (v, m) => Math.max(-m, Math.min(m, v));
      sx = it.x + cl((g.position.x - it.x) * 3, fp.w / 2 - 0.22);
      sz = it.z + cl((g.position.z - it.z) * 3, fp.d / 2 - 0.22);
      ry = Math.atan2(av.exitSpot.x - it.x, av.exitSpot.z - it.z);
    }
    // 그룹 원점은 발바닥 — 앉기는 '골반(=원점+LEG_H)이 좌판에 닿게': y = 좌판 - LEG_H (+쿠션 눌림 0.05).
    // 이전 식(좌판 - LEG_H×0.42)은 골반이 좌판보다 0.3 떠서 전 좌석 공중부양(디렉터 침대 신고 — 침대가 제일 높아 제일 티).
    g.position.set(sx, y - LEG_H + 0.05, sz);
    g.rotation.y = ry;
    av.mode = 'sit'; av.timer = 10 + Math.random() * 15; av.tgt = null; // 오래 앉는다 — 사는 사람의 리듬
    shadowDirty(); // 좌판 위로 점프 — 즉시 갱신
  }
  function startWarm() {
    const it = av.use;
    if (!it || !items.includes(it) || it.on === false) return pickIdle();
    const g = av.g;
    g.rotation.y = Math.atan2(it.x - g.position.x, it.z - g.position.z); // 불을 향해 선다
    av.mode = 'warm'; av.timer = 8 + Math.random() * 10; av.tgt = null; // 불 앞에 오래 머문다
    shadowDirty(); // 방향 전환 + 팔 포즈 — 즉시 갱신
  }

  // #86④ 옷 갈아입기: 제자리 재구축 (위치/방향 보존 — 옷장에서 입는 즉시 반영)
  function refreshOutfit() {
    if (!av) return respawn();
    const p = av.g.position.clone(), ry = av.g.rotation.y;
    respawn();
    av.g.position.set(p.x, 0, p.z);
    av.g.rotation.y = ry;
  }

  return {
    respawn, despawn, update, wakeOnBed, blocksPlacement, refreshOutfit,
    getGroup: () => group,
    exists: () => !!av,
    _debug: () => av ? { mode: av.mode, x: +av.g.position.x.toFixed(2), z: +av.g.position.z.toFixed(2), y: +av.g.position.y.toFixed(2), vis: av.g.visible, use: av.use ? (av.use.defId || 'rect') : null, outfit: getOutfit ? getOutfit() : 'default' } : null,
    _forceNext: () => pickNext(), // QA: 행동 추첨 강제
    _walkTo: (x, z) => { if (av) { unseat(); av.g.rotation.x = 0; av.g.position.y = 0; av.mode = 'walk'; av.use = null; setTarget({ x, z }); } }, // QA: 강제 횡단 (라우팅 실증)
  };
}
