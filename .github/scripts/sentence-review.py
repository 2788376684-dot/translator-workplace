from pathlib import Path
p=Path("译者决策工作台_公开双模式版/atelier-core.html")
s=p.read_text(encoding="utf-8")
if "function sentenceReviewUnits(" in s:
 print("Already installed");raise SystemExit(0)
a=s.index("function buildReviewDecisions(")
b=s.index("function safeJson(raw){",a)
code=r'''function sentenceReviewUnits(text,lang){
 const v=String(text||'');
 if(!v.trim())return [];
 if(typeof Intl.Segmenter==='function')return Array.from(new Intl.Segmenter(lang==='中文'?'zh':'en',{granularity:'sentence'}).segment(v),x=>({start:x.index,end:x.index+x.segment.length,old:x.segment})).filter(x=>x.old.trim());
 const out=[],regex=/[^。！？!?\.]+[。！？!?\.]*\s*/g;let m;
 while((m=regex.exec(v)))if(m[0].trim())out.push({start:m.index,end:m.index+m[0].length,old:m[0]});
 return out;
}
function sentenceReviewReady(s){return (s.reviewDecisions||[]).length>0&&s.reviewDecisions.every(x=>x.unitType==='sentence');}
function startSentenceReview(s){
 s.reviewDecisions=sentenceReviewUnits(s.draft,proj().targetLang).map(x=>Object.assign({},x,{unitType:'sentence',proposed:x.old.trim(),choice:'pending',custom:'',reason:'',qa:[]}));
 s.reviewFocus=0;s.revInput=s.draft;s.revOrigin='逐句审校';persist();
}
function mergeReviewChoices(s){
 let pos=0,out='';
 for(const x of s.reviewDecisions||[]){
  if(x.start<pos||x.end>s.draft.length)throw Error('句子位置已失效，请重新审校');
  out+=s.draft.slice(pos,x.start);
  if(x.choice==='keep'||x.choice==='pending')out+=x.old;
  else out+=String(x.choice==='custom'?x.custom:x.proposed).trimEnd()+(x.old.match(/\s*$/)||[''])[0];
  pos=x.end;
 }
 return out+s.draft.slice(pos);
}
function showSentenceReview(s,locked){
 const ds=s.reviewDecisions||[],valid=sentenceReviewReady(s),total=ds.length;
 const pending=ds.filter(x=>x.choice==='pending').length;
 let html='<div class="summary-panel"><div><strong>二稿 · 逐句审校</strong><div><small>一次处理一句，已完成 '+(total-pending)+' / '+total+' 句</small></div></div><div class="review-options"><span class="pill '+(pending?'warn':'ok')+'">待确认 '+pending+' 句</span>';
 if(!locked)html+='<button class="btn" id="runReview">AI 逐句审校</button><button class="btn primary" id="lockRevision">确认二稿</button>';
 else html+='<span class="pill ok">二稿已锁定</span>';
 html+='</div></div>';
 if(!valid){
  html+='<section class="pane"><div class="pane-content"><p class="panel-note">当前项目仍保存旧版成段审校数据。它们不会自动清除；重新建立逐句审校前请先导出备份。</p>';
  if(!locked)html+='<button class="btn primary" id="manualSentenceReview">开始逐句审校</button>';
  html+='</div></section><details class="export-pane"><summary>查看原文与已有二稿</summary><div class="readbox">'+E(s.source)+'</div><div class="readbox">'+E(s.revision||s.revInput||s.draft)+'</div></details>';
  return html;
 }
 const i=Math.max(0,Math.min(Number(s.reviewFocus)||0,total-1)),x=ds[i];
 const su=sentenceReviewUnits(s.source,proj().sourceLang);
 const aligned=su.length===ds.length;
 const source=aligned?su[i].old.trim():s.source;
 html+='<div style="max-width:1030px;margin:auto"><section class="pane"><header class="pane-top"><strong>第 '+(i+1)+' / '+total+' 句</strong><span class="pill '+(x.choice==='pending'?'warn':'ok')+'">'+(x.choice==='pending'?'待决定':x.choice==='accept'?'接受建议':x.choice==='keep'?'保留初译':'自行改写')+'</span></header>';
 html+='<div class="pane-content" style="padding:18px 20px"><div class="review-options" style="margin-bottom:14px"><button class="btn small" id="sentencePrev" '+(i===0?'disabled':'')+'>← 上一句</button><button class="btn small" id="sentenceNext" '+(i===total-1?'disabled':'')+'>下一句 →</button></div>';
 html+='<div class="source-ref"><strong>'+(aligned?'对应原文':'原文上下文 · 中英句数不同，请核对对应关系')+'</strong><div>'+E(source)+'</div></div>';
 html+='<div style="margin:12px 0"><span class="input-label">初译 · 固定</span><div class="readbox" style="min-height:0!important;padding:8px 0;font-size:16px">'+E(x.old.trim())+'</div></div>';
 html+='<div style="margin:12px 0"><span class="input-label">AI 修改建议</span><div class="readbox" style="min-height:0!important;padding:8px 0;font-size:16px">'+E(x.proposed.trim())+'</div>'+(x.reason?'<p class="panel-note">修改理由：'+E(x.reason)+'</p>':'')+'</div>';
 html+='<div class="review-options" style="padding-top:14px;border-top:1px solid var(--stroke)">';
 for(const [kind,label] of [['accept','接受建议'],['keep','保留初译'],['custom','自行改写'],['ask','向 AI 追问此处']])html+='<button class="btn '+(x.choice===kind?'primary':'')+'" data-sentence-action="'+kind+'" '+(locked?'disabled':'')+'>'+label+'</button>';
 html+='</div>';
 if(x.choice==='custom')html+='<label class="field" style="margin-top:14px">我的改写<textarea id="sentenceCustom" rows="5" style="width:100%;resize:vertical" '+(locked?'readonly':'')+'>'+E(x.custom)+'</textarea></label>';
 if((x.qa||[]).length)html+='<details open style="margin-top:14px"><summary>此句的 AI 追问记录</summary>'+x.qa.map(q=>'<p class="panel-note" style="white-space:pre-wrap"><strong>'+(q.role==='user'?'我':'AI')+'：</strong>'+E(q.text)+'</p>').join('')+'</details>';
 html+='</div></section>';
 html+='<div class="pane" style="margin-top:10px;padding:10px 14px"><div class="review-options"><span class="muted">句子导航</span>'+ds.map((v,j)=>'<button class="btn small '+(j===i?'primary':'')+'" data-sentence-jump="'+j+'">'+(j+1)+(v.choice==='pending'?' ·':' ✓')+'</button>').join('')+'</div></div>';
 html+='<details class="export-pane" style="margin-top:10px"><summary>展开全文对照和审校设置</summary><div class="pane-content"><strong>完整原文</strong><div class="readbox">'+E(s.source)+'</div><strong>合成二稿</strong><div class="readbox">'+E(mergeReviewChoices(s))+'</div><strong>差异对照</strong><div class="diff-view">'+diffHtml(s.draft,mergeReviewChoices(s))+'</div>';
 if(!locked)html+='<label class="field">审校指令<textarea id="reviewPrompt" rows="4">'+E(uiReview[s.id]??defaultReviewPrompt)+'</textarea></label>';
 html+='</div></details></div>';
 return html;
}
function bindSentenceReview(s,locked){
 const ds=s.reviewDecisions||[];
 function focus(i){s.reviewFocus=Math.max(0,Math.min(i,ds.length-1));persist();draw();}
 if($('sentencePrev'))$('sentencePrev').onclick=()=>focus((s.reviewFocus||0)-1);
 if($('sentenceNext'))$('sentenceNext').onclick=()=>focus((s.reviewFocus||0)+1);
 document.querySelectorAll('[data-sentence-jump]').forEach(b=>b.onclick=()=>focus(Number(b.dataset.sentenceJump)));
 if($('manualSentenceReview'))$('manualSentenceReview').onclick=()=>{
  if(ds.some(x=>x.choice!=='pending')&&!confirm('重新建立将重置未锁定的旧审校决策。请先备份项目。确定继续？'))return;
  startSentenceReview(s);draw();
 };
 if(locked)return;
 document.querySelectorAll('[data-sentence-action]').forEach(btn=>btn.onclick=()=>{
  const i=s.reviewFocus||0,x=ds[i];if(!x)return;
  const kind=btn.dataset.sentenceAction;
  if(kind==='ask'){askReviewPoint(s,i);return;}
  x.choice=kind;if(kind==='custom')x.custom=x.custom||x.proposed;
  s.revInput=mergeReviewChoices(s);persist();
  if(kind==='custom'){draw();$('sentenceCustom')?.focus();return;}
  const next=ds.findIndex((z,j)=>j>i&&z.choice==='pending');if(next>=0)s.reviewFocus=next;
  draw();
 });
 if($('sentenceCustom'))$('sentenceCustom').oninput=e=>{const x=ds[s.reviewFocus||0];x.custom=e.target.value;s.revInput=mergeReviewChoices(s);persist();};
 if($('reviewPrompt'))$('reviewPrompt').oninput=e=>uiReview[s.id]=e.target.value;
}
async function askReviewPoint(s,i){
 const x=s.reviewDecisions?.[i];if(!x||s.revision)return;
 const question=prompt('针对当前句子，向 AI 追问什么？','这处修改是否必要？请结合上下文解释。');
 if(!question?.trim())return;
 if(proj().mode==='local')return toast('离线模式无法调用 AI');
 x.qa??=[];x.qa.push({role:'user',text:question.trim()});persist();draw();
 const pid=proj().id,sid=s.id;
 await withBusy('逐句追问',async()=>{
  const answer=await api([{role:'system',content:'你是专业翻译审校顾问。只解释当前句子的修改，不自动更改译文或决策。'},{role:'user',content:baseContext(s)+'\n初译：'+x.old+'\nAI 建议：'+x.proposed+'\n追问：'+question.trim()}],.3);
  x.qa.push({role:'assistant',text:answer});
  if(proj().id===pid&&seg().id===sid){persist();draw();}
 });
}
function renderRevision(){
 if(proj().kind==='parameter')return renderParamRevision();
 const s=seg();
 action('<button class="btn" id="backDraft">← 初稿</button><button class="btn primary" id="toFinal">'+(s.revision?'进入终稿':'确认二稿并进入终稿')+' →</button>');
 if(!s.draft)return missing('请先锁定初稿','draft');
 const locked=!!s.revision;
 $('stageContent').innerHTML=showSentenceReview(s,locked);
 $('backDraft').onclick=()=>go('draft');
 $('toFinal').onclick=()=>{if(!seg().revision){lockRevision();if(!seg().revision)return;}go('final');};
 if($('runReview'))$('runReview').onclick=runReview;
 if($('lockRevision'))$('lockRevision').onclick=lockRevision;
 bindSentenceReview(s,locked);
 if(locked){const bar=document.querySelector('.summary-panel .review-options');
  if(bar){const b=document.createElement('button');b.className='btn small';b.textContent='重新逐句审校';
   b.onclick=()=>{if(!confirm('重新审校会清除当前二稿及终稿。原二稿会进入历史。请先备份。确定？'))return;
    s.history.push({text:s.revision,at:time(),why:'历史二稿'});s.revision='';s.revInput='';s.revMeta=null;s.reviewDecisions=[];resetFromRevision(s);persist();draw();};
   bar.append(b);}
 }
}
function lockRevision(){
 const s=seg();
 if(!sentenceReviewReady(s))return toast('请先开始逐句审校');
 const ds=s.reviewDecisions;
 if(ds.some(x=>x.choice==='pending'))return toast('还有 '+ds.filter(x=>x.choice==='pending').length+' 句待确认');
 if(ds.some(x=>x.choice==='custom'&&!x.custom.trim()))return toast('自行改写内容不能为空');
 const value=mergeReviewChoices(s);
 if(!value.trim())return toast('二稿为空');
 s.revInput=value;s.revision=value;s.revMeta={at:time(),kind:'译员逐句决策'};persist();draw();toast('二稿已锁定');
}
'''
s=s[:a]+code+s[b:]
a=s.index("async function runReview(){")
b=s.index("async function askAI(){",a)
review=r'''async function runReview(){
 const s=seg(),units=sentenceReviewUnits(s.draft,proj().targetLang);
 if(!units.length)return toast('初稿为空');
 if((s.reviewDecisions||[]).some(x=>x.choice!=='pending')&&!confirm('重新分析将重置未锁定的审校决策。请先导出备份。确认继续？'))return;
 const promptText=$('reviewPrompt')?.value.trim()||uiReview[s.id]||defaultReviewPrompt;
 const src=sentenceReviewUnits(s.source,proj().sourceLang),aligned=src.length===units.length;
 const rows=units.map((x,i)=>({index:i+1,initial:x.old.trim(),source:aligned?src[i].old.trim():null}));
 const pid=proj().id,sid=s.id;
 await withBusy('AI 逐句审校',async()=>{
  const raw=await api([{role:'system',content:'你是资深翻译审校员。仅输出有效 JSON 对象，形如 {"reviews":[{"index":1,"proposed":"该句完整建议译文","reason":"修改依据"}]}。必须对输入的每一句返回一条，index 从 1 连续编号。每条 proposed 仅包含当前句的完整建议译文。没有修改也必须返回原句，理由可为空。不得遗漏、合并或新增数组项目。忠实原文，不补造事实。'},{role:'user',content:baseContext(s)+'\n逐句初译：\n'+JSON.stringify(rows)+'\n'+(aligned?'源语句数相同，可作为定位参考，但须核对语义。':'源语与译文句数不同，禁止假设逐句严格对应，须核对完整原文。')+'\n审校要求：'+promptText}],.15);
  const data=safeJson(raw),items=data.reviews;
  if(!Array.isArray(items)||items.length!==units.length)throw Error('AI 返回句数不一致，原有审校数据已保留');
  const lookup=new Map();
  for(const x of items){const n=Number(x.index);if(!Number.isInteger(n)||n<1||n>units.length||lookup.has(n)||typeof x.proposed!=='string'||!x.proposed.trim())throw Error('AI 返回编号重复或缺少建议，请重试');lookup.set(n,x);}
  if(lookup.size!==units.length)throw Error('AI 句子编号不完整');
  if(proj().id!==pid||seg().id!==sid)return;
  startSentenceReview(s);
  for(let i=0;i<units.length;i++){const x=s.reviewDecisions[i],item=lookup.get(i+1);x.proposed=item.proposed.trim();x.reason=String(item.reason||'');}
  s.reviewPromptUsed=promptText;s.issues=[];persist();draw();toast('已生成 '+units.length+' 句审校建议，请逐句决策');
 });
}
'''
s=s[:a]+review+s[b:]
p.write_text(s,encoding="utf-8")
print("Sentence-by-sentence revision UI installed")
