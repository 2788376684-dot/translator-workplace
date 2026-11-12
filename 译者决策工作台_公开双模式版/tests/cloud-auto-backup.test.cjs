const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'api/account.js'),'utf8');
const browser=fs.readFileSync(path.join(root,'tw-cloud-auto-backup.js'),'utf8');
const account=fs.readFileSync(path.join(root,'account.js'),'utf8');
const page=fs.readFileSync(path.join(root,'account.html'),'utf8');
test('auto backup scripts parse and are loaded by workspace',()=>{
 assert.doesNotThrow(()=>new Function(browser));
 assert.doesNotThrow(()=>new Function(account));
 assert.match(fs.readFileSync(path.join(root,'atelier.html'),'utf8'),/tw-cloud-auto-backup\.js/);
});
test('auto backup only starts after confirmed manual backup of a logged-in account',()=>{
 assert.match(account,/result\.updatedAt/);
 assert.match(account,/hash:await fingerprint\(raw\)/);
 assert.match(account,/enabled:previous\?\.email===email/);
 assert.match(browser,/!pref\?\.enabled\|\|pref\.conflict\|\|!pref\.updatedAt/);
 assert.match(browser,/authenticatedEmail!==pref\.email/);
 assert.match(browser,/document\.visibilityState==='hidden'/);
});
test('server prevents stale clients from overwriting latest cloud version',()=>{
 assert.match(server,/expectedUpdatedAt/);
 assert.match(server,/method:'PATCH'/);
 assert.match(server,/updated_at=eq\./);
 assert.match(server,/status\?\s*===409|json\(res,409/);
 assert.match(browser,/e\.status===409/);
 assert.match(browser,/conflict:true,enabled:false/);
});
test('local restore and manual export remain independently available',()=>{
 assert.match(page,/id="autobackup"/);
 assert.match(page,/id="download"/);
 assert.match(page,/id="export"/);
 assert.match(account,/workspace-before-cloud-restore/);
});
