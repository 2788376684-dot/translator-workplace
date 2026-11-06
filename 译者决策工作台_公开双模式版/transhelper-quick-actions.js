(()=>{
'use strict';
/* Lightweight shortcut surface. All work is delegated to existing workspace actions.
   No writes to project data and no substitute AI conversation. */
if(window.__thQuickActionsInstalled)return;
window.__thQuickActionsInstalled=true;
const D=document;
if(!D.body||!D.getElementById('stageContent'))return;
const dock=D.createElement('aside');dock.className='th-quick-dock';dock.id='thQuickDock';
dock.setAttribute('aria-label','工作台快捷操作');
const menu=D.createElement('div');menu.id='thQuickMenu';menu.className='th-quick-menu';
menu.hidden=true;
const trigger=D.createElement('button');trigger.id='thQuickToggle';trigger.type='button';
trigger.className='th-quick-toggle';trigger.setAttribute('aria-controls','thQuickMenu');
trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','展开快捷操作');
trigger.title='快捷操作';
trigger.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const message=D.createElement('div');message.className='th-quick-message';message.id='thQuickMessage';
message.setAttribute('role','status');message.hidden=true;
let messageHandle=0;
function notify(value){
 message.textContent=value;message.hidden=false;
 clearTimeout(messageHandle);messageHandle=setTimeout(()=>{message.hidden=true},4200);
}
function setOpen(open){
 menu.hidden=!open;dock.classList.toggle('th-quick-open',open);
 trigger.setAttribute('aria-expanded',String(open));
 trigger.setAttribute('aria-label',open?'收起快捷操作':'展开快捷操作');
 trigger.title=open?'收起快捷操作':'快捷操作';
 if(open)menu.querySelector('button:not([hidden])')?.focus({preventScroll:true});
 else trigger.focus({preventScroll:true});
}
function action(name,icon,callback){
 const button=D.createElement('button');button.type='button';
 button.className='th-quick-action';button.setAttribute('data-quick-action',name);
 const symbol=D.createElement('span');symbol.className='th-quick-action-icon';
 symbol.setAttribute('aria-hidden','true');symbol.innerHTML=icon;
 const label=D.createElement('span');label.textContent=name;
 button.append(symbol,label);
 button.addEventListener('click',()=>{
  setOpen(false);
  try{callback();}catch(e){console.warn('Transhelper shortcut:',e);notify('操作未能打开，请使用原工作台入口。');}
 });
 menu.append(button);return button;
}
const svg=(paths)=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
action('向 AI 提问',svg('<path d="M5 5.5h14v10H9l-4 4v-14Z"/><path d="M12 8v5M9.5 10.5h5"/>'),()=>{
 const native=D.getElementById('openStageAI');
 if(native&&!native.disabled){
  native.click();
  const pane=D.getElementById('stageAI');
  if(pane&&!pane.hidden){
   pane.scrollIntoView?.({behavior:'smooth',block:'nearest'});
   D.getElementById('stageAIInput')?.focus({preventScroll:true});
  }
  return;
 }
 const settings=D.getElementById('openAISettings');
 if(settings){settings.click();notify('请先在 AI 设置中选择可用的 AI 模式。');return;}
 notify('当前页面暂未提供 AI 助手入口。');
});
action('导出项目备份',svg('<path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 16v4h14v-4"/>'),()=>{
 const native=D.getElementById('backupProject');
 if(native&&!native.disabled){native.click();return;}
 notify('项目备份入口暂不可用，请使用侧栏的“导出备份”。');
});
action('返回顶部',svg('<path d="M12 20V5m0 0-6 6m6-6 6 6"/>'),()=>{
 const main=D.querySelector('main.main')||D.querySelector('.main');
 const scrollables=[main,D.scrollingElement,D.documentElement,D.body].filter(Boolean);
 for(const el of scrollables){
  if(typeof el.scrollTo==='function')el.scrollTo({top:0,behavior:'smooth'});
  else el.scrollTop=0;
 }
});
const qa=action('检查术语与数字',svg('<path d="m5 12 4 4L19 6"/><path d="M4 4h16v16H4z"/>'),()=>{
 const native=D.getElementById('runQA');
 if(native&&!native.disabled){native.click();return;}
 notify('请进入终稿页面使用术语与数字检查。');
});
function refresh(){
 const onFinal=!!D.getElementById('runQA');
 qa.hidden=!onFinal;
 const ai=D.getElementById('openStageAI');
 dock.dataset.aiAvailable=ai&&!ai.disabled?'true':'false';
}
trigger.addEventListener('click',()=>{refresh();setOpen(menu.hidden);});
D.addEventListener('pointerdown',e=>{
 if(!menu.hidden&&!dock.contains(e.target)){menu.hidden=true;dock.classList.remove('th-quick-open');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','展开快捷操作');}
},true);
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();setOpen(false);}});
dock.append(message,menu,trigger);D.body.append(dock);
D.documentElement.classList.add('th-quick-dock-ready');
const stage=D.getElementById('stageContent');
const observer=new MutationObserver(()=>refresh());
observer.observe(stage,{subtree:true,childList:true});
refresh();
})();