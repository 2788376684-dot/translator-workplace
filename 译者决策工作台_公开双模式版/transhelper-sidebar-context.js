(()=>{
'use strict';
/* Native header is split into workflow navigation and redundant context/status.
   Keep original event-bound controls and move only the AI mode badge to sidebar. */
if(window.__thSidebarContextReady)return;
window.__thSidebarContextReady=true;
const D=document,sidebar=D.querySelector('.sidebar');
if(!sidebar)return;
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const context=D.createElement('section');
context.id='th-sidebar-context';
context.setAttribute('aria-label','当前位置与 AI 状态');
const label=D.createElement('span');
label.className='th-sidebar-context-label';label.textContent='当前位置';
const project=D.createElement('strong');
project.className='th-sidebar-project';
const phase=D.createElement('span');
phase.className='th-sidebar-phase';
const aiSlot=D.createElement('div');
aiSlot.id='th-sidebar-ai-status';
aiSlot.setAttribute('aria-label','当前 AI 状态');
context.append(label,project,phase,aiSlot);
function placeContext(){
 const logo=sidebar.querySelector('.logo');
 if(!logo)return;
 let anchor=logo;
 while(anchor.parentElement&&anchor.parentElement!==sidebar)anchor=anchor.parentElement;
 if(context.parentElement!==sidebar||context.previousElementSibling!==anchor)
  anchor.insertAdjacentElement('afterend',context);
}
function moveNativeStatus(){
 // modeTop is the real mode indicator, updated in-place by the native draw().
 const native=D.getElementById('modeTop');
 if(native&&native.parentElement!==aiSlot){
  aiSlot.append(native);
  native.style.setProperty('position','static','important');
  native.style.setProperty('inset','auto','important');
  native.style.setProperty('transform','none','important');
 }
 // Some older runs injected a second default AI indicator; hide only that duplicate.
 const legacy=D.getElementById('th-default-ai-slot');
 if(legacy&&legacy!==aiSlot)legacy.hidden=true;
 // Preserve the native OCR button even though the old top-right container is removed.
 const ocr=D.getElementById('quickOCR');
 const tools=D.getElementById('th-sidebar-tools');
 if(ocr&&tools&&ocr.parentElement!==tools)tools.append(ocr);
}
function sync(){
 placeContext();
 const projectSelect=D.getElementById('projectSelect');
 const projectName=norm(projectSelect?.selectedOptions?.[0]?.textContent)||
  norm(D.getElementById('crumbProject')?.textContent);
 if(projectName&&project.textContent!==projectName)project.textContent=projectName;
 const step=D.querySelector('#th-top-flow [data-step].active,#th-top-flow [data-step][aria-current="step"]');
 const stageNames={source:'原文',draft:'初稿',revision:'二稿',final:'终稿'};
 const stage=stageNames[step?.getAttribute('data-step')]||
  norm(D.getElementById('crumbStep')?.textContent);
 if(stage&&phase.textContent!==stage)phase.textContent=stage;
 moveNativeStatus();
 // CSS removes the two original topbar containers as whole layout units.
 if(D.getElementById('th-top-flow'))D.body.classList.add('th-sidebar-context-integrated');
}
let scheduled=false;
function schedule(){
 if(scheduled)return;
 scheduled=true;
 (window.requestAnimationFrame||window.setTimeout)(()=>{
  scheduled=false;
  try{sync()}catch(e){console.warn('Sidebar context skipped:',e)}
 },40);
}
new MutationObserver(schedule).observe(D.body,{childList:true,subtree:true,characterData:true});
schedule();
})();