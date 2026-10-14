/* Static portfolio evidence. No API calls and no live audit or adoption. */
const CUI_ASSET = 'assets/CUI_图五_托下巴_分镜B像素提取_非原始.png';
document.getElementById('cui').src = CUI_ASSET;
const states={
 a:['01 / 风险识别','先看原文中的风险位置，再看系统如何解释。','先看看原文里有哪些风险。','NoteGuard AI / 原文风险识别','真实产品界面裁切','图五分镜 A · 真实原文审核截图 + 独立展示层'],
 b:['02 / 查看 AI 建议','原文不被覆盖，建议稿作为独立版本等待人工确认。','先看看 AI 给出的建议吧。','NoteGuard AI / 独立建议稿','真实产品界面截取','图五分镜 B · 真实 UI 证据 + 独立叙事层 · 非实时审核'],
 c:['03 / 人工决策','拒绝、直接采用或修改后采用：AI 不替你按下确认。','最后由你来决定。','NoteGuard AI / 人工确认','审核交互分镜','图五分镜 C · 真实截图与网页展示层分开呈现'],
 d:['04 / 采用后复检','AI 先识别潜在问题，给出修改建议，但最终决定权始终在你手中。','修改之后，再检查一次。','NoteGuard AI / 内容审核工作台','04 采用后复检','真实复检记录 · 未发现明显风险不等于保证合规']
};
const ids=['stageTitle','stageSubtitle','cuiCaption','windowTitle','windowMeta','sourceNote'];
const scene=document.querySelector('.scene'),tabs=[...document.querySelectorAll('[role="tab"]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:740px)');
const windowFrame=document.querySelector('.product-window'),trace=document.getElementById('traceFocus');
let running=[],outgoing=null,serial=0;
const summaries={a:'AI 先指出问题，不直接改写原文。',b:'原文保留，AI 建议是独立候选稿。',c:'最终决定权交还给人。',d:'采用不是终点，还要重新检查。'};
function cleanup(){running.forEach(a=>a.cancel());running=[];outgoing?.remove();outgoing=null;windowFrame.style.height='';scene.dataset.traceMotion='idle';}
function select(key,{animate=true,writeHistory=true}={}){
 if(!states[key])key='a';const previous=scene.dataset.stage;
 const old=document.getElementById('stage-'+previous),oldRect=old.getBoundingClientRect(),frameRect=windowFrame.getBoundingClientRect(),oldHeight=windowFrame.offsetHeight;
 const beforeTrace=getComputedStyle(trace).transform;const clone=animate&&previous!==key?old.cloneNode(true):null;
 cleanup();const ticket=++serial;scene.dataset.stage=key;
 ids.forEach((id,i)=>document.getElementById(id).textContent=states[key][i]);
 document.getElementById('stageSubtitle').textContent=summaries[key];document.getElementById('windowTitle').textContent='NoteGuard AI / 审阅轨迹';
 document.getElementById('windowMeta').textContent={a:'原文 · 风险定位',b:'候选稿 · 待人工确认',c:'由人决定 · 查看记录',d:'最终稿 · 已复检记录'}[key];
 tabs.forEach(t=>{const active=t.dataset.stage===key;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active});
 document.querySelectorAll('[data-trace]').forEach(el=>{if(el.dataset.trace===key)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current')});
 const index=['a','b','c','d'].indexOf(key);trace.style.transform=`translateX(${index*100}%)`;
 if(writeHistory)history.replaceState({...history.state,stage:key},'', '#'+key);
 const active=document.getElementById('stage-'+key);
 if(old.contains(document.activeElement)&&previous!==key)tabs[index].focus({preventScroll:true});
 const duration=animate&&previous!==key&&!reduced.matches?(mobile.matches?180:300):0;
 if(!duration){clone?.remove();return;}
 if(clone){clone.removeAttribute('id');clone.classList.add('trace-outgoing');clone.inert=true;clone.setAttribute('aria-hidden','true');clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));clone.querySelectorAll('button').forEach(el=>el.disabled=true);clone.querySelectorAll('[tabindex]').forEach(el=>el.tabIndex=-1);Object.assign(clone.style,{position:'absolute',left:(oldRect.left-frameRect.left-windowFrame.clientLeft)+'px',top:(oldRect.top-frameRect.top-windowFrame.clientTop)+'px',width:oldRect.width+'px',height:oldRect.height+'px',margin:'0',right:'auto',bottom:'auto'});windowFrame.append(clone);outgoing=clone;}
 const targetHeight=windowFrame.offsetHeight;
 const opts={duration,easing:'cubic-bezier(.22,.7,.2,1)',fill:'both'};
 if(clone)running.push(clone.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-5px)',offset:.5},{opacity:0}],opts));
 running.push(active.animate([{opacity:0,transform:'translateY(6px)'},{opacity:0,offset:.16},{opacity:1,transform:'none'}],opts));
 running.push(trace.animate([{transform:beforeTrace},{transform:trace.style.transform}],opts));
 if(mobile.matches){windowFrame.style.height=targetHeight+'px';running.push(windowFrame.animate([{height:oldHeight+'px'},{height:targetHeight+'px'}],opts));if(windowFrame.getBoundingClientRect().top<65||windowFrame.getBoundingClientRect().top>innerHeight*.55)windowFrame.scrollIntoView({block:'start',behavior:'auto'});}
 scene.dataset.traceMotion='running';document.dispatchEvent(new CustomEvent('ng:trace',{detail:{phase:'started',stage:key,duration,at:performance.now()}}));
 Promise.all(running.map(a=>a.finished.catch(()=>{}))).then(()=>{if(ticket!==serial)return;cleanup();document.dispatchEvent(new CustomEvent('ng:trace',{detail:{phase:'settled',stage:key,at:performance.now()}}))});
}
reduced.addEventListener('change',()=>{if(reduced.matches){++serial;cleanup()}});
window.addEventListener('pagehide',()=>{++serial;cleanup()});
window.addEventListener('hashchange',()=>select(location.hash.slice(1),{animate:false,writeHistory:false}));
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(tab.dataset.stage));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%4;if(e.key==='ArrowLeft')n=(i+3)%4;if(e.key==='Home')n=0;if(e.key==='End')n=3;if(n!==undefined){e.preventDefault();select(tabs[n].dataset.stage);tabs[n].focus();}});});
const decisions={edit:['c-edit.png','修改后采用真实确认弹窗，不代表本页面提交执行','真实编辑确认弹窗 · 非本页面执行'],adopt:['c-adopt.png','真实最终采用稿记录，来源为编辑后采用，无法证明独立的直接采用操作','采用稿记录 · 直接采用独立执行截图待补'],reject:['c-reject.png','拒绝建议后保留原文的真实产品记录','真实产品截图 · 拒绝建议记录']};
Object.values(decisions).forEach(([src])=>{const preload=new Image();preload.src='assets/'+src});
document.querySelectorAll('[data-decision]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-decision]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const [src,alt,caption]=decisions[b.dataset.decision];const img=document.getElementById('decisionImage');img.src='assets/'+src;img.alt=alt;document.getElementById('decisionCaption').textContent=caption;}));
const back=document.getElementById('workspaceBack');back.addEventListener('click',e=>{if(document.referrer&&new URL(document.referrer).origin===location.origin&&new URL(document.referrer).pathname==='/'&&history.length>1){e.preventDefault();history.back();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('evidenceViewer').open){e.preventDefault();back.click();}});
select(location.hash.slice(1),{animate:false});

const viewer=document.getElementById('evidenceViewer'),expanded=document.getElementById('expandedEvidence');let imageTrigger;
function openEvidence(img){imageTrigger=img;expanded.src=img.src;expanded.alt=img.alt;viewer.showModal();document.getElementById('closeEvidence').focus();}
document.querySelectorAll('.image-frame img').forEach(img=>{img.tabIndex=0;img.setAttribute('role','button');img.title='点击或按 Enter 查看原尺寸真实截图';img.addEventListener('click',()=>openEvidence(img));img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEvidence(img);}});});
document.getElementById('closeEvidence').addEventListener('click',()=>viewer.close());viewer.addEventListener('close',()=>{const current=document.activeElement;if(current!==document.body&&!viewer.contains(current))return;const visible=imageTrigger?.isConnected&&imageTrigger.getClientRects().length&&!imageTrigger.closest('[hidden],[inert]');(visible?imageTrigger:tabs.find(t=>t.getAttribute('aria-selected')==='true'))?.focus({preventScroll:true})});
