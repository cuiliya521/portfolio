/* Additive role movement on the existing R4 clock. No camera/router ownership. */
(() => {
 'use strict';
 const role=document.getElementById('agent-wrap');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const mobile=matchMedia('(max-width:700px)');
 let mode=location.hash==='#cui-pangu'?'pangu':location.hash==='#cui-workspace'?'workspace':'hero';
 let crossing=false, animation=null, activeTicket=null, latestTicket=-1, minimumTicket=0;
 const rest=()=>mode==='pangu'?'reading':mode==='workspace'?'workspace':'hero';
 function release(state=rest()){
  animation?.cancel();animation=null;activeTicket=null;
  role.dataset.panguCompanion=state;
 }
 document.addEventListener('cui:modechange',e=>{
  const next=e.detail.mode;
  crossing=(mode==='workspace'&&next==='pangu')||(mode==='pangu'&&next==='workspace');
  mode=next;minimumTicket=latestTicket+1;release(crossing?'prepared':rest());
 });
 document.addEventListener('cui:camera',e=>{
  const d=e.detail;
  if(!Number.isSafeInteger(d.ticket)) return;
  if(d.phase==='cancelled'){
   if(activeTicket===d.ticket || crossing && latestTicket===d.ticket) release('cancelled');
   return;
  }
  if(d.phase==='settled'){
   if(d.mode!==mode || d.ticket<latestTicket || d.ticket<minimumTicket) return;
   latestTicket=Math.max(latestTicket,d.ticket);mode=d.mode;crossing=false;release();return;
  }
  if(d.phase!=='started' || d.scene!=='pangu' || !crossing || d.mode!==mode || d.ticket<=latestTicket) return;
  latestTicket=d.ticket;
  release();
  if(document.hidden || reduced.matches || mobile.matches){role.dataset.panguCompanion='fallback';return;}
  if(!Number.isFinite(d.duration) || d.duration<=0 || d.duration>900){role.dataset.panguCompanion='unsupported';return;}
  // The controller has assigned this startTime before announcing started.
  const clock=role.getAnimations?.().find(a=>a.effect?.target===role && a.effect.getTiming().duration===d.duration && a.effect.getKeyframes().some(f=>'transform' in f));
  if(!clock || !Number.isFinite(clock.startTime)){role.dataset.panguCompanion='unsynced';return;}
  const entering=mode==='pangu';
  // The existing FLIP remains responsible for the large spatial migration.
  const frames=entering ? [
   {translate:'0px 0px',rotate:'0deg',offset:0},
   {translate:'12px -6px',rotate:'.5deg',offset:.24},
   {translate:'-6px -3px',rotate:'-.3deg',offset:.7},
   {translate:'0px 0px',rotate:'0deg',offset:1}
  ] : [
   {translate:'0px 0px',rotate:'0deg',offset:0},
   {translate:'-6px -3px',rotate:'-.3deg',offset:.3},
   {translate:'6px -4px',rotate:'.35deg',offset:.76},
   {translate:'0px 0px',rotate:'0deg',offset:1}
  ];
  try{
   animation=role.animate(frames,{duration:d.duration,easing:'cubic-bezier(.22,.7,.2,1)',fill:'none'});
   animation.startTime=clock.startTime;
   animation.finished?.catch(()=>{}); // cancellation is an expected lifecycle outcome
   activeTicket=d.ticket;
   role.dataset.panguCompanion=entering?'approach-yield':'return';
  }catch{release('unsupported');}
 });
 reduced.addEventListener('change',()=>release());
 mobile.addEventListener('change',()=>release());
 window.addEventListener('pagehide',()=>{crossing=false;release();});
 window.addEventListener('pageshow',()=>{crossing=false;release();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden) release();});
 role.dataset.panguCompanion=rest();
})();
