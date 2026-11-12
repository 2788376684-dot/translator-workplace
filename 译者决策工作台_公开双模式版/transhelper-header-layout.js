(()=>{
'use strict';
/* Layout-only bridge: mirrors account and backup status into native topbar.
   No data writes, translations, button rebindings or OCR DOM changes. */
if(window.__thHeaderLayoutReady)return;
window.__thHeaderLayoutReady=true;
const doc=document;
let parentDoc=null;
try{if(window.parent!==window&&window.parent.location.origin===window.location.origin)parentDoc=window.parent.document;}catch(e){}
if(!parentDoc)return;
const originalLink=parentDoc.getElementById('account-entry');
if(!originalLink)return;
const group=doc.createElement('div');
group.id='th-global-cloud';
group.className='th-global-cloud';
group.setAttribute('aria-label','账户与云端状态');
const link=doc.createElement('a');
link.id='th-global-cloud-link';
link.className='th-global-cloud-link';
link.href='/account.html';
link.target='_top';
link.textContent='账户 · 云端';
link.setAttribute('aria-label','打开账户与云端管理');
const state=doc.createElement('span');
state.id='th-global-cloud-status';
state.className='th-global-cloud-status';
state.setAttribute('role','status');
state.setAttribute('aria-live','polite');
state.hidden=true;
group.append(link,state);
function sync(){
 const source=parentDoc.getElementById('tw-cloud-status');
 const text=source?.textContent?.trim()||'';
 const visible=!!text&&source?.style.display!=='none';
 state.hidden=!visible;
 if(!visible)return;
 if(state.textContent!==text)state.textContent=text;
 state.dataset.kind=/失败|暂停|冲突|错误|未登录/.test(text)?'error':/正在|备份中/.test(text)?'busy':/已备份|成功/.test(text)?'saved':'neutral';
}
function place(){
 const header=doc.querySelector('.topbar');
 if(!header){
  parentDoc.body.classList.remove('th-header-integrated');
  return;
 }
 if(group.parentElement!==header)header.append(group);
 parentDoc.body.classList.add('th-header-integrated');
 sync();
}
let scheduled=false;
function schedule(){
 if(scheduled)return;
 scheduled=true;
 (window.requestAnimationFrame||window.setTimeout)(()=>{
  scheduled=false;
  try{place()}catch(e){console.warn('Header visual refinement skipped:',e)}
 },40);
}
const observer=new MutationObserver(schedule);
if(doc.body)observer.observe(doc.body,{childList:true,subtree:true});
const statusObserver=new MutationObserver(sync);
const existingStatus=parentDoc.getElementById('tw-cloud-status');
if(existingStatus)statusObserver.observe(existingStatus,{attributes:true,attributeFilter:['style'],childList:true,characterData:true,subtree:true});
window.setInterval(()=>{
 place();
 const status=parentDoc.getElementById('tw-cloud-status');
 if(status&&!statusObserver.__thObserved){
  statusObserver.observe(status,{attributes:true,attributeFilter:['style'],childList:true,characterData:true,subtree:true});
  statusObserver.__thObserved=true;
 }
},4000);
window.addEventListener('pageshow',place);
place();
})();
