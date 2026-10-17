import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const key='cui-ng-entry-v1';
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
class Target{
 constructor(){this.dataset={};this.handlers={};this.animations=[];}
 addEventListener(k,f){(this.handlers[k]??=[]).push(f);}
 fire(k,p={}){for(const f of this.handlers[k]||[])f({type:k,...p});}
 animate(frames,options){const d=deferred(),a={frames,options,finished:d.promise,done:d.resolve,cancelled:false,cancel(){this.cancelled=true;}};this.animations.push(a);return a;}
}
const intent=(age=0)=>new Map([[key,JSON.stringify({path:'/noteguard-case/',at:Date.now()-age})]]);
function app({review=false,store=new Map(),mobile=false,reduced=false,type='navigate',referrer='https://p.test/#cui-workspace',storageFails=false}={}){
 const doc=new Target(),win=new Target(),frame=new Target(),others=[new Target(),new Target()];
 doc.documentElement=new Target();doc.body={dataset:{transition:'idle'}};doc.referrer=referrer;
 const ids=Object.fromEntries(['test-noteguard','agent-wrap','cui-test-workspace'].map(k=>[k,new Target()]));
 doc.getElementById=k=>ids[k];doc.querySelector=()=>frame;doc.querySelectorAll=()=>others;
 const reduce=new Target(),phone=new Target();reduce.matches=reduced;phone.matches=mobile;
 const location={origin:'https://p.test',pathname:review?'/noteguard-case/':'/',href:'https://p.test/'+(review?'noteguard-case/':'#cui-workspace')};
 const storage={getItem:k=>{if(storageFails)throw Error('blocked');return store.get(k)||null;},setItem:(k,v)=>{if(storageFails)throw Error('blocked');store.set(k,v);},removeItem:k=>{if(storageFails)throw Error('blocked');store.delete(k);}};
 vm.runInNewContext(fs.readFileSync('noteguard-entry.js','utf8'),{document:doc,window:win,location,sessionStorage:storage,matchMedia:q=>q.includes('reduced')?reduce:phone,performance:{getEntriesByType:()=>[{type}]},URL,Date,Promise});
 return {doc,win,frame,ids,others,reduce,phone,store,click(p={}){doc.fire('click',{button:0,target:{closest:()=>ids['test-noteguard']},...p});}};
}
function vt(){const ready=deferred(),finish=deferred();return {ready:ready.promise,finished:finish.promise,readyD:ready,finishD:finish,skips:0,skipTransition(){this.skips++;}};}
const results=[];async function test(name,fn){try{await fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
await test('Confirmation focuses original card and records intent',()=>{const f=app();f.click();assert.equal(f.doc.documentElement.dataset.ngEntry,'departing');assert.equal(f.ids['test-noteguard'].animations.length,1);assert.ok(f.store.has(key));});
await test('CUI has an outgoing directional response',()=>{const f=app();f.click();assert.equal(f.ids['agent-wrap'].animations[0].frames[1].translate,'8px -2px');});
await test('Other windows recede without black overlay',()=>{const f=app();f.click();assert.ok(f.others.every(n=>n.animations[0].frames[1].opacity===.94));});
await test('Click is not intercepted',()=>{const f=app();assert.doesNotThrow(()=>f.click({preventDefault(){throw Error('intercepted');}}));});
await test('Touch/keyboard-generated click follows normal path',()=>{const f=app({mobile:true});f.click({detail:0});assert.equal(f.ids['agent-wrap'].animations.length,0);assert.equal(f.ids['test-noteguard'].animations[0].options.duration,90);});
for(const flag of ['hidden','inert'])await test(flag+' workspace cannot arm entry',()=>{const f=app();f.ids['cui-test-workspace'][flag]=true;f.click();assert.equal(f.store.size,0);});
await test('Running Hero camera cannot arm entry',()=>{const f=app();f.doc.body.dataset.transition='running';f.click();assert.equal(f.store.size,0);});
await test('Modified click remains native',()=>{const f=app();f.click({ctrlKey:true});assert.equal(f.store.size,0);});
await test('Reduced motion adds no outgoing motion',()=>{const f=app({reduced:true});f.click();assert.equal(f.ids['test-noteguard'].animations.length,0);});
await test('Animation API failure cannot prevent navigation',()=>{const f=app();f.ids['test-noteguard'].animate=()=>{throw Error('unsupported');};assert.doesNotThrow(()=>f.click());});
await test('Storage failure cannot prevent navigation',()=>assert.doesNotThrow(()=>app({storageFails:true}).click()));
await test('Native swap allowed only for NoteGuard target',()=>{const f=app();f.click();const t=vt();f.win.fire('pageswap',{viewTransition:t,activation:{entry:{url:'https://p.test/noteguard-case/'}}});assert.equal(t.skips,0);});
await test('Other project transition skipped',()=>{const f=app();f.click();const t=vt();f.win.fire('pageswap',{viewTransition:t,activation:{entry:{url:'https://p.test/content-archive/'}}});assert.equal(t.skips,1);});
await test('Native reveal selects actual review frame',()=>{const f=app({review:true,store:intent()}),t=vt();f.win.fire('pagereveal',{viewTransition:t});assert.equal(f.doc.documentElement.dataset.ngEntry,'arriving');assert.equal(f.frame.animations.length,0);assert.equal(f.store.size,0);});
await test('Duplicate reveal cannot replay',()=>{const f=app({review:true,store:intent()}),t=vt();f.win.fire('pagereveal',{viewTransition:t});const t2=vt();f.win.fire('pagereveal',{viewTransition:t2});assert.equal(t2.skips,1);});
await test('Native finished clears temporary names',async()=>{const f=app({review:true,store:intent()}),t=vt();f.win.fire('pagereveal',{viewTransition:t});t.finishD.resolve();await flush();assert.equal(f.doc.documentElement.dataset.ngEntry,undefined);});
await test('Native failure falls back to readable real frame',async()=>{const f=app({review:true,store:intent()}),t=vt();f.win.fire('pagereveal',{viewTransition:t});t.readyD.reject(Error('snapshot failure'));await flush();assert.equal(f.frame.animations.length,1);});
await test('Unsupported native browser gets local entry',()=>{const f=app({review:true,store:intent()});f.doc.fire('DOMContentLoaded');assert.equal(f.frame.animations[0].options.duration,180);});
await test('Mobile local entry is light and readable',()=>{const f=app({review:true,store:intent(),mobile:true});f.doc.fire('DOMContentLoaded');assert.equal(f.frame.animations[0].options.duration,120);assert.equal(f.frame.animations[0].frames[0].opacity,.94);});
for(const [name,opts] of [['direct',{}],['external',{store:intent(),referrer:'https://external.test/'}],['reload',{store:intent(),type:'reload'}],['history',{store:intent(),type:'back_forward'}],['slow load',{store:intent(20000)}],['future intent',{store:intent(-10000)}],['reduced',{store:intent(),reduced:true}]])await test(name+' visit remains unanimated and usable',()=>{const f=app({review:true,...opts});f.doc.fire('DOMContentLoaded');assert.equal(f.frame.animations.length,0);});
await test('User interaction immediately stops arrival',()=>{const f=app({review:true,store:intent()});f.doc.fire('DOMContentLoaded');f.doc.fire('pointerdown');assert.equal(f.frame.animations[0].cancelled,true);});
await test('Esc passes through to original handlers',()=>{const f=app({review:true,store:intent()});f.doc.fire('DOMContentLoaded');f.doc.fire('keydown',{key:'Escape',preventDefault(){throw Error('stolen');}});assert.equal(f.frame.animations[0].cancelled,true);});
await test('Pagehide cancels own effects',()=>{const f=app();f.click();f.win.fire('pagehide');assert.equal(f.ids['test-noteguard'].animations[0].cancelled,true);});
await test('BFCache return clears departing state and intent',()=>{const f=app();f.click();f.win.fire('pageshow',{persisted:true});assert.equal(f.doc.documentElement.dataset.ngEntry,undefined);assert.equal(f.store.size,0);});
await test('Reduced-motion change skips native effect',()=>{const f=app({review:true,store:intent()}),t=vt();f.win.fire('pagereveal',{viewTransition:t});f.reduce.matches=true;f.reduce.fire('change');assert.equal(t.skips,1);});
await test('Missing review frame skips native safely',()=>{const f=app({review:true,store:intent()}),t=vt();f.doc.querySelector=()=>null;f.win.fire('pagereveal',{viewTransition:t});assert.equal(t.skips,1);});
await test('Old local completion cannot clear new native state',async()=>{const f=app();f.click();const a=f.ids['test-noteguard'].animations[0],t=vt();f.win.fire('pageswap',{viewTransition:t,activation:{entry:{url:'https://p.test/noteguard-case/'}}});a.done();await flush();assert.equal(f.doc.documentElement.dataset.ngEntry,'departing');});
await test('Local completion releases metadata',async()=>{const f=app({review:true,store:intent()});f.doc.fire('DOMContentLoaded');f.frame.animations[0].done();await flush();assert.equal(f.doc.documentElement.dataset.ngEntry,undefined);});
// Run the actual router block, including its original listener, with a navigation spy.
function router({throws=false}={}){
 const s=fs.readFileSync('workspace-v6.js','utf8'),a=s.indexOf(' let noteGuardDeparting=false,'),b=s.indexOf(" document.querySelectorAll('[data-workspace-info]')",a);
 assert.ok(a>=0&&b>a);const button=new Target(),win=new Target();win.navigation=new Target();let count=0,fail=throws,time=0;
 vm.runInNewContext(s.slice(a,b),{window:win,$:()=>button,performance:{now:()=>time},show(){count++;if(fail)throw Error('assign rejected');}});
 return {button,win,get count(){return count;},recover(){fail=false;},advance(ms){time+=ms;}};
}
await test('Actual router emits one navigation for rapid clicks',()=>{const f=router();for(let i=0;i<20;i++)f.button.fire('click',{currentTarget:f.button});assert.equal(f.count,1);});
await test('Actual router restores entry on pageshow',()=>{const f=router();f.button.fire('click');f.win.fire('pageshow');f.button.fire('click');assert.equal(f.count,2);});
await test('Actual router unlocks on navigateerror',()=>{const f=router();f.button.fire('click');f.win.navigation.fire('navigateerror');f.button.fire('click');assert.equal(f.count,2);});
await test('Assign exception permits explicit retry',()=>{const f=router({throws:true});assert.throws(()=>f.button.fire('click'));f.recover();f.button.fire('click');assert.equal(f.count,2);});
await test('Explicit retry after cooldown works without Navigation API events',()=>{const f=router();f.button.fire('click');f.advance(801);f.button.fire('click');assert.equal(f.count,2);});
await test('Same-page history cancels arriving decoration',()=>{const f=app({review:true,store:intent()});f.doc.fire('DOMContentLoaded');f.win.fire('popstate');assert.equal(f.frame.animations[0].cancelled,true);});
await test('Four-stage trace immediately takes priority over entry',()=>{const f=app({review:true,store:intent()});f.doc.fire('DOMContentLoaded');f.doc.fire('ng:trace');assert.equal(f.frame.animations[0].cancelled,true);});
await test('Mobile skips cross-document geometry but keeps local readable entry',()=>{const f=app({review:true,store:intent(),mobile:true}),t=vt();f.win.fire('pagereveal',{viewTransition:t});assert.equal(t.skips,1);assert.equal(f.frame.animations[0].options.duration,120);});
await test('Leaving Workspace for Hero clears pending enhancement',()=>{const f=app();f.click();f.doc.fire('cui:modechange',{detail:{mode:'hero'}});assert.equal(f.store.size,0);assert.equal(f.doc.documentElement.dataset.ngEntry,undefined);});
await test('Cached review cannot replay incoming enhancement after leaving',()=>{const f=app({review:true,store:intent()});f.doc.fire('DOMContentLoaded');f.win.fire('pagehide');const t=vt();f.win.fire('pagereveal',{viewTransition:t});assert.equal(t.skips,1);});
await test('Enhancement creates no DOM, requests or alternate router',()=>assert.ok(!/createElement|cloneNode|innerHTML|fetch\(|location\.(assign|replace)|history\.|preventDefault|setTimeout/.test(fs.readFileSync('noteguard-entry.js','utf8'))));
await test('Early native lifecycle listener uses head classic script',()=>{for(const p of ['index.html','noteguard-case/index.html']){const s=fs.readFileSync(p,'utf8');assert.ok(s.indexOf('noteguard-entry.js')<s.indexOf('</head>'));assert.match(s,/<script src="(?:\.\.\/)?noteguard-entry.js"><\/script>/);}});
await test('Only window pairs; distinct old/new CUI snapshot names',()=>{const s=fs.readFileSync('noteguard-entry.css','utf8');assert.match(s,/:root\{view-transition-name:none\}/);assert.match(s,/ng-cui-departure/);assert.match(s,/ng-cui-arrival/);assert.match(s,/navigation:none/);});
await test('Case explicitly says not a live audit',()=>assert.match(fs.readFileSync('noteguard-case/index.html','utf8'),/案例展示，非实时审核/));
const report={classification:'Synthetic DOM, native/WAAPI promise doubles, extracted actual router block; NOT Chromium',total:results.length,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,results};console.log(JSON.stringify(report,null,2));if(report.fail)process.exitCode=1;
