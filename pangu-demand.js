import {summerResponse} from './pangu-summer-response.mjs';
import {presentationFor} from './pangu-demand-view.mjs';
import {dimensions,fragments,createDemand,reduceDemand,explorationOrder,feedback} from './pangu-demand-model.mjs';
const $=id=>document.getElementById(id),scene=$('pangu-scene'),root=$('pangu-demand'),role=$('agent-wrap');
let state=createDemand();
let manualStage=null;
let active=false;
let inputInstant=false,roleMotion=null,lastCameraKey='',roleTicket=0;
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
function cancelRole(){roleTicket++;roleMotion?.cancel();roleMotion=null;}
function settleRole(before,enabled){
 const ticket=++roleTicket;
 // Read the rendered position before cancelling, then retarget the same original role node.
 roleMotion?.cancel();roleMotion=null;
 if(!enabled||inputInstant||reduceMotion.matches||matchMedia('(max-width:700px)').matches)return;
 const after=role.getBoundingClientRect();
 const dx=before.left-after.left,dy=before.top-after.top;
 if(Math.abs(dx)+Math.abs(dy)<1)return;
 roleMotion=role.animate([{translate:`${dx}px ${dy}px`},{translate:'0px 0px'}],{duration:240,easing:'cubic-bezier(.22,.7,.2,1)'});
 roleMotion.finished.catch(()=>{}).then(()=>{if(ticket===roleTicket)roleMotion=null;});
}
reduceMotion.addEventListener('change',cancelRole);
window.addEventListener('pagehide',cancelRole);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelRole();});
document.getElementById('pangu-original-viewer').addEventListener('close',cancelRole);
$('pangu-original-open').addEventListener('click',cancelRole);
$('pangu-source-open').addEventListener('click',cancelRole);
const camera=(stage,area,summer=null)=>{
 const detail={stage,area,frame:stage===1?[245,80,1273,815]:undefined};
 if(summer){detail.frame=matchMedia('(max-width:700px)').matches?summer.mobileFrame:summer.frame;detail.keepMobileFrame=true;detail.duration=inputInstant?0:240;}
 else if(inputInstant)detail.duration=0;
 const key=JSON.stringify(detail);
 if(key===lastCameraKey)return;
 lastCameraKey=key;document.dispatchEvent(new CustomEvent('cui:pangu-evidence',{detail}));
};
function render(move=true){
 if(!active)return;
 const beforeRole=role.getBoundingClientRect(),summer=summerResponse(state);
 if(summer)scene.dataset.summerResponse=summer.mode;else delete scene.dataset.summerResponse;
 scene.dataset.demandPhase=state.phase;
 const view=presentationFor(state),current=view.current;
 $('demand-chapter').textContent={arrange:'整理商户需求',evidence:'对照真实字段',result:'查看归档结果'}[state.phase];
 root.dataset.hasAssignments=String(state.order.length>0);
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
 if(state.phase==='arrange'&&!state.quiet)$('demand-feedback').textContent=!state.selected?'点一条需求，从你的判断开始。':state.assignments[state.selected]?`已记下：${dimensions[state.assignments[state.selected]]}。还可以修改。`:'这条需求，你会先从哪个角度整理？';
 if(summer&&!state.quiet)$('demand-feedback').textContent=summer.message;
 $('demand-feedback').hidden=state.quiet;
 $('demand-quiet').textContent=state.quiet?'开启引导':'收起引导';$('demand-quiet').setAttribute('aria-pressed',String(state.quiet));
 $('demand-quiet').setAttribute('aria-label',state.quiet?'开启 CUI 引导':'关闭 CUI 引导');
 if(state.phase==='evidence'){
  const f=fragments[current];
  $('demand-map').textContent=summer?summer.mapping:`${f.label} → ${f.fields}`;
  $('demand-next').textContent='再看：'+fragments[explorationOrder(state)[(state.cursor+1)%3]].label+' ↗';
 }
 if(move){
  if(state.phase==='result')camera(2);
  else if(summer&&!summer.discovering)camera(0);
  else if(state.phase==='evidence'||state.selected)camera(1,view.area,summer);
  // A selection also points to its bounded real fields; the archive remains visible.
  else camera(0);
  if(state.phase==='arrange'&&!current)$('pangu-evidence-caption').textContent='真实产品全貌：选择字段、查看结果与素材入口。';
  if((state.phase==='evidence'||state.phase==='arrange')&&current){
   const f=fragments[current];
   $('pangu-evidence-caption').textContent=summer?summer.caption:'归档字段对照 · '+f.fields;
  }
 }

 if(summer){const bottom=root.getBoundingClientRect().bottom;role.style.setProperty('--summer-rest-y',Math.min(scene.clientHeight-243,Math.max(bottom+18,scene.clientHeight*.61))+'px');}
 settleRole(beforeRole,!!summer);
}
function send(action,move=true){
 manualStage=null;const next=reduceDemand(state,action);if(next===state)return;state=next;render(move);
 if(['edit','clear'].includes(action.type)&&matchMedia('(max-width:700px)').matches)root.scrollIntoView({block:'start',behavior:'instant'});
}
scene.addEventListener('scroll',()=>{scene.dataset.demandScrolled=String(scene.scrollTop>32)},{passive:true});
root.addEventListener('click',e=>{
 inputInstant=e.detail===0;
 const fragment=e.target.closest('[data-fragment],[data-edit-fragment]');
 if(fragment){const id=fragment.dataset.fragment||fragment.dataset.editFragment;if(id===state.selected&&state.phase==='arrange')return;send({type:'select',id});if(inputInstant)root.querySelector('[data-dimension]').focus({preventScroll:true});return;}
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
 cancelRole();lastCameraKey='';delete scene.dataset.summerResponse;
 active=false;root.hidden=true;root.inert=true;delete scene.dataset.demandActive;delete scene.dataset.demandPhase;delete scene.dataset.cuiPose;delete role.dataset.demandFocus;
 $('pangu-explore-start').textContent='探索产品机制 →';$('pangu-explore-start').setAttribute('aria-expanded','false');
 $('pangu-contribution').hidden=true;$('pangu-g0-contribution').hidden=false;
 if(reset){state=createDemand();manualStage=null;}
}
$('pangu-explore-start').addEventListener('click',e=>{
 inputInstant=e.detail===0;
 if(active){closeDemand();camera(0);return;}
 active=true;scene.dataset.demandActive='true';root.hidden=false;root.inert=false;
 $('pangu-explore-start').textContent='收起需求整理';$('pangu-explore-start').setAttribute('aria-expanded','true');render();root.querySelector('[data-fragment]').focus({preventScroll:true});
});
document.addEventListener('cui:modechange',e=>{closeDemand(true);if(e.detail.mode==='pangu')scene.scrollTop=0;});

document.addEventListener('cui:pangu-before-exit',()=>{cancelRole();lastCameraKey='';delete scene.dataset.summerResponse;});
window.addEventListener('resize',()=>{cancelRole();lastCameraKey='';});
