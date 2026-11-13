const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
test('header layout is syntactically valid and installed as optional layer',()=>{
 assert.doesNotThrow(()=>new Function(read('transhelper-header-layout.js')));
 assert.match(read('atelier.html'),/transhelper-header-layout\.js/);
 assert.match(read('atelier.html'),/th-header-integrated/);
});
test('account link and cloud status have independent header slots',()=>{
 const js=read('transhelper-header-layout.js');
 assert.match(js,/th-top-flow/);
 assert.match(js,/data-step="final"/);
 assert.match(js,/link\.href='\/account\.html'/);
 assert.match(js,/link\.target='_top'/);
 assert.match(js,/tw-cloud-status/);
 assert.match(js,/\.append\(link,state\)/);
 assert.doesNotMatch(js,/localStorage\.setItem|fetch\(|\.click\(/);
});
test('branding is Transhelper and core workflow is still loaded',()=>{
 const brand=read('transhelper-brand.js'),account=read('account.html'),shell=read('atelier.html');
 assert.match(brand,/name\.textContent='Transhelper'/);
 assert.doesNotMatch(account,/Translator Workplace/);
 assert.match(shell,/app\.src='\/atelier-core\.html'/);
 assert.match(shell,/tw-cloud-auto-backup\.js/);
 assert.match(shell,/atelier-review-enhancements\.js/);
});
