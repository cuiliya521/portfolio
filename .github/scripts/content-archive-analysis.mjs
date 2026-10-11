import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),out=path.join(root,'r12-browser-evidence','analysis');
await fs.mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url.endsWith('/'))url+='index.html';
 const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(await fs.readFile(file))}catch{res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch(),results=[],errors=[];
const check=(name,ok)=>{if(!ok)throw Error('FAIL '+name);results.push('PASS '+name);console.log('PASS '+name)};
const settle=async p=>p.waitForFunction(()=>document.getElementById('reader').open&&!document.getElementById('reader').dataset.motion);
const shot=async(p,name)=>{await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.png')})};
try{
 for(const [width,height] of [[1440,900],[390,844]]){
  const label=`${width}x${height}`,c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width,height}}});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/content-archive/');await p.evaluate(()=>document.fonts.ready);
  await p.waitForFunction(()=>[...document.images].filter(i=>i.src).every(i=>i.complete&&i.naturalWidth));
  await shot(p,'01-A-'+label);
  await p.locator('#mainCoverButton').click();await settle(p);
  await shot(p,'02-B-reading-'+label);
  check(label+' guidance is voluntary and starts hidden',await p.locator('#noteAnalysis').evaluate(e=>e.hidden));
  await p.waitForTimeout(600);
  await p.locator('#startAnalysis').focus();await p.keyboard.press('Enter');
  await shot(p,'03-need-'+label);
  check(label+' Enter starts needs step and focuses first choice',await p.locator('[data-step="0"]').evaluate(e=>e.getAttribute('aria-pressed')==='true'&&document.activeElement===e));
  check(label+' same original CUI node moves into guide',await p.evaluate(()=>document.querySelectorAll('img.cui').length===1&&document.querySelector('#analysisCharacter img').getAttribute('src')==='assets/cui_observing_original.png'));
  check(label+' guide and image do not overlap',await p.evaluate(()=>{const a=document.querySelector('#noteAnalysis').getBoundingClientRect(),b=document.querySelector('#readerView').getBoundingClientRect();return a.right<=b.left+1||a.bottom<=b.top+1}));
  await p.waitForTimeout(850);
  await p.locator('#analysisEvidence').click();
  check(label+' needs shows original cover',await p.locator('#readerImage').getAttribute('src')==='assets/yellow_cover_original_crop.png');
  await p.locator('#analysisNext').click();
  check(label+' next step updates contextual expression',await p.locator('[data-step="1"]').getAttribute('aria-pressed')==='true'&&(await p.locator('#analysisCopy').innerText()).includes('66元/课时'));
  await p.locator('#analysisEvidence').click();await p.locator('#readerImage').evaluate(e=>e.decode());
  await shot(p,'04-expression-'+label);await p.waitForTimeout(1000);
  check(label+' expression opens real body and interaction crop',await p.locator('#readerImage').getAttribute('src')==='assets/yellow_text_original_crop.png');
  await p.locator('[data-step="2"]').click();
  await p.locator('#analysisEvidence').click();await p.locator('#readerImage').evaluate(e=>e.decode());
  await shot(p,'05-result-'+label);await p.waitForTimeout(1400);
  check(label+' 680+ is explicitly tied to current yellow note',await p.locator('#analysisResult').isVisible()&&(await p.locator('#analysisResult').innerText()).includes('当前黄色笔记 · 单篇留资')&&(await p.locator('#analysisCopy').innerText()).includes('A 态中的 680+'));
  check(label+' result keeps causal evidence boundary',(await p.locator('#analysisBoundary').innerText()).includes('不能仅凭'));
  check(label+' full image remains real original',await p.locator('#readerImage').getAttribute('src')==='assets/yellow_note_redacted.png');
  check(label+' no viewport overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.getElementById('reader').scrollWidth<=innerWidth));
  await p.locator('#zoomReader').click();
  check(label+' existing zoom works during guidance',await p.locator('#zoomReader').getAttribute('aria-pressed')==='true');
  await p.locator('#zoomReader').click();await p.locator('#skipAnalysis').click();
  check(label+' skip removes guide and returns focus to launcher',await p.locator('#noteAnalysis').evaluate(e=>e.hidden)&&await p.locator('#startAnalysis').evaluate(e=>document.activeElement===e));
  check(label+' skip restores original single character to A layer',await p.evaluate(()=>document.querySelectorAll('img.cui').length===1&&document.querySelector('.cui-zone img.cui')!==null));
  await p.keyboard.press('Space');await p.locator('[data-step="2"]').click();
  await p.locator('#analysisNext').click();
  check(label+' finish returns to free reading',await p.locator('#noteAnalysis').evaluate(e=>e.hidden));
  await p.locator('#startAnalysis').click();await p.locator('[data-step="1"]').click();
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('reader').open);
  check(label+' Escape from analysis returns to original cover trigger',await p.locator('#mainCoverButton').evaluate(e=>document.activeElement===e));
  check(label+' return cleans guide, flight and scroll lock',await p.evaluate(()=>document.getElementById('noteAnalysis').hidden&&!document.querySelector('.archive-flight')&&document.body.style.overflow===''&&document.querySelectorAll('img.cui').length===1));
  await shot(p,'06-return-'+label);await p.waitForTimeout(650);
  await p.locator('#mainCoverButton').click();await settle(p);await p.locator('#startAnalysis').click();
  check(label+' reopen resets to needs step',await p.locator('[data-step="0"]').getAttribute('aria-pressed')==='true');
  await p.locator('#closeReader').click();await p.waitForFunction(()=>!document.getElementById('reader').open);
  check(label+' close button during guide restores focus',await p.locator('#mainCoverButton').evaluate(e=>document.activeElement===e));
  await p.locator('#nextCase').click();await p.locator('#mainCoverButton').click();await settle(p);
  check(label+' green remains readable without yellow metrics or analysis',await p.locator('#startAnalysis').evaluate(e=>e.hidden)&&await p.locator('#noteAnalysis').evaluate(e=>e.hidden)&&await p.locator('#readerImage').getAttribute('src')==='assets/'+(width<=760?'green_cover_original_crop.png':'green_note_redacted.png'));
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.getElementById('reader').open);
  await c.close();await fs.rename(await p.video().path(),path.join(out,'analysis-interaction-'+label+'.webm'));
 }
 check('No browser JavaScript errors in analysis',errors.length===0);
}catch(e){results.push(String(e));throw e}finally{await fs.writeFile(path.join(out,'analysis-report.txt'),results.join('\n')+'\n'+errors.join('\n'));await browser.close();server.close()}
