'use strict';
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const base=join(__dirname,'..');
const read=name=>readFileSync(join(base,name),'utf8');
const index=read('index.html'),atelier=read('atelier.html'),core=read('atelier-core.html'),enh=read('atelier-review-enhancements.js'),api=read('api/chat.js');
test('entry architecture is complete and parses',()=>{assert.match(index,/atelier-core\.html/);assert.match(atelier,/atelier-core\.html/);assert.match(atelier,/atelier-review-enhancements\.js/);assert.doesNotThrow(()=>new Function(index.match(/<script>([\s\S]*?)<\/script>/)[1]));assert.doesNotThrow(()=>new Function(enh));assert.doesNotThrow(()=>new Function(api));});
test('iframe loader has visible failure and timeout recovery',()=>{assert.match(atelier,/addEventListener\('error'/);assert.match(atelier,/工作台加载时间较长/);assert.match(atelier,/直接进入工作台/);});
test('review enhancement preserves safe diff rendering and sentence alignment',()=>{for(const expected of ['function diff(','function sentences(','tw-source-alignment-v1','textContent','innerHTML'])assert.ok(enh.includes(expected),`missing ${expected}`);});
test('backend exposes structured error handling',()=>{for(const expected of ['RATE_LIMIT_LOCAL','Retry-After','CHAT_DISABLED','timingSafeEqual'])assert.ok(api.includes(expected),`missing ${expected}`);});
test('core contains protected workflow and storage keys',()=>{for(const expected of ['tw-workplace-v4','localStorage','migrate','runQA','saveVersion'])assert.ok(core.includes(expected),`missing ${expected}`);});

// Regression barriers for workflow preservation. These are structural checks,
// not substitutes for end-to-end OCR or AI API testing.
test('original inline application script remains syntactically valid',()=>{
 const match=core.match(/<script>'use strict';([\s\S]*?)<\/script>/);
 assert.ok(match,'core translator inline script');
 assert.doesNotThrow(()=>new Function("'use strict';"+match[1]));
 assert.match(core,/id="week8-packed"/,'original packed OCR engine retained');
});
test('core keeps translator-led review, AI questions, local persistence and exports',()=>{
 for(const expected of [
  'function showSentenceReview(', 'function lockRevision(', 'function mergeReviewChoices(',
  'async function askReviewPoint(', 'function renderFinal(', 'function renderHistoryInline(',
  'function showExport(', 'function exportFile(', 'function saveJSON(',
  'function renderParamSource(', 'function renderParamDraft(', 'function renderParamRevision(',
  'function renderParamFinal(', 'function showParamExport(', 'function paramExport(',
  'function paramDbGet(', 'function paramDbPut('
 ])assert.ok(core.includes(expected),'core workflow missing: '+expected);
 for(const decision of ["choice==='keep'","choice==='custom'","choice==='question'"])
  assert.ok(core.includes(decision),'translator decision missing: '+decision);
 for(const format of ['docx','txt','csv','html','json','trace'])
  assert.ok(core.includes(format),'export option missing: '+format);
});
test('continuity is isolated from original editor and can fail open',()=>{
 const script=read('tw-continuity-guard.js');
 assert.match(atelier,/tw-continuity-guard\.js/);
 assert.match(atelier,/Workspace recovery unavailable; native editor and exports remain operational/);
 assert.doesNotThrow(()=>new Function(script));
 for(const text of ['tw-workplace-v4','indexedDB.open','window.addEventListener(\'storage\'','window.confirm','LIMIT=3'])
  assert.ok(script.includes(text),'recovery boundary missing: '+text);
 assert.ok(!script.includes('removeItem(KEY)'),'recovery must not erase working data');
});
