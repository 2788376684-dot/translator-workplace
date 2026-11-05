from pathlib import Path
import re
p=Path("译者决策工作台_公开双模式版/atelier-core.html")
s=p.read_text(encoding="utf-8")
def replace_one(old,new,label):
 global s
 n=s.count(old)
 if n!=1: raise RuntimeError(label+": expected 1, got "+str(n))
 s=s.replace(old,new,1)
def insert_before(anchor,new,label):
 replace_one(anchor,new+anchor,label)

# A. Sentence-review instructions open before starting AI, not tucked inside full-text comparison.
insert_before("function showSentenceReview(s,locked){", """let reviewSetupOpen=false;
function runReview(){
 reviewSetupOpen=true;draw();
 const input=$('reviewPrompt');
 if(input){input.focus();input.scrollIntoView({block:'center',behavior:'smooth'});}
}
""","review setup controls")
replace_one("async function runReview(){","async function runReviewNow(){reviewSetupOpen=false;","runReview actual")
replace_one("html+='</div></div>';\n if(!valid){","""html+='</div></div>';
 if(!locked&&reviewSetupOpen){
  html+='<section class="pane tw-review-settings"><header class="pane-top"><strong>AI 逐句审校 · 审校设置</strong></header><div class="pane-content"><p class="panel-note">确认审校要求后开始生成逐句建议；原有决策不会在此阶段被覆盖。</p><textarea class="field" id="reviewPrompt" rows="5" style="width:100%;resize:vertical">'+E(uiReview[s.id]??defaultReviewPrompt)+'</textarea><div class="review-options" style="margin-top:10px"><button class="btn primary" id="confirmReviewRun">开始 AI 逐句审校</button><button class="btn" id="cancelReviewRun">取消</button></div></div></section>';
 }
 if(!valid){""","review setup panel")
replace_one("html+='<details class=\"export-pane\" style=\"margin-top:10px\"><summary>展开全文对照和审校设置</summary>","html+='<details class=\"export-pane\" style=\"margin-top:10px\"><summary>展开全文对照</summary>","separate full compare")
replace_one(" if(!locked)html+='<label class=\"field\">审校指令<textarea id=\"reviewPrompt\" rows=\"4\">'+E(uiReview[s.id]??defaultReviewPrompt)+'</textarea></label>';","", "remove nested review prompt")
replace_one(" if(locked)return;\n document.querySelectorAll('[data-sentence-action]')",""" if($('confirmReviewRun'))$('confirmReviewRun').onclick=runReviewNow;
 if($('cancelReviewRun'))$('cancelReviewRun').onclick=()=>{reviewSetupOpen=false;draw();};
 if($('reviewPrompt'))$('reviewPrompt').oninput=e=>uiReview[s.id]=e.target.value;
 if(locked)return;
 document.querySelectorAll('[data-sentence-action]')""","bind review settings")

# B. Question flag is a deliberate unresolved state with persisted explanation.
replace_one("if(x.choice==='keep'||x.choice==='pending')out+=x.old;","if(x.choice==='keep'||x.choice==='pending'||x.choice==='question')out+=x.old;","question preserves initial")
replace_one("const pending=ds.filter(x=>x.choice==='pending').length;","const pending=ds.filter(x=>x.choice==='pending'||x.choice==='question').length;","question pending count")
replace_one("x.choice==='keep'?'保留初译':'自行改写'","x.choice==='keep'?'保留初译':x.choice==='question'?'标为疑问':'自行改写'","question badge")
replace_one("['ask','向 AI 追问此处']])","['ask','向 AI 追问此处'],['question','标为疑问']])","question action")
replace_one("if(x.choice==='custom')html+='<label","""if(x.choice==='question')html+='<label class="tw-question-note">疑问记录<textarea id="sentenceQuestionNote" rows="3" placeholder="记录待核实的术语、语义或上下文问题">'+E(x.questionNote||'')+'</textarea></label>';
 if(x.choice==='custom')html+='<label""","question textarea")
replace_one("+(v.choice==='pending'?' ·':' ✓')","+(v.choice==='question'?' ?':v.choice==='pending'?' ·':' ✓')","question navigation")
replace_one("if(kind==='ask'){askReviewPoint(s,i);return;}","if(kind==='ask'){x.askOpen=true;draw();$('sentenceAskInput')?.focus();return;}","open inline followup")
replace_one("if(kind==='custom')x.custom=x.custom||x.proposed;","if(kind==='custom')x.custom=x.custom||x.proposed;","noop check") if False else None
replace_one("if($('sentenceCustom'))$('sentenceCustom').oninput=e=>{","""if($('sentenceQuestionNote'))$('sentenceQuestionNote').oninput=e=>{
  const x=ds[s.reviewFocus||0];if(!x)return;x.questionNote=e.target.value;persist();
 };
 if($('sentenceAskSend'))$('sentenceAskSend').onclick=()=>askReviewPoint(s,s.reviewFocus||0);
 if($('sentenceAskInput'))$('sentenceAskInput').onkeydown=e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter')askReviewPoint(s,s.reviewFocus||0);
 };
 if($('sentenceCustom'))$('sentenceCustom').oninput=e=>{""","question and followup handlers")
replace_one("if(ds.some(x=>x.choice==='pending'))return toast('还有 '+ds.filter(x=>x.choice==='pending').length+' 句待确认');","if(ds.some(x=>x.choice==='pending'||x.choice==='question'))return toast('仍有待决定或标为疑问的句子，请先完成核实');","lock guard")
replace_one("if(kind==='custom'){draw();$('sentenceCustom')?.focus();return;}","if(kind==='custom'||kind==='question'){draw();(kind==='custom'?$('sentenceCustom'):$('sentenceQuestionNote'))?.focus();return;}","question focus")

# C. Inline followup replaces native browser prompt; existing chat remains stored per sentence.
replace_one(" const question=prompt('针对当前句子，向 AI 追问什么？','这处修改是否必要？请结合上下文解释。');"," const question=$('sentenceAskInput')?.value.trim();","remove native popup")
replace_one(" if(!question?.trim())return;\n if(proj().mode==='local')return toast('离线模式无法调用 AI');"," if(!question)return toast('请先输入追问内容');\n if(proj().mode==='local')return toast('离线模式无法调用 AI');","followup validation")
replace_one("x.qa??=[];x.qa.push({role:'user',text:question.trim()});persist();draw();","x.qa??=[];x.qa.push({role:'user',text:question});x.askOpen=true;persist();draw();","followup persistence")
replace_one(" if((x.qa||[]).length)html+='<details open style=\"margin-top:14px\"><summary>此句的 AI 追问记录</summary>'+x.qa.map(q=>'<p class=\"panel-note\" style=\"white-space:pre-wrap\"><strong>'+(q.role==='user'?'我':'AI')+'：</strong>'+E(q.text)+'</p>').join('')+'</details>';",""" if((x.qa||[]).length)html+='<section class="tw-review-chat"><strong>此句追问记录</strong>'+x.qa.map(q=>'<p class="tw-chat-bubble"><strong>'+(q.role==='user'?'我':'AI')+'：</strong>'+E(q.text)+'</p>').join('')+'</section>';
 if(x.askOpen&&!locked)html+='<section class="tw-review-chat"><strong>向 AI 追问当前句</strong><textarea id="sentenceAskInput" rows="3" placeholder="针对当前句子的词义、语境或修改理由提问"></textarea><div class="review-options"><button class="btn primary" id="sentenceAskSend">发送追问</button></div></section>';""","inline conversation")

# D. Fix final-page layout and make export action reliable with visible error feedback.
replace_one("const missing=p.segments.filter(s=>!s.final.trim());","const missing=p.segments.filter(s=>!String(s.final||'').trim());","robust export state")
replace_one("$('exportOpen').onclick=showExport; if(s.qa)renderQAInline();","""$('exportOpen').onclick=()=>{try{showExport();}catch(e){console.error('Export view error',e);toast('导出界面打开失败：'+e.message);}}; if(s.qa)renderQAInline();""","export click feedback")

# E. Style: balance text columns, remove chat blank space, make reasoning and notes readable.
style="""<style id="tw-ui-fixes-20261105">
.tw-review-settings{max-width:1030px;margin:10px auto 16px}
.tw-review-settings textarea,.tw-question-note textarea,.tw-review-chat textarea{box-sizing:border-box;width:100%;border:1px solid #cad4e2;border-radius:9px;padding:12px;font:15px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:white;color:#263244}
.tw-question-note{display:block;margin:14px 0;color:#48586e;font-size:14px;font-weight:600}
.tw-question-note textarea{display:block;margin-top:7px}
.tw-review-chat{margin:12px 0 0;padding:14px;border:1px solid #d9e3ed;border-radius:10px;background:#f8fafc}
.tw-review-chat>strong{display:block;margin-bottom:9px;font-size:14px}
.tw-chat-bubble{margin:6px 0;padding:9px 12px;border-radius:7px;background:white;white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;line-height:1.65}
.tw-review-chat .review-options{margin-top:9px}
#stageContent .pane-content .panel-note{font-size:14px;line-height:1.7}
.final-layout{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:14px!important;align-items:stretch}
.final-layout>.pane:nth-child(-n+2){min-width:0;min-height:400px;height:470px;display:flex;flex-direction:column;overflow:hidden}
.final-layout>.pane:nth-child(-n+2) .pane-content{min-height:0;flex:1;overflow:auto}
.final-layout>.pane:nth-child(-n+2) .readbox{overflow:auto;max-height:100%;box-sizing:border-box}
.final-layout #finalEditor{display:block;box-sizing:border-box;width:100%;min-height:0!important;height:100%!important;resize:vertical;line-height:1.8}
.final-layout>.assistant{grid-column:1 / -1;min-height:0!important}
.final-layout>.assistant .chat-log{min-height:0!important;max-height:235px!important;overflow:auto;padding:12px 16px}
.final-layout>.assistant .chat-entry{padding:12px 16px!important;display:flex;flex-direction:column;gap:9px}
.final-layout>.assistant .chat-entry textarea{min-height:96px!important;height:120px!important;box-sizing:border-box;width:100%}
.final-layout>.assistant .chat-entry .btn{align-self:flex-end;min-width:120px}
@media(max-width:760px){.final-layout{grid-template-columns:minmax(0,1fr)!important}.final-layout>.pane:nth-child(-n+2){height:390px}.final-layout>.assistant{grid-column:1}}
</style>"""
if 'tw-ui-fixes-20261105' not in s:
 s=s.replace("</head>",style+"</head>",1)
p.write_text(s,encoding="utf-8")
print("Seven-part workbench UI patch applied")
