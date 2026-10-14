/* Original reader + R4-B single-image evidence camera. No product simulation. */
(() => {
  const viewer = document.getElementById('pangu-original-viewer');
  const scroll = viewer.querySelector('.pangu-original-scroll');
  const fit = document.getElementById('pangu-original-fit');
  let opener;
  const scene=document.getElementById('pangu-scene'),image=document.getElementById('pangu-r1-product'),viewport=document.getElementById('pangu-original-open');
  const focus=viewport.querySelector('.pangu-evidence-focus'),caption=document.getElementById('pangu-evidence-caption');
  const buttons=[...scene.querySelectorAll('[data-pangu-stage]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:700px)');
  const areas=[null,[265,142,570,432],[930,110,515,785],[250,680,1190,344]];
  const descriptions=['真实产品全貌：选择字段、查看结果与素材入口。','把写 Prompt，变成选字段。六个真实字段帮助商户表达需求。','真实结果预览：青提柠檬海报，以及下载、收藏、复用入口。','素材区只保留截图底部的部分卡片，未展示完整管理流程；上方「复用」入口提供辅助证据。'];
  let stage=0,animations=[],serial=0,pendingExit=null,settled=Promise.resolve();
  const rectFrames=r=>({left:r[0]+'px',top:r[1]+'px',width:r[2]+'px',height:r[3]+'px'});
  function select(next,duration=mobile.matches?180:280){
    const ticket=++serial,before=getComputedStyle(image).transform,previous=focus.getBoundingClientRect(),viewBefore=viewport.getBoundingClientRect(),opacity=getComputedStyle(focus).opacity;
    animations.forEach(a=>a.cancel());animations=[];stage=next;viewport.dataset.cameraStage=String(next);
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===next)));caption.textContent=descriptions[next];
    const w=viewport.clientWidth,h=viewport.clientHeight,base=w/1536,area=mobile.matches&&next===3?[245,885,800,139]:areas[next];let transform='none',region=[0,0,w,h];
    if(area){const [x,y,rw,rh]=area,scale=Math.min(w/rw,h/rh);const tx=Math.min(0,Math.max(w-1536*scale,(w-rw*scale)/2-x*scale)),ty=Math.min(0,Math.max(h-1024*scale,(h-rh*scale)/2-y*scale));transform=`translate(${tx}px,${ty}px) scale(${scale/base})`;region=[tx+x*scale,ty+y*scale,rw*scale,rh*scale];}
    image.style.transform=transform;Object.assign(focus.style,rectFrames(region));focus.style.opacity=next?'1':'0';
    document.dispatchEvent(new CustomEvent('cui:pangu-camera',{detail:{phase:'started',stage:next,duration:reduced.matches?0:duration}}));
    if(reduced.matches||!duration){settled=Promise.resolve();document.dispatchEvent(new CustomEvent('cui:pangu-camera',{detail:{phase:'settled',stage:next}}));return settled;}
    const opts={duration,easing:'cubic-bezier(.22,.7,.2,1)'};
    if(mobile.matches&&Math.abs(viewBefore.height-h)>1)animations.push(viewport.animate([{height:viewBefore.height+'px'},{height:h+'px'}],opts));
    animations.push(image.animate([{transform:before},{transform}],opts));
    animations.push(focus.animate([{...rectFrames([previous.left-viewBefore.left,previous.top-viewBefore.top,previous.width,previous.height]),opacity},{...rectFrames(region),opacity:next?1:0}],opts));
    settled=Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(ticket!==serial)return;animations=[];document.dispatchEvent(new CustomEvent('cui:pangu-camera',{detail:{phase:'settled',stage:next}}));});return settled;
  }
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{if(!pendingExit)select(i)}));
  document.getElementById('pangu-explore-start').addEventListener('click',()=>{if(pendingExit)return;select(1);buttons[1].focus({preventScroll:true})});
  scene.querySelector('ol').addEventListener('keydown',e=>{if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();let i=buttons.indexOf(document.activeElement);if(i<0)i=stage;i=e.key==='Home'?0:e.key==='End'?3:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:3))%4;buttons[i].focus({preventScroll:true});if(!pendingExit)select(i)});
  document.addEventListener('cui:pangu-before-exit',e=>{
    if(!stage&&!pendingExit&&!animations.length)return;e.preventDefault();const already=!!pendingExit;pendingExit=e.detail.resume;
    if(already)return;document.getElementById('scene-back').focus({preventScroll:true});document.getElementById('pangu-explore-start').disabled=true;viewport.inert=true;buttons.forEach(b=>b.disabled=true);document.getElementById('pangu-source-open').disabled=true;document.body.dataset.panguExit='pending';select(0,mobile.matches?140:180).then(()=>{const resume=pendingExit;pendingExit=null;document.getElementById('pangu-explore-start').disabled=false;viewport.inert=false;buttons.forEach(b=>b.disabled=false);document.getElementById('pangu-source-open').disabled=false;document.body.dataset.panguExit='idle';resume?.()});
  });
  document.addEventListener('cui:modechange',e=>{if(e.detail.mode==='pangu')select(0,0)});
  reduced.addEventListener('change',()=>{if(reduced.matches)select(stage,0)});
  mobile.addEventListener('change',()=>select(stage,0));
  window.addEventListener('resize',()=>{if(scene.classList.contains('open')&&!pendingExit&&document.body.dataset.transition==='idle')select(stage,0)});
  const open = event => {
    opener = event.currentTarget;
    viewer.classList.remove('is-fit');
    fit.textContent = '适应屏幕';
    viewer.showModal();
    scroll.scrollTo(0, 0);
    document.getElementById('pangu-original-close').focus();
  };
  document.getElementById('pangu-original-open').addEventListener('click', open);
  document.getElementById('pangu-source-open').addEventListener('click', open);
  document.getElementById('pangu-original-close').addEventListener('click', () => viewer.close());
  fit.addEventListener('click', () => {
    const fitted = viewer.classList.toggle('is-fit');
    fit.textContent = fitted ? '原尺寸' : '适应屏幕';
    scroll.scrollTo(0, 0);
  });
  // Keep native dialog Escape handling while preventing the site navigation handler.
  window.addEventListener('keydown', event => {
    if (viewer.open && event.key === 'Escape') event.stopImmediatePropagation();
  }, true);
  viewer.addEventListener('close', () => {
    if (document.getElementById('pangu-scene').classList.contains('open')) opener?.focus({preventScroll:true});
  });
  document.addEventListener('cui:modechange', event => {
    if (event.detail.mode !== 'pangu' && viewer.open) viewer.close();
  });
})();
