(()=>{'use strict';
const css=[
'@media(min-width:651px){.app:not(.parameter-view){grid-template-columns:166px minmax(0,1fr)!important}.sidebar{padding:15px 8px 10px!important}.logo{padding:1px 5px 20px!important}.workflow-label{margin-top:20px!important}.nav-step{padding:10px 8px!important;gap:6px}.topbar{height:56px!important;padding:0 18px!important}.main{padding:13px 17px 25px!important;max-width:none!important}.app:not(.parameter-view) .workgrid{grid-template-columns:minmax(0,1fr)!important;gap:9px!important}.app:not(.parameter-view) .segments{display:flex!important;align-items:center;gap:8px;padding:5px 9px;min-height:46px;overflow:visible}.app:not(.parameter-view) .segments-head{height:auto;min-width:74px;border:0;padding:0 4px;gap:7px}.app:not(.parameter-view) .segments-head .icon-btn{width:25px;height:25px}.app:not(.parameter-view) .segment-list{display:flex;align-items:center;flex:1;min-height:0;max-height:74px;overflow:auto;padding:0;gap:5px}.app:not(.parameter-view) .segment-item{flex:0 0 auto;width:156px;max-width:180px;margin:0;padding:6px 9px}.app:not(.parameter-view) .segment-item strong{margin-bottom:2px}.app:not(.parameter-view) .segment-item small{-webkit-line-clamp:1}.app:not(.parameter-view) .segment-foot{border:0;padding:0 3px;gap:5px}.app:not(.parameter-view) .segment-foot #segmentCount{display:none}.app:not(.parameter-view) .segment-foot .text-btn{font-size:10px}}',
'#stageContent:has(.tw-card) .summary-panel{padding:10px 14px}#stageContent:has(.tw-card) .pane-content{padding:16px 20px!important}#stageContent:has(.tw-card) .pane:has(.source-ref){max-width:1100px;margin:auto}.tw-card .source-ref{background:#f7f9fc;border:1px solid #e3eaf2;border-radius:10px;padding:13px 16px;margin:0 0 8px;color:#293443}.tw-card .source-ref strong{font-size:11px;color:#627184;margin:0 0 7px}.tw-card .source-ref div{max-height:none;overflow:visible;font-size:16px;line-height:1.85}.tw-card .readbox{font-size:18px!important;line-height:1.72!important;max-height:none!important;min-height:0!important;overflow:visible!important;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px 0!important}.tw-card .tw-diff{background:#fbfcfe;border:1px solid #dce5f0;border-radius:10px;padding:12px 15px!important}.tw-card .tw-diff ins,.tw-card .tw-diff del{border-radius:3px;padding:1px 2px}.tw-card .tw-diff ins{background:#ccefdc;color:#125e39;text-decoration:none}.tw-card .tw-diff del{background:#ffebe8;color:#9f3b35;text-decoration:line-through}.tw-card .tw-align{margin:0 0 14px;color:#697584;font-size:11px}.tw-card .tw-align summary{cursor:pointer;width:fit-content}.tw-card .tw-fields{display:flex;gap:9px;flex-wrap:wrap;align-items:center;padding:9px 0}.tw-card .tw-fields select{font-size:12px;max-width:230px;padding:5px;background:#fff;border:1px solid #dae0e8;border-radius:6px}.tw-card .pane-content>.review-options:has([data-sentence-action]) .btn{font-size:13px;padding:9px 12px}@media(max-width:650px){.tw-card .readbox{font-size:16px!important}.tw-card .source-ref div{font-size:15px}#stageContent:has(.tw-card) .pane-content{padding:12px!important}}'
].join('\n');
const st=document.createElement('style');st.id='tw-review-enhancements';st.textContent=css;document.head.append(st);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function diff(a,b){
 const tk=t=>String(t).match(/\s+|[\p{L}\p{N}]+|[^\p{L}\p{N}\s]/gu)||[];
 const x=tk(a),y=tk(b),n=x.length,m=y.length;
 if(n*m>85000)return '<del>'+esc(a)+'</del><ins>'+esc(b)+'</ins>';
 const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=x[i]===y[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0,out='',buf='',type='';
 function flush(){if(!buf)return;out+=type==='add'?'<ins>'+esc(buf)+'</ins>':type==='del'?'<del>'+esc(buf)+'</del>':esc(buf);buf='';}
 function add(t,v){if(type!==t){flush();type=t;}buf+=v;}
 while(i<n||j<m){if(i<n&&j<m&&x[i]===y[j]){add('eq',x[i]);i++;j++;}else if(j<m&&(i===n||dp[i][j+1]>dp[i+1][j]))add('add',y[j++]);else add('del',x[i++]);}
 flush();return out;
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
 if(!card||!pane||!p||!s||!s.reviewDecisions?.length)return;
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
 const boxes=pane.querySelectorAll('.readbox');
 if(boxes.length>=2){const original=boxes[0].textContent.trim(),suggested=boxes[1].textContent.trim();boxes[1].classList.add('tw-diff');if(original!==suggested)boxes[1].innerHTML=diff(original,suggested);}
 card.classList.add('tw-card');el.dataset.twDone='1';
}
const stage=document.querySelector('#stageContent');let pending=0;
if(stage){
 const observer=new MutationObserver(()=>{const el=stage.querySelector('.source-ref');if(el&&!el.dataset.twDone){clearTimeout(pending);pending=setTimeout(enhance,340);}});
 observer.observe(stage,{childList:true,subtree:true});setTimeout(enhance,360);
}
})();