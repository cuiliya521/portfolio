import {readFile,rename,open,unlink,mkdir,lstat,realpath} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ContractError} from '../core.mjs';
const fail=code=>{throw new ContractError(code,503);};
async function readJson(path){try{const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink())fail('budget_corrupt');return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;if(e instanceof ContractError)throw e;fail('budget_corrupt');}}
async function persist(path,value){const temp=path+'.'+randomUUID()+'.tmp',fd=await open(temp,'wx',0o600);try{await fd.writeFile(JSON.stringify(value,null,2));await fd.sync();}finally{await fd.close();}await rename(temp,path);const dir=await open(dirname(path),'r');try{await dir.sync();}finally{await dir.close();}}

// Local compatibility backend. A local .anchor is NEVER a live trust boundary.
export function createFileBudgetStorage({path,mode,accountId,trustedControl}){
 const canonical=resolve(path);
 const hasTrustedControl=trustedControl?.kind==='trusted-external'&&!!accountId&&trustedControl.accountId===accountId&&typeof trustedControl.transaction==='function';
 return Object.freeze({identityPath:canonical,accountId,hasTrustedControl,
  async transaction(run){
   await mkdir(dirname(canonical),{recursive:true});if(await realpath(dirname(canonical))!==dirname(canonical))fail('budget_path');
   let lock;try{lock=await open(canonical+'.lock','wx',0o600);}catch{fail('budget_locked');}const stat=await lock.stat();
   const assertOwned=async()=>{try{const s=await lstat(canonical+'.lock');if(!s.isFile()||s.ino!==stat.ino||s.dev!==stat.dev)fail('budget_lock_lost');}catch(e){if(e instanceof ContractError)throw e;fail('budget_lock_lost');}};
   const execute=async(anchor,setAnchor)=>run({state:await readJson(canonical),anchor,assertOwned,
    commit:async(state,nextAnchor)=>{await assertOwned();await persist(canonical,state);await assertOwned();await setAnchor(nextAnchor);await assertOwned();}});
   try{
    if(mode==='live'){
     if(!hasTrustedControl){
      // The engine still validates a pre-existing corrupted/mismatched state first.
      return await run({state:await readJson(canonical),anchor:null,assertOwned,commit:async()=>fail('trusted_anchor_required')});
     }
     return await trustedControl.transaction(accountId,execute);
    }
    return await execute(await readJson(canonical+'.anchor'),a=>persist(canonical+'.anchor',a));
   }finally{await lock.close();try{const s=await lstat(canonical+'.lock');if(s.ino===stat.ino&&s.dev===stat.dev)await unlink(canonical+'.lock');}catch{}}
  }
 });
}
