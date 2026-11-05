from pathlib import Path
p=Path("译者决策工作台_公开双模式版/atelier-core.html")
s=p.read_text(encoding="utf-8")
a=s.index("async function runReviewNow(){")
b=s.index("async function askAI(){",a)
part=s[a:b]
assert "async function requestBatch(part){" in part and "async function requestStandalone(row){" in part
def one(a,b):
 global part
 if part.count(a)!=1:raise RuntimeError("Expected one patch anchor, found "+str(part.count(a))+": "+a[:100])
 part=part.replace(a,b,1)

one("  const combined=[];\n  for(let i=0;i<rows.length;i+=4){", """  // The server or upstream provider may return HTTP 429. Do not multiply
  // that response into four further singleton requests.
  const reviewRateLimited=e=>/429|限制请求|请求较频繁|限流|rate.limit|too many requests/i.test(String(e?.message||e));
  const reviewCheckpointKey='tw-ai-review-checkpoint-v1:'+pid+':'+sid;
  const reviewSignature=JSON.stringify([s.draft,s.source,promptText,proj().sourceLang,proj().targetLang]);
  let restored=[];
  try{
   if(typeof localStorage!=='undefined'){
    const saved=JSON.parse(localStorage.getItem(reviewCheckpointKey)||'null');
    if(saved?.signature===reviewSignature&&Array.isArray(saved?.items)&&saved.items.length<=rows.length&&saved.items.every(x=>x&&typeof x.proposed==='string'&&x.proposed.trim()))restored=saved.items;
   }
  }catch(e){restored=[];}
  const combined=restored.slice();
  function remember(){
   try{if(typeof localStorage!=='undefined')localStorage.setItem(reviewCheckpointKey,JSON.stringify({signature:reviewSignature,items:combined}));}catch(e){}
  }
  function rateLimitedError(e){
   return Error('Agnes 当前限制 AI 请求。已保存 '+combined.length+' / '+rows.length+' 句已校验结果，请稍后再点击“开始 AI 逐句审校”继续。'+(e?.message?' '+e.message:''));
  }
  for(let i=combined.length;i<rows.length;i=combined.length){""")
one("   try{combined.push(...await requestBatch(part));}\n   catch(e){", """   try{combined.push(...await requestBatch(part));remember();}
   catch(e){
    if(reviewRateLimited(e))throw rateLimitedError(e);""")
one("     try{combined.push(...await requestBatch([row]));}\n     catch(err){", """     try{combined.push(...await requestBatch([row]));remember();}
     catch(err){
      if(reviewRateLimited(err))throw rateLimitedError(err);""")
one("      try{combined.push(await requestStandalone(row));}\n      catch(rescueError){", """      try{combined.push(await requestStandalone(row));remember();}
      catch(rescueError){
       if(reviewRateLimited(rescueError))throw rateLimitedError(rescueError);""")
one("       combined.push({proposed:row.initial,reason:'此句 AI 返回格式异常，尚未完成审校。请人工核对或重新运行 AI 审校。',needsManualReview:true});", """       combined.push({proposed:row.initial,reason:'此句 AI 返回格式异常，尚未完成审校。请人工核对或重新运行 AI 审校。',needsManualReview:true});remember();""")
one("persist();draw();const unresolved=combined.filter(x=>x.needsManualReview).length;", """persist();
  try{if(typeof localStorage!=='undefined')localStorage.removeItem(reviewCheckpointKey);}catch(e){}
  draw();const unresolved=combined.filter(x=>x.needsManualReview).length;""")
s=s[:a]+part+s[b:]
p.write_text(s,encoding="utf-8")
print("Rate limits now stop immediately; validated partial batches remain locally available for a later resume")
