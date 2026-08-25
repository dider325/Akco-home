(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const heroMedia = document.querySelector(".legacy-hero-media");
  if (heroMedia && window.innerWidth > 900) {
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
  if (storyVisual && window.innerWidth > 900) {
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

  gsap.utils.toArray(".legacy-leader").forEach((leader) => {
    const image = leader.querySelector(".legacy-portrait");
    const copy = leader.querySelector(".legacy-leader-copy");
    const right = leader.classList.contains("legacy-leader-right");

    if (image) {
      gsap.fromTo(image, {opacity:0, x:right ? 42 : -42}, {
        opacity:1, x:0, duration:1.05, ease:"power3.out",
        scrollTrigger:{trigger:leader, start:"top 82%", once:true}
      });
    }
    if (copy) {
      gsap.fromTo(copy, {opacity:0, x:right ? -30 : 30}, {
        opacity:1, x:0, duration:1.05, delay:.1, ease:"power3.out",
        scrollTrigger:{trigger:leader, start:"top 78%", once:true}
      });
    }
  });
})();
