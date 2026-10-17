import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDemand,reduceDemand,explorationOrder,feedback,fragments} from '../pangu-demand-model.mjs';
const results=[];function test(name,fn){try{fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message})}}
const act=(s,...actions)=>actions.reduce(reduceDemand,s);
const select=id=>({type:'select',id}),assign=dimension=>({type:'assign',dimension});
test('entry has no fabricated visitor choices',()=>assert.deepEqual(createDemand().assignments,{}));
test('one choice unlocks evidence without full completion',()=>{const s=act(createDemand(),select('style'),assign('visual'),{type:'evidence'});assert.equal(s.phase,'evidence');assert.equal(s.order.length,1)});
test('empty evidence does not silently classify',()=>assert.equal(reduceDemand(createDemand(),{type:'evidence'}).phase,'arrange'));
for(const id of Object.keys(fragments))for(const dimension of ['business','visual','delivery'])test(`${id} retains ${dimension} interpretation without penalty`,()=>{
 const s=act(createDemand(),select(id),assign(dimension),{type:'evidence'});assert.equal(s.assignments[id],dimension);assert.equal(explorationOrder(s)[0],id);assert.doesNotMatch(feedback(s),/答错|错误|正确率|得分/);
});
test('format as visual gets explicit nonjudgmental contrast',()=>assert.match(feedback(act(createDemand(),select('format'),assign('visual'))),/确实影响画面.*平台规格与比例/));
test('changing interpretation preserves other fragment assignments',()=>{const s=act(createDemand(),select('product'),assign('business'),select('style'),assign('delivery'),select('product'),assign('visual'));assert.deepEqual(s.assignments,{product:'visual',style:'delivery'});assert.deepEqual(s.order,['product','style'])});
test('undo replacement restores previous interpretation',()=>{let s=act(createDemand(),select('product'),assign('business'),assign('visual'));s=reduceDemand(s,{type:'undo'});assert.equal(s.assignments.product,'business')});
test('undo first choice returns to empty structure',()=>{let s=act(createDemand(),select('format'),assign('delivery'),{type:'undo'});assert.deepEqual(s.assignments,{});assert.deepEqual(s.order,[])});
test('repeated identical choice does not add undo entries',()=>{const s=act(createDemand(),select('style'),assign('visual'),assign('visual'));assert.equal(s.history.length,1)});
test('clear removes choices and keeps guide dismissal',()=>{const s=act(createDemand(),select('product'),assign('business'),{type:'quiet'},{type:'clear'});assert.equal(s.quiet,true);assert.deepEqual(s.assignments,{})});
test('skip explores without inventing assignments',()=>{const s=reduceDemand(createDemand(),{type:'skip'});assert.equal(s.phase,'evidence');assert.deepEqual(s.assignments,{})});
test('opposite visitor start changes actual first evidence',()=>{const a=act(createDemand(),select('format'),assign('visual'));const b=act(createDemand(),select('product'),assign('business'));assert.notEqual(explorationOrder(a)[0],explorationOrder(b)[0])});
test('evidence trail visits each fragment exactly once before wrap',()=>{let s=act(createDemand(),select('format'),assign('delivery'),{type:'evidence'});const visited=[];for(let n=0;n<4;n++){visited.push(explorationOrder(s)[s.cursor]);s=reduceDemand(s,{type:'next'})}assert.deepEqual(visited,['format','product','style','format'])});
test('edit preserves visitor interpretation after archive exploration',()=>{const s=act(createDemand(),select('format'),assign('visual'),{type:'evidence'},{type:'edit'});assert.equal(s.selected,'format');assert.equal(s.assignments.format,'visual');assert.equal(s.phase,'arrange')});
test('archived result is explicitly not a new generated image',()=>assert.match(feedback(reduceDemand(createDemand(),{type:'result'})),/不是.*实时生成/));
test('invalid fragment and category cannot add state',()=>{const s=createDemand();assert.equal(reduceDemand(s,select('__proto__')),s);assert.equal(reduceDemand(s,assign('business')),s);assert.deepEqual(act(s,select('product'),assign('url')),reduceDemand(s,select('product')))});
test('reset releases all state on re-entry',()=>{const s=act(createDemand(),select('style'),assign('visual'),{type:'result'},{type:'reset'});assert.deepEqual(s,createDemand())});
test('platform evidence includes independent ratio and quantity rows',()=>assert.match(fragments.format.fields,/图片比例.*生成数量/));
console.log(JSON.stringify({classification:'Deterministic state tests; not browser or touch acceptance',total:results.length,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,results},null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
