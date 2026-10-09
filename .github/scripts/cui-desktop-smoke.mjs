import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
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
  await page.screenshot({path:path.join(output,'01-hero-1440x900.png')});
  pass('Hero title and enter button visible',await shown('#enter-workspace') && await shown('h1'));
  const cuiLoaded = await page.locator('.agent-image').evaluate(img => img.complete && img.naturalWidth===1211 && img.naturalHeight===1479 && img.currentSrc.includes('/assets/cui-agent-4.png'));
  const transparency = cuiLoaded ? await page.locator('.agent-image').evaluate(img => {
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const corner=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
    const rect=img.getBoundingClientRect(),heading=document.querySelector('h1').getBoundingClientRect();
    const viewOk=rect.left>=0 && rect.right<=innerWidth && rect.top>=0 && rect.bottom<=innerHeight;
    const noHeadingOverlap=rect.right<=heading.left || rect.left>=heading.right || rect.bottom<=heading.top || rect.top>=heading.bottom;
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
    requestAnimationFrame(sample);
  });
  await page.locator('#enter-workspace').click();
  await page.waitForFunction(() => document.body.dataset.transition === 'idle');
  pass('Hero → Workspace',await shown('#cui-test-workspace'));
  pass('Workspace defaults to no open project',!(await shown('#pangu-scene')));
  await page.waitForTimeout(200);
  const motion = await page.evaluate(() => motionSamples);
  pass('Same CUI node persists, without duplicates throughout transition',motion.length>10 && motion.every(x=>x.same && x.count===1));
  pass('CUI has multiple intermediate positions instead of a hard cut',new Set(motion.map(x=>Math.round(x.w))).size>8);
  pass('CUI stays within viewport in Workspace',await page.locator('.agent-image').evaluate(el=>{const r=el.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}));
  results.push('Motion samples: '+JSON.stringify(motion));
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
  pass('No browser JavaScript errors',errors.length===0);
} catch (e){
  results.push(e.stack||String(e));
  console.error(e);
  process.exitCode=1;
} finally {
  await fs.writeFile(path.join(output,'test-report.txt'),results.join('\n')+'\n'+(errors.length?'Console errors:\n'+errors.join('\n'):''));
  await browser.close();
  server.close();
}
