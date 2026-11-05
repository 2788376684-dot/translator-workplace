from pathlib import Path
p=Path("译者决策工作台_公开双模式版/atelier-core.html")
s=p.read_text(encoding="utf-8")
start=s.index("async function runReviewNow(){")
end=s.index("async function askAI(){",start)
t=s[start:end]
assert t.startswith("async function runReviewNow(){reviewSetupOpen=false;")
t=t.replace("async function runReviewNow(){reviewSetupOpen=false;","async function runReviewNow(){",1)
a=t.index("  const raw=await api(")
b=t.index("  const data=safeJson(raw),items=data.reviews;",a)
call=t[a:b].replace("JSON.stringify(rows)","JSON.stringify(part)")
c=t.index("  if(proj().id!==pid||seg().id!==sid)return;",b)
replacement="""  async function requestBatch(part){
"""+call+"""  const data=safeJson(raw);
  const items=Array.isArray(data)?data:(data.reviews||data.sentences);
  if(!Array.isArray(items)||items.length!==part.length)throw Error('AI 返回句数不一致');
  const lookup=new Map();
  for(let i=0;i<items.length;i++){
   const item=items[i],idx=Number(item.index??part[i].index);
   const proposed=item.proposed??item.revised??item.translation;
   if(!part.some(row=>row.index===idx)||lookup.has(idx)||typeof proposed!=='string'||!proposed.trim())
    throw Error('AI 返回编号或建议译文不完整');
   lookup.set(idx,{proposed:proposed.trim(),reason:String(item.reason||'')});
  }
  if(lookup.size!==part.length)throw Error('AI 编号缺失');
  return part.map(row=>lookup.get(row.index));
  }
  const combined=[];
  for(let i=0;i<rows.length;i+=4){
   const part=rows.slice(i,i+4);
   try{combined.push(...await requestBatch(part));}
   catch(e){
    for(const row of part){
     try{combined.push(...await requestBatch([row]));}
     catch(err){throw Error('第 '+row.index+' 句审校失败：'+err.message+'。原有审校决定未被覆盖。');}
    }
   }
   if(proj().id!==pid||seg().id!==sid)return;
  }
  if(combined.length!==units.length)throw Error('AI 返回内容不完整，原有审校决定未被覆盖');
"""
t=t[:a]+replacement+t[c:]
t=t.replace("  startSentenceReview(s);","  reviewSetupOpen=false;\n  startSentenceReview(s);",1)
t=t.replace("item=lookup.get(i+1)","item=combined[i]",1)
assert "requestBatch" in t and "reviewSetupOpen=false;" in t and "JSON.stringify(part)" in t
s=s[:start]+t+s[end:]
p.write_text(s,encoding="utf-8")
print("Review AI requests are now batch-validated; prior decisions only change after complete success")
