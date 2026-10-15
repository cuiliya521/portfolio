import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createBudget} from '../../experiments/agent-r1a/budget.mjs';
import {createDeepSeekAdapter} from '../../experiments/agent-r1a/adapters/deepseek.mjs';
import {buildKnowledge,proposeNavigation} from '../../experiments/agent-r1a/core.mjs';
const temp=await mkdtemp(join(tmpdir(),'cui-r5-audit-'));
const results=[];
const usage={prompt_tokens:400,completion_tokens:120,total_tokens:520};
const budget=(name,options={})=>createBudget({path:join(temp,name+'.json'),...options});
async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
await check('reservation persists before transport',async()=>{const b=budget('before');let calls=0;const a=createDeepSeekAdapter({budget:b,transport:{mode:'dry-wire',async send(){calls++;const s=await b.snapshot();assert.equal(s.requests,1);assert.equal(s.committedUsd,.01);return {id:'SIMULATED',usage,choices:[{finish_reason:'stop',message:{role:'assistant',content:'{"blocks":[],"unknown":true,"navigation":null}'}}]};}}});await a.run({requestId:'x',messages:[{role:'user',content:'unknown'}]},{},new AbortController().signal);assert.equal(calls,1);});
await check('80 cumulative HTTP reservations; 81 blocked after restart',async()=>{const b=budget('80');for(let i=0;i<80;i++){const id=await b.reserve('q'+i,1);await b.settle(id,usage,'SIMULATED');}assert.equal((await budget('80').snapshot()).requests,80);await assert.rejects(()=>budget('80').reserve('81',1),e=>e.code==='budget_exhausted');});
await check('configured 6 cap survives restart without resetting',async()=>{const b=budget('6',{maxRequests:6});for(let i=0;i<6;i++){const t=await b.reserve('q',i);await b.settle(t,usage,'SIMULATED');}await assert.rejects(()=>budget('6',{maxRequests:6}).reserve('q',7),e=>e.code==='budget_exhausted');});
await check('first-batch cap cannot change to 80 on same ledger',async()=>{await assert.rejects(()=>budget('6').snapshot(),e=>e.code==='budget_corrupt');});
await check('money cap blocks before reserve',async()=>{await assert.rejects(()=>budget('small',{maxUsd:.005}).reserve('x',1),e=>e.code==='budget_exhausted');});
await check('missing usage retains reservation and stops',async()=>{const b=budget('no-usage'),t=await b.reserve('x',1);assert.equal((await b.settle(t,null,'SIM')).halted,true);const s=await b.snapshot();assert.equal(s.requests,1);assert.equal(s.committedUsd,.01);await assert.rejects(()=>b.reserve('x',2));});
await check('HTTP failure counted once; no automatic retry',async()=>{const b=budget('failure');let calls=0;const a=createDeepSeekAdapter({budget:b,transport:{mode:'dry-wire',async send(){calls++;throw new Error('SIMULATED_FAILURE');}}});await assert.rejects(()=>a.run({requestId:'f',messages:[{role:'user',content:'x'}]},{},new AbortController().signal));assert.equal(calls,1);assert.equal((await b.snapshot()).requests,1);assert.equal((await b.snapshot()).halted,true);});
await check('cancel after send retains reservation; no follow-up',async()=>{const b=budget('cancel'),c=new AbortController();let calls=0;const a=createDeepSeekAdapter({budget:b,transport:{mode:'dry-wire',async send(){calls++;c.abort();throw new Error('SIM_CANCEL');}}});await assert.rejects(()=>a.run({requestId:'c',messages:[{role:'user',content:'x'}]},{},c.signal));assert.equal(calls,1);assert.equal((await b.snapshot()).committedUsd,.01);});
await check('unknown negative NaN rates rejected',()=>{for(const rates of [{inputPerMillion:0,outputPerMillion:1},{inputPerMillion:-1,outputPerMillion:1},{inputPerMillion:NaN,outputPerMillion:1}])assert.throws(()=>budget('rates',{rates}));});
await check('under-reservation rejected',()=>assert.throws(()=>budget('under',{reserveUsd:.001}),e=>e.code==='budget_under_reserved'));
await check('invalid JSON and duplicate entry IDs fail closed',async()=>{await writeFile(join(temp,'bad.json'),'broken');await assert.rejects(()=>budget('bad').snapshot());const b=budget('duplicate');const t=await b.reserve('x',1);await b.settle(t,usage,'SIM');const s=JSON.parse(await readFile(join(temp,'duplicate.json')));s.entries.push(s.entries[0]);await writeFile(join(temp,'duplicate.json'),JSON.stringify(s));await assert.rejects(()=>b.snapshot());});
await check('unsettled restart refuses next request',async()=>{await budget('unfinished').reserve('x',1);await assert.rejects(()=>budget('unfinished').reserve('x',2),e=>e.code==='budget_halted');});
await check('same-process 24 reservations admit only one',async()=>{const b=budget('parallel');const r=await Promise.allSettled(Array.from({length:24},(_,i)=>b.reserve('x'+i,1)));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await b.snapshot()).requests,1);});
await check('separate-process shared-path cap cannot be exceeded',async()=>{
 const path=join(temp,'multiprocess.json'),moduleURL=new URL('../../experiments/agent-r1a/budget.mjs',import.meta.url).href;
 const script=`import {createBudget} from ${JSON.stringify(moduleURL)};const b=createBudget({path:${JSON.stringify(path)},maxRequests:6});for(let i=0;i<20;i++){try{const t=await b.reserve('child',i);await b.settle(t,${JSON.stringify(usage)},'SIM');}catch{}}`;
 await Promise.all(Array.from({length:4},()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',script],{env:{PATH:'/usr/bin:/bin'},stdio:'ignore'});child.once('exit',code=>code===0?resolve():reject(new Error('child failure')));})));const s=await budget('multiprocess',{maxRequests:6}).snapshot();assert(s.requests<=6);assert(s.committedUsd<=2);
});
await check('stale file lock blocks rather than resets',async()=>{await writeFile(join(temp,'locked.json.lock'),'simulation');await assert.rejects(()=>budget('locked').reserve('x',1),e=>e.code==='budget_locked');});
await check('dry ledger cannot be reused as actual-charge ledger',async()=>{await budget('mode').snapshot();await assert.rejects(()=>budget('mode',{mode:'live'}).snapshot(),e=>e.code==='budget_corrupt');});
// These assertions encode required safety, deliberately exposing gaps, not fixing code.
await check('SAFETY: deleted previously used ledger must fail closed',async()=>{const b=budget('deleted'),t=await b.reserve('x',1);await b.settle(t,usage,'SIM');await unlink(join(temp,'deleted.json'));await assert.rejects(()=>budget('deleted').reserve('y',1));});
await check('SAFETY: settled entry with null actual must be rejected',async()=>{const b=budget('bad-state'),t=await b.reserve('x',1);await b.settle(t,usage,'SIM');const path=join(temp,'bad-state.json'),s=JSON.parse(await readFile(path));s.entries[0].actualMicros=null;await writeFile(path,JSON.stringify(s));await assert.rejects(()=>b.snapshot());});
await check('SAFETY: positive but unverified cheap prices must fail closed',async()=>{assert.throws(()=>budget('cheap',{rates:{inputPerMillion:.000001,outputPerMillion:.000001}}));});
await check('SAFETY: valid-looking negative integer reasoning usage must halt',async()=>{const b=budget('negative-reasoning'),t=await b.reserve('x',1);assert.equal((await b.settle(t,{...usage,completion_tokens_details:{reasoning_tokens:-1}},'SIM')).halted,true);});
await check('SAFETY: root hash page cannot borrow another project source',async()=>{
 const dir=new URL('../../experiments/agent-r1a/knowledge/',import.meta.url);
 const k=buildKnowledge(JSON.parse(await readFile(new URL('candidates.json',dir))),JSON.parse(await readFile(new URL('approval-ledger.json',dir))));
 assert.throws(()=>proposeNavigation(k,{pageId:'pangu',stage:null,reason:'wrong source audit',evidenceIds:['SRC-NOTEGUARD']}));
});
const out=process.env.R1A_EVIDENCE_DIR||resolve('r5-0-evidence');await mkdir(out,{recursive:true});await writeFile(join(out,'budget-audit.json'),JSON.stringify({results,summary:{passed:results.filter(x=>x.pass).length,total:results.length},actualModelHttpRequests:0,actualProviderSpendUsd:0,allUsage:'synthetic, not supplier charges',temporaryLedgerRoot:temp},null,2));console.log(JSON.stringify({suite:'R5-0 budget audit',passed:results.filter(x=>x.pass).length,total:results.length,findings:results.filter(x=>!x.pass)}));
