(()=>{
'use strict';
/* Add export scope selection without modifying original export handlers or project data.
   Only ordinary text projects have the process archive; parameter OCR keeps native exports. */
if(window.__thExportScopeInstalled)return;
window.__thExportScopeInstalled=true;
const D=document,stage=D.getElementById('stageContent');
if(!stage)return;
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const str=x=>x==null?'':String(x);
const clean=x=>str(x).trim();
const safeName=x=>(clean(x)||'Transhelper').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,70);
function workspace(){
 try{
  const state=JSON.parse(localStorage.getItem('tw-workplace-v4')||'null');
  if(!state||!Array.isArray(state.projects))return null;
  const p=state.projects.find(p=>p.id===state.active)||state.projects[0];
  return p&&Array.isArray(p.segments)?p:null;
 }catch{return null;}
}
function projectArchive(p){
 return {
  format:'TranshelperTranslationArchive',version:1,exportedAt:new Date().toISOString(),
  project:{
   title:str(p.title),kind:p.kind||'text',sourceLanguage:str(p.sourceLang),
   targetLanguage:str(p.targetLang),tone:str(p.tone),instructions:str(p.instructions),
   terminology:Array.isArray(p.terms)?p.terms.map(t=>({source:str(t.source),targets:Array.isArray(t.targets)?t.targets.map(str):[]})):[],
   segments:p.segments.map((s,index)=>({
    index:index+1,
    source:str(s.source),
    initialDraft:str(s.draft||s.draftInput),
    initialDraftMetadata:s.draftMeta||null,
    secondDraft:str(s.revision||s.revInput),
    secondDraftMetadata:s.revMeta||null,
    reviewInstructions:str(s.reviewPromptUsed),
    aiSuggestions:(Array.isArray(s.reviewDecisions)?s.reviewDecisions:[]).map((r,i)=>({
     sentence:i+1,originalTranslation:str(r.old),proposal:str(r.proposed),
     rationale:str(r.reason),decision:str(r.choice),manualRevision:str(r.custom),
     openQuestion:str(r.questionNote),
     followUps:(Array.isArray(r.qa)?r.qa:[]).map(q=>({role:str(q.role),text:str(q.text)}))
    })),
    reviewIssues:Array.isArray(s.issues)?s.issues:[],
    finalTranslation:str(s.final),
    finalCreatedAt:str(s.finalAt),
    finalQACheck:s.qa||null,
    assistantConversation:(Array.isArray(s.chat)?s.chat:[]).map(q=>({
     role:str(q.role),stage:str(q.stage),text:str(q.text)
    })),
    previousVersions:(Array.isArray(s.history)?s.history:[]).map(v=>({
     savedAt:str(v.at),reason:str(v.why),text:str(v.text)
    }))
   }))
  }
 };
}
function lines(archive){
 const p=archive.project,out=[
 'Transhelper｜完整翻译档案',
 '项目：'+p.title,
 '源语言：'+p.sourceLanguage+'　目标语言：'+p.targetLanguage,
 '导出时间：'+archive.exportedAt,
 '翻译要求：'+(p.instructions||'未记录'),
 '文体要求：'+(p.tone||'未记录')
 ];
 if(p.terminology.length){
  out.push('','术语表');
  p.terminology.forEach(t=>out.push(t.source+' → '+t.targets.join(' / ')));
 }
 for(const s of p.segments){
  out.push('','＝＝＝＝＝＝ 段落 '+s.index+' ＝＝＝＝＝＝');
  const section=(label,value)=>out.push('',label,value||'（无记录）');
  section('一、原文',s.source);
  section('二、初稿',s.initialDraft);
  section('三、二稿',s.secondDraft);
  section('四、AI 审校指令',s.reviewInstructions);
  out.push('','五、逐句 AI 建议与译者决策');
  if(!s.aiSuggestions.length)out.push('（无记录）');
  for(const x of s.aiSuggestions){
   out.push('','句 '+x.sentence,'初译：'+x.originalTranslation,
    'AI 建议：'+x.proposal,'修改理由：'+x.rationale,
    '译者决策：'+(x.decision||'未决定'));
   if(x.manualRevision)out.push('人工改写：'+x.manualRevision);
   if(x.openQuestion)out.push('待核实问题：'+x.openQuestion);
   for(const q of x.followUps)out.push((q.role==='user'?'译者':'AI')+'追问记录：'+q.text);
  }
  if(s.reviewIssues.length)section('六、审校问题记录',JSON.stringify(s.reviewIssues,null,2));
  section('七、终稿',s.finalTranslation);
  out.push('','八、AI 助手对话');
  if(!s.assistantConversation.length)out.push('（无记录）');
  for(const x of s.assistantConversation)out.push((x.role==='user'?'译者':'AI')+(x.stage?' ['+x.stage+']':'')+'：'+x.text);
  out.push('','九、保存的历史版本');
  if(!s.previousVersions.length)out.push('（无记录）');
  for(const v of s.previousVersions)out.push('时间：'+v.savedAt+'；原因：'+v.reason+'\n'+v.text);
  if(s.finalQACheck)out.push('','十、终稿核查记录',JSON.stringify(s.finalQACheck,null,2));
 }
 return out.join('\n');
}
function download(name,content,type){
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=D.createElement('a');
 a.href=url;a.download=name;a.style.position='absolute';a.style.left='-99999px';
 D.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function exportHtml(archive){
 const content=lines(archive);
 const body=escapeHtml(content).split('\n').map(line=>{
  if(/^＝＝＝＝＝＝/.test(line))return '<h2>'+line.replace(/＝/g,'').trim()+'</h2>';
  if(/^[一二三四五六七八九十]、/.test(line))return '<h3>'+line+'</h3>';
  if(!line)return '<div class="space"></div>';
  return '<p>'+line+'</p>';
 }).join('\n');
 return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>'+
 escapeHtml(archive.project.title)+' · 翻译档案</title><style>'+
 '@page{size:A4;margin:18mm}body{font:12pt/1.7 "Times New Roman","SimSun",serif;max-width:850px;margin:30px auto;color:#242424}'+
 'h2{font-size:16pt;border-bottom:1px solid #ddd;padding:8px 0;margin-top:30px;break-after:avoid}'+
 'h3{font-size:12pt;margin:17px 0 6px;break-after:avoid}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0}'+
 '.space{height:8px}@media print{body{margin:0}}'+
 '</style></head><body>'+body+'</body></html>';
}
function crc32(bytes){
 let crc=0xFFFFFFFF;
 for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xEDB88320:0);}
 return (crc^0xFFFFFFFF)>>>0;
}
function zipStore(entries){
 const enc=new TextEncoder(),parts=[],records=[];let offset=0;
 const u16=(v)=>[v&255,(v>>>8)&255],u32=(v)=>[v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];
 function add(bytes){parts.push(bytes);offset+=bytes.length}
 for(const [name,body] of entries){
  const nameBytes=enc.encode(name),bytes=enc.encode(body),crc=crc32(bytes),start=offset;
  add(Uint8Array.from([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
   ...u32(crc),...u32(bytes.length),...u32(bytes.length),...u16(nameBytes.length),...u16(0)]));
  add(nameBytes);add(bytes);
  records.push({nameBytes,length:bytes.length,crc,start});
 }
 const centralOffset=offset;
 for(const r of records){
  add(Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),
   ...u16(0),...u16(0),...u32(r.crc),...u32(r.length),...u32(r.length),
   ...u16(r.nameBytes.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(r.start)]));
  add(r.nameBytes);
 }
 const centralSize=offset-centralOffset;
 add(Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),
  ...u16(records.length),...u16(records.length),...u32(centralSize),...u32(centralOffset),...u16(0)]));
 const all=new Uint8Array(offset);let i=0;
 for(const part of parts){all.set(part,i);i+=part.length;}
 return all;
}
function docxArchive(archive){
 const parts=lines(archive).split('\n');
 const para=parts.map(line=>{
  const heading=/^＝＝＝＝＝＝/.test(line)||/^[一二三四五六七八九十]、/.test(line);
  const value=line.replace(/＝/g,'').trim();
  return '<w:p><w:pPr>'+(heading?'<w:pStyle w:val="Heading2"/>':'')+
   '</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="SimSun"/>'+
   '</w:rPr><w:t xml:space="preserve">'+escapeHtml(value)+'</w:t></w:r></w:p>';
 }).join('');
 const document='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
 '<w:body>'+para+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1152" w:bottom="1080" w:left="1152"/></w:sectPr></w:body></w:document>';
 const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
 '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>'+
 '<w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>';
 const entries=[
  ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
   '<Default Extension="xml" ContentType="application/xml"/>'+
   '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
   '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
  ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
  ['word/styles.xml',styles],['word/document.xml',document]
 ];
 return zipStore(entries);
}
function renderScope(){
 const native=stage.querySelector('.export-row:has([data-export])');
 if(!native||native.dataset.thScopeReady)return;
 const p=workspace();
 if(!p||p.kind==='parameter')return;
 native.dataset.thScopeReady='1';
 const scope=D.createElement('section');scope.className='th-export-scope';
 scope.innerHTML='<h3>选择导出范围</h3><div class="th-export-scope-options">'+
 '<label><input type="radio" name="th-export-scope" value="final" checked><span><strong>仅终稿</strong><small>保留现有 Word、TXT、CSV、HTML 导出方式</small></span></label>'+
 '<label><input type="radio" name="th-export-scope" value="archive"><span><strong>完整翻译档案</strong><small>原文、多稿、逐句 AI 建议、译者决策、追问记录、历史版本与终稿</small></span></label>'+
 '</div>';
 const archButtons=D.createElement('div');archButtons.className='th-archive-export-row';
 archButtons.hidden=true;
 for(const [format,label] of [['docx','完整档案 Word'],['html','完整档案 HTML'],['txt','完整档案 TXT'],['json','完整档案 JSON']]){
  const b=D.createElement('button');b.type='button';b.className='btn '+(format==='docx'?'primary':'');
  b.textContent=label;b.dataset.archiveExport=format;
  b.addEventListener('click',()=>{
   const latest=workspace();
   if(!latest){alert('读取项目失败。请先使用原有“项目备份”保存当前工程。');return;}
   if(latest.kind==='parameter'){alert('参数表请使用原有 OCR 项目导出功能。');return;}
   const archive=projectArchive(latest),name=safeName(latest.title)+'_完整翻译档案';
   try{
    if(format==='json')download(name+'.json',JSON.stringify(archive,null,2),'application/json;charset=utf-8');
    if(format==='txt')download(name+'.txt',lines(archive),'text/plain;charset=utf-8');
    if(format==='html')download(name+'.html',exportHtml(archive),'text/html;charset=utf-8');
    if(format==='docx')download(name+'.docx',docxArchive(archive),'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
   }catch(e){console.error('Transhelper archive export:',e);alert('完整档案导出失败：'+String(e?.message||e));}
  });
  archButtons.append(b);
 }
 const caption=D.createElement('p');caption.className='th-export-scope-caption';
 caption.textContent='导出完整档案将包含全部段落及当前已保存的审校与 AI 对话历史；未记录的数据会明确标示。请留意其中可能包含敏感材料。';
 archButtons.append(caption);
 native.before(scope);
 native.after(archButtons);
 const originalHint=native.parentElement.querySelector('p.muted');
 function choose(value){
  const full=value==='archive';
  native.hidden=full;archButtons.hidden=!full;
  if(originalHint)originalHint.hidden=full;
 }
 scope.addEventListener('change',e=>{if(e.target?.name==='th-export-scope')choose(e.target.value);});
 choose('final');
}
let scheduled=false;
const observer=new MutationObserver(()=>{
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;renderScope();});
});
observer.observe(stage,{subtree:true,childList:true});
renderScope();
})();