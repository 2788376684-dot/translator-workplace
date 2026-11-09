const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const account=fs.readFileSync(path.join(root,'api/account.js'),'utf8');
const page=fs.readFileSync(path.join(root,'account.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'account.js'),'utf8');
test('account scripts parse and core landing remains available',()=>{
 assert.doesNotThrow(()=>new Function(ui));
 assert.doesNotThrow(()=>new Function('require','process','module',account));
 assert.match(page,/type="password"/);
 assert.match(page,/id="download"/);
 assert.match(fs.readFileSync(path.join(root,'atelier.html'),'utf8'),/href="\/account.html"/);
});
test('cloud mode does not reuse unrelated legacy workspace keys',()=>{
 assert.match(ui,/const KEY='tw-workplace-v4'/);
 assert.match(account,/const key='tw-workplace-v4'/);
 assert.match(ui,/version!==4/);
 assert.match(ui,/confirm\(/);
 assert.match(ui,/workspace-before-cloud-restore/);
});
test('server refuses unconfigured auth rather than simulating login',async()=>{
 const mod={exports:{}};
 const context={module:mod,require,process:{env:{}},Buffer,URL,fetch:async()=>{throw Error('Network must not be accessed');},AbortSignal,Date,console};
 vm.runInNewContext(account,context);
 const req={method:'POST',query:{action:'login'},body:{email:'a@example.com',password:'password123'},headers:{host:'example.com'}};
 let code,body;const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){code=n;return this;},json(x){body=x;return x;}};
 await mod.exports(req,res);
 assert.equal(code,503);assert.equal(body.configured,false);
});
test('RLS SQL must restrict every operation to current user',()=>{
 const sql=fs.readFileSync(path.join(root,'account-schema.sql'),'utf8');
 assert.match(sql,/enable row level security/);
 for(const action of ['select','insert','update','delete'])assert.match(sql,new RegExp('for '+action+' to authenticated'));
 assert.match(sql,/auth.uid\(\)/);
 assert.doesNotMatch(account,/SERVICE_ROLE/);
});
