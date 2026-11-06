'use strict';
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const script=readFileSync(join(__dirname,'..','tw-continuity-guard.js'),'utf8');
function fixture(raw){
 const listeners={};let writes=0;
 class Node {
  constructor(tag){this.tagName=tag;this.children=[];this.hidden=false;this.className='';this.textContent='';this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  insertBefore(node){this.children.push(node);}
  addEventListener(type,fn){this['on'+type]=fn;}
  setAttribute(){}
  querySelector(){return {};}
 }
 const main=new Node('main'),bottom=new Node('aside'),head=new Node('head'),storage={
  getItem:key=>key==='tw-workplace-v4'?raw:null,
  setItem(){writes++;},
  removeItem(){writes++;}
 };
 const doc={
  head,visibilityState:'visible',
  querySelector:s=>s==='main.main'?main:s==='.side-bottom'?bottom:null,
  createElement:tag=>new Node(tag),
  addEventListener:(name,fn)=>{listeners['document:'+name]=fn;},
  getElementById:()=>null
 };
 const win={addEventListener:(name,fn)=>{listeners[name]=fn;},setInterval:()=>0,indexedDB:null,top:{location:{reload:()=>{}}}};
 const sandbox={window:win,document:doc,localStorage:storage,console:{warn(){}},setTimeout,clearTimeout};
 vm.runInNewContext(script,sandbox);
 return {main,bottom,head,listeners,storage,win,getWrites:()=>writes};
}
test('guard is non-destructive even when IndexedDB is unavailable',()=>{
 const data=JSON.stringify({version:4,projects:[{id:'one',segments:[]}],active:'one',step:'source'});
 const x=fixture(data);
 assert.equal(x.getWrites(),0);
 assert.equal(x.bottom.children.length,1,'only the recovery shortcut is appended');
 assert.equal(typeof x.listeners.storage,'function');
});
test('cross-tab edit raises an inline notice without writing or reloading workspace',()=>{
 const data=JSON.stringify({version:4,projects:[{id:'one',segments:[]}],active:'one'});
 const x=fixture(data);
 x.listeners.storage({key:'tw-workplace-v4',newValue:data,storageArea:x.storage});
 assert.equal(x.getWrites(),0);
 assert.ok(x.main.children.some(n=>n.className==='tw-recovery-strip'));
 const banner=x.main.children.find(n=>n.className==='tw-recovery-strip');
 assert.match(banner.children[0].textContent,/另一标签页/);
});
test('invalid stored JSON does not cause destructive automatic reset',()=>{
 const x=fixture('{broken-json');
 assert.equal(x.getWrites(),0);
 assert.ok(x.main.children.some(n=>n.className==='tw-recovery-strip'));
});
