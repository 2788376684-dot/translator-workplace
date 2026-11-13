'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('sidebar context layer is syntactically valid and installed',()=>{
 const script=read('transhelper-sidebar-context.js');
 const shell=read('atelier.html');
 assert.doesNotThrow(()=>new Function(script));
 assert.match(shell,/transhelper-sidebar-context\.js/);
 assert.match(shell,/transhelper-sidebar-context\.css/);
 assert.match(script,/getElementById\('stageCaption'\)/);
 assert.match(script,/getElementById\('stageTitle'\)/);
 assert.match(script,/th-default-ai-slot/);
});
test('context mirror preserves workflow handlers and draft locking',()=>{
 const script=read('transhelper-sidebar-context.js');
 const css=read('transhelper-sidebar-context.css');
 assert.doesNotMatch(script,/\.onclick\s*=|\.value\s*=|localStorage|\.click\(\)/);
 assert.match(css,/#stageTitle/);
 assert.doesNotMatch(css,/lockDraft|confirmDraft|backupProject/);
});

test('duplicate stage context is collapsed without removing stage controls',()=>{
 const script=read('transhelper-sidebar-context.js');
 const css=read('transhelper-sidebar-context.css');
 const swap=read('transhelper-navigation-swap.js');
 assert.match(script,/th-redundant-stage-context/);
 assert.match(script,/querySelector\('button,a\[href\],input,textarea,select,\[role="button"\]'\)/);
 assert.match(css,/\.th-redundant-stage-context\{display:none!important/);
 assert.match(script,/th-sidebar-ai-status/);
 assert.match(swap,/sectionLabel\.textContent='设置'/);
});

test('brand stays ahead of context and completion actions remain visible',()=>{
 const script=read('transhelper-sidebar-context.js');
 assert.match(script,/sidebar\.querySelector\('\.logo,\.th-brand-shell'\)/);
 assert.match(script,/anchor\.insertAdjacentElement\('afterend',context\)/);
 assert.doesNotMatch(script,/sidebar\.insertBefore\(context,sidebar\.firstChild\)/);
 assert.match(script,/getBoundingClientRect/);
 assert.match(script,/querySelector\('button,a\[href\],input,textarea,select,\[role="button"\]'\)/);
});
