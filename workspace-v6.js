/* Frozen V6 material layer, existing project controller retained. No Agent dialogue system. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const agent = document.querySelector('.agent-image');
 const heroSource = agent.getAttribute('src');
 const guideSource = 'assets/workspace-v6/cui-guide.png';
 const preload = new Image(); preload.src = guideSource;
 document.addEventListener('cui:modechange',e => {
  const inHero = e.detail.mode === 'hero';
  agent.src = inHero ? heroSource : guideSource;
  agent.alt = inHero ? 'CUI Agent 小精灵' : '冻结 CUI 导览角色';
  if(inHero && $('workspace-info').open) $('workspace-info').close();
 });
 // The controller's initial render precedes this script.
 if(document.body.classList.contains('cui-test-active')) agent.src = guideSource;
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
 function show(key,button){
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
 const sceneNav=document.createElement('nav');sceneNav.className='project-switches';sceneNav.setAttribute('aria-label','直接切换项目');
 sceneNav.innerHTML='<button type="button" data-switch="xhs">小红书</button><button type="button" data-switch="noteguard">NoteGuard</button>';
 document.querySelector('.scene-top').insertBefore(sceneNav,$('scene-back'));
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-switch]');if(!b)return;
  const key=b.dataset.switch;
  if(key==='pangu'){panel.close();$('open-test-pangu').click()}
  else show(key,b);
 });
})();
