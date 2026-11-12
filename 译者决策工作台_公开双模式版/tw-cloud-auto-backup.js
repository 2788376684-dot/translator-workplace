(()=>{
'use strict';
// Conservative, opt-in-after-first-backup cloud uploader.
// The native editor remains the sole writer of workspace localStorage.
if(window.__twCloudAutoBackupInstalled)return;
window.__twCloudAutoBackupInstalled=true;
const KEY='tw-workplace-v4', PREF='tw-cloud-autobackup-v1';
const button=document.getElementById('account-entry');
if(!button)return;
const status=document.createElement('span');
status.id='tw-cloud-status';status.setAttribute('role','status');
status.style.cssText='position:fixed;top:103px;right:18px;z-index:4;font:11px/1.4 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#65758a;background:#ffffffef;border:1px solid #e2e6ec;border-radius:7px;padding:4px 8px;max-width:190px;pointer-events:none;display:none';
document.body.append(status);
let busy=false,seen='',changedAt=0,lastAttempt=0,lastStatus='',authenticatedEmail='',lastAuthCheck=0;
function label(value,visible=true){if(lastStatus===value&&status.style.display===(visible?'block':'none'))return;lastStatus=value;status.textContent=value;status.style.display=visible?'block':'none';}
function readPref(){try{return JSON.parse(localStorage.getItem(PREF)||'null')}catch{return null}}
function writePref(next){localStorage.setItem(PREF,JSON.stringify(next))}
function valid(raw){if(!raw||raw.length>1600000)return false;try{const v=JSON.parse(raw);return v?.version===4&&Array.isArray(v.projects)}catch{return false}}
async function hash(raw){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}
async function request(action,method='GET',data){
 const res=await fetch('/api/account?action='+action,{method,credentials:'same-origin',cache:'no-store',headers:method==='POST'?{'Content-Type':'application/json'}:{},body:data===undefined?undefined:JSON.stringify(data)});
 const json=await res.json().catch(()=>({}));
 if(!res.ok){const error=new Error(json.error||'账户服务不可用');error.status=res.status;throw error;}
 return json;
}
async function tick(){
 if(busy||document.visibilityState==='hidden'||!navigator.onLine)return;
 const pref=readPref();
 if(!pref?.enabled||pref.conflict||!pref.updatedAt||!pref.hash||!pref.email){label('',false);return}
 const raw=localStorage.getItem(KEY);
 if(!valid(raw)){label('工作区未就绪或超过容量，自动备份暂停');return}
 if(raw!==seen){seen=raw;changedAt=Date.now();return}
 if(Date.now()-changedAt<12000)return;
 busy=true;
 try{
  const localHash=await hash(raw);
  if(localHash===pref.hash){label('云端已备份');return}
  if(Date.now()-lastAttempt<30000)return;
  lastAttempt=Date.now();
  if(Date.now()-lastAuthCheck>60000||!authenticatedEmail){
   const me=await request('me');
   authenticatedEmail=me.email||'';lastAuthCheck=Date.now();
  }
  if(authenticatedEmail!==pref.email){label('账户已切换，自动备份暂停');return}
  // Another tab may have replaced the local snapshot while the hash was computed.
  if(localStorage.getItem(KEY)!==raw)return;
  const latest=readPref();
  if(!latest?.enabled||latest.conflict||latest.email!==pref.email||latest.updatedAt!==pref.updatedAt)return;
  label('正在备份…');
  const result=await request('snapshot','POST',{payload:{schema:'tw.account.snapshot.v1',workspace:raw},expectedUpdatedAt:pref.updatedAt});
  if(result.saved&&result.updatedAt){
   const current=readPref();
   if(current&&current.email===pref.email&&current.updatedAt===pref.updatedAt){
    writePref({...current,updatedAt:result.updatedAt,hash:localHash,conflict:false});
   }
   label('云端已备份 · '+new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}));
  }
 }catch(e){
  if(e.status===409){const current=readPref();if(current&&current.email===pref.email){writePref({...current,conflict:true,enabled:false})}label('云端有新版本，自动备份已暂停');}
  else if(e.status===401){authenticatedEmail='';lastAuthCheck=0;label('未登录，自动备份已暂停');}
  else label('自动备份暂失败，将重试');
 }finally{busy=false}
}
window.setInterval(()=>{tick().catch(()=>{})},15000);
window.addEventListener('online',()=>{lastAttempt=0;tick().catch(()=>{})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick().catch(()=>{})});
window.addEventListener('storage',e=>{if(e.key===PREF||e.key===KEY){changedAt=Date.now();lastAttempt=0;}});
tick().catch(()=>{});
})();
