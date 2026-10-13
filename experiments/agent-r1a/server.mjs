import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, extname, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { buildKnowledge,createToolbox,exactObject,enumValue,boundedText,issueProposal,decideProposal,ContractError } from './core.mjs';
import { createAdapter,runAdapter } from './adapters/index.mjs';
import { FIXTURES } from './adapters/mock.mjs';

const here=dirname(fileURLToPath(import.meta.url)),repo=resolve(here,'../..');
const knowledge=buildKnowledge(JSON.parse(await readFile(resolve(here,'knowledge/candidates.json'),'utf8')),JSON.parse(await readFile(resolve(here,'knowledge/approval-ledger.json'),'utf8')));
const adapter=createAdapter({mode:process.env.R1A_ADAPTER||'mock'});
const port=Number(process.env.PORT||4177),origin=`http://127.0.0.1:${port}`;
const timeoutMs=Number(process.env.R1A_TIMEOUT_MS||5000),ttl=Number(process.env.R1A_PROPOSAL_TTL_MS||60000);
const sessions=new Map();
const publicError=error=>error instanceof ContractError?error:new ContractError('adapter_unavailable',502);
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
function sessionFor(req){const id=req.headers.cookie?.match(/(?:^|;\s*)r1a_session=([^;]+)/)?.[1];return id?sessions.get(id):null;}
async function body(req){let bytes=0,parts=[];for await(const part of req){bytes+=part.length;if(bytes>20000)throw new ContractError('body_too_large',413);parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new ContractError('invalid_json');}}
function validateChat(data){
  exactObject(data,['requestId','messages','fixtureId','csrf']);
  if(!/^[\w-]{8,80}$/.test(data.requestId))throw new ContractError('invalid_parameters');
  enumValue(data.fixtureId,FIXTURES);
  if(!Array.isArray(data.messages)||!data.messages.length||data.messages.length>12)throw new ContractError('invalid_parameters');
  let total=0;data.messages.forEach(m=>{exactObject(m,['role','content']);enumValue(m.role,['user','assistant']);boundedText(m.content);total+=m.content.length;});
  if(total>6000||data.messages.at(-1).role!=='user')throw new ContractError('invalid_parameters');
}
async function staticFile(req,res,path){
  let file;
  if(path==='/experiments/agent-r1a/'||path==='/experiments/agent-r1a/index.html')file=resolve(here,'public/index.html');
  else if(path.startsWith('/experiments/agent-r1a/')){
    const name=path.slice('/experiments/agent-r1a/'.length);
    if(!['ui.js','style.css','interaction-compat.js'].includes(name))throw new ContractError('not_found',404);
    file=resolve(here,'public',name);
  }else{
    const decoded=decodeURIComponent(path);if(decoded.includes('..')||decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').some(x=>x.startsWith('.')))throw new ContractError('not_found',404);
    file=resolve(repo,'.'+decoded+(decoded.endsWith('/')?'index.html':''));
    if(!file.startsWith(repo+sep)||!['.html','.js','.css','.png','.jpg','.jpeg','.webp','.svg','.woff','.woff2','.pdf'].includes(extname(file)))throw new ContractError('not_found',404);
  }
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.pdf':'application/pdf'};
  let bytes;try{bytes=await readFile(file);}catch{throw new ContractError('not_found',404);}
  const headers={'Content-Type':types[extname(file)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'};
  if(file.startsWith(resolve(here,'public')+sep))headers['Content-Security-Policy']="default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  res.writeHead(200,headers);res.end(bytes);
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!==`127.0.0.1:${port}`)throw new ContractError('host_denied',403);
    const url=new URL(req.url,origin),path=url.pathname;
    if(req.method==='GET'&&path==='/__r1a__/bootstrap'){
      let session=sessionFor(req);
      if(!session){
        for(const [id,s] of sessions)if(Date.now()-s.created>3600000){s.active?.controller.abort('expired');sessions.delete(id);}
        if(sessions.size>=50)throw new ContractError('capacity',429);
        session={id:randomUUID(),csrf:randomUUID(),created:Date.now(),requests:new Map(),proposals:new Map(),active:null};sessions.set(session.id,session);
        res.setHeader('Set-Cookie',`r1a_session=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);
      }
      return send(res,200,{mode:'mock-only',adapter:adapter.id,knowledgeVersion:knowledge.version,approvedCount:knowledge.approved.size,candidateCount:knowledge.candidateCount,csrf:session.csrf,timeoutMs});
    }
    if(path.startsWith('/__r1a__/')){
      if(req.method!=='POST')throw new ContractError('method_not_allowed',405);
      if(req.headers.origin!==origin)throw new ContractError('origin_denied',403);
      if(!(req.headers['content-type']||'').startsWith('application/json'))throw new ContractError('invalid_content_type',415);
      const session=sessionFor(req);if(!session)throw new ContractError('session_required',403);
      const data=await body(req);if(data?.csrf!==session.csrf)throw new ContractError('csrf_denied',403);
      if(path==='/__r1a__/chat'){
        validateChat(data);
        const fingerprint=createHash('sha256').update(JSON.stringify({messages:data.messages,fixtureId:data.fixtureId})).digest('hex');
        const old=session.requests.get(data.requestId);
        if(old){if(old.fingerprint!==fingerprint)throw new ContractError('request_conflict',409);if(old.status==='done')return send(res,200,{...old.response,cached:true});throw new ContractError(old.status==='pending'?'duplicate_request':'request_closed',409);}
        if(session.active)throw new ContractError('request_busy',429);
        if(session.requests.size>=30)throw new ContractError('session_limit',429);
        const controller=new AbortController(),record={fingerprint,status:'pending'};session.requests.set(data.requestId,record);session.active={id:data.requestId,controller};
        const timer=setTimeout(()=>controller.abort('timeout'),timeoutMs);
        const toolbox=createToolbox(knowledge,{signal:controller.signal});
        try{
          const reply=await runAdapter(adapter,{fixtureId:data.fixtureId,messages:structuredClone(data.messages),requestId:data.requestId},toolbox.tools,controller.signal);
          if(controller.signal.aborted)throw new ContractError('request_cancelled',409);
          const validated=toolbox.validate(reply);
          const proposal=validated.navigation?issueProposal(session,data.requestId,validated.navigation,ttl):null;
          const response={requestId:data.requestId,mode:'mock-only',adapter:adapter.id,knowledgeVersion:knowledge.version,blocks:validated.blocks,sources:validated.sources,unknown:validated.unknown,message:validated.message,proposal,toolTrace:toolbox.trace};
          record.status='done';record.response=response;send(res,200,response);
        }catch(error){record.status=controller.signal.reason==='timeout'?'timeout':controller.signal.aborted?'cancelled':'failed';throw error;}
        finally{clearTimeout(timer);if(session.active?.id===data.requestId)session.active=null;}
        return;
      }
      if(path==='/__r1a__/cancel'){
        exactObject(data,['requestId','csrf']);boundedText(data.requestId,80);
        if(session.active?.id===data.requestId)session.active.controller.abort('cancelled');
        // Cancelling after completion invalidates proposals too; late responses cannot navigate.
        for(const p of session.proposals.values())if(p.requestId===data.requestId&&p.status==='pending')p.status='cancelled';
        return send(res,200,{status:'cancelled',requestId:data.requestId});
      }
      if(path==='/__r1a__/navigation'){
        exactObject(data,['proposalId','decision','csrf']);return send(res,200,decideProposal(session,{proposalId:data.proposalId,decision:data.decision}));
      }
      throw new ContractError('not_found',404);
    }
    if(req.method!=='GET')throw new ContractError('method_not_allowed',405);
    await staticFile(req,res,path);
  }catch(error){const safe=publicError(error);if(!res.headersSent)send(res,safe.status,{error:safe.code,mode:'mock-only'});else res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({event:'ready',origin,prototype:origin+'/experiments/agent-r1a/',mode:'mock-only',approved:knowledge.approved.size,candidates:knowledge.candidateCount})));
function shutdown(){for(const s of sessions.values())s.active?.controller.abort('shutdown');server.close(()=>process.exit(0));}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
