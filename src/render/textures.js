/* ============================================================
   render/textures.js — 절차적 표면 텍스처 (game.js 모놀리스 분해 Tier 4)
   ------------------------------------------------------------
   canvas로 그리는 픽셀 표면 텍스처 생성기 + 로드타임 상수 7종(바닥/벽 나무·금속·합판·벽돌·타일·콘크리트).
   순수 렌더 리프(파라미터→THREE.CanvasTexture, game.js로 되돌아 호출 안 함). 의존: three만.
   makeCanvasTex는 셸터 지오메트리 빌더가 인라인 텍스처 생성에도 쓴다(그래서 export).
   ============================================================ */
import * as THREE from 'three';

export function makeCanvasTex(draw, w = 128, h = 128, repX = 1, repY = 1) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const floorWoodTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#8a6a48'; g.fillRect(0, 0, w, h);
  const plank = h / 4;
  for (let r = 0; r < 4; r++) {
    g.fillStyle = ['#8f6f4c', '#846544', '#967551', '#7e6040'][r % 4];
    g.fillRect(0, r * plank, w, plank);
    g.fillStyle = '#5d452c'; g.fillRect(0, r * plank, w, 2);
    const off = (r * 53) % w;
    g.fillRect(off, r * plank, 2, plank);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 14; i++) g.fillRect((off + i * 31) % w, r * plank + (i * 13) % plank, 5, 1);
  }
}, 128, 128, 5, 4);
export const wallWoodTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#a08258'; g.fillRect(0, 0, w, h);
  const plank = w / 5;
  for (let c = 0; c < 5; c++) {
    g.fillStyle = ['#a5875c', '#9a7c52', '#ab8d63', '#94774e', '#a1835a'][c];
    g.fillRect(c * plank, 0, plank, h);
    g.fillStyle = '#6e5636'; g.fillRect(c * plank, 0, 2, h);
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < 10; i++) g.fillRect(c * plank + 4 + (i * 7) % (plank - 6), (c * 37 + i * 29) % h, 2, 6);
  }
}, 128, 128, 3, 1);
export const metalTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#5c6670'; g.fillRect(0, 0, w, h);
  const rib = w / 8;
  for (let c = 0; c < 8; c++) {
    g.fillStyle = c % 2 ? '#525b64' : '#616b76';
    g.fillRect(c * rib, 0, rib, h);
    g.fillStyle = '#3d444c'; g.fillRect(c * rib, 0, 2, h);
  }
  // 녹 얼룩
  g.fillStyle = 'rgba(140,84,52,0.55)';
  for (let i = 0; i < 9; i++) {
    const x = (i * 41 + 13) % w, y = (i * 67 + 30) % h;
    g.fillRect(x, y, 5 + (i * 7) % 12, 3 + (i * 5) % 9);
  }
  g.fillStyle = 'rgba(110,62,38,0.5)';
  for (let i = 0; i < 6; i++) g.fillRect((i * 53 + 5) % w, h - 14 - (i * 11) % 10, 4 + (i * 9) % 14, 6);
}, 128, 128, 3, 1);
export const plywoodTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#9c8563'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#7a6749'; g.lineWidth = 2;
  g.strokeRect(1, 1, w / 2 - 2, h - 2); g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h - 2);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 22; i++) g.fillRect((i * 29 + 7) % w, (i * 17 + 3) % h, 8, 1);
  g.fillStyle = 'rgba(90,60,40,0.35)';
  for (let i = 0; i < 4; i++) g.fillRect((i * 47 + 20) % w, (i * 61 + 12) % h, 10, 7);
}, 128, 128, 3, 2);
export const brickTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#8a5138'; g.fillRect(0, 0, w, h);
  const bh = h / 8, bw = w / 4;
  for (let r = 0; r < 8; r++) {
    for (let c = -1; c < 5; c++) {
      const off = r % 2 ? bw / 2 : 0;
      g.fillStyle = ['#94583c', '#84492f', '#9c6244', '#7d452c'][(r * 3 + c + 4) % 4];
      g.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
    }
  }
  g.fillStyle = 'rgba(40,28,20,0.5)';
  for (let i = 0; i < 12; i++) g.fillRect((i * 43 + 11) % w, (i * 29 + 5) % h, 6 + (i * 5) % 10, 3);
}, 128, 128, 3, 2);
export const subwayTileTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#7a8a7e'; g.fillRect(0, 0, w, h);
  const tw = w / 6, th = h / 8;
  for (let r = 0; r < 8; r++) {
    for (let c = -1; c < 7; c++) {
      const off = r % 2 ? tw / 2 : 0;
      g.fillStyle = ['#84948a', '#7c8c80', '#8d9c90', '#75857a'][(r * 5 + c + 8) % 4];
      g.fillRect(c * tw + off + 1, r * th + 1, tw - 2, th - 2);
    }
  }
  g.fillStyle = 'rgba(30,35,30,0.4)';
  for (let i = 0; i < 10; i++) g.fillRect((i * 47 + 9) % w, (i * 31 + 4) % h, 5 + (i * 3) % 8, 3);
}, 128, 128, 3, 1);
export const concreteTex = makeCanvasTex((g, w, h) => {
  g.fillStyle = '#6a6a68'; g.fillRect(0, 0, w, h);
  const tile = w / 2;
  g.strokeStyle = '#4e4e4c'; g.lineWidth = 2;
  g.strokeRect(1, 1, tile - 2, tile - 2); g.strokeRect(tile + 1, 1, tile - 2, tile - 2);
  g.strokeRect(1, tile + 1, tile - 2, tile - 2); g.strokeRect(tile + 1, tile + 1, tile - 2, tile - 2);
  g.fillStyle = 'rgba(0,0,0,0.1)';
  for (let i = 0; i < 26; i++) g.fillRect((i * 37 + 5) % w, (i * 23 + 9) % h, 3 + (i % 4), 1);
  // 균열
  g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(10, 20); g.lineTo(34, 44); g.lineTo(30, 70); g.stroke();
  g.beginPath(); g.moveTo(90, 100); g.lineTo(74, 82); g.lineTo(84, 60); g.stroke();
}, 128, 128, 4, 3);
