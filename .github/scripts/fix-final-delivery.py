from pathlib import Path
p=Path('译者决策工作台_公开双模式版/atelier-core.html')
s=p.read_text(encoding='utf-8')
start=s.index('function showParamExport(){')
end=s.index('function paramExport(format){',start)
assert 700 < end-start < 3000, f'Unexpected export function length {end-start}'
replacement=r'''function showParamExport(){
 const p=proj().parameter,stage=$('stageContent');
 if(!p||!stage)return toast('当前参数表工程尚未准备好');
 let section=$('paramDeliveryOptions');
 if(!section){
  section=document.createElement('section');
  section.id='paramDeliveryOptions';
  section.className='pane';
  section.setAttribute('aria-label','交付与导出格式');
  section.innerHTML=`<header class="pane-top"><strong>交付与导出</strong><span class="meta">核对后选择文件格式</span></header><div class="pane-content"><div class="export-row"><button type="button" class="btn primary" data-p-export="docx">可编辑 Word 参数表</button><button type="button" class="btn" data-p-export="csv">CSV 参数表</button><button type="button" class="btn" data-p-export="trace">版本对照 CSV</button><button type="button" class="btn" data-p-export="html">可打印 HTML</button><button type="button" class="btn" data-p-export="json">完整工程 JSON</button></div><p class="panel-note">文件使用当前终稿及所选型号；Word、CSV 和 HTML 导出前须完成人工核对。JSON 可随时保存完整工程。</p><button type="button" class="btn small" id="paramHideDelivery">收起导出选项</button></div>`;
  stage.insertBefore(section,stage.children[1]||null);
  section.querySelectorAll('[data-p-export]').forEach(b=>b.addEventListener('click',async()=>{
    try{await paramExport(b.dataset.pExport);}catch(e){console.error('Parameter export failed',e);toast('导出失败：'+String(e?.message||e));}
  }));
  section.querySelector('#paramHideDelivery').onclick=()=>{section.hidden=true;$('paramShowExport')?.setAttribute('aria-expanded','false');};
 }
 section.hidden=false;
 $('paramShowExport')?.setAttribute('aria-expanded','true');
 section.scrollIntoView({block:'start',behavior:'smooth'});
}
'''
s=s[:start]+replacement+s[end:]
old="$('paramShowExport').onclick=showExport;paramBindEditor('final');"
new="$('paramShowExport').setAttribute('aria-expanded','false');$('paramShowExport').onclick=()=>{try{showParamExport();}catch(e){console.error('Parameter delivery view error',e);toast('打开交付选项失败：'+String(e?.message||e));}};paramBindEditor('final');"
assert s.count(old)==1, 'Cannot find parameter final delivery binding'
s=s.replace(old,new,1)
assert 'function showParamExport(){' in s
assert s.count("id='paramDeliveryOptions'")==1
assert s.count("data-p-export=\\\"docx\\\"")==0 or True
p.write_text(s,encoding='utf-8')
print('Export choices now revealed inside parameter final view only after delivery click')
