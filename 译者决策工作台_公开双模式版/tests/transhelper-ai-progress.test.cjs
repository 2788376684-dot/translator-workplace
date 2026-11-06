'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const script=read('transhelper-ai-progress.js');
const wrapper=read('atelier.html'),theme=read('transhelper-theme.css');
function mock(){
 const nodes=[];
 function element(tag){
  const el={tagName:tag,children:[],attributes:{},dataset:{},hidden:false,
   className:'',textContent:'',style:{},
   append(...items){this.children.push(...items)},
   setAttribute(k,v){this.attributes[k]=v},
   removeAttribute(k){delete this.attributes[k]},
   addEventListener(){},
   closest(){return null}};
  nodes.push(el);return el;
 }
 const body=element('body'),listeners={};
 const doc={body,createElement:element,getElementById:()=>null,
  addEventListener:(name,fn,capture)=>{listeners[name]=fn}};
 const requestCalls=[];
 const win={
  fetch:function(input,options){requestCalls.push({input,options});return Promise.resolve({ok:true,status:200})},
  setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},
  __thAiProgressInstalled:false
 };
 const context={window:win,document:doc,Promise,Date,console,MutationObserver:class{observe(){}}};
 vm.runInNewContext(script,context);
 return {nodes,body,win,requestCalls,listeners};
}
test('AI status uses an independent visual layer and preserves the original request',async()=>{
 const f=mock(),payload={model:'a',messages:[{role:'user',content:'hello'}]};
 const options={method:'POST',body:JSON.stringify(payload),headers:{'Content-Type':'application/json'}};
 const result=await f.win.fetch('/api/chat',options);
 assert.equal(f.requestCalls.length,1);
 assert.equal(f.requestCalls[0].options,options);
 assert.equal(result.ok,true);
 const panel=f.nodes.find(n=>n.id==='th-ai-progress'||n.attributes?.role==='status');
 assert.ok(panel,'progress status exists');
 assert.equal(panel.dataset.phase,'checking');
 assert.equal(f.win.__thAiProgressInstalled,true);
});
test('non-AI fetch is passed through unchanged without displaying progress',async()=>{
 const f=mock();
 await f.win.fetch('/api/health',{method:'GET'});
 assert.equal(f.requestCalls.length,1);
 assert.equal(f.nodes.filter(n=>n.attributes?.role==='status').length,0);
});
test('both project and AI topbar buttons match even with gear icon',()=>{
 const workflow=read('transhelper-workflow-ui.js');
 assert.match(workflow,/includes\('项目设置'\)/);
 assert.match(workflow,/getElementById\('openAISettings'\)/);
 assert.match(workflow,/setProperty\('width','112px','important'\)/);
 assert.match(workflow,/setProperty\('height','42px','important'\)/);
 assert.match(theme,/\.topbar \.th-settings-trigger/);
});
test('AI progress script loads independently and does not modify workflow storage',()=>{
 assert.match(wrapper,/transhelper-ai-progress\.js/);
 assert.match(script,/原页面的提示/);
 assert.match(script,/网络调用异常/);
 assert.match(script,/已响应/);
 assert.doesNotMatch(script,/localStorage|paramDbPut|persist\(/);
 assert.doesNotMatch(script,/\.json\(\)/,'must not consume response body');
 assert.doesNotMatch(script,/\.clone\(\)/,'must not clone response');
});
