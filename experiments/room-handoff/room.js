/* Isolated native B1-derived field states; no backend, no image generation. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const trigger=$('trigger'),content=$('field-content'),radio=$('choice-input'),apply=$('apply'),undo=$('undo');
  const feedback=$('response'),status=$('global-status');
  const exit=()=>{if(window.parent!==window){window.parent.postMessage({type:'cui:room-exit',version:1},location.origin)}else{location.assign('../../?handoff=1#cui-workspace')}};
  let state='initial';
  function render(next){
    if(!['initial','expanded','selected','confirmed','returned'].includes(next))return;
    state=next;document.body.dataset.state=next;
    const expanded=next!=='returned'&&next!=='initial',picked=['selected','confirmed','returned'].includes(next);
    const applied=['confirmed','returned'].includes(next);
    content.hidden=!expanded;trigger.setAttribute('aria-expanded',String(expanded));radio.checked=picked;
    $('committed-value').textContent=applied?'清爽明亮':'待选择';
    $('trigger-action').textContent=expanded?'收起':applied?'修改':'展开';
    apply.disabled=!picked||applied;undo.disabled=!picked;
    $('draft-status').textContent=applied?'已确认':picked?'待确认':'请选择';
    feedback.textContent=next==='expanded'?'你打开了「画面风格」。商户说的“清爽”可以对应这个真实选项。':next==='selected'?'「清爽」对应「清爽明亮」。点击确认，把选择写回原字段。':next==='confirmed'?'已确认。现在可以收回字段，保留这个值。':'这个选择已写回原字段，你可以随时修改。';
    status.textContent=applied?'清爽明亮已写入画面风格。这是产品字段演示，而非实时生图。':'打开「画面风格」，体验一次设计判断。';
    $('completion-stamp').hidden=!applied;
  }
  trigger.addEventListener('click',()=>{
    if(state==='initial')render('expanded');
    else if(state==='returned')render('confirmed');
    else if(state==='confirmed')render('returned');
    else render('initial');
  });
  radio.addEventListener('change',()=>render('selected'));
  apply.addEventListener('click',()=>{if(state==='selected'){render('confirmed');trigger.focus({preventScroll:true})}});
  undo.addEventListener('click',()=>{render('expanded');radio.focus({preventScroll:true})});
  $('replay').addEventListener('click',()=>{render('initial');trigger.focus({preventScroll:true})});
  $('exit-room').addEventListener('click',exit);
  $('exit-bottom').addEventListener('click',exit);
  addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();exit()}});
  addEventListener('message',e=>{
    if(e.origin!==location.origin||e.source!==parent)return;
    if(e.data?.type==='cui:room-focus')trigger.focus({preventScroll:true});
    if(e.data?.type==='cui:room-reset'){render('initial')}
  });
  render('initial');
  try{parent.postMessage({type:'cui:room-ready',version:1},location.origin)}catch{}
})();