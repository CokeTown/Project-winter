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
    build(c) {
      const g = new THREE.Group();
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
    build(c) {
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
    build(c) {
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
    build(c) {
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
    colorNames: ['내추럴', '다크브라운', '화이트', '그레이'],
    colorNamesEn: ['Natural', 'Dark Brown', 'White', 'Gray'],
    colors: [0xa9825c, 0x5f452f, 0xd4cfc2, 0x7c7f86],
    build(c) {
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
    build(c, colorIdx = 0) {
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
  rug: {
    name: '러그', nameEn: 'Rug', emoji: '🧶', fp: { w: 2.2, d: 1.5 }, noCollide: true,
    colorNames: ['레드', '블루', '그린', '베이지'],
    colorNamesEn: ['Red', 'Blue', 'Green', 'Beige'],
    colors: [0x9e524e, 0x54688a, 0x6a7f5b, 0xc4b295],
    build(c) {
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
    light: { color: 0xffb670, intensity: 7, dist: 7, y: 1.45, fuel: 'battery', comfort: 8 },
    build(c) {
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
    build(c) {
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
    light: { color: 0xffa050, intensity: 3, dist: 4, y: 0.75, flicker: true, fuel: 'candle', comfort: 6 },
    build(c) {
      const g = new THREE.Group();
      Cyl(g, 0.2, 0.22, 0.05, c, 0, 0.42, 0, 10);
      Cyl(g, 0.04, 0.05, 0.4, shade(c, 0.85), 0, 0.2, 0, 8);
      Cyl(g, 0.14, 0.16, 0.03, shade(c, 0.7), 0, 0.02, 0, 10);
      Cyl(g, 0.05, 0.05, 0.16, 0xf0e8d0, 0, 0.53, 0, 8);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 6),
        new THREE.MeshLambertMaterial({ color: 0xffd080, emissive: 0xffaa40, emissiveIntensity: 1.4 }));
      flame.position.set(0, 0.66, 0); flame.userData.glow = true;
      g.add(flame);
      return g;
    }
  },
  fridge: {
    name: '냉장고', nameEn: 'Fridge', emoji: '🧊', fp: { w: 0.78, d: 0.68 },
    colorNames: ['체리레드', '민트', '크림', '화이트'],
    colorNamesEn: ['Cherry Red', 'Mint', 'Cream', 'White'],
    colors: [0xa8433f, 0x93b5a5, 0xd9cdb2, 0xd8d8d4],
    appliance: { fuel: 'battery', effect: 'fridge', label: '음식 부패 방지', labelEn: 'Prevents food spoilage' },
    build(c) {
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
    build(c) {
      const g = new THREE.Group();
      B(g, 0.5, 0.5, 0.5, shade(c, 0.85), 0, 0.25, 0);            // 받침 캐비닛
      const tank = Cyl(g, 0.2, 0.2, 0.6, c, 0, 0.82, 0, 10);
      const wat = Cyl(g, 0.16, 0.16, 0.3, 0x5a8ab0, 0, 0.78, 0, 10);
      wat.material.emissive = new THREE.Color(0x2a4a66);
      wat.material.emissiveIntensity = 0.4; wat.userData.glow = true;
      Cyl(g, 0.05, 0.05, 0.12, 0x3f3a33, 0.2, 0.6, 0.14, 6).rotation.z = Math.PI / 2;
      B(g, 0.16, 0.12, 0.16, 0xd4cfc2, 0.24, 0.31, 0.14);         // 컵
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
      return g;
    }
  },
  /* ── cozy 확장 가구 (v1.4) ── */
  stove: {
    name: '장작 난로', nameEn: 'Wood Stove', emoji: '🔥', fp: { w: 1.0, d: 0.75 },
    colorNames: ['무쇠', '벽돌레드', '크림', '올리브'],
    colorNamesEn: ['Cast Iron', 'Brick Red', 'Cream', 'Olive'],
    colors: [0x3a3d42, 0x8a5138, 0xcfc8ba, 0x6a7047],
    light: { color: 0xff8c3a, intensity: 9, dist: 8, y: 0.7, flicker: true, fuel: 'fuel', comfort: 12 },
    build(c) {
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
    build(c) {
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
    build(c) {
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
    light: { color: 0xffc060, intensity: 5, dist: 6, y: 1.15, flicker: true, fuel: 'candle', comfort: 7 },
    build(c) {
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
    build(c, colorIdx = 0) {
      const g = new THREE.Group();
      // 절차 풍경화 (하늘/지평선/언덕 3색 띠 — 일러스트 리소스 미사용)
      const rand = seededRand(53 + colorIdx * 11);
      B(g, 0.44, 0.32, 0.04, c, 0, 0.5, 0);              // 프레임
      const artPals = [[0x8fb0cf, 0x6a8a5a, 0x4a6042], [0xc9a06a, 0x9a7a4a, 0x5a4a34], [0x9a8ab0, 0x6a7a8a, 0x44505a]];
      const pal = artPals[Math.floor(rand() * artPals.length)];
      B(g, 0.34, 0.14, 0.02, pal[0], 0, 0.57, 0.021);    // 하늘
      B(g, 0.34, 0.06, 0.02, pal[1], 0, 0.47, 0.021);    // 언덕
      B(g, 0.34, 0.04, 0.02, pal[2], 0, 0.42, 0.021);    // 땅
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
    build(c) {
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
    light: { color: 0xffd090, intensity: 4, dist: 5, y: 0.5, fuel: 'battery', comfort: 5 },
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
  firstaidbox: {
    name: '구급상자', nameEn: 'First-Aid Box', emoji: '🧰', fp: { w: 0.5, d: 0.35 },
    stackable: true, // 벽걸이 대신 선반/서랍 위 배치 (관통 회피)
    colorNames: ['화이트', '레드', '올리브', '스틸'],
    colorNamesEn: ['White', 'Red', 'Olive', 'Steel'],
    colors: [0xd8d4cc, 0xa8433f, 0x6a7047, 0x8a8f96],
    build(c) {
      const g = new THREE.Group();
      B(g, 0.44, 0.3, 0.3, c, 0, 0.2, 0);                        // 본체
      B(g, 0.46, 0.06, 0.32, shade(c, 0.85), 0, 0.36, 0);        // 뚜껑 테두리
      B(g, 0.12, 0.02, 0.02, 0xa8433f, 0, 0.24, 0.16);          // 적십자 (가로)
      B(g, 0.02, 0.12, 0.02, 0xa8433f, 0, 0.24, 0.16);          // 적십자 (세로)
      B(g, 0.14, 0.05, 0.04, shade(c, 0.7), 0, 0.37, 0);        // 손잡이
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
      // 받침 다리
      for (const sx of [-0.16, 0.16]) { const leg = B(g, 0.05, 0.3, 0.16, shade(c, 0.8), sx, 0.06, 0); leg.rotation.x = 0.2; }
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
      for (const side of [-1, 1]) {
        const arm = B(g, 0.44, 0.035, 0.035, shade(c, 1.05), side * 0.2, 1.02, 0); arm.rotation.z = -side * 0.42;
        Cyl(g, 0.03, 0.03, 0.14, c, side * 0.38, 1.18, 0, 6);          // 팔 끝 수직 올림대
        cup(side * 0.38, 1.26);                                         // 좌우 초 (중앙보다 낮게)
      }
      Cyl(g, 0.03, 0.03, 0.18, c, 0, 1.16, 0, 8);                       // 중앙 올림대
      cup(0, 1.32);                                                      // 중앙 초 (가장 높이)
      return g;
    }
  },
};


export { WOODS, DEFS };
