'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=file=>readFileSync(join(root,file),'utf8');
const wrapper=read('atelier.html'),entry=read('index.html'),home=read('home.html');
const style=read('transhelper-theme.css'),brand=read('transhelper-brand.js');
const core=read('atelier-core.html');
test('Transhelper is the visible product and original routing remains',()=>{
 assert.match(wrapper,/<title>Transhelper · Workspace<\/title>/);
 assert.match(entry,/<title>Transhelper<\/title>/);
 assert.match(home,/<title>Transhelper<\/title>/);
 assert.match(wrapper,/app\.src='\/atelier-core\.html'/);
 assert.match(wrapper,/transhelper-theme\.css/);
 assert.match(wrapper,/transhelper-brand\.js/);
 assert.doesNotThrow(()=>new Function(brand));
});
test('style stays separate from functional core and respects accessibility',()=>{
 assert.match(style,/prefers-reduced-motion:reduce/);
 assert.match(style,/:focus-visible/);
 assert.match(style,/--th-blue:#0071e3/);
 assert.match(style,/\.tw-card/);
 assert.ok(!style.includes('display:none'),'design layer must not hide actions');
 assert.ok(!style.includes('pointer-events:none'),'design layer must not disable OCR controls');
});
test('legacy project storage and workflows are unchanged by rebranding',()=>{
 for(const phrase of ['tw-workplace-v4','function runReviewNow(','function showExport(','function renderParamSource(','function paramExport(','week8-packed']){
  assert.ok(core.includes(phrase),'original workflow missing '+phrase);
 }
 for(const phrase of ['localStorage.setItem','localStorage.removeItem','paramDbPut','rebuild(']){
  assert.ok(!brand.includes(phrase),'branding must not modify functionality: '+phrase);
 }
 for(const path of ['atelier-review-enhancements.js','week8-native-geometry.js','tw-continuity-guard.js','week8-review-safety.js']){
  assert.ok(wrapper.includes(path),'legacy enhancement removed: '+path);
 }
});


test('brand mount replaces all legacy icons and old wordmark exactly once',()=>{
 const vm=require('node:vm');
 function element(tag){
  return {
   tagName:tag,children:[],className:'',dataset:{},attributes:{},
   append(...v){this.children.push(...v)},
   replaceChildren(...v){this.children=[...v]},
   setAttribute(k,v){this.attributes[k]=v},
   querySelector(s){return s==='.th-brand-shell'?this.children.find(x=>x.className==='th-brand-shell')||null:null}
  };
 }
 const sidebar=element('aside'),logo=element('div');
 logo.children=[element('i'),element('i'),element('span')];
 const doc={
  title:'Old title',
  querySelector:s=>s.includes('.logo')?logo:s==='.sidebar'?sidebar:null,
  createElement:element
 };
 let callback=null;
 const win={addEventListener:(type,fn)=>{if(type==='pageshow')callback=fn}};
 vm.runInNewContext(brand,{window:win,document:doc,MutationObserver:class{observe(){} constructor(){}}});
 assert.equal(doc.title,'Transhelper · Translation Workspace');
 assert.equal(logo.children.length,1);
 assert.equal(logo.children[0].className,'th-brand-shell');
 assert.equal(logo.children[0].children.length,2);
 assert.equal(logo.children[0].children[1].children[0].textContent,'Transhelper');
 callback();
 assert.equal(logo.children.length,1,'reapplying must not add duplicate marks');
});
test('brand never scans or rewrites user translations',()=>{
 assert.doesNotMatch(brand,/createTreeWalker|\.innerText\s*=|localStorage/);
 assert.match(brand,/replaceChildren\(buildBrand\(document\)\)/);
 assert.doesNotMatch(brand,/Translator Workplace/);
});
