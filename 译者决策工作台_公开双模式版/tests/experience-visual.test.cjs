'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('both entrypoints load the same isolated visual layer',()=>{
 const index=read('index.html'),atelier=read('atelier.html');
 for(const page of [index,atelier]){
  assert.match(page,/transhelper-experience\.css\?v=2/);
  assert.match(page,/transhelper-shell-experience\.css\?v=2/);
  assert.match(page,/app\.src='\/atelier-core\.html'/);
 }
 assert.match(read('account.html'),/transhelper-account-experience\.css\?v=2/);
});
test('visual refinements respect accessibility and retain interaction geometry',()=>{
 const work=read('transhelper-experience.css');
 const account=read('transhelper-account-experience.css');
 const shell=read('transhelper-shell-experience.css');
 for(const css of [work,account,shell]){
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/focus-visible/);
  assert.doesNotMatch(css,/pointer-events\s*:\s*none/);
  assert.doesNotMatch(css,/#sourceEditor\s*\{[^}]*display\s*:\s*none/);
 }
 assert.match(work,/\.app\.parameter-view/);
 assert.match(work,/#th-top-flow/);
 assert.match(work,/#stageContent/);
 assert.doesNotMatch(work,/#paramFrame\s*\{/);
 assert.doesNotMatch(work,/\.ocr-canvas\s*\{/);
});
test('visual layer never changes business scripts, user data or navigation',()=>{
 const work=read('transhelper-experience.css');
 const account=read('transhelper-account-experience.css');
 const shell=read('transhelper-shell-experience.css');
 for(const css of [work,account,shell]){
  assert.doesNotMatch(css,/localStorage|indexedDB|fetch\s*\(|\.click\s*\(|setTimeout\s*\(/);
 }
});

test('purposeful motion is implemented with reduced-motion alternatives',()=>{
 const work=read('transhelper-experience.css');
 const account=read('transhelper-account-experience.css');
 const shell=read('transhelper-shell-experience.css');
 for(const name of ['tx-step-activate','tx-surface-rise','tx-menu-pop']){
  assert.ok(work.includes(name),'missing motion: '+name);
 }
 assert.match(work,/#th-top-flow \.nav-step\.active/);
 assert.match(work,/\.th-quick-menu:not\(\[hidden\]\)/);
 assert.match(work,/prefers-reduced-motion:reduce/);
 assert.match(account,/ac-sheet-rise/);
 assert.match(shell,/tx-dialog-arrive/);
 assert.doesNotMatch(work,/scroll-snap-type|scroll-timeline|requestAnimationFrame|setInterval/);
});
