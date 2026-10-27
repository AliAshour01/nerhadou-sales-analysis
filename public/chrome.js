// Version 26 · presentation controls are independent from all sales/data operations.
(()=>{
 const $=id=>document.getElementById(id),body=document.body,button=$('fullscreen-toggle'),label=$('fullscreen-label'),menu=$('sidebar-toggle'),scrim=$('nav-scrim'),status=$('display-status'),sidebar=$('workspace-sidebar'),edge=$('sidebar-edge'),more=$('more-filters');
 let expanded=false,busy=false,native=false;
 const hideTip=()=>{const t=$('tooltip');if(t)t.style.display='none'};
 function closeMenu(restoreFocus=false){body.classList.remove('nav-open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');scrim.hidden=true;if(restoreFocus)menu.focus()}
 function setPeek(open,restoreFocus=false){
  const visible=expanded&&open;body.classList.toggle('nav-peek',visible);edge.setAttribute('aria-expanded',String(visible));
  if(expanded){sidebar.inert=!visible;menu.setAttribute('aria-expanded',String(visible));menu.setAttribute('aria-label',visible?'Close navigation':'Open navigation')}
  if(restoreFocus)menu.focus();
 }
 function closeFilters(){if(!more)return;more.open=false;more.querySelectorAll('details[open]').forEach(item=>item.open=false)}
 document.addEventListener('click',event=>{if(more?.open&&!more.contains(event.target))closeFilters();if(expanded&&body.classList.contains('nav-peek')&&!sidebar.contains(event.target)&&!menu.contains(event.target)&&!edge.contains(event.target))setPeek(false)});
 edge.addEventListener('pointerenter',()=>setPeek(true));edge.addEventListener('focus',()=>setPeek(true));edge.onclick=()=>setPeek(true);
 sidebar.addEventListener('pointerleave',()=>{if(expanded&&!sidebar.contains(document.activeElement))setPeek(false)});
 sidebar.addEventListener('focusout',event=>{if(expanded&&!sidebar.contains(event.relatedTarget)&&event.relatedTarget!==edge&&event.relatedTarget!==menu)setPeek(false)});
 document.addEventListener('pointermove',event=>{if(expanded&&body.classList.contains('nav-peek')&&!sidebar.contains(event.target)&&!menu.contains(event.target)&&!edge.contains(event.target)&&!sidebar.contains(document.activeElement))setPeek(false)});
 function sync(){setPeek(false);sidebar.inert=expanded;edge.hidden=!expanded;body.classList.toggle('is-expanded',expanded);button.setAttribute('aria-pressed',String(expanded));label.textContent=expanded?(native?'Exit full screen':'Exit expanded view'):'Full screen';button.setAttribute('aria-label',label.textContent);button.querySelector?.('svg path')?.setAttribute('d',expanded?'M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5':'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5');button.title=expanded?'Restore sidebar · Esc to exit':'Full screen · hide sidebar';hideTip()}
 async function exitExpanded(){
  if(document.fullscreenElement&&typeof document.exitFullscreen==='function'){
   try{await document.exitFullscreen()}catch{status.textContent='Press Escape to exit full screen.';return}
  }
  expanded=false;native=false;sync();status.textContent='Standard view. Sidebar restored.';button.focus();
 }
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;
  try{
   if(expanded){await exitExpanded();return}
   closeMenu();expanded=true;native=false;sync();status.textContent='Expanded view. Sidebar hidden. Press Escape to restore it.';
   if(typeof document.documentElement.requestFullscreen==='function'){
    try{await document.documentElement.requestFullscreen({navigationUI:'hide'});native=!!document.fullscreenElement;sync();if(native)status.textContent='Full screen. Sidebar hidden. Press Escape to exit.'}catch{/* Expanded view remains available when native fullscreen is restricted. */}
   }
  }finally{busy=false;button.disabled=false}
 };
 document.addEventListener('fullscreenchange',()=>{native=!!document.fullscreenElement;if(native)expanded=true;else if(expanded){expanded=false;status.textContent='Standard view. Sidebar restored.'}sync()});
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(more?.open){closeFilters();more.querySelector('summary')?.focus();return}if(body.classList.contains('nav-peek')){setPeek(false,true);return}if(body.classList.contains('nav-open'))closeMenu(true);else if(expanded&&!document.fullscreenElement){expanded=false;native=false;sync();status.textContent='Standard view. Sidebar restored.';button.focus()}});
 menu.onclick=()=>{if(expanded){setPeek(!body.classList.contains('nav-peek'));return;}const open=!body.classList.contains('nav-open');body.classList.toggle('nav-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');scrim.hidden=!open};
 scrim.onclick=()=>closeMenu(true);
 const labels={sales:'Actual Sales',comparison:'Actual Sales · Historical',upload:'Data management',approvals:'Users & access'};
 document.querySelectorAll('[data-page]').forEach(nav=>nav.addEventListener('click',()=>{$('chrome-page-label').textContent=labels[nav.dataset.page]||'Nerhadou Sales Analysis';closeMenu();if(expanded)setPeek(false,true)}));
 sync();
})();
