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

  let settleTimer;
  let transitionId = 0;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function render(nextMode, shouldFocus=true){
    const previous = mode;
    const crossing = (previous === "hero") !== (nextMode === "hero");
    const ticket = ++transitionId;
    clearTimeout(settleTimer);
    mode = nextMode;
    const inside = mode !== 'hero';
    const inPangu = mode === 'pangu';
    // Keep both DOM surfaces mounted during entry/exit; only hide after exit settles.
    if(inside) workspace.hidden = false;
    workspace.inert = !inside || inPangu;
    $("hero").inert = inside;
    $("hero").setAttribute("aria-hidden", String(inside));
    document.body.dataset.transition = crossing && !reducedMotion.matches ? "running" : "idle";
    workspace.getBoundingClientRect();
    workspace.setAttribute('aria-hidden', String(!inside));

    document.body.classList.toggle('cui-test-active',inside);
    scene.classList.toggle('open',inPangu);
    scene.classList.remove('preparing');
    scene.setAttribute('aria-hidden',String(!inPangu));
    scene.inert = !inPangu;
    mountUI(inPangu);

    $("agent-wrap").classList.toggle("in-workspace",inside);
    $("agent-wrap").classList.toggle("in-project",inPangu);
    document.dispatchEvent(new CustomEvent('cui:modechange',{detail:{mode}}));
    document.querySelector(".bubble").textContent = inside ? "这是我的 AI 工作空间，一起看看正在做的项目吧。" : "Hi，要进去看看吗？";
    const finish = () => {
      if(ticket !== transitionId) return;
      if(!inside) workspace.hidden = true;
      document.body.dataset.transition = "idle";
      if(shouldFocus){
      if(inPangu) $('scene-back').focus({preventScroll:true});
      else if(mode === 'workspace') $('open-test-pangu').focus({preventScroll:true});
      else $('enter-workspace').focus({preventScroll:true});
      }
    };
    if(crossing && !reducedMotion.matches) settleTimer = setTimeout(finish,900);
    else finish();
  }

  function navigate(target, replace=false){
    const hash = target === 'hero' ? '#hero' : target === 'workspace' ? '#cui-workspace' : '#cui-pangu';
    const depth = replace ? Number(history.state?.cuiTestDepth || 0) : Number(history.state?.cuiTestDepth || 0) + 1;
    history[replace ? 'replaceState' : 'pushState']({cuiTestMode:target,cuiTestDepth:depth},'',hash);
    render(target);
  }

  function goBack(fallback){
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
    if($('workspace-info')?.open) return;
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
  history.replaceState({cuiTestMode:startMode,cuiTestDepth:0},'',location.href);
  render(startMode,false);
})();
