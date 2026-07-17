import * as THREE from 'three';
import { lamb, B, Cyl, shade, seededRand } from '../lib/helpers.js';

/* ============================================================
   가구 정의 (12종 × 색상 4종)
============================================================ */
const WOODS = { names: ['오크', '월넛', '화이트워시', '블랙우드'], namesEn: ['Oak', 'Walnut', 'Whitewash', 'Blackwood'], colors: [0xa07850, 0x64452e, 0xcfc8ba, 0x3c3a38] };

const DEFS = {
  bed: {
    name: '침대', nameEn: 'Bed', emoji: '🛏️', fp: { w: 1.8, d: 2.3 },
    colorNames: ['와인레드', '포레스트', '네이비', '크림'],
    colorNamesEn: ['Wine Red', 'Forest', 'Navy', 'Cream'],
    colors: [0xa84a4a, 0x5a7d5a, 0x46557a, 0xd6c9ab],
    tiered: true, // #157 가구 티어: T1 바닥 매트리스 → T2 낡은 싱글 → T3 현행 2인 (디렉터 예시 그대로)
    build(c, ci, sk, tier) {
      const g = new THREE.Group();
      if (tier === 1) {
        // T1 크루드: 바닥 직치 1인 매트리스 — 꺼짐·얼룩·눌린 베개. 프레임 없음.
        const mat = 0xb0a894;
        B(g, 1.05, 0.16, 2.0, mat, 0, 0.08, 0);                       // 꺼진 매트리스
        B(g, 1.05, 0.05, 2.0, shade(mat, 0.72), 0, 0.025, 0);         // 밑단 때 탄 띠
        B(g, 0.46, 0.022, 0.6, shade(mat, 0.62), -0.18, 0.172, 0.42); // 얼룩 ①
        B(g, 0.34, 0.022, 0.42, shade(mat, 0.7), 0.26, 0.172, -0.32); // 얼룩 ②
        B(g, 0.5, 0.09, 0.32, 0xcfc8b6, 0, 0.2, -0.76);               // 눌린 베개
        B(g, 0.9, 0.06, 0.85, shade(c, 0.6), 0, 0.19, 0.45);          // 구겨 덮은 담요(색 바램)
        return g;
      }
      if (tier === 2) {
        // T2 낡음: 프레임 헌 싱글 — 옹이색 원목, 다리 하나 어긋, 이불 빛바램.
        const old = 0x5e462f;
        B(g, 1.05, 0.2, 2.1, old, 0, 0.2, 0);                         // 좁은 프레임
        B(g, 1.05, 0.55, 0.1, shade(old, 0.9), 0, 0.42, -1.0);        // 낮은 헤드보드
        B(g, 0.09, 0.26, 0.09, shade(old, 0.8), -0.46, 0.12, 0.98);
        B(g, 0.09, 0.26, 0.09, shade(old, 0.8), 0.46, 0.12, 0.98);
        B(g, 0.09, 0.26, 0.09, shade(old, 0.8), -0.46, 0.12, -0.98);
        B(g, 0.09, 0.22, 0.09, shade(old, 0.65), 0.44, 0.1, -0.96);   // 어긋난 다리(짧고 어두움)
        B(g, 0.97, 0.15, 1.95, 0xcfc6b2, 0, 0.38, 0);                 // 때 탄 매트리스
        B(g, 0.99, 0.16, 1.0, shade(c, 0.78), 0, 0.4, 0.35);          // 빛바랜 이불
        B(g, 0.5, 0.11, 0.3, 0xe0dac9, 0, 0.5, -0.68);                // 베개 1개
        return g;
      }
      const wood = 0x77543a;
      B(g, 1.7, 0.28, 2.2, wood, 0, 0.24, 0);
      B(g, 1.7, 0.9, 0.12, wood, 0, 0.55, -1.04);
      B(g, 0.1, 0.35, 0.1, wood, -0.78, 0.17, 1.02); B(g, 0.1, 0.35, 0.1, wood, 0.78, 0.17, 1.02);
      B(g, 0.1, 0.35, 0.1, wood, -0.78, 0.17, -1.02); B(g, 0.1, 0.35, 0.1, wood, 0.78, 0.17, -1.02);
      B(g, 1.58, 0.22, 2.05, 0xe3ddcf, 0, 0.49, 0);
      B(g, 1.62, 0.24, 1.45, c, 0, 0.52, 0.33);
      B(g, 1.62, 0.08, 0.3, shade(c, 1.25), 0, 0.62, 0.37);
      B(g, 0.62, 0.16, 0.4, 0xf0ece0, -0.35, 0.66, -0.72);
      B(g, 0.62, 0.16, 0.4, 0xf0ece0, 0.38, 0.66, -0.72);
      return g;
    }
  },
  sofa: {
    name: '소파', nameEn: 'Sofa', emoji: '🛋️', fp: { w: 2.0, d: 0.95 },
    colorNames: ['베이지', '그레이', '올리브', '테라코타'],
    colorNamesEn: ['Beige', 'Gray', 'Olive', 'Terracotta'],
    colors: [0xc4b295, 0x84878e, 0x7d7f5a, 0xb0644d],
    tiered: true, // #157: T1 찢어진 시트+은색 테이프 → T2 꺼진 쿠션·빛바랜 천 → T3 현행. 착석면 높이 동일.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const tape = 0xb4b6ba, pallet = 0x8a7550;
        B(g, 1.9, 0.17, 0.85, pallet, 0, 0.085, 0);                          // #209: 받침 밑면 0.03 부유 — 좌면(TIER_TOP_Y 0.46) 유지 위해 받침 상단(0.17) 고정하고 밑으로만 늘려 접지(h 0.14→0.17·중심 0.1→0.085)
        for (const z of [-0.36, 0, 0.36]) B(g, 1.86, 0.05, 0.16, shade(pallet, 0.85), 0, 0.19, z);
        B(g, 0.9, 0.3, 0.75, shade(c, 0.6), -0.45, 0.4, 0);                  // 찢어진 시트 쿠션 ①(꺼짐)
        const cu2 = B(g, 0.9, 0.26, 0.75, shade(c, 0.55), 0.46, 0.38, 0.02); // 쿠션 ②(더 꺼짐·어긋남)
        cu2.rotation.y = 0.05;
        B(g, 0.06, 0.32, 0.77, tape, -0.2, 0.4, 0);                          // 은색 테이프 줄
        B(g, 0.06, 0.28, 0.77, tape, 0.62, 0.38, 0.02);
        B(g, 0.3, 0.02, 0.24, 0x8a8474, -0.55, 0.56, 0.12);                  // 터진 솜 비침
        const bl = B(g, 1.7, 0.4, 0.1, shade(c, 0.68), 0, 0.6, -0.36);       // 등받이=걸쳐둔 담요
        bl.rotation.x = -0.14;
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        B(g, 1.9, 0.35, 0.85, shade(c, 0.7), 0, 0.3, 0);                     // 빛바랜 몸체
        B(g, 1.9, 0.62, 0.2, shade(c, 0.72), 0, 0.72, -0.32);
        B(g, 0.18, 0.55, 0.85, shade(c, 0.72), -0.86, 0.55, 0);
        B(g, 0.18, 0.55, 0.85, shade(c, 0.72), 0.86, 0.55, 0);
        B(g, 0.75, 0.1, 0.6, shade(c, 0.8), -0.39, 0.52, 0.05);              // 꺼진 쿠션(얇음)
        const cu = B(g, 0.75, 0.12, 0.6, shade(c, 0.78), 0.39, 0.53, 0.05);  // 한쪽만 덜 꺼짐·기움
        cu.rotation.z = 0.04;
        B(g, 0.2, 0.02, 0.16, shade(c, 1.25), -0.5, 0.575, 0.15);            // 기운 헝겊 패치
        B(g, 0.1, 0.14, 0.1, 0x4a3826, -0.8, 0.07, 0.32); B(g, 0.1, 0.14, 0.1, 0x4a3826, 0.8, 0.07, 0.32);
        B(g, 0.1, 0.14, 0.1, 0x4a3826, -0.8, 0.07, -0.32); B(g, 0.1, 0.14, 0.1, 0x4a3826, 0.8, 0.07, -0.32);
        return g;
      }
      const g = new THREE.Group();
      B(g, 1.9, 0.35, 0.85, shade(c, 0.85), 0, 0.3, 0);
      B(g, 1.9, 0.62, 0.2, shade(c, 0.9), 0, 0.72, -0.32);
      B(g, 0.18, 0.55, 0.85, shade(c, 0.9), -0.86, 0.55, 0);
      B(g, 0.18, 0.55, 0.85, shade(c, 0.9), 0.86, 0.55, 0);
      B(g, 0.75, 0.16, 0.6, c, -0.39, 0.55, 0.05);
      B(g, 0.75, 0.16, 0.6, c, 0.39, 0.55, 0.05);
      B(g, 0.1, 0.14, 0.1, 0x4a3826, -0.8, 0.07, 0.32); B(g, 0.1, 0.14, 0.1, 0x4a3826, 0.8, 0.07, 0.32);
      B(g, 0.1, 0.14, 0.1, 0x4a3826, -0.8, 0.07, -0.32); B(g, 0.1, 0.14, 0.1, 0x4a3826, 0.8, 0.07, -0.32);
      return g;
    }
  },
  chair: {
    name: '의자', nameEn: 'Chair', emoji: '🪑', fp: { w: 0.6, d: 0.6 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    tiered: true, // #157: T1 뒤집은 우유짝(등받이 없음) → T2 삐걱 나무 의자 → T3 현행. 착석면 높이 동일.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const crate = 0x8a7550;
        B(g, 0.48, 0.06, 0.48, crate, 0, 0.43, 0);                           // 윗면(앉는 데) — 좌면(TIER_TOP_Y 0.415)이라 고정
        // #209: 널 밑면이 0.05 부유 — 좌면을 못 내리니(퍼치·착석 앵커) 널만 아래로 늘려 T3와 같은 -0.005 접지(상단 0.39 유지, h 0.34→0.395·중심 0.22→0.1925).
        for (const s of [-0.21, 0, 0.21]) B(g, 0.48, 0.395, 0.05, shade(crate, 0.85), 0, 0.1925, s); // 세로 널
        B(g, 0.05, 0.395, 0.48, shade(crate, 0.8), -0.21, 0.1925, 0); B(g, 0.05, 0.395, 0.48, shade(crate, 0.82), 0.21, 0.1925, 0);
        B(g, 0.2, 0.012, 0.2, shade(crate, 0.6), 0.08, 0.462, 0.05);         // 얼룩
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        B(g, 0.5, 0.07, 0.5, shade(c, 0.8), 0, 0.46, 0);
        const back = B(g, 0.5, 0.55, 0.07, shade(c, 0.78), 0, 0.82, -0.22);
        back.rotation.x = -0.06;                                             // 등받이 살짝 뒤로 밀림
        B(g, 0.03, 0.4, 0.015, shade(c, 0.5), 0.1, 0.85, -0.185);            // 등받이 갈라짐 선
        const legs = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]];
        legs.forEach(([x, z], i) => B(g, 0.07, 0.45, 0.07, i === 1 ? 0x9a8a6a : shade(c, 0.7), x, 0.22, z)); // 다리 하나 교체목
        return g;
      }
      const g = new THREE.Group();
      B(g, 0.5, 0.07, 0.5, c, 0, 0.46, 0);
      B(g, 0.5, 0.55, 0.07, c, 0, 0.82, -0.22);
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]])
        B(g, 0.07, 0.45, 0.07, shade(c, 0.85), x, 0.22, z);
      return g;
    }
  },
  table: {
    name: '테이블', nameEn: 'Table', emoji: '🪵', fp: { w: 1.5, d: 0.9 },
    surface: { y: 0.77, w: 1.3, d: 0.72 }, // 상판 위에 소품을 올릴 수 있음
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    tiered: true, // #157: T1 벽돌+합판 → T2 긁힌 원목(다리 하나 딴색) → T3 현행. 상판 높이 동일(스태킹 정합).
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const brick = 0x8a5138, ply = 0xa8895e;
        for (const z of [-0.28, 0.28]) {                                     // 벽돌 기둥 2개
          B(g, 0.34, 0.24, 0.24, brick, -0.5, 0.12, z); B(g, 0.34, 0.24, 0.24, shade(brick, 0.85), -0.5, 0.36, z);
          B(g, 0.34, 0.24, 0.24, shade(brick, 0.9), 0.5, 0.12, z); B(g, 0.34, 0.24, 0.24, brick, 0.5, 0.36, z);
        }
        B(g, 0.34, 0.2, 0.72, shade(brick, 0.8), -0.5, 0.58, 0); B(g, 0.34, 0.2, 0.72, shade(brick, 0.82), 0.5, 0.58, 0);
        const top = B(g, 1.4, 0.05, 0.8, ply, 0, 0.74, 0);                   // 합판 한 장(얇음)
        top.rotation.y = 0.02;                                               // 삐뚤게 얹힘
        B(g, 0.4, 0.012, 0.3, shade(ply, 0.7), 0.3, 0.77, 0.15);             // 얼룩
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        B(g, 1.4, 0.09, 0.8, shade(c, 0.82), 0, 0.72, 0);                    // 상판(바랜 톤)
        B(g, 0.7, 0.015, 0.05, shade(c, 0.55), -0.1, 0.77, 0.1);             // 긴 긁힘
        B(g, 0.25, 0.015, 0.2, shade(c, 0.68), 0.4, 0.77, -0.2);             // 컵자국 얼룩
        const legs = [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]];
        legs.forEach(([x, z], i) => B(g, 0.09, 0.7, 0.09, i === 2 ? 0x9a8a6a : shade(c, 0.75), x, 0.35, z)); // 다리 하나 딴색(교체목)
        return g;
      }
      const g = new THREE.Group();
      B(g, 1.4, 0.09, 0.8, c, 0, 0.72, 0);
      for (const [x, z] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]])
        B(g, 0.09, 0.7, 0.09, shade(c, 0.85), x, 0.35, z);
      return g;
    }
  },
  dresser: {
    name: '서랍장', nameEn: 'Dresser', emoji: '🗄️', fp: { w: 1.2, d: 0.55 },
    surface: { y: 1.13, w: 1.05, d: 0.42 },
    surfaceYByTier: { 1: 1.10 }, // #196: T1 종이상자 top=0.92+0.18(뚜껑 날개는 가장자리 소품) — 1.13 고정이면 스택 소품 0.03 부양. T2/T3=1.13 실측 일치
    colorNames: ['내추럴', '다크브라운', '화이트', '그레이'],
    colorNamesEn: ['Natural', 'Dark Brown', 'White', 'Gray'],
    colors: [0xa9825c, 0x5f452f, 0xd4cfc2, 0x7c7f86],
    tiered: true, // #157: T1 종이상자 3단 → T2 문짝 하나 빠진 서랍장 → T3 현행. 상판 높이 동일(스태킹 정합).
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const card = 0xa8895e, tape = 0xb4b6ba;
        B(g, 1.05, 0.38, 0.45, card, 0, 0.19, 0);                            // 상자 ①(아래)
        const b2 = B(g, 0.98, 0.36, 0.42, shade(card, 0.9), 0.02, 0.56, 0);  // 상자 ②
        b2.rotation.y = -0.05;
        const b3 = B(g, 1.0, 0.36, 0.43, shade(card, 0.82), -0.02, 0.92, 0.01); // 상자 ③(위)
        b3.rotation.y = 0.04;
        B(g, 0.4, 0.02, 0.44, shade(card, 0.7), -0.28, 1.105, 0.02);         // 열린 뚜껑 날개
        B(g, 0.4, 0.02, 0.44, shade(card, 0.75), 0.3, 1.11, -0.01);
        B(g, 1.02, 0.05, 0.02, tape, 0, 0.56, 0.215);                        // 테이프 줄
        B(g, 0.05, 0.38, 0.02, tape, 0.1, 0.19, 0.226);
        B(g, 0.22, 0.1, 0.01, shade(card, 0.55), -0.25, 0.6, 0.218);         // 매직 글씨 자국
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        B(g, 1.1, 1.0, 0.45, shade(c, 0.78), 0, 0.58, 0);
        B(g, 1.16, 0.06, 0.5, shade(c, 0.9), 0, 1.1, 0);
        for (let i = 0; i < 3; i++) {
          if (i === 1) {                                                     // 가운데 문짝 빠짐 — 뚫린 칸
            B(g, 0.95, 0.22, 0.04, 0x1c1e24, 0, 0.32 + i * 0.28, 0.225);
            B(g, 0.5, 0.1, 0.03, 0x8a8474, -0.1, 0.28 + i * 0.28, 0.23);     // 안에 쑤셔넣은 천
            continue;
          }
          B(g, 0.95, 0.22, 0.04, shade(c, 0.85), 0, 0.32 + i * 0.28, 0.235);
          if (i !== 2) B(g, 0.16, 0.05, 0.03, 0x3f342a, 0, 0.32 + i * 0.28, 0.26); // 맨 위 손잡이 분실
        }
        B(g, 0.3, 0.02, 0.2, shade(c, 0.6), 0.25, 1.135, 0.05);              // 상판 얼룩
        for (const x of [-0.48, 0.48]) B(g, 0.08, 0.1, 0.4, shade(c, 0.68), x, 0.05, 0);
        return g;
      }
      const g = new THREE.Group();
      B(g, 1.1, 1.0, 0.45, c, 0, 0.58, 0);
      B(g, 1.16, 0.06, 0.5, shade(c, 1.15), 0, 1.1, 0);
      for (let i = 0; i < 3; i++) {
        B(g, 0.95, 0.22, 0.04, shade(c, 1.12), 0, 0.32 + i * 0.28, 0.235);
        B(g, 0.16, 0.05, 0.03, 0x3f342a, 0, 0.32 + i * 0.28, 0.26);
      }
      for (const x of [-0.48, 0.48]) B(g, 0.08, 0.1, 0.4, shade(c, 0.8), x, 0.05, 0);
      return g;
    }
  },
  bookshelf: {
    name: '책장', nameEn: 'Bookshelf', emoji: '📚', fp: { w: 1.0, d: 0.4 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    tiered: true, // #157: T1 벽돌+판자 선반 → T2 기울어진 책장·옹이·듬성한 책 → T3 현행.
    build(c, colorIdx = 0, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const brick = 0x8a5138, ply = 0xa8895e;
        const bookColors = [0xa8524e, 0x54688a, 0x6a7f5b];
        for (const x of [-0.4, 0.4]) {                                       // 벽돌 기둥 2단×2
          B(g, 0.18, 0.24, 0.3, brick, x, 0.17, 0); B(g, 0.18, 0.24, 0.3, shade(brick, 0.85), x, 0.73, 0);
          B(g, 0.18, 0.24, 0.3, shade(brick, 0.9), x, 0.41, 0);
        }
        const p1 = B(g, 1.0, 0.05, 0.32, ply, 0, 0.05, 0);                   // 판자 3장
        B(g, 1.0, 0.05, 0.32, shade(ply, 0.9), 0, 0.56, 0); p1.rotation.y = 0.015;
        const p3 = B(g, 1.0, 0.05, 0.32, shade(ply, 0.85), 0, 0.88, 0);
        p3.rotation.y = -0.02;
        const rand = seededRand(11 + colorIdx * 5);
        let bx = -0.3;                                                       // 책 몇 권만(듬성)
        for (let i = 0; i < 4; i++) {
          const bw = 0.06 + rand() * 0.04, bh = 0.24 + rand() * 0.1;
          B(g, bw, bh, 0.2, bookColors[Math.floor(rand() * bookColors.length)], bx, 0.585 + bh / 2, 0.01);
          bx += bw + 0.02;
        }
        const lean = B(g, 0.06, 0.3, 0.2, bookColors[0], 0.24, 0.72, 0.01);  // 기대 쓰러진 책
        lean.rotation.z = -0.5;
        for (const m of g.children) m.position.y -= 0.025; // #209: 바닥 판자 밑면이 0.025 부유 → 전체 2.5cm 하강해 T3(0)와 접지 일치(퍼치/스택 앵커 없음)
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        g.rotation.z = 0.022;                                                // 통째로 살짝 기움
        B(g, 0.06, 1.8, 0.32, shade(c, 0.78), -0.47, 0.9, 0); B(g, 0.06, 1.8, 0.32, shade(c, 0.78), 0.47, 0.9, 0);
        B(g, 1.0, 0.06, 0.32, shade(c, 0.78), 0, 1.8, 0);
        B(g, 0.94, 0.05, 0.3, shade(c, 0.78), 0, 0.05, 0);
        const sag = B(g, 0.94, 0.04, 0.28, shade(c, 0.7), 0, 0.62, 0);       // 처진 선반
        sag.rotation.z = -0.03;
        B(g, 0.94, 0.04, 0.28, shade(c, 0.7), 0, 1.2, 0);
        B(g, 0.94, 1.75, 0.05, shade(c, 0.55), 0, 0.92, -0.14);
        B(g, 0.06, 0.04, 0.01, 0x3f342a, -0.2, 1.0, 0.02);                   // 옹이 2점
        B(g, 0.05, 0.05, 0.01, 0x3f342a, 0.3, 0.35, 0.02);
        const bookColors = [0xa8524e, 0x54688a, 0x6a7f5b, 0xc4a35b, 0x8a5a7a, 0xb5764a];
        const rand = seededRand(7 + colorIdx * 13);
        for (let sh = 0; sh < 3; sh++) {
          let x = -0.42;
          const yBase = [0.075, 0.64, 1.22][sh];
          while (x < 0.36) {
            const bw = 0.06 + rand() * 0.05, bh = 0.3 + rand() * 0.16;
            if (rand() > 0.55) B(g, bw, bh, 0.2, shade(bookColors[Math.floor(rand() * bookColors.length)], 0.85), x + bw / 2, yBase + bh / 2, 0.01); // 절반쯤 빈 칸
            x += bw + 0.012;
          }
        }
        for (const m of g.children) m.position.y += 0.011; // #209: z-기울기(0.022)로 왼쪽 기둥 바깥밑동이 0.011 매몰 → 전체 1.1cm 상승해 T3(0)와 접지 일치
        return g;
      }
      const g = new THREE.Group();
      B(g, 0.06, 1.8, 0.32, c, -0.47, 0.9, 0); B(g, 0.06, 1.8, 0.32, c, 0.47, 0.9, 0);
      B(g, 1.0, 0.06, 0.32, c, 0, 1.8, 0);
      B(g, 0.94, 0.05, 0.3, c, 0, 0.05, 0);
      B(g, 0.94, 0.04, 0.28, shade(c, 0.9), 0, 0.62, 0);
      B(g, 0.94, 0.04, 0.28, shade(c, 0.9), 0, 1.2, 0);
      B(g, 0.94, 1.75, 0.05, shade(c, 0.7), 0, 0.92, -0.14);
      const bookColors = [0xa8524e, 0x54688a, 0x6a7f5b, 0xc4a35b, 0x8a5a7a, 0xb5764a];
      const rand = seededRand(7 + colorIdx * 13);
      for (let sh = 0; sh < 3; sh++) {
        let x = -0.42;
        const yBase = [0.075, 0.64, 1.22][sh];
        while (x < 0.36) {
          const bw = 0.06 + rand() * 0.05, bh = 0.3 + rand() * 0.16;
          if (rand() > 0.16) B(g, bw, bh, 0.2, bookColors[Math.floor(rand() * bookColors.length)], x + bw / 2, yBase + bh / 2, 0.01);
          x += bw + 0.012;
        }
      }
      return g;
    }
  },
  // 「생존의 흔적」 밀도 프롭(2026-07-15, 디렉터 B안): 빈 방 → 생존자 소굴. 벽·구석을 보급 디테일로 채운다.
  supplyshelf: {
    name: '보급 선반', nameEn: 'Supply Shelf', emoji: '🥫', fp: { w: 1.0, d: 0.36 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    build(c, colorIdx = 0) {
      const g = new THREE.Group();
      B(g, 0.05, 1.16, 0.3, c, -0.47, 0.58, 0); B(g, 0.05, 1.16, 0.3, c, 0.47, 0.58, 0); // 기둥
      B(g, 0.98, 0.04, 0.3, shade(c, 0.9), 0, 0.06, 0); B(g, 0.98, 0.04, 0.3, shade(c, 0.9), 0, 0.6, 0); B(g, 0.98, 0.04, 0.3, shade(c, 0.9), 0, 1.14, 0);
      B(g, 0.98, 1.12, 0.04, shade(c, 0.72), 0, 0.6, -0.15); // 뒷판
      const cans = [0xb84a3a, 0xa8b0b8, 0xc07a3a, 0x8a9a6a], jars = [0xc89a4a, 0x7a9a5a, 0xb5764a, 0x9a7ab0];
      const rand = seededRand(31 + colorIdx * 17);
      for (const [yB, kind] of [[0.1, 'can'], [0.64, 'jar']]) {
        let x = -0.4;
        while (x < 0.36) {
          const w = 0.085 + rand() * 0.04, h = kind === 'can' ? 0.15 + rand() * 0.06 : 0.17 + rand() * 0.09;
          if (rand() > 0.1) {
            const col = (kind === 'can' ? cans : jars)[Math.floor(rand() * 4)];
            B(g, w, h, 0.18, col, x + w / 2, yB + h / 2, 0);
            if (kind === 'jar') B(g, w * 0.72, 0.03, 0.14, shade(col, 1.35), x + w / 2, yB + h + 0.01, 0); // 뚜껑
            else B(g, w * 0.94, 0.025, 0.185, shade(col, 1.4), x + w / 2, yB + h * 0.62, 0); // 라벨 띠
          }
          x += w + 0.028;
        }
      }
      return g;
    }
  },
  cratestack: {
    name: '보급 상자', nameEn: 'Supply Crates', emoji: '📦', fp: { w: 0.85, d: 0.7 },
    colorNames: ['파인', '올리브', '러스트', '애쉬'], colorNamesEn: ['Pine', 'Olive', 'Rust', 'Ash'],
    colors: [0x8a6a44, 0x6a6a44, 0x8a5038, 0x5a5650],
    build(c) {
      const g = new THREE.Group();
      const crate = (x, y, z, s, col) => {
        B(g, s, s * 0.82, s, col, x, y, z);
        B(g, s * 1.03, 0.04, s * 1.03, shade(col, 1.22), x, y + s * 0.41, z);      // 상단 테두리
        B(g, s * 0.92, 0.035, 0.03, shade(col, 0.68), x, y + s * 0.18, z + s / 2 - 0.015); // 앞 널판
        B(g, s * 0.92, 0.035, 0.03, shade(col, 0.68), x, y - s * 0.12, z + s / 2 - 0.015);
        B(g, 0.035, s * 0.8, 0.035, shade(col, 0.62), x - s / 2 + 0.02, y, z + s / 2 - 0.02); // 모서리 각목
        B(g, 0.035, s * 0.8, 0.035, shade(col, 0.62), x + s / 2 - 0.02, y, z + s / 2 - 0.02);
      };
      crate(-0.1, 0.24, 0.05, 0.5, c);              // 하단 큰 상자
      crate(0.22, 0.2, -0.16, 0.4, shade(c, 0.85)); // 옆 상자
      crate(-0.12, 0.63, 0.06, 0.4, shade(c, 1.12)); // 위 상자(열림)
      B(g, 0.1, 0.14, 0.1, 0xb84a3a, -0.22, 0.74, 0.05); B(g, 0.09, 0.13, 0.09, 0xa8b0b8, -0.08, 0.74, 0.11); B(g, 0.09, 0.17, 0.09, 0xc89a4a, -0.02, 0.75, -0.02); // 열린 상자 안 보급품
      for (const m of g.children) m.position.y -= 0.035; // #209: crate() y=중심이라 하단 상자 밑면이 0.035 부유 → 전체 3.5cm 하강 접지
      return g;
    }
  },
  fuelpile: {
    name: '장작 더미', nameEn: 'Firewood Pile', emoji: '🪵', fp: { w: 0.86, d: 0.5 },
    colorNames: ['참나무', '자작', '소나무', '유목'], colorNamesEn: ['Oak', 'Birch', 'Pine', 'Driftwood'],
    colors: [0x7a5636, 0xa89474, 0x8a6a44, 0x6a5a4a],
    build(c, colorIdx = 0) {
      const g = new THREE.Group();
      const rand = seededRand(41 + colorIdx * 7);
      for (let row = 0; row < 3; row++) { // 통나무 3단(앞면 나이테)
        const n = 4 - row, y = 0.1 + row * 0.17;
        for (let i = 0; i < n; i++) {
          const x = -(n - 1) * 0.085 + i * 0.17 + (rand() - 0.5) * 0.02, lc = shade(c, 0.82 + rand() * 0.32);
          B(g, 0.155, 0.16, 0.42, lc, x, y, 0);
          B(g, 0.11, 0.11, 0.02, shade(lc, 1.28), x, y, 0.21);   // 앞면 단면
          B(g, 0.045, 0.045, 0.016, shade(lc, 0.68), x, y, 0.222); // 나이테 중심
        }
      }
      B(g, 0.16, 0.2, 0.14, 0xb03828, 0.36, 0.1, 0.17); B(g, 0.045, 0.06, 0.045, 0x2a2420, 0.36, 0.21, 0.17); // 빨간 연료 캔
      return g;
    }
  },
  noticeboard: {
    name: '상황판', nameEn: 'Notice Board', emoji: '📋', fp: { w: 1.0, d: 0.34 },
    colorNames: ['코르크', '칠판', '화이트', '메탈'], colorNamesEn: ['Cork', 'Slate', 'White', 'Steel'],
    colors: [0xb2905a, 0x2f3a34, 0xcfc9ba, 0x6a6e72],
    build(c, colorIdx = 0) {
      const g = new THREE.Group();
      const rand = seededRand(53 + colorIdx * 11);
      B(g, 0.05, 1.0, 0.05, 0x4a3a2a, -0.4, 0.5, 0.06); B(g, 0.05, 1.0, 0.05, 0x4a3a2a, 0.4, 0.5, 0.06);   // 앞다리
      B(g, 0.05, 0.9, 0.05, 0x4a3a2a, -0.36, 0.45, -0.1); B(g, 0.05, 0.9, 0.05, 0x4a3a2a, 0.36, 0.45, -0.1); // 뒷다리(이젤)
      B(g, 0.98, 0.78, 0.06, 0x5a4632, 0, 0.92, 0);   // 프레임
      B(g, 0.9, 0.7, 0.04, c, 0, 0.92, 0.02);         // 판
      const papers = [0xe8e0cc, 0xdcd2b8, 0xcfe0d8, 0xe0d0c0];
      for (let i = 0; i < 7; i++) {
        const px = -0.34 + rand() * 0.68, py = 0.66 + rand() * 0.5, pw = 0.1 + rand() * 0.08, ph = 0.1 + rand() * 0.08;
        B(g, pw, ph, 0.015, papers[Math.floor(rand() * 4)], px, py, 0.045);
        B(g, 0.018, 0.018, 0.02, 0xc23a2a, px + pw * 0.3, py + ph * 0.3, 0.06); // 빨간 핀
      }
      B(g, 0.26, 0.22, 0.016, 0x6a8a7a, -0.08, 0.98, 0.046); // 지도 한 장
      B(g, 0.5, 0.012, 0.012, 0xb03828, 0.02, 0.9, 0.062);   // 붉은 실
      return g;
    }
  },
  jugcluster: {
    name: '물·연료 비축', nameEn: 'Jug Cluster', emoji: '🛢️', fp: { w: 0.85, d: 0.6 },
    colorNames: ['블루', '레드', '그린', '앰버'], colorNamesEn: ['Blue', 'Red', 'Green', 'Amber'],
    colors: [0x3a6aa8, 0xb03828, 0x4a7a4a, 0xc08a3a],
    build(c) {
      const g = new THREE.Group();
      const jug = (x, z, s, col, tall) => {
        const h = tall ? 0.38 : 0.26;
        B(g, s, h, s, col, x, h / 2 + 0.01, z);                       // 몸통
        B(g, s * 0.5, 0.06, s * 0.5, shade(col, 1.2), x, h + 0.04, z); // 뚜껑
        B(g, s * 0.9, 0.03, s * 0.95, shade(col, 1.35), x, h * 0.55, z + 0.001); // 라벨 띠
        B(g, 0.03, 0.1, 0.03, shade(col, 0.7), x + s * 0.35, h * 0.8, z); // 손잡이
      };
      jug(-0.2, 0.05, 0.26, c, true);       // 큰 통(색 가변)
      jug(0.15, -0.08, 0.22, 0xb03828, false); // 빨간 연료통
      jug(0.28, 0.16, 0.2, 0x4a7a4a, false);   // 초록통
      jug(-0.02, 0.22, 0.16, 0x8a8f92, false); // 회색 소형
      return g;
    }
  },
  rug: {
    name: '러그', nameEn: 'Rug', emoji: '🧶', fp: { w: 2.2, d: 1.5 }, noCollide: true,
    colorNames: ['레드', '블루', '그린', '베이지'],
    colorNamesEn: ['Red', 'Blue', 'Green', 'Beige'],
    colors: [0x9e524e, 0x54688a, 0x6a7f5b, 0xc4b295],
    tiered: true, // #157: T1 골판지 위 담요 조각 → T2 해진 러그(올 풀림) → T3 현행. 두께 유지(noCollide 평면).
    // #209(디렉터 "러그인지 침대인지 아직도 접합 아니야"): 러그는 '바닥을 들어올린다'.
    //   surface/stackable(테이블 상판 문법)과 별개 축 — 그 문법을 쓰면 침대를 stackable로 만들어야 하고,
    //   그러면 침대를 테이블 위에 올릴 수 있게 된다. floorLift는 위에 오는 게 무엇이든 상면에 앉힌다.
    //   러그끼리 겹칠 때도 위 러그가 얹혀 '동일 평면 z-fighting'(신고 스크린샷의 그것)이 사라진다.
    floorLift: true,
    // 티어별 실측 최고점 (B(g,w,h,d,c,x,y,z)의 y는 중심 → top = y + h/2):
    //   T1 접힌 귀퉁이 0.04+0.025=0.065 · T2 해진 패치 0.024+0.026=0.050 · T3 안쪽 층 0.024+0.025=0.049.
    //   최고점을 쓰는 이유: 그보다 낮게 잡으면 위에 얹힌 러그/가구가 이 돌출부를 파고든다.
    floorTopByTier: { 1: 0.065, 2: 0.050, 3: 0.049 },
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const card = 0xa8895e;
        const c1 = B(g, 1.4, 0.03, 1.0, card, -0.3, 0.015, 0.1);             // 골판지 ①
        c1.rotation.y = 0.06; c1.castShadow = false;
        const c2 = B(g, 1.2, 0.032, 0.9, shade(card, 0.88), 0.5, 0.016, -0.15); // 골판지 ②(어긋남)
        c2.rotation.y = -0.1; c2.castShadow = false;
        const bl = B(g, 0.9, 0.045, 0.7, shade(c, 0.65), -0.15, 0.035, 0);   // 담요 조각(바랜)
        bl.rotation.y = 0.12;
        B(g, 0.35, 0.05, 0.28, shade(c, 0.5), 0.05, 0.04, 0.12);             // 접힌 귀퉁이
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        const m1 = B(g, 2.2, 0.04, 1.5, shade(c, 0.62), 0, 0.02, 0);
        B(g, 1.9, 0.045, 1.2, shade(c, 0.75), 0, 0.022, 0);
        B(g, 1.3, 0.05, 0.7, shade(c, 0.9), 0, 0.024, 0);
        m1.castShadow = false;
        B(g, 0.4, 0.052, 0.3, shade(c, 0.5), -0.45, 0.024, 0.3);             // 해진 얼룩 패치
        B(g, 0.25, 0.052, 0.2, shade(c, 0.55), 0.55, 0.024, -0.35);
        for (const [x, z, r] of [[-1.05, 0.5, 0.4], [-1.02, -0.3, -0.3], [1.04, 0.15, 0.5]]) {
          const th = B(g, 0.14, 0.02, 0.03, shade(c, 0.8), x, 0.02, z);      // 올 풀림(가장자리 실)
          th.rotation.y = r; th.castShadow = false;
        }
        return g;
      }
      const g = new THREE.Group();
      const m1 = B(g, 2.2, 0.04, 1.5, shade(c, 0.8), 0, 0.02, 0);
      B(g, 1.9, 0.045, 1.2, c, 0, 0.022, 0);
      B(g, 1.3, 0.05, 0.7, shade(c, 1.2), 0, 0.024, 0);
      m1.castShadow = false;
      return g;
    }
  },
  lamp: {
    name: '스탠드 조명', nameEn: 'Floor Lamp', emoji: '💡', fp: { w: 0.45, d: 0.45 },
    colorNames: ['웜화이트', '세이지', '로즈', '스카이'],
    colorNamesEn: ['Warm White', 'Sage', 'Rose', 'Sky'],
    colors: [0xe8d9b0, 0x9aa88a, 0xc79a9a, 0x93a8bb],
    // #196: T1 알전구는 x=0.22 측면 오프셋(전선 늘어짐) — 헤일로가 전구에서 벗어나던 실측. y는 전 티어 1.36 공통이라 유지.
    light: { color: 0xffb670, intensity: 7, dist: 7, y: 1.45, anchorByTier: { 1: { x: 0.22 } }, fuel: 'battery', comfort: 8, gelable: true }, // #189 P3: 전기 갓 — 젤 틴트 가능
    tiered: true, // #157: T1 전선에 알전구 하나 → T2 갓 찌그러진 스탠드 → T3 현행. 광원 y 공통(전구 1.36) — T1 x 오프셋만 anchorByTier.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const stick = 0x6e5638;
        B(g, 0.3, 0.05, 0.3, shade(stick, 0.8), 0, 0.025, 0);                // 판자 받침
        const pole = B(g, 0.05, 1.45, 0.05, stick, 0, 0.76, 0);              // 거친 각목(비스듬)
        pole.rotation.z = 0.04;
        const wire1 = Cyl(g, 0.008, 0.008, 0.5, 0x26282c, 0.04, 1.35, 0, 4); // 늘어진 전선
        wire1.rotation.z = 1.25;
        const wire2 = Cyl(g, 0.008, 0.008, 0.45, 0x26282c, 0.1, 0.9, 0, 4);
        wire2.rotation.z = -0.25;
        const bulbT1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 1 }));
        bulbT1.position.set(0.22, 1.36, 0); bulbT1.userData.glow = true;     // 알전구(갓 없음)
        g.add(bulbT1);
        Cyl(g, 0.025, 0.025, 0.05, 0x26282c, 0.22, 1.42, 0, 6);              // 소켓
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        Cyl(g, 0.16, 0.2, 0.06, 0x3f3a33, 0, 0.03, 0);
        const poleW = Cyl(g, 0.025, 0.025, 1.25, shade(0x565049, 0.85), 0, 0.68, 0);
        poleW.rotation.z = 0.03;                                             // 기둥 살짝 기움
        B(g, 0.06, 0.08, 0.06, 0xb4b6ba, 0.02, 0.55, 0);                     // 테이프 감은 자국
        const shD = Cyl(g, 0.16, 0.24, 0.4, shade(c, 0.72), 0, 1.5, 0);      // 찌그러진 갓
        shD.scale.z = 0.78; shD.rotation.z = 0.14;
        shD.material.emissive = new THREE.Color(0xffc070);
        shD.material.emissiveIntensity = 0.55;                               // 켜져도 침침
        shD.userData.glow = true;
        const bulbW = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 0.85 }));
        bulbW.position.set(0, 1.36, 0); bulbW.userData.glow = true;
        g.add(bulbW);
        return g;
      }
      const g = new THREE.Group();
      Cyl(g, 0.16, 0.2, 0.06, 0x3f3a33, 0, 0.03, 0);
      Cyl(g, 0.025, 0.025, 1.25, 0x565049, 0, 0.68, 0);
      const sh = Cyl(g, 0.16, 0.24, 0.4, c, 0, 1.5, 0);
      // 갓은 "안에서 빛이 차오르는" 웜톤으로 — 갓 색 그대로 약하게 빛내면(0.25) 켜진 티가 안 난다
      sh.material.emissive = new THREE.Color(0xffc070);
      sh.material.emissiveIntensity = 0.85;
      sh.userData.glow = true;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffe0b0, emissive: 0xffc070, emissiveIntensity: 1 }));
      bulb.position.set(0, 1.36, 0); bulb.userData.glow = true;
      g.add(bulb);
      return g;
    }
  },
  plant: {
    name: '화분', nameEn: 'Potted Plant', emoji: '🪴', fp: { w: 0.55, d: 0.55 },
    stackable: true,
    colorNames: ['테라코타', '화이트', '블랙', '민트'],
    colorNamesEn: ['Terracotta', 'White', 'Black', 'Mint'],
    colors: [0xb3674d, 0xd8d3c7, 0x46484a, 0x9dbcae],
    build(c) {
      const g = new THREE.Group();
      Cyl(g, 0.2, 0.15, 0.3, c, 0, 0.15, 0, 8);
      Cyl(g, 0.16, 0.16, 0.04, 0x4a3a28, 0, 0.31, 0, 8);
      Cyl(g, 0.035, 0.045, 0.5, 0x6a4f33, 0, 0.55, 0, 6);
      const leaf = (x, y, z, s) => {
        const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), lamb(0x5f8a52));
        m.position.set(x, y, z); m.castShadow = true; g.add(m);
      };
      leaf(0, 1.0, 0, 0.3); leaf(0.2, 0.82, 0.1, 0.2); leaf(-0.18, 0.86, -0.08, 0.22); leaf(0.05, 0.78, -0.18, 0.17);
      return g;
    }
  },
  crate: {
    name: '나무상자', nameEn: 'Wooden Crate', emoji: '📦', fp: { w: 0.8, d: 0.8 },
    surface: { y: 0.6, w: 0.68, d: 0.68 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    build(c) {
      const g = new THREE.Group();
      B(g, 0.75, 0.6, 0.75, c, 0, 0.3, 0);
      B(g, 0.79, 0.08, 0.79, shade(c, 0.85), 0, 0.06, 0);
      B(g, 0.79, 0.08, 0.79, shade(c, 0.85), 0, 0.56, 0);
      B(g, 0.08, 0.62, 0.78, shade(c, 0.8), -0.34, 0.3, 0);
      B(g, 0.08, 0.62, 0.78, shade(c, 0.8), 0.34, 0.3, 0);
      return g;
    }
  },
  radio: {
    name: '라디오', nameEn: 'Radio', emoji: '📻', fp: { w: 0.6, d: 0.35 },
    stackable: true, // 테이블·서랍장 등 표면 위에 올릴 수 있음
    colorNames: ['체리레드', '크림', '민트', '브라운'],
    colorNamesEn: ['Cherry Red', 'Cream', 'Mint', 'Brown'],
    colors: [0xa8433f, 0xd9cdb2, 0x93b5a5, 0x6f4f38],
    tiered: true, // #157: T1 기판 노출 조립 무전기 → T2 테이프 감은 몸체·철사 안테나 → T3 현행. 다이얼 발광 y 공통.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const board = 0x3a6a4a;
        B(g, 0.5, 0.04, 0.3, 0x8a7550, 0, 0.02, 0);                          // 판자 받침
        const pcb = B(g, 0.4, 0.22, 0.03, board, 0, 0.16, 0.02);             // 노출 기판(세워짐)
        pcb.rotation.x = -0.12;
        B(g, 0.05, 0.04, 0.04, 0x26282c, -0.1, 0.18, 0.05);                  // 부품 칩들
        B(g, 0.04, 0.06, 0.04, 0x8a8f96, 0.02, 0.17, 0.05);
        Cyl(g, 0.025, 0.025, 0.05, 0xb08a3a, 0.12, 0.2, 0.06, 6).rotation.x = Math.PI / 2; // 코일
        const dialT1 = B(g, 0.08, 0.06, 0.02, 0xf5e3b0, 0.12, 0.24, 0.045);  // 희미한 다이얼
        dialT1.material.emissive = new THREE.Color(0xd9b96a);
        dialT1.material.emissiveIntensity = 0.35; dialT1.userData.glow = true;
        Cyl(g, 0.006, 0.006, 0.08, 0x26282c, -0.18, 0.1, 0.06, 4).rotation.z = 0.9; // 늘어진 전선
        const ant = Cyl(g, 0.006, 0.006, 0.55, 0x8b8b8b, -0.16, 0.5, -0.04, 4);     // 삐뚠 철사 안테나
        ant.rotation.z = 0.55; ant.rotation.x = 0.15;
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        B(g, 0.55, 0.34, 0.24, shade(c, 0.72), 0, 0.2, 0);                   // 바랜 몸체
        B(g, 0.2, 0.2, 0.02, shade(c, 0.5), -0.12, 0.2, 0.13);               // 그릴(먼지 낌)
        B(g, 0.08, 0.06, 0.021, 0x1c1e24, -0.15, 0.16, 0.131);               // 그릴 찢김
        const dialW = B(g, 0.16, 0.1, 0.02, shade(0xf5e3b0, 0.85), 0.13, 0.24, 0.13);
        dialW.material.emissive = new THREE.Color(0xd9b96a);
        dialW.material.emissiveIntensity = 0.45; dialW.userData.glow = true; // 침침한 다이얼
        B(g, 0.57, 0.06, 0.26, 0xb4b6ba, 0, 0.09, 0);                        // 은테이프 밴드
        B(g, 0.06, 0.36, 0.26, 0xb4b6ba, 0.2, 0.2, 0);
        Cyl(g, 0.03, 0.03, 0.04, 0x2f2a24, 0.13, 0.1, 0.14, 8).rotation.x = Math.PI / 2;
        const antW = Cyl(g, 0.006, 0.006, 0.55, 0x8b8b8b, -0.2, 0.55, -0.05, 4);    // 철사 대체 안테나(굽음)
        antW.rotation.z = 0.7; antW.rotation.x = -0.1;
        B(g, 0.1, 0.03, 0.2, shade(c, 0.65), -0.18, 0.025, 0); B(g, 0.1, 0.03, 0.2, shade(c, 0.65), 0.18, 0.025, 0);
        return g;
      }
      const g = new THREE.Group();
      B(g, 0.55, 0.34, 0.24, c, 0, 0.2, 0);
      B(g, 0.2, 0.2, 0.02, shade(c, 0.65), -0.12, 0.2, 0.13);
      const dial = B(g, 0.16, 0.1, 0.02, 0xf5e3b0, 0.13, 0.24, 0.13);
      dial.material.emissive = new THREE.Color(0xd9b96a);
      dial.material.emissiveIntensity = 0.7; dial.userData.glow = true;
      Cyl(g, 0.03, 0.03, 0.04, 0x2f2a24, 0.13, 0.1, 0.14, 8).rotation.x = Math.PI / 2;
      Cyl(g, 0.008, 0.008, 0.5, 0x8b8b8b, -0.2, 0.55, -0.05, 5).rotation.z = 0.4;
      B(g, 0.1, 0.03, 0.2, shade(c, 0.8), -0.18, 0.025, 0); B(g, 0.1, 0.03, 0.2, shade(c, 0.8), 0.18, 0.025, 0);
      return g;
    }
  },
  candle: {
    name: '캔들 스툴', nameEn: 'Candle Stool', emoji: '🕯️', fp: { w: 0.5, d: 0.5 },
    stackable: true, // 상자·테이블 등 표면 위에도 올릴 수 있다
    colorNames: ['우드', '화이트', '블랙', '라벤더'],
    colorNamesEn: ['Wood', 'White', 'Black', 'Lavender'],
    colors: [0x8a6a48, 0xd4cfc2, 0x46484a, 0x9a8aa8],
    // 디렉터 2026-07-10: 촛불은 은은하게 — 세기 3→1.6, 반경 4→3.2. flickSlow=호롱호롱(저속 일렁임, 렌더 루프 전용 파형).
    light: { color: 0xff9438, intensity: 2.4, dist: 3.2, y: 0.75, flicker: true, flickSlow: true, fuel: 'candle', comfort: 6 }, // 촛불 강화(1.6→2.4, 더 따뜻)
    tiered: true, // #157: T1 벽돌 위 참치캔 초 → T2 접시 위 초 두 자루 → T3 현행. 불꽃 y 공통(광원 정합).
    build(c, ci, sk, tier) {
      const mkFlame = (x, y, s = 1) => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.03 * s, 0.09 * s, 6),
          new THREE.MeshLambertMaterial({ color: 0xffd080, emissive: 0xffaa40, emissiveIntensity: 1.4 }));
        f.position.set(x, y, 0); f.userData.glow = true;
        return f;
      };
      if (tier === 1) {
        const g = new THREE.Group();
        const brick = 0x8a5138;
        B(g, 0.26, 0.22, 0.22, brick, 0, 0.11, 0);                           // 벽돌 받침 2단
        const b2 = B(g, 0.26, 0.22, 0.22, shade(brick, 0.85), 0.02, 0.33, -0.01);
        b2.rotation.y = 0.1;
        Cyl(g, 0.07, 0.07, 0.06, 0x9aa0a6, 0, 0.47, 0, 10);                  // 참치캔
        Cyl(g, 0.045, 0.045, 0.1, 0xe8dcc0, 0, 0.54, 0, 8);                  // 뭉툭한 초
        B(g, 0.03, 0.1, 0.03, 0xe8dcc0, 0.06, 0.42, 0.05);                   // 흘러내린 촛농
        B(g, 0.02, 0.06, 0.02, shade(0xe8dcc0, 0.9), -0.05, 0.4, -0.04);
        g.add(mkFlame(0, 0.63, 0.9));
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        Cyl(g, 0.2, 0.22, 0.05, shade(c, 0.75), 0, 0.42, 0, 10);             // 낡은 스툴(기움)
        const leg = Cyl(g, 0.04, 0.05, 0.4, shade(c, 0.65), 0, 0.2, 0, 8);
        leg.rotation.z = 0.05;
        Cyl(g, 0.14, 0.16, 0.03, shade(c, 0.55), 0, 0.02, 0, 10);
        Cyl(g, 0.09, 0.1, 0.02, 0xd4cfc2, 0, 0.455, 0, 10);                  // 접시
        Cyl(g, 0.035, 0.035, 0.14, 0xf0e8d0, -0.03, 0.52, 0, 8);             // 초 두 자루(하나 짧음)
        Cyl(g, 0.035, 0.035, 0.08, shade(0xf0e8d0, 0.9), 0.05, 0.49, 0, 8);
        g.add(mkFlame(-0.03, 0.64, 0.85));
        g.add(mkFlame(0.05, 0.57, 0.7));
        return g;
      }
      const g = new THREE.Group();
      Cyl(g, 0.2, 0.22, 0.05, c, 0, 0.42, 0, 10);
      Cyl(g, 0.04, 0.05, 0.4, shade(c, 0.85), 0, 0.2, 0, 8);
      Cyl(g, 0.14, 0.16, 0.03, shade(c, 0.7), 0, 0.02, 0, 10);
      Cyl(g, 0.05, 0.05, 0.16, 0xf0e8d0, 0, 0.53, 0, 8);
      g.add(mkFlame(0, 0.66));
      return g;
    }
  },
  fridge: {
    name: '냉장고', nameEn: 'Fridge', emoji: '🧊', fp: { w: 0.78, d: 0.68 },
    colorNames: ['체리레드', '민트', '크림', '화이트'],
    colorNamesEn: ['Cherry Red', 'Mint', 'Cream', 'White'],
    colors: [0xa8433f, 0x93b5a5, 0xd9cdb2, 0xd8d8d4],
    appliance: { fuel: 'battery', effect: 'fridge', label: '음식 부패 방지', labelEn: 'Prevents food spoilage' },
    tiered: true, // #157: T1 아이스박스+눈 채움 → T2 웅웅대는 중고(문 얼룩·녹) → T3 현행.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const box = 0x9ab0b8;
        B(g, 0.68, 0.44, 0.55, box, 0, 0.22, 0);                             // 아이스박스 몸체
        B(g, 0.7, 0.05, 0.57, shade(box, 0.85), 0, 0.06, 0);                 // 하단 몰딩
        const lid = B(g, 0.66, 0.08, 0.53, shade(box, 1.1), -0.06, 0.5, 0);  // 반쯤 열린 뚜껑
        lid.rotation.z = 0.18;
        B(g, 0.5, 0.06, 0.4, 0xe8ecf0, 0.04, 0.46, 0);                       // 채워 넣은 눈
        B(g, 0.2, 0.05, 0.16, 0xdfe6ea, 0.12, 0.51, 0.05);
        Cyl(g, 0.05, 0.05, 0.09, 0x8a8f96, 0.18, 0.5, -0.1, 8);              // 파묻힌 통조림
        B(g, 0.08, 0.05, 0.3, shade(box, 0.7), 0.35, 0.3, 0);                // 손잡이
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        B(g, 0.7, 1.35, 0.6, shade(c, 0.75), 0, 0.72, 0);                    // 바랜 몸체
        B(g, 0.64, 0.12, 0.55, shade(c, 0.85), 0, 1.44, 0);
        B(g, 0.58, 0.06, 0.5, shade(c, 0.9), 0, 1.52, 0);
        B(g, 0.72, 0.03, 0.62, shade(c, 0.6), 0, 0.98, 0.01);                // 도어 라인
        const hd = B(g, 0.05, 0.5, 0.05, shade(0xd8d3c8, 0.8), 0.28, 1.2, 0.33); // 삐뚠 손잡이
        hd.rotation.z = 0.06;
        B(g, 0.05, 0.3, 0.05, shade(0xd8d3c8, 0.8), 0.28, 0.6, 0.33);
        B(g, 0.2, 0.14, 0.02, shade(c, 0.5), -0.15, 1.15, 0.31);             // 문 얼룩 2점
        B(g, 0.14, 0.1, 0.02, shade(c, 0.55), 0.1, 0.45, 0.31);
        B(g, 0.6, 0.06, 0.02, 0x6e4a30, 0, 0.1, 0.31);                       // 하단 녹 라인
        const indW = B(g, 0.06, 0.04, 0.02, 0xcc8830, -0.24, 1.35, 0.31);    // 지친 주황 표시등
        indW.material.emissive = new THREE.Color(0xa06018);
        indW.material.emissiveIntensity = 0.5; indW.userData.glow = true;
        B(g, 0.6, 0.06, 0.5, shade(c, 0.55), 0, 0.03, 0);
        return g;
      }
      const g = new THREE.Group();
      B(g, 0.7, 1.35, 0.6, c, 0, 0.72, 0);
      B(g, 0.64, 0.12, 0.55, shade(c, 1.1), 0, 1.44, 0);          // 둥근 상단 느낌
      B(g, 0.58, 0.06, 0.5, shade(c, 1.15), 0, 1.52, 0);
      B(g, 0.72, 0.03, 0.62, shade(c, 0.8), 0, 0.98, 0.01);       // 도어 라인
      B(g, 0.05, 0.5, 0.05, 0xd8d3c8, 0.28, 1.2, 0.33);           // 손잡이
      B(g, 0.05, 0.3, 0.05, 0xd8d3c8, 0.28, 0.6, 0.33);
      const ind = B(g, 0.06, 0.04, 0.02, 0x88ff88, -0.24, 1.35, 0.31);
      ind.material.emissive = new THREE.Color(0x44cc44);
      ind.material.emissiveIntensity = 0.9; ind.userData.glow = true;
      B(g, 0.6, 0.06, 0.5, shade(c, 0.7), 0, 0.03, 0);
      return g;
    }
  },
  purifier: {
    name: '정수기', nameEn: 'Water Purifier', emoji: '🚰', fp: { w: 0.6, d: 0.6 },
    colorNames: ['스틸', '화이트', '올리브', '네이비'],
    colorNamesEn: ['Steel', 'White', 'Olive', 'Navy'],
    colors: [0x8a8f96, 0xd4cfc2, 0x7d7f5a, 0x46557a],
    appliance: { fuel: 'battery', effect: 'water', label: '매일 깨끗한 물 +1', labelEn: 'Clean water +1 daily' },
    tiered: true, // #157: T1 천 여과 양동이 2단 → T2 낡은 필터통·테이프 → T3 현행.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const stick = 0x6e5638, pail = 0x8a8f96;
        for (const [x, z] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]])
          B(g, 0.05, 0.72, 0.05, stick, x, 0.36, z);               // 나무 프레임 다리
        B(g, 0.5, 0.04, 0.44, shade(stick, 0.85), 0, 0.72, 0);     // 상단 틀
        const top = Cyl(g, 0.17, 0.14, 0.22, pail, 0, 0.86, 0, 10); // 위 양동이(여과)
        top.rotation.z = 0.04;
        const cloth = Cyl(g, 0.15, 0.15, 0.03, 0xd4cfc2, 0, 0.96, 0, 10); // 걸쳐진 여과 천
        cloth.rotation.z = 0.06;
        B(g, 0.2, 0.02, 0.04, 0xd4cfc2, 0.14, 0.9, 0.05);          // 천 늘어진 자락
        Cyl(g, 0.17, 0.14, 0.26, shade(pail, 0.8), 0, 0.16, 0, 10); // 아래 양동이(받이)
        const watT1 = Cyl(g, 0.13, 0.13, 0.05, 0x5a8ab0, 0, 0.26, 0, 10);
        watT1.material.emissive = new THREE.Color(0x2a4a66);
        watT1.material.emissiveIntensity = 0.2; watT1.userData.glow = true; // 고인 물(흐릿)
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        B(g, 0.5, 0.5, 0.5, shade(c, 0.68), 0, 0.25, 0);           // 바랜 캐비닛
        B(g, 0.2, 0.12, 0.02, shade(c, 0.5), -0.1, 0.3, 0.251);    // 얼룩
        const tankW = Cyl(g, 0.2, 0.2, 0.6, shade(c, 0.78), 0, 0.82, 0, 10);
        tankW.rotation.z = 0.03;                                   // 필터통 살짝 기움
        const watW = Cyl(g, 0.16, 0.16, 0.3, 0x6a7a80, 0, 0.78, 0, 10); // 물 탁함
        watW.material.emissive = new THREE.Color(0x2a4a66);
        watW.material.emissiveIntensity = 0.18; watW.userData.glow = true;
        B(g, 0.42, 0.05, 0.04, 0xb4b6ba, 0, 0.66, 0.16);           // 테이프 밴드 2
        B(g, 0.04, 0.2, 0.42, 0xb4b6ba, 0.17, 0.95, 0);
        Cyl(g, 0.05, 0.05, 0.12, 0x3f3a33, 0.2, 0.6, 0.14, 6).rotation.z = Math.PI / 2;
        B(g, 0.16, 0.12, 0.16, shade(0xd4cfc2, 0.8), 0.2, 0.56, 0.14); // #209: 찌든 컵도 T3와 동일 — 상면 위·급수구 아래로(0.24,0.31→0.2,0.56)
        Cyl(g, 0.12, 0.14, 0.08, shade(0x3f3a33, 0.85), 0, 1.16, 0, 8);
        return g;
      }
      const g = new THREE.Group();
      B(g, 0.5, 0.5, 0.5, shade(c, 0.85), 0, 0.25, 0);            // 받침 캐비닛
      const tank = Cyl(g, 0.2, 0.2, 0.6, c, 0, 0.82, 0, 10);
      const wat = Cyl(g, 0.16, 0.16, 0.3, 0x5a8ab0, 0, 0.78, 0, 10);
      wat.material.emissive = new THREE.Color(0x2a4a66);
      wat.material.emissiveIntensity = 0.4; wat.userData.glow = true;
      Cyl(g, 0.05, 0.05, 0.12, 0x3f3a33, 0.2, 0.6, 0.14, 6).rotation.z = Math.PI / 2;
      B(g, 0.16, 0.12, 0.16, 0xd4cfc2, 0.2, 0.56, 0.14);         // #209: 컵이 캐비닛(상면0.5) 속 매몰+측면 돌출이라 상면 위·급수구(y0.557~) 아래로 올림(0.24,0.31→0.2,0.56)
      Cyl(g, 0.12, 0.14, 0.08, 0x3f3a33, 0, 1.16, 0, 8);          // 뚜껑
      return g;
    }
  },
  generator: {
    name: '발전기', nameEn: 'Generator', emoji: '⚡', fp: { w: 0.95, d: 0.7 },
    colorNames: ['레드', '옐로우', '올리브', '그레이'],
    colorNamesEn: ['Red', 'Yellow', 'Olive', 'Gray'],
    colors: [0x9e4a3a, 0xb08a3a, 0x6a7047, 0x7c7f86],
    appliance: { fuel: 'fuel', effect: 'power', label: '가동 중엔 배터리 소비 무료 (연료 1/일)', labelEn: 'Free battery use while running (fuel 1/day)' },
    build(c) {
      const g = new THREE.Group();
      B(g, 0.85, 0.5, 0.55, c, 0, 0.35, 0);                       // 엔진 본체
      B(g, 0.9, 0.06, 0.6, shade(c, 0.8), 0, 0.07, 0);            // 프레임
      B(g, 0.06, 0.35, 0.5, shade(c, 0.75), -0.42, 0.35, 0);
      B(g, 0.06, 0.35, 0.5, shade(c, 0.75), 0.42, 0.35, 0);
      B(g, 0.3, 0.16, 0.3, 0x3a3733, -0.2, 0.68, 0);              // 연료 탱크 캡
      Cyl(g, 0.05, 0.05, 0.3, 0x55504a, 0.3, 0.75, -0.15, 6);     // 배기관
      Cyl(g, 0.14, 0.14, 0.1, 0x2f2a24, 0.24, 0.35, 0.3, 8).rotation.x = Math.PI / 2; // 풀리
      const ind = B(g, 0.07, 0.05, 0.02, 0xffcc66, -0.3, 0.52, 0.29);
      ind.material.emissive = new THREE.Color(0xcc8822);
      ind.material.emissiveIntensity = 1; ind.userData.glow = true;
      for (const m of g.children) m.position.y -= 0.04; // #209: 프레임 받침 밑면이 0.04 부유 → 전체 4cm 하강 접지
      return g;
    }
  },
  /* ── cozy 확장 가구 (v1.4) ── */
  stove: {
    name: '장작 난로', nameEn: 'Wood Stove', emoji: '🔥', fp: { w: 1.0, d: 0.75 },
    colorNames: ['무쇠', '벽돌레드', '크림', '올리브'],
    colorNamesEn: ['Cast Iron', 'Brick Red', 'Cream', 'Olive'],
    colors: [0x3a3d42, 0x8a5138, 0xcfc8ba, 0x6a7047],
    // #196: T1 깡통 화덕은 최고점 0.58·화구 0.34 — y 0.7 고정이면 광원+헤일로가 공중 발광(실측 감사). T2/T3는 실루엣 내부라 유지.
    light: { color: 0xff7e2a, intensity: 14, dist: 8, y: 0.7, anchorByTier: { 1: { y: 0.40 } }, flicker: true, fuel: 'fuel', comfort: 12 }, // 디렉터 2026-07-15: 화기=주광원. 더 따뜻(색)·강하게(9→14) — 천장 형광등 하향과 짝
    tiered: true, // #157: T1 돌+깡통 화덕 → T2 녹슨 주물 → T3 현행. 화창 발광 y는 티어별(0.34/0.40/0.42) — 광원 앵커는 anchorByTier 참조.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const stone = 0x6a6660;
        for (const [x, z, s] of [[-0.32, 0.14, 0.2], [0.3, 0.18, 0.18], [-0.18, -0.22, 0.19], [0.2, -0.2, 0.17], [0.36, -0.02, 0.15], [-0.36, -0.05, 0.16]])
          B(g, s, 0.22, s, shade(stone, 0.9 + (x + z) * 0.1), x, 0.11, z);   // 둘러놓은 돌
        Cyl(g, 0.17, 0.19, 0.4, 0x55504a, 0, 0.32, 0, 10);                   // 그을린 깡통 몸통
        Cyl(g, 0.17, 0.17, 0.06, 0x2e2b28, 0, 0.55, 0, 10);                  // 검은 아가리
        const win = B(g, 0.2, 0.16, 0.03, 0xff9c46, 0, 0.34, 0.18);          // 작은 화구
        win.material.emissive = new THREE.Color(0xff7020);
        win.material.emissiveIntensity = 1.3; win.userData.glow = true;
        B(g, 0.5, 0.02, 0.4, 0x2e2b28, 0, 0.005, 0.3);                       // 바닥 그을음
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        const rust = 0x6e4a38;
        B(g, 0.82, 0.68, 0.56, shade(c, 0.8), 0, 0.4, 0);                    // 몸통(칙칙)
        B(g, 0.24, 0.2, 0.02, rust, -0.22, 0.55, 0.29);                      // 녹 얼룩 ①
        B(g, 0.18, 0.26, 0.02, shade(rust, 0.85), 0.26, 0.3, 0.29);          // 녹 얼룩 ②
        B(g, 0.9, 0.07, 0.62, shade(c, 0.7), 0, 0.05, 0);                    // 받침
        const win = B(g, 0.36, 0.26, 0.03, 0xff9c46, 0.03, 0.4, 0.29);       // 화창(삐뚤)
        win.material.emissive = new THREE.Color(0xff7020);
        win.material.emissiveIntensity = 1.3; win.userData.glow = true;
        const door = B(g, 0.46, 0.36, 0.04, shade(c, 0.62), 0.03, 0.4, 0.28); // 문틀 — 살짝 기욺
        door.rotation.z = 0.06;
        Cyl(g, 0.08, 0.08, 1.1, shade(c, 0.65), 0.26, 1.3, -0.1, 8).rotation.x = 0.05; // 연통(기욺·짧음)
        B(g, 0.82, 0.05, 0.56, shade(c, 0.95), 0, 0.76, 0);                  // 상판
        return g;
      }
      const g = new THREE.Group();
      B(g, 0.9, 0.75, 0.6, c, 0, 0.45, 0);                        // 몸통
      B(g, 0.96, 0.08, 0.66, shade(c, 0.8), 0, 0.06, 0);          // 받침
      for (const x of [-0.4, 0.4]) B(g, 0.08, 0.1, 0.5, 0x26282c, x, 0.05, 0);
      const win = B(g, 0.4, 0.3, 0.03, 0xff9c46, 0, 0.42, 0.31);  // 화창(火窓)
      win.material.emissive = new THREE.Color(0xff7020);
      win.material.emissiveIntensity = 1.3; win.userData.glow = true;
      B(g, 0.5, 0.4, 0.04, shade(c, 0.7), 0, 0.42, 0.3);          // 문틀
      B(g, 0.44, 0.06, 0.05, 0x26282c, 0, 0.24, 0.31);
      Cyl(g, 0.09, 0.09, 1.3, shade(c, 0.75), 0.28, 1.45, -0.12, 8); // 연통
      Cyl(g, 0.13, 0.11, 0.1, 0x26282c, 0.28, 2.12, -0.12, 8);
      B(g, 0.9, 0.05, 0.6, shade(c, 1.15), 0, 0.85, 0);           // 상판
      B(g, 0.26, 0.14, 0.2, 0x8a8f96, -0.24, 0.94, 0.05);         // 주전자
      Cyl(g, 0.03, 0.03, 0.1, 0x8a8f96, -0.1, 0.98, 0.05, 6).rotation.z = -0.8;
      return g;
    }
  },
  cushion: {
    name: '방석', nameEn: 'Cushion', emoji: '🧘', fp: { w: 0.65, d: 0.65 },
    colorNames: ['머스터드', '와인', '세이지', '인디고'],
    colorNamesEn: ['Mustard', 'Wine', 'Sage', 'Indigo'],
    colors: [0xbb9440, 0x8f4a4a, 0x8a9a78, 0x4a5680],
    tiered: true, // #157: T1 접어 쌓은 옷가지 → T2 해진 방석(납작·기움) → T3 현행 도톰.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        B(g, 0.55, 0.07, 0.5, shade(c, 0.6), 0, 0.035, 0);                   // 접은 옷 ①(바랜)
        const f2 = B(g, 0.48, 0.06, 0.44, shade(c, 0.75), 0.04, 0.1, -0.03); // 접은 옷 ②(어긋남)
        f2.rotation.y = 0.15;
        B(g, 0.4, 0.05, 0.36, 0x8a8474, -0.03, 0.155, 0.04);                 // 맨 위 회색 옷
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        const body = Cyl(g, 0.3, 0.34, 0.1, shade(c, 0.78), 0, 0.06, 0, 12); // 납작 꺼짐
        body.scale.z = 0.9; body.rotation.z = 0.04;                          // 살짝 기움
        B(g, 0.16, 0.02, 0.14, shade(c, 1.2), 0.08, 0.115, 0.06);            // 기운 헝겊 패치
        return g;
      }
      const g = new THREE.Group();
      const body = Cyl(g, 0.3, 0.34, 0.16, c, 0, 0.09, 0, 12);
      body.scale.z = 0.92;
      Cyl(g, 0.24, 0.28, 0.05, shade(c, 1.15), 0, 0.19, 0, 12);
      B(g, 0.05, 0.04, 0.05, shade(c, 0.7), 0, 0.22, 0);          // 단추
      return g;
    }
  },
  teatable: {
    name: '찻상', nameEn: 'Tea Table', emoji: '🍵', fp: { w: 0.95, d: 0.6 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    tiered: true, // #157: T1 뒤집은 나무상자 → T2 낡은 찻상·컵자국 → T3 현행. 상판 높이 동일.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const crate = 0x8a7550;
        B(g, 0.75, 0.06, 0.5, crate, 0, 0.27, 0);                            // 뒤집은 상자 밑판(=상판)
        for (const s of [-0.2, 0.2]) B(g, 0.72, 0.22, 0.05, shade(crate, 0.85), 0, 0.13, s); // 옆 널
        B(g, 0.05, 0.22, 0.5, shade(crate, 0.8), -0.34, 0.13, 0); B(g, 0.05, 0.22, 0.5, shade(crate, 0.82), 0.34, 0.13, 0);
        B(g, 0.24, 0.015, 0.2, shade(crate, 0.6), 0.18, 0.305, 0.08);        // 얼룩
        Cyl(g, 0.04, 0.03, 0.05, 0x8a8f96, -0.15, 0.33, -0.05, 8);           // 양철 컵 하나
        for (const m of g.children) m.position.y -= 0.02; // #209: 옆 널 밑면이 0.02 부유 → 전체 2cm 하강해 T2/T3(0)와 접지 일치(퍼치/스택 앵커 없음)
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        const topW = B(g, 0.9, 0.06, 0.55, shade(c, 0.78), 0, 0.3, 0);       // 바랜 상판(기움)
        topW.rotation.z = 0.02;
        for (const [i, [x, z]] of [[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]].entries())
          B(g, 0.06, i === 3 ? 0.24 : 0.28, 0.06, shade(c, 0.68), x, i === 3 ? 0.12 : 0.14, z); // 다리 하나 짧음
        const ring = Cyl(g, 0.05, 0.05, 0.005, shade(c, 0.5), -0.2, 0.335, 0.05, 10); // 컵자국 링 2
        ring.rotation.y = 0.2;
        Cyl(g, 0.04, 0.04, 0.005, shade(c, 0.55), 0.18, 0.335, -0.1, 10);
        Cyl(g, 0.04, 0.03, 0.05, shade(0x9dbcae, 0.8), 0.15, 0.36, -0.08, 8); // 이 빠진 찻잔 하나
        return g;
      }
      const g = new THREE.Group();
      B(g, 0.9, 0.06, 0.55, c, 0, 0.3, 0);
      for (const [x, z] of [[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]])
        B(g, 0.06, 0.28, 0.06, shade(c, 0.85), x, 0.14, z);
      Cyl(g, 0.08, 0.06, 0.1, 0xd8d3c8, -0.2, 0.38, 0.05, 8);     // 찻주전자
      Cyl(g, 0.025, 0.025, 0.06, 0xd8d3c8, -0.08, 0.36, 0.1, 6).rotation.z = -0.9;
      Cyl(g, 0.04, 0.03, 0.05, 0x9dbcae, 0.15, 0.36, -0.08, 8);   // 찻잔
      Cyl(g, 0.04, 0.03, 0.05, 0xc79a9a, 0.25, 0.36, 0.12, 8);
      return g;
    }
  },
  bookstack: {
    name: '책 더미', nameEn: 'Book Stack', emoji: '📖', fp: { w: 0.5, d: 0.5 },
    stackable: true,
    colorNames: ['모험담', '시집', '도감', '일기장'],
    colorNamesEn: ['Adventure', 'Poetry', 'Field Guide', 'Diary'],
    colors: [0xa8524e, 0x54688a, 0x6a7f5b, 0xb5764a],
    build(c, colorIdx = 0) {
      const g = new THREE.Group();
      const rand = seededRand(31 + colorIdx * 7);
      const pals = [c, shade(c, 0.8), 0xc4a35b, 0x8a5a7a, 0x6a7f5b];
      let y = 0;
      for (let i = 0; i < 6; i++) {
        const bw = 0.3 + rand() * 0.12, bd = 0.22 + rand() * 0.08, bh = 0.05 + rand() * 0.03;
        const b = B(g, bw, bh, bd, pals[Math.floor(rand() * pals.length)], (rand() - 0.5) * 0.08, y + bh / 2, (rand() - 0.5) * 0.08);
        b.rotation.y = (rand() - 0.5) * 0.6;
        y += bh;
      }
      const open = B(g, 0.3, 0.02, 0.2, 0xe8e2d2, 0.02, y + 0.02, 0); // 펼쳐진 책
      open.rotation.y = 0.3;
      return g;
    }
  },
  clock: {
    name: '괘종시계', nameEn: 'Grandfather Clock', emoji: '🕰️', fp: { w: 0.55, d: 0.4 },
    colorNames: ['마호가니', '오크', '블랙', '아이보리'],
    colorNamesEn: ['Mahogany', 'Oak', 'Black', 'Ivory'],
    colors: [0x6b4a32, 0xa07850, 0x3c3a38, 0xcfc8ba],
    build(c) {
      const g = new THREE.Group();
      B(g, 0.45, 1.75, 0.3, c, 0, 0.88, 0);                       // 본체
      B(g, 0.52, 0.1, 0.36, shade(c, 1.15), 0, 1.78, 0);          // 상단
      B(g, 0.52, 0.08, 0.36, shade(c, 0.8), 0, 0.04, 0);          // 받침
      const face = Cyl(g, 0.16, 0.16, 0.03, 0xe8e2d2, 0, 1.45, 0.16, 14);
      face.rotation.x = Math.PI / 2;
      B(g, 0.02, 0.1, 0.01, 0x26282c, 0, 1.48, 0.18);             // 시침/분침
      B(g, 0.07, 0.02, 0.01, 0x26282c, 0.03, 1.45, 0.18);
      B(g, 0.3, 0.6, 0.02, 0x1c1e24, 0, 0.7, 0.16);               // 진자창
      const pend = Cyl(g, 0.06, 0.06, 0.03, 0xb08a3a, 0, 0.55, 0.17, 10);
      pend.rotation.x = Math.PI / 2;
      Cyl(g, 0.012, 0.012, 0.35, 0xb08a3a, 0, 0.78, 0.17, 5);
      return g;
    }
  },
  lantern: {
    name: '걸이 랜턴', nameEn: 'Hanging Lantern', emoji: '🏮', fp: { w: 0.45, d: 0.45 },
    colorNames: ['황동', '무쇠', '레드', '민트'],
    colorNamesEn: ['Brass', 'Cast Iron', 'Red', 'Mint'],
    colors: [0xb08a3a, 0x4a4d52, 0xa8433f, 0x93b5a5],
    light: { color: 0xffb44e, intensity: 7.5, dist: 6, y: 1.15, flicker: true, fuel: 'candle', comfort: 7, gelable: true }, // 화기 강화(5→7.5) · #189 P3: 유리 하우징 — 젤 틴트 가능
    tiered: true, // #157: T1 나뭇가지+유리병 → T2 녹슨 랜턴(뿌연 유리) → T3 현행. 광원 y 공통.
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const stick = 0x6e5638;
        B(g, 0.3, 0.06, 0.3, shade(stick, 0.8), 0, 0.03, 0);                 // 판자 받침
        const pole = Cyl(g, 0.028, 0.035, 1.15, stick, 0, 0.62, 0, 5);       // 거친 막대(비스듬)
        pole.rotation.z = 0.05;
        Cyl(g, 0.01, 0.01, 0.22, 0x55504a, 0.2, 1.1, 0, 4).rotation.z = 1.1; // 철사 걸이
        Cyl(g, 0.085, 0.075, 0.2, 0x9aa89a, 0.28, 0.98, 0, 8);               // 유리병
        const glassJ = Cyl(g, 0.055, 0.055, 0.12, 0xffd898, 0.28, 0.97, 0, 8);
        glassJ.material.emissive = new THREE.Color(0xffaa40);
        glassJ.material.emissiveIntensity = 1.1; glassJ.userData.glow = true;
        Cyl(g, 0.05, 0.05, 0.03, 0x55504a, 0.28, 1.09, 0, 8);                // 병목 철사
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        const rust = shade(c, 0.62);
        Cyl(g, 0.14, 0.18, 0.05, rust, 0, 0.03, 0, 8);
        Cyl(g, 0.03, 0.03, 1.15, shade(c, 0.7), 0, 0.62, 0, 6);
        const arm = B(g, 0.3, 0.03, 0.03, rust, 0.13, 1.2, 0);
        arm.rotation.z = -0.08;                                              // 걸이 팔 처짐
        Cyl(g, 0.012, 0.012, 0.12, 0x26282c, 0.26, 1.12, 0, 5);
        B(g, 0.16, 0.2, 0.16, shade(c, 0.68), 0.26, 0.98, 0);                // 녹슨 몸체
        const glassD = B(g, 0.1, 0.12, 0.1, 0xd8c090, 0.26, 0.98, 0);        // 뿌연 유리(어둡게)
        glassD.material.emissive = new THREE.Color(0xcc8830);
        glassD.material.emissiveIntensity = 0.8; glassD.userData.glow = true;
        B(g, 0.1, 0.04, 0.1, rust, 0.26, 1.1, 0);
        return g;
      }
      const g = new THREE.Group();
      Cyl(g, 0.14, 0.18, 0.05, shade(c, 0.8), 0, 0.03, 0, 8);     // 받침
      Cyl(g, 0.03, 0.03, 1.15, shade(c, 0.9), 0, 0.62, 0, 6);     // 기둥
      const arm = B(g, 0.3, 0.03, 0.03, shade(c, 0.9), 0.13, 1.2, 0); // 걸이 팔
      Cyl(g, 0.012, 0.012, 0.12, 0x26282c, 0.26, 1.12, 0, 5);     // 사슬
      B(g, 0.16, 0.2, 0.16, c, 0.26, 0.98, 0);                    // 랜턴 몸체
      const glassL = B(g, 0.1, 0.12, 0.1, 0xffd898, 0.26, 0.98, 0);
      glassL.material.emissive = new THREE.Color(0xffaa40);
      glassL.material.emissiveIntensity = 1.2; glassL.userData.glow = true;
      B(g, 0.1, 0.04, 0.1, shade(c, 0.85), 0.26, 1.1, 0);         // 뚜껑
      return g;
    }
  },
  /* ── 고급 제작 가전 (Phase B — 후반 인플레 싱크) ── */
  heater: {
    name: '온풍기', nameEn: 'Space Heater', emoji: '♨️', fp: { w: 0.62, d: 0.5 },
    colorNames: ['오렌지', '크림', '슬레이트', '올리브'],
    colorNamesEn: ['Orange', 'Cream', 'Slate', 'Olive'],
    colors: [0xc9662f, 0xd9cdb2, 0x5a6068, 0x6a7047],
    appliance: { fuel: 'fuel', effect: 'heat', label: '한파 방어 + 겨울 쾌적 (연료 1/일)', labelEn: 'Cold-snap defense + winter comfort (fuel 1/day)' },
    build(c) {
      const g = new THREE.Group();
      B(g, 0.56, 0.46, 0.42, c, 0, 0.3, 0);                        // 몸체
      B(g, 0.6, 0.06, 0.46, shade(c, 0.8), 0, 0.04, 0);            // 받침
      for (const x of [-0.24, 0.24]) B(g, 0.06, 0.1, 0.36, 0x2f2a24, x, 0.05, 0); // 다리
      // 전면 발열 그릴 (달아오른 코일)
      const grill = B(g, 0.42, 0.3, 0.03, 0xff7a2c, 0, 0.32, 0.22);
      grill.material.emissive = new THREE.Color(0xff5a10);
      grill.material.emissiveIntensity = 1.3; grill.userData.glow = true;
      for (let i = 0; i < 4; i++) B(g, 0.38, 0.016, 0.01, 0x3a2418, 0, 0.22 + i * 0.06, 0.24); // 그릴살
      B(g, 0.5, 0.05, 0.36, shade(c, 1.12), 0, 0.56, 0);           // 상판
      Cyl(g, 0.03, 0.03, 0.09, 0x8a8f96, 0.16, 0.6, 0, 6);         // 다이얼
      const ind = B(g, 0.06, 0.04, 0.02, 0xffcc66, -0.2, 0.52, 0.22);
      ind.material.emissive = new THREE.Color(0xcc8822);
      ind.material.emissiveIntensity = 1; ind.userData.glow = true;
      return g;
    }
  },
  autopurifier: {
    name: '자동 급수기', nameEn: 'Auto Water Station', emoji: '⛲', fp: { w: 0.66, d: 0.62 },
    colorNames: ['스틸', '화이트', '틸', '네이비'],
    colorNamesEn: ['Steel', 'White', 'Teal', 'Navy'],
    colors: [0x8a8f96, 0xd4cfc2, 0x4a8a8a, 0x46557a],
    appliance: { fuel: 'battery', effect: 'water2', label: '매일 깨끗한 물 +2 (배터리 1/일)', labelEn: 'Clean water +2 daily (battery 1/day)' },
    build(c) {
      const g = new THREE.Group();
      B(g, 0.58, 0.6, 0.55, shade(c, 0.85), 0, 0.3, 0);            // 캐비닛
      B(g, 0.62, 0.06, 0.6, shade(c, 0.7), 0, 0.03, 0);            // 받침
      const tank = Cyl(g, 0.22, 0.24, 0.66, c, 0, 0.96, 0, 12);    // 큰 탱크
      const wat = Cyl(g, 0.18, 0.2, 0.5, 0x4a9ac0, 0, 0.9, 0, 12); // 물
      wat.material.emissive = new THREE.Color(0x2a5a80);
      wat.material.emissiveIntensity = 0.5; wat.userData.glow = true;
      Cyl(g, 0.14, 0.16, 0.08, shade(c, 0.9), 0, 1.32, 0, 12);     // 뚜껑
      // 이중 급수구
      Cyl(g, 0.045, 0.045, 0.14, 0x3f3a33, 0.2, 0.66, 0.16, 6).rotation.z = Math.PI / 2;
      Cyl(g, 0.045, 0.045, 0.14, 0x3f3a33, -0.2, 0.66, 0.16, 6).rotation.z = Math.PI / 2;
      B(g, 0.16, 0.1, 0.14, 0xd4cfc2, 0.24, 0.4, 0.16);            // 컵1
      B(g, 0.16, 0.1, 0.14, 0xd4cfc2, -0.24, 0.4, 0.16);           // 컵2
      const ind = B(g, 0.06, 0.04, 0.02, 0x88ccff, 0, 0.5, 0.28);
      ind.material.emissive = new THREE.Color(0x4499dd);
      ind.material.emissiveIntensity = 1; ind.userData.glow = true;
      return g;
    }
  },
  /* ── 소품 가구 (v1.0 꾸미기 확장 #13) — 절차 텍스처, 일러 재사용 없음 ── */
  frame: {
    name: '액자', nameEn: 'Framed Picture', emoji: '🖼️', fp: { w: 0.5, d: 0.3 },
    stackable: true, // 서랍장·선반 위에 올리는 탁상 액자
    colorNames: ['호두나무', '골드', '화이트', '슬레이트'],
    colorNamesEn: ['Walnut', 'Gold', 'White', 'Slate'],
    colors: [0x6b4a32, 0xb08a3a, 0xd4cfc2, 0x4a4d52],
    build(c, colorIdx = 0, sketch = null) {
      const g = new THREE.Group();
      const rand = seededRand(53 + colorIdx * 11);
      B(g, 0.44, 0.32, 0.04, c, 0, 0.5, 0);              // 프레임
      if (sketch) {
        // DDD-2 수집품 전시: 밤하늘 스케치를 건다 — 관측소 수집(SKETCHES)의 두 번째 보상.
        //   스케치별 복셀 모티프(일러스트 리소스 미사용, 풍경화와 같은 문법). id는 lore.js SKETCHES 키.
        B(g, 0.34, 0.24, 0.02, 0x101522, 0, 0.52, 0.021); // 밤하늘 패널
        const dot = (x, y, s, col) => B(g, s, s, 0.015, col, x, y, 0.032);
        if (sketch === 'meteor') { dot(-0.08, 0.60, 0.014, 0xfff2d6); dot(-0.02, 0.55, 0.05, 0xfff2d6); dot(0.06, 0.49, 0.014, 0xd8e2f0); dot(0.11, 0.45, 0.03, 0xfff2d6); }
        else if (sketch === 'aurora') { B(g, 0.05, 0.16, 0.015, 0x4a8a5a, -0.08, 0.54, 0.032); B(g, 0.05, 0.19, 0.015, 0x6aaa7a, 0, 0.53, 0.032); B(g, 0.05, 0.13, 0.015, 0x4a8a5a, 0.08, 0.55, 0.032); }
        else if (sketch === 'milkyway') { for (let i = 0; i < 7; i++) dot(-0.13 + i * 0.045, 0.44 + i * 0.026, i % 2 ? 0.012 : 0.02, i % 3 ? 0xd8e2f0 : 0x9ab0d0); }
        else if (sketch === 'moonhalo') { dot(0, 0.53, 0.05, 0xe8e4d8); dot(-0.07, 0.53, 0.012, 0x8a92a8); dot(0.07, 0.53, 0.012, 0x8a92a8); dot(0, 0.60, 0.012, 0x8a92a8); dot(0, 0.46, 0.012, 0x8a92a8); }
        else if (sketch === 'comet') { dot(0.09, 0.57, 0.032, 0xfff2d6); dot(0.03, 0.54, 0.018, 0xd8e2f0); dot(-0.03, 0.51, 0.014, 0xa8b8d0); dot(-0.08, 0.49, 0.01, 0x7a8aa8); }
        else if (sketch === 'satellite') { dot(0.05, 0.57, 0.02, 0xfff2d6); dot(-0.09, 0.47, 0.01, 0x8a92a8); dot(0.11, 0.44, 0.01, 0x8a92a8); }
        else { for (let i = 0; i < 5; i++) dot(-0.11 + i * 0.055, 0.45 + ((i * 37) % 17) * 0.01, 0.012, 0xd8e2f0); } // 폴백: 잔별
      } else {
        // 절차 풍경화 (하늘/지평선/언덕 3색 띠 — 일러스트 리소스 미사용)
        const artPals = [[0x8fb0cf, 0x6a8a5a, 0x4a6042], [0xc9a06a, 0x9a7a4a, 0x5a4a34], [0x9a8ab0, 0x6a7a8a, 0x44505a]];
        const pal = artPals[Math.floor(rand() * artPals.length)];
        B(g, 0.34, 0.14, 0.02, pal[0], 0, 0.57, 0.021);    // 하늘
        B(g, 0.34, 0.06, 0.02, pal[1], 0, 0.47, 0.021);    // 언덕
        B(g, 0.34, 0.04, 0.02, pal[2], 0, 0.42, 0.021);    // 땅
      }
      const easel = B(g, 0.06, 0.24, 0.06, shade(c, 0.8), 0, 0.14, -0.05); // 뒷받침
      easel.rotation.x = -0.3;
      return g;
    }
  },
  curtain: {
    name: '커튼', nameEn: 'Curtain', emoji: '🪟', fp: { w: 1.4, d: 0.25 }, noCollide: true,
    colorNames: ['리넨', '세이지', '버건디', '머스터드'],
    colorNamesEn: ['Linen', 'Sage', 'Burgundy', 'Mustard'],
    colors: [0xd6c9ab, 0x8a9a78, 0x7a3f42, 0xbb9440],
    tiered: true, // #157: T1 방수포+빨래집게 → T2 빛바랜 천·밑단 해짐 → T3 현행. 봉 높이 공통(1.8).
    build(c, ci, sk, tier) {
      if (tier === 1) {
        const g = new THREE.Group();
        const tarp = 0x5a7a8c;
        const wire = Cyl(g, 0.012, 0.012, 1.34, 0x55504a, 0, 1.8, 0, 5);     // 철사 줄(처짐)
        wire.rotation.z = Math.PI / 2 + 0.02;
        const p1 = B(g, 0.6, 1.35, 0.04, tarp, -0.3, 1.1, 0);                // 방수포 ①(구김)
        p1.rotation.y = 0.06; p1.castShadow = true;
        const p2 = B(g, 0.55, 1.25, 0.05, shade(tarp, 0.85), 0.28, 1.14, 0.01); // 방수포 ②(밑단 삐뚤)
        p2.rotation.z = -0.04; p2.castShadow = true;
        B(g, 0.3, 0.06, 0.06, shade(tarp, 0.7), 0.05, 1.0, 0.03);            // 겹쳐 접힌 자락
        for (const x of [-0.45, -0.05, 0.4]) B(g, 0.035, 0.07, 0.035, 0xb08a3a, x, 1.79, 0.01); // 빨래집게
        return g;
      }
      if (tier === 2) {
        const g = new THREE.Group();
        Cyl(g, 0.03, 0.03, 1.34, shade(0x55504a, 0.85), 0, 1.8, 0, 6).rotation.z = Math.PI / 2;
        for (const cap of [-0.68, 0.68]) Cyl(g, 0.05, 0.05, 0.05, shade(0x8a8f96, 0.8), cap, 1.8, 0, 8).rotation.z = Math.PI / 2;
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const px = side * (0.14 + i * 0.16);
            const hs = [1.34, 1.5, 1.42][i];                                 // 밑단 해짐 — 길이 들쭉날쭉
            const panel = B(g, 0.14, hs, 0.04 + (i % 2) * 0.03, shade(c, i % 2 ? 0.62 : 0.72), px, 1.8 - hs / 2, 0);
            panel.castShadow = true;
            if (i === 1) panel.rotation.y = side * 0.12;                     // 한 폭 젖혀짐
          }
        }
        B(g, 0.1, 0.16, 0.02, shade(c, 0.5), -0.3, 0.55, 0.03);              // 얼룩 자국
        return g;
      }
      const g = new THREE.Group();
      Cyl(g, 0.03, 0.03, 1.34, 0x55504a, 0, 1.8, 0, 6).rotation.z = Math.PI / 2; // 커튼봉
      for (const cap of [-0.68, 0.68]) Cyl(g, 0.05, 0.05, 0.05, 0x8a8f96, cap, 1.8, 0, 8).rotation.z = Math.PI / 2;
      // 주름진 천 패널 (좌/우 갈라진 커튼)
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const px = side * (0.14 + i * 0.16);
          const panel = B(g, 0.14, 1.5, 0.04 + (i % 2) * 0.03, i % 2 ? shade(c, 0.85) : c, px, 1.05, 0);
          panel.castShadow = true;
        }
      }
      return g;
    }
  },
  desklamp: {
    name: '책상 램프', nameEn: 'Desk Lamp', emoji: '🔦', fp: { w: 0.3, d: 0.3 },
    stackable: true, // 테이블·서랍장 위
    colorNames: ['그린', '블랙', '브라스', '크림'],
    colorNamesEn: ['Green', 'Black', 'Brass', 'Cream'],
    colors: [0x3a6a4a, 0x2f2a24, 0xb08a3a, 0xd9cdb2],
    light: { color: 0xffd090, intensity: 4, dist: 5, y: 0.5, fuel: 'battery', comfort: 5, gelable: true }, // #189 P3: 전기 갓 — 젤 틴트 가능
    build(c) {
      const g = new THREE.Group();
      Cyl(g, 0.11, 0.13, 0.04, shade(c, 0.8), 0, 0.02, 0, 10);   // 받침
      const arm1 = Cyl(g, 0.02, 0.02, 0.32, shade(c, 0.9), -0.02, 0.18, 0, 6); arm1.rotation.z = 0.35;
      const arm2 = Cyl(g, 0.02, 0.02, 0.26, shade(c, 0.9), 0.08, 0.36, 0, 6); arm2.rotation.z = -0.7;
      const shade1 = Cyl(g, 0.06, 0.11, 0.13, c, 0.2, 0.46, 0, 10); shade1.rotation.z = -1.1;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffe6b0, emissive: 0xffcc70, emissiveIntensity: 1 }));
      bulb.position.set(0.22, 0.4, 0); bulb.userData.glow = true; g.add(bulb);
      return g;
    }
  },
  // #189 P4 LED 라이트 바 — 초희귀 도면. 화기(따뜻·흔들림)의 대척: 선명·안정·컬러(젤 틴트).
  //   폐허에 남은 마지막 신문물 — 표현 스펙트럼의 끝. 발광 스트립·광원이 젤 색을 그대로 받는다.
  ledbar: {
    name: 'LED 라이트 바', nameEn: 'LED Light Bar', emoji: '💠', fp: { w: 0.4, d: 0.4 },
    colorNames: ['그래파이트', '실버', '화이트', '네이비'],
    colorNamesEn: ['Graphite', 'Silver', 'White', 'Navy'],
    colors: [0x3a3d42, 0xb9bec6, 0xd8d8d4, 0x46557a],
    light: { color: 0xdfeaff, intensity: 9, dist: 8, y: 0.95, fuel: 'battery', comfort: 8, gelable: true }, // 무점멸 — 안정광
    build(c) {
      const g = new THREE.Group();
      Cyl(g, 0.16, 0.19, 0.05, shade(c, 0.7), 0, 0.025, 0, 10);              // 원형 베이스
      B(g, 0.07, 1.7, 0.07, shade(c, 0.85), 0, 0.9, 0);                      // 바디 프레임
      const strip = B(g, 0.035, 1.6, 0.02, 0xeaf4ff, 0, 0.92, 0.045);        // 발광 스트립
      strip.material.emissive = new THREE.Color(0xdfeaff);
      strip.material.emissiveIntensity = 1.6; strip.userData.glow = true;
      B(g, 0.075, 0.05, 0.075, shade(c, 0.6), 0, 1.78, 0);                   // 탑 캡
      B(g, 0.05, 0.02, 0.05, 0x1c1e22, 0.09, 0.06, 0.06);                    // 전원 버튼
      return g;
    },
    // #192 클로즈업 — 방열 홈·LED 다이오드 열·디퓨저 레일·케이블·고무 패드. 실루엣·발광 스트립은 build 동일.
    closeup(c) {
      const g = new THREE.Group();
      Cyl(g, 0.16, 0.19, 0.05, shade(c, 0.7), 0, 0.025, 0, 24);              // 베이스(고세그)
      Cyl(g, 0.185, 0.195, 0.012, 0x1c1e22, 0, 0.006, 0, 24);                // 고무 패드
      B(g, 0.07, 1.7, 0.07, shade(c, 0.85), 0, 0.9, 0);                      // 바디
      for (const hx of [-0.026, 0.026]) B(g, 0.012, 1.62, 0.072, shade(c, 0.62), hx, 0.9, 0); // 방열 홈 2줄
      for (const hy of [0.3, 0.62, 0.94, 1.26, 1.58]) B(g, 0.072, 0.014, 0.072, shade(c, 0.6), 0, hy, 0); // 분절 링
      for (const rx of [-0.024, 0.024]) B(g, 0.012, 1.6, 0.03, shade(c, 0.5), rx, 0.92, 0.042); // 디퓨저 레일
      const strip = B(g, 0.035, 1.6, 0.02, 0xeaf4ff, 0, 0.92, 0.045);
      strip.material.emissive = new THREE.Color(0xdfeaff);
      strip.material.emissiveIntensity = 1.6; strip.userData.glow = true;
      for (let i = 0; i < 16; i++) {                                          // LED 다이오드 점열(코어 위 고휘도 점)
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.008),
          new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.2 }));
        d.position.set(0, 0.18 + i * 0.1, 0.056); d.userData.glow = true; g.add(d);
      }
      B(g, 0.075, 0.05, 0.075, shade(c, 0.6), 0, 1.78, 0);                   // 탑 캡
      B(g, 0.05, 0.03, 0.05, shade(c, 0.45), 0, 1.815, 0);                   // 캡 상단 단
      B(g, 0.05, 0.02, 0.05, 0x1c1e22, 0.09, 0.06, 0.06);                    // 전원 버튼
      B(g, 0.014, 0.01, 0.014, 0x8fc45a, 0.09, 0.072, 0.06);                 // 전원 파일럿 점
      B(g, 0.05, 0.024, 0.062, 0xd8d4cc, 0, 1.42, 0.038);                    // 사양 라벨
      const CABLE = [[0.05, 0.1, 0.05, 0.3], [0.09, 0.06, 0.08, 0.7], [0.14, 0.035, 0.1, 1.1]]; // 늘어진 전원 케이블
      for (const [cx, cy2, cz, rz] of CABLE) B(g, 0.014, 0.07, 0.014, 0x24262a, cx, cy2, cz).rotation.z = rz;
      return g;
    }
  },
  firstaidbox: {
    name: '구급상자', nameEn: 'First-Aid Box', emoji: '🧰', fp: { w: 0.5, d: 0.35 },
    stackable: true, // 벽걸이 대신 선반/서랍 위 배치 (관통 회피)
    colorNames: ['화이트', '레드', '올리브', '스틸'],
    colorNamesEn: ['White', 'Red', 'Olive', 'Steel'],
    colors: [0xd8d4cc, 0xa8433f, 0x6a7047, 0x8a8f96],
    build(c) {
      const g = new THREE.Group();
      // #209: 전체 5cm 부유였다(본체 밑면 0.05) → 전 메시 −0.05로 밑면 0 접지(선반 위에서도 상판에 밀착).
      B(g, 0.44, 0.3, 0.3, c, 0, 0.15, 0);                       // 본체
      B(g, 0.46, 0.06, 0.32, shade(c, 0.85), 0, 0.31, 0);        // 뚜껑 테두리
      B(g, 0.12, 0.02, 0.02, 0xa8433f, 0, 0.19, 0.16);          // 적십자 (가로)
      B(g, 0.02, 0.12, 0.02, 0xa8433f, 0, 0.19, 0.16);          // 적십자 (세로)
      B(g, 0.14, 0.05, 0.04, shade(c, 0.7), 0, 0.32, 0);        // 손잡이
      return g;
    }
  },
  mirror: {
    name: '전신 거울', nameEn: 'Standing Mirror', emoji: '🪞', fp: { w: 0.5, d: 0.35 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    build(c) {
      const g = new THREE.Group();
      B(g, 0.4, 1.5, 0.06, c, 0, 0.78, 0);                       // 프레임
      const glass = B(g, 0.3, 1.34, 0.02, 0xaeb8bf, 0, 0.78, 0.03); // 거울면
      glass.material.emissive = new THREE.Color(0x3a4750);
      glass.material.emissiveIntensity = 0.35; glass.userData.glow = true;
      // 반사 하이라이트 (사선 밴드)
      const hi = B(g, 0.06, 1.0, 0.01, 0xdfe6ea, -0.05, 0.85, 0.041); hi.rotation.z = 0.12;
      // 받침 다리 — #209: 회전(x0.2) 포함 실측 최저코너가 -0.163이라 다리 밑이 10.3cm 매몰이었다.
      //   중심 y를 0.163으로 올려 다리 밑동을 바닥(0)에 접지(프레임은 발 위 3cm = '발 달린 거울'로 자연).
      for (const sx of [-0.16, 0.16]) { const leg = B(g, 0.05, 0.3, 0.16, shade(c, 0.8), sx, 0.163, 0); leg.rotation.x = 0.2; }
      return g;
    }
  },
  /* ── #76 「지식과 사치」 사치 가구 — 책(지식)을 재료로 짓는다. 살아남은 뒤에야 갖는 것들 ── */
  globe: {
    name: '골동품 지구본', nameEn: 'Antique Globe', emoji: '🌐', fp: { w: 0.5, d: 0.5 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    build(c) {
      const g = new THREE.Group();
      Cyl(g, 0.17, 0.19, 0.03, shade(c, 0.85), 0, 0.02, 0, 14);          // 바닥 원반
      for (let i = 0; i < 3; i++) {                                       // 삼각 다리
        const a = (i / 3) * Math.PI * 2;
        const leg = Cyl(g, 0.02, 0.03, 0.52, c, Math.cos(a) * 0.13, 0.28, Math.sin(a) * 0.13, 6);
        leg.rotation.z = -Math.cos(a) * 0.14; leg.rotation.x = Math.sin(a) * 0.14;
      }
      const ax = 0.42; // 지축 기울기 (rad)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.011, 6, 22), lamb(0xb08a3a)); // 자오선 링(황동)
      ring.position.set(0, 0.68, 0); ring.rotation.y = 0.5; ring.rotation.x = ax; ring.castShadow = true; g.add(ring);
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12), lamb(0x35617e));       // 바다
      globe.position.set(0, 0.68, 0); globe.rotation.z = ax; globe.castShadow = true; g.add(globe);
      for (const [x, y, z] of [[0.09, 0.75, 0.06], [-0.07, 0.63, 0.11], [0.04, 0.6, -0.12], [-0.1, 0.72, -0.06]]) {
        const land = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 0), lamb(0x5f8a52));       // 대륙 얼룩
        land.position.set(x, y, z); land.scale.set(1, 0.55, 1); g.add(land);
      }
      Cyl(g, 0.012, 0.012, 0.12, 0xb08a3a, 0, 0.79, 0, 6);              // 지축 상단 축
      return g;
    }
  },
  phonograph: {
    name: '축음기', nameEn: 'Phonograph', emoji: '🎶', fp: { w: 0.6, d: 0.55 },
    colorNames: WOODS.names, colorNamesEn: WOODS.namesEn, colors: WOODS.colors,
    build(c) {
      const g = new THREE.Group();
      B(g, 0.5, 0.28, 0.45, c, 0, 0.36, 0);                             // 목재 캐비닛
      B(g, 0.54, 0.05, 0.49, shade(c, 1.12), 0, 0.52, 0);               // 상판
      for (const [x, z] of [[-0.2, -0.17], [0.2, -0.17], [-0.2, 0.17], [0.2, 0.17]])
        B(g, 0.05, 0.2, 0.05, shade(c, 0.8), x, 0.12, z);               // 다리
      Cyl(g, 0.13, 0.13, 0.02, 0x2a2622, -0.05, 0.56, 0, 18);           // 턴테이블(검은 레코드)
      Cyl(g, 0.025, 0.025, 0.02, 0xb08a3a, -0.05, 0.57, 0, 8);          // 스핀들
      const arm = Cyl(g, 0.012, 0.012, 0.2, 0xb0b0b0, 0.06, 0.6, 0.05, 6); arm.rotation.z = 0.8; arm.rotation.y = 0.4; // 톤암
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 14, 1, true), lamb(0xc9a24a)); // 황동 나팔
      horn.material.side = THREE.DoubleSide;
      horn.position.set(0.14, 0.78, 0.05); horn.rotation.z = -0.7; horn.rotation.x = -0.35; horn.castShadow = true; g.add(horn);
      Cyl(g, 0.02, 0.02, 0.16, 0xb08a3a, 0.03, 0.64, 0.02, 6).rotation.z = 0.7;  // 나팔 연결관
      const crank = Cyl(g, 0.015, 0.015, 0.12, 0x3a3530, 0.27, 0.36, 0, 6); crank.rotation.z = Math.PI / 2; // 크랭크
      for (const m of g.children) m.position.y -= 0.02; // #209: 다리 밑면이 0.02 부유 → 전체 2cm 하강 접지
      return g;
    }
  },
  candelabra: {
    name: '촛대', nameEn: 'Candelabra', emoji: '🕎', fp: { w: 0.5, d: 0.5 },
    stackable: true, // 테이블·서랍장 위에도
    colorNames: ['황동', '실버', '블랙', '앤티크골드'],
    colorNamesEn: ['Brass', 'Silver', 'Black', 'Antique Gold'],
    colors: [0xb08a3a, 0xbfc3c8, 0x3a3733, 0x9a7d3a],
    light: { color: 0xffb060, intensity: 6, dist: 6, y: 1.3, flicker: true, fuel: 'candle', comfort: 9 },
    build(c) {
      const g = new THREE.Group();
      Cyl(g, 0.16, 0.2, 0.06, shade(c, 0.8), 0, 0.03, 0, 12);           // 받침
      Cyl(g, 0.05, 0.09, 0.08, shade(c, 0.9), 0, 0.1, 0, 10);           // 받침 노드(장식)
      Cyl(g, 0.03, 0.03, 1.0, c, 0, 0.6, 0, 8);                         // 기둥
      Cyl(g, 0.055, 0.055, 0.06, shade(c, 1.1), 0, 0.62, 0, 10);        // 중간 노드
      const cup = (cx, cy, cz = 0) => {                                  // 초컵 + 초 + 불꽃
        Cyl(g, 0.055, 0.04, 0.03, c, cx, cy, cz, 10);                   // 접시(드립 트레이)
        Cyl(g, 0.03, 0.035, 0.12, 0xf0e8d0, cx, cy + 0.08, cz, 8);      // 초
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 6),
          new THREE.MeshLambertMaterial({ color: 0xffd487, emissive: 0xffaa40, emissiveIntensity: 1.5 }));
        fl.position.set(cx, cy + 0.19, cz); fl.userData.glow = true; g.add(fl);
      };
      // 좌우 갈래 팔 — S자로 크게 뻗는다(가지 촛대 실루엣). 팔 끝을 수직 올림대로 세워 초를 든다.
      //   디렉터 신고(2026-07-09): 구 -side 기울기는 바깥 끝이 아래로 처져 올림대 바닥과 0.18 떠 있었다 —
      //   +side로 뒤집으면 안쪽 끝은 기둥(y0.93)에, 바깥 끝은 올림대 바닥(y1.11)에 정확히 닿는다.
      for (const side of [-1, 1]) {
        const arm = B(g, 0.44, 0.035, 0.035, shade(c, 1.05), side * 0.2, 1.02, 0); arm.rotation.z = side * 0.42;
        Cyl(g, 0.03, 0.03, 0.14, c, side * 0.38, 1.18, 0, 6);          // 팔 끝 수직 올림대
        cup(side * 0.38, 1.26);                                         // 좌우 초 (중앙보다 낮게)
      }
      // #209: 중앙 올림대 상단(1.25)과 초 접시 하단(1.305) 사이 5.5cm 공중 갭 — h 0.18→0.24·중심 1.16→1.19로 상단 1.31이 접시를 0.005 물게(cup 좌표 불변).
      Cyl(g, 0.03, 0.03, 0.24, c, 0, 1.19, 0, 8);                       // 중앙 올림대
      cup(0, 1.32);                                                      // 중앙 초 (가장 높이)
      return g;
    }
  },

  /* ── DDD-4 지역 시그니처 8종 (REWARD-LOOP ② 2차 — 디렉터 확정 2026-07-09) ──
     도면(blueprint) 드랍으로만 제작이 열리는 지역 독점 장식. 파워 0(코지 안전선) — 전부 순수 치장.
     발광류(화로·네온)는 emissive 재질만(전원·연료 유지비 없음). 기대 세움류는 noCollide(벽에 붙여 배치). */
  // 슬럼 ① 드럼통 화로 — 슬럼의 밤 그 자체. 탄 드럼통 + 장작 + 불꽃(자기발광)
  barrelfire: {
    name: '드럼통 화로', nameEn: 'Barrel Fire', emoji: '🛢️', fp: { w: 0.7, d: 0.7 },
    colorNames: ['방청 레드', '올리브 드럼', '재 그레이', '슬레이트'],
    colorNamesEn: ['Red Oxide', 'Olive Drum', 'Ash Gray', 'Slate'],
    colors: [0xa8433f, 0x6a7047, 0x8a8f96, 0x46557a],
    build(c) {
      const g = new THREE.Group();
      const drum = Cyl(g, 0.3, 0.3, 0.62, c, 0, 0.31, 0, 12); drum.castShadow = true;
      Cyl(g, 0.31, 0.31, 0.04, shade(c, 0.7), 0, 0.06, 0, 12);   // 하단 림
      Cyl(g, 0.31, 0.31, 0.04, shade(c, 0.7), 0, 0.58, 0, 12);   // 상단 림
      B(g, 0.16, 0.1, 0.03, 0x1c1a17, 0, 0.42, 0.295);           // 그을린 절개부
      // 삐져나온 장작 + 불꽃(자기발광 — 광원 없음, 재질만)
      const log = Cyl(g, 0.035, 0.035, 0.5, 0x5a4632, 0.12, 0.66, 0.05, 6); log.rotation.z = 0.6;
      const fl = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 6),
        new THREE.MeshLambertMaterial({ color: 0xffb050, emissive: 0xff7a20, emissiveIntensity: 1.4 }));
      fl.position.set(0, 0.76, 0); fl.userData.glow = true; g.add(fl);
      const fl2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 5),
        new THREE.MeshLambertMaterial({ color: 0xffd487, emissive: 0xffaa40, emissiveIntensity: 1.6 }));
      fl2.position.set(0.07, 0.72, 0.04); fl2.userData.glow = true; g.add(fl2);
      return g;
    },
    // #192 발견 컷 전용 클로즈업 등급 (폴리 예산 4~5k) — 실루엣·팔레트는 build와 동일 규약.
    //   골 주름·리벳·녹/그을음·통풍 절개(내부 잉걸 발광)·수북한 잉걸·복셀 화염 다층·엠버.
    closeup(c) {
      const g = new THREE.Group();
      const seg = 28;
      const drum = Cyl(g, 0.3, 0.3, 0.62, c, 0, 0.31, 0, seg); drum.castShadow = true;
      Cyl(g, 0.312, 0.312, 0.045, shade(c, 0.7), 0, 0.06, 0, seg);   // 하단 림
      Cyl(g, 0.312, 0.312, 0.045, shade(c, 0.7), 0, 0.58, 0, seg);   // 상단 림
      for (const ry of [0.17, 0.31, 0.45]) Cyl(g, 0.305, 0.305, 0.018, shade(c, 0.86), 0, ry, 0, seg); // 골 주름 3줄
      for (const ry of [0.06, 0.58]) for (let i = 0; i < 14; i++) {   // 림 리벳
        const a = (i / 14) * Math.PI * 2;
        B(g, 0.018, 0.018, 0.018, shade(c, 0.5), Math.cos(a) * 0.312, ry, Math.sin(a) * 0.312);
      }
      // 녹 얼룩·그을음 패치 — 표면에 얇은 사각 패치(결정론 배치)
      const RUST = [[0.8, 0.14, 0.05, 0.09], [2.1, 0.38, 0.07, 0.12], [3.4, 0.22, 0.06, 0.07], [4.6, 0.48, 0.05, 0.1], [5.5, 0.12, 0.08, 0.06]];
      for (const [a, y, w, h] of RUST) {
        const p = B(g, w, h, 0.006, shade(0x6a4a30, 0.9), Math.cos(a) * 0.301, y, Math.sin(a) * 0.301);
        p.rotation.y = -a + Math.PI / 2;
      }
      const CHAR = [[1.5, 0.52, 0.1, 0.08], [2.8, 0.55, 0.13, 0.06], [4.9, 0.53, 0.09, 0.07]]; // 상단 화염 그을음
      for (const [a, y, w, h] of CHAR) {
        const p = B(g, w, h, 0.006, 0x241f1a, Math.cos(a) * 0.301, y, Math.sin(a) * 0.301);
        p.rotation.y = -a + Math.PI / 2;
      }
      // 통풍 절개부 — 안쪽 잉걸빛이 새어나온다 (배치본의 검은 절개부 자리 그대로)
      B(g, 0.16, 0.1, 0.02, 0x1c1a17, 0, 0.42, 0.297);
      const ventGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.07),
        new THREE.MeshLambertMaterial({ color: 0xffa040, emissive: 0xff6a18, emissiveIntensity: 1.3 }));
      ventGlow.position.set(0, 0.42, 0.292); ventGlow.userData.glow = true; g.add(ventGlow);
      for (let i = -1; i <= 1; i++) B(g, 0.016, 0.11, 0.02, shade(c, 0.55), i * 0.05, 0.42, 0.298); // 그릴 바 3개
      // 내부: 검은 내벽 + 수북한 잉걸(발광 큐브 클러스터)
      Cyl(g, 0.27, 0.27, 0.05, 0x141210, 0, 0.585, 0, seg);
      const COALS = [[0, 0.62, 0, 0.09], [0.09, 0.615, 0.05, 0.07], [-0.08, 0.61, -0.04, 0.08], [0.03, 0.63, -0.09, 0.06], [-0.05, 0.625, 0.08, 0.05], [0.12, 0.61, -0.06, 0.05]];
      for (const [x, y, z, s] of COALS) {
        const coal = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.7, s),
          new THREE.MeshLambertMaterial({ color: 0xff8838, emissive: 0xdd4a10, emissiveIntensity: 1.1 }));
        coal.position.set(x, y, z); coal.rotation.y = x * 7; coal.userData.glow = true; g.add(coal);
      }
      // 장작 2개 — 육각 통나무 + 밝은 절단면 + 탄 끝
      const mkLog = (x, y, z, rz, ry, len) => {
        const log = Cyl(g, 0.036, 0.036, len, 0x5a4632, x, y, z, 7); log.rotation.z = rz; log.rotation.y = ry;
        const cap = new THREE.Mesh(new THREE.CircleGeometry(0.034, 7), new THREE.MeshLambertMaterial({ color: 0x9a8060 }));
        cap.position.set(0, len / 2 + 0.001, 0); cap.rotation.x = -Math.PI / 2; log.add(cap);
        const burnt = Cyl(log, 0.037, 0.037, 0.09, 0x241d16, 0, -len / 2 + 0.045, 0, 7);
        return log;
      };
      mkLog(0.12, 0.66, 0.05, 0.6, 0.2, 0.5);
      mkLog(-0.1, 0.63, -0.03, -0.5, 1.9, 0.42);
      // 복셀 화염 — 원뿔 대신 다층 스택 박스 (핫코어→외염 팔레트), 배치본 화염과 같은 자리·높이
      const FLAME = [
        [0.16, 0.10, 0.62, 0, 0, 0xff7a20, 1.3], [0.13, 0.09, 0.70, 0.02, 0.15, 0xffb050, 1.45],
        [0.10, 0.09, 0.78, -0.02, 0.3, 0xffb050, 1.5], [0.075, 0.08, 0.85, 0.015, 0.5, 0xffd487, 1.6],
        [0.05, 0.07, 0.91, -0.01, 0.2, 0xffe8b0, 1.7], [0.03, 0.05, 0.96, 0.01, 0.4, 0xfff4d8, 1.8],
      ];
      for (const [w, h, y, xo, ry, col, ei] of FLAME) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, w),
          new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: ei }));
        f.position.set(xo, y, xo * 0.6); f.rotation.y = ry; f.userData.glow = true; g.add(f);
      }
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05),  // 곁불 혀
        new THREE.MeshLambertMaterial({ color: 0xffb050, emissive: 0xff8a28, emissiveIntensity: 1.5 }));
      tongue.position.set(0.11, 0.68, 0.02); tongue.rotation.y = 0.5; tongue.userData.glow = true; g.add(tongue);
      // 떠오르는 엠버 5립
      const EMBER = [[0.06, 0.98, 0.03], [-0.05, 1.06, -0.02], [0.02, 1.14, 0.05], [-0.03, 1.2, 0.01], [0.05, 1.26, -0.04]];
      for (const [x, y, z] of EMBER) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.016),
          new THREE.MeshLambertMaterial({ color: 0xffc060, emissive: 0xff9030, emissiveIntensity: 2 }));
        e.position.set(x, y, z); e.userData.glow = true; g.add(e);
      }
      return g;
    }
  },
  // 슬럼 ② 그래피티 패널 — 뜯어온 합판에 남은 스프레이 태그. 벽에 기대 세운다.
  graffiti: {
    name: '그래피티 패널', nameEn: 'Graffiti Panel', emoji: '🎨', fp: { w: 1.0, d: 0.3 }, noCollide: true,
    colorNames: ['네온 핑크', '라임', '시안', '선셋 오렌지'],
    colorNamesEn: ['Neon Pink', 'Lime', 'Cyan', 'Sunset Orange'],
    colors: [0xd4548a, 0x8fc45a, 0x4aa8b8, 0xd4854a],
    build(c, colorIdx = 0) {
      const g = new THREE.Group();
      const panel = B(g, 1.0, 1.1, 0.05, 0x8a7a5c, 0, 0.58, 0); panel.rotation.x = -0.09; panel.castShadow = true; // 기대 세운 합판
      // 「GANG」 — 바이올렛 위 네이비 그림자 이중 레이어 (디렉터 확정 2026-07-09: 두 색 겹쳐 쓰기)
      const VIOLET = 0x9a5ad4, NAVY = 0x2f3a55;
      const gseg = (x, y, w, h) => {
        const sh2 = B(g, w, h, 0.018, NAVY, x + 0.022, y - 0.022, 0.042); sh2.rotation.x = -0.09;   // 그림자 레이어(남색, 오프셋)
        const tp = B(g, w, h, 0.018, VIOLET, x, y, 0.052); tp.rotation.x = -0.09;                    // 본획(보라)
      };
      const CY = 0.72, H = 0.3, T = 0.05;
      // G
      gseg(-0.36, CY, T, H); gseg(-0.29, CY + 0.125, 0.12, T); gseg(-0.29, CY - 0.125, 0.12, T); gseg(-0.24, CY - 0.06, T, 0.09); gseg(-0.27, CY - 0.01, 0.07, T);
      // A
      gseg(-0.13, CY, T, H); gseg(-0.03, CY, T, H); gseg(-0.08, CY + 0.125, 0.1, T); gseg(-0.08, CY - 0.02, 0.1, T);
      // N
      gseg(0.07, CY, T, H); gseg(0.17, CY, T, H); gseg(0.12, CY + 0.04, 0.06, T);
      // G
      gseg(0.27, CY, T, H); gseg(0.34, CY + 0.125, 0.12, T); gseg(0.34, CY - 0.125, 0.12, T); gseg(0.39, CY - 0.06, T, 0.09); gseg(0.36, CY - 0.01, 0.07, T);
      // 색상 변형(colorIdx)은 포인트 획으로 — 밑줄 스프레이 + 흘러내린 물감 (도감 4색 보존)
      const und = B(g, 0.7, 0.06, 0.02, c, 0, 0.5, 0.048); und.rotation.x = -0.09;
      const t3 = B(g, 0.06, 0.16, 0.02, shade(c, 1.2), -0.12, 0.38, 0.048); t3.rotation.x = -0.09;
      const t4 = B(g, 0.05, 0.1, 0.02, shade(c, 0.85), 0.2, 0.35, 0.048); t4.rotation.x = -0.09;
      for (const m of g.children) m.position.y -= 0.03; // #209: 기대 세운 합판 밑변(틸트 -0.09 실측 최저 0.03)이 부유 → 전체 3cm 하강 접지(closeup 별건)
      return g;
    },
    // #192 클로즈업 — 합판 나뭇결·뜯긴 모서리·스테이플·오버스프레이·물감 드립. 실루엣·GANG 레이아웃은 build 동일.
    closeup(c) {
      const g = new THREE.Group();
      const p = new THREE.Group(); p.rotation.x = -0.09; g.add(p); // 기대 세움 틸트를 서브그룹으로 — build와 같은 각
      const panel = B(p, 1.0, 1.1, 0.05, 0x8a7a5c, 0, 0.58, 0); panel.castShadow = true;
      for (let i = 0; i < 6; i++) B(p, 1.0, 0.012, 0.052, shade(0x8a7a5c, i % 2 ? 0.92 : 1.06), 0, 0.13 + i * 0.18, 0); // 나뭇결 줄
      B(p, 0.05, 0.05, 0.052, 0x6a5c42, -0.475, 1.1, 0);   // 좌상단 뜯김
      B(p, 0.07, 0.03, 0.052, 0x6a5c42, 0.465, 0.06, 0);   // 우하단 뜯김
      B(p, 0.04, 0.06, 0.052, 0x6a5c42, 0.48, 0.9, 0);
      for (const [sx, sy] of [[-0.44, 0.16], [-0.42, 1.02], [0.44, 0.2], [0.42, 1.05], [0.0, 0.08]])
        B(p, 0.022, 0.008, 0.056, 0x9a9fa0, sx, sy, 0);   // 스테이플
      // 합판 측면 적층 줄(3겹)
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) B(p, 0.004, 1.1, 0.014, shade(0x8a7a5c, 0.8 + i * 0.12), side * 0.5, 0.58, -0.017 + i * 0.017);
      const VIOLET = 0x9a5ad4, NAVY = 0x2f3a55;
      const gseg = (x, y, w, h) => {
        B(p, w + 0.02, h + 0.02, 0.014, shade(VIOLET, 0.45), x + 0.01, y - 0.01, 0.036); // 오버스프레이 헤일로(어두운 확산)
        B(p, w, h, 0.018, NAVY, x + 0.022, y - 0.022, 0.042);
        B(p, w, h, 0.018, VIOLET, x, y, 0.052);
      };
      const CY = 0.72, H = 0.3, T = 0.05;
      gseg(-0.36, CY, T, H); gseg(-0.29, CY + 0.125, 0.12, T); gseg(-0.29, CY - 0.125, 0.12, T); gseg(-0.24, CY - 0.06, T, 0.09); gseg(-0.27, CY - 0.01, 0.07, T);
      gseg(-0.13, CY, T, H); gseg(-0.03, CY, T, H); gseg(-0.08, CY + 0.125, 0.1, T); gseg(-0.08, CY - 0.02, 0.1, T);
      gseg(0.07, CY, T, H); gseg(0.17, CY, T, H); gseg(0.12, CY + 0.04, 0.06, T);
      gseg(0.27, CY, T, H); gseg(0.34, CY + 0.125, 0.12, T); gseg(0.34, CY - 0.125, 0.12, T); gseg(0.39, CY - 0.06, T, 0.09); gseg(0.36, CY - 0.01, 0.07, T);
      // 물감 드립 — 획 하단에서 흘러내린 가는 기둥(끝에 방울)
      for (const [dx, dl] of [[-0.36, 0.14], [-0.13, 0.1], [0.07, 0.18], [0.27, 0.12], [0.17, 0.08]]) {
        B(p, 0.014, dl, 0.016, shade(VIOLET, 0.85), dx, CY - H / 2 - dl / 2, 0.05);
        B(p, 0.022, 0.022, 0.016, shade(VIOLET, 0.8), dx, CY - H / 2 - dl - 0.005, 0.05);
      }
      // 포인트 획(colorIdx 색 보존) + 드립
      B(p, 0.7, 0.06, 0.02, c, 0, 0.5, 0.048);
      B(p, 0.06, 0.16, 0.02, shade(c, 1.2), -0.12, 0.38, 0.048);
      B(p, 0.05, 0.1, 0.02, shade(c, 0.85), 0.2, 0.35, 0.048);
      for (const [dx, dl] of [[-0.3, 0.09], [0.08, 0.12], [0.31, 0.07]]) B(p, 0.012, dl, 0.018, shade(c, 0.9), dx, 0.47 - dl / 2, 0.049);
      // 구석 잔태그 — 작은 X + 화살표 낙서(흰 초크 톤)
      B(p, 0.09, 0.014, 0.016, 0xd8d4cc, -0.36, 0.2, 0.05).rotation.z = 0.6;
      B(p, 0.09, 0.014, 0.016, 0xd8d4cc, -0.36, 0.2, 0.05).rotation.z = -0.6;
      B(p, 0.12, 0.014, 0.016, 0xd8d4cc, 0.32, 0.16, 0.05);
      B(p, 0.04, 0.014, 0.016, 0xd8d4cc, 0.365, 0.185, 0.05).rotation.z = -0.7;
      B(p, 0.04, 0.014, 0.016, 0xd8d4cc, 0.365, 0.135, 0.05).rotation.z = 0.7;
      return g;
    }
  },
  // 리조트 ① 스키 한 쌍 — 벽에 기대 교차 세운 낡은 스키
  skis: {
    name: '스키 한 쌍', nameEn: 'Pair of Skis', emoji: '🎿', fp: { w: 0.5, d: 0.3 }, noCollide: true,
    colorNames: ['체리 레드', '빙하 블루', '머스터드', '민트'],
    colorNamesEn: ['Cherry Red', 'Glacier Blue', 'Mustard', 'Mint'],
    colors: [0xa8433f, 0x54688a, 0xb08a3a, 0x93b5a5],
    build(c) {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        const ski = new THREE.Group();
        B(ski, 0.11, 1.5, 0.04, c, 0, 0.75, 0);                        // 판
        B(ski, 0.11, 0.1, 0.05, shade(c, 0.75), 0, 1.48, 0.012);      // 팁(위로 젖힘 흉내)
        B(ski, 0.09, 0.14, 0.06, 0x3a3d42, 0, 0.7, 0.02);             // 바인딩
        ski.position.set(side * 0.11, 0, 0); ski.rotation.z = side * 0.1; ski.rotation.x = -0.12; // 기대 세움 + 팔자 교차
        g.add(ski);
      }
      return g;
    },
    // #192 클로즈업 — 팁 계단 라운드·금속 엣지·데크 그래픽·바인딩 디테일·스크래치. 실루엣(팔자 교차)은 build 동일.
    closeup(c) {
      const g = new THREE.Group();
      const METAL = 0xb9bec6;
      for (const side of [-1, 1]) {
        const ski = new THREE.Group();
        B(ski, 0.11, 1.5, 0.045, c, 0, 0.75, 0);
        for (const ex of [-1, 1]) B(ski, 0.012, 1.5, 0.048, METAL, ex * 0.049, 0.75, 0);        // 금속 엣지 좌우
        // 팁 계단 라운드 3단(위로 젖힘) + 테일 킥 1단
        B(ski, 0.1, 0.07, 0.05, c, 0, 1.53, 0.014);
        B(ski, 0.085, 0.05, 0.05, shade(c, 0.9), 0, 1.585, 0.034);
        B(ski, 0.06, 0.035, 0.05, shade(c, 0.75), 0, 1.62, 0.058);
        B(ski, 0.095, 0.05, 0.05, shade(c, 0.85), 0, -0.015, 0.012);
        // 데크 그래픽 — 중앙 스트라이프 + 브랜드 블록 + 스티커
        B(ski, 0.045, 1.1, 0.02, shade(c, 1.25), 0, 0.8, 0.026);
        B(ski, 0.07, 0.11, 0.02, shade(c, 0.65), 0, 1.32, 0.027);
        B(ski, 0.05, 0.04, 0.02, 0xd8d4cc, side * 0.015, 0.28, 0.028);                          // 낡은 스티커
        B(ski, 0.04, 0.03, 0.02, shade(c, 0.55), -side * 0.02, 0.2, 0.028);
        // 바인딩 — 토/힐 피스 + 스트랩 + 버클
        B(ski, 0.09, 0.07, 0.075, 0x3a3d42, 0, 0.76, 0.02);                                     // 토 피스
        B(ski, 0.09, 0.06, 0.065, shade(0x3a3d42, 1.2), 0, 0.62, 0.018);                        // 힐 피스
        B(ski, 0.1, 0.025, 0.08, 0x24262a, 0, 0.7, 0.022);                                      // 스트랩
        B(ski, 0.024, 0.02, 0.02, METAL, 0.035, 0.7, 0.055);                                    // 버클
        B(ski, 0.05, 0.02, 0.06, METAL, 0, 0.79, 0.05);                                         // 토 클립
        // 스크래치(밝은 가는 줄)·칩(어두운 노치) — 하부 위주
        for (const [sy2, rot] of [[0.42, 0.3], [0.34, -0.2], [0.15, 0.15], [0.5, -0.35]]) {
          const sc = B(ski, 0.008, 0.1, 0.021, shade(c, 1.45), side * 0.02, sy2, 0.026); sc.rotation.z = rot;
        }
        B(ski, 0.02, 0.03, 0.048, shade(c, 0.5), side * 0.045, 0.1, 0);                          // 엣지 칩
        B(ski, 0.016, 0.024, 0.048, shade(c, 0.5), -side * 0.048, 0.98, 0);
        ski.position.set(side * 0.11, 0, 0); ski.rotation.z = side * 0.1; ski.rotation.x = -0.12;
        g.add(ski);
      }
      return g;
    }
  },
  // 리조트 ② 스키 폴대 — 바스켓 링이 남은 폴 한 쌍
  skipoles: {
    name: '스키 폴대', nameEn: 'Ski Poles', emoji: '⛷️', fp: { w: 0.4, d: 0.25 }, noCollide: true,
    colorNames: ['레이싱 레드', '네이비', '크롬', '올리브'],
    colorNamesEn: ['Racing Red', 'Navy', 'Chrome', 'Olive'],
    colors: [0xa8433f, 0x46557a, 0xb0b4ba, 0x6a7047],
    build(c) {
      const g = new THREE.Group();
      for (const side of [-1, 1]) {
        const pole = new THREE.Group();
        Cyl(pole, 0.018, 0.018, 1.15, c, 0, 0.575, 0, 6);              // 샤프트
        Cyl(pole, 0.035, 0.028, 0.09, shade(c, 0.7), 0, 1.12, 0, 8);   // 그립
        Cyl(pole, 0.075, 0.075, 0.02, 0x3a3d42, 0, 0.14, 0, 8);        // 바스켓 링
        pole.position.set(side * 0.08, 0, 0); pole.rotation.z = side * 0.08; pole.rotation.x = -0.1;
        g.add(pole);
      }
      return g;
    },
    // #192 클로즈업 — 그립 홈·스트랩 루프·바스켓 스포크·카바이드 팁·스티커 밴드. 실루엣은 build 동일.
    closeup(c) {
      const g = new THREE.Group();
      const METAL = 0xb9bec6;
      for (const side of [-1, 1]) {
        const pole = new THREE.Group();
        Cyl(pole, 0.018, 0.018, 1.15, c, 0, 0.575, 0, 14);                    // 샤프트(고세그)
        Cyl(pole, 0.035, 0.028, 0.09, shade(c, 0.7), 0, 1.12, 0, 14);         // 그립
        for (let i = 0; i < 3; i++) Cyl(pole, 0.0365, 0.0365, 0.01, shade(c, 0.5), 0, 1.095 + i * 0.025, 0, 14); // 손가락 홈
        Cyl(pole, 0.03, 0.035, 0.016, shade(c, 0.55), 0, 1.165, 0, 14);       // 그립 톱캡
        // 스트랩 루프 — 가는 박스 3개로 고리 흉내(그립 뒤로 늘어짐)
        B(pole, 0.014, 0.16, 0.03, 0x6a5c48, side * 0.03, 1.05, -0.045);
        B(pole, 0.014, 0.12, 0.03, shade(0x6a5c48, 0.85), side * 0.055, 1.0, -0.06);
        B(pole, 0.05, 0.014, 0.03, 0x6a5c48, side * 0.042, 0.94, -0.052);
        // 스티커 밴드 2 + 흠집
        Cyl(pole, 0.019, 0.019, 0.05, 0xd8d4cc, 0, 0.86, 0, 12);
        Cyl(pole, 0.019, 0.019, 0.03, shade(c, 1.3), 0, 0.78, 0, 12);
        B(pole, 0.006, 0.09, 0.02, shade(c, 1.4), 0.014, 0.5, 0.008);         // 긁힘
        B(pole, 0.006, 0.06, 0.02, shade(c, 0.55), -0.013, 0.32, -0.006);
        // 바스켓 — 링 + 스포크 6 + 카바이드 팁
        Cyl(pole, 0.075, 0.075, 0.018, 0x3a3d42, 0, 0.14, 0, 16);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const sp = B(pole, 0.055, 0.012, 0.012, shade(0x3a3d42, 1.25), Math.cos(a) * 0.038, 0.14, Math.sin(a) * 0.038);
          sp.rotation.y = -a;
        }
        Cyl(pole, 0.012, 0.017, 0.1, METAL, 0, 0.06, 0, 10);                  // 팁 슬리브
        Cyl(pole, 0.004, 0.011, 0.035, shade(METAL, 0.6), 0, 0.012, 0, 8);    // 카바이드 촉
        pole.position.set(side * 0.08, 0, 0); pole.rotation.z = side * 0.08; pole.rotation.x = -0.1;
        g.add(pole);
      }
      return g;
    }
  },
  // 리조트 ③ 스노우보드 — 벽에 기대 세운 보드 (복셀 라운드 — 끝단 계단)
  snowboard: {
    name: '스노우보드', nameEn: 'Snowboard', emoji: '🏂', fp: { w: 0.5, d: 0.3 }, noCollide: true,
    colorNames: ['선셋', '딥 퍼플', '아이스 블루', '라임'],
    colorNamesEn: ['Sunset', 'Deep Purple', 'Ice Blue', 'Lime'],
    colors: [0xc9662f, 0x9a8ab0, 0x93a8bb, 0x8fc45a],
    build(c) {
      const g = new THREE.Group();
      const bd = new THREE.Group();
      B(bd, 0.34, 1.3, 0.05, c, 0, 0.72, 0);                           // 몸판
      B(bd, 0.26, 0.09, 0.05, c, 0, 1.41, 0);                          // 상단 라운드(계단)
      B(bd, 0.26, 0.09, 0.05, c, 0, 0.03, 0);                          // 하단 라운드
      B(bd, 0.3, 0.5, 0.02, shade(c, 1.25), 0, 0.85, 0.03);            // 데크 그래픽 밴드
      B(bd, 0.1, 0.12, 0.06, 0x3a3d42, 0, 1.0, 0.03);                  // 바인딩 위
      B(bd, 0.1, 0.12, 0.06, 0x3a3d42, 0, 0.5, 0.03);                  // 바인딩 아래
      bd.rotation.x = -0.12; g.add(bd);                                 // 기대 세움
      return g;
    },
    // #192 클로즈업 — 라운드 3단·금속 엣지·선셋 그래픽 모자이크·하이백 바인딩·스티커/스크래치. 실루엣은 build 동일.
    closeup(c) {
      const g = new THREE.Group();
      const bd = new THREE.Group();
      const METAL = 0xb9bec6, DARK = 0x24262a;
      B(bd, 0.34, 1.3, 0.05, c, 0, 0.72, 0);
      for (const ex of [-1, 1]) B(bd, 0.014, 1.3, 0.052, METAL, ex * 0.163, 0.72, 0);           // 금속 엣지
      // 라운드 3단(상·하) — build의 2박스 계단을 더 잘게
      B(bd, 0.28, 0.07, 0.05, c, 0, 1.405, 0); B(bd, 0.2, 0.05, 0.05, shade(c, 0.92), 0, 1.465, 0); B(bd, 0.12, 0.035, 0.05, shade(c, 0.8), 0, 1.507, 0);
      B(bd, 0.28, 0.07, 0.05, c, 0, 0.035, 0); B(bd, 0.2, 0.05, 0.05, shade(c, 0.92), 0, -0.025, 0); B(bd, 0.12, 0.035, 0.05, shade(c, 0.8), 0, -0.067, 0);
      // 데크 그래픽 — 선셋 밴드(하늘 3톤) + 산 능선 모자이크 + 해
      B(bd, 0.3, 0.2, 0.02, shade(c, 1.25), 0, 1.0, 0.03);
      B(bd, 0.3, 0.16, 0.02, shade(c, 1.45), 0, 0.82, 0.03);
      B(bd, 0.3, 0.14, 0.02, shade(c, 1.1), 0, 0.67, 0.03);
      const RIDGE = [[-0.12, 0.74, 0.06, 0.1], [-0.04, 0.72, 0.07, 0.14], [0.05, 0.73, 0.06, 0.09], [0.12, 0.71, 0.05, 0.12]];
      for (const [rx, ry2, rw, rh] of RIDGE) B(bd, rw, rh, 0.022, shade(c, 0.45), rx, ry2, 0.031);   // 능선 실루엣
      B(bd, 0.055, 0.055, 0.022, 0xffd487, 0.08, 0.95, 0.031);                                        // 해(비발광 — 배치본에 발광 없음)
      B(bd, 0.3, 0.02, 0.023, shade(c, 0.5), 0, 0.6, 0.03);                                           // 그래픽 하단 마감줄
      // 바인딩 2 — 베이스+하이백+앵클/토 스트랩+래칫
      const bind = (by) => {
        B(bd, 0.12, 0.13, 0.05, DARK, 0, by, 0.035);                                                  // 베이스 플레이트
        const hb = B(bd, 0.1, 0.12, 0.03, shade(DARK, 1.3), 0, by + 0.09, 0.055); hb.rotation.x = 0.35; // 하이백
        B(bd, 0.13, 0.028, 0.06, 0x3a3d42, 0, by + 0.03, 0.05);                                       // 앵클 스트랩
        B(bd, 0.11, 0.024, 0.055, 0x3a3d42, 0, by - 0.04, 0.048);                                     // 토 스트랩
        B(bd, 0.024, 0.02, 0.02, METAL, 0.055, by + 0.03, 0.075);                                     // 래칫
        for (const dx of [-0.03, 0.03]) B(bd, 0.014, 0.014, 0.014, METAL, dx, by, 0.062);             // 디스크 볼트
      };
      bind(1.0); bind(0.5);
      // 스티커·스크래치·칩
      B(bd, 0.07, 0.05, 0.021, 0xd8d4cc, -0.09, 0.3, 0.03);
      B(bd, 0.05, 0.04, 0.021, shade(c, 0.6), 0.1, 0.22, 0.03);
      for (const [sy2, rot] of [[0.15, 0.4], [0.36, -0.25], [1.22, 0.2]]) {
        const sc = B(bd, 0.008, 0.12, 0.021, shade(c, 1.5), 0.05, sy2, 0.03); sc.rotation.z = rot;
      }
      B(bd, 0.022, 0.03, 0.052, shade(c, 0.45), -0.165, 0.45, 0);                                     // 엣지 칩
      bd.rotation.x = -0.12; g.add(bd);
      return g;
    }
  },
  // 도심 ① 네온 사인 「VIP ZONE」 — 보라 계열 튜브(자기발광). 받침 프레임에 기대 세운다.
  neonvip: {
    name: '네온 사인 · VIP ZONE', nameEn: 'Neon Sign · VIP ZONE', emoji: '🍸', fp: { w: 0.9, d: 0.3 }, noCollide: true,
    selfLit: true, // #195: build()가 PointLight를 내장한 실광원 — 무광원 폴백·needsLight 판정에 산입(쾌적 가산은 0 유지: 시그니처=파워 아님)
    colorNames: ['바이올렛', '마젠타', '핑크', '블루 바이올렛'],
    colorNamesEn: ['Violet', 'Magenta', 'Pink', 'Blue Violet'],
    colors: [0x9a5ad4, 0xc44aa8, 0xd46a9a, 0x6a5ad4],
    build(c) {
      const g = new THREE.Group();
      const bk = B(g, 0.9, 0.62, 0.05, 0x16141c, 0, 0.62, 0); bk.rotation.x = -0.07; bk.castShadow = true; // 검은 패널
      const neonMat = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 });
      const seg = (x, y, w, h) => { const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), neonMat); s.position.set(x, y, 0.045); s.rotation.x = -0.07; s.userData.glow = true; g.add(s); return s; };
      // V I P — 글자만 크게 (디렉터 2026-07-09: 밑줄 제거, VIP 단독)
      // V = 대각 두 획 (디렉터 2026-07-17: 기둥+밑바 구성이 'U'로 읽히던 것 교정)
      seg(-0.2325, 0.655, 0.045, 0.32).rotation.z = 0.19;
      seg(-0.1775, 0.655, 0.045, 0.32).rotation.z = -0.19;
      seg(-0.02, 0.64, 0.045, 0.34);                                                                 // I
      seg(0.12, 0.64, 0.045, 0.34); seg(0.21, 0.755, 0.14, 0.045); seg(0.21, 0.63, 0.14, 0.045); seg(0.26, 0.695, 0.045, 0.09); // P
      // 실제 광원 (디렉터 2026-07-09): 상시 점광 — 주변 벽·바닥에 네온 빛이 번진다 (그림자 없음, 유지비 0)
      const lt = new THREE.PointLight(c, 1.1, 3.6, 1.7); lt.position.set(0, 0.66, 0.35); g.add(lt);
      return g;
    },
    // #192 클로즈업 — 금속 프레임·마운트 볼트·튜브 이중층(코어+새들 클립)·늘어진 배선·트랜스박스. VIP 레이아웃 build 동일.
    closeup(c) {
      const g = new THREE.Group();
      const p = new THREE.Group(); p.rotation.x = -0.07; g.add(p);
      const METAL = 0x8a8f96;
      const bk = B(p, 0.9, 0.62, 0.05, 0x16141c, 0, 0.62, 0); bk.castShadow = true;
      for (const ey of [0.315, -0.315]) B(p, 0.92, 0.02, 0.055, shade(METAL, 0.7), 0, 0.62 + ey, 0);   // 상하 프레임 몰딩
      for (const ex of [-0.46, 0.46]) B(p, 0.02, 0.66, 0.055, shade(METAL, 0.7), ex, 0.62, 0);         // 좌우 몰딩
      for (const [bx, by] of [[-0.42, 0.9], [0.42, 0.9], [-0.42, 0.34], [0.42, 0.34]])
        B(p, 0.024, 0.024, 0.058, shade(METAL, 1.1), bx, by, 0);                                       // 마운트 볼트 4
      for (const [dx, dy, dw, dh] of [[-0.25, 0.44, 0.1, 0.05], [0.3, 0.82, 0.08, 0.04], [0.05, 0.38, 0.06, 0.06]])
        B(p, dw, dh, 0.052, 0x221f28, dx, dy, 0);                                                      // 표면 얼룩(먼지·그을음)
      const seg = (x, y, w, h, dim, rz = 0) => {
        const sh2 = B(p, w + 0.014, h + 0.014, 0.024, shade(c, 0.35), x, y, 0.038);                    // 튜브 외피(어두운 유리)
        if (rz) sh2.rotation.z = rz;
        const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03),
          new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: dim ? 0.45 : 1.6 }));
        s.position.set(x, y, 0.05); if (rz) s.rotation.z = rz; s.userData.glow = true; p.add(s);
        // 새들 클립 — 긴 수직 획에만(대각 획 제외)
        if (h > 0.2 && !rz) B(p, w + 0.03, 0.016, 0.02, METAL, x, y, 0.036);
      };
      // V I P — build와 동일 조형(V=대각 두 획). P의 우측 세로획 하나만 반죽음(폐허의 네온 — 실루엣 불변)
      seg(-0.2325, 0.655, 0.045, 0.32, false, 0.19); seg(-0.1775, 0.655, 0.045, 0.32, false, -0.19);
      seg(-0.02, 0.64, 0.045, 0.34);
      seg(0.12, 0.64, 0.045, 0.34); seg(0.21, 0.755, 0.14, 0.045); seg(0.21, 0.63, 0.14, 0.045); seg(0.26, 0.695, 0.045, 0.09, true);
      // 배선 — 패널 하단→트랜스 박스 연속 케이블(겹침 세그먼트 — 점선처럼 끊기면 안 된다, 1차 캡처 검거)
      for (let i = 0; i < 10; i++) {
        const t = i / 9, x = -0.3 + 0.28 * t, y = 0.31 - 0.215 * t - Math.sin(Math.PI * t) * 0.05;
        const w = B(p, 0.016, 0.06, 0.016, 0x24222a, x, y, 0.012 + 0.01 * Math.sin(Math.PI * t));
        w.rotation.z = 0.9 - 0.9 * t;
      }
      B(p, 0.12, 0.07, 0.05, shade(METAL, 0.55), 0, 0.05, 0.02);                                       // 트랜스 박스
      B(p, 0.02, 0.014, 0.052, 0x8fc45a, 0.035, 0.06, 0.021);                                          // 파일럿 LED(비발광 점)
      const lt = new THREE.PointLight(c, 1.1, 3.6, 1.7); lt.position.set(0, 0.66, 0.35); g.add(lt);    // 배치본과 동일 광원
      return g;
    }
  },
  // 도심 ② 네온 사인 「ON AIR」 — 파랑 계열. 죽은 방송국의 파편.
  neonair: {
    name: '네온 사인 · ON AIR', nameEn: 'Neon Sign · ON AIR', emoji: '🎙️', fp: { w: 0.9, d: 0.3 }, noCollide: true,
    selfLit: true, // #195: neonvip와 동일 — 실광원 판정 산입, 쾌적 가산 없음
    colorNames: ['일렉트릭 블루', '시안', '아쿠아', '인디고'],
    colorNamesEn: ['Electric Blue', 'Cyan', 'Aqua', 'Indigo'],
    colors: [0x4a7ad4, 0x4aa8b8, 0x5ac4b0, 0x5a5ad4],
    build(c) {
      const g = new THREE.Group();
      const bk = B(g, 0.9, 0.5, 0.05, 0x14161c, 0, 0.56, 0); bk.rotation.x = -0.07; bk.castShadow = true;
      const neonMat = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 });
      const seg = (x, y, w, h) => { const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), neonMat); s.position.set(x, y, 0.045); s.rotation.x = -0.07; s.userData.glow = true; g.add(s); return s; };
      // O N   A I R — 다섯 글자 전부 픽셀 튜브 (디렉터 2026-07-09: "ON"만은 금지, 무조건 ON AIR)
      const CY = 0.6, H = 0.2, T = 0.032;
      // O
      seg(-0.37, CY, T, H); seg(-0.27, CY, T, H); seg(-0.32, CY + 0.09, 0.08, T); seg(-0.32, CY - 0.09, 0.08, T);
      // N (좌우 기둥 + 실제 대각 획 — 디렉터 2026-07-17: 가로바 구성이 'H'로 읽히던 것 교정)
      seg(-0.19, CY, T, H); seg(-0.09, CY, T, H); seg(-0.14, CY, T, 0.21).rotation.z = 0.46;
      // A (좌우 기둥 + 상단·중간 바)
      seg(0.03, CY, T, H); seg(0.13, CY, T, H); seg(0.08, CY + 0.09, 0.08, T); seg(0.08, CY - 0.01, 0.08, T);
      // I
      seg(0.21, CY, T, H);
      // R (좌기둥 + 상단·중간 바 + 우상단 기둥 + 대각 다리 — 다리도 사선이 R답다)
      seg(0.29, CY, T, H); seg(0.345, CY + 0.09, 0.09, T); seg(0.345, CY, 0.09, T); seg(0.39, CY + 0.045, T, 0.09); seg(0.3725, CY - 0.05, T, 0.12).rotation.z = 0.5;
      // 실제 광원 (디렉터 2026-07-09): 상시 점광 — 파란 빛이 주변에 번진다 (그림자 없음, 유지비 0)
      const lt = new THREE.PointLight(c, 1.1, 3.6, 1.7); lt.position.set(0, 0.6, 0.35); g.add(lt);
      return g;
    },
    // #192 클로즈업 — neonvip와 같은 문법(프레임·볼트·튜브 이중층·배선). ON AIR 레이아웃 build 동일, R 다리 반죽음.
    closeup(c) {
      const g = new THREE.Group();
      const p = new THREE.Group(); p.rotation.x = -0.07; g.add(p);
      const METAL = 0x8a8f96;
      const bk = B(p, 0.9, 0.5, 0.05, 0x14161c, 0, 0.56, 0); bk.castShadow = true;
      for (const ey of [0.26, -0.26]) B(p, 0.92, 0.02, 0.055, shade(METAL, 0.7), 0, 0.56 + ey, 0);
      for (const ex of [-0.46, 0.46]) B(p, 0.02, 0.54, 0.055, shade(METAL, 0.7), ex, 0.56, 0);
      for (const [bx, by] of [[-0.42, 0.78], [0.42, 0.78], [-0.42, 0.34], [0.42, 0.34]])
        B(p, 0.024, 0.024, 0.058, shade(METAL, 1.1), bx, by, 0);
      for (const [dx, dy, dw, dh] of [[0.28, 0.42, 0.09, 0.05], [-0.32, 0.72, 0.07, 0.04]])
        B(p, dw, dh, 0.052, 0x1e2028, dx, dy, 0);
      const seg = (x, y, w, h, dim, rz = 0) => {
        const sh2 = B(p, w + 0.012, h + 0.012, 0.024, shade(c, 0.35), x, y, 0.038);
        if (rz) sh2.rotation.z = rz;
        const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03),
          new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: dim ? 0.45 : 1.6 }));
        s.position.set(x, y, 0.05); if (rz) s.rotation.z = rz; s.userData.glow = true; p.add(s);
        if (h > 0.15 && !rz) B(p, w + 0.026, 0.014, 0.02, METAL, x, y, 0.036);
      };
      const CY = 0.6, H = 0.2, T = 0.032;
      seg(-0.37, CY, T, H); seg(-0.27, CY, T, H); seg(-0.32, CY + 0.09, 0.08, T); seg(-0.32, CY - 0.09, 0.08, T);
      seg(-0.19, CY, T, H); seg(-0.09, CY, T, H); seg(-0.14, CY, T, 0.21, false, 0.46);   // N 대각(build 동일 조형)
      seg(0.03, CY, T, H); seg(0.13, CY, T, H); seg(0.08, CY + 0.09, 0.08, T); seg(0.08, CY - 0.01, 0.08, T);
      seg(0.21, CY, T, H);
      seg(0.29, CY, T, H); seg(0.345, CY + 0.09, 0.09, T); seg(0.345, CY, 0.09, T); seg(0.39, CY + 0.045, T, 0.09); seg(0.3725, CY - 0.05, T, 0.12, true, 0.5); // R 대각 다리(반죽음 유지)
      // 연속 케이블 — neonvip와 동일 문법(점선 금지)
      for (let i = 0; i < 10; i++) {
        const t = i / 9, x = 0.32 - 0.23 * t, y = 0.29 - 0.195 * t - Math.sin(Math.PI * t) * 0.045;
        const w = B(p, 0.016, 0.06, 0.016, 0x22242a, x, y, 0.012 + 0.01 * Math.sin(Math.PI * t));
        w.rotation.z = -(0.9 - 0.9 * t);
      }
      B(p, 0.12, 0.07, 0.05, shade(METAL, 0.55), 0.06, 0.05, 0.02);
      B(p, 0.02, 0.014, 0.052, 0x8fc45a, 0.095, 0.06, 0.021);
      const lt = new THREE.PointLight(c, 1.1, 3.6, 1.7); lt.position.set(0, 0.6, 0.35); g.add(lt);
      return g;
    }
  },
  // 도심 ③ 양복 랙 — 행거 스탠드에 걸린 재킷. 폐허 이전의 출근길.
  suit: {
    name: '양복 랙', nameEn: 'Suit Rack', emoji: '👔', fp: { w: 0.7, d: 0.4 },
    colorNames: ['차콜', '네이비', '버건디', '카멜'],
    colorNamesEn: ['Charcoal', 'Navy', 'Burgundy', 'Camel'],
    colors: [0x3a3d42, 0x2f3a55, 0x6a3a3f, 0x9a7a4a],
    build(c) {
      const g = new THREE.Group();
      Cyl(g, 0.18, 0.18, 0.03, 0x4a4640, 0, 0.02, 0, 10);              // 받침
      Cyl(g, 0.02, 0.02, 1.5, 0x6a6660, 0, 0.75, 0, 6);                // 기둥
      B(g, 0.5, 0.025, 0.025, 0x6a6660, 0, 1.48, 0);                   // 가로 봉
      // 옷걸이 + 재킷 (어깨/몸판/팔) + 안에 받쳐 입은 셔츠
      B(g, 0.36, 0.05, 0.06, 0x8a7a5c, 0, 1.4, 0);                     // 옷걸이 어깨
      const jk = (w, h, x, y, z2, col) => { const m = B(g, w, h, 0.09, col, x, y, z2); m.castShadow = true; return m; };
      jk(0.4, 0.14, 0, 1.3, 0, c);                                     // 어깨판
      jk(0.34, 0.5, 0, 1.02, 0, c);                                    // 몸판
      B(g, 0.06, 0.34, 0.02, 0xe8e4d8, 0, 1.1, 0.05);                  // 셔츠 브이라인
      B(g, 0.03, 0.22, 0.022, shade(c, 0.6), 0, 1.08, 0.055);          // 타이
      jk(0.09, 0.42, -0.21, 1.06, 0, shade(c, 0.9));                   // 왼팔
      jk(0.09, 0.42, 0.21, 1.06, 0, shade(c, 0.9));                    // 오른팔
      return g;
    },
    // #192 클로즈업 — 라펠·단추·행커치프·소맷단·옷 주름·후크 디테일. 실루엣(스탠드+재킷)은 build 동일.
    closeup(c) {
      const g = new THREE.Group();
      const METAL = 0xb0b4ba;
      Cyl(g, 0.18, 0.18, 0.03, 0x4a4640, 0, 0.02, 0, 20);              // 받침(고세그)
      Cyl(g, 0.19, 0.19, 0.012, shade(0x4a4640, 0.7), 0, 0.006, 0, 20);// 받침 하단 몰딩
      Cyl(g, 0.02, 0.02, 1.5, 0x6a6660, 0, 0.75, 0, 10);               // 기둥
      for (const cy of [0.5, 1.0]) Cyl(g, 0.028, 0.028, 0.025, shade(0x6a6660, 0.75), 0, cy, 0, 10); // 이음 칼라 2
      B(g, 0.5, 0.025, 0.025, 0x6a6660, 0, 1.48, 0);                   // 가로 봉
      for (const ex of [-0.25, 0.25]) B(g, 0.02, 0.035, 0.035, shade(0x6a6660, 0.7), ex, 1.48, 0); // 봉 끝 캡
      // 옷걸이 — 어깨목 + 후크(작은 박스 체인 곡선)
      B(g, 0.36, 0.05, 0.06, 0x8a7a5c, 0, 1.4, 0);
      B(g, 0.016, 0.05, 0.016, METAL, 0, 1.45, 0);
      B(g, 0.03, 0.016, 0.016, METAL, 0.012, 1.475, 0);
      B(g, 0.016, 0.028, 0.016, METAL, 0.026, 1.463, 0);
      const jk = (w, h, x, y, z2, col) => { const m = B(g, w, h, 0.09, col, x, y, z2); m.castShadow = true; return m; };
      jk(0.4, 0.14, 0, 1.3, 0, c);                                     // 어깨판
      jk(0.34, 0.5, 0, 1.02, 0, c);                                    // 몸판
      // 라펠 — V자 어두운 패널 2 + 스티치 라인
      const lp1 = B(g, 0.09, 0.3, 0.02, shade(c, 0.8), -0.075, 1.16, 0.052); lp1.rotation.z = 0.32;
      const lp2 = B(g, 0.09, 0.3, 0.02, shade(c, 0.8), 0.075, 1.16, 0.052); lp2.rotation.z = -0.32;
      B(g, 0.06, 0.34, 0.02, 0xe8e4d8, 0, 1.1, 0.05);                  // 셔츠 브이
      for (const sx of [-0.045, 0.045]) { const cl = B(g, 0.05, 0.05, 0.022, 0xf2eee2, sx, 1.245, 0.052); cl.rotation.z = sx > 0 ? -0.5 : 0.5; } // 셔츠 칼라
      B(g, 0.03, 0.22, 0.022, shade(c, 0.6), 0, 1.08, 0.055);          // 타이
      B(g, 0.04, 0.035, 0.024, shade(c, 0.5), 0, 1.2, 0.056);          // 타이 노트
      for (const ty of [1.14, 1.05]) B(g, 0.032, 0.012, 0.023, shade(c, 0.75), 0, ty, 0.0555); // 타이 사선 스트라이프
      for (const by of [1.02, 0.94, 0.86]) B(g, 0.018, 0.018, 0.02, 0x2a2622, 0.05, by, 0.052); // 재킷 단추 3
      B(g, 0.07, 0.045, 0.02, shade(c, 0.7), -0.1, 1.18, 0.052);       // 가슴 포켓
      B(g, 0.05, 0.018, 0.022, 0xe8e4d8, -0.1, 1.2, 0.053);            // 행커치프
      for (const [fx, fh] of [[-0.14, 0.4], [0.05, 0.34], [0.12, 0.42]]) B(g, 0.012, fh, 0.012, shade(c, 0.85), fx, 1.0, 0.048); // 주름 골
      B(g, 0.012, 0.36, 0.012, shade(c, 1.12), -0.05, 1.0, 0.048);     // 주름 하이라이트
      jk(0.09, 0.42, -0.21, 1.06, 0, shade(c, 0.9));                   // 왼팔
      jk(0.09, 0.42, 0.21, 1.06, 0, shade(c, 0.9));                    // 오른팔
      for (const sx of [-0.21, 0.21]) {
        B(g, 0.095, 0.03, 0.092, shade(c, 0.7), sx, 0.87, 0);          // 소맷단
        B(g, 0.014, 0.014, 0.02, 0x2a2622, sx + (sx > 0 ? -0.025 : 0.025), 0.88, 0.048); // 커프 단추
      }
      B(g, 0.09, 0.05, 0.02, 0x35322e, 0.09, 0.82, 0.046);             // 밑단 먼지 얼룩 — 재킷 천 위(0.66은 밑단 아래 허공, 캡처 검거)
      return g;
    }
  },
};


export { WOODS, DEFS };
