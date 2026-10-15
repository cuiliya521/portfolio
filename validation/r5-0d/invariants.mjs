import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const results=[];const agent='4ba21c96e8b6208c0de5c90d00525c9b658ce407',site='df0c74967b8eeebc7607b5f86ac20022da997f57';
const read=p=>readFile(p,'utf8'),git=(...args)=>execFileSync('git',args,{encoding:'utf8'});
const original=git('show',agent+':experiments/agent-r1a/budget.mjs'),current=await read('experiments/agent-r1a/budget.mjs');
function check(name,fn){try{fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}}
check('frozen state/grant/price/accounting validation block byte-identical',()=>{assert.equal(current.slice(current.indexOf(' const amounts='),current.indexOf(' async function transaction(')),original.slice(original.indexOf(' const amounts='),original.indexOf(' async function transaction(')));});
check('frozen availability and all public budget operations byte-identical',()=>assert.equal(current.slice(current.indexOf(' const active=')),original.slice(original.indexOf(' const active='))));
check('budget engine has no direct file I/O',()=>assert(!/node:fs|readJson\(|persist\(|\.lock/.test(current)));
const src=git('ls-tree','-r','--name-only',agent,'--','experiments/agent-r1a').trim().split('\n');
for(const p of src.filter(x=>!x.endsWith('/budget.mjs'))){const bytes=await readFile(p);check('frozen Agent file unchanged '+p,()=>assert.equal(createHash('sha256').update(bytes).digest('hex'),createHash('sha256').update(execFileSync('git',['show',agent+':'+p])).digest('hex')));}
const paths=git('ls-tree','-r','-z','--name-only',site).split('\0').filter(Boolean);
check('all '+paths.length+' tracked R4-C files byte-identical; seven-page scope preserved',()=>{for(const p of paths){const b=execFileSync('git',['hash-object','--',p],{encoding:'utf8'}).trim(),expected=git('rev-parse',site+':'+p).trim();assert.equal(b,expected,p);}});
const sql=await read('experiments/agent-r1a/sql/001-budget.sql'),pg=await read('experiments/agent-r1a/storage/postgres.mjs');
check('SQL plan has row locks, revision CAS and session-user binding (static only)',()=>assert(sql.includes('FOR UPDATE')&&sql.includes('r.revision<>p_revision')&&sql.includes('r.runtime_role<>session_user')));
check('SQL runtime has no table write or admin grant (static only)',()=>{assert(sql.includes('REVOKE ALL ON ALL TABLES'));assert(!/GRANT\s+(ALL|INSERT|UPDATE|DELETE|TRUNCATE|CREATE)\b/i.test(sql));});
check('SQL audit and state written inside the same function (static only)',()=>assert(sql.indexOf('INSERT INTO cui_budget.audit')<sql.indexOf('UPDATE cui_budget.accounts SET')));
check('SQL text preserves frozen digest serialization (static only)',()=>assert(sql.includes("sha256(convert_to(p_state,'UTF8'))")&&sql.includes('state_text text')));
check('no API key, model transport, env or credential lookup in stores',()=>assert(!/process\.env|api\.deepseek|fetch\(|https?:\/\//.test(pg)));
const summary={pass:results.filter(x=>x.pass).length,fail:results.filter(x=>!x.pass).length,total:results.length},out=process.env.R1A_EVIDENCE_DIR||resolve('r5-0d-evidence');await mkdir(out,{recursive:true});await writeFile(resolve(out,'invariants.json'),JSON.stringify({classification:'source hashes and static checks; NOT SQL execution',results,summary,websiteFrozenFileCount:paths.length},null,2));console.log(JSON.stringify({suite:'R5-0D invariants',...summary,websiteFrozenFileCount:paths.length,failures:results.filter(x=>!x.pass)}));if(summary.fail)process.exitCode=1;
