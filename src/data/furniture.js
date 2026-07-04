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
      sh.material.emissive = new THREE.Color(c);
      sh.material.emissiveIntensity = 0.25;
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
};


export { WOODS, DEFS };
