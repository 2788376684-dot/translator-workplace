(()=>{
'use strict';
/* Move redundant stage context into the existing left rail.
   Native workflow controls, draft locking and project state stay in place. */
if(window.__thSidebarContextReady)return;
window.__thSidebarContextReady=true;
const D=document;
const sidebar=D.querySelector('.sidebar');
if(!sidebar)return;
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const context=D.createElement('section');
context.id='th-sidebar-context';
context.setAttribute('aria-label','当前项目与阶段');
const label=D.createElement('span');label.className='th-sidebar-context-label';label.textContent='当前位置';
const project=D.createElement('strong');project.className='th-sidebar-project';
const phase=D.createElement('span');phase.className='th-sidebar-phase';
context.append(label,project,phase);
const tools=D.getElementById('th-sidebar-tools');
if(tools)tools.parentNode.insertBefore(context,tools);
else sidebar.insertBefore(context,sidebar.firstChild);
let scheduled=false;
function sync(){
 scheduled=false;
 const caption=D.getElementById('stageCaption');
 const title=D.getElementById('stageTitle');
 const step=D.querySelector('#th-top-flow .nav-step.active, #th-top-flow .nav-step[aria-current="step"]');
 const name=norm(caption?.textContent)||'当前项目';
 const stage=norm(title?.textContent)||norm(step?.textContent).replace(/^\d+\s*/,'');
 if(name!==project.textContent)project.textContent=name;
 if(stage!==phase.textContent)phase.textContent=stage;
 // Only hide the original labels after the rail has been populated.
 if(name&&stage){
  D.body.classList.add('th-sidebar-context-integrated');
 }
 const ai=D.getElementById('th-default-ai-slot');
 if(ai&&ai.parentElement!==context)context.append(ai);
 const main=D.querySelector('.main');
 if(main){
  const progress=Array.from(main.querySelectorAll('span,small,div')).find(el=>
   el.children.length===0 && /^\d+\s*\/\s*\d+\s*段完成$/.test(norm(el.textContent)));
  if(progress&&progress.parentElement!==context){
   progress.classList.add('th-sidebar-progress');
   context.append(progress);
  }
 }
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
