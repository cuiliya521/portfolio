/* Run with Playwright installed, QA_URL pointing to a Preview or local server. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true});
const output=process.env.QA_OUTPUT||'qa-output';await fs.mkdir(output,{recursive:true});
const results=[];
for(const [name,width,height,touch,reduced] of [['desktop',1440,900,false,false],['laptop',1280,800,false,false],['mobile',390,844,true,false],['reduced',1440,900,false,true]]){
const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:reduced?'reduce':'no-preference'});
const page=await context.newPage(),errors=[],failures=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});
await page.goto(process.env.QA_URL||'http://127.0.0.1:4173',{waitUntil:'networkidle'});
assert.equal(await page.locator('body').getAttribute('data-scene'),'entry');
assert.equal(await page.locator('#workspace').evaluate(e=>e.inert),true);
await page.screenshot({path:`${output}/${name}-entry.png`});
await page.locator('#enter').click();
await page.locator('body[data-scene="workspace"]').waitFor();
assert.equal(await page.locator('#workspace').evaluate(e=>e.inert),false);
await page.screenshot({path:`${output}/${name}-workspace.png`,fullPage:true});
const wsOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
assert.equal(wsOverflow,false,'workspace horizontal overflow');
await page.locator('#open-pangu').click();
await page.locator('body[data-scene="pangu"]').waitFor();
await page.locator('#ui-loading').waitFor({state:'hidden'});
await page.screenshot({path:`${output}/${name}-pangu-input.png`,fullPage:true});
const panguOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
assert.equal(panguOverflow,false,'case horizontal overflow');
const frame=page.frameLocator('#frozen-ui');
assert.equal(await frame.locator('.app').evaluate(e=>e.clientWidth),1600);
assert.equal(await frame.locator('.app').evaluate(e=>e.clientHeight),1000);
assert.equal(await frame.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0),true,'frozen image decode');
await page.locator('#tab-input').focus();await page.keyboard.press('ArrowRight');
assert.equal(await page.locator('#tab-preview').getAttribute('aria-selected'),'true');
assert.equal(await page.locator('#tab-preview').evaluate(e=>e===document.activeElement),true);
await page.screenshot({path:`${output}/${name}-pangu-preview.png`,fullPage:true});
await page.locator('#next-step').click();await page.locator('#ui-loading').waitFor({state:'hidden'});
assert.match(await page.locator('#frozen-ui').getAttribute('src'),/manage/);
await page.screenshot({path:`${output}/${name}-pangu-assets.png`,fullPage:true});
assert.equal(await frame.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0)),true);
if(touch){const dims=await page.locator('#ui-viewport').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth,left:e.scrollLeft,top:e.scrollTop}));assert(dims.sw>dims.w,'mobile UI can pan');assert(dims.left>0,'mobile focus offset applied');}
await page.keyboard.press('Escape');await page.locator('body[data-scene="workspace"]').waitFor();
await page.goBack();await page.locator('body[data-scene="pangu"]').waitFor();
await page.goto((process.env.QA_URL||'http://127.0.0.1:4173')+'/#workspace');await page.locator('body[data-scene="workspace"]').waitFor();
await page.locator('.identity').click();await page.locator('body[data-scene="entry"]').waitFor();
await page.locator('#enter').click();if(!reduced)await page.keyboard.press('Escape');await page.locator('body[data-scene="workspace"]').waitFor();
const image=await page.locator('.product-image-wrap img').evaluate(e=>({naturalWidth:e.naturalWidth,renderedWidth:e.clientWidth,complete:e.complete}));
assert(image.complete&&image.naturalWidth>image.renderedWidth,'workspace source image sufficient resolution');
assert.deepEqual(errors,[],'page errors');assert.deepEqual(failures,[],'HTTP errors');
results.push({name,width,height,errors,failures,wsOverflow,panguOverflow,image});await context.close();
}
await fs.writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
