/* CUI Workspace -> native B1 room handoff. Opt-in ONLY via ?handoff=1.
   Keeps the production/Home/Workspace untouched and preserves the old Pangu route by default. */
(() => {
  'use strict';
  if(new URLSearchParams(location.search).get('handoff')!=='1')return;
  const card=document.getElementById('open-test-pangu');
  const workspace=document.getElementById('cui-test-workspace');
  if(!card||!workspace)return;
  const overlay=document.createElement('div');
  overlay.className='cui-room-overlay';
  overlay.hidden=true;overlay.inert=true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','盘古智绘真实字段工作台');
  const frame=document.createElement('iframe');
  frame.title='盘古智绘产品工作台';
  frame.src='experiments/room-handoff/';
  frame.loading='eager';
  overlay.append(frame);
  const notice=document.createElement('div');notice.className='cui-handoff-notice';notice.hidden=true;notice.setAttribute('role','status');
  document.body.append(overlay,notice);
  let ready=false,open=false,transitioning=false,pending=false,closedByBack=false,timeoutId=0;
  let sourceX='50%',sourceY='50%';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  function toast(s){notice.textContent=s;notice.hidden=false;clearTimeout(timer);timer=setTimeout(()=>notice.hidden=true,2400)}
  function resetChild(){try{frame.contentWindow.postMessage({type:'cui:room-reset'},location.origin)}catch{}}
  frame.addEventListener('load',()=>{ready=true;card.removeAttribute('aria-busy');clearTimeout(timeoutId);if(pending)startOpen()});
  function setOrigin(){
    const r=card.getBoundingClientRect();
    sourceX=(r.left+r.width/2)+'px';sourceY=(r.top+r.height/2)+'px';
    overlay.style.setProperty('--source-x',sourceX);overlay.style.setProperty('--source-y',sourceY);
  }
  function focusChild(){try{frame.focus();frame.contentWindow.postMessage({type:'cui:room-focus'},location.origin)}catch{}}
  function finishOpen(){
    if(!open)return;
    transitioning=false;overlay.classList.remove('is-animating');focusChild();
  }
  function startOpen(){
    pending=false;
    if(!ready||open)return;
    setOrigin();
    open=true;transitioning=true;
    if(!history.state?.cuiRoomHandoff){
      history.pushState({...history.state,cuiRoomHandoff:true},'',location.href);
    }
    overlay.hidden=false;overlay.inert=false;
    overlay.classList.remove('is-open');
    overlay.classList.add('is-animating');
    document.body.classList.add('cui-handoff-active');
    workspace.inert=true;
    resetChild();
    if(reduced.matches){overlay.classList.add('is-open');finishOpen();return;}
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      overlay.classList.add('is-open');
      setTimeout(finishOpen,700);
    }));
  }
  function requestOpen(){
    if(open||transitioning)return;
    if(ready){startOpen();return}
    pending=true;card.setAttribute('aria-busy','true');
    clearTimeout(timeoutId);timeoutId=setTimeout(()=>{
      if(pending&&!ready){pending=false;card.removeAttribute('aria-busy');toast('交互演示未能加载，请重新尝试。')}
    },3300);
  }
  function closeNow(){
    if(!open)return;
    open=false;pending=false;transitioning=true;
    frame.blur();
    overlay.classList.add('is-animating');
    overlay.classList.remove('is-open');
    const done=()=>{
      if(open)return;
      overlay.hidden=true;overlay.inert=true;overlay.classList.remove('is-animating');
      document.body.classList.remove('cui-handoff-active');
      workspace.inert=location.hash!=='#cui-workspace';transitioning=false;
      resetChild();if(!workspace.inert)card.focus({preventScroll:true});
    };
    if(reduced.matches){done();return}
    setTimeout(done,700);
  }
  function requestClose(){
    if(!open)return;
    if(history.state?.cuiRoomHandoff)history.back();
    else closeNow();
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('#open-test-pangu');
    if(!button||e.defaultPrevented||!document.body.contains(button))return;
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    requestOpen();
  },true);
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
    if(e.data?.type==='cui:room-exit')requestClose();
    if(e.data?.type==='cui:room-ready')ready=true;
  });
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&open){e.preventDefault();e.stopImmediatePropagation();requestClose()}
  },true);
  window.addEventListener('popstate',()=>{
    if(open&&!history.state?.cuiRoomHandoff){closeNow();closedByBack=true}
  },true);
  window.addEventListener('pageshow',()=>{
    if(!open&&history.state?.cuiRoomHandoff){
      const s={...history.state};delete s.cuiRoomHandoff;history.replaceState(s,'',location.href);
    }
  });
  window.addEventListener('pagehide',()=>clearTimeout(timeoutId));
})();