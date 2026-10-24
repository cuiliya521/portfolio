/* Opt-in dynamic composition study. Original Pangu image and product controller remain authoritative.
   Enable using ?field-lab=1. No synthetic generation, products, metrics or character assets. */
(() => {
 'use strict';
 if(new URLSearchParams(location.search).get('field-lab')!=='1') return;
 const $=id=>document.getElementById(id);
 const scene=$('pangu-scene'),figure=scene?.querySelector('.pangu-r1-window');
 const viewport=$('pangu-original-open'),img=$('pangu-r1-product');
 if(!scene||!figure||!viewport||!img) return;
 document.body.dataset.productLab='active';
 scene.dataset.fieldLab='ready';
 const mobile=matchMedia('(max-width:700px)');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const intro=scene.querySelector('.pangu-r1-aside');
 const cue=document.createElement('section');
 cue.className='field-lab-cue';cue.setAttribute('aria-live','polite');
 cue.innerHTML='<span class="field-lab-eyebrow">CUI · PRODUCT EXPLORATION</span><p id="field-lab-message">先别读说明。直接在真实工作台里找到「画面风格」这一行。</p><div class="field-lab-boundary">取自归档界面 · 此处不调用模型生成新图片</div><button class="field-lab-mobile" id="field-lab-mobile" type="button">探索真实字段 · 清爽明亮 →</button>';
 intro.append(cue);
 const overlay=document.createElement('div');overlay.className='field-lab-overlay';overlay.setAttribute('aria-hidden','true');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 1536 1024');svg.setAttribute('preserveAspectRatio','none');
 const maskID='field-lab-proof-mask';
 svg.innerHTML='<defs><mask id="'+maskID+'"><rect width="1536" height="1024" fill="white"/><rect x="398" y="348" width="433" height="62" rx="9" fill="black"/><rect x="949" y="138" width="474" height="700" rx="12" fill="black"/></mask></defs><rect class="field-lab-shade" width="1536" height="1024" fill="#f3f3df" opacity=".43" mask="url(#'+maskID+')"/><rect x="398" y="348" width="433" height="62" rx="9" fill="none" stroke="#b69a53" stroke-width="6"/><path d="M 832 378 C 915 374, 895 303, 950 303" fill="none" stroke="#b69a53" stroke-width="5" stroke-linecap="round" stroke-dasharray="7 10"/><rect x="949" y="138" width="474" height="700" rx="12" fill="none" stroke="#b69a53" stroke-width="5"/>';
 overlay.append(svg);
 const hotspot=document.createElement('button');
 hotspot.className='field-lab-hotspot';hotspot.type='button';
 hotspot.setAttribute('aria-label','探索真实产品字段：画面风格，清爽明亮');hotspot.title='点击真实的「画面风格」字段';
 const toolbar=document.createElement('div');toolbar.className='field-lab-controls';
 toolbar.innerHTML='<strong id="field-lab-status" role="status">真实工作台 · 可直接探索画面风格</strong><div class="field-lab-actions"><button id="field-lab-reset" type="button" hidden>重看全貌</button><button class="primary" id="field-lab-next" type="button" hidden>看归档海报 →</button></div>';
 figure.insertBefore(overlay,viewport.nextSibling);
 figure.insertBefore(hotspot,overlay.nextSibling);
 figure.insertBefore(toolbar,figure.querySelector('figcaption')?.nextSibling||null);
 const status=$('field-lab-status'),message=$('field-lab-message'),reset=$('field-lab-reset'),next=$('field-lab-next'),touch=$('field-lab-mobile');
 const labCamera=(stage,area)=>document.dispatchEvent(new CustomEvent('cui:pangu-evidence',{detail:{stage,area}}));
 let mode='ready',token=0;
 const texts={
  ready:['先别读说明。直接在真实工作台里找到「画面风格」这一行。','真实工作台 · 可直接探索画面风格'],
  focused:['这一行把模糊的“夏日清爽”转成可选字段「清爽明亮」。请看原界面，不是我重新绘制的输入框。','已聚焦：画面风格 → 清爽明亮'],
  result:['右侧是归档青提柠檬海报。它证明界面包含预览结果，不代表刚才的点击重新生成了图片。','归档海报 · 非实时生成']
 };
 function position(){
  if(!scene.classList.contains('open')||mobile.matches||mode==='result')return;
  const figureRect=figure.getBoundingClientRect(),view=viewport.getBoundingClientRect(),image=img.getBoundingClientRect();
  if(image.width<100||image.height<100||figureRect.width<100)return;
  overlay.style.left=(view.left-figureRect.left)+'px';
  overlay.style.top=(view.top-figureRect.top)+'px';
  overlay.style.width=view.width+'px';overlay.style.height=view.height+'px';
  svg.style.left=(image.left-view.left)+'px';svg.style.top=(image.top-view.top)+'px';
  svg.style.width=image.width+'px';svg.style.height=image.height+'px';
  svg.style.opacity=mode==='focused'?'1':'0';
  const x=image.left-figureRect.left+(398/1536)*image.width;
  const y=image.top-figureRect.top+(348/1024)*image.height;
  Object.assign(hotspot.style,{left:x+'px',top:y+'px',width:(433/1536*image.width)+'px',height:(62/1024*image.height)+'px'});
 }
 function positionAfterTransition(){
  let start=performance.now();
  function raf(){position();if(performance.now()-start<850 && scene.classList.contains('open'))requestAnimationFrame(raf)}
  requestAnimationFrame(raf);
 }
 function setMode(nextMode){
  if(!['ready','focused','result'].includes(nextMode))return;
  mode=nextMode;scene.dataset.fieldLab=mode;
  const [copy,label]=texts[mode];message.textContent=copy;status.textContent=label;
  reset.hidden=mode==='ready';next.hidden=mode==='result';next.textContent=mode==='ready'?'先探索字段 →':'看归档海报 →';
  if(mobile.matches)touch.textContent=mode==='ready'?'探索真实字段 · 清爽明亮 →':mode==='focused'?'字段已聚焦 · 清爽明亮': '返回画面风格 →';
  hotspot.setAttribute('aria-pressed',String(mode==='focused'));
  if(mode==='focused'){
   if(mobile.matches)labCamera(1,[248,247,618,380]);
   else labCamera(0);
  }else if(mode==='result')labCamera(2);
  else labCamera(0);
  positionAfterTransition();
 }
 const focus=()=>{if(mode==='result')setMode('focused');else setMode('focused');};
 hotspot.addEventListener('click',e=>{e.stopPropagation();focus()});
 touch.addEventListener('click',()=>{if(mode==='result')setMode('focused');else focus();});
 reset.addEventListener('click',()=>setMode('ready'));
 next.addEventListener('click',()=>{if(mode==='ready')setMode('focused');else setMode('result')});
 // A later mission can override this lab without ever affecting default routes.
 function onEntry(){
   const turn=++token;
   mode='ready';scene.dataset.fieldLab='ready';
   // Resolve the existing demand model to its safe, read-only evidence phase.
   // Keeps its camera/exit/focus ownership intact; nothing is actually generated.
   setTimeout(()=>{
     if(turn!==token||!scene.classList.contains('open'))return;
     const skip=$('demand-skip');
     if(scene.dataset.demandPhase==='arrange'&&skip)skip.click();
     setMode('ready');
   },80);
 }
 document.addEventListener('cui:modechange',e=>{
  if(e.detail?.mode==='pangu')onEntry();
  else {token++;mode='ready';scene.dataset.fieldLab='ready';}
 });
 document.addEventListener('cui:pangu-camera',e=>{if(e.detail?.phase==='settled')positionAfterTransition()});
 mobile.addEventListener('change',()=>{if(scene.classList.contains('open'))setMode(mode);});
 if('ResizeObserver' in window) new ResizeObserver(()=>position()).observe(figure);
 window.addEventListener('resize',positionAfterTransition,{passive:true});
 if(scene.classList.contains('open'))onEntry();
})();
