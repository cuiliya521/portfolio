import { animate, finePointer, reducedMotion } from './motion.js';
import { createPangu } from './pangu.js';
const body = document.body;
const world = document.querySelector('#world');
const intro = document.querySelector('#intro');
const enter = document.querySelector('#enter');
const status = document.querySelector('#boot-status');
let transitioning = false;
function setView(view) {
  body.dataset.view = view;
  world.inert = view !== 'workspace';
  intro.inert = view !== 'boot';
}
async function launch() {
  if (transitioning || body.dataset.view !== 'boot') return;
  transitioning = true;
  const origin = getComputedStyle(world).transform;
  setView('workspace');
  await animate(world, [{ transform: origin, borderRadius: '8px' }, { transform: 'none', borderRadius: '0' }], 1450);
  transitioning = false;
  document.querySelector('#open-pangu').focus({ preventScroll: true });
}
enter.addEventListener('click', launch);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && body.dataset.view === 'boot' && !e.repeat) { e.preventDefault(); launch(); }
});
document.querySelector('#restart').addEventListener('click', () => {
  if (transitioning) return;
  setView('boot');
  enter.focus({ preventScroll: true });
});
createPangu({ onOpen: () => setView('pangu'), onClose: () => setView('workspace') });
const product = document.querySelector('#pangu-object');
world.addEventListener('pointermove', e => {
  if (!finePointer.matches || reducedMotion.matches || body.dataset.view !== 'workspace') return;
  product.style.setProperty('--drift-x', `${(e.clientX / innerWidth - .5) * 8}px`);
  product.style.setProperty('--drift-y', `${(e.clientY / innerHeight - .5) * 6}px`);
});
world.addEventListener('pointerleave', () => {
  product.style.setProperty('--drift-x', '0px');
  product.style.setProperty('--drift-y', '0px');
});
document.querySelector('#product-image').decode().then(() => { status.textContent = '● READY · 工作现场已就绪'; }).catch(() => { status.textContent = '产品主图暂未载入，请刷新重试。'; });
