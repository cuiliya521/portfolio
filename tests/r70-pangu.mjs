import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const results=[];async function check(name,fn){try{await fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message})}}
function harness({reduced=true,fail=false,mobile=false}={}){
 const events={};class E{constructor(){this.events={};this.style={};this.dataset={};this.attrs={};this.clientWidth=mobile?340:1000;this.clientHeight=mobile?300:550;this.classList={contains:()=>true,remove(){},toggle(){}};this.anim=[]}addEventListener(n,f){this.events[n]=f}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}getBoundingClientRect(){return{left:0,top:0,width:this.clientWidth,height:this.clientHeight}}animate(frames){this.anim.push(frames);return{cancel(){},finished:Promise.resolve()}}focus(){document.activeElement=this}scrollTo(){}showModal(){this.open=true}close(){this.open=false}}
 const ids=Object.fromEntries(['pangu-original-viewer','pangu-original-fit','pangu-scene','pangu-r1-product','pangu-original-open','pangu-evidence-caption','pangu-shot-guide','pangu-explore-start','scene-back','pangu-source-open','pangu-original-close','pangu-original-title'].map(x=>[x,new E()]));
 const buttons=Array.from({length:4},()=>new E()),focus=new E(),ol=new E(),original=new E(),scroll=new E();ids['pangu-r1-product'].attrs.src='assets/pangu-r1/product-source.jpg';
 ids['pangu-original-viewer'].querySelector=s=>s.includes(' img')?original:scroll;
 ids['pangu-scene'].querySelectorAll=()=>buttons;ids['pangu-scene'].querySelector=()=>ol;ids['pangu-original-open'].querySelector=()=>focus;
 const document={getElementById:x=>ids[x],body:{dataset:{transition:'idle'}},addEventListener:(n,f)=>events[n]=f,dispatchEvent(){}};
 vm.runInNewContext(fs.readFileSync('pangu-r1.js','utf8'),{document,window:{addEventListener(){}},Image:class{set src(x){fail?this.onerror():this.onload()}},matchMedia:q=>({matches:q.includes('reduced')?reduced:mobile,addEventListener(){}}),getComputedStyle:e=>({transform:e.style.transform||'none',opacity:e.style.opacity||'0'}),CustomEvent:class{constructor(n,x){Object.assign(this,x)}},Promise});
 return{ids,buttons,focus,events,ol,original,click:i=>buttons[i].events.click(),flush:async()=>{for(let i=0;i<6;i++)await Promise.resolve()}};
}
for(const mobile of [false,true]){
 const h=harness({mobile});
 for(let i=0;i<4;i++){h.click(i);await h.flush();await check((mobile?'mobile':'desktop')+' shot '+i+' active and readable region fitted',()=>{assert.equal(h.ids['pangu-original-open'].dataset.cameraStage,String(i));assert.equal(h.buttons[i].attrs['aria-pressed'],'true');const f=h.focus.style;assert.ok(parseFloat(f.left)>=-.01&&parseFloat(f.top)>=-.01);assert.ok(parseFloat(f.width)<=h.ids['pangu-original-open'].clientWidth+.01&&parseFloat(f.height)<=h.ids['pangu-original-open'].clientHeight+.01)});}
 await check('materials uses separate archived image '+mobile,()=>assert.equal(h.ids['pangu-r1-product'].src,'assets/pangu-r1/materials-source.jpg'));
 h.ids['pangu-original-open'].events.click({currentTarget:h.ids['pangu-original-open']});await check('original viewer follows materials '+mobile,()=>assert.equal(h.original.src,h.ids['pangu-r1-product'].src));
 h.click(1);await h.flush();await check('return from materials restores product '+mobile,()=>assert.equal(h.ids['pangu-r1-product'].src,'assets/pangu-r1/product-source.jpg'));
 h.ol.events.keydown({key:'End',preventDefault(){}});await h.flush();await check('End selects fourth shot '+mobile,()=>assert.equal(h.ids['pangu-original-open'].dataset.cameraStage,'3'));
 let resume=0;h.events['cui:pangu-before-exit']({preventDefault(){},detail:{resume:()=>resume++}});await h.flush();await check('exit resets once and restores controls '+mobile,()=>{assert.equal(resume,1);assert.equal(h.ids['pangu-original-open'].inert,false);assert.equal(h.ids['pangu-original-open'].dataset.cameraStage,'0')});
}
const race=harness();race.click(3);race.click(2);await race.flush();await check('rapid pending material then preview cannot overwrite newer choice',()=>{assert.equal(race.ids['pangu-original-open'].dataset.cameraStage,'2');assert.equal(race.ids['pangu-r1-product'].src,'assets/pangu-r1/product-source.jpg')});
const bad=harness({fail:true});bad.click(1);bad.click(3);await bad.flush();await check('failed material download preserves last image and reports failure',()=>{assert.equal(bad.ids['pangu-original-open'].dataset.cameraStage,'1');assert.match(bad.ids['pangu-evidence-caption'].textContent,/加载失败/)});
const normal=harness({reduced:false});normal.click(1);normal.click(2);await normal.flush();await check('first three shots animate transforms in same node',()=>assert.ok(normal.ids['pangu-r1-product'].anim.every(f=>f[0].transform&&f[1].transform)));
normal.click(3);await normal.flush();await check('page change is opacity transition, not fake camera pan',()=>{const frames=normal.ids['pangu-r1-product'].anim.at(-1);assert.equal(frames[0].transform,frames[1].transform);assert.equal(frames[0].opacity,.72)});
await check('reduced motion starts no image animations',()=>assert.equal(race.ids['pangu-r1-product'].anim.length,0));
const context=harness(),frame=[245,80,1273,815];
context.events['cui:pangu-evidence']({detail:{stage:1,area:[245,80,610,260],frame}});await context.flush();
const sharedTransform=context.ids['pangu-r1-product'].style.transform,businessTop=context.focus.style.top;
context.events['cui:pangu-evidence']({detail:{stage:1,area:[245,340,610,140],frame}});await context.flush();
await check('context remains fixed while field focus moves',()=>{assert.equal(context.ids['pangu-r1-product'].style.transform,sharedTransform);assert.notEqual(context.focus.style.top,businessTop);assert.ok(parseFloat(context.focus.style.width)<context.ids['pangu-original-open'].clientWidth)});
context.events['cui:pangu-evidence']({detail:{stage:3,area:[245,80,610,260],frame:[0,0,9999,815]}});await context.flush();
await check('out of archive context frame is rejected',()=>assert.equal(context.ids['pangu-original-open'].dataset.cameraStage,'1'));
context.events['cui:pangu-evidence']({detail:{stage:3,area:[0,0,610,260],frame}});await context.flush();
await check('field outside its context frame is rejected',()=>assert.equal(context.ids['pangu-original-open'].dataset.cameraStage,'1'));
console.log(JSON.stringify({classification:'Synthetic DOM contracts, not browser visual acceptance',total:results.length,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length,results},null,2));if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
