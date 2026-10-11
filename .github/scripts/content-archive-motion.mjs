import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'r12-browser-evidence','motion');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';
 const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file))}catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch();
const results=[],errors=[];
const check=(name,ok)=>{if(!ok)throw Error('FAIL '+name);results.push('PASS '+name)};
try{
 for(const [width,height] of [[1440,900],[390,844]]){
  const label=`${width}x${height}`;
  const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width,height}}});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/content-archive/');await p.evaluate(()=>document.fonts.ready);
  await p.waitForFunction(()=>[...document.images].filter(i=>i.src).every(i=>i.complete&&i.naturalWidth));
  await p.screenshot({path:path.join(out,'01-A-'+label+'.png')});
  const before=await p.locator('#mainCover').boundingBox();
  const scrollBefore=await p.evaluate(()=>scrollY);
  await p.waitForTimeout(400);
  await p.locator('#mainCoverButton').click();
  await p.waitForFunction(()=>document.getElementById('reader').dataset.motion==='opening');
  const first=await p.locator('.archive-flight').boundingBox();
  await p.waitForTimeout(160);
  const middle=await p.locator('.archive-flight').boundingBox();
  await p.screenshot({path:path.join(out,'02-opening-'+label+'.png')});
  check(label+' real animation interpolates after click',Math.abs(middle.x-first.x)+Math.abs(middle.y-first.y)+Math.abs(middle.width-first.width)>10);
  check(label+' exactly one visible shared screenshot in transition',await p.locator('#mainCover').evaluate(e=>getComputedStyle(e).visibility==='hidden')&&await p.locator('#readerImage').evaluate(e=>getComputedStyle(e).visibility==='hidden')&&await p.locator('.archive-flight').count()===1);
  await p.waitForFunction(()=>document.getElementById('reader').open&&!document.getElementById('reader').dataset.motion);
  await p.screenshot({path:path.join(out,'03-B-'+label+'.png')});
  check(label+' settled reader has no flight copy',await p.locator('.archive-flight').count()===0);
  check(label+' backdrop scroll remains locked',await p.evaluate(()=>document.body.style.overflow==='hidden')&&(await p.evaluate(()=>scrollY))===scrollBefore);
  await p.waitForTimeout(450);
  await p.mouse.move(20,20);
  await p.keyboard.press('Escape');
  await p.waitForFunction(()=>document.getElementById('reader').dataset.motion==='closing');
  await p.waitForTimeout(160);
  await p.screenshot({path:path.join(out,'04-closing-'+label+'.png')});
  await p.waitForFunction(()=>!document.getElementById('reader').open);
  await p.waitForTimeout(360);
  await p.screenshot({path:path.join(out,'05-return-A-'+label+'.png')});
  const after=await p.locator('#mainCover').boundingBox();
  check(label+' return keeps archive geometry',Math.abs(before.x-after.x)<2&&Math.abs(before.y-after.y)<2&&Math.abs(before.width-after.width)<2);
  check(label+' return restores exact trigger focus',await p.locator('#mainCoverButton').evaluate(e=>document.activeElement===e));
  check(label+' return restores scroll and removes overlay',await p.evaluate(()=>!document.querySelector('.archive-flight')&&document.body.style.overflow===''&&document.querySelector('#mainCover').style.visibility==='')&&(await p.evaluate(()=>scrollY))===scrollBefore);
  await p.waitForTimeout(450);
  // Exercise close-button path and rapid Escape during opening.
  await p.locator('#mainCoverButton').click();await p.waitForFunction(()=>document.getElementById('reader').open&&!document.getElementById('reader').dataset.motion);
  await p.locator('#closeReader').click();await p.waitForFunction(()=>!document.getElementById('reader').open);
  check(label+' close button returns to A',await p.locator('#mainCoverButton').evaluate(e=>document.activeElement===e));
  await p.locator('#mainCoverButton').click();await p.waitForFunction(()=>document.getElementById('reader').dataset.motion==='opening');await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('reader').open);
  check(label+' interrupted opening settles safely',await p.locator('.archive-flight').count()===0);
  await c.close();await fs.rename(await p.video().path(),path.join(out,'interaction-'+label+'.webm'));
 }
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await c.newPage();
 await p.goto(base+'/content-archive/');await p.locator('#mainCoverButton').click();await p.waitForFunction(()=>document.getElementById('reader').open);
 check('Reduced motion skips shared-element animation',await p.locator('.archive-flight').count()===0);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('reader').open);await c.close();
 check('No JavaScript errors in recorded interactions',errors.length===0);
}finally{await fs.writeFile(path.join(out,'motion-report.txt'),results.join('\n')+'\n'+errors.join('\n'));await browser.close();server.close()}
