/* Experiment-only: original Workspace project card + opt-in native field visit.
   Without ?native-field=1 the original Pangu experience is fully unchanged. */
(() => {
 'use strict';
 if(new URLSearchParams(location.search).get('native-field')!=='1')return;
 const card=document.getElementById('open-test-pangu');
 if(!card)return;
 const style=document.createElement('style');
 style.textContent=`
 body[data-native-bridge="leaving"]{overflow:hidden}
 #native-field-bridge{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;background:linear-gradient(122deg,#f7f4eadd,#e4eedded);backdrop-filter:blur(10px);opacity:0;transition:opacity .25s ease;pointer-events:none;color:#204c3c;padding:25px}
 #native-field-bridge.enter{opacity:1}
 #native-field-bridge .bridge-inner{display:grid;grid-template-columns:minmax(80px,170px) minmax(0,400px);align-items:center;gap:26px}
 #native-field-bridge img{width:100%;height:auto;max-height:240px;object-fit:contain}
 #native-field-bridge .bridge-eyebrow{display:block;font:700 11px/1.6 system-ui;letter-spacing:.14em;color:#938253}
 #native-field-bridge h2{font:700 clamp(24px,4vw,37px)/1.35 system-ui,serif;margin:10px 0}
 #native-field-bridge p{font:14px/1.8 system-ui;color:#5b7967}
 @media(max-width:600px){#native-field-bridge .bridge-inner{grid-template-columns:95px 1fr;gap:10px}#native-field-bridge h2{font-size:23px}#native-field-bridge p{font-size:12px}}
 @media(prefers-reduced-motion:reduce){#native-field-bridge{transition:none;backdrop-filter:none}}
 `;
 document.head.append(style);
 let leaving=false;
 document.addEventListener('click',event=>{
  const button=event.target.closest('#open-test-pangu');
  if(!button||leaving||event.defaultPrevented)return;
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  leaving=true;
  const destination=new URL('experiments/native-field/',location.href);
  destination.searchParams.set('from','workspace');
  // Remember logical state: return link will land back in the Workspace.
  try{
   const workspace=document.getElementById('cui-test-workspace');
   const record={path:location.pathname,id:'',scrollTop:workspace?.scrollTop||0};
   // The original Workspace already restores scroll and focuses the Pangu card on return.
   sessionStorage.setItem('cui-workspace-return-v1',JSON.stringify(record));
   history.replaceState({...history.state,cuiWorkspaceReturn:record},'',location.href);
  }catch{}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){location.assign(destination.toString());return;}
  const curtain=document.createElement('div');curtain.id='native-field-bridge';curtain.setAttribute('role','status');
  curtain.innerHTML='<div class="bridge-inner"><img src="assets/workspace-v6/cui-guide.png" alt=""><div><span class="bridge-eyebrow">CUI × PANGU</span><h2>把 Prompt，<br>变成可操作的选择。</h2><p>进入盘古真实字段交互演示</p></div></div>';
  document.body.append(curtain);document.body.dataset.nativeBridge='leaving';
  requestAnimationFrame(()=>curtain.classList.add('enter'));
  setTimeout(()=>location.assign(destination.toString()),390);
 },true);
})();