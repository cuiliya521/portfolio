import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve(process.env.R1A_EVIDENCE_DIR||'r5-0d-evidence'),runs=[];await mkdir(out,{recursive:true});
const suites=[['contracts','experiments/agent-r1a/tests/contracts.mjs'],['http','experiments/agent-r1a/tests/http.mjs'],['b1','experiments/agent-r1a/tests/b1.mjs'],['r5-0','validation/r5-0/budget-audit.mjs'],['r5-0a','validation/r5-0a/boundaries.mjs'],['postgres-double','validation/r5-0d/postgres-contracts.mjs'],['invariants','validation/r5-0d/invariants.mjs'],['postgres-real-status','validation/r5-0d/postgres-integration.mjs']];
for(const [name,file] of suites){
 const directory=resolve(out,name);await mkdir(directory,{recursive:true});
 const result=await new Promise(r=>{let stdout='',stderr='';const p=spawn(process.execPath,[file],{env:{PATH:process.env.PATH,R1A_EVIDENCE_DIR:directory,NODE_OPTIONS:'--import='+resolve('validation/r5-0/network-guard.mjs')},stdio:['ignore','pipe','pipe']});p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);p.on('error',e=>r({exitCode:-1,stdout,stderr:String(e)}));p.on('exit',(code,signal)=>r({exitCode:code,signal,stdout,stderr}));});
 await writeFile(resolve(directory,'stdout.log'),result.stdout);await writeFile(resolve(directory,'stderr.log'),result.stderr);
 runs.push({name,file,...result});console.log(JSON.stringify({name,exitCode:result.exitCode,output:result.stdout.trim()}));
}
await writeFile(resolve(out,'raw-runs.json'),JSON.stringify({runs,externalFetchBlocked:true,realPostgresExecuted:false,browserRetest:'NOT RUN: Chromium binary absent; 15 previous B1 browser assertions not counted',actualModelRequests:0,actualFees:0},null,2));if(runs.some(r=>r.exitCode!==0))process.exitCode=1;
