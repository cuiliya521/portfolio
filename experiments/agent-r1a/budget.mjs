import {readFile,rename,open,unlink,mkdir,lstat,realpath} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ContractError} from './core.mjs';
import {pricePolicy,REVIEWED_PRICE,digest,costMicros,normalizeUsage} from './pricing.mjs';
const fail=(code='budget_corrupt',status=503)=>{throw new ContractError(code,status);};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const text=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const micro=n=>Number.isFinite(n)&&n>=0&&Number.isSafeInteger(Math.round(n*1e6))?Math.round(n*1e6):fail('budget_configuration');
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
async function readJson(path){try{const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink())fail();return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;if(e instanceof ContractError)throw e;fail();}}
async function persist(path,value){const temp=path+'.'+randomUUID()+'.tmp',fd=await open(temp,'wx',0o600);try{await fd.writeFile(JSON.stringify(value,null,2));await fd.sync();}finally{await fd.close();}await rename(temp,path);const dir=await open(dirname(path),'r');try{await dir.sync();}finally{await dir.close();}}

// Host-injected trustedControl must atomically persist the account anchor OUTSIDE
// the ledger's trust/storage boundary. No production control is configured here.
export function createBudget({path,mode='dry-wire',maxRequests=80,maxUsd=2,reserveUsd=.01,reserveCny=.03,rates,price=REVIEWED_PRICE,clock=Date.now,accountId=null,trustedControl=null}={}){
 if(!path||!['dry-wire','live'].includes(mode)||!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>80||!Number.isFinite(maxUsd)||maxUsd<=0||maxUsd>2||!Number.isFinite(reserveUsd)||reserveUsd<=0||!Number.isFinite(reserveCny)||reserveCny<=0||typeof clock!=='function')fail('budget_configuration');
 const canonical=resolve(path),cap=micro(maxUsd),reserve=micro(reserveUsd),reserveRmb=micro(reserveCny);
 price=pricePolicy({mode:'dry-wire',price,rates,now:clock()});
 if(reserve<costMicros({prompt_tokens:6000,completion_tokens:800},price.usd)||reserveRmb<costMicros({prompt_tokens:6000,completion_tokens:800},price.cny))fail('budget_under_reserved');
 const config=JSON.stringify({maxRequests,cap,reserve,reserveRmb,rates:price.usd});
 const hasControl=trustedControl?.kind==='trusted-external'&&text(accountId)&&trustedControl.accountId===accountId&&typeof trustedControl.transaction==='function';
 let queue=Promise.resolve();const permits=new Set();
 const amounts=entries=>entries.reduce((a,e)=>({requests:a.requests+1,usd:a.usd+(e.actualMicros??e.reservedMicros),cny:a.cny+(e.actualCnyMicros??e.reservedCnyMicros)}),{requests:0,usd:0,cny:0});
 const now=()=>{const n=clock();if(!integer(n))fail('budget_clock');return n;};
 function validateGrant(g){
  if(!exact(g,['id','kind','approved','accountId','ledgerId','priceVersion','issuedAt','expiresAt','maxRequests','maxUsdMicros','maxCnyMicros','balanceCnyMicros','balanceVerifiedAt','baselineCnyMicros'])||!text(g.id)||!['first','next','legacy-dry'].includes(g.kind)||g.approved!==true||!text(g.ledgerId)||!text(g.accountId)||g.priceVersion!==price.version||![g.issuedAt,g.expiresAt,g.maxRequests,g.maxUsdMicros,g.maxCnyMicros,g.balanceCnyMicros,g.balanceVerifiedAt,g.baselineCnyMicros].every(integer)||g.expiresAt<=g.issuedAt||g.maxRequests<1||g.maxRequests>80||g.maxUsdMicros<1||g.maxUsdMicros>cap||g.maxCnyMicros<1)fail();
  if(g.kind==='first'&&(g.maxRequests>6||g.maxCnyMicros>500000))fail();
  if(mode==='live'&&(g.kind==='legacy-dry'||g.balanceVerifiedAt>g.issuedAt||g.issuedAt-g.balanceVerifiedAt>3600000||g.expiresAt-g.issuedAt>3600000))fail();
 }
 function grantFrom(raw,state){
  if(!exact(raw,['id','kind','approved','accountId','ledgerId','priceVersion','issuedAt','expiresAt','maxRequests','maxUsd','maxCny','availableCny','balanceVerifiedAt']))fail('batch_authorization');
  const g={id:raw.id,kind:raw.kind,approved:raw.approved,accountId:raw.accountId,ledgerId:raw.ledgerId,priceVersion:raw.priceVersion,issuedAt:raw.issuedAt,expiresAt:raw.expiresAt,maxRequests:raw.maxRequests,maxUsdMicros:micro(raw.maxUsd),maxCnyMicros:micro(raw.maxCny),balanceCnyMicros:micro(raw.availableCny),balanceVerifiedAt:raw.balanceVerifiedAt,baselineCnyMicros:amounts(state.entries).cny};
  validateGrant(g);if(g.accountId!==state.accountId||g.ledgerId!==state.ledgerId||g.issuedAt>now()||g.expiresAt<=now()||state.grants.some(x=>x.id===g.id)||g.kind===(state.grants.length?'first':'next'))fail('batch_authorization');
  if(state.grants.length===0&&g.kind!=='first')fail('batch_authorization');return g;
 }
 function validateState(s){
  if(!exact(s,['version','mode','config','ledgerId','accountId','path','revision','entries','halted','grants','activeGrant','metrics','initializationId'])||s.version!==2||s.mode!==mode||s.config!==config||s.path!==canonical||!text(s.ledgerId)||!text(s.accountId)||!text(s.initializationId)||!integer(s.revision)||!Array.isArray(s.entries)||!Array.isArray(s.grants)||typeof s.halted!=='boolean'||!text(s.activeGrant)||s.entries.length>maxRequests||s.grants.length<1||new Set(s.grants.map(g=>g.id)).size!==s.grants.length)fail();
  s.grants.forEach(validateGrant);if(!s.grants.some(g=>g.id===s.activeGrant)||s.grants.some(g=>g.accountId!==s.accountId||g.ledgerId!==s.ledgerId))fail();
  const ids=new Set(),requests=new Set();
  for(const e of s.entries){
   if(!exact(e,['id','requestId','step','status','reservedMicros','reservedCnyMicros','actualMicros','actualCnyMicros','usage','providerId','grantId','priceVersion','priceDigest','createdAt','dispatchedAt','dispatchUsed'])||!text(e.id)||!text(e.requestId)||!integer(e.step)||!['reserved','dispatched','settled','uncertain'].includes(e.status)||e.reservedMicros!==reserve||e.reservedCnyMicros!==reserveRmb||e.priceVersion!==price.version||e.priceDigest!==digest(price)||!integer(e.createdAt)||typeof e.dispatchUsed!=='boolean'||e.dispatchedAt!==null&&(!integer(e.dispatchedAt)||e.dispatchedAt<e.createdAt)||ids.has(e.id)||requests.has(e.requestId+'\0'+e.step))fail();
   ids.add(e.id);requests.add(e.requestId+'\0'+e.step);const g=s.grants.find(g=>g.id===e.grantId);if(!g||e.createdAt<g.issuedAt||e.createdAt>=g.expiresAt)fail();
   if(e.status==='settled'){const u=normalizeUsage(e.usage);if(!u||!text(e.providerId)||!integer(e.actualMicros)||!integer(e.actualCnyMicros)||e.actualMicros!==costMicros(u,price.usd)||e.actualCnyMicros!==costMicros(u,price.cny)||e.actualMicros>reserve||e.actualCnyMicros>reserveRmb||mode==='live'&&(!e.dispatchUsed||e.dispatchedAt===null))fail();}
   else if(e.actualMicros!==null||e.actualCnyMicros!==null||e.usage!==null||e.providerId!==null)fail();
   if(e.status==='reserved'&&(e.dispatchUsed||e.dispatchedAt!==null)||e.status==='dispatched'&&e.dispatchedAt===null||e.dispatchUsed&&e.dispatchedAt===null||e.status==='uncertain'&&!s.halted)fail();
  }
  const a=amounts(s.entries);if(!exact(s.metrics,['requests','usd','cny'])||s.metrics.requests!==a.requests||s.metrics.usd!==a.usd||s.metrics.cny!==a.cny||a.usd>cap||s.entries.filter(e=>['reserved','dispatched'].includes(e.status)).length>1)fail();
  let baseline=0;for(const g of s.grants){const used=amounts(s.entries.filter(e=>e.grantId===g.id));if(g.baselineCnyMicros!==baseline||used.requests>g.maxRequests||used.usd>g.maxUsdMicros||used.cny>g.maxCnyMicros||used.cny>g.balanceCnyMicros)fail();baseline+=used.cny;}
 }
 function emptyState(identity){return {version:2,mode,config,ledgerId:identity.ledgerId,accountId:identity.accountId,path:canonical,revision:0,entries:[],halted:false,grants:[],activeGrant:'',metrics:{requests:0,usd:0,cny:0},initializationId:identity.id};}
 function initialize(raw,grant){
  if(!exact(raw,['id','approved','kind','accountId','ledgerId','path','issuedAt','expiresAt','historyReconciled','priorRequests','priorUsdMicros','priorCnyMicros'])||raw.approved!==true||raw.kind!=='initialize-live-ledger'||raw.accountId!==accountId||raw.path!==canonical||!text(raw.id)||!text(raw.ledgerId)||!integer(raw.issuedAt)||!integer(raw.expiresAt)||raw.issuedAt>now()||raw.expiresAt<=now()||raw.expiresAt-raw.issuedAt>3600000||raw.historyReconciled!==true||raw.priorRequests!==0||raw.priorUsdMicros!==0||raw.priorCnyMicros!==0)fail('initialization_authorization');
  // Non-zero history requires reviewed recovery tooling, never reset here.
  const s=emptyState(raw),g=grantFrom(grant,s);s.grants=[g];s.activeGrant=g.id;return s;
 }
 async function transaction(fn,{initialization=null,grant=null}={}){
  const work=queue.then(async()=>{
   await mkdir(dirname(canonical),{recursive:true});if(await realpath(dirname(canonical))!==dirname(canonical))fail('budget_path');
   let lock;try{lock=await open(canonical+'.lock','wx',0o600);}catch{fail('budget_locked');}const lockStat=await lock.stat();
   const ownLock=async()=>{try{const s=await lstat(canonical+'.lock');if(!s.isFile()||s.ino!==lockStat.ino||s.dev!==lockStat.dev)fail('budget_lock_lost');}catch(e){if(e instanceof ContractError)throw e;fail('budget_lock_lost');}};
   try{
    const run=async(anchor,setAnchor)=>{
     pricePolicy({mode,price,rates,now:now()});let s=await readJson(canonical);if(s){validateState(s);if(mode==='live'&&s.accountId!==accountId)fail('budget_identity');}
     if(mode==='live'&&!hasControl)fail('trusted_anchor_required');
     if(anchor){if(!s)fail('budget_missing');if(initialization)fail('initialization_reused');if(!exact(anchor,['accountId','ledgerId','path','revision','digest','initializationId'])||anchor.accountId!==s.accountId||anchor.ledgerId!==s.ledgerId||anchor.path!==canonical||anchor.revision!==s.revision||anchor.initializationId!==s.initializationId||anchor.digest!==digest(s))fail('budget_corrupt');}
     else if(s)fail('budget_anchor_missing');
     else if(mode==='live')s=initialize(initialization,grant);
     else{s=emptyState({ledgerId:randomUUID(),accountId:'SIMULATED-ONLY',id:'SIMULATED-AUTO-INIT'});const g={id:'legacy-dry',kind:'legacy-dry',approved:true,accountId:s.accountId,ledgerId:s.ledgerId,priceVersion:price.version,issuedAt:0,expiresAt:Number.MAX_SAFE_INTEGER,maxRequests,maxUsdMicros:cap,maxCnyMicros:1000000000,balanceCnyMicros:1000000000,balanceVerifiedAt:0,baselineCnyMicros:0};s.grants=[g];s.activeGrant=g.id;}
     await ownLock();const result=await fn(s);s.metrics=amounts(s.entries);s.revision++;validateState(s);await ownLock();await persist(canonical,s);await ownLock();
     await setAnchor({accountId:s.accountId,ledgerId:s.ledgerId,path:canonical,revision:s.revision,digest:digest(s),initializationId:s.initializationId});await ownLock();return result;
    };
    if(mode==='live'){if(!hasControl){const s=await readJson(canonical);if(s)validateState(s);fail('trusted_anchor_required');}return await trustedControl.transaction(accountId,run);}
    const anchor=await readJson(canonical+'.anchor');return await run(anchor,a=>persist(canonical+'.anchor',a));
   }finally{await lock.close();try{const s=await lstat(canonical+'.lock');if(s.ino===lockStat.ino&&s.dev===lockStat.dev)await unlink(canonical+'.lock');}catch{}}
  });queue=work.catch(()=>{});return work;
 }
 const active=s=>s.grants.find(g=>g.id===s.activeGrant);
 function available(s,g){
  if(s.halted||s.entries.some(e=>['reserved','dispatched','uncertain'].includes(e.status)))fail('budget_halted');if(g.issuedAt>now()||g.expiresAt<=now())fail('batch_expired');
  const total=amounts(s.entries),batch=amounts(s.entries.filter(e=>e.grantId===g.id));if(total.requests>=maxRequests||total.usd+reserve>cap||batch.requests>=g.maxRequests||batch.usd+reserve>g.maxUsdMicros||batch.cny+reserveRmb>g.maxCnyMicros||total.cny-g.baselineCnyMicros+reserveRmb>g.balanceCnyMicros)fail('budget_exhausted',429);
 }
 return Object.freeze({mode,hasTrustedControl:hasControl,
  initialize(authorization,grant){if(mode!=='live')fail('initialization_authorization');return transaction(s=>{if(s.entries.length||s.initializationId!==authorization?.id)fail('initialization_reused');return {ledgerId:s.ledgerId,grantId:s.activeGrant};},{initialization:authorization,grant});},
  addBatch(grant){return transaction(s=>{if(s.halted||s.entries.some(e=>['reserved','dispatched','uncertain'].includes(e.status)))fail('budget_halted');const g=grantFrom(grant,s);s.grants.push(g);s.activeGrant=g.id;return {grantId:g.id,requests:amounts(s.entries).requests};});},
  reserve(requestId,step){return transaction(s=>{if(!text(requestId)||!integer(step))fail('budget_request');if(s.entries.some(e=>e.requestId===requestId&&e.step===step))fail('budget_duplicate',409);const g=active(s);available(s,g);const id=randomUUID();s.entries.push({id,requestId,step,status:'reserved',reservedMicros:reserve,reservedCnyMicros:reserveRmb,actualMicros:null,actualCnyMicros:null,usage:null,providerId:null,grantId:g.id,priceVersion:price.version,priceDigest:digest(price),createdAt:now(),dispatchedAt:null,dispatchUsed:false});return id;});},
  markDispatched(id){return transaction(s=>{const e=s.entries.find(e=>e.id===id),g=active(s);if(!e||e.status!=='reserved'||e.grantId!==g.id||s.halted)fail('budget_ticket');if(g.expiresAt<=now())fail('batch_expired');e.status='dispatched';e.dispatchedAt=now();const permit=Object.freeze({id,grantId:g.id,requestId:e.requestId,step:e.step,priceVersion:e.priceVersion});permits.add(permit);return permit;});},
  consumePermit(permit,grantId){if(mode!=='live'||!permits.has(permit))return Promise.reject(new ContractError('dispatch_not_authorized',503));permits.delete(permit);return transaction(s=>{const e=s.entries.find(e=>e.id===permit.id),g=active(s);if(!e||e.status!=='dispatched'||e.dispatchUsed||e.grantId!==grantId||g.id!==grantId||g.expiresAt<=now()||s.halted)fail('dispatch_not_authorized');e.dispatchUsed=true;return true;});},
  settle(id,usage,providerId){return transaction(s=>{const e=s.entries.find(x=>x.id===id);if(!e||!['reserved','dispatched'].includes(e.status)||mode==='live'&&!e.dispatchUsed)fail('budget_ticket');const u=normalizeUsage(usage);if(!u||!text(providerId)){e.status='uncertain';s.halted=true;return {halted:true};}e.status='settled';e.usage=u;e.providerId=providerId;e.actualMicros=costMicros(u,price.usd);e.actualCnyMicros=costMicros(u,price.cny);return {halted:s.halted,costMicros:e.actualMicros,costCnyMicros:e.actualCnyMicros};});},
  uncertain(id){return transaction(s=>{const e=s.entries.find(x=>x.id===id);if(!e||!['reserved','dispatched'].includes(e.status))fail('budget_ticket');e.status='uncertain';s.halted=true;});},
  snapshot(){return transaction(s=>{const a=amounts(s.entries),g=active(s),b=amounts(s.entries.filter(e=>e.grantId===g.id));return {mode,ledgerId:s.ledgerId,requests:a.requests,committedUsd:a.usd/1e6,committedCny:a.cny/1e6,halted:s.halted||s.entries.some(e=>['reserved','dispatched','uncertain'].includes(e.status)),activeBatch:{id:g.id,kind:g.kind,requests:b.requests,maxRequests:g.maxRequests,committedUsd:b.usd/1e6,committedCny:b.cny/1e6,maxCny:g.maxCnyMicros/1e6},entries:structuredClone(s.entries)};});}
 });
}
