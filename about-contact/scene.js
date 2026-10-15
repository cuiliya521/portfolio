(() => {
 'use strict';
 // Independent resource configuration: replace only after original Fig.07 pose is supplied.
 const assets = Object.freeze({character:'../assets/workspace-v6/cui-guide.png',email:'3104306958@qq.com',resume:null});
 document.getElementById('cui-character').src=assets.character;
 const back=document.getElementById('workspace-return');
 back.addEventListener('click',event=>{
  // Reuse the originating Workspace entry, including its scroll and focus record.
  // Direct visits keep the ordinary href fallback; modified clicks keep link semantics.
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.defaultPrevented)return;
  const ref=document.referrer?new URL(document.referrer):null;
  if(ref?.origin===location.origin&&ref.pathname===new URL('../',location.href).pathname&&history.length>1){
   event.preventDefault();history.back();
  }
 });
 const opener=document.getElementById('resume-open'),dialog=document.getElementById('resume-status');
 opener.addEventListener('click',()=>dialog.showModal());
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  // Native dialog already restores its opener. Do not steal a user's next Tab stop.
  const active=document.activeElement;
  if(active===document.body||dialog.contains(active)) opener.focus({preventScroll:true});
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!dialog.open){
   event.preventDefault();
   back.click();
  }
 });
})();
