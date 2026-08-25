(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const init = () => {
    const hero = document.querySelector('.contact-hero');
    if (!hero || reduce || innerWidth <= 900 || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    const tl = gsap.timeline({defaults:{ease:'power3.out'}});
    tl.from('.contact-hero-kicker',{y:22,opacity:0,duration:.7})
      .from('.contact-hero-title',{y:70,opacity:0,duration:1.05},'-=.45')
      .from('.contact-hero-bottom',{y:20,opacity:0,duration:.7},'-=.5');
    gsap.to('.contact-hero-grain',{yPercent:-10,scale:1.08,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:1.2}});
    gsap.to('.contact-hero-copy',{y:-70,opacity:.18,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:1.1}});
  };
  const bindFields = () => {
    document.querySelectorAll('.field-wrap').forEach(wrap => {
      const input = wrap.querySelector('input,textarea');
      if (!input) return;
      const sync = () => wrap.classList.toggle('has-value', !!input.value);
      input.addEventListener('focus',()=>wrap.classList.add('focused'));
      input.addEventListener('blur',()=>wrap.classList.remove('focused'));
      input.addEventListener('input',sync); sync();
    });
    const button = document.querySelector('.contact-submit');
    if(button && !reduce && innerWidth > 900){
      button.addEventListener('pointermove',e=>{const r=button.getBoundingClientRect();button.style.setProperty('--mx',`${e.clientX-r.left}px`);button.style.setProperty('--my',`${e.clientY-r.top}px`)});
    }
  };
  document.addEventListener('DOMContentLoaded',()=>{init();bindFields()});
})();
