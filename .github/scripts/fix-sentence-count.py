from pathlib import Path
p=Path('译者决策工作台_公开双模式版/atelier-core.html')
s=p.read_text(encoding='utf-8')
a=s.index('async function runReviewNow(){')
b=s.index('async function askAI(){',a)
part=s[a:b]
needle="""  const combined=[];
  for(let i=0;i<rows.length;i+=4){"""
replacement="""  async function requestStandalone(row){
   const prompt='只审校以下这一句。不要拆句、增加句子或返回数组。输出一个 JSON 对象：{"proposed":"完整建议译文","reason":"修改理由"}。\\n原文上下文：'+s.source+'\\n初译：'+row.initial+'\\n审校要求：'+promptText;
   const raw=await api([
    {role:'system',content:'资深翻译审校员。只输出包含 proposed 和 reason 的 JSON 对象。proposed 必须是一条完整的建议译文；不需要修改就原样返回初译。'},
    {role:'user',content:prompt}
   ],.15);
   let value;
   try{value=safeJson(raw);}catch(e){throw Error('AI 单句结果不是有效 JSON');}
   const item=Array.isArray(value)?(value.length===1?value[0]:null):Array.isArray(value?.reviews)?(value.reviews.length===1?value.reviews[0]:null):value;
   const proposed=item?.proposed??item?.revised??item?.translation;
   if(typeof proposed!=='string'||!proposed.trim())throw Error('AI 单句结果缺少完整建议译文');
   return {proposed:proposed.trim(),reason:String(item.reason||'')};
  }
  const combined=[];
  for(let i=0;i<rows.length;i+=4){"""
assert part.count(needle)==1, 'review batch loop anchor missing'
part=part.replace(needle,replacement,1)
old="""     catch(err){throw Error('第 '+row.index+' 句审校失败：'+err.message+'。原有审校决定未被覆盖。');}"""
new="""     catch(err){
      // Network, authentication and upstream errors must remain visible.
      // Only model-output shape errors may be converted into a pending
      // manual-review item, never silently accepted as an AI edit.
      const shapeError=/返回句数|编号|JSON|译文不完整|建议译文/.test(err.message);
      if(!shapeError)throw Error('第 '+row.index+' 句审校请求失败：'+err.message+'。原有审校决定未被覆盖。');
      try{combined.push(await requestStandalone(row));}
      catch(rescueError){
       if(!/JSON|建议译文/.test(rescueError.message))
        throw Error('第 '+row.index+' 句审校请求失败：'+rescueError.message+'。原有审校决定未被覆盖。');
       combined.push({proposed:row.initial,reason:'此句 AI 返回格式异常，尚未完成审校。请人工核对或重新运行 AI 审校。',needsManualReview:true});
      }
     }"""
assert part.count(old)==1, 'singleton failure branch changed; patch aborted'
part=part.replace(old,new,1)
old2="""x.proposed=item.proposed.trim();x.reason=String(item.reason||'');"""
new2="""x.proposed=item.proposed.trim();x.reason=String(item.reason||'');
    if(item.needsManualReview){x.choice='question';x.questionNote='AI 未能可靠返回当前句的审校建议，须人工核对。';}"""
assert part.count(old2)==1
part=part.replace(old2,new2,1)
part=part.replace("""persist();draw();toast('已生成 '+units.length+' 句审校建议，请逐句决策');""","""persist();draw();const unresolved=combined.filter(x=>x.needsManualReview).length;toast(unresolved?'已生成审校记录，其中 '+unresolved+' 句需人工复核，原句未被擅自改写':'已生成 '+units.length+' 句审校建议，请逐句决策');""",1)
s=s[:a]+part+s[b:]
p.write_text(s,encoding='utf-8')
print('AI shape mismatch now retries with an isolated single-sentence JSON object and explicitly flags unresolved suggestions')

# Re-apply with updated review regression expectations.
