(()=>{
'use strict';
/* Provider label consistency. Display-only patch; does not access model or API settings. */
if(window.__thDefaultProviderLabelReady)return;
window.__thDefaultProviderLabelReady=true;
const D=document;
const replaceText=node=>{
 if(!node||node.nodeType!==3||!node.nodeValue?.includes('Agnes'))return;
 const old=node.nodeValue;
 const next=old.replace(/Agnes/g,'DeepSeek');
 if(next!==old)node.nodeValue=next;
};
function positionDefaultAI(){
 const main=D.querySelector('main.main')||D.querySelector('.main');
 if(!main)return;
 // Place the existing model indicator in a dedicated, left-aligned inline row.
 // Preserve the original element and its content; never duplicate the status.
 let slot=D.getElementById('th-default-ai-slot');
 const candidates=[...main.querySelectorAll('span,small,label,button')];
 const badge=candidates.find(el=>/^默认\\s*AI$/i.test((el.textContent||'').trim()) && el.id!=='th-default-ai-slot');
 if(!badge)return;
 if(!slot){
  slot=D.createElement('div');
  slot.id='th-default-ai-slot';
  slot.setAttribute('aria-label','当前默认 AI');
  main.insertBefore(slot,main.firstChild);
 }
 if(badge.parentElement!==slot)slot.appendChild(badge);
 badge.style.setProperty('position','static','important');
 badge.style.setProperty('inset','auto','important');
 badge.style.setProperty('transform','none','important');
 badge.style.setProperty('margin','0','important');
}
function update(){
 try{positionDefaultAI()}catch(e){console.warn('AI indicator reposition unavailable:',e)}
 // Limit text changes to the existing AI settings modal, leaving projects,
 // translations, credentials and user content untouched.
 for(const dialog of D.querySelectorAll('dialog,[role="dialog"],.modal,.dialog')){
  const headings=dialog.querySelectorAll('h1,h2,h3,strong,.modal-title');
  if(![...headings].some(el=>el.textContent.trim()==='AI 设置'))continue;
  const walker=D.createTreeWalker(dialog,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
   if(node.parentElement?.closest('input,textarea,option,[contenteditable="true"]'))continue;
   replaceText(node);
  }
 }
}
let queued=false;
function schedule(){
 if(queued)return;queued=true;
 (window.requestAnimationFrame||window.setTimeout)(()=>{queued=false;update()},40);
}
new MutationObserver(schedule).observe(D.body,{subtree:true,childList:true,characterData:true});
schedule();
})();
