/* V0.3: portfolio annotation of one verified archive field, never a product input. */
(()=>{
 const $=id=>document.getElementById(id),scene=$('pangu-scene'),root=$('pangu-demand'),view=$('pangu-original-open'),img=$('pangu-r1-product'),start=$('pangu-explore-start');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let active=false,found=false,quiet=false,ticket=0,raf=0,flight=null,timer;
 const field=[270,352,558,53]; // measured on immutable 1536 × 1024 source: style row only
 root.setAttribute('aria-label','真实字段探索 · 作品集演示层');
 root.innerHTML='<small>归档案例演示 · 非商户逐字原话</small><p class="field-request">给青提柠檬新品做一张<span id="field-word">清爽</span>的手机海报。</p><p class="field-invite">点右侧「画面风格」，看模糊想法怎样落地。</p><button id="field-mobile" type="button">探索画面风格 ↗</button><p id="field-mapping" hidden>清爽 → 画面风格：清爽明亮<br><small>把模糊感觉，变成可选择的输入。</small></p><p id="field-cui" role="status" hidden><b>CUI</b> · 商户说“清爽”，我们把它转成可选择的画面风格，而不是要求商户写 Prompt。</p><div class="field-tools"><button id="field-motion" type="button" aria-pressed="false">关闭动效</button><button id="field-quiet" type="button">关闭 CUI 提示</button><button id="field-exit" type="button">退出探索</button></div><small>真实归档成果，并非本次点击实时生成。</small>';
 const hotspot=document.createElement('button');hotspot.type='button';hotspot.id='field-hotspot';hotspot.hidden=true;hotspot.setAttribute('aria-label','探索画面风格 · 作品集演示标注');hotspot.setAttribute('aria-pressed','false');hotspot.innerHTML='<span>探索此字段</span>';
 view.append(hotspot);
 const tag=document.createElement('span');tag.id='field-semantic';tag.textContent='清爽';tag.hidden=true;tag.setAttribute('aria-hidden','true');document.body.append(tag);
 let motion=true;
 function camera(stage,area,frame){document.dispatchEvent(new CustomEvent('cui:pangu-evidence',{detail:{stage,area,frame}}));}
 function place(){
  const r=img.getBoundingClientRect(),v=view.getBoundingClientRect(),sx=r.width/1536,sy=r.height/1024;
  const [x,y,w,h]=field;
  Object.assign(hotspot.style,{left:(r.left-v.left+x*sx)+'px',top:(r.top-v.top+y*sy)+'px',width:(w*sx)+'px',height:(h*sy)+'px'});
 }
 function track(){if(!active)return;place();raf=requestAnimationFrame(track);}
 function cancel(){ticket++;clearTimeout(timer);flight?.cancel();flight=null;tag.hidden=true;}
 function explain(){if(!active||!found)return;$('field-mapping').hidden=false;$('field-cui').hidden=quiet;timer=setTimeout(()=>{$('field-cui').hidden=true;scene.dataset.fieldReading='true';},6500);}
 function discover(e){
  e?.preventDefault();e?.stopPropagation();if(!active||found)return;
  cancel();found=true;const n=ticket;scene.dataset.fieldFound='true';hotspot.setAttribute('aria-pressed','true');$('field-word').classList.add('mapped');
  // Same image, bounded frame includes composition row and poster; no substitute image.
  camera(1,field,[245,80,1273,815]);
  const from=$('field-word').getBoundingClientRect();
  tag.hidden=false;Object.assign(tag.style,{left:from.left+'px',top:from.top+'px'});
  const arrive=()=>{if(n!==ticket||!active)return;place();const to=hotspot.getBoundingClientRect();
   if(!motion||reduced.matches){tag.hidden=true;explain();return;}
   flight=tag.animate([{transform:'translate(0,0)',opacity:1},{transform:`translate(${(to.left-from.left)*.5}px,${to.top-from.top-20}px)`,opacity:1},{transform:`translate(${to.left-from.left}px,${to.top-from.top-20}px)`,opacity:0}],{duration:520,easing:'cubic-bezier(.22,.7,.2,1)'});
   flight.finished.then(()=>{if(n===ticket){tag.hidden=true;explain();}}).catch(()=>{});
  };
  if(!motion||reduced.matches)arrive();else timer=setTimeout(arrive,340);
 }
 function stop(resetCamera=true){cancel();active=false;found=false;cancelAnimationFrame(raf);root.hidden=true;root.inert=true;hotspot.hidden=true;hotspot.setAttribute('aria-pressed','false');$('field-word').classList.remove('mapped');$('field-mapping').hidden=true;$('field-cui').hidden=true;delete scene.dataset.fieldExplore;delete scene.dataset.fieldFound;delete scene.dataset.fieldReading;start.textContent='探索产品机制 →';start.setAttribute('aria-expanded','false');if(resetCamera)camera(0);}
 start.addEventListener('click',()=>{if(active){stop();return;}active=true;scene.dataset.fieldExplore='true';root.hidden=false;root.inert=false;hotspot.hidden=false;start.setAttribute('aria-expanded','true');start.textContent='退出探索';camera(0);track();});
 hotspot.addEventListener('click',discover);$('field-mobile').addEventListener('click',discover);
 $('field-exit').addEventListener('click',()=>{stop();start.focus({preventScroll:true});});
 $('field-motion').addEventListener('click',()=>{motion=!motion;scene.classList.toggle('field-no-motion',!motion);$('field-motion').textContent=motion?'关闭动效':'开启动效';$('field-motion').setAttribute('aria-pressed',String(!motion));cancel();if(found)explain();document.dispatchEvent(new CustomEvent('cui:pangu-motion',{detail:{disabled:!motion}}));});
 $('field-quiet').addEventListener('click',()=>{quiet=!quiet;$('field-quiet').textContent=quiet?'开启 CUI 提示':'关闭 CUI 提示';$('field-cui').hidden=quiet||!found;});
 $('pangu-source-open').addEventListener('click',()=>{cancel();if(found)explain();});
 scene.querySelectorAll('[data-pangu-stage]').forEach(b=>b.addEventListener('click',()=>{if(active)stop(false);}));
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!$('pangu-original-viewer').open){e.preventDefault();e.stopImmediatePropagation();stop();start.focus({preventScroll:true});}},true);
 document.addEventListener('cui:modechange',()=>stop(false));
 document.addEventListener('cui:pangu-before-exit',()=>stop(false));
 reduced.addEventListener('change',()=>{cancel();if(found)explain();});
 window.addEventListener('pagehide',()=>stop(false));
})();
