/* Interactive evidence-backed field, not a real Pangu API. Isolated integration. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const trigger=$('style-trigger'),menu=$('style-options'),choice=$('style-option');
  const value=$('style-value'),reset=$('reset'),next=$('to-evidence'),replay=$('replay');
  const guideTitle=$('guide-title'),guideText=$('guide-text'),status=$('result-message');
  const step=$('step-value'),fill=$('step-fill'),hint=$('field-hint');
  const modal=$('original-dialog'),openOriginal=$('open-original'),closeOriginal=$('close-original');
  const phrases={
    intro:['从一句模糊的需求开始。','打开中间的「画面风格」，看看产品怎样把“清爽”变成商户能选择的字段。','先完成中间的字段选择，再看这项设计判断。'],
    opened:['你看到的，是产品语言。','真实截图中这个字段的已知值是「清爽明亮」。演示只提供这一个已核实选项。','字段已展开；右侧海报仍是原来的归档结果。'],
    selected:['复杂能力，藏在简单选择之后。','商户不用先学写 Prompt，只需把“夏日清爽”落实成清晰、可选择的字段。','“夏日清爽” →「画面风格：清爽明亮」。'],
    evidence:['需求变成字段，再看真实证据。','右侧是原始归档海报；这不是刚才点击后实时生成的结果。','设计判断：把模糊语言转成明确字段，降低表达门槛。']
  };
  let selected=false,opener=null;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function phase(name){
    document.body.dataset.phase=name;
    const [title,copy,result]=phrases[name];
    guideTitle.textContent=title;guideText.textContent=copy;status.textContent=result;
    const n=name==='intro'||name==='opened'?1:name==='selected'?2:3;
    step.textContent=String(n).padStart(2,'0');fill.style.width=n/3*100+'%';
    hint.textContent=name==='intro'?'✳ 点开绿色描边字段，体验真实网页选择。':name==='opened'?'↳ 已打开字段：请选唯一核实的原图值。':name==='selected'?'✓ 清爽明亮已选；可以撤销，也可查看归档证据。':'✓ 已查看归档证据；本页没有调用生图模型。';
  }
  function closeMenu(restore=false){menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus({preventScroll:true});}
  function openMenu(){menu.hidden=false;trigger.setAttribute('aria-expanded','true');if(!selected)phase('opened');choice.focus({preventScroll:true});}
  trigger.addEventListener('click',()=>menu.hidden?openMenu():closeMenu());
  trigger.addEventListener('keydown',e=>{
    if((e.key==='ArrowDown'||e.key==='Enter'||e.key===' ')&&menu.hidden){e.preventDefault();openMenu()}
    if(e.key==='Escape'&&!menu.hidden){e.preventDefault();closeMenu(true)}
  });
  choice.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closeMenu(true)}
    if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();choice.focus()}
  });
  choice.addEventListener('click',()=>{
    selected=true;value.textContent='清爽明亮';choice.setAttribute('aria-selected','true');
    reset.disabled=false;next.disabled=false;closeMenu(true);phase('selected');
  });
  reset.addEventListener('click',()=>{
    selected=false;value.textContent='点击选择风格';choice.setAttribute('aria-selected','false');
    reset.disabled=true;next.disabled=true;closeMenu();phase('intro');trigger.focus({preventScroll:true});
  });
  next.addEventListener('click',()=>{
    if(!selected)return;
    phase('evidence');
    $('poster-shell').scrollIntoView({block:matchMedia('(max-width:600px)').matches?'start':'nearest',behavior:reduced()?'instant':'smooth'});
  });
  replay.addEventListener('click',()=>{
    reset.click();
    $('style-field').scrollIntoView({block:'center',behavior:'instant'});
  });
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.selector')&&!menu.hidden)closeMenu()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();closeMenu(true)}});
  openOriginal.addEventListener('click',()=>{opener=document.activeElement;modal.showModal();closeOriginal.focus()});
  closeOriginal.addEventListener('click',()=>modal.close());
  modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
  modal.addEventListener('close',()=>opener?.focus({preventScroll:true}));
  phase('intro');
})();