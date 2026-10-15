// Optional REAL PostgreSQL harness, deliberately NOT enabled by default.
// Only a disposable localhost DB with fixed SYNTHETIC credentials is supported.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createBudget} from '../../experiments/agent-r1a/budget.mjs';
import {createPostgresBudgetStorage} from '../../experiments/agent-r1a/storage/postgres.mjs';
import {REVIEWED_PRICE,digest} from '../../experiments/agent-r1a/pricing.mjs';
const out=process.env.R1A_EVIDENCE_DIR||resolve('r5-0d-evidence');await mkdir(out,{recursive:true});
const results=[];let admin,runtime,other;
const report={classification:'real local PostgreSQL integration (never Neon)',executed:false,realPostgresValidated:false,modelHttpRequests:0,actualFees:0,results};
async function save(){report.summary={pass:results.filter(x=>x.pass).length,fail:results.filter(x=>x.pass===false).length};await writeFile(resolve(out,'real-postgres.json'),JSON.stringify(report,null,2));}
if(!process.argv.includes('--run-local-synthetic')){report.reason='NOT RUN: no approved disposable PostgreSQL instance/driver available; no connection attempted';await save();console.log(JSON.stringify({suite:'R5-0D real PostgreSQL',status:'NOT_RUN',reason:report.reason}));}
else {
 try{
  const {Pool}=await import('pg');
  const connection={host:'127.0.0.1',port:15432,database:'cui_r50d_synthetic',connectionTimeoutMillis:1500};
  // Fixed disposable credentials only; never read DATABASE_URL or provider envs.
  admin=new Pool({...connection,user:'postgres',password:'synthetic-only'});
  assert.equal((await admin.query('SELECT current_database() AS db')).rows[0].db,'cui_r50d_synthetic');
  await admin.query(await readFile(new URL('../../experiments/agent-r1a/sql/001-budget.sql',import.meta.url),'utf8'));
  await admin.query("CREATE ROLE cui_r50d_synthetic_login LOGIN INHERIT PASSWORD 'synthetic-only-runtime'; GRANT cui_budget_runtime TO cui_r50d_synthetic_login; CREATE ROLE cui_r50d_synthetic_other LOGIN INHERIT PASSWORD 'synthetic-only-other'; GRANT cui_budget_runtime TO cui_r50d_synthetic_other;");
  runtime=new Pool({...connection,user:'cui_r50d_synthetic_login',password:'synthetic-only-runtime',max:16});
  other=new Pool({...connection,user:'cui_r50d_synthetic_other',password:'synthetic-only-other'});
  const accountId='SYNTHETIC-PG-ACCOUNT',ledgerId='SYNTHETIC-PG-LEDGER',path='/cui-budget/synthetic.json',time=Date.now(),clock=()=>Date.now();
  const init={id:'SYNTHETIC-INIT',kind:'initialize-live-ledger',approved:true,accountId,ledgerId,path,issuedAt:time,expiresAt:time+1800000,historyReconciled:true,priorRequests:0,priorUsdMicros:0,priorCnyMicros:0};
  const rawGrant=(id,kind='first')=>({id,kind,approved:true,accountId,ledgerId,priceVersion:REVIEWED_PRICE.version,issuedAt:time,expiresAt:time+1800000,maxRequests:6,maxUsd:.1,maxCny:.5,availableCny:1.59,balanceVerifiedAt:time});
  const normalized=(g,baseline)=>({id:g.id,kind:g.kind,approved:true,accountId,ledgerId,priceVersion:g.priceVersion,issuedAt:g.issuedAt,expiresAt:g.expiresAt,maxRequests:g.maxRequests,maxUsdMicros:Math.round(g.maxUsd*1e6),maxCnyMicros:Math.round(g.maxCny*1e6),balanceCnyMicros:Math.round(g.availableCny*1e6),balanceVerifiedAt:g.balanceVerifiedAt,baselineCnyMicros:baseline});
  const config=JSON.stringify({maxRequests:80,cap:2000000,reserve:10000,reserveRmb:30000,rates:REVIEWED_PRICE.usd});
  await admin.query(`INSERT INTO cui_budget.accounts(account_id,runtime_role,ledger_id,identity_path,initialization_id,approved_config,price_version,price_digest,price_usd_input,price_usd_output,price_cny_input,price_cny_output,reserve_usd,reserve_cny,max_requests,max_usd,policy_expires_at,enabled) VALUES($1,'cui_r50d_synthetic_login',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,10000,30000,80,2000000,$12,true)`,[accountId,ledgerId,path,init.id,config,REVIEWED_PRICE.version,digest(REVIEWED_PRICE),REVIEWED_PRICE.usd.inputPerMillion,REVIEWED_PRICE.usd.outputPerMillion,REVIEWED_PRICE.cny.inputPerMillion,REVIEWED_PRICE.cny.outputPerMillion,REVIEWED_PRICE.expiresAt]);
  const grant=rawGrant('SYNTHETIC-FIRST');await admin.query('INSERT INTO cui_budget.batch_grants VALUES($1,$2,$3::jsonb)',[accountId,grant.id,JSON.stringify(normalized(grant,0))]);
  const make=(pool=runtime,identityPath=path,id=accountId)=>createBudget({mode:'live',clock,accountId:id,storage:createPostgresBudgetStorage({pool,accountId:id,identityPath})});
  const b=make(),usage={prompt_tokens:400,completion_tokens:120,total_tokens:520};
  async function settle(b,t){const p=await b.markDispatched(t);await b.consumePermit(p,p.grantId);await b.settle(t,usage,'SYNTHETIC-PG-USAGE');}
  async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,errorCode:e.code||e.name,message:e instanceof assert.AssertionError?e.message:'sanitized database/integration failure'});}}
  report.executed=true;
  await check('explicit operator provision + application initialization',async()=>{await b.initialize(init,grant);assert.equal((await b.snapshot()).requests,0);});
  await check('independent connections serialize eight contenders',async()=>{const bs=Array.from({length:8},()=>make()),r=await Promise.allSettled(bs.map((x,i)=>x.reserve('concurrent-'+i,1)));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);const i=r.findIndex(x=>x.status==='fulfilled');await settle(bs[i],r[i].value);assert.equal((await make().snapshot()).requests,1);});
  await check('six request batch then seventh refused',async()=>{for(let i=1;i<6;i++){const n=make();await settle(n,await n.reserve('charge-'+i,1));}await assert.rejects(()=>make().reserve('seventh',1),e=>e.code==='budget_exhausted');});
  await check('runtime cannot add unapproved batch by supplying approved=true',async()=>{await assert.rejects(()=>make().addBatch(rawGrant('NOT-REGISTERED','next')));});
  await check('operator-approved second batch retains cumulative count',async()=>{const before=await b.snapshot(),g=rawGrant('SYNTHETIC-SECOND','next');await admin.query('INSERT INTO cui_budget.batch_grants VALUES($1,$2,$3::jsonb)',[accountId,g.id,JSON.stringify(normalized(g,Math.round(before.committedCny*1e6)))]);await b.addBatch(g);await settle(b,await b.reserve('batch-two',1));assert.equal((await make().snapshot()).requests,7);});
  for(const [name,sql] of [['ledger UPDATE','UPDATE cui_budget.accounts SET revision=0'],['ledger DELETE','DELETE FROM cui_budget.accounts'],['ledger TRUNCATE','TRUNCATE cui_budget.accounts'],['audit DELETE','DELETE FROM cui_budget.audit'],['grant INSERT',"INSERT INTO cui_budget.batch_grants VALUES('fake','fake','{}')"],['DDL','CREATE TABLE cui_budget.bad(x int)']])await check('real restricted role rejects '+name,async()=>await assert.rejects(()=>runtime.query(sql),e=>e.code==='42501'));
  await check('other login in same runtime group cannot borrow identity',async()=>await assert.rejects(()=>make(other).snapshot(),e=>e.code==='budget_storage_forbidden'));
  await check('path/identity mismatch refuses',async()=>await assert.rejects(()=>make(runtime,'/other.json').snapshot(),e=>e.code==='budget_storage_forbidden'));
  await check('audit revisions append and match state revision',async()=>{const {rows}=await admin.query('SELECT revision FROM cui_budget.audit WHERE account_id=$1 ORDER BY revision',[accountId]);assert(rows.length>10);assert(rows.every((r,i)=>Number(r.revision)===i+1));});
  await check('unknown usage retains reserves and halts across connections',async()=>{const t=await b.reserve('uncertain',1),p=await b.markDispatched(t);await b.consumePermit(p,p.grantId);await b.settle(t,null,'SIM');assert((await make().snapshot()).halted);await assert.rejects(()=>make().reserve('retry',1));});
  // Connection refusal to an unused loopback port: no external network involved.
  await check('real driver connection refusal fails closed',async()=>{const bad=new Pool({...connection,port:1,user:'synthetic',password:'synthetic',connectionTimeoutMillis:300});try{await assert.rejects(()=>make(bad).snapshot(),e=>e.code==='budget_storage_unavailable');}finally{await bad.end();}});
  report.realPostgresValidated=results.every(x=>x.pass);
 }catch(error){report.blocked=true;report.reason='real PostgreSQL setup/driver unavailable or migration failed; no details/credentials logged';results.push({name:'setup',pass:false,errorCode:error.code||error.name});process.exitCode=1;}
 finally{await Promise.allSettled([admin?.end(),runtime?.end(),other?.end()]);await save();console.log(JSON.stringify({suite:'R5-0D real PostgreSQL',executed:report.executed,realPostgresValidated:report.realPostgresValidated,...report.summary}));if(report.summary.fail)process.exitCode=1;}
}
