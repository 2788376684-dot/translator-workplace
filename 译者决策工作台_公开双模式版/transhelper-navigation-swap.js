(()=>{
'use strict';
/* Responsive navigation rearrangement. Move existing nodes, never clone them:
   native click handlers, IDs, state classes, accessibility and project persistence
   remain owned by the original Transhelper editor. */
if(window.__thNavigationSwapReady)return;
window.__thNavigationSwapReady=true;
const D=document;
const stages=['source','draft','revision','final'];
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
let mounted=false,attempts=0;
function findTools(top){
 const all=[...top.querySelectorAll('button,[role="button"],a.btn')];
 const project=all.find(x=>norm(x.textContent).includes('项目设置'));
 const ai=D.getElementById('openAISettings')||all.find(x=>/^AI\s*设置$/i.test(norm(x.textContent)));
 const imported=all.find(x=>norm(x.textContent).includes('导入项目'));
 if(!project||!ai||!imported||![project,ai,imported].every(x=>top.contains(x)))return null;
 if(new Set([project,ai,imported]).size!==3)return null;
 return [project,ai,imported];
}
function mount(){
 if(mounted)return true;
 const top=D.querySelector('.topbar'),sidebar=D.querySelector('.sidebar');
 if(!top||!sidebar)return false;
 const buttons=stages.map(step=>sidebar.querySelector('[data-step="'+step+'"]'));
 if(buttons.some(b=>!b)||new Set(buttons).size!==4)return false;
 // Only move genuine native workflow buttons: no synthetic navigation or handlers.
 if(buttons.some(b=>!b.matches('button,[role="button"]')))return false;
 const tools=findTools(top);
 if(!tools)return false;
 const workflowHome=buttons[0].parentElement;
 if(!workflowHome||buttons.some(b=>b.parentElement!==workflowHome))return false;
 const toolsBox=D.createElement('div');
 toolsBox.id='th-sidebar-tools';
 toolsBox.className='th-sidebar-tools';
 toolsBox.setAttribute('role','group');
 toolsBox.setAttribute('aria-label','项目管理');
 const flowBox=D.createElement('nav');
 flowBox.id='th-top-flow';
 flowBox.className='th-top-flow';
 flowBox.setAttribute('aria-label','翻译工作流程');
 const label=D.createElement('span');
 label.className='th-top-flow-caption';
 label.textContent='翻译流程';
 flowBox.append(label);
 const anchors=[...buttons,...tools].map(x=>({node:x,parent:x.parentNode,next:x.nextSibling}));
 try{
  // Reuse the original sidebar workflow container for the project tool actions.
  workflowHome.append(toolsBox);
  for(const tool of tools){
   tool.classList.add('th-sidebar-tool');
   tool.classList.remove('th-settings-trigger');
   // Older visual enhancement imposed fixed widths on topbar buttons.
   // Clear presentation-only inline properties before sidebar placement.
   for(const property of ['width','min-width','max-width','flex','height','min-height','max-height','padding','display','justify-content','align-items','gap','font-size','white-space','box-sizing']){
    if(tool.hasAttribute('data-th-equal-settings'))tool.style.removeProperty(property);
   }
   toolsBox.append(tool);
  }
  for(const button of buttons)flowBox.append(button);
  // Place workflow on its own row; original context and cloud controls stay below.
  top.prepend(flowBox);
  const sectionLabel=[...sidebar.querySelectorAll('.workflow-label')].find(x=>norm(x.textContent)==='工作流程');
  if(sectionLabel)sectionLabel.textContent='项目管理';
  D.body.classList.add('th-navigation-swapped');
  mounted=true;
  return true;
 }catch(error){
  console.warn('Navigation layout restored after an error:',error);
  for(const a of anchors){
   if(a.next&&a.next.parentNode===a.parent)a.parent.insertBefore(a.node,a.next);
   else a.parent.append(a.node);
  }
  flowBox.remove();toolsBox.remove();
  return false;
 }
}
function schedule(){
 if(mounted||attempts++>16)return;
 if(!mount())window.setTimeout(schedule,250);
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',schedule,{once:true});
else schedule();
window.addEventListener('pageshow',()=>{if(!mounted)schedule()});
})();
