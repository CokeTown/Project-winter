// 트레일러 V5 조립 — 프레임 시퀀스 10컷 → 1080p30 mp4 (+ OST 믹스 + 엔드카드)
//   ffmpeg 단일 필터그래프: 컷 concat → 페이드인/아웃 → 엔드카드 로고 오버레이 → 오디오 믹스.
//   실행: node tools/trailer-assemble5.mjs [srcRoot] [out.mp4]
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const FFMPEG = process.env.FFMPEG || 'C:/Users/mhdmj/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe';
const SRC = process.argv[2] || 'scratchpad/trailer5';
const OUT = process.argv[3] || 'scratchpad/trailer5/nine-winters-gameplay-v5.mp4';
// 음악은 게임 본편 메인 테마(디렉터: "왜 main theme이 아니라 다른거지?").
//   docs/.../Main_Theme_Orchestra2.mp3는 오케스트라 편곡본으로 인게임 테마와 다른 곡이다.
const MUSIC = process.env.MUSIC || 'public/BGM/Main_theme.mp3';
const MUSIC_AT = +(process.env.MUSIC_AT || 0); // 곡 시작 오프셋(초) — 훅 구간을 쓰고 싶을 때
const LOGO = 'docs/steam/capsules/v6/library_logo.png'; // 투명 워드마크
const FPS = 30;
const ORDER = ['c1_search', 'c2_build', 'c3_decorate', 'c4_shelter1', 'c4_shelter2', 'c4_shelter3', 'c4_shelter4', 'c5_cat',
  ...Array.from({ length: 10 }, (_, i) => 'c6_m' + String(i).padStart(2, '0')), 'c7_title'];

const tmp = path.join(SRC, '_seq');
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

// 컷들을 하나의 연속 시퀀스로 하드링크/복사 (concat demuxer보다 안정적 — 프레임 번호가 전역 단조)
let n = 0, missing = [];
const cutAt = []; // 컷 경계(초) — 여기에 키프레임을 강제해 장면 전환 블록 노이즈를 없앤다
for (const id of ORDER) {
  const dir = path.join(SRC, id);
  if (!fs.existsSync(dir)) { missing.push(id); continue; }
  if (n) cutAt.push((n / FPS).toFixed(3));
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.png')).sort()) {
    fs.copyFileSync(path.join(dir, f), path.join(tmp, 'f' + String(n++).padStart(5, '0') + '.png'));
  }
}
if (missing.length) console.log('경고: 누락 컷 ' + missing.join(','));
const total = n, dur = total / FPS;
console.log('프레임 ' + total + ' = ' + dur.toFixed(1) + 's');
if (!total) { console.error('프레임 0 — 촬영본 없음'); process.exit(1); }

const fadeOutStart = (dur - 1.4).toFixed(2);
const endcardIn = (dur - 3.6).toFixed(2);   // 엔드카드 로고 등장
const args = [
  '-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.png'),
  '-i', MUSIC, '-i', LOGO,
  '-filter_complex',
  // ① 로고를 화면 폭 46%로 축소 → ② 엔드카드 구간에만 페이드인 오버레이 → ③ 전체 페이드 인/아웃
  `[2:v]scale=884:-1[lg];` +
  `[lg]format=rgba,fade=t=in:st=${endcardIn}:d=0.8:alpha=1[lgf];` +
  `[0:v]fps=${FPS},format=yuv420p[base];` +
  `[base][lgf]overlay=(W-w)/2:(H-h)/2-40:enable='gte(t,${endcardIn})'[ov];` +
  `[ov]fade=t=in:st=0:d=0.5,fade=t=out:st=${fadeOutStart}:d=1.4[v];` +
  `[1:a]atrim=${MUSIC_AT}:${MUSIC_AT + dur},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOutStart}:d=1.4,volume=0.85[a]`,
  '-map', '[v]', '-map', '[a]',
  // 디렉터 신고 "셸터 전환에 노이즈" — 소스 프레임은 깨끗했다. 원인은 인코딩: 디더가 강한 픽셀 화면에서
  //   컷 직후 P프레임이 이전 장면을 예측하려다 실패해 블록 노이즈가 뜬다.
  //   → 컷 시각마다 키프레임 강제 + 화질 상향(crf 15) + 장면전환 감지 강화로 원천 차단.
  '-force_key_frames', cutAt.join(','),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p',
  '-x264-params', 'scenecut=60:aq-mode=3:deblock=-1,-1',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', OUT,
];
console.log('ffmpeg 인코딩…');
execFileSync(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
const kb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log('WROTE ' + OUT + ' (' + kb + 'MB, ' + dur.toFixed(1) + 's)');
