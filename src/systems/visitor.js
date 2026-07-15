// 방문자 복셀 빌더 — 인엔진 인카운터 연출용.
// 주인공 아바타(avatar.js buildMesh)와 동일 골격·치수를 미러링하되,
//  ① 복장을 팔레트 배열(3~6톤) 패치워크로 짓고(단색 금지 — 디렉터 규칙, 스켈레톤 레퍼런스),
//  ② 얼굴을 완전히 가리며(후드 + 검은 공동, 이목구비 0),
//  ③ 가방/후드/코트 타입으로 방문자를 판별한다.
// "둘러싸였으나 혼자" — 사람은 늘 멀리, 얼굴 없이. 이 복셀들은 화면 가장자리에만 선다.
import * as THREE from 'three';
import { B, shade, seededRand } from '../lib/helpers.js';

// ── 아바타 공유 치수 (avatar.js:29-34 와 동일) ──
const PX = 0.02;
const H = 1.58;
const s = H / (79 * PX);          // ≈ 1.0
const U = PX * s;                  // 복셀 단위 축약
const LEG_H = 26 * PX * s;
const TORSO_H = 30 * PX * s;
const CAVITY = 0x0a0a0c;           // 얼굴 공동(검은 그림자) — 이목구비 대체

// ── 방문자 프리셋 (디렉터 확정 색안 — 다톤 배열) ──
// cloth: 겉옷 주 팔레트(패치로 분산). pants: 하의 2톤. hood.style: angular|round|ragged.
// coat: rag|raincoat|puffer|plain. tatter: 밑단 너덜너덜 여부. bag: school|alice|hiking|duffle|null.
export const VISITOR_PRESETS = {
  wanderer: {   // 떠돌이 — 갈색 해진 후드 + 스쿨백
    seed: 71,
    cloth: [0x6b5a44, 0x5a4b38, 0x766550, 0x4a3d2e, 0x7a6a4e, 0x4f4230],
    pants: [0x413528, 0x342a1f], boots: 0x2e2419, skin: 0x9a7d5c,
    hood: { style: 'angular', tone: 0x5c4d3a }, coat: 'rag', tatter: true,
    bag: { type: 'school', color: 0x7a6a4e },
  },
  trader: {     // 행상 — 잿빛 누더기 + ALICE 초대형
    seed: 88,
    cloth: [0x56504a, 0x47443e, 0x605a52, 0x3e3a35, 0x6b6055, 0x4d4740],
    pants: [0x35322d, 0x2a2824], boots: 0x2c2822, skin: 0x9a7d5c,
    hood: { style: 'angular', tone: 0x4a453f }, coat: 'rag', tatter: true,
    bag: { type: 'alice', color: 0x4d4a35, roll: 0x6b6050 },
  },
  smuggler: {   // 밀수꾼 — 짙은 초록 우의(라운드 후드) + 밀착 등산백
    seed: 39,
    cloth: [0x2f3a2a, 0x26301f, 0x3a4633, 0x1f2818, 0x435038],
    pants: [0x232a1c, 0x1a1f14], boots: 0x181d13, skin: 0x9a7d5c,
    hood: { style: 'round', tone: 0x2f3a2a }, coat: 'raincoat', tatter: false,
    bag: { type: 'hiking', color: 0x24281f },
  },
  thief: {      // 도둑 — 회색 후드 + 더플백 (등 돌린 실루엣용)
    seed: 54,
    cloth: [0x47474b, 0x3d3d42, 0x52525a, 0x33333a, 0x5a5a62],
    pants: [0x2e2e33, 0x24242a], boots: 0x1f1f24, skin: 0x9a7d5c,
    hood: { style: 'angular', tone: 0x3d3d42 }, coat: 'plain', tatter: false,
    bag: { type: 'duffle', color: 0x2b2b2e },
  },
  spoilmerchant: { // 상한물건상 — 행상 누더기 + 초록 가방
    seed: 63,
    cloth: [0x56504a, 0x47443e, 0x605a52, 0x3e3a35, 0x6b6055, 0x4d4740],
    pants: [0x35322d, 0x2a2824], boots: 0x2c2822, skin: 0x9a7d5c,
    hood: { style: 'angular', tone: 0x4a453f }, coat: 'rag', tatter: true,
    bag: { type: 'alice', color: 0x4a5a3a, roll: 0x55663f },
  },
  coldstranger: { // 한파의 낯선이 — 패딩(쓰러진 채) 무언
    seed: 22,
    cloth: [0x3a4250, 0x313a48, 0x4a5464, 0x2c333f, 0x545e70],
    pants: [0x2a303b, 0x222831], boots: 0x1c2028, skin: 0x9a7d5c,
    hood: { style: 'round', tone: 0x3a4250 }, coat: 'puffer', tatter: false,
    bag: null,
  },
  desperateknock: { // 절박한 노크 — 검정 누더기 (문 너머의 목소리)
    seed: 17,
    cloth: [0x201f21, 0x2c2a2a, 0x17161a, 0x302e30, 0x26221f],
    pants: [0x1a1a1c, 0x131315], boots: 0x0f0f11, skin: 0x8a7050,
    hood: { style: 'ragged', tone: 0x201f21 }, coat: 'rag', tatter: true,
    bag: null,
  },
  caravan: {    // 카라반 — 상인 리컬러(흙빛), 먼 지평선 행렬
    seed: 91,
    cloth: [0x6a5842, 0x5a4a38, 0x766248, 0x4a3c2c],
    pants: [0x413528, 0x342a1f], boots: 0x2e2419, skin: 0x9a7d5c,
    hood: { style: 'angular', tone: 0x5a4936 }, coat: 'rag', tatter: true,
    bag: { type: 'alice', color: 0x5c4a38, roll: 0x6a5842 },
  },
  harshbarter: { // 각박한 거래 — 상인 리컬러(냉회청)
    seed: 46,
    cloth: [0x4a5054, 0x3e4448, 0x565e62, 0x343a3d],
    pants: [0x2e3236, 0x24282b], boots: 0x1e2225, skin: 0x9a7d5c,
    hood: { style: 'angular', tone: 0x3e4448 }, coat: 'rag', tatter: true,
    bag: { type: 'alice', color: 0x3e4448, roll: 0x565e62 },
  },
};

export const VISITOR_IDS = Object.keys(VISITOR_PRESETS);

// 인카운터 id → 방문자 프리셋 (걸어와 클릭하는 등장인물만).
// thief(흔적)·caravan(먼 조망)은 걸어오지 않으므로 제외 → 그냥 카드로 폴백.
export const ENCOUNTER_VISITOR = {
  wanderer: 'wanderer', trader: 'trader', smuggler: 'smuggler',
  spoil_merchant: 'spoilmerchant', coldsnap_stranger: 'coldstranger',
  desperate_knock: 'desperateknock', harsh_barter: 'harshbarter',
};

// ── 가방 서브빌더 (실루엣으로 방문자 판별) ──
function buildBag(body, bag) {
  if (!bag) return;
  const g = new THREE.Group();
  body.add(g);
  const c = bag.color, d = shade(c, 0.72), lo = shade(c, 0.6), hi = shade(c, 1.12);
  if (bag.type === 'school') {                 // 작은 학교 가방(등)
    g.position.set(0, 15 * U, -5 * U);
    B(g, 9 * U, 12 * U, 4 * U, c, 0, 0, 0);
    B(g, 9.3 * U, 3.2 * U, 4.3 * U, d, 0, 3 * U, 0);      // 덮개
    B(g, 5 * U, 4.5 * U, 4.4 * U, shade(c, 0.85), 0, -2.5 * U, 0); // 앞주머니
    for (const ex of [-1, 1]) B(g, 1.5 * U, 13 * U, 1 * U, lo, ex * 4 * U, 1 * U, 4.4 * U); // 어깨끈(앞)
  } else if (bag.type === 'alice') {           // 초대형 ALICE(탑처럼 솟음)
    g.position.set(0, 18 * U, -6.5 * U);
    B(g, 12 * U, 30 * U, 8 * U, c, 0, 0, 0);
    for (let q = 0; q < 3; q++) B(g, 12.4 * U, 2 * U, 8.4 * U, d, 0, (-9 + q * 9) * U, 0); // 가로 구획
    B(g, 8 * U, 6 * U, 4 * U, shade(c, 0.9), 0, 5 * U, 4.2 * U);   // 상단 파우치
    B(g, 13 * U, 4.5 * U, 4.5 * U, bag.roll || hi, 0, 16.5 * U, 0); // 침낭 롤(위)
    for (const ex of [-1, 1]) B(g, 2 * U, 16 * U, 1.4 * U, lo, ex * 5 * U, -2 * U, 4.6 * U); // 어깨끈(앞)
  } else if (bag.type === 'hiking') {          // 밀착 등산백
    g.position.set(0, 15 * U, -5 * U);
    B(g, 10 * U, 17 * U, 4 * U, c, 0, 0, 0);
    B(g, 10.2 * U, 2 * U, 4.2 * U, d, 0, 5 * U, 0);
    B(g, 6 * U, 5 * U, 4.4 * U, shade(c, 0.85), 0, -3 * U, 0);
    for (const ex of [-1, 1]) B(g, 1.6 * U, 15 * U, 1.2 * U, lo, ex * 4.2 * U, 1 * U, 4.3 * U);
  } else if (bag.type === 'duffle') {          // 손에 낮게 든 더플
    g.position.set(9.5 * U, 3 * U, 2.5 * U);
    B(g, 16 * U, 8 * U, 7 * U, c, 0, 0, 0);
    B(g, 14 * U, 2 * U, 7.2 * U, d, 0, 3.6 * U, 0);       // 상단 지퍼선
    B(g, 5 * U, 4 * U, 1 * U, hi, 0, 4.5 * U, 3.7 * U);   // 손잡이
  }
}

// ── 후드 (얼굴 완전 차단) ──
function buildHood(head, hood) {
  const tone = hood?.tone ?? 0x4a453f;
  if (hood?.style === 'round') {               // 우의/패딩 라운드 후드
    B(head, 11 * U, 11 * U, 10 * U, tone, 0, 6 * U, -0.5 * U);          // 셸
    B(head, 11.4 * U, 4 * U, 4 * U, tone, 0, 2.5 * U, 4.6 * U);          // 앞 챙(얼굴 그림자)
    B(head, 9.5 * U, 3 * U, 10.2 * U, shade(tone, 1.1), 0, 11 * U, 0);   // 정수리 하이라이트
    for (const ex of [-1, 1]) B(head, 2 * U, 8 * U, 5 * U, tone, ex * 4.6 * U, 5 * U, 3 * U); // 볼(얼굴 옆 차단)
  } else if (hood?.style === 'ragged') {        // 너덜한 후드
    B(head, 10 * U, 9 * U, 9 * U, tone, 0, 6 * U, -0.3 * U);
    for (const ex of [-3, 0, 3]) B(head, 1.8 * U, 3 * U, 1 * U, shade(tone, 0.8), ex * U, 1.4 * U, 4.4 * U); // 앞 술
    for (const ex of [-1, 1]) B(head, 2.2 * U, 7 * U, 6 * U, tone, ex * 3.6 * U, 5 * U, 2.4 * U); // 볼
  } else {                                      // 각진 후드(기본)
    B(head, 10 * U, 5 * U, 9.5 * U, tone, 0, 9.5 * U, -0.4 * U);         // 상단
    B(head, 10.4 * U, 2 * U, 9.9 * U, tone, 0, 7.2 * U, -0.4 * U);
    B(head, 10.2 * U, 7 * U, 4.5 * U, tone, 0, 5 * U, -3.2 * U);         // 뒤통수
    for (const ex of [-1, 1]) B(head, 2.2 * U, 8 * U, 6 * U, tone, ex * 4.4 * U, 5 * U, 2 * U); // 볼
    B(head, 8 * U, 2.5 * U, 2 * U, shade(tone, 0.85), 0, 1.4 * U, 4.2 * U); // 이마 그림자 챙
  }
}

// ── 메인 빌더 ──
// 반환: { g, parts:{body,head}, legs, arms } — 아바타와 동일 형태(걷기 애니메이션 호환).
export function buildVisitor(presetId) {
  const P = VISITOR_PRESETS[presetId];
  if (!P) throw new Error('unknown visitor preset: ' + presetId);
  const rng = seededRand(P.seed);
  const cloth = P.cloth;
  const c0 = cloth[0];
  const g = new THREE.Group();
  const legs = {}, arms = {};

  // 다리 (하의 다톤 + 부츠)
  for (const [key, lx] of [['l', -3.2], ['r', 3.2]]) {
    const leg = new THREE.Group();
    leg.position.set(lx * U, LEG_H, 0);
    g.add(leg); legs[key] = leg;
    B(leg, 5 * U, LEG_H - 4 * U, 6 * U, P.pants[0], 0, -(LEG_H - 4 * U) / 2, 0);
    B(leg, 5.2 * U, 7 * U, 6.2 * U, P.pants[1], 0, -LEG_H * 0.42, 0.2 * U); // 무릎 패치
    B(leg, 5.6 * U, 4 * U, 8.5 * U, P.boots, 0, -LEG_H + 2 * U, 1 * U);
    B(leg, 6 * U, 1.2 * U, 9 * U, shade(P.boots, 0.7), 0, -LEG_H + 0.6 * U, 1 * U);
  }

  // 몸통/코트
  const body = new THREE.Group();
  body.position.set(0, LEG_H, 0);
  g.add(body);
  B(body, 13 * U, TORSO_H, 8.5 * U, c0, 0, TORSO_H / 2, 0);          // 베이스 코트
  // 좌우 명암 기둥 (그림자/볕)
  B(body, 0.9 * U, TORSO_H, 8.5 * U, shade(c0, 0.72), -6.4 * U, TORSO_H / 2, 0);
  B(body, 0.9 * U, TORSO_H, 8.5 * U, shade(c0, 1.12), 6.4 * U, TORSO_H / 2, 0);

  // 코트 타입
  if (P.coat === 'raincoat') {
    B(body, 2 * U, TORSO_H - 4 * U, 0.5 * U, shade(c0, 1.35), -3 * U, TORSO_H / 2, 4.4 * U); // 광택 세로줄
    B(body, 15 * U, 7 * U, 10 * U, cloth[1] || c0, 0, 3.5 * U, 0);   // 깔끔한 밑단
  } else if (P.coat === 'puffer') {
    B(body, 16 * U, TORSO_H + 2 * U, 11 * U, c0, 0, TORSO_H / 2, 0); // 두툼 벌크
    // 격자 누빔: 앞면 가로 시임(깊은 홈) + 세로 배플 + 칸마다 부푼 하이라이트
    const rows = 6, top = TORSO_H / U + 1, bot = 1, seam = shade(c0, 0.6), Fz = 5.4 * U;
    for (let q = 0; q < rows; q++) {
      const yy = (bot + q * (top - bot) / (rows - 1)) * U;
      B(body, 16.4 * U, 0.8 * U, 0.5 * U, seam, 0, yy, Fz);              // 가로 시임
    }
    for (const vx of [-5, 0, 5]) B(body, 0.8 * U, (top - bot) * U, 0.5 * U, seam, vx * U, (top + bot) / 2 * U, Fz); // 세로 배플
    for (let q = 0; q < rows - 1; q++) {                                 // 부푼 칸(교대 톤)
      const yy = (bot + (q + 0.5) * (top - bot) / (rows - 1)) * U;
      const bh = ((top - bot) / (rows - 1)) * 0.62 * U;
      for (const cx of [-7.5, -2.5, 2.5, 7.5]) B(body, 4 * U, bh, 0.4 * U, q % 2 ? shade(c0, 1.1) : shade(c0, 0.9), cx * U, yy, Fz - 0.1 * U);
    }
    B(body, 3 * U, TORSO_H, 11.2 * U, shade(c0, 1.12), 5.3 * U, TORSO_H / 2, 0.1 * U); // 볕 쪽 배플 하이라이트
    B(body, 15 * U, 7 * U, 11 * U, cloth[1] || c0, 0, 3.5 * U, 0);
  } else {
    B(body, 15 * U, 7 * U, 10 * U, cloth[1] || c0, 0, 3.5 * U, 0);   // 일반/누더기 밑단
  }

  // 패치워크 — 앞면 여러 톤 조각. 패딩=찢겨 속 보임, 그 외=그림자/볕 톤 대비.
  const FZ = P.coat === 'puffer' ? 5.45 * U : 4.3 * U;
  {
    const cnt = P.tatter ? 6 : (P.coat === 'puffer' ? 3 : 4);
    for (let i = 0; i < cnt; i++) {
      const px = (rng() * 10 - 5) * U;
      const py = (3 + rng() * (TORSO_H / U - 7)) * U;
      const pw = (2 + rng() * 3) * U, ph = (2 + rng() * 3.2) * U;
      const ti = P.coat === 'puffer' ? shade(c0, 1.18)
        : (px < 0 ? cloth[cloth.length - 1 - (i % 2)] : cloth[1 + (i % 2)]);
      B(body, pw, ph, 0.6 * U, ti, px, py, FZ);
    }
  }

  // 밑단 너덜 — 전원 조금씩(라이트), 누더기는 많이(헤비) + 해진 실밥 (디렉터: 모두 조금씩 누더기)
  {
    const heavy = P.tatter;
    const n = heavy ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const tx = (-6.5 + i * (13 / (n - 1))) * U;
      const th = (heavy ? 2.5 + rng() * 4.5 : 1.0 + rng() * 2.2) * U;
      const tt = cloth[Math.floor(rng() * cloth.length)];
      B(body, 1.3 * U, th, 9.6 * U, tt, tx, 0.5 * U - th / 2, 0);
    }
    const threads = heavy ? 5 : 2;                    // 해진 실밥 몇 가닥(전원)
    for (let i = 0; i < threads; i++) {
      const sx = (rng() < 0.5 ? -1 : 1) * (4 + rng() * 2.5) * U;
      const sy = (5 + rng() * 16) * U;
      B(body, 0.5 * U, (1.4 + rng() * 2.4) * U, 0.5 * U, cloth[Math.floor(rng() * cloth.length)], sx, sy, FZ);
    }
  }

  // 팔 (소매 다톤 + 커프 + 손)
  for (const [key, ax] of [['l', -8.2], ['r', 8.2]]) {
    const arm = new THREE.Group();
    arm.position.set(ax * U, TORSO_H - 3 * U, 0);
    body.add(arm); arms[key] = arm;
    B(arm, 4.2 * U, 20 * U, 5.5 * U, c0, 0, -10 * U, 0);
    B(arm, 4.4 * U, 5 * U, 5.7 * U, ax < 0 ? cloth[cloth.length - 1] : (cloth[2] || cloth[1] || c0), 0, -6 * U, 0.2 * U); // 팔 패치
    B(arm, 4.4 * U, 2.5 * U, 5.7 * U, shade(c0, 0.7), 0, -19.5 * U, 0); // 커프
    B(arm, 3.4 * U, 3.4 * U, 4 * U, P.skin, 0, -21 * U, 0);            // 손(유일한 맨살)
  }

  // 머리 = 검은 공동 + 후드 (얼굴 0)
  const head = new THREE.Group();
  head.position.set(0, TORSO_H + 1.5 * U, 0);
  body.add(head);
  B(head, 9 * U, 9.5 * U, 8.5 * U, CAVITY, 0, 5 * U, 0);
  buildHood(head, P.hood);

  // 가방
  buildBag(body, P.bag);

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { g, parts: { body, head }, legs, arms };
}
