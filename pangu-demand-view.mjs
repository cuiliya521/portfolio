/* Presentation only. R1 demand reducer and archive mappings remain unchanged. */
import {dimensions,fragments,explorationOrder,feedback} from './pangu-demand-model.mjs';
// Natural-image coordinates; business includes the complete source title.
export const evidenceAreas={product:[245,80,610,280],style:[245,340,610,140],format:[245,480,610,410]};
export function presentationFor(s){
 const current=s.phase==='evidence'?explorationOrder(s)[s.cursor]:s.selected;
 const foreground=s.phase!=='arrange';
 let message=feedback(s);
 if(s.phase==='arrange'){
  if(!s.selected)message='先点带下划线的需求，再选你的整理角度。';
  else if(!s.assignments[s.selected])message='你会先考虑目的、画面，还是交付方式？';
  else message=`从${dimensions[s.assignments[s.selected]]}看“${fragments[s.selected].label}”。你的判断已保留，接下来与真实设计对照。`;
 }
 return {current,area:evidenceAreas[current],foreground,message:s.quiet?'':message,chapter:{arrange:'01 / 商户需求进入现场',evidence:'02 / 发现真实设计机制',result:'03 / 归档成果与我的工作'}[s.phase],pose:s.phase==='arrange'?'welcome':s.phase==='evidence'?'pointing':'yielding'};
}
