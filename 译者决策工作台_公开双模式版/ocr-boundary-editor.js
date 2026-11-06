(()=>{'use strict';
const KEY='tw-ocr-edits-v2',known=new WeakMap();
const css='.tw-ocr-tools{display:flex;gap:5px;flex-wrap:wrap;padding:8px;margin:8px 0;background:#f5f8ff;border:1px solid #ccdcec;border-radius:8px;font:12px system-ui}.tw-ocr-tools button{background:white;color:#235580;border:1px solid #bfd2e5;padding:6px 9px;border-radius:6px;cursor:pointer}.tw-ocr-tools button[aria-pressed=true]{color:white;background:#1764bb}.tw-ocr-tools small{width:100%;color:#667789}.tw-ocr-overlay{position:fixed;z-index:2147480000;pointer-events:none;overflow:hidden}.tw-ocr-overlay.editing{pointer-events:auto;cursor:crosshair;touch-action:none}.tw-ocr-overlay svg{width:100%;height:100%;display:block}.tw-ocr-overlay line{stroke:#ef791c;stroke-width:2;vector-effect:non-scaling-stroke}.tw-ocr-overlay line.selected{stroke:#dd244b;stroke-width:3}.tw-ocr-overlay line.hit{stroke:transparent;stroke-width:18;pointer-events:stroke}';
function bind(d){if(!d||!d.body)return;const imgs=[...d.querySelectorAll('img,canvas')].filter(x=>{const r=x.getBoundingClientRect();return r.width>350&&r.height>230});if(!imgs.length)return;
const base=imgs.find(x=>x.tagName==='IMG')||imgs[0];const head=[...d.querySelectorAll('h1,h2,h3,h4,strong')].find(x=>/原页与位置|OCR/.test(x.textContent||'')&&(x.textContent||'').length<75);if(!head&&!d.getElementById('tw-ocr-native-toggle'))return;
const prior=known.get(d);if(prior){prior.position();return;}const style=d.createElement('style');style.textContent=css;d.head.append(style);
const bar=d.createElement('div');bar.className='tw-ocr-tools';const overlay=d.createElement('div');overlay.className='tw-ocr-overlay';const svg=d.createElementNS('http://www.w3.org/2000/svg','svg');overlay.append(svg);d.body.append(overlay);
const signature=(base.currentSrc||base.getAttribute('src')||d.title||'image').slice(0,140),key=KEY+':'+signature;
let strokes=[];try{strokes=JSON.parse(d.defaultView.localStorage.getItem(key)||'[]')}catch{}if(!Array.isArray(strokes))strokes=[];
let mode='view',selected=-1,drag=null,undo=[],redo=[];
const cp=()=>strokes.map(s=>({...s}));const save=()=>{try{d.defaultView.localStorage.setItem(key,JSON.stringify(strokes))}catch{}};
const checkpoint=()=>{undo.push(cp());if(undo.length>100)undo.shift();redo=[]};
function button(t,fn){const b=d.createElement('button');b.type='button';b.textContent=t;b.addEventListener('click',fn);bar.append(b);return b}
const modes={};function setMode(m){mode=m;selected=-1;overlay.classList.toggle('editing',m!=='view');Object.keys(modes).forEach(k=>modes[k].setAttribute('aria-pressed',String(k===m)));draw()}
modes.view=button('查看',()=>setMode('view'));modes.h=button('＋ 补横线',()=>setMode('h'));modes.v=button('＋ 补竖线',()=>setMode('v'));modes.select=button('选择／拖动',()=>setMode('select'));
const del=button('删除选中',()=>{if(selected<0)return;checkpoint();strokes.splice(selected,1);selected=-1;save();draw()});
const back=button('撤销',()=>{if(!undo.length)return;redo.push(cp());strokes=undo.pop();selected=-1;save();draw()});
const forward=button('重做',()=>{if(!redo.length)return;undo.push(cp());strokes=redo.pop();selected=-1;save();draw()});
button('导出校正',()=>{const blob=new Blob([JSON.stringify({version:2,kind:'ocr-boundary-corrections',lines:strokes},null,2)],{type:'application/json'});const a=d.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='ocr-corrections.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)});
button('导入校正',()=>{const input=d.createElement('input');input.type='file';input.accept='.json';input.onchange=async()=>{try{const j=JSON.parse(await input.files[0].text());if(j.kind!=='ocr-boundary-corrections'||!Array.isArray(j.lines)||j.lines.length>300)throw Error();checkpoint();strokes=j.lines.filter(x=>(x.axis==='h'||x.axis==='v')&&Number.isFinite(x.at)).map(x=>({axis:x.axis,at:Math.max(0,Math.min(1,x.at))}));save();draw();note.textContent='已导入校正线。'}catch{note.textContent='导入失败：校正文件格式不正确。'}};input.click()});
button('清除校正',()=>{if(!strokes.length||!d.defaultView.confirm('清除本张图片的全部手动校正线？'))return;checkpoint();strokes=[];selected=-1;save();draw()});
const note=d.createElement('small');note.textContent='橙色为手动校正线，原始绿色 OCR 框保留。点击补线、拖动校正；更改仅影响校正图层，暂不改写 OCR 单元格数据。';bar.append(note);
// Keep all editor controls out of the application's own grid/flex layout.
bar.style.cssText='position:fixed!important;right:12px;top:56px;z-index:2147480001;width:min(660px,calc(100vw - 24px));max-height:min(230px,45vh);overflow:auto;box-sizing:border-box;margin:0!important;display:none;box-shadow:0 4px 18px #0002;';
d.body.append(bar);
const launcher=d.createElement('button');launcher.type='button';launcher.textContent='✎ 表格线编辑';
launcher.setAttribute('aria-expanded','false');
launcher.style.cssText='position:fixed!important;right:12px;top:10px;z-index:2147480002;border:1px solid #1266d6;border-radius:8px;background:#1266d6;color:#fff;padding:8px 14px;font:600 13px system-ui;box-shadow:0 2px 10px #0002;cursor:pointer;white-space:nowrap;';
launcher.addEventListener('click',()=>{const show=bar.style.display==='none';bar.style.display=show?'flex':'none';launcher.setAttribute('aria-expanded',String(show));if(!show)setMode('view');});
d.body.append(launcher);
function position(){const r=base.getBoundingClientRect();Object.assign(overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',display:r.width>50?'block':'none'})}
function coord(e){const r=overlay.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
function draw(){svg.replaceChildren();for(let i=0;i<strokes.length;i++){const s=strokes[i],a=d.createElementNS('http://www.w3.org/2000/svg','line'),p=(s.at*100)+'%';const attrs=s.axis==='h'?{x1:'0%',x2:'100%',y1:p,y2:p}:{x1:p,x2:p,y1:'0%',y2:'100%'};for(const k in attrs)a.setAttribute(k,attrs[k]);if(i===selected)a.classList.add('selected');svg.append(a);if(mode==='select'){const hit=a.cloneNode();hit.setAttribute('class','hit');hit.dataset.index=i;svg.append(hit)}}del.disabled=selected<0;back.disabled=!undo.length;forward.disabled=!redo.length}
overlay.addEventListener('pointerdown',e=>{if(mode==='view'||e.button!==0)return;const p=coord(e);if(mode==='select'){const idx=e.target.dataset?.index;selected=idx===undefined?-1:Number(idx);if(selected>=0){checkpoint();drag=e.pointerId;overlay.setPointerCapture(e.pointerId)}}else{checkpoint();strokes.push({axis:mode,at:mode==='h'?p.y:p.x});selected=strokes.length-1;save()}draw();e.preventDefault()});
overlay.addEventListener('pointermove',e=>{if(drag!==e.pointerId||selected<0)return;const p=coord(e),s=strokes[selected];s.at=s.axis==='h'?p.y:p.x;draw()});
function release(e){if(drag!==e.pointerId)return;drag=null;save();draw()}overlay.addEventListener('pointerup',release);overlay.addEventListener('pointercancel',release);
d.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(d.activeElement?.tagName)||d.activeElement?.isContentEditable)return;if(mode==='select'&&selected>=0&&['Delete','Backspace'].includes(e.key)){e.preventDefault();del.click()}else if(mode!=='view'&&(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?forward:back).click()}else if(e.key==='Escape')setMode('view')});
d.addEventListener('scroll',position,true);d.defaultView.addEventListener('resize',position);if(d.defaultView.ResizeObserver)new d.defaultView.ResizeObserver(position).observe(base);known.set(d,{position});setMode('view');position();
}
function scan(){for(const doc of [document,...[...document.querySelectorAll('iframe')].map(f=>{try{return f.contentDocument}catch{return null}}).filter(Boolean)]){try{bind(doc);for(const f of doc.querySelectorAll('iframe')){try{bind(f.contentDocument)}catch{}if(!f.dataset.twOcrEditorWatch){f.dataset.twOcrEditorWatch='1';f.addEventListener('load',scan)}}}catch(e){console.warn('OCR editor:',e)}}}
scan();setInterval(scan,1800);
})();