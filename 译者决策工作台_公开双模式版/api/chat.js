const crypto = require('node:crypto');
const ALLOWED_MODELS = new Set(['agnes-2.5-flash','agnes-3.0-flash']);
function fail(res,code,message){return res.status(code).json({error:message});}
async function redisCommand(command){
  const url=process.env.UPSTASH_REDIS_REST_URL;
  const r=await fetch(url,{method:'POST',headers:{'Authorization':'Bearer '+process.env.UPSTASH_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw new Error('Rate-limit storage unavailable');
  const body=await r.json();if(body.error)throw new Error('Rate-limit storage error');return body.result;
}
async function takeQuota(key,limit){
  // One atomic Lua evaluation: increment with one-day expiration on first use.
  const lua=`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],86400) end; return n`;
  const count=Number(await redisCommand(['EVAL',lua,'1',key]));
  return count<=limit;
}
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return fail(res,405,'仅允许 POST');
  if(process.env.CHAT_ENABLED!=='true'||!process.env.AGNES_API_KEY||!process.env.UPSTASH_REDIS_REST_URL||!process.env.UPSTASH_REDIS_REST_TOKEN)return fail(res,503,'在线 AI 尚未启用，您可以使用离线编辑模式。');
  const origin=req.headers.origin;
  const host=req.headers.host;
  if(origin){try{if(new URL(origin).host!==host)return fail(res,403,'禁止跨站调用');}catch(e){return fail(res,403,'无效的来源');}}
  const length=Number(req.headers['content-length']||0);
  if(length>26000)return fail(res,413,'文本过长，请分段处理（单次最多约 25KB）。');
  let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;}catch(e){return fail(res,400,'请求不是有效 JSON');}
  const model=body?.model;
  const messages=body?.messages;
  if(!ALLOWED_MODELS.has(model))return fail(res,400,'模型不可用');
  if(!Array.isArray(messages)||messages.length<1||messages.length>18)return fail(res,400,'消息数量超出限制');
  if(messages.some(m=>!m||!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>10000))return fail(res,400,'消息格式或长度不合法');
  const total=messages.reduce((a,m)=>a+m.content.length,0);
  if(total>18000)return fail(res,413,'上下文过长，请缩短材料或新建对话。');
  const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const ident=crypto.createHash('sha256').update(ip+'|'+(process.env.QUOTA_SALT||'workbench')).digest('hex').slice(0,32);
  const bucket=new Date().toISOString().slice(0,10);
  try{
    const perUser=Math.min(Math.max(Number(process.env.DAILY_LIMIT_PER_IP||8),1),100);
    const globalLimit=Math.min(Math.max(Number(process.env.DAILY_GLOBAL_LIMIT||200),1),100000);
    if(!await takeQuota(`workbench:${bucket}:global`,globalLimit))return fail(res,429,'网站今日共享 AI 额度已用完。离线编辑仍可使用。');
    if(!await takeQuota(`workbench:${bucket}:ip:${ident}`,perUser))return fail(res,429,'当前网络今天的 AI 调用次数已达上限。离线编辑仍可使用。');
  }catch(e){return fail(res,503,'额度保护服务暂不可用，已暂停 AI 调用以保护共享密钥。离线编辑仍可使用。');}
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
    return res.status(200).json({content});
  }catch(e){return fail(res,504,'AI 请求超时或网络不可用，请稍后重试。');}
};
