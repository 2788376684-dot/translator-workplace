from pathlib import Path
p=Path('译者决策工作台_公开双模式版/atelier-core.html')
s=p.read_text(encoding='utf-8')
anchor=""" if(!valid){
  html+='<section class="pane"><div class="pane-content"><p class="panel-note">"""
if anchor not in s:
    raise RuntimeError('Review setup insertion point changed; abort to avoid modifying unrelated UI')
new=""" if(!locked&&reviewSetupOpen){
  // Keep existing review data intact but hide its cards until the setup is
  // confirmed or cancelled. This also avoids confusing old suggestions with
  // a new AI run before any request has completed.
  html+='<p class="tw-review-only-settings" style="max-width:1030px;margin:10px auto 0;color:#64748b;font-size:13px">当前审校记录保持不变。确认审校要求后开始新一轮 AI 逐句审校；取消则返回现有逐句审校界面。</p>';
  return html;
 }
"""
s=s.replace(anchor,new+anchor,1)
assert s.count('tw-review-only-settings')==1
p.write_text(s,encoding='utf-8')
print('Review setup now shows a separate, stable state until user starts or cancels')
