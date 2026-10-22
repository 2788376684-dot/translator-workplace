'use strict';
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {test}=require('node:test');
const assert=require('node:assert/strict');

const base=join(__dirname,'..');
const html=readFileSync(join(base,'index.html'),'utf8');
const api=readFileSync(join(base,'api','chat.js'),'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,'inline application script must exist');
const script=match[1];
const start=script.indexOf('function tokenize(t){');
const end=script.indexOf('function parts(){',start);
assert.ok(start>=0&&end>start,'diff functions must exist');
const {diff}=new Function(script.slice(start,end)+'\nreturn {diff};')();

test('frontend and backend scripts parse',()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.doesNotThrow(()=>new Function(api));
});
test('unique markup element IDs and resolved static selectors',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate markup IDs');
 const known=new Set([...ids,'assistant-drawer']); // drawer is created at runtime
 const refs=[...script.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
 for(const id of refs)assert.ok(known.has(id),'missing element: '+id);
});
test('diff reconstructs exactly both inputs',()=>{
 const cases=[
  ['Hello world','Hello brave world'],
  ['中译英是一项工作。\n第二句。','中译英是一项重要工作。\n第二句。'],
  ['\n\n第一段。\n第二段。','第一段！\n\n第二段。'],
  ['One and two. Three and four.','One & two. Three or four.'],
  ['同一文本。'.repeat(400),'同一文本。'.repeat(400)],
  ['花'.repeat(3400)+'\n春'.repeat(3200),'花'.repeat(3400)+'\n夏'.repeat(3200)],
  ['Start!\n'+'甲。'.repeat(1800),'Start!\n'+'甲。'.repeat(900)+'乙。'+'甲。'.repeat(900)],
 ];
 for(const [a,b] of cases){
  const pieces=diff(a,b);
  const before=pieces.map(p=>p.type==='same'?p.text:p.before).join('');
  const after=pieces.map(p=>p.type==='same'?p.text:p.after).join('');
  assert.equal(before,a,'original text must round trip');
  assert.equal(after,b,'suggested text must round trip');
 }
});
test('key reliability features remain wired',()=>{
 for(const expected of ['manualFinalDirty','versionPayload','glossaryInstructions','runLocalQA','requestedProject','SITE_ACCESS_CODE']){
  assert.ok((script+api).includes(expected),'missing '+expected);
 }
});

test('rationale review rejects invented quotations and self-contradictions',()=>{
 const start=script.indexOf('function validateRationale('),end=script.indexOf('function applyReviewResult(',start);
 assert.ok(start>=0&&end>start,'review validator must be defined');
 const validate=new Function(script.slice(start,end)+';return validateRationale;')();
 const source='any mental or physical anguish';
 const before='亲爱的格温德琳，要是你为此伤心伤身';
 const after='亲爱的格温德琳，要是让你身心痛苦';
 const samples=[
  [{after:'心痛苦'}, {verdict:'support',category:'error',sourceExcerpt:source,reason:"添加'心痛苦'与前面残留文字搭配不当，且'verbal anguish'应译为'精神痛苦'。"},'questionable'],
  [{after:'心痛苦'}, {verdict:'support',category:'error',sourceExcerpt:source,reason:'添加“心痛苦”搭配不当。'},'questionable'],
  [{after:'身心痛苦'}, {verdict:'support',category:'optimize',sourceExcerpt:source,reason:'改为“身心痛苦”，自然概括精神和肉体两类痛苦。'},'supported'],
  [{after:'身心痛苦'}, {verdict:'questionable',category:'error',sourceExcerpt:source,reason:'建议存在语义偏差，应人工确认。'},'questionable'],
  [{after:'身心痛苦'}, {verdict:'support',category:'error',sourceExcerpt:'unrelated source text',reason:'将措辞改得更精确。'},'unverified'],
 ];
 for(const [change,output,expected] of samples){
  const result=validate(change,output,source,before,after);
  assert.equal(result.status,expected,'Unexpected review decision');
  if(result.status!=='supported')assert.equal(result.category,'','Unverified suggestions must not be auto-classified');
 }
});
