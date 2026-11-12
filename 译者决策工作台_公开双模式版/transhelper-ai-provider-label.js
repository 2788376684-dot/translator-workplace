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
function update(){
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
