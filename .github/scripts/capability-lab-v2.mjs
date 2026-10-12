import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'fig6-browser-evidence');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';
 const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file))}catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
const results=[],errors=[],badResources=[];
const check=(name,ok)=>{if(!ok)throw Error('FAIL '+name);results.push('PASS '+name);console.log('PASS '+name)};
const ready=async p=>{await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth))};
try{
 for(const [width,height] of [[1440,900],[390,844],[360,780]]){
  const label=`${width}x${height}`,c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)badResources.push(r.url())});
  await p.goto(base+'/#cui-workspace');await p.locator('[data-workspace-info="skills"]').click();await p.waitForURL('**/capability-lab/');await ready(p);
  check(label+' Workspace skills enters actual page',await p.locator('h1').innerText()==='把复杂问题，\n变成产品结果。');
  check(label+' independent original CUI and background',await p.locator('img.cui').count()===1&&await p.locator('img.cui').getAttribute('src')==='../assets/workspace-v6/cui-guide.png'&&(await p.locator('.bg-original').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('workspace-v6/background.png'));
  check(label+' all three independent project facts preserved',await p.locator('.station').count()===3&&(await p.locator('.s1').innerText()).includes('15+ 深访 · 200+ 问卷')&&(await p.locator('.s2').innerText()).includes('人工决策 → 采用后复检')&&(await p.locator('.s3').innerText()).includes('单篇留资 680+'));
  check(label+' page has no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:path.join(out,'01-lab-'+label+'.png')});
  await p.screenshot({path:path.join(out,'02-lab-full-'+label+'.png'),fullPage:true});
  if(width===1440){
   check(label+' frozen desktop SVG curve and station coordinates',await p.evaluate(()=>document.querySelector('.motion-plate path').getAttribute('d')==='M 354 647 C 420 625, 500 625, 576 615 C 709 636, 765 408, 952 408 S 1149 616, 1303 621 L 1402 621'&&document.querySelector('.s1').getBoundingClientRect().x===528&&document.querySelector('.s2').getBoundingClientRect().x===899&&document.querySelector('.s3').getBoundingClientRect().x===1255));
  }else{
   check(label+' mobile node text stays readable',await p.locator('.station-label h3').evaluateAll(es=>es.every(e=>parseFloat(getComputedStyle(e).fontSize)>=21)));
   check(label+' mobile nodes form distinct vertical sequence',await p.locator('.station').evaluateAll(es=>{const r=es.map(e=>e.getBoundingClientRect());return r[0].bottom<=r[1].top&&r[1].bottom<=r[2].top}));
   check(label+' character and labels stay inside viewport',await p.locator('img.cui,.station-label').evaluateAll(es=>es.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})));
   await p.locator('.s3').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'03-mobile-nodes-'+label+'.png')});
   await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await p.screenshot({path:path.join(out,'04-mobile-bottom-'+label+'.png')});
   check(label+' all content including footer is scroll-accessible',await p.locator('.bottom-rail').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1));
  }
  await p.locator('#workspaceBack').focus();
  check(label+' return link is keyboard focusable',await p.locator('#workspaceBack').evaluate(e=>document.activeElement===e));
  await p.keyboard.press('Enter');await p.waitForURL('**/#cui-workspace');
  check(label+' keyboard return reaches original Workspace',await p.locator('#test-xhs').isVisible());
  await p.locator('#open-test-pangu').click();
  check(label+' frozen Pangu R1 still opens',await p.locator('#pangu-scene').evaluate(e=>e.classList.contains('open')));
  await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
  await p.locator('#test-xhs').click();await p.waitForURL('**/content-archive/');
  check(label+' frozen fig4 yellow case still enters',await p.locator('#metric').innerText()==='680+');
  await p.locator('#mainCoverButton').click();await p.waitForFunction(()=>document.getElementById('reader').open&&!document.getElementById('reader').dataset.motion);
  await p.locator('#startAnalysis').click();await p.locator('[data-step="2"]').click();
  check(label+' frozen fig4 analysis and metric preserved',await p.locator('#analysisResult').isVisible());
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('reader').open);await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
  await p.locator('[data-workspace-info="skills"]').click();await p.waitForURL('**/capability-lab/');await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
  check(label+' page Escape returns to Workspace',await p.locator('#test-xhs').isVisible());
  await p.locator('[data-workspace-info="skills"]').click();await p.waitForURL('**/capability-lab/');await p.goBack();await p.waitForURL('**/#cui-workspace');
  check(label+' browser Back preserved',await p.locator('#test-xhs').isVisible());
  await p.goto(base+'/');await p.locator('#enter-workspace').click();await p.waitForURL('**/#cui-workspace');
  check(label+' frozen Hero entry remains valid',await p.locator('#test-xhs').isVisible());
  if(width===1440){await p.goto(base+'/.github/fixtures/fig6-v2-reference.html');await ready(p);await p.screenshot({path:path.join(out,'05-source-V2-1440x900.png')})}
  await c.close();
 }
 check('No JavaScript errors in navigation',errors.length===0);
 check('No failed local asset or page responses',badResources.length===0);
}catch(e){results.push(String(e));throw e}finally{
 await fs.writeFile(path.join(out,'test-report.txt'),results.join('\n')+'\n'+errors.join('\n')+'\n'+badResources.join('\n'));await browser.close();server.close();
}
