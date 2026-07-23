// PDA 앱 모드 폭 적합성 프로브 — 디렉터 신고(2026-07-23 심야): 제작/옷장 행 글자 겹침·재료 미표시, 셸터 본문 좁아터짐.
//   측정: LCD 실효 폭 · 각 행 자식들의 rect · 행 경계를 넘은 픽셀(=겹침/잘림) · 본문 줄당 글자수.
//   실행: ./node_modules/.bin/electron.cmd tools/probe-pda-fit.cjs [outTag]
const { BrowserWindow } = require('electron');
const fs = require('fs'), path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
const req = require('module').createRequire(path.join(process.cwd(), 'package.json')); const { PNG } = req('pngjs');
const TAG = process.argv[2] || 'before';
const LANG = process.env.PLANG || 'en';            // 디렉터 실사용은 ko — 언어별 길이 차를 같은 프로브로 검증
const W = +(process.env.PW || 1920), HGT = +(process.env.PH || 1080);
const OUT = path.join(process.cwd(), 'scratchpad', 'pdafit');
fs.mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 180000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bgra = b => { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; };

// 행 적합성 측정: 자식이 행의 콘텐츠 박스를 넘으면 overflow(px). 0이어야 정상.
const MEASURE = `(sel => {
  // 비활성 탭 행도 DOM에 남아 있다(display:none → rect 0). 보이는 것만 계측 대상.
  const rows = [...document.querySelectorAll(sel)].filter(r => r.getBoundingClientRect().width > 0).slice(0, 6);
  return rows.map(r => {
    const rb = r.getBoundingClientRect(); const cs = getComputedStyle(r);
    const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
    const inner = { l: rb.left + padL, r: rb.right - padR };
    const kids = [...r.children].map(k => {
      const b = k.getBoundingClientRect();
      return { cls: k.className || k.tagName, txt: (k.textContent || '').trim().slice(0, 18),
        w: +b.width.toFixed(1), l: +(b.left - inner.l).toFixed(1), r: +(b.right - inner.r).toFixed(1),
        scrollW: k.scrollWidth, clientW: k.clientWidth,
        clipped: k.scrollWidth > k.clientWidth + 1 };
    });
    // 자식끼리 겹침(앞 자식의 실제 글자 끝 > 뒤 자식 시작)
    let overlap = 0;
    for (let i = 0; i < kids.length - 1; i++) {
      const a = r.children[i], b2 = r.children[i + 1];
      const ar = a.getBoundingClientRect(), br = b2.getBoundingClientRect();
      const inkEnd = ar.left + a.scrollWidth;              // nowrap이면 박스보다 잉크가 길다
      if (inkEnd > br.left + 0.5) overlap = Math.max(overlap, +(inkEnd - br.left).toFixed(1));
    }
    return { w: +rb.width.toFixed(1), h: +rb.height.toFixed(1), innerW: +(inner.r - inner.l).toFixed(1), overlap, kids };
  });
})`;

(async () => {
  await H.boot();
  const win = BrowserWindow.getAllWindows()[0];
  win.setContentSize(W, HGT); await sleep(500);
  const shot = async name => {
    const buf = bgra((await win.webContents.capturePage()).toBitmap());
    const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
    fs.writeFileSync(path.join(OUT, TAG + '_' + name + '.png'), PNG.sync.write(png));
  };
  await H.evalJs(`(async()=>{const S=window.__shelter;
    S.setLang&&S.setLang('${LANG}'); S.applyStaticI18n&&S.applyStaticI18n();
    S.simReset(); if(S.hideTitle)S.hideTitle();
    S.state.current='rooftop'; S.loadShelter('rooftop');
    await new Promise(r=>setTimeout(r,600));
    S.setWeather('snow'); S.setHour(13);
    S.state.res.food=40;S.state.res.water=40;S.state.res.fuel=30;S.state.res.material=60;S.state.res.parts=30;
    S.state.res.cloth=40;S.state.res.med=10;
    S.state.outfits=['default','navy'];  // 일부만 보유 = 소유/미소유 행 둘 다 관측
    return 1;})()`);

  const GEOJS = `(()=>{const q=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();
    return {w:+b.width.toFixed(1),h:+b.height.toFixed(1),l:+b.left.toFixed(1),t:+b.top.toFixed(1)};};
    return {uiz:getComputedStyle(document.documentElement).getPropertyValue('--uiz'),
      vw:innerWidth,vh:innerHeight,pda:q('#pda'),lcd:q('#pda-lcd')};})()`;

  // ① 제작 앱 — 복장 탭(가장 긴 이름 + 재료 동시 노출)
  await H.evalJs(`(()=>{document.getElementById('btn-craft').click();return 1;})()`);
  await sleep(1200);
  console.log('GEO ' + JSON.stringify(await H.evalJs(GEOJS)));  // PDA가 열린 뒤라야 rect가 산다
  const geo2 = await H.evalJs(`(()=>{const b=document.querySelector('#pda-lcd #modal').getBoundingClientRect();
    const cs=getComputedStyle(document.querySelector('#pda-lcd #modal'));
    return {modalW:+b.width.toFixed(1),padL:cs.paddingLeft,padR:cs.paddingRight,fs:cs.fontSize,
      contentW:+(b.width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)).toFixed(1)};})()`);
  console.log('MODAL ' + JSON.stringify(geo2));
  const tabbed = await H.evalJs(`(()=>{const ts=[...document.querySelectorAll('.craft-tab')];
    const o=ts.find(t=>/복장|Outfit|衣/.test(t.textContent))||ts[1]; if(o)o.click(); return ts.map(t=>t.textContent.trim());})()`);
  console.log('CRAFTTABS ' + JSON.stringify(tabbed));
  await sleep(700);
  console.log('CRAFT ' + JSON.stringify(await H.evalJs(`(${MEASURE})('.craft-row')`), null, 1));
  await shot('01_craft');

  // ② 옷장 앱
  await H.evalJs(`(()=>{const mb=document.getElementById('modal-back');mb.classList.remove('show');document.body.appendChild(mb);
    const pb=document.getElementById('pda-back');if(pb)pb.style.display='none';
    document.body.classList.remove('pda-on','pda-app');return 1;})()`);
  await sleep(500);
  await H.evalJs(`(()=>{document.getElementById('btn-wardrobe').click();return 1;})()`);
  await sleep(1200);
  console.log('WARDROBE ' + JSON.stringify(await H.evalJs(`(${MEASURE})('.wd-row')`), null, 1));
  await shot('02_wardrobe');

  // ③ 이주(셸터 카드) — 본문 문단 줄당 글자수
  await H.evalJs(`(()=>{const mb=document.getElementById('modal-back');mb.classList.remove('show');document.body.appendChild(mb);
    const pb=document.getElementById('pda-back');if(pb)pb.style.display='none';
    document.body.classList.remove('pda-on','pda-app');return 1;})()`);
  await sleep(500);
  await H.evalJs(`(()=>{document.getElementById('btn-move').click();return 1;})()`);
  await sleep(1200);
  const sc = await H.evalJs(`(()=>{const d=document.querySelector('#pda-lcd .s-desc');if(!d)return null;
    const b=d.getBoundingClientRect();const cs=getComputedStyle(d);
    const lh=parseFloat(cs.lineHeight)||12; const lines=Math.round(b.height/lh);
    return {w:+b.width.toFixed(1),fs:cs.fontSize,lines,chars:(d.textContent||'').trim().length,
      perLine:+((d.textContent||'').trim().length/Math.max(1,lines)).toFixed(1)};})()`);
  console.log('SHELTER ' + JSON.stringify(sc));
  await shot('03_shelter');

  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
