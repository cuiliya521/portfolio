// Presentation-only experiment. Visitor judgments remain owned by the frozen reducer.
import {explorationOrder, dimensions} from './pangu-demand-model.mjs';
export function summerResponse(state){
 const id=state.phase==='evidence'?explorationOrder(state)[state.cursor]:state.selected;
 if(id!=='style'||state.phase==='result')return null;
 const choice=state.assignments.style;
 const discovering=state.phase==='evidence';
 return {
  mode:discovering?'discover':choice?'judged':'selected',
  discovering,
  message:discovering?(choice==='visual'?'你从视觉表达出发。归档设计把“清爽”落在风格与构图里。':choice?`你从${dimensions[choice]}出发；归档设计在风格与构图里落实它。你的判断保留。`:'这里展示归档设计如何落实“清爽”，没有替你作出判断。'):choice?`已保留你的${dimensions[choice]}判断。准备好后，看看真实设计怎样落实。`:'“清爽”会影响什么？先选你的整理角度。',
  mapping:discovering?`我的判断：${choice?dimensions[choice]:'已跳过'} · 归档对应：画面风格／构图建议`:'',
  caption:discovering?'归档设计对应 · 画面风格：清爽明亮；构图建议：主体突出／预留文案区':'夏日清爽 · '+(choice?'你的判断已保留，主动查看后对照真实字段':'先作出你的判断；归档工作台尚未改变'),
  frame:[245,80,1273,815],
  mobileFrame:[245,285,610,265]
 };
}
