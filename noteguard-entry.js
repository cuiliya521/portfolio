/* Cross-document enhancement, not a router. Each document keeps its own DOM. */
(() => {
 'use strict';
 const root=location.pathname==='/', review=location.pathname==='/noteguard-case/';
 if(!root&&!review) return;
 const html=document.documentElement, key='cui-ng-entry-v1';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:740px)');
 let own=[],native=null,serial=0,arrival=false,arrived=false,nativeReveal=false;
 const removeTicket=()=>{try{sessionStorage.removeItem(key);}catch{}};
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
 const url=value=>{try{return new URL(value,location.href);}catch{return null;}};
 const isRoot=value=>{const u=url(value);return !!u&&u.origin===location.origin&&u.pathname==='/';};
 const isReview=value=>{const u=url(value);return !!u&&u.origin===location.origin&&u.pathname==='/noteguard-case/';};
 const enabled=()=>!reduced.matches&&!document.hidden;
 function cancelOwn(){own.forEach(a=>a.cancel());own=[];}
 function clear(){++serial;cancelOwn();delete html.dataset.ngEntry;}
 function skip(vt){try{vt?.skipTransition();}catch{}}
 function stop(){skip(native);native=null;clear();}
 function animate(node,frames,duration){
  if(!node?.animate) return;
  try{const a=node.animate(frames,{duration,easing:'cubic-bezier(.22,.7,.2,1)',fill:'none'});a.finished?.catch(()=>{});own.push(a);return a;}catch{} // Navigation never depends on this API.
 }
 function finishOwn(a){
  const ticket=serial;
  if(a?.finished)Promise.resolve(a.finished).then(()=>{if(ticket===serial&&!native)clear();},()=>{if(ticket===serial&&!native)clear();});
 }
 function fallback(){
  if(!arrival||arrived||!enabled()) return;
  const frame=document.querySelector('.product-window');
  if(!frame) return;
  arrived=true;html.dataset.ngEntry='local-arrival';
  const a=animate(frame,[{translate:'0px 6px',scale:'.99',opacity:.94},{translate:'0px 0px',scale:'1',opacity:1}],mobile.matches?120:180);finishOwn(a);
 }
 function useNative(vt,state){
  cancelOwn();native=vt;html.dataset.ngEntry=state;
  const ticket=++serial;
  Promise.resolve(vt.ready).catch(()=>{if(ticket!==serial)return;clear();native=null;if(review){arrived=false;fallback();}});
  Promise.resolve(vt.finished).then(()=>{if(ticket!==serial)return;native=null;clear();},()=>{if(ticket===serial){native=null;clear();}});
 }
 if(review){
  const record=read(),age=record?Date.now()-record.at:Infinity;
  const type=performance.getEntriesByType('navigation')[0]?.type;
  arrival=!!record&&record.path==='/noteguard-case/'&&Number.isFinite(age)&&age>=0&&age<=15000&&type==='navigate'&&isRoot(document.referrer);
  removeTicket(); // Never replay on refresh, direct visits, Back or Forward.
 }
 document.addEventListener('click',e=>{
  if(!root) return;
  const button=e.target.closest?.('#test-noteguard');
  if(!button){stop();removeTicket();return;}
  const workspace=document.getElementById('cui-test-workspace');
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||!workspace||workspace.hidden||workspace.inert||document.body.dataset.transition==='running') return;
  clear();
  try{sessionStorage.setItem(key,JSON.stringify({path:'/noteguard-case/',at:Date.now()}));}catch{}
  if(!enabled()) return;
  html.dataset.ngEntry='departing';
  const focusAnimation=animate(button,[{scale:'1',translate:'0px 0px'},{scale:'1.014',translate:'0px -2px'}],mobile.matches?90:120);
  if(!mobile.matches)animate(document.getElementById('agent-wrap'),[{translate:'0px 0px',rotate:'0deg'},{translate:'8px -2px',rotate:'.4deg'}],120);
  document.querySelectorAll('.workspace-pangu,.workspace-xhs').forEach(node=>animate(node,[{opacity:1},{opacity:.94}],100));
  finishOwn(focusAnimation);
 },true);
 window.addEventListener('pageswap',e=>{
  if(!e.viewTransition)return;
  const record=read();
  if(!root||!enabled()||mobile.matches||!record||record.path!=='/noteguard-case/'||!isReview(e.activation?.entry?.url)){
   skip(e.viewTransition);clear();return;
  }
  useNative(e.viewTransition,'departing');
 });
 window.addEventListener('pagereveal',e=>{
  if(!e.viewTransition){if(review)fallback();return;}
  if(nativeReveal){if(e.viewTransition!==native)skip(e.viewTransition);return;}
  if(!review||!arrival||!enabled()||mobile.matches||!document.querySelector('.product-window')){skip(e.viewTransition);clear();if(review)fallback();return;}
  nativeReveal=true;arrived=true;useNative(e.viewTransition,'arriving');
 });
 document.addEventListener('DOMContentLoaded',()=>{if(review&&!native)fallback();});
 // User interactions pass through immediately and stop decorative motion before the existing handlers run.
 document.addEventListener('pointerdown',()=>{if(review)stop();},true);
 document.addEventListener('keydown',()=>{if(review)stop();},true);
 window.addEventListener('popstate',()=>{if(review)stop();});
 window.addEventListener('hashchange',()=>{if(review)stop();});
 document.addEventListener('ng:trace',()=>{if(review)stop();});
 document.addEventListener('cui:modechange',e=>{if(root&&e.detail.mode!=='workspace'){stop();removeTicket();}});
 window.addEventListener('pagehide',()=>{if(review)arrival=false;cancelOwn();if(!native)clear();});
 window.addEventListener('pageshow',e=>{if(e.persisted){stop();removeTicket();arrival=false;}});
 reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
 mobile.addEventListener('change',stop);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
})();
