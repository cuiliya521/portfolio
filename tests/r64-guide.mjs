import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
class Element extends EventTarget {
 constructor(id){super();this.id=id;this.dataset={};this.attrs=new Set();this.textContent='原提示';this.inert=false;}
 toggleAttribute(name,on){on?this.attrs.add(name):this.attrs.delete(name);}
}
let count=0;
function check(label,fn){fn();count++;console.log(`PASS ${count} ${label}`);}
const doc=new EventTarget(),win=new EventTarget();
const ids=Object.fromEntries(['cui-test-workspace','agent-wrap','open-test-pangu','test-noteguard','test-xhs'].map(id=>[id,new Element(id)]));
const bubble=new Element(),intro=new Element(),mobile=new EventTarget();mobile.matches=false;
ids['agent-wrap'].querySelector=()=>bubble;ids['cui-test-workspace'].querySelector=()=>intro;
doc.getElementById=id=>ids[id];doc.body={dataset:{transition:'idle'}};doc.activeElement=null;
const fire=(target,type,props={})=>{const e=new Event(type);Object.assign(e,props);target.dispatchEvent(e);};
vm.runInNewContext(fs.readFileSync('cui-project-guide.js','utf8'),{document:doc,window:win,location:{hash:'#cui-workspace'},matchMedia:()=>mobile,queueMicrotask,performance:{getEntriesByType:()=>[]},sessionStorage:{getItem:()=>null,removeItem(){}},history:{state:null,replaceState(){}},crypto:{randomUUID:()=> 'synthetic'}});
check('workspace initial guidance',()=>assert.match(bubble.textContent,/陪你/));
for(const [id,text,key] of [['open-test-pangu','字段','pangu'],['test-noteguard','由人决定','noteguard'],['test-xhs','真实案例','xhs']]){
 const el=ids[id];
 fire(el,'pointerenter',{pointerType:'mouse'});
 check(`${key} hover message`,()=>assert.ok(bubble.textContent.includes(text)));
 check(`${key} role direction`,()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,key));
 check(`${key} entry feedback`,()=>assert.ok(el.attrs.has('data-cui-selected')));
 fire(el,'pointerleave');check(`${key} hover exit resets`,()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,''));
 fire(el,'focus');check(`${key} keyboard focus`,()=>assert.ok(bubble.textContent.includes(text)));
 fire(el,'click');check(`${key} confirmation releases motion`,()=>assert.equal(ids['agent-wrap'].dataset.guideCommitted,'true'));
 fire(doc,'cui:modechange',{detail:{mode:'pangu'}});check(`${key} departure clears selection`,()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,''));
 fire(doc,'cui:modechange',{detail:{mode:'workspace'}});
 fire(el,'blur');
}
mobile.matches=true;fire(mobile,'change');
check('mobile default visible existing intro',()=>assert.match(intro.textContent,/陪你/));
fire(ids['test-xhs'],'pointerdown');check('touch down feedback',()=>assert.match(intro.textContent,/真实案例/));
ids['cui-test-workspace'].inert=true;fire(ids['open-test-pangu'],'focus');
check('inert workspace ignores new focus',()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,'xhs')); // ignored focus leaves existing choice until controller clears
fire(doc,'cui:modechange',{detail:{mode:'hero'}});
check('hero intro restored',()=>assert.equal(intro.textContent,'原提示'));
ids['cui-test-workspace'].inert=false;
fire(doc,'cui:modechange',{detail:{mode:'workspace'}});
doc.activeElement=ids['test-noteguard'];fire(doc,'cui:camera',{detail:{phase:'settled',mode:'workspace'}});
check('return uses restored keyboard focus',()=>assert.match(intro.textContent,/由人决定/));
fire(win,'pageshow');check('bfcache clears retained selection',()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,''));
for(let n=0;n<30;n++){fire(ids['open-test-pangu'],'focus');fire(ids['open-test-pangu'],'blur');}
check('rapid focus changes reset',()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,''));
fire(ids['open-test-pangu'],'focus');fire(ids['test-xhs'],'pointerenter',{pointerType:'mouse'});
check('mouse exploration overrides restored focus',()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,'xhs'));
fire(ids['test-xhs'],'pointercancel');check('cancelled touch falls back to focus',()=>assert.equal(ids['agent-wrap'].dataset.projectGuide,'pangu'));
const source=fs.readFileSync('cui-project-guide.js','utf8');
check('no navigation or network ownership',()=>assert.ok(!/fetch\(|location\.(assign|replace)|history\.(back|forward|go|pushState)|preventDefault|stopPropagation|setTimeout/.test(source)));
check('no new role node',()=>assert.ok(!/createElement|innerHTML|cloneNode/.test(source)));
check('reduced motion explicit',()=>assert.match(fs.readFileSync('cui-project-guide.css','utf8'),/prefers-reduced-motion:reduce/));
console.log(`${count}/${count} PASS — synthetic DOM event contracts, not Chromium`);
