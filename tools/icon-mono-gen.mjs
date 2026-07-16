// icon-mono-gen.mjs — pixelarticons(MIT) + 자작 24그리드 패스 → 단색 잉크 렌더 시트 HTML 생성
// 디렉터 오더: 플랫 아이콘·칙칙한 색 통일·바로 보이는 UI만·도움=?·탐험=지도·해 모양 금지
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets-src', 'art', 'pixelarticons');
const OUT = process.argv[2] || '.'; // 렌더 시트 출력 폴더 (캡처 하네스가 icon-mono.html을 읽는다)
const INK = '#e6efe4'; // 흰색(그린 캐스트) — 에일리언 그린 터미널의 흰 글씨와 동일 잉크

const pathOf = (name) => {
  const svg = fs.readFileSync(`${SRC}/${name}.svg`, 'utf8');
  return [...svg.matchAll(/<path[^>]*d="([^"]+)"/g)].map(m => m[1]).join(' ');
};
const cloud = pathOf('cloud');

// 자작 패스 — pixelarticons 규칙 준수(24그리드·2px 스텝·rect 조합)
const CUSTOM = {
  question: 'M7 4h10v2H7V4zM5 6h2v2H5V6zM15 6h2v6h-2V6zM11 12h4v2h-4v-2zM11 14h2v2h-2v-2zM11 18h2v2h-2v-2z',
  broom: 'M11 2h2v10h-2V2zM9 12h6v2H9v-2zM8 14h8v2H8v-2zM7 16h3v2H7v-2zM11 16h2v2h-2v-2zM14 16h3v2h-3v-2zM6 18h3v2H6v-2zM10 18h4v2h-4v-2zM15 18h3v2h-3v-2zM6 20h2v2H6v-2zM10 20h2v2h-2v-2zM14 20h2v2h-2v-2zM16 20h2v2h-2v-2z',
  bowl: 'M8 3h2v2H8V3zM8 7h2v2H8V7zM14 5h2v2h-2V5zM14 9h2v2h-2V9zM4 12h16v2H4v-2zM5 14h14v2H5v-2zM6 16h12v2H6v-2zM8 18h8v2H8v-2z',
  'weather-snow': cloud + ' M5 20h2v2H5v-2zM11 20h2v2h-2v-2zM17 20h2v2h-2v-2z',
  'weather-rain': cloud + ' M5 19h2v4H5v-4zM11 19h2v4h-2v-4zM17 19h2v4h-2v-4z',
  'weather-storm': cloud + ' M12 19h2v2h-2v-2zM10 21h2v2h-2v-2z',
  'weather-ash': cloud + ' M5 19h2v2H5v-2zM10 21h2v2h-2v-2zM14 19h2v2h-2v-2zM18 21h2v2h-2v-2z',
  // ── P2 자작: 자원 (24그리드·2px 스텝) ──
  apple: 'M11 2h2v3h-2V2zM14 3h3v2h-3V3zM7 6h10v2H7V6zM6 8h12v8H6V8zM7 16h10v2H7v-2zM9 18h6v2H9v-2z',
  can: 'M7 3h10v2H7V3zM6 5h12v4H6V5zM6 9h2v4H6V9zM16 9h2v4h-2V9zM6 13h12v6H6v-6z',
  bottle: 'M9 2h6v2H9V2zM10 4h4v2h-4V4zM8 6h8v12H8V6zM9 18h6v2H9v-2z',
  spool: 'M6 4h12v4H6V4zM8 8h8v8H8V8zM6 16h12v4H6v-4z',
  'bandage-roll': 'M6 6h12v3H6V6zM6 15h12v3H6v-3zM6 9h3v6H6V9zM15 9h3v6h-3V9zM18 11h4v2h-4v-2z',
  flask: 'M10 2h4v6h-4V2zM8 8h8v2H8V8zM7 10h10v2H7v-2zM6 12h12v8H6v-8z',
  pills: 'M4 10h4v4H4v-4zM9 10h4v4H9v-4zM15 9h5v5h-5V9z',
  candle: 'M11 3h2v2h-2V3zM10 5h4v3h-4V5zM11 8h2v2h-2V8zM9 10h6v10H9V10z',
  jerrycan: 'M8 4h8v2H8V4zM8 6h2v2H8V6zM14 6h2v2h-2V6zM6 8h12v12H6V8z',
  gear: 'M10 2h4v3h-4V2zM10 19h4v3h-4v-3zM2 10h3v4H2v-4zM19 10h3v4h-3v-4zM4 4h3v3H4V4zM17 4h3v3h-3V4zM4 17h3v3H4v-3zM17 17h3v3h-3v-3zM7 7h10v3H7V7zM7 14h10v3H7v-3zM7 10h3v4H7v-4zM14 10h3v4h-3v-4z',
  bricks: 'M4 8h7v4H4V8zM12 8h8v4h-8V8zM4 13h8v4H4v-4zM13 13h7v4h-7v-4z',
  sack: 'M10 4h4v4h-4V4zM8 5h2v3H8V5zM14 5h2v3h-2V5zM7 8h10v12H7V8z',
  'book-closed': 'M6 3h10v18H6V3zM16 5h2v16h-2V5z',
  // ── P2 자작: 계절 ──
  sprout: 'M11 10h2v10h-2v-10zM6 9h5v2H6V9zM5 7h4v2H5V7zM13 8h2v3h-2V8zM13 6h5v2h-5V6zM15 4h4v2h-4V4zM6 20h12v2H6v-2z',
  leaf: 'M11 4h2v2h-2V4zM9 6h6v2H9V6zM8 8h8v2H8V8zM7 10h10v2H7v-2zM8 12h8v2H8v-2zM9 14h6v2H9v-2zM11 16h2v6h-2v-6z',
  'leaf-fall': 'M5 4h4v3H5V4zM9 5h2v2H9V5zM13 8h4v3h-4V8zM11 9h2v2h-2V9zM8 14h4v3H8v-3zM6 15h2v2H6v-2zM4 20h16v2H4v-2z',
  snowflake: 'M11 3h2v18h-2V3zM3 11h18v2H3v-2zM5 5h2v2H5V5zM7 7h2v2H7V7zM15 7h2v2h-2V7zM17 5h2v2h-2V5zM5 17h2v2H5v-2zM7 15h2v2H7v-2zM15 15h2v2h-2v-2zM17 17h2v2h-2v-2z',
  // ── P3 자작: 가구 (형태 패밀리 — 실루엣+식별 요소 1) ──
  'f-chair': 'M6 3h3v11H6V3zM6 12h12v3H6v-3zM6 15h2v6H6v-6zM15 15h2v6h-2v-6z',
  'f-dresser': 'M4 4h16v7H4V4zM4 13h16v7H4v-7zM5 20h2v2H5v-2zM17 20h2v2h-2v-2z',
  'f-bookshelf': 'M4 2h16v2H4V2zM4 20h16v2H4v-2zM4 4h2v16H4V4zM18 4h2v16h-2V4zM6 8h12v2H6V8zM6 14h12v2H6v-2zM7 4h2v4H7V4zM10 3h2v5h-2V3zM13 4h2v4h-2V4zM7 10h2v4H7v-4zM11 11h2v3h-2v-3zM14 10h2v4h-2v-4zM8 16h2v4H8v-4zM12 17h2v3h-2v-3z',
  'f-supplyshelf': 'M4 4h16v2H4V4zM4 12h16v2H4v-2zM4 20h16v2H4v-2zM4 4h2v18H4V4zM18 4h2v18h-2V4zM7 7h3v5H7V7zM12 8h4v4h-4V8zM7 15h4v5H7v-5zM13 16h3v4h-3v-4z',
  'f-cratestack': 'M8 3h9v9H8V3zM5 12h14v9H5v-9z',
  'f-fuelpile': 'M8 8h5v5H8V8zM5 14h5v5H5v-5zM12 14h5v5h-5v-5z',
  'f-noticeboard': 'M3 4h18v2H3V4zM3 16h18v2H3v-2zM3 6h2v10H3V6zM19 6h2v10h-2V6zM6 7h4v5H6V7zM12 8h5v6h-5V8zM11 18h2v4h-2v-4z',
  'f-jugcluster': 'M7 5h3v3H7V5zM5 8h7v12H5V8zM16 9h2v3h-2V9zM14 12h6v8h-6v-8z',
  'f-rug': 'M3 13h18v8H3v-8zM5 15h14v4H5v-4z',
  'f-lamp': 'M8 3h8v2H8V3zM7 5h10v3H7V5zM11 8h2v10h-2V8zM7 18h10v3H7v-3z',
  'f-plant': 'M11 4h2v10h-2V4zM6 7h5v2H6V7zM13 5h5v2h-5V5zM8 10h3v2H8v-2zM8 14h8v2H8v-2zM9 16h6v4H9v-4z',
  'f-crate': 'M4 5h16v4H4V5zM5 9h14v10H5V9z',
  'f-candle2': 'M11 3h2v2h-2V3zM10 5h4v3h-4V5zM11 8h2v2h-2V8zM9 10h6v10H9V10z',
  'f-fridge': 'M6 2h12v7H6V2zM6 11h12v10H6V11z',
  'f-purifier': 'M7 3h10v10H7V3zM17 8h3v2h-3V8zM10 13h4v6h-4v-6zM7 19h10v2H7v-2z',
  'f-generator': 'M7 5h6v3H7V5zM15 3h2v5h-2V3zM4 8h16v10H4V8zM5 18h3v2H5v-2zM16 18h3v2h-3v-2z',
  'f-stove': 'M14 2h3v6h-3V2zM6 8h12v12H6V8zM7 20h2v2H7v-2zM15 20h2v2h-2v-2z',
  'f-cushion': 'M7 12h10v2H7v-2zM5 14h14v4H5v-4zM7 18h10v2H7v-2z',
  'f-teatable': 'M10 8h4v4h-4V8zM4 12h16v3H4v-3zM5 15h2v5H5v-5zM17 15h2v5h-2v-5z',
  'f-bookstack': 'M6 6h12v3H6V6zM7 10h11v3H7v-3zM5 14h14v3H5v-3z',
  'f-lantern': 'M10 2h4v2h-4V2zM8 4h8v2H8V4zM7 6h10v12H7V6zM8 18h8v2H8v-2z',
  'f-heater': 'M9 3h6v3H9V3zM4 6h16v12H4V6zM6 18h2v3H6v-3zM16 18h2v3h-2v-3z',
  'f-autopurifier': 'M5 4h14v9H5V4zM10 13h4v4h-4v-4zM8 17h8v4H8v-4zM17 14h2v3h-2v-3z',
  'f-curtain': 'M3 3h18v2H3V3zM5 5h5v14H5V5zM14 5h5v14h-5V5zM5 19h2v2H5v-2zM17 19h2v2h-2v-2z',
  'f-desklamp': 'M5 19h8v2H5v-2zM7 13h2v6H7v-6zM9 11h2v2H9v-2zM11 9h2v2h-2V9zM12 5h7v4h-7V5z',
  'f-ledbar': 'M3 10h18v4H3v-4zM5 16h2v2H5v-2zM9 16h2v2H9v-2zM13 16h2v2h-2v-2zM17 16h2v2h-2v-2z',
  'f-firstaidbox': 'M9 5h6v3H9V5zM4 8h16v2H4V8zM4 17h16v2H4v-2zM4 10h2v7H4v-7zM18 10h2v7h-2v-7zM11 10h2v6h-2v-6zM9 12h6v2H9v-2z',
  'f-mirror': 'M9 2h6v2H9V2zM7 4h10v12H7V4zM9 16h6v2H9v-2zM10 18h4v2h-4v-2zM8 20h8v2H8v-2z',
  'f-globe': 'M8 4h8v2H8V4zM6 6h12v8H6V6zM8 14h8v2H8v-2zM10 16h4v2h-4v-2zM7 18h10v2H7v-2z',
  'f-phonograph': 'M12 2h8v2h-8V2zM10 4h10v4H10V4zM12 8h6v2h-6V8zM14 10h2v4h-2v-4zM5 14h12v7H5v-7z',
  'f-candelabra': 'M5 4h2v4H5V4zM11 2h2v6h-2V2zM17 4h2v4h-2V4zM5 8h14v2H5V8zM11 10h2v8h-2v-8zM8 18h8v3H8v-3z',
  'f-barrelfire': 'M11 2h2v3h-2V2zM9 4h6v4H9V4zM6 10h12v11H6V10z',
  'f-graffiti': 'M10 3h4v3h-4V3zM8 6h8v13H8V6zM18 4h2v2h-2V4zM20 2h2v2h-2V2z',
  'f-skis': 'M7 2h3v18H7V2zM14 2h3v18h-3V2zM6 10h5v2H6v-2zM13 10h5v2h-5v-2z',
  'f-skipoles': 'M7 2h4v3H7V2zM13 2h4v3h-4V2zM8 5h2v13H8V5zM14 5h2v13h-2V5zM6 18h6v2H6v-2zM12 18h6v2h-6v-2z',
  'f-snowboard': 'M9 2h6v2H9V2zM8 4h2v16H8V4zM14 4h2v16h-2V4zM9 20h6v2H9v-2zM10 7h4v3h-4V7zM10 14h4v3h-4v-3z',
  'f-neonvip': 'M11 4h2v2h-2V4zM9 6h6v2H9V6zM7 8h10v2H7V8zM9 10h6v2H9v-2zM11 12h2v2h-2v-2zM11 14h2v4h-2v-4zM8 18h8v2H8v-2z',
  'f-neonair': 'M9 3h6v8H9V3zM11 11h2v5h-2v-5zM8 16h8v2H8v-2zM17 4h2v2h-2V4zM19 2h2v2h-2V2z',
  'f-suit': 'M11 2h2v3h-2V2zM5 5h14v3H5V5zM6 8h12v10H6V8z',
  'f-radioset': 'M16 2h2v4h-2V2zM4 6h16v2H4V6zM4 8h2v10H4V8zM18 8h2v10h-2V8zM4 18h16v2H4v-2zM7 10h4v6H7v-6zM14 10h3v3h-3v-3zM14 15h3v1h-3z',
  // ── P3 자작: 지역 ──
  'd-deadtree': 'M11 6h2v14h-2V6zM7 8h4v2H7V8zM5 6h2v2H5V6zM13 10h4v2h-4v-2zM17 8h2v2h-2V8zM5 20h14v2H5v-2z',
  'd-grass': 'M5 10h2v10H5V10zM9 6h2v14H9V6zM13 9h2v11h-2V9zM17 12h2v8h-2v-8zM3 20h18v2H3v-2z',
  'd-wave': 'M3 8h4v2H3V8zM7 10h4v2H7v-2zM11 8h4v2h-4V8zM15 10h4v2h-4v-2zM3 14h4v2H3v-2zM7 16h4v2H7v-2zM11 14h4v2h-4v-2zM15 16h4v2h-4v-2z',
  'd-mountain': 'M10 4h4v2h-4V4zM8 6h8v2H8V6zM6 8h12v2H6V8zM4 10h16v2H4v-2zM3 12h18v2H3v-2zM3 14h8v2H3v-2zM13 14h8v2h-8v-2zM3 20h18v2H3v-2z',
  'd-gate': 'M4 6h7v14H4V6zM3 4h9v2H3V4zM11 12h10v2H11v-2zM19 14h2v6h-2v-6z',
  'd-bridge': 'M6 4h2v16H6V4zM16 4h2v16h-2V4zM3 16h18v2H3v-2zM8 8h2v2H8V8zM10 10h2v2h-2v-2zM12 12h2v2h-2v-2zM14 10h2v2h-2v-2z',
  'd-station': 'M4 6h16v2H4V6zM5 8h2v12H5V8zM11 8h2v12h-2V8zM17 8h2v12h-2V8zM3 20h18v2H3v-2zM11 3h2v3h-2V3z',
  // ── P3 자작: 셸터 ──
  's-container': 'M3 6h18v2H3V6zM3 16h18v2H3v-2zM3 8h3v8H3V8zM8 8h3v8H8V8zM13 8h2v8h-2V8zM17 8h4v8h-4V8z',
  's-bunker': 'M8 6h8v2H8V6zM5 8h14v2H5V8zM4 10h16v8H4v-8zM11 3h2v3h-2V3z',
  's-rooftop': 'M3 8h18v2H3V8zM3 10h2v2H3v-2zM11 10h2v2h-2v-2zM19 10h2v2h-2v-2zM3 12h18v2H3v-2zM5 14h14v8H5v-8z',
  's-cabin': 'M10 3h4v2h-4V3zM8 5h8v2H8V5zM6 7h12v2H6V7zM4 9h16v2H4V9zM6 11h12v9H6v-9zM15 3h2v4h-2V3z',
  's-bus': 'M3 7h18v10H3V7zM6 17h3v3H6v-3zM15 17h3v3h-3v-3z',
  's-subway': 'M8 4h8v2H8V4zM5 6h3v2H5V6zM16 6h3v2h-3V6zM4 8h2v12H4V8zM18 8h2v12h-2V8zM9 14h6v2H9v-2zM7 18h10v2H7v-2z',
  's-greenhouse': 'M9 4h6v2H9V4zM6 6h3v2H6V6zM15 6h3v2h-3V6zM4 8h2v12H4V8zM18 8h2v12h-2V8zM11 8h2v12h-2V8zM4 20h16v2H4v-2z',
  's-ship': 'M8 6h8v6H8V6zM12 3h3v3h-3V3zM4 12h16v6H4v-6zM6 18h12v2H6v-2z',
  's-lighthouse': 'M10 2h4v3h-4V2zM4 3h3v2H4V3zM17 3h3v2h-3V3zM9 6h6v12H9V6zM7 18h10v3H7v-3z',
  's-tugboat': 'M7 10h7v4H7v-4zM14 8h3v2h-3V8zM4 14h16v4H4v-4zM6 18h12v2H6v-2z',
  's-controltower': 'M8 2h8v2H8V2zM6 4h12v4H6V4zM10 8h4v12h-4V8zM7 20h10v2H7v-2z',
  's-lodge': 'M10 2h4v2h-4V2zM8 4h8v2H8V4zM6 6h12v2H6V6zM5 8h14v2H5V8zM4 10h16v2H4v-2zM3 12h18v2H3v-2zM5 14h4v8H5v-8zM15 14h4v8h-4v-8zM9 14h6v2H9v-2z',
  's-customs': 'M2 3h20v3H2V3zM4 6h5v14H4V6zM15 6h5v14h-5V6zM10 12h4v2h-4v-2z',
  's-bridgehouse': 'M6 3h3v17H6V3zM3 14h18v2H3v-2zM12 8h7v6h-7V8zM12 16h2v4h-2v-4z',
  's-terminal': 'M9 3h6v2H9V3zM6 5h3v2H6V5zM15 5h3v2h-3V5zM4 7h2v2H4V7zM18 7h2v2h-2V7zM4 9h2v11H4V9zM18 9h2v11h-2V9zM11 6h2v2h-2V6zM6 18h12v2H6v-2z',
  's-penthouse': 'M15 2h2v2h-2V2zM8 4h8v2H8V4zM4 6h16v2H4V6zM6 8h12v14H6V8z',
  // ── P3 자작: 기록·전리품 ──
  'r-sketch': 'M4 4h16v2H4V4zM4 18h16v2H4v-2zM4 6h2v12H4V6zM18 6h2v12h-2V6zM8 8h4v4H8V8zM14 9h2v2h-2V9zM12 13h2v2h-2v-2z',
  'l-blueprint': 'M4 5h2v14H4V5zM18 5h2v14h-2V5zM6 6h12v2H6V6zM6 16h12v2H6v-2zM6 8h2v8H6V8zM16 8h2v8h-2V8zM10 10h4v2h-4v-2zM10 12h2v2h-2v-2z',
  // ── P2 자작: 부상 ──
  plaster: 'M4 9h5v6H4V9zM15 9h5v6h-5V9zM9 10h6v4H9v-4z',
  scar: 'M11 4h2v16h-2V4zM7 7h10v2H7V7zM7 11h10v2H7v-2zM7 15h10v2H7v-2z',
  splint: 'M8 4h3v16H8V4zM13 4h3v16h-3V4zM6 8h12v2H6V8zM6 14h12v2H6v-2z',
  thermo: 'M10 3h4v13h-4V3zM9 16h6v5H9v-5z',
  'med-cross': 'M9 4h6v5h5v6h-5v5H9v-5H4V9h5V4z',
};

// 렌더 대상: [소스, 타깃 아이콘 id]
export const MAP = [
  ['map', 'icon_act_explore'],        // 오더: 탐험=지도
  ['question', 'icon_act_help'],      // 오더: 도움=?
  ['home', 'icon_act_move'],
  ['tool-case', 'icon_act_craft'],
  ['bed', 'icon_act_sleep'],
  ['broom', 'icon_act_clean'],
  ['book-open', 'icon_act_knowledge'],
  ['shirt', 'icon_act_wardrobe'],
  ['bowl', 'icon_g_hunger'],
  ['drop', 'icon_g_thirst'],
  ['zap', 'icon_g_energy'],
  ['alert', 'icon_cond_warn'],
  ['moon', 'icon_time_night'],
  ['weather-snow', 'icon_weather_snow'],
  ['weather-rain', 'icon_weather_rain'],
  ['weather-storm', 'icon_weather_storm'],
  ['weather-ash', 'icon_weather_ash'],
  // P2: 자원 14
  ['apple', 'icon_res_food'],
  ['can', 'icon_res_canned'],
  ['bottle', 'icon_res_water'],
  ['spool', 'icon_res_cloth'],
  ['bandage-roll', 'icon_res_bandage'],
  ['flask', 'icon_res_antiseptic'],
  ['pills', 'icon_res_painkiller'],
  ['candle', 'icon_res_candle'],
  ['battery-full', 'icon_res_battery'],
  ['jerrycan', 'icon_res_fuel'],
  ['gear', 'icon_res_parts'],
  ['bricks', 'icon_res_material'],
  ['sack', 'icon_res_salt'],
  ['book-closed', 'icon_res_book'],
  // P2: 계절 4
  ['sprout', 'icon_season_spring'],
  ['leaf', 'icon_season_summer'],
  ['leaf-fall', 'icon_season_autumn'],
  ['snowflake', 'icon_season_winter'],
  // P2: 툴바 시스템 6 (설정=기어 자작 재사용)
  ['pause', 'icon_sys_pause'],
  ['android', 'icon_sys_auto'],
  ['edit', 'icon_sys_edit'],
  ['gear', 'icon_sys_settings'],
  ['pin', 'icon_sys_pin'],
  ['eye', 'icon_sys_uihide'],
  // P2: 부상 5
  ['plaster', 'icon_inj_minor'],
  ['scar', 'icon_inj_deep'],
  ['splint', 'icon_inj_sprain'],
  ['thermo', 'icon_inj_infection'],
  ['med-cross', 'icon_inj_critical'],
  // P3: 가구 45 (팩 7 + 재사용 2 + 자작 36)
  ['bed', 'icon_furn_bed'],
  ['sofa', 'icon_furn_sofa'],
  ['f-chair', 'icon_furn_chair'],
  ['table', 'icon_furn_table'],
  ['f-dresser', 'icon_furn_dresser'],
  ['f-bookshelf', 'icon_furn_bookshelf'],
  ['f-supplyshelf', 'icon_furn_supplyshelf'],
  ['f-cratestack', 'icon_furn_cratestack'],
  ['f-fuelpile', 'icon_furn_fuelpile'],
  ['f-noticeboard', 'icon_furn_noticeboard'],
  ['f-jugcluster', 'icon_furn_jugcluster'],
  ['f-rug', 'icon_furn_rug'],
  ['f-lamp', 'icon_furn_lamp'],
  ['f-plant', 'icon_furn_plant'],
  ['f-crate', 'icon_furn_crate'],
  ['f-radioset', 'icon_furn_radio'],
  ['f-candle2', 'icon_furn_candle'],
  ['f-fridge', 'icon_furn_fridge'],
  ['f-purifier', 'icon_furn_purifier'],
  ['f-generator', 'icon_furn_generator'],
  ['f-stove', 'icon_furn_stove'],
  ['f-cushion', 'icon_furn_cushion'],
  ['f-teatable', 'icon_furn_teatable'],
  ['f-bookstack', 'icon_furn_bookstack'],
  ['clock', 'icon_furn_clock'],
  ['f-lantern', 'icon_furn_lantern'],
  ['f-heater', 'icon_furn_heater'],
  ['f-autopurifier', 'icon_furn_autopurifier'],
  ['image', 'icon_furn_frame'],
  ['f-curtain', 'icon_furn_curtain'],
  ['f-desklamp', 'icon_furn_desklamp'],
  ['f-ledbar', 'icon_furn_ledbar'],
  ['f-firstaidbox', 'icon_furn_firstaidbox'],
  ['f-mirror', 'icon_furn_mirror'],
  ['f-globe', 'icon_furn_globe'],
  ['f-phonograph', 'icon_furn_phonograph'],
  ['f-candelabra', 'icon_furn_candelabra'],
  ['f-barrelfire', 'icon_furn_barrelfire'],
  ['f-graffiti', 'icon_furn_graffiti'],
  ['f-skis', 'icon_furn_skis'],
  ['f-skipoles', 'icon_furn_skipoles'],
  ['f-snowboard', 'icon_furn_snowboard'],
  ['f-neonvip', 'icon_furn_neonvip'],
  ['f-neonair', 'icon_furn_neonair'],
  ['f-suit', 'icon_furn_suit'],
  // P3: 시스템·기록·전리품
  ['play', 'icon_sys_play'],
  ['clipboard', 'icon_sys_quest'],
  ['check', 'icon_sys_check'],
  ['download', 'icon_sys_collect'],
  ['lock', 'icon_sys_locked'],
  ['note', 'icon_rec_memo'],
  ['radio', 'icon_rec_radio'],
  ['r-sketch', 'icon_rec_sketch'],
  ['paint-bucket', 'icon_loot_paint'],
  ['l-blueprint', 'icon_loot_blueprint'],
  // P3: 지역 12
  ['d-deadtree', 'icon_district_outskirts'],
  ['buildings', 'icon_district_city'],
  ['d-grass', 'icon_district_meadow'],
  ['tree', 'icon_district_forest'],
  ['d-wave', 'icon_district_coast'],
  ['anchor', 'icon_district_harbor'],
  ['d-mountain', 'icon_district_highland'],
  ['flask', 'icon_district_research'],
  ['d-gate', 'icon_district_eastgate'],
  ['d-bridge', 'icon_district_eastbridge'],
  ['d-station', 'icon_district_eaststation'],
  ['building', 'icon_district_eastcore'],
  // P3: 셸터 16
  ['s-container', 'icon_shelter_container'],
  ['s-bunker', 'icon_shelter_bunker'],
  ['s-rooftop', 'icon_shelter_rooftop'],
  ['s-cabin', 'icon_shelter_cabin'],
  ['s-bus', 'icon_shelter_bus'],
  ['s-subway', 'icon_shelter_subway'],
  ['s-greenhouse', 'icon_shelter_greenhouse'],
  ['s-ship', 'icon_shelter_ship'],
  ['s-lighthouse', 'icon_shelter_lighthouse'],
  ['s-tugboat', 'icon_shelter_tugboat'],
  ['s-controltower', 'icon_shelter_controltower'],
  ['s-lodge', 'icon_shelter_lodge'],
  ['s-customs', 'icon_shelter_customs'],
  ['s-bridgehouse', 'icon_shelter_bridgehouse'],
  ['s-terminal', 'icon_shelter_terminal'],
  ['s-penthouse', 'icon_shelter_penthouse'],
];

const cells = MAP.map(([src, id], i) => {
  const d = CUSTOM[src] || pathOf(src);
  const col = i % 6, row = Math.floor(i / 6);
  return `<div class="cell" style="left:${col * 200 + 4}px;top:${row * 200 + 4}px" data-id="${id}">
    <svg width="192" height="192" viewBox="0 0 24 24" shape-rendering="crispEdges"><path d="${d}" fill="${INK}"/></svg>
    <span>${id.replace('icon_', '')} ← ${src}</span></div>`;
}).join('\n');

const PAGE_H = Math.ceil(MAP.length / 6) * 200 + 40;
fs.writeFileSync(`${OUT}/icon-mono.html`, `<!doctype html><meta charset="utf-8">
<style>
  body { margin:0; background:#14181c; width:1220px; height:${PAGE_H}px; position:relative; font:10px sans-serif; }
  .cell { position:absolute; width:192px; height:192px; }
  .cell span { position:absolute; left:0; bottom:-14px; color:#78909c; white-space:nowrap; }
</style><body>${cells}</body>`);
console.log('cells', MAP.length);
