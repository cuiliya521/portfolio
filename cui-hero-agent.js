/* Silent Hero greetings share one bubble; existing navigation remains independent. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const trigger = $('cui-agent-trigger');
  const welcome = $('cui-welcome');
  const agent = $('agent-wrap');
  const firstGreeting = welcome.textContent;
  const isHero = () => !document.body.classList.contains('cui-test-active');
  let welcomeTimer, hideTimer, tapTimer;

  function quietBubble(immediate = false){
    clearTimeout(welcomeTimer);
    clearTimeout(hideTimer);
    welcome.classList.remove('is-visible');
    if(immediate) welcome.hidden = true;
    else hideTimer = setTimeout(() => welcome.hidden = true,450);
  }
  function showBubble(message){
    clearTimeout(welcomeTimer);
    clearTimeout(hideTimer);
    welcome.textContent = message;
    welcome.hidden = false;
    requestAnimationFrame(() => {if(!welcome.hidden) welcome.classList.add('is-visible')});
    welcomeTimer = setTimeout(() => quietBubble(),5000);
  }
  trigger.addEventListener('click',() => {
    if(!isHero()) return;
    showBubble('我在这里呀！一起进去看看吧～');
    agent.classList.remove('cui-tapped');
    void agent.offsetWidth;
    agent.classList.add('cui-tapped');
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => agent.classList.remove('cui-tapped'),280);
  });
  window.addEventListener('keydown',e => {
    if(e.key === 'Escape' && isHero() && !welcome.hidden){
      e.preventDefault();e.stopImmediatePropagation();quietBubble(true);
    }
  },true);
  document.addEventListener('cui:modechange',() => {
    trigger.hidden = !isHero();
    if(!isHero()){
      quietBubble(true);
      clearTimeout(tapTimer);
      agent.classList.remove('cui-tapped');
    }
  });
  trigger.hidden = !isHero();
  let greeted = false;
  try {greeted = sessionStorage.getItem('cui-hero-welcomed-v1') === '1'} catch {}
  if(isHero() && !greeted){
    try {sessionStorage.setItem('cui-hero-welcomed-v1','1')} catch {}
    showBubble(firstGreeting);
  }
  window.addEventListener('pageshow',e => {if(e.persisted) quietBubble(true)});
})();
