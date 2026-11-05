from pathlib import Path
p=Path('译者决策工作台_公开双模式版/atelier-core.html')
s=p.read_text(encoding='utf-8')
if 'function applyDocumentSource(' in s:
    print('Unified source already installed')
    raise SystemExit(0)
start=s.index('function renderSource(){')
end=s.index('function baseContext(s){',start)
replacement=r'''const sourceBuffers={};
function documentText(p){return p.segments.map(x=>x.source||'').join('\n\n');}
function applyDocumentSource(content,quiet=false){
 const p=proj(),parts=String(content).replace(/\r/g,'').trim().split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 if(!parts.length){if(!quiet)toast('请输入原文');return false;}
 const old=p.segments;const same=parts.length===old.length&&parts.every((t,i)=>t===old[i].source);
 if(same){delete sourceBuffers[p.id];return true;}
 const impact=old.some((x,i)=>(x.draft||x.draftInput||x.revision||x.revInput||x.final)&&parts[i]!==x.source);
 if(impact&&quiet)return false;
 if(impact&&!confirm('部分原文已有关联初稿、二稿或终稿。修改这些原文会清除对应段落的后续版本；未修改的段落保持不变。建议先导出项目备份。确认更新？'))return false;
 const fresh=parts.map((t,i)=>{const prior=old[i];return prior&&prior.source===t?prior:newSeg(t)});
 p.segments=fresh;
 if(!fresh.some(x=>x.id===state.seg))state.seg=fresh[0].id;
 delete sourceBuffers[p.id];persist();
 if(!quiet){draw();toast('原文已保存，识别为 '+fresh.length+' 段');}
 return true;
}
function renderSource(){
 if(proj().kind==='parameter')return renderParamSource();
 const p=proj();const val=sourceBuffers[p.id]??documentText(p);
 action('<button class="btn" id="importText">导入 TXT / Word</button><button class="btn" id="sourceOCR">导入图片 · OCR</button><button class="btn primary" id="toDraft">下一步：初稿 →</button>');
 $('stageSub').textContent='在同一处输入或导入全文；段落之间留空行，保存后自动分段';
 $('stageContent').innerHTML=panel('原文 · 全文输入',`<div class="pane-content"><p class="panel-note" style="margin:0 0 9px">粘贴全文或直接输入。段落之间留一个空行；保存后自动更新左侧段落列表。点击左侧段落，再进入初稿即可逐段翻译。</p><textarea class="editor-text source-cn" id="sourceEditor" spellcheck="false" style="width:100%;min-height:240px!important;max-height:70vh!important;resize:vertical" placeholder="在此输入或粘贴完整原文，段落之间留一个空行">${E(val)}</textarea><div class="more-tools" style="margin-top:10px;flex-wrap:wrap"><button class="btn primary" id="applySource">保存原文并识别段落</button><span id="sourceDocStatus" class="muted">${p.segments.length} 段 · 保存后同步左侧列表</span></div></div>`)+ '<div class="doc-footer"><span class="muted">已有译稿的段落发生原文修改时会二次确认。内容没有变化的段落保留所有翻译版本。</span></div>';
 const editor=$('sourceEditor'),msg=$('sourceDocStatus');
 editor.addEventListener('input',()=>{
   sourceBuffers[p.id]=editor.value;
   msg.textContent='已编辑 · 点击保存原文并识别段落';
   if(!p.segments.some(x=>x.draft||x.draftInput||x.revInput||x.revision||x.final)){
      const parts=editor.value.replace(/\r/g,'').trim().split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
      if(parts.length===1&&p.segments.length===1){p.segments[0].source=parts[0];persist();}
   }
 });
 $('applySource').onclick=()=>applyDocumentSource(editor.value);
 $('importText').onclick=chooseFile;
 $('sourceOCR').onclick=()=>$('quickOCR').click();
 $('toDraft').onclick=()=>{if(!applyDocumentSource(editor.value))return;if(!seg().source.trim())return toast('请先输入原文');go('draft');};
}
function splitSource(content){return applyDocumentSource(content);}
'''
s=s[:start]+replacement+s[end:]
old="$('bulkSource').value=text;toast('已读取文件，请检查分段后点击「创建段落」');"
new="$('sourceEditor').value=text;$('sourceEditor').dispatchEvent(new Event('input',{bubbles:true}));toast('文件已载入统一原文输入区；请检查并保存分段');"
assert s.count(old)==1,('import anchor',s.count(old))
s=s.replace(old,new,1)
assert 'function renderSource()' in s and 'function applyDocumentSource(' in s
p.write_text(s,encoding='utf-8')
print('Unified source interface patched')
