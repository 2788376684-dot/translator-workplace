'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('sidebar integration parses and is loaded by both entrypoints',()=>{
 const script=read('transhelper-sidebar-context.js');
 const shell=read('atelier.html'),entry=read('index.html');
 assert.doesNotThrow(()=>new Function(script));
 for(const html of [shell,entry]){
  assert.match(html,/transhelper-sidebar-context\.js/);
  assert.match(html,/transhelper-sidebar-context\.css/);
 }
});
test('hide the actual redundant native topbar row, preserving workflow navigation',()=>{
 const script=read('transhelper-sidebar-context.js');
 const css=read('transhelper-sidebar-context.css');
 assert.match(css,/\.topbar > \.crumb/);
 assert.match(css,/\.topbar > \.top-right/);
 assert.doesNotMatch(css,/\.topbar\s*\{\s*display:none/);
 assert.match(script,/getElementById\('th-top-flow'\)/);
 assert.match(script,/getElementById\('modeTop'\)/);
 assert.match(script,/statusRow\.append\(mode\)/);
 assert.match(script,/getElementById\('quickOCR'\)/);
 assert.match(script,/tools\.append\(ocr\)/);
 assert.match(css,/#th-sidebar-context\{display:none!important/);
 assert.doesNotMatch(script,/sidebar\.insertBefore\(context|createElement\('section'\)/);
 assert.doesNotMatch(script,/\.onclick\s*=|\.value\s*=|localStorage|\.click\(\)/);
});

test('AI status sits below current project, spans the sidebar and retains native state',()=>{
 const script=read('transhelper-sidebar-context.js');
 const css=read('transhelper-sidebar-context.css');
 assert.match(script,/sidebar\.querySelector\('\.project-control'\)/);
 assert.match(script,/heading\.textContent='当前AI状态'/);
 assert.match(script,/heading\.className='side-label'/);
 assert.match(script,/projectControl\.insertAdjacentElement\('afterend',heading\)/);
 assert.match(script,/heading\.insertAdjacentElement\('afterend',statusRow\)/);
 assert.match(script,/statusRow\.append\(mode\)/);
 assert.match(css,/#th-ai-state-row #modeTop\.th-sidebar-mode/);
 assert.match(css,/width:100%!important/);
});
