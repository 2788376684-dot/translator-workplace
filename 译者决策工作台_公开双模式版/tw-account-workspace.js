/* Account-scoped browser workspaces. Never deletes snapshots or cloud data. */
(()=>{
'use strict';
const KEY='tw-workplace-v4', OWNER='tw-workspace-active-owner-v1', PREF='tw-cloud-autobackup-v1';
const SLOT='tw-workspace-account-v1:';
function normalize(v){return String(v||'').trim().toLowerCase()}
function slot(owner){return SLOT+encodeURIComponent(owner)}
function valid(raw){try{const v=JSON.parse(raw);return v?.version===4&&Array.isArray(v.projects)}catch{return false}}
function previousOwner(){
 const named=localStorage.getItem(OWNER);
 if(named)return named;
 try{const pref=JSON.parse(localStorage.getItem(PREF)||'null');if(pref?.email)return normalize(pref.email)}catch(_){}
 return 'guest';
}
window.thWorkspaceGate=function(email){
 const next=normalize(email)||'guest';
 const previous=previousOwner();
 if(previous===next){localStorage.setItem(OWNER,next);return false;}
 const current=localStorage.getItem(KEY);
 // Abort the identity switch if the snapshot cannot be safely saved.
 if(current&&valid(current))localStorage.setItem(slot(previous),current);
 else if(current)throw Error('当前本地项目格式异常，已暂停切换以避免数据丢失');
 const saved=localStorage.getItem(slot(next));
 if(saved&&!valid(saved))throw Error('目标账户的本地项目备份异常，已暂停切换');
 if(saved)localStorage.setItem(KEY,saved);
 else localStorage.removeItem(KEY);
 localStorage.setItem(OWNER,next);
 return true;
};
window.thWorkspaceOpen=async function(){
 let email=null;
 try{
  const response=await fetch('/api/account?action=me',{credentials:'same-origin',cache:'no-store'});
  if(response.ok){const data=await response.json();email=data.email||null}
 }catch(_){}
 window.thWorkspaceGate(email);
};
})();
