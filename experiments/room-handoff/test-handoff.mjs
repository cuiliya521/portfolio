/* Browser QA — run only in a writable clone with playwright installed.
   Example:
   CUI_TEST_URL='https://<preview>/?handoff=1#cui-workspace' node experiments/room-handoff/test-handoff.mjs
   Outputs are local evidence, never a claim unless this test actually runs. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const target=process.env.CUI_TEST_URL || 'http://127.0.0.1:8000/?handoff=1#cui-workspace';
const out='experiments/room-handoff/qa-evidence';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const viewports=[
  {name:'desktop',viewport:{width:1363,height:936},isMobile:false,hasTouch:false},
  {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];
const summary=[];
try {
 for(const v of viewports){
  const ctx=await browser.newContext({viewport:v.viewport,isMobile:v.isMobile,hasTouch:v.hasTouch,recordVideo:{dir:join(out,v.name+'-video')},reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push('main: '+e.message));
  const response=await page.goto(target,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  const card=page.locator('#open-test-pangu');
  await card.waitFor({state:'visible'});
  await page.screenshot({path:join(out,v.name+'-workspace.png')});
  await card.click();
  const overlay=page.locator('.cui-room-overlay');
  await overlay.waitFor({state:'visible'});
  const room=page.frameLocator('iframe[title="盘古智绘产品工作台"]');
  await room.locator('#trigger').waitFor({state:'visible'});
  await room.locator('#trigger').click();
  assert.equal(await room.locator('#trigger').getAttribute('aria-expanded'),'true');
  await room.locator('#choice-input').check();
  assert.equal(await room.locator('#draft-status').textContent(),'待确认');
  await room.locator('#apply').click();
  assert.equal(await room.locator('#committed-value').textContent(),'清爽明亮');
  await room.locator('#trigger').click();
  assert.equal(await room.locator('#field-content').isHidden(),true);
  await page.screenshot({path:join(out,v.name+'-confirmed.png')});
  await room.locator('#exit-room').click();
  await overlay.waitFor({state:'hidden'});
  assert.equal(await card.isVisible(),true);
  await card.click();
  await room.locator('#trigger').waitFor({state:'visible'});
  assert.equal(await room.locator('#committed-value').textContent(),'待选择');
  await room.locator('#exit-room').click();
  await overlay.waitFor({state:'hidden'});
  const hasOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(hasOverflow,false,'Horizontal overflow in host');
  assert.deepEqual(errors,[]);
  summary.push({viewport:v.name,result:'PASS',errors});
  await ctx.close();
 }
}finally{await browser.close()}
console.log(JSON.stringify(summary,null,2));
