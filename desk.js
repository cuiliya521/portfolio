const desk=document.querySelector('.work-surface');
const phone=matchMedia('(max-width:700px)');
const assets=[...desk.children].filter(e=>e.matches('article,aside'));
const names=['盘古智绘','内容 Studio','Build Log','NoteGuard','GitHub'];
const order=[0,1,3,2,4];
let selected=0;
const map=document.createElement('p');map.className='desk-map';map.innerHTML='<b>05 OBJECTS</b><span>点击对象，打开工作资产</span>';
document.querySelector('.workspace-heading').append(map);
const nav=document.createElement('nav');nav.className='scene-nav';nav.setAttribute('aria-label','工作现场对象导航');
order.forEach((assetIndex,index)=>{const button=document.createElement('button');button.type='button';button.innerHTML=`<span>0${index+1}</span>${names[assetIndex]}`;button.setAttribute('aria-pressed',String(index===0));button.addEventListener('click',()=>select(index));nav.append(button);});
document.querySelector('.workspace-footer').before(nav);
const modal=document.createElement('dialog');modal.className='focus-window';modal.setAttribute('aria-labelledby','focus-title');
modal.innerHTML='<div class="focus-bar"><span id="focus-title"></span><button type="button" aria-label="关闭聚焦窗口">回到工作桌 ×</button></div><div class="focus-content"></div>';
document.body.append(modal);
modal.querySelector('button').addEventListener('click',()=>modal.close());
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
let opener;
modal.addEventListener('close',()=>{opener?.focus({preventScroll:true});});
assets.forEach((asset,index)=>{
 asset.dataset.object=names[index];
 if(index===0)return;
 const button=document.createElement('button');button.type='button';button.className='desk-open';button.setAttribute('aria-label',`聚焦${names[index]}`);
 button.addEventListener('click',()=>{
   opener=button;modal.querySelector('#focus-title').textContent=names[index]+' / WORK ASSET';
   const clone=asset.cloneNode(true);clone.inert=false;clone.removeAttribute('data-active');clone.querySelectorAll('.desk-open').forEach(e=>e.remove());
   modal.querySelector('.focus-content').replaceChildren(clone);modal.showModal();modal.querySelector('button').focus();
 });asset.append(button);
});
function select(index){selected=(index+order.length)%order.length;assets.forEach((asset,i)=>{const active=i===order[selected];asset.dataset.active=String(active);asset.inert=phone.matches&&!active;});[...nav.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));map.querySelector('span').textContent=phone.matches?`${selected+1} / 5 · 滑动或点击下方切换`:'点击对象，打开工作资产';}
let start;
desk.addEventListener('pointerdown',e=>{if(phone.matches&&e.pointerType==='touch')start={x:e.clientX,y:e.clientY};});
desk.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5){select(selected+(dx<0?1:-1));}});
desk.addEventListener('pointercancel',()=>{start=null;});
document.querySelector('#workspace').addEventListener('keydown',e=>{if(!phone.matches||e.target.closest('a,button'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();select(selected+(e.key==='ArrowRight'?1:-1));}});
phone.addEventListener('change',()=>{if(modal.open)modal.close();select(selected);});
addEventListener('hashchange',()=>{if(modal.open)modal.close();});
select(0);
