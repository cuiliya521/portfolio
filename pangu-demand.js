import {presentationFor} from './pangu-demand-view.mjs';
import {dimensions,fragments,createDemand,reduceDemand,explorationOrder,feedback} from './pangu-demand-model.mjs';
const $=id=>document.getElementById(id),scene=$('pangu-scene'),root=$('pangu-demand'),role=$('agent-wrap');
let state=createDemand();
let manualStage=null;
let active=false;
const camera=(stage,area)=>document.dispatchEvent(new CustomEvent('cui:pangu-evidence',{detail:{stage,area}}));
function render(move=true){
 if(!active)return;
 scene.dataset.demandPhase=state.phase;
 const view=presentationFor(state),current=view.current;
 $('demand-chapter').textContent=view.chapter;
 scene.dataset.cuiPose=view.pose;
 $('pangu-contribution').hidden=state.phase!=='result';
 const evidence=scene.querySelector('.pangu-r1-window');
 evidence.inert=false;evidence.setAttribute('aria-hidden','false');
 $('pangu-g0-contribution').hidden=state.phase==='result';
 $('demand-revisit').hidden=state.phase!=='result'&&manualStage===null;$('demand-back').hidden=state.phase!=='result';

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
  else if(state.phase==='evidence'||state.selected)camera(1,view.area);
  // A selection also points to its bounded real fields; the archive remains visible.
  else camera(0);
  if((state.phase==='evidence'||state.phase==='arrange')&&current){
   const f=fragments[current];
   $('pangu-evidence-caption').textContent='归档字段对照 · '+f.fields+'：'+f.values;
  }
 }

}
function send(action,move=true){
 manualStage=null;state=reduceDemand(state,action);render(move);
 if(['edit','clear'].includes(action.type)&&matchMedia('(max-width:700px)').matches)root.scrollIntoView({block:'start',behavior:'instant'});
}
scene.addEventListener('scroll',()=>{scene.dataset.demandScrolled=String(scene.scrollTop>32)},{passive:true});
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
 if(!active)return;manualStage=Number(b.dataset.panguStage);state={...state,phase:manualStage>=2?'result':'evidence',cursor:0};render(false);
}));
function closeDemand(reset=false){
 active=false;root.hidden=true;root.inert=true;delete scene.dataset.demandActive;delete scene.dataset.demandPhase;delete scene.dataset.cuiPose;delete role.dataset.demandFocus;
 $('pangu-explore-start').textContent='探索产品机制 →';$('pangu-explore-start').setAttribute('aria-expanded','false');
 $('pangu-contribution').hidden=true;$('pangu-g0-contribution').hidden=false;
 if(reset){state=createDemand();manualStage=null;}
}
$('pangu-explore-start').addEventListener('click',()=>{
 if(active){closeDemand();camera(0);return;}
 active=true;scene.dataset.demandActive='true';root.hidden=false;root.inert=false;
 $('pangu-explore-start').textContent='收起需求整理';$('pangu-explore-start').setAttribute('aria-expanded','true');render();root.querySelector('[data-fragment]').focus({preventScroll:true});
});
document.addEventListener('cui:modechange',e=>{closeDemand(true);if(e.detail.mode==='pangu')scene.scrollTop=0;});
