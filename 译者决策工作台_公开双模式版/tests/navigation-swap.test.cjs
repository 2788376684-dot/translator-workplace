'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'transhelper-navigation-swap.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'atelier.html'),'utf8');
function element(tag='div',text=''){
 const obj={
  tagName:tag.toUpperCase(),textContent:text,children:[],parentNode:null,style:{removed:[],removeProperty(x){this.removed.push(x)}},
  classList:{set:new Set(),add(x){this.set.add(x)},remove(x){this.set.delete(x)}},
  attributes:{},setAttribute(k,v){this.attributes[k]=v},hasAttribute(k){return k==='data-th-equal-settings'&&!!this.fixed},
  matches(selector){return this.tagName==='BUTTON'&&selector.includes('button')},
  append(...nodes){for(const x of nodes){if(x.parentNode)x.parentNode.children.splice(x.parentNode.children.indexOf(x),1);this.children.push(x);x.parentNode=this}},
  prepend(...nodes){for(const x of nodes.reverse()){if(x.parentNode)x.parentNode.children.splice(x.parentNode.children.indexOf(x),1);this.children.unshift(x);x.parentNode=this}},
  contains(x){if(x===this)return true;return this.children.some(c=>c.contains(x))},
  get parentElement(){return this.parentNode},
  get nextSibling(){if(!this.parentNode)return null;return this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null},
 };
 return obj;
}
function boot({missingAI=false}={}){
 const top=element('header'),sidebar=element('aside'),original=element('section');
 const steps=['source','draft','revision','final'].map(s=>{const e=element('button',s);e.step=s;e.onclick=()=>s;return e});
 original.append(...steps);sidebar.append(original);
 const project=element('button','⚙ 项目设置'),ai=element('button','AI 设置'),imported=element('button','导入项目');
 for(const b of [project,ai,imported]){b.onclick=()=>b.textContent;b.fixed=true}
 if(missingAI)top.append(project,imported);else top.append(project,ai,imported);
 const body=element('body');
 const all=[project,ai,imported];
 top.querySelectorAll=()=>top.children.filter(x=>all.includes(x));
 top.querySelector=()=>null;
 sidebar.querySelector=s=>{const found=s.match(/data-step="([^"]+)"/);return found?steps.find(x=>x.step===found[1]&&original.contains(x)):null};
 sidebar.querySelectorAll=()=>[];
 const document={
  readyState:'complete',body,
  querySelector:s=>s==='.topbar'?top:s==='.sidebar'?sidebar:null,
  getElementById:id=>id==='openAISettings'&&!missingAI?ai:null,
  createElement:element,addEventListener(){},
 };
 const window={addEventListener(){},setTimeout(){}};
 vm.runInNewContext(code,{window,document,console});
 return {top,sidebar,original,steps,project,ai,imported,body};
}
test('swap scripts parse and load as an isolated enhancement',()=>{
 assert.doesNotThrow(()=>new Function(code));
 assert.match(shell,/transhelper-navigation-swap\.js/);
 assert.match(shell,/transhelper-navigation-swap\.css/);
 assert.match(shell,/app\.src='\/atelier-core\.html'/);
});
test('real native workflow buttons move into topbar, real settings actions move into sidebar',()=>{
 const d=boot();
 const flow=d.top.children.find(x=>x.id==='th-top-flow');
 assert.ok(flow,'workflow bar created');
 assert.deepEqual(flow.children.filter(x=>x.tagName==='BUTTON'),d.steps);
 const connectors=flow.children.filter(x=>x.className==='th-flow-connector');
 assert.equal(connectors.length,3);
 assert.ok(connectors.every(x=>x.textContent==='→'&&x.attributes['aria-hidden']==='true'));
 assert.deepEqual(flow.children.slice(1).map(x=>x.tagName==='BUTTON'?x.step:'→'),['source','→','draft','→','revision','→','final']);
 const tools=d.original.children.find(x=>x.id==='th-sidebar-tools');
 assert.ok(tools);
 assert.deepEqual(tools.children,[d.project,d.ai,d.imported]);
 for(const step of d.steps)assert.equal(step.onclick(),step.step);
 for(const tool of [d.project,d.ai,d.imported])assert.equal(tool.onclick(),tool.textContent);
 assert.ok(d.body.classList.set.has('th-navigation-swapped'));
});
test('without complete native controls original layout remains intact',()=>{
 const d=boot({missingAI:true});
 assert.equal(d.original.children.length,4);
 assert.equal(d.top.children.length,2);
 assert.ok(!d.body.classList.set.has('th-navigation-swapped'));
});
test('navigation swap never writes project data or rebinds original handlers',()=>{
 assert.doesNotMatch(code,/localStorage|sessionStorage|persist\(|paramDbPut\(|\.onclick\s*=|cloneNode\(|replaceChildren\(/);
 assert.match(code,/\.append\(button\)/);
 assert.match(code,/\.append\(tool\)/);
});
