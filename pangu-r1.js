/* R7: one evidence surface. Three continuous focuses, then a separate archived page. */
(() => {
  const viewer = document.getElementById('pangu-original-viewer');
  const scroll = viewer.querySelector('.pangu-original-scroll');
  const fit = document.getElementById('pangu-original-fit');
  let opener;
  const scene=document.getElementById('pangu-scene'),image=document.getElementById('pangu-r1-product'),viewport=document.getElementById('pangu-original-open');
  const focus=viewport.querySelector('.pangu-evidence-focus'),caption=document.getElementById('pangu-evidence-caption');
  const buttons=[...scene.querySelectorAll('[data-pangu-stage]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:700px)');
  const areas=[[0,0,1536,1024],[245,80,610,500],[880,80,650,815],[0,0,1536,1024]];
  const productSource=image.getAttribute('src'),materialsSource='assets/pangu-r1/materials-source.jpg';
  const materialImage=new Image();
  const materialsReady=new Promise(resolve=>{materialImage.onload=()=>resolve(true);materialImage.onerror=()=>resolve(false);});
  materialImage.src=materialsSource;
  const guide=document.getElementById('pangu-shot-guide');
  const guides=['先看整体，再靠近关键机制。','六个字段，把需求变成可选择的输入。','看清结果，再判断下载、收藏或复用。','这是另一张真实素材页，仅展示可见管理入口。'];
  const descriptions=['真实产品全貌：选择字段、查看结果与素材入口。','把写 Prompt，变成选字段。六个真实字段帮助商户表达需求。','归档案例结果：青提柠檬海报与可见操作入口；不是本次选择实时生成的结果。','独立归档页面 · 我的素材：分类、筛选、搜索与素材卡片。截图不等于已验证再次复用流程。'];
  let activeArea=null,activeFrame=null;
  let stage=0,animations=[],serial=0,pendingExit=null,settled=Promise.resolve();
  const rectFrames=r=>({left:r[0]+'px',top:r[1]+'px',width:r[2]+'px',height:r[3]+'px'});
  async function select(next,duration=mobile.matches?180:320,area=null,frame=null){
    if(!Number.isInteger(next)||next<0||next>3)return;
    const ticket=++serial;
    if(next===3 && !await materialsReady){
      if(ticket===serial)caption.textContent='素材原图加载失败，请稍后重试；当前保留上一镜头。';
      return;
    }
    if(ticket!==serial)return;
    const beforeClip=getComputedStyle(image).clipPath||image.style.clipPath||'inset(0% 0% 0% 0%)',before=getComputedStyle(image).transform,previous=focus.getBoundingClientRect(),viewBefore=viewport.getBoundingClientRect(),opacity=getComputedStyle(focus).opacity;
    const pageChanged=(stage===3)!==(next===3);
    animations.forEach(a=>a.cancel());animations=[];stage=next;activeArea=area;activeFrame=frame;viewport.dataset.cameraStage=String(next);scene.dataset.shot=String(next);
    image.src=next===3?materialsSource:productSource;
    image.alt=next===3?'独立归档的盘古「我的素材」页面：分类、筛选、搜索及三张素材卡片':'用户提供的盘古完整生成界面：六字段、实时预览及素材入口';
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===next)));caption.textContent=descriptions[next];guide.textContent=guides[next];
    // Keep the real input and preview columns together; focus can move independently.
    const framing=activeFrame||activeArea;
    viewport.style.height=next===1&&framing&&!mobile.matches?Math.min(viewport.clientWidth*framing[3]/framing[2],scene.clientHeight*.68,650)+'px':'';
    const w=viewport.clientWidth,h=viewport.clientHeight,base=w/1536;
    const [x,y,rw,rh]=activeFrame||activeArea||areas[next],scale=Math.min(w/rw,h/rh);
    const tx=(w-rw*scale)/2-x*scale,ty=(h-rh*scale)/2-y*scale;
    const [fx,fy,fw,fh]=activeArea||[x,y,rw,rh];
    const transform=`translate(${tx}px,${ty}px) scale(${scale/base})`,region=[tx+fx*scale,ty+fy*scale,fw*scale,fh*scale];
    image.style.transform=transform;
    // Crop only outside the measured evidence rectangle. No wash over source text.
    image.style.clipPath=(next===1||next===2)?`inset(${y/1024*100}% ${(1536-x-rw)/1536*100}% ${(1024-y-rh)/1024*100}% ${x/1536*100}%)`:'inset(0% 0% 0% 0%)';
    Object.assign(focus.style,rectFrames(region));focus.style.opacity=(next===1||next===2)?'1':'0';
    document.dispatchEvent(new CustomEvent('cui:pangu-camera',{detail:{phase:'started',stage:next,duration:reduced.matches?0:duration}}));
    if(reduced.matches||!duration){settled=Promise.resolve();document.dispatchEvent(new CustomEvent('cui:pangu-camera',{detail:{phase:'settled',stage:next}}));return settled;}
    const opts={duration,easing:'cubic-bezier(.22,.7,.2,1)'};
    if(Math.abs(viewBefore.height-h)>1)animations.push(viewport.animate([{height:viewBefore.height+'px'},{height:h+'px'}],opts));
    // A single decoded image node: no clone, no blank frame or fake continuous pan between pages.
    animations.push(image.animate(pageChanged?[{opacity:.72,transform},{opacity:1,transform}]:[{transform:before,clipPath:beforeClip},{transform,clipPath:image.style.clipPath}],opts));
    animations.push(focus.animate([{...rectFrames([previous.left-viewBefore.left,previous.top-viewBefore.top,previous.width,previous.height]),opacity},{...rectFrames(region),opacity:(next===1||next===2)?1:0}],opts));
    settled=Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(ticket!==serial)return;animations=[];document.dispatchEvent(new CustomEvent('cui:pangu-camera',{detail:{phase:'settled',stage:next}}));});return settled;
  }
  // R7.2 keeps camera ownership here; only bounded archived regions are accepted.
  document.addEventListener('cui:pangu-evidence',e=>{
    const d=e.detail||{},a=d.area,f=d.frame;
    if(d.duration!==undefined&&(!Number.isFinite(d.duration)||d.duration<0||d.duration>320))return;
    if(pendingExit)return;
    if(a&&(!Array.isArray(a)||a.length!==4||!a.every(Number.isFinite)||a[0]<0||a[1]<0||a[2]<=0||a[3]<=0||a[0]+a[2]>1536||a[1]+a[3]>1024))return;
    if(f&&(!Array.isArray(f)||f.length!==4||!f.every(Number.isFinite)||f[0]<0||f[1]<0||f[2]<=0||f[3]<=0||f[0]+f[2]>1536||f[1]+f[3]>1024))return;
    if(a&&f&&(a[0]<f[0]||a[1]<f[1]||a[0]+a[2]>f[0]+f[2]||a[1]+a[3]>f[1]+f[3]))return;
    select(d.stage,d.duration,a||null,mobile.matches&&!d.keepMobileFrame?null:f||null);
  });
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{if(!pendingExit)select(i)}));
  document.getElementById('pangu-explore-start').addEventListener('click',()=>{if(scene.hasAttribute('data-g1')||pendingExit)return;select(1);buttons[1].focus({preventScroll:true})});
  scene.querySelector('ol').addEventListener('keydown',e=>{if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();let i=buttons.indexOf(document.activeElement);if(i<0)i=stage;i=e.key==='Home'?0:e.key==='End'?3:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:3))%4;buttons[i].focus({preventScroll:true});if(!pendingExit)select(i)});
  document.addEventListener('cui:pangu-before-exit',e=>{
    if(!stage&&!pendingExit&&!animations.length)return;e.preventDefault();const already=!!pendingExit;pendingExit=e.detail.resume;
    if(already)return;document.getElementById('scene-back').focus({preventScroll:true});document.getElementById('pangu-explore-start').disabled=true;viewport.inert=true;buttons.forEach(b=>b.disabled=true);document.getElementById('pangu-source-open').disabled=true;document.body.dataset.panguExit='pending';select(0,mobile.matches?140:180).then(()=>{const resume=pendingExit;pendingExit=null;document.getElementById('pangu-explore-start').disabled=false;viewport.inert=false;buttons.forEach(b=>b.disabled=false);document.getElementById('pangu-source-open').disabled=false;document.body.dataset.panguExit='idle';resume?.()});
  });
  document.addEventListener('cui:modechange',e=>{if(e.detail.mode==='pangu')select(0,0)});
  reduced.addEventListener('change',()=>{if(reduced.matches)select(stage,0,activeArea,mobile.matches?null:activeFrame)});
  mobile.addEventListener('change',()=>select(stage,0,activeArea,mobile.matches?null:activeFrame));
  window.addEventListener('resize',()=>{if(scene.classList.contains('open')&&!pendingExit&&document.body.dataset.transition==='idle')select(stage,0,activeArea,mobile.matches?null:activeFrame)});
  const open = event => {
    opener = event.currentTarget;
    const original=viewer.querySelector('.pangu-original-scroll img');
    original.src=image.src;original.alt=image.alt;
    document.getElementById('pangu-original-title').textContent=stage===3?'盘古 · 我的素材原始截图':'盘古 · 生成工作台原始截图';
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
