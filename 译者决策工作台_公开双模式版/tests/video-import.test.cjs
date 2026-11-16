'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const core=fs.readFileSync(path.join(root,'atelier-core.html'),'utf8');
const bridge=core.slice(core.indexOf("window.addEventListener('message',event=>{"),core.indexOf('function splitSource(content)'));
function harness(){
 const messages=[],source={postMessage:(...args)=>messages.push(args)},project={id:'p1'},entry={frame:{contentWindow:source,style:{}},ready:false,pending:{name:'video.mp4'}};
 let handler,saves=0;
 const context={window:{addEventListener:(type,fn)=>{handler=fn}},location:{origin:'https://workspace.test'},videoEditors:new Map([['p1',entry]]),state:{projects:[project]},persist:()=>saves++,syncVideoProgress:()=>{},toast:()=>{}};
 vm.runInNewContext(bridge,context);
 return {project,entry,source,messages,context,get saves(){return saves},send(data,origin='https://workspace.test',sender=source){handler({data,origin,source:sender})}};
}
test('video snapshots only update the project owning the trusted editor window',()=>{
 const h=harness(),snapshot={schema:'subtitle.workbench.v2',clips:[]};
 h.send({type:'TH_VIDEO_SAVE',snapshot},'https://other.test');
 h.send({type:'TH_VIDEO_SAVE',snapshot},undefined,{});
 assert.equal(h.saves,0);
 h.send({type:'TH_VIDEO_SAVE',snapshot});assert.equal(h.saves,1);assert.equal(h.project.subtitle,snapshot);
 h.context.state.projects=[];h.send({type:'TH_VIDEO_SAVE',snapshot});assert.equal(h.saves,1);
});
test('ready handshake restores the owning project and sends the selected file once',()=>{
 const h=harness();h.project.subtitle={active:'saved'};h.send({type:'TH_VIDEO_READY'});
 assert.equal(h.entry.ready,true);assert.equal(h.messages.length,1);
 assert.equal(h.messages[0][0].snapshot,h.project.subtitle);assert.equal(h.messages[0][0].file.name,'video.mp4');assert.equal(h.entry.pending,null);
 assert.equal(h.messages[0][1],'https://workspace.test');
});
test('embedded editor height rejects invalid data and bounds layout size',()=>{
 const h=harness();h.send({type:'TH_VIDEO_HEIGHT',height:NaN});assert.equal(h.entry.frame.style.height,undefined);
 h.send({type:'TH_VIDEO_HEIGHT',height:900});assert.equal(h.entry.frame.style.height,'912px');
 h.send({type:'TH_VIDEO_HEIGHT',height:999999});assert.equal(h.entry.frame.style.height,'12000px');
});
