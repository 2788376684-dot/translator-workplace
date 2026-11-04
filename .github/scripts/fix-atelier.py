from pathlib import Path
p=Path('译者决策工作台_公开双模式版/atelier-core.html')
s=p.read_text()
def one(a,b,label):
 global s
 n=s.count(a)
 if n!=1: raise RuntimeError(f'{label}: expected 1 match, found {n}')
 s=s.replace(a,b,1)
one('boot();\n})();\n</script>\n<script id="week8-packed"',"if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();\n})();\n</script>\n<script id=\"week8-packed\"",'startup')
one("const txt=$('week8-packed').textContent.trim(),bytes=Uint8Array.from(atob(txt),c=>c.charCodeAt(0));","const packed=$('week8-packed');if(!packed)throw new Error('OCR 资源尚未载入，请刷新页面重试');const txt=packed.textContent.trim(),bytes=Uint8Array.from(atob(txt),c=>c.charCodeAt(0));",'OCR')
helper='''function ensureDraftDirection(source){
 const p=proj(),han=(source.match(/[\\u3400-\\u9fff]/g)||[]).length,latin=(source.match(/[A-Za-z]/g)||[]).length;
 if(latin>=8&&latin>han*4&&p.sourceLang==='中文'&&p.targetLang==='英语'){
  p.sourceLang='英语';p.targetLang='中文';persist();toast('检测到英文原文，已调整为英译中');
 }else if(han>=3&&han>latin*2&&p.sourceLang==='英语'&&p.targetLang==='中文'){
  p.sourceLang='中文';p.targetLang='英语';persist();toast('检测到中文原文，已调整为中译英');
 }
 if(p.sourceLang===p.targetLang)throw new Error('源语言与目标语言相同，请在项目设置中修改方向');
 if((latin>=8&&latin>han*4&&p.sourceLang==='中文')||(han>=3&&han>latin*2&&p.sourceLang==='英语'))throw new Error('原文语言和项目源语言设置不符，请检查项目设置');
 return p.sourceLang+' → '+p.targetLang;
}
'''
one('async function runDraft(){',helper+'async function runDraft(){','helper')
one("let sid=s.id,pid=proj().id;await withBusy('生成初稿',async()=>{const out=await api([{role:'system',content:'你是译员。按用户的本次具体指令完成任务。除非用户要求说明，否则只返回译文。'},{role:'user',content:`${baseContext(s)}\\n\\n本次 Prompt：\\n${text}`}],.35);", "let sid=s.id,pid=proj().id;await withBusy('生成初稿',async()=>{const direction=ensureDraftDirection(s.source);const out=await api([{role:'system',content:'你是专业译员。必须按照 '+direction+' 的方向翻译。必须输出目标语言，禁止原样复述原文或同语言润色。只返回译文。'},{role:'user',content:`${baseContext(s)}\\n\\n本次 Prompt：\\n${text}\\n\\n最终译文使用目标语言：${proj().targetLang}。`}],.35);",'AI direction')
one('if(proj().id!==pid||seg().id!==sid)return;s.draftInput=out;', "if(proj().id!==pid||seg().id!==sid)return;if(s.source.trim().length>=12&&out.trim()===s.source.trim())throw new Error('AI 返回内容与原文相同，已阻止保存。请核对翻译方向');s.draftInput=out;",'output guard')
one('<div class="more-tools" style="margin-top:12px"><button class="btn primary" id="runDraft">','<div class="more-tools" style="margin-top:12px"><span class="pill blue">翻译方向：${E(proj().sourceLang)} → ${E(proj().targetLang)}</span><button class="btn small" type="button" id="swapDraftDirection">切换方向</button></div><div class="more-tools" style="margin-top:12px"><button class="btn primary" id="runDraft">','UI')
one("$('runDraft').onclick=runDraft;}}", "$('runDraft').onclick=runDraft;$('swapDraftDirection').onclick=()=>{const p=proj();[p.sourceLang,p.targetLang]=[p.targetLang,p.sourceLang];persist();draw();};}}",'UI handler')
p.write_text(s)
print('Atelier patched')
