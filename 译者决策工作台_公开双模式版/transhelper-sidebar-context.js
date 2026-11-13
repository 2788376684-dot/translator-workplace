(()=>{
'use strict';
/* Keep project and phase in the left rail; eliminate the redundant context strip.
   Original stage actions, handlers and persisted data are untouched. */
if(window.__thSidebarContextReady)return;
window.__thSidebarContextReady=true;
const D=document;
const sidebar=D.querySelector('.sidebar');
if(!sidebar)return;
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const context=D.createElement('section');
context.id='th-sidebar-context';
context.setAttribute('aria-label','当前项目与阶段');
const label=D.createElement('span');
label.className='th-sidebar-context-label';
label.textContent='当前位置';
const project=D.createElement('strong');
project.className='th-sidebar-project';
const phase=D.createElement('span');
phase.className='th-sidebar-phase';
const aiSlot=D.createElement('div');
aiSlot.id='th-sidebar-ai-status';
aiSlot.setAttribute('aria-label','当前 AI 状态');
context.append(label,project,phase,aiSlot);
const tools=D.getElementById('th-sidebar-tools');
if(tools)tools.parentNode.insertBefore(context,tools);
else sidebar.insertBefore(context,sidebar.firstChild);
function relocateAI(){
 const existing=D.getElementById('th-default-ai-slot');
 if(existing&&existing!==aiSlot&&existing.childElementCount>0){
  if(existing.parentElement!==aiSlot)aiSlot.append(existing);
  return true;
 }
 // Some stages render this badge in the breadcrumb strip, without the
 // enhancement-created slot. Preserve the native status node where possible.
 const root=D.querySelector('.main');
 if(!root)return false;
 const candidates=[...root.querySelectorAll('span,small,label,div')];
 const badge=candidates.find(el=>
  el.children.length===0 &&
  /^(?:默认\s*AI|当前\s*AI|AI\s*未配置|DeepSeek|OpenAI)$/i.test(norm(el.textContent)) &&
  !el.closest('#th-sidebar-context'));
 if(!badge)return false;
 if(badge.parentElement!==aiSlot)aiSlot.append(badge);
 badge.style.setProperty('position','static','important');
 badge.style.setProperty('inset','auto','important');
 badge.style.setProperty('transform','none','important');
 return true;
}
function collapseContextStrip(){
 const caption=D.getElementById('stageCaption');
 const title=D.getElementById('stageTitle');
 if(!caption||!title)return;
 let row=caption.parentElement;
 // Select the smallest enclosing block holding both breadcrumb labels.
 for(let i=0;row&&i<5&&!row.contains(title);i++)row=row.parentElement;
 if(!row||row===D.body||row.classList.contains('main'))return;
 // A control-bearing ancestor must never be collapsed: stage navigation
 // and lock/confirm buttons must remain clickable.
 if(row.querySelector('button,a[href],input,textarea,select,[role="button"]'))return;
 row.classList.add('th-redundant-stage-context');
}
let scheduled=false;
function sync(){
 scheduled=false;
 const caption=D.getElementById('stageCaption');
 const title=D.getElementById('stageTitle');
 const step=D.querySelector('#th-top-flow .nav-step.active, #th-top-flow .nav-step[aria-current="step"]');
 const name=norm(caption?.textContent)||'当前项目';
 const stage=norm(title?.textContent)||norm(step?.textContent).replace(/^\d+\s*/,'');
 if(name&&project.textContent!==name)project.textContent=name;
 if(stage&&phase.textContent!==stage)phase.textContent=stage;
 relocateAI();
 collapseContextStrip();
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 (window.requestAnimationFrame||window.setTimeout)(sync,40);
}
const observer=new MutationObserver(schedule);
observer.observe(D.body,{childList:true,subtree:true,characterData:true});
schedule();
})();