import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),output=path.join(root,'cui-test-screenshots/mobile-scroll');
await fs.mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.pdf':'application/pdf'};
const server=http.createServer(async(req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(name==='/favicon.ico'){res.writeHead(204).end();return}
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{const b=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b)}catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.CUI_TEST_URL||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage(),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
function check(name,ok,detail){results.push({name,ok,detail});console.log((ok?'PASS ':'ISSUE ')+name+(detail?' '+JSON.stringify(detail):''))}
const shot=async name=>{await page.waitForTimeout(950);return page.screenshot({path:path.join(output,name+'.png')})};
const idle=()=>page.waitForFunction(()=>document.body.dataset.transition==='idle');
const infoTitle=()=>page.locator('#workspace-info-title').innerText();
async function geometry(selector){return page.locator(selector).evaluate(el=>{
 const r=el.getBoundingClientRect(),d=document.querySelector('.workspace-dock').getBoundingClientRect();
 const x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
 return {bounds:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right},dock:{top:d.top,bottom:d.bottom},viewport:innerWidth,fullyInside:r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=d.top,hit:!!hit&&(hit===el||el.contains(hit))};
})}
async function center(selector){await page.locator(selector).evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}))}
try{
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 await page.locator('#enter-workspace').click();await idle();
 // Actual wheel scrolling, overlapping 390x844 viewport captures. Fixed Dock remains in every capture.
 const positions=[];
 for(let i=0;i<8;i++){
  const position=await page.locator('#cui-test-workspace').evaluate(el=>({top:el.scrollTop,max:el.scrollHeight-el.clientHeight,height:el.clientHeight,width:el.scrollWidth}));
  positions.push(position);await shot('scroll-'+String(i).padStart(2,'0'));
  if(position.top>=position.max-1)break;
  await page.mouse.move(200,430);await page.mouse.wheel(0,560);await page.waitForTimeout(250);
 }
 check('Wheel scroll covers complete Workspace from top to bottom',positions[0].top===0&&positions.at(-1).top>=positions.at(-1).max-1,{positions});
 check('No horizontal overflow at all captured scroll positions',positions.every(p=>p.width<=390),{positions});
 const bottomJiya=await geometry('.workspace-jiya');check('Bottom Jiya entry can be fully exposed above fixed Dock',bottomJiya.fullyInside&&bottomJiya.hit,bottomJiya);
 const dock=await page.locator('.workspace-dock').evaluate(el=>({position:getComputedStyle(el).position,r:el.getBoundingClientRect().toJSON(),buttons:el.querySelectorAll('button,a').length}));
 check('Five fixed Dock entries remain inside 390x844',dock.position==='fixed'&&dock.buttons===5&&dock.r.x>=0&&dock.r.right<=390&&dock.r.bottom<=844,dock);
 // Inspect the actual image scale; object-fit containment never stretches the source aspect ratio.
 const imageSizes=[];
 for(const viewport of [{width:1440,height:900},{width:1680,height:1050},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(950);
  imageSizes.push(await page.locator('.workspace-pangu .window-evidence img').evaluate(img=>{
   const r=img.getBoundingClientRect(),s=getComputedStyle(img),scale=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight);
   return {viewport:[innerWidth,innerHeight],natural:[img.naturalWidth,img.naturalHeight],element:[r.width,r.height],painted:[img.naturalWidth*scale,img.naturalHeight*scale],scale,objectFit:s.objectFit,src:img.getAttribute('src')};
  }));
 }
 check('Pangu uses original aspect ratio with contain, no CSS stretch',imageSizes.every(i=>i.objectFit==='contain'&&i.natural[0]===502&&i.natural[1]===373),imageSizes);
 for(const [selector,name] of [['#open-test-pangu','pangu'],['#test-xhs','xhs'],['#test-noteguard','noteguard']]){
  await center(selector);
  const g=await geometry(selector);check(name+' project control is usable above Dock',g.fullyInside&&g.hit,g);
  await shot(name+'-entry');
  await page.locator(selector).click();
  if(name==='pangu'){
   await page.locator('#pangu-scene').waitFor({state:'visible'});
   await shot('pangu-open');
   const rows=await page.evaluate(()=>{const a=document.querySelector('.scene-steps').getBoundingClientRect(),b=document.getElementById('scene-next').getBoundingClientRect();return {steps:a.toJSON(),next:b.toJSON(),separate:b.bottom<=a.top||a.bottom<=b.top}});
   check('Mobile Pangu steps and next control have no visual overlap',rows.separate,rows);
   if(!rows.separate) throw new Error('Pangu mobile controls overlap');
   const close=await page.locator('#scene-back').evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {bounds:r.toJSON(),inside:r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight,hit:hit===el||el.contains(hit)}});
   check('Mobile Pangu close button stays in viewport and clickable',close.inside&&close.hit,close);
   await page.locator('#scene-next').click();check('Mobile Pangu next step works',await page.locator('.scene-step.active').getAttribute('data-step')==='1');
   await page.locator('#scene-back').click();await page.locator('#pangu-scene').waitFor({state:'hidden'});
   check('Mobile Pangu close returns to Workspace',await page.locator('#cui-test-workspace').isVisible());
   await center(selector);await page.locator(selector).click();await page.locator('#pangu-scene').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#pangu-scene').waitFor({state:'hidden'});
   check('Mobile Pangu Esc returns to Workspace',await page.locator('#cui-test-workspace').isVisible());
  }else{
   await page.locator('#workspace-info').waitFor({state:'visible'});await shot(name+'-open');
   check(name+' opens actual supplied material view',await infoTitle()===(name==='xhs'?'小红书内容运营':'NoteGuard AI'));
   await page.locator('#workspace-info-close').click();await page.locator('#workspace-info').waitFor({state:'hidden'});
   check(name+' close restores project focus',await page.locator(selector).evaluate(el=>document.activeElement===el));
   await page.locator(selector).click();await page.keyboard.press('Escape');await page.locator('#workspace-info').waitFor({state:'hidden'});
   check(name+' Esc closes without exiting Workspace',await page.locator('#cui-test-workspace').isVisible());
  }
 }
 await center('.workspace-jiya');await page.locator('.workspace-jiya').click();check('Jiya entry opens',await infoTitle()==='冀芽成长（校园项目）');await page.keyboard.press('Escape');
 for(const key of ['skills','about','contact']){
  await page.locator('.workspace-dock [data-workspace-info="'+key+'"]').click();await page.locator('#workspace-info').waitFor({state:'visible'});
  await shot('dock-'+key);await page.keyboard.press('Escape');await page.locator('#workspace-info').waitFor({state:'hidden'});
  check('Mobile Dock '+key+' opens, Esc closes and focus restores',await page.locator('.workspace-dock [data-workspace-info="'+key+'"]').evaluate(el=>document.activeElement===el));
 }
 const downloadEvent=page.waitForEvent('download');await page.locator('.workspace-dock a[download]').click();const d=await downloadEvent;check('Mobile resume download works without changing file',d.suggestedFilename().endsWith('.pdf'));
 await page.locator('#workspace-dock-home').click();await page.waitForFunction(()=>document.getElementById('cui-test-workspace').scrollTop<1);check('Mobile Dock workbench returns to top',true);await shot('dock-home');
 await page.locator('#test-workspace-home').click();await idle();check('Mobile Workspace return restores frozen Hero CUI',await page.locator('.agent-image').getAttribute('src')==='assets/cui-agent-4.png');
 await page.locator('#hero-view-projects').click();await idle();await page.goBack();await idle();check('Mobile browser Back returns to Hero',await page.locator('#cui-test-workspace').evaluate(el=>el.hidden));
 check('No mobile audit JavaScript errors',errors.length===0,errors);
}catch(e){results.push({name:'Audit interrupted',ok:false,detail:e.stack});console.error(e);await shot('audit-error')}
finally{
 await fs.writeFile(path.join(output,'mobile-audit.json'),JSON.stringify(results,null,2));
 await fs.writeFile(path.join(output,'mobile-audit.txt'),results.map(r=>(r.ok?'PASS ':'ISSUE ')+r.name+(r.detail?' '+JSON.stringify(r.detail):'')).join('\n'));
 if(results.some(r=>!r.ok)) process.exitCode=1;
 await browser.close();server.close();
}
