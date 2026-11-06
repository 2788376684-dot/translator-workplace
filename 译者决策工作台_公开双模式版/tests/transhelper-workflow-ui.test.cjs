'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const shell=read('atelier.html');
const code=read('transhelper-workflow-ui.js');
const styles=read('transhelper-theme.css');
const core=read('atelier-core.html');
test('review navigation is placed first without recreating existing jump buttons',()=>{
 assert.doesNotThrow(()=>new Function(code));
 assert.match(code,/querySelectorAll\('\[data-sentence-jump\]'\)/);
 assert.match(code,/stage\.insertBefore\(nav,target\)/);
 assert.match(code,/aria-current/);
 assert.match(code,/classList\.add\('th-current-sentence'\)/);
 assert.ok(!code.includes('cloneNode('));
 assert.ok(!code.includes('replaceChildren('));
 assert.ok(!code.includes('localStorage'));
 assert.ok(!code.includes('addEventListener(\'click\''),'navigation retains original button listeners');
});
test('export arrow is removed only from delivery action labels',()=>{
 assert.match(code,/for\(const id of \['exportOpen','paramShowExport'\]\)/);
 assert.match(code,/交付与导出/);
 assert.match(code,/button\.textContent=next/);
 assert.ok(!code.includes('button.onclick='));
});
test('project and AI settings triggers have equal dimensions',()=>{
 assert.match(code,/text==='项目设置'/);
 assert.match(code,/text==='AI 设置'/);
 assert.match(styles,/\.th-settings-trigger/);
 assert.match(styles,/width:104px!important;min-width:104px!important;max-width:104px!important/);
});
test('UI patch stays outside the translator core and does not hide the existing tools',()=>{
 assert.match(shell,/transhelper-workflow-ui\.js/);
 assert.match(core,/function showSentenceReview\(/);
 assert.match(core,/function renderFinal\(/);
 assert.match(core,/function showExport\(/);
 assert.match(core,/function renderParamFinal\(/);
 assert.match(core,/function showParamExport\(/);
 assert.ok(!code.includes('display:none'));
 assert.ok(!code.includes('removeChild('));
 assert.ok(!code.includes('persist('));
 assert.ok(!code.includes('paramDbPut('));
});
