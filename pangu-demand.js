import {presentationFor} from './pangu-demand-view.mjs';
import {dimensions,fragments,createDemand,reduceDemand,explorationOrder,feedback} from './pangu-demand-model.mjs';
const $=id=>document.getElementById(id),scene=$('pangu-scene'),root=$('pangu-demand'),role=$('agent-wrap');
let state=createDemand();
let manualStage=null;
const camera=(stage,area)=>document.dispatchEvent(new CustomEvent('cui:pangu-evidence',{detail:{stage,area}}));
function render(move=true){
 scene.dataset.demandPhase=state.phase;
 const view=presentationFor(state),current=view.current;
 $('demand-chapter').textContent=view.chapter;
 scene.dataset.cuiPose=view.pose;
 const evidence=scene.querySelector('.pangu-r1-window');
 evidence.inert=!view.foreground;evidence.setAttribute('aria-hidden',String(!view.foreground));
 $('pangu-evidence-nav').hidden=!view.foreground;
 $('demand-revisit').hidden=state.phase!=='result'&&manualStage===null;$('demand-back').hidden=state.phase!=='result';
 if(state.phase==='arrange')$('pangu-evidence-nav').open=false;
 scene.dataset.demandFocus=current||'intro';
 role.dataset.demandFocus=current||'intro';
 root.querySelectorAll('[data-fragment]').forEach(b=>{
  const assigned=state.assignments[b.dataset.fragment];
  b.setAttribute('aria-pressed',String(state.selected===b.dataset.fragment));
  b.dataset.assigned=assigned||'';
  b.setAttribute('aria-label',fragments[b.dataset.fragment].label+(assigned?'，我的判断：'+dimensions[assigned]:''));
 });
 $('demand-choices').hidden=!(state.selected&&state.phase==='arrange');
 $('demand-choice-label').textContent=state.selected?`“${fragments[state.selected].label}” · 你的视角`:'';
 root.querySelectorAll('[data-dimension]').forEach(b=>b.setAttribute('aria-pressed',String(state.assignments[state.selected]===b.dataset.dimension)));
 const list=$('demand-structure-list');list.replaceChildren();
 state.order.forEach(id=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.dataset.editFragment=id;b.textContent=fragments[id].label+' → '+dimensions[state.assignments[id]];b.setAttribute('aria-label','修改 '+b.textContent);li.append(b);list.append(li);});
 $('demand-empty').hidden=!!state.order.length;
 $('demand-undo').disabled=!state.history.length;$('demand-clear').disabled=!state.order.length;
 $('demand-evidence').disabled=!state.order.length;$('demand-evidence').hidden=state.phase!=='arrange';
 $('demand-result').hidden=state.phase!=='evidence';
 $('demand-next-project').hidden=state.phase!=='result';
 $('demand-trail').hidden=state.phase!=='evidence'||manualStage!==null;
 $('demand-feedback').textContent=state.quiet?'':manualStage===null?view.message:['这是完整归档工作台，可以放大查看。','六个主要选择行之外，还有图片比例与生成数量。','这是归档海报，不是现场生成。','这是另一张归档素材页，仅展示可见管理入口。'][manualStage];
 $('demand-feedback').hidden=state.quiet;
 $('demand-quiet').textContent=state.quiet?'开启引导':'收起引导';$('demand-quiet').setAttribute('aria-pressed',String(state.quiet));
 $('demand-quiet').setAttribute('aria-label',state.quiet?'开启 CUI 引导':'关闭 CUI 引导');
 if(state.phase==='evidence'){
  const f=fragments[current];
  $('demand-map').textContent=`${f.label} → ${f.fields} · ${f.values}`;
  $('demand-next').textContent='再看：'+fragments[explorationOrder(state)[(state.cursor+1)%3]].label+' ↗';
 }
 if(move){
  if(state.phase==='result')camera(2);
  else if(state.phase==='evidence')camera(1,fragments[current].area);
  // A judgment changes the visible demand structure, not the archived product behind it.
  else camera(0);
  if(state.phase==='evidence'){
   const f=fragments[current];
   $('pangu-evidence-caption').textContent='归档字段对照 · '+f.fields+'：'+f.values;
  }
 }

}
function send(action,move=true){manualStage=null;state=reduceDemand(state,action);render(move);}
root.addEventListener('click',e=>{
 const fragment=e.target.closest('[data-fragment],[data-edit-fragment]');
 if(fragment){send({type:'select',id:fragment.dataset.fragment||fragment.dataset.editFragment});root.querySelector('[data-dimension]').focus({preventScroll:true});return;}
 const dimension=e.target.closest('[data-dimension]');
 if(dimension){send({type:'assign',dimension:dimension.dataset.dimension});return;}
 if(e.target.closest('#demand-back')){$('scene-back').click();return;}
 const actions={'demand-undo':'undo','demand-clear':'clear','demand-skip':'skip','demand-quiet':'quiet','demand-evidence':'evidence','demand-next':'next','demand-edit':'edit','demand-result':'result','demand-revisit':'edit'};
 const type=actions[e.target.closest('button')?.id];if(!type)return;
 send({type},type!=='quiet');
 // Move focus only when its initiating control disappears; no automatic navigation.
 if(type==='evidence'||type==='skip'){
  $('demand-edit').focus({preventScroll:true});
  if(matchMedia('(max-width:700px)').matches)scene.querySelector('.pangu-r1-window').scrollIntoView({block:'start',behavior:'instant'});
 }
 if(type==='result'){
  $('pangu-source-open').focus({preventScroll:true});
  if(matchMedia('(max-width:700px)').matches)scene.querySelector('.pangu-r1-window').scrollIntoView({block:'start',behavior:'instant'});
 }
 if(type==='edit')root.querySelector('[data-dimension]').focus({preventScroll:true});
 if(type==='clear')root.querySelector('[data-fragment]').focus({preventScroll:true});
});
// Existing evidence shortcuts remain available, without modifying the visitor's interpretation.
scene.querySelectorAll('[data-pangu-stage]').forEach(b=>b.addEventListener('click',()=>{
 manualStage=Number(b.dataset.panguStage);state={...state,phase:manualStage>=2?'result':'evidence',cursor:0};render(false);
}));
document.addEventListener('cui:modechange',e=>{
 if(e.detail.mode==='pangu'){state=createDemand();render(false);}else delete role.dataset.demandFocus;
});
render(false);
