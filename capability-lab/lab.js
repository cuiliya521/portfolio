/* Frozen V2 visual page. Return to the existing Workspace without new controllers. */
(() => {
 'use strict';
 const back=document.getElementById('workspaceBack');
 back.addEventListener('click',e=>{
  const ref=document.referrer?new URL(document.referrer):null;
  if(ref?.origin===location.origin&&ref.pathname===new URL('../',location.href).pathname&&history.length>1){e.preventDefault();history.back()}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();back.click()}});
})();
