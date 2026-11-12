(()=>{
'use strict';
/* Prevent repetitive blank parameter projects when opening the OCR tool.
   Reuses only an existing untouched, unnamed parameter project.
   Never deletes, renames, merges, or writes to workspace storage. */
if(window.__thOcrProjectGuard)return;
window.__thOcrProjectGuard=true;
const KEY='tw-workplace-v4';
const fields=['source','draft','draftInput','revision','revInput','final','custom','notes','questionNote'];
function blankSegment(segment){
 if(!segment||typeof segment!=='object')return false;
 if(fields.some(k=>String(segment[k]||'').trim()))return false;
 if(Array.isArray(segment.chat)&&segment.chat.length)return false;
 if(Array.isArray(segment.history)&&segment.history.length)return false;
 if(Array.isArray(segment.reviewDecisions)&&segment.reviewDecisions.length)return false;
 return true;
}
function vacantProject(p){
 return !!p&&p.kind==='parameter'&&p.title==='未命名参数表'&&
  Array.isArray(p.segments)&&p.segments.length===1&&p.segments.every(blankSegment);
}
function eligible(saved){
 if(!saved||saved.version!==4||!Array.isArray(saved.projects))return null;
 const current=saved.projects.find(p=>p?.id===saved.active);
 if(!current||current.kind==='parameter')return null;
 // Prefer the most recent untouched draft; never overwrite data from other projects.
 const candidates=saved.projects.filter(vacantProject);
 return candidates.length?candidates[candidates.length-1]:null;
}
document.addEventListener('click',event=>{
 const node=event.target;
 const trigger=node&&typeof node.closest==='function'?node.closest('#quickOCR'):null;
 if(!trigger||trigger.disabled)return;
 const picker=document.getElementById('projectSelect');
 if(!picker)return;
 let data;
 try{data=JSON.parse(localStorage.getItem(KEY)||'null');}
 catch{return}
 const reuse=eligible(data);
 if(!reuse||![...picker.options].some(opt=>opt.value===reuse.id))return;
 // The native project's change handler remains responsible for selecting,
 // saving and rendering. Only suppress the native handler that creates
 // another empty project on this particular click.
 event.preventDefault();
 event.stopImmediatePropagation();
 picker.value=reuse.id;
 picker.dispatchEvent(new Event('change',{bubbles:true}));
},true);
})();
