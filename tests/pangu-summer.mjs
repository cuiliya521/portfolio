import assert from 'node:assert/strict';
import {createDemand,reduceDemand} from '../pangu-demand-model.mjs';
import {summerResponse} from '../pangu-summer-response.mjs';
const results=[];const test=(name,fn)=>{try{fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message})}};
const act=(s,...a)=>a.reduce(reduceDemand,s),select={type:'select',id:'style'};
const s=reduceDemand(createDemand(),select);
test('idle does not opt into new presentation',()=>assert.equal(summerResponse(createDemand()),null));
test('click selects without classifying or discovering',()=>{assert.deepEqual(s.assignments,{});assert.equal(summerResponse(s).discovering,false);assert.equal(summerResponse(s).mode,'selected')});
for(const dimension of ['business','visual','delivery']){
 const judged=reduceDemand(s,{type:'assign',dimension});
 test(dimension+' judgment stays in arrange with full archive',()=>{assert.equal(judged.phase,'arrange');assert.equal(summerResponse(judged).discovering,false);assert.equal(judged.assignments.style,dimension)});
 const evidence=reduceDemand(judged,{type:'evidence'});
 test(dimension+' explicit evidence preserves judgment and real field target',()=>{const v=summerResponse(evidence);assert.equal(v.mode,'discover');assert.equal(evidence.assignments.style,dimension);assert.match(v.mapping,/画面风格／构图建议/);assert.doesNotMatch(v.message,/答错|错误|现场生成/)})
}
test('repeated same judgment creates no new history',()=>{let a=reduceDemand(s,{type:'assign',dimension:'visual'});assert.equal(reduceDemand(a,{type:'assign',dimension:'visual'}),a)});
test('undo returns to pending judgment rather than auto assigning',()=>{const a=act(s,{type:'assign',dimension:'visual'},{type:'undo'});assert.equal(summerResponse(a).mode,'selected');assert.deepEqual(a.assignments,{})});
test('clear removes opt-in and pending judgment',()=>{assert.equal(summerResponse(reduceDemand(s,{type:'clear'})),null)});
test('other demand remains on original path',()=>{assert.equal(summerResponse(reduceDemand(s,{type:'select',id:'product'})),null)});
test('edit preserves interpretation while returning archive to rest',()=>{const a=act(s,{type:'assign',dimension:'business'},{type:'evidence'},{type:'edit'});assert.equal(summerResponse(a).discovering,false);assert.equal(a.assignments.style,'business')});
test('result leaves the experiment and preserves archived result',()=>{assert.equal(summerResponse(reduceDemand(s,{type:'result'})),null)});
test('both frames contain exact approved visual region',()=>{const v=summerResponse(s);for(const [x,y,w,h] of [v.frame,v.mobileFrame]){assert.ok(x<=245&&y<=340&&x+w>=855&&y+h>=480);assert.ok(x>=0&&y>=0&&x+w<=1536&&y+h<=1024)}});
console.log(JSON.stringify({classification:'Deterministic state/presentation tests, not visual or real touch acceptance',total:results.length,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length,results},null,2));if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
