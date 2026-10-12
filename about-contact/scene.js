(() => {
 'use strict';
 // Independent resource configuration: replace only after original Fig.07 pose is supplied.
 const assets = Object.freeze({character:'../assets/workspace-v6/cui-guide.png',email:'3104306958@qq.com',resume:null});
 document.getElementById('cui-character').src=assets.character;
 const opener=document.getElementById('resume-open'),dialog=document.getElementById('resume-status');
 opener.addEventListener('click',()=>dialog.showModal());
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>opener.focus({preventScroll:true}));
})();
