import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.svg':'image/svg+xml','.ttf':'font/ttf'};
const server = http.createServer(async (req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname === '/favicon.ico'){res.writeHead(204).end();return}
  const filename = path.resolve(root,'.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)){res.writeHead(403).end();return}
  try {
    const bytes = await fs.readFile(filename);
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)] || 'application/octet-stream'}).end(bytes);
  }catch {res.writeHead(404).end()}
});
const output = path.join(root,'cui-test-screenshots');
await fs.mkdir(output,{recursive:true});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = process.env.CUI_TEST_URL || 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const page = await context.newPage();
const errors = [];
const results = [];
page.on('pageerror',e => errors.push(e.message));
page.on('console',e => {if(e.type()==='error')console.warn('Browser resource warning: '+e.text())});
const pass = (what,condition) => {if(!condition)throw Error('FAIL: '+what);results.push('PASS '+what);console.log('PASS '+what)};
const shown = async selector => page.locator(selector).evaluate(el => {
 const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
 return rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&style.opacity!=='0';
});
try{
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('cui-welcome')).opacity==='1');
  await page.screenshot({path:path.join(output,'01-hero-1440x900.png')});
  pass('Welcome screenshot captured only after full opacity',await page.locator('#cui-welcome').evaluate(el=>getComputedStyle(el).opacity==='1'));
  pass('First-session welcome has exact text',await page.locator('#cui-welcome').isVisible() && (await page.locator('#cui-welcome').innerText())==='你好呀，我是 CUI！欢迎来到丽娅的 AI 工作现场。一起进去看看吗？');
  const noCopyOverlap = selector => page.locator(selector).evaluate(el=>{
    const r=el.getBoundingClientRect();
    return [...document.querySelectorAll('.hero h1,#enter-workspace,#hero-view-projects')].every(other=>{
      const b=other.getBoundingClientRect();return r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom;
    });
  });
  pass('Welcome does not cover title or entrances',await noCopyOverlap('#cui-welcome'));
  pass('Desktop speech bubble has dark readable text and a CUI-facing tail',await page.locator('#cui-welcome').evaluate(el=>getComputedStyle(el).color==='rgb(22, 61, 46)'&&getComputedStyle(el).fontWeight==='600'&&getComputedStyle(el,'::after').content!=='none'));
  pass('Desktop welcome stays above face and hand, clear of identity',await page.locator('#cui-welcome').evaluate(el=>{
    const w=el.getBoundingClientRect(),a=document.querySelector('.agent-image').getBoundingClientRect(),k=document.querySelector('.hero .kicker').getBoundingClientRect();
    return w.bottom<a.top+a.height*.23 && (w.bottom<=k.top||w.right<=k.left||w.left>=k.right);
  }));
  pass('Welcome never intercepts clicks and no audio exists',await page.locator('#cui-welcome').evaluate(el=>getComputedStyle(el).pointerEvents==='none') && await page.locator('audio,video').count()===0);
  await page.locator('#cui-welcome').waitFor({state:'hidden',timeout:6500});
  pass('Welcome fades away after about five seconds',await page.locator('#cui-welcome').evaluate(el=>el.hidden));
  await page.locator('#cui-agent-trigger').focus();
  await page.keyboard.press('Enter');
  pass('Keyboard Enter opens CUI panel',await page.locator('#cui-agent-panel').evaluate(el=>el.open));
  pass('Desktop panel avoids frozen title and entrances',await noCopyOverlap('#cui-agent-panel'));
  const noAgentOverlap = () => page.locator('#cui-agent-panel').evaluate(el=>{
    const p=el.getBoundingClientRect(),a=document.querySelector('.agent-image').getBoundingClientRect();
    return p.left>=a.right||p.right<=a.left||p.top>=a.bottom||p.bottom<=a.top;
  });
  pass('Desktop panel leaves entire CUI silhouette visible',await noAgentOverlap());
  await page.screenshot({path:path.join(output,'07-cui-panel-1440x900.png')});
  await page.locator('#cui-meet-liya').click();
  pass('Meet Liya reveals verified introduction',await page.locator('#cui-liya-intro').isVisible() && (await page.locator('#cui-liya-intro').innerText()).includes('2027 届本科生'));
  pass('Expanded introduction also avoids title and entrances',await noCopyOverlap('#cui-agent-panel'));
  pass('Expanded desktop panel leaves entire CUI silhouette visible',await noAgentOverlap());
  await page.screenshot({path:path.join(output,'08-cui-introduction-1440x900.png')});
  await page.keyboard.press('Escape');
  pass('Escape closes panel and returns focus to CUI',await page.evaluate(()=>!document.getElementById('cui-agent-panel').open && document.activeElement.id==='cui-agent-trigger'));
  await page.keyboard.press('Space');
  pass('Keyboard Space reopens CUI panel',await page.locator('#cui-agent-panel').evaluate(el=>el.open));
  await page.locator('#cui-agent-trigger').click();
  pass('Clicking same CUI again closes panel',await page.locator('#cui-agent-panel').evaluate(el=>!el.open));
  await page.locator('#cui-agent-trigger').click();
  await page.locator('#cui-panel-close').click();
  pass('Close button restores focus and removes invisible panel hit area',await page.evaluate(()=>document.activeElement.id==='cui-agent-trigger' && getComputedStyle(document.getElementById('cui-agent-panel')).display==='none'));
  await page.locator('#cui-agent-trigger').click();
  await page.locator('#cui-enter-workspace').click();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle');
  pass('Agent workspace action uses existing route and dismisses panel',await page.evaluate(()=>location.hash==='#cui-workspace' && !document.getElementById('cui-agent-panel').open && document.getElementById('cui-agent-trigger').hidden));
  await page.goBack();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle' && !document.body.classList.contains('cui-test-active'));
  pass('Browser Back returns to quiet Hero',await page.locator('#cui-welcome').evaluate(el=>el.hidden) && await page.locator('#cui-agent-panel').evaluate(el=>!el.open));
  await page.locator('#cui-agent-trigger').click();
  await page.locator('#cui-view-projects').click();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle');
  pass('Agent projects action reaches existing project region',await shown('.test-workspace__projects') && await page.locator('#cui-agent-panel').evaluate(el=>!el.open));
  await page.goBack();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle' && !document.body.classList.contains('cui-test-active'));
  await page.reload({waitUntil:'networkidle'});
  pass('Same-session reload does not repeat welcome',await page.locator('#cui-welcome').evaluate(el=>el.hidden));
  pass('Hero title and enter button visible',await shown('#enter-workspace') && await shown('h1'));
  const cuiLoaded = await page.locator('.agent-image').evaluate(img => img.complete && img.naturalWidth===1211 && img.naturalHeight===1479 && img.currentSrc.includes('/assets/cui-agent-4.png'));
  const transparency = cuiLoaded ? await page.locator('.agent-image').evaluate(img => {
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const corner=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
    const rect=img.getBoundingClientRect(),heading=document.querySelector('h1').getBoundingClientRect();
    const viewOk=rect.left>=0 && rect.right<=innerWidth && rect.top>=0 && rect.bottom<=innerHeight;
    // Compare actual title text ink areas, not the container's empty left margin.
    const walker=document.createTreeWalker(document.querySelector('h1'),NodeFilter.SHOW_TEXT);
    const headingTextBounds=[];
    while(walker.nextNode()){
      if(!walker.currentNode.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(walker.currentNode);
      headingTextBounds.push(...range.getClientRects());
    }
    const noHeadingOverlap=headingTextBounds.every(h=>rect.right<=h.left || rect.left>=h.right || rect.bottom<=h.top || rect.top>=h.bottom);
    const renderedAspect=rect.width/rect.height;
    const correctAspect=Math.abs(renderedAspect-(1211/1479))<0.02;
    return {size:[c.width,c.height],cornerAlpha:[corner(0,0),corner(c.width-1,0),corner(0,c.height-1),corner(c.width-1,c.height-1)],centerAlpha:corner(Math.round(c.width/2),Math.round(c.height/2)),viewOk,noHeadingOverlap,correctAspect,renderedBounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}};
  }) : null;
  pass('CUI original PNG loaded, transparent and not clipped',Boolean(cuiLoaded && transparency && transparency.cornerAlpha.every(x=>x===0) && transparency.centerAlpha===255 && transparency.viewOk && transparency.noHeadingOverlap && transparency.correctAspect && (await page.locator('.cui-test-asset-alert').count())===0));
  results.push('CUI PNG inspection: '+JSON.stringify(transparency));
  console.log('CUI PNG inspection: '+JSON.stringify(transparency));
  // Screenshot by viewport clip: animated agents never become "stable" for element.screenshot.
  const box = await page.locator('.agent-wrap').evaluate(el => {
    const r=el.getBoundingClientRect(),pad=14;
    return {x:Math.max(0,Math.floor(r.left-pad)),y:Math.max(0,Math.floor(r.top-pad)),width:Math.min(innerWidth-Math.max(0,Math.floor(r.left-pad)),Math.ceil(r.width+pad*2)),height:Math.min(innerHeight-Math.max(0,Math.floor(r.top-pad)),Math.ceil(r.height+pad*2))};
  });
  await page.screenshot({path:path.join(output,'04-cui-agent-local-browser-crop.png'),clip:box,animations:'disabled'});
  await page.evaluate(() => {
    window.originalAgent = document.getElementById('agent-wrap');
    window.motionSamples = [];
    let start;
    const sample = time => {
      start ??= time;
      const r = originalAgent.getBoundingClientRect();
      motionSamples.push({t:time-start,x:r.x,y:r.y,w:r.width,count:document.querySelectorAll('.agent-image').length,same:originalAgent===document.getElementById('agent-wrap')});
      if(time-start<1050) requestAnimationFrame(sample);
    };
    // Anchor observation to the actual input, not Playwright's pre-click actionability wait.
    document.getElementById('enter-workspace').addEventListener('click',()=>requestAnimationFrame(sample),{once:true});
  });
  await page.locator('#enter-workspace').click();
  await page.waitForTimeout(350);
  await page.screenshot({path:path.join(output,'05-transition-1440x900.png')});
  await page.waitForFunction(() => document.body.dataset.transition === 'idle');
  pass('Hero → Workspace',await shown('#cui-test-workspace'));
  pass('Workspace defaults to no open project',!(await shown('#pangu-scene')));
  await page.waitForTimeout(200);
  const motion = await page.evaluate(() => motionSamples);
  results.push('Motion samples: '+JSON.stringify(motion));
  pass('Same CUI node persists, without duplicates throughout transition',motion.length>10 && motion.every(x=>x.same && x.count===1));
  pass('CUI has multiple intermediate positions instead of a hard cut',new Set(motion.map(x=>Math.round(x.w))).size>8);
  pass('CUI stays within viewport in Workspace',await page.locator('.agent-image').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}));
  pass('Three project entrances visible' ,await Promise.all(['#open-test-pangu','#test-xhs','#test-noteguard'].map(shown)).then(v=>v.every(Boolean)));
  await page.screenshot({path:path.join(output,'02-workspace-1440x900.png')});
  await page.locator('#test-xhs').click();
  pass('Xiaohongshu entrance gives honest scope notice',(await page.locator('#cui-test-status').innerText()).includes('小红书'));
  await page.locator('#test-noteguard').click();
  pass('NoteGuard entrance gives honest scope notice',(await page.locator('#cui-test-status').innerText()).includes('NoteGuard'));
  await page.locator('#open-test-pangu').click();
  await page.waitForTimeout(550);
  pass('Workspace → Pangu modal',await shown('#pangu-scene'));
  pass('Reconstructed Pangu UI is loaded',await page.locator('#pangu-main-img').evaluate(img=>img.complete&&img.naturalWidth>0));
  pass('Original Pangu DOM element remains unique',(await page.locator('#pangu-main-ui').count())===1);
  pass('Original Pangu UI mounted inside focus frame',await page.locator('#focus-frame > #pangu-main-ui').count()===1);
  pass('Source-disclosure label visible',(await page.locator('.scene-proof').innerText()).includes('脱敏'));
  await page.screenshot({path:path.join(output,'03-pangu-window-1440x900.png')});
  await page.locator('#scene-next').click();
  pass('Pangu steps are clickable',await page.locator('.scene-step.active').evaluate(el=>el.dataset.step==='1'));
  await page.locator('#scene-back').click();
  await page.locator('#pangu-scene').waitFor({state:'hidden'});
  await page.locator('#cui-test-workspace').waitFor({state:'visible'});
  pass('Close Pangu → Workspace',await shown('#cui-test-workspace') && !(await shown('#pangu-scene')));
  pass('Pangu UI returns to original Hero DOM',await page.locator('#main-ui-slot + #pangu-main-ui').count()===1);
  await page.keyboard.press('Escape');
  await page.locator('#cui-test-workspace').waitFor({state:'hidden'});
  pass('Escape from Workspace → Hero',await shown('#enter-workspace') && !(await shown('#cui-test-workspace')));
  await page.locator('#enter-workspace').click();
  await page.waitForFunction(() => document.body.dataset.transition === 'idle');
  await page.locator('#test-workspace-home').click();
  await page.locator('#cui-test-workspace').waitFor({state:'hidden'});
  pass('Workspace home button → Hero',!(await shown('#cui-test-workspace')));
  await page.locator('#enter-workspace').click();
  await page.waitForFunction(() => document.body.dataset.transition === 'idle');
  await page.locator('#open-test-pangu').click();
  await page.keyboard.press('Escape');
  await page.locator('#pangu-scene').waitFor({state:'hidden'});
  pass('Escape from Pangu → Workspace',await shown('#cui-test-workspace') && !(await shown('#pangu-scene')));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.locator('#enter-workspace').click();
  pass('Reduced motion settles immediately with animations disabled',await page.evaluate(()=>document.body.dataset.transition==='idle' && getComputedStyle(document.querySelector('.agent-image')).animationName==='none' && getComputedStyle(document.getElementById('agent-wrap')).transitionDuration==='0s'));
  await page.locator('#test-workspace-home').click();
  await page.locator('#cui-test-workspace').waitFor({state:'hidden'});
  pass('Reduced motion return to Hero works',await shown('#enter-workspace'));
  pass('Reduced motion disables Hero float and tap feedback',await page.locator('.agent-image').evaluate(el=>getComputedStyle(el).animationName==='none'));
  pass('No browser JavaScript errors',errors.length===0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'/',{waitUntil:'networkidle'});
  pass('Hero identity uses exact name and graduation year',(await page.locator('.hero .kicker').innerText())==='崔丽娅 · 2027届 · AI 产品运营');
  pass('Frozen subtitle is exact',(await page.locator('.hero .lede').innerText())==='和 CUI 一起，走进我的 AI 工作空间。');
  pass('Home has no project cards',await page.locator('.h3-projects').count()===0);
  pass('Provided background decodes',await page.locator('.h3-light').evaluate(img=>img.complete&&img.naturalWidth===1536&&img.naturalHeight===1024&&img.currentSrc.includes('hero-final-background.png')));
  await page.locator('#hero-view-projects').click();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle');
  pass('Direct project entry reaches existing Workspace projects',await shown('.test-workspace__projects')&&await shown('#open-test-pangu'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.body.dataset.transition==='idle');
  await page.mouse.wheel(0,180);
  await page.waitForFunction(()=>document.body.dataset.transition==='idle'&&document.body.classList.contains('cui-test-active'));
  pass('Hero wheel enters existing Workspace',await shown('#cui-test-workspace'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>document.body.dataset.transition==='idle');
  await page.evaluate(()=>document.activeElement.blur());
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(()=>document.body.dataset.transition==='idle'&&document.body.classList.contains('cui-test-active'));
  pass('Hero keyboard entry reaches existing Workspace',await shown('#cui-test-workspace'));
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(1100); // Let the existing CUI position transition settle after resizing.
  pass('Mobile has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  pass('Mobile entry controls remain in viewport',await page.locator('#enter-workspace,#hero-view-projects').evaluateAll(nodes=>nodes.every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})));
  pass('Mobile character does not overlap Hero copy',await page.locator('.agent-image').evaluate(img=>{
    const r=img.getBoundingClientRect(),c=document.querySelector('.hero .copy').getBoundingClientRect();
    return r.top>=c.bottom||r.bottom<=c.top||r.right<=c.left||r.left>=c.right;
  }));
  await page.screenshot({path:path.join(output,'06-mobile-390x844.png')});
  const mobileOriginal=await page.locator('#agent-wrap').boundingBox();
  await page.locator('#cui-agent-trigger').click();
  await page.waitForTimeout(1100);
  const mobileHeadAndHandVisible = () => page.evaluate(()=>{
    const a=document.querySelector('.agent-image').getBoundingClientRect(),p=document.getElementById('cui-agent-panel').getBoundingClientRect(),c=document.querySelector('.hero .copy').getBoundingClientRect();
    // Frozen PNG: upper 62% includes the whole head and inviting front hand.
    return a.top>=c.bottom && a.top+a.height*.62<=p.top && a.left>=0 && a.right<=innerWidth;
  });
  pass('Mobile open drawer keeps CUI head and inviting hand clear of copy and drawer',await mobileHeadAndHandVisible());
  pass('Mobile CUI panel fits viewport without overflow',await page.locator('#cui-agent-panel').evaluate(el=>{const r=el.getBoundingClientRect();return el.open && r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth}));
  await page.screenshot({path:path.join(output,'09-cui-panel-390x844.png')});
  await page.locator('#cui-meet-liya').click();
  pass('Expanded mobile introduction still leaves head and hand visible',await mobileHeadAndHandVisible());
  await page.screenshot({path:path.join(output,'11-cui-introduction-390x844.png')});
  pass('Mobile introduction is readable and internally scrollable',await page.locator('#cui-liya-intro').isVisible() && await page.locator('#cui-agent-panel').evaluate(el=>el.scrollHeight>=el.clientHeight&&el.getBoundingClientRect().bottom<=innerHeight));
  await page.locator('#cui-agent-trigger').click({position:{x:90,y:35}});
  await page.waitForTimeout(1100);
  const restoredMobile=await page.locator('#agent-wrap').boundingBox();
  pass('Mobile close restores frozen CUI position and size',Math.abs(restoredMobile.x-mobileOriginal.x)<1 && Math.abs(restoredMobile.y-mobileOriginal.y)<1 && Math.abs(restoredMobile.width-mobileOriginal.width)<1);
  await page.screenshot({path:path.join(output,'12-cui-restored-390x844.png')});
  pass('Mobile can click visible CUI again to close expanded drawer',await page.locator('#cui-agent-panel').evaluate(el=>!el.open));
  await page.locator('#cui-agent-trigger').click();
  await page.locator('#cui-panel-close').click();
  pass('Mobile close button removes panel and restores CUI focus',await page.evaluate(()=>!document.getElementById('cui-agent-panel').open&&document.activeElement.id==='cui-agent-trigger'));
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  pass('Mobile Escape restores CUI focus',await page.evaluate(()=>!document.getElementById('cui-agent-panel').open&&document.activeElement.id==='cui-agent-trigger'));
  await page.locator('#cui-agent-trigger').click();
  await page.locator('#cui-enter-workspace').click();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle');
  pass('Mobile agent Workspace navigation works',await shown('#cui-test-workspace'));
  await page.goBack();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle'&&!document.body.classList.contains('cui-test-active'));
  await page.locator('#cui-agent-trigger').click();
  await page.locator('#cui-view-projects').click();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle');
  pass('Mobile agent project navigation works',await shown('#cui-test-workspace')&&await page.locator('#cui-agent-panel').evaluate(el=>!el.open));
  await page.goBack();
  await page.waitForFunction(()=>document.body.dataset.transition==='idle'&&!document.body.classList.contains('cui-test-active'));
  pass('Mobile browser Back remains quiet',await page.locator('#cui-welcome').evaluate(el=>el.hidden));
  const freshContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const freshPage=await freshContext.newPage();
  await freshPage.goto(base+'/',{waitUntil:'networkidle'});
  await freshPage.evaluate(()=>document.fonts.ready);
  await freshPage.waitForFunction(()=>getComputedStyle(document.getElementById('cui-welcome')).opacity==='1');
  pass('Fresh mobile session shows welcome',await freshPage.locator('#cui-welcome').isVisible());
  pass('Mobile welcome fully visible beside CUI, outside face and front hand',await freshPage.locator('#cui-welcome').evaluate(el=>{
    const w=el.getBoundingClientRect(),a=document.querySelector('.agent-image').getBoundingClientRect(),c=document.querySelector('.hero .copy').getBoundingClientRect();
    return getComputedStyle(el).opacity==='1' && w.left>=a.left+a.width*.83 && w.top>=c.bottom && w.top<a.top+a.height*.3 && w.bottom<innerHeight-80 && w.right<=innerWidth;
  }));
  pass('Welcome never opens the interaction panel automatically',await freshPage.locator('#cui-agent-panel').evaluate(el=>!el.open));
  await freshPage.screenshot({path:path.join(output,'10-cui-welcome-390x844.png')});
  await freshPage.locator('#enter-workspace').click();
  await freshPage.waitForFunction(()=>document.body.dataset.transition==='idle');
  pass('Welcome permits immediate entry and disappears on navigation',await freshPage.evaluate(()=>location.hash==='#cui-workspace'&&document.getElementById('cui-welcome').hidden));
  await freshPage.goBack();
  await freshPage.waitForFunction(()=>document.body.dataset.transition==='idle'&&!document.body.classList.contains('cui-test-active'));
  pass('Fast mobile exit and browser return do not replay welcome',await freshPage.locator('#cui-welcome').evaluate(el=>el.hidden));
  await freshContext.close();

} catch (e){
  results.push(e.stack||String(e));
  console.error(e);
  process.exitCode=1;
} finally {
  await fs.writeFile(path.join(output,'test-report.txt'),results.join('\n')+'\n'+(errors.length?'Console errors:\n'+errors.join('\n'):''));
  await browser.close();
  server.close();
}
