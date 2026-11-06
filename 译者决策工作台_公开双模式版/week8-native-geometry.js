(()=>{'use strict';
// Expose Week8's original geometry editor. Do not draw an independent overlay.
const wired=new WeakSet();
function install(doc){
 if(!doc||!doc.body||wired.has(doc))return;
 const viewer=doc.getElementById('viewer'),canvas=doc.getElementById('source-canvas');
 const rebuild=doc.getElementById('rebuild-grid'),details=doc.getElementById('geometry-details');
 const count=doc.getElementById('row-count'),equal=doc.getElementById('equal-rows');
 if(!viewer||!canvas||!rebuild||!details||!count||!equal)return;
 wired.add(doc);
 const style=doc.createElement('style');style.textContent=
 '.tw-week8-native-bar{display:flex;gap:7px;flex-wrap:wrap;align-items:center;padding:9px 10px;margin:0 0 10px;background:#eef8f7;border:1px solid #b7d7d1;border-radius:7px;font:14px/1.5 Times New Roman,SimSun,serif;min-width:0}.tw-week8-native-bar button{font:inherit;cursor:pointer;white-space:nowrap;border:1px solid #8bbab4;border-radius:6px;padding:6px 10px;background:#fff;color:#17635e}.tw-week8-native-bar button.primary{background:#087d79;color:white}.tw-week8-native-bar small{flex-basis:100%;font:12px/1.5 SimSun,serif;color:#426b68}.tw-week8-native-bar .tw-active{background:#087d79!important;color:#fff!important}.tw-week8-native-bar select{padding:5px;font-size:13px;max-width:65px}.tw-week8-border-focus{outline:3px solid #12a28c;outline-offset:2px}';
 doc.head.append(style);
 const toolbar=doc.createElement('div');toolbar.className='tw-week8-native-bar';toolbar.id='tw-week8-native-geometry';
 const make=(label,fn,primary=false)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;if(primary)b.className='primary';b.addEventListener('click',fn);toolbar.append(b);return b};
 const notice=doc.createElement('small');notice.textContent='沿用 Week8 原生行列边界：直接拖动图中青色线条。调整后点击“按边界重新分表”。';
 const activate=make('调整表格线',()=>{
  details.open=true;viewer.classList.add('tw-week8-border-focus');
  canvas.scrollIntoView({block:'nearest',behavior:'smooth'});
  notice.textContent='编辑模式：直接拖动原图上的青色横线或竖线。拖动结束后按“按边界重新分表”。';
  activate.classList.add('tw-active');
 });
 const rowLabel=doc.createElement('label');rowLabel.textContent='参数行数 ';
 const rowSelect=doc.createElement('select');
 for(const option of count.options){const o=doc.createElement('option');o.value=option.value;o.textContent=option.textContent;rowSelect.append(o);}
 rowSelect.value=count.value;
 rowSelect.setAttribute('aria-label','参数行数');
 rowLabel.append(rowSelect);toolbar.append(rowLabel);
 rowSelect.addEventListener('change',()=>{
  if(!doc.defaultView.confirm('修改行数会调用 Week8 原有的等分行界功能，随后可拖动青色横线微调。继续？')){rowSelect.value=count.value;return;}
  count.value=rowSelect.value;
  equal.click();details.open=true;
  viewer.classList.add('tw-week8-border-focus');
  notice.textContent='已设置 '+count.value+' 行。现在拖动青色横线到准确位置，最后点击“按边界重新分表”。';
 });
 make('精确调整边界',()=>{details.open=true;details.scrollIntoView({block:'nearest',behavior:'smooth'});});
 make('按边界重新分表',()=>{
  if(!doc.defaultView.confirm('按照当前 Week8 边界重新分表将更新文字归格，可能替换正在编辑的单元格内容。确认执行？'))return;
  rebuild.click();viewer.classList.remove('tw-week8-border-focus');activate.classList.remove('tw-active');
  notice.textContent='已调用 Week8 原有重新分表功能。请逐格核对文字、数字和注释。';
 },true);
 make('显示／隐藏 OCR 词框',()=>{const checkbox=doc.getElementById('show-boxes');if(!checkbox)return;checkbox.checked=!checkbox.checked;checkbox.dispatchEvent(new Event('change',{bubbles:true}));});
 toolbar.append(notice);viewer.before(toolbar);
 // Keep row selectors in sync with the native Week8 editor.
 count.addEventListener('change',()=>{rowSelect.value=count.value;});

 // Restore true spanning regions using the OCR word positions, without touching text cells.
 // Week8 already stores notes separately; page footer should never be partitioned into models.
 function originalState(){
  try{return doc.defaultView.Function('return doc()')();}catch{return null;}
 }
 function repairGeometry(auto=false){
  const data=originalState();
  if(!data?.geometry||!data.ocr?.words?.length){
   if(!auto)notice.textContent='当前没有可用于定位注释的 OCR 文字，请先运行 OCR。';
   return false;
  }
  const g=data.geometry,words=data.ocr.words;
  const xLimit=g.x0+Math.min(150,(g.x1-g.x0)*.16);
  const leftNotes=words.filter(w=>w.bbox&&w.bbox.x0>=g.x0-30&&w.bbox.x0<xLimit&&w.bbox.y0>g.ys[1]&&/^\[\d{1,2}\]/.test(String(w.text||''))).sort((a,b)=>a.bbox.y0-b.bbox.y0);
  const footer=words.filter(w=>w.bbox&&w.bbox.x0<xLimit+70&&/^Technical$/i.test(String(w.text||''))).sort((a,b)=>a.bbox.y0-b.bbox.y0)[0];
  if(!leftNotes.length||!footer||footer.bbox.y0<=leftNotes[0].bbox.y0)return false;
  const firstNote=leftNotes[0].bbox.y0,lastWord=Math.max(...leftNotes.map(w=>w.bbox.y1));
  const noteTop=Math.max(0,Math.round(firstNote-10));
  const noteBottom=Math.min(data.height,Math.round(footer.bbox.y0-10));
  if(noteBottom<=noteTop+16)return false;
  const oldBottom=g.ys[g.ys.length-1];
  const targetBottom=Math.min(noteTop-12,Math.round(firstNote-29));
  if(targetBottom<=g.ys[g.ys.length-2]+14)return false;
  const needsChange=oldBottom>=noteTop-5||g.notes[0]>=firstNote-2||g.notes[1]>=footer.bbox.y0-2;
  if(!needsChange&&!auto){notice.textContent='检测到参数区、注释区和页脚已经分开，无需修改。';return false;}
  if(!needsChange)return false;
  // Do not rearrange valid rows; only truncate the incorrectly extended last edge.
  if(oldBottom>=noteTop-5)g.ys[g.ys.length-1]=targetBottom;
  g.notes[0]=noteTop;g.notes[1]=noteBottom;
  try{
   doc.defaultView.renderGeometry();
   doc.defaultView.draw();
  }catch(e){console.warn('Week8 geometry refresh',e);}
  if(!auto)notice.textContent='已将三列参数区止于注释上方；注释跨整行，页脚独立保留。请按当前边界重新分表以更新文字归格。';
  return true;
 }
 const fix=make('修复注释／页脚跨列',()=>repairGeometry(false));
 fix.title='根据 OCR 左侧注释编号和页脚文字定位，把三列边界限制在参数区内';
 // Only automatic geometry correction when the error is confirmed by OCR word coordinates.
 // Never overwrite user-edited source or translation cells.
 let repairKey='';
 function autoRepair(){
  const data=originalState();
  if(!data?.ocr?.words?.length)return;
  const key=String(data.ocr.recognizedAt||data.ocr.ms||'')+'|'+data.ocr.words.length+'|'+data.id;
  if(key===repairKey)return;
  repairKey=key;
  if(repairGeometry(true)){
   notice.textContent='检测到注释或页脚被三列网格穿过，已校正显示边界。原有文字未覆盖；必要时按边界重新分表。';
  }
 }
 const repairTimer=doc.defaultView.setInterval(autoRepair,1800);
 doc.defaultView.addEventListener('pagehide',()=>doc.defaultView.clearInterval(repairTimer),{once:true});
 autoRepair();

}
function scan(){
 const seen=new Set([document]);
 for(const f of document.querySelectorAll('iframe')){
  try{if(f.contentDocument)seen.add(f.contentDocument);}catch{}
 }
 for(const d of [...seen]){
  install(d);
  for(const f of d.querySelectorAll('iframe')){
   try{if(f.contentDocument)install(f.contentDocument);}catch{}
   if(!f.dataset.twWeek8GeometryLoad){f.dataset.twWeek8GeometryLoad='1';f.addEventListener('load',scan);}
  }
 }
}
scan();
setInterval(scan,1800);
})();