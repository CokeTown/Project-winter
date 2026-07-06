/* 최종 안전 QA-폭 스윕 — 미접지 시스템(BGM/퀘스트/저널/지도/도움말) 실런타임 관측. 읽기/렌더 위주. */
const path = require('path');
const H = require(path.join(__dirname, '..', 'harness.cjs'));
const { boot, evalJs, call, check, report } = H;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = async e => JSON.parse(await evalJs(e));

// 모달 가시성 프로브 (openModal → #modal-back.show)
const modalVisible = () => evalJs(`(()=>{ const b=document.getElementById('modal-back'); if(!b) return false;
  const s=getComputedStyle(b); return b.classList.contains('show') && s.display!=='none'; })()`);
const closeModal = () => call(`const c=document.getElementById('modal-close'); if(c)c.click();`);
// 저널은 자체 오버레이 #journal-screen (닫기=ESC 핸들러)
const journalVisible = () => evalJs(`(()=>{ const s=document.getElementById('journal-screen'); if(!s) return false;
  return s.classList.contains('show') && getComputedStyle(s).display!=='none'; })()`);
const closeJournal = () => call(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));`);

(async () => {
  await boot();
  await evalJs(`(()=>{ window.__qaErr=[];
    window.addEventListener('error', e=>window.__qaErr.push('err:'+(e.message||e.error)));
    window.addEventListener('unhandledrejection', e=>window.__qaErr.push('reject:'+e.reason)); return true; })()`);
  await call(`S.simReset(); if(S.hideTitle)S.hideTitle(); if(S.setPaused)S.setPaused(false);`);
  await sleep(300);

  // ── 1) BGM 컨텍스트 (오프스크린 무오디오 — 상태 키/트랙 확정) ──
  try {
    const r = await J(`(()=>{ const S=window.__shelter; S.simReset();
      const b1=S.bgmInfo();
      S.setWeather('storm'); S.syncBgm&&S.syncBgm(); const b2=S.bgmInfo();
      S.setWeather('clear'); S.syncBgm&&S.syncBgm(); const b3=S.bgmInfo();
      return JSON.stringify({ k1:b1.key, t1:b1.track, k2:b2.key, k3:b3.key, t3:b3.track }); })()`);
    check('BGM 컨텍스트 키 유효', r.k1 != null && r.t1 != null, `key=${r.k1} track=${r.t1}`);
    check('BGM syncBgm 컨텍스트 전환 무예외', r.k2 != null && r.k3 != null, `${r.k1}→storm:${r.k2}→clear:${r.k3}`);
  } catch (e) { check('BGM 페이즈', false, 'THROW: ' + e.message); }

  // ── 2) 퀘스트 체인 7단계 전진 → 트래커 퇴장 ──
  try {
    const r = await J(`(()=>{ const S=window.__shelter; S.simReset();
      S.state.questIdx=0;
      const ids=S.QUESTS.map(q=>q.id); let advanced=0;
      for(const id of ids){ const b=S.state.questIdx; if(b<0)break; S.questProgress(id); if(S.state.questIdx===b+1)advanced++; }
      return JSON.stringify({ chainLen:ids.length, advanced, idxAfter:S.state.questIdx, ids }); })()`);
    check('퀘스트 체인 7단계 전진', r.advanced === r.chainLen, `${r.advanced}/${r.chainLen} [${r.ids.join('→')}]`);
    await sleep(750); // 완료 -1 리셋은 600ms setTimeout
    const idx = await evalJs(`window.__shelter.state.questIdx`);
    check('퀘스트 완료→트래커 퇴장(-1)', idx === -1, `questIdx=${idx}`);
  } catch (e) { check('퀘스트 페이즈', false, 'THROW: ' + e.message); }

  // ── 3) 저널(생존 수첩) 렌더 — 자체 #journal-screen 오버레이 ──
  try {
    await call(`S.openJournalPages([{title:'QA', body:'테스트 페이지 본문'}]);`);
    await sleep(300);
    const vis = await journalVisible();
    check('저널 페이지 렌더 (#journal-screen)', vis === true, `visible=${vis}`);
    await closeJournal(); await sleep(100);
  } catch (e) { check('저널 페이즈', false, 'THROW: ' + e.message); }

  // ── 4) 지도 모달 렌더 (지역 마커) ──
  try {
    await call(`S.simReset(); if(S.hideTitle)S.hideTitle(); S.openMapModal();`);
    await sleep(300);
    const r = await J(`(()=>{ const b=document.getElementById('modal-back');
      const vis = b && b.classList.contains('show');
      const markers = document.querySelectorAll('.map-region, .region-marker, [data-region], .map-marker, .map-light').length;
      return JSON.stringify({ vis, markers }); })()`);
    check('지도 모달 렌더', r.vis === true, `visible=${r.vis} 마커=${r.markers}`);
    await closeModal(); await sleep(100);
  } catch (e) { check('지도 페이즈', false, 'THROW: ' + e.message); }

  // ── 5) 도움말 렌더 (openHelpModal → openJournalPages → #journal-screen) ──
  try {
    await call(`S.openHelpModal && S.openHelpModal();`);
    await sleep(300);
    const vis = await journalVisible();
    check('도움말 렌더 (#journal-screen)', vis === true, `visible=${vis}`);
    await closeJournal(); await sleep(100);
  } catch (e) { check('도움말 페이즈', false, 'THROW: ' + e.message); }

  // ── 6) 런타임 예외 총점검 ──
  const errs = await J(`JSON.stringify(window.__qaErr||[])`);
  check('런타임 예외 0건 (전 페이즈)', errs.length === 0, errs.length ? errs.slice(0, 6).join(' | ') : '깨끗');

  const green = report();
  await sleep(150); H.app.quit(); process.exit(green ? 0 : 1);
})().catch(e => { console.error('하네스 치명:', e); H.app.quit(); process.exit(2); });
