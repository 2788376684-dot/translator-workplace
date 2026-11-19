/* Transhelper subtitle workspace: focused editing mode.
   Pure presentation layer. Does not rewrite stored project/subtitle data. */
(function(){
'use strict';
const rootStyle = `
.app.video-source #workflow,.app.video-source .workflow-label,
.app.video-source .segments,.app.video-source .workgrid,
.app.video-source #stageActions,.app.video-source #stageContent,
.app.video-source #overallProgress,.app.video-source #stageAI,
.app.video-source #addSegment,.app.video-source #removeSegment {display:none!important}
.app.video-source .stagebar{display:flex!important;padding:10px 14px!important;min-height:0!important}
.app.video-source .stagebar .stage-title{display:flex!important;align-items:center;gap:12px}
.app.video-source #stageCaption{display:none!important}
.app.video-source #stageSub{font-size:13px!important;margin:0!important}
.app.video-source #videoWorkspace{display:block!important;width:100%;margin:0!important}
.app.video-source #videoWorkspace[hidden]{display:none!important}
.app.video-source .main{max-width:100%!important;padding:8px 14px 24px!important}
.app.video-source .sidebar .workflow-label{display:none!important}
.app.parameter-view .segments{display:none!important}
.app.parameter-view .workgrid{display:block!important}
.app.parameter-view #stageContent{width:100%!important}
`;
const innerStyle = `
body.embedded{background:#f5f7f8!important;font-size:14px!important}
body.embedded .top,body.embedded .strip,body.embedded .sourcefoot,
body.embedded .footer,body.embedded #subtitle-start,
body.embedded #clear-track,body.embedded #verify-srt,
body.embedded #download-media,body.embedded #open-profile,
body.embedded #compare,body.embedded #replay-pair,
body.embedded #show-qa,body.embedded #issues-only,
body.embedded .review-tools .check,body.embedded #review-count,
body.embedded .review-actions,body.embedded #profile-summary,
body.embedded #track-status,body.embedded #prior-cue,
body.embedded #cut-panel,body.embedded #words,body.embedded #word-label,
body.embedded .sub-playback .check,body.embedded #video-history,
body.embedded #video-confirm,body.embedded #video-ai-translate,
body.embedded #video-ai-review,body.embedded #video-cancel,
body.embedded #video-task-status,body.embedded #asr-language-label
{display:none!important}
body.embedded .video-workflow{display:none!important}
body.embedded .main{padding:10px 14px 22px!important;max-width:1600px!important}
body.embedded #notice{display:none!important}
body.embedded .desk{grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)!important;gap:12px!important}
body.embedded .panel{border:1px solid #dce4eb!important;border-radius:12px!important;box-shadow:0 2px 7px #173b5708}
body.embedded .panelhead{padding:10px 13px!important}
body.embedded .panelhead h2{font-size:15px!important}
body.embedded .cueform{padding:12px!important}
body.embedded #player{max-height:340px!important}
body.embedded .wave{padding:5px 10px!important}
body.embedded .controls{padding:9px 10px!important}
body.embedded .tablepanel{margin-top:12px!important}
body.embedded .tablepanel .tableaction{gap:8px!important;flex-wrap:wrap}
body.embedded .tablepanel .tableaction .bar{gap:6px!important}
body.embedded .tablepanel .tableaction .bar button{font-size:12px!important;padding:6px 9px!important}
body.embedded .review-tools{padding:8px 12px!important}
body.embedded .review-tools .field{margin:0!important}
body.embedded .tablewrap{max-height:530px;overflow:auto}
body.embedded button{border-radius:8px}
body.embedded #th-focused-toolbar{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 11px;
background:#fff;border:1px solid #dce4eb;border-radius:12px;margin:0 0 11px;min-height:54px}
body.embedded #th-focused-toolbar button,body.embedded #th-focused-toolbar summary{font-size:13px;min-height:34px;padding:7px 12px}
body.embedded #th-focused-toolbar .th-title{font-weight:700;font-size:15px;margin-right:4px;white-space:nowrap}
body.embedded #th-focused-toolbar .th-spacer{flex:1}
body.embedded #th-focused-toolbar #th-export-main{background:#1e5779;border-color:#1e5779;color:white}
body.embedded #th-focused-toolbar details{position:relative}
body.embedded #th-focused-toolbar details>summary{list-style:none;cursor:pointer;border:1px solid #d4dce3;border-radius:8px;background:#fff}
body.embedded #th-focused-toolbar details>summary::-webkit-details-marker{display:none}
body.embedded #th-focused-toolbar .th-menu{position:absolute;right:0;top:calc(100% + 5px);z-index:80;background:white;min-width:192px;
border:1px solid #d7e0e7;box-shadow:0 12px 24px #10283a1a;border-radius:10px;padding:7px;display:flex;flex-direction:column;gap:4px}
body.embedded #th-focused-toolbar .th-menu button{width:100%;text-align:left;border:0;background:#fff}
body.embedded #th-focused-toolbar .th-menu button:hover{background:#eef4f7}
body.embedded #th-focused-toolbar #th-simple-clear{color:#b42332}
body.embedded #th-focused-toolbar .th-media-name{font-size:12px;color:#71808a;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}
body.embedded #th-compact-player-controls{min-height:38px!important}
@media(max-width:860px){body.embedded .desk{grid-template-columns:minmax(0,1fr)!important}}
`;
function addCSS(doc,id,css){
 if(doc.getElementById(id))return;
 const node=doc.createElement('style');node.id=id;node.textContent=css;doc.head.append(node);
}
addCSS(document,'th-focused-root-style',rootStyle);
const seen=new WeakSet();
function setup(doc){
 if(seen.has(doc)||!doc.getElementById('media-file')||!doc.getElementById('subtitle-main'))return;
 seen.add(doc);
 addCSS(doc,'th-focused-subtitle-style',innerStyle);
 const main=doc.getElementById('subtitle-main');
 const toolbar=doc.createElement('div');
 toolbar.id='th-focused-toolbar';
 toolbar.innerHTML='<span class="th-title">字幕编辑</span><button type="button" id="th-open-video">导入视频 / 音频</button><button type="button" id="th-import-cues">导入字幕</button><span class="th-media-name" id="th-current-media"></span><span class="th-spacer"></span><button type="button" id="th-export-main">导出 SRT</button><details id="th-quick-menu"><summary>快捷操作 ···</summary><div class="th-menu"><button type="button" id="th-export-vtt">导出 VTT</button><button type="button" id="th-split-current">拆分当前字幕</button><button type="button" id="th-merge-current">合并下一条</button><button type="button" id="th-transcribe-now">自动识别原文与时间点</button><button type="button" id="th-save-json">导出字幕工程备份</button><button type="button" id="th-simple-clear">清空全部内容</button></div></details>';
 main.before(toolbar);
 const el=id=>doc.getElementById(id);
 const forward=(button,target)=>{el(button).addEventListener('click',()=>{el('th-quick-menu').open=false;el(target)?.click();});};
 forward('th-open-video','media-file');
 forward('th-import-cues','open-import');
 forward('th-export-main','export-srt');
 forward('th-export-vtt','export-vtt');
 forward('th-split-current','split-cue');
 forward('th-merge-current','merge-cue');
 forward('th-save-json','save-project');
 forward('th-transcribe-now','video-transcribe');
 el('th-simple-clear').addEventListener('click',()=>{
   el('th-quick-menu').open=false;
   if(doc.defaultView.THVideoFlow?.clearAll)doc.defaultView.THVideoFlow.clearAll();
   else doc.defaultView.alert('字幕工作台尚未初始化，请重新打开当前项目。');
 });
 // Older outer-frame injection also creates a reset button. Its action is available in one place only.
 const removeDuplicate=()=>{const duplicate=el('th-clear-subtitle-all');if(duplicate)duplicate.hidden=true;};
 const update=()=>{
  removeDuplicate();
  const filename=el('media-info')?.textContent?.trim()||'';
  el('th-current-media').textContent=filename;
 };
 update();
 const observer=new MutationObserver(()=>update());
 if(el('media-info'))observer.observe(el('media-info'),{childList:true,characterData:true,subtree:true});
 // The original functional controls remain in the DOM for reliable event handlers,
 // but only the minimal controls are presented to the translator.
}
function tidySourceChoices(){
 const app=document.querySelector('.app');
 if(!app||app.classList.contains('video-source')||app.classList.contains('parameter-view'))return;
 const source=document.getElementById('sourceEditor');
 if(!source)return;
 const extra=document.getElementById('openSubtitleProject');
 if(extra)extra.style.display='none';
 const ocr=document.getElementById('sourceOCR');
 const video=document.getElementById('importVideo');
 if(ocr)ocr.textContent='新建图片 OCR 项目';
 if(video)video.textContent='新建字幕项目';
}
function scan(){
 tidySourceChoices();
 for(const frame of document.querySelectorAll('#videoWorkspace iframe')){
  try{if(frame.contentDocument?.readyState==='complete')setup(frame.contentDocument);}catch(e){}
 }
}
scan();setInterval(scan,850);
})();
