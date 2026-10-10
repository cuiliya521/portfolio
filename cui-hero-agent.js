/* Local, silent Hero guide. No generated responses, audio or external services. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const trigger = $('cui-agent-trigger');
  const panel = $('cui-agent-panel');
  const welcome = $('cui-welcome');
  const agent = $('agent-wrap');
  const meet = $('cui-meet-liya');
  const intro = $('cui-liya-intro');
  const isHero = () => !document.body.classList.contains('cui-test-active');
  let welcomeTimer, hideTimer, tapTimer;

  function quietWelcome(immediate = false){
    clearTimeout(welcomeTimer);
    clearTimeout(hideTimer);
    welcome.classList.remove('is-visible');
    if(immediate) welcome.hidden = true;
    else hideTimer = setTimeout(() => welcome.hidden = true,450);
  }
  function closePanel(restoreFocus = true){
    quietWelcome(true);
    if(panel.open) panel.close();
    trigger.setAttribute('aria-expanded','false');
    meet.setAttribute('aria-expanded','false');
    intro.hidden = true;
    if(restoreFocus && isHero()) trigger.focus({preventScroll:true});
  }
  function togglePanel(){
    if(!isHero()) return;
    if(panel.open){closePanel();return}
    quietWelcome(true);
    panel.show(); // Modeless: the existing Hero entrances remain immediately usable.
    trigger.setAttribute('aria-expanded','true');
    $('cui-panel-close').focus({preventScroll:true});
    agent.classList.remove('cui-tapped');
    void agent.offsetWidth;
    agent.classList.add('cui-tapped');
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => agent.classList.remove('cui-tapped'),280);
  }
  trigger.addEventListener('click',togglePanel);
  $('cui-panel-close').addEventListener('click',() => closePanel());
  panel.addEventListener('cancel',e => {e.preventDefault();closePanel()});
  // Keep panel arrow keys from invoking the Hero's keyboard navigation.
  panel.addEventListener('keydown',e => e.stopPropagation());
  window.addEventListener('keydown',e => {
    if(e.key === 'Escape' && panel.open){
      e.preventDefault();e.stopImmediatePropagation();closePanel();
    }
  },true);
  meet.addEventListener('click',() => {
    intro.hidden = !intro.hidden;
    meet.setAttribute('aria-expanded',String(!intro.hidden));
  });
  for(const [control,existing] of [['cui-enter-workspace','enter-workspace'],['cui-view-projects','hero-view-projects']]){
    $(control).addEventListener('click',() => {closePanel(false);$(existing).click()});
  }
  document.addEventListener('cui:modechange',() => {
    trigger.hidden = !isHero();
    if(!isHero()){
      closePanel(false);
      clearTimeout(tapTimer);
      agent.classList.remove('cui-tapped');
    }
  });
  trigger.hidden = !isHero();
  // Mark on first arrival, so a fast exit/return does not repeat the welcome.
  let greeted = false;
  try {greeted = sessionStorage.getItem('cui-hero-welcomed-v1') === '1'} catch {}
  if(isHero() && !greeted){
    try {sessionStorage.setItem('cui-hero-welcomed-v1','1')} catch {}
    welcome.hidden = false;
    requestAnimationFrame(() => {if(!welcome.hidden) welcome.classList.add('is-visible')});
    welcomeTimer = setTimeout(() => quietWelcome(),5000);
  }
  window.addEventListener('pageshow',e => {if(e.persisted){closePanel(false);quietWelcome(true)}});
})();
