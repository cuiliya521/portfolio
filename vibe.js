document.documentElement.classList.add('js');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced&&'IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.remove('pending');io.unobserve(entry.target)}}),{threshold:.08});
  document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('pending');io.observe(el)});
}
const bench=document.querySelector('[data-parallax]');
if(bench&&!reduced&&matchMedia('(pointer:fine)').matches){
  bench.addEventListener('pointermove',e=>{
    const r=bench.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    bench.querySelectorAll('.float-card,.scribble,.pin').forEach((el,i)=>{
      const d=(i%4+1)*1.6;
      el.style.translate=`${x*d}px ${y*d}px`;
    });
  });
  bench.addEventListener('pointerleave',()=>bench.querySelectorAll('.float-card,.scribble,.pin').forEach(el=>el.style.translate='0 0'));
}
