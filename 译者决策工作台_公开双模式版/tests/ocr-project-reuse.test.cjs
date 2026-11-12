'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'transhelper-ocr-project-guard.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'atelier.html'),'utf8');
function harness(projects,active){
 const data=JSON.stringify({version:4,active,projects});
 let handler=null,changes=0,prevented=0;
 const picker={options:projects.map(p=>({value:p.id})),value:active,
  dispatchEvent(evt){if(evt.type==='change')changes++}};
 const trigger={disabled:false};
 const document={
  addEventListener(type,fn,capture){if(type==='click'&&capture===true)handler=fn},
  getElementById(id){return id==='projectSelect'?picker:null}
 };
 const localStorage={getItem(k){return k==='tw-workplace-v4'?data:null},setItem(){throw Error('guard must never write storage')}};
 vm.runInNewContext(script,{window:{},document,localStorage,Event:class{constructor(type){this.type=type}}});
 assert.ok(handler);
 function click(){
  handler({target:{closest(selector){return selector==='#quickOCR'?trigger:null}},
   preventDefault(){prevented++},stopImmediatePropagation(){}});
 }
 return {click,picker,get changes(){return changes},get prevented(){return prevented}};
}
const plain={id:'text1',title:'Translation',kind:'text',segments:[{id:'s1',source:'Original'}]};
const empty=id=>({id,title:'未命名参数表',kind:'parameter',segments:[{id:id+'-seg',source:'',draft:'',revision:'',final:''}]});
test('OCR guard parses and is independently loaded',()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.match(shell,/transhelper-ocr-project-guard\.js/);
});
test('opening OCR reuses latest untouched parameter record',()=>{
 const h=harness([plain,empty('blank1'),empty('blank2')],plain.id);
 h.click();assert.equal(h.picker.value,'blank2');assert.equal(h.changes,1);assert.equal(h.prevented,1);
});
test('no available blank project leaves native new-OCR action intact',()=>{
 const used={...empty('used'),segments:[{id:'seg',source:'recognized OCR text'}]};
 const h=harness([plain,used],plain.id);
 h.click();assert.equal(h.picker.value,plain.id);assert.equal(h.changes,0);assert.equal(h.prevented,0);
});
test('existing OCR project is not redirected or recreated',()=>{
 const h=harness([plain,empty('blank')],'blank');
 h.click();assert.equal(h.changes,0);assert.equal(h.prevented,0);
});
test('guard preserves OCR data and does not remove persisted work',()=>{
 assert.doesNotMatch(script,/localStorage\.setItem|\.splice\(|\.remove\(|replaceChildren|delete\s+/);
 assert.match(script,/stopImmediatePropagation/);
 assert.match(script,/dispatchEvent\(new Event\('change'/);
});
