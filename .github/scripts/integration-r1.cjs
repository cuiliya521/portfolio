/* Integration R1 acceptance. Read real pages; never call product APIs or send mail. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.cwd(),before=process.env.CUI_BEFORE==='1',out=path.resolve(process.env.CUI_EVIDENCE_DIR||'integration-browser-evidence');
fs.mkdirSync(out,{recursive:true});
const checks=[],errors=[],badResources=[],focusEvidence=[];
const check=(name,pass,detail)=>{checks.push({name,pass:!!pass,detail});if(!pass&&!before)throw Error('FAIL '+name)};
const routes=[
 {key:'fig4',entry:'#test-xhs',url:'content-archive/',back:'#workspaceBack'},
 {key:'fig5',entry:'#test-noteguard',url:'noteguard-case/',back:'#workspaceBack'},
 {key:'fig6',entry:'.workspace-dock [data-workspace-info="skills"]',url:'capability-lab/',back:'#workspaceBack'},
 {key:'fig7-about',entry:'.workspace-dock [data-workspace-info="about"]',url:'about-contact/',back:'#workspace-return'},
 {key:'fig7-top-contact',entry:'.workspace-top-actions [data-workspace-info="contact"]',url:'about-contact/',back:'#workspace-return'},
 {key:'fig7-dock-contact',entry:'.workspace-dock [data-workspace-info="contact"]',url:'about-contact/',back:'#workspace-return'}
];
let browser,server;
async function main(){
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff','.pdf':'application/pdf'};
 server=http.createServer((req,res)=>{
  let file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);if(!file||file.endsWith('/'))file+='index.html';
  if(file.split('/').includes('..')){res.writeHead(403).end();return}
  try{const bytes=process.env.CUI_TEST_REF?execFileSync('git',['show',process.env.CUI_TEST_REF+':'+file],{cwd:root,maxBuffer:30e6}):fs.readFileSync(path.join(root,file));res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(bytes)}catch{res.writeHead(404).end()}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.CUI_PREVIEW_URL||'http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,...(process.env.CUI_CHROMIUM?{executablePath:process.env.CUI_CHROMIUM,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']}: {})});
 const ready=async p=>{await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));await p.waitForFunction(()=>{const scene=document.getElementById('pangu-scene');return !scene?.classList.contains('open')||getComputedStyle(scene).opacity==='1'});};
 const workspaceReady=async p=>{await p.waitForFunction(()=>location.hash==='#cui-workspace'&&document.body.dataset.transition==='idle'&&!document.getElementById('cui-test-workspace').inert);await p.waitForTimeout(70)};
 const focus=async(p,selector,label)=>{
  await workspaceReady(p);
  if(before)await p.waitForTimeout(1100);
  else await p.waitForFunction(s=>document.activeElement===document.querySelector(s),selector);
  const evidence=await p.evaluate(s=>({expected:s,actual:document.activeElement.outerHTML.slice(0,350),matched:document.activeElement===document.querySelector(s),scrollTop:document.getElementById('cui-test-workspace').scrollTop}),selector);
  focusEvidence.push({label,...evidence});check(label+' focus exact invoker',evidence.matched,evidence.actual);
 };
 const shot=async(p,name)=>{await ready(p);await p.screenshot({path:path.join(out,name+'.png'),fullPage:false});if(p.viewportSize().width<701)await p.screenshot({path:path.join(out,name+'-full.png'),fullPage:true})};
 for(const [width,height] of [[1440,900],[390,844],[360,780]]){
  const label=width+'x'+height,ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:before?'reduce':'no-preference'});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push({label,message:e.message}));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))badResources.push({label,status:r.status(),url:new URL(r.url()).origin+new URL(r.url()).pathname})});
  if(process.env.CUI_PREVIEW_BOOTSTRAP)await p.goto(process.env.CUI_PREVIEW_BOOTSTRAP);
  await p.goto(base+'/');await ready(p);
  if(!before){
   check(label+' real Hero heading',(await p.locator('.hero h1').innerText()).includes('AI 工作现场'));
   await shot(p,'01-Hero-'+label);
   await p.locator('#enter-workspace').press('Enter');await workspaceReady(p);
   check(label+' settled Hero hidden/inert',await p.locator('.hero .copy').evaluate(e=>getComputedStyle(e).opacity==='0')&&await p.locator('#hero').evaluate(e=>e.inert));
   await shot(p,'02-Workspace-'+label);
   check(label+' Workspace no horizontal overflow',await p.locator('#cui-test-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth));
   await p.locator('#open-test-pangu').click();await p.waitForFunction(()=>document.getElementById('pangu-scene').classList.contains('open'));await ready(p);
   check(label+' Pangu real original screenshot',await p.locator('#pangu-r1-product').evaluate(e=>e.naturalWidth===1536&&e.naturalHeight===1024));
   check(label+' Pangu no legacy duplicate UI',await p.locator('#pangu-main-ui').evaluate(e=>getComputedStyle(e).visibility==='hidden'));
   await shot(p,'03-Pangu-'+label);
   await p.locator('#pangu-original-open').press('Enter');check(label+' Pangu native reader opens',await p.locator('#pangu-original-viewer').evaluate(e=>e.open));
   await p.keyboard.press('Escape');check(label+' Pangu reader Escape does not navigate',await p.locator('#pangu-original-viewer').evaluate(e=>!e.open)&&await p.locator('#pangu-scene').evaluate(e=>e.classList.contains('open')));
   await p.keyboard.press('Escape');await focus(p,'#open-test-pangu',label+' Pangu Esc');
   await p.locator('#open-test-pangu').click();await p.locator('#scene-back').press('Enter');await focus(p,'#open-test-pangu',label+' Pangu return');
   await p.locator('#open-test-pangu').click();await p.goBack();await focus(p,'#open-test-pangu',label+' Pangu Browser Back');
  }else{await p.goto(base+'/#cui-workspace');await workspaceReady(p);}
  for(const route of routes){
   if(!await p.locator(route.entry).isVisible()){
    check(label+' frozen mobile top Contact is hidden',width<701&&route.key==='fig7-top-contact');
    continue;
   }
   await p.locator(route.entry).press('Enter');await p.waitForURL(u=>u.pathname.endsWith('/'+route.url));await ready(p);
   if(!before){
    check(label+' '+route.key+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(route.key==='fig4'){
     check(label+' Fig4 original lead metric',await p.locator('#metric').innerText()==='680+');
     await shot(p,'04-ContentLab-'+label);
     await p.locator('#nextCase').click();check(label+' Fig4 real case switches',await p.locator('#metric').innerText()!=='680+');await p.locator('#nextCase').click();
     await p.locator('#mainCoverButton').press('Space');await p.waitForTimeout(1100);check(label+' Fig4 reader opens',await p.locator('#reader').evaluate(e=>e.open));
     await p.locator('#startAnalysis').click();check(label+' Fig4 analysis remains',await p.locator('#noteAnalysis').isVisible());await p.locator('#analysisNext').click();await p.locator('#analysisNext').click();check(label+' Fig4 all three analysis steps',await p.locator('#analysisCount').innerText()==='03 / 03');await p.locator('#skipAnalysis').click();
     await p.keyboard.press('Escape');await p.waitForTimeout(1100);check(label+' Fig4 reader Escape stays on page',p.url().includes('content-archive/')&&await p.locator('#reader').evaluate(e=>!e.open));
    }
    if(route.key==='fig5'){
     const windowId=await p.locator('.product-window').evaluate(e=>{e.dataset.acceptanceShell='same';return e.dataset.acceptanceShell});
     for(const state of ['a','b','c','d']){
      await p.locator('#tab-'+state).click();await ready(p);
      check(label+' Fig5 '+state+' single retained window',await p.locator('.stage-content:visible').count()===1&&await p.locator('.product-window').getAttribute('data-acceptance-shell')===windowId);
      check(label+' Fig5 '+state+' no overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await p.evaluate(()=>scrollTo(0,0));await shot(p,'05-NoteGuard-'+state.toUpperCase()+'-'+label);
     }
     await p.locator('#tab-c').click();
     for(const decision of ['reject','adopt','edit']){await p.locator('[data-decision="'+decision+'"]').click();await ready(p);check(label+' Fig5 '+decision+' real evidence',await p.locator('#decisionImage').getAttribute('src')==='assets/c-'+decision+'.png')}
     await p.locator('#tab-a').focus();await p.keyboard.press('ArrowRight');check(label+' Fig5 ArrowRight',await p.locator('#tab-b').evaluate(e=>document.activeElement===e));await p.keyboard.press('End');check(label+' Fig5 End',await p.locator('.scene').getAttribute('data-stage')==='d');await p.keyboard.press('Home');check(label+' Fig5 Home',await p.locator('.scene').getAttribute('data-stage')==='a');
     await p.locator('#stage-a .image-frame img').first().press('Enter');check(label+' Fig5 native reader opens',await p.locator('#evidenceViewer').evaluate(e=>e.open));await p.keyboard.press('Escape');check(label+' Fig5 reader restores image focus',await p.locator('#stage-a .image-frame img').first().evaluate(e=>document.activeElement===e)&&p.url().includes('noteguard-case'));
    }
    if(route.key==='fig6'){check(label+' Fig6 all evidence preserved',await p.locator('.station').count()===3&&(await p.locator('h1').innerText()).includes('变成产品结果'));await shot(p,'06-CapabilityLab-'+label);}
    if(route.key==='fig7-about'){
     check(label+' Fig7 frozen identity',await p.locator('h1').innerText()==='崔丽娅');await shot(p,'07-AboutContact-'+label);
     check(label+' Fig7 exact verified mailto',await p.locator('.contacts a[href^="mailto:"]').getAttribute('href')==='mailto:3104306958@qq.com');
     check(label+' Fig7 exact Github link',await p.locator('.contacts a[href^="https:"]').getAttribute('href')==='https://github.com/cuiliya521');
     await p.locator('#resume-open').press('Space');check(label+' Fig7 honest resume status',await p.locator('#resume-status').evaluate(e=>e.open)&&(await p.locator('#resume-title').innerText()).includes('待补充'));await p.keyboard.press('Escape');check(label+' Fig7 resume Escape only closes modal',p.url().includes('about-contact/')&&await p.locator('#resume-open').evaluate(e=>document.activeElement===e));
     await p.keyboard.press('Tab');check(label+' Fig7 keyboard Github',await p.locator('.contacts a[href^="https:"]').evaluate(e=>document.activeElement===e));await p.keyboard.press('Tab');check(label+' Fig7 keyboard mail',await p.locator('.contacts a[href^="mailto:"]').evaluate(e=>document.activeElement===e));
     check(label+' Fig7 character clears contact controls',await p.evaluate(()=>{const a=document.querySelector('.contacts').getBoundingClientRect(),b=document.querySelector('.companion').getBoundingClientRect();return a.right<=b.left||a.bottom<=b.top}));
    }
   }
   await p.locator(route.back).press('Enter');await focus(p,route.entry,label+' '+route.key+' return');
   if(before){await p.screenshot({path:path.join(out,'before-'+route.key+'-'+label+'.png')});continue;}
   await p.locator(route.entry).click();await p.waitForURL(u=>u.pathname.endsWith('/'+route.url));await p.keyboard.press('Escape');await focus(p,route.entry,label+' '+route.key+' Esc');
   await p.locator(route.entry).click();await p.waitForURL(u=>u.pathname.endsWith('/'+route.url));await p.goBack();await focus(p,route.entry,label+' '+route.key+' Back');
   await p.goForward();await p.waitForURL(u=>u.pathname.endsWith('/'+route.url));await p.goBack();await focus(p,route.entry,label+' '+route.key+' Forward/Back');
  }
  if(!before){
   await p.evaluate(()=>{history.replaceState({...history.state,cuiWorkspaceReturn:{path:location.pathname,id:'removed-entry',scrollTop:0}},'',location.href)});await p.reload();await focus(p,'#open-test-pangu',label+' missing origin fallback');
   await p.locator('.workspace-dock [data-workspace-info="contact"]').click();await p.waitForURL('**/about-contact/');await p.reload();await p.locator('#workspace-return').click();await focus(p,'.workspace-dock [data-workspace-info="contact"]',label+' reload project keeps dock origin');
  }
  await ctx.close();
 }
 if(!before){
  const c=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),p=await c.newPage();await p.goto(base+'/#cui-workspace');await p.locator('#test-xhs').click();await p.waitForURL('**/content-archive/');await p.keyboard.press('Escape');await focus(p,'#test-xhs','reduced motion Fig4 exact focus');await c.close();
  check('No JavaScript exceptions',errors.length===0,errors);check('No failed page/assets',badResources.length===0,badResources);
 }
}
main().catch(e=>{checks.push({name:'execution',pass:false,detail:e.message});process.exitCode=1}).finally(async()=>{
 const report={environment:process.env.CUI_PREVIEW_URL?'online-preview':'local-chromium',before,viewports:[[1440,900],[390,844],[360,780]],checks,focusEvidence,errors,badResources};
 fs.writeFileSync(path.join(out,'regression.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({environment:report.environment,checks:checks.length,failed:checks.filter(x=>!x.pass),errors,badResources},null,2));
 if(browser)await browser.close();if(server)server.close();
});
