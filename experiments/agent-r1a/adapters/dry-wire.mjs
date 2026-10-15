import {ContractError} from '../core.mjs';
import {createDeepSeekAdapter} from './deepseek.mjs';

const response=(message,finish='stop')=>({id:'SIMULATED-'+crypto.randomUUID(),model:'deepseek-flash',usage:{prompt_tokens:400,completion_tokens:120,total_tokens:520,completion_tokens_details:{reasoning_tokens:0}},choices:[{finish_reason:finish,message:{role:'assistant',...message}}]});
const call=(name,args,id)=>response({content:null,tool_calls:[{id,type:'function',function:{name,arguments:JSON.stringify(args)}}]},'tool_calls');
function pause(ms,signal){return new Promise((resolve,reject)=>{const t=setTimeout(resolve,ms);signal.addEventListener('abort',()=>{clearTimeout(t);reject(new ContractError(signal.reason==='timeout'?'request_timeout':'request_cancelled',504));},{once:true});});}
// Provider-protocol simulator, not a model. Only an explicit fixture selects its script.
export function createDryWireAdapter({budget}){
 const transport={mode:'dry-wire',async send(payload,{fixtureId,step,signal}){
   if(fixtureId==='timeout'||fixtureId==='delayed')await pause(fixtureId==='timeout'?10000:650,signal);
   if(fixtureId==='api_failure')throw new ContractError('provider_unavailable',502);
   if(fixtureId==='malformed')return response({content:'not json'});
   const projectId=fixtureId==='pangu'?'pangu':fixtureId==='identity'?'identity':fixtureId==='unknown'?'contentlab':'noteguard';
   const topic=projectId==='pangu'?'mechanism':projectId==='identity'?'identity':projectId==='contentlab'?'boundary':'workflow';
   if(step===1)return call('get_project_evidence',{projectId,topic},'sim-retrieve');
   const evidence=JSON.parse(payload.messages.find(m=>m.role==='tool').content);
   let blocks=evidence.records.map(r=>({factId:r.factId,text:r.text,sourceId:r.sourceId}));
   if(fixtureId==='unknown')return response({content:JSON.stringify({blocks:[],unknown:true,navigation:null})});
   if(fixtureId==='forged_source')blocks[0].sourceId='SRC-FAKE';
   if(fixtureId==='forged_claim')blocks[0].text='准确率99.9%';
   if(fixtureId==='pending_fact')blocks=[{factId:'xhs.leads',text:'680+',sourceId:'SRC-XHS'}];
   if(fixtureId==='html_payload')blocks[0].text='<script>steal()</script>';
   if(['forged_source','forged_claim','pending_fact','html_payload'].includes(fixtureId)||projectId==='identity')return response({content:JSON.stringify({blocks,unknown:false,navigation:null})});
   if(step===2)return call('propose_navigation',{pageId:fixtureId==='unsafe_navigation'?'https://evil.test':projectId,stage:projectId==='noteguard'?'c':null,reason:'查看对应的已冻结项目证据',evidenceIds:[...new Set(blocks.map(b=>b.sourceId))]},'sim-propose');
   const navigation=JSON.parse(payload.messages.filter(m=>m.role==='tool').at(-1).content);
   return response({content:JSON.stringify({blocks,unknown:false,navigation})});
 }};
 return createDeepSeekAdapter({transport,budget});
}
