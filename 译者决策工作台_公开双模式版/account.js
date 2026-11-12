(()=>{
'use strict';
const KEY='tw-workplace-v4';
const AUTO_KEY='tw-cloud-autobackup-v1';
async function fingerprint(raw){
 const bytes=new TextEncoder().encode(raw);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
function autoPrefs(){try{return JSON.parse(localStorage.getItem(AUTO_KEY)||'null')}catch{return null}}
function showAuto(){
 const pref=autoPrefs(),enabled=logged&&pref?.email===$('identity').textContent.replace(/^当前账户：/,'')&&pref?.enabled===true;
 $('autobackup').checked=!!enabled;
 $('autobackup').disabled=!logged||!pref?.updatedAt;
 $('autoDetail').textContent=!pref?.updatedAt?'首次点击“备份到云端”后即可开启自动备份。':pref?.conflict?'检测到云端版本冲突，自动备份已暂停。请检查云端数据。':enabled?'自动备份已启用：工作台修改后自动上传。':'自动备份已关闭。';
}

const $=id=>document.getElementById(id);
let busy=false,logged=false;
function note(v,error=false){$('feedback').textContent=v;$('feedback').classList.toggle('error',error)}
function disable(value){busy=value;document.querySelectorAll('button').forEach(b=>b.disabled=value)}
async function request(action,method='GET',data){
 const r=await fetch('/api/account?action='+encodeURIComponent(action),{method,credentials:'same-origin',headers:method==='POST'?{'Content-Type':'application/json'}:{},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});
 const j=await r.json().catch(()=>({error:'服务器返回内容异常'}));
 if(!r.ok)throw Error(j.error||'操作失败');return j;
}
function session(auth,email){
 logged=auth;$('auth').hidden=auth;$('cloud').hidden=!auth;$('identity').textContent=auth?'当前账户：'+email:'';showAuto();
}
function parseLocal(){
 const raw=localStorage.getItem(KEY);if(!raw)throw Error('本机尚无可备份的翻译工作区。请先返回工作台创建项目并保存。');
 let obj;try{obj=JSON.parse(raw)}catch{throw Error('本机工作区格式无效。')}
 if(!obj||obj.version!==4||!Array.isArray(obj.projects))throw Error('当前工作区数据版本无法识别，请先使用工作台的原生导出功能保存备份。');
 return raw;
}
function saveFile(name,content){
 const blob=new Blob([content],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function filename(prefix){return prefix+'_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json'}
async function refresh(){
 try{const me=await request('me');session(true,me.email);note('已登录。首次备份后，可以在工作台自动保存后续修改。');}
 catch{session(false);note('请登录以使用个人云端存储。');}
}
$('form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;disable(true);
 try{const r=await request('login','POST',{email:$('email').value.trim(),password:$('password').value});$('password').value='';session(true,r.email);note('登录成功。');}
 catch(e){note(e.message,true)}finally{disable(false)}
});
$('signup').onclick=async()=>{
 if(busy||!$('form').reportValidity())return;
 if(!confirm('确认用此邮箱注册 Translator Workplace 账户？'))return;
 disable(true);
 try{const r=await request('signup','POST',{email:$('email').value.trim(),password:$('password').value});$('password').value='';session(!!r.authenticated,r.email);note(r.authenticated?'注册并登录成功。':r.message||'请检查邮箱完成验证。');}
 catch(e){note(e.message,true)}finally{disable(false)}
};
$('upload').onclick=async()=>{
 if(busy)return;let raw;try{raw=parseLocal()}catch(e){note(e.message,true);return}
 if(!confirm('确认将当前本机工作区保存到此账户的云端？已有云端备份会被覆盖。'))return;
 disable(true);
 try{const result=await request('snapshot','POST',{payload:{schema:'tw.account.snapshot.v1',workspace:raw}});const email=$('identity').textContent.replace(/^当前账户：/,'');const previous=autoPrefs();localStorage.setItem(AUTO_KEY,JSON.stringify({email,updatedAt:result.updatedAt,hash:await fingerprint(raw),enabled:previous?.email===email?previous.enabled!==false:true,conflict:false}));showAuto();note('云端备份已保存，自动备份已'+($('autobackup').checked?'开启':'关闭')+'。');$('cloudtime').textContent='本次保存：'+new Date().toLocaleString();}
 catch(e){note(e.message,true)}finally{disable(false)}
};
async function cloudSnapshot(){
 const r=await request('snapshot');if(!r.snapshot?.payload)throw Error('该账户尚无云端工作区备份。');
 const p=r.snapshot.payload;if(p.schema!=='tw.account.snapshot.v1'||p.storageKey!==KEY||typeof p.workspace!=='string')throw Error('云端备份格式不正确');
 const obj=JSON.parse(p.workspace);if(!obj||obj.version!==4||!Array.isArray(obj.projects))throw Error('云端备份版本不兼容');
 return {raw:p.workspace,time:r.snapshot.updated_at};
}
$('download').onclick=async()=>{
 if(busy)return;disable(true);
 try{const s=await cloudSnapshot();if(!confirm('从云端恢复将替换该浏览器的所有本地翻译项目。确认继续吗？'))return;
 const previous=localStorage.getItem(KEY);
 if(previous)saveFile(filename('workspace-before-cloud-restore'),previous);
 localStorage.setItem(KEY,s.raw);const current=autoPrefs();const email=$('identity').textContent.replace(/^当前账户：/,'');localStorage.setItem(AUTO_KEY,JSON.stringify({email,updatedAt:s.time,hash:await fingerprint(s.raw),enabled:current?.email===email?current.enabled!==false:true,conflict:false}));showAuto();note('云端工作区已恢复。返回工作台并刷新页面即可读取项目。');$('cloudtime').textContent='云端更新时间：'+new Date(s.time).toLocaleString();
 }catch(e){note('恢复失败：'+e.message,true)}finally{disable(false)}
};
$('export').onclick=async()=>{
 if(busy)return;disable(true);
 try{const s=await cloudSnapshot();saveFile(filename('workspace-cloud-backup'),s.raw);note('云端 JSON 备份已下载。')}
 catch(e){note(e.message,true)}finally{disable(false)}
};
$('autobackup').addEventListener('change',()=>{const pref=autoPrefs();const email=$('identity').textContent.replace(/^当前账户：/,'');if(!pref||pref.email!==email||!pref.updatedAt){showAuto();return;}pref.enabled=$('autobackup').checked;localStorage.setItem(AUTO_KEY,JSON.stringify(pref));showAuto();note(pref.enabled?'自动备份已启用。':'自动备份已关闭。');});
window.addEventListener('storage',e=>{if(e.key===AUTO_KEY)showAuto();});
$('logout').onclick=async()=>{
 if(busy)return;disable(true);
 try{await request('logout','POST',{});session(false);note('已退出云端账户。本机项目仍保存在此浏览器中。');}
 catch(e){note(e.message,true)}finally{disable(false)}
};
(async()=>{try{await request('status');await refresh()}catch(e){session(false);$('auth').hidden=true;note((e.message||'账户服务连接失败')+' 本地工作台仍可使用。',true)}})();
})();