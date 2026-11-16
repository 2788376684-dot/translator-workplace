(()=>{
'use strict';
if(!new URLSearchParams(location.search).has('embedded'))return;
let stage='source',working=false,worker=null,asrCancel=null,activeAI=null,aiJob=null,requestCounter=0;
const stageNames={source:'原文与时间点',draft:'初稿',revision:'二稿',final:'终稿'};
const sourceSignature=c=>JSON.stringify(c.cues.map(r=>[r.id,r.source,r.start,r.end]));
function workflow(c=clip()){
 return c.workflow||(c.workflow={stage,sourceSignature:sourceSignature(c),versions:{},confirmed:{source:false,draft:false,revision:false,final:false}});
}
function capture(){
 const c=clip(),w=workflow(c),signature=sourceSignature(c);
 if(w.sourceSignature!==signature){w.confirmed.source=false;invalidateAfter('source');w.sourceSignature=signature;}
 if(stage!=='source'){if(w.confirmed[stage]&&JSON.stringify(w.versions[stage])!==JSON.stringify(c.cues)){w.confirmed[stage]=false;invalidateAfter(stage);}w.versions[stage]=copy(c.cues);}
 w.stage=stage;
 renderProgress();
}
function publish(){window.THVideoPublish?.();}
function renderProgress(){
 const el=byId('video-stage-status');if(!el)return;
 const w=workflow();el.textContent=stageNames[stage]+' · '+(w.confirmed[stage]?'已确认':'待确认');
 byId('video-confirm').textContent='确认'+stageNames[stage];
 byId('video-ai-review').hidden=!['revision','final'].includes(stage);
 byId('video-ai-translate').hidden=stage==='final';
 byId('video-confirm').disabled=working;
 document.body.dataset.videoStage=stage;
}
function setStage(next){
 if(!Object.hasOwn(stageNames,next))return;
 const c=clip();if(c.workflow)capture();stage=next;const w=workflow(c);w.stage=stage;
 if(stage!=='source'){
  const saved=w.versions[stage]||(stage==='revision'?w.versions.draft:stage==='final'?(w.versions.revision||w.versions.draft):null);
  const targets=new Map((saved||[]).map(r=>[r.id,r.target]));
  c.cues=c.cues.map(r=>({...r,target:targets.has(r.id)?targets.get(r.id):r.target}));
 }
 renderAll();renderProgress();publish();
}
function navigate(next){setStage(next);window.parent.postMessage({type:'TH_VIDEO_NAVIGATE',stage:next},location.origin);}
function invalidateAfter(key){const order=Object.keys(stageNames),w=workflow(),laterKeys=order.slice(order.indexOf(key)+1);const retired={};for(const later of laterKeys){w.confirmed[later]=false;if(w.versions[later]){retired[later]=w.versions[later];delete w.versions[later];}}if(Object.keys(retired).length){w.history||=[];w.history.push({at:new Date().toISOString(),versions:copy(retired)});w.history=w.history.slice(-3);}}
function confirmStage(){
 const c=clip(),w=workflow();capture();
 if(!c.cues.every(r=>r.source.trim()))return notify('请先自动识别或补全每条原文。',true);
 validateCues(c.cues,c.media.duration,stage!=='source',state.profile);
 const prior={draft:'source',revision:'draft',final:'revision'}[stage];
 if(prior&&!w.confirmed[prior])return notify('请先确认'+stageNames[prior]+'，再确认当前版本。',true);
 const wasConfirmed=w.confirmed[stage];w.confirmed[stage]=true;if(!wasConfirmed)invalidateAfter(stage);if(stage!=='source')w.versions[stage]=copy(c.cues);
 publish();renderProgress();notify(stageNames[stage]+'已确认。');
 if(stage==='source')navigate('draft');else if(stage==='draft')navigate('revision');else if(stage==='revision')navigate('final');
}
function setWorking(value,message){working=value;for(const key of ['video-transcribe','video-ai-translate','video-ai-review'])byId(key).disabled=value;byId('video-cancel').hidden=!value;if(message)byId('video-task-status').textContent=message;renderProgress();}
function taskStatus(message){byId('video-task-status').textContent=message;}
async function audioSamples(c){
 const url=mediaURL(c);if(!url)throw Error('请先重新连接原视频。');
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('当前浏览器不支持音频解码。');
 const context=new Audio();try{
  const bytes=await(await fetch(url)).arrayBuffer();
  const buffer=await context.decodeAudioData(bytes);
  if(buffer.duration>1200)throw Error('本地自动识别目前支持20分钟以内的视频，请先裁剪或导入已有 SRT。');
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const offline=new Offline(1,Math.ceil(buffer.duration*16000),16000),source=offline.createBufferSource();source.buffer=buffer;source.connect(offline.destination);source.start();
  return (await offline.startRendering()).getChannelData(0).slice();
 }finally{await context.close();}
}
async function transcribe(automatic=false){
 if(working)return;
 const c=clip();if(c.id.startsWith('empty-'))return notify('请先导入视频。',true);
 if(c.cues.some(r=>r.source.trim()||r.target.trim())&&!automatic&&!confirm('重新识别会替换当前原文和时间轴。现有字幕会保留为可切回的草稿，继续？'))return;
 const signature=JSON.stringify(c.cues),cancel={cancelled:false};asrCancel=cancel;
 setWorking(true,'正在读取视频声音…');
 try{
  const audio=await audioSamples(c);if(cancel.cancelled)return;
  worker=new Worker('/subtitle-asr-worker.js',{type:'module'});
  const result=await new Promise((resolve,reject)=>{
   cancel.reject=reject;
   worker.onmessage=event=>{const data=event.data;if(data.type==='progress')taskStatus(data.message);else if(data.type==='result')resolve(data.result);else if(data.type==='error')reject(Error(data.message));};
   worker.onerror=()=>reject(Error('语音模型加载失败，请检查网络后重试；也可导入 SRT 或转写 JSON。'));
   worker.postMessage({audio,language:byId('video-asr-language').value},[audio.buffer]);
  });
  if(cancel.cancelled||clip()!==c)return;
  if(JSON.stringify(c.cues)!==signature)throw Error('识别期间字幕已修改，结果未覆盖当前编辑，请重新识别。');
  if(!Array.isArray(result.chunks)||!result.chunks.length)throw Error('未识别到带时间点的语音，请检查视频声音或手动导入字幕。');
  let previous=0;
  const rows=result.chunks.filter(chunk=>chunk.text?.trim()).map((chunk,index)=>{
   const [start,end]=chunk.timestamp||[];if(!Number.isFinite(start)||(end!==null&&!Number.isFinite(end)))throw Error('识别结果缺少有效时间点，未替换原稿。');
   const a=millis(Math.max(previous,start)),b=millis(Math.min(c.media.duration,end===null?c.media.duration:end));if(b<=a)throw Error('识别时间点无效，请重试或导入转写。');previous=b;
   return {id:id('asr'+index),start:a,end:b,source:chunk.text.trim(),target:''};
  });validateCues(rows,c.media.duration);
  if(c.cues.some(r=>r.source.trim()||r.target.trim())){if(state.clips.length>=20)throw Error('草稿已达20份，请先保存工程。');const backup=copy(c);backup.id=id('backup');backup.title=(c.title+' · 识别前备份').slice(0,180);state.clips.push(backup);}
  c.cues=rows;c.initial=copy(rows);c.selected=0;c.applied=null;c.workflow=null;
  c.asr={tool:'Whisper tiny · 浏览器本地识别',date:new Date().toISOString().slice(0,10),segments:rows.map(r=>({start:r.start,end:r.end,text:r.source,words:[]}))};
  c.source='浏览器本地识别，原文和时间点需人工复核。';stage='source';workflow(c);renderAll();renderProgress();publish();taskStatus('已识别 '+rows.length+' 条原文及入点、出点。核对后确认原文，或直接生成 AI 初稿。');
 }catch(error){if(!cancel.cancelled){taskStatus('自动识别未完成：'+error.message);notify('自动识别未完成：'+error.message,true);}}
 finally{worker?.terminate();worker=null;asrCancel=null;setWorking(false);}
}
function askAI(kind,rows){
 return new Promise((resolve,reject)=>{
  const requestId='subtitle-'+(++requestCounter),timer=setTimeout(()=>{if(activeAI?.requestId===requestId)activeAI=null;reject(Error('AI 请求超时，请重试。'));},100000);
  activeAI={requestId,resolve:result=>{clearTimeout(timer);activeAI=null;resolve(result)},reject:error=>{clearTimeout(timer);activeAI=null;reject(error)}};
  window.parent.postMessage({type:'TH_VIDEO_AI',requestId,kind,rows},location.origin);
 });
}
async function generate(kind){
 if(working)return;const c=clip();
 if(!c.cues.every(r=>r.source.trim()))return notify('请先自动识别或填写原文，再生成译文。',true);
 if(kind==='revision'&&!workflow(c).confirmed.draft)return notify('请先在初稿阶段确认初稿，再进行 AI 审校。',true);
 if(c.cues.some(r=>r.target.trim())&&!confirm('AI 将生成新的'+stageNames[kind]+'，原有版本会保留在阶段记录中。继续？'))return;
 capture();const signature=JSON.stringify(c.cues),job={cancelled:false};aiJob=job;setWorking(true,'正在生成'+stageNames[kind]+'…');
 try{
  const output=[];
  for(let start=0;start<c.cues.length;){
   if(start>0)await new Promise(resolve=>setTimeout(resolve,2800));
   if(job.cancelled)throw Error('已取消生成，原稿保留。');
   const batch=[];let chars=0;
   while(start<c.cues.length&&batch.length<8){const r=c.cues[start],size=r.source.length+(kind==='revision'?r.target.length:0);if(batch.length&&chars+size>3500)break;batch.push({id:r.id,source:r.source,target:kind==='revision'?r.target:''});chars+=size;start++;}
   taskStatus('AI '+stageNames[kind]+'：'+start+' / '+c.cues.length+' 条');output.push(...await askAI(kind,batch));
   if(job.cancelled)throw Error('已取消生成，原稿保留。');
   if(clip()!==c||JSON.stringify(c.cues)!==signature)throw Error('字幕或媒体已切换，本次结果未覆盖当前编辑。');
  }
  const translated=new Map(output.map(r=>[r.id,r.target]));if(translated.size!==c.cues.length||c.cues.some(r=>!translated.get(r.id)))throw Error('AI 返回不完整，已保留原稿。');
  const w=workflow(c);if(w.versions[kind]){w.history||=[];w.history.push({at:new Date().toISOString(),versions:{[kind]:copy(w.versions[kind])}});w.history=w.history.slice(-3);}
  c.cues=c.cues.map(r=>({...r,target:translated.get(r.id)}));stage=kind;w.stage=kind;w.versions[kind]=copy(c.cues);w.confirmed[kind]=false;invalidateAfter(kind);
  renderAll();renderProgress();publish();taskStatus(stageNames[kind]+'已生成，请检查后点击确认。');window.parent.postMessage({type:'TH_VIDEO_NAVIGATE',stage:kind},location.origin);
 }catch(error){taskStatus(error.message);notify(error.message,true);}finally{aiJob=null;setWorking(false);}
}
function cancelTask(){if(aiJob)aiJob.cancelled=true;if(asrCancel){asrCancel.cancelled=true;asrCancel.reject?.(Error('已取消'));worker?.terminate();}activeAI?.reject(Error('已取消生成，原稿保留。'));taskStatus('已取消，原有字幕保留。');}
function setConfig(config){const select=byId('video-target-language');if(config.targetLang&&[...select.options].some(o=>o.value===config.targetLang))select.value=config.targetLang;}
function mediaOpened(c){setStage('source');if(!c.cues.some(r=>r.source.trim()||r.target.trim()))transcribe(true);}
window.THVideoFlow={capture,setStage,setConfig,mediaOpened,mediaReconnected:c=>{if(!c.cues.some(r=>r.source.trim()||r.target.trim()))transcribe(true);}};
window.addEventListener('message',event=>{
 if(event.source!==window.parent||event.origin!==location.origin)return;
 if(event.data?.type==='TH_VIDEO_AI_RESULT'&&activeAI?.requestId===event.data.requestId){if(event.data.error)activeAI.reject(Error(event.data.error));else activeAI.resolve(event.data.rows);}
});
const panel=document.createElement('section');panel.className='video-workflow';panel.innerHTML=`<div class="bar space"><strong id="video-stage-status">原文与时间点 · 待确认</strong><button id="video-confirm" class="primary">确认原文与时间点</button></div><div class="bar"><label>语音语言 <select id="video-asr-language"><option value="">自动识别</option><option value="english">英语</option><option value="chinese">中文</option><option value="japanese">日语</option><option value="french">法语</option><option value="german">德语</option></select></label><label>译文语言 <select id="video-target-language"><option>中文</option><option>英语</option><option>日语</option><option>法语</option><option>德语</option></select></label><button id="video-transcribe">自动识别原文与时间点</button><button id="video-ai-translate">AI 生成初稿</button><button id="video-ai-review" hidden>AI 审校生成二稿</button><button id="video-cancel" hidden>取消任务</button></div><p id="video-task-status" role="status" aria-live="polite">导入新视频后自动识别原文与时间点。首次使用需下载语音模型，识别在本机完成，视频不会上传。</p><p class="hint">AI 翻译使用当前项目的 AI 设置；本地模式点击生成后启用默认 AI。原文、初稿、二稿、终稿分别确认，不会自动标记完成。</p>`;
document.querySelector('.strip').after(panel);
const style=document.createElement('style');style.textContent='.video-workflow{padding:12px 0;border-bottom:1px solid var(--line)}.video-workflow .bar{margin-bottom:10px}.video-workflow p{margin:6px 0;font-size:13px}.video-workflow label{font-size:13px}';document.head.append(style);
byId('video-target-language').onchange=event=>{invalidateAfter('source');publish();window.parent.postMessage({type:'TH_VIDEO_SETTINGS',targetLang:event.target.value},location.origin);taskStatus('译文语言已更新，请重新生成并确认译稿。');};
byId('video-transcribe').onclick=()=>transcribe();byId('video-ai-translate').onclick=()=>generate('draft');byId('video-ai-review').onclick=()=>generate('revision');byId('video-confirm').onclick=guard(confirmStage);byId('video-cancel').onclick=cancelTask;
// Text input invalidates only this video's downstream confirmations.
document.addEventListener('input',event=>{if(!['cue-source','cue-target','cue-start','cue-end','cut-value'].includes(event.target.id))return;const w=workflow();if(['cue-source','cue-start','cue-end','cut-value'].includes(event.target.id)){for(const key of Object.keys(stageNames))w.confirmed[key]=false;}else{w.confirmed[stage]=false;invalidateAfter(stage);}capture();publish();});
})();
