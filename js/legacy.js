(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const heroMedia = document.querySelector(".legacy-hero-media");
  if (heroMedia && window.innerWidth > 900 && window.gsap && window.ScrollTrigger) {
    gsap.to(heroMedia, {
      scale: 1.08,
      y: 24,
      ease: "none",
      scrollTrigger: {
        trigger: ".legacy-hero",
        start: "top top",
        end: "bottom top",
        scrub: 1.2
      }
    });
  }

  const storyVisual = document.querySelector(".legacy-story-visual");
  if (storyVisual && window.innerWidth > 900 && window.gsap && window.ScrollTrigger) {
    gsap.to(storyVisual.querySelector("img"), {
      scale: 1.055,
      ease: "none",
      scrollTrigger: {
        trigger: ".legacy-story",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2
      }
    });
  }


  // Storytelling image swap: the visual changes when the second story block enters view.
  const story = document.querySelector(".legacy-story");
  const founderImage = document.querySelector(".legacy-story-image--founder");
  const nameImage = document.querySelector(".legacy-story-image--name");
  const nameBlock = document.querySelectorAll(".legacy-story-block")[1];
  const visualLabel = document.querySelector('.legacy-visual-label');

  if (story && founderImage && nameImage && nameBlock) {
    const showNameImage = () => {
      founderImage.style.opacity = "0";
      nameImage.style.opacity = "1";
      if (visualLabel) visualLabel.textContent = visualLabel.dataset.nameLabel || 'The Name';
    };
    const showFounderImage = () => {
      founderImage.style.opacity = "1";
      nameImage.style.opacity = "0";
      if (visualLabel) visualLabel.textContent = visualLabel.dataset.founderLabel || 'The Founder';
    };

    if (window.IntersectionObserver) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) showNameImage();
          else if (entry.boundingClientRect.top > 0) showFounderImage();
        });
      }, { root: null, threshold: 0.18, rootMargin: "-10% 0px -35% 0px" });
      imageObserver.observe(nameBlock);
    } else if (!reduce && window.ScrollTrigger && window.gsap) {
      ScrollTrigger.create({
        trigger: nameBlock,
        start: "top 72%",
        end: "bottom 28%",
        onEnter: showNameImage,
        onEnterBack: showNameImage,
        onLeaveBack: showFounderImage
      });
    }
  }

  window.initLegacyLeadersMotion = () => {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    gsap.utils.toArray(".legacy-leader").forEach((leader) => {
      const image = leader.querySelector(".legacy-portrait");
      const copy = leader.querySelector(".legacy-leader-copy");
      const right = leader.classList.contains("legacy-leader-right");

      // Dynamic CMS cards already render with .in so they must never be
      // hidden first. Animate from their current visible state only.
      if (image) {
        gsap.to(image, {
          opacity:1, x:0, duration:1.05, ease:"power3.out",
          scrollTrigger:{trigger:leader, start:"top 82%", once:true}
        });
      }
      if (copy) {
        gsap.to(copy, {
          opacity:1, x:0, duration:1.05, delay:.1, ease:"power3.out",
          scrollTrigger:{trigger:leader, start:"top 78%", once:true}
        });
      }
    });
  };

  window.initLegacyLeadersMotion();
})();
