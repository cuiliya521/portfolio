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
const base = 'http://127.0.0.1:' + server.address().port;
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
  const cuiLoaded = await page.locator('.agent-image').evaluate(img=>img.complete&&img.naturalWidth>0);
  if(cuiLoaded){
    const transparency = await page.locator('.agent-image').evaluate(img => {
      const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
      const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
      const corner=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
      return {size:[c.width,c.height],cornerAlpha:[corner(0,0),corner(c.width-1,0),corner(0,c.height-1),corner(c.width-1,c.height-1)]};
    });
    results.push('CUI existing WebP corner alpha: '+JSON.stringify(transparency));
  } else {
    pass('Damaged original CUI image is clearly flagged, not redrawn',await shown('.cui-test-asset-alert'));
    results.push('WARNING: Existing embedded WebP CUI image did not decode. No replacement character generated.');
  }
  await page.locator('#enter-workspace').click();
  pass('Hero → Workspace',await shown('#cui-test-workspace'));
  pass('Three project entrances visible',await Promise.all(['#open-test-pangu','#test-xhs','#test-noteguard'].map(shown)).then(v=>v.every(Boolean)));
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
  await page.locator('#test-workspace-home').click();
  await page.locator('#cui-test-workspace').waitFor({state:'hidden'});
  pass('Workspace home button → Hero',!(await shown('#cui-test-workspace')));
  await page.locator('#enter-workspace').click();
  await page.locator('#open-test-pangu').click();
  await page.keyboard.press('Escape');
  await page.locator('#pangu-scene').waitFor({state:'hidden'});
  pass('Escape from Pangu → Workspace',await shown('#cui-test-workspace') && !(await shown('#pangu-scene')));
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
