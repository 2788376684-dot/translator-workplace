from pathlib import Path
p=Path('译者决策工作台_公开双模式版/atelier-core.html')
s=p.read_text(encoding='utf-8')
if 'function paramIssueHtml(s){' in s:
 print('Already patched');raise SystemExit(0)
anchor='function renderParamRevision(){'
assert s.count(anchor)==1
helper='''function paramIssueHtml(s){
 const issues=Array.isArray(s.issues)?s.issues:[];
 return '<div class="tw-param-issues">'+issues.slice(0,30).map((item,i)=>{
  const x=item&&typeof item==='object'?item:{reason:String(item??'')};
  const f=[['位置',x.quote||x.location||x.cell],['问题',x.problem||x.issue],['建议',x.suggestion||x.revised],['依据',x.reason||x.explanation]];
  const fields=f.filter(([,v])=>v!=null&&String(v).trim()).map(([k,v])=>'<p class="panel-note"><strong>'+E(k)+'：</strong>'+E(String(v))+'</p>').join('');
  return '<article class="tw-param-issue"><strong>审校意见 '+(i+1)+'</strong>'+(fields||'<p class="panel-note">'+E(JSON.stringify(x))+'</p>')+'</article>';
 }).join('')+'</div>';
}
'''
s=s.replace(anchor,helper+anchor,1)
old="${paramEditorHtml('revision',locked)}${s.issues.length?panel('AI 修改理由',`<div class=\"pane-content\">${issueHtml(s)}</div>`):''}${!locked?panel('AI 审校表格',"
assert s.count(old)==1, 'review block prefix changed'
s=s.replace(old,"${!locked?panel('AI 审校表格',",1)
tail="重新审校会清除当前终稿。</span></div>'}`;"
newtail="重新审校会清除当前终稿。</span></div>'}${s.issues.length?panel('AI 修改理由',`<div class=\"pane-content\">${paramIssueHtml(s)}</div>`):''}${paramEditorHtml('revision',locked)}`;"
assert s.count(tail)==1, 'review panel end changed'
s=s.replace(tail,newtail,1)
assert 'issueHtml(s)' not in s
assert s.index("${!locked?panel('AI 审校表格',",s.index(anchor))<s.index("${paramEditorHtml('revision',locked)}",s.index(anchor))
p.write_text(s,encoding='utf-8')
print('Fixed undefined issueHtml; review controls now above OCR cell editor')
