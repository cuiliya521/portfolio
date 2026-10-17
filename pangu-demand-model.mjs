/* Visitor interpretations, not product state. All coordinates reference the immutable archive. */
export const dimensions=Object.freeze({business:'业务目的',visual:'视觉表达',delivery:'交付约束'});
export const fragments=Object.freeze({
 product:{label:'青提柠檬新品',dimension:'business',fields:'行业 · 营销场景 · 产品／主题',values:'餐饮美食 / 夏季新品上市 / 青提柠檬饮品',area:[260,125,580,240]},
 style:{label:'夏日清爽',dimension:'visual',fields:'画面风格 · 构图建议',values:'清爽明亮 / 主体突出、预留文案区',area:[260,350,580,150]},
 format:{label:'手机竖版推广',dimension:'delivery',fields:'平台规格 · 图片比例 · 生成数量',values:'竖版海报 1080×1920 / 9:16；下方另有生成数量',area:[260,475,580,385]}
});
export function createDemand(){return {selected:null,assignments:{},order:[],history:[],phase:'arrange',cursor:0,quiet:false};}
export function reduceDemand(s,a){
 if(a.type==='reset')return createDemand();
 if(a.type==='select'&&Object.hasOwn(fragments,a.id))return {...s,selected:a.id,phase:'arrange'};
 if(a.type==='assign'&&s.selected&&Object.hasOwn(dimensions,a.dimension)){
  if(s.assignments[s.selected]===a.dimension)return s;
  return {...s,assignments:{...s.assignments,[s.selected]:a.dimension},order:s.order.includes(s.selected)?s.order:[...s.order,s.selected],history:[...s.history,{assignments:{...s.assignments},order:[...s.order],selected:s.selected}],phase:'arrange'};
 }
 if(a.type==='undo'&&s.history.length){const last=s.history.at(-1);return {...s,...last,history:s.history.slice(0,-1),phase:'arrange'};}
 if(a.type==='clear')return {...createDemand(),quiet:s.quiet};
 if(a.type==='quiet')return {...s,quiet:!s.quiet};
 if(a.type==='evidence'&&s.order.length)return {...s,phase:'evidence',cursor:0};
 if(a.type==='skip')return {...s,phase:'evidence',cursor:0};
 if(a.type==='next')return {...s,phase:'evidence',cursor:(s.cursor+1)%explorationOrder(s).length};
 if(a.type==='result')return {...s,phase:'result'};
 if(a.type==='edit')return {...s,selected:explorationOrder(s)[s.cursor],phase:'arrange'};
 return s;
}
export function explorationOrder(s){return [...s.order,...Object.keys(fragments).filter(k=>!s.order.includes(k))];}
export function feedback(s){
 if(s.phase==='result')return '这是归档海报，不是刚才选择实时生成的结果。';
 const id=s.phase==='evidence'?explorationOrder(s)[s.cursor]:s.selected;
 if(!id)return '这家饮品商户想做新品海报。你会先从哪个角度整理？';
 const f=fragments[id],choice=s.assignments[id];
 if(!choice&&s.phase==='arrange')return '你觉得这会影响业务、画面，还是投放？';
 if(choice&&choice!==f.dimension){
  if(id==='format'&&choice==='visual')return '它确实影响画面；归档方案优先把它落实在平台规格与比例上。你的判断可以保留。';
  return `你从${dimensions[choice]}出发；归档方案从${dimensions[f.dimension]}落实这段需求。两个角度可以对照。`;
 }
 return {product:'先确定行业、场景与主题，让商户不必先会写 Prompt。',style:'把“清爽”转成风格与构图选择，让表达更具体。',format:'投放场景决定画幅与比例；图片比例和生成数量在六个主要选择行之外。'}[id];
}
