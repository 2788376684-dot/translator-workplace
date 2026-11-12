(()=>{
'use strict';
/* Project settings presentation enhancement. Never clones, removes or rebinds
   native inputs/actions; all project persistence remains owned by the editor. */
if(window.__thProjectSettingsLayout)return;
window.__thProjectSettingsLayout=true;
const D=document;
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
function locate(){
 const candidates=[...D.querySelectorAll('h1,h2,h3,strong,.modal-title,.dialog-title')];
 const title=candidates.find(el=>clean(el.textContent)==='项目设置'&&el.getClientRects().length);
 if(!title)return null;
 let root=title.parentElement;
 while(root&&root!==D.body){
  const text=clean(root.textContent);
  const fields=root.querySelectorAll('input,select,textarea');
  if(fields.length>=4&&text.includes('项目名称')&&text.includes('源语言')&&text.includes('目标语言')&&text.includes('术语表'))return {root,title};
  root=root.parentElement;
 }
 return null;
}
function enhance(){
 const target=locate();
 if(!target)return;
 const {root,title}=target;
 root.classList.add('th-project-settings');
 if(root.querySelector('#th-project-settings-intro'))return;
 const all=[...root.querySelectorAll('small,span,p,div')];
 // Suppress duplicate/static descriptions only. No form fields or actions are changed.
 const subtitle=all.find(x=>x.children.length===0&&clean(x.textContent)==='项目语言、文体、要求与术语');
 if(subtitle){subtitle.classList.add('th-project-redundant');subtitle.setAttribute('aria-hidden','true');}
 const note=all.find(x=>x.children.length===0&&clean(x.textContent)==='用于 AI 提示与本地质检');
 if(note){note.classList.add('th-project-redundant');note.setAttribute('aria-hidden','true');}
 const intro=D.createElement('p');
 intro.id='th-project-settings-intro';
 intro.className='th-project-settings-intro';
 intro.textContent='此处设置将用于 AI 翻译和审校。请按需填写译文风格、读者、语言要求和术语；留空则不增加额外要求。';
 const header=title.closest('.modal-header,.dialog-header,.modal-head,.pane-top,.settings-header')||title.parentElement;
 if(header&&header!==root&&root.contains(header)){
  header.insertAdjacentElement('afterend',intro);
 }else{
  const targetElement=title.parentElement&&title.parentElement!==root?title.parentElement:title;
  targetElement.insertAdjacentElement('afterend',intro);
 }
 const requirement=root.querySelector('textarea[placeholder*="风格"],textarea[placeholder*="忠实度"],textarea[placeholder*="读者"]');
 if(requirement){
  requirement.classList.add('th-project-requirements');
  requirement.setAttribute('rows','3');
  requirement.placeholder='例如：面向普通读者，表达自然准确；保留专有名词，不随意增删信息。';
 }
 const labels=[...root.querySelectorAll('label,strong,h3,h4')];
 for(const el of labels){
  const t=clean(el.textContent);
  if(t==='通用翻译要求'){
   el.classList.add('th-project-section-label');
   // Change only the visible label. Leave the native field and listeners intact.
   if(el.childNodes.length===1&&el.firstChild.nodeType===3)el.textContent='译文风格与要求';
   else for(const child of el.childNodes){
    if(child.nodeType===3&&clean(child.textContent)==='通用翻译要求')child.textContent='译文风格与要求';
   }
  }
  if(t==='术语表')el.classList.add('th-project-section-label');
 }
}
let pending=false;
const schedule=()=>{
 if(pending)return;
 pending=true;
 (window.requestAnimationFrame||window.setTimeout)(()=>{
  pending=false;
  try{enhance()}catch(e){console.warn('Project settings visual enhancement unavailable:',e)}
 },50);
};
const observer=new MutationObserver(schedule);
observer.observe(D.body,{subtree:true,childList:true});
window.addEventListener('pageshow',schedule);
schedule();
})();
