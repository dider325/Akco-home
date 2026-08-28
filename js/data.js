const AKCO_DATA = {
  homepageSelectedProjectIds: [],
  site: {
    name: "AKCO Real Estate Ltd.",
    tagline: "Homes Done Thoughtfully",
    cta: "Creating Homes. Building Trust."
  },
  services: [
    { title: "Residential Development" },
    { title: "Joint Venture / Landowner Partnerships" },
    { title: "Sale of Apartments" }
  ],
  principles: [
    "Thoughtful Design",
    "Quality Over Quantity",
    "Built for Living",
    "Care in Every Detail",
    "Trust & Responsibility",
    "Calm, Considered Development"
  ],
  projects: [
    {
      id: 1, name: "Project Name One", location: "Location placeholder",
      description: "Approved project description will be added here.",
      status: "Completed", year: "—",
      featuredImage: "assets/project-1.svg",
      images: ["assets/project-1.svg"]
    },
    {
      id: 2, name: "Project Name Two", location: "Location placeholder",
      description: "Approved project description will be added here.",
      status: "Ongoing", year: "—",
      featuredImage: "assets/project-2.svg",
      images: ["assets/project-2.svg"]
    },
    {
      id: 3, name: "Project Name Three", location: "Location placeholder",
      description: "Approved project description will be added here.",
      status: "Upcoming", year: "—",
      featuredImage: "assets/project-3.svg",
      images: ["assets/project-3.svg"]
    }
  ],
  legacy: [
    { name: "Late Mr. Hasanuzzaman Khan", image: "assets/history-1.svg" },
    { name: "Late Mr. Ata Uddin Khan", image: "assets/history-2.svg" }
  ],
  leadership: [
    { name: "Mehejabeen Z Khan", role: "Managing Director", image: "assets/portrait-1.svg" },
    { name: "Zarka Hasan Khan", role: "Director", image: "assets/portrait-2.svg" },
    { name: "Rayma Hasan Khan", role: "Director", image: "assets/portrait-3.svg" }
  ],
  contact: {
    address: "Address to be supplied by AKCO.",
    phone: "Phone number to be supplied by AKCO.",
    email: "Email address to be supplied by AKCO."
  },
  social: [
    { label: "Facebook", url: "#" },
    { label: "Instagram", url: "#" },
    { label: "LinkedIn", url: "#" }
  ]
};

// Immediate Synchronous Cache Hydration for zero-latency image painting
(() => {
  try {
    let contentMap = {};
    const rawCache = localStorage.getItem('akco_site_content_cache');
    const rawDb = localStorage.getItem('akco_db_site_content');

    if (rawCache) {
      try { contentMap = JSON.parse(rawCache); } catch(e){}
    }
    if ((!contentMap || !Object.keys(contentMap).length) && rawDb) {
      try {
        const dbList = JSON.parse(rawDb);
        if (Array.isArray(dbList)) {
          contentMap = Object.fromEntries(dbList.map(c => [c.id, c]));
        }
      } catch(e){}
    }

    if (contentMap) {
      let cssRules = '';
      
      let heroUrl = contentMap['homepage_hero']?.imageUrl;
      let aboutHeroUrl = contentMap['about_hero']?.imageUrl;
      let aboutCinemaUrl = contentMap['about_cinema']?.imageUrl;
      let legacyHeroUrl = contentMap['legacy_intro']?.imageUrl;

      try {
        const rawDb = localStorage.getItem('akco_db_site_content');
        if (rawDb) {
          const list = JSON.parse(rawDb);
          const h = list.find(c => c.id === 'homepage_hero');
          if (h && h.imageUrl && h.imageUrl !== 'assets/hero.svg') heroUrl = h.imageUrl;
          const ah = list.find(c => c.id === 'about_hero');
          if (ah && ah.imageUrl && ah.imageUrl !== 'assets/hero.svg') aboutHeroUrl = ah.imageUrl;
          const ac = list.find(c => c.id === 'about_cinema');
          if (ac && ac.imageUrl && ac.imageUrl !== 'assets/story.svg') aboutCinemaUrl = ac.imageUrl;
          const lh = list.find(c => c.id === 'legacy_intro');
          if (lh && lh.imageUrl && lh.imageUrl !== 'assets/history-1.svg') legacyHeroUrl = lh.imageUrl;
        }
      } catch(e){}

      if (heroUrl) {
        cssRules += `.hero-media { background-image: url("${heroUrl.replace(/"/g, '\\"')}") !important; opacity: 1 !important; }\n`;
      }
      
      if (aboutHeroUrl) {
        cssRules += `.about-hero-image { background-image: url("${aboutHeroUrl.replace(/"/g, '\\"')}") !important; opacity: 1 !important; }\n`;
      }

      if (aboutCinemaUrl) {
        cssRules += `.about-cinema-image { background-image: url("${aboutCinemaUrl.replace(/"/g, '\\"')}") !important; opacity: 1 !important; }\n`;
      }

      if (cssRules) {
        const style = document.createElement('style');
        style.id = 'akco-instant-cache-styles';
        style.textContent = cssRules;
        (document.head || document.documentElement).appendChild(style);
      }
    }

    const rawProjects = localStorage.getItem('akco_db_projects');
    if (rawProjects) {
      const parsedProjects = JSON.parse(rawProjects);
      if (Array.isArray(parsedProjects) && parsedProjects.length) {
        AKCO_DATA.projects = parsedProjects.map(p => {
          const cleanUrl = u => (!u || u.startsWith('http') || u.startsWith('data:')) ? u : u.replace(/^\.\.\//, '');
          const feat = cleanUrl(p.featuredImage) || (p.images && p.images[0] ? cleanUrl(p.images[0]) : 'assets/project-1.svg');
          const imgs = (p.images && p.images.length) ? p.images.map(cleanUrl).filter(Boolean) : [feat];
          return { id: p.id, name: p.name, location: p.location, description: p.description, status: p.status, year: p.year || '—', featuredImage: feat, images: imgs };
        });
      }
    }
    const rawTeam = localStorage.getItem('akco_team_members_cache');
    if (rawTeam) {
      try {
        const parsedTeam = JSON.parse(rawTeam);
        if (Array.isArray(parsedTeam) && parsedTeam.length) {
          AKCO_DATA.leadership = parsedTeam.map(m => ({
            id: m.id, name: m.name, role: m.role,
            bioParagraphs: m.bioParagraphs || [],
            image: m.imageUrl || 'assets/portrait-1.svg'
          }));
        }
      } catch(e) {}
    }

    const rawSettings = localStorage.getItem('akco_company_settings_cache');
    if (rawSettings) {
      const settings = JSON.parse(rawSettings);
      if (settings.companyName) AKCO_DATA.site.name = settings.companyName;
      if (settings.tagline) AKCO_DATA.site.tagline = settings.tagline;
      if (settings.address) AKCO_DATA.contact.address = settings.address;
      if (settings.phone) AKCO_DATA.contact.phone = settings.phone;
      if (settings.email) AKCO_DATA.contact.email = settings.email;
    }
  } catch (e) {
    console.warn('Cache sync notice:', e);
  }
})();
