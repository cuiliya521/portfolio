(() => {
 'use strict';
 // Independent resource configuration: replace only after original Fig.07 pose is supplied.
 const assets = Object.freeze({character:'../assets/workspace-v6/cui-guide.png',email:'3104306958@qq.com',resume:null});
 document.getElementById('cui-character').src=assets.character;
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
   document.getElementById('workspace-return').click();
  }
 });
})();
