(()=>{
'use strict';
/*
 * Guard the native Translator Workplace -> Week8 TW_RESTORE path.
 * Invalid persisted snapshots are never erased; they are simply not sent to Week8.
 * Manual import, OCR, editing, export and project storage are unchanged.
 */
const validImage=d=>d&&typeof d.image==='string'&&d.image.length>100&&d.image.length<=18000000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(d.image)
 &&Number.isFinite(d.width)&&Number.isFinite(d.height)&&d.width>=100&&d.height>=100&&d.width<=7000&&d.height<=7000;
function validSnapshot(s){
 if(!s||s.schema!=='week8.parameter-project.v1'||!s.documents||typeof s.documents!=='object'||Array.isArray(s.documents)||!s.documents[s.active])return false;
 const docs=Object.entries(s.documents);
 return docs.length>0&&docs.length<=8&&docs.every(([key,d])=>d?.id===key&&validImage(d));
}
const original=window.paramDbGet;
if(typeof original!=='function'){console.warn('Week8 restore safety: native persistence API unavailable');return;}
window.paramDbGet=async function(key){
 const snapshot=await original.apply(this,arguments);
 if(!snapshot)return null;
 if(validSnapshot(snapshot))return snapshot;
 console.warn('Week8: invalid retained OCR snapshot skipped for project',key);
 try{
  const el=document.getElementById('paramLoadStatus');
  if(el){
   el.textContent='检测到旧 OCR 快照的原图数据不完整，已跳过自动恢复。请上传原图重新识别；旧快照未删除。';
  }
 }catch{}
 return null;
};
})();