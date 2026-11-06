(()=>{
'use strict';
/* Transhelper visual identity. Shell-only, no access to project or OCR data. */
if(window.__transhelperBrandReady)return;
window.__transhelperBrandReady=true;
document.title='Transhelper · Translation Workspace';

function buildBrand(doc){
 const root=doc.createElement('div');
 root.className='th-brand-shell';
 root.setAttribute('aria-label','Transhelper');
 const symbol=doc.createElement('span');
 symbol.className='th-brand-symbol';
 symbol.setAttribute('aria-hidden','true');
 symbol.innerHTML='<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M10 11.5H26M18 11.5V25" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/><path d="M24 18.5L28 22.5L24 26.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".68"/></svg>';
 const copy=doc.createElement('span');
 copy.className='th-brand-copy';
 const name=doc.createElement('strong');
 name.className='th-brand-name';
 name.textContent='Transhelper';
 const detail=doc.createElement('span');
 detail.className='th-brand-tagline';
 detail.textContent='TRANSLATION WORKSPACE';
 copy.append(name,detail);
 root.append(symbol,copy);
 return root;
}
function applyBrand(){
 const logo=document.querySelector('.sidebar .logo, .logo');
 if(!logo)return;
 if(logo.dataset.transhelperBrand==='v2'&&logo.querySelector('.th-brand-shell'))return;
 // The old logo contains multiple icons and two text lines; replace its children
 // together to prevent duplicated T marks and leftover "Translator Workplace".
 logo.replaceChildren(buildBrand(document));
 logo.dataset.transhelperBrand='v2';
 logo.setAttribute('aria-label','Transhelper');
}
applyBrand();
const sidebar=document.querySelector('.sidebar');
if(sidebar&&typeof MutationObserver==='function'){
 const observer=new MutationObserver(()=>applyBrand());
 observer.observe(sidebar,{childList:true,subtree:true});
}
window.addEventListener('pageshow',applyBrand);
})();
