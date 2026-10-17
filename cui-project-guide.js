/* Deterministic project guidance only. No model, navigation or camera ownership. */
(() => {
 'use strict';
 const workspace = document.getElementById('cui-test-workspace');
 const role = document.getElementById('agent-wrap');
 const bubble = role.querySelector('.bubble');
 const intro = workspace.querySelector('.test-workspace__intro');
 const originalIntro = intro.textContent;
 const mobile = matchMedia('(max-width:700px)');
 const messages = {
  'open-test-pangu': ['pangu','从字段选择出发，看看营销素材怎样生成。'],
  'test-noteguard': ['noteguard','让 AI 提建议，最后由人决定。'],
  'test-xhs': ['xhs','一起看内容策略背后的真实案例与证据。']
 };
 const entries = Object.keys(messages).map(id => document.getElementById(id));
 let mode = location.hash === '#cui-workspace' ? 'workspace' : location.hash === '#cui-pangu' ? 'pangu' : 'other';
 let hovered = null, focused = null;
 const returns={pangu:'字段到素材的过程，再换个项目看看？',noteguard:'AI 建议、人来决定。再看看其他实践？',xhs:'内容与业务证据，还可以换个角度探索。'};
 const visitKey='cui-project-visit-v1';
 let returnProject=null, panguVisited=false, panguArmed=false, keyboardIntent=false, generation=0;
 const readVisit=()=>{try{return JSON.parse(sessionStorage.getItem(visitKey));}catch{return null;}};
 const dropVisit=()=>{try{sessionStorage.removeItem(visitKey);}catch{}};
 function arm(project){
  if(project==='pangu'){panguArmed=true;panguVisited=false;return;}
  try{
   const token=crypto.randomUUID();
   history.replaceState({...history.state,cuiCompanionVisit:token},'',location.href);
   sessionStorage.setItem(visitKey,JSON.stringify({token,project,phase:'armed'}));
  }catch{dropVisit();} // Missing storage/identity means no return claim.
 }
 function acceptReturn(project){
  returnProject=project;hovered=focused=null;
  delete role.dataset.guideCommitted;
  role.dataset.returnCompanion=project;
  render();
 }
 function consumeReturn(source,persisted=false){
  const record=readVisit();
  const navigationType=performance.getEntriesByType('navigation')[0]?.type;
  if(!persisted && navigationType==='reload'){dropVisit();return;}
  if(mode!=='workspace' || !record) return;
  let sourceMatches=false;
  if(source){try{const from=new URL(source,location.href);sourceMatches=from.origin===location.origin && from.pathname===({noteguard:'/noteguard-case/',xhs:'/content-archive/'}[record.project]);}catch{}}
  if((sourceMatches && ['visited','returning'].includes(record.phase) || !source && record.phase==='returning') && ['noteguard','xhs'].includes(record.project) && typeof record.token==='string' && record.token===history.state?.cuiCompanionVisit){
   dropVisit();acceptReturn(record.project);
  }else dropVisit();
 }
 function takeOver(){returnProject=null;delete role.dataset.returnCompanion;}
 document.addEventListener('keydown',e=>{if(ready() && ['Tab','ArrowLeft','ArrowRight','Home','End'].includes(e.key)) {keyboardIntent=true;if(returnProject){takeOver();render();}}});
 const ready = () => mode === 'workspace' && !workspace.inert && document.body.dataset.transition !== 'running';
 function render(){
  const entry = hovered || focused;
  const selected = ready() && !returnProject && entry ? messages[entry.id] : null;
  const text = returnProject ? returns[returnProject] : selected ? selected[1] : '选一个项目，我陪你看看关键决策。';
  if(mode === 'workspace') bubble.textContent = text;
  intro.textContent = mobile.matches && mode === 'workspace' ? text : originalIntro;
  role.dataset.projectGuide = selected ? selected[0] : '';
  entries.forEach(button => button.toggleAttribute('data-cui-selected', !!selected && button === entry));
 }
 function clear(){takeOver();hovered = focused = null;keyboardIntent=false;delete role.dataset.guideCommitted;render();}
 entries.forEach(entry => {
  entry.addEventListener('pointerenter',e => {if(e.pointerType !== 'touch' && ready()){if(!returnProject){hovered=entry;render();}}});
  entry.addEventListener('pointermove',() => {if(ready()){takeOver();hovered=entry;render();}});
  entry.addEventListener('pointerleave',() => {hovered=null;render();});
  entry.addEventListener('pointercancel',() => {hovered=null;render();});
  entry.addEventListener('focus',() => {if(ready()){if(returnProject && !keyboardIntent) return;keyboardIntent=false;takeOver();focused=entry;render();}});
  entry.addEventListener('blur',() => {focused=null;render();});
  entry.addEventListener('pointerdown',() => {if(ready()){takeOver();hovered=entry;render();}}, {passive:true});
  // Capture observes confirmation before existing project listeners; never delays or cancels it.
  entry.addEventListener('click',() => {
   if(!ready()) return;
   takeOver();arm(messages[entry.id][0]);focused=entry;role.dataset.guideCommitted = 'true';render();
   role.dataset.projectGuide = ''; // release image transform before FLIP samples geometry
  },true);
 });
 document.addEventListener('cui:modechange',e => {
  const previous=mode;mode=e.detail.mode;clear();
  if(previous==='pangu' && mode==='workspace'){
   if(panguVisited) acceptReturn('pangu');
   panguVisited=panguArmed=false;
  }
  if(mode==='hero'){panguVisited=panguArmed=false;dropVisit();}
  const ticket=++generation;
  // The legacy controller writes its default bubble synchronously after this event.
  queueMicrotask(()=>{if(ticket===generation && mode==='workspace') render();});
 });
 document.addEventListener('cui:camera',e => {
  if(e.detail.phase === 'settled'){
   mode=e.detail.mode;
   if(mode==='pangu' && panguArmed) panguVisited=true;
   if(mode==='workspace'){
    delete role.dataset.guideCommitted;
    focused=!returnProject && entries.includes(document.activeElement) ? document.activeElement : null;
    render();
   }
  }
 });
 // Navigation/bfcache can retain :hover; never retain an old confirmation state.
 window.addEventListener('pageshow',e=>{
  clear();
  const source=window.navigation?.activation?.from?.url || (!e.persisted ? document.referrer : null);
  consumeReturn(source,e.persisted===true);
 });
 window.addEventListener('pagehide',()=>{clear();panguVisited=panguArmed=false;});
 document.addEventListener('visibilitychange',() => {if(document.hidden) clear();});
 mobile.addEventListener('change',render);
 render();
})();
