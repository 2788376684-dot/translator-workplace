'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),core=fs.readFileSync(path.join(root,'atelier-core.html'),'utf8'),flow=fs.readFileSync(path.join(root,'subtitle-video-workflow.js'),'utf8');
const segment={id:'s1',start:0,end:2,source:'Hello.',target:'你好。'};
test('video progress uses only the active media explicit confirmations',()=>{
 const context={};vm.createContext(context);vm.runInContext(core.slice(core.indexOf('function videoStepDone('),core.indexOf('function syncVideoProgress(')),context);
 const p={segments:[{source:'old',draft:'old',revision:'old',final:'old'}],subtitle:{active:'new',clips:[{id:'old',workflow:{confirmed:{source:true,draft:true,revision:true,final:true}}},{id:'new',workflow:{confirmed:{source:false,draft:false,revision:false,final:false}}}]}};
 for(const key of ['source','draft','revision','final'])assert.equal(context.videoStepDone(p,key),false);
 p.subtitle.clips[1].workflow.confirmed.source=true;assert.equal(context.videoStepDone(p,'source'),true);assert.equal(context.videoStepDone(p,'final'),false);
});
function flowHarness(){
 let current={id:'first',cues:[{...segment}]};const context={clip:()=>current,copy:value=>JSON.parse(JSON.stringify(value)),renderProgress:()=>{},stage:'source'};vm.createContext(context);
 vm.runInContext(flow.slice(flow.indexOf('const stageNames='),flow.indexOf('function publish()'))+flow.slice(flow.indexOf('function invalidateAfter('),flow.indexOf('function confirmStage(')),context);
 return {context,get current(){return current},switchTo(c){current=c}};
}
test('new media never inherit confirmations and source edits invalidate its downstream versions',()=>{
 const h=flowHarness(),w=h.context.workflow();assert.equal(w.confirmed.final,false);
 for(const key of ['source','draft','revision','final'])w.confirmed[key]=true;
 w.versions.draft=[{...segment}];w.versions.final=[{...segment,target:'手工终稿'}];
 h.current.cues[0].source='Changed source';h.context.capture();
 for(const key of ['source','draft','revision','final'])assert.equal(w.confirmed[key],false);
 assert.equal(w.versions.final,undefined);assert.equal(w.history[0].versions.final[0].target,'手工终稿');
 const original=w;h.switchTo({id:'second',cues:[{...segment}]});assert.equal(h.context.workflow().confirmed.final,false);assert.notEqual(h.context.workflow(),original);
});
test('editing draft retains original confirmation and archives downstream versions',()=>{
 const h=flowHarness(),w=h.context.workflow();w.confirmed.source=true;w.confirmed.draft=true;w.confirmed.revision=true;w.confirmed.final=true;w.versions.final=[{...segment}];
 h.context.invalidateAfter('draft');assert.equal(w.confirmed.source,true);assert.equal(w.confirmed.revision,false);assert.equal(w.confirmed.final,false);assert.equal(w.history.length,1);
});
function aiHarness(response){
 const replies=[],project={id:'p1',mode:'default',targetLang:'中文',terms:[],instructions:''},entry={frame:{contentWindow:{postMessage:value=>replies.push(value)}}};let active=project;
 const context={location:{origin:'https://workspace.test'},proj:()=>active,busy:false,api:async()=>typeof response==='function'?response():response,persist:()=>{},$:()=>({})};
 vm.createContext(context);vm.runInContext(core.slice(core.indexOf('async function handleVideoAI('),core.indexOf('function splitSource(content)')),context);
 return {project,entry,replies,context,changeProject(){active={id:'other'}}};
}
test('AI reply rejects mismatched cue IDs without returning replacement rows',async()=>{
 const h=aiHarness('[{"id":"wrong","target":"错误"}]');await h.context.handleVideoAI(h.project,h.entry,{requestId:'req',kind:'draft',rows:[{id:'s1',source:'Hello',target:''}]});
 assert.match(h.replies[0].error,/不匹配/);assert.equal(h.replies[0].rows,undefined);assert.equal(h.context.busy,false);
});
test('AI result is rejected after project switch while request is pending',async()=>{
 let resolve;const h=aiHarness(()=>new Promise(r=>resolve=r));const pending=h.context.handleVideoAI(h.project,h.entry,{requestId:'req',kind:'draft',rows:[{id:'s1',source:'Hello',target:''}]});
 h.changeProject();resolve('[{"id":"s1","target":"你好"}]');await pending;assert.match(h.replies[0].error,/切换项目/);assert.equal(h.replies[0].rows,undefined);
});
test('AI returns complete validated translations without confirming any stage',async()=>{
 const h=aiHarness('[{"id":"s1","target":"你好"}]');await h.context.handleVideoAI(h.project,h.entry,{requestId:'req',kind:'draft',rows:[{id:'s1',source:'Hello',target:''}]});
 assert.equal(h.replies[0].rows[0].target,'你好');assert.equal(h.project.workflow,undefined);
});
test('manual edits or undo invalidate a confirmed target version',()=>{
 const h=flowHarness(),w=h.context.workflow();h.context.stage='draft';w.confirmed.source=true;w.confirmed.draft=true;w.confirmed.revision=true;w.confirmed.final=true;
 w.versions.draft=[{...segment}];w.versions.final=[{...segment,target:'终稿'}];h.current.cues[0].target='人工修正';h.context.capture();
 assert.equal(w.confirmed.source,true);assert.equal(w.confirmed.draft,false);assert.equal(w.confirmed.revision,false);assert.equal(w.confirmed.final,false);assert.equal(w.versions.draft[0].target,'人工修正');
});
test('legacy mixed video project is separated without changing its text translations',()=>{
 const text={id:'original',title:'Existing project',mode:'default',videoMode:true,segments:[{id:'s1',source:'old source',draft:'old draft',revision:'old review',final:'old final'}],subtitle:{active:'clip',clips:[{id:'clip',title:'movie.mp4'}]}};
 const context={state:{projects:[text],active:'original',seg:'s1',step:'final'},newProj:title=>({id:'new-video',title,segments:[{id:'new-segment',source:'',draft:'',revision:'',final:''}]})};
 vm.createContext(context);vm.runInContext(core.slice(core.indexOf('function migrateVideoProjects('),core.indexOf('function boot(')),context);context.migrateVideoProjects();
 assert.equal(text.segments[0].final,'old final');assert.equal(text.videoMode,false);assert.equal(context.state.projects.length,2);assert.equal(context.state.active,'new-video');assert.equal(context.state.step,'source');assert.equal(context.state.projects[1].subtitle.active,'clip');
 context.migrateVideoProjects();assert.equal(context.state.projects.length,2);
});
