import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const results=[];
const test=(name,fn)=>{try{fn();results.push({name,status:'PASS'})}catch(e){results.push({name,status:'FAIL',error:e.message})}};
class Node{
 constructor(){this.hidden=false;this.dataset={};this.attrs={};this.events={};this.classList={add(){},remove(){},toggle(){}};this.style={};this.parentElement={insertBefore(){}}}
 addEventListener(k,f){this.events[k]=f}setAttribute(k,v){this.attrs[k]=v}focus(){this.focused=true}scrollTo(){}replaceChildren(){}append(){}animate(){return {cancel(){},finished:Promise.resolve()}}
}
const ids=new Map(),get=id=>{if(!ids.has(id))ids.set(id,new Node());return ids.get(id)};
const steps=[0,1,2].map(step=>Object.assign(new Node(),{dataset:{step:String(step)}}));
const tabs=['cover','text','full'].map(view=>Object.assign(new Node(),{dataset:{view}}));
const selectors=new Map();const query=s=>{if(!selectors.has(s))selectors.set(s,new Node());return selectors.get(s)};
let reduce=false;
const source=fs.readFileSync(new URL('../content-archive/archive.js',import.meta.url),'utf8');
const instrumented=source.replace('  paint();','  globalThis.api={selectAnalysis,startAnalysis,endAnalysis,guidance,setPhase:v=>phase=v,setCase:v=>current=v};\n  paint();');
const context={document:{getElementById:get,querySelector:query,querySelectorAll:s=>s==='.reader-tab'?tabs:steps,createTextNode:x=>x,createElement:()=>new Node(),addEventListener(){},referrer:'',body:{style:{}}},matchMedia:()=>({get matches(){return reduce}}),Image:class{decode(){return Promise.resolve()}},window:{addEventListener(){}},innerWidth:390,history:{},location:{},URL,console};
vm.createContext(context);vm.runInContext(instrumented,context);const a=context.api;
test('three approved interpretation stages',()=>assert.equal(a.guidance.length,3));
for(const [i,view] of ['cover','text','full'].entries())test(`stage ${i} selects original ${view}`,()=>{a.selectAnalysis(i);assert.match(get('readerImage').src,new RegExp(view==='full'?'yellow_note_redacted':`yellow_${view==='text'?'text':'cover'}_original_crop`));assert.equal(steps[i].attrs['aria-pressed'],'true')});
test('only evidence stage shows metric',()=>{a.selectAnalysis(0);assert.equal(get('analysisResult').hidden,true);a.selectAnalysis(2);assert.equal(get('analysisResult').hidden,false)});
test('backend evidence gap explicit',()=>assert.match(get('analysisBoundary').textContent,/缺对应后台指标截图/));
test('strategy does not claim personal attribution or causality',()=>{a.selectAnalysis(1);assert.match(get('analysisBoundary').textContent,/不证明.*个人独立.*不证明转化因果/)});
test('invalid stage leaves current surface intact',()=>{const before=get('readerImage').src;for(const v of [-1,3,NaN,'1'])a.selectAnalysis(v);assert.equal(get('readerImage').src,before)});
test('rapid changes settle on selected source',()=>{for(let i=0;i<100;i++)a.selectAnalysis(i%3);assert.equal(get('readerBox').dataset.exploration,'0')});
test('keyboard end and home select stages',()=>{a.setPhase('open');get('noteAnalysis').hidden=false;for(const [key,expected] of [['End','2'],['Home','0'],['ArrowLeft','2'],['ArrowRight','0']]){query('.analysis-steps').events.keydown({key,preventDefault(){}});assert.equal(get('readerBox').dataset.exploration,expected)}});
test('closed reader ignores stage keyboard',()=>{a.setPhase('closed');query('.analysis-steps').events.keydown({key:'End',preventDefault(){throw Error('unexpected')}});assert.equal(get('readerBox').dataset.exploration,'0')});
test('green case never acquires yellow metric guide',()=>{a.setPhase('open');a.setCase(1);get('noteAnalysis').hidden=true;a.startAnalysis();assert.equal(get('noteAnalysis').hidden,true)});
test('reduced motion leaves readable source',()=>{a.setCase(0);reduce=true;a.selectAnalysis(2);assert.match(get('readerImage').src,/yellow_note/)});
test('animation failure never blocks evidence selection',()=>{reduce=false;get('analysisContent').animate=()=>{throw Error('unsupported')};a.selectAnalysis(1);assert.match(get('readerImage').src,/yellow_text/)});
test('exit clears exploration state and restores launch focus',()=>{a.endAnalysis(true);assert.equal(get('readerBox').dataset.exploration,undefined);assert.equal(get('startAnalysis').focused,true)});
const html=fs.readFileSync(new URL('../content-archive/index.html',import.meta.url),'utf8');
test('time and attribution boundary visible',()=>{assert.match(html,/7 月制作，8—9 月陆续发布/);assert.match(html,/不等于在职增长贡献/)});
test('one existing CUI image retained',()=>assert.equal((html.match(/class="cui"/g)||[]).length,1));
test('existing return receipt script retained',()=>assert.match(html,/cui-project-visit.js/));
test('no model or navigation added to analysis',()=>assert.doesNotMatch(source.slice(source.indexOf('const guidance='),source.indexOf('function paint()')),/fetch\(|location\.|history\./));
test('Pangu continuation explicit return uses the existing Workspace href',()=>{context.location.href='https://example.test/content-archive/?entry=pangu';context.location.origin='https://example.test';context.document.referrer='https://example.test/';context.history.length=3;context.history.back=()=>{throw Error('must not history-back to Pangu')};get('workspaceBack').events.click({preventDefault(){throw Error('default Workspace link must remain')}})});
test('ordinary Workspace entry retains history return',()=>{context.location.href='https://example.test/content-archive/';let back=0,prevented=0;context.history.back=()=>back++;get('workspaceBack').events.click({preventDefault(){prevented++}});assert.equal(back,1);assert.equal(prevented,1)});
console.log(JSON.stringify({kind:'synthetic DOM + source assertions; not browser',total:results.length,pass:results.filter(x=>x.status==='PASS').length,results},null,2));
if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
