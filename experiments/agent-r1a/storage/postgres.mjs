import {ContractError} from '../core.mjs';
import {resolve} from 'node:path';

// Host-only injection: supply an authenticated, restricted pg-compatible pool.
// No driver, connection string, environment variable, network or credential is
// read by this module. A pool/client must never come from HTTP/model input.
const fail=code=>{throw new ContractError(code,503);};
export const POSTGRES_QUERIES=Object.freeze({
 lock:'SELECT * FROM cui_budget.lock_snapshot($1,$2)',
 write:'SELECT cui_budget.commit_snapshot($1,$2,$3,$4,$5) AS revision'
});
export function createPostgresBudgetStorage({pool,accountId,identityPath,lockTimeoutMs=1500,statementTimeoutMs=5000}={}){
 if(!pool||typeof pool.connect!=='function'||typeof accountId!=='string'||!accountId||accountId.length>200||typeof identityPath!=='string'||!identityPath.startsWith('/')||resolve(identityPath)!==identityPath||!Number.isSafeInteger(lockTimeoutMs)||lockTimeoutMs<1||lockTimeoutMs>5000||!Number.isSafeInteger(statementTimeoutMs)||statementTimeoutMs<lockTimeoutMs||statementTimeoutMs>15000)fail('budget_storage_configuration');
 return Object.freeze({kind:'postgres',accountId,identityPath,hasTrustedControl:true,
  async transaction(run){
   let client,broken=false,committing=false,open=false;
   try{
    client=await pool.connect();await client.query('BEGIN');open=true;
    // Integers above are validated; no client input is interpolated into SQL.
    await client.query(`SET LOCAL lock_timeout = '${lockTimeoutMs}ms'`);
    await client.query(`SET LOCAL statement_timeout = '${statementTimeoutMs}ms'`);
    const result=await client.query(POSTGRES_QUERIES.lock,[accountId,identityPath]);
    if(result.rows?.length!==1)fail('budget_storage_identity');
    const row=result.rows[0];
    if(row.account_id!==accountId||row.identity_path!==identityPath||typeof row.initialized!=='boolean')fail('budget_storage_identity');
    if(row.initialized&&(row.state_text===null||row.anchor_text===null))fail('budget_missing');
    if(!row.initialized&&(row.state_text!==null||row.anchor_text!==null))fail('budget_corrupt');
    let state=null,anchor=null;
    try{state=row.state_text===null?null:JSON.parse(row.state_text);anchor=row.anchor_text===null?null:JSON.parse(row.anchor_text);}catch{fail('budget_corrupt');}
    const revision=row.revision;
    if(!Number.isSafeInteger(Number(revision))||Number(revision)<0||state&&state.revision!==Number(revision))fail('budget_corrupt');
    let wrote=false;
    const assertOwned=async()=>{if(!open||broken)fail('budget_storage_unavailable');};
    const output=await run({state,anchor,assertOwned,commit:async(next,nextAnchor)=>{
     if(wrote)fail('budget_storage_duplicate_commit');
     const s=JSON.stringify(next),a=JSON.stringify(nextAnchor);
     if(s.length>500000||a.length>5000||next.revision!==Number(revision)+1)fail('budget_corrupt');
     const saved=await client.query(POSTGRES_QUERIES.write,[accountId,identityPath,Number(revision),s,a]);
     if(saved.rows?.length!==1||Number(saved.rows[0].revision)!==next.revision)fail('budget_corrupt');
     wrote=true;
    }});
    if(!wrote)fail('budget_storage_uncommitted');
    // No reservation/dispatch permit is returned until COMMIT is acknowledged.
    committing=true;await client.query('COMMIT');open=false;return output;
   }catch(error){
    broken=true;
    if(client&&open){try{await client.query('ROLLBACK');}catch{}}
    if(committing)fail('budget_commit_uncertain');
    if(error instanceof ContractError)throw error;
    // Never put driver messages, SQL parameters or connection strings in errors.
    if(error?.code==='42501')fail('budget_storage_forbidden');
    if(['55P03','57014','40P01','40001'].includes(error?.code))fail('budget_storage_busy');
    fail('budget_storage_unavailable');
   }finally{if(client)client.release(broken);}
  }
 });
}
