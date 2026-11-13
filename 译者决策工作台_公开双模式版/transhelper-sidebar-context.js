(()=>{
'use strict';
/* Presentational relocation of context and AI status. Native actions stay in place. */
if(window.__thSidebarContextReady)return;
window.__thSidebarContextReady=true;
const D=document;
const sidebar=D.querySelector('.sidebar');
if(!sidebar)return;
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const context=D.createElement('section');
context.id='th-sidebar-context';
context.setAttribute('aria-label','当前位置与 AI 状态');
const label=D.createElement('span');label.className='th-sidebar-context-label';label.textContent='当前位置';
const project=D.createElement('strong');project.className='th-sidebar-project';
const phase=D.createElement('span');phase.className='th-sidebar-phase';
const aiSlot=D.createElement('div');aiSlot.id='th-sidebar-ai-status';aiSlot.setAttribute('aria-label','当前 AI 状态');
context.append(label,project,phase,aiSlot);
function positionContext(){
 // Always position BELOW the native brand, never at sidebar.firstChild.
 const logo=sidebar.querySelector('.logo,.th-brand-shell');
 if(!logo)return;
 let anchor=logo;
 while(anchor.parentElement&&anchor.parentElement!==sidebar)anchor=anchor.parentElement;
 if(context.parentElement!==sidebar||context.previousElementSibling!==anchor)
  anchor.insertAdjacentElement('afterend',context);
}
function relocateAI(){
 const slot=D.getElementById('th-default-ai-slot');
 if(slot&&slot.childElementCount){
  if(slot.parentElement!==aiSlot)aiSlot.append(slot);
  return true;
 }
 const main=D.querySelector('.main');
 if(!main)return false;
 // The badge can be a native element outside the enhancement slot.
 const badge=[...main.querySelectorAll('span,small,label,div')].find(el=>
  el.children.length===0&&
  /^(默认\s*AI|当前\s*AI|AI\s*未配置)$/i.test(norm(el.textContent)));
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
 const main=D.querySelector('.main');
 if(!caption||!title||!main)return;
 D.body.classList.add('th-sidebar-context-integrated');
 // The heading and badge are rendered in a redundant context row. Find its
 // smallest full-width ancestor; never hide an ancestor of active controls.
 let el=caption.parentElement, candidate=null;
 for(let depth=0;el&&depth<7&&el!==main;depth++,el=el.parentElement){
  const rect=el.getBoundingClientRect?.();
  const mainRect=main.getBoundingClientRect?.();
  if(!rect||!mainRect||rect.width<mainRect.width*.67||rect.height>105)continue;
  if(el.querySelector('button,a[href],input,textarea,select,[role="button"]'))continue;
  // This row may contain both breadcrumb and completion progress.
  candidate=el;break;
 }
 if(candidate){
  candidate.classList.add('th-redundant-stage-context');
 }else{
  // Hide only the text wrapper as a fallback; do not touch action rows.
  const inner=caption.parentElement;
  if(inner&&!inner.querySelector('button,a[href],input,textarea,select,[role="button"]'))
   inner.classList.add('th-redundant-stage-context-text');
 }
}
let pending=false;
function sync(){
 pending=false;
 positionContext();
 const caption=D.getElementById('stageCaption');
 const active=D.querySelector('#th-top-flow [data-step].active, #th-top-flow [data-step][aria-current="step"]');
 const select=D.getElementById('projectSelect');
 const name=norm(select?.selectedOptions?.[0]?.textContent)||norm(caption?.textContent);
 if(name&&project.textContent!==name)project.textContent=name;
 const steps={source:'原文',draft:'初稿',revision:'二稿',final:'终稿'};
 const step=active?.getAttribute('data-step');
 const stage=steps[step]||norm(D.getElementById('stageTitle')?.textContent);
 if(stage&&phase.textContent!==stage)phase.textContent=stage;
 relocateAI();
 collapseContextStrip();
}
function schedule(){
 if(pending)return;
 pending=true;
 (window.requestAnimationFrame||window.setTimeout)(sync,40);
}
new MutationObserver(schedule).observe(D.body,{childList:true,subtree:true,characterData:true});
schedule();
})();