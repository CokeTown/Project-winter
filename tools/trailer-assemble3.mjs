// 트레일러 v3 조립 — 버티컬 슬라이스 편집 + 라이터 오프닝 SFX 믹스.
//   v2(assemble2)와 동일한 프레임 정밀 하드링크 방식. 추가: 오디오 3트랙 믹스
//   (Main_theme + candle_light[라이터·점화 온셋 정착] + amb_fire[점화 후 장작 소리, 지도 컷에서 아웃]).
//   실행: node tools/trailer-assemble3.mjs <spec> <r3> <r2> <r1> <work> <logo> <ttf> <bgm> <sfxDir> <out>
import { execSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const [SPEC_P, ROOT3, ROOT2, ROOT1, WORK, LOGO, TTF, BGM, SFXDIR, OUT] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(SPEC_P, 'utf8'));
const FPS = spec.fps, SEQ = path.join(WORK, 'seq');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(SEQ, { recursive: true });
fs.copyFileSync(TTF, path.join(WORK, 'font.ttf'));
const FF = 'ffmpeg -hide_banner -loglevel error -y';
const run = c => execSync(c, { cwd: WORK, stdio: ['ignore', 'pipe', 'pipe'] });
const p = s => s.replace(/\\/g, '/');

// 1) 엔드카드
console.log('[1] 엔드카드…');
const EC = spec.endcard, ecDir = path.join(WORK, 'endcard');
fs.mkdirSync(ecDir);
fs.writeFileSync(path.join(WORK, 'wl.txt'), 'Wishlist on Steam');
run(`${FF} -f lavfi -i color=c=0x0d0d12:s=1920x1080:r=${FPS}:d=${(EC.n / FPS).toFixed(3)} -loop 1 -i "${p(LOGO)}" ` +
    `-filter_complex "[1]scale=1180:-1[lg];[0][lg]overlay=(W-w)/2:(H-h)/2-56[b];` +
    `[b]drawtext=textfile=wl.txt:fontfile=font.ttf:fontsize=46:fontcolor=0xE8B87A:x=(w-text_w)/2:y=H/2+238,` +
    `fade=t=in:st=0:d=${EC.fadeIn}[v]" -map "[v]" -frames:v ${EC.n} "${p(path.join(ecDir, 'e%04d.png'))}"`);

// 2) 프레임 시퀀스 (3단 폴백: v3 신규 → v2 → v1)
console.log('[2] 프레임 링크…');
let n = 0;
const place = (src) => {
  const dst = path.join(SEQ, 'f' + String(n++).padStart(5, '0') + '.png');
  try { fs.linkSync(src, dst); } catch (e) { fs.copyFileSync(src, dst); }
};
for (const seg of spec.timeline) {
  const dir = [ROOT3, ROOT2, ROOT1].map(r => path.join(r, seg.clip)).find(d => fs.existsSync(d));
  if (!dir) { console.error('클립 없음:', seg.clip); process.exit(1); }
  const avail = fs.readdirSync(dir).filter(f => f.endsWith('.png')).length;
  for (let k = 0; k < seg.n; k++) place(path.join(dir, 'f' + String(Math.min(seg.srcStart + k, avail - 1)).padStart(4, '0') + '.png'));
  console.log(`  ${seg.clip}: ${seg.n}f ← ${path.basename(path.dirname(dir))}`);
}
for (let k = 1; k <= EC.n; k++) place(path.join(ecDir, 'e' + String(k).padStart(4, '0') + '.png'));
console.log(`  총 ${n}f = ${(n / FPS).toFixed(2)}s (스펙 ${spec.totalFrames})`);

// 3) 2패스 인코딩 — 오디오 믹스와 영상을 분리한다.
//   단일 패스(PNG 시퀀스 + amix 결합 그래프)는 영상 소진 후 오디오 EOF 플러시에서 재현 100% 데드락
//   (3회 연속 정확히 같은 바이트에서 정지, 오디오 단독·영상 단독은 각각 완주). 분리가 정답.
const T = n / FPS, fo = (T - 0.8).toFixed(3), afo = (T - 2.6).toFixed(3);
const sx = spec.sfx;
const ltMs = Math.round(sx.lighterAtSec * 1000);
const fireMs = Math.round(sx.fireFromSec * 1000);
const fireDur = (sx.fireUntilSec - sx.fireFromSec + 0.4).toFixed(3);
console.log('[3a] 오디오 믹스 (음악 · 라이터 · 장작)…');
run(`${FF} -i "${p(BGM)}" -i "${p(path.join(SFXDIR, 'candle_light.ogg'))}" -i "${p(path.join(SFXDIR, 'amb_fire.ogg'))}" ` +
    `-filter_complex "[0:a]atrim=0:${T.toFixed(3)},afade=t=in:st=0:d=1.2,afade=t=out:st=${afo}:d=2.6,volume=0.88[m];` +
    `[1:a]volume=0.9,adelay=${ltMs}|${ltMs}[lt];` +
    `[2:a]atrim=0:${fireDur},afade=t=in:st=0:d=0.5,afade=t=out:st=${(fireDur - 0.9).toFixed(3)}:d=0.9,volume=0.32,adelay=${fireMs}|${fireMs}[fr];` +
    `[m][lt][fr]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.97[a]" -map "[a]" -c:a aac -b:a 192k audio.m4a`);
console.log('[3b] 영상 인코딩…');
run(`${FF} -framerate ${FPS} -start_number 0 -i "${p(path.join(SEQ, 'f%05d.png'))}" ` +
    `-vf "eq=contrast=1.06:saturation=1.08:brightness=0.01,fade=t=in:st=0:d=0.9,fade=t=out:st=${fo}:d=0.8,format=yuv420p" ` +
    `-c:v libx264 -crf 18 video.mp4`);
console.log('[3c] 먹스…');
run(`${FF} -i video.mp4 -i audio.m4a -map 0:v -map 1:a -c copy -movflags +faststart -shortest "${p(OUT)}"`);
console.log('DONE →', OUT, `(${T.toFixed(2)}s)`);
