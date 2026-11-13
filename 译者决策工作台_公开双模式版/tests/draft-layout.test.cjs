'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
test('draft layout enhancement parses and is loaded by the workspace wrapper',()=>{
 const script=read('transhelper-draft-layout.js');
 const shell=read('atelier.html');
 assert.doesNotThrow(()=>new Function(script));
 assert.match(shell,/transhelper-draft-layout\.js/);
 assert.match(shell,/transhelper-draft-layout\.css/);
 assert.match(script,/生成设置/);
 assert.match(script,/恢复默认/);
 assert.doesNotMatch(script,/localStorage|persist\(|\.value\s*=|\.onclick\s*=/);
});
test('generation prompt width expands, and workflow header sticks in the scroll viewport',()=>{
 const css=read('transhelper-draft-layout.css');
 assert.match(css,/textarea\.th-generation-prompt/);
 assert.match(css,/width:100%!important/);
 assert.match(css,/\.topbar\{/);
 assert.match(css,/position:sticky!important/);
 assert.match(css,/top:0!important/);
});
