(()=>{'use strict';
/* OCR 7.x provides words and their bbox, not table-cell geometry.
   Derive horizontal rules from the ORIGINAL uploaded pixels, then assign OCR words using Week8's native rebuild(). */
const installed=new WeakSet(),processed=new WeakMap();
function api(w){
 try {return w.eval('({getDoc:()=>doc(),draw,renderGeometry,rebuild})');}
 catch(e){return null;}
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function median(a){const z=a.slice().sort((x,y)=>x-y);return z[Math.floor(z.length/2)];}
async function analyze(d){
 if(!d?.image||!d.width||!d.height)return null;
 const img=new Image();img.src=d.image;await img.decode();
 const scale=Math.min(1,1600/Math.max(img.width,img.height));
 const W=Math.round(img.width*scale),H=Math.round(img.height*scale);
 const work=document.createElement('canvas');work.width=W;work.height=H;
 const cx=work.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,W,H);
 const pix=cx.getImageData(0,0,W,H).data;
 const isDark=(x,y)=>{let i=(y*W+x)*4;return pix[i]<225&&pix[i+1]<225&&pix[i+2]<225&&pix[i+3]>180;};
 const left=Math.floor(W*.035),right=Math.ceil(W*.965),step=Math.max(1,Math.round(W/650)),raw=[];
 for(let y=Math.floor(H*.09);y<Math.floor(H*.92);y++){
  let n=0,total=0;
  for(let x=left;x<right;x+=step){total++;if(isDark(x,y))n++;}
  if(n/total>=.59)raw.push(y);
 }
 const groups=[];
 for(const y of raw){
  let g=groups[groups.length-1];
  if(!g||y-g[g.length-1]>3){g=[];groups.push(g);}
  g.push(y);
 }
 let candidates=groups.map(g=>Math.round(median(g))).filter(y=>y>0);
 if(candidates.length<6)return null;
 const expected=d.geometry?.ys?.length||8;
 // Find a contiguous sequence of real horizontal rules; never synthesize equal-height rows.
 const sequences=[];
 for(let i=0;i<candidates.length;i++){
  let run=[candidates[i]];
  for(let j=i+1;j<candidates.length;j++){
   const gap=candidates[j]-run[run.length-1];
   if(gap<14||gap>H*.13)break;
   run.push(candidates[j]);if(run.length>10)break;
  }
  if(run.length>=6)sequences.push(run);
 }
 if(!sequences.length)return null;
 const expectedTop=(d.geometry.ys[0]||d.height*.20)*scale;
 sequences.sort((a,b)=>{
  const score=z=>Math.min(z.length,expected)*5-Math.abs(z.length-expected)*14-Math.abs(z[0]-expectedTop)/(H*.03);
  return score(b)-score(a);
 });
 let ys=sequences[0].slice(0,10);
 // Prefer the count already selected by the user if enough REAL lines were detected.
 if(ys.length>=expected)ys=ys.slice(0,expected);
 if(ys.length<6||ys.length>10)return null;
 const segments=[];
 for(const y0 of [ys[0],ys[1],ys[ys.length-1]]){
  let best=null;
  for(let dy=-2;dy<=2;dy++){
   const y=clamp(y0+dy,0,H-1);let start=-1;
   for(let x=left;x<right;x++){
    const dark=isDark(x,y);
    if(dark&&start<0)start=x;
    if((!dark||x===right-1)&&start>=0){
     const end=dark&&x===right-1?x:x-1;
     if(!best||end-start>best[1]-best[0])best=[start,end];
     start=-1;
    }
   }
  }
  if(best&&best[1]-best[0]>W*.52)segments.push(best);
 }
 if(!segments.length)return null;
 const x0=Math.round(median(segments.map(p=>p[0]))/scale);
 const x1=Math.round(median(segments.map(p=>p[1]))/scale);
 const pixelYs=ys.map(y=>Math.round(y/scale));
 const words=d.ocr?.words||[];
 const top=pixelYs[0],bottom=pixelYs[pixelYs.length-1];
 const g=d.geometry,cols=g.cols.slice();
 // Header OCR can refine the two interior column starts, but only with three clearly separated groups.
 const header=words.filter(w=>w.bbox&&(w.bbox.y0+w.bbox.y1)/2>pixelYs[0]&&(w.bbox.y0+w.bbox.y1)/2<pixelYs[1]);
 const starts=header.map(w=>w.bbox.x0).sort((a,b)=>a-b);
 const second=starts.find(x=>x>x0+(x1-x0)*.35&&x<x0+(x1-x0)*.70);
 const third=starts.find(x=>x>x0+(x1-x0)*.68);
 if(second&&third&&third-second>(x1-x0)*.15){
  const offset=(x1-x0)*.035;
  const proposed=[Math.round(second-offset),Math.round(third-offset)];
  if(proposed[0]>x0+60&&proposed[1]>proposed[0]+60&&proposed[1]<x1-40)cols.splice(0,2,...proposed);
 }
 // Notes are spanning prose beneath the last parameter border; exclude the page footer.
 const below=words.filter(w=>w.bbox&&w.bbox.y0>=bottom-4&&w.bbox.y0<d.height*.96);
 const footer=below.filter(w=>/^(technical|page|页码|第)$/i.test(String(w.text||'').replace(/[^\p{L}]/gu,''))&&w.bbox.x0<x0+(x1-x0)*.24)
   .sort((a,b)=>a.bbox.y0-b.bbox.y0)[0];
 const noteMarkers=below.filter(w=>/^\[\d{1,2}\]$/.test(String(w.text||'').trim())&&w.bbox.x0<x0+(x1-x0)*.14)
   .sort((a,b)=>a.bbox.y0-b.bbox.y0);
 let noteTop=bottom+Math.max(4,Math.round(d.height*.005));
 if(noteMarkers.length)noteTop=Math.min(noteTop,noteMarkers[0].bbox.y0-5);
 let noteBottom=footer?footer.bbox.y0-5:Math.min(d.height*.95,bottom+Math.max(45,d.height*.10));
 if(noteMarkers.length){
  const last=noteMarkers[noteMarkers.length-1];
  const textBelow=below.filter(w=>w.bbox.y0>=last.bbox.y0&&(!footer||w.bbox.y1<footer.bbox.y0-2));
  if(textBelow.length)noteBottom=Math.max(noteBottom,Math.max(...textBelow.map(w=>w.bbox.y1))+6);
 }
 if(footer)noteBottom=Math.min(noteBottom,footer.bbox.y0-4);
 noteTop=clamp(Math.round(noteTop),bottom+2,d.height-25);
 noteBottom=clamp(Math.round(noteBottom),noteTop+15,d.height-2);
 const next={x0,x1,cols,ys:pixelYs,notes:[noteTop,noteBottom]};
 const values=[x0,x1,...cols,...pixelYs,noteTop,noteBottom];
 if(values.some(x=>!Number.isFinite(x))||cols[0]<=x0+10||cols[1]<=cols[0]+10||cols[1]>=x1-10)return null;
 return next;
}
function mount(w){
 const doc=w.document;
 if(!doc?.getElementById('source-canvas')||!doc.getElementById('rebuild-grid')||installed.has(doc))return;
 const native=api(w);if(!native)return;
 installed.add(doc);
 const viewer=doc.getElementById('viewer'),button=doc.createElement('button'),bar=doc.createElement('div'),message=doc.createElement('span');
 bar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 10px;margin-bottom:8px;border:1px solid #badbd5;border-radius:7px;background:#f1f9f7;font:13px/1.5 system-ui;';
 button.type='button';button.textContent='按原图重新检测行列边界';
 button.style.cssText='padding:7px 12px;border:1px solid #087d79;border-radius:6px;background:#087d79;color:white;cursor:pointer;font:600 13px system-ui;';
 message.textContent='使用原图像素检测真实横线，Tesseract 词框用于归格。无法确认时保留原有边界。';
 message.style.cssText='color:#526c6a;flex:1;min-width:230px;';
 bar.append(button,message);viewer.before(bar);
 let working=false,autoSeen='';
 async function fix(automatic){
  const d=native.getDoc();if(!d||working)return;
  if(!d.ocr?.words?.length){if(!automatic)message.textContent='请先运行 OCR，再检测行列边界。';return;}
  if(automatic&&d.manualEdits>0){message.textContent='已有人工修改：保留当前文本。可手动检查原图边界。';return;}
  working=true;button.disabled=true;
  try{
   const detected=await analyze(d);
   if(!detected){message.textContent='未找到足够可靠的原图横线，未修改边界。可以继续使用 Week8 的手动拖动功能。';return;}
   const g=d.geometry;
   const updated=JSON.stringify(g)!==JSON.stringify(detected);
   if(!updated){message.textContent='原图边界与当前设置一致，无须重新分表。';return;}
   if(!automatic&&d.manualEdits>0&&!w.confirm('按原图重新分表将替换当前人工修改的原文与译文，继续吗？'))return;
   // Work only against native Week8 geometry and native word-to-cell assignment.
   Object.assign(g,detected);
   native.renderGeometry();
   native.draw();
   if(automatic||d.manualEdits===0){
    native.rebuild(false);
    message.textContent='已从原图像素检测 '+(detected.ys.length-2)+' 条参数行、两条列界；注释与页脚位于三列参数区之外。';
   }else{
    message.textContent='边界已根据原图更新。已有人工译文未自动覆盖；确认后使用 Week8 原生“重新分表”。';
   }
  }catch(e){message.textContent='原图边界检测未完成：'+(e?.message||String(e));}
  finally{working=false;button.disabled=false;}
 }
 button.addEventListener('click',()=>fix(false));
 const check=()=>{
  const d=native.getDoc();if(!d?.ocr?.words?.length)return;
  const key=d.id+'|'+(d.ocr.recognizedAt||d.ocr.cellReOCRAt||d.ocr.cacheSource||'')+'|'+d.ocr.words.length;
  if(!key||key===autoSeen)return;
  autoSeen=key;
  fix(true);
 };
 w.setInterval(check,1600);check();
}
function scan(){
 for(const outer of [document,...[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument}catch{return null}}).filter(Boolean)]){
  try{mount(outer.defaultView)}catch(e){}
  for(const frame of outer.querySelectorAll('iframe')){
   try{if(frame.contentWindow)mount(frame.contentWindow)}catch(e){}
   if(!frame.dataset.twGeometryScan){frame.dataset.twGeometryScan='1';frame.addEventListener('load',scan);}
  }
 }
}
scan();setInterval(scan,2000);
})();