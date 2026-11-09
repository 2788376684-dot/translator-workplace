/* Localization projects share core persistence, settings, segments and AI transport. */
window.TWLocalization=function(c){
'use strict';
const {p,s,step,$,E,newSeg,draw,persist,toast,api,withBusy,download,saveJSON,go,time,isCurrent=()=>true}=c;
const locale=v=>({'中文':'zh-CN','英语':'en-US','日语':'ja-JP','法语':'fr-FR'}[v]||v);
const loc=p.localization;loc.rules||=[];loc.revision||='1';
const empty=!s.resourceKey;
const text=(v)=>E(v||'');
const button=(id,label)=>`<button class="btn" id="${id}">${label}</button>`;
const field=(id,label,value,readonly=false)=>`<label style="display:block;margin:12px 0">${label}<textarea class="field editor-text" id="${id}" rows="3" ${readonly?'readonly':''}>${text(value)}</textarea></label>`;
function changed(){persist();}
function tokens(v){const out=[];const rest=v.replace(/\{([A-Za-z][A-Za-z_0-9]*)\}/g,(_,k)=>{out.push(k);return ''});if(/[{}]/.test(rest))throw Error('仅支持单层 {name} 变量');return out.sort().join('|');}
function check(a,b){if(!b.trim())throw Error('译文为空');if(tokens(a)!==tokens(b))throw Error('变量名称或次数不一致');}
function record(why){s.history.push({at:time(),why,text:s.final,draft:s.draft,revision:s.revision});}
function json(raw){return JSON.parse(raw.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}
function file(fn){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{if(input.files[0].size>20000000)throw Error('文件需小于 20MB');await fn(json(await input.files[0].text()));}catch(e){toast(e.message)}};input.click();}
function output(name,data){download((p.title||'localization')+'_'+name+'.json',JSON.stringify(data,null,2),'application/json');}
function context(t=s){return JSON.stringify({id:t.resourceKey,source:t.source,context:t.context||{}},null,2);}
function prompt(review=false){return `你是专业界面本地化译者。翻译方向：${p.sourceLang} → ${p.targetLang}。受众和要求：${p.instructions}。术语：${JSON.stringify(p.terms)}。语境译名：${JSON.stringify(loc.rules)}。依据控件用途选择译法，保留变量名称和次数。只返回当前条目的译文，不加引号、说明或代码块。\n${context()}${review?'\n审校初稿：'+s.draft:''}`;}
function sameProject(pid,sid){return isCurrent()&&p.id===pid&&s.id===sid&&p.segments.includes(s);}
async function generate(review){const pid=p.id,sid=s.id,baseline=JSON.stringify([s.source,s.draft,s.context]);await withBusy(review?'本地化审校':'本地化初稿',async()=>{const v=await api([{role:'user',content:prompt(review)}]);check(s.source,v);if(!sameProject(pid,sid)||baseline!==JSON.stringify([s.source,s.draft,s.context]))throw Error('源文已变化，请重新生成');if(review){s.revision=v;s.revInput=v;}else{s.draftInput=v;}persist();draw();});}
$('stageActions').innerHTML=button('locBackup','保存完整工程');$('locBackup').onclick=saveJSON;
$('stageSub').textContent='界面本地化 · '+p.sourceLang+' → '+p.targetLang;
$('overallProgress').textContent=p.segments.filter(t=>t.reviewChoice&&!t.unresolved&&t.final.trim()).length+' / '+(empty?0:p.segments.length)+' 个资源已确认';
$('segmentCount').textContent=empty?'尚未导入资源':p.segments.length+' 个资源键';
$('segmentList').innerHTML=p.segments.map(t=>`<button class="segment-item ${s.id===t.id?'active':''}" data-sid="${text(t.id)}"><strong>${text(t.resourceKey||'导入资源')}${t.reviewChoice&&!t.unresolved?' · 已确认':''}</strong><small>${text(t.source)}</small></button>`).join('');
$('stageContent').innerHTML=`<section class="pane" id="locWorkspace"><div class="pane-content"><div style="display:flex;gap:8px;flex-wrap:wrap">${button('locImport','导入／更新源资源')}${button('locContexts','导入语境')}${button('locCandidate','导入外部候选')}${button('locRequest','复制外部翻译请求')}${button('locPreview','查看界面与变量预览')}</div><p class="panel-note">资源键固定保留；同一原文可按用途分别翻译。更新资源会保存原版本，变化条目需重新审校。</p><div id="locBody"></div><div id="locPreviewArea"></div></div></section>`;
const body=$('locBody');
function importSource(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('源资源须为 JSON 对象');
 if(raw.schema&&raw.schema!=='interface.source.v1')throw Error('不支持的源资源格式');
 if(raw.project!=null&&(typeof raw.project!=='string'||!raw.project.trim()))throw Error('项目标识无效');
 let rows=raw.strings||Object.entries(raw).map(([id,source])=>({id,source}));
 if(!Array.isArray(rows)||!rows.length||rows.length>300)throw Error('支持 1–300 条资源');
 const keys=new Set();for(const r of rows){if(typeof r.id!=='string'||!r.id||['__proto__','constructor','prototype'].includes(r.id)||keys.has(r.id)||typeof r.source!=='string'||!r.source.trim())throw Error('资源键重复、缺失或原文无效');keys.add(r.id);tokens(r.source);if(r.context&&(!r.context||typeof r.context!=='object'||Array.isArray(r.context)))throw Error('语境须为对象');for(const k of ['control','state','purpose'])if(r.context?.[k]!=null&&typeof r.context[k]!=='string')throw Error('语境字段须为文字');}
 const previous=JSON.parse(JSON.stringify(p.segments));const next=rows.map(r=>{const old=p.segments.find(t=>t.resourceKey===r.id);if(old&&old.source===r.source){const t={...old,context:r.context||old.context};if(JSON.stringify(t.context)!==JSON.stringify(old.context)){t.reviewChoice='';t.unresolved=true;}return t;}const t=newSeg(r.source);t.resourceKey=r.id;t.context=r.context||{};if(old)t.previousVersion=old;return t;});
 loc.versions||=[];if(!empty)loc.versions.push({at:time(),revision:loc.revision,segments:previous});
 if(raw.revision!=null&&(typeof raw.revision!=='string'&&typeof raw.revision!=='number'))throw Error('源资源版本无效');
 if(raw.sourceLocale)p.sourceLang=({'en-US':'英语','zh-CN':'中文'}[raw.sourceLocale]||p.sourceLang);if(raw.targetLocale)p.targetLang=({'en-US':'英语','zh-CN':'中文'}[raw.targetLocale]||p.targetLang);
 p.segments=next;loc.revision=String(raw.revision||String(Number(loc.revision)+1));loc.project=raw.project||p.id;loc.view=raw.view||null;loc.baseline=rows.map(r=>({id:r.id,source:r.source}));
 // Core selection is updated through the native segment click after redraw.
 persist();draw();document.querySelector('[data-sid]')?.click();
}
$('locImport').onclick=()=>file(importSource);
$('locContexts').onclick=()=>file(raw=>{const map=raw.contexts||raw;if(!map||typeof map!=='object'||Array.isArray(map))throw Error('语境文件无效');const updates=[];for(const [key,ctx]of Object.entries(map)){const t=p.segments.find(t=>t.resourceKey===key);if(!t||!ctx||typeof ctx!=='object'||Array.isArray(ctx))throw Error('语境含未知资源键或无效内容');for(const f of ['control','state','purpose'])if(ctx[f]!=null&&typeof ctx[f]!=='string')throw Error(key+' 的语境字段须为文字');updates.push([t,{...t.context,...ctx}]);}updates.forEach(([t,ctx])=>{if(JSON.stringify(t.context||{})===JSON.stringify(ctx))return;t.context=ctx;t.reviewChoice='';t.unresolved=!!t.final;});persist();draw();});
$('locCandidate').onclick=()=>file(raw=>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('候选格式无效');if(raw.schema&&!['interface.locale.v1','courseflow.locale.v1'].includes(raw.schema))throw Error('不支持的候选格式');if((raw.sourceRevision!=null||raw.revision!=null)&&String(raw.sourceRevision??raw.revision)!==String(loc.revision))throw Error('候选版本不匹配');if(raw.project!=null&&raw.project!==(loc.project||p.id))throw Error('候选项目不匹配');
 if(raw.sourceBaseline){if(!Array.isArray(raw.sourceBaseline))throw Error('源资源基线格式无效');const expected=new Map(p.segments.map(t=>[t.resourceKey,t.source]));if(raw.sourceBaseline.length!==expected.size||raw.sourceBaseline.some(r=>!r||!expected.has(r.id)||expected.get(r.id)!==r.source))throw Error('候选源资源与当前版本不一致');}
 let entries;if(Array.isArray(raw.translations)){entries=raw.translations.map(r=>{if(!r||typeof r!=='object')throw Error('候选条目无效');return [r.id,r.target];});}else{const map=raw.messages||raw;if(!map||typeof map!=='object'||Array.isArray(map))throw Error('候选译文格式无效');entries=Object.entries(map);}
 const seen=new Set(),updates=[];for(const [key,v]of entries){if(typeof key!=='string'||seen.has(key))throw Error('候选资源键重复或无效：'+key);seen.add(key);const t=p.segments.find(t=>t.resourceKey===key);if(!t||typeof v!=='string')throw Error('候选含未知键或无效译文：'+key);check(t.source,v);updates.push([t,v]);}if(!updates.length)throw Error('候选文件没有可用译文');
 updates.forEach(([t,v])=>{t.candidate=v;t.revInput=v;t.candidateAt=time();});persist();draw();toast('候选已保存，原有已确认终稿未更改；请在二稿逐条确认');});
$('locRequest').onclick=async()=>{const request=`请将下列界面资源从 ${p.sourceLang} 翻译为 ${p.targetLang}。按控件语境翻译，保留变量。只返回 {project,revision,translations:[{id,target}]}。\n`+JSON.stringify({project:loc.project||p.id,revision:loc.revision,requirements:p.instructions,terms:p.terms,rules:loc.rules,strings:p.segments.map(t=>({id:t.resourceKey,source:t.source,context:t.context}))},null,2);try{await navigator.clipboard.writeText(request);toast('已复制请求');}catch{output('翻译请求',{request});}};
if(empty){body.innerHTML='<p>导入包含资源键和原文的 JSON 后开始。可在项目设置中选择语言与 AI 模式。</p>';}
else{
 body.innerHTML=`<h3>${text(s.resourceKey)}</h3><p style="white-space:pre-wrap">${text(s.source)}</p><p class="panel-note">${p.segments.filter(t=>t.id!==s.id&&t.source===s.source).map(t=>'同文条目：'+text(t.resourceKey)+'（'+text(t.context?.control)+'）').join('；')}</p>`;
 if(step!=='source')body.innerHTML+='<p class="panel-note">'+text([s.context?.control,s.context?.state,s.context?.purpose].filter(Boolean).join(' · '))+'</p>';
 if(step==='source'){
 body.innerHTML+=field('lcControl','控件类型',s.context?.control)+field('lcState','出现位置与状态',s.context?.state)+field('lcPurpose','用途与操作结果',s.context?.purpose)+button('lcNext','保存语境，进入初稿');
 for(const [id,key]of [['lcControl','control'],['lcState','state'],['lcPurpose','purpose']])$(id).oninput=e=>{s.context||={};s.context[key]=e.target.value;s.reviewChoice='';s.unresolved=!!s.final;changed();};$('lcNext').onclick=()=>go('draft');
 }else if(step==='draft'){
 body.innerHTML+=field('lcDraft','初稿',s.draft||s.draftInput,!!s.draft)+button('lcGenerate','AI 生成初稿')+button('lcLock','锁定初稿并继续');$('lcDraft').oninput=e=>{s.draftInput=e.target.value;changed();};$('lcGenerate').disabled=!!s.draft;$('lcGenerate').onclick=()=>generate(false);$('lcLock').onclick=()=>{try{check(s.source,s.draft||s.draftInput);if(!s.draft){s.draft=s.draftInput;s.draftMeta={kind:'本地化初稿',at:time()};}persist();go('revision');}catch(e){toast(e.message)}};
 }else if(step==='revision'){
 body.innerHTML+=field('lcBase','固定初稿',s.draft,true)+field('lcSuggestion','AI／外部候选建议',s.revInput??s.candidate??s.revision??'')+button('lcReview','AI 审校')+button('lcAccept','接受建议')+button('lcKeep','保留初译')+button('lcRewrite','确认自行改写')+button('lcAsk','向 AI 追问此处')+button('lcDoubt','标记疑问')+field('lcReason','决定理由',s.decisionReason)+button('lcRule','保存为语境译名')+button('lcApplyRules','查看匹配译名');
 $('lcSuggestion').oninput=e=>{s.revInput=e.target.value;changed();};$('lcReason').oninput=e=>{s.decisionReason=e.target.value;changed();};$('lcReview').onclick=()=>s.draft?generate(true):toast('请先锁定初稿');
 function decide(choice,v){try{if(!s.draft)throw Error('请先锁定初稿');check(s.source,v);record(choice);s.final=v;s.revision=v;s.reviewChoice=choice;s.unresolved=false;s.finalAt=time();persist();go('final');}catch(e){toast(e.message)}}
 $('lcAccept').onclick=()=>decide('接受建议',$('lcSuggestion').value);$('lcKeep').onclick=()=>decide('保留初译',s.draft);$('lcRewrite').onclick=()=>decide('自行改写',$('lcSuggestion').value);$('lcDoubt').onclick=()=>{s.unresolved=true;persist();toast('已标记待核实');};
 $('lcAsk').onclick=()=>{const q=window.prompt('请输入关于此条的疑问');if(!q)return;s.chat.push({role:'user',stage:'revision',text:q});persist();withBusy('本地化追问',async()=>{const answer=await api([{role:'user',content:prompt(true)+'\n问题：'+q}]);s.chat.push({role:'assistant',stage:'revision',text:answer});persist();draw();});};
 $('lcRule').onclick=()=>{const v=$('lcSuggestion').value;try{check(s.source,v);loc.rules=loc.rules.filter(r=>r.source!==s.source||r.control!==s.context?.control);if(loc.rules.length>=100)throw Error('语境译名最多保存 100 条');loc.rules.push({source:s.source,control:s.context?.control||'',target:v});persist();toast('已保存语境译名');}catch(e){toast(e.message)}};
 $('lcApplyRules').onclick=()=>{const r=loc.rules.find(r=>r.source===s.source&&r.control===(s.context?.control||''));if(r){$('lcSuggestion').value=r.target;s.revInput=r.target;persist();toast('已放入候选，确认后进入终稿');}else toast('当前条目无匹配译名');};
 body.innerHTML+=s.chat.map(m=>`<p><strong>${m.role==='user'?'我':'AI'}：</strong>${text(m.text)}</p>`).join('');
 }else{
 body.innerHTML+=field('lcFinal','人工确认的终稿',s.final)+button('lcConfirm','确认终稿')+button('lcExport','交付与导出')+'<div id="lcDelivery" hidden></div>';
 $('lcFinal').oninput=e=>{s.final=e.target.value;s.reviewChoice='';changed();};$('lcConfirm').onclick=()=>{try{check(s.source,s.final);record('确认终稿');s.reviewChoice='人工确认';s.unresolved=false;s.finalAt=time();persist();toast('终稿已确认');}catch(e){toast(e.message)}};
 $('lcExport').onclick=()=>{const d=$('lcDelivery');d.hidden=!d.hidden;d.innerHTML=button('lcFlat','终稿 JSON')+button('lcPack','带版本的语言包')+button('lcTrace','全部流程与终稿')+button('lcSource','源资源')+button('lcContextExport','语境');
 const guard=()=>{for(const t of p.segments){try{check(t.source,t.final);if(!t.reviewChoice||t.unresolved)throw Error('尚未确认或有疑问');}catch(e){throw Error(t.resourceKey+'：'+e.message)}}};const messages=()=>Object.fromEntries(p.segments.map(t=>[t.resourceKey,t.final]));
 $('lcFlat').onclick=()=>{try{guard();output('messages',messages());}catch(e){toast(e.message)}};$('lcPack').onclick=()=>{try{guard();output('locale',{schema:'interface.locale.v1',project:loc.project||p.id,sourceRevision:loc.revision,sourceBaseline:[...loc.baseline].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),locale:locale(p.targetLang),messages:messages()});}catch(e){toast(e.message)}};$('lcTrace').onclick=saveJSON;$('lcSource').onclick=()=>output('source',{schema:'interface.source.v1',project:loc.project||p.id,revision:loc.revision,sourceLocale:locale(p.sourceLang),targetLocale:locale(p.targetLang),strings:p.segments.map(t=>({id:t.resourceKey,source:t.source,context:t.context})),view:loc.view});$('lcContextExport').onclick=()=>output('context',{contexts:Object.fromEntries(p.segments.map(t=>[t.resourceKey,t.context||{}]))});};
 }
}
$('locPreview').onclick=()=>{const box=$('locPreviewArea');box.replaceChildren();const h=document.createElement('p');h.textContent='文字与变量预览；真实目标界面需单独适配。';box.append(h);for(const t of p.segments){const row=document.createElement('p');row.textContent=t.resourceKey+' · '+(t.final||t.candidate||t.revision||t.draft||t.source).replace(/\{([A-Za-z][A-Za-z_0-9]*)\}/g,'3');box.append(row);}if(loc.view?.type==='commentQueue'){const frame=document.createElement('iframe');frame.style.cssText='width:100%;height:480px;border:1px solid #ddd';frame.sandbox='allow-scripts';fetch('./localization-runtime.html').then(r=>r.text()).then(html=>{frame.onload=()=>{frame.contentWindow.postMessage({channel:'proofdesk.command',action:'source',payload:{schema:'interface.source.v1',project:loc.project||p.id,revision:loc.revision,title:p.title,sourceLocale:locale(p.sourceLang),targetLocale:locale(p.targetLang),strings:p.segments.map(t=>({id:t.resourceKey,source:t.source,context:t.context})),view:loc.view}},'*');const messages=Object.fromEntries(p.segments.map(t=>[t.resourceKey,t.final||t.candidate||t.revision||t.draft||t.source]));frame.contentWindow.postMessage({channel:'proofdesk.command',action:'pack',payload:{schema:'interface.locale.v1',project:loc.project||p.id,sourceRevision:loc.revision,locale:locale(p.targetLang),sourceBaseline:p.segments.map(t=>({id:t.resourceKey,source:t.source})).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),messages}},'*');};frame.srcdoc=html;}).catch(e=>toast(e.message));box.append(frame);h.textContent='批注界面试用：点击查看详情、处理和恢复，检查译文与状态。';}};
};
