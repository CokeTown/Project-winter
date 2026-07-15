// 트레일러 조립: 인엔진 클립 프레임 → 자막 번인 → xfade 크로스페이드 체인 → 엔드카드(로고+위시리스트) → Main_theme.
//   3막 구조(온기→바깥→회색의 아름다움). 자막은 CUT-SHEET 승인 영문 카피(스토어 메인 언어).
//   실행: node tools/trailer-assemble.mjs <framesRoot> <workDir> <logoPng> <bgmMp3> <outMp4>
import { execSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
const [ROOT, WORK, LOGO, BGM, OUT] = process.argv.slice(2);
fs.mkdirSync(WORK, { recursive: true });
fs.copyFileSync('C:/Windows/Fonts/arialbd.ttf', path.join(WORK, 'font.ttf'));
const FF = 'ffmpeg -hide_banner -loglevel error -y';
const run = (cmd) => execSync(cmd, { cwd: WORK, stdio: ['ignore', 'pipe', 'pipe'] });
const T = 0.35; // 크로스페이드 길이(s)
const FPS = 30;

// 클립: id·프레임수·자막(영문, 없으면 null). 순서 = 편집 순서.
const CLIPS = [
  { id: 'a1_cozy', f: 96, text: 'The world has ended.' },
  { id: 'a2_decorate', f: 108, text: 'Yet today can still be tended.' },
  { id: 'a3_cat', f: 96, text: null },
  { id: 'b1_map', f: 78, text: null },
  { id: 'b2_cabin', f: 96, text: null },
  { id: 'b3_yacht', f: 96, text: 'Open the door, and the world widens.' },
  { id: 'b4_greenhouse', f: 96, text: null },
  { id: 'c1_coldsnap', f: 96, text: 'The grey is beautiful, and just as cold.' },
  { id: 'c2_signal', f: 120, text: 'A signal goes out. May someone hear.' },
];

// 1) 클립별 중간 mp4 — 스케일·fps·경미한 그레이드 + 자막 번인(fade in/out). 자막은 textfile로 이스케이프 회피.
console.log('[1] 클립 인코딩…');
const durs = [];
CLIPS.forEach((c, i) => {
  const D = c.f / FPS; durs.push(D);
  const grade = 'eq=contrast=1.06:saturation=1.08:brightness=0.01';
  let vf = `scale=1920:1080:flags=lanczos,fps=${FPS},${grade}`;
  if (i === 0) vf += ',fade=t=in:st=0:d=0.7'; // 오프닝 암전에서 페이드 인
  if (c.text) {
    const tf = `sub${i}.txt`; fs.writeFileSync(path.join(WORK, tf), c.text);
    // 하단 자막: 흰 글자 + 검은 외곽/그림자, 0.5s 페이드 인/아웃(클립 로컬 t 기준)
    const a = `alpha='min(1\\,min((t-0.35)/0.5\\,(${D.toFixed(3)}-0.35-t)/0.5))'`;
    vf += `,drawtext=textfile=${tf}:fontfile=font.ttf:fontsize=50:fontcolor=white:` +
          `borderw=3:bordercolor=black@0.85:shadowx=2:shadowy=2:shadowcolor=black@0.6:` +
          `x=(w-text_w)/2:y=h-176:${a}`;
  }
  run(`${FF} -framerate ${FPS} -i "${path.join(ROOT, c.id, 'f%04d.png').replace(/\\/g, '/')}" ` +
      `-vf "${vf}" -c:v libx264 -crf 18 -pix_fmt yuv420p -an "${c.id}.mp4"`);
});

// 2) 엔드카드 — 어두운 배경 + 로고 워드마크 + "Wishlist on Steam" (따뜻한 앰버), 페이드 인.
console.log('[2] 엔드카드…');
const ECD = 3.8;
fs.writeFileSync(path.join(WORK, 'wl.txt'), 'Wishlist on Steam');
run(`${FF} -f lavfi -i color=c=0x0d0d12:s=1920x1080:r=${FPS} -loop 1 -i "${LOGO.replace(/\\/g, '/')}" ` +
    `-filter_complex "[1]scale=1180:-1[lg];[0][lg]overlay=(W-w)/2:(H-h)/2-56[b];` +
    `[b]drawtext=textfile=wl.txt:fontfile=font.ttf:fontsize=48:fontcolor=0xE8B87A:x=(w-text_w)/2:y=H/2+238,` +
    `fade=t=in:st=0:d=0.7,format=yuv420p[v]" -map "[v]" -t ${ECD} -c:v libx264 -crf 18 endcard.mp4`);
durs.push(ECD);
const SEGS = [...CLIPS.map(c => c.id), 'endcard'];

// 3) xfade 체인 — 연속 세그먼트를 T초 크로스페이드로 연결. offset 누적 계산.
console.log('[3] xfade 크로스페이드 체인…');
const inputs = SEGS.map(s => `-i "${s}.mp4"`).join(' ');
let fc = ''; let prev = '0:v'; let C = durs[0];
for (let i = 1; i < SEGS.length; i++) {
  const off = (C - T).toFixed(3);
  const out = (i === SEGS.length - 1) ? 'vout' : `x${i}`;
  fc += `[${prev}][${i}:v]xfade=transition=fade:duration=${T}:offset=${off}[${out}];`;
  prev = out; C = C + durs[i] - T;
}
fc = fc.replace(/;$/, '');
const TOTAL = C.toFixed(3);
run(`${FF} ${inputs} -filter_complex "${fc}" -map "[vout]" -c:v libx264 -crf 18 -pix_fmt yuv420p video.mp4`);
console.log('   총 길이 =', TOTAL, 's');

// 4) 오디오 — Main_theme를 총 길이에 맞춰 트림 + 인/아웃 페이드, 비디오에 믹스.
console.log('[4] Main_theme 믹스…');
const fadeOut = (parseFloat(TOTAL) - 2.6).toFixed(3);
run(`${FF} -i video.mp4 -i "${BGM.replace(/\\/g, '/')}" ` +
    `-filter_complex "[1:a]atrim=0:${TOTAL},afade=t=in:st=0:d=1.6,afade=t=out:st=${fadeOut}:d=2.6,volume=0.85[a]" ` +
    `-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "${OUT.replace(/\\/g, '/')}"`);

console.log('DONE →', OUT, '(', TOTAL, 's )');
