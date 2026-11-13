'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
process.env.AI_API_KEY='test-key';
const handler=require(path.join('..','api','chat.js'));
const good='The weather is warm today.';
const leaked='Preserve the original text and identify paragraphs.\n\nThis prompt:\nPlease complete the translation based on the original text, specified terminology, and project requirements.';
async function request(content){
 const originalFetch=global.fetch;
 const oldKey=process.env.AI_API_KEY,oldEndpoint=process.env.AI_API_ENDPOINT;
 process.env.AI_API_KEY='test-key';
 global.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content},finish_reason:'stop'}]})});
 const body={model:'deepseek-chat',messages:[{role:'user',content:'请翻译：今日天气很好'}]};
 const req={method:'POST',headers:{host:'example.com','x-real-ip':'test-'+Math.random()},body};
 const result={statusCode:null,body:null,headers:{},
  setHeader(key,value){this.headers[key]=value},
  status(code){this.statusCode=code;return this},
  json(payload){this.body=payload;return this}};
 try{await handler(req,result);return result}
 finally{global.fetch=originalFetch;
  if(oldKey===undefined)delete process.env.AI_API_KEY;else process.env.AI_API_KEY=oldKey;
  if(oldEndpoint===undefined)delete process.env.AI_API_ENDPOINT;else process.env.AI_API_ENDPOINT=oldEndpoint;}
}
test('prompt echo is rejected instead of being returned as a translation',async()=>{
 const res=await request(leaked);
 assert.equal(res.statusCode,502);
 assert.equal(res.body.code,'PROMPT_ECHO_DETECTED');
 assert.equal(res.body.content,undefined);
});
test('normal translation output still passes',async()=>{
 const res=await request(good);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.content,good);
});
