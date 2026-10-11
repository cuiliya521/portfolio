import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'r12-browser-evidence');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(url.endsWith('/'))url+='index.html';
  const file=path.resolve(root,'.'+url);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file))}catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();
const errors=[],results=[];
const check=(name,ok)=>{if(!ok)throw Error('FAIL '+name);results.push('PASS '+name);console.log('PASS '+name)};
const ready=async p=>{await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.images].filter(i=>i.getAttribute('src')).every(i=>i.complete&&i.naturalWidth>0))};
const shot=async(p,name,fullPage=false)=>{await ready(p);await p.screenshot({path:path.join(out,name+'.png'),fullPage})};
try{
  for(const [width,height] of [[1440,900],[390,844],[360,780]]){
    const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
    const suffix=`${width}x${height}`;
    await p.goto(base+'/#cui-workspace');
    await p.locator('#test-xhs').click();
    await p.waitForURL('**/content-archive/');await ready(p);
    check(suffix+' Workspace enters R12',await p.locator('#metric').innerText()==='680+');
    check(suffix+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(suffix+' single fixed CUI',await p.locator('img.cui').count()===1);
    check(suffix+' real independent images',await p.locator('#mainCover').getAttribute('src')==='assets/yellow_cover_original_crop.png');
    await shot(p,'01-yellow-'+suffix);
    if(width<761)await shot(p,'02-yellow-full-'+suffix,true);
    await p.locator('#nextCase').click();await ready(p);
    check(suffix+' green case and folio update',(await p.locator('#metric').innerText())==='最高曝光'&&(await p.locator('.cover-folio').innerText()).includes('02'));
    await p.evaluate(()=>scrollTo(0,0));await shot(p,'03-green-'+suffix,width<761);
    await p.locator('#mainCoverButton').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.getElementById('reader').open&&!document.getElementById('reader').dataset.motion);
    check(suffix+' Enter opens native reader',await p.locator('#reader').evaluate(e=>e.open));
    await p.getByRole('button',{name:'正文与互动',exact:true}).click();
    await shot(p,'04-green-text-'+suffix);
    check(suffix+' real green text source',await p.locator('#readerImage').getAttribute('src')==='assets/green_text_original_crop.png');
    await p.locator('#zoomReader').click();
    check(suffix+' zoom enabled',await p.locator('#zoomReader').getAttribute('aria-pressed')==='true');
    if(width<761)check(suffix+' zoom can scroll horizontally',await p.locator('#readerView').evaluate(e=>e.scrollWidth>e.clientWidth));
    await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('reader').open);
    check(suffix+' Escape closes reader and restores focus',await p.locator('#reader').evaluate(e=>!e.open)&&await p.locator('#mainCoverButton').evaluate(e=>e===document.activeElement));
    await p.locator('#nextCase').click();
    check(suffix+' switch back restores yellow',await p.locator('#metric').innerText()==='680+');
    await p.locator('#cuiGuide').click();await p.waitForFunction(()=>document.getElementById('reader').open&&!document.getElementById('reader').dataset.motion);await p.getByRole('button',{name:'正文与互动',exact:true}).click();
    await shot(p,'05-yellow-text-'+suffix);
    await p.getByRole('button',{name:'完整原图',exact:true}).click();
    await shot(p,'06-yellow-original-'+suffix);
    check(suffix+' real yellow full source',await p.locator('#readerImage').getAttribute('src')==='assets/yellow_note_redacted.png');
    await p.locator('#closeReader').click();await p.waitForFunction(()=>!document.getElementById('reader').open);
    check(suffix+' close returns focus to guide',await p.locator('#cuiGuide').evaluate(e=>e===document.activeElement));
    await p.locator('#workspaceBack').click();await p.waitForURL('**/#cui-workspace');
    check(suffix+' return to real Workspace',await p.locator('#test-xhs').isVisible());
    await p.locator('#open-test-pangu').click();
    check(suffix+' Pangu remains functional',await p.locator('#pangu-scene').evaluate(e=>e.classList.contains('open')));
    await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
    await p.locator('#test-xhs').click();await p.waitForURL('**/content-archive/');
    await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
    check(suffix+' page Escape returns to Workspace',await p.locator('#test-xhs').isVisible());
    await p.goto(base+'/');await p.locator('#enter-workspace').click();await p.waitForURL('**/#cui-workspace');
    check(suffix+' Hero entry preserved',await p.locator('#test-xhs').isVisible());
    await c.close();
  }
  check('No browser JavaScript errors',errors.length===0);
}catch(e){results.push(String(e));throw e}finally{
  await fs.writeFile(path.join(out,'test-report.txt'),results.join('\n')+'\n'+errors.join('\n'));
  await browser.close();server.close();
}
