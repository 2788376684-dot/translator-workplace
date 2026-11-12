/* Account authentication and owner-scoped cloud snapshots. Supabase anon key only; RLS required. */
const cookie=require('node:querystring');
const MAX=2_000_000;
const HOST=/^https:\/\/[a-z0-9-]+\.supabase\.co$/;
const COOKIE={access:'tw_account_access',refresh:'tw_account_refresh'};
function configState(){
 const rawUrl=process.env.SUPABASE_URL||'';
 const url=rawUrl.trim().replace(/\/$/,'');
 const key=(process.env.SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_ANON_KEY||'').trim();
 if(!rawUrl.trim())return {code:'missing_url',error:'Vercel 缺少 SUPABASE_URL，请检查 Production 环境变量及重新部署。'};
 if(!HOST.test(url))return {code:'invalid_url',error:'SUPABASE_URL 格式错误。应填写 https://项目标识.supabase.co，不能填写 /rest/v1、Data API 路径或其他文字。'};
 if(!key)return {code:'missing_key',error:'Vercel 缺少 SUPABASE_PUBLISHABLE_KEY，请检查 Production 环境变量及重新部署。'};
 if(key.length<=20||(!key.startsWith('sb_publishable_')&&!key.startsWith('eyJ')))return {code:'invalid_key',error:'Supabase 公钥格式不正确，请复制 API Keys 中的 Publishable key。不要使用 Secret key。'};
 return {code:'ok',url,key};
}
function cfg(){const state=configState();return state.code==='ok'?{url:state.url,key:state.key}:null;}
function opts(c,token){return {'apikey':c.key,...(token?{'Authorization':'Bearer '+token}:{}),'Content-Type':'application/json'};}
/* Surface actionable Auth failures without returning upstream messages or credentials. */
function authFailure(r,signup){
 const code=String(r.body?.code||r.body?.error_code||'').toLowerCase();
 const detail=String(r.body?.msg||r.body?.message||r.body?.error_description||'').toLowerCase();
 if(r.status===429)return '请求过于频繁，请稍后再试。';
 if(signup){
  if(['user_already_exists','email_exists','identity_already_exists'].includes(code)||detail.includes('already registered')||detail.includes('already exists'))return '这个邮箱可能已注册，请直接点击“登录”。';
  if(['signup_disabled','email_provider_disabled','provider_disabled'].includes(code))return 'Supabase 已禁止邮箱注册。请检查 Authentication → Sign In / Providers 中的 Email 和允许新用户注册设置。';
  if(code==='weak_password'||detail.includes('password'))return '密码未满足 Supabase 安全要求，请设置更强的密码后再试。';
  if(['email_address_invalid','email_address_not_authorized'].includes(code))return '当前邮箱地址未被 Supabase 允许注册，请检查 Auth 邮箱限制。';
  return '注册未成功（Supabase 状态 '+r.status+(code?'，错误码 '+code:'')+'）。请检查 Authentication 日志和注册设置。';
 }
 if(code==='email_not_confirmed')return '邮箱尚未确认。请检查 Supabase 的 Confirm email 设置或现有用户状态。';
 if(code==='invalid_credentials')return '邮箱或密码不正确。若曾注册过，请检查账户密码。';
 return '登录未成功（Supabase 状态 '+r.status+(code?'，错误码 '+code:'')+'）。请检查邮箱、密码与认证设置。';
}
function json(res,status,obj){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(obj);}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(v=>{let i=v.indexOf('=');return i<0?['','']:[v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}));}
function putCookies(res,s){const secure=process.env.NODE_ENV==='production'?'; Secure':'';const base='; Path=/; HttpOnly; SameSite=Lax'+secure;res.setHeader('Set-Cookie',[COOKIE.access+'='+encodeURIComponent(s.access_token)+base+'; Max-Age='+Math.min(s.expires_in||3600,3600),COOKIE.refresh+'='+encodeURIComponent(s.refresh_token)+base+'; Max-Age=2592000']);}
function clearCookies(res){const base='; Path=/; HttpOnly; SameSite=Lax'+(process.env.NODE_ENV==='production'?'; Secure':'')+'; Max-Age=0';res.setHeader('Set-Cookie',[COOKIE.access+'='+base,COOKIE.refresh+'='+base]);}
async function upstream(c,path,method='GET',data,token){const response=await fetch(c.url+path,{method,headers:opts(c,token),body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(12000)});const text=await response.text();let body;try{body=JSON.parse(text)}catch{body={}}return {ok:response.ok,status:response.status,body};}
async function identity(req,res,c){
 const jar=cookies(req);let token=jar[COOKIE.access];if(token){const check=await upstream(c,'/auth/v1/user','GET',undefined,token);if(check.ok&&check.body.id)return {token,user:check.body};}
 if(!jar[COOKIE.refresh])return null;
 const renewed=await upstream(c,'/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:jar[COOKIE.refresh]});
 if(!renewed.ok||!renewed.body.access_token){clearCookies(res);return null;}
 putCookies(res,renewed.body);token=renewed.body.access_token;
 const check=await upstream(c,'/auth/v1/user','GET',undefined,token);
 return check.ok&&check.body.id?{token,user:check.body}:null;
}
function sameOrigin(req){const h=req.headers.host,o=req.headers.origin;if(!o)return true;try{return new URL(o).host===h&&new URL(o).protocol==='https:';}catch{return false;}}
module.exports=async function handler(req,res){
 const state=configState();const c=cfg();if(!c)return json(res,503,{error:state.error,configured:false,reason:state.code});
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'请求方法不支持'});
 if(req.method==='POST'&&!sameOrigin(req))return json(res,403,{error:'跨站请求已拒绝'});
 const action=String(req.query?.action||'');
 const bytes=Buffer.byteLength(JSON.stringify(req.body||{}));
 if(bytes>MAX)return json(res,413,{error:'数据超过 2 MB，请使用本地导出保存'});
 try{
  if(action==='status'&&req.method==='GET')return json(res,200,{configured:true});
  if(action==='login'&&req.method==='POST'||action==='signup'&&req.method==='POST'){
   const email=req.body?.email,password=req.body?.password;
   if(typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<8||password.length>128)return json(res,400,{error:'请输入有效邮箱和 8–128 位密码'});
   const signup=action==='signup';
   const r=await upstream(c,signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password','POST',{email,password});
   if(!r.ok)return json(res,r.status===429?429:400,{error:authFailure(r,signup)});
   if(r.body.access_token&&r.body.refresh_token){putCookies(res,r.body);return json(res,200,{authenticated:true,email:r.body.user?.email||email});}
   return json(res,200,{authenticated:false,message:'注册申请已提交，请查收验证邮件后登录。'});
  }
  if(action==='logout'&&req.method==='POST'){clearCookies(res);return json(res,200,{authenticated:false});}
  const session=await identity(req,res,c);
  if(!session)return json(res,401,{error:'请先登录',authenticated:false});
  if(action==='me'&&req.method==='GET')return json(res,200,{authenticated:true,email:session.user.email});
  const table='/rest/v1/tw_workspace_snapshots';
  if(action==='snapshot'&&req.method==='GET'){
   const r=await upstream(c,table+'?select=payload,updated_at&limit=1','GET',undefined,session.token);
   if(!r.ok)return json(res,502,{error:'无法读取云端数据，请确认数据库已创建并启用行级安全策略'});
   return json(res,200,{snapshot:r.body?.[0]||null});
  }
  if(action==='snapshot'&&req.method==='POST'){
   const payload=req.body?.payload;
   if(!payload||typeof payload!=='object'||Array.isArray(payload)||payload.schema!=='tw.account.snapshot.v1'||typeof payload.workspace!=='string'||payload.workspace.length>1_600_000)return json(res,400,{error:'备份文件结构不正确'});
   const key='tw-workplace-v4';
   let data;try{data=JSON.parse(payload.workspace)}catch{return json(res,400,{error:'工作区内容不是有效 JSON'})}
   if(!data||data.version!==4||!Array.isArray(data.projects))return json(res,400,{error:'工作区版本不匹配，无法保存'});
   const r=await fetch(c.url+table+'?on_conflict=user_id',{method:'POST',headers:{...opts(c,session.token),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:session.user.id,payload:{schema:payload.schema,storageKey:key,workspace:payload.workspace},updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(12000)});
   if(!r.ok)return json(res,502,{error:'云端保存失败，请确认数据库权限配置'});
   return json(res,200,{saved:true});
  }
  return json(res,404,{error:'未找到接口'});
 }catch(e){return json(res,502,{error:'账户服务暂时无法连接，请稍后重试'});}
};