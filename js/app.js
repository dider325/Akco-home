(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function renderHeader(){
    const h=document.querySelector("[data-header]");
    if(!h)return;
    h.innerHTML=`<div class="wrap nav">
      <a class="logo" href="index.html">AKCO</a>
      <nav class="links" id="siteLinks">
        <a href="index.html">Home</a>
        <a href="projects.html">Projects</a>
        <a href="about.html">About AKCO</a>
        <a href="legacy.html">Legacy & Leadership</a>
        <a href="contact.html">Contact</a>
      </nav>
      <button class="menu" id="menuButton" aria-label="Open menu">Menu</button>
    </div>`;
    const current=location.pathname.split("/").pop()||"index.html";
    document.querySelectorAll(".links a").forEach(a=>{
      if(a.getAttribute("href")===current)a.classList.add("active");
    });
    const menu=document.getElementById("menuButton");
    const links=document.getElementById("siteLinks");
    menu.onclick=()=>{
      links.classList.toggle("open");
      document.body.classList.toggle("menu-open");
      menu.textContent=links.classList.contains("open")?"Close":"Menu";
    };
    links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
      links.classList.remove("open");document.body.classList.remove("menu-open");menu.textContent="Menu";
    }));
  }

  function renderFooter(){
    const f=document.querySelector("[data-footer]");
    if(!f)return;
    f.innerHTML=`<div class="wrap">
      <div class="footer-grid">
        <div><div class="footer-brand">AKCO</div><p>Homes Done Thoughtfully — a boutique residential developer based in Dhaka.</p></div>
        <div><div class="footer-title">Office</div><p>${AKCO_DATA.contact.address}</p><p>${AKCO_DATA.contact.phone}</p></div>
        <div><div class="footer-title">Email</div><p>${AKCO_DATA.contact.email}</p></div>
        <div><div class="footer-title">Social</div>${AKCO_DATA.social.map(s=>`<a href="${s.url}">${s.label}</a>`).join("")}</div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} AKCO Real Estate Ltd.</span><span>Homes Done Thoughtfully</span></div>
    </div>`;
  }

  function renderServices(){
    document.querySelectorAll("[data-services]").forEach(el=>{
      el.innerHTML=AKCO_DATA.services.map(s=>`<article class="service reveal"><div class="eyebrow">${s.number}</div><h3>${s.title}</h3><p>Approved service description will be added when supplied by AKCO.</p></article>`).join("");
    });
  }

  function projectMarkup(p,i){
    const imgs=(p.images&&p.images.length?p.images:[p.featuredImage]).slice(0,4);
    return `<article class="project project-editorial reveal" data-status="${p.status}">
      <div class="project-media">
        <div class="project-media-stage">
          ${imgs.map((src,j)=>`<img class="project-slide ${j===0?"is-active":""}" src="${src}" alt="${p.name} — view ${j+1}" data-slide="${j}">`).join("")}
          <div class="project-media-meta"><span>${String(i+1).padStart(2,"0")}</span><span>${p.status}</span></div>
          <div class="project-media-line"><span></span></div>
        </div>
      </div>
      <div class="project-info">
        <div class="project-info-top"><div class="meta">${p.location}</div><div class="project-year">${p.year||"—"}</div></div>
        <h3>${p.name}</h3>
        <div class="status">${p.status}</div>
        <p>${p.description}</p>
        <a class="btn project-link" href="contact.html"><span>Explore Project</span><span>↗</span></a>
      </div>
    </article>`;
  }

  function projectMotion(){
    if(reduce||innerWidth<=900||!window.gsap||!window.ScrollTrigger)return;
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll(".project-editorial").forEach((project,index)=>{
      const stage=project.querySelector(".project-media-stage");
      const active=project.querySelector(".project-slide.is-active");
      if(!stage||!active)return;
      gsap.fromTo(stage,{y:34},{y:-34,ease:"none",scrollTrigger:{trigger:project,start:"top bottom",end:"bottom top",scrub:1.15}});
      gsap.fromTo(active,{x:index%2===0?-28:28,scale:1.035},{x:index%2===0?28:-28,scale:1,ease:"none",scrollTrigger:{trigger:project,start:"top bottom",end:"bottom top",scrub:1.2}});
    });
  }

  function renderProjects(){
    const el=document.querySelector("[data-projects]");
    if(!el)return;
    const filters=document.querySelector("[data-filters]");
    const draw=(status="All")=>{
      const list=status==="All"?AKCO_DATA.projects:AKCO_DATA.projects.filter(p=>p.status===status);
      el.innerHTML=list.map((p,i)=>projectMarkup(p,i)).join("");
      reveal();
      projectMotion();
    };
    if(filters){
      filters.innerHTML=["All","Completed","Ongoing","Upcoming"].map(x=>`<button class="filter ${x==="All"?"active":""}" data-filter="${x}">${x}</button>`).join("");
      filters.querySelectorAll("button").forEach(b=>b.onclick=()=>{
        filters.querySelectorAll("button").forEach(x=>x.classList.remove("active"));
        b.classList.add("active");draw(b.dataset.filter);
      });
    }
    draw();
  }

  function renderSelected(){
    const el=document.querySelector("[data-selected]");
    if(!el)return;
    el.innerHTML=AKCO_DATA.projects.slice(0,2).map(projectMarkup).join("");
  }

  function renderLegacy(){
    const el=document.querySelector("[data-legacy]");
    if(el)el.innerHTML=AKCO_DATA.legacy.map(x=>`<article class="history reveal"><img src="${x.image}" alt="${x.name}"><div><h3>${x.name}</h3><p>Approved legacy content will be added here. No biography or historical claim has been invented.</p></div></article>`).join("");
    const leaders=document.querySelector("[data-leaders]");
    if(leaders)leaders.innerHTML=AKCO_DATA.leadership.map(x=>`<article class="leader reveal"><img src="${x.image}" alt="${x.name}"><h3>${x.name}</h3><div class="role">${x.role}</div></article>`).join("");
  }

  function reveal(){
    const items=document.querySelectorAll(".reveal:not(.in), .reveal-left:not(.in), .reveal-right:not(.in)");
    if(reduce){items.forEach(x=>x.classList.add("in"));return}
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})
    },{threshold:.1});
    items.forEach(x=>io.observe(x));
  }

  function pageTransitions(){
    const wipe=document.querySelector(".page-wipe");
    if(!wipe||reduce)return;
    document.querySelectorAll("a[href]").forEach(a=>{
      const href=a.getAttribute("href");
      if(!href||href.startsWith("#")||href.startsWith("mailto:")||href.startsWith("tel:")||href.startsWith("http"))return;
      a.addEventListener("click",e=>{
        if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
        e.preventDefault();wipe.style.transform="translateX(0)";
        setTimeout(()=>location.href=href,720);
      });
    });
  }

  function smoothScroll(){
    if(reduce||innerWidth<=900||!window.Lenis)return;
    const lenis=new Lenis({duration:1.05,smoothWheel:true});
    function raf(t){lenis.raf(t);requestAnimationFrame(raf)}requestAnimationFrame(raf);
  }

  function cinematicHome(){
    const hero=document.querySelector(".hero");
    if(!hero||reduce||innerWidth<=900||!window.gsap)return;
    gsap.registerPlugin(ScrollTrigger);
    const tl=gsap.timeline({scrollTrigger:{trigger:hero,start:"top top",end:"+=110%",scrub:1,pin:true}});
    tl.to(".hero-media",{scale:1.04,duration:1})
      .to(".hero-mark",{scale:.78,opacity:.04,duration:1},"<")
      .to(".hero-content",{y:-45,opacity:.15,duration:1},"<");
  }

  function cinematicAbout(){
    const story=document.querySelector(".story");
    if(!story||reduce||innerWidth<=900||!window.gsap)return;
    gsap.registerPlugin(ScrollTrigger);
    const steps=[...story.querySelectorAll(".story-step")];
    const tl=gsap.timeline({scrollTrigger:{trigger:story,start:"top top",end:"bottom bottom",scrub:1}});
    steps.forEach((step,i)=>{
      if(i===0)tl.to(step,{opacity:1,y:0,duration:.55},0);
      else tl.to(steps[i-1],{opacity:0,y:-28,duration:.3},"+=.08").to(step,{opacity:1,y:0,duration:.5},"-=.08");
    });
  }

  function init(){
    renderHeader();renderFooter();renderServices();renderProjects();renderSelected();renderLegacy();
    reveal();pageTransitions();smoothScroll();cinematicHome();cinematicAbout();
    const loader=document.querySelector(".loader");if(loader)setTimeout(()=>loader.classList.add("hide"),450);
  }
  document.addEventListener("DOMContentLoaded",init);
})();