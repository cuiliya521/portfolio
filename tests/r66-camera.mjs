import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Target{
 constructor(id=''){this.id=id;this.handlers={};this.dataset={};this.attrs=new Set();this.textContent='原简介';}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 fire(type,props={}){for(const fn of this.handlers[type]||[])fn({type,...props});}
 toggleAttribute(key,on){on?this.attrs.add(key):this.attrs.delete(key);}
}
function app({mobile=false,reduced=false,clock=true,combined=false}={}){
 const doc=new Target(),win=new Target(),role=new Target('agent-wrap');
 const ids=Object.fromEntries(['cui-test-workspace','open-test-pangu','test-noteguard','test-xhs'].map(id=>[id,new Target(id)]));ids['agent-wrap']=role;
 const bubble=new Target(),intro=new Target();role.querySelector=()=>bubble;ids['cui-test-workspace'].querySelector=()=>intro;
 doc.body={dataset:{transition:'idle'}};doc.getElementById=id=>ids[id];
 const mediaMobile=new Target(),mediaReduced=new Target();mediaMobile.matches=mobile;mediaReduced.matches=reduced;
 const calls=[],clocks=[],tasks=[];
 role.getAnimations=()=>clocks;
 role.animate=(frames,options)=>{const a={frames,options,startTime:null,cancelled:false,cancel(){this.cancelled=true;},finished:Promise.resolve()};calls.push(a);return a;};
 const context={document:doc,window:win,location:{hash:'#cui-workspace'},matchMedia:q=>q.includes('reduced-motion')?mediaReduced:mediaMobile,queueMicrotask:fn=>tasks.push(fn),sessionStorage:{getItem:()=>null,removeItem(){}},history:{state:{},replaceState(){}},performance:{getEntriesByType:()=>[]},crypto:{randomUUID:()=> 'synthetic'},URL};
 if(combined)vm.runInNewContext(fs.readFileSync('cui-project-guide.js','utf8'),context);
 vm.runInNewContext(fs.readFileSync('cui-pangu-companion.js','utf8'),context);
 const mode=next=>doc.fire('cui:modechange',{detail:{mode:next}});
 const event=(phase,ticket=1,next='pangu',extra={})=>doc.fire('cui:camera',{detail:{phase,ticket,mode:next,scene:'pangu',duration:620,...extra}});
 const putClock=(duration=620,startTime=1234)=>{clocks.length=0;if(clock)clocks.push({startTime,effect:{target:role,getTiming:()=>({duration}),getKeyframes:()=>[{transform:'none'}]}});};
 function enter(ticket=1){ids['open-test-pangu'].fire('click');mode('pangu');putClock();event('started',ticket);}
 return {doc,win,role,ids,bubble,intro,calls,clocks,mode,event,putClock,enter,mediaMobile,mediaReduced,flush(){while(tasks.length)tasks.shift()();}};
}
const results=[];
function check(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
check('Workspace initial role state',()=>assert.equal(app().role.dataset.panguCompanion,'workspace'));
check('Entering prepares without starting second clock',()=>{const f=app();f.mode('pangu');assert.equal(f.role.dataset.panguCompanion,'prepared');assert.equal(f.calls.length,0);});
check('Pangu started creates one additive animation',()=>{const f=app();f.enter();assert.equal(f.calls.length,1);assert.equal(f.role.dataset.panguCompanion,'approach-yield');});
check('Exact original clock startTime is reused',()=>{const f=app();f.enter();assert.equal(f.calls[0].startTime,1234);});
check('Original 620ms duration stays unchanged',()=>{const f=app();f.enter();assert.equal(f.calls[0].options.duration,620);});
check('Waypoints approach then yield and neutral end',()=>{const f=app();f.enter();const k=f.calls[0].frames;assert.equal(k[1].translate,'12px -6px');assert.equal(k[2].translate,'-6px -3px');assert.equal(k.at(-1).translate,'0px 0px');assert.equal(k.at(-1).rotate,'0deg');});
check('No transform or opacity overrides',()=>{const f=app();f.enter();assert.ok(f.calls[0].frames.every(k=>!('transform'in k)&&!('opacity'in k)));});
check('No filled displacement after camera',()=>{const f=app();f.enter();assert.equal(f.calls[0].options.fill,'none');});
check('Settled cancels only companion and enters reading',()=>{const f=app();f.enter();f.event('settled');assert.equal(f.calls[0].cancelled,true);assert.equal(f.role.dataset.panguCompanion,'reading');assert.equal(f.clocks.length,1);});
check('Return is a distinct reverse response',()=>{const f=app();f.enter();f.event('settled');f.mode('workspace');f.putClock();f.event('started',2,'workspace');assert.equal(f.role.dataset.panguCompanion,'return');assert.equal(f.calls[1].frames[1].translate,'-6px -3px');f.event('settled',2,'workspace');assert.equal(f.role.dataset.panguCompanion,'workspace');});
check('Skip settles immediately without own waiting',()=>{const f=app();f.enter();f.event('settled',1,'pangu',{reason:'skip'});assert.equal(f.calls[0].cancelled,true);});
check('Cancelled entry releases offsets',()=>{const f=app();f.enter();f.event('cancelled');assert.equal(f.calls[0].cancelled,true);assert.equal(f.role.dataset.panguCompanion,'cancelled');});
check('Esc interruption follows existing reverse camera',()=>{const f=app();f.enter();f.event('cancelled');f.mode('workspace');f.putClock();f.event('started',2,'workspace');f.event('settled',2,'workspace');assert.ok(f.calls.every(a=>a.cancelled));});
check('Repeated started ticket does not duplicate movement',()=>{const f=app();f.enter();f.event('started');assert.equal(f.calls.length,1);});
check('Old started ignored after newer ticket',()=>{const f=app();f.enter();f.mode('workspace');f.putClock();f.event('started',2,'workspace');f.event('started',1,'workspace');assert.equal(f.calls.length,2);});
check('Old settled cannot cancel a newer reverse',()=>{const f=app();f.enter();f.mode('workspace');f.putClock();f.event('started',2,'workspace');f.event('settled',1,'pangu');assert.equal(f.calls[1].cancelled,false);});
check('Stale cancelled cannot cancel newer reverse',()=>{const f=app();f.enter();f.mode('workspace');f.putClock();f.event('started',2,'workspace');f.event('cancelled',1);assert.equal(f.calls[1].cancelled,false);});
check('Old settled while preparing reverse is ignored',()=>{const f=app();f.enter();f.mode('workspace');f.event('settled',1,'workspace');assert.equal(f.role.dataset.panguCompanion,'prepared');});
check('Back/Forward simulation has no retained animation',()=>{const f=app();for(let t=1;t<=20;t++){const m=t%2?'pangu':'workspace';f.mode(m);f.putClock();f.event('started',t,m);f.event('settled',t,m);}assert.ok(f.calls.every(a=>a.cancelled));});
check('Mobile adds no second motion',()=>{const f=app({mobile:true});f.enter();assert.equal(f.calls.length,0);assert.equal(f.role.dataset.panguCompanion,'fallback');});
check('Mobile fallback settled cleans state',()=>{const f=app({mobile:true});f.enter();f.event('settled');assert.equal(f.role.dataset.panguCompanion,'reading');});
check('Reduced motion adds no motion',()=>{const f=app({reduced:true});f.enter();assert.equal(f.calls.length,0);});
check('Media change cancels owned animation',()=>{const f=app();f.enter();f.mediaReduced.fire('change');assert.equal(f.calls[0].cancelled,true);});
check('Resize to mobile cancels owned animation',()=>{const f=app();f.enter();f.mediaMobile.fire('change');assert.equal(f.calls[0].cancelled,true);});
check('Hidden document releases owned animation',()=>{const f=app();f.enter();f.doc.hidden=true;f.doc.fire('visibilitychange');assert.equal(f.calls[0].cancelled,true);});
check('Late started while hidden adds no motion',()=>{const f=app();f.doc.hidden=true;f.enter();assert.equal(f.calls.length,0);});
check('Pagehide releases owned animation',()=>{const f=app();f.enter();f.win.fire('pagehide');assert.equal(f.calls[0].cancelled,true);});
check('Pageshow never replays motion',()=>{const f=app();f.enter();f.win.fire('pageshow');assert.equal(f.calls.length,1);assert.equal(f.calls[0].cancelled,true);});
check('Missing shared clock fails closed',()=>{const f=app({clock:false});f.enter();assert.equal(f.calls.length,0);assert.equal(f.role.dataset.panguCompanion,'unsynced');});
check('Clock must have same duration',()=>{const f=app();f.mode('pangu');f.putClock(900);f.event('started');assert.equal(f.calls.length,0);});
check('Clock startTime must be numeric',()=>{const f=app();f.mode('pangu');f.putClock(620,null);f.event('started');assert.equal(f.calls.length,0);});
check('Unrelated scene cannot trigger animation',()=>{const f=app();f.mode('pangu');f.putClock();f.event('started',1,'pangu',{scene:'hero'});assert.equal(f.calls.length,0);});
check('Hero to Workspace is untouched',()=>{const f=app();f.mode('hero');f.mode('workspace');f.putClock();f.event('started',1,'workspace');assert.equal(f.calls.length,0);});
check('Duplicate same-mode render is not a crossing',()=>{const f=app();f.mode('workspace');f.putClock();f.event('started',1,'workspace');assert.equal(f.calls.length,0);});
check('Zero-duration settle works without started',()=>{const f=app();f.mode('pangu');f.event('settled',1,'pangu',{duration:0});assert.equal(f.calls.length,0);assert.equal(f.role.dataset.panguCompanion,'reading');});
check('Invalid duration rejected',()=>{const f=app();f.mode('pangu');f.putClock();f.event('started',1,'pangu',{duration:Infinity});assert.equal(f.calls.length,0);});
check('Invalid ticket rejected',()=>{const f=app();f.mode('pangu');f.putClock();f.event('started','not-a-ticket');assert.equal(f.calls.length,0);});
check('Animation API failure degrades without propagation',()=>{const f=app();f.role.animate=()=>{throw Error('unsupported');};f.enter();assert.equal(f.role.dataset.panguCompanion,'unsupported');});
check('R6.4 selection survives companion installation',()=>{const f=app({combined:true});f.ids['open-test-pangu'].fire('focus');assert.equal(f.role.dataset.projectGuide,'pangu');assert.match(f.bubble.textContent,/字段选择/);});
check('R6.5 return state remains after reverse settles',()=>{const f=app({combined:true});f.enter();f.event('settled');f.mode('workspace');f.putClock();f.event('started',2,'workspace');f.event('settled',2,'workspace');f.flush();assert.equal(f.role.dataset.returnCompanion,'pangu');assert.match(f.bubble.textContent,/字段到素材/);assert.ok(f.calls.every(a=>a.cancelled));});
check('R6.5 return takeover remains independent',()=>{const f=app({combined:true});f.enter();f.event('settled');f.mode('workspace');f.event('settled',2,'workspace');f.ids['test-xhs'].fire('pointermove');assert.equal(f.role.dataset.returnCompanion,undefined);assert.equal(f.role.dataset.projectGuide,'xhs');});
check('Late cancel after settle does not corrupt reading state',()=>{const f=app();f.enter();f.event('settled');f.event('cancelled');assert.equal(f.role.dataset.panguCompanion,'reading');});
check('Unsupported animation still settles cleanly',()=>{const f=app({clock:false});f.enter();f.event('settled');assert.equal(f.role.dataset.panguCompanion,'reading');});
check('Controller retains shared startTime assignment before announcement',()=>{const s=fs.readFileSync('cui-workspace-test.js','utf8');assert.match(s,/activeAnimations\.forEach\(a=>a.startTime=clock.startTime\);announce\(\{phase:'started',mode,ticket,duration,scene:'pangu'\}\)/);});
check('Controller retains 620/220ms project durations',()=>assert.match(fs.readFileSync('cui-workspace-test.js','utf8'),/mobileMotion.matches \? 220 : 620/));
check('Companion cannot own navigation focus or create DOM',()=>assert.ok(!/createElement|cloneNode|innerHTML|\.focus\(|history\.|location\.(assign|replace)|preventDefault|setTimeout|requestAnimationFrame|fetch\(/.test(fs.readFileSync('cui-pangu-companion.js','utf8'))));
const report={classification:'Node VM animation doubles + source contracts; NOT Chromium',total:results.length,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,results};console.log(JSON.stringify(report,null,2));if(report.fail)process.exitCode=1;
