(()=>{
'use strict';
const done=new WeakSet();
function api(w){try{return w.eval('({doc:()=>doc(),selection:()=>selected,cellRect,rawAt,deriveNotes,rebuild,selectCell})')}catch{return null}}
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
// Restore edited text by verified OCR source, including rows shifted by resegmentation.
// Repeated identical OCR cells are only matched when their original row is unambiguous.
// Restore edited text by unique OCR source, including rows displaced by resegmentation.
// For repeated text, require an unambiguous whole-row match; never guess after movement.
function preserveTranslationCells(before,after){
 const signature=row=>[0,1,2].map(c=>norm(row.source?.[c])).join('\u001e');
 const layoutUnchanged=before.length===after.length&&before.every((row,i)=>signature(row)===signature(after[i]));
 const keyed=new Map();
 before.forEach((row,i)=>{
  for(let c=0;c<3;c++){
   const source=norm(row.source?.[c]),target=row.target?.[c];
   if(!source||typeof target!=='string'||!target.trim()||norm(target)===source)continue;
   const key=c+'\u001f'+source,items=keyed.get(key)||[];
   items.push({i,rowSignature:signature(row),value:target,used:false});keyed.set(key,items);
  }
 });
 let restored=0,ambiguous=0;
 after.forEach((row,i)=>{
  if(!Array.isArray(row.source)||!Array.isArray(row.target))return;
  for(let c=0;c<3;c++){
   const source=norm(row.source[c]),current=row.target[c];
   if(!source||(typeof current==='string'&&current.trim()&&norm(current)!==source))continue;
   const available=(keyed.get(c+'\u001f'+source)||[]).filter(x=>!x.used);
   if(!available.length)continue;
   let selected=null;
   if(available.length===1)selected=available[0];
   else{
    const fullRowMatches=available.filter(x=>x.rowSignature===signature(row));
    if(fullRowMatches.length===1)selected=fullRowMatches[0];
    else if(layoutUnchanged){
     const sameRow=available.filter(x=>x.i===i);
     if(sameRow.length===1)selected=sameRow[0];
    }
   }
   if(!selected){ambiguous++;continue;}
   row.target[c]=selected.value;selected.used=true;restored++;
  }
 });
 return {restored,ambiguous};
}
// Keep the last three small, text-only checkpoints before destructive OCR resegmentation.
// Source images and native OCR persistence remain untouched.
function saveRebuildHistory(w,id,rows,notes){
 const editedRows=rows.map((row,i)=>({
  row:i+1,cells:[0,1,2].map(c=>({column:c+1,source:String(row.source?.[c]??''),translation:String(row.target?.[c]??'')}))
   .filter(x=>norm(x.translation)&&norm(x.translation)!==norm(x.source))
 })).filter(x=>x.cells.length);
 const editedNotes=notes.map(x=>({mark:x.mark,source:x.source,translation:x.zh}))
  .filter(x=>norm(x.translation)&&norm(x.translation)!==norm(x.source));
 if(!editedRows.length&&!editedNotes.length)return true;
 const key='tw-ocr-resegment-history-v1:'+id;
 try{
  const old=JSON.parse(w.localStorage.getItem(key)||'[]');
  const entries=Array.isArray(old)?old.slice(-2):[];
  entries.push({savedAt:Date.now(),rows:editedRows,notes:editedNotes});
  let raw=JSON.stringify(entries);
  while(raw.length>800000&&entries.length>1){entries.shift();raw=JSON.stringify(entries)}
  if(raw.length>800000)return false;
  w.localStorage.setItem(key,raw);
  return true;
 }catch(e){console.warn('OCR resettlement backup unavailable:',e);return false}
}
function loadRebuildHistory(w,id){
 try{const v=JSON.parse(w.localStorage.getItem('tw-ocr-resegment-history-v1:'+id)||'[]');return Array.isArray(v)?v:[]}
 catch{return []}
}
function setup(w){
 const D=w.document,viewer=D.getElementById('viewer'),editor=D.getElementById('editor'),rebuild=D.getElementById('rebuild-grid');
 if(!viewer||!editor||!rebuild||done.has(D))return;
 const n=api(w);if(!n)return;done.add(D);
 const style=D.createElement('style');
 style.textContent='.tw-safe-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 9px;padding:8px 10px;border:1px solid #d2e2e6;border-radius:6px;background:#f5fafa;font:13px system-ui}.tw-safe-strip button{padding:6px 9px;border:1px solid #b7cbd3;border-radius:5px;background:white;cursor:pointer;font:inherit}.tw-safe-strip strong{margin-right:auto}.tw-safe-strip small{flex-basis:100%;color:#60737b}.tw-status-button{font:11px system-ui;border:1px solid #cad9d9;border-radius:5px;padding:3px 5px;cursor:pointer;background:#fff;color:#39535c}.tw-status-button[data-v=checked]{background:#e3f4ea;color:#17633e}.tw-status-button[data-v=issue]{background:#fff1df;color:#905e19}.tw-diff-dialog{max-width:min(780px,94vw);width:740px;max-height:84vh;overflow:auto;border:1px solid #b9ccd2;border-radius:10px;padding:18px;background:white;color:#263d47;box-shadow:0 16px 40px #0003;font:13px/1.55 system-ui}.tw-diff-dialog::backdrop{background:#132d3977}.tw-diff-dialog table{width:100%;border-collapse:collapse;table-layout:fixed}.tw-diff-dialog th,.tw-diff-dialog td{border:1px solid #d5e0e4;padding:7px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}.tw-diff-dialog footer{display:flex;justify-content:flex-end;gap:9px;margin-top:12px}.tw-diff-dialog button{padding:7px 12px;cursor:pointer}.tw-diff-dialog .primary{background:#087d79;color:white}';
 D.head.append(style);
 // Preserve side-by-side original image and editable OCR result inside the embedded Week8 frame.
 // Week8's <=1050px media query otherwise collapses the two panels into a vertical stack.
 const layoutStyle=D.createElement('style');
 layoutStyle.id='tw-ocr-side-by-side-layout';
 layoutStyle.textContent=`
 .layout{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.12fr)!important;align-items:start!important;gap:12px!important}
 .layout>.panel{min-width:0!important}
 .layout>.sourcepanel{position:sticky!important;top:12px!important;align-self:start!important}
 .layout .viewer{max-height:72vh!important;overflow:auto!important}
 .layout .viewer canvas{max-width:100%!important}
 @media(max-width:760px){
   main{overflow-x:auto!important}
   .layout{min-width:780px!important}
   .layout>.sourcepanel{position:relative!important;top:0!important}
 }
 `;
 D.head.append(layoutStyle);

 const bar=D.createElement('div');bar.className='tw-safe-strip';
 const title=D.createElement('strong'),hint=D.createElement('small');hint.textContent='选中右侧单元格会定位左侧原图；点击原图也可跳转右侧。';
 const jump=D.createElement('button');jump.textContent='定位当前格';jump.type='button';
 const next=D.createElement('button');next.textContent='下一待核对';next.type='button';
 const archive=D.createElement('button');archive.textContent='分表前译文记录';archive.type='button';
 bar.append(title,jump,next,archive,hint);editor.before(bar);
 const dialog=D.createElement('dialog');dialog.className='tw-diff-dialog';D.body.append(dialog);
 archive.addEventListener('click',()=>{
  const d=project(),history=d?loadRebuildHistory(w,d.id):[];
  if(!history.length){hint.textContent='当前项目暂无分表前的人工译文记录。';return}
  const heading=D.createElement('h3');heading.textContent='重新分表前的人工译文记录';
  const description=D.createElement('p');description.textContent='仅保存本浏览器最近三次重新分表前的人工译文。原 OCR 工程仍使用工作台自带的导入与导出功能。';
  const label=D.createElement('label');label.textContent='选择记录： ';
  const selector=D.createElement('select');selector.setAttribute('aria-label','选择历史译文记录');
  history.forEach((entry,i)=>{
   const option=D.createElement('option');option.value=String(i);
   option.textContent=new Date(entry.savedAt).toLocaleString('zh-CN',{hour12:false})+' · 第 '+(i+1)+' 份';
   selector.append(option);
  });
  label.append(selector);
  const content=D.createElement('textarea');content.readOnly=true;content.style.cssText='width:100%;box-sizing:border-box;min-height:250px;max-height:50vh;padding:9px;resize:vertical;white-space:pre-wrap;font:13px/1.6 sans-serif';
  function update(){
   const entry=history[Number(selector.value)]||history[history.length-1],parts=[];
   for(const row of entry.rows||[])for(const cell of row.cells||[]){
    parts.push('第 '+row.row+' 行 / 第 '+cell.column+' 列\\n原文：'+cell.source+'\\n原译：'+cell.translation);
   }
   for(const note of entry.notes||[])parts.push('注释 '+String(note.mark||'')+'\\n原文：'+String(note.source||'')+'\\n原译：'+String(note.translation||''));
   content.value=parts.join('\\n\\n');
  }
  selector.value=String(history.length-1);selector.addEventListener('change',update);update();
  const foot=D.createElement('footer'),close=D.createElement('button');close.type='button';close.textContent='关闭';close.addEventListener('click',()=>dialog.close());foot.append(close);
  dialog.replaceChildren(heading,description,label,content,foot);dialog.showModal();
 });
 let mark={},key='',busy=false;
 function project(){return n.doc()}
 function load(){let d=project();if(!d)return;let k='tw-review-status-v2:'+d.id+':'+(d.ocr?.recognizedAt||d.image?.length||'');if(k===key)return;key=k;try{mark=JSON.parse(w.localStorage.getItem(k)||'{}')}catch{mark={}}}
 function save(){try{w.localStorage.setItem(key,JSON.stringify(mark))}catch{}}
 function locate(){const s=n.selection(),d=project(),canvas=D.getElementById('source-canvas');if(!s||!d||!canvas)return;const rect=n.cellRect(s.r,s.c),zoom=canvas.getBoundingClientRect();viewer.scrollTo({left:Math.max(0,(rect.x0+rect.x1)*zoom.width/(2*d.width)-viewer.clientWidth/2),top:Math.max(0,(rect.y0+rect.y1)*zoom.height/(2*d.height)-viewer.clientHeight/2),behavior:'smooth'});hint.textContent='已定位第'+(s.r+1)+'行、第'+(s.c+1)+'列；原图中青色高亮对应当前格。'}
 function decorate(){const d=project();if(!d)return;load();let checked=0,issue=0;for(let r=0;r<d.rows.length;r++)for(let c=0;c<3;c++){let k=r+','+c;if(mark[k]==='checked')checked++;if(mark[k]==='issue')issue++;}title.textContent='逐格核对 '+checked+'/'+(d.rows.length*3)+(issue?' · 待修正 '+issue:'');
 for(const cell of D.querySelectorAll('#editor td[data-cell]')){let k=cell.dataset.cell,b=cell.querySelector('.tw-status-button');if(!b){b=D.createElement('button');b.type='button';b.className='tw-status-button';b.title='待核对 → 已核对 → 需修正';cell.querySelector('.celllabel')?.append(b);b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();let values=['pending','checked','issue'];mark[k]=values[(values.indexOf(mark[k]||'pending')+1)%3];save();let [r,c]=k.split(',').map(Number);n.selectCell(r,c);decorate();locate()})}b.dataset.v=mark[k]||'pending';b.textContent=mark[k]==='checked'?'✓ 已核对':mark[k]==='issue'?'! 需修正':'○ 待核对';}
 }
 jump.onclick=locate;next.onclick=()=>{const d=project(),s=n.selection();if(!d?.rows?.length)return;load();let start=s?s.r*3+s.c+1:0;for(let i=0;i<d.rows.length*3;i++){let v=(start+i)%(d.rows.length*3),r=Math.floor(v/3),c=v%3;if(mark[r+','+c]!=='checked'){n.selectCell(r,c);D.querySelector('#editor [data-cell="'+r+','+c+'"]')?.scrollIntoView({block:'nearest',behavior:'smooth'});locate();return}}hint.textContent='所有参数格已核对。'};
 editor.addEventListener('focusin',e=>{if(e.target.matches('textarea[data-row]'))w.setTimeout(locate,40)},true);
 D.getElementById('source-canvas').addEventListener('pointerup',()=>w.setTimeout(()=>{let s=n.selection();if(s)D.querySelector('#editor [data-cell="'+s.r+','+s.c+'"]')?.scrollIntoView({block:'nearest',behavior:'smooth'})},60));
 function proposal(){let d=project(),g=d.geometry,xs=[g.x0,...g.cols,g.x1],rows=[];for(let r=0;r<g.ys.length-2;r++)rows.push([0,1,2].map(c=>n.rawAt({x0:xs[c],x1:xs[c+1],y0:g.ys[r+1],y1:g.ys[r+2]})));return {rows,notes:n.deriveNotes()}}
 function preview(){
  let d=project();if(!d?.ocr||busy)return;let nextData;try{nextData=proposal()}catch(e){hint.textContent='差异预览失败：'+e.message;return}
  const changes=[];let same=0;for(let r=0;r<Math.max(d.rows.length,nextData.rows.length);r++)for(let c=0;c<3;c++){let old=norm(d.rows[r]?.source[c]),now=norm(nextData.rows[r]?.[c]);if(old===now)same++;else changes.push([r+1,c+1,old,now])}
  let notesDiff=JSON.stringify(d.notes.map(x=>[x.mark,norm(x.source)]))!==JSON.stringify(nextData.notes.map(x=>[x.mark,norm(x.source)]));
  let rows=changes.slice(0,50).map(v=>'<tr><td>'+v[0]+' / '+v[1]+'</td><td>'+esc(v[2]||'（空）')+'</td><td>'+esc(v[3]||'（空）')+'</td></tr>').join('');
  dialog.innerHTML='<h3>重新分表 · 差异确认</h3><p>保持不变 '+same+' 格；将变化 '+changes.length+' 格。'+(notesDiff?'注释归格也会变化。':'')+'</p><p style="color:#8a611c">重新分表可能重置已编辑的中文。系统会尝试根据未变化的原文恢复已编辑中文；遇到重复且无法确定归属的单元格，将保留待人工核对。</p>'+(rows?'<div style="overflow:auto;max-height:300px"><table><thead><tr><th>行 / 列</th><th>当前原文</th><th>新归格原文</th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p>当前单元格原文未发生变化。</p>')+'<label style="display:block;margin-top:12px"><input id="tw-preserve" type="checkbox" checked> 保留原文未变化的格内已有中文及匹配注释</label><footer><button id="tw-cancel" type="button">取消</button><button id="tw-accept" type="button" class="primary">确认重新分表</button></footer>';
  dialog.querySelector('#tw-cancel').onclick=()=>dialog.close();
  dialog.querySelector('#tw-accept').onclick=()=>{
   if(busy)return;
   busy=true;
   const keep=dialog.querySelector('#tw-preserve').checked;
   const rowsBefore=d.rows.map(r=>({source:Array.isArray(r.source)?r.source.slice():[],target:Array.isArray(r.target)?r.target.slice():[]}));
   const notesBefore=d.notes.map(x=>({mark:x.mark,source:x.source,zh:x.zh,models:Array.isArray(x.models)?x.models.slice():[]}));
   if(!saveRebuildHistory(w,d.id,rowsBefore,notesBefore)){
    hint.textContent='分表已取消：无法安全保存修改前的译文。请先通过原生功能导出 OCR 工程备份，或释放浏览器存储空间。';
    busy=false;return;
   }
   try{
    n.rebuild(false);
    let preserved={restored:0,ambiguous:0};
    if(keep){
     preserved=preserveTranslationCells(rowsBefore,d.rows);
     for(const note of d.notes){
      const old=notesBefore.find(o=>o.mark===note.mark&&norm(o.source)===norm(note.source));
      if(old){
       if(!norm(note.zh)&&typeof old.zh==='string')note.zh=old.zh;
       if(old.models.length)note.models=old.models.slice();
       // Keep the newly calculated rowId: the old location may no longer exist.
      }
     }
     try{w.eval('renderEditor();renderNotes();renderPreview();refreshRequest();draw()')}catch(e){console.warn('Week8 display refresh:',e)}
    }
    mark={};save();dialog.close();w.setTimeout(decorate,80);
    hint.textContent='分表已更新。'+(keep?'已安全恢复 '+preserved.restored+' 格已编辑译文。':'')+(preserved.ambiguous?'有 '+preserved.ambiguous+' 格原文重复，无法可靠匹配，请人工核对。':'')+'原文变化的单元格仍需重新核对。';
   }catch(e){hint.textContent='重新分表失败：'+(e?.message||String(e))}
   finally{busy=false}
  };
  dialog.showModal();
 }
 rebuild.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();preview()},true);
 const observe=new w.MutationObserver(()=>w.requestAnimationFrame(decorate));observe.observe(editor,{childList:true});
 w.setInterval(decorate,2600);decorate();
}
function scan(){const seen=new Set();function visit(d){if(!d||seen.has(d))return;seen.add(d);try{setup(d.defaultView)}catch(e){console.warn('Week8 safety:',e)}for(const f of d.querySelectorAll('iframe')){try{visit(f.contentDocument)}catch{}if(!f.dataset.twSafeWatch){f.dataset.twSafeWatch='1';f.addEventListener('load',scan)}}}visit(document)}
scan();setInterval(scan,1800);
})();