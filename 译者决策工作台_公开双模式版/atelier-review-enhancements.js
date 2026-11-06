(()=>{'use strict';
const css=[
'@media(min-width:651px){.app:not(.parameter-view){grid-template-columns:166px minmax(0,1fr)!important}.sidebar{padding:15px 8px 10px!important}.logo{padding:1px 5px 20px!important}.workflow-label{margin-top:20px!important}.nav-step{padding:10px 8px!important;gap:6px}.topbar{height:56px!important;padding:0 18px!important}.main{padding:13px 17px 25px!important;max-width:none!important}.app:not(.parameter-view) .workgrid{grid-template-columns:minmax(0,1fr)!important;gap:9px!important}.app:not(.parameter-view) .segments{display:flex!important;align-items:center;gap:8px;padding:5px 9px;min-height:46px;overflow:visible}.app:not(.parameter-view) .segments-head{height:auto;min-width:74px;border:0;padding:0 4px;gap:7px}.app:not(.parameter-view) .segments-head .icon-btn{width:25px;height:25px}.app:not(.parameter-view) .segment-list{display:flex;align-items:center;flex:1;min-height:0;max-height:74px;overflow:auto;padding:0;gap:5px}.app:not(.parameter-view) .segment-item{flex:0 0 auto;width:156px;max-width:180px;margin:0;padding:6px 9px}.app:not(.parameter-view) .segment-item strong{margin-bottom:2px}.app:not(.parameter-view) .segment-item small{-webkit-line-clamp:1}.app:not(.parameter-view) .segment-foot{border:0;padding:0 3px;gap:5px}.app:not(.parameter-view) .segment-foot #segmentCount{display:none}.app:not(.parameter-view) .segment-foot .text-btn{font-size:10px}}',
'.tw-card .tw-diff{white-space:pre-wrap!important;overflow-wrap:anywhere}.tw-card .tw-diff ins{box-decoration-break:clone;-webkit-box-decoration-break:clone}.tw-card .tw-deletions{font:13px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;border-top:1px dashed #e2e8f0;margin-top:12px;padding-top:8px;color:#687586;white-space:pre-wrap}.tw-card .tw-deletions del{margin-left:4px}.tw-card .panel-note{font-size:14px!important;line-height:1.75!important}#stageContent:has(.tw-card) .summary-panel{padding:10px 14px}#stageContent:has(.tw-card) .pane-content{padding:16px 20px!important}#stageContent:has(.tw-card) .pane:has(.source-ref){max-width:1100px;margin:auto}.tw-card .source-ref{background:#f7f9fc;border:1px solid #e3eaf2;border-radius:10px;padding:13px 16px;margin:0 0 8px;color:#293443}.tw-card .source-ref strong{font-size:11px;color:#627184;margin:0 0 7px}.tw-card .source-ref div{max-height:none;overflow:visible;font-size:16px;line-height:1.85}.tw-card .readbox{font-size:18px!important;line-height:1.72!important;max-height:none!important;min-height:0!important;overflow:visible!important;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px 0!important}.tw-card .tw-diff{background:#fbfcfe;border:1px solid #dce5f0;border-radius:10px;padding:12px 15px!important}.tw-card .tw-diff ins,.tw-card .tw-diff del{border-radius:3px;padding:1px 2px}.tw-card .tw-diff ins{background:#ccefdc;color:#125e39;text-decoration:none}.tw-card .tw-diff del{background:#ffebe8;color:#9f3b35;text-decoration:line-through}.tw-card .tw-align{margin:0 0 14px;color:#697584;font-size:11px}.tw-card .tw-align summary{cursor:pointer;width:fit-content}.tw-card .tw-fields{display:flex;gap:9px;flex-wrap:wrap;align-items:center;padding:9px 0}.tw-card .tw-fields select{font-size:12px;max-width:230px;padding:5px;background:#fff;border:1px solid #dae0e8;border-radius:6px}.tw-card .pane-content>.review-options:has([data-sentence-action]) .btn{font-size:13px;padding:9px 12px}@media(max-width:650px){.tw-card .readbox{font-size:16px!important}.tw-card .source-ref div{font-size:15px}#stageContent:has(.tw-card) .pane-content{padding:12px!important}}'
].join('\n');
const st=document.createElement('style');st.id='tw-review-enhancements';st.textContent=css;document.head.append(st);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function diff(a,b){
 const tk=t=>String(t).match(/\s+|[\p{L}\p{N}]+|[^\p{L}\p{N}\s]/gu)||[];
 const oldTokens=tk(a),newTokens=tk(b),n=oldTokens.length,m=newTokens.length;
 if(a===b)return esc(b);
 if(n*m>85000)return '<ins>'+esc(b)+'</ins><div class="tw-deletions">原有内容：<del>'+esc(a)+'</del></div>';
 const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)
  dp[i][j]=oldTokens[i]===newTokens[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0,output='',removed=[];
 while(i<n||j<m){
  if(i<n&&j<m&&oldTokens[i]===newTokens[j]){
   output+=esc(newTokens[j]);i++;j++;
  }else if(j<m&&(i===n||dp[i][j+1]>dp[i+1][j])){
   const t=newTokens[j++];
   output+=t.trim()?'<ins>'+esc(t)+'</ins>':esc(t);
  }else{
   removed.push(oldTokens[i++]);
  }
 }
 const deletion=removed.join('').trim();
 // Preserve exactly the revised translation's spaces and punctuation in the main line.
 // Removed content is listed separately so it cannot join neighbouring English words.
 return output+(deletion?'<div class="tw-deletions"><span>删去：</span><del>'+esc(deletion)+'</del></div>':'');
}
function sentences(raw,lang){
 const v=String(raw||'');if(!v.trim())return [];
 if(Intl.Segmenter){
  const items=Array.from(new Intl.Segmenter(lang==='中文'?'zh':'en',{granularity:'sentence'}).segment(v),x=>x.segment).filter(x=>x.trim());
  if(lang==='中文')return items;
  const merged=[],abbr=/(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|No|Vol|Fig|etc|vs|cf|pp|Inc)|\b[A-Z])\.\s*$/i;
  for(const x of items)if(merged.length&&abbr.test(merged[merged.length-1]))merged[merged.length-1]+=x;else merged.push(x);
  return merged;
 }
 return v.match(/[^。！？!?.]+[。！？!?.]*\s*/g)?.filter(x=>x.trim())||[];
}
function current(){try{const st=JSON.parse(localStorage.getItem('tw-workplace-v4')||'null'),p=st?.projects?.find(p=>p.id===st.active)||st?.projects?.[0],s=p?.segments?.find(x=>x.id===st.seg)||p?.segments?.[0];return {p,s};}catch{return {};}}
const key='tw-source-alignment-v1';
function saved(){try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}}
function enhance(){
 const el=document.querySelector('#stageContent .source-ref');if(!el||el.dataset.twDone)return;
 const card=el.closest('.pane'),pane=el.closest('.pane-content'),{p,s}=current();
 if(!card||!pane)return;
 // Compare the two visible text blocks even if saved project data cannot be resolved.
 const visibleBoxes=Array.from(pane.querySelectorAll('.readbox'));
 if(visibleBoxes.length>=2){
  const original=visibleBoxes[0].textContent.trim();
  const suggested=visibleBoxes[1].textContent.trim();
  visibleBoxes[1].classList.add('tw-diff');
  visibleBoxes[1].innerHTML=original===suggested?esc(suggested):diff(original,suggested);
 }
 card.classList.add('tw-card');el.dataset.twDone='1';
 if(!p||!s||!s.reviewDecisions?.length)return;
 const m=(card.querySelector('.pane-top strong')?.textContent||'').match(/第\s*(\d+)\s*\/\s*(\d+)\s*句/);
 if(!m)return;
 const index=Number(m[1])-1,total=Number(m[2]),units=sentences(s.source,p.sourceLang),count=units.length;
 if(index<0||index>=s.reviewDecisions.length)return;
 const alignKey=p.id+':'+s.id+':'+index,manual=saved()[alignKey];
 const autoStart=count?Math.min(count-1,Math.floor(index*count/total)):0;
 const autoEnd=count?Math.min(count-1,Math.max(autoStart,Math.ceil((index+1)*count/total)-1)):0;
 const a=Number.isInteger(manual?.start)?Math.max(0,Math.min(count-1,manual.start)):autoStart;
 const b=Number.isInteger(manual?.end)?Math.max(a,Math.min(count-1,manual.end)):autoEnd;
 const title=el.querySelector('strong'),body=el.querySelector('div');
 if(title)title.textContent='原文 · 当前对应内容'+(count!==total?'（自动预配，请核对）':'');
 if(body)body.textContent=count?units.slice(a,b+1).join('').trim():'（本段原文为空）';
 if(count){
  const details=document.createElement('details');details.className='tw-align';
  const summary=document.createElement('summary');summary.textContent='调整本句对应的原文范围'+(manual?' · 已人工校正':'');
  const fields=document.createElement('div');fields.className='tw-fields';
  const options=units.map((v,j)=>'<option value="'+j+'">'+(j+1)+' · '+esc(v.trim().slice(0,23))+(v.trim().length>23?'…':'')+'</option>').join('');
  fields.innerHTML='<label>起始句 <select aria-label="原文起始句">'+options+'</select></label><label>结束句 <select aria-label="原文结束句">'+options+'</select></label><span>仅调整对应关系，不更改译文</span>';
  const sels=fields.querySelectorAll('select');sels[0].value=String(a);sels[1].value=String(b);
  function store(){
   const x=Number(sels[0].value),y=Math.max(x,Number(sels[1].value)),v=saved();
   v[alignKey]={start:x,end:y};try{localStorage.setItem(key,JSON.stringify(v));}catch{}
   if(body)body.textContent=units.slice(x,y+1).join('').trim();
   sels[1].value=String(y);summary.textContent='调整本句对应的原文范围 · 已人工校正';
  }
  sels[0].addEventListener('change',store);sels[1].addEventListener('change',store);
  details.append(summary,fields);el.after(details);
 }
 card.classList.add('tw-card');el.dataset.twDone='1';
}
const stage=document.querySelector('#stageContent');let pending=0;
if(stage){
 const observer=new MutationObserver(()=>{const el=stage.querySelector('.source-ref');if(el&&!el.dataset.twDone){clearTimeout(pending);pending=setTimeout(enhance,340);}});
 observer.observe(stage,{childList:true,subtree:true});setTimeout(enhance,360);
}

/* OCR preview: keep the original image legible while preserving selectable OCR data. */
(function installCleanOcrPreview(){
 const STYLE_ID='tw-ocr-clean-preview';
 const css=document.createElement('style');
 css.id=STYLE_ID;
 css.textContent=`
 .tw-ocr-clean .tw-ocr-detection-overlay{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
 .tw-ocr-clean .tw-ocr-detection-overlay *{pointer-events:none!important}
 .tw-ocr-preview-switch{margin-left:8px;padding:5px 10px;border:1px solid #bccddd;border-radius:7px;background:#fff;color:#355268;font:12px/1.4 inherit;cursor:pointer}
 .tw-ocr-preview-switch:focus-visible{outline:2px solid #2470d6;outline-offset:2px}
 `;
 document.head.append(css);
 const colorIsOverlay=(value)=>{
  const v=String(value||'').replace(/\s+/g,'').toLowerCase();
  if(!v||v==='transparent')return false;
  const m=v.match(/^rgba?\((\d+),(\d+),(\d+)/);
  if(!m)return /#(?:0[78]a|0[89]b|1[09ab]a)[0-9a-f]{3}/.test(v);
  const [r,g,b]=m.slice(1).map(Number);
  return g>85&&g>r*1.15&&b>r*1.05&&g<210;
 };
 function getPanel(){
  const headings=[...document.querySelectorAll('h1,h2,h3,h4,h5,.panel-title,.pane-title,strong')];
  const heading=headings.find(e=>e.textContent.trim()==='原页与位置');
  if(!heading)return null;
  let node=heading;
  for(let i=0;i<9&&node;i++,node=node.parentElement){
   if(node.querySelector('img,canvas')&&node.querySelectorAll('*').length>7)return {panel:node,heading};
  }
  return null;
 }
 function overlayCandidates(panel){
  const images=[...panel.querySelectorAll('img')].filter(e=>e.getBoundingClientRect().width>100);
  const canvases=[...panel.querySelectorAll('canvas')].filter(e=>e.getBoundingClientRect().width>100);
  const bases=images.length?images:canvases.slice(0,1);
  if(!bases.length)return [];
  const overlaps=(e)=>{const r=e.getBoundingClientRect();return r.width>2&&r.height>2&&bases.some(im=>{const t=im.getBoundingClientRect();return r.left<t.right&&r.right>t.left&&r.top<t.bottom&&r.bottom>t.top})};
  const results=[];
  for(const el of panel.querySelectorAll('*')){
   if(el.matches('img,button,input,select,textarea')||el.closest('.tw-ocr-preview-switch'))continue;
   if(el.contains(bases[0])||bases.includes(el))continue;
   if(!overlaps(el))continue;
   const cs=getComputedStyle(el);
   // Native SVG/canvas layers also carry draggable OCR table boundaries.
   // Hiding them breaks geometry editing, even when they resemble highlights.
   if(el.matches('svg,canvas')||el.querySelector('svg,canvas,button,input,[draggable]'))continue;
   const abs=cs.position==='absolute'||cs.position==='fixed';
   if(!abs)continue;
   const name=String(el.className&&typeof el.className==='string'?el.className:'').toLowerCase();
   const role=String(el.getAttribute('data-type')||'').toLowerCase();
   const marker=name+' '+role;
   const annotation=/ocr[-_ ]?(?:word|text|bbox|recognition|highlight)|recognition[-_ ]?(?:box|word)|(?:word|text)[-_ ]?box|detected[-_ ]?word/.test(marker);
   const geometry=/geometry|grid|boundary|divider|drag|handle|resize|table[-_ ]?line|column[-_ ]?line|row[-_ ]?line/.test(marker);
   // Only explicit OCR word annotations are cosmetic; never hide edit guides.
   if(annotation&&!geometry&&el.childElementCount===0)results.push(el);
  }
  // Suppress only recognition annotations, never the scanned page itself.
  return results.filter(el=>!results.some(parent=>parent!==el&&parent.contains(el)));
 }
 function attach(){
  const found=getPanel();if(!found)return;
  const {panel,heading}=found;
  if(!panel.dataset.twOcrPreview){
   panel.dataset.twOcrPreview='clean';
   panel.classList.add('tw-ocr-clean');
   const button=document.createElement('button');
   button.type='button';button.className='tw-ocr-preview-switch';
   button.textContent='显示识别框';
   button.setAttribute('aria-pressed','false');
   button.addEventListener('click',()=>{
    const clean=panel.classList.toggle('tw-ocr-clean');
    button.textContent=clean?'显示识别框':'隐藏识别框';
    button.setAttribute('aria-pressed',String(!clean));
   });
   heading.insertAdjacentElement('afterend',button);
  }
  for(const el of overlayCandidates(panel))el.classList.add('tw-ocr-detection-overlay');
 }
 let pending=false;
 const observer=new MutationObserver(()=>{
  if(pending)return;
  pending=true;
  requestAnimationFrame(()=>{pending=false;attach();});
 });
 observer.observe(document.body,{subtree:true,childList:true});
 attach();
})();


/* Apply the clean preview to the actual OCR engine iframe (#paramFrame).
   Its document is built from gzip srcdoc after the outer Atelier loads. */
(function installNestedOcrLayerFix(){
 const observed=new WeakSet();
 function bind(frame){
  if(!frame||observed.has(frame))return;
  observed.add(frame);
  function ready(){
   let doc;
   try{doc=frame.contentDocument;if(!doc?.body)return;}catch{return;}
   if(doc.getElementById('tw-ocr-native-clean'))return;
   const css=doc.createElement('style');
   css.id='tw-ocr-native-clean';
   css.textContent=`
    body.tw-ocr-native-clean .tw-ocr-annotation{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
    #tw-ocr-native-toggle{padding:6px 10px;border:1px solid #b9cadc;border-radius:6px;background:white;color:#244b6b;cursor:pointer;font-size:12px;line-height:1.4;margin:5px}
   `;
   doc.head.append(css);
   doc.body.classList.add('tw-ocr-native-clean');
   let enabled=true,scheduled=false;
   function refresh(){
    scheduled=false;
    const elements=[...doc.body.querySelectorAll('img,canvas')];
    const pictures=elements.filter(el=>{const r=el.getBoundingClientRect();return r.width>220&&r.height>150});
    const base=pictures.find(el=>el.tagName==='IMG')||pictures[0];
    if(!base)return;
    const rect=base.getBoundingClientRect();
    const intersects=(r)=>r.width>1&&r.height>1&&r.right>rect.left&&r.left<rect.right&&r.bottom>rect.top&&r.top<rect.bottom;
    const candidates=[];
    for(const el of doc.body.querySelectorAll('*')){
     if(el===base||el.contains(base)||el.closest('#tw-ocr-native-toggle')||el.closest('button'))continue;
     const tag=el.tagName.toLowerCase(),style=doc.defaultView.getComputedStyle(el),r=el.getBoundingClientRect();
     if(!intersects(r))continue;
     const name=String(typeof el.className==='string'?el.className:'').toLowerCase();
     const role=String(el.getAttribute('data-type')||'').toLowerCase();
     const marker=name+' '+role;
     const mark=/ocr[-_ ]?(?:word|text|bbox|recognition|highlight)|recognition[-_ ]?(?:box|word)|(?:word|text)[-_ ]?box|detected[-_ ]?word/.test(marker);
     const guide=/geometry|grid|boundary|divider|drag|handle|resize|table[-_ ]?line|column[-_ ]?line|row[-_ ]?line/.test(marker);
     const pos=style.position==='absolute'||style.position==='fixed';
     const vector=['svg','canvas','line','rect','polygon','polyline','path'].includes(tag);
     // Canvas, SVG and their children may contain Week8's interactive row/column handles.
     if(!vector&&!guide&&mark&&pos&&!el.querySelector('canvas,svg,button,input,[draggable]'))candidates.push(el);
    }
    for(const el of candidates.filter(el=>!candidates.some(p=>p!==el&&p.contains(el))))el.classList.add('tw-ocr-annotation');
   }
   const toggle=doc.createElement('button');
   toggle.id='tw-ocr-native-toggle';toggle.type='button';toggle.textContent='显示 OCR 识别框';
   toggle.addEventListener('click',()=>{enabled=!enabled;doc.body.classList.toggle('tw-ocr-native-clean',enabled);toggle.textContent=enabled?'显示 OCR 识别框':'隐藏 OCR 识别框';});
   const target=[...doc.querySelectorAll('h1,h2,h3,h4,strong')].find(el=>/原页与位置/.test(el.textContent||''));
   (target?.parentElement||doc.body).append(toggle);
   const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;doc.defaultView.requestAnimationFrame(refresh);}});
   observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});
   refresh();
  }
  frame.addEventListener('load',ready);
  ready();
 }
 function scan(){bind(document.getElementById('paramFrame'));}
 const mo=new MutationObserver(scan);
 mo.observe(document.body,{childList:true,subtree:true});
 scan();
})();


/* Parameter drafting: separate immutable OCR text from editable Chinese draft. */
(function installParameterDraftClarity(){
 const wired=new WeakSet();
 const cssText=String.raw`
 .tw-translation-source{font:12px/1.45 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#677789;margin:4px 0 7px}
 .tw-translation-source b{font-weight:650;color:#455a70}
 .tw-translation-status{display:inline-block;margin-left:7px;font-size:11px;padding:2px 6px;border-radius:6px;background:#fff1df;color:#94611c}
 .tw-translation-status.done{background:#e8f6ed;color:#24734b}
 .tw-translation-input{background:#fff!important}
 .tw-translation-input.tw-untranslated{border-color:#e8bd83!important;box-shadow:inset 3px 0 #eab56d!important}
 .tw-parameter-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0;padding:10px 12px;background:#f5f8fc;border:1px solid #dce6f1;border-radius:9px;font:12px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
 .tw-parameter-toolbar button{border:1px solid #b8cce5;border-radius:7px;background:#fff;color:#24588b;padding:7px 11px;cursor:pointer;font-weight:600}
 .tw-parameter-toolbar .tw-parameter-progress{color:#66768a}
 `;
 const glossary=[
 [/^measurement\s*range$/i,'测量范围'],
 [/^accuracy$/i,'精度'],
 [/^resolution$/i,'分辨率'],
 [/^repeatability$/i,'重复性'],
 [/^operating\s*temperature$/i,'工作温度'],
 [/^storage\s*temperature$/i,'储存温度'],
 [/^temperature\s*range$/i,'温度范围'],
 [/^humidity$/i,'湿度'],
 [/^relative\s*humidity$/i,'相对湿度'],
 [/^power\s*supply$/i,'电源'],
 [/^power\s*consumption$/i,'功耗'],
 [/^dimensions?$/i,'尺寸'],
 [/^weight$/i,'重量'],
 [/^response\s*time$/i,'响应时间'],
 [/^output$/i,'输出'],
 [/^input$/i,'输入'],
 [/^display$/i,'显示'],
 [/^model$/i,'型号'],
 [/^specifications?$/i,'技术参数'],
 [/^measurement\s*accuracy$/i,'测量精度'],
 [/^sensor\s*type$/i,'传感器类型']
 ];
 function normalized(s){return String(s||'').replace(/\s+/g,' ').trim();}
 function translateKnown(s){
  const v=normalized(s);
  if(!v)return '';
  for(const [re,zh] of glossary)if(re.test(v))return zh;
  // Numeric parameter cells are retained as numbers and units, with normalized interval spacing.
  if(/^[+\-−~～≈]?\s*[\d.]+\s*(?:to|至|[-–—~～])\s*[+\-−]?\s*[\d.]+\s*(?:°\s?[CF]|%|mm|cm|mA|A|V|W|Hz|kHz|kg|g)?$/i.test(v)){
   return v.replace(/(\d)\s*to\s*(?=[+\-−]?\s*\d)/gi,'$1 至 ').replace(/\s*°\s*([CF])/gi,' °$1').replace(/([+\-−])\s+(?=\d)/g,'$1');
  }
  if(/^[\s\d.+\-−~～≈()%°CFmAVWHzkKg/%]+$/.test(v))return v;
  return '';
 }
 function sourceFor(input){
  const cell=input.closest('td,th');
  if(!cell)return '';
  const candidates=[...cell.querySelectorAll('*')].filter(el=>el!==input&&!el.contains(input)&&!el.closest('.tw-translation-source')&&!el.closest('.tw-parameter-toolbar')&&!el.closest('textarea,input'));
  const strings=candidates.map(el=>normalized(el.textContent)).filter(Boolean);
  const shortest=strings.filter(s=>s.length<350).sort((a,b)=>a.length-b.length);
  return shortest[0]||'';
 }
 function attach(doc){
  if(!doc?.body)return;
  const all=[...doc.querySelectorAll('textarea')];
  const title=doc.body.innerText||'';
  if(!/参数逐格翻译|参数表格翻译|锁定表格初稿/.test(title))return;
  const inputs=all.filter(el=>el.closest('td,th'));
  if(inputs.length<2)return;
  let changed=false;
  for(const el of inputs){
   if(wired.has(el))continue;
   const source=sourceFor(el);
   if(!source)continue;
   wired.add(el);changed=true;
   const parent=el.parentElement;
   const label=doc.createElement('div');label.className='tw-translation-source';
   const sourceLabel=doc.createElement('b');sourceLabel.textContent='OCR 英文原文（只读）： ';
   const originalText=doc.createElement('span');originalText.textContent=source;
   label.append(sourceLabel,originalText);
   const caption=doc.createElement('div');caption.className='tw-translation-source';
   const captionTitle=doc.createElement('b');captionTitle.textContent='中文译文（可编辑）';
   const status=doc.createElement('span');status.className='tw-translation-status';
   caption.append(captionTitle,status);
   parent.insertBefore(label,el);parent.insertBefore(caption,el);
   el.classList.add('tw-translation-input');
   el.dataset.twOcrOriginal=source;
   el.setAttribute('aria-label','中文译文（可编辑），英文原文：'+source);
   el.placeholder='在这里输入中文译文';
   function update(){
    const value=normalized(el.value),untranslated=!value||value===normalized(source);
    status.textContent=untranslated?'待翻译':'已编辑 · 请校对';
    status.classList.toggle('done',!untranslated);
    el.classList.toggle('tw-untranslated',untranslated);
   }
   el.addEventListener('input',update);update();
  }
  if(!changed||doc.getElementById('tw-parameter-toolbar'))return;
  const style=doc.createElement('style');style.id='tw-parameter-clarity-style';style.textContent=cssText;doc.head.append(style);
  const toolbar=doc.createElement('div');toolbar.className='tw-parameter-toolbar';toolbar.id='tw-parameter-toolbar';
  const action=doc.createElement('button');action.type='button';action.textContent='批量生成术语与数值初稿';
  const progress=doc.createElement('span');progress.className='tw-parameter-progress';
  progress.textContent='原文保留只读；未匹配术语的单元格需人工翻译。';
  toolbar.append(action,progress);
  const table=inputs[0].closest('table');
  (table?.parentElement||inputs[0].parentElement).insertBefore(toolbar,table||inputs[0]);
  action.addEventListener('click',()=>{
   let done=0,pending=0;
   for(const el of doc.querySelectorAll('textarea.tw-translation-input')){
    const source=el.dataset.twOcrOriginal||'';
    if(normalized(el.value)&&normalized(el.value)!==normalized(source))continue; // never overwrite revisions
    const draft=translateKnown(source);
    if(draft){el.value=draft;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));done++;}
    else pending++;
   }
   progress.textContent='已生成 '+done+' 格初稿；'+pending+' 格未匹配，需人工翻译。请校对后再进入二稿。';
  });
 }
 function bind(doc){
  if(!doc?.body)return;
  attach(doc);
  if(doc.documentElement.dataset.twDraftObserver)return;
  doc.documentElement.dataset.twDraftObserver='1';
  let scheduled=false;
  new MutationObserver(()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;attach(doc);scan();},250);})
   .observe(doc.body,{childList:true,subtree:true});
 }
 function scan(){
  const docs=[document];
  for(const f of document.querySelectorAll('iframe')){
   try{if(f.contentDocument)docs.push(f.contentDocument);}catch{}
  }
  for(const doc of [...docs]){
   bind(doc);
   for(const f of doc.querySelectorAll('iframe')){
    try{if(f.contentDocument)bind(f.contentDocument);}catch{}
    if(!f.dataset.twDraftLoad){f.dataset.twDraftLoad='1';f.addEventListener('load',scan);}
   }
  }
 }
 scan();setInterval(scan,2500);
})();

})();