(()=>{
'use strict';
/* Collapse native duplicate topbar row. Keep its live status and actions. */
if(window.__thSidebarContextReady)return;
window.__thSidebarContextReady=true;
const D=document;
let scheduled=false;
function place(){
 scheduled=false;
 const sidebar=D.querySelector('.sidebar');
 const bar=D.querySelector('.topbar');
 if(!sidebar||!bar||!D.getElementById('th-top-flow'))return;
 // Remove the extra context card added by the previous enhancement.
 D.getElementById('th-sidebar-context')?.remove();
 const tools=D.getElementById('th-sidebar-tools');
 const projectControl=sidebar.querySelector('.project-control');
 const mode=D.getElementById('modeTop');
 if(projectControl&&mode){
  let heading=D.getElementById('th-ai-state-heading');
  let statusRow=D.getElementById('th-ai-state-row');
  if(!heading){
   heading=D.createElement('div');
   heading.id='th-ai-state-heading';
   heading.className='side-label';
   heading.textContent='当前AI状态';
  }
  if(!statusRow){
   statusRow=D.createElement('div');
   statusRow.id='th-ai-state-row';
   statusRow.setAttribute('role','group');
   statusRow.setAttribute('aria-labelledby','th-ai-state-heading');
  }
  if(heading.previousElementSibling!==projectControl)
   projectControl.insertAdjacentElement('afterend',heading);
  if(statusRow.previousElementSibling!==heading)
   heading.insertAdjacentElement('afterend',statusRow);
  if(mode.parentElement!==statusRow){
   mode.classList.add('th-sidebar-mode');
   statusRow.append(mode);
  }
 }
 // Preserve native OCR entry when its mode makes it visible.
 const ocr=D.getElementById('quickOCR');
 if(ocr&&tools&&ocr.parentElement!==tools){
  ocr.classList.add('th-sidebar-tool');
  tools.append(ocr);
 }
 // Native app code still updates these IDs, although their visual row is hidden.
 D.body.classList.add('th-native-header-compact');
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 (window.requestAnimationFrame||window.setTimeout)(place,40);
}
const observer=new MutationObserver(schedule);
observer.observe(D.body,{childList:true,subtree:true});
schedule();
})();