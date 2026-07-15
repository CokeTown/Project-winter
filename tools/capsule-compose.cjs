const fs=require("fs"),{PNG}=require("pngjs");
const ING="assets-src/art/out/capsules-ingame/",WM="assets-src/art/out/steam2/final_logo_wordmark.png";
const rd=f=>PNG.sync.read(fs.readFileSync(f)),wr=(f,p)=>fs.writeFileSync(f,PNG.sync.write(p));
function cropRect(s,sx,sy,sw,sh){const d=new PNG({width:sw,height:sh});for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const si=((y+sy)*s.width+(x+sx))<<2,di=(y*sw+x)<<2;for(let k=0;k<4;k++)d.data[di+k]=s.data[si+k];}return d;}
function boxDown(s,W,H){const d=new PNG({width:W,height:H}),sx=s.width/W,sy=s.height/H;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const x0=Math.floor(x*sx),x1=Math.max(x0+1,Math.floor((x+1)*sx)),y0=Math.floor(y*sy),y1=Math.max(y0+1,Math.floor((y+1)*sy));let r=0,g=0,b=0,a=0,n=0;for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){const si=(yy*s.width+xx)<<2;r+=s.data[si];g+=s.data[si+1];b+=s.data[si+2];a+=s.data[si+3];n++;}const di=(y*W+x)<<2;d.data[di]=r/n|0;d.data[di+1]=g/n|0;d.data[di+2]=b/n|0;d.data[di+3]=a/n|0;}return d;}
function upN(s,n){const d=new PNG({width:s.width*n,height:s.height*n});for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){const si=(((y/n)|0)*s.width+((x/n)|0))<<2,di=(y*d.width+x)<<2;for(let k=0;k<4;k++)d.data[di+k]=s.data[si+k];}return d;}
function over(base,ov,dx,dy){for(let y=0;y<ov.height;y++)for(let x=0;x<ov.width;x++){const bx=x+dx,by=y+dy;if(bx<0||by<0||bx>=base.width||by>=base.height)continue;const oi=(y*ov.width+x)<<2,bi=(by*base.width+bx)<<2;const a=ov.data[oi+3]/255;if(a<=0)continue;for(let k=0;k<3;k++)base.data[bi+k]=Math.round(ov.data[oi+k]*a+base.data[bi+k]*(1-a));base.data[bi+3]=Math.max(base.data[bi+3],ov.data[oi+3]);}return base;}
// 투명 여백 트림 — 워드마크 PNG의 상하좌우 빈 알파를 잘라 실제 글자 bbox만 남긴다(로고를 크게 보이게).
function trimAlpha(s){let x0=s.width,y0=s.height,x1=-1,y1=-1;for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){if(s.data[((y*s.width+x)<<2)+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}if(x1<x0)return s;return cropRect(s,x0,y0,x1-x0+1,y1-y0+1);}

// 슬롯 설정: 마스터 크롭(sx,sy,sw,sh) → art-res(aw,ah) → 워드마크(wmW,wmX%,wmY%) → up(n)
const M=rd(ING+"master_4k.png"),MV=rd(ING+"master_vertical.png"),W=trimAlpha(rd(WM));
console.log("워드마크 트림 후 bbox = "+W.width+"x"+W.height+" (aspect "+(W.width/W.height).toFixed(2)+")");
const cfg=JSON.parse(process.argv[3]);
const out=process.argv[2];
for(const s of cfg){
  const src=s.master==="v"?MV:M;
  const scene=cropRect(src,s.sx,s.sy,s.sw,s.sh);
  const art=boxDown(scene,s.aw,s.ah);
  // 씬 디밍(로고 가독성/우세용): dim<1이면 RGB를 곱해 어둡게. 워드마크는 이후 풀밝기로 합성.
  if(s.dim!=null&&s.dim<1){for(let i=0;i<art.data.length;i+=4){art.data[i]=art.data[i]*s.dim|0;art.data[i+1]=art.data[i+1]*s.dim|0;art.data[i+2]=art.data[i+2]*s.dim|0;}}
  const wmH=Math.round(W.height*(s.wmW/W.width));
  const wm=boxDown(W,s.wmW,wmH);
  const wx=Math.round((s.aw-s.wmW)*s.wmX), wy=Math.round((s.ah-wmH)*s.wmY);
  over(art,wm,wx,wy);
  const res=upN(art,s.n);
  wr(out+"/"+s.file,res);
  console.log(s.file+"  "+res.width+"x"+res.height+"  wm@"+wx+","+wy+" ("+s.wmW+"px)");
}
