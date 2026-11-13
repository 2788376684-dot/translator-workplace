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
