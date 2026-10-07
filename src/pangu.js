import { animate, reducedMotion } from './motion.js';
const chapters = [
  { label: '01 / 结构化输入', title: '把描述，变成选择。', description: '行业、场景、主题、风格、构图、规格。六个字段，让商户用熟悉的选择表达需求。', name: '六字段', region: [30,75,460,455] },
  { label: '02 / 实时预览', title: '选择之后，看到结果。', description: '输入与预览同处一个工作台。让商户先判断：这张图，能不能用在自己的生意里。', name: '实时预览', region: [495,25,390,530] },
  { label: '03 / 素材复用', title: '结果，成为下一次的起点。', description: '收藏、下载、复用。让一次生成留在素材库里，而不是消失在一轮对话中。', name: '素材复用', region: [28,555,850,85] },
  { label: '04 / 完整工作流', title: '把 AI，放进一条真实工作流。', description: '结构化输入 → 实时预览 → 结果沉淀与复用。降低使用门槛，比增加 Prompt 技巧更重要。', name: '全貌', region: [0,0,910,660] },
];
export function createPangu({ onOpen, onClose }) {
  const scene = document.querySelector('#pangu-scene');
  const camera = document.querySelector('#camera');
  const viewport = document.querySelector('#product-viewport');
  const image = document.querySelector('#product-image');
  const launch = document.querySelector('#open-pangu');
  const next = document.querySelector('#next-chapter');
  const nav = document.querySelector('#chapter-buttons');
  let index = 0, busy = false, open = false, matrix, wheelAccumulator = 0, touchStart;
  chapters.forEach((chapter,i) => {
    const button = document.createElement('button');
    button.textContent = `${String(i+1).padStart(2,'0')} ${chapter.name}`;
    button.addEventListener('click', () => go(i)); nav.append(button);
  });
  function geometry(i) {
    const mobile = innerWidth <= 700, w = viewport.clientWidth, h = viewport.clientHeight;
    const region = mobile && i === 2 ? [480,555,390,85] : chapters[i].region;
    const [x,y,rw,rh] = region, margin = mobile ? 18 : 26;
    const scale = Math.min((w-margin*2)/rw,(h-margin*2)/rh,i===2 ? (mobile?1.15:1.7) : 2.3);
    const cameraX = !mobile && i === 0 ? w*.08-x*scale : w/2-(x+rw/2)*scale;
    const centerY = i === 2 ? h*.77 : h/2;
    return { x:cameraX, y:centerY-(y+rh/2)*scale, scale };
  }
  const transform = m => `translate(${m.x}px,${m.y}px) scale(${m.scale})`;
  function copy(i) {
    const chapter = chapters[i];
    document.querySelector('#chapter-label').textContent=chapter.label;
    document.querySelector('#chapter-title').textContent=chapter.title;
    document.querySelector('#chapter-description').textContent=chapter.description;
    [...nav.children].forEach((b,n)=>b.setAttribute('aria-current',n===i?'step':'false'));
    next.innerHTML=i===3?'回到工作现场 <span>↖</span>':'下一步 <span>→</span>';
    scene.dataset.chapter=i;
  }
  async function go(i) {
    if(!open||busy||i===index||i<0||i>3)return;
    busy=true; const previous=matrix; index=i; matrix=geometry(i); copy(i);
    camera.style.transform=transform(matrix);
    await animate(camera,[{transform:transform(previous)},{transform:transform(matrix)}],1050);
    busy=false;
  }
  async function enter() {
    if(busy||open)return; busy=true;
    const from=image.getBoundingClientRect(); onOpen(); scene.hidden=false; open=true; index=0; copy(0);
    camera.append(image); matrix=geometry(0); camera.style.transform=transform(matrix);
    const vp=viewport.getBoundingClientRect();
    await animate(camera,[{transform:`translate(${from.left-vp.left}px,${from.top-vp.top}px) scale(${from.width/910})`},{transform:transform(matrix)}],1100);
    scene.classList.add('settled'); busy=false;
    document.querySelector('#close-pangu').focus({preventScroll:true});
  }
  async function leave() {
    if(busy||!open)return; busy=true; scene.classList.remove('settled');
    const world=document.querySelector('#world');
    world.style.transition='none'; onClose();
    const target=launch.getBoundingClientRect(),vp=viewport.getBoundingClientRect();
    world.style.transition='';
    const destination={x:target.left-vp.left,y:target.top-vp.top,scale:target.width/910};
    await animate(camera,[{transform:transform(matrix)},{transform:transform(destination)}],850);
    launch.prepend(image); scene.hidden=true; open=false; busy=false; launch.focus({preventScroll:true});
  }
  launch.addEventListener('click',enter);
  document.querySelector('#close-pangu').addEventListener('click',leave);
  document.querySelector('#overview').addEventListener('click',()=>go(3));
  next.addEventListener('click',()=>index===3?leave():go(index+1));
  scene.addEventListener('wheel',e=>{
    if(e.ctrlKey)return; e.preventDefault();
    if(busy){wheelAccumulator=0;return;} wheelAccumulator+=e.deltaY;
    if(Math.abs(wheelAccumulator)>90){go(index+Math.sign(wheelAccumulator));wheelAccumulator=0;}
  },{passive:false});
  viewport.addEventListener('touchstart',e=>{touchStart=e.touches[0].clientX;},{passive:true});
  viewport.addEventListener('touchend',e=>{const delta=touchStart-e.changedTouches[0].clientX;if(Math.abs(delta)>50)go(index+Math.sign(delta));},{passive:true});
  document.addEventListener('keydown',e=>{
    if(!open)return;
    if(e.key==='Escape')leave();
    if(['ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();go(index+1);}
    if(['ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();go(index-1);}
  });
  window.addEventListener('resize',()=>{if(!open||busy)return;matrix=geometry(index);camera.style.transform=transform(matrix);});
  reducedMotion.addEventListener('change',()=>{if(open&&!busy){matrix=geometry(index);camera.style.transform=transform(matrix);}});
}
