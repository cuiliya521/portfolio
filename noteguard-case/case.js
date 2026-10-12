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
function select(key){if(!states[key])key='a';scene.dataset.stage=key;ids.forEach((id,i)=>document.getElementById(id).textContent=states[key][i]);tabs.forEach(t=>{const active=t.dataset.stage===key;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active;});history.replaceState({stage:key},'', '#'+key);}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(tab.dataset.stage));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%4;if(e.key==='ArrowLeft')n=(i+3)%4;if(e.key==='Home')n=0;if(e.key==='End')n=3;if(n!==undefined){e.preventDefault();select(tabs[n].dataset.stage);tabs[n].focus();}});});
const decisions={edit:['c-edit.png','修改后采用真实确认弹窗','真实产品截图 · 编辑后采用'],adopt:['c-adopt.png','直接采用后保存独立最终稿的真实产品记录','真实产品截图 · 已确认采用记录'],reject:['c-reject.png','拒绝建议后保留原文的真实产品记录','真实产品截图 · 拒绝建议记录']};
document.querySelectorAll('[data-decision]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-decision]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const [src,alt,caption]=decisions[b.dataset.decision];const img=document.getElementById('decisionImage');img.src='assets/'+src;img.alt=alt;document.getElementById('decisionCaption').textContent=caption;}));
const back=document.getElementById('workspaceBack');back.addEventListener('click',e=>{if(document.referrer&&new URL(document.referrer).origin===location.origin&&new URL(document.referrer).pathname==='/'&&history.length>1){e.preventDefault();history.back();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();back.click();}});
select(location.hash.slice(1));
