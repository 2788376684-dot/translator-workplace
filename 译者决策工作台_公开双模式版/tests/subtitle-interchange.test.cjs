'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const script=fs.readFileSync(path.join(root,'subtitle-tools.js'),'utf8');
const tools=vm.runInNewContext(script+';THSubtitles');
const vtt='\ufeffWEBVTT - example\r\n\r\nNOTE source\r\n\r\nintro\r\n00:01.200 --> 00:02.350 align:start\r\n<v Speaker><i>Hello</i> &amp; welcome.\r\n';

test('WebVTT accepts optional hour, cue identifier, settings, UTF-8 BOM and CRLF',()=>{
  const result=tools.read(vtt);
  assert.equal(result.format,'WebVTT');
  assert.equal(result.rows[0].start,1.2);
  assert.equal(result.rows[0].target,'Hello & welcome.');
  assert.throws(()=>tools.read('WEBVTT\n\n00:02.000 --> 00:01.900\nReversed'),/出点/);
});

test('exact timecode pairing is atomic and keeps source identity and original order',()=>{
  const a={id:'a',start:1.2,end:2.35,target:'旧稿',source:'Hello'};
  const b={id:'b',start:2.35,end:4,target:'',source:'Welcome'};
  const input=tools.read('1\n00:00:01,200 --> 00:00:02,350\n你好\n\n2\n00:00:02,350 --> 00:00:04,000\n欢迎').rows;
  const after=tools.fillTargets([a,b],input.slice().reverse());
  assert.equal(after[0].id,'a');
  assert.equal(after[0].target,'你好');
  assert.equal(after[1].source,'Welcome');
  assert.throws(()=>tools.fillTargets([a,{...b,end:4.002}],input),/第 2 条/);
  assert.throws(()=>tools.fillTargets([a,{...a,id:'different'}],input),/重复/);
  assert.equal(a.target,'旧稿');
});

test('QA marks both sides of overlaps, including nested cues, at millisecond precision',()=>{
  const rows=[
    {start:0,end:9,source:'one',target:'甲'},
    {start:1,end:2,source:'two',target:'乙'},
    {start:3,end:3.1,source:'',target:'文字很多\n换行保留\n还有一行'},
    {start:9,end:11,source:'four',target:''},
  ];
  const flags=tools.qa(rows,{trackMode:'bilingual',maxCps:12,lineLimit:3,maxLines:2},text=>text);
  assert.ok(flags.slice(0,3).every(row=>row.includes('时间重叠')));
  for(const issue of ['缺原文','阅读速度偏快','单行过长','行数过多','显示过短'])assert.ok(flags[2].includes(issue));
  assert.equal(flags[3].join(','),'缺译文');
});

test('subtitle delivery strips blank lines before serializing cue boundaries',()=>{
  assert.equal(tools.cleanLines('  Hello\r\n \r\n World\r\n'),'Hello\n World');
});

test('workbench scripts parse and subtitle project starts in the original workspace',()=>{
  const html=fs.readFileSync(path.join(root,'subtitles.html'),'utf8');
  for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Function(script);
  assert.match(html,/subtitle-tools\.js/);
  const core=fs.readFileSync(path.join(root,'atelier-core.html'),'utf8');
  assert.match(core,/openNewSubtitleProject/);
  assert.match(core,/TH_VIDEO_SAVE/);
});
