/* Passive same-tab visit receipt; no routing, UI, history writes or requests. */
(() => {
 'use strict';
 const key='cui-project-visit-v1';
 const allowed={'/noteguard-case/':'noteguard','/content-archive/':'xhs'};
 const page=allowed[location.pathname];
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
 function visit(){
  const record=read();
  if(!record) return;
  if(!page || record.project!==page){try{sessionStorage.removeItem(key);}catch{}return;}
  // Only the first arrival from the originating Workspace can witness a ticket.
  let from;
  try{from=new URL(document.referrer);}catch{return;}
  if(record.phase==='armed' && typeof record.token==='string' && from.origin===location.origin && from.pathname==='/'){
   record.phase='visited';try{sessionStorage.setItem(key,JSON.stringify(record));}catch{}
  }
 }
 document.addEventListener('click',e=>{
  const back=e.target.closest?.('#workspaceBack');
  if(!back || e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const record=read();
  if(record?.project===page && record.phase==='visited'){
   record.phase='returning';try{sessionStorage.setItem(key,JSON.stringify(record));}catch{}
  }
 },true);
 window.addEventListener('pageshow',visit);
 visit();
})();
