import assert from 'node:assert/strict';
import {evidenceAreas,presentationFor} from '../pangu-demand-view.mjs';
import {createDemand,reduceDemand} from '../pangu-demand-model.mjs';
const checks=[];
const contains=(a,b)=>b[0]>=a[0]&&b[1]>=a[1]&&b[0]+b[2]<=a[0]+a[2]&&b[1]+b[3]<=a[1]+a[3];
function test(name,fn){try{fn();checks.push({name,status:'PASS'})}catch(e){checks.push({name,status:'FAIL',error:e.message})}}
// Bounds read from the immutable 1536x1024 product source, not rendered DOM estimates.
const content={product:[270,100,560,240],style:[270,350,560,125],format:[270,485,560,395]};
for(const id of Object.keys(content)){
 test(id+' retains complete labels and values',()=>assert.ok(contains(evidenceAreas[id],content[id])));
 test(id+' stays within archive',()=>assert.ok(contains([0,0,1536,1024],evidenceAreas[id])));
 test(id+' first choice controls actual evidence region',()=>{let s=createDemand();for(const a of [{type:'select',id},{type:'assign',dimension:'visual'},{type:'evidence'}])s=reduceDemand(s,a);assert.deepEqual(presentationFor(s).area,evidenceAreas[id]);assert.equal(s.assignments[id],'visual')});
}
test('business title is included whole',()=>assert.ok(contains(evidenceAreas.product,[270,100,190,35])));
test('three different viewports',()=>assert.equal(new Set(Object.values(evidenceAreas).map(JSON.stringify)).size,3));
console.log(JSON.stringify({classification:'source geometry and state contracts, not browser visual evidence',total:checks.length,pass:checks.filter(x=>x.status==='PASS').length,fail:checks.filter(x=>x.status==='FAIL').length,checks},null,2));
if(checks.some(x=>x.status==='FAIL'))process.exitCode=1;
