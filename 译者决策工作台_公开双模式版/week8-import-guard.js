(()=>{
'use strict';
/* Guard only automatically dispatched OCR project imports.
   Genuine user-chosen JSON imports continue to use Week8's native validator. */
const attached=new WeakSet(),passing=new WeakSet();
const validImage=x=>typeof x==='string'&&x.length<18000000&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(x);
function attach(d){
 const input=d?.getElementById('import-project');if(!input||attached.has(input))return;
 attached.add(input);
 input.addEventListener('change',async e=>{
  // Native file-picker imports are never intercepted or mutated.
  if(e.isTrusted||passing.has(input))return;
  const file=input.files?.[0];if(!file)return;
  // Intercept only synthetic (startup/bridge) imports, then forward valid input.
  e.preventDefault();e.stopImmediatePropagation();
  let okay=false,reason='';
  try{
   if(file.size>35000000)throw Error('工程文件超过35MB');
   const raw=await file.text(),project=JSON.parse(raw);
   if(project?.schema!=='week8.parameter-project.v1'||!project?.documents||!project?.active)throw Error('工程结构无效');
   const docs=Object.values(project.documents);
   if(!docs.length||docs.length>8||docs.some(x=>!x||!validImage(x.image)||!Number.isFinite(x.width)||!Number.isFinite(x.height)))throw Error('工程缺少合法的原图数据');
   okay=true;
  }catch(err){reason=String(err?.message||err);}
  if(okay){
   passing.add(input);
   try{input.dispatchEvent(new Event('change',{bubbles:true}));}
   finally{passing.delete(input);}
   return;
  }
  // Never clear browser storage or erase the outer Translator Workplace project.
  const status=d.getElementById('status');
  if(status){
   status.classList.remove('error');
   status.classList.add('warn');
   status.textContent='旧工程自动恢复跳过：'+reason+'。请上传原参数图片后运行 OCR；已有项目资料未删除。';
  }
  const meta=d.getElementById('ocr-meta');
  if(meta)meta.textContent='等待有效原图；未运行 OCR';
  console.warn('Skipped malformed automatic Week8 OCR import:',reason);
 },true);
}
function scan(){
 const seen=new Set();
 const visit=d=>{
  if(!d||seen.has(d))return;seen.add(d);
  try{attach(d)}catch{}
  for(const frame of d.querySelectorAll('iframe')){
   try{visit(frame.contentDocument)}catch{}
   if(!frame.dataset.twImportGuard){frame.dataset.twImportGuard='1';frame.addEventListener('load',scan);}
  }
 };
 visit(document);
}
scan();setInterval(scan,1000);
})();