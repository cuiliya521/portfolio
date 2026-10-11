/* Original screenshot viewer only; no product simulation or R2 exploration. */
(() => {
  const viewer = document.getElementById('pangu-original-viewer');
  const scroll = viewer.querySelector('.pangu-original-scroll');
  const fit = document.getElementById('pangu-original-fit');
  let opener;
  const open = event => {
    opener = event.currentTarget;
    viewer.classList.remove('is-fit');
    fit.textContent = '适应屏幕';
    viewer.showModal();
    scroll.scrollTo(0, 0);
    document.getElementById('pangu-original-close').focus();
  };
  document.getElementById('pangu-original-open').addEventListener('click', open);
  document.getElementById('pangu-source-open').addEventListener('click', open);
  document.getElementById('pangu-original-close').addEventListener('click', () => viewer.close());
  fit.addEventListener('click', () => {
    const fitted = viewer.classList.toggle('is-fit');
    fit.textContent = fitted ? '原尺寸' : '适应屏幕';
    scroll.scrollTo(0, 0);
  });
  // Keep native dialog Escape handling while preventing the site navigation handler.
  window.addEventListener('keydown', event => {
    if (viewer.open && event.key === 'Escape') event.stopImmediatePropagation();
  }, true);
  viewer.addEventListener('close', () => {
    if (document.getElementById('pangu-scene').classList.contains('open')) opener?.focus({preventScroll:true});
  });
  document.addEventListener('cui:modechange', event => {
    if (event.detail.mode !== 'pangu' && viewer.open) viewer.close();
  });
})();
