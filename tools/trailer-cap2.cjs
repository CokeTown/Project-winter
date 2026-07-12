// 트레일러 v2/v3 캡처 — 비트 싱크 스펙(trailer2/3-spec.json) 기반.
//   v1(trailer-cap.cjs)과 동일 엔진, 차이: 스펙 파일이 클립·프레임수·비트 프레임을 지정.
//   decorate: beatFrames[k] 프레임에서 가구 k 배치 (물방울 틱마다 가구가 놓인다 — Unpacking 문법).
//            crudeTiers=true면 티어 가구를 T1(크루드)로 배치 — 이후 upgrade 슬라이스가 모핑.
//   signal:   lightFrames 누적 개수만큼 지도 불빛 점등 (비트마다 창문 하나가 응답).
//   ignite:   전 조명 소등 상태에서 flameFrame에 난로 점등(setItemPower) + 타이트→줌아웃 리빌 (라이터 SFX는 조립에서 믹스).
//   loot:     UI 노출. 탐험 출발(departExpedition auto)→즉시 귀환→resolveFrame에 정산 개봉 연출(DDD-1 행 리빌).
//   upgrade:  stageFrames[0]에 티어 가구 전부 T2, [1]에 T3 모핑 (removeItem→addItem 재배치).
//   실행: electron tools/trailer-cap2.cjs <specJson> <outRoot> [clipIdFilter,csv]
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path'); const os = require('os');
const { PNG } = require('pngjs');
const SPEC = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUTROOT = process.argv[3];
const FILTER = process.argv[4] ? process.argv[4].split(',') : null;
const DIST = path.resolve(__dirname, '..', 'dist');
const W = 1920, HGT = 1080, FPS = SPEC.fps || 30;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const cozyLiving = (w, d) => {
  const X = w / 2, Z = d / 2; const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const cx = Math.min(-X + 2.5, -0.3), cz = Math.min(-Z + 2.0, -0.3);
  const P = (x, z) => ({ x: cl(cx + x, -X + 0.4, X - 0.4), z: cl(cz + z, -Z + 0.4, Z - 0.4) });
  const it = (dd, x, z, r) => { const p = P(x, z); return { d: dd, x: p.x, z: p.z, r: r || 0, tier: 3 }; };
  return [
    it('rug', 0, 1.0), it('bed', -1.4, -0.9), it('bookshelf', 0.1, -1.6), it('sofa', 1.5, -0.6),
    it('teatable', 0, 1.0), it('stove', 1.9, -1.5), it('plant', -1.8, 1.3), it('lamp', 1.7, 0.7), it('cushion', -1.1, 1.0),
  ];
};

function bgra2rgba(b) { const o = Buffer.alloc(b.length); for (let i = 0; i < b.length; i += 4) { o[i] = b[i + 2]; o[i + 1] = b[i + 1]; o[i + 2] = b[i]; o[i + 3] = 255; } return o; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  app.commandLine.appendSwitch('no-sandbox'); app.disableHardwareAcceleration();
  app.setPath('userData', path.join(os.tmpdir(), 'nw-trailer2-' + process.pid));
  await app.whenReady();
  const win = new BrowserWindow({ show: false, width: W, height: HGT, webPreferences: { offscreen: true, backgroundThrottling: false } });
  win.webContents.setFrameRate(30);
  const ev = e => win.webContents.executeJavaScript(e, true);

  // 프리부트: nw-opts.lang=en (부팅부터 완전 영어 — 패널 제목·퀘스트 포함)
  await win.loadFile(path.join(DIST, 'index.html'));
  await sleep(1200);
  await ev(`(()=>{try{const o=JSON.parse(localStorage.getItem('nw-opts')||'{}');o.lang='en';localStorage.setItem('nw-opts',JSON.stringify(o));}catch(e){}return 1;})()`);

  for (const sc of SPEC.clips) {
    if (FILTER && !FILTER.includes(sc.id)) continue;
    const outDir = path.join(OUTROOT, sc.id);
    fs.mkdirSync(outDir, { recursive: true });
    await win.loadFile(path.join(DIST, 'index.html'));
    let ready = false;
    for (let i = 0; i < 120; i++) { if (await ev(`!!(window.__shelter&&window.__shelter.loadShelter)`).catch(() => false)) { ready = true; break; } await sleep(400); }
    if (!ready) { console.log('SKIP ' + sc.id + ' (부팅 실패)'); continue; }

    const hideUI = !['map', 'signal', 'loot'].includes(sc.kind);
    const setup = await ev(`(()=>{try{const S=window.__shelter;
      S.setLang&&S.setLang('en');S.applyStaticI18n&&S.applyStaticI18n();
      S.simReset&&S.simReset();S.hideTitle&&S.hideTitle();
      ${sc.winter ? 'const D=(S.BAL&&S.BAL.seasons&&S.BAL.seasons.daysPerSeason)||15;S.state.day=3*D+Math.ceil(D/2);' : ''}
      S.state.current=${JSON.stringify(sc.shelter)};S.loadShelter(${JSON.stringify(sc.shelter)});
      S.setWeather(${JSON.stringify(sc.weather)});S.setHour(${sc.hour});
      ${hideUI ? `let css=document.getElementById('shotcss')||document.createElement('style');css.id='shotcss';document.head.appendChild(css);css.textContent='body > *:not(#c):not(#fx){display:none!important}';` : `const oc=document.getElementById('shotcss');if(oc)oc.remove();`}
      return {ok:1,exists:!!S.SHELTERS[${JSON.stringify(sc.shelter)}]};}catch(e){return {error:String(e&&e.stack||e)};}})()`);
    console.log(sc.id, 'setup:', JSON.stringify(setup));

    if (sc.kind !== 'decorate') {
      // upgrade는 크루드(T1) 배치 + 티어 대상 확장(teatable→table 스왑, chair 추가)
      const crude = sc.kind === 'upgrade';
      await ev(`(()=>{const S=window.__shelter;
        const R=(S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};
        let L=(${cozyLiving.toString()})(R.w,R.d);
        ${crude ? `L=L.filter(i=>i.d!=='teatable');const tt=(${cozyLiving.toString()})(R.w,R.d).find(i=>i.d==='teatable');L.push({d:'table',x:tt.x,z:tt.z,r:0,tier:1});L.push({d:'chair',x:tt.x+0.75,z:tt.z+0.15,r:Math.PI,tier:1});` : ''}
        for(const it of L){try{const tr=${crude ? `(S.DEFS[it.d]&&S.DEFS[it.d].tiered)?1:it.tier` : 'it.tier'};S.addItem(it.d,0,it.x,it.z,it.r,true,0,tr);}catch(e){}}
        ${sc.cat ? 'try{S.state.cat=true;S.spawnCat&&S.spawnCat();}catch(e){}' : ''}return 1;})()`);
    }
    await ev(`window.__shelter.setPaused&&window.__shelter.setPaused(false)`);
    await sleep(700);

    if (sc.kind === 'catcloseup') {
      await sleep(600);
      console.log('  cat exists:', await ev(`(()=>{const S=window.__shelter;return !!(S.cat&&S.cat());})()`));
    } else if (sc.kind === 'map' || sc.kind === 'signal') {
      await ev(`window.__shelter.openMapModal&&window.__shelter.openMapModal()`); await sleep(500);
    } else if (sc.kind === 'ignite') {
      // 전 조명 소등 (달빛·눈만 남긴 어둠) — flameFrame에 난로만 점등
      await ev(`(()=>{const S=window.__shelter;for(const it of S.items){try{S.setItemPower(it,false);}catch(e){}}return 1;})()`);
      await sleep(400);
    } else if (sc.kind === 'loot') {
      // 자원·에너지 세팅 → 출발(auto) → 즉시 귀환 대기 상태로
      const r = await ev(`(async()=>{try{const S=window.__shelter;
        Object.assign(S.state.res,{fuel:30,food:24,canned:14,water:27,cloth:11,material:19,parts:11,battery:8});
        S.state.day=12;S.state.energy=100;S.updateHud&&S.updateHud();
        await S.departExpedition('residential',[],{auto:true});
        if(S.state.exp){S.finishExpNow&&S.finishExpNow();return 'departed';}
        return 'NO_EXP';}catch(e){return 'ERR '+String(e).slice(0,200);}})()`);
      console.log('  loot depart:', r);
      await sleep(400);
    }

    const decoItems = sc.kind === 'decorate'
      ? await ev(`(()=>{const S=window.__shelter;const R=(S.SHELTERS[${JSON.stringify(sc.shelter)}]&&S.SHELTERS[${JSON.stringify(sc.shelter)}].room)||{w:5.6,d:4.4};return (${cozyLiving.toString()})(R.w,R.d);})()`)
      : null;
    let decoAdded = 0;
    for (let f = 0; f < sc.frames; f++) {
      const t = sc.frames > 1 ? f / (sc.frames - 1) : 0;
      // decorate: 비트 프레임 도달 시 다음 가구 배치 (틱 = 가구)
      if (sc.kind === 'decorate' && sc.beatFrames) {
        while (decoAdded < decoItems.length && decoAdded < sc.beatFrames.length && f >= sc.beatFrames[decoAdded]) {
          const it = decoItems[decoAdded++];
          // crudeTiers: 티어 가구는 T1(크루드)로 놓는다 — 게임 초반의 진짜 모습 (upgrade 슬라이스가 이어받음)
          const tierExpr = sc.crudeTiers
            ? `(window.__shelter.DEFS[${JSON.stringify(it.d)}]&&window.__shelter.DEFS[${JSON.stringify(it.d)}].tiered)?1:${it.tier}`
            : String(it.tier);
          await ev(`(()=>{window.__shelter.addItem(${JSON.stringify(it.d)},0,${it.x},${it.z},${it.r},true,0,${tierExpr});return 1;})()`);
        }
      }
      if (sc.kind === 'catcloseup') {
        const yaw = 0.5 + 0.32 * ease(t), zoom = lerp(2.0, 2.5, t);
        await ev(`(()=>{const S=window.__shelter;const c=S.cat&&S.cat();if(c){const v=new S.THREE.Vector3();c.g.getWorldPosition(v);S.setPan(v.x,v.z);}S.setZoom(${zoom});S.setPitch(0.34);S.setYaw(${yaw});return 1;})()`);
        if (f === Math.floor(sc.frames * 0.32)) await ev(`window.__shelter.petCat&&window.__shelter.petCat()`);
      } else if (sc.kind === 'ignite') {
        // 불꽃 프레임: 난로 점등. 카메라: 불꽃+12f까지 난로 타이트 홀드 → 방 전경으로 이즈아웃.
        if (f === sc.flameFrame) await ev(`(()=>{const S=window.__shelter;const it=S.items.find(i=>i.defId==='stove');if(it)S.setItemPower(it,true);return 1;})()`);
        const c = sc.camOut, hold = sc.flameFrame + 12;
        const k = f <= hold ? 0 : ease(Math.min(1, (f - hold) / Math.max(1, sc.frames - 1 - hold)));
        const zoom = lerp(c.z0, c.z1, k), px = lerp(sc.stovePan.x, c.px1, k), pz = lerp(sc.stovePan.z, c.pz1, k);
        await ev(`(()=>{const S=window.__shelter;S.setYaw(${c.yaw});S.setPitch(${lerp(c.pit, c.pit + 0.02, k)});S.setZoom(${zoom});S.setPan(${px},${pz});return 1;})()`);
      } else if (sc.kind === 'loot') {
        if (f === sc.resolveFrame) { const rr = await ev(`(()=>{try{window.__shelter.resolveExpedition();return 'ok';}catch(e){return 'ERR '+String(e).slice(0,120);}})()`); console.log('  resolve@f' + f + ':', rr); }
      } else if (sc.kind === 'upgrade') {
        // 스테이지 프레임에 티어 가구 전부 모핑 (T2 → T3): 스냅샷 후 remove+add
        const st = sc.stageFrames.indexOf(f);
        if (st >= 0) {
          await ev(`(()=>{const S=window.__shelter;const tier=${st + 2};
            const targets=S.items.filter(i=>S.DEFS[i.defId]&&S.DEFS[i.defId].tiered).map(i=>({d:i.defId,c:i.colorIdx,x:i.x,z:i.z,r:i.rot,y:i.y}));
            for(const i of S.items.slice()){if(S.DEFS[i.defId]&&S.DEFS[i.defId].tiered)try{S.removeItem(i);}catch(e){}}
            for(const o of targets){try{S.addItem(o.d,o.c,o.x,o.z,o.r,true,o.y,tier);}catch(e){}}
            return targets.length;})()`);
        }
        if (sc.cam) { const c = sc.cam, e2 = ease(t);
          await ev(`(()=>{const S=window.__shelter;S.setYaw(${lerp(c.yaw0, c.yaw1, e2)});S.setPitch(${lerp(c.pit0, c.pit1, e2)});S.setZoom(${lerp(c.z0, c.z1, e2)});S.setPan(${lerp(c.px0, c.px1, e2)},${c.pz});return 1;})()`);
        }
      } else if (sc.cam) {
        const c = sc.cam, e2 = ease(t);
        await ev(`(()=>{const S=window.__shelter;S.setYaw(${lerp(c.yaw0, c.yaw1, e2)});S.setPitch(${lerp(c.pit0, c.pit1, e2)});S.setZoom(${lerp(c.z0, c.z1, e2)});S.setPan(${lerp(c.px0, c.px1, e2)},${c.pz});return 1;})()`);
      }
      // signal: 비트 프레임 누적 개수만큼 불빛 점등 (비트마다 창문 하나가 응답)
      if (sc.kind === 'signal' && sc.lightFrames) {
        const lit = sc.lightFrames.filter(ff => ff <= f).length;
        await ev(`(()=>{const w=document.getElementById('map-wrap');if(!w)return 0;
          w.querySelectorAll('.map-light').forEach(e=>e.remove());
          const spots=[[63,40],[71,26],[52,64],[40,23],[26,55],[46,50],[58,72],[80,48],[34,42],[22,70],[68,60],[15,34]];
          for(let i=0;i<Math.min(${lit},spots.length);i++){const d=document.createElement('div');d.className='map-light';d.style.left=spots[i][0]+'%';d.style.top=spots[i][1]+'%';w.appendChild(d);}
          return ${lit};})()`);
      }
      await sleep(1000 / FPS);
      const buf = bgra2rgba((await win.webContents.capturePage()).toBitmap());
      const png = new PNG({ width: W, height: HGT }); buf.copy(png.data);
      fs.writeFileSync(path.join(outDir, 'f' + String(f).padStart(4, '0') + '.png'), PNG.sync.write(png));
    }
    console.log('CLIP_DONE ' + sc.id + ' frames=' + sc.frames);
  }
  console.log('ALL_DONE');
  app.quit(); process.exit(0);
}
main().catch(e => { console.error('예외:', e); app.quit(); process.exit(1); });
