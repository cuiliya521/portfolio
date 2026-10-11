/* R12: real notes, continuous reading and optional evidence-based CUI guidance. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cases = [
    {name:'最高留资笔记',short:'最高留资',cover:'yellow_cover_original_crop.png',text:'yellow_text_original_crop.png',full:'yellow_note_redacted.png',metric:'680+',desc:'单篇留资',type:'业务成果',key:'转化案例',file:'黄色笔记'},
    {name:'绿色带狗·最高曝光笔记',short:'最高曝光',cover:'green_cover_original_crop.png',text:'green_text_original_crop.png',full:'green_note_redacted.png',metric:'最高曝光',desc:'高传播代表作',type:'内容表现',key:'传播案例',file:'绿色带狗笔记'}
  ];
  let current = 0, restoreFocus;
  const reader = $('reader');
  const tabs = [...document.querySelectorAll('.reader-tab')];
  const cui=document.querySelector('img.cui'),cuiHome=cui.parentElement,cuiSibling=cui.nextSibling;
  const analysisSteps=[...document.querySelectorAll('[data-step]')];
  const guidance=[
    {title:'谁需要这份辅导？',copy:'从封面看，笔记面向数理基础薄弱的学员，用「点对点定制」回应针对性辅导的需求。',boundary:'依据笔记表达拆解，不代替用户调研结论。',view:'cover',evidence:'看真实封面 ↗'},
    {title:'把服务说具体。',copy:'封面突出「点对点定制」「66元/课时」；正文再补充教学方式，让访客继续了解服务。',boundary:'原始表达保留在截图中，没有改写或补造承诺。',view:'text',evidence:'看真实正文与互动 ↗'},
    {title:'回到这篇笔记的成果。',copy:'A 态中的 680+，对应的就是当前这篇黄色笔记。它是单篇留资成果，不是截图中的点赞或评论数。',boundary:'采用已确认的业务口径；不能仅凭这张截图认定某句文案带来了留资。',view:'full',evidence:'回看这篇完整笔记 ↗'}
  ];
  let analysisStep=0;
  function selectAnalysis(step){
    analysisStep=step;const a=guidance[step];
    $('analysisCount').textContent=`0${step+1} / 03`;
    $('analysisTitle').textContent=a.title;$('analysisCopy').textContent=a.copy;
    $('analysisBoundary').textContent=a.boundary;
    $('analysisResult').hidden=step!==2;
    $('analysisEvidence').textContent=a.evidence;
    $('analysisNext').textContent=step===2?'完成 · 继续阅读':'下一步 →';
    analysisSteps.forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.step)===step)));
  }
  function endAnalysis(restore=false){
    $('noteAnalysis').hidden=true;$('readerBox').classList.remove('guide-active');
    $('startAnalysis').setAttribute('aria-expanded','false');
    cuiHome.insertBefore(cui,cuiSibling);cui.classList.remove('reader-cui');
    if(restore)$('startAnalysis').focus({preventScroll:true});
  }
  function startAnalysis(){
    if(phase!=='open'||current!==0)return;
    if(!$('noteAnalysis').hidden){endAnalysis(true);return;}
    selectAnalysis(0);$('noteAnalysis').hidden=false;
    $('readerBox').classList.add('guide-active');
    $('startAnalysis').setAttribute('aria-expanded','true');
    $('analysisCharacter').append(cui);cui.classList.add('reader-cui');
    analysisSteps[0].focus({preventScroll:true});
  }
  function paint() {
    const a=cases[current], b=cases[1-current], n=current+1, j=2-current;
    $('mainCover').src='assets/'+a.cover;
    $('mainCover').alt=a.name+'真实封面';
    $('mainCoverButton').setAttribute('aria-label','打开'+a.file+'的完整真实截图');
    $('nextCover').src='assets/'+b.cover;
    $('nextCover').alt=b.file+'真实封面';
    $('nextCase').setAttribute('aria-label','切换到'+b.name);
    $('nextKicker').textContent=`0${j} / 下一份档案`;
    $('nextLabel').replaceChildren(document.createTextNode(b.file),document.createElement('br'),document.createTextNode(b.short));
    $('caseKicker').textContent=`CASE 0${n} / ${a.key}`;
    document.querySelector('.cover-folio').textContent=`CUI / ARCHIVE 0${n}`;
    $('ribbon').textContent=`0${n} · ${a.short}`;
    $('metric').textContent=a.metric;
    $('metric').classList.toggle('is-green',current===1);
    $('metricLabel').textContent=a.desc;
    $('resultKicker').textContent=`0${n} / ${a.type}`;
  }
  function setView(view) {
    const a=cases[current];
    $('readerView').classList.remove('zoom');
    $('zoomReader').setAttribute('aria-pressed','false');
    $('zoomReader').textContent='放大 +';
    $('readerImage').src='assets/'+a[view];
    $('readerImage').alt=a.name+' '+({cover:'封面',text:'正文与互动',full:'完整原图'}[view])+'真实截图（账号脱敏）';
    $('readerView').scrollTo(0,0);
    tabs.forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.view===view)));
  }
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let phase='closed', flightAnimation, closeRequested=false;
  let activeView='full';
  const decoded=new Map();
  function decode(src){
    if(!decoded.has(src)){
      const image=new Image();image.src=src;
      decoded.set(src,image.decode().then(()=>image));
    }
    return decoded.get(src);
  }
  cases.forEach(a=>decode('assets/'+a.full).catch(()=>{}));
  function coverGeometry(){
    const image=$('mainCover'),rect=image.getBoundingClientRect();
    const scale=Math.min(image.clientWidth/image.naturalWidth,image.clientHeight/image.naturalHeight);
    const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
    const matrix=new DOMMatrix(getComputedStyle($('mainCoverButton')).transform);
    return {left:rect.x+(rect.width-width)/2,top:rect.y+(rect.height-height)/2,width,height,angle:Math.atan2(matrix.b,matrix.a)*180/Math.PI};
  }
  function frame(rect,angle=0){return {left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',transform:`rotate(${angle}deg)`};}
  async function fly(from,to,reverse=false){
    if(reducedMotion.matches)return;
    const flight=document.createElement('div');flight.className='archive-flight';
    const image=new Image();image.src='assets/'+cases[current].full;image.alt='';
    flight.append(image);reader.append(flight);
    Object.assign(flight.style,frame(from,from.angle||0));
    $('mainCover').style.visibility='hidden';
    $('readerImage').style.visibility='hidden';
    reader.dataset.motion=reverse?'closing':'opening';
    const timing={duration:620,easing:'cubic-bezier(.22,.8,.22,1)',fill:'both'};
    flightAnimation=flight.animate([frame(from,from.angle||0),frame(to,to.angle||0)],timing);
    const surface=reader.animate([{backgroundColor:reverse?'rgba(12,34,28,.89)':'rgba(12,34,28,0)',backdropFilter:reverse?'blur(14px)':'blur(0px)'},{backgroundColor:reverse?'rgba(12,34,28,0)':'rgba(12,34,28,.89)',backdropFilter:reverse?'blur(0px)':'blur(14px)'}],timing);
    const chrome=reader.querySelectorAll('.reader-head,.reader-tabs,.reader-footer');
    const chromeAnimations=[...chrome].map(el=>el.animate([{opacity:reverse?1:0},{opacity:reverse?0:1}],{duration:reverse?240:360,delay:reverse?0:200,fill:'both'}));
    try{await flightAnimation.finished;}finally{
      flight.remove();flightAnimation=null;surface.cancel();chromeAnimations.forEach(a=>a.cancel());
      $('readerImage').style.visibility='';delete reader.dataset.motion;
    }
  }
  async function showReader(){
    if(phase!=='closed')return;
    phase='preparing';closeRequested=false;
    restoreFocus=document.activeElement;
    const initial=coverGeometry();
    try{await decode('assets/'+cases[current].full);}catch{phase='closed';return;}
    $('readerTitle').textContent=`CASE 0${current+1} · ${cases[current].file}`;
    endAnalysis();$('startAnalysis').hidden=current!==0;
    activeView=innerWidth<=760?'cover':'full';setView(activeView);
    await $('readerImage').decode();
    reader.showModal();document.body.style.overflow='hidden';
    $('closeReader').focus({preventScroll:true});
    phase='opening';
    $('mainCover').style.visibility='hidden';
    const target=$('readerImage').getBoundingClientRect();
    await fly(initial,target);
    phase='open';
    if(closeRequested)hideReader();
  }
  async function hideReader(){
    if(phase==='opening'){closeRequested=true;flightAnimation?.finish();return;}
    if(phase!=='open')return;
    phase='closing';
    // Return from any reading tab or zoom through the complete archive surface.
    activeView=innerWidth<=760?'cover':'full';
    setView(activeView);await $('readerImage').decode();
    const start=$('readerImage').getBoundingClientRect(),target=coverGeometry();
    endAnalysis();
    await fly(start,target,true);
    reader.close();$('mainCover').style.visibility='';phase='closed';
  }
  $('mainCoverButton').addEventListener('click',showReader);
  $('startAnalysis').addEventListener('click',startAnalysis);
  analysisSteps.forEach(el=>el.addEventListener('click',()=>{if(phase==='open')selectAnalysis(Number(el.dataset.step))}));
  $('analysisEvidence').addEventListener('click',()=>{if(phase==='open'){activeView=guidance[analysisStep].view;setView(activeView)}});
  $('analysisNext').addEventListener('click',()=>{if(phase==='open'){if(analysisStep===2)endAnalysis(true);else selectAnalysis(analysisStep+1)}});
  $('skipAnalysis').addEventListener('click',()=>endAnalysis(true));
  $('cuiGuide').addEventListener('click',showReader);
  $('nextCase').addEventListener('click',()=>{current=1-current;paint()});
  $('closeReader').addEventListener('click',hideReader);
  reader.addEventListener('cancel',e=>{e.preventDefault();hideReader()});
  reader.addEventListener('click',e=>{if(e.target===reader)hideReader()});
  reader.addEventListener('close',()=>{endAnalysis();document.body.style.overflow='';$('mainCover').style.visibility='';phase='closed';restoreFocus?.focus({preventScroll:true})});
  window.addEventListener('resize',()=>flightAnimation?.finish());
  tabs.forEach(el=>el.addEventListener('click',()=>{if(phase==='open'){activeView=el.dataset.view;setView(activeView)}}));
  $('zoomReader').addEventListener('click',()=>{
    if(phase!=='open')return;
    const zoom=$('readerView').classList.toggle('zoom');
    $('zoomReader').setAttribute('aria-pressed',String(zoom));
    $('zoomReader').textContent=zoom?'还原 −':'放大 +';
    $('readerView').scrollTo(0,0);
  });
  // Native dialog handles Escape and traps focus. Outside the reader, Escape returns to Workspace.
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!reader.open){
      if(phase==='closed'){e.preventDefault();$('workspaceBack').click()}
      else if(phase==='preparing'){e.preventDefault();closeRequested=true}
    }
  });
  $('workspaceBack').addEventListener('click',e=>{
    const ref=document.referrer?new URL(document.referrer):null;
    if(ref?.origin===location.origin && ref.pathname===new URL('../',location.href).pathname && history.length>1){e.preventDefault();history.back()}
  });
  paint();
})();
