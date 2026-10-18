/* Presentation only. R1 demand reducer and archive mappings remain unchanged. */
import {dimensions,fragments,explorationOrder,feedback} from './pangu-demand-model.mjs';
export function presentationFor(s){
 const current=s.phase==='evidence'?explorationOrder(s)[s.cursor]:s.selected;
 const foreground=s.phase!=='arrange';
 let message=feedback(s);
 if(s.phase==='arrange'){
  if(!s.selected)message='点一句需求，试着整理商户的想法。';
  else if(!s.assignments[s.selected])message='你会先考虑目的、画面，还是交付方式？';
  else message=`从${dimensions[s.assignments[s.selected]]}看“${fragments[s.selected].label}”。你的判断已保留，接下来与真实设计对照。`;
 }
 return {current,foreground,message:s.quiet?'':message,chapter:{arrange:'01 / 商户需求进入现场',evidence:'02 / 发现真实设计机制',result:'03 / 归档成果与我的工作'}[s.phase],pose:s.phase==='arrange'?(s.order.length?'organizing':'welcome'):s.phase==='evidence'?'pointing':'yielding'};
}
