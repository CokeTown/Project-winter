/* ============================================================
   avatar.js — Nine Winters 주인공 아바타 (#86 「정착자는 나뿐」의 그 '나')
   ------------------------------------------------------------
   목적: 화면에 늘 비어 있던 '나'를 세운다 — 복셀 생존자 1인. 셸터 실내를 낮은 빈도로
         오가고, 창가에 서고, 불 곁에 앉고, 취침 연출 때 침대에 눕는다.
         게임은 여전히 클릭-방치형: 아바타는 조작 대상이 아니라 "삶의 증거" 연출이다.
   캐논: 사람 형상 금지 캐논의 **유일한 예외**가 이 아바타다(디렉터 오더 #86 — 그 '나').
         저널·탐험 1인칭 문구와 화면이 이제 일치한다. NPC/타 생존자는 계속 금지.
   원칙: cat.js/wildlife.js 선례 — 팩토리+의존성 주입(game→systems 단방향), 외부 에셋 0
         (전부 B() 복셀), 비영속(세이브 스키마 불변), 전 모드 동일(패리티 캐논), 동시 1인.
   행동 모델(1차 배치):
     - idle(선 채 호흡/두리번) ↔ walk(방 안 자유 지점, 가구 blockers 사각 회피 — #95 슬라이드 간이판)
     - window: 창가에 서서 바깥 보기(등을 보이는 실루엣 — 코지 아포칼립스의 핵심 샷)
     - sit: 바닥에 앉기(불/난로 아이템 근처 우선, 없으면 방 중앙 러그권)
     - sleep: game.js 취침 연출과 싱크(침대 위 눕기) — setSleep(bedRect|null)로 주입
   ctx: THREE, B, lamb, disposeDeep, shadowDirty / scene, state, items / getRoom, getBlockers,
        footprintOf(가구 점유 사각), gameHour / opts. 전부 game.js 주입.
   ============================================================ */
export function makeAvatarSystem(ctx) {
  const {
    THREE, B, lamb, disposeDeep, shadowDirty,
    scene, state, items,
    getRoom, getBlockers, footprintOf, gameHour, opts,
  } = ctx;

  const PX = 0.02;                  // cat.js 공유 복셀 단위
  const H = 1.58;                   // 선 자세 높이(m) — 방 h 2.4 대비 생활 스케일
  const s = H / (79 * PX);          // 79복셀 ≈ 1.58m 기준 배율(=1.0, 파생 조정용)
  const group = new THREE.Group();  // 컨테이너 (loadShelter마다 재스폰)
  scene.add(group);
  let av = null;                    // 활성 아바타 { g, parts, legs, arms, mode, ... }
  let sleepRect = null;             // 취침 연출 중이면 {x, z, y, rot} — 침대 표면

  /* ── 복셀 생존자 메시 ──
     실루엣: 두꺼운 방한 코트(밑단 퍼짐)+목도리+비니. 성별 중립. 얼굴은 눈 2점(고양이 문법).
     팔레트: 채도 낮은 올리브/브라운(셸터 무드와 불충돌) + 목도리 머스터드 1점 포인트. */
  const PAL = {
    coat: 0x5a5648, coatHem: 0x4a463a, sleeve: 0x53503f,
    pants: 0x3e3a32, boots: 0x2e2a24, sole: 0x1e1b16,
    skin: 0xd8b090, scarf: 0xb8862e, beanie: 0x4a3f33, eye: 0x1a1410,
  };
  function buildMesh() {
    const g = new THREE.Group();
    const legH = 26 * PX * s, torsoH = 30 * PX * s;
    // 다리(그룹 2 — 보행 스윙): 바지+부츠
    const legs = {};
    for (const [key, lx] of [['l', -3.2], ['r', 3.2]]) {
      const leg = new THREE.Group();
      leg.position.set(lx * PX * s, legH, 0);
      g.add(leg); legs[key] = leg;
      B(leg, 5 * PX * s, legH - 4 * PX * s, 6 * PX * s, PAL.pants, 0, -(legH - 4 * PX * s) / 2, 0);
      B(leg, 5.6 * PX * s, 4 * PX * s, 8.5 * PX * s, PAL.boots, 0, -legH + 2 * PX * s, 1 * PX * s);
      B(leg, 6 * PX * s, 1.2 * PX * s, 9 * PX * s, PAL.sole, 0, -legH + 0.6 * PX * s, 1 * PX * s);
    }
    // 몸통(그룹 — 호흡): 코트 본체 + 퍼진 밑단 + 앞섶 라인
    const body = new THREE.Group();
    body.position.set(0, legH, 0);
    g.add(body);
    B(body, 13 * PX * s, torsoH, 8.5 * PX * s, PAL.coat, 0, torsoH / 2, 0);
    B(body, 15 * PX * s, 7 * PX * s, 10 * PX * s, PAL.coatHem, 0, 3.5 * PX * s, 0); // 밑단 퍼짐
    B(body, 1.2 * PX * s, torsoH - 8 * PX * s, 0.8 * PX * s, PAL.coatHem, 0, torsoH / 2 - 2 * PX * s, 4.4 * PX * s); // 앞섶
    // 팔(그룹 2 — 스윙): 소매 + 손
    const arms = {};
    for (const [key, ax] of [['l', -8.2], ['r', 8.2]]) {
      const arm = new THREE.Group();
      arm.position.set(ax * PX * s, torsoH - 3 * PX * s, 0);
      body.add(arm); arms[key] = arm;
      B(arm, 4.2 * PX * s, 20 * PX * s, 5.5 * PX * s, PAL.sleeve, 0, -10 * PX * s, 0);
      B(arm, 3.4 * PX * s, 3.4 * PX * s, 4 * PX * s, PAL.skin, 0, -21 * PX * s, 0);
    }
    // 목도리(포인트색): 목 감김 + 늘어진 자락
    B(body, 11 * PX * s, 4 * PX * s, 9.5 * PX * s, PAL.scarf, 0, torsoH - 1 * PX * s, 0);
    B(body, 3.6 * PX * s, 9 * PX * s, 1.4 * PX * s, PAL.scarf, 2.4 * PX * s, torsoH - 7 * PX * s, 4.6 * PX * s);
    // 머리(그룹 — 두리번): 얼굴 + 비니(접단) — 뒤통수는 비니가 덮는다
    const head = new THREE.Group();
    head.position.set(0, torsoH + 1.5 * PX * s, 0);
    body.add(head);
    B(head, 9 * PX * s, 9.5 * PX * s, 8.5 * PX * s, PAL.skin, 0, 5 * PX * s, 0);
    B(head, 10 * PX * s, 5 * PX * s, 9.5 * PX * s, PAL.beanie, 0, 9.5 * PX * s, -0.4 * PX * s); // 비니 본체
    B(head, 10.4 * PX * s, 2 * PX * s, 9.9 * PX * s, PAL.beanie, 0, 7.2 * PX * s, -0.4 * PX * s); // 접단
    for (const ex of [-2, 2]) // 눈 (고양이 문법 — 점 2개)
      B(head, 1.1 * PX * s, 1.4 * PX * s, 0.5 * PX * s, PAL.eye, ex * PX * s, 4.6 * PX * s, 4.3 * PX * s);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return { g, parts: { body, head }, legs, arms };
  }

  /* ── 실내 자유 지점: 방 안 + 가구 blockers/footprint 회피 ── */
  function freeSpot() {
    const room = getRoom();
    for (let k = 0; k < 14; k++) {
      const x = (Math.random() * 2 - 1) * (room.w / 2 - 0.55);
      const z = (Math.random() * 2 - 1) * (room.d / 2 - 0.55);
      if (!hitBlock(x, z, 0.3)) return { x, z };
    }
    return { x: 0, z: 0 };
  }
  function hitBlock(x, z, pad) {
    const bl = getBlockers ? getBlockers() : [];
    for (const b of bl) if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return b;
    if (footprintOf) for (const it of items) {
      const fp = footprintOf(it);
      if (fp && Math.abs(x - it.x) < fp.w / 2 + pad && Math.abs(z - it.z) < fp.d / 2 + pad) return { x: it.x, z: it.z, w: fp.w, d: fp.d };
    }
    return null;
  }

  function respawn() {
    despawn();
    const built = buildMesh();
    const spot = freeSpot();
    built.g.position.set(spot.x, 0, spot.z);
    built.g.rotation.y = Math.random() * Math.PI * 2;
    group.add(built.g);
    av = { ...built, mode: 'idle', timer: 2 + Math.random() * 3, tgt: null, gait: 0, phase: Math.random() * 6 };
    shadowDirty();
  }
  function despawn() { if (av) { group.remove(av.g); disposeDeep(av.g); av = null; shadowDirty(); } }

  /* ── 취침 싱크: game.js 취침 연출이 침대 표면 사각을 주입/해제 ── */
  function setSleep(rect) { sleepRect = rect; if (av && !rect && av.mode === 'sleep') pickIdle(); }

  function pickIdle() { if (!av) return; av.mode = 'idle'; av.tgt = null; av.timer = 3 + Math.random() * 5; }
  function pickNext() {
    if (!av) return;
    const r = Math.random();
    if (r < 0.45) { av.mode = 'walk'; av.tgt = freeSpot(); }
    else if (r < 0.65) { av.mode = 'window'; av.timer = 4 + Math.random() * 4; av.tgt = { x: 0, z: -getRoom().d / 2 + 0.6 }; }
    else pickIdle();
  }

  function update(t, dt) {
    if (!av) return;
    const g = av.g;
    // 1인칭 정합: 탐험은 '내'가 나가는 것 — 탐험 중엔 집에 없어야 한다 (귀환 시 다시 나타남)
    const away = !!state.exp;
    if (g.visible === away) { g.visible = !away; shadowDirty(); if (!away) { const sp = freeSpot(); g.position.set(sp.x, 0, sp.z); pickIdle(); } }
    if (away) return;
    // 취침: 침대 표면에 눕기 (연출 최우선)
    if (sleepRect) {
      if (av.mode !== 'sleep') { av.mode = 'sleep'; g.position.set(sleepRect.x, sleepRect.y, sleepRect.z); g.rotation.y = sleepRect.rot || 0; g.rotation.x = -Math.PI / 2 + 0.06; }
      av.parts.body.position.y = 26 * PX * s + Math.sin(t * 1.1) * 0.006; // 잠든 호흡
      return;
    }
    if (av.mode === 'sleep') { g.rotation.x = 0; pickIdle(); }
    // 이동
    if ((av.mode === 'walk' || av.mode === 'window') && av.tgt) {
      const dx = av.tgt.x - g.position.x, dz = av.tgt.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) { if (av.mode === 'walk') pickIdle(); else av.tgt = null; }
      else {
        const step = 0.62 * dt;
        let nx = g.position.x + dx / dist * Math.min(step, dist);
        let nz = g.position.z + dz / dist * Math.min(step, dist);
        const b = hitBlock(nx, nz, 0.26);
        if (b) { // 가구 사각 슬라이드 (#95 간이판: 침투 얕은 축 고정, 깊은 축 전진)
          const px = b.w / 2 + 0.26 - Math.abs(nx - b.x), pz = b.d / 2 + 0.26 - Math.abs(nz - b.z);
          if (px < pz) nx = b.x + Math.sign(nx - b.x || 1) * (b.w / 2 + 0.26);
          else nz = b.z + Math.sign(nz - b.z || 1) * (b.d / 2 + 0.26);
        }
        g.position.x = nx; g.position.z = nz;
        const want = Math.atan2(dx, dz);
        let dr = want - g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
        g.rotation.y += dr * Math.min(1, dt * 6);
        av.gait += dt * 7;
      }
    } else if (av.mode !== 'window') {
      av.timer -= dt;
      if (av.timer <= 0) pickNext();
    } else if (!av.tgt) { // 창가 도착: 바깥(-z) 향해 서기
      let dr = Math.PI - g.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI;
      g.rotation.y += dr * Math.min(1, dt * 4);
      av.timer -= dt;
      if (av.timer <= 0) pickNext();
    }
    // 포즈: 보행 스윙(팔은 다리 반대 위상) / 정지 호흡·두리번
    const moving = (av.mode === 'walk' || (av.mode === 'window' && av.tgt));
    const sw = moving ? Math.sin(av.gait) * 0.5 : 0;
    if (av.legs.l) av.legs.l.rotation.x += (sw - av.legs.l.rotation.x) * Math.min(1, dt * 10);
    if (av.legs.r) av.legs.r.rotation.x += (-sw - av.legs.r.rotation.x) * Math.min(1, dt * 10);
    if (av.arms.l) av.arms.l.rotation.x += (-sw * 0.7 - av.arms.l.rotation.x) * Math.min(1, dt * 10);
    if (av.arms.r) av.arms.r.rotation.x += (sw * 0.7 - av.arms.r.rotation.x) * Math.min(1, dt * 10);
    av.parts.body.scale.y = 1 + (moving ? 0 : Math.sin(t * 1.6 + av.phase) * 0.008); // 호흡
    if (!moving) av.parts.head.rotation.y = Math.sin(t * 0.5 + av.phase) * 0.4;      // 두리번
    else av.parts.head.rotation.y *= 0.9;
  }

  return {
    respawn, despawn, update, setSleep,
    getGroup: () => group,
    exists: () => !!av,
    _debug: () => av ? { mode: av.mode, x: +av.g.position.x.toFixed(2), z: +av.g.position.z.toFixed(2), sleeping: !!sleepRect, vis: av.g.visible } : null,
  };
}
