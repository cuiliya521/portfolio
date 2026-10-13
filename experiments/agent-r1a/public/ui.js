import { createInteractionCoordinator } from './interaction-compat.js';
const $=id=>document.getElementById(id),dialog=$('agent-dialog'),reader=$('reader-dialog');
let bootstrap=null,active=null,epoch=0,proposal=null,lastRequest=null,navBusy=false,hostEsc=0;
const errorLabels={request_timeout:'请求超时；没有执行导航。',request_cancelled:'请求已取消。',adapter_unavailable:'模拟 API 不可用；冻结页面仍可访问。',invalid_parameters:'参数不合法。',adapter_contract:'适配器响应不符合契约。',untrusted_adapter_output:'响应事实或引用未通过批准校验。',untrusted_navigation:'导航提议未通过校验。',invalid_navigation:'非法导航目标已阻止。',proposal_expired:'提议已过期，未导航。',proposal_used:'提议已使用或拒绝，未重复导航。',request_busy:'已有请求正在执行。',duplicate_request:'重复请求已阻止。'};
function status(text,error=false){$('request-status').textContent=text;$('request-status').dataset.error=String(error);}
async function post(path,data,signal){
  const response=await fetch('/__r1a__/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,csrf:bootstrap.csrf}),signal});
  const value=await response.json();if(!response.ok)throw new Error(value.error||'adapter_unavailable');return value;
}
function busy(value){$('send').disabled=value;$('cancel').disabled=!value;}
async function stopWork(){
  epoch++;
  const request=active;active=null;request?.controller.abort();busy(false);
  const id=request?.id||lastRequest;
  if(id&&bootstrap)post('cancel',{requestId:id}).catch(()=>{});
  proposal=null;navBusy=false;$('navigation').replaceChildren();status('已关闭或取消；任何晚到响应都不会执行。');
}
const coordinator=createInteractionCoordinator({dialog,fallback:$('open-agent'),canOpen:()=>!!bootstrap,onClose:stopWork});
$('open-agent').addEventListener('click',event=>{if(coordinator.open(event.currentTarget))$('message').focus();});
$('close-agent').addEventListener('click',()=>coordinator.close('close-button'));
$('open-reader').addEventListener('click',()=>reader.showModal());
$('close-reader').addEventListener('click',()=>reader.close());
$('reader-attempt').addEventListener('click',()=>{$('reader-result').textContent=coordinator.open($('reader-attempt'))?'unexpected':'已有阅读器，Agent 保持关闭。';});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){$('host-status').textContent=`宿主 Esc 返回意图：${++hostEsc}`;}});
$('cancel').addEventListener('click',stopWork);
function safeSourcePath(path){
  const url=new URL(path,location.origin);
  const paths=['/','/content-archive/','/noteguard-case/','/capability-lab/','/about-contact/'];
  if(url.origin!==location.origin||!paths.includes(url.pathname)||url.search||!['','#hero','#cui-workspace','#cui-pangu','#a','#b','#c','#d'].includes(url.hash))throw new Error('untrusted_navigation');return url.pathname+url.hash;
}
function render(result){
  $('reply').replaceChildren();$('references').replaceChildren();$('navigation').replaceChildren();
  if(result.unknown){const p=document.createElement('p');p.textContent=result.message;$('reply').append(p);}
  for(const block of result.blocks){const p=document.createElement('p');p.textContent=block.text;p.dataset.factId=block.factId;$('reply').append(p);}
  for(const source of result.sources){const div=document.createElement('div');div.className='source';div.dataset.sourceId=source.id;const p=document.createElement('p');p.textContent=`${source.id} · ${source.title} · ${source.baseline.slice(0,7)}`;const a=document.createElement('a');a.href=safeSourcePath(source.path);a.textContent='手动查看这份冻结证据';div.append(p,a);$('references').append(div);}
  $('trace').textContent=JSON.stringify(result.toolTrace,null,2);
  proposal=result.proposal;
  if(proposal){
    const div=document.createElement('div');div.className='proposal';const p=document.createElement('p');p.textContent=`待你确认：${proposal.reason}（${proposal.pageId}${proposal.stage?' / '+proposal.stage:''}）。未确认不会打开。`;
    const row=document.createElement('div');row.className='actions';const yes=document.createElement('button');yes.id='nav-confirm';yes.textContent='确认打开项目';const no=document.createElement('button');no.id='nav-reject';no.textContent='暂不打开';
    yes.addEventListener('click',event=>decide(event,'confirm'));no.addEventListener('click',event=>decide(event,'reject'));row.append(yes,no);div.append(p,row);$('navigation').append(div);
  }
}
async function decide(event,decision){
  if(!event.isTrusted||navBusy||!proposal)return;
  navBusy=true;const id=proposal.id;$('nav-confirm').disabled=true;$('nav-reject').disabled=true;
  try{
    const result=await post('navigation',{proposalId:id,decision});
    if(proposal?.id!==id||!dialog.open)return;
    proposal=null;
    if(result.status==='confirmed'){
      const destination=safeSourcePath(result.destination);coordinator.beforeNavigation();location.assign(destination);
    }else{$('navigation').replaceChildren();status('已拒绝导航，仍在当前实验页面。');}
  }catch(error){proposal=null;$('navigation').replaceChildren();status(errorLabels[error.message]||'导航失败，未打开页面。',true);}
  finally{navBusy=false;}
}
$('chat-form').addEventListener('submit',async event=>{
  event.preventDefault();if(active||!bootstrap||!dialog.open)return;
  const question=$('message').value.trim();if(!question){status('请输入问题。',true);return;}
  if(proposal){const old=proposal;proposal=null;post('navigation',{proposalId:old.id,decision:'reject'}).catch(()=>{});}
  const id=crypto.randomUUID(),controller=new AbortController(),ticket=++epoch;active={id,controller};lastRequest=id;busy(true);$('reply').replaceChildren();$('references').replaceChildren();$('navigation').replaceChildren();status('MOCK · 正在执行可控场景与真实检索工具…');
  try{
    const result=await post('chat',{requestId:id,messages:[{role:'user',content:question}],fixtureId:$('fixture').value},controller.signal);
    if(ticket!==epoch||!dialog.open||result.requestId!==id)return;
    if(result.mode!=='mock-only')throw new Error('adapter_contract');render(result);status('MOCK · 已完成程序校验；不是模型能力验收。');
  }catch(error){if(ticket!==epoch)return;status(error.name==='AbortError'?'请求已取消。':errorLabels[error.message]||'模拟请求失败；未执行导航。',true);}
  finally{if(active?.id===id){active=null;busy(false);}}
});
try{
  const response=await fetch('/__r1a__/bootstrap',{cache:'no-store'}),value=await response.json();
  if(!response.ok||value.mode!=='mock-only'||value.adapter!=='mock-scripted-v1')throw new Error('local_service_required');
  bootstrap=value;$('open-agent').disabled=false;$('boot-status').textContent=`本地 mock 已连接 · ${value.approvedCount}/${value.candidateCount} 候选卡允许检索 · 无模型费用。`;
}catch{$('boot-status').textContent='本地实验服务未连接。实验对话保持关闭；未部署后端，也不会调用模型。';}
