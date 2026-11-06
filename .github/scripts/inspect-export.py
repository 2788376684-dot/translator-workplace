from pathlib import Path
s=Path('译者决策工作台_公开双模式版/atelier-core.html').read_text()
needles=['function renderParamFinal(', 'function renderFinal(', 'function showExport(', 'function renderExport(', "id=\"paramShowExport\"", "id=\"exportOpen\"", "function paramExport", "function export"]
out=[]
for t in needles:
  p=0
  while True:
    i=s.find(t,p)
    if i<0:break
    out.append('\n==== '+t+' position '+str(i)+' ====\n'+s[max(0,i-350):i+5500])
    p=i+len(t)
Path('.github/export-diagnostics.txt').write_text('\n'.join(out))
