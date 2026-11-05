from pathlib import Path
import re
p=Path('译者决策工作台_公开双模式版/atelier-core.html')
s=p.read_text()
names=['function renderFinal(', 'function renderRevision(', 'function showSentenceReview(', 'function bindSentenceReview(', 'async function askReviewPoint(', 'function lockRevision(', 'async function runReview(', 'function renderFinal', '交付与导出', 'function draw(', 'function export', 'finalEditor', 'finalText', 'function renderExport']
blocks=[]
for needle in names:
 i=s.find(needle)
 if i==-1:
  blocks.append('NOT FOUND: '+needle);continue
 blocks.append('\n--- '+needle+' @ '+str(i)+' ---\n'+s[max(0,i-280):i+6700])
Path('.github/workbench-diagnostics.txt').write_text('\n'.join(blocks))
print('diagnostic samples extracted')
