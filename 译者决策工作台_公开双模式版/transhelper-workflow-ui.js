(()=>{
'use strict';
/* Presentation and navigation layer. The core engine remains the sole owner of
   sentence choices, export state, settings and persistence. */
if(window.__thWorkflowUiInstalled)return;
window.__thWorkflowUiInstalled=true;
const doc=document, stage=doc.getElementById('stageContent');
if(!stage)return;
let scheduled=false;
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
function reviewNavigation(){
 const jumps=stage.querySelectorAll('[data-sentence-jump]');
 if(!jumps.length)return;
 const first=jumps[0];
 // The navigation exists in its own pane in the original renderer.
 const nav=first.closest('.pane');
 if(!nav||!stage.contains(nav))return;
 if(!norm(nav.textContent).includes('句子导航'))return;
 nav.classList.add('th-sentence-nav');
 nav.setAttribute('aria-label','二稿句子导航');
 const target=stage.firstElementChild;
 if(target!==nav)stage.insertBefore(nav,target);
 for(const button of jumps){
  const active=button.classList.contains('primary');
  button.setAttribute('aria-current',active?'step':'false');
  const number=(button.textContent||'').match(/^\s*(\d+)/)?.[1]||'';
  const mark=norm(button.textContent);
  button.setAttribute('aria-label','第 '+number+' 句'+(mark.includes('?')?'，待核实':mark.includes('✓')?'，已决定':'，待决定')+(active?'，当前句':''));
  if(active){
   button.classList.add('th-current-sentence');
   // Keep selection visible when a long article has many sentences.
   const rail=button.closest('.review-options');
   if(rail&&rail.scrollWidth>rail.clientWidth){
    const left=Math.max(0,button.offsetLeft-rail.clientWidth/2+button.offsetWidth/2);
    if(Math.abs(rail.scrollLeft-left)>rail.clientWidth*.55)rail.scrollLeft=left;
   }
  }else button.classList.remove('th-current-sentence');
 }
}
function exportLabel(){
 for(const id of ['exportOpen','paramShowExport']){
  const button=doc.getElementById(id);
  if(!button)continue;
  const old=norm(button.textContent);
  if(!old.includes('交付与导出'))continue;
  // Text-only cosmetic change: original onclick handler remains untouched.
  const next=old.replace(/^[←↩➜➔➝→]+\s*/u,'').replace(/\s*[←↩➜➔➝→]+$/u,'');
  if(next!==old)button.textContent=next;
  button.setAttribute('aria-label','交付与导出');
 }
}
function settingsButtons(){
 // Match the actual header controls, including the leading gear icon on 项目设置.
 const header=doc.querySelector('.topbar');
 if(!header)return;
 const elements=[...header.querySelectorAll('button,[role="button"],a.btn')];
 const project=elements.find(e=>norm(e.textContent).includes('项目设置'));
 const ai=doc.getElementById('openAISettings')||
  elements.find(e=>/^AI\s*设置$/i.test(norm(e.textContent)));
 if(!project||!ai||!header.contains(ai))return;
 for(const b of [project,ai]){
  b.classList.add('th-settings-trigger');
  b.style.setProperty('box-sizing','border-box','important');
  b.style.setProperty('width','112px','important');
  b.style.setProperty('min-width','112px','important');
  b.style.setProperty('max-width','112px','important');
  b.style.setProperty('height','42px','important');
  b.style.setProperty('min-height','42px','important');
  b.style.setProperty('max-height','42px','important');
  b.style.setProperty('padding','0 11px','important');
  b.style.setProperty('display','inline-flex','important');
  b.style.setProperty('justify-content','center','important');
  b.style.setProperty('align-items','center','important');
  b.style.setProperty('gap','5px','important');
  b.style.setProperty('font-size','12px','important');
  b.style.setProperty('white-space','nowrap','important');
  b.setAttribute('data-th-equal-settings','true');
 }
}
function run(){
 scheduled=false;
 try{reviewNavigation();exportLabel();settingsButtons();}
 catch(e){console.warn('Transhelper UI refinement skipped:',e);}
}
function schedule(){
 if(scheduled)return;scheduled=true;
 window.requestAnimationFrame?window.requestAnimationFrame(run):setTimeout(run,40);
}
const obs=new MutationObserver(schedule);
obs.observe(stage,{subtree:true,childList:true});
for(const parent of [doc.querySelector('.topbar'),doc.querySelector('.sidebar')]){
 if(parent)obs.observe(parent,{subtree:true,childList:true});
}
schedule();
})();
