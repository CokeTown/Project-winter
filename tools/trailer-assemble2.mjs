// 트레일러 v2 조립 — 비트 싱크 스펙 기반 프레임 정밀 편집.
//   v1(xfade 체인)과 달리: 스펙의 타임라인대로 프레임을 하드링크해 단일 시퀀스를 만들고 1회 인코딩.
//   → 컷이 프레임 단위로 음악 온셋에 정착(누적 오차 0). 자막 없음(디렉터 확정), 텍스트는 엔드카드만 DungGeunMo.
//   실행: node tools/trailer-assemble2.mjs <spec> <framesV2Root> <framesV1Root> <workDir> <logo> <ttf> <bgm> <out>
import { execSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const [SPEC_P, ROOT2, ROOT1, WORK, LOGO, TTF, BGM, OUT] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(SPEC_P, 'utf8'));
const FPS = spec.fps, SEQ = path.join(WORK, 'seq');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(SEQ, { recursive: true });
fs.copyFileSync(TTF, path.join(WORK, 'font.ttf'));
const FF = 'ffmpeg -hide_banner -loglevel error -y';
const run = c => execSync(c, { cwd: WORK, stdio: ['ignore', 'pipe', 'pipe'] });
const p = s => s.replace(/\\/g, '/');

// 1) 엔드카드 PNG 시퀀스 (배경 + 로고 + Wishlist on Steam[DungGeunMo] + 페이드 인)
console.log('[1] 엔드카드 렌더…');
const EC = spec.endcard, ecDir = path.join(WORK, 'endcard');
fs.mkdirSync(ecDir);
fs.writeFileSync(path.join(WORK, 'wl.txt'), 'Wishlist on Steam');
run(`${FF} -f lavfi -i color=c=0x0d0d12:s=1920x1080:r=${FPS}:d=${(EC.n / FPS).toFixed(3)} -loop 1 -i "${p(LOGO)}" ` +
    `-filter_complex "[1]scale=1180:-1[lg];[0][lg]overlay=(W-w)/2:(H-h)/2-56[b];` +
    `[b]drawtext=textfile=wl.txt:fontfile=font.ttf:fontsize=46:fontcolor=0xE8B87A:x=(w-text_w)/2:y=H/2+238,` +
    `fade=t=in:st=0:d=${EC.fadeIn}[v]" -map "[v]" -frames:v ${EC.n} "${p(path.join(ecDir, 'e%04d.png'))}"`);

// 2) 타임라인 → 단일 프레임 시퀀스 (하드링크, 실패 시 복사). 소스 부족 시 마지막 프레임 클램프.
console.log('[2] 프레임 시퀀스 링크…');
let n = 0;
const place = (src) => {
  const dst = path.join(SEQ, 'f' + String(n++).padStart(5, '0') + '.png');
  try { fs.linkSync(src, dst); } catch (e) { fs.copyFileSync(src, dst); }
};
for (const seg of spec.timeline) {
  const dir = fs.existsSync(path.join(ROOT2, seg.clip)) ? path.join(ROOT2, seg.clip) : path.join(ROOT1, seg.clip);
  const avail = fs.readdirSync(dir).filter(f => f.endsWith('.png')).length;
  for (let k = 0; k < seg.n; k++) {
    const idx = Math.min(seg.srcStart + k, avail - 1); // 클램프 가드
    place(path.join(dir, 'f' + String(idx).padStart(4, '0') + '.png'));
  }
  console.log(`  ${seg.clip}: ${seg.n}f (src ${seg.srcStart}→${Math.min(seg.srcStart + seg.n - 1, avail - 1)}/${avail})`);
}
for (let k = 1; k <= EC.n; k++) place(path.join(ecDir, 'e' + String(k).padStart(4, '0') + '.png'));
console.log(`  총 ${n}프레임 = ${(n / FPS).toFixed(2)}s (스펙 ${spec.totalFrames})`);

// 3) 단일 인코딩 — 그레이드 + 인/아웃 페이드 + Main_theme(0초부터, 컷 그리드와 동일 기준)
console.log('[3] 인코딩…');
const T = n / FPS, fo = (T - 0.8).toFixed(3), afo = (T - 2.6).toFixed(3);
run(`${FF} -framerate ${FPS} -start_number 0 -i "${p(path.join(SEQ, 'f%05d.png'))}" -i "${p(BGM)}" ` +
    `-filter_complex "[0:v]eq=contrast=1.06:saturation=1.08:brightness=0.01,fade=t=in:st=0:d=0.7,fade=t=out:st=${fo}:d=0.8,format=yuv420p[v];` +
    `[1:a]atrim=0:${T.toFixed(3)},afade=t=in:st=0:d=1.2,afade=t=out:st=${afo}:d=2.6,volume=0.88[a]" ` +
    `-map "[v]" -map "[a]" -c:v libx264 -crf 18 -c:a aac -b:a 192k -movflags +faststart -shortest "${p(OUT)}"`);
console.log('DONE →', OUT, `(${T.toFixed(2)}s)`);
