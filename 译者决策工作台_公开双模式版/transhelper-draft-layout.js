(()=>{
'use strict';
/* Presentation only. Keep native textarea values, event handlers and workflow intact. */
if(window.__thDraftPromptLayoutReady)return;
window.__thDraftPromptLayoutReady=true;
const D=document;
const stage=D.getElementById('stageContent');
if(!stage)return;
let queued=false;
function nearestPrompt(textarea){
 const pane=textarea.closest('.pane,.panel,.card,.stage-panel')||textarea.parentElement?.parentElement;
 if(!pane||!stage.contains(pane))return false;
 // Identify the generation prompt by its own label and reset control.
 // Do not resize translation drafts, notes, OCR or other textareas.
 const container=textarea.parentElement;
 const context=(container?.parentElement?.textContent||'').slice(0,900);
 const top=(pane.textContent||'').slice(0,1200);
 return /Prompt/i.test(top) && /恢复默认/.test(top) && /生成设置/.test(top) &&
  (/Prompt/i.test(context) || pane.querySelector('textarea')===textarea);
}
function apply(){
 queued=false;
 const active=Array.from(stage.querySelectorAll('textarea')).filter(nearestPrompt);
 for(const textarea of active){
  textarea.classList.add('th-generation-prompt');
  textarea.setAttribute('aria-label',textarea.getAttribute('aria-label')||'初稿生成 Prompt');
  let parent=textarea.parentElement;
  const pane=textarea.closest('.pane,.panel,.card,.stage-panel');
  // Remove fixed-width wrappers only inside this prompt field, never the whole card.
  for(let depth=0;parent&&parent!==pane&&depth<3;depth++,parent=parent.parentElement){
   parent.classList.add('th-generation-prompt-wrap');
  }
 }
}
function schedule(){
 if(queued)return;
 queued=true;
 (window.requestAnimationFrame||window.setTimeout)(apply,0);
}
const observer=new MutationObserver(schedule);
observer.observe(stage,{subtree:true,childList:true});
schedule();
})();
