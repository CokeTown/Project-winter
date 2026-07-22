/* #219 ja 잔차 원인 규명 — DungGeunMo가 실제로 그리는 문자는 무엇인가.
   방법(결정적): 같은 글자를 "'DungGeunMo', serif"와 "'DungGeunMo', monospace"로 각각 캔버스에 그려 비트맵 비교.
     - 둥근모가 커버하면 둘 다 둥근모가 그리므로 비트맵 동일
     - 커버 못 하면 각각 serif/monospace가 그리므로 비트맵 상이
   폭 비교는 CJK가 전부 전각(16px)이라 판별력이 없다 — 그래서 픽셀을 본다. */
const { BrowserWindow } = require('electron');
const path = require('path');
const H = require(path.join(process.cwd(), 'tests', 'harness.cjs'));
setTimeout(() => { console.error('TIMEOUT'); process.exit(3); }, 180000);
(async () => {
  await H.boot();
  BrowserWindow.getAllWindows()[0].setContentSize(1280, 720);
  const r = await H.evalJs(`(async()=>{
    await document.fonts.ready;
    const draw=(ch,stack)=>{ const cv=document.createElement('canvas'); cv.width=32; cv.height=32;
      const cx=cv.getContext('2d'); cx.fillStyle='#fff'; cx.fillRect(0,0,32,32);
      cx.fillStyle='#000'; cx.font='16px ' + stack; cx.textBaseline='top'; cx.fillText(ch,2,6);
      return cx.getImageData(0,0,32,32).data.join(','); };
    const covered = ch => draw(ch,"'DungGeunMo', serif") === draw(ch,"'DungGeunMo', monospace");
    const set={ '한글 가':'가','라틴 A':'A','숫자 5':'5','가나 か':'か','가나 き':'き','가타카나 ク':'ク',
      '한자 水':'水','한자 筒':'筒','한자 渇':'渇','한자 商':'商','중점 ·':'·' };
    const out={};
    for(const [k,ch] of Object.entries(set)) out[k]=covered(ch);
    return out;
  })()`);
  console.log('COVER ' + JSON.stringify(r));
  H.app.quit(); process.exit(0);
})().catch(e => { console.error('FATAL', e); H.app.quit(); process.exit(2); });
