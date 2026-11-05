'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'atelier-core.html'),'utf8');
const start=html.indexOf('async function runReviewNow(){');
const end=html.indexOf('async function askAI(){',start);
assert.ok(start>0&&end>start,'Review runner is present');
function harness(failAll=false,malformedAt=0,rescueMalformed=false,options={}){
 const draft='One. Two. Three. Four. Five.';
 const s={id:'s1',source:draft,draft,reviewDecisions:[{choice:'pending',note:'existing decision'}]};
 const p={id:'p1',sourceLang:'英语',targetLang:'英语'};
 let calls=0,changes=0;
 const storage=options.storage||new Map();
 const localStorage={
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
 };
 const split=text=>(text.match(/[^.]+\.\s*/g)||[]).map(x=>({old:x}));
 const ctx={
  seg:()=>s,proj:()=>p,localStorage,
  sentenceReviewUnits:split,uiReview:{},defaultReviewPrompt:'Check meaning',
  $:id=>id==='reviewPrompt'?{value:'Use contextual accuracy'}:null,
  confirm:()=>true,toast:()=>{},baseContext:()=> 'Context',
  safeJson:JSON.parse,withBusy:(_title,callback)=>callback(),
  api:async messages=>{
   calls++;
   if(options.limitAfter===calls)throw Error('Agnes 服务当前限制请求，请稍后重试。');
   const user=messages[1].content;
   const match=user.match(/逐句初译：\n(\[[^\n]+\])/);
   if(!match){
    if(user.includes('只审校以下这一句')){
     if(rescueMalformed)return JSON.stringify({reviews:[{proposed:'Bad one'},{proposed:'Bad two'}]});
     return JSON.stringify({proposed:'One corrected sentence.',reason:'Context checked'});
    }
    throw Error('Missing review rows');
   }
   const part=JSON.parse(match[1]);
   if(failAll||part.length>1)throw Error('Simulated provider shape failure');
   if(malformedAt && part[0].index===malformedAt)return JSON.stringify({reviews:[{index:malformedAt,proposed:'One'},{index:malformedAt+1,proposed:'Two'}]});
   return JSON.stringify({reviews:part.map(x=>({index:x.index,proposed:x.initial+' improved',reason:'test'}))});
  },
  startSentenceReview:()=>{changes++;s.reviewDecisions=split(s.draft).map(x=>({old:x.old,choice:'pending',proposed:x.old,reason:''}));},
  persist:()=>{},draw:()=>{}
 };
 const runner=vm.runInNewContext('let reviewSetupOpen=true;\n'+html.slice(start,end)+'\n({runReviewNow,setup:()=>reviewSetupOpen})',ctx);
 return {s,runner,getCalls:()=>calls,getChanges:()=>changes};
}
test('falls back to sentence-by-sentence and applies results only after complete validation',async()=>{
 const h=harness();
 await h.runner.runReviewNow();
 assert.equal(h.s.reviewDecisions.length,5);
 assert.equal(h.getChanges(),1);
 assert.ok(h.s.reviewDecisions.every(x=>x.proposed.endsWith(' improved')));
 assert.equal(h.runner.setup(),false);
 assert.ok(h.getCalls()>=5);
});
test('provider failure retains previous decisions and review instructions',async()=>{
 const h=harness(true);
 await assert.rejects(h.runner.runReviewNow(),/第 1 句审校.*失败/);
 assert.equal(h.getChanges(),0);
 assert.equal(h.s.reviewDecisions[0].note,'existing decision');
 assert.equal(h.runner.setup(),true);
});

test('mismatched single-sentence response retries a standalone JSON object',async()=>{
 const h=harness(false,2,false);
 await h.runner.runReviewNow();
 assert.equal(h.getChanges(),1);
 assert.equal(h.s.reviewDecisions[1].proposed,'One corrected sentence.');
 assert.equal(h.s.reviewDecisions[1].choice,'pending');
});
test('repeated malformed model output is flagged for human review',async()=>{
 const h=harness(false,2,true);
 await h.runner.runReviewNow();
 assert.equal(h.getChanges(),1);
 assert.equal(h.s.reviewDecisions[1].choice,'question');
 assert.equal(h.s.reviewDecisions[1].proposed.trim(),'Two.');
 assert.match(h.s.reviewDecisions[1].reason,/人工核对/);
});

test('429 stops retries and saves partial review checkpoint',async()=>{
 const storage=new Map();
 const broken=harness(false,0,false,{storage,limitAfter:2});
 await assert.rejects(broken.runner.runReviewNow(),/已保存 4/);
 assert.equal(broken.getCalls(),2);
 assert.equal(broken.getChanges(),0);
 assert.equal(storage.size,1);
 const checkpoint=JSON.parse([...storage.values()][0]);
 assert.equal(checkpoint.items.length,4);
 const resumed=harness(false,0,false,{storage});
 await resumed.runner.runReviewNow();
 assert.equal(resumed.getCalls(),1);
 assert.equal(resumed.getChanges(),1);
 assert.equal(storage.size,0);
});
