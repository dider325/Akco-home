(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderFormatted(str) {
    if (!str) return '';
    return escapeHtml(str)
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/&lt;em&gt;/gi, '<em>')
      .replace(/&lt;\/em&gt;/gi, '</em>');
  }

  function renderHeader(){
    const h=document.querySelector("[data-header]");
    if(!h)return;
    const current=location.pathname.split("/").pop()||"index.html";
    h.innerHTML=`<div class="wrap nav">
      <a class="logo" href="index.html" aria-label="${escapeHtml(AKCO_DATA.site.name)}"><img src="assets/akco-logo.png" alt="${escapeHtml(AKCO_DATA.site.name)}"></a>
      <nav class="links" id="siteLinks">
        <a href="index.html" class="${current==='index.html'?'active':''}">Home</a>
        <a href="projects.html" class="${current==='projects.html'?'active':''}">Projects</a>
        <a href="about.html" class="${current==='about.html'?'active':''}">About AKCO</a>
        <a href="legacy.html" class="${current==='legacy.html'?'active':''}">Legacy & Leadership</a>
        <a href="contact.html" class="${current==='contact.html'?'active':''}">Contact</a>
      </nav>
      <button class="menu" id="menuButton" aria-label="Open menu">Menu</button>
    </div>`;

    const menu=document.getElementById("menuButton");
    const links=document.getElementById("siteLinks");
    if(menu && links){
      menu.onclick=()=>{
        links.classList.toggle("open");
        document.body.classList.toggle("menu-open");
        menu.textContent=links.classList.contains("open")?"Close":"Menu";
      };
      links.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{
        links.classList.remove("open");document.body.classList.remove("menu-open");menu.textContent="Menu";
      }));
    }
  }

  function renderFooter(){
    const f=document.querySelector("[data-footer]");
    if(!f)return;
    const socialLinks = (AKCO_DATA.social && AKCO_DATA.social.length)
      ? AKCO_DATA.social.map(s=>`<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a>`).join("")
      : `<a href="#">Facebook</a><a href="#">Instagram</a><a href="#">LinkedIn</a>`;

    f.innerHTML=`<div class="wrap">
      <div class="footer-topline"><span>AKCO / Real Estate Ltd.</span><span>Dhaka · Residential Development</span></div>
      <div class="footer-grid">
        <div class="footer-brand-block">
          <a class="footer-brand" href="index.html" aria-label="${escapeHtml(AKCO_DATA.site.name)}"><img src="assets/akco-logo.png" alt="${escapeHtml(AKCO_DATA.site.name)}"></a>
          <p>${escapeHtml(AKCO_DATA.site.tagline)} — a boutique residential developer based in Dhaka.</p>
          <a class="footer-cta" href="contact.html">Start a conversation <span>↗</span></a>
        </div>
        <div><div class="footer-title">Explore</div>
          <a href="index.html">Home</a><a href="projects.html">Projects</a><a href="about.html">About AKCO</a><a href="legacy.html">Legacy &amp; Leadership</a>
        </div>
        <div><div class="footer-title">Office</div><p>${escapeHtml(AKCO_DATA.contact.address)}</p><p>${escapeHtml(AKCO_DATA.contact.phone)}</p><p>${escapeHtml(AKCO_DATA.contact.email)}</p></div>
        <div><div class="footer-title">Connect</div>${socialLinks}</div>
      </div>
      <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${escapeHtml(AKCO_DATA.site.name)}</span><span>${escapeHtml(AKCO_DATA.site.tagline)}</span><span>Dhaka, Bangladesh</span></div>
    </div>`;
  }

  function renderServices(){
    document.querySelectorAll("[data-services]").forEach(el=>{
      el.innerHTML=AKCO_DATA.services.map(s=>`<article class="service reveal"><div class="point-bullet" aria-hidden="true">•</div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description || 'Approved service description will be added when supplied by AKCO.')}</p></article>`).join("");
    });
  }

  function projectMarkup(p,i){
    const imgs=(p.images&&p.images.length?p.images:[p.featuredImage||"assets/project-1.svg"]).slice(0,4);
    return `<article class="project project-editorial reveal" data-status="${escapeHtml(p.status)}" data-project-id="${escapeHtml(p.id || "")}">
      <div class="project-media">
        <div class="project-media-stage">
          ${imgs.map((src,j)=>`<img class="project-slide ${j===0?"is-active":""}" src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} — view ${j+1}" data-slide="${j}">`).join("")}
          <div class="project-media-meta"><span>${escapeHtml(p.status)}</span></div>
          <div class="project-media-line"><span></span></div>
        </div>
      </div>
      <div class="project-info">
        <div class="project-info-top"><div class="meta">${escapeHtml(p.location)}</div><div class="project-year">${escapeHtml(p.year||"—")}</div></div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="status">${escapeHtml(p.status)}</div>
        <p>${escapeHtml(p.description)}</p>
        <a class="btn project-link" href="contact.html"><span>Explore Project</span><span>↗</span></a>
      </div>
    </article>`;
  }

  function ensureProjectLightbox(){
    if(document.getElementById('project-lightbox')) return document.getElementById('project-lightbox');
    const root=document.createElement('div');
    root.id='project-lightbox';
    root.className='project-lightbox';
    root.innerHTML=`<div class="project-lightbox-backdrop" data-lightbox-close></div><div class="project-lightbox-panel" role="dialog" aria-modal="true" aria-label="Project gallery"><button class="project-lightbox-close" data-lightbox-close aria-label="Close">×</button><button class="project-lightbox-prev" data-lightbox-prev aria-label="Previous image">‹</button><div class="project-lightbox-media"><img id="project-lightbox-image" src="" alt=""><div class="project-lightbox-count" id="project-lightbox-count"></div></div><button class="project-lightbox-next" data-lightbox-next aria-label="Next image">›</button><div class="project-lightbox-caption"><strong id="project-lightbox-title"></strong><span id="project-lightbox-location"></span></div></div>`;
    document.body.appendChild(root);
    return root;
  }

  function openProjectGallery(project, start=0){
    const images=(project.images&&project.images.length?project.images:[project.featuredImage||'assets/project-1.svg']).filter(Boolean);
    if(!images.length) return;
    const root=ensureProjectLightbox();
    let index=Math.max(0,Math.min(start,images.length-1));
    const image=root.querySelector('#project-lightbox-image');
    const count=root.querySelector('#project-lightbox-count');
    const title=root.querySelector('#project-lightbox-title');
    const location=root.querySelector('#project-lightbox-location');
    const prev=root.querySelector('[data-lightbox-prev]');
    const next=root.querySelector('[data-lightbox-next]');
    const paint=()=>{
      image.src=images[index]; image.alt=`${project.name} — image ${index+1}`;
      count.textContent=`${index+1} / ${images.length}`;
      title.textContent=project.name || 'Project'; location.textContent=project.location || '';
      prev.hidden=images.length<2; next.hidden=images.length<2;
    };
    root.classList.add('is-open'); document.body.classList.add('lightbox-open'); paint();
    root.querySelectorAll('[data-lightbox-close]').forEach(el=>el.onclick=()=>{root.classList.remove('is-open');document.body.classList.remove('lightbox-open');});
    prev.onclick=()=>{index=(index-1+images.length)%images.length;paint();};
    next.onclick=()=>{index=(index+1)%images.length;paint();};
    const keyHandler=(e)=>{if(!root.classList.contains('is-open')) return;if(e.key==='Escape'){root.classList.remove('is-open');document.body.classList.remove('lightbox-open');document.removeEventListener('keydown',keyHandler);}if(e.key==='ArrowLeft')prev.click();if(e.key==='ArrowRight')next.click();};
    document.addEventListener('keydown',keyHandler);
  }

  function bindProjectGalleryClicks(){
    document.querySelectorAll('.project-editorial').forEach((projectEl)=>{
      const id=projectEl.dataset.projectId;
      if(!id) return;
      const project=AKCO_DATA.projects.find(p=>String(p.id)===String(id));
      if(!project) return;
      const stage=projectEl.querySelector('.project-media-stage');
      if(stage){stage.classList.add('is-clickable');stage.setAttribute('role','button');stage.setAttribute('tabindex','0');stage.setAttribute('aria-label',`Open ${project.name} gallery`);stage.onclick=()=>openProjectGallery(project,0);stage.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProjectGallery(project,0);}};}
      projectEl.querySelector('.project-link')?.addEventListener('click',(e)=>{e.stopPropagation();});
    });
  }

  function projectMotion(){
    if(reduce||innerWidth<=900||!window.gsap||!window.ScrollTrigger)return;
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll(".project-editorial").forEach((project,index)=>{
      const stage=project.querySelector(".project-media-stage");
      const active=project.querySelector(".project-slide.is-active");
      if(!stage||!active)return;
      gsap.fromTo(stage,{y:34},{y:-34,ease:"none",scrollTrigger:{trigger:project,start:"top bottom",end:"bottom top",scrub:1.15}});
      gsap.fromTo(active,{x:index%2===0?-12:12,scale:1},{x:index%2===0?12:-12,scale:1,ease:"none",scrollTrigger:{trigger:project,start:"top bottom",end:"bottom top",scrub:1.2}});
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
      bindProjectGalleryClicks();
    };
    if(filters){
      const statuses = ["All", ...new Set(AKCO_DATA.projects.map(p => p.status).filter(Boolean))];
      const activeStatus = filters.querySelector(".filter.active")?.dataset.filter || "All";
      filters.innerHTML=statuses.map(x=>`<button class="filter ${x===activeStatus?"active":""}" data-filter="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("");
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

    // Always keep the selected-projects section renderable. If a remote CMS
    // request is unavailable or returns no published rows, use the local
    // seed data instead of leaving the section empty.
    const projects = Array.isArray(AKCO_DATA.projects) ? AKCO_DATA.projects : [];
    const configuredIds = Array.isArray(AKCO_DATA.homepageSelectedProjectIds) ? AKCO_DATA.homepageSelectedProjectIds.map(String) : [];
    const configured = configuredIds.length ? configuredIds.map(id => projects.find(p => String(p.id) === id)).filter(Boolean) : [];
    const selected = (configured.length ? configured : projects.slice(0, 2)).filter(p => String(p.status || '').toLowerCase() !== 'draft');

    if (!selected.length) {
      el.innerHTML = '<div class="project-empty">Projects will appear here once they are published.</div>';
      el.querySelector('.project-empty')?.classList.add('in');
      return;
    }

    el.innerHTML = selected.map(projectMarkup).join("");
    // renderSelected() can be called again after asynchronous Supabase
    // hydration, so newly-created .reveal nodes must be observed as well.
    reveal();
    projectMotion();
  }

  function renderLegacy(){
    const el=document.querySelector("[data-legacy]");
    if(el)el.innerHTML=AKCO_DATA.legacy.map(x=>`<article class="history reveal"><img src="${escapeHtml(x.image)}" alt="${escapeHtml(x.name)}"><div><h3>${escapeHtml(x.name)}</h3><p>Approved legacy content will be added here. No biography or historical claim has been invented.</p></div></article>`).join("");
    const leaders=document.querySelector("[data-leaders]");
    if(leaders)leaders.innerHTML=AKCO_DATA.leadership.map(x=>`<article class="leader reveal"><img src="${escapeHtml(x.image)}" alt="${escapeHtml(x.name)}"><h3>${escapeHtml(x.name)}</h3><div class="role">${escapeHtml(x.role)}</div></article>`).join("");
  }

  function reveal(){
    const items=document.querySelectorAll(".reveal:not(.in), .reveal-left:not(.in), .reveal-right:not(.in)");
    if(reduce){items.forEach(x=>x.classList.add("in"));return}
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})
    },{threshold:.1});
    items.forEach(x=>io.observe(x));
  }

  function resetPageWipe(){
    const wipe=document.querySelector(".page-wipe");
    if(!wipe)return;
    wipe.style.transition="none";
    wipe.style.transform="translateX(100%)";
    requestAnimationFrame(()=>{wipe.style.transition=""});
  }

  function pageTransitions(){
    const wipe=document.querySelector(".page-wipe");
    if(!wipe||reduce)return;
    window.addEventListener("pageshow",e=>{
      if(e.persisted)resetPageWipe();
    });
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

  function preloadImage(url) {
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  function resolveAssetUrl(url) {
    if (!url) return '';
    const value = String(url).trim();
    if (!value) return '';
    if (/^(https?:|data:|blob:|\/\/)/i.test(value)) return value;
    // Supabase Storage paths can be stored as just "website/file.jpg".
    // Never let those become broken Netlify-relative URLs.
    const base = window.SUPABASE_CONFIG?.url;
    if (base && !value.startsWith('./') && !value.startsWith('../') && !value.startsWith('/')) {
      return base.replace(/\/$/, '') + '/storage/v1/object/public/akco-media/' + value.replace(/^\/+/, '');
    }
    return value.replace(/^\.\//, '');
  }

  async function safeImageSwap(el, url, isBg = false) {
    if (!el) return false;
    const fallback = el.classList.contains('hero-media') || el.classList.contains('about-hero-image')
      ? 'assets/hero.svg'
      : el.classList.contains('about-cinema-image') ? 'assets/story.svg' : '';
    const requested = resolveAssetUrl(url) || fallback;
    const fallbackUrl = resolveAssetUrl(fallback);
    if (!requested) return false;
    if (isBg && el.style.backgroundImage.includes(requested)) return true;
    if (!isBg && el.src && el.src.includes(requested)) return true;

    const loaded = await preloadImage(requested);
    if (loaded) {
      if (isBg) {
        el.style.backgroundImage = `url("${requested.replace(/"/g, '\\"')}")`;
        el.style.opacity = '1';
      } else {
        el.src = requested;
      }
      return true;
    }

    // Keep a guaranteed bundled asset visible when CMS/Storage is unavailable.
    if (isBg && fallbackUrl) {
      el.style.backgroundImage = `url("${fallbackUrl}")`;
      el.style.opacity = '1';
    } else if (!isBg && fallbackUrl) {
      el.src = fallbackUrl;
    }
    return false;
  }

  // ===========================================================================
  // Supabase Dynamic Content Hydration
  // ===========================================================================
  async function hydrateFromSupabase() {
    try {
      const {
        ensureClientConfigured,
        getCompanySettings,
        getSocialLinks,
        getSiteContent,
        getServices,
        getProjects,
        getTeamMembers,
        getLegacyBlocks
      } = await import('/admin/services/index.js');

      await ensureClientConfigured();

      const [
        settingsRes,
        socialRes,
        contentRes,
        servicesRes,
        projectsRes,
        teamRes,
        legacyRes
      ] = await Promise.allSettled([
        getCompanySettings(),
        getSocialLinks(false),
        getSiteContent(),
        getServices(),
        getProjects({ ascending: true }),
        getTeamMembers(),
        getLegacyBlocks()
      ]);

      // 1. Company Settings
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        const settings = settingsRes.value.data;
        try { localStorage.setItem('akco_company_settings_cache', JSON.stringify(settings)); } catch (e) {}
        if (settings.companyName) AKCO_DATA.site.name = settings.companyName;
        if (settings.tagline) AKCO_DATA.site.tagline = settings.tagline;
        if (settings.address) AKCO_DATA.contact.address = settings.address;
        if (settings.phone) AKCO_DATA.contact.phone = settings.phone;
        if (settings.email) AKCO_DATA.contact.email = settings.email;
      }

      // 2. Social Links
      if (socialRes.status === 'fulfilled' && Array.isArray(socialRes.value?.data) && socialRes.value.data.length) {
        AKCO_DATA.social = socialRes.value.data.map(s => ({
          label: s.platform,
          url: s.url
        }));
      }

      // 3. Services
      if (servicesRes.status === 'fulfilled' && Array.isArray(servicesRes.value?.data) && servicesRes.value.data.length) {
        AKCO_DATA.services = servicesRes.value.data.map(s => ({
          title: s.title,
          description: s.description,
          imageUrl: s.imageUrl
        }));
        renderServices();
      }

      // 4. Projects
      if (projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value?.data) && projectsRes.value.data.length) {
        const publishedProjects = projectsRes.value.data.filter(p => p.status && p.status.toLowerCase() !== 'draft');
        if (publishedProjects.length) {
          const newProjects = publishedProjects.map(p => {
            const cleanUrl = (u) => {
              if (!u) return '';
              if (u.startsWith('http') || u.startsWith('data:')) return u;
              return u.replace(/^\.\.\//, '');
            };
            const feat = cleanUrl(p.featuredImage) || (p.images && p.images[0] ? cleanUrl(p.images[0]) : 'assets/project-1.svg');
            const imgs = (p.images && p.images.length) ? p.images.map(cleanUrl).filter(Boolean) : [feat];
            return {
              id: p.id,
              name: p.name,
              location: p.location,
              description: p.description,
              status: p.status,
              year: p.year || '—',
              featuredImage: feat,
              images: imgs
            };
          });
          
          // Paint the CMS projects immediately. Image preloading is only an
          // enhancement and must never block the content from appearing.
          AKCO_DATA.projects = newProjects;
          renderProjects();
          renderSelected();

          const pUrls = newProjects.flatMap(p => p.images || []).filter(Boolean);
          await Promise.allSettled(pUrls.map(preloadImage));
          renderSelected();
        }
      }

      // 5. Team Members (Legacy & Leadership page)
      if (teamRes.status === 'fulfilled' && Array.isArray(teamRes.value?.data) && teamRes.value.data.length) {
        const newLeaders = teamRes.value.data.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          bioParagraphs: m.bioParagraphs || [],
          image: m.imageUrl || 'assets/portrait-1.svg'
        }));

        // Keep a synchronous local copy so navigating back to the page never
        // blanks the leadership section while Supabase is being queried.
        AKCO_DATA.leadership = newLeaders;
        try { localStorage.setItem('akco_team_members_cache', JSON.stringify(teamRes.value.data)); } catch (e) {}

        const paintLeaders = () => {
          const legacyLeadershipWrap = document.querySelector('.legacy-leadership .wrap');
          if (!legacyLeadershipWrap) return;
          const headingEl = legacyLeadershipWrap.querySelector('.legacy-leadership-heading');
          const headingHtml = headingEl ? headingEl.outerHTML : `<div class="legacy-leadership-heading reveal"><div class="eyebrow">Current Leadership</div><h2 class="display">The people shaping<br><em>AKCO today.</em></h2></div>`;
          const leadersHtml = AKCO_DATA.leadership.map((leader, index) => {
            const sideClass = index % 2 === 0 ? 'legacy-leader-left' : 'legacy-leader-right';
            const bios = (leader.bioParagraphs && leader.bioParagraphs.length)
              ? leader.bioParagraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')
              : `<p>Approved leadership profile will be added here.</p>`;
            return `<article class="legacy-leader ${sideClass} reveal in">
              <div class="legacy-portrait"><img src="${escapeHtml(leader.image)}" alt="${escapeHtml(leader.name)}"></div>
              <div class="legacy-leader-copy">
                <div class="role">${escapeHtml(leader.role)}</div>
                <h3 class="display">${escapeHtml(leader.name)}</h3>
                ${bios}
              </div>
            </article>`;
          }).join('');
          legacyLeadershipWrap.innerHTML = headingHtml + leadersHtml;
          // Do not run a fromTo animation here: legacy.css intentionally hides
          // .reveal elements until .in is added, and fromTo would hide the newly
          // inserted cards again until their ScrollTrigger fires. The cards are
          // visible immediately; the global observer/motion can enhance them.
          if (window.ScrollTrigger) { try { ScrollTrigger.refresh(); } catch (e) {} }
        };
        paintLeaders();
      }

      // Legacy page introduction / hero
      if (contentRes.status === 'fulfilled' && Array.isArray(contentRes.value?.data)) {
        const legacyIntro = contentRes.value.data.find(c => c.id === 'legacy_intro');
        if (legacyIntro) {
          const extra = legacyIntro.extraData || {};
          const hero = document.querySelector('.legacy-hero');
          const heroKicker = document.querySelector('.legacy-hero-kicker');
          const heroTitle = document.querySelector('.legacy-hero h1');
          const heroLead = document.querySelector('.legacy-hero-content > p');
          const heroMedia = document.querySelector('.legacy-hero-media');
          const introKicker = document.querySelector('.legacy-intro-kicker .eyebrow');
          const introTitle = document.querySelector('.legacy-intro-modern-main h2');
          const introLead = document.querySelector('.legacy-intro-modern-side p');
          if (heroKicker) heroKicker.textContent = extra.heroEyebrow || legacyIntro.eyebrow || heroKicker.textContent;
          if (heroTitle) heroTitle.innerHTML = renderFormatted(extra.heroTitle || legacyIntro.title || heroTitle.innerHTML);
          if (heroLead) heroLead.textContent = extra.heroLead || legacyIntro.lead || heroLead.textContent;
          if (heroMedia && legacyIntro.imageUrl) await safeImageSwap(heroMedia, legacyIntro.imageUrl, true);
          if (introKicker) introKicker.textContent = extra.introEyebrow || introKicker.textContent;
          if (introTitle) introTitle.innerHTML = renderFormatted(extra.introTitle || introTitle.innerHTML);
          if (introLead) introLead.textContent = extra.introLead || introLead.textContent;
          if (hero) hero.dataset.cmsReady = 'true';
        }
      }

      // 6. Legacy Blocks
      if (legacyRes.status === 'fulfilled' && Array.isArray(legacyRes.value?.data) && legacyRes.value.data.length) {
        const blocks = legacyRes.value.data;
        const founderBlock = blocks.find(b => b.blockType === 'founder');
        const nameBlock = blocks.find(b => b.blockType === 'name');
        const transitionBlock = blocks.find(b => b.blockType === 'transition');

        const storyBlocks = document.querySelectorAll('.legacy-story-block');
        if (founderBlock && storyBlocks[0]) {
          const eyebrow = storyBlocks[0].querySelector('.eyebrow');
          const title = storyBlocks[0].querySelector('h2');
          if (eyebrow && founderBlock.eyebrow) eyebrow.textContent = founderBlock.eyebrow;
          if (title && founderBlock.title) title.innerHTML = renderFormatted(founderBlock.title);
          if (Array.isArray(founderBlock.paragraphs) && founderBlock.paragraphs.length) {
            const currentPs = storyBlocks[0].querySelectorAll('p');
            currentPs.forEach(p => p.remove());
            founderBlock.paragraphs.forEach(text => {
              const p = document.createElement('p');
              p.textContent = text;
              storyBlocks[0].appendChild(p);
            });
          }
        }
        if (founderBlock && founderBlock.imageUrl) {
          const img = document.querySelector('.legacy-story-image--founder');
          if (img) await safeImageSwap(img, founderBlock.imageUrl, false);
        }

        if (nameBlock && storyBlocks[1]) {
          const eyebrow = storyBlocks[1].querySelector('.eyebrow');
          const title = storyBlocks[1].querySelector('h2');
          if (eyebrow && nameBlock.eyebrow) eyebrow.textContent = nameBlock.eyebrow;
          if (title && nameBlock.title) title.innerHTML = renderFormatted(nameBlock.title);
          if (Array.isArray(nameBlock.paragraphs) && nameBlock.paragraphs.length) {
            const currentPs = storyBlocks[1].querySelectorAll('p');
            currentPs.forEach(p => p.remove());
            nameBlock.paragraphs.forEach(text => {
              const p = document.createElement('p');
              p.textContent = text;
              storyBlocks[1].appendChild(p);
            });
          }
        }
        if (nameBlock && nameBlock.imageUrl) {
          const img = document.querySelector('.legacy-story-image--name');
          if (img) await safeImageSwap(img, nameBlock.imageUrl, false);
        }
        const visualLabel = document.querySelector('.legacy-visual-label');
        if (visualLabel) {
          visualLabel.textContent = founderBlock?.eyebrow || founderBlock?.title || 'The Founder';
          visualLabel.dataset.founderLabel = founderBlock?.eyebrow || founderBlock?.title || 'The Founder';
          visualLabel.dataset.nameLabel = nameBlock?.eyebrow || nameBlock?.title || 'The Name';
        }

        if (transitionBlock) {
          const transEyebrow = document.querySelector('.legacy-transition .eyebrow');
          if (transEyebrow && transitionBlock.eyebrow) transEyebrow.textContent = transitionBlock.eyebrow;
          const transH2 = document.querySelector('.legacy-transition h2');
          if (transH2 && transitionBlock.title) transH2.innerHTML = renderFormatted(transitionBlock.title);
        }

      }

      // 7. Site Content
      if (contentRes.status === 'fulfilled' && Array.isArray(contentRes.value?.data)) {
        let dbList = contentRes.value.data;
        let localCached = {};
        try {
          const raw = localStorage.getItem('akco_db_site_content');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localCached = Object.fromEntries(parsed.map(c => [c.id, c]));
          }
        } catch(e){}

        const merged = dbList.map(dbItem => {
          const localItem = localCached[dbItem.id];
          if (localItem && localItem.imageUrl && localItem.imageUrl !== 'assets/hero.svg' && localItem.imageUrl !== 'assets/story.svg' && (!dbItem.imageUrl || dbItem.imageUrl === 'assets/hero.svg' || dbItem.imageUrl === 'assets/story.svg')) {
            return { ...dbItem, imageUrl: localItem.imageUrl };
          }
          return dbItem;
        });

        const contentMap = Object.fromEntries(merged.map(c => [c.id, c]));
        try { localStorage.setItem('akco_site_content_cache', JSON.stringify(contentMap)); } catch (e) {}

        // Homepage Hydration
        const projectIntro = contentMap['homepage_projects_intro'];
        if (projectIntro) {
          AKCO_DATA.homepageSelectedProjectIds = Array.isArray(projectIntro.extraData?.selectedProjectIds) ? projectIntro.extraData.selectedProjectIds.map(String) : [];
          const hpHeading = document.querySelector('.projects-preview .section-heading h2');
          const hpEyebrow = document.querySelector('.projects-preview .section-heading .eyebrow');
          if (hpEyebrow && projectIntro.eyebrow) hpEyebrow.textContent = projectIntro.eyebrow;
          if (hpHeading && projectIntro.title) hpHeading.innerHTML = renderFormatted(projectIntro.title);
        }
        const servicesIntro = contentMap['homepage_services_intro'];
        if (servicesIntro) {
          const eb = document.querySelector('.services-section .services-top .eyebrow');
          const title = document.querySelector('.services-section .services-top h2');
          const lead = document.querySelector('.services-section .services-top p');
          if (eb && servicesIntro.eyebrow) eb.textContent = servicesIntro.eyebrow;
          if (title && servicesIntro.title) title.innerHTML = renderFormatted(servicesIntro.title);
          if (lead && servicesIntro.lead) lead.textContent = servicesIntro.lead;
        }
        const hero = contentMap['homepage_hero'];
        if (hero) {
          const eb = document.querySelector('.hero .eyebrow');
          const title = document.querySelector('.hero h1');
          const lead = document.querySelector('.hero p');
          const mark = document.querySelector('.hero-mark');
          const scroll = document.querySelector('.scroll-label');
          if (eb && hero.eyebrow) eb.textContent = hero.eyebrow;
          if (title && hero.title) title.innerHTML = renderFormatted(hero.title);
          if (lead && hero.lead) lead.textContent = hero.lead;
          if (mark && hero.extraData?.hero_mark) mark.textContent = hero.extraData.hero_mark;
          if (scroll && hero.extraData?.scroll_label) scroll.textContent = hero.extraData.scroll_label;
          const media = document.querySelector('.hero-media');
          if (media) await safeImageSwap(media, hero.imageUrl || 'assets/hero.svg', true);
        }

        const approach = contentMap['homepage_approach'];
        if (approach) {
          const eb = document.querySelector('.intro-label .eyebrow');
          const micro = document.querySelector('.intro-label .micro-copy');
          const kicker = document.querySelector('.intro-section .section-kicker');
          const title = document.querySelector('.intro-section h2');
          const lead = document.querySelector('.intro-section .lead');
          const link = document.querySelector('[data-home-approach-link]');
          if (eb && approach.eyebrow) eb.textContent = approach.eyebrow;
          if (micro && (approach.body || approach.extraData?.microCopy)) {
            micro.textContent = approach.body || approach.extraData.microCopy;
          }
          if (kicker && approach.extraData?.section_kicker) kicker.textContent = approach.extraData.section_kicker;
          if (title && approach.title) title.innerHTML = renderFormatted(approach.title);
          if (lead && approach.lead) lead.textContent = approach.lead;
          if (link) { if (approach.extraData?.link_label) link.childNodes[0].textContent = approach.extraData.link_label + ' '; if (approach.extraData?.link_url) link.href = approach.extraData.link_url; }
        }

        const phil = contentMap['homepage_philosophy'];
        if (phil) {
          const eb = document.querySelector('.philosophy-section .section-topline .eyebrow');
          const span = document.querySelector('.philosophy-section .section-topline span');
          const title = document.querySelector('.philosophy-intro h2');
          const lead = document.querySelector('.philosophy-intro p');
          if (eb && phil.eyebrow) eb.textContent = phil.eyebrow;
          if (span && (phil.extraData?.topline_span || phil.extraData?.subtitle)) {
            span.textContent = phil.extraData.topline_span || phil.extraData.subtitle;
          }
          if (title && phil.title) title.innerHTML = renderFormatted(phil.title);
          if (lead && phil.lead) lead.textContent = phil.lead;

          if (Array.isArray(phil.extraData?.principles) && phil.extraData.principles.length) {
            const principlesEl = document.querySelector('.principles');
            if (principlesEl) {
              principlesEl.innerHTML = phil.extraData.principles.map(p => {
                const pTitle = typeof p === 'string' ? p : p.title;
                const pDesc = typeof p === 'string' ? '' : (p.description || '');
                return `<article class="principle reveal">
                  <div class="point-bullet" aria-hidden="true">•</div>
                  <h3>${escapeHtml(pTitle)}</h3>
                  ${pDesc ? `<p>${escapeHtml(pDesc)}</p>` : ''}
                </article>`;
              }).join('');
            }
          }
        }

        const homeCta = contentMap['homepage_cta'];
        if (homeCta) {
          const eb = document.querySelector('.final-cta .eyebrow');
          const title = document.querySelector('.final-cta h2');
          const lead = document.querySelector('.final-cta p');
          if (eb && homeCta.eyebrow) eb.textContent = homeCta.eyebrow;
          if (title && homeCta.title) title.innerHTML = renderFormatted(homeCta.title);
          if (lead && homeCta.lead) lead.textContent = homeCta.lead;
          const primary = document.querySelector('.final-cta .cta-actions a.btn-filled');
          const secondary = document.querySelector('.final-cta .cta-actions a:not(.btn-filled)');
          const bp = homeCta.extraData?.button_primary || {}; const bs = homeCta.extraData?.button_secondary || {};
          if (primary) { if (bp.label) primary.childNodes[0].textContent = bp.label + ' '; if (bp.url) primary.href = bp.url; }
          if (secondary) { if (bs.label) secondary.childNodes[0].textContent = bs.label + ' '; if (bs.url) secondary.href = bs.url; }
        }

        // Selected projects are controlled by Homepage > Selected Projects.
        if (projectIntro) renderSelected();

        // About Page Hydration
        const aboutHero = contentMap['about_hero'];
        if (aboutHero) {
          const kicker = document.querySelector('.about-hero-kicker');
          const title = document.querySelector('.about-hero-title');
          if (kicker && aboutHero.eyebrow) kicker.textContent = aboutHero.eyebrow;
          if (title && aboutHero.title) title.innerHTML = renderFormatted(aboutHero.title);
          if (aboutHero.lead) {
            const bottomDiv = document.querySelector('.about-hero-bottom');
            if (bottomDiv) {
              const parts = aboutHero.lead.split('·').map(s => s.trim());
              if (parts.length >= 2) {
                bottomDiv.innerHTML = `<span>${escapeHtml(parts[0])}</span><span>${escapeHtml(parts.slice(1).join(' · '))}</span>`;
              } else {
                bottomDiv.innerHTML = `<span>${escapeHtml(aboutHero.lead)}</span>`;
              }
            }
          }
          const bg = document.querySelector('.about-hero-image');
          if (bg) await safeImageSwap(bg, aboutHero.imageUrl || 'assets/hero.svg', true);
        }

        const aboutIntro = contentMap['about_intro'];
        if (aboutIntro) {
          const sideSpan = document.querySelector('.about-side span');
          const lead = document.querySelector('.about-lead');
          if (sideSpan && aboutIntro.eyebrow) sideSpan.textContent = aboutIntro.eyebrow;
          if (lead && aboutIntro.lead) lead.textContent = aboutIntro.lead;
          if (Array.isArray(aboutIntro.extraData?.paragraphs) && aboutIntro.extraData.paragraphs.length) {
            const copyBody = document.querySelector('.about-copy-body');
            if (copyBody) {
              const extraPs = copyBody.querySelectorAll('p:not(.about-lead)');
              extraPs.forEach(p => p.remove());
              aboutIntro.extraData.paragraphs.forEach(text => {
                const p = document.createElement('p');
                p.className = 'reveal';
                p.textContent = text;
                copyBody.appendChild(p);
              });
            }
          }
        }

        const aboutCinema = contentMap['about_cinema'];
        if (aboutCinema) {
          const visionEb = document.querySelector('.about-cinema-step:nth-child(1) .eyebrow');
          const visionH2 = document.querySelector('.about-cinema-step:nth-child(1) h2');
          const taglineH2 = document.querySelector('.about-tagline');
          if (visionEb && aboutCinema.eyebrow) visionEb.textContent = aboutCinema.eyebrow;
          if (visionH2 && aboutCinema.title) visionH2.innerHTML = renderFormatted(aboutCinema.title);
          if (taglineH2 && (aboutCinema.extraData?.tagline || aboutCinema.lead)) {
            taglineH2.textContent = aboutCinema.extraData?.tagline || aboutCinema.lead;
          }
          const cinemaBg = document.querySelector('.about-cinema-image');
          if (cinemaBg) await safeImageSwap(cinemaBg, aboutCinema.imageUrl || 'assets/story.svg', true);
        }

        const aboutValues = contentMap['about_values'];
        if (aboutValues) {
          const eb = document.querySelector('.about-section-head .eyebrow');
          const title = document.querySelector('.about-section-head h2');
          if (eb && aboutValues.eyebrow) eb.textContent = aboutValues.eyebrow;
          if (title && aboutValues.title) title.innerHTML = renderFormatted(aboutValues.title);

          if (Array.isArray(aboutValues.extraData?.values) && aboutValues.extraData.values.length) {
            const valuesEditorial = document.querySelector('.values-editorial');
            if (valuesEditorial) {
              valuesEditorial.innerHTML = aboutValues.extraData.values.map((v, idx) => `
                <article class="value-card ${idx % 2 === 0 ? 'reveal-left' : 'reveal-right'}">
                  <span class="point-bullet" aria-hidden="true">•</span>
                  <h3>${escapeHtml(v.title)}</h3>
                  <p>${escapeHtml(v.description || '')}</p>
                </article>
              `).join('');
            }
          }
        }

        const aboutClose = contentMap['about_closing'];
        if (aboutClose) {
          const eb = document.querySelector('.about-close .eyebrow');
          const title = document.querySelector('.about-close h2');
          if (eb && aboutClose.eyebrow) eb.textContent = aboutClose.eyebrow;
          if (title && aboutClose.title) title.innerHTML = renderFormatted(aboutClose.title);
        }

        // Contact Page Hydration
        const contactIntro = contentMap['contact_intro'];
        if (contactIntro) {
          const eb = document.querySelector('.contact-intro-head .eyebrow');
          const title = document.querySelector('.contact-intro-head h2');
          const lead = document.querySelector('.contact-intro-head p');
          if (eb && contactIntro.eyebrow) eb.textContent = contactIntro.eyebrow;
          if (title && contactIntro.title) title.innerHTML = renderFormatted(contactIntro.title);
          if (lead && contactIntro.lead) lead.textContent = contactIntro.lead;
        }
      }

      // Contact panel details hydration on contact.html
      const detailsPanel = document.querySelector('.contact-details-panel');
      if (detailsPanel) {
        const details = detailsPanel.querySelectorAll('.contact-detail');
        if (details[0]) {
          const p = details[0].querySelector('p');
          if (p && AKCO_DATA.contact.address) p.textContent = AKCO_DATA.contact.address;
        }
        if (details[1]) {
          const p = details[1].querySelector('p');
          if (p && AKCO_DATA.contact.phone) p.textContent = AKCO_DATA.contact.phone;
        }
        if (details[2]) {
          const p = details[2].querySelector('p');
          if (p && AKCO_DATA.contact.email) p.textContent = AKCO_DATA.contact.email;
        }
        if (details[3]) {
          const p = details[3].querySelector('p');
          if (p && AKCO_DATA.social && AKCO_DATA.social.length) {
            p.textContent = AKCO_DATA.social.map(s => s.label).join(' · ');
          }
        }
      }

      // Re-render Header & Footer with any updated values
      renderHeader();
      renderFooter();

      // Trigger animations and scroll updates
      reveal();
      if (window.ScrollTrigger) {
        window.ScrollTrigger.refresh();
      }
    } catch (err) {
      console.warn('Supabase hydration deferred or unavailable:', err);
    }
  }

  function applyCachedContent() {
    try {
      let cached = {};
      const rawCache = localStorage.getItem('akco_site_content_cache');
      const rawDb = localStorage.getItem('akco_db_site_content');

      if (rawCache) {
        try { cached = JSON.parse(rawCache); } catch(e){}
      }
      if ((!cached || !Object.keys(cached).length) && rawDb) {
        try {
          const dbList = JSON.parse(rawDb);
          if (Array.isArray(dbList)) {
            cached = Object.fromEntries(dbList.map(c => [c.id, c]));
          }
        } catch(e){}
      }

      let aboutHeroUrl = cached['about_hero']?.imageUrl;
      let aboutCinemaUrl = cached['about_cinema']?.imageUrl;
      let homepageHeroUrl = cached['homepage_hero']?.imageUrl;

      if (rawDb) {
        try {
          const dbList = JSON.parse(rawDb);
          const ah = dbList.find(c => c.id === 'about_hero');
          if (ah && ah.imageUrl && ah.imageUrl !== 'assets/hero.svg') aboutHeroUrl = ah.imageUrl;
          const ac = dbList.find(c => c.id === 'about_cinema');
          if (ac && ac.imageUrl && ac.imageUrl !== 'assets/story.svg') aboutCinemaUrl = ac.imageUrl;
          const hh = dbList.find(c => c.id === 'homepage_hero');
          if (hh && hh.imageUrl && hh.imageUrl !== 'assets/hero.svg') homepageHeroUrl = hh.imageUrl;
        } catch(e){}
      }

      if (aboutHeroUrl) {
        const bg = document.querySelector('.about-hero-image');
        if (bg) {
          bg.style.backgroundImage = `url("${resolveAssetUrl(aboutHeroUrl).replace(/"/g, '\\"')}")`;
          bg.style.opacity = '1';
        }
      }
      if (aboutCinemaUrl) {
        const bg = document.querySelector('.about-cinema-image');
        if (bg) {
          bg.style.backgroundImage = `url("${resolveAssetUrl(aboutCinemaUrl).replace(/"/g, '\\"')}")`;
          bg.style.opacity = '1';
        }
      }
      if (homepageHeroUrl) {
        const bg = document.querySelector('.hero-media');
        if (bg) {
          bg.style.backgroundImage = `url("${resolveAssetUrl(homepageHeroUrl).replace(/"/g, '\\"')}")`;
          bg.style.opacity = '1';
        }
      }
    } catch (e) {}
  }

  async function init(){
    // Keep the approved static page completely hidden while the CMS snapshot
    // and its referenced images are loaded. This prevents both stale-content
    // flashes and SVG-to-CMS-image transitions.
    document.body.classList.add('cms-booting');
    window.__AKCO_BOOT_ACTIVE = true;

    const loader = document.querySelector('.loader');
    const HYDRATION_TIMEOUT_MS = 20000;

    let hydrated = false;
    try {
      await Promise.race([
        hydrateFromSupabase().then(() => { hydrated = true; }),
        new Promise(resolve => setTimeout(resolve, HYDRATION_TIMEOUT_MS))
      ]);
    } catch (err) {
      console.warn('CMS hydration failed; using bundled/cache content.', err);
    }

    if (!hydrated) {
      // Network/server failure only: use the already-approved local/cache data.
      // The page was hidden during this decision, so there is still no flash.
      window.__AKCO_BOOT_ACTIVE = false;
      applyCachedContent();
    }

    // Render the final state once. Supabase data wins; bundled/cache content is
    // only the fallback when the CMS could not be reached in time.
    renderHeader();renderFooter();renderServices();renderProjects();renderSelected();renderLegacy();
    reveal();pageTransitions();smoothScroll();cinematicHome();cinematicAbout();

    document.body.classList.remove('cms-booting');
    document.body.classList.add('cms-ready');
    if (loader) loader.classList.add('hide');
    if (window.ScrollTrigger) { try { ScrollTrigger.refresh(); } catch(e) {} }
  }
  document.addEventListener("DOMContentLoaded",init);
})();