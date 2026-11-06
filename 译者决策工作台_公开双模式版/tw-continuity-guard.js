(()=>{
'use strict';
// Optional, fail-open recovery layer. Does not modify the translator's workflow state.
if(window.__twContinuityGuardInstalled)return;
window.__twContinuityGuardInstalled=true;
const KEY='tw-workplace-v4', DB='tw-workplace-recovery-v1', STORE='snapshots', LIMIT=3;
const main=document.querySelector('main.main'), bottom=document.querySelector('.side-bottom');
if(!main||!bottom)return;
let previous='', saving=false, panel=null;
const parse=raw=>{
 try{
  const v=JSON.parse(raw);
  return v&&v.version===4&&Array.isArray(v.projects)&&v.projects.length>0
   &&v.projects.every(p=>p&&typeof p.id==='string'&&Array.isArray(p.segments))?v:null;
 }catch{return null;}
};
function openDB(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error('浏览器不支持 IndexedDB'));return;}
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('本地快照存储不可用'));
 });
}
async function records(){
 const db=await openDB();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();
  req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.id-a.id));
  req.onerror=()=>reject(req.error);
 });}finally{db.close();}
}
async function snapshot(force=false){
 if(saving)return false;
 const raw=localStorage.getItem(KEY),data=parse(raw);
 if(!data||(!force&&raw===previous))return false;
 saving=true;
 try{
  const db=await openDB();
  try{await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
   store.add({createdAt:Date.now(),raw,projectCount:data.projects.length});
   const req=store.getAllKeys();
   req.onsuccess=()=>{const keys=req.result;if(keys.length>LIMIT)keys.slice(0,keys.length-LIMIT).forEach(key=>store.delete(key));};
   tx.oncomplete=resolve;
   tx.onerror=()=>reject(tx.error||Error('存储失败'));
   tx.onabort=()=>reject(tx.error||Error('存储取消'));
  });}finally{db.close();}
  previous=raw;
  return true;
 }catch(e){console.warn('本地恢复快照未保存：',e);return false;}
 finally{saving=false;}
}
function element(tag,cls,txt){
 const e=document.createElement(tag);if(cls)e.className=cls;if(txt)e.textContent=txt;return e;
}
function control(label,fn){
 const b=element('button','tw-recovery-button',label);
 b.type='button';b.addEventListener('click',fn);return b;
}
function show(text){
 if(!panel){
  panel=element('section','tw-recovery-strip');
  panel.setAttribute('aria-live','polite');panel.setAttribute('aria-label','本地工作记录与恢复');
  main.insertBefore(panel,main.querySelector('.workgrid'));
 }
 panel.replaceChildren(element('p','tw-recovery-message',text));
 panel.hidden=false;
 return panel;
}
function close(){if(panel)panel.hidden=true;}
function nativeBackup(){const button=document.getElementById('backupProject');if(button)button.click();}
async function listRecovery(message){
 const view=show(message||'以下是本浏览器自动保留的最近三份文本工作区快照。恢复会重新载入工作台，OCR 原图仍由原 OCR 工程独立管理。');
 const commands=element('div','tw-recovery-actions');
 commands.append(control('使用原有功能导出项目备份',nativeBackup),control('收起',close));
 view.append(commands);
 let items;
 try{items=await records();}catch(e){
  view.append(element('p','tw-recovery-detail','当前浏览器未开放本地恢复快照。原有项目导入、导出及 OCR 工程不受影响。'));return;
 }
 if(!items.length){view.append(element('p','tw-recovery-detail','尚无可用快照。开始编辑后将定期保存独立的本地恢复记录。'));return;}
 const list=element('div','tw-recovery-list');
 for(const item of items){
  if(!parse(item.raw))continue;
  const line=element('div','tw-recovery-record');
  const date=new Date(item.createdAt).toLocaleString('zh-CN',{hour12:false});
  line.append(element('span','',date+' · '+item.projectCount+' 个项目'));
  line.append(control('恢复此记录',async()=>{
   if(!window.confirm('恢复此记录将覆盖当前浏览器保存的工作区。请先导出当前项目备份。确定继续？'))return;
   // Protect the current valid workspace before replacing it.
   await snapshot(true);
   try{localStorage.setItem(KEY,item.raw);}
   catch(e){show('无法写入恢复记录，可能是浏览器存储空间不足。未修改现有工作区。');return;}
   try{window.top.location.reload();}catch{window.location.reload();}
  }));
  list.append(line);
 }
 view.append(list);
}
const style=element('style');
style.textContent=`
.tw-recovery-strip{border:1px solid #d4dce5;background:#fff;border-radius:9px;padding:11px 14px;margin:5px 0 13px;color:#364251;font:13px/1.55 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
.tw-recovery-strip[hidden]{display:none}.tw-recovery-message{margin:0 0 7px}
.tw-recovery-actions,.tw-recovery-record{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tw-recovery-record{justify-content:space-between;border-top:1px solid #edf0f4;padding:7px 0}
.tw-recovery-button{font:inherit;font-size:12px;color:#2e526d;background:#fff;border:1px solid #ccd6df;border-radius:6px;padding:5px 9px;cursor:pointer}
.tw-recovery-button:hover{background:#f6f8fa}.tw-recovery-button:focus-visible{outline:2px solid #2e80b6;outline-offset:2px}
.tw-recovery-detail{color:#697586;margin:9px 0 0}.tw-recovery-shortcut{font-size:11px!important}
`;
document.head.append(style);
const shortcut=control('恢复记录',()=>listRecovery());
shortcut.classList.add('tw-recovery-shortcut');
bottom.append(shortcut);
window.addEventListener('storage',e=>{
 if(e.key!==KEY||e.storageArea!==localStorage)return;
 const data=parse(e.newValue);
 if(data){
  const view=show('另一标签页修改了此工作区。当前页面不会自动覆盖为对方的内容；继续编辑可能产生版本冲突。请先导出当前项目，再决定是否刷新。');
  const row=element('div','tw-recovery-actions');
  row.append(control('导出当前项目',nativeBackup),control('查看历史快照',()=>listRecovery()),control('知道了',close));
  view.append(row);
 }else if(e.newValue!==null){
  show('其他标签页写入了无法识别的工作区数据。当前页面仍保留现有内容，请优先导出备份。');
 }
});
const stored=localStorage.getItem(KEY);
if(stored&&!parse(stored))listRecovery('检测到本地工作区数据格式异常。已保留原始存储内容，未执行自动恢复。可查看此前的安全快照。');
snapshot().catch(()=>{});
window.setInterval(()=>{snapshot().catch(()=>{});},45000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')snapshot().catch(()=>{});});
})();