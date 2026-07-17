// render/culling.js — Tier4 렌더 추출 Phase1-②: 벽/천장 투시 컬링 + opacity 페이드.
//   카메라를 마주보지 않는 벽/천장 면을 페이드로 숨겨 실내를 보이게 한다(⑥-a, 전 셸터 공통·방치형 성능 캐논).
//   THREE는 직접 import. game.js 클로저(camera/camCenter/camPanApplied/opts/shadowDirty/SHELTERS/state)와
//   가변 배열(wallList/ceilCullList = makeWalls·loadShelter가 재할당 → getter), titleVisible(게터)만 ctx 주입.
//   외부 진입점은 updateWallCulling(renderFrame·loadShelter). 게이트: 이관 후 골든 diff 0(컬 상태가 캡처에 반영).
import * as THREE from 'three';

export function makeCulling(ctx) {
  const {
    opts, shadowDirty, camera, camCenter, camPanApplied,
    getWallList, getCeilCullList, getTitleVisible, SHELTERS, state,
  } = ctx;

  const CULL_FADE_MS = 175;                 // 페이드 지속(150~200ms 범위)
  const CULL_FADE_RATE = 1000 / CULL_FADE_MS; // opacity/초 변화율
  // 페이드 상태를 각 컬링 그룹(벽/천장)에 lazy 부착: group.userData.cull = { fade, target, mats }
  //   fade: 현재 표시도(1=완전 보임, 0=숨김) / target: 목표(1 보임, 0 숨김)
  //   mats: 이 그룹이 소유한 페이드 대상 재질 배열 (공유 재질을 그룹 단위로 클론해 독립 페이드).
  //   페이드 아웃 완료 시 visible=false + transparent 복귀(상시 draw call·렌더순서 아티팩트 방지, 방치형 성능 캐논).
  function cullFadeState(group) {
    let cs = group.userData.cull;
    if (cs) return cs;
    // 그룹 소유 재질 수집 — 공유(다중 벽 공용) 재질을 그룹별로 클론해 독립적으로 페이드.
    //   클론은 userData(isWallMat/baseMap/deco 태그·wetDry 등)를 그대로 물려받아 applyDeco/applyWetness가
    //   클론에도 벽지·젖음을 바른다(traverse 대상이 클론이므로 자동). perGroupClone 태그로 disposeDeep이 해제.
    const mats = [];
    group.traverse(o => {
      if (!o.isMesh) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i];
        if (!m || m.userData.cullFadeSkip) continue;
        if (!m.userData.perGroupClone) {
          const cl = m.clone();
          cl.userData = Object.assign({}, m.userData); // 태그 승계 (isWallMat/baseMap/shared 등)
          cl.userData.shared = false;                  // 이 그룹 전용 (셸터 리로드 시 해제 대상)
          cl.userData.perGroupClone = true;            // disposeDeep이 map 있어도 해제하도록 표식
          cl.userData.opaqueOpacity = m.opacity;       // 원래 불투명 opacity 보존(반투명 유리 등)
          if (Array.isArray(o.material)) o.material[i] = cl; else o.material = cl;
          mats.push(cl);
        } else if (!mats.includes(m)) {
          if (m.userData.opaqueOpacity == null) m.userData.opaqueOpacity = m.opacity;
          mats.push(m);
        }
      }
    });
    cs = { fade: group.visible ? 1 : 0, target: group.visible ? 1 : 0, mats };
    group.userData.cull = cs;
    return cs;
  }
  // 컬링 그룹 표시/숨김을 페이드 목표로 전달. reduce-motion 이면 즉시 전환(기존 하드컷 유지).
  function setCullTarget(group, show, instant) {
    if (opts.reduceMotion || instant) {
      if (group.visible !== show) { group.visible = show; shadowDirty(); }
      const cs = group.userData.cull;
      if (cs) { cs.fade = show ? 1 : 0; cs.target = cs.fade; applyCullFade(cs, group); }
      return;
    }
    const cs = cullFadeState(group);
    const tgt = show ? 1 : 0;
    if (cs.target === tgt) return;
    cs.target = tgt;
    if (show && !group.visible) { group.visible = true; shadowDirty(); } // 페이드 인은 즉시 보이게 하고 opacity로 등장
  }
  // 페이드 재질 상태 반영: 페이드 중이면 transparent+opacity, 완료면 원상 복귀.
  function applyCullFade(cs, group) {
    const mid = cs.fade > 0.001 && cs.fade < 0.999;
    for (const m of cs.mats) {
      if (mid) {
        m.transparent = true;
        m.opacity = (m.userData.opaqueOpacity ?? 1) * cs.fade;
        m.depthWrite = false; // 페이드 중 반투명 정렬 아티팩트 완화
        m.needsUpdate = true;
      } else {
        // 완료 상태: 불투명 복귀 (원래 반투명 유리는 opaqueOpacity로 되돌림)
        const base = m.userData.opaqueOpacity ?? 1;
        const wasTransparent = base < 1;
        if (m.transparent !== wasTransparent || m.opacity !== base) {
          m.transparent = wasTransparent;
          m.opacity = base;
          m.depthWrite = true;
          m.needsUpdate = true;
        }
      }
    }
  }
  // 매 프레임 페이드 진행 (dt 초). 완료(fade==target) 시 visible 확정.
  function tickCullFade(cs, group, dt) {
    if (cs.fade === cs.target) return;
    const step = dt * CULL_FADE_RATE;
    if (cs.fade < cs.target) cs.fade = Math.min(cs.target, cs.fade + step);
    else cs.fade = Math.max(cs.target, cs.fade - step);
    applyCullFade(cs, group);
    if (cs.fade === 0 && !cs.target) { group.visible = false; shadowDirty(); } // 아웃 완료 → 실제 숨김
  }
  let lastWallMask = -1;
  // #201 라이브 카드 스냅샷: 풀셸 강제 — 벽/천장 컬링을 전부 '보임'으로 (타이틀 closedHome과 동일 외경).
  //   스냅샷 프레임 한정으로 켜고 즉시 끈다(instant 경유라 페이드 무접점).
  let forceClosed = false;
  function setForceClosed(v) { forceClosed = !!v; }
  // instant=true(셸터 로드 직후): 페이드 없이 즉시 확정 — 입장 시 벽이 서서히 나타나는 어색함 방지.
  function updateWallCulling(dt = 0, instant = false) {
    const wallList = getWallList();
    if (!wallList.length) return;
    // 타이틀 배경은 '닫힌 집' 외경으로 보여준다 — 인게임용 투시 컬링이 타이틀에서도 벽을 열면
    // 컨테이너가 바닥+뒷벽만 남은 T자 골조로 보임(실기기 신고 재발분). 게임 진입(hideTitle) 시
    // 기존 페이드로 근벽이 스르륵 열리며 실내 진입. 지하(subway)는 보여줄 외경이 없어 제외.
    const closedHome = forceClosed || (getTitleVisible() && !SHELTERS[state.current]?.indoor);
    // #70: 팬은 렌더 전용 오프셋 — camera.position에 더해진 팬을 되돌려 '방 중심 기준' 방향으로 판정한다.
    //   (팬해도 컬링 마스크 불변: 마당을 보려고 팬했는데 벽이 열리거나 닫히면 안 됨 — 의도된 동작)
    const dir = new THREE.Vector3(camera.position.x - camPanApplied.x - camCenter.x,
      camera.position.y - camCenter.y, camera.position.z - camPanApplied.z - camCenter.z).normalize();
    let mask = 0;
    wallList.forEach((w, i) => {
      const show = closedHome || w.normal.dot(dir) < 0.25;
      setCullTarget(w.group, show, instant);
      if (w.proxy) w.proxy.visible = !show; // #97: 숨은 벽의 광차단 대행 (마스크 변경이 shadowDirty를 이미 트리거)
      // 마스크는 "표시 목표" 기준(그림자 갱신 트리거) — 페이드 완료 대기 없이 그림자가 따라오게.
      if (show) mask |= 1 << i;
    });
    if (mask !== lastWallMask) { lastWallMask = mask; shadowDirty(); }
    updateCeilCulling(instant, closedHome);
    // 진행 중인 페이드 전진
    if (dt > 0 && !opts.reduceMotion) {
      for (const w of wallList) { const cs = w.group.userData.cull; if (cs) tickCullFade(cs, w.group, dt); }
      for (const rf of getCeilCullList()) { const cs = rf.group.userData.cull; if (cs) tickCullFade(cs, rf.group, dt); }
    }
  }
  // ⑥-a (전 셸터 공통): 천장/지붕 투시 컬링.
  //   벽 컬링과 동일 사상 — 카메라를 '마주보지 않는' 면은 감춘다. 천장은 위를 향하므로 카메라가 천장보다
  //   위(부감/사선)에 있을 때 숨겨 실내를 보이게 한다. 수평 앵글(카메라가 천장 높이 아래)에서는 천장이 보여
  //   아늑함이 유지된다. 임계각은 렌더 상수(아래 CEIL_CULL_MARGIN)로 실측 튜닝 — BAL이 아니라 순수 렌더 값.
  const CEIL_CULL_MARGIN = 0.3; // 카메라 y가 (천장y + 이 여유)보다 높으면 부감으로 보고 천장을 숨긴다.
  function updateCeilCulling(instant = false, closedHome = false) {
    for (const rf of getCeilCullList()) {
      const above = !closedHome && camera.position.y > rf.y + CEIL_CULL_MARGIN;
      setCullTarget(rf.group, !above, instant); // above(부감)=숨김 목표 → show=false
    }
  }

  // 셸터 로드 시 마스크 캐시 무효화 — 새 셸터 마스크가 우연히 이전과 같아도 shadowDirty가 확실히 돌게.
  return { updateWallCulling, updateCeilCulling, setCullTarget, cullFadeState, tickCullFade, applyCullFade, setForceClosed, resetWallMask: () => { lastWallMask = -1; } };
}
