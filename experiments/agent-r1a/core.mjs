import { createHash, randomUUID } from 'node:crypto';

export class ContractError extends Error {
  constructor(code, status=400) { super(code); this.code=code; this.status=status; }
}
export const BASELINE='3930ed97eaa643bab90baa185e2ce3f60c7ce90f';
export const ROUTES=Object.freeze({hero:'/#hero',workspace:'/#cui-workspace',pangu:'/#cui-pangu',contentlab:'/content-archive/',noteguard:'/noteguard-case/',capability:'/capability-lab/',about:'/about-contact/'});
export const PAGE_SOURCES=Object.freeze({hero:Object.freeze(['SRC-HERO']),workspace:Object.freeze(['SRC-WORKSPACE']),pangu:Object.freeze(['SRC-PANGU']),contentlab:Object.freeze(['SRC-XHS']),noteguard:Object.freeze(['SRC-NOTEGUARD']),capability:Object.freeze(['SRC-CAPABILITY']),about:Object.freeze(['SRC-ABOUT'])});
export const TOPICS=Object.freeze(['identity','mechanism','workflow','boundary','capability','contact','status']);
export const PROJECTS=Object.freeze(['identity','pangu','noteguard','contentlab','capability','about','jiya']);
export const hashRecord=r=>createHash('sha256').update(JSON.stringify({id:r.id,projectId:r.projectId,topic:r.topic,claim:r.claim,sourceId:r.sourceId,truthKind:r.truthKind,status:r.status})).digest('hex');
export function exactObject(value, keys, required=keys) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k))||required.some(k=>!Object.hasOwn(value,k))) throw new ContractError('invalid_parameters');
}
export function enumValue(value, allowed) { if(!allowed.includes(value)) throw new ContractError('invalid_parameters'); return value; }
export function boundedText(value, max=1000) {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new ContractError('invalid_parameters');
  return value;
}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function buildKnowledge(data,ledger) {
  exactObject(data,['version','baseline','sources','facts']);
  if(data.baseline!==BASELINE||ledger.baseline!==BASELINE||!Array.isArray(data.facts)||data.facts.length<20||data.facts.length>30) throw new ContractError('knowledge_integrity',503);
  const approved=new Map(), sourceMap=new Map(), seen=new Set();
  for(const source of data.sources){
    exactObject(source,['id','title','path','baseline','public']);
    const sourceDigest=createHash('sha256').update(JSON.stringify(source)).digest('hex');
    if(ledger.sources?.[source.id]!==sourceDigest||sourceMap.has(source.id)||source.baseline!==BASELINE||source.public!==true||!Object.values(ROUTES).some(path=>source.path===path||source.path.startsWith(path+'#'))) throw new ContractError('knowledge_integrity',503);
    sourceMap.set(source.id,freeze(structuredClone(source)));
  }
  for(const fact of data.facts){
    if(seen.has(fact.id)||!PROJECTS.includes(fact.projectId)||!TOPICS.includes(fact.topic)||!sourceMap.has(fact.sourceId)||!['approved','pending'].includes(fact.status)||fact.public!==true) throw new ContractError('knowledge_integrity',503);
    seen.add(fact.id);
    if(fact.status!=='approved') continue;
    if(!ledger.approved[fact.id]||ledger.approved[fact.id].digest!==hashRecord(fact)||/\b(?:ignore instructions|system prompt|javascript:|<script)\b/i.test(fact.claim)) throw new ContractError('knowledge_integrity',503);
    approved.set(fact.id,freeze(structuredClone(fact)));
  }
  if(Object.keys(ledger.approved).some(id=>!approved.has(id))) throw new ContractError('knowledge_integrity',503);
  return Object.freeze({version:data.version,approved,sourceMap,candidateCount:data.facts.length});
}
export function getProjectEvidence(knowledge,args) {
  exactObject(args,['projectId','topic']);enumValue(args.projectId,PROJECTS);enumValue(args.topic,TOPICS);
  const records=[...knowledge.approved.values()].filter(r=>r.projectId===args.projectId&&r.topic===args.topic).slice(0,8);
  return freeze({version:knowledge.version,records:records.map(r=>({factId:r.id,text:r.claim,sourceId:r.sourceId,kind:r.truthKind})),unknown:records.length===0});
}
export function proposeNavigation(knowledge,args) {
  exactObject(args,['pageId','stage','reason','evidenceIds']);enumValue(args.pageId,Object.keys(ROUTES));boundedText(args.reason,120);
  if(args.stage!==null&&(args.pageId!=='noteguard'||!['a','b','c','d'].includes(args.stage))) throw new ContractError('invalid_navigation');
  if(!Array.isArray(args.evidenceIds)||args.evidenceIds.length===0||args.evidenceIds.length>8||new Set(args.evidenceIds).size!==args.evidenceIds.length) throw new ContractError('invalid_navigation');
  for(const id of args.evidenceIds){const source=knowledge.sourceMap.get(id);if(!source||!PAGE_SOURCES[args.pageId].includes(id)||![...knowledge.approved.values()].some(f=>f.sourceId===id)) throw new ContractError('invalid_navigation');}
  return freeze({pageId:args.pageId,stage:args.stage,reason:args.reason,evidenceIds:[...args.evidenceIds]});
}
export function validateReply(knowledge,result,issuedEvidence,issuedNavigation) {
  exactObject(result,['blocks','unknown','navigation']);
  if(typeof result.unknown!=='boolean'||!Array.isArray(result.blocks)||result.blocks.length>8||result.unknown&&result.blocks.length) throw new ContractError('adapter_contract',502);
  if(!result.unknown&&!result.blocks.length) throw new ContractError('adapter_contract',502);
  const sources=[];const blocks=result.blocks.map(block=>{
    exactObject(block,['factId','text','sourceId']);const fact=knowledge.approved.get(block.factId);
    if(!fact||block.text!==fact.claim||block.sourceId!==fact.sourceId||!issuedEvidence.has(fact.id)) throw new ContractError('untrusted_adapter_output',502);
    const source=knowledge.sourceMap.get(fact.sourceId);if(!sources.some(s=>s.id===source.id))sources.push(source);
    return {factId:fact.id,text:fact.claim,sourceId:fact.sourceId};
  });
  if(result.navigation!==null&&(!issuedNavigation||JSON.stringify(result.navigation)!==JSON.stringify(issuedNavigation)||result.unknown||result.navigation.evidenceIds.some(id=>!sources.some(s=>s.id===id)))) throw new ContractError('untrusted_navigation',502);
  return {blocks,sources,unknown:result.unknown,message:result.unknown?'批准资料无法确认这个问题。请查看公开项目资料或等待事实卡确认。':null,navigation:result.navigation};
}
export function createToolbox(knowledge,{signal=null}={}) {
  const trace=[],issuedEvidence=new Set();let issuedNavigation=null;
  const active=()=>{if(signal?.aborted)throw new ContractError('request_closed',409);};
  const tools=Object.freeze({
    get_project_evidence(args){active();if(trace.filter(x=>x.tool==='get_project_evidence').length>=2)throw new ContractError('tool_limit',502);const result=getProjectEvidence(knowledge,args);result.records.forEach(r=>issuedEvidence.add(r.factId));trace.push({tool:'get_project_evidence',args:structuredClone(args),factIds:result.records.map(r=>r.factId)});return result;},
    propose_navigation(args){active();if(issuedNavigation)throw new ContractError('tool_limit',502);const result=proposeNavigation(knowledge,args);issuedNavigation=result;trace.push({tool:'propose_navigation',args:structuredClone(args),execution:'proposal_only'});return result;}
  });
  return {tools,trace,validate:result=>validateReply(knowledge,result,issuedEvidence,issuedNavigation)};
}
export function issueProposal(session, requestId, navigation, ttl) {
  const id=randomUUID();const proposal={id,requestId,navigation,expiresAt:Date.now()+ttl,status:'pending'};
  session.proposals.set(id,proposal);return {id,pageId:navigation.pageId,stage:navigation.stage,reason:navigation.reason,expiresAt:proposal.expiresAt};
}
export function decideProposal(session,args) {
  exactObject(args,['proposalId','decision']);enumValue(args.decision,['confirm','reject']);
  const proposal=session.proposals.get(args.proposalId);if(!proposal)throw new ContractError('proposal_unknown',404);
  if(proposal.status!=='pending')throw new ContractError('proposal_used',409);
  if(Date.now()>=proposal.expiresAt){proposal.status='expired';throw new ContractError('proposal_expired',410);}
  proposal.status=args.decision==='reject'?'rejected':'confirmed';
  if(args.decision==='reject')return {status:'rejected',destination:null};
  const n=proposal.navigation;return {status:'confirmed',destination:ROUTES[n.pageId]+(n.stage?'#'+n.stage:''),proposalId:proposal.id};
}
