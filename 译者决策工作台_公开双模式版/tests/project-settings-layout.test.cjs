const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
test('project settings presentation layer is independently loaded and syntactically valid',()=>{
 const js=read('transhelper-project-settings.js'),shell=read('atelier.html');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(shell,/transhelper-project-settings\.js/);
 assert.match(shell,/transhelper-project-settings\.css/);
});
test('project settings layout preserves original settings controls and storage',()=>{
 const js=read('transhelper-project-settings.js');
 assert.match(js,/项目设置/);
 assert.match(js,/项目语言、文体、要求与术语/);
 assert.match(js,/用于 AI 提示与本地质检/);
 assert.match(js,/AI 翻译与审校设置/);
 assert.doesNotMatch(js,/createElement\('p'\)/);
 assert.match(js,/th-project-compact-header/);
 assert.match(js,/译文风格与要求/);
 assert.match(js,/th-project-requirements/);
 const style=read('transhelper-project-settings.css');
 assert.match(style,/height:76px!important/);
 assert.match(style,/resize:vertical!important/);
 for(const destructive of ['removeChild(','replaceChildren(','localStorage','persist(','\.onclick','\.click(']){
  assert.ok(!js.includes(destructive),'presentation must not change native behavior: '+destructive);
 }
});
