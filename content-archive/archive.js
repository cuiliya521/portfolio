/* R12 A: two real notes and an accessible image reader. No analysis simulation. */
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
  function showReader() {
    restoreFocus=document.activeElement;
    $('readerTitle').textContent=`CASE 0${current+1} · ${cases[current].file}`;
    setView(innerWidth<=760?'cover':'full');
    reader.showModal();
    document.body.style.overflow='hidden';
    $('closeReader').focus();
  }
  $('mainCoverButton').addEventListener('click',showReader);
  $('cuiGuide').addEventListener('click',showReader);
  $('nextCase').addEventListener('click',()=>{current=1-current;paint()});
  $('closeReader').addEventListener('click',()=>reader.close());
  reader.addEventListener('click',e=>{if(e.target===reader)reader.close()});
  reader.addEventListener('close',()=>{document.body.style.overflow='';restoreFocus?.focus({preventScroll:true})});
  tabs.forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
  $('zoomReader').addEventListener('click',()=>{
    const zoom=$('readerView').classList.toggle('zoom');
    $('zoomReader').setAttribute('aria-pressed',String(zoom));
    $('zoomReader').textContent=zoom?'还原 −':'放大 +';
    $('readerView').scrollTo(0,0);
  });
  // Native dialog handles Escape and traps focus. Outside the reader, Escape returns to Workspace.
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!reader.open){e.preventDefault();$('workspaceBack').click()}
  });
  $('workspaceBack').addEventListener('click',e=>{
    const ref=document.referrer?new URL(document.referrer):null;
    if(ref?.origin===location.origin && ref.pathname===new URL('../',location.href).pathname && history.length>1){e.preventDefault();history.back()}
  });
  paint();
})();
