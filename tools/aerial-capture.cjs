/* 항공뷰 지도(AERIAL-MAP) 판단물 캡처 — 디렉터 검수용 매트릭스 생성기.
 *
 *   왜 저장소에 있나: 이 스크립트가 없으면 다른 세션이 "지금 어떻게 보이는지"를 재생산할 수 없다.
 *   판단물(아티팩트)은 휘발하지만 생성기는 남아야 인계가 성립한다.
 *
 *   사용:
 *     npm run build:electron                                   # dist 먼저 (하네스는 dist를 읽는다)
 *     ./node_modules/.bin/electron.cmd tools/aerial-capture.cjs            # 시간대×날씨 8컷
 *     ./node_modules/.bin/electron.cmd tools/aerial-capture.cjs --mode=ruin # 잠식 연차 비교 8컷
 *     환경변수 CAP_OUT=<디렉토리> 로 산출 위치 지정(기본: scratchpad/aerial)
 *
 *   산출은 커밋하지 않는다(스크래치패드). 아티팩트로 올려 디렉터에게 전달한다.
 */
const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { PNG } = require(path.join(process.cwd(), 'node_modules', 'pngjs'));
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));

const MODE = (process.argv.find(a => a.startsWith('--mode=')) || '').split('=')[1] || 'weather';
// 캡처 해상도 — 기본 FHD(디렉터 2026-07-22: 720p 판단물은 UI 글자가 안 읽힌다).
//   CAP_W/CAP_H로 낮출 수 있다(빠른 스모크용). 오프스크린이라 물리 모니터와 무관.
const W = +(process.env.CAP_W || 1920), HGT = +(process.env.CAP_H || 1080);
const OUT = process.env.CAP_OUT || path.join(process.cwd(), 'scratchpad', 'aerial');
setTimeout(() => { console.error('CAPTURE TIMEOUT'); process.exit(3); }, 300000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT);
  await sleep(300);
  // 에러 리스너 선부착 — 오프스크린에서 '정지 프레임'은 살아있는 화면과 구분이 안 된다(07-22 함정).
  await H.evalJs(`(()=>{window.__perr=null;window.addEventListener('error',e=>{window.__perr=(e.error&&e.error.stack)||e.message});
    const S=window.__shelter;S.simReset();if(S.hideTitle)S.hideTitle();if(S.loadShelter)S.loadShelter('container');
    document.body.classList.add('obs-mode');return 1})()`); // obs-mode: 본편 크롬 숨김 — 판단 컷에 HUD 노이즈 금지(07-22 실측 검거)
  await sleep(1000);

  const cap = async (name) => {
    await sleep(1500); // 카메라 이징 + 조명 정착
    const img = bgra2rgba((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); img.copy(png.data);
    fs.writeFileSync(path.join(OUT, name + '.png'), PNG.sync.write(png));
    console.log('WROTE', name);
  };
  const setEnv = (h, w) => H.evalJs(`(()=>{const S=window.__shelter;S.setHour(${h});S.setWeather('${w}');return 1})()`);

  if (MODE === 'scale') {
    // focus 카메라 고도 비교 — "축소 스케일" 감각의 실체가 카메라 거리임을 판정(디렉터 2026-07-22)
    await H.evalJs(`(()=>{const S=window.__shelter;const A=S.aerialProto();A.open();return 1})()`);
    await setEnv(9, 'clear');
    for (const [dist, elev, tag] of [[30, 0.62, 'd30_near'], [48, 0.72, 'd48_mid'], [70, 0.82, 'd70_aerial']]) {
      for (const nd of ['slum', 'residential']) {
        await H.evalJs(`(()=>{window.__shelter.aerialProto().focus('${nd}',${dist},${elev});return 1})()`);
        await cap(`scale_${nd}_${tag}`);
      }
    }
  } else if (MODE === 'east') {
    // S3-2 동부 디오라마 검수 — aerialProto('east') 강제 지정(거주 도시 무관). overview + 8노드 + 노을·설야
    await H.evalJs(`(()=>{const S=window.__shelter;const A=S.aerialProto('east');A.open();return A.nodes.join(',')})()`);
    const nodes = (await H.evalJs(`window.__shelter.aerialProto('east').nodes.join(',')`)).split(',');
    await setEnv(9, 'clear');
    await cap('east_overview_am');
    for (const nd of nodes) {
      await H.evalJs(`(()=>{window.__shelter.aerialProto('east').focus('${nd}');return 1})()`);
      await cap('east_' + nd);
    }
    await H.evalJs(`(()=>{window.__shelter.aerialProto('east').overview();return 1})()`);
    await setEnv(18, 'clear'); await cap('east_overview_dusk'); // 붉은 노을 팔레트 판독
    await setEnv(22, 'snow'); await cap('east_overview_night_snow'); // 결빙 항만 + 진지 화톳불
  } else if (MODE === 'nodes') {
    // S3 노드 드레싱 검수 — 전 노드 focus 순회 1컷씩 (주간 맑음 고정: 실루엣 판독 조건)
    await H.evalJs(`(()=>{const S=window.__shelter;const A=S.aerialProto();A.open();return A.nodes.join(',')})()`);
    const nodes = (await H.evalJs(`window.__shelter.aerialProto().nodes.join(',')`)).split(',');
    await setEnv(9, 'clear');
    for (const nd of nodes) {
      await H.evalJs(`(()=>{window.__shelter.aerialProto().focus('${nd}');return 1})()`);
      await cap('node_' + nd);
    }
    await H.evalJs(`(()=>{window.__shelter.aerialProto().overview();return 1})()`);
    await cap('node_overview');
  } else if (MODE === 'ruin') {
    // 잠식 연차 비교 — rebuild(day)로 씬을 다시 지어 시간의 흐름을 대조한다.
    for (const [day, winter, tag] of [[20, false, 'y0'], [400, false, 'y1'], [1080, false, 'y3'], [1080, true, 'y3w']]) {
      const r = await H.evalJs(`(()=>{const S=window.__shelter;S.aerialProto().rebuild({day:${day},winter:${winter}});
        const B=S.aerialProto(); B.focus('slum'); return {og:B.ogState(), err:window.__perr};})()`);
      console.log(JSON.stringify(r));
      await setEnv(winter ? 22 : 9, winter ? 'snow' : 'clear');
      await cap('ruin_focus_' + tag);
      await H.evalJs(`(()=>{window.__shelter.aerialProto().overview();return 1})()`);
      await cap('ruin_over_' + tag);
    }
  } else {
    // 시간대 × 날씨 — 실시간 반응 검수
    await H.evalJs(`(()=>{const S=window.__shelter;const A=S.aerialProto();A.open();A.focus('slum');return 1})()`);
    for (const [h, w, name] of [[8, 'clear', 'am_clear'], [8, 'snow', 'am_snow'], [18, 'clear', 'dusk_clear'],
                                [18, 'snow', 'dusk_snow'], [22, 'clear', 'night_clear'], [22, 'snow', 'night_snow']]) {
      await setEnv(h, w); await cap('aerial_focus_' + name);
    }
    await H.evalJs(`(()=>{window.__shelter.aerialProto().overview();return 1})()`);
    await setEnv(8, 'clear'); await cap('aerial_over_am_clear');
    await setEnv(22, 'snow'); await cap('aerial_over_night_snow');
  }
  const err = await H.evalJs(`window.__perr`);
  if (err) console.error('PAGE ERROR:', err);
  console.log('OUT:', OUT);
  H.app.quit(); process.exit(err ? 2 : 0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
