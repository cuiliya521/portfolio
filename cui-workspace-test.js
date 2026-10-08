/* Desktop state-machine test. The previous motion code remains intact in index.html (not executed in this branch). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const workspace = $('cui-test-workspace');
  const scene = $('pangu-scene');
  const homeSlot = $('main-ui-slot');
  const mainUI = $('pangu-main-ui');
  const mainImg = $('pangu-main-img');
  const focusFrame = $('focus-frame');
  const chapter = $('scene-chapter');
  const title = $('scene-title');
  const desc = $('scene-desc');
  const next = $('scene-next');
  const steps = [...document.querySelectorAll('.scene-step')];
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

  const copy = [
    ['01 / 结构化输入','把 Prompt 变成商户会选的字段。','把行业、场景、主题、风格、构图和规格拆成可选字段，降低商户使用门槛。','看实时预览 →','zoom-input'],
    ['02 / 实时预览','选择之后，马上看到结果。','保留输入上下文，让用户能够直接观察生成结果并判断是否需要调整。','看素材如何复用 →','zoom-preview'],
    ['03 / 素材沉淀与复用','生成不是终点，结果进入下一次工作。','已有素材可以筛选、收藏、下载和复用，使素材生产变成连续工作流。','回到结构化输入 ↺','zoom-assets']
  ];

  function setStep(n){
    step = Math.max(0, Math.min(2, n));
    const c = copy[step];
    steps.forEach((b,i) => {
      b.classList.toggle('active', i === step);
      b.setAttribute('aria-pressed', String(i === step));
    });
    mainImg.classList.remove('zoom-input','zoom-preview','zoom-assets');
    if(mode === 'pangu') mainImg.classList.add(c[4]);
    chapter.textContent = c[0];
    title.textContent = c[1];
    desc.textContent = c[2];
    next.textContent = c[3];
  }

  function mountUI(inScene){
    mainUI.classList.remove('migrating','in-scene','scene-ui-hidden');
    ['left','top','width','height','opacity','transform','transition'].forEach(k => mainUI.style[k] = '');
    mainImg.classList.remove('zoom-input','zoom-preview','zoom-assets');
    if(inScene){
      focusFrame.appendChild(mainUI);
      mainUI.classList.add('in-scene');
    } else {
      homeSlot.after(mainUI);
    }
  }

  function fromHash(){
    if(location.hash === '#cui-pangu') return 'pangu';
    if(location.hash === '#cui-workspace') return 'workspace';
    return 'hero';
  }

  function render(nextMode, shouldFocus=true){
    mode = nextMode;
    const inside = mode !== 'hero';
    const inPangu = mode === 'pangu';
    workspace.hidden = !inside;
    workspace.setAttribute('aria-hidden', String(!inside));
    workspace.inert = inPangu;
    document.body.classList.toggle('cui-test-active',inside);
    scene.classList.toggle('open',inPangu);
    scene.classList.remove('preparing');
    scene.setAttribute('aria-hidden',String(!inPangu));
    mountUI(inPangu);
    setStep(inPangu ? step : 0);
    if(shouldFocus){
      if(inPangu) $('scene-back').focus({preventScroll:true});
      else if(mode === 'workspace') $('open-test-pangu').focus({preventScroll:true});
      else $('enter-workspace').focus({preventScroll:true});
    }
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
  $('test-workspace-home').addEventListener('click',() => goBack('hero'));
  $('open-test-pangu').addEventListener('click',() => {
    step = 0;
    navigate('pangu');
  });
  $('scene-back').addEventListener('click',() => goBack('workspace'));
  next.addEventListener('click',() => setStep(step === 2 ? 0 : step + 1));
  steps.forEach(btn => btn.addEventListener('click',() => setStep(Number(btn.dataset.step))));

  for(const id of ['test-xhs','test-noteguard']){
    $(id).addEventListener('click',() => {
      status.textContent = id === 'test-xhs'
        ? '小红书项目入口已保留。本轮只测试盘古窗口，不虚构小红书界面。'
        : 'NoteGuard AI 项目入口已保留。本轮只测试盘古窗口，不虚构 NoteGuard 界面。';
    });
  }

  window.addEventListener('popstate',() => render(fromHash()));
  window.addEventListener('keydown',e => {
    if(e.key === 'Escape'){
      if(mode === 'pangu'){e.preventDefault();goBack('workspace')}
      else if(mode === 'workspace'){e.preventDefault();goBack('hero')}
    }
    if(mode === 'pangu' && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) setStep(step + 1);
    if(mode === 'pangu' && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) setStep(step - 1);
  });
  scene.addEventListener('wheel',e => {
    if(mode !== 'pangu' || wheelLock || Math.abs(e.deltaY) < 18) return;
    e.preventDefault();
    wheelLock = true;
    setStep(step + (e.deltaY > 0 ? 1 : -1));
    setTimeout(() => wheelLock = false, 450);
  },{passive:false});

  const startMode = fromHash();
  history.replaceState({cuiTestMode:startMode,cuiTestDepth:0},'',location.href);
  render(startMode,false);
})();
