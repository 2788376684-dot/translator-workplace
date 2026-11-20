/* Keep default-AI description aligned with the actual public UI. */
(()=>{
'use strict';
if(window.__thDefaultAICopyInstalled)return;
window.__thDefaultAICopyInstalled=true;
const normalize=s=>String(s||'').replace(/[；;]\s*如启用访问码[，,]\s*请在下方输入[。.]?/g,'。').replace(/(DeepSeek\s*后端)[。]{2,}/g,'$1。');
function clean(root){
 if(!root)return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  const value=node.nodeValue;
  if(!value||!value.includes('如启用访问码'))continue;
  const updated=normalize(value);
  if(updated!==value)node.nodeValue=updated;
 }
}
clean(document.body);
let pending=false;
const observer=new MutationObserver(records=>{
 const nodes=[];
 for(const record of records){
  if(record.type==='characterData')nodes.push(record.target.parentNode);
  for(const node of record.addedNodes||[])if(node.nodeType===1||node.nodeType===3)nodes.push(node.nodeType===3?node.parentNode:node);
 }
 if(!nodes.length||pending)return;
 pending=true;
 queueMicrotask(()=>{pending=false;for(const node of nodes)if(node?.isConnected)clean(node)});
});
observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
})();