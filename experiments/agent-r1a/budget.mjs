import {readFile,writeFile,rename,open,unlink,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ContractError} from './core.mjs';
// One local pilot, not a distributed Vercel limiter. No ledger reset on restart.
export function createBudget({path,mode='dry-wire',maxRequests=80,maxUsd=2,reserveUsd=.01,rates={inputPerMillion:.3,outputPerMillion:1.2}}){
  if(!path||!['dry-wire','live'].includes(mode)||!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>80||!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>2||!Number.isFinite(reserveUsd)||reserveUsd<=0||![rates.inputPerMillion,rates.outputPerMillion].every(x=>Number.isFinite(x)&&x>0))throw new ContractError('budget_configuration',503);
  const cap=Math.floor(maxUsd*1e6),reserve=Math.ceil(reserveUsd*1e6);let queue=Promise.resolve();
  async function transaction(fn){
    const work=queue.then(async()=>{
      await mkdir(dirname(path),{recursive:true});let lock;
      try{lock=await open(path+'.lock','wx',0o600);}catch{throw new ContractError('budget_locked',503);}
      try{
        let state;try{state=JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new ContractError('budget_corrupt',503);state={version:1,mode,entries:[],halted:false};}
        if(state.version!==1||state.mode!==mode||!Array.isArray(state.entries)||typeof state.halted!=='boolean'||state.entries.some(e=>!e||typeof e.id!=='string'||!['reserved','settled','uncertain'].includes(e.status)||!Number.isInteger(e.reservedMicros)||e.reservedMicros<=0||e.actualMicros!==null&&(!Number.isInteger(e.actualMicros)||e.actualMicros<0))||new Set(state.entries.map(e=>e.id)).size!==state.entries.length)throw new ContractError('budget_corrupt',503);
        const result=await fn(state),tmp=path+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600});await rename(tmp,path);return result;
      }finally{await lock.close();await unlink(path+'.lock');}
    });queue=work.catch(()=>{});return work;
  }
  const committed=s=>s.entries.reduce((n,e)=>n+(e.actualMicros??e.reservedMicros),0);
  return Object.freeze({
    mode,
    reserve(requestId,step){return transaction(s=>{
      if(s.halted||s.entries.some(e=>e.status==='reserved'||e.status==='uncertain'))throw new ContractError('budget_halted',503);
      if(s.entries.length>=maxRequests||committed(s)+reserve>cap)throw new ContractError('budget_exhausted',429);
      const id=randomUUID();s.entries.push({id,requestId,step,status:'reserved',reservedMicros:reserve,actualMicros:null});return id;
    });},
    settle(id,usage,providerId){return transaction(s=>{
      const e=s.entries.find(x=>x.id===id);if(!e||e.status!=='reserved')throw new ContractError('budget_ticket',503);
      if(!usage||!Number.isInteger(usage.prompt_tokens)||!Number.isInteger(usage.completion_tokens)||usage.prompt_tokens<0||usage.completion_tokens<0||!Number.isInteger(usage.total_tokens)||usage.total_tokens!==usage.prompt_tokens+usage.completion_tokens||usage.prompt_tokens>6000||usage.completion_tokens>800||(usage.completion_tokens_details?.reasoning_tokens||0)!==0){e.status='uncertain';s.halted=true;return {halted:true};}
      const cost=Math.ceil((usage.prompt_tokens*rates.inputPerMillion+usage.completion_tokens*rates.outputPerMillion));
      e.status='settled';e.actualMicros=cost;e.usage={prompt:usage.prompt_tokens,completion:usage.completion_tokens,total:usage.total_tokens};e.providerId=providerId;
      if(cost>e.reservedMicros||committed(s)>cap)s.halted=true;
      return {halted:s.halted,costMicros:cost};
    });},
    uncertain(id){return transaction(s=>{const e=s.entries.find(x=>x.id===id);if(e?.status==='reserved')e.status='uncertain';s.halted=true;});},
    snapshot(){return transaction(s=>({mode,requests:s.entries.length,committedUsd:committed(s)/1e6,halted:s.halted||s.entries.some(e=>e.status==='reserved'||e.status==='uncertain'),entries:s.entries}));}
  });
}
