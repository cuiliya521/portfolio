/* Desktop state-machine test. The previous motion code remains intact in index.html (not executed in this branch). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const workspace = $('cui-test-workspace');
  const scene = $('pangu-scene');
  const homeSlot = $('main-ui-slot');
  const mainUI = $('pangu-main-ui');
  const mainImg = $('pangu-main-img');
  const status = $('cui-test-status');
  let mode = 'hero';
  let step = 0;
  let wheelLock = false;
  // Existing inline WebP is retained exactly as supplied. If its data is invalid, flag it instead of inventing a character.
  const originalCui = document.querySelector('.agent-image');
  const flagCuiAsset = () => {
    if (!originalCui || document.querySelector('.cui-test-asset-alert')) return;
    originalCui.style.display = 'none';
    const alert = document.createElement('span');
    alert.className = 'cui-test-asset-alert';
    alert.textContent = 'CUI 原角色素材无法解码\\n待补透明背景原件';
    originalCui.insertAdjacentElement('afterend', alert);
    document.body.dataset.cuiAsset = 'invalid';
  };
  if(originalCui){
    originalCui.addEventListener('error',flagCuiAsset,{once:true});
    if(originalCui.complete && !originalCui.naturalWidth) flagCuiAsset();
  }

  function mountUI(){
    mainUI.classList.remove('migrating','in-scene','scene-ui-hidden');
    ['left','top','width','height','opacity','transform','transition'].forEach(k=>mainUI.style[k]='');
    mainImg.classList.remove('zoom-input','zoom-preview','zoom-assets');
    homeSlot.after(mainUI);
  }

  function fromHash(){
    if(location.hash === '#cui-pangu') return 'pangu';
    if(location.hash === '#cui-workspace') return 'workspace';
    return 'hero';
  }

  let transitionId = 0;
  let poseFrame;
  let activeAnimations = [];
  let completeTransition;
  let backPending = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMotion = matchMedia('(max-width:700px)');
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'r3-skip';
  skip.textContent = '跳过动画';
  skip.hidden = true;
  document.body.append(skip);
  const announce = detail => document.dispatchEvent(new CustomEvent('cui:camera',{detail:{...detail,at:performance.now()}}));
  skip.addEventListener('click',() => completeTransition?.('skip'));
  function render(nextMode, shouldFocus=true){
    const previous = mode;
    const crossing = (previous === 'hero') !== (nextMode === 'hero');
    const agent = $('agent-wrap');
    const before = agent.getBoundingClientRect();
    const image = agent.querySelector('.agent-image');
    const previousOpacity = Number(getComputedStyle(image).opacity);
    const previousImageTransform = getComputedStyle(image).transform;
    if(completeTransition) announce({phase:'cancelled',mode,ticket:transitionId,reason:'navigation'});
    const ticket = ++transitionId;
    cancelAnimationFrame(poseFrame);
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations = [];
    completeTransition = null;
    backPending = false;
    mode = nextMode;
    const inside = mode !== 'hero';
    const inPangu = mode === 'pangu';
    const duration = crossing && shouldFocus && !reducedMotion.matches ? (mobileMotion.matches ? 240 : inside ? 900 : 600) : 0;
    const moving = duration > 0;
    const pose = () => document.dispatchEvent(new CustomEvent('cui:posechange',{detail:{mode}}));
    // Only the skip control is interactive during the camera move.
    if(inside || moving) workspace.hidden = false;
    workspace.inert = moving || !inside || inPangu;
    $('hero').inert = moving || inside;
    $('hero').setAttribute('aria-hidden',String(inside));
    workspace.setAttribute('aria-hidden',String(!inside));
    document.body.dataset.transition = moving ? 'running' : 'idle';
    document.body.dataset.r3Direction = inside ? 'enter' : 'exit';
    document.body.classList.toggle('cui-test-active',inside);
    scene.classList.toggle('open',inPangu);
    scene.classList.remove('preparing');
    scene.setAttribute('aria-hidden',String(!inPangu));
    scene.inert = !inPangu;
    mountUI(inPangu);
    agent.classList.toggle('in-workspace',inside);
    agent.classList.toggle('in-project',inPangu);
    document.dispatchEvent(new CustomEvent('cui:modechange',{detail:{mode,deferPose:moving}}));
    document.querySelector('.bubble').textContent = inside ? '这是我的 AI 工作空间，一起看看正在做的项目吧。' : 'Hi，要进去看看吗？';
    const finish = (reason = 'complete') => {
      if(ticket !== transitionId || completeTransition === null && moving) return;
      cancelAnimationFrame(poseFrame);
      activeAnimations.forEach(animation => animation.cancel());
      activeAnimations = [];
      completeTransition = null;
      pose();
      if(!inside) workspace.hidden = true;
      workspace.inert = !inside || inPangu;
      $('hero').inert = inside;
      document.body.dataset.transition = 'idle';
      skip.hidden = true;
      if(shouldFocus){
        if(inPangu) $('scene-back').focus({preventScroll:true});
        else if(mode === 'workspace') $('open-test-pangu').focus({preventScroll:true});
        else $('enter-workspace').focus({preventScroll:true});
      }
      announce({phase:'settled',mode,ticket,reason,duration});
    };
    if(!moving){ finish();return; }
    completeTransition = finish;
    skip.hidden = false;
    skip.focus({preventScroll:true});
    const animate = (element,frames,options={}) => {
      const animation = element.animate(frames,{duration,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both',...options});
      activeAnimations.push(animation);return animation;
    };
    const after = agent.getBoundingClientRect();
    const ease = 'cubic-bezier(.22,.7,.2,1)';
    const from = `translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width})`;
    const mobile = mobileMotion.matches;
    if(mobile){
      // Hold the original visible position. Relocate only while fully invisible.
      animate(agent,[{transform:from},{transform:from,offset:.36},{transform:'none',offset:.37},{transform:'none'}],{easing:'linear'});
      const targetTransform = getComputedStyle(image).transform;
      animate(image,[{opacity:previousOpacity,transform:previousImageTransform},{opacity:0,transform:previousImageTransform,offset:.36},{opacity:0,transform:targetTransform,offset:.37},{opacity:0,transform:targetTransform,offset:.43},{opacity:1,transform:targetTransform}],{easing:'linear'});
    }else{
      const frames = [{transform:from,easing:ease}];
      if(inside) frames.push({transform:`translate(${-5-after.left}px,${268-after.top}px) scale(${348/after.width})`,offset:580/900,easing:ease});
      frames.push({transform:'none'});
      animate(agent,frames,{easing:'linear'});
      animate(document.querySelector('.workspace-background'),[{transform:'scale(1.02)',easing:ease},{transform:'scale(1.065)',offset:580/900,easing:ease},{transform:'scale(1)'}],{easing:'linear'});
      animate(image,[{opacity:previousOpacity},{opacity:previousOpacity,offset:.70},{opacity:0,offset:.78},{opacity:0,offset:.80},{opacity:1}],{easing:'linear'});
    }
    const atmosphere = document.querySelector('.h3-atmosphere');
    // Resolve the two frozen backgrounds before H2, rather than mixing them for 900ms.
    animate(atmosphere,inside ? [{opacity:1,transform:'scale(1)'},{opacity:1,offset:mobile?.05:100/900},{opacity:0,transform:mobile?'none':'scale(1.02)',offset:mobile?.55:290/900},{opacity:0}] : [{opacity:0},{opacity:0,offset:.35},{opacity:1,transform:'none'}],{easing:'linear'});
    const copy = document.querySelector('.hero .copy');
    animate(copy,inside ? (mobile ? [{opacity:1,transform:'none'},{opacity:0,transform:'none',offset:.38},{opacity:0}] : [{opacity:1,transform:'translateY(0)'},{opacity:.58,transform:'translateY(-10px)',offset:180/900},{opacity:0,transform:'translateY(-18px)',offset:240/900},{opacity:0}]) : [{opacity:0},{opacity:0,offset:.48},{opacity:1,transform:'none'}],{easing:'linear'});
    const targets = [...workspace.querySelectorAll('.test-workspace__top,.test-workspace__main,.workspace-window,.workspace-jiya,.workspace-dock')];
    targets.forEach(el => {
      if(!inside || mobile){
        animate(el,inside ? [{opacity:0,transform:'none'},{opacity:0,offset:.38},{opacity:1,transform:'none'}] : [{opacity:1},{opacity:0,offset:.55},{opacity:0}],{easing:'linear'});
        return;
      }
      const profiles = el.matches('.workspace-pangu') ? [240,.94,18] : el.matches('.workspace-xhs') ? [280,.82,23] : el.matches('.workspace-noteguard') ? [340,.68,26] : el.matches('.workspace-jiya') ? [400,.55,20] : el.matches('.workspace-dock') ? [480,.38,9] : el.matches('.test-workspace__main') ? [240,.9,18] : [360,.9,18];
      const [start,alpha,dy] = profiles;
      animate(el,[{opacity:0,transform:`translateY(${dy+6}px) scale(.99)`},{opacity:0,offset:start/900,transform:`translateY(${dy+6}px) scale(.99)`,easing:ease},{opacity:alpha,offset:580/900,transform:`translateY(${dy}px) scale(.99)`,easing:ease},{opacity:1,transform:'none'}],{easing:'linear'});
    });
    const clock = animate(skip,[{opacity:1},{opacity:1}],{easing:'linear'});
    clock.ready.then(() => {
      if(ticket !== transitionId || !completeTransition) return;
      const anchor = clock.startTime;
      activeAnimations.forEach(animation => {animation.startTime = anchor;});
      announce({phase:'started',mode,ticket,duration});
    },() => {});
    let poseChanged = false;
    const watchPose = () => {
      if(ticket !== transitionId || !completeTransition) return;
      if(!poseChanged && (clock.currentTime || 0) >= duration*(mobile ? .39 : .79)){
        pose();poseChanged = true;
      }
      if(!poseChanged) poseFrame = requestAnimationFrame(watchPose);
    };
    poseFrame = requestAnimationFrame(watchPose);
    clock.finished.then(() => finish(),() => {});
  }
  reducedMotion.addEventListener('change',() => {if(reducedMotion.matches) completeTransition?.();});
  mobileMotion.addEventListener('change',() => completeTransition?.());

  function navigate(target, replace=false){
    if(target === mode) return;
    const hash = target === 'hero' ? '#hero' : target === 'workspace' ? '#cui-workspace' : '#cui-pangu';
    const depth = replace ? Number(history.state?.cuiTestDepth || 0) : Number(history.state?.cuiTestDepth || 0) + 1;
    history[replace ? 'replaceState' : 'pushState']({cuiTestMode:target,cuiTestDepth:depth},'',hash);
    render(target);
  }

  function goBack(fallback){
    if(backPending) return;
    backPending = true;
    if(Number(history.state?.cuiTestDepth || 0) > 0) history.back();
    else navigate(fallback,true);
  }

  $('enter-workspace').addEventListener('click',() => navigate('workspace'));
  $('hero-view-projects').addEventListener('click',() => {
    navigate('workspace');
    document.querySelector('.test-workspace__projects').scrollIntoView({block:'center',behavior:'auto'});
  });
  // Reuse the same navigation state and CUI node for wheel/keyboard entry.
  let heroWheelTotal = 0;
  let heroWheelTimer;
  $('hero').addEventListener('wheel',e => {
    if(mode !== 'hero' || e.deltaY <= 0 || document.body.dataset.transition !== 'idle') return;
    heroWheelTotal += e.deltaY;
    clearTimeout(heroWheelTimer);
    heroWheelTimer = setTimeout(() => heroWheelTotal = 0,240);
    if(heroWheelTotal > 80){e.preventDefault();heroWheelTotal = 0;navigate('workspace');}
  },{passive:false});
  $('test-workspace-home').addEventListener('click',() => goBack('hero'));
  $('open-test-pangu').addEventListener('click',() => {
    step = 0;
    navigate('pangu');
  });
  $('scene-back').addEventListener('click',() => goBack('workspace'));
  window.addEventListener('popstate',() => render(fromHash()));
  window.addEventListener('keydown',e => {
    if(document.querySelector('dialog[open]')) return;
    if(mode === 'hero' && ['Enter','ArrowDown'].includes(e.key) &&
       !e.target.closest('button,a,input,textarea,select')){
      e.preventDefault();navigate('workspace');return;
    }
    if(e.key === 'Escape'){
      if(mode === 'pangu'){e.preventDefault();goBack('workspace')}
      else if(mode === 'workspace'){e.preventDefault();goBack('hero')}
    }
  });

  const startMode = fromHash();
  history.replaceState({...history.state,cuiTestMode:startMode,cuiTestDepth:0},'',location.href);
  render(startMode,false);
})();
