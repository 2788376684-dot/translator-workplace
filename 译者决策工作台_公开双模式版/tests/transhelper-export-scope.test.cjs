'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path'),vm=require('node:vm');
const root=join(__dirname,'..'),read=x=>readFileSync(join(root,x),'utf8');
const source=read('transhelper-export-scope.js');
const shell=read('atelier.html'),css=read('transhelper-export-scope.css');
const begin=source.indexOf('const escapeHtml='),end=source.indexOf('function renderScope()',begin);
assert.ok(begin>=0&&end>begin,'archive helpers available');
const api=vm.runInNewContext(source.slice(begin,end)+'\n({projectArchive,lines,docxArchive,zipStore,exportHtml})',{
 TextEncoder,TextDecoder,Uint8Array,Date,console
});
const sample={title:'Novel & <Poem>',sourceLang:'中文',targetLang:'英语',kind:'text',terms:[{source:'羹',targets:['soup']}],segments:[{
 source:'原文一。',draft:'初稿一。',revision:'二稿一。',final:'终稿一。',
 reviewPromptUsed:'请核对搭配',reviewDecisions:[{old:'初稿一。',proposed:'建议一。',reason:'搭配更自然',
 choice:'keep',questionNote:'词义待考',qa:[{role:'user',text:'为什么修改？'},{role:'assistant',text:'语境原因'}]}],
 chat:[{role:'user',stage:'final',text:'解释语气'},{role:'assistant',stage:'final',text:'语气较轻'}],
 history:[{at:'2026-11-06',why:'人工保存',text:'旧版终稿'}],
 issues:['核对疑问'],qa:{time:'21:00',problems:[]}
}]};
test('archive preserves actual source, drafts, decisions, chat and final',()=>{
 const a=api.projectArchive(sample),text=api.lines(a);
 for(const v of ['原文一。','初稿一。','二稿一。','终稿一。','建议一。','搭配更自然',
 '词义待考','为什么修改？','解释语气','旧版终稿','请核对搭配']){
  assert.ok(text.includes(v),'archive missing '+v);
 }
 assert.ok(!JSON.stringify(a).includes('apiKey'));
 assert.ok(a.project.segments[0].aiSuggestions.length===1);
});
test('Word DOCX and combined ZIP have valid ZIP signatures and embedded document',()=>{
 const a=api.projectArchive(sample);
 const word=api.docxArchive(a);
 assert.equal(word[0],0x50);assert.equal(word[1],0x4b);
 assert.equal(word[word.length-22],0x50);
 const visible=new TextDecoder().decode(word);
 assert.ok(visible.includes('word/document.xml'));
 assert.ok(visible.includes('word/styles.xml'));
 assert.ok(visible.includes('<w:document'));
 assert.ok(visible.includes('Times New Roman'));
 assert.ok(visible.includes('SimSun'));
 const zip=api.zipStore([['archive.txt',api.lines(a)],['archive.json',JSON.stringify(a)]]);
 const bundle=new TextDecoder().decode(zip);
 assert.ok(bundle.includes('archive.txt'));
 assert.ok(bundle.includes('archive.json'));
});
test('HTML escapes text and export UI offers two distinct scopes with original formats protected',()=>{
 const a=api.projectArchive(sample),html=api.exportHtml(a);
 assert.ok(html.includes('&lt;Poem&gt;'));
 assert.ok(!html.includes('<Poem>'));
 assert.match(source,/仅终稿/);
 assert.match(source,/完整翻译档案/);
 assert.match(source,/data-export/);
 assert.match(source,/th-export-advanced/);
 assert.match(source,/原版格式/);
 assert.match(source,/\['zip','完整档案 ZIP'\]/);
 assert.match(css,/export-row\[hidden\]/);
 assert.match(shell,/transhelper-export-scope\.js/);
 assert.match(shell,/transhelper-export-scope\.css/);
});
