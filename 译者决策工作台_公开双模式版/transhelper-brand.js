(()=>{
'use strict';
/* Presentation-only branding: never touch project data, editor fields or workflow controls. */
if(window.__transhelperBrandReady)return;
window.__transhelperBrandReady=true;
document.title='Transhelper · Professional Translation Workspace';
const legacy=/translator\s*workplace|translator_workplace|译者决策工作台/gi;
function replaceBrandText(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 for(const node of nodes){
  if(!node.parentElement||node.parentElement.closest('input,textarea,select,[contenteditable="true"]'))continue;
  if(legacy.test(node.nodeValue||''))node.nodeValue=node.nodeValue.replace(legacy,'Transhelper');
  legacy.lastIndex=0;
 }
}
function apply(){
 const logo=document.querySelector('.logo');
 if(logo){
  replaceBrandText(logo);
  // Some legacy shells use only a symbolic logo or a Chinese title.
  // Ensure the new product name is visible without rewriting controls.
  if(!(logo.textContent||'').includes('Transhelper')){
   const title=document.createElement('span');
   title.className='th-brand-wordmark';title.textContent='Transhelper';
   logo.appendChild(title);
  }
  if(!logo.querySelector('.th-brand-mark')){
   const mark=document.createElement('span');
   mark.className='th-brand-mark';mark.textContent='T';mark.setAttribute('aria-hidden','true');
   logo.insertBefore(mark,logo.firstChild);
  }
 }
 const branding=document.querySelectorAll('.brand,.brand-name,.app-title,.product-name');
 for(const item of branding){
  if(item.closest('#stageContent,.segment-list,.workgrid,.pane,textarea,[contenteditable]'))continue;
  replaceBrandText(item);
 }
}
apply();
const observer=new MutationObserver(()=>apply());
const sidebar=document.querySelector('.sidebar');
if(sidebar)observer.observe(sidebar,{childList:true,subtree:true});
window.addEventListener('pageshow',apply);
})();
