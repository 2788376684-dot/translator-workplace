(()=>{
'use strict';
/* Passive, transport-observed AI activity feedback.
   Does not alter requests, their bodies, responses or core state. */
if(window.__thAiProgressInstalled)return;
window.__thAiProgressInstalled=true;
const D=document;
let panel=null,title=null,detail=null,bar=null,close=null;
let active=null,finishedTimer=0,elapsedTimer=0,launchTimer=0;
let serial=0;
const installed=new WeakSet();
const text=x=>String(x||'').replace(/\s+/g,' ').trim();
function ensure(){
 if(panel)return;
 panel=D.createElement('aside');
 panel.id='th-ai-progress';
 panel.setAttribute('role','status');
 panel.setAttribute('aria-live','polite');
 panel.setAttribute('aria-atomic','true');
 panel.hidden=true;
 const top=D.createElement('div');top.className='th-ai-progress-head';
 const dot=D.createElement('span');dot.className='th-ai-progress-dot';dot.setAttribute('aria-hidden','true');
 title=D.createElement('strong');title.textContent='AI 任务';
 close=D.createElement('button');close.type='button';close.className='th-ai-progress-close';
 close.textContent='收起';close.setAttribute('aria-label','收起 AI 状态');
 close.addEventListener('click',()=>{panel.hidden=true;});
 top.append(dot,title,close);
 detail=D.createElement('p');detail.className='th-ai-progress-detail';
 bar=D.createElement('div');bar.className='th-ai-progress-track';
 const fill=D.createElement('div');fill.className='th-ai-progress-fill';bar.append(fill);
 panel.append(top,detail,bar);D.body.append(panel);
}
function labelFor(s){
 const name=text(s);
 if(/审校/.test(name))return 'AI 逐句审校';
 if(/初稿|翻译|生成/.test(name))return 'AI 生成初稿';
 if(/追问|提问|发送问题|咨询|对话/.test(name))return 'AI 追问';
 return 'AI 请求';
}
function setPhase(phase,message){
 ensure();panel.hidden=false;
 panel.dataset.phase=phase;
 title.textContent=(active?.label||'AI 请求')+' · '+({starting:'已点击',running:'进行中',checking:'处理中',success:'请求结束',error:'发生错误'}[phase]||phase);
 detail.textContent=message;
 close.hidden=phase==='starting'||phase==='running'||phase==='checking';
 bar.setAttribute('role','progressbar');
 bar.setAttribute('aria-label','AI 任务状态');
 if(phase==='starting'||phase==='running'||phase==='checking'){
  bar.removeAttribute('aria-valuenow');
  bar.setAttribute('aria-valuetext','运行中，进度无法按百分比计算');
 }else{
  bar.setAttribute('aria-valuenow',phase==='success'?'100':'0');
  bar.setAttribute('aria-valuetext',phase==='error'?'请求失败':'请求已结束');
 }
}
function clearTimers(){
 window.clearTimeout(finishedTimer);window.clearTimeout(launchTimer);window.clearInterval(elapsedTimer);
}
function start(label,waiting=true){
 clearTimers();
 active={id:++serial,label:labelFor(label),targetSentences:D.querySelectorAll('[data-sentence-jump]').length,started:Date.now(),requests:0,replies:0,
  inflight:0,failures:0,networkSeen:false,latestError:''};
 setPhase('starting','已收到操作，正在启动 AI 请求…');
 if(waiting){
  const id=active.id;
  launchTimer=window.setTimeout(()=>{
   if(!active||active.id!==id||active.networkSeen)return;
   setPhase('error','尚未发起模型请求。请检查输入内容、AI 模式及原页面的提示。');
  },5000);
 }
 elapsedTimer=window.setInterval(()=>{
  if(!active||!active.inflight)return;
  updateRunning();
 },1000);
 return active;
}
function counts(){
 const elapsed=Math.max(0,Math.floor((Date.now()-active.started)/1000));
 return (active.label.includes('审校')&&active.targetSentences?'审校对象 '+active.targetSentences+' 句 · ':'')+'已响应 '+active.replies+' 次模型请求 · 正在等待 '+active.inflight+' 次 · 运行 '+elapsed+' 秒';
}
function updateRunning(){
 if(!active)return;
 setPhase('running',counts()+'。收到回复后仍需解析、审校和更新页面。');
}
function scheduleEnd(task){
 window.clearTimeout(finishedTimer);
 finishedTimer=window.setTimeout(()=>{
  if(active!==task||task.inflight>0)return;
  if(task.failures){
   setPhase('error','有 '+task.failures+' 次请求失败'+(task.latestError?'（'+task.latestError+'）':'')+'。请查看原页面提示，已有译文不会由状态栏修改。');
  }else{
   setPhase('success','AI 服务已返回 '+task.replies+' 次响应。请查看页面中的译文、审校建议或对话结果；本提示不代表内容已通过审校。');
  }
 },2200);
}
function isAi(url,options){
 const u=String(url||'');
 if(/\/api\/chat(?:[?#]|$)|\/chat\/completions(?:[?#]|$)|\/responses(?:[?#]|$)/i.test(u))return true;
 if(!options||typeof options.body!=='string')return false;
 try{
  const data=JSON.parse(options.body);
  return Array.isArray(data.messages)&&typeof data.model==='string';
 }catch{return false}
}
function watch(win){
 if(!win||installed.has(win)||typeof win.fetch!=='function')return;
 installed.add(win);
 const original=win.fetch;
 win.fetch=function(input,options){
  const url=typeof input==='string'?input:input?.url;
  if(!isAi(url,options))return original.apply(this,arguments);
  const task=active&&active.inflight===0&&
    (active.networkSeen&&Date.now()-active.started>120000)?start(active.label,false):active||start('AI 请求',false);
  task.networkSeen=true;
  window.clearTimeout(launchTimer);window.clearTimeout(finishedTimer);
  task.requests++;task.inflight++;
  updateRunning();
  let response;
  try{response=original.apply(this,arguments);}
  catch(err){
   task.inflight--;task.failures++;task.latestError='网络调用异常';
   if(task.inflight)updateRunning();else scheduleEnd(task);
   throw err;
  }
  return Promise.resolve(response).then(result=>{
   task.inflight--;
   if(result?.ok)task.replies++;
   else{task.failures++;task.latestError='HTTP '+(result?.status??'未知');}
   if(task.inflight)updateRunning();
   else if(result?.ok){setPhase('checking','模型已响应，正在等待页面处理结果…');scheduleEnd(task);}
   else scheduleEnd(task);
   return result;
  },err=>{
   task.inflight--;task.failures++;
   task.latestError=err?.name==='AbortError'?'请求超时或取消':'连接失败';
   if(task.inflight)updateRunning();else scheduleEnd(task);
   throw err;
  });
 };
}
function attachNested(){
 const iframe=D.getElementById('paramFrame');
 if(!iframe)return;
 try{watch(iframe.contentWindow);}catch{}
 if(!iframe.dataset.thAiProgressBound){
  iframe.dataset.thAiProgressBound='1';
  iframe.addEventListener('load',()=>{try{watch(iframe.contentWindow);}catch{}});
 }
}
const triggerIds=new Set(['confirmReviewRun','askAI','sendStageAI','sentenceAskSend']);
function clicked(button){
 const id=button.id||'',label=text(button.textContent);
 if(triggerIds.has(id))return label;
 if(id==='runReview'||id==='openStageAI'||id==='openAISettings')return '';
 // Actions that actually submit an AI job, excluding setup and navigation.
 if(/^(?:开始|运行|重新|生成|使用|批量).*(?:AI|智能).*(?:审校|翻译|初稿|生成)/.test(label))return label;
 if(/^(?:AI|智能).*(?:生成初稿|开始审校|翻译|校对)/.test(label))return label;
 return '';
}
D.addEventListener('click',event=>{
 const button=event.target?.closest?.('button');
 if(!button||button.disabled)return;
 const label=clicked(button);
 if(label)start(label,true);
},true);
watch(window);
attachNested();
const scan=new MutationObserver(()=>attachNested());
scan.observe(D.body,{subtree:true,childList:true});
})();