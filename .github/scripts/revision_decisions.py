from pathlib import Path
p=Path("译者决策工作台_公开双模式版/atelier-core.html")
s=p.read_text(encoding="utf-8")
if "function buildReviewDecisions(" in s:
 print("Already integrated");quit()
s=s.replace('<button class="btn quiet" id="openDecision" type="button" title="进入逐项审校决策工作台">决策审校</button>','')
s=s.replace("$('openDecision').onclick=()=>{window.open('./','_blank','noopener')};","")
a=s.index('function action(html){');b=s.index('function panel(',a)
s=s[:a]+"function action(html){$('stageActions').innerHTML=html;}\n"+s[b:]
a=s.index('function renderRevision(){');b=s.index('function safeJson(raw){',a)
new=r'''function buildReviewDecisions(before,after){
 const tokenize=t=>String(t).match(/\s+|[\p{L}\p{N}]+|[^\p{L}\p{N}\s]/gu)||[];
 const a=tokenize(before),b=tokenize(after),n=a.length,m=b.length;
 if(n*m>90000)return [{start:0,end:before.length,old:before,proposed:after,choice:'pending',custom:'',qa:[]}];
 const dp=Array.from({length:n+1},()=>new Uint32Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0,pos=0,cur=null,res=[];
 const flush=()=>{if(cur&&cur.old!==cur.proposed)res.push(cur);cur=null};
 const open=()=>{if(!cur)cur={start:pos,end:pos,old:'',proposed:'',choice:'pending',custom:'',qa:[]}};
 while(i<n||j<m){
  if(i<n&&j<m&&a[i]===b[j]){flush();pos+=a[i++].length;j++;}
  else if(j<m&&(i===n||dp[i][j+1]>dp[i+1][j])){open();cur.proposed+=b[j++];}
  else{open();cur.old+=a[i];pos+=a[i++].length;cur.end=pos;}
 }
 flush();return res;
}
function mergeReviewDecisions(s){
 let pos=0,text='';
 for(const c of s.reviewDecisions||[]){
  if(c.start<pos||c.end>s.draft.length)throw Error('修改区间与初稿不匹配，请重新审校');
  text+=s.draft.slice(pos,c.start)+(c.choice==='accept'?c.proposed:c.choice==='custom'?c.custom:c.old);pos=c.end;
 }
 return text+s.draft.slice(pos);
}
function decisionHtml(s){
 const ds=s.reviewDecisions||[];
 if(!ds.length)return '<div class="muted">生成审校建议后，这里将出现逐项决策卡片。AI 没有修改时，可直接确认原初稿为二稿。</div>';
 return '<p class="muted">共 '+ds.length+' 处修改，待决定 '+ds.filter(x=>x.choice==='pending').length+' 处。所有决定完成后才能确认二稿。</p>'+ds.map((x,i)=>'<article class="issue"><div class="issue-head"><strong>修改 '+(i+1)+'</strong><span class="pill '+(x.choice==='pending'?'warn':'ok')+'">'+({pending:'待决定',accept:'已接受',keep:'保留初译',custom:'自行改写'}[x.choice]||'待决定')+'</span></div><div class="issue-quote"><b>初译：</b>'+E(x.old||'（原处为空）')+'</div><p class="suggestion"><b>AI 建议：</b>'+E(x.proposed||'（删除）')+'</p>'+(x.reason?'<p>'+E(x.reason)+'</p>':'')+'<div class="review-options">'+[['accept','接受建议'],['keep','保留初译'],['custom','自行改写'],['ask','向 AI 追问此处']].map(([k,v])=>'<button type="button" class="btn small" data-decision="'+k+'" data-idx="'+i+'" '+(s.revision?'disabled':'')+'>'+v+'</button>').join('')+'</div>'+(x.choice==='custom'?'<textarea class="field" style="width:100%;margin-top:8px" data-custom="'+i+'" '+(s.revision?'readonly':'')+'>'+E(x.custom)+'</textarea>':'')+(x.qa||[]).map(q=>'<p><b>'+(q.role==='user'?'追问':'AI 回复')+'：</b>'+E(q.text)+'</p>').join('')+'</article>').join('');
}
function updateDecisionPreview(s,refresh=true){
 s.revInput=mergeReviewDecisions(s);const t=$('revisionEditor');if(t)t.value=s.revInput;
 const d=$('diffText');if(d)d.innerHTML=diffHtml(s.draft,s.revInput);
 if(refresh){const c=$('decisionList');if(c)c.innerHTML=decisionHtml(s);bindDecisionHandlers(s);}
 persist();
}
function bindDecisionHandlers(s){
 document.querySelectorAll('[data-decision]').forEach(btn=>btn.onclick=async()=>{
  if(s.revision)return;const idx=Number(btn.dataset.idx),x=s.reviewDecisions?.[idx];if(!x)return;
  const mode=btn.dataset.decision;
  if(mode==='ask'){
   if(proj().mode==='local')return toast('请先切换到 AI 模式');
   const q=prompt('向 AI 追问这处修改','这处修改是否必要？请结合原文解释理由。');if(!q?.trim())return;
   x.qa??=[];x.qa.push({role:'user',text:q});updateDecisionPreview(s);
   const pid=proj().id,sid=s.id;
   await withBusy('逐项追问',async()=>{
    const response=await api([{role:'system',content:'你是翻译审校顾问。只讨论这处修改，不自动更改译文。'+baseContext(s)},{role:'user',content:'固定初译：'+s.draft+'\n修改前：'+x.old+'\nAI 建议：'+x.proposed+'\n译员追问：'+q}],.25);
    if(proj().id!==pid||seg().id!==sid)return;
    x.qa.push({role:'assistant',text:response});updateDecisionPreview(s);
   });return;
  }
  x.choice=mode;if(mode==='custom')x.custom=x.custom||x.proposed;
  updateDecisionPreview(s);
 });
 document.querySelectorAll('[data-custom]').forEach(t=>t.oninput=()=>{
  const x=s.reviewDecisions?.[Number(t.dataset.custom)];if(!x||s.revision)return;
  x.choice='custom';x.custom=t.value;updateDecisionPreview(s,false);
 });
}
function renderRevision(){
 if(proj().kind==='parameter')return renderParamRevision();
 const s=seg();if(!s.draft){action('');return missing('先锁定初稿，再开始逐项审校','draft');}
 const locked=!!s.revision,ds=s.reviewDecisions||[],txt=s.revision||s.revInput;
 action('<button class="btn" id="backDraft">← 初稿</button><button class="btn primary" id="toFinal">'+(locked?'进入终稿':'确认二稿并进入终稿')+' →</button>');
 $('stageContent').innerHTML='<div class="summary-panel"><div><strong>二稿 · 逐项审校决策</strong><small>逐项接受、保留或改写 AI 建议后确认二稿</small></div><div class="review-options">'+(locked?'<button class="btn small" id="rebuildRevision">重新审校</button>':'<button class="btn" id="runReview">AI 审校初稿</button><button class="btn primary" id="lockRevision">确认二稿</button>')+'</div></div><div class="review-layout"><div><div class="columns">'+panel('初稿 · 固定','<div class="readbox">'+E(s.draft)+'</div>')+panel('决策合成的二稿','<textarea class="editor-text readonly" readonly id="revisionEditor">'+E(txt)+'</textarea>')+'</div>'+panel('修改对照','<div class="pane-content"><div class="diff-view" id="diffText">'+(txt?diffHtml(s.draft,txt):'等待 AI 审校')+'</div></div>')+'</div><div class="review-right">'+panel('逐项决策','<div class="pane-content"><div class="source-ref"><strong>核对原文</strong><div>'+E(s.source)+'</div></div><div id="decisionList" class="issue-list">'+decisionHtml(s)+'</div></div>')+(locked?'':panel('审校指令','<div class="pane-content"><textarea class="field prompt-area" id="reviewPrompt">'+E(uiReview[s.id]??defaultReviewPrompt)+'</textarea></div>'))+'</div></div>';
 $('backDraft').onclick=()=>go('draft');
 $('toFinal').onclick=()=>{if(!seg().revision){lockRevision();if(!seg().revision)return;}go('final');};
 if(locked){$('rebuildRevision').onclick=()=>{if(!confirm('重新审校会清除终稿，并保存现有二稿到历史记录。确定？'))return;s.history.push({text:s.revision,at:time(),why:'旧二稿'});s.revision='';s.revInput='';s.revMeta=null;s.reviewDecisions=[];resetFromRevision(s);persist();draw();};}
 else{$('runReview').onclick=runReview;$('lockRevision').onclick=lockRevision;$('reviewPrompt').addEventListener('input',e=>uiReview[s.id]=e.target.value);bindDecisionHandlers(s);}
}
function lockRevision(){
 const s=seg(),ds=s.reviewDecisions||[];
 if(ds.some(x=>x.choice==='pending'))return toast('仍有未处理的修改，请逐项决定');
 if(ds.some(x=>x.choice==='custom'&&!x.custom.trim()))return toast('自行改写不能为空');
 const val=ds.length?mergeReviewDecisions(s):s.draft;
 if(!val.trim())return toast('二稿为空，无法确认');
 s.revInput=val;s.revision=val;s.revMeta={at:time(),kind:ds.length?'译员逐项决策':'初稿确认'};persist();draw();toast('二稿已确认');
}
'''
s=s[:a]+new+s[b:]
a=s.index('async function runReview(){');b=s.index('async function askAI(){',a)
run=r'''async function runReview(){
 const s=seg(),promptText=$('reviewPrompt').value.trim()||defaultReviewPrompt;
 if(s.reviewDecisions?.some(x=>x.choice!=='pending')&&!confirm('重新生成会清除本轮逐项决定，确定？'))return;
 const sid=s.id,pid=proj().id;
 await withBusy('AI 审校',async()=>{
  const raw=await api([{role:'system',content:'你是资深翻译审校员。输出 JSON 对象，包含 revisedTranslation 完整建议译文与 issues 数组，每项可包含 quote、problem、suggestion、reason。不要 Markdown。只修改必要内容，不添加原文之外的信息。'},{role:'user',content:baseContext(s)+'\n固定初稿：\n'+s.draft+'\n审校要求：\n'+promptText}],.15);
  const obj=safeJson(raw),candidate=obj.revisedTranslation||obj.polishedTranslation;
  if(typeof candidate!=='string'||!candidate.trim())throw Error('AI 未返回有效建议译文，原稿保持不变');
  if(proj().id!==pid||seg().id!==sid)return;
  const ds=buildReviewDecisions(s.draft,candidate),issues=Array.isArray(obj.issues)?obj.issues:[];
  ds.forEach(c=>{const m=issues.find(x=>x.quote&&(c.old.includes(String(x.quote))||String(x.quote).includes(c.old))&&c.old);if(m)c.reason=String(m.reason||m.problem||'');});
  s.issues=issues.slice(0,30);s.reviewDecisions=ds;s.revInput=s.draft;s.reviewPromptUsed=promptText;
  persist();draw();toast(ds.length?'已生成 '+ds.length+' 处修改，请逐项审校':'AI 未提出实质修改，可直接确认二稿');
 });
}
'''
s=s[:a]+run+s[b:]
s=s.replace("s.issues=[];s.final='';","s.issues=[];s.reviewDecisions=[];s.final='';")
s=s.replace("s.issues||=[];s.history||=[];","s.issues||=[];s.reviewDecisions||=[];s.history||=[];")
p.write_text(s,encoding="utf-8")
print('Integrated review decisions in second draft')
