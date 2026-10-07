export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
export const ease = 'cubic-bezier(.22,1,.36,1)';
export async function animate(element, frames, duration = 1000) {
  const animation = element.animate(frames, { duration: reducedMotion.matches ? 1 : duration, easing: ease, fill: 'both' });
  try { await animation.finished; } catch { /* A newer transition took over. */ }
  animation.cancel();
}
