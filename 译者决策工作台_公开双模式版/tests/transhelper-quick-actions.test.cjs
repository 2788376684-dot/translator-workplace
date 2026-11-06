'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const root=join(__dirname,'..'),read=n=>readFileSync(join(root,n),'utf8');
const script=read('transhelper-quick-actions.js'),css=read('transhelper-quick-actions.css'),shell=read('atelier.html'),core=read('atelier-core.html');
test('quick dock is parseable, accessible, collapsible and independent from project state',()=>{
 assert.doesNotThrow(()=>new Function(script));
 for(const id of ['thQuickDock','thQuickToggle','thQuickMenu','aria-expanded','aria-controls','pointerdown','Escape','setOpen(menu.hidden)'])
  assert.ok(script.includes(id),id);
 assert.doesNotMatch(script,/localStorage|sessionStorage|persist\(|paramDbPut\(|deleteProject\(/);
 assert.match(script,/window\.__thQuickActionsInstalled/);
});
test('quick AI action delegates to existing stage assistant and falls back to configuration',()=>{
 assert.match(script,/getElementById\('openStageAI'\)/);
 assert.match(script,/native\.click\(\)/);
 assert.match(script,/getElementById\('openAISettings'\)/);
 assert.match(core,/id=['"]openStageAI|b\.id='openStageAI'/);
 assert.match(core,/stageAIInput/);
});
test('backup, scroll and final QA use native operations',()=>{
 assert.match(script,/getElementById\('backupProject'\)/);
 assert.match(script,/getElementById\('runQA'\)/);
 assert.match(script,/scrollTo\(/);
 assert.match(script,/qa\.hidden=!onFinal/);
});
test('quick dock and progress do not collide or obscure OCR controls',()=>{
 assert.match(css,/th-quick-dock-ready #th-ai-progress/);
 assert.match(css,/th-quick-dock-ready #openStageAI/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/th-quick-action:focus-visible/);
 assert.match(shell,/transhelper-quick-actions\.css/);
 assert.match(shell,/transhelper-quick-actions\.js/);
 assert.match(shell,/week8-native-geometry\.js/);
 assert.match(shell,/week8-review-safety\.js/);
});
