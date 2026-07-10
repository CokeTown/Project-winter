/* 접지 QA — #163 계절 인카운터 확충 (신규 34종 + 재게이트 2종 + 절박 게이트).
   harness.cjs 재사용. ①등록 무결 ②로케일 실해석(t() 키 반환 없음) ③계절/모드/겨울 게이트 실판정
   ④실렌더(showEvent → 모달 title/text/choices DOM) 표본 6종 + 스크린샷. */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserWindow } = require('electron');
const H = require(path.join(__dirname, '..', 'harness.cjs'));
const { boot, evalJs, call, check, report } = H;

const SHOT_DIR = path.join(os.tmpdir(), 'nw-grounding-shots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shot(name) {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    const img = await win.webContents.capturePage();
    const p = path.join(SHOT_DIR, name);
    fs.writeFileSync(p, img.toPNG());
    console.log('  📸 ' + p + ' (' + Math.round(img.toPNG().length / 1024) + 'KB)');
  } catch (e) { console.log('  ⚠️ 스크린샷 실패: ' + e.message); }
}

const NEW_IDS = [
  'thaw_stream', 'first_sprout', 'returning_birds', 'melt_reveal', 'bee_swarm', 'mud_tracks',
  'cicada_evening', 'mosquito_net', 'wild_berries', 'sudden_shower', 'heat_haze', 'firefly_field',
  'acorn_cache', 'leaf_drift', 'first_frost', 'geese_south', 'pickling_day', 'spider_web',
  'icicle_row', 'frozen_sparrow', 'snowman_scarf', 'clear_winter_night', 'blizzard_warning',
  'red_balloon', 'doorstep_bundle', 'music_box', 'cat_dream', 'old_photo',
  'silent_frequency', 'barren_traps', 'looted_cache', 'desperate_knock', 'stripped_district', 'harsh_barter',
];

(async () => {
  await boot();
  await evalJs(`(()=>{ window.__qaErr=[];
    window.addEventListener('error', e=>window.__qaErr.push('err:'+(e.message||e.error)));
    window.addEventListener('unhandledrejection', e=>window.__qaErr.push('reject:'+e.reason)); return true; })()`);
  await call(`S.simReset(); if(S.hideTitle)S.hideTitle(); if(S.setPaused)S.setPaused(false);`);
  await sleep(400);

  // ── 1) 등록 무결: 34종 전부 EVENTS에 존재 + choices/titleId 유효 ──
  try {
    const res = JSON.parse(await evalJs(`(()=>{ const S = window.__shelter;
      return JSON.stringify((${JSON.stringify(NEW_IDS)}).map(id => {
        const ev = S.EVENTS[id];
        return { id, ok: !!ev && Array.isArray(ev.choices) && ev.choices.length > 0 && !!ev.titleId };
      })); })()`));
    const bad = res.filter(r => !r.ok).map(r => r.id);
    check('신규 34종 EVENTS 등록 무결', bad.length === 0, bad.length ? '누락/불량: ' + bad.join(',') : '34/34');
  } catch (e) { check('등록 무결 페이즈', false, 'THROW: ' + e.message); }

  // ── 2) 로케일 실해석: title/text/모든 choice label이 t()에서 키 그대로 돌아오지 않음 (ko+en) ──
  try {
    for (const lang of ['ko', 'en']) {
      const misses = JSON.parse(await evalJs(`(async()=>{ const S = window.__shelter; await S.setLang('${lang}');
        const out = [];
        for (const id of ${JSON.stringify(NEW_IDS)}) {
          const ev = S.EVENTS[id];
          for (const k of [ev.titleId, ev.textId, ...ev.choices.map(c=>c.labelId)]) {
            const v = S.t(k);
            if (!v || v === k || v.startsWith('ev.')) out.push(k);
          }
        }
        return JSON.stringify(out); })()`));
      check(`로케일 실해석 (${lang})`, misses.length === 0, misses.length ? '미해석: ' + misses.slice(0, 5).join(',') : 'title/text/label 전건 해석');
    }
    await evalJs(`window.__shelter.setLang('ko')`);
  } catch (e) { check('로케일 페이즈', false, 'THROW: ' + e.message); }

  // ── 3) 게이트 실판정: 계절/모드/경과겨울 매트릭스 ──
  try {
    const g = JSON.parse(await evalJs(`JSON.stringify((()=>{
      const S = window.__shelter;
      const base = { district:'residential', shelter:'container', weather:'clear', night:false, day:5, winters:0 };
      const m = (id,ctx) => S.eventMatches(id, ctx);
      S.state.mode = 'normal';
      const r = {
        thawSpring:  m('thaw_stream', {...base, season:'spring'}),
        thawWinter:  m('thaw_stream', {...base, season:'winter'}),
        cicadaSummer:m('cicada_evening', {...base, season:'summer'}),
        icicleWinter:m('icicle_row', {...base, season:'winter'}),
        acornAutumn: m('acorn_cache', {...base, season:'autumn'}),
        stormAutumn: m('storm', {...base, season:'autumn'}),
        stormSummer: m('storm', {...base, season:'summer'}),
        seedsSpring: m('seeds', {...base, season:'spring'}),
        seedsWinter: m('seeds', {...base, season:'winter'}),
        fireflyNight:m('firefly_field', {...base, season:'summer', night:true}),
        fireflyDay:  m('firefly_field', {...base, season:'summer', night:false}),
        balloonAny:  m('red_balloon', {...base, season:'summer'}),
        // 절박 티어: 코지에서는 겨울이 아무리 지나도 불발
        despCozyW3:  m('barren_traps', {...base, season:'summer', winters:3}),
      };
      S.state.mode = 'hard';
      r.despHardW0 = m('barren_traps', {...base, season:'summer', winters:0});
      r.despHardW1 = m('barren_traps', {...base, season:'summer', winters:1});
      r.knockHardW1 = m('desperate_knock', {...base, season:'summer', winters:1, night:true});
      r.knockHardW2 = m('desperate_knock', {...base, season:'summer', winters:2, night:true});
      r.barterW2win = m('harsh_barter', {...base, season:'winter', winters:2});
      S.state.mode = 'hardcore';
      r.despHcW1 = m('barren_traps', {...base, season:'summer', winters:1});
      S.state.mode = 'normal';
      return r;
    })())`));
    check('계절 게이트 (봄○/겨울× 등 6종)', g.thawSpring && !g.thawWinter && g.cicadaSummer && g.icicleWinter && g.acornAutumn && g.balloonAny,
      JSON.stringify({ thawSpring: g.thawSpring, thawWinter: g.thawWinter, cicada: g.cicadaSummer, icicle: g.icicleWinter, acorn: g.acornAutumn, balloon: g.balloonAny }));
    check('재게이트 (storm=가을○여름× · seeds=봄○겨울×)', g.stormAutumn && !g.stormSummer && g.seedsSpring && !g.seedsWinter,
      JSON.stringify({ stormAutumn: g.stormAutumn, stormSummer: g.stormSummer, seedsSpring: g.seedsSpring, seedsWinter: g.seedsWinter }));
    check('밤 게이트 (반딧불이 밤○낮×)', g.fireflyNight && !g.fireflyDay, `night=${g.fireflyNight} day=${g.fireflyDay}`);
    check('절박 모드 게이트 (코지 winters3=× / 하드·혹한=○)', !g.despCozyW3 && g.despHardW1 && g.despHcW1,
      JSON.stringify({ cozy: g.despCozyW3, hard: g.despHardW1, hc: g.despHcW1 }));
    check('절박 겨울 게이트 (minWinters 1·2 경계)', !g.despHardW0 && g.despHardW1 && !g.knockHardW1 && g.knockHardW2 && g.barterW2win,
      JSON.stringify({ w0: g.despHardW0, w1: g.despHardW1, knockW1: g.knockHardW1, knockW2: g.knockHardW2, barter: g.barterW2win }));
  } catch (e) { check('게이트 페이즈', false, 'THROW: ' + e.message); }

  // ── 4) 실렌더 표본: 계절 4 + 공용 1 + 절박 1 — 모달 DOM에 제목·본문·선택지 뜨는지 ──
  const SAMPLE = ['thaw_stream', 'firefly_field', 'pickling_day', 'snowman_scarf', 'doorstep_bundle', 'desperate_knock'];
  for (const id of SAMPLE) {
    try {
      const r = JSON.parse(await evalJs(`(async()=>{
        const S = window.__shelter;
        S.showEvent('${id}');
        await new Promise(r=>setTimeout(r,350));
        const back = document.getElementById('modal-back');
        const shown = !!back && back.classList.contains('show');
        const title = (document.getElementById('modal-title')||{}).textContent || '';
        const body = document.getElementById('modal-body');
        const text = body ? body.textContent || '' : '';
        const btns = body ? body.querySelectorAll('button[data-ch]').length : 0;
        const rawKey = /ev\\.[a-z]+\\./.test(text); // 미해석 키 노출 감지
        const b = body ? body.querySelector('button[data-ch]') : null; // 실유저처럼 첫 선택지 클릭 소비
        if (b && !b.disabled) b.click(); else if (body) { const m = body.querySelector('button'); if (m) m.click(); }
        await new Promise(r=>setTimeout(r,250));
        const stillOpen = back.classList.contains('show');
        if (stillOpen) { const ok = document.querySelector('#modal-body button, #modal-close'); if (ok) ok.click(); } // 결과 카드 닫기
        return JSON.stringify({ has: shown, title, btns, rawKey });
      })()`));
      check(`실렌더 ${id}`, r.has && r.btns > 0 && !r.rawKey && r.title.length > 0,
        `title="${r.title}" btns=${r.btns} rawKey=${r.rawKey}`);
      if (id === 'thaw_stream' || id === 'desperate_knock') await shot(`ev163-${id}.png`);
    } catch (e) { check(`실렌더 ${id}`, false, 'THROW: ' + e.message); }
  }
  await sleep(200);

  // ── 5) 런타임 예외 0 ──
  const errs = JSON.parse(await evalJs(`JSON.stringify(window.__qaErr||[])`));
  check('런타임 예외 0', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : '무예외');

  const green = report();
  await sleep(200);
  H.app.quit();
  process.exit(green ? 0 : 1);
})().catch(e => { console.error('하네스 치명 오류:', e); H.app.quit(); process.exit(2); });
