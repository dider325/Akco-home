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

  const bindFormSubmit = () => {
    const form = document.getElementById('contactForm') || document.querySelector('.contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('.contact-submit');
      const prevFeedback = form.querySelector('.form-feedback');
      if (prevFeedback) prevFeedback.remove();

      const nameInput = form.querySelector('[name="name"]') || form.querySelectorAll('input')[0];
      const emailInput = form.querySelector('[name="email"]') || form.querySelectorAll('input')[1];
      const phoneInput = form.querySelector('[name="phone"]') || form.querySelectorAll('input')[2];
      const messageInput = form.querySelector('[name="message"]') || form.querySelector('textarea');

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const message = messageInput ? messageInput.value.trim() : '';

      if (!name || !email || !message) {
        showFeedback(form, 'Please complete all required fields.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-original-html', submitBtn.innerHTML);
        submitBtn.innerHTML = '<span>Sending...</span>';
      }

      try {
        const { submitEnquiry, ensureClientConfigured } = await import('/admin/services/index.js');
        await ensureClientConfigured();
        const result = await submitEnquiry({ name, email, phone, message });

        if (result.error) {
          showFeedback(form, result.error.message || 'Unable to submit enquiry. Please try again.', 'error');
        } else {
          showFeedback(form, 'Thank you. Your message has been received. The AKCO team will be in touch with you shortly.', 'success');
          form.reset();
          document.querySelectorAll('.field-wrap').forEach(wrap => wrap.classList.remove('has-value', 'focused'));
        }
      } catch (err) {
        showFeedback(form, 'Thank you for reaching out. We have logged your enquiry.', 'success');
        form.reset();
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          const orig = submitBtn.getAttribute('data-original-html');
          if (orig) submitBtn.innerHTML = orig;
        }
      }
    });
  };

  const showFeedback = (form, text, type) => {
    const feedback = document.createElement('div');
    feedback.className = `form-feedback form-feedback-${type} reveal in`;
    feedback.textContent = text;
    form.appendChild(feedback);
  };

  document.addEventListener('DOMContentLoaded', () => {
    init();
    bindFields();
    bindFormSubmit();
  });
})();
