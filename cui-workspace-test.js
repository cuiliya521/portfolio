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
  let evidenceProxy;
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
    const projectCross = (previous === 'workspace' && nextMode === 'pangu') || (previous === 'pangu' && nextMode === 'workspace');
    const projectWindow = scene.querySelector('.pangu-r1-window');
    const card = workspace.querySelector('.workspace-pangu');
    const oldProjectRect = projectWindow.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const thumbnail = card.querySelector('.window-evidence img');
    const thumbBox = thumbnail.getBoundingClientRect();
    const thumbScale = Math.min(thumbBox.width/thumbnail.naturalWidth,thumbBox.height/thumbnail.naturalHeight);
    const thumbRect = {left:thumbBox.left+(thumbBox.width-thumbnail.naturalWidth*thumbScale)/2,top:thumbBox.top+(thumbBox.height-thumbnail.naturalHeight*thumbScale)/2,width:thumbnail.naturalWidth*thumbScale,height:thumbnail.naturalHeight*thumbScale};
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
    evidenceProxy?.remove();evidenceProxy = null;
    completeTransition = null;
    backPending = false;
    mode = nextMode;
    const inside = mode !== 'hero';
    const inPangu = mode === 'pangu';
    const duration = projectCross && shouldFocus && !reducedMotion.matches ? (mobileMotion.matches ? 220 : 620) : crossing && shouldFocus && !reducedMotion.matches ? (mobileMotion.matches ? 240 : inside ? 900 : 600) : 0;
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
    scene.inert = moving || !inPangu;
    document.body.dataset.r4Camera = projectCross && moving ? 'running' : 'idle';
    if(projectCross && moving) scene.classList.add('open');
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
      evidenceProxy?.remove();evidenceProxy = null;
      completeTransition = null;
      pose();
      scene.classList.toggle('open',inPangu);
      scene.inert = !inPangu;
      document.body.dataset.r4Camera = 'idle';
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
    if(projectCross){
      // The existing evidence figure is the shared surface, never an interactive clone.
      const end = projectWindow.getBoundingClientRect();
      const source = inPangu ? cardRect : oldProjectRect;
      const destination = inPangu ? end : cardRect;
      const matrix = rect => `translate(${rect.left-end.left}px,${rect.top-end.top}px) scale(${rect.width/end.width})`;
      const product = $('pangu-r1-product');
      const target = product.getBoundingClientRect();
      animate(projectWindow,[{transform:matrix(source),borderRadius:'18px'},{transform:matrix(destination),borderRadius:inPangu?'25px':'18px'}]);
      animate(card,[{opacity:0},{opacity:0}]);
      // Immutable source registration: thumb = full * .414 + (-66, 35).
      // Mobile already references the exact full source (no image handoff).
      const sameSource = thumbnail.naturalWidth === product.naturalWidth && thumbnail.currentSrc.endsWith('pangu-mobile-source.jpg');
      const registration = sameSource ? {scale:1,x:0,y:0} : {scale:.414,x:-66,y:35};
      const finalScale = target.width/product.naturalWidth;
      const initialScale = thumbScale*registration.scale/finalScale;
      const initialTransform = `translate(${thumbRect.left+registration.x*thumbScale-target.left}px,${thumbRect.top+registration.y*thumbScale-target.top}px) scale(${initialScale})`;
      const proxy = document.createElement('div');
      proxy.className='r4-evidence-proxy';proxy.inert=true;proxy.setAttribute('aria-hidden','true');
      proxy.innerHTML='<div class="r4-evidence-plane"><div class="r4-evidence-content"></div></div>';
      evidenceProxy=proxy;document.body.append(proxy);
      const plane=proxy.firstElementChild,content=plane.firstElementChild;
      Object.assign(content.style,{left:target.left+'px',top:target.top+'px',width:target.width+'px',height:target.height+'px'});
      const whole=product.cloneNode();whole.removeAttribute('id');whole.alt='';whole.className='r4-evidence-full';
      Object.assign(whole.style,{width:target.width+'px',height:target.height+'px'});content.append(whole);
      if(!sameSource){
        const crop=thumbnail.cloneNode();crop.removeAttribute('id');crop.alt='';crop.className='r4-evidence-thumb';
        const unit=finalScale/registration.scale;
        Object.assign(crop.style,{left:-registration.x*unit+'px',top:-registration.y*unit+'px',width:thumbnail.naturalWidth*unit+'px',height:thumbnail.naturalHeight*unit+'px'});content.append(crop);
        const sharedClip=`inset(${65*unit}px 0 0 ${30*unit}px)`;
        // Reveal original navigation as the mask grows; keep only the matched fields/poster during handoff.
        animate(crop,inPangu?[{clipPath:'inset(0px)'},{clipPath:sharedClip,offset:.20},{clipPath:sharedClip}]:[{clipPath:sharedClip},{clipPath:sharedClip,offset:.80},{clipPath:'inset(0px)'}],{easing:'linear'});
        animate(crop,inPangu?[{opacity:1},{opacity:1,offset:.20},{opacity:0,offset:.48},{opacity:0}]:[{opacity:0},{opacity:0,offset:.52},{opacity:1,offset:.80},{opacity:1}],{easing:'linear'});
        // Opaque full source beneath the fading crop avoids a white alpha dip.
      }
      const maskFrom = inPangu?thumbRect:target,maskTo=inPangu?target:thumbRect;
      const maskFrame=r=>({left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
      animate(proxy,[maskFrame(maskFrom),maskFrame(maskTo)]);
      animate(plane,[{left:-maskFrom.left+'px',top:-maskFrom.top+'px'},{left:-maskTo.left+'px',top:-maskTo.top+'px'}]);
      animate(content,inPangu?[{transform:initialTransform},{transform:'none'}]:[{transform:'none'},{transform:initialTransform}]);
      animate(product,[{opacity:0},{opacity:0}]);
      animate(projectWindow.querySelector('figcaption'),[{opacity:0},{opacity:0}]);
      const background = scene.querySelector('.pangu-r1-background');
      animate(background,inPangu ? [{opacity:0},{opacity:1,offset:.32},{opacity:1}] : [{opacity:1},{opacity:0,offset:.72},{opacity:0}],{easing:'linear'});
      scene.querySelectorAll('.pangu-r1-top,.pangu-r1-aside').forEach(el=>animate(el,inPangu ? [{opacity:0},{opacity:0,offset:.35},{opacity:1}] : [{opacity:1},{opacity:0,offset:.25},{opacity:0}],{easing:'linear'}));
      workspace.querySelectorAll('.test-workspace__top,.test-workspace__main,.workspace-xhs,.workspace-noteguard,.workspace-jiya,.workspace-dock').forEach(el=>animate(el,inPangu ? [{opacity:1},{opacity:0,offset:.18},{opacity:0}] : [{opacity:0},{opacity:0,offset:.55},{opacity:1}],{easing:'linear'}));
      const roleEnd = agent.getBoundingClientRect();
      const roleStart = `translate(${before.left-roleEnd.left}px,${before.top-roleEnd.top}px) scale(${before.width/roleEnd.width})`;
      const targetTransform = getComputedStyle(image).transform;
      if(mobileMotion.matches){
        animate(agent,[{transform:roleStart},{transform:roleStart,offset:.14},{transform:'none',offset:.17},{transform:'none'}],{easing:'linear'});
      }else animate(agent,[{transform:roleStart},{transform:'none'}]);
      animate(image,[{opacity:previousOpacity,transform:previousImageTransform},{opacity:0,transform:previousImageTransform,offset:mobileMotion.matches?.14:.36},{opacity:0,transform:targetTransform,offset:mobileMotion.matches?.48:.43},{opacity:1,transform:targetTransform}],{easing:'linear'});
      const clock = animate(skip,[{opacity:1},{opacity:1}],{easing:'linear'});
      let swapped=false;
      const watch=()=>{if(ticket!==transitionId||!completeTransition)return;if(!swapped&&(clock.currentTime||0)>=duration*.39){pose();swapped=true;}if(!swapped)poseFrame=requestAnimationFrame(watch);};
      poseFrame=requestAnimationFrame(watch);
      clock.ready.then(()=>{if(ticket!==transitionId||!completeTransition)return;activeAnimations.forEach(a=>a.startTime=clock.startTime);announce({phase:'started',mode,ticket,duration,scene:'pangu'});},()=>{});
      clock.finished.then(()=>finish(),()=>{});
      return;
    }
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
