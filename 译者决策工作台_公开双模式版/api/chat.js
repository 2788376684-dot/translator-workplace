const {timingSafeEqual} = require('node:crypto');
const attemptWindow = new Map(); // best effort per warm serverless instance; use distributed limits for public scale
function safeCode(a,b){
 const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
 return x.length===y.length&&timingSafeEqual(x,y);
}
function limited(ip){
 const now=Date.now();
 if(attemptWindow.size>5000)for(const [key,value] of attemptWindow)if(now-value.start>60000)attemptWindow.delete(key);
 const state=attemptWindow.get(ip);
 if(!state||now-state.start>60000){attemptWindow.set(ip,{start:now,count:1});return false}
 state.count++;return state.count>24;
}
const ALLOWED_MODELS = new Set(['agnes-2.5-flash','agnes-3.0-flash']);
function fail(res,code,message){return res.status(code).json({error:message});}
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return fail(res,405,'仅允许 POST');
  if(process.env.CHAT_ENABLED!=='true'||!process.env.AGNES_API_KEY)return fail(res,503,'在线 AI 尚未启用，您可以使用离线编辑模式。');
  const origin=req.headers.origin;
  const host=req.headers.host;
  if(origin){try{if(new URL(origin).host!==host)return fail(res,403,'禁止跨站调用');}catch(e){return fail(res,403,'无效的来源');}}
  if(process.env.SITE_ACCESS_CODE&&!safeCode(req.headers['x-workspace-access'],process.env.SITE_ACCESS_CODE))return fail(res,401,'在线 AI 需要访问码，请向网站管理员索取。');
  const ip=String(req.headers['x-real-ip']||req.headers['x-forwarded-for']||'unknown').split(',')[0].trim().slice(0,128);
  if(limited(ip))return fail(res,429,'请求较频繁，请一分钟后重试。');
  const length=Number(req.headers['content-length']||0);
  if(length>26000)return fail(res,413,'文本过长，请分段处理（单次最多约 25KB）。');
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch(e){return fail(res,400,'请求不是有效 JSON');}
  if(Buffer.byteLength(JSON.stringify(body||{}),'utf8')>26000)return fail(res,413,'请求内容超过大小限制，请缩短材料。');
  const model=body?.model;
  const messages=body?.messages;
  if(!ALLOWED_MODELS.has(model))return fail(res,400,'模型不可用');
  if(!Array.isArray(messages)||messages.length<1||messages.length>18)return fail(res,400,'消息数量超出限制');
  if(messages.some(m=>!m||!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>10000))return fail(res,400,'消息格式或长度不合法');
  const total=messages.reduce((a,m)=>a+m.content.length,0);
  if(total>18000)return fail(res,413,'上下文过长，请缩短材料或新建对话。');
  try{
    const upstream=await fetch('https://api.agnes-ai.cn/v1/chat/completions',{
      method:'POST',headers:{'Authorization':'Bearer '+process.env.AGNES_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model,messages,stream:false}),signal:AbortSignal.timeout(47000)
    });
    if(!upstream.ok){
      if(upstream.status===401||upstream.status===403)return fail(res,502,'网站管理员需要检查 Agnes API 密钥。');
      if(upstream.status===429)return fail(res,429,'Agnes 服务当前限制请求，请稍后重试。');
      return fail(res,502,'Agnes AI 暂时无法完成请求（HTTP '+upstream.status+'）。');
    }
    const data=await upstream.json();const content=data?.choices?.[0]?.message?.content;
    if(typeof content!=='string')return fail(res,502,'AI 响应格式异常');
    if(data?.choices?.[0]?.finish_reason==='length')return fail(res,502,'AI 输出触及长度限制，请缩短文本或分段处理，避免不完整译文。');
    return res.status(200).json({content});
  }catch(e){return fail(res,504,'AI 请求超时或网络不可用，请稍后重试。');}
};
