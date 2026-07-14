// render/camera.js — Tier4 렌더 추출 Phase1-③: 카메라 업데이트 + 클램프 팬 + 줌 핏.
//   카메라 객체(camera/camState/camCenter/camPanApplied)는 game.js에 잔류(입력 핸들러·__shelter·컬링 등
//   전역 참조) — culling과 동일 사상으로 '함수만' 이동하고 그 객체들을 안정 참조로 주입.
//   catCam(클로즈업 상태)·getCat도 주입. ROOM/SHELTERS는 늦은 정의라 게터. _panLook는 모듈 지역.
//   외부 진입점: updateCamera(renderFrame·loadShelter) / setPanTarget·panByScreenDelta(입력) / fitZoomForShelter(loadShelter).
//   게이트: 골든이 yaw/pitch/zoom 세팅 후 캡처 → 카메라 회귀 커버.
import * as THREE from 'three';

export function makeCamera(ctx) {
  const { camera, camState, camCenter, camPanApplied, BAL, opts, getCat, catCam, visitorCam, state, getROOM, getSHELTERS } = ctx;
  const _panLook = new THREE.Vector3();

  // 팬 클램프 반경: 방 크기 비례(마당·원경 부착물이 살짝 보이는 정도) — 벡터 길이 원형 클램프.
  function panMax() { return Math.max(getROOM().w, getROOM().d) * 0.55; }
  function setPanTarget(x, z) {
    const m = panMax(), len = Math.hypot(x, z);
    if (len > m) { x = x * m / len; z = z * m / len; }
    camState.targetPanX = x; camState.targetPanZ = z;
  }
  // #70 화면 픽셀 드래그 → 월드 XZ 팬 (grab-the-world: 잡은 지점이 포인터를 따라온다).
  //   직교 투영에서 세로 h=9/zoom 이 innerHeight px에 대응 → 픽셀당 월드 길이(wpp).
  //   세로 드래그는 앙각(elev)의 바닥 평면 투영 보정(fs) — 낮은 앵글일수록 같은 픽셀이 더 먼 바닥 거리.
  function panByScreenDelta(dx, dy) {
    const wpp = (9 / camState.zoom) / innerHeight;
    const fs = 1 / Math.max(0.35, Math.sin(camState.elev));
    const yaw = camState.yaw;
    const rx = Math.sin(yaw), rz = -Math.cos(yaw);   // 화면 오른쪽의 월드 XZ 방향
    const fx = -Math.cos(yaw), fz = -Math.sin(yaw);  // 화면 위쪽의 월드 XZ 방향(카메라 → 방 중심)
    setPanTarget(
      camState.targetPanX - dx * wpp * rx + dy * wpp * fs * fx,
      camState.targetPanZ - dx * wpp * rz + dy * wpp * fs * fz
    );
  }
  function updateCamera() {
    const C = BAL.catCam;
    let center = camCenter, dist = camState.dist, elev = camState.elev;
    const _cat = getCat();
    if (catCam.active && _cat) {
      // 고양이 눈높이 살짝 위를 지연 추적(급회전 금지) — center를 catObj로 lerp
      const p = _cat.g.position;
      catCam.center.x += (p.x - catCam.center.x) * C.glideLerp;
      catCam.center.y += ((p.y + C.heightAbove) - catCam.center.y) * C.glideLerp;
      catCam.center.z += (p.z - catCam.center.z) * C.glideLerp;
      center = catCam.center;
      // ⑶ 진입 시 확정한 목표 yaw(짧은 호 ≤45° 클램프)로만 회전한다 — 매 프레임 고양이 facing으로
      //   스냅하지 않아 진입 회전이 과하지 않다. 줌·센터링(center lerp)이 얼굴 클로즈업을 완성한다.
      camState.targetYaw = catCam.targetYaw;
      // 거리/줌/앙각을 클로즈업 프로필로 보간(글라이드 ~1초)
      dist = camState.dist + (C.dist - camState.dist) * C.glideLerp; camState.dist = dist;
      elev = camState.elev + (THREE.MathUtils.degToRad(C.elevDeg) - camState.elev) * C.glideLerp; camState.elev = elev;
      camState.zoom += (C.zoom - camState.zoom) * C.glideLerp;
    } else if (visitorCam && visitorCam.active) {
      // #181 방문자 클로즈업: yaw 고정, center를 방문자(복귀 중엔 집)로 글라이드 + 줌만 보간.
      const L = BAL.visitorCam.glideLerp;
      const tgt = visitorCam.returning ? camCenter : visitorCam.center;
      visitorCam.cur.x += (tgt.x - visitorCam.cur.x) * L;
      visitorCam.cur.y += (tgt.y - visitorCam.cur.y) * L;
      visitorCam.cur.z += (tgt.z - visitorCam.cur.z) * L;
      center = visitorCam.cur;
      camState.zoom += (visitorCam.zoomTarget - camState.zoom) * L;
      if (visitorCam.returning && Math.abs(camState.zoom - visitorCam.zoomTarget) < 0.02 && visitorCam.cur.distanceTo(camCenter) < 0.06) {
        visitorCam.active = false; visitorCam.returning = false; visitorCam.saved = null; // 복귀 완료 → 일반 카메라
      }
    } else if (camState.dist !== 24) {
      // 복원: 클로즈업에서 빠져나오면 기본 거리/앙각으로 서서히 되돌린다
      camState.dist += (24 - camState.dist) * 0.16; dist = camState.dist;
      if (Math.abs(dist - 24) < 0.05) camState.dist = 24;
    }
    camState.yaw += (camState.targetYaw - camState.yaw) * (catCam.active ? BAL.catCam.glideLerp : 0.15);
    // #70 팬 보간: targetPan → pan (yaw 보간 문법). reduceMotion이면 즉시. 클로즈업 중엔 팬 미적용(스펙: 비활성).
    if (opts.reduceMotion) { camState.panX = camState.targetPanX; camState.panZ = camState.targetPanZ; }
    else {
      camState.panX += (camState.targetPanX - camState.panX) * 0.15;
      camState.panZ += (camState.targetPanZ - camState.panZ) * 0.15;
    }
    camPanApplied.x = (catCam.active || (visitorCam && visitorCam.active)) ? 0 : camState.panX;
    camPanApplied.z = (catCam.active || (visitorCam && visitorCam.active)) ? 0 : camState.panZ;
    const yaw = camState.yaw;
    // 카메라 타겟 = camCenter + (panX, 0, panZ) — camCenter 자체는 불변(컬링 기준점 유지, 의도된 동작).
    camera.position.set(
      center.x + camPanApplied.x + dist * Math.cos(elev) * Math.cos(yaw),
      center.y + dist * Math.sin(elev),
      center.z + camPanApplied.z + dist * Math.cos(elev) * Math.sin(yaw)
    );
    _panLook.set(center.x + camPanApplied.x, center.y, center.z + camPanApplied.z);
    camera.lookAt(_panLook);
    const aspect = innerWidth / innerHeight;
    const h = 9 / camState.zoom;
    camera.left = -h * aspect / 2; camera.right = h * aspect / 2;
    camera.top = h / 2; camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
  }
  function fitZoomForShelter() {
    const aspect = innerWidth / innerHeight;
    const base = getSHELTERS()[state.current].viewH;
    const needH = Math.max(base, (base + 3) / Math.max(aspect, 0.4));
    camState.zoom = THREE.MathUtils.clamp(9 / needH, 0.2, 1);
  }

  return { updateCamera, fitZoomForShelter, panMax, setPanTarget, panByScreenDelta };
}
