import { mockAdapter } from './mock.mjs';
import { ContractError } from '../core.mjs';
// Dependency-injected interface: {id:string, run(context, tools, AbortSignal):Promise<Reply>}.
// A future real adapter must use the exact same validated contract. No provider SDK,
// network call, paid model, or secret is configured in R1-A.
export function createAdapter({mode='mock',injected=null}={}) {
  if(injected){if(typeof injected.id!=='string'||typeof injected.run!=='function')throw new ContractError('adapter_unconfigured',503);return injected;}
  if(mode==='mock')return mockAdapter;
  throw new ContractError('real_adapter_not_authorized',503);
}
export async function runAdapter(adapter,context,tools,signal) {
  let abort;
  const stopped=new Promise((_,reject)=>{
    abort=()=>reject(new ContractError(signal.reason==='timeout'?'request_timeout':'request_cancelled',signal.reason==='timeout'?504:409));
    if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
  });
  try{return await Promise.race([Promise.resolve().then(()=>adapter.run(context,tools,signal)),stopped]);}
  finally{signal.removeEventListener('abort',abort);}
}
