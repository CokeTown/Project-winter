// 트레일러 조립 v4 — 디제틱 사운드 이벤트 시스템 (STORYBOARD-2TRAILERS §5-①).
//   assemble3의 2패스 구조 + 스펙의 sfxEvents[{f,at,vol,dur?,fi?,fo?}]를 전부 개별 트랙으로
//   adelay·페이드·볼륨 후 amix — 컷마다 그 장소·행동의 소리가 실린다. 최종 loudnorm -14 LUFS.
//   실행: node tools/trailer-assemble4.mjs <spec> <r3> <r2> <r1> <work> <logo> <ttf> <bgm> <sfxDir> <out>
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
fs.writeFileSync(path.join(WORK, 'wl.txt'), 'Wishlist on Steam'); // CTA 1개(위시리스트). 날짜 금지(COMMS-KIT §4 — 달력 착시 방지)
if (EC.transitionFrom) {
  // v15 아련 트랜지션 (디렉터): 밤 와이드(죽은 도시 속 따뜻한 창)의 마지막 프레임이 어두워지며
  //   그 위로 Nine Winters 로고가 스며든다 — 하드컷 대신 크로스 디졸브. 대비(죽은 바깥/따뜻한 안)가 생명.
  const srcDir = [ROOT3, ROOT2, ROOT1].map(r => path.join(r, EC.transitionFrom)).find(d => fs.existsSync(d));
  const frames = fs.readdirSync(srcDir).filter(f => f.endsWith('.png')).sort();
  const lastF = path.join(srcDir, frames[frames.length - 1]);
  const D = EC.n / FPS, dk0 = (D * 0.18).toFixed(3), dkD = (D * 0.55).toFixed(3); // 어두워짐 램프
  const wlT = (D * 0.55).toFixed(3);                                              // 위시리스트 등장 시점
  const tag = EC.tagline ? (fs.writeFileSync(path.join(WORK, 'tag.txt'), EC.tagline),
    `drawtext=textfile=tag.txt:fontfile=font.ttf:fontsize=64:fontcolor=0xf0e6cf:x=(w-text_w)/2:y=h/2-330:` +
    `alpha='min(1,max(0,(t-${(D * 0.08).toFixed(3)})/0.5))',`) : ''; // v17 태그라인 — 로고보다 먼저 스며든다
  run(`${FF} -loop 1 -t ${D.toFixed(3)} -framerate ${FPS} -i "${p(lastF)}" -loop 1 -t ${D.toFixed(3)} -framerate ${FPS} -i "${p(LOGO)}" ` +
      `-filter_complex "[0]fade=t=out:st=${dk0}:d=${dkD}:color=0x0d0d12[bg];` +
      // v20: 픽셀 로고는 하드 스케일(정수배 1120=논리160×7)+neighbor. 기본 바이리니어는 픽셀을 뭉갬(실금·흐림 재발).
      `[1]scale=1120:-1:flags=neighbor,format=rgba,fade=t=in:st=${(D * 0.12).toFixed(3)}:d=${(D * 0.5).toFixed(3)}:alpha=1[lg];` +
      `[bg][lg]overlay=(W-w)/2:(H-h)/2-56,${tag}` +
      `drawtext=textfile=wl.txt:fontfile=font.ttf:fontsize=46:fontcolor=0xE8B87A:x=(w-text_w)/2:y=h/2+238:alpha='if(lt(t,${wlT}),0,min(1,(t-${wlT})/0.6))'[v]" ` +
      `-map "[v]" -frames:v ${EC.n} "${p(path.join(ecDir, 'e%04d.png'))}"`);
} else {
run(`${FF} -f lavfi -i color=c=0x0d0d12:s=1920x1080:r=${FPS}:d=${(EC.n / FPS).toFixed(3)} -loop 1 -i "${p(LOGO)}" ` +
    `-filter_complex "[1]scale=1120:-1:flags=neighbor[lg];[0][lg]overlay=(W-w)/2:(H-h)/2-56[b];` +
    `[b]drawtext=textfile=wl.txt:fontfile=font.ttf:fontsize=46:fontcolor=0xE8B87A:x=(w-text_w)/2:y=H/2+238,` +
    `fade=t=in:st=0:d=${EC.fadeIn}[v]" -map "[v]" -frames:v ${EC.n} "${p(path.join(ecDir, 'e%04d.png'))}"`);
}

// 2) 프레임 시퀀스 (3단 폴백)
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
// GMTK Step5 '버튼': 로고 뒤 [암전 darkN] → 마지막 장난 컷 (spec.button = {clip, srcStart, n, darkN})
if (spec.button) {
  const b = spec.button;
  if (b.darkN) { // 암전 0.5s (V2 컷14) — 검정 프레임 생성 후 링크
    const blackP = path.join(WORK, 'black.png');
    run(`${FF} -f lavfi -i color=c=black:s=1920x1080 -frames:v 1 "${p(blackP)}"`);
    for (let k = 0; k < b.darkN; k++) place(blackP);
  }
  const dir = [ROOT3, ROOT2, ROOT1].map(r => path.join(r, b.clip)).find(d => fs.existsSync(d));
  const avail = dir ? fs.readdirSync(dir).filter(f => f.endsWith('.png')).length : 0;
  for (let k = 0; k < b.n; k++) place(path.join(dir, 'f' + String(Math.min(b.srcStart + k, avail - 1)).padStart(4, '0') + '.png'));
  console.log(`  button(${b.clip}): 암전 ${b.darkN || 0}f + ${b.n}f`);
}
console.log(`  총 ${n}f = ${(n / FPS).toFixed(2)}s (스펙 ${spec.totalFrames})`);

// 3a) 오디오 — 음악 + 디제틱 이벤트 전부 믹스 + loudnorm
console.log(`[3a] 오디오 (음악 + 이벤트 ${spec.sfxEvents.length}개)…`);
const T = n / FPS;
const mu = spec.music || { fadeIn: 1.2, fadeOutDur: 2.6, vol: 0.85 };
const mT = +(mu.trimTo || T); // trimTo: 음악을 엔드카드에서 끝내고 버튼 컷은 정적 속에 (GMTK Step5)
// v18 startAt: 오프닝 확장(+2.55s)으로 그루브 드랍이 몽타주보다 앞서므로 음악을 지연시켜 재정렬.
//   adelay로 앞에 정적 삽입 → 스트림=화면 시각. fade-in은 음악 진입점, fade-out은 (지연+음악끝-길이).
const st0 = +(mu.startAt || 0);
const delayStr = st0 > 0 ? `,adelay=${Math.round(st0 * 1000)}|${Math.round(st0 * 1000)}` : '';
const afo = (st0 + mT - mu.fadeOutDur).toFixed(3);
const inputs = [`-i "${p(BGM)}"`];
const chains = [`[0:a]atrim=0:${mT.toFixed(3)}${delayStr},apad=whole_dur=${T.toFixed(3)},afade=t=in:st=${st0.toFixed(3)}:d=${mu.fadeIn},afade=t=out:st=${afo}:d=${mu.fadeOutDur},volume=${mu.vol}[m]`];
const mixIns = ['[m]'];
spec.sfxEvents.forEach((e, i) => {
  const idx = i + 1;
  inputs.push(`-i "${p(path.join(SFXDIR, e.f))}"`);
  const parts = [];
  // pitch: 반복 SFX의 무지성 동일음 방지 (디렉터 신고) — asetrate 피치+속도 미세 변주 (인게임 jitter 관례)
  if (e.pitch && e.pitch !== 1) parts.push(`aresample=44100`, `asetrate=${Math.round(44100 * e.pitch)}`, `aresample=44100`);
  if (e.dur) parts.push(`atrim=0:${e.dur}`);
  if (e.fi) parts.push(`afade=t=in:st=0:d=${e.fi}`);
  if (e.fo && e.dur) parts.push(`afade=t=out:st=${(e.dur - e.fo).toFixed(3)}:d=${e.fo}`);
  parts.push(`volume=${e.vol}`);
  const ms = Math.round(e.at * 1000);
  parts.push(`adelay=${ms}|${ms}`);
  chains.push(`[${idx}:a]${parts.join(',')}[s${idx}]`);
  mixIns.push(`[s${idx}]`);
});
const graph = chains.join(';') + `;${mixIns.join('')}amix=inputs=${mixIns.length}:duration=first:normalize=0,` +
  `loudnorm=I=-14:TP=-1.5:LRA=11[a]`; // 유튜브/스팀 압축 대비 라우드니스 정규화 (§6-R4)
fs.writeFileSync(path.join(WORK, 'agraph.txt'), graph); // 디버그 보존
run(`${FF} ${inputs.join(' ')} -filter_complex "${graph}" -map "[a]" -c:a aac -b:a 192k audio.m4a`);

// 3b) 영상 + 3c) 먹스 (assemble3와 동일 2패스 — 결합 그래프 데드락 회피)
console.log('[3b] 영상 인코딩…');
const vf = spec.videoFade || { in: 0.9, out: 0.8 }; // 11팁 #1·#2: 페이드인은 첫 5초 낭비 — 스펙이 단축 지정
const fo = (T - vf.out).toFixed(3);
// v12 동사 오버레이 (spec.overlays[{text,from,to}]) — 픽셀폰트 골드, 좌하단, 0.3s 페이드 (장르 이해도)
const ovls = spec.overlays || [];
ovls.forEach((o, i) => fs.writeFileSync(path.join(WORK, 'ovl' + i + '.txt'), o.text));
const ovlChain = ovls.map((o, i) =>
  // v17: 위치 분기 — 시네마틱 컷(pos:'bottom')=하단 중앙(아련), UI 컷=상단 중앙(HUD 회피)
  `drawtext=textfile=ovl${i}.txt:fontfile=font.ttf:fontsize=${o.size || 58}:fontcolor=0xE8B87A:box=1:boxcolor=0x0d0d12@0.55:boxborderw=18:x=(w-text_w)/2:y=${o.pos === 'bottom' ? 'h-190' : '64'}:` +
  `alpha='if(lt(t,${o.from}+0.3),(t-${o.from})/0.3,if(gt(t,${o.to}-0.3),(${o.to}-t)/0.3,1))':enable='between(t,${o.from},${o.to})'`
).join(',');
run(`${FF} -framerate ${FPS} -start_number 0 -i "${p(path.join(SEQ, 'f%05d.png'))}" ` +
    `-vf "eq=contrast=1.06:saturation=1.08:brightness=0.01${ovlChain ? ',' + ovlChain : ''},fade=t=in:st=0:d=${vf.in},fade=t=out:st=${fo}:d=${vf.out},format=yuv420p" ` +
    `-c:v libx264 -crf 18 video.mp4`);
console.log('[3c] 먹스…');
run(`${FF} -i video.mp4 -i audio.m4a -map 0:v -map 1:a -c copy -movflags +faststart -shortest "${p(OUT)}"`);
console.log('DONE →', OUT, `(${T.toFixed(2)}s)`);
