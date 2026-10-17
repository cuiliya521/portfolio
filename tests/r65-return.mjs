import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Target {
 constructor(id=''){this.id=id;this.dataset={};this.handlers={};this.attrs=new Set();this.textContent='原简介';this.inert=false;}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 fire(type,props={}){for(const fn of this.handlers[type]||[])fn({type,...props});}
 toggleAttribute(name,on){on?this.attrs.add(name):this.attrs.delete(name);}
}
const key='cui-project-visit-v1',results=[];
function fixture({store=new Map(),hash='#cui-workspace',type='back_forward',referrer='',from,storageFails=false}={}){
 const ids=Object.fromEntries(['cui-test-workspace','agent-wrap','open-test-pangu','test-noteguard','test-xhs'].map(id=>[id,new Target(id)]));
 const doc=new Target(),win=new Target(),bubble=new Target(),intro=new Target(),mobile=new Target();
 doc.body={dataset:{transition:'idle'}};doc.activeElement=null;doc.referrer=referrer;doc.getElementById=id=>ids[id];
 ids['agent-wrap'].querySelector=()=>bubble;ids['cui-test-workspace'].querySelector=()=>intro;
 const history={state:{cuiWorkspaceReturn:{id:'preserved',scrollTop:123}},replaceState(state){this.state=state;}};
 const storage={getItem:k=>{if(storageFails)throw Error('disabled');return store.get(k)||null;},setItem:(k,v)=>{if(storageFails)throw Error('disabled');store.set(k,v);},removeItem:k=>{if(storageFails)throw Error('disabled');store.delete(k);}};
 const location={hash,origin:'https://portfolio.test',pathname:'/',href:'https://portfolio.test/'+hash};
 const tasks=[];
 win.navigation=from?{activation:{from:{url:from}}}:undefined;
 vm.runInNewContext(fs.readFileSync('cui-project-guide.js','utf8'),{document:doc,window:win,location,history,sessionStorage:storage,performance:{getEntriesByType:()=>[{type}]},crypto:{randomUUID:()=>`ticket-${++fixture.serial}`},matchMedia:()=>mobile,queueMicrotask:fn=>tasks.push(fn),URL});
 return {doc,win,ids,bubble,intro,mobile,history,store,location,storage,tasks,flush(){while(tasks.length)tasks.shift()();},mode(mode){doc.fire('cui:modechange',{detail:{mode}});},settled(mode){doc.fire('cui:camera',{detail:{phase:'settled',mode}});}};
}
fixture.serial=0;
function visit(f,project,{ref='https://portfolio.test/',phase,back=false}={}){
 const doc=new Target(),win=new Target();doc.referrer=ref;
 const location={origin:'https://portfolio.test',pathname:project==='noteguard'?'/noteguard-case/':project==='xhs'?'/content-archive/':'/about-contact/'};
 vm.runInNewContext(fs.readFileSync('cui-project-visit.js','utf8'),{document:doc,window:win,location,sessionStorage:f.storage,URL});
 if(back)doc.fire('click',{button:0,target:{closest:()=>({})}});
 return {doc,win};
}
function check(name,fn){try{fn();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
const role=f=>f.ids['agent-wrap'].dataset.returnCompanion;
function pangu(f){f.ids['open-test-pangu'].fire('click');f.mode('pangu');f.settled('pangu');f.mode('workspace');f.settled('workspace');f.flush();}
check('Pangu settled visit returns once',()=>{const f=fixture();pangu(f);assert.equal(role(f),'pangu');assert.match(f.bubble.textContent,/字段到素材/);});
check('Interrupted Pangu entry does not claim a visit',()=>{const f=fixture();f.ids['open-test-pangu'].fire('click');f.mode('pangu');f.mode('workspace');f.settled('workspace');assert.equal(role(f),undefined);});
check('Repeated workspace event does not replay welcome',()=>{const f=fixture();pangu(f);f.mode('workspace');f.settled('workspace');assert.equal(role(f),undefined);});
check('Direct workspace stays default',()=>{const f=fixture();f.win.fire('pageshow');assert.equal(role(f),undefined);});
check('Hero entry stays default',()=>{const f=fixture({hash:''});f.mode('workspace');f.settled('workspace');assert.equal(role(f),undefined);});
check('Returning from another same-document mode stays default',()=>{const f=fixture();f.mode('other');f.mode('workspace');assert.equal(role(f),undefined);});
for(const [project,id,copy] of [['noteguard','test-noteguard',/AI 建议/],['xhs','test-xhs',/业务证据/]]){
 check(`${project} true witnessed Back`,()=>{const f=fixture();f.ids[id].fire('click');const token=f.history.state.cuiCompanionVisit;visit(f,project);f.win.navigation={activation:{from:{url:`https://portfolio.test/${project==='xhs'?'content-archive':'noteguard-case'}/`}}};f.win.fire('pageshow',{persisted:true});assert.equal(role(f),project);assert.match(f.bubble.textContent,copy);assert.equal(f.store.has(key),false);assert.equal(f.history.state.cuiCompanionVisit,token);});
 check(`${project} explicit return without Navigation API`,()=>{const f=fixture();f.ids[id].fire('click');visit(f,project,{back:true});f.win.fire('pageshow',{persisted:true});assert.equal(role(f),project);});
 check(`${project} reload rejects receipt`,()=>{const f=fixture({type:'reload'});f.ids[id].fire('click');visit(f,project,{back:true});f.win.fire('pageshow');assert.equal(role(f),undefined);});
 check(`${project} repeat pageshow never repeats`,()=>{const f=fixture();f.ids[id].fire('click');visit(f,project,{back:true});f.win.fire('pageshow');f.win.fire('pageshow');assert.equal(role(f),undefined);});
}
check('Click without project visit is insufficient',()=>{const f=fixture();f.ids['test-xhs'].fire('click');f.win.fire('pageshow');assert.equal(role(f),undefined);});
check('Mismatched history identity rejects',()=>{const f=fixture();f.ids['test-xhs'].fire('click');visit(f,'xhs',{back:true});f.history.state.cuiCompanionVisit='wrong';f.win.fire('pageshow');assert.equal(role(f),undefined);});
check('Different project page invalidates ticket',()=>{const f=fixture();f.ids['test-xhs'].fire('click');visit(f,'noteguard');assert.equal(f.store.has(key),false);});
check('About page invalidates previous project receipt',()=>{const f=fixture();f.ids['test-xhs'].fire('click');visit(f,'xhs',{back:true});visit(f,'about');f.win.fire('pageshow');assert.equal(role(f),undefined);});
check('External activation source rejects even explicit stale receipt',()=>{const f=fixture({from:'https://external.test/'});f.ids['test-xhs'].fire('click');visit(f,'xhs',{back:true});f.win.fire('pageshow',{persisted:true});assert.equal(role(f),undefined);});
check('Unknown Back source fails closed without claiming',()=>{const f=fixture();f.ids['test-xhs'].fire('click');visit(f,'xhs');f.win.fire('pageshow',{persisted:true});assert.equal(role(f),undefined);});
check('External referrer cannot witness initial project',()=>{const f=fixture();f.ids['test-xhs'].fire('click');visit(f,'xhs',{ref:'https://external.test/'});assert.equal(JSON.parse(f.store.get(key)).phase,'armed');});
check('Corrupt session record is ignored',()=>{const f=fixture({store:new Map([[key,'{bad']])});f.win.fire('pageshow');assert.equal(role(f),undefined);});
check('Storage disabled preserves existing guidance',()=>{const f=fixture({storageFails:true});f.ids['test-xhs'].fire('click');f.win.fire('pageshow');assert.equal(role(f),undefined);});
check('Navigation entry metadata is preserved',()=>{const f=fixture();f.ids['test-xhs'].fire('click');assert.equal(f.history.state.cuiWorkspaceReturn.scrollTop,123);assert.equal(f.history.state.cuiWorkspaceReturn.id,'preserved');});
check('Restored focus cannot replace return prompt',()=>{const f=fixture();pangu(f);f.ids['open-test-pangu'].fire('focus');assert.equal(role(f),'pangu');});
check('Stationary hover cannot replace return prompt',()=>{const f=fixture();pangu(f);f.ids['test-xhs'].fire('pointerenter',{pointerType:'mouse'});assert.equal(role(f),'pangu');});
check('Real pointer movement hands over',()=>{const f=fixture();pangu(f);f.ids['test-xhs'].fire('pointermove');assert.equal(role(f),undefined);assert.match(f.bubble.textContent,/真实案例/);});
check('Keyboard Tab then focus hands over',()=>{const f=fixture();pangu(f);f.doc.fire('keydown',{key:'Tab'});f.ids['test-noteguard'].fire('focus');assert.equal(role(f),undefined);assert.match(f.bubble.textContent,/由人决定/);});
check('Touch down hands over on mobile',()=>{const f=fixture();f.mobile.matches=true;pangu(f);assert.match(f.intro.textContent,/字段到素材/);f.ids['test-xhs'].fire('pointerdown',{pointerType:'touch'});assert.match(f.intro.textContent,/真实案例/);assert.equal(role(f),undefined);});
check('Repeated restored focus does not replay animation',()=>{const f=fixture();pangu(f);for(let i=0;i<20;i++)f.ids['open-test-pangu'].fire('focus');assert.equal(role(f),'pangu');});
check('Mode bubble double-write reconciles after controller stack',()=>{const f=fixture();pangu(f);f.ids['open-test-pangu'].fire('click');f.mode('pangu');f.settled('pangu');f.mode('workspace');f.bubble.textContent='legacy default';f.flush();assert.match(f.bubble.textContent,/字段到素材/);});
check('Stale microtasks cannot resurrect return in Hero',()=>{const f=fixture();pangu(f);f.mode('hero');f.flush();assert.equal(role(f),undefined);});
check('Rapid multiple distinct returns identify latest',()=>{const f=fixture();for(let i=0;i<25;i++){pangu(f);f.ids['test-xhs'].fire('pointerdown');}assert.equal(role(f),undefined);assert.match(f.bubble.textContent,/真实案例/);});
check('Forward replay without fresh click has no receipt',()=>{const f=fixture();f.ids['test-xhs'].fire('click');visit(f,'xhs',{back:true});f.win.fire('pageshow');visit(f,'xhs',{back:true});f.win.fire('pageshow');assert.equal(role(f),undefined);});
check('Original reload timing does not reject genuine bfcache return',()=>{const f=fixture({type:'reload',from:'https://portfolio.test/content-archive/'});f.ids['test-xhs'].fire('click');visit(f,'xhs');f.win.fire('pageshow',{persisted:true});assert.equal(role(f),'xhs');});
check('About activation rejects stale project visit',()=>{const f=fixture({from:'https://portfolio.test/about-contact/'});f.ids['test-xhs'].fire('click');visit(f,'xhs',{back:true});f.win.fire('pageshow',{persisted:true});assert.equal(role(f),undefined);});
check('New direct Workspace document has no matching history identity',()=>{const f=fixture();f.ids['test-xhs'].fire('click');visit(f,'xhs',{back:true});const g=fixture({store:f.store});g.win.fire('pageshow');assert.equal(role(g),undefined);});
check('Modified return click does not claim return',()=>{const f=fixture();f.ids['test-xhs'].fire('click');const v=visit(f,'xhs');v.doc.fire('click',{button:0,ctrlKey:true,target:{closest:()=>({})}});assert.equal(JSON.parse(f.store.get(key)).phase,'visited');});
check('Nonpersisted valid project referrer permits return',()=>{const f=fixture({referrer:'https://portfolio.test/content-archive/'});f.ids['test-xhs'].fire('click');visit(f,'xhs');f.win.fire('pageshow',{persisted:false});assert.equal(role(f),'xhs');});
check('Old keyboard activity cannot override new return',()=>{const f=fixture();f.doc.fire('keydown',{key:'Tab'});pangu(f);f.ids['open-test-pangu'].fire('focus');assert.equal(role(f),'pangu');});
check('Pangu Forward/Back replay does not welcome twice',()=>{const f=fixture();pangu(f);f.mode('pangu');f.settled('pangu');f.mode('workspace');f.settled('workspace');assert.equal(role(f),undefined);});
check('Reduced motion disables welcome animation',()=>assert.match(fs.readFileSync('cui-project-guide.css','utf8'),/prefers-reduced-motion:reduce[^}]*\{[^}]*data-return-companion[^}]*animation:none!important/s));
check('No route, focus, scroll or Esc ownership',()=>assert.ok(!/\.focus\(|scrollTo|scrollTop\s*=|preventDefault|history\.(back|go|pushState)|location\.(assign|replace)|fetch\(/.test(fs.readFileSync('cui-project-guide.js','utf8'))));
check('No second CUI or product node',()=>assert.ok(!/createElement|cloneNode|innerHTML/.test(fs.readFileSync('cui-project-guide.js','utf8'))));
const report={classification:'Node VM synthetic events only; NOT Chromium',total:results.length,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length,results};
console.log(JSON.stringify(report,null,2));if(report.fail)process.exitCode=1;
