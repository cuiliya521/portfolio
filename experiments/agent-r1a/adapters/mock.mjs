import { ContractError } from '../core.mjs';

export const FIXTURES=['noteguard','pangu','identity','unknown','delayed','timeout','api_failure','malformed','forged_source','forged_claim','pending_fact','unsafe_navigation','html_payload'];
const sleep=(ms,signal)=>new Promise((resolve,reject)=>{
  if(signal.aborted)return reject(new ContractError(signal.reason==='timeout'?'request_timeout':'request_cancelled',signal.reason==='timeout'?504:409));
  const timer=setTimeout(done,ms);
  function done(){signal.removeEventListener('abort',abort);resolve();}
  function abort(){clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new ContractError(signal.reason==='timeout'?'request_timeout':'request_cancelled',signal.reason==='timeout'?504:409));}
  signal.addEventListener('abort',abort,{once:true});
});
// Deliberate scripted fixtures. User text is NEVER classified with keywords.
// This adapter proves orchestration only, not model reasoning or factual accuracy.
export const mockAdapter=Object.freeze({id:'mock-scripted-v1',async run(context,tools,signal){
  const f=context.fixtureId;
  await sleep(f==='timeout'?10000:f==='delayed'?650:30,signal);
  if(f==='api_failure')throw new Error('Upstream failed; sensitive diagnostic must never reach UI');
  if(f==='malformed')return {unexpected:'invalid JSON contract'};
  if(f==='unknown') {tools.get_project_evidence({projectId:'contentlab',topic:'boundary'});return {blocks:[],unknown:true,navigation:null};}
  const projectId=f==='pangu'?'pangu':f==='identity'?'identity':'noteguard';
  const topic=projectId==='pangu'?'mechanism':projectId==='identity'?'identity':'workflow';
  const evidence=tools.get_project_evidence({projectId,topic});
  let blocks=evidence.records.map(r=>({factId:r.factId,text:r.text,sourceId:r.sourceId}));
  if(f==='forged_source')blocks[0].sourceId='SRC-FAKE';
  if(f==='forged_claim')blocks[0].text='NoteGuard 准确率 99.9%，已经保证绝对合规。';
  if(f==='pending_fact')blocks=[{factId:'xhs.leads',text:'单篇留资680+',sourceId:'SRC-XHS'}];
  if(f==='html_payload')blocks[0].text='<img src=x onerror="globalThis.pwned=true">';
  let navigation=null;
  if(f==='unsafe_navigation')navigation=tools.propose_navigation({pageId:'javascript:alert(1)',stage:null,reason:'unsafe',evidenceIds:[blocks[0].sourceId]});
  else if(!['forged_source','forged_claim','pending_fact','html_payload'].includes(f)&&projectId!=='identity')navigation=tools.propose_navigation({pageId:projectId,stage:projectId==='noteguard'?'c':null,reason:'查看对应的已冻结项目证据',evidenceIds:[...new Set(blocks.map(b=>b.sourceId))]});
  return {blocks,unknown:false,navigation};
}});
