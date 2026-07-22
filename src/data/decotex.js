/* ============================================================
   decotex.js — Nine Winters 꾸미기 텍스처 데이터 (콘텐츠 분리 Phase 2)
   ------------------------------------------------------------
   목적: 벽지 6종(WALLPAPERS) / 바닥재 6종(FLOORINGS) 텍스처 테이블을 game.js에서
         분리한다. 각 항목의 tex는 () => makeCanvasTex(...) 클로저로, game.js 내부의
         절차 텍스처 유틸 makeCanvasTex(THREE·document 결합)를 참조한다. 따라서
         팩토리 makeDecoTex(ctx)로 내보내고 game.js가 makeCanvasTex를 주입한다.
   원칙: import 방향은 game→data 단방향(여긴 game.js를 import하지 않는다).
         tex 클로저 본문은 원본과 문자열 동일 — 한 글자도 바꾸지 않는다(행동 보존).
         seededRand는 이미 lib/helpers의 공용 헬퍼라 직접 import(furniture.js 선례).
   ctx 필드: makeCanvasTex (game.js 소유. 절차 캔버스 텍스처 빌더).
   출처: game.js WALLPAPERS / FLOORINGS (원본 그대로 이동, 팩토리로 래핑).
   ============================================================ */
import { seededRand } from '../lib/helpers.js';

export function makeDecoTex(ctx) {
  const { makeCanvasTex } = ctx;
  // 벽지: 실내 벽면 재질/색. repX/repY는 벽 폭 대비 반복.
  const WALLPAPERS = {
    default: { name: '기본 벽면', nameEn: 'Default Wall', emoji: '', tex: null }, // 셸터 원본
    cream:   { name: '크림 도배', nameEn: 'Cream Paper', emoji: '', cost: { cloth: 2 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#d8ccb0'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 40; i++) g.fillRect((i * 29) % w, (i * 17) % h, 2, 2);
      g.fillStyle = 'rgba(150,132,96,0.08)'; for (let i = 0; i < 8; i++) g.fillRect((i * 43) % w, 0, 1, h);
    }, 128, 128, 3, 1) },
    sage:    { name: '세이지 도배', nameEn: 'Sage Paper', emoji: '', cost: { cloth: 2 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#9aa886'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(120,138,104,0.35)'; for (let i = 0; i < 6; i++) g.fillRect((i * 22 + 4) % w, 0, 8, h); // 세로 은은한 줄
      g.fillStyle = 'rgba(255,255,255,0.04)'; for (let i = 0; i < 30; i++) g.fillRect((i * 31) % w, (i * 23) % h, 2, 2);
    }, 128, 128, 3, 1) },
    stripe:  { name: '줄무늬 벽지', nameEn: 'Striped Paper', emoji: '', cost: { cloth: 3 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#cdbfa2'; g.fillRect(0, 0, w, h);
      const sw = w / 8;
      for (let c = 0; c < 8; c += 2) { g.fillStyle = '#b7a582'; g.fillRect(c * sw, 0, sw, h); }
      g.fillStyle = 'rgba(90,70,44,0.12)'; for (let c = 0; c < 8; c++) g.fillRect(c * sw, 0, 1, h);
    }, 128, 128, 3, 1) },
    floral:  { name: '빛바랜 꽃무늬', nameEn: 'Faded Floral', emoji: '', cost: { cloth: 3, material: 1 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#cbb8a0'; g.fillRect(0, 0, w, h);
      const rand = seededRand(91);
      for (let i = 0; i < 14; i++) {
        const x = rand() * w, y = rand() * h, r = 6 + rand() * 5;
        g.fillStyle = ['rgba(160,110,120,0.35)', 'rgba(150,150,110,0.3)', 'rgba(130,120,150,0.3)'][Math.floor(rand() * 3)];
        for (let p = 0; p < 5; p++) { const a = p * 1.25; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.45, 0, 7); g.fill(); }
        g.fillStyle = 'rgba(120,100,60,0.4)'; g.beginPath(); g.arc(x, y, r * 0.3, 0, 7); g.fill();
      }
    }, 128, 128, 2, 2) },
    news:    { name: '신문지 임시도배', nameEn: 'Newspaper Patch', emoji: '', cost: { material: 1 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#c9c2b0'; g.fillRect(0, 0, w, h);
      const rand = seededRand(77);
      // 겹쳐 붙인 신문 조각 (사각 패치 + 텍스트 줄)
      for (let p = 0; p < 6; p++) {
        const px = rand() * w * 0.7, py = rand() * h * 0.7, pw = 30 + rand() * 40, ph = 26 + rand() * 34;
        g.fillStyle = `rgba(${200 + rand() * 20 | 0},${192 + rand() * 20 | 0},170,0.6)`; g.fillRect(px, py, pw, ph);
        g.strokeStyle = 'rgba(90,84,70,0.4)'; g.strokeRect(px, py, pw, ph);
        g.fillStyle = 'rgba(60,56,48,0.5)';
        for (let l = 0; l < ph / 5; l++) if (rand() > 0.2) g.fillRect(px + 2, py + 3 + l * 5, pw - 4 - rand() * 8, 1);
      }
    }, 128, 128, 2, 2) },
    plank:   { name: '판자 그대로', nameEn: 'Bare Planks', emoji: '', cost: { material: 2 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#8a6f4c'; g.fillRect(0, 0, w, h);
      const plank = w / 4;
      for (let c = 0; c < 4; c++) {
        g.fillStyle = ['#8f724e', '#836848', '#957750', '#7c6242'][c];
        g.fillRect(c * plank, 0, plank, h);
        g.fillStyle = '#5d452c'; g.fillRect(c * plank, 0, 2, h);
        g.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 8; i++) g.fillRect(c * plank + 4 + (i * 6) % (plank - 6), (c * 31 + i * 19) % h, 2, 5);
      }
    }, 128, 128, 3, 1) },
  };
  // 바닥재: 바닥 전체 재질.
  const FLOORINGS = {
    default: { name: '기본 바닥', nameEn: 'Default Floor', emoji: '', tex: null },
    wood:    { name: '원목 마루', nameEn: 'Oak Floor', emoji: '', cost: { material: 2 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#a07850'; g.fillRect(0, 0, w, h);
      const plank = h / 4;
      for (let r = 0; r < 4; r++) {
        g.fillStyle = ['#a5875c', '#9a7c52', '#ab8d63', '#94774e'][r];
        g.fillRect(0, r * plank, w, plank);
        g.fillStyle = '#6e5636'; g.fillRect(0, r * plank, w, 2);
        const off = (r * 47) % w; g.fillRect(off, r * plank, 2, plank);
        g.fillStyle = 'rgba(0,0,0,0.07)'; for (let i = 0; i < 12; i++) g.fillRect((off + i * 27) % w, r * plank + (i * 11) % plank, 5, 1);
      }
    }, 128, 128, 4, 4) },
    vinyl:   { name: '체크 장판', nameEn: 'Checker Vinyl', emoji: '', cost: { cloth: 1, material: 1 }, tex: () => makeCanvasTex((g, w, h) => {
      const t = w / 4;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        g.fillStyle = (r + c) % 2 ? '#c9bfa6' : '#8a8272'; g.fillRect(c * t, r * t, t, t);
      }
      g.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 20; i++) g.fillRect((i * 37) % w, (i * 23) % h, 2, 2);
    }, 128, 128, 4, 4) },
    cement:  { name: '노출 시멘트', nameEn: 'Bare Cement', emoji: '', cost: { material: 1 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#6a6a68'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.1)'; for (let i = 0; i < 30; i++) g.fillRect((i * 37 + 5) % w, (i * 23 + 9) % h, 3 + (i % 4), 1);
      g.strokeStyle = 'rgba(30,30,30,0.4)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(14, 24); g.lineTo(40, 50); g.lineTo(36, 78); g.stroke();
    }, 128, 128, 5, 5) },
    tile:    { name: '타일', nameEn: 'Tile', emoji: '', cost: { material: 2, parts: 1 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#3a3d44'; g.fillRect(0, 0, w, h); // 줄눈
      const tw = w / 4, gap = 3;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        g.fillStyle = ['#8fa0a8', '#849aa2', '#95a6ae', '#7d929a'][(r * 3 + c) % 4];
        g.fillRect(c * tw + gap, r * tw + gap, tw - gap * 2, tw - gap * 2);
      }
    }, 128, 128, 5, 5) },
    carpet:  { name: '카펫', nameEn: 'Carpet', emoji: '', cost: { cloth: 4 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#7a4a48'; g.fillRect(0, 0, w, h);
      const rand = seededRand(63);
      // 보풀 노이즈 (파일 카펫 질감)
      for (let i = 0; i < 900; i++) { g.fillStyle = rand() > 0.5 ? 'rgba(150,90,86,0.25)' : 'rgba(80,44,42,0.3)'; g.fillRect(rand() * w, rand() * h, 2, 2); }
    }, 128, 128, 4, 4) },
    scrap:   { name: '스크랩 판자', nameEn: 'Scrap Boards', emoji: '', cost: { material: 1 }, tex: () => makeCanvasTex((g, w, h) => {
      g.fillStyle = '#7c6549'; g.fillRect(0, 0, w, h);
      const rand = seededRand(41);
      // 제각각 크기의 판자 조각을 이어붙인 느낌
      let y = 0;
      while (y < h) {
        const bh = 12 + rand() * 16; let x = -rand() * 20;
        while (x < w) {
          const bw = 24 + rand() * 30;
          g.fillStyle = ['#836a4a', '#786044', '#8c7250', '#6f5a3e'][Math.floor(rand() * 4)];
          g.fillRect(x, y, bw - 2, bh - 2);
          g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x, y, bw - 2, 1);
          x += bw;
        }
        y += bh;
      }
    }, 128, 128, 3, 3) },
  };
  return { WALLPAPERS, FLOORINGS };
}
