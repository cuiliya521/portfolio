import {chromium} from 'playwright';
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'fig5-browser-evidence');await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.woff':'font/woff'};
const server=http.createServer(async(req,res)=>{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file))}catch{res.writeHead(404).end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.FIG5_PREVIEW_URL||'http://127.0.0.1:'+server.address().port,browser=await chromium.launch(),checks=[],errors=[],bad=[];
function check(n,ok){if(!ok)throw Error('FAIL '+n);checks.push('PASS '+n);console.log('PASS '+n)}
const ready=async p=>{await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth));};
try{
const manifest=JSON.parse(await fs.readFile('noteguard-case/assets/asset-manifest.json','utf8'));
for(const f of manifest.files)check('original bytes '+f.file,createHash('sha256').update(await fs.readFile('noteguard-case/assets/'+f.file)).digest('hex')===f.sha256);
for(const [width,height] of [[1440,900],[390,844],[360,780]]){
 const label=width+'x'+height,c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))bad.push(r.url())});
 await p.goto(base+'/#cui-workspace');await p.locator('#test-noteguard').click();await p.waitForURL('**/noteguard-case/**');await ready(p);
 check(label+' Workspace enters A',await p.locator('.scene').getAttribute('data-stage')==='a');
 const shell=await p.locator('.product-window').evaluate(e=>{e.dataset.testShell='retained';return e.dataset.testShell});
 for(const state of ['a','b','c','d']){
  await p.locator('#tab-'+state).click();await ready(p);
  check(label+' '+state+' only one panel visible',await p.locator('.stage-content:visible').count()===1);
  check(label+' '+state+' retains same window DOM',await p.locator('.product-window').getAttribute('data-test-shell')===shell);
  check(label+' '+state+' CUI stays original 300x364',await p.locator('#cui').evaluate(e=>{const r=e.getBoundingClientRect();return Math.abs(r.width-300)<1&&Math.abs(r.height-364)<1&&e.naturalWidth===330&&e.naturalHeight===400}));
  check(label+' '+state+' no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(out,state.toUpperCase()+'-'+label+'.png')});await p.screenshot({path:path.join(out,state.toUpperCase()+'-full-'+label+'.png'),fullPage:true});
  if(width<741){await p.locator('.stages').scrollIntoViewIfNeeded();check(label+' '+state+' navigation scroll-accessible',await p.locator('.stages').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1));}
 }
 await p.locator('#tab-c').click();
 for(const option of ['reject','adopt','edit']){await p.locator('[data-decision='+option+']').click();await ready(p);check(label+' C '+option+' actual evidence loaded',(await p.locator('#decisionImage').getAttribute('src')).includes('c-'+option+'.png'));}
 await p.locator('#tab-a').click();await p.locator('#stage-a .image-frame img').first().press('Enter');check(label+' image opens readable original',await p.locator('#evidenceViewer').evaluate(e=>e.open));await ready(p);await p.screenshot({path:path.join(out,'original-reader-'+label+'.png')});await p.keyboard.press('Escape');check(label+' reader Esc closes and restores focus',await p.locator('#evidenceViewer').evaluate(e=>!e.open)&&await p.locator('#stage-a .image-frame img').first().evaluate(e=>document.activeElement===e));check(label+' reader Escape does not navigate away',await p.locator('.scene').getAttribute('data-stage')==='a');await p.locator('#stage-a .image-frame img').first().click();await p.locator('#closeEvidence').click();check(label+' reader close button works',await p.locator('#evidenceViewer').evaluate(e=>!e.open));await p.locator('#tab-a').focus();await p.keyboard.press('ArrowRight');check(label+' keyboard stage focus',await p.locator('#tab-b').evaluate(e=>document.activeElement===e)&&await p.locator('.scene').getAttribute('data-stage')==='b');await p.keyboard.press('End');check(label+' keyboard End reaches D',await p.locator('.scene').getAttribute('data-stage')==='d');await p.keyboard.press('Home');check(label+' keyboard Home returns A',await p.locator('.scene').getAttribute('data-stage')==='a');
 await p.locator('#workspaceBack').click();await p.waitForURL('**/#cui-workspace');check(label+' back returns Workspace',await p.locator('#test-noteguard').isVisible());
 await p.locator('#test-noteguard').click();await p.waitForURL('**/noteguard-case/**');await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');check(label+' Esc returns Workspace',await p.locator('#test-xhs').isVisible());
 await p.locator('#test-noteguard').click();await p.waitForURL('**/noteguard-case/**');await p.goBack();await p.waitForURL('**/#cui-workspace');check(label+' Browser Back works',await p.locator('#test-xhs').isVisible());
 await p.locator('#open-test-pangu').click();check(label+' existing Pangu opens',await p.locator('#pangu-scene').evaluate(e=>e.classList.contains('open')));await p.keyboard.press('Escape');
 await p.locator('#test-xhs').click();await p.waitForURL('**/content-archive/');check(label+' frozen fig4 remains',await p.locator('#metric').innerText()==='680+');await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
 await p.locator('[data-workspace-info="skills"]').click();await p.waitForURL('**/capability-lab/');check(label+' frozen fig6 remains',(await p.locator('h1').innerText()).includes('把复杂问题'));await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
 await p.goto(base+'/noteguard-case/#d');await ready(p);check(label+' direct stage URL loads D',await p.locator('.scene').getAttribute('data-stage')==='d');await p.keyboard.press('Escape');await p.waitForURL('**/#cui-workspace');
 await c.close();
}
check('No JavaScript errors',errors.length===0);check('No failed page or asset responses',bad.length===0);
}catch(e){checks.push(String(e));throw e}finally{await fs.writeFile(path.join(out,'test-report.txt'),checks.join('\n')+'\n'+errors.join('\n')+'\n'+bad.join('\n'));await browser.close();server.close();}
