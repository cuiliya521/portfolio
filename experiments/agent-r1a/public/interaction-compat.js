// Standalone coordination fixture. Not imported by any frozen portfolio page.
export function createInteractionCoordinator({dialog,canOpen=()=>true,fallback,onClose=()=>{}}) {
  let invoker=null,scroll=0;
  const visible=el=>el?.isConnected&&!el.closest('[inert]')&&el.getClientRects().length&&!el.disabled;
  function open(from=document.activeElement){
    if(!canOpen()||[...document.querySelectorAll('dialog[open]')].some(d=>d!==dialog))return false;
    if(dialog.open)return true;
    invoker=from;scroll=window.scrollY;dialog.showModal();return true;
  }
  function close(reason='close'){if(dialog.open){dialog.dataset.closeReason=reason;dialog.close();}}
  function key(event){
    if(!dialog.open)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close('escape');return;}
    if(event.key==='Tab'){
      const stops=[...dialog.querySelectorAll('button,a[href],input,textarea,select,summary,[tabindex]')].filter(el=>visible(el)&&el.tabIndex>=0&&getComputedStyle(el).visibility!=='hidden');
      const first=stops[0],last=stops.at(-1),active=document.activeElement;
      if(!first){event.preventDefault();dialog.focus();return;}
      if(event.shiftKey&&(active===first||!dialog.contains(active))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(active===last||!dialog.contains(active))){event.preventDefault();first.focus();}
    }
  }
  window.addEventListener('keydown',key,true);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close('escape');});
  dialog.addEventListener('close',()=>{
    onClose(dialog.dataset.closeReason||'close');
    const active=document.activeElement;
    // Preserve native focus restoration; never steal the user's next Tab.
    if(active===document.body||dialog.contains(active)){
      const target=visible(invoker)?invoker:visible(fallback)?fallback:null;target?.focus({preventScroll:true});
    }
    window.scrollTo({top:scroll,behavior:'auto'});
  });
  return Object.freeze({open,close,beforeNavigation(){close('navigation');},dispose(){window.removeEventListener('keydown',key,true);close('dispose');}});
}
