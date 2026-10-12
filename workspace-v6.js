/* Frozen V6 material layer, existing project controller retained. No Agent dialogue system. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const agent = document.querySelector('.agent-image');
 const heroSource = agent.getAttribute('src');
 const guideSource = 'assets/workspace-v6/cui-guide.png';
 const workspace = $('cui-test-workspace');
 const guideWrap = agent.closest('.agent-wrap');
 const syncGuideScroll = () => guideWrap.style.setProperty('--workspace-scroll-offset', workspace.scrollTop + 'px');
 workspace.addEventListener('scroll', syncGuideScroll, {passive:true});
 document.addEventListener('cui:modechange', syncGuideScroll);
 syncGuideScroll();
 const preload = new Image(); preload.src = guideSource;
 // User-supplied higher-resolution source for mobile only; desktop stays frozen.
 const mobilePangu = window.matchMedia('(max-width:700px)');
 const panguEvidence = document.querySelector('.workspace-pangu .window-evidence img');
 const syncPanguSource = () => { panguEvidence.src = mobilePangu.matches ? 'assets/workspace-v6/pangu-mobile-source.jpg' : 'assets/workspace-v6/pangu.png'; };
 mobilePangu.addEventListener('change', syncPanguSource);
 syncPanguSource();
 document.addEventListener('cui:modechange',e => {
  const inHero = e.detail.mode === 'hero';
  agent.src = inHero ? heroSource : e.detail.mode === 'pangu' ? 'assets/pangu-r1/cui-pointing.png' : guideSource;
  agent.alt = inHero ? 'CUI Agent 小精灵' : '冻结 CUI 导览角色';
  if(inHero && $('workspace-info').open) $('workspace-info').close();
 });
 // The controller's initial render precedes this script.
 if(document.body.classList.contains('cui-test-active')) agent.src = $('pangu-scene').classList.contains('open') ? 'assets/pangu-r1/cui-pointing.png' : guideSource;
 const panel = $('workspace-info');
 let invoker;
 const switches = '<nav class="project-switches" aria-label="直接切换项目"><button type="button" data-switch="pangu">盘古智绘</button><button type="button" data-switch="xhs">小红书内容运营</button><button type="button" data-switch="noteguard">NoteGuard AI</button></nav>';
 const content = {
  xhs:['小红书内容运营','<p>三张用户提供的真实封面，仅展示内容素材；不作为留资、ROI 或广告业绩凭证。</p><div class="material-covers"><img src="assets/workspace-v6/xhs-main.png" alt="AI 一对一真实封面"><img src="assets/workspace-v6/xhs-month.png" alt="700 每月真实封面"><img src="assets/workspace-v6/xhs-lesson.png" alt="66 元每课时真实封面"></div>'],
  noteguard:['NoteGuard AI','<p>作品集 P08 审核界面素材，非本次线上实拍或实时审核结果。风险识别 → 建议 → 人工决策 → 采用后复检。</p><img src="assets/workspace-v6/noteguard.png" alt="NoteGuard AI P08 审核界面">'],
  jiya:['冀芽成长（校园项目）','<p>学前教育数字化赋能方向的校园项目，围绕用户调研与需求设计展开。本轮仅提供入口，不新增项目详情。</p>'],
  skills:['我的能力','<p>用户调研 · 需求分析 · 产品运营 · 内容策略 · AI 应用工作流</p><p>从盘古智绘、小红书内容运营及 NoteGuard AI 项目中查看具体实践。</p>'],
  about:['关于我','<p>崔丽娅 · 2027 届本科生 · AI 产品运营方向</p><p>华北理工大学轻工学院，学前教育专业。</p>'],
  contact:['联系我','<p><a href="mailto:3104306958@qq.com">3104306958@qq.com</a></p><p><a href="https://github.com/cuiliya521" target="_blank" rel="noreferrer">GitHub · cuiliya521 ↗</a></p>']
 };
 // Each real Workspace entry gets a stable, distinct return target (including both Contact buttons).
 const returnKey = 'cui-workspace-return-v1';
 const entries = [...workspace.querySelectorAll('#test-xhs,#test-noteguard,[data-workspace-info]')];
 entries.forEach((entry,index) => { entry.dataset.cuiReturnId = 'workspace-entry-' + index; });
 function rememberEntry(button){
  const entry = entries.includes(button) ? button : invoker;
  const record = {path:location.pathname,id:entry?.dataset.cuiReturnId || '',scrollTop:workspace.scrollTop};
  // Keep the originating history entry so Back/Forward can restore it even after another visit.
  try { history.replaceState({...history.state,cuiWorkspaceReturn:record},'',location.href); } catch {}
  try { sessionStorage.setItem(returnKey,JSON.stringify(record)); } catch {}
 }
 function readReturn(){
  if(history.state?.cuiWorkspaceReturn?.path === location.pathname) return history.state.cuiWorkspaceReturn;
  try { const record = JSON.parse(sessionStorage.getItem(returnKey));return record?.path === location.pathname ? record : null; } catch {return null;}
 }
 let returnObserver,returnFrame;
 function restoreEntry(){
  returnObserver?.disconnect();cancelAnimationFrame(returnFrame);
  if(location.hash !== '#cui-workspace') return;
  const record = readReturn();
  const finish = () => {
   if(location.hash !== '#cui-workspace'){returnObserver?.disconnect();return;}
   if(workspace.hidden || workspace.inert || document.body.dataset.transition === 'running') return;
   returnObserver?.disconnect();
   returnFrame = requestAnimationFrame(() => {
    if(location.hash !== '#cui-workspace' || workspace.inert || document.querySelector('dialog[open]')) return;
    const visible = el => el && !el.disabled && !el.closest('[inert]') && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    const original = entries.find(entry => entry.dataset.cuiReturnId === record?.id);
    const target = visible(original) ? original : $('open-test-pangu');
    if(!visible(target)) return;
    if(Number.isFinite(record?.scrollTop)) workspace.scrollTop = record.scrollTop;
    target.focus({preventScroll:true});
    const rect=target.getBoundingClientRect(),bounds=workspace.getBoundingClientRect();
    if(rect.top<bounds.top || rect.bottom>bounds.bottom) target.scrollIntoView({block:'nearest',behavior:'auto'});
   });
  };
  returnObserver = new MutationObserver(finish);
  returnObserver.observe(document.body,{attributes:true,attributeFilter:['data-transition','class']});
  finish();
 }
 // Initial loads and bfcache returns share the same restoration; no navigation is triggered here.
 window.addEventListener('pageshow',restoreEntry);
 restoreEntry();
 const projectRoutes = {xhs:'content-archive/',noteguard:'noteguard-case/',skills:'capability-lab/',about:'about-contact/',contact:'about-contact/'};
 function show(key,button){
  if(projectRoutes[key]){rememberEntry(button);location.assign(projectRoutes[key]);return;}
  if(!$('pangu-scene').classList.contains('open')) {if(!panel.contains(button)) invoker=button}
  else {invoker=$('open-test-pangu');$('scene-back').click()}
  const [title,body]=content[key];
  $('workspace-info-title').textContent=title;
  $('workspace-info-content').innerHTML=(['xhs','noteguard'].includes(key)?switches:'')+body;
  if(!panel.open) panel.showModal();
 }
 $('test-xhs').addEventListener('click',e=>show('xhs',e.currentTarget));
 $('test-noteguard').addEventListener('click',e=>show('noteguard',e.currentTarget));
 document.querySelectorAll('[data-workspace-info]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.workspaceInfo,b)));
 $('workspace-info-close').addEventListener('click',()=>panel.close());
 panel.addEventListener('close',()=>{if(invoker?.isConnected&&document.body.classList.contains('cui-test-active')) invoker.focus({preventScroll:true})});
 $('workspace-dock-home').addEventListener('click',()=>{$('cui-test-workspace').scrollTo({top:0,behavior:'smooth'});$('open-test-pangu').focus({preventScroll:true})});
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-switch]');if(!b)return;
  const key=b.dataset.switch;
  if(key==='pangu'){panel.close();$('open-test-pangu').click()}
  else show(key,b);
 });
})();
