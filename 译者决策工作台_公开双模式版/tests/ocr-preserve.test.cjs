'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'..','week8-review-safety.js'),'utf8');
const start=code.indexOf('function preserveTranslationCells('),end=code.indexOf('function setup(w){',start);
assert.ok(start>0&&end>start,'OCR preservation helper is present');
const preserve=vm.runInNewContext("const norm=x=>String(x??'').replace(/\\s+/g,' ').trim();\n"+code.slice(start,end)+'\npreserveTranslationCells');
const row=(sources,targets)=>({source:sources,target:targets});
test('OCR resegmentation preserves translations after an inserted row',()=>{
 const before=[row(['A','B','C'],['甲','乙','丙']),row(['D','E','F'],['丁','戊','己'])];
 const after=[row(['NEW','',''],['NEW','','']),row(['A','B','C'],['A','B','C']),row(['D','E','F'],['D','E','F'])];
 const result=preserve(before,after);
 assert.equal(result.restored,6);assert.equal(result.ambiguous,0);
 assert.deepEqual(after[1].target,['甲','乙','丙']);
 assert.deepEqual(after[2].target,['丁','戊','己']);
});
test('existing manually revised translation is never overwritten',()=>{
 const before=[row(['A','',''],['旧译','',''])];
 const after=[row(['A','',''],['新人工译法','',''])];
 assert.equal(preserve(before,after).restored,0);
 assert.equal(after[0].target[0],'新人工译法');
});
test('repeated identical OCR source is not guessed when displaced',()=>{
 const before=[row(['Same','',''],['译法甲','','']),row(['Same','',''],['译法乙','',''])];
 const after=[row(['X','',''],['X','','']),row(['Y','',''],['Y','','']),row(['Same','',''],['Same','',''])];
 const result=preserve(before,after);
 assert.equal(result.restored,0);assert.equal(result.ambiguous,1);
 assert.equal(after[2].target[0],'Same');
});
test('identical sources on unchanged rows retain their own human translations',()=>{
 const before=[row(['Same','',''],['译法甲','','']),row(['Same','',''],['译法乙','',''])];
 const after=[row(['Same','',''],['Same','','']),row(['Same','',''],['Same','',''])];
 const result=preserve(before,after);
 assert.equal(result.restored,2);assert.equal(result.ambiguous,0);
 assert.equal(after[0].target[0],'译法甲');assert.equal(after[1].target[0],'译法乙');
});
test('shifted identical rows remain ambiguous rather than swapping translations',()=>{
 const before=[row(['Same','',''],['译法甲','','']),row(['Same','',''],['译法乙','',''])];
 const after=[row(['NEW','',''],['NEW','','']),row(['Same','',''],['Same','','']),row(['Same','',''],['Same','',''])];
 const result=preserve(before,after);
 assert.equal(result.restored,0);assert.equal(result.ambiguous,2);
 assert.equal(after[1].target[0],'Same');assert.equal(after[2].target[0],'Same');
});
test('duplicate phrases with distinct neighboring cells match the original row after moving',()=>{
 const before=[row(['Same','First',''],['甲','第一','']),row(['Same','Second',''],['乙','第二',''])];
 const after=[row(['NEW','',''],['NEW','','']),row(['Same','Second',''],['Same','Second','']),row(['Same','First',''],['Same','First',''])];
 const result=preserve(before,after);
 assert.equal(result.restored,4);
 assert.equal(after[1].target[0],'乙');assert.equal(after[2].target[0],'甲');
});
test('new note row identifiers remain intact after resegmentation',()=>{
 assert.ok(!code.includes('note.rowId=old.rowId'));
 assert.match(code,/保留待人工核对/);
 assert.match(code,/preserveTranslationCells\(rowsBefore,d\.rows\)/);
});
