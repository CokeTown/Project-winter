// render/weatherfx.js — Tier4 렌더 추출 Phase1-④: 화면(2D 캔버스) 날씨 오버레이.
//   유리를 타고 흐르는 빗방울(폭우) + 화면 가장자리 서리/눈꽃(눈·한파). 자체 상태(fxDrops/fxFlakes/
//   fxFrost/fxRainAcc) 소유의 자족 서브시스템. seededRand/coldSnapActive는 직접 import, game.js 결합은
//   state·weather(안정 객체) 직접 주입 + SHELTERS/titleVisible(늦은 정의) 게터만.
//   ※ 3D 파티클(updateWeather)·환경 애니(updateEnvironment)는 날씨 상태전이/25전역 오케스트레이터라 game.js 잔류.
//   외부 진입점: updateScreenFx(renderFrame 말미) / resizeFx(리사이즈 핸들러). 게이트: d_snow_accum·d_rain_wet 동역학 씬이 커버.
import { seededRand } from '../lib/helpers.js';
import { coldSnapActive } from '../core/coldsnap.js';

export function makeScreenFx(ctx) {
  const { state, weather, getSHELTERS, getTitleVisible } = ctx;
  const fxCanvas = document.getElementById('fx');
  const fxg = fxCanvas.getContext('2d');
  let fxW = 0, fxH = 0, fxFrost = 0, fxRainAcc = 0;
  const fxDrops = [];
  const fxFlakes = (() => {
    // 서리 눈꽃 결정: 화면 가장자리에 고정 배치 (시야 중앙은 비워둔다)
    const rand = seededRand(77);
    const fl = [];
    for (let i = 0; i < 18; i++) {
      const edge = Math.floor(rand() * 4);
      const a = rand(), b = Math.pow(rand(), 2.2) * 0.2;
      let x, y;
      if (edge === 0) { x = a; y = b; } else if (edge === 1) { x = a; y = 1 - b; }
      else if (edge === 2) { x = b; y = a; } else { x = 1 - b; y = a; }
      fl.push({ x, y, r: 13 + rand() * 26, rot: rand() * Math.PI, ph: rand() * Math.PI * 2 });
    }
    return fl;
  })();
  function resizeFx() { fxW = fxCanvas.width = innerWidth; fxH = fxCanvas.height = innerHeight; }
  function drawFlake(x, y, r, rot, alpha) {
    fxg.save();
    fxg.translate(x, y); fxg.rotate(rot);
    fxg.strokeStyle = `rgba(215,232,248,${alpha.toFixed(3)})`;
    fxg.lineWidth = 1.2;
    for (let a = 0; a < 6; a++) {
      fxg.rotate(Math.PI / 3);
      fxg.beginPath();
      fxg.moveTo(0, 0); fxg.lineTo(r, 0);
      for (const f of [0.4, 0.66]) {
        fxg.moveTo(r * f, 0); fxg.lineTo(r * f + r * 0.2, r * 0.16);
        fxg.moveTo(r * f, 0); fxg.lineTo(r * f + r * 0.2, -r * 0.16);
      }
      fxg.stroke();
    }
    fxg.restore();
  }
  function updateScreenFx(dt, t) {
    if (!fxW) resizeFx();
    fxg.clearRect(0, 0, fxW, fxH);
    const indoorSh = !!getSHELTERS()[state.current]?.indoor;
    // ── 빗방울: 화면(유리창)을 타고 흘러내린다 (폭우 전용 — 일반 비는 오버레이 없음)
    const raining = weather.type === 'storm' && !indoorSh && !getTitleVisible();
    if (raining && fxDrops.length < 44) {
      fxRainAcc += dt * 12;
      while (fxRainAcc > 1) {
        fxRainAcc -= 1;
        fxDrops.push({
          x: Math.random() * fxW, y: -10 - Math.random() * fxH * 0.3,
          r: 1.6 + Math.random() * 2.4, vy: 24 + Math.random() * 80,
          ph: Math.random() * 9, trail: [],
        });
      }
    }
    for (let i = fxDrops.length - 1; i >= 0; i--) {
      const d = fxDrops[i];
      d.vy += dt * 24;
      // 미끄러지다 멈칫하고 다시 흐르는 느낌
      d.y += d.vy * (0.55 + 0.45 * Math.sin(t * 1.7 + d.ph)) * dt;
      d.x += Math.sin(t * 2.2 + d.ph) * 13 * dt;
      d.trail.push([d.x, d.y]);
      if (d.trail.length > 13) d.trail.shift();
      if (d.y > fxH + 12) { fxDrops.splice(i, 1); continue; }
      fxg.strokeStyle = 'rgba(190,214,235,0.10)'; // 흘러간 자국
      fxg.lineWidth = d.r * 1.1;
      fxg.lineCap = 'round';
      fxg.beginPath();
      for (let k = 0; k < d.trail.length; k++) {
        const p = d.trail[k];
        k ? fxg.lineTo(p[0], p[1]) : fxg.moveTo(p[0], p[1]);
      }
      fxg.stroke();
      fxg.fillStyle = 'rgba(205,228,246,0.32)'; // 물방울 본체
      fxg.beginPath(); fxg.ellipse(d.x, d.y, d.r, d.r * 1.35, 0, 0, Math.PI * 2); fxg.fill();
      fxg.fillStyle = 'rgba(240,250,255,0.5)';  // 하이라이트
      fxg.beginPath(); fxg.arc(d.x - d.r * 0.3, d.y - d.r * 0.4, d.r * 0.3, 0, Math.PI * 2); fxg.fill();
    }
    // ── 서리: 눈 오는 날 화면 가장자리에 성에와 눈 결정이 낀다. 한파+눈이면 강도 최대
    const cold = coldSnapActive();
    const frostBase = (weather.type === 'snow' && !indoorSh && !getTitleVisible()) ? 1 : 0;
    const frostTarget = frostBase && cold ? 1.6 : frostBase; // 한파 중엔 서리 오버레이 강화 (디렉터 승인)
    fxFrost += (frostTarget - fxFrost) * Math.min(1, dt * (frostTarget ? 0.05 : 0.1));
    if (fxFrost > 0.02) {
      const m = Math.min(fxW, fxH);
      for (const [cx, cy] of [[0, 0], [fxW, 0], [0, fxH], [fxW, fxH]]) {
        const gr = fxg.createRadialGradient(cx, cy, 0, cx, cy, m * 0.42);
        gr.addColorStop(0, `rgba(214,232,248,${(0.26 * fxFrost).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(214,232,248,0)');
        fxg.fillStyle = gr;
        fxg.fillRect(0, 0, fxW, fxH);
      }
      for (const f of fxFlakes) {
        const tw = 0.75 + 0.25 * Math.sin(t * 0.7 + f.ph);
        drawFlake(f.x * fxW, f.y * fxH, f.r * (0.6 + 0.4 * fxFrost), f.rot, 0.5 * fxFrost * tw);
      }
    }
  }

  return { updateScreenFx, resizeFx };
}
