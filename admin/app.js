/**
 * AKCO Real Estate Ltd. — Admin Panel Main Controller
 * Fully connects the approved Admin Panel UI to Supabase backend services.
 */
import {
  isConfigured,
  initSupabase,
  ensureClientConfigured,
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  checkAdminAuthorization,
  changePassword,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getSiteContent,
  getSiteContentById,
  updateSiteContent,
  getCompanySettings,
  updateCompanySettings,
  getServices,
  createService,
  updateService,
  deleteService,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getLegacyBlocks,
  createLegacyBlock,
  updateLegacyBlock,
  deleteLegacyBlock,
  getSocialLinks,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  listAssets,
  uploadAsset,
  deleteAsset,
  getEnquiries,
  getEnquiry,
  updateEnquiryStatus,
  deleteEnquiry
} from './services/index.js';

// Application State
// Self-healing: clear uncompressed huge images from old sessions to prevent QuotaExceededError
try {
  ['akco_db_site_content', 'akco_site_content_cache', 'akco_db_projects'].forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw && raw.length > 500000) {
      let parsed = JSON.parse(raw);
      let changed = false;
      const cleanImg = (obj) => {
        if (!obj) return;
        if (obj.imageUrl && obj.imageUrl.length > 300000) { obj.imageUrl = ''; changed = true; }
        if (obj.featuredImage && obj.featuredImage.length > 300000) { obj.featuredImage = ''; changed = true; }
        if (Array.isArray(obj.images)) {
          obj.images.forEach((img, i) => { if (img && img.length > 300000) { obj.images[i] = ''; changed = true; } });
        }
      };
      if (Array.isArray(parsed)) parsed.forEach(cleanImg);
      else Object.values(parsed).forEach(cleanImg);
      if (changed) localStorage.setItem(key, JSON.stringify(parsed));
    }
  });
} catch(e) {}

const state = {
  view: 'dashboard',
  projectFilter: 'All',
  mediaFilter: 'All',
  query: '',
  user: null,
  adminProfile: null,
  loading: false,
  data: {
    projects: [],
    media: [],
    siteContent: [],
    services: [],
    team: [],
    legacyBlocks: [],
    socialLinks: [],
    enquiries: [],
    settings: null
  }
};

// Dynamic DOM Getters
function getAppRoot() {
  return document.getElementById('app') || document.body;
}
function getViewRoot() {
  return document.getElementById('view-root');
}
function getCrumb() {
  return document.getElementById('crumb');
}
function getModalRoot() {
  let el = document.getElementById('modal-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'modal-root';
    document.body.appendChild(el);
  }
  return el;
}
function getToastRoot() {
  let el = document.getElementById('toast-root');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-root';
    document.body.appendChild(el);
  }
  return el;
}

const titles = {
  dashboard: 'Dashboard',
  homepage: 'Homepage',
  projects: 'Projects',
  services: 'Services',
  about: 'About',
  legacy: 'Legacy',
  team: 'Leadership / Team',
  contact: 'Contact',
  social: 'Social Links',
  media: 'Media Library',
  settings: 'Settings'
};

// =============================================================================
// Helper Utilities & Formatting
// =============================================================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusPill(text) {
  const t = text || 'Draft';
  return `<span class="status-pill ${t.toLowerCase().replace(/\s/g, '')}">${escapeHtml(t)}</span>`;
}

function header(title, desc, action = '') {
  return `<div class="view-head">
    <div>
      <div class="eyebrow">AKCO Content Studio</div>
      <h1>${escapeHtml(title)}</h1>
      ${desc ? `<p>${escapeHtml(desc)}</p>` : ''}
    </div>
    ${action}
  </div>`;
}

function panel(title, body, meta = '') {
  return `<section class="panel">
    <div class="panel-head">
      <div class="panel-title">${escapeHtml(title)}</div>
      ${meta ? `<span class="panel-meta">${escapeHtml(meta)}</span>` : ''}
    </div>
    ${body}
  </section>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(dateStr);
  } catch {
    return 'Recently';
  }
}

export function toast(msg = 'Changes saved', type = 'info') {
  const rootEl = getToastRoot();
  if (!rootEl) return;
  const isError = type === 'error';
  rootEl.innerHTML = `<div class="toast" style="${isError ? 'border-left: 3px solid var(--danger);' : ''}">
    <b style="${isError ? 'background:var(--danger);' : ''}"></b>
    <span>${escapeHtml(msg)}</span>
  </div>`;
  setTimeout(() => {
    if (rootEl) rootEl.innerHTML = '';
  }, 3200);
}

function closeModal() {
  const rootEl = getModalRoot();
  if (rootEl) rootEl.innerHTML = '';
}

function showConfirmModal({ title = 'Confirm Deletion', message = 'Are you sure you want to proceed?', confirmText = 'Delete', danger = true, onConfirm }) {
  const root = getModalRoot();
  root.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal" style="max-width:440px;">
        <div class="modal-head">
          <div>
            <div class="eyebrow" style="color:${danger ? 'var(--danger)' : 'var(--accent)'};">Please Confirm</div>
            <h2 style="font-size:18px;">${escapeHtml(title)}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; line-height:1.6; color:var(--ink); margin:0;">${escapeHtml(message)}</p>
        </div>
        <div class="modal-foot" style="display:flex; justify-content:flex-end; gap:8px;">
          <button class="btn" type="button" data-close-modal>Cancel</button>
          <button class="btn ${danger ? 'danger' : 'primary'}" id="btn-modal-confirm-action" type="button" style="${danger ? 'background:var(--danger); color:#fff; border-color:var(--danger);' : ''}">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    </div>
  `;

  const btnConfirm = document.getElementById('btn-modal-confirm-action');
  if (btnConfirm) {
    btnConfirm.onclick = async () => {
      btnConfirm.disabled = true;
      btnConfirm.textContent = 'Deleting...';
      try {
        await onConfirm();
      } finally {
        closeModal();
      }
    };
  }
}

// =============================================================================
// Auth & Login Views
// =============================================================================
function renderLoginView(errorMessage = '') {
  closeModal();
  const app = getAppRoot();
  app.innerHTML = `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="brand-mark">
            <img src="../assets/akco-logo.png" alt="AKCO">
          </div>
          <div class="brand-copy">
            <strong>AKCO</strong>
            <span>CMS / ADMIN</span>
          </div>
        </div>
        <h2 class="auth-title">Welcome back.</h2>
        <p class="auth-sub">Sign in with your authorized AKCO administrator credentials to access the Content Management System.</p>
        
        ${errorMessage ? `<div class="auth-error">${escapeHtml(errorMessage)}</div>` : ''}

        <form id="login-form">
          <div class="field-grid" style="grid-template-columns: 1fr; gap: 14px;">
            <div class="field">
              <label>Email Address</label>
              <input type="email" id="login-email" required placeholder="admin@akcorealestate.com" autocomplete="email">
            </div>
            <div class="field">
              <label>Password</label>
              <input type="password" id="login-password" required placeholder="••••••••••••" autocomplete="current-password">
            </div>
          </div>

          <div class="auth-actions">
            <button type="submit" class="btn primary" id="btn-login">
              Sign In to CMS <span>→</span>
            </button>
          </div>
        </form>

        <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); font-size: 9px; color: var(--muted); text-align: center;">
          AKCO Real Estate Ltd. · Authorized Personnel Only
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn = document.getElementById('btn-login');

      if (!email || !password) {
        renderLoginView('Please enter both email and password.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Authenticating...';

      const { data, error } = await signIn(email, password);
      if (error) {
        btn.disabled = false;
        btn.innerHTML = 'Sign In to CMS <span>→</span>';
        renderLoginView(error.message || 'Authentication failed. Please verify credentials.');
        return;
      }

      state.user = data.user;
      state.adminProfile = data.adminProfile;
      toast('Signed in successfully');
      await initAppShell();
    };
  }
}

// =============================================================================
// App Shell Initialization & Navigation
// =============================================================================
async function initAppShell() {
  const app = getAppRoot();
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="brand-row">
          <div class="brand-mark"><img src="../assets/akco-logo.png" alt="AKCO"></div>
          <div class="brand-copy"><strong>AKCO</strong><span>CMS / ADMIN</span></div>
          <button class="icon-btn sidebar-close" data-action="close-sidebar" aria-label="Close sidebar">×</button>
        </div>
        <div class="sidebar-label">Workspace</div>
        <nav class="nav" id="main-nav">
          <button class="nav-item ${state.view === 'dashboard' ? 'active' : ''}" data-view="dashboard"><span class="nav-icon">⌂</span><span>Dashboard</span></button>
          <button class="nav-item ${state.view === 'homepage' ? 'active' : ''}" data-view="homepage"><span class="nav-icon">◈</span><span>Homepage</span></button>
          <button class="nav-item ${state.view === 'projects' ? 'active' : ''}" data-view="projects"><span class="nav-icon">▦</span><span>Projects</span><span class="nav-count" id="nav-project-count">—</span></button>
          <button class="nav-item ${state.view === 'services' ? 'active' : ''}" data-view="services"><span class="nav-icon">✦</span><span>Services</span></button>
          <button class="nav-item ${state.view === 'about' ? 'active' : ''}" data-view="about"><span class="nav-icon">○</span><span>About</span></button>
          <button class="nav-item ${state.view === 'legacy' ? 'active' : ''}" data-view="legacy"><span class="nav-icon">◌</span><span>Legacy</span></button>
          <button class="nav-item ${state.view === 'team' ? 'active' : ''}" data-view="team"><span class="nav-icon">◉</span><span>Leadership / Team</span></button>
          <button class="nav-item ${state.view === 'contact' ? 'active' : ''}" data-view="contact"><span class="nav-icon">↗</span><span>Contact</span><span class="nav-count warm" id="nav-enquiry-count">—</span></button>
          <button class="nav-item ${state.view === 'social' ? 'active' : ''}" data-view="social"><span class="nav-icon">◎</span><span>Social Links</span></button>
          <button class="nav-item ${state.view === 'media' ? 'active' : ''}" data-view="media"><span class="nav-icon">▧</span><span>Media Library</span></button>
        </nav>
        <div class="sidebar-bottom">
          <button class="nav-item ${state.view === 'settings' ? 'active' : ''}" data-view="settings"><span class="nav-icon">⚙</span><span>Settings</span></button>
          <div class="profile-mini">
            <div class="avatar" id="sidebar-avatar">AK</div>
            <div>
              <strong id="sidebar-username">AKCO Admin</strong>
              <span id="sidebar-role">Content Manager</span>
            </div>
            <button class="icon-btn" data-view-jump="settings" title="Profile & Settings">•••</button>
          </div>
          <button class="logout" id="btn-logout"><span>↪</span> Logout</button>
        </div>
      </aside>
      <div class="sidebar-overlay" data-action="close-sidebar"></div>
      <main class="main">
        <header class="topbar">
          <button class="mobile-menu icon-btn" data-action="open-sidebar">☰</button>
          <div class="breadcrumb"><span>AKCO</span><i>/</i><strong id="crumb">Dashboard</strong></div>
          <div class="top-actions">
            <button class="site-preview" data-action="preview">View website <span>↗</span></button>
            <button class="icon-btn notification" data-action="toast-notify" aria-label="Notifications">♧<b></b></button>
            <div class="top-avatar" id="topbar-avatar">AK</div>
          </div>
        </header>
        <div id="view-root" class="content">
          <div class="loading-state">Loading CMS workspace...</div>
        </div>
      </main>
    </div>
  `;

  // Update profile in sidebar
  updateProfileDisplay();

  // Attach global event listeners
  attachGlobalListeners();

  // Load initial data
  await loadAllData();
  render();
}

function updateProfileDisplay() {
  const email = state.user?.email || 'admin@akco.example';
  const role = state.adminProfile?.role || 'Administrator';
  const initials = email.substring(0, 2).toUpperCase();

  const sbAvatar = document.getElementById('sidebar-avatar');
  const tbAvatar = document.getElementById('topbar-avatar');
  const sbUser = document.getElementById('sidebar-username');
  const sbRole = document.getElementById('sidebar-role');

  if (sbAvatar) sbAvatar.textContent = initials;
  if (tbAvatar) tbAvatar.textContent = initials;
  if (sbUser) sbUser.textContent = email.split('@')[0];
  if (sbRole) sbRole.textContent = role;
}

function attachGlobalListeners() {
  const nav = document.getElementById('main-nav');
  if (nav) {
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (!b) return;
      state.view = b.dataset.view;
      state.query = '';
      closeSidebar();
      render();
    });
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut();
      state.user = null;
      state.adminProfile = null;
      renderLoginView();
    };
  }

  document.addEventListener('click', (e) => {
    const jump = e.target.closest('[data-view-jump]');
    if (jump) {
      state.view = jump.dataset.viewJump;
      state.query = '';
      closeModal();
      closeSidebar();
      render();
      return;
    }

    const action = e.target.closest('[data-action]');
    if (action) {
      handleAction(action.dataset.action, action);
    }

    const modalBackdrop = e.target.closest('[data-close-modal]');
    if (modalBackdrop && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('close-modal') || e.target.dataset.closeModal !== undefined)) {
      closeModal();
    }
  });
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.querySelector('.sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

function openSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.querySelector('.sidebar-overlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
}

// =============================================================================
// Data Loading & Normalization
// =============================================================================
async function loadAllData() {
  try {
    const [
      projRes,
      mediaRes,
      contentRes,
      servRes,
      teamRes,
      legacyRes,
      socialRes,
      enqRes,
      settingsRes
    ] = await Promise.all([
      getProjects(),
      listAssets(),
      getSiteContent(),
      getServices(),
      getTeamMembers(),
      getLegacyBlocks(),
      getSocialLinks(),
      getEnquiries(),
      getCompanySettings()
    ]);

    state.data.projects = projRes.data || [];
    state.data.media = mediaRes.data || [];
    state.data.siteContent = contentRes.data || [];
    state.data.services = servRes.data || [];
    state.data.team = teamRes.data || [];
    try { localStorage.setItem('akco_team_members_cache', JSON.stringify(state.data.team)); } catch (e) {}
    state.data.legacyBlocks = legacyRes.data || [];
    state.data.socialLinks = socialRes.data || [];
    state.data.enquiries = enqRes.data || [];
    state.data.settings = settingsRes.data || null;

    try {
      if (Array.isArray(state.data.siteContent)) {
        const contentMap = Object.fromEntries(state.data.siteContent.map(c => [c.id, c]));
        localStorage.setItem('akco_site_content_cache', JSON.stringify(contentMap));
      }
      if (state.data.settings) {
        localStorage.setItem('akco_company_settings_cache', JSON.stringify(state.data.settings));
      }
    } catch (e) {}

    // Update sidebar counts
    const pCount = document.getElementById('nav-project-count');
    const eCount = document.getElementById('nav-enquiry-count');
    if (pCount) pCount.textContent = state.data.projects.length;
    if (eCount) {
      const newEnquiries = state.data.enquiries.filter(e => e.status === 'New').length;
      eCount.textContent = newEnquiries;
    }
  } catch (err) {
    console.error('Error loading admin data:', err);
    toast('Error fetching live data: ' + err.message, 'error');
  }
}

// =============================================================================
// Views Rendering Engine
// =============================================================================
function render() {
  const viewRoot = document.getElementById('view-root');
  const crumbEl = document.getElementById('crumb');
  if (!viewRoot || !crumbEl) return;

  crumbEl.textContent = titles[state.view] || 'Dashboard';
  document.querySelectorAll('.nav-item[data-view]').forEach(x => {
    x.classList.toggle('active', x.dataset.view === state.view);
  });

  const views = {
    dashboard: renderDashboardView,
    homepage: renderHomepageView,
    projects: renderProjectsView,
    services: renderServicesView,
    about: renderAboutView,
    legacy: renderLegacyView,
    team: renderTeamView,
    contact: renderContactView,
    social: renderSocialView,
    media: renderMediaView,
    settings: renderSettingsView
  };

  const renderFn = views[state.view] || renderDashboardView;
  viewRoot.innerHTML = renderFn();
  bindViewInteractions();
}

// -----------------------------------------------------------------------------
// 1. Dashboard View
// -----------------------------------------------------------------------------
function renderDashboardView() {
  const projects = state.data.projects;
  const media = state.data.media;
  const content = state.data.siteContent;
  const enquiries = state.data.enquiries;

  const totalProjects = projects.length;
  const publishedProjects = projects.filter(p => p.status === 'Published').length;
  const draftProjects = projects.filter(p => p.status === 'Draft').length;
  const totalImages = media.length;
  const totalSections = content.length || 8;
  const newEnquiriesCount = enquiries.filter(e => e.status === 'New').length;

  const stats = [
    ['Total Projects', String(totalProjects).padStart(2, '0'), 'Across all stages', '▦'],
    ['Published Projects', String(publishedProjects).padStart(2, '0'), 'Live on website', '◉'],
    ['Draft Projects', String(draftProjects).padStart(2, '0'), 'Needs attention', '◌'],
    ['Total Images', String(totalImages).padStart(2, '0'), 'Across media library', '▧'],
    ['Content Sections', String(totalSections).padStart(2, '0'), 'Managed areas', '◈']
  ];

  const recentProjects = projects.slice(0, 5);

  return header(
    'Dashboard',
    'A calm overview of the content currently shaping the public AKCO website.',
    '<button class="btn primary" data-view-jump="projects">Manage projects <span>↗</span></button>'
  ) +
  `<div class="grid stats-grid">
    ${stats.map(s => `
      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">${escapeHtml(s[0])}</span>
          <span class="stat-icon">${escapeHtml(s[3])}</span>
        </div>
        <div class="stat-number">${escapeHtml(s[1])}</div>
        <div class="stat-foot">${escapeHtml(s[2])}</div>
      </div>
    `).join('')}
  </div>
  <div class="grid dashboard-grid">
    ${panel(
      'Recent Projects',
      `<div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Year</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${recentProjects.length ? recentProjects.map(p => `
              <tr>
                <td>${projectCell(p)}</td>
                <td>${statusPill(p.status)}</td>
                <td>${formatRelativeTime(p.updatedAt)}</td>
                <td>${escapeHtml(p.year || '2026')}</td>
                <td><button class="row-action" data-edit-project="${p.id}">Edit</button></td>
              </tr>
            `).join('') : `<tr><td colspan="5"><div class="empty">No projects found. Add your first project.</div></td></tr>`}
          </tbody>
        </table>
      </div>`,
      `${recentProjects.length} items`
    )}
    ${panel(
      'Recent Activity',
      `<div class="activity-list">
        ${[
          ['Project Registry', `${totalProjects} projects managed in database`, 'Live sync'],
          ['Media Library', `${totalImages} visual assets in Supabase Storage`, 'Synchronized'],
          ['Contact Inbox', `${newEnquiriesCount} new incoming enquiries`, 'Real-time'],
          ['System Engine', 'Supabase Cloud Database connected', 'Operational']
        ].map(a => `
          <div class="activity">
            <i class="activity-dot"></i>
            <div>
              <strong>${escapeHtml(a[0])}</strong>
              <p>${escapeHtml(a[1])}</p>
            </div>
            <time>${escapeHtml(a[2])}</time>
          </div>
        `).join('')}
      </div>`,
      'Latest system status'
    )}
  </div>
  <div class="grid quick-grid">
    <div class="quick-card">
      <span>Homepage</span>
      <strong>Ready for review</strong>
      <a data-view-jump="homepage">Open content →</a>
    </div>
    <div class="quick-card">
      <span>Enquiries</span>
      <strong>${String(newEnquiriesCount).padStart(2, '0')} new</strong>
      <a data-view-jump="contact">Review inbox →</a>
    </div>
    <div class="quick-card">
      <span>Media</span>
      <strong>${String(totalImages).padStart(2, '0')} assets</strong>
      <a data-view-jump="media">Browse library →</a>
    </div>
  </div>`;
}

function projectCell(p) {
  const imgUrl = p.featuredImage || '../assets/project-1.svg';
  return `<div class="project-cell">
    <img class="thumb" src="${escapeHtml(imgUrl)}" alt="" onerror="this.src='../assets/project-1.svg'">
    <div>
      <strong>${escapeHtml(p.name)}</strong>
      <span>${escapeHtml(p.location || 'Dhaka, Bangladesh')}</span>
    </div>
  </div>`;
}

// -----------------------------------------------------------------------------
// 2. Projects View
// -----------------------------------------------------------------------------
function renderProjectsView() {
  const allProjects = state.data.projects;
  const filtered = allProjects.filter(p => {
    const matchesFilter = state.projectFilter === 'All' || p.status === state.projectFilter;
    const q = state.query.toLowerCase();
    const matchesQuery = !state.query ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  return header(
    'Projects',
    'Manage project information, status, featured imagery and galleries.',
    '<button class="btn primary" data-add-project>+ Add new project</button>'
  ) +
  `<div class="toolbar">
    <div class="toolbar-left">
      <div class="search">
        <span>⌕</span>
        <input id="project-search" placeholder="Search projects" value="${escapeHtml(state.query)}">
      </div>
      <select class="select" id="project-filter">
        <option ${state.projectFilter === 'All' ? 'selected' : ''}>All</option>
        <option ${state.projectFilter === 'Published' ? 'selected' : ''}>Published</option>
        <option ${state.projectFilter === 'Draft' ? 'selected' : ''}>Draft</option>
        <option ${state.projectFilter === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
        <option ${state.projectFilter === 'Completed' ? 'selected' : ''}>Completed</option>
      </select>
    </div>
    <div class="toolbar-right">
      <button class="btn small ghost" id="btn-project-refresh">Refresh Database ↺</button>
    </div>
  </div>` +
  panel(
    'All projects',
    `<div class="table-wrap">
      <table class="table projects-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Year</th>
            <th>Status</th>
            <th>Last updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map(p => `
            <tr>
              <td>${projectCell(p)}</td>
              <td>${escapeHtml(p.year || '2026')}</td>
              <td>${statusPill(p.status)}</td>
              <td>${formatDate(p.updatedAt)}</td>
              <td>
                <div class="row-actions">
                  <button class="row-action" data-edit-project="${p.id}">Edit</button>
                  <button class="row-action" data-view-project="${p.id}">View</button>
                  <button class="row-action" data-delete-project="${p.id}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('') : `<tr><td colspan="5"><div class="empty">No projects match your search or filter.</div></td></tr>`}
        </tbody>
      </table>
    </div>`,
    `${filtered.length} projects`
  );
}

// -----------------------------------------------------------------------------
// 3. Homepage View
// -----------------------------------------------------------------------------
function renderHomepageView() {
  const content = state.data.siteContent;
  const hero = content.find(c => c.id === 'homepage_hero') || {
    eyebrow: 'Boutique Residential Developer · Dhaka', title: 'Homes Done Thoughtfully.',
    lead: 'Thoughtfully considered homes shaped by architecture, care and a long-term view.', imageUrl: '../assets/hero.svg'
  };
  const approach = content.find(c => c.id === 'homepage_approach') || {
    eyebrow: 'The AKCO Approach', title: 'A quieter approach to residential development.',
    lead: 'AKCO Real Estate Ltd. is a boutique residential developer based in Dhaka. We create homes shaped by architecture, quality, and the realities of everyday life.',
    body: 'Dhaka · Residential Development', extraData: { section_kicker: 'A boutique point of view', link_label: 'Discover AKCO', link_url: 'about.html' }
  };
  const philosophy = content.find(c => c.id === 'homepage_philosophy') || {
    eyebrow: 'Brand Philosophy', title: 'Thoughtful by design.', lead: 'We believe the best homes are not simply built. They are considered — from proportion and light to material, detail and the everyday experience of living.',
    extraData: { topline_span: 'Homes Done Thoughtfully', principles: [] }
  };
  const projectIntro = content.find(c => c.id === 'homepage_projects_intro') || {
    eyebrow: 'Selected Projects', title: 'Places worth coming home to.', lead: '', extraData: { selectedProjectIds: [] }
  };
  const servicesIntro = content.find(c => c.id === 'homepage_services_intro') || {
    eyebrow: 'Services', title: 'Three ways we build value.', lead: 'Focused residential expertise, thoughtful partnerships and homes designed with a long-term view.'
  };
  const cta = content.find(c => c.id === 'homepage_cta') || {
    eyebrow: 'Begin a Conversation', title: 'Creating Homes. Building Trust.', lead: 'Have a project, partnership or home in mind? We would be glad to hear from you.',
    extraData: { button_primary: { label: 'Explore Projects', url: 'projects.html' }, button_secondary: { label: 'Contact AKCO', url: 'contact.html' } }
  };

  const selectedIds = Array.isArray(projectIntro.extraData?.selectedProjectIds) ? projectIntro.extraData.selectedProjectIds.map(String) : [];
  const principles = Array.isArray(philosophy.extraData?.principles) ? philosophy.extraData.principles : [];
  const liveSelected = state.data.projects.filter(p => selectedIds.includes(String(p.id)) && String(p.status || '').toLowerCase() !== 'draft');
  const selectedLabel = selectedIds.length ? (selectedIds.length + ' selected · ' + liveSelected.length + ' currently live') : 'Not configured · public site will use the first published projects';

  const card = (num, title, desc, id, meta='') => '<div class="panel content-card homepage-step-card">' +
    '<div class="card-body"><div class="homepage-step-top"><span class="eyebrow">Step ' + String(num).padStart(2,'0') + '</span><span class="chip">' + escapeHtml(meta || 'Homepage') + '</span></div>' +
    '<h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(desc) + '</p>' +
    '<div class="card-footer"><span class="note">' + escapeHtml(id === 'homepage_projects_intro' ? selectedLabel : 'Database backed section') + '</span><button class="btn small" data-home-edit="' + escapeHtml(id) + '">Edit section</button></div></div></div>';

  return header(
    'Homepage',
    'Manage the public homepage from top to bottom. Each step controls a real section on the live website.',
    '<button class="btn primary" data-home-preview>View homepage</button>'
  ) +
  '<div class="panel homepage-manager-intro"><div><div class="eyebrow">Homepage Control Center</div><h2>One place to manage the whole homepage.</h2><p>Edit each section in order, choose any number of projects for Selected Projects, and control the exact order in which they appear.</p></div>' +
  '<div class="homepage-manager-stats"><div><strong>6</strong><span>editable sections</span></div><div><strong>' + state.data.projects.length + '</strong><span>projects available</span></div><div><strong>' + liveSelected.length + '</strong><span>live selected</span></div></div></div>' +
  '<div class="panel homepage-hero-summary"><div class="homepage-summary-media"><img src="' + escapeHtml(hero.imageUrl || '../assets/hero.svg') + '" alt=""></div><div class="homepage-summary-copy"><span class="eyebrow">Step 01 · Hero</span><h2>' + escapeHtml(hero.title) + '</h2><p>' + escapeHtml(hero.lead) + '</p><button class="btn primary" data-home-edit="homepage_hero">Edit hero</button></div></div>' +
  '<div class="section-grid grid homepage-step-grid">' +
    card(2, approach.title || 'The AKCO Approach', approach.lead || '', 'homepage_approach', 'Story & Copy') +
    card(3, philosophy.title || 'Brand Philosophy', (principles.length || 6) + ' principles · ' + (philosophy.lead || ''), 'homepage_philosophy', 'Principles') +
    card(4, projectIntro.title || 'Selected Projects', 'Choose any number of projects and control their display order.', 'homepage_projects_intro', 'Project Selection') +
    card(5, servicesIntro.title || 'Services', servicesIntro.lead || '', 'homepage_services_intro', 'Services Intro') +
    card(6, cta.title || 'Begin a Conversation', cta.lead || '', 'homepage_cta', 'Final CTA') +
  '</div>';
}

// -----------------------------------------------------------------------------
// 4. Services View
// -----------------------------------------------------------------------------
function renderServicesView() {
  const services = state.data.services;

  return header(
    'Services',
    'Manage the service cards and their presentation order.',
    '<button class="btn primary" data-action="add-service">+ Add service</button>'
  ) +
  `<div class="section-grid grid">
    ${services.length ? services.map((s, i) => `
      <div class="panel content-card">
        <div class="card-image">
          <img src="${escapeHtml(s.imageUrl || '../assets/project-1.svg')}" alt="" onerror="this.src='../assets/project-1.svg'">
          <span class="image-tag">Order ${s.displayOrder || i + 1}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(s.title)}</h3>
          <p>${escapeHtml(s.description)}</p>
          <div class="card-footer">
            <span class="note">Display order · ${s.displayOrder || i + 1}</span>
            <div class="row-actions">
              <button class="row-action" data-edit-service="${s.id}">Edit</button>
              <button class="row-action" data-delete-service="${s.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `).join('') : `<div class="empty full" style="grid-column: 1/-1;">No services found. Click "+ Add service" to create one.</div>`}
  </div>`;
}

// -----------------------------------------------------------------------------
// 5. About View
// -----------------------------------------------------------------------------
function renderAboutView() {
  const content = state.data.siteContent;

  const aboutHero = content.find(c => c.id === 'about_hero') || {
    eyebrow: 'About AKCO',
    title: 'Homes Done\nThoughtfully.',
    lead: 'Established 2005 · Dhaka · Residential Development',
    imageUrl: ''
  };

  const aboutIntro = content.find(c => c.id === 'about_intro') || {
    eyebrow: 'About AKCO',
    title: 'A boutique residential developer based in Dhaka',
    lead: 'AKCO Real Estate Limited is a boutique residential developer based in Dhaka, established in 2005. Over the years, we have developed a select number of projects, with a focus on quality, livability, and thoughtful design.',
    extraData: {
      paragraphs: [
        'Our approach is simple—we create homes with intention, where comfort, warmth, and thoughtful design come together to offer a more elevated way of living. Each project is carefully considered, with close attention to layout, natural light, and the overall experience of living in the space. In a city where many developments prioritize scale, we take a more measured approach—creating homes that feel comfortable, functional, and quietly refined, both inside and out.',
        'We design with an understanding of how families in Dhaka live, prioritizing flow and spaces that feel natural and easy to use every day. Equal importance is given to how each building presents itself, ensuring a timeless and well-composed exterior that complements the experience within. Over time, our work has been shaped by close, enduring relationships with our clients—grounded in trust, care, and a consistent commitment to quality.'
      ]
    }
  };

  const aboutCinema = content.find(c => c.id === 'about_cinema') || {
    eyebrow: 'Vision',
    title: 'To create homes that feel timeless and thoughtfully designed—bringing together comfort, beauty, and lasting value for families in Dhaka, through a quieter and more considered approach to development.',
    lead: 'Homes Done Thoughtfully',
    imageUrl: '',
    extraData: { tagline: 'Homes Done Thoughtfully' }
  };

  const aboutValues = content.find(c => c.id === 'about_values');
  const defaultValues = ['Thoughtful Design', 'Quality Over Quantity', 'Built for Living', 'Care in Every Detail', 'Trust & Responsibility', 'Calm, Considered Development'];
  let rawValues = aboutValues?.extraData?.values || defaultValues;
  const values = Array.isArray(rawValues) ? rawValues.map(v => typeof v === 'object' ? (v.title || '') : v).filter(Boolean) : defaultValues;

  const aboutClosing = content.find(c => c.id === 'about_closing') || {
    eyebrow: 'Homes Done Thoughtfully',
    title: 'A quieter approach\nto building homes.'
  };

  const introParas = Array.isArray(aboutIntro.extraData?.paragraphs)
    ? aboutIntro.extraData.paragraphs.join('\n\n')
    : '';

  return header(
    'About AKCO',
    'Edit the two visual image banners (Top Hero & Vision), story paragraphs, and core values.',
    '<button class="btn primary" id="btn-save-about">Save all changes</button>'
  ) +
  `<div class="about-editor-container" style="display:flex;flex-direction:column;gap:24px">
    
    <!-- 1. TOP HERO SECTION (Image Upload 1) -->
    <div class="panel editor-panel">
      <div class="editor-top">
        <div>
          <h2>1. Top Hero Section</h2>
          <p class="field-help" style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">This is the topmost visual banner visitors see when opening the About page.</p>
        </div>
        <span class="chip" style="background:#e8ece9;color:#2d5a3f;font-weight:700">Section 01 · Top Banner</span>
      </div>
      <form id="form-about-hero" onsubmit="return false;">
        <div class="field-grid">
          <div class="field">
            <label>Hero Title / Main Heading</label>
            <input id="about-hero-title" value="${escapeHtml(aboutHero.title)}">
          </div>
          <div class="field">
            <label>Eyebrow Label</label>
            <input id="about-hero-eyebrow" value="${escapeHtml(aboutHero.eyebrow)}">
          </div>
          <div class="field full">
            <label>Bottom Subtitle (e.g. Established 2005 · Dhaka · Residential Development)</label>
            <input id="about-hero-lead" value="${escapeHtml(aboutHero.lead)}">
          </div>
          ${renderImageFieldHTML({ 
            id: 'about-hero-image', 
            label: 'Top Hero Background Image (একদম টপ সেকশনের ইমেজ)', 
            value: aboutHero.imageUrl || '', 
            folder: 'website' 
          })}
        </div>
      </form>
    </div>

    <!-- 2. VISION & CINEMA SECTION (Image Upload 2) -->
    <div class="panel editor-panel">
      <div class="editor-top">
        <div>
          <h2>2. Vision & Story Cinema Section</h2>
          <p class="field-help" style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">This is the cinematic dark storytelling section in the middle of the About page.</p>
        </div>
        <span class="chip" style="background:#eef1f6;color:#294677;font-weight:700">Section 02 · Vision Banner</span>
      </div>
      <form id="form-about-cinema" onsubmit="return false;">
        <div class="field-grid">
          <div class="field">
            <label>Vision Section Label</label>
            <input id="about-cinema-eyebrow" value="${escapeHtml(aboutCinema.eyebrow || 'Vision')}">
          </div>
          <div class="field">
            <label>Tagline</label>
            <input id="about-cinema-tagline" value="${escapeHtml(aboutCinema.extraData?.tagline || aboutCinema.lead || 'Homes Done Thoughtfully')}">
          </div>
          <div class="field full">
            <label>Vision Statement / Main Heading</label>
            <textarea id="about-cinema-title" style="min-height:90px">${escapeHtml(aboutCinema.title)}</textarea>
          </div>
          ${renderImageFieldHTML({ 
            id: 'about-cinema-image', 
            label: 'Vision Background Image (ভিশন সেকশনের ব্যাকগ্রাউন্ড ইমেজ)', 
            value: aboutCinema.imageUrl || '', 
            folder: 'website' 
          })}
        </div>
      </form>
    </div>

    <!-- 3. EDITORIAL STORY & APPROACH COPY -->
    <div class="panel editor-panel">
      <div class="editor-top">
        <div>
          <h2>3. Story & Approach Editorial Copy</h2>
          <p class="field-help" style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">The detailed story and philosophy paragraphs between the Top Hero and Vision sections.</p>
        </div>
        <span class="chip">Section 03</span>
      </div>
      <form id="form-about-intro" onsubmit="return false;">
        <div class="field-grid">
          <div class="field">
            <label>Side Section Label</label>
            <input id="about-intro-eyebrow" value="${escapeHtml(aboutIntro.eyebrow || 'About AKCO')}">
          </div>
          <div class="field full">
            <label>Lead Paragraph (Large text)</label>
            <textarea id="about-intro-lead" style="min-height:85px">${escapeHtml(aboutIntro.lead)}</textarea>
          </div>
          <div class="field full">
            <label>Additional Story Paragraphs (Separate each paragraph with a blank line)</label>
            <textarea id="about-intro-paras" style="min-height:140px">${escapeHtml(introParas)}</textarea>
          </div>
        </div>
      </form>
    </div>

    <!-- 4. CORE VALUES & 5. CLOSING SECTION -->
    <div class="grid section-grid">
      <div class="panel editor-panel">
        <div class="editor-top">
          <div>
            <h2>4. Core Values</h2>
            <p class="field-help" style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">Six principles guiding AKCO residential development.</p>
          </div>
          <button class="btn small" data-action="edit-values">Edit values</button>
        </div>
        <div class="reorder-list">
          ${values.map((x, i) => `
            <div class="reorder-item">
              <span>${String(i + 1).padStart(2, '0')}</span>
              <strong>${escapeHtml(x)}</strong>
              <span>✓</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="panel editor-panel">
        <div class="editor-top">
          <div>
            <h2>5. Closing Statement</h2>
            <p class="field-help" style="margin:4px 0 0;font-size:12px;color:var(--text-muted)">Bottom dark ending statement.</p>
          </div>
          <span class="chip">Section 05</span>
        </div>
        <form id="form-about-closing" onsubmit="return false;">
          <div class="field-grid">
            <div class="field full">
              <label>Closing Eyebrow</label>
              <input id="about-closing-eyebrow" value="${escapeHtml(aboutClosing.eyebrow || 'Homes Done Thoughtfully')}">
            </div>
            <div class="field full">
              <label>Closing Heading</label>
              <input id="about-closing-title" value="${escapeHtml(aboutClosing.title || 'A quieter approach to building homes.')}">
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>`;
}

// -----------------------------------------------------------------------------
// 6. Legacy View
// -----------------------------------------------------------------------------
function renderLegacyView() {
  const content = state.data.siteContent;
  const legacyIntro = content.find(c => c.id === 'legacy_intro') || {
    eyebrow: 'Management & Legacy',
    title: 'Built on values. Carried forward.',
    lead: 'A foundation of care, integrity and purpose — carried into the next generation of AKCO.',
    imageUrl: '../assets/history-1.svg',
    extraData: {
      introEyebrow: 'Our Story & Legacy',
      introTitle: 'Some foundations are built to last.',
      introLead: "AKCO's story began with a clear sense of purpose — and continues through a new generation committed to the same principles."
    }
  };
  const extra = legacyIntro.extraData || {};
  const blocks = [...state.data.legacyBlocks].sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const founder = blocks.find(b => b.blockType === 'founder');
  const nameLegacy = blocks.find(b => b.blockType === 'name');
  const transition = blocks.find(b => b.blockType === 'transition');
  const team = [...state.data.team].sort((a,b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const storyCard = (label, block, fallbackImage, type) => `
    <div class="legacy-story-admin-card">
      <div class="legacy-story-admin-media">
        <img src="${escapeHtml(block?.imageUrl || fallbackImage)}" alt="" onerror="this.src='${fallbackImage}'">
        <span>${escapeHtml(label)}</span>
      </div>
      <div class="legacy-story-admin-copy">
        <div class="eyebrow">${escapeHtml(block?.eyebrow || label)}</div>
        <h3>${escapeHtml(block?.title || 'Not configured')}</h3>
        <p>${escapeHtml(block?.paragraphs?.[0] || 'Add the name, image and story content for this visual.')}</p>
        <div class="card-footer">
          <span class="note">${block ? 'Connected to Legacy Story' : 'Needs setup'}</span>
          <div class="row-actions">
            ${block ? `<button class="row-action" data-edit-legacy="${block.id}">Edit</button>` : `<button class="row-action" data-action="add-legacy-block" data-legacy-type="${type}">Set up</button>`}
          </div>
        </div>
      </div>
    </div>`;

  return header(
    'Legacy & Leadership',
    'A dedicated control center for the entire Legacy & Leadership page. Manage the hero, story visuals, founder/name pairing, transition copy and the three current leaders without touching the website code.',
    '<button class="btn primary" data-action="add-legacy-block">+ Add story block</button>'
  ) +
  `<div class="legacy-admin-stack">
    <div class="panel legacy-control-intro">
      <div>
        <div class="eyebrow">Legacy Control Center</div>
        <h2>Manage the page in the same order visitors experience it.</h2>
        <p>Every important visual and piece of copy is connected to the live Legacy & Leadership page. Upload images here, edit names and bios, and the public page updates from Supabase.</p>
      </div>
      <a class="btn" href="../legacy.html" target="_blank" rel="noopener">Preview Legacy page ↗</a>
    </div>

    <section class="panel legacy-admin-section">
      <div class="legacy-admin-section-head">
        <div><span class="step-no">01</span><div><div class="eyebrow">Hero</div><h2>Legacy Hero</h2><p>Background image, kicker, headline and supporting copy.</p></div></div>
        <span class="chip">Top of page</span>
      </div>
      <form id="form-legacy-hero">
        <div class="field-grid">
          <div class="field"><label>Kicker / Eyebrow</label><input id="legacy-hero-eyebrow" value="${escapeHtml(legacyIntro.eyebrow || 'Management & Legacy')}"></div>
          <div class="field"><label>Supporting copy</label><input id="legacy-hero-lead" value="${escapeHtml(legacyIntro.lead || '')}"></div>
          <div class="field full"><label>Hero headline</label><input id="legacy-hero-title" value="${escapeHtml(legacyIntro.title || '')}" placeholder="Use a line break with <br> if needed"></div>
          ${renderImageFieldHTML({ id: 'legacy-hero-image', label: 'Hero Background Image', value: legacyIntro.imageUrl || '', folder: 'legacy' })}
          <div class="field full"><button type="submit" class="btn primary" id="btn-save-legacy-hero">Save hero</button></div>
        </div>
      </form>
    </section>

    <section class="panel legacy-admin-section">
      <div class="legacy-admin-section-head">
        <div><span class="step-no">02</span><div><div class="eyebrow">Our Story</div><h2>Legacy Introduction</h2><p>Controls the editorial introduction immediately below the hero.</p></div></div>
        <span class="chip">Intro</span>
      </div>
      <form id="form-legacy-intro">
        <div class="field-grid">
          <div class="field"><label>Eyebrow</label><input id="legacy-intro-eyebrow" value="${escapeHtml(extra.introEyebrow || 'Our Story & Legacy')}"></div>
          <div class="field full"><label>Heading</label><input id="legacy-intro-title" value="${escapeHtml(extra.introTitle || 'Some foundations are built to last.')}"></div>
          <div class="field full"><label>Intro copy</label><textarea id="legacy-intro-lead">${escapeHtml(extra.introLead || '')}</textarea></div>
          <div class="field full"><button type="submit" class="btn primary" id="btn-save-legacy-intro">Save introduction</button></div>
        </div>
      </form>
    </section>

    <section class="panel legacy-admin-section">
      <div class="legacy-admin-section-head">
        <div><span class="step-no">03</span><div><div class="eyebrow">Legacy Story</div><h2>Two Story Visuals</h2><p>These are the two images that swap inside the large story frame as visitors scroll. Each visual has its own image, eyebrow, name/title and paragraphs.</p></div></div>
        <span class="chip">2 visuals</span>
      </div>
      <div class="legacy-story-admin-grid">
        ${storyCard('Visual 01 · Founder', founder, '../assets/history-1.svg', 'founder')}
        ${storyCard('Visual 02 · The Name', nameLegacy, '../assets/portrait-2.svg', 'name')}
      </div>
      <div class="legacy-admin-note"><strong>How it works:</strong> Visual 01 is shown first. When the second story enters the viewport, Visual 02 replaces it. The small label on the image also changes to that visual's eyebrow/title.</div>
    </section>

    <section class="panel legacy-admin-section">
      <div class="legacy-admin-section-head">
        <div><span class="step-no">04</span><div><div class="eyebrow">Carrying It Forward</div><h2>Transition Statement</h2><p>Controls the dark transition section between the legacy story and current leadership.</p></div></div>
        <span class="chip">Transition</span>
      </div>
      <form id="form-legacy-transition">
        <div class="field-grid">
          <div class="field"><label>Eyebrow</label><input id="legacy-transition-eyebrow" value="${escapeHtml(transition?.eyebrow || 'Carrying It Forward')}"></div>
          <div class="field full"><label>Statement</label><textarea id="legacy-transition-title">${escapeHtml(transition?.title || '')}</textarea></div>
          <div class="field full"><button type="submit" class="btn primary" id="btn-save-legacy-transition">Save transition</button></div>
        </div>
      </form>
    </section>

    <section class="panel legacy-admin-section">
      <div class="legacy-admin-section-head">
        <div><span class="step-no">05</span><div><div class="eyebrow">Current Leadership</div><h2>Leadership Profiles</h2><p>Manage the people shown on the Legacy page. Image, name, role, bio and order are all editable.</p></div></div>
        <div class="row-actions"><span class="chip">${team.length} people</span><button class="btn small" data-action="add-member">+ Add person</button></div>
      </div>
      <div class="legacy-leadership-admin-grid">
        ${team.length ? team.map((m,i) => `
          <article class="legacy-leader-admin-card">
            <div class="legacy-leader-admin-media"><img src="${escapeHtml(m.imageUrl || '../assets/portrait-1.svg')}" alt="" onerror="this.src='../assets/portrait-1.svg'"><span>Order ${m.displayOrder || i+1}</span></div>
            <div class="legacy-leader-admin-copy"><div class="eyebrow">${escapeHtml(m.role || 'Leadership')}</div><h3>${escapeHtml(m.name)}</h3><p>${escapeHtml(m.bioParagraphs?.[0] || 'Add a leadership biography.')}</p><div class="card-footer"><span class="note">${m.bioParagraphs?.length || 0} bio paragraphs</span><div class="row-actions"><button class="row-action" data-edit-member="${m.id}">Edit profile</button><button class="row-action danger" data-delete-member="${m.id}">Delete</button></div></div></div>
          </article>`).join('') : `<div class="empty">No leadership profiles yet. Add the three people who should appear on the Legacy page.</div>`}
      </div>
    </section>

    <details class="panel legacy-advanced-blocks">
      <summary><span><span class="eyebrow">Advanced</span><strong>Additional Legacy story blocks</strong></span><span>Manage custom blocks ↕</span></summary>
      <div class="advanced-block-grid">
        ${blocks.length ? blocks.map((b,i)=>`<div class="quick-card"><span>Block ${String(i+1).padStart(2,'0')} · ${escapeHtml(b.blockType)}</span><strong>${escapeHtml(b.title)}</strong><div class="row-actions"><button class="row-action" data-edit-legacy="${b.id}">Edit</button><button class="row-action" data-delete-legacy="${b.id}">Delete</button></div></div>`).join('') : '<div class="empty">No additional blocks.</div>'}
      </div>
    </details>
  </div>`;
}

// -----------------------------------------------------------------------------
// 7. Leadership / Team View
// -----------------------------------------------------------------------------
function renderTeamView() {
  const team = state.data.team;

  return header(
    'Leadership / Team',
    'Keep the people behind AKCO presented with clarity and consistency.',
    '<button class="btn primary" data-action="add-member">+ Add member</button>'
  ) +
  `<div class="section-grid grid">
    ${team.length ? team.map((m, i) => `
      <div class="panel content-card">
        <div class="card-image">
          <img src="${escapeHtml(m.imageUrl || '../assets/portrait-1.svg')}" alt="" onerror="this.src='../assets/portrait-1.svg'">
          <span class="image-tag">Order ${m.displayOrder || i + 1}</span>
        </div>
        <div class="card-body">
          <h3>${escapeHtml(m.name)}</h3>
          <p>
            <strong>${escapeHtml(m.role)}</strong><br>
            ${escapeHtml((m.bioParagraphs && m.bioParagraphs[0]) || 'Approved team profile biography.')}
          </p>
          <div class="card-footer">
            <span class="note">Display order · ${m.displayOrder || i + 1}</span>
            <div class="row-actions">
              <button class="row-action" data-edit-member="${m.id}">Edit</button>
              <button class="row-action" data-delete-member="${m.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `).join('') : `<div class="empty" style="grid-column: 1/-1;">No team members found. Click "+ Add member" to create one.</div>`}
  </div>`;
}

// -----------------------------------------------------------------------------
// 8. Contact & Enquiries View
// -----------------------------------------------------------------------------
function renderContactView() {
  const settings = state.data.settings || {
    address: 'Gulshan-2, Dhaka 1212, Bangladesh',
    phone: '+880 2 888 0000',
    email: 'info@akcorealestate.com',
    contactIntro: 'Have a project, partnership or home in mind? We would be glad to hear from you.'
  };

  const enquiries = state.data.enquiries;
  const newEnquiries = enquiries.filter(e => e.status === 'New').length;

  return header(
    'Contact',
    'Manage public contact details and review incoming website enquiries.',
    '<button class="btn primary" id="btn-save-contact">Save contact details</button>'
  ) +
  `<div class="grid responsive-stack">
    <div class="panel editor-panel">
      <div class="editor-top">
        <h2>Contact details</h2>
        <span class="chip">Public website</span>
      </div>
      <form id="form-contact-details">
        <div class="field-grid">
          <div class="field full">
            <label>Address</label>
            <input id="contact-address" value="${escapeHtml(settings.address || '')}">
          </div>
          <div class="field">
            <label>Phone</label>
            <input id="contact-phone" value="${escapeHtml(settings.phone || '')}">
          </div>
          <div class="field">
            <label>Email</label>
            <input id="contact-email" value="${escapeHtml(settings.email || '')}">
          </div>
          <div class="field full">
            <label>Contact description / Intro</label>
            <textarea id="contact-intro">${escapeHtml(settings.contactIntro || '')}</textarea>
          </div>
        </div>
      </form>
    </div>
    <div class="panel editor-panel">
      <div class="editor-top">
        <h2>Inbox snapshot</h2>
        <span class="chip">${enquiries.length} enquiries</span>
      </div>
      <div class="quick-card">
        <span>Unread</span>
        <strong>${String(newEnquiries).padStart(2, '0')}</strong>
        <a>Review below ↓</a>
      </div>
      <div class="divider"></div>
      <p class="note">Incoming contact form submissions are stored directly in your Supabase database table.</p>
    </div>
  </div>
  <div class="panel" style="margin-top:16px">
    <div class="panel-head">
      <div class="panel-title">Contact enquiries</div>
      <span class="panel-meta">${enquiries.length} live database records</span>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Enquiry</th>
            <th>Contact</th>
            <th>Message</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${enquiries.length ? enquiries.map(e => `
            <tr>
              <td><strong>${escapeHtml(e.name)}</strong></td>
              <td>${escapeHtml(e.email)}<br><span class="note">${escapeHtml(e.phone || 'No phone')}</span></td>
              <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(e.message)}</td>
              <td>${formatDate(e.createdAt)}</td>
              <td>${statusPill(e.status)}</td>
              <td>
                <div class="row-actions">
                  <button class="row-action" data-view-enquiry="${e.id}">View</button>
                  <button class="row-action" data-delete-enquiry="${e.id}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('') : `<tr><td colspan="6"><div class="empty">No enquiries received yet.</div></td></tr>`}
        </tbody>
      </table>
    </div>
  </div>`;
}

// -----------------------------------------------------------------------------
// 9. Social Links View
// -----------------------------------------------------------------------------
function renderSocialView() {
  const links = state.data.socialLinks;

  const rows = links.length ? links.map(x => `
    <div class="link-row">
      <div class="platform">${escapeHtml(x.platform)}</div>
      <div class="url"><a href="${escapeHtml(x.url)}" target="_blank" rel="noreferrer" style="color:inherit; text-decoration:none;">${escapeHtml(x.url)}</a></div>
      <button class="toggle ${x.isActive ? 'on' : ''}" data-toggle-social="${x.id}" title="Toggle active status"><i></i></button>
      <div class="row-actions">
        <button class="row-action" data-edit-social="${x.id}">Edit</button>
        <button class="row-action" data-delete-social="${x.id}">Delete</button>
      </div>
    </div>
  `).join('') : '<div class="empty">No social links configured.</div>';

  return header(
    'Social Links',
    'Manage the social destinations shown across the public website.',
    '<button class="btn primary" data-action="add-social">+ Add social link</button>'
  ) +
  panel('Social destinations', `<div style="padding:0 20px">${rows}</div>`, `${links.length} links`);
}

// -----------------------------------------------------------------------------
// 10. Media Library View
// -----------------------------------------------------------------------------
function renderMediaView() {
  const media = state.data.media;
  const filtered = media.filter(m => {
    const matchesFilter = state.mediaFilter === 'All' ||
      (state.mediaFilter === 'Images' && m.fileType !== 'SVG') ||
      (state.mediaFilter === 'SVG' && m.fileType === 'SVG');
    const q = state.query.toLowerCase();
    const matchesQuery = !state.query ||
      (m.filename && m.filename.toLowerCase().includes(q)) ||
      (m.usageTag && m.usageTag.toLowerCase().includes(q));
    return matchesFilter && matchesQuery;
  });

  const cards = filtered.length ? filtered.map(m => `
    <div class="media-card">
      <div class="media-img">
        <img src="${escapeHtml(m.publicUrl)}" alt="" onerror="this.src='../assets/project-1.svg'">
        <span class="image-tag">${escapeHtml(m.fileType || 'IMAGE')}</span>
      </div>
      <div class="media-body">
        <div class="media-name" title="${escapeHtml(m.filename)}">${escapeHtml(m.filename)}</div>
        <div class="media-meta">${escapeHtml(m.usageTag || 'Library Asset')}</div>
        <div class="media-foot">
          <span class="note">${m.fileSize ? `${Math.round(m.fileSize / 1024)} KB` : 'CDN Asset'}</span>
          <div class="row-actions">
            <button class="row-action" data-preview-media="${m.id}">Preview</button>
            <button class="row-action" data-delete-media="${m.id}" data-path="${escapeHtml(m.storagePath)}">Delete</button>
          </div>
        </div>
      </div>
    </div>
  `).join('') : `<div class="empty" style="grid-column: 1/-1;">No media assets found. Click "+ Upload media" to add imagery.</div>`;

  return header(
    'Media Library',
    'A central visual library for the imagery used across the AKCO website.',
    '<button class="btn primary" data-action="upload">+ Upload media</button>'
  ) +
  `<div class="toolbar">
    <div class="toolbar-left">
      <div class="search">
        <span>⌕</span>
        <input id="media-search" placeholder="Search media" value="${escapeHtml(state.query)}">
      </div>
      <select class="select" id="media-filter">
        <option ${state.mediaFilter === 'All' ? 'selected' : ''}>All media</option>
        <option ${state.mediaFilter === 'Images' ? 'selected' : ''}>Images</option>
        <option ${state.mediaFilter === 'SVG' ? 'selected' : ''}>SVG</option>
      </select>
    </div>
    <div class="toolbar-right">
      <button class="btn small ghost" id="btn-media-refresh">Refresh Library ↺</button>
    </div>
  </div>
  <div class="grid media-grid">${cards}</div>`;
}

// -----------------------------------------------------------------------------
// 11. Settings View & Password Management
// -----------------------------------------------------------------------------
function renderSettingsView() {
  const user = state.user;
  const profile = state.adminProfile;
  const settings = state.data.settings || {
    companyName: 'AKCO Real Estate Ltd.',
    tagline: 'Homes Done Thoughtfully.',
    establishedYear: '2026'
  };

  return header(
    'Settings',
    'Workspace preferences, company identity, and account security.',
    '<button class="btn primary" id="btn-save-settings">Save preferences</button>'
  ) +
  `<div class="panel">
    <div class="setting-block">
      <h3>Admin profile</h3>
      <p>Your authenticated AKCO CMS account.</p>
      <div class="field-grid">
        <div class="field">
          <label>Email Address</label>
          <input value="${escapeHtml(user?.email || 'admin@akco.example')}" readonly style="background:var(--paper-2); opacity:0.85;">
        </div>
        <div class="field">
          <label>Role</label>
          <input value="${escapeHtml(profile?.role || 'Administrator')}" readonly style="background:var(--paper-2); opacity:0.85;">
        </div>
      </div>
    </div>

    <div class="setting-block">
      <h3>Website settings</h3>
      <p>General public-site preferences backed by company_settings.</p>
      <form id="form-site-settings">
        <div class="field-grid">
          <div class="field">
            <label>Site title / Company Name</label>
            <input id="settings-title" value="${escapeHtml(settings.companyName || 'AKCO Real Estate Ltd.')}">
          </div>
          <div class="field">
            <label>Tagline</label>
            <input id="settings-tagline" value="${escapeHtml(settings.tagline || 'Homes Done Thoughtfully')}">
          </div>
          <div class="field">
            <label>Established Year</label>
            <input id="settings-est" value="${escapeHtml(settings.establishedYear || '2026')}">
          </div>
        </div>
      </form>
    </div>

    <div class="setting-block">
      <h3>Account Security & Password</h3>
      <p>Secure password updates are executed directly via Supabase Auth encryption.</p>
      
      <form id="form-password-change" style="max-width: 600px;">
        <div class="field-grid" style="grid-template-columns: 1fr; gap: 14px;">
          <div class="field">
            <label>Current Password</label>
            <input type="password" id="pwd-current" required placeholder="Enter current password">
          </div>
          <div class="field">
            <label>New Password (min 6 characters)</label>
            <input type="password" id="pwd-new" required minlength="6" placeholder="Enter new strong password">
          </div>
          <div class="field">
            <label>Confirm New Password</label>
            <input type="password" id="pwd-confirm" required minlength="6" placeholder="Confirm new password">
          </div>
          <div>
            <button type="submit" class="btn primary" id="btn-update-pwd">Update Password</button>
          </div>
        </div>
      </form>
    </div>

    <div class="setting-block">
      <h3>Database & Supabase Configuration</h3>
      <p>Live status of your database and storage connections.</p>
      <div style="display:flex; gap:10px; align-items:center;">
        <span class="status-pill published">Connected to Supabase</span>
        <span class="note">Bucket: akco-media · RLS Active</span>
      </div>
    </div>
  </div>`;
}

// =============================================================================
// Reusable Image & Gallery Upload Components
// =============================================================================

function getImageDraft(id) {
  try { return sessionStorage.getItem(`akco_image_draft_${id}`) || ''; } catch (e) { return ''; }
}

function clearImageDraft(id) {
  try { sessionStorage.removeItem(`akco_image_draft_${id}`); } catch (e) {}
}

function renderImageFieldHTML({ id, label, value, folder = 'website', hint = '' }) {
  const currentVal = getImageDraft(id) || value || '';
  return `
    <div class="field full image-uploader-box" id="wrap-${id}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label style="margin:0;">${label}</label>
        <span class="note" style="font-size:8px;">${hint || 'Upload from device or enter URL'}</span>
      </div>
      
      <div class="image-tabs">
        <button type="button" class="image-tab-btn active" data-img-tab="upload" data-target="${id}">📁 Upload Image</button>
        <button type="button" class="image-tab-btn" data-img-tab="url" data-target="${id}">🔗 Image URL</button>
      </div>

      <!-- Upload Drop Area -->
      <div class="image-drop-pane" id="pane-upload-${id}">
        <div class="image-drop-zone" id="drop-${id}">
          <div class="image-drop-icon">↑</div>
          <div class="image-drop-title">Click to choose image or drag & drop here</div>
          <div class="image-drop-sub">JPG, PNG, WebP, SVG (Max 10MB)</div>
          <input type="file" id="file-${id}" accept="image/*" style="display:none;">
        </div>
      </div>

      <!-- URL Input Area -->
      <div class="image-url-pane" id="pane-url-${id}" style="display:none;">
        <input type="text" id="input-url-${id}" value="${escapeHtml(currentVal)}" placeholder="https://... or ../assets/project-1.svg">
      </div>

      <!-- Preview Bar -->
      <div class="image-preview-bar" id="preview-bar-${id}" style="${currentVal ? '' : 'display:none;'}">
        <img class="image-preview-thumb" id="img-prev-${id}" src="${escapeHtml(currentVal)}" alt="Preview" onerror="this.src='../assets/project-1.svg'">
        <div class="image-preview-meta">
          <div class="image-preview-url" id="prev-url-text-${id}">${escapeHtml(currentVal)}</div>
          <div class="image-preview-tag">✓ Ready to save</div>
        </div>
        <div class="image-preview-actions">
          <button type="button" class="btn small" id="btn-remove-img-${id}" style="color:var(--danger);">Remove</button>
        </div>
      </div>

      <!-- Master Value input -->
      <input type="hidden" id="${id}" value="${escapeHtml(currentVal)}">
    </div>
  `;
}

function initImageFieldEvents(id, folder = 'website') {
  const wrap = document.getElementById(`wrap-${id}`);
  if (!wrap) return;

  const hiddenInput = document.getElementById(id);
  const fileInput = document.getElementById(`file-${id}`);
  const dropZone = document.getElementById(`drop-${id}`);
  const urlInput = document.getElementById(`input-url-${id}`);
  const previewBar = document.getElementById(`preview-bar-${id}`);
  const imgPrev = document.getElementById(`img-prev-${id}`);
  const prevUrlText = document.getElementById(`prev-url-text-${id}`);
  const btnRemove = document.getElementById(`btn-remove-img-${id}`);

  // Tab switching
  wrap.querySelectorAll('.image-tab-btn').forEach(btn => {
    btn.onclick = () => {
      wrap.querySelectorAll('.image-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabType = btn.dataset.imgTab;
      const uploadPane = document.getElementById(`pane-upload-${id}`);
      const urlPane = document.getElementById(`pane-url-${id}`);
      if (tabType === 'upload') {
        uploadPane.style.display = 'block';
        urlPane.style.display = 'none';
      } else {
        uploadPane.style.display = 'none';
        urlPane.style.display = 'block';
      }
    };
  });

  const updatePreview = (val) => {
    hiddenInput.value = val;
    try {
      if (val) sessionStorage.setItem(`akco_image_draft_${id}`, val);
      else sessionStorage.removeItem(`akco_image_draft_${id}`);
    } catch (e) {}
    urlInput.value = val;
    if (val) {
      imgPrev.src = val;
      prevUrlText.textContent = val;
      previewBar.style.display = 'flex';
    } else {
      previewBar.style.display = 'none';
    }
  };

  // URL input changes
  if (urlInput) {
    urlInput.oninput = () => {
      updatePreview(urlInput.value.trim());
    };
  }

  // Remove button
  if (btnRemove) {
    btnRemove.onclick = () => {
      updatePreview('');
    };
  }

  // File Upload handling
  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Please select an image file', 'error');
      return;
    }
    const titleElem = dropZone.querySelector('.image-drop-title');
    const origText = titleElem ? titleElem.textContent : '';
    if (titleElem) titleElem.textContent = 'Uploading image... Please wait';
    dropZone.style.opacity = '0.7';

    try {
      const { data, error } = await uploadAsset(file, folder);
      if (error) throw error;
      const uploadedUrl = data.publicUrl || data.url;
      updatePreview(uploadedUrl);
      toast('Image uploaded successfully!');
    } catch (err) {
      toast('Upload issue: ' + err.message + ' (using local preview)', 'warning');
      const reader = new FileReader();
      reader.onload = (e) => updatePreview(e.target.result);
      reader.readAsDataURL(file);
    } finally {
      if (titleElem) titleElem.textContent = origText;
      dropZone.style.opacity = '1';
    }
  };

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    };
    dropZone.ondragleave = () => {
      dropZone.classList.remove('dragover');
    };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
      }
    };
    fileInput.onchange = () => {
      if (fileInput.files.length) {
        handleFile(fileInput.files[0]);
      }
    };
  }
}

function renderGalleryFieldHTML({ id, label, values = [], folder = 'projects' }) {
  const images = Array.isArray(values) ? values : [];
  return `
    <div class="field full gallery-uploader-box" id="wrap-gallery-${id}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label style="margin:0;">${label}</label>
        <span class="note" style="font-size:8px;">Upload multiple images or paste URLs</span>
      </div>

      <!-- Multi-upload drop zone -->
      <div class="image-drop-zone" id="drop-gallery-${id}">
        <div class="image-drop-icon">⇪</div>
        <div class="image-drop-title">Click to upload multiple images or drag & drop</div>
        <div class="image-drop-sub">Select multiple photos for gallery</div>
        <input type="file" id="file-gallery-${id}" accept="image/*" multiple style="display:none;">
      </div>

      <!-- Gallery thumbnails grid -->
      <div class="gallery-thumbs-grid" id="grid-gallery-${id}">
        ${images.map((img, idx) => `
          <div class="gallery-thumb-card" data-idx="${idx}">
            <img src="${escapeHtml(img)}" onerror="this.src='../assets/project-1.svg'">
            <button type="button" class="gallery-thumb-remove" data-remove-gallery="${idx}" title="Remove image">×</button>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:6px;">
        <label style="font-size:8px; color:var(--muted);">Or Edit Gallery URLs (one per line or comma-separated)</label>
        <textarea id="input-gallery-urls-${id}" placeholder="https://... or ../assets/project-2.svg" style="min-height:55px;">${escapeHtml(images.join('\n'))}</textarea>
      </div>
    </div>
  `;
}

function initGalleryFieldEvents(id, folder = 'projects', initialImages = []) {
  let images = [...initialImages];
  const wrap = document.getElementById(`wrap-gallery-${id}`);
  if (!wrap) return { getImages: () => images };

  const dropZone = document.getElementById(`drop-gallery-${id}`);
  const fileInput = document.getElementById(`file-gallery-${id}`);
  const grid = document.getElementById(`grid-gallery-${id}`);
  const textarea = document.getElementById(`input-gallery-urls-${id}`);

  const updateUI = () => {
    grid.innerHTML = images.map((img, idx) => `
      <div class="gallery-thumb-card" data-idx="${idx}">
        <img src="${escapeHtml(img)}" onerror="this.src='../assets/project-1.svg'">
        <button type="button" class="gallery-thumb-remove" data-remove-gallery="${idx}" title="Remove image">×</button>
      </div>
    `).join('');
    textarea.value = images.join('\n');

    grid.querySelectorAll('[data-remove-gallery]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const removeIdx = parseInt(btn.dataset.removeGallery, 10);
        images.splice(removeIdx, 1);
        updateUI();
      };
    });
  };

  textarea.oninput = () => {
    const raw = textarea.value.trim();
    images = raw ? raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean) : [];
    grid.innerHTML = images.map((img, idx) => `
      <div class="gallery-thumb-card" data-idx="${idx}">
        <img src="${escapeHtml(img)}" onerror="this.src='../assets/project-1.svg'">
        <button type="button" class="gallery-thumb-remove" data-remove-gallery="${idx}" title="Remove image">×</button>
      </div>
    `).join('');
    grid.querySelectorAll('[data-remove-gallery]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const removeIdx = parseInt(btn.dataset.removeGallery, 10);
        images.splice(removeIdx, 1);
        updateUI();
      };
    });
  };

  const handleFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    toast(`Uploading ${fileList.length} gallery image(s)...`);
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const { data } = await uploadAsset(file, folder);
        const url = data?.publicUrl || data?.url;
        if (url && !images.includes(url)) {
          images.push(url);
        }
      } catch (err) {
        console.error(err);
      }
    }
    updateUI();
    toast('Gallery updated!');
  };

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
    dropZone.ondragleave = () => { dropZone.classList.remove('dragover'); };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    };
    fileInput.onchange = () => {
      if (fileInput.files.length) {
        handleFiles(fileInput.files);
      }
    };
  }

  updateUI();

  return {
    getImages: () => images
  };
}

// =============================================================================
// Modals & Interactive Actions
// =============================================================================

function projectModal(project = null) {
  const isEdit = Boolean(project);
  const p = project || {
    name: '',
    slug: '',
    location: 'Dhaka, Bangladesh',
    year: '2026',
    status: 'Published',
    description: '',
    featuredImage: '../assets/project-1.svg',
    images: []
  };

  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Project editor</div>
            <h2>${isEdit ? escapeHtml(p.name) : 'Add New Project'}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <form id="form-project-modal">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Project name</label>
                <input id="proj-name" required value="${escapeHtml(p.name)}">
              </div>
              <div class="field">
                <label>Location</label>
                <input id="proj-loc" required value="${escapeHtml(p.location)}">
              </div>
              <div class="field">
                <label>Year</label>
                <input id="proj-year" value="${escapeHtml(p.year)}">
              </div>
              <div class="field">
                <label>Status (Visibility)</label>
                <select id="proj-status">
                  <option value="Published" ${p.status === 'Published' ? 'selected' : ''}>Published (Live on Website)</option>
                  <option value="Ongoing" ${p.status === 'Ongoing' ? 'selected' : ''}>Ongoing (Live on Website)</option>
                  <option value="Completed" ${p.status === 'Completed' ? 'selected' : ''}>Completed (Live on Website)</option>
                  <option value="Upcoming" ${p.status === 'Upcoming' ? 'selected' : ''}>Upcoming (Live on Website)</option>
                  <option value="Draft" ${p.status === 'Draft' ? 'selected' : ''}>Draft (Hidden / Not on Website)</option>
                </select>
              </div>
              <div class="field full">
                <label>Description</label>
                <textarea id="proj-desc">${escapeHtml(p.description)}</textarea>
              </div>
              ${renderImageFieldHTML({ id: 'proj-img', label: 'Featured Cover Image', value: p.featuredImage || '', folder: 'projects' })}
              ${renderGalleryFieldHTML({ id: 'proj-gallery', label: 'Project Gallery Photos', values: p.images || [], folder: 'projects' })}
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close-modal>Cancel</button>
            <button type="submit" class="btn primary" id="btn-save-proj">${isEdit ? 'Save project' : 'Create project'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initImageFieldEvents('proj-img', 'projects');
  const galleryManager = initGalleryFieldEvents('proj-gallery', 'projects', p.images || []);

  const form = document.getElementById('form-project-modal');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-proj');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const featImg = document.getElementById('proj-img').value.trim();
      let galList = galleryManager.getImages();
      if (featImg && !galList.includes(featImg)) {
        galList = [featImg, ...galList];
      }

      const payload = {
        name: document.getElementById('proj-name').value.trim(),
        location: document.getElementById('proj-loc').value.trim(),
        year: document.getElementById('proj-year').value.trim(),
        status: document.getElementById('proj-status').value,
        description: document.getElementById('proj-desc').value.trim(),
        featuredImage: featImg,
        images: galList
      };

      try {
        if (isEdit) {
          const { error } = await updateProject(p.id, payload);
          if (error) throw error;
          toast('Project updated successfully');
        } else {
          const { error } = await createProject(payload);
          if (error) throw error;
          toast('Project created successfully');
        }
        closeModal();
        await loadAllData();
        render();
      } catch (err) {
        toast('Error saving project: ' + err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Save project' : 'Create project';
      }
    };
  }
}

function serviceModal(service = null) {
  const isEdit = Boolean(service);
  const s = service || {
    title: '',
    description: '',
    imageUrl: '../assets/project-1.svg',
    displayOrder: state.data.services.length + 1
  };

  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Services manager</div>
            <h2>${isEdit ? 'Edit Service' : 'Add New Service'}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <form id="form-service-modal">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Service title</label>
                <input id="serv-title" required value="${escapeHtml(s.title)}">
              </div>
              <div class="field">
                <label>Display order</label>
                <input type="number" id="serv-order" value="${s.displayOrder || 1}">
              </div>
              ${renderImageFieldHTML({ id: 'serv-image', label: 'Service Image', value: s.imageUrl || '', folder: 'website' })}
              <div class="field full">
                <label>Description</label>
                <textarea id="serv-desc" required>${escapeHtml(s.description)}</textarea>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close-modal>Cancel</button>
            <button type="submit" class="btn primary" id="btn-save-serv">${isEdit ? 'Save service' : 'Create service'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initImageFieldEvents('serv-image', 'website');

  const form = document.getElementById('form-service-modal');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-serv');
      saveBtn.disabled = true;

      const payload = {
        title: document.getElementById('serv-title').value.trim(),
        displayOrder: parseInt(document.getElementById('serv-order').value, 10) || 0,
        imageUrl: document.getElementById('serv-image').value.trim(),
        description: document.getElementById('serv-desc').value.trim()
      };

      try {
        if (isEdit) {
          const { error } = await updateService(s.id, payload);
          if (error) throw error;
          toast('Service updated successfully');
        } else {
          const { error } = await createService(payload);
          if (error) throw error;
          toast('Service created successfully');
        }
        closeModal();
        await loadAllData();
        render();
      } catch (err) {
        toast('Error saving service: ' + err.message, 'error');
        saveBtn.disabled = false;
      }
    };
  }
}

function teamMemberModal(member = null) {
  const isEdit = Boolean(member);
  const m = member || {
    name: '',
    role: '',
    bioParagraphs: [''],
    imageUrl: '../assets/portrait-1.svg',
    displayOrder: state.data.team.length + 1
  };

  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Leadership / Team</div>
            <h2>${isEdit ? 'Edit Team Member' : 'Add Team Member'}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <form id="form-team-modal">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Name</label>
                <input id="team-name" required value="${escapeHtml(m.name)}">
              </div>
              <div class="field">
                <label>Role / Position</label>
                <input id="team-role" required value="${escapeHtml(m.role)}">
              </div>
              <div class="field">
                <label>Display order</label>
                <input type="number" id="team-order" value="${m.displayOrder || 1}">
              </div>
              ${renderImageFieldHTML({ id: 'team-image', label: 'Portrait Photo', value: m.imageUrl || '', folder: 'team' })}
              <div class="field full">
                <label>Biography</label>
                <textarea id="team-bio" required>${escapeHtml(m.bioParagraphs ? m.bioParagraphs.join('\n\n') : '')}</textarea>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close-modal>Cancel</button>
            <button type="submit" class="btn primary" id="btn-save-team">${isEdit ? 'Save member' : 'Create member'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initImageFieldEvents('team-image', 'team');

  const form = document.getElementById('form-team-modal');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-team');
      saveBtn.disabled = true;

      const bioText = document.getElementById('team-bio').value.trim();
      const bioParagraphs = bioText ? bioText.split('\n\n').map(p => p.trim()).filter(Boolean) : [];

      const payload = {
        name: document.getElementById('team-name').value.trim(),
        role: document.getElementById('team-role').value.trim(),
        imageUrl: document.getElementById('team-image').value.trim(),
        displayOrder: parseInt(document.getElementById('team-order').value, 10) || 0,
        bioParagraphs
      };

      try {
        if (isEdit) {
          const { error } = await updateTeamMember(m.id, payload);
          if (error) throw error;
          toast('Team member updated');
        } else {
          const { error } = await createTeamMember(payload);
          if (error) throw error;
          toast('Team member created');
        }
        closeModal();
        await loadAllData();
        render();
      } catch (err) {
        toast('Error saving team member: ' + err.message, 'error');
        saveBtn.disabled = false;
      }
    };
  }
}

function legacyBlockModal(block = null, presetType = 'story') {
  const isEdit = Boolean(block);
  const b = block || {
    blockType: presetType,
    eyebrow: '',
    title: '',
    paragraphs: [''],
    imageUrl: '',
    displayOrder: state.data.legacyBlocks.length + 1
  };

  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Legacy Manager</div>
            <h2>${isEdit ? 'Edit Legacy Block' : 'New Content Block'}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <form id="form-legacy-modal">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Block type</label>
                <select id="leg-type">
                  <option value="story" ${b.blockType === 'story' ? 'selected' : ''}>Story</option>
                  <option value="founder" ${b.blockType === 'founder' ? 'selected' : ''}>Founder</option>
                  <option value="name" ${b.blockType === 'name' ? 'selected' : ''}>Name Legacy</option>
                  <option value="profile" ${b.blockType === 'profile' ? 'selected' : ''}>Profile</option>
                  <option value="transition" ${b.blockType === 'transition' ? 'selected' : ''}>Transition</option>
                  <option value="quote" ${b.blockType === 'quote' ? 'selected' : ''}>Quote</option>
                  <option value="image_text" ${b.blockType === 'image_text' ? 'selected' : ''}>Image + Text</option>
                  <option value="closing" ${b.blockType === 'closing' ? 'selected' : ''}>Closing</option>
                </select>
              </div>
              <div class="field">
                <label>Display order</label>
                <input type="number" id="leg-order" value="${b.displayOrder || 1}">
              </div>
              <div class="field full">
                <label>Eyebrow / Subtitle</label>
                <input id="leg-eyebrow" value="${escapeHtml(b.eyebrow || '')}">
              </div>
              <div class="field full">
                <label>Heading / Name</label>
                <input id="leg-title" required value="${escapeHtml(b.title)}">
              </div>
              ${renderImageFieldHTML({ id: 'leg-image', label: 'Block Image / Visual (Optional)', value: b.imageUrl || '', folder: 'legacy' })}
              <div class="field full">
                <label>Content / Paragraphs</label>
                <textarea id="leg-paras">${escapeHtml(b.paragraphs ? b.paragraphs.join('\n\n') : '')}</textarea>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close-modal>Cancel</button>
            <button type="submit" class="btn primary" id="btn-save-leg">${isEdit ? 'Save block' : 'Create block'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initImageFieldEvents('leg-image', 'legacy');

  const form = document.getElementById('form-legacy-modal');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-leg');
      saveBtn.disabled = true;

      const pText = document.getElementById('leg-paras').value.trim();
      const paragraphs = pText ? pText.split('\n\n').map(p => p.trim()).filter(Boolean) : [];

      const payload = {
        blockType: document.getElementById('leg-type').value,
        displayOrder: parseInt(document.getElementById('leg-order').value, 10) || 0,
        eyebrow: document.getElementById('leg-eyebrow').value.trim(),
        imageUrl: document.getElementById('leg-image').value.trim(),
        title: document.getElementById('leg-title').value.trim(),
        paragraphs
      };

      try {
        if (isEdit) {
          const { error } = await updateLegacyBlock(b.id, payload);
          if (error) throw error;
          toast('Legacy block updated');
        } else {
          const { error } = await createLegacyBlock(payload);
          if (error) throw error;
          toast('Legacy block created');
        }
        closeModal();
        await loadAllData();
        render();
      } catch (err) {
        toast('Error saving legacy block: ' + err.message, 'error');
        saveBtn.disabled = false;
      }
    };
  }
}

function socialModal(link = null) {
  const isEdit = Boolean(link);
  const l = link || {
    platform: 'Instagram',
    url: 'https://instagram.com/akco',
    isActive: true,
    displayOrder: state.data.socialLinks.length + 1
  };

  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Social links</div>
            <h2>${isEdit ? 'Edit Social Link' : 'Add Social Link'}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <form id="form-social-modal">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Platform Name</label>
                <input id="soc-platform" required value="${escapeHtml(l.platform)}">
              </div>
              <div class="field">
                <label>Status</label>
                <select id="soc-active">
                  <option value="true" ${l.isActive ? 'selected' : ''}>Active</option>
                  <option value="false" ${!l.isActive ? 'selected' : ''}>Inactive</option>
                </select>
              </div>
              <div class="field full">
                <label>Destination URL</label>
                <input id="soc-url" required type="url" value="${escapeHtml(l.url)}">
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close-modal>Cancel</button>
            <button type="submit" class="btn primary" id="btn-save-soc">${isEdit ? 'Save link' : 'Create link'}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('form-social-modal');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-soc');
      saveBtn.disabled = true;

      const payload = {
        platform: document.getElementById('soc-platform').value.trim(),
        isActive: document.getElementById('soc-active').value === 'true',
        url: document.getElementById('soc-url').value.trim()
      };

      try {
        if (isEdit) {
          const { error } = await updateSocialLink(l.id, payload);
          if (error) throw error;
          toast('Social link updated');
        } else {
          const { error } = await createSocialLink(payload);
          if (error) throw error;
          toast('Social link created');
        }
        closeModal();
        await loadAllData();
        render();
      } catch (err) {
        toast('Error saving social link: ' + err.message, 'error');
        saveBtn.disabled = false;
      }
    };
  }
}

function enquiryModal(enquiry) {
  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Contact inbox · Live record</div>
            <h2>Enquiry from ${escapeHtml(enquiry.name)}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <div class="modal-body">
          <div class="field-grid">
            <div class="field">
              <label>Sender Name</label>
              <input value="${escapeHtml(enquiry.name)}" readonly>
            </div>
            <div class="field">
              <label>Status</label>
              <select id="enq-status-select">
                <option value="New" ${enquiry.status === 'New' ? 'selected' : ''}>New</option>
                <option value="Read" ${enquiry.status === 'Read' ? 'selected' : ''}>Read</option>
                <option value="Archived" ${enquiry.status === 'Archived' ? 'selected' : ''}>Archived</option>
              </select>
            </div>
            <div class="field">
              <label>Email Address</label>
              <input value="${escapeHtml(enquiry.email)}" readonly>
            </div>
            <div class="field">
              <label>Phone Number</label>
              <input value="${escapeHtml(enquiry.phone || 'None provided')}" readonly>
            </div>
            <div class="field full">
              <label>Date Received</label>
              <input value="${formatDate(enquiry.createdAt)}" readonly>
            </div>
            <div class="field full">
              <label>Message Content</label>
              <textarea readonly style="min-height: 140px;">${escapeHtml(enquiry.message)}</textarea>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn" data-close-modal>Close</button>
          <button type="button" class="btn primary" id="btn-save-enq-status">Save Status</button>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById('btn-save-enq-status');
  if (btn) {
    btn.onclick = async () => {
      const newStatus = document.getElementById('enq-status-select').value;
      const { error } = await updateEnquiryStatus(enquiry.id, newStatus);
      if (error) {
        toast('Error updating status: ' + error.message, 'error');
        return;
      }
      toast('Enquiry status updated to ' + newStatus);
      closeModal();
      await loadAllData();
      render();
    };
  }
}

function uploadMediaModal() {
  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Media library · Supabase Storage</div>
            <h2>Upload media asset</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <form id="form-upload-media">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Storage Folder</label>
                <select id="upload-folder">
                  <option value="projects">projects/</option>
                  <option value="website">website/</option>
                  <option value="team">team/</option>
                  <option value="legacy">legacy/</option>
                  <option value="brand">brand/</option>
                </select>
              </div>
              <div class="field">
                <label>Usage Tag / Label</label>
                <input id="upload-tag" placeholder="e.g. Hero visual, Project gallery">
              </div>
              <div class="field full">
                <label>Select File</label>
                <div class="image-upload" id="drop-zone" style="min-height: 200px; cursor: pointer;">
                  <strong id="drop-text">Click or drag file here to upload</strong>
                  <span>Supports SVG, PNG, JPG, WEBP (Max 10MB)</span>
                  <input type="file" id="file-input" accept="image/svg+xml,image/png,image/jpeg,image/webp" style="display:none;">
                  <div id="file-chosen" style="margin-top: 10px; font-weight: bold; color: var(--ink);"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close-modal>Cancel</button>
            <button type="submit" class="btn primary" id="btn-start-upload">Start Upload</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileChosen = document.getElementById('file-chosen');

  let selectedFile = null;

  dropZone.onclick = () => fileInput.click();

  dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent)';
  };

  dropZone.ondragleave = () => {
    dropZone.style.borderColor = 'rgba(146,80,56,.35)';
  };

  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'rgba(146,80,56,.35)';
    if (e.dataTransfer.files.length) {
      selectedFile = e.dataTransfer.files[0];
      fileChosen.textContent = `Selected: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
    }
  };

  fileInput.onchange = () => {
    if (fileInput.files.length) {
      selectedFile = fileInput.files[0];
      fileChosen.textContent = `Selected: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
    }
  };

  const form = document.getElementById('form-upload-media');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!selectedFile) {
        toast('Please select an image file first', 'error');
        return;
      }

      const uploadBtn = document.getElementById('btn-start-upload');
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading to Storage...';

      const folder = document.getElementById('upload-folder').value;
      const usageTag = document.getElementById('upload-tag').value.trim();

      const { data, error } = await uploadAsset(selectedFile, folder, usageTag);
      if (error) {
        toast('Upload failed: ' + error.message, 'error');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Start Upload';
        return;
      }

      toast('Media uploaded and registered successfully!');
      closeModal();
      await loadAllData();
      render();
    };
  }
}

function sectionEditModal(sectionId, sectionName) {
  const content = state.data.siteContent;
  const item = content.find(c => c.id === sectionId) || {
    id: sectionId,
    title: sectionName,
    lead: '',
    body: '',
    eyebrow: '',
    imageUrl: ''
  };

  getModalRoot().innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="eyebrow">Website Section Block</div>
            <h2>${escapeHtml(sectionName)}</h2>
          </div>
          <button class="icon-btn close-modal" data-close-modal>×</button>
        </div>
        <form id="form-section-edit">
          <div class="modal-body">
            <div class="field-grid">
              <div class="field">
                <label>Section Eyebrow</label>
                <input id="sec-eyebrow" value="${escapeHtml(item.eyebrow || '')}">
              </div>
              <div class="field">
                <label>Section Heading / Title</label>
                <input id="sec-title" required value="${escapeHtml(item.title || sectionName)}">
              </div>
              <div class="field full">
                <label>Lead / Subtitle</label>
                <input id="sec-lead" value="${escapeHtml(item.lead || '')}">
              </div>
              ${renderImageFieldHTML({ id: 'sec-img', label: 'Section Visual / Banner (Optional)', value: item.imageUrl || '', folder: 'website' })}
              <div class="field full">
                <label>Body Content</label>
                <textarea id="sec-body" style="min-height:130px;">${escapeHtml(item.body || '')}</textarea>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn" data-close-modal>Cancel</button>
            <button type="submit" class="btn primary" id="btn-save-sec">Save section</button>
          </div>
        </form>
      </div>
    </div>
  `;

  initImageFieldEvents('sec-img', 'website');

  const form = document.getElementById('form-section-edit');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-sec');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const payload = {
        eyebrow: document.getElementById('sec-eyebrow').value.trim(),
        title: document.getElementById('sec-title').value.trim(),
        lead: document.getElementById('sec-lead').value.trim(),
        imageUrl: document.getElementById('sec-img').value.trim(),
        body: document.getElementById('sec-body').value.trim()
      };

      const { error } = await updateSiteContent(sectionId, payload);
      if (error) {
        toast('Error updating section: ' + error.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save section';
        return;
      }

      toast('Section content updated successfully');
      closeModal();
      await loadAllData();
      render();
    };
  }
}

function homepageContentModal(sectionId) {
  const content = state.data.siteContent;
  const item = content.find(c => c.id === sectionId) || { id: sectionId, eyebrow:'', title:'', lead:'', body:'', imageUrl:'', extraData:{} };
  const data = item.extraData || {};
  const names = { homepage_hero:'Hero', homepage_approach:'The AKCO Approach', homepage_philosophy:'Brand Philosophy', homepage_services_intro:'Services', homepage_cta:'Begin a Conversation' };
  const name = names[sectionId] || sectionId;
  let body = '';
  if (sectionId === 'homepage_hero') {
    body = '<div class="field-grid"><div class="field"><label>Eyebrow</label><input id="hp-eyebrow" value="'+escapeHtml(item.eyebrow)+'"></div><div class="field"><label>Main heading</label><input id="hp-title" value="'+escapeHtml(item.title)+'"></div><div class="field full"><label>Description</label><textarea id="hp-lead">'+escapeHtml(item.lead)+'</textarea></div>'+renderImageFieldHTML({id:'hp-image',label:'Hero Background Image',value:item.imageUrl||'',folder:'website'})+'</div>';
  } else if (sectionId === 'homepage_approach') {
    body = '<div class="field-grid"><div class="field"><label>Eyebrow</label><input id="hp-eyebrow" value="'+escapeHtml(item.eyebrow)+'"></div><div class="field"><label>Section kicker</label><input id="hp-kicker" value="'+escapeHtml(data.section_kicker||'')+'"></div><div class="field full"><label>Heading</label><textarea id="hp-title">'+escapeHtml(item.title)+'</textarea></div><div class="field full"><label>Lead paragraph</label><textarea id="hp-lead">'+escapeHtml(item.lead)+'</textarea></div><div class="field"><label>Micro copy</label><input id="hp-body" value="'+escapeHtml(item.body)+'"></div><div class="field"><label>Link label</label><input id="hp-link-label" value="'+escapeHtml(data.link_label||'Discover AKCO')+'"></div><div class="field"><label>Link URL</label><input id="hp-link-url" value="'+escapeHtml(data.link_url||'about.html')+'"></div></div>';
  } else if (sectionId === 'homepage_philosophy') {
    const principles = Array.isArray(data.principles) ? data.principles : [];
    const lines = principles.map(p => (typeof p==='string' ? p : (p.title||'') + (p.description ? ' | '+p.description : ''))).join('\n');
    body = '<div class="field-grid"><div class="field"><label>Eyebrow</label><input id="hp-eyebrow" value="'+escapeHtml(item.eyebrow)+'"></div><div class="field"><label>Topline text</label><input id="hp-topline" value="'+escapeHtml(data.topline_span||'')+'"></div><div class="field full"><label>Heading</label><textarea id="hp-title">'+escapeHtml(item.title)+'</textarea></div><div class="field full"><label>Introduction</label><textarea id="hp-lead">'+escapeHtml(item.lead)+'</textarea></div><div class="field full"><label>Principles — one per line: Title | Description</label><textarea id="hp-principles" style="min-height:190px">'+escapeHtml(lines)+'</textarea><span class="field-help">Add as many principles as you want. Each line becomes one card on the homepage.</span></div></div>';
  } else if (sectionId === 'homepage_services_intro') {
    body = '<div class="field-grid"><div class="field"><label>Eyebrow</label><input id="hp-eyebrow" value="'+escapeHtml(item.eyebrow||'Services')+'"></div><div class="field full"><label>Heading</label><textarea id="hp-title">'+escapeHtml(item.title||'Three ways we build value.')+'</textarea></div><div class="field full"><label>Intro paragraph</label><textarea id="hp-lead">'+escapeHtml(item.lead||'')+'</textarea></div></div><div class="modal-info-box"><strong>Service cards are managed separately.</strong><span>Use the Services menu to add, edit, delete and reorder the actual service cards.</span></div>';
  } else {
    const primary=data.button_primary||{}; const secondary=data.button_secondary||{};
    body = '<div class="field-grid"><div class="field"><label>Eyebrow</label><input id="hp-eyebrow" value="'+escapeHtml(item.eyebrow)+'"></div><div class="field full"><label>Heading</label><textarea id="hp-title">'+escapeHtml(item.title)+'</textarea></div><div class="field full"><label>Lead</label><textarea id="hp-lead">'+escapeHtml(item.lead)+'</textarea></div><div class="field"><label>Primary button label</label><input id="hp-primary-label" value="'+escapeHtml(primary.label||'Explore Projects')+'"></div><div class="field"><label>Primary button URL</label><input id="hp-primary-url" value="'+escapeHtml(primary.url||'projects.html')+'"></div><div class="field"><label>Secondary button label</label><input id="hp-secondary-label" value="'+escapeHtml(secondary.label||'Contact AKCO')+'"></div><div class="field"><label>Secondary button URL</label><input id="hp-secondary-url" value="'+escapeHtml(secondary.url||'contact.html')+'"></div></div>';
  }
  getModalRoot().innerHTML = '<div class="modal-backdrop" data-close-modal><div class="modal modal-wide"><div class="modal-head"><div><div class="eyebrow">Homepage · Step</div><h2>'+escapeHtml(name)+'</h2></div><button class="icon-btn close-modal" data-close-modal>×</button></div><form id="form-home-section"><div class="modal-body">'+body+'</div><div class="modal-foot"><button type="button" class="btn" data-close-modal>Cancel</button><button type="submit" class="btn primary" id="btn-save-home-section">Save section</button></div></form></div></div>';
  if (sectionId === 'homepage_hero') initImageFieldEvents('hp-image','website');
  const form=document.getElementById('form-home-section');
  form.onsubmit=async e=>{
    e.preventDefault(); const btn=document.getElementById('btn-save-home-section'); btn.disabled=true; btn.textContent='Saving...';
    const payload={eyebrow:document.getElementById('hp-eyebrow')?.value.trim(),title:document.getElementById('hp-title')?.value.trim(),lead:document.getElementById('hp-lead')?.value.trim()};
    if(sectionId==='homepage_hero') payload.imageUrl=document.getElementById('hp-image')?.value.trim()||'';
    if(sectionId==='homepage_approach') payload.body=document.getElementById('hp-body')?.value.trim()||'';
    if(sectionId==='homepage_approach') payload.extraData={...data,section_kicker:document.getElementById('hp-kicker')?.value.trim(),link_label:document.getElementById('hp-link-label')?.value.trim(),link_url:document.getElementById('hp-link-url')?.value.trim()};
    if(sectionId==='homepage_philosophy') payload.extraData={...data,topline_span:document.getElementById('hp-topline')?.value.trim(),principles:(document.getElementById('hp-principles')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const parts=line.split('|');return {title:parts.shift().trim(),description:parts.join('|').trim()};})};
    if(sectionId==='homepage_cta') payload.extraData={...data,button_primary:{label:document.getElementById('hp-primary-label')?.value.trim(),url:document.getElementById('hp-primary-url')?.value.trim()},button_secondary:{label:document.getElementById('hp-secondary-label')?.value.trim(),url:document.getElementById('hp-secondary-url')?.value.trim()}};
    const {error}=await updateSiteContent(sectionId,payload); if(error){toast('Error saving section: '+error.message,'error');btn.disabled=false;btn.textContent='Save section';return;}
    closeModal(); await loadAllData(); render(); toast('Homepage section saved');
  };
}

function homepageProjectsModal() {
  const content=state.data.siteContent; const item=content.find(c=>c.id==='homepage_projects_intro')||{eyebrow:'Selected Projects',title:'Places worth coming home to.',lead:'',extraData:{}};
  const ids=Array.isArray(item.extraData?.selectedProjectIds)?item.extraData.selectedProjectIds.map(String):[];
  const projects=[...state.data.projects].sort((a,b)=>(a.displayOrder??0)-(b.displayOrder??0));
  const rows=projects.length?projects.map(p=>'<div class="homepage-project-option"><input type="checkbox" value="'+escapeHtml(String(p.id))+'" '+(ids.includes(String(p.id))?'checked':'')+'><span class="hp-project-thumb"><img src="'+escapeHtml(p.featuredImage||'../assets/project-1.svg')+'" alt=""></span><span class="hp-project-copy"><strong>'+escapeHtml(p.name)+'</strong><small>'+escapeHtml(p.location||'')+' · '+escapeHtml(p.status||'Draft')+'</small></span><span class="hp-project-order" data-order-for="'+escapeHtml(String(p.id))+'"></span><span class="hp-project-moves"><button type="button" class="btn tiny" data-hp-up="'+escapeHtml(String(p.id))+'" aria-label="Move up">↑</button><button type="button" class="btn tiny" data-hp-down="'+escapeHtml(String(p.id))+'" aria-label="Move down">↓</button></span></div>').join(''):'<div class="empty">No projects found. Create projects first.</div>';
  getModalRoot().innerHTML='<div class="modal-backdrop" data-close-modal><div class="modal modal-wide"><div class="modal-head"><div><div class="eyebrow">Homepage · Step 04</div><h2>Selected Projects</h2><p class="modal-subtitle">Choose any number of projects. Only non-draft projects are visible on the public homepage.</p></div><button class="icon-btn close-modal" data-close-modal>×</button></div><form id="form-home-projects"><div class="modal-body"><div class="field-grid"><div class="field"><label>Section eyebrow</label><input id="hp-project-eyebrow" value="'+escapeHtml(item.eyebrow||'Selected Projects')+'"></div><div class="field"><label>Section heading</label><input id="hp-project-title" value="'+escapeHtml(item.title||'Places worth coming home to.')+'"></div><div class="field full"><label>Section description (optional)</label><textarea id="hp-project-lead">'+escapeHtml(item.lead||'')+'</textarea></div></div><div class="selection-toolbar"><strong>Select projects for homepage</strong><span id="hp-selected-count">'+ids.length+' selected</span><button type="button" class="btn small" id="hp-select-all">Select all</button><button type="button" class="btn small" id="hp-clear-all">Clear</button></div><div class="homepage-project-list" id="hp-project-list">'+rows+'</div><p class="field-help">The checked projects are displayed in this order on the homepage. Check/uncheck any number of projects.</p></div><div class="modal-foot"><button type="button" class="btn" data-close-modal>Cancel</button><button type="submit" class="btn primary" id="btn-save-home-projects">Save selected projects</button></div></form></div></div>';
  const list=document.getElementById('hp-project-list');
  const refresh=()=>{const checked=[...list.querySelectorAll('input[type=checkbox]:checked')];document.getElementById('hp-selected-count').textContent=checked.length+' selected';checked.forEach((c,i)=>{c.closest('.homepage-project-option').querySelector('.hp-project-order').textContent=String(i+1).padStart(2,'0');});list.querySelectorAll('input[type=checkbox]:not(:checked)').forEach(c=>{c.closest('.homepage-project-option').querySelector('.hp-project-order').textContent='';});};
  list?.addEventListener('change',refresh);
  list?.addEventListener('click',e=>{
    const up=e.target.closest('[data-hp-up]'); const down=e.target.closest('[data-hp-down]'); if(!up&&!down)return; e.preventDefault();
    const row=e.target.closest('.homepage-project-option'); if(!row)return;
    if(up){const prev=row.previousElementSibling;if(prev)row.parentNode.insertBefore(row,prev);}
    if(down){const next=row.nextElementSibling;if(next)row.parentNode.insertBefore(next,row);}
    const checkbox=row.querySelector('input[type=checkbox]'); if(checkbox&&!checkbox.checked){checkbox.checked=true;} refresh();
  });
  document.getElementById('hp-select-all')?.addEventListener('click',()=>{list.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=true);refresh();});
  document.getElementById('hp-clear-all')?.addEventListener('click',()=>{list.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false);refresh();});
  document.getElementById('form-home-projects').onsubmit=async e=>{e.preventDefault();const btn=document.getElementById('btn-save-home-projects');btn.disabled=true;btn.textContent='Saving...';const selectedProjectIds=[...list.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.value);const payload={eyebrow:document.getElementById('hp-project-eyebrow').value.trim(),title:document.getElementById('hp-project-title').value.trim(),lead:document.getElementById('hp-project-lead').value.trim(),extraData:{...(item.extraData||{}),selectedProjectIds}};const {error}=await updateSiteContent('homepage_projects_intro',payload);if(error){toast('Error saving selected projects: '+error.message,'error');btn.disabled=false;btn.textContent='Save selected projects';return;}closeModal();await loadAllData();render();toast(selectedProjectIds.length+' homepage project'+(selectedProjectIds.length===1?'':'s')+' selected');};
}

// =============================================================================
// Interaction Binding for View-Specific Controls
// =============================================================================
function bindViewInteractions() {
  // Search & Filter in Projects
  const ps = document.getElementById('project-search');
  if (ps) {
    ps.oninput = e => {
      state.query = e.target.value;
      render();
    };
  }

  const pf = document.getElementById('project-filter');
  if (pf) {
    pf.onchange = e => {
      state.projectFilter = e.target.value;
      render();
    };
  }

  const btnProjRefresh = document.getElementById('btn-project-refresh');
  if (btnProjRefresh) {
    btnProjRefresh.onclick = async () => {
      btnProjRefresh.textContent = 'Syncing...';
      await loadAllData();
      render();
      toast('Projects refreshed from Supabase');
    };
  }

  // Search & Filter in Media
  const ms = document.getElementById('media-search');
  if (ms) {
    ms.oninput = e => {
      state.query = e.target.value;
      render();
    };
  }

  const mf = document.getElementById('media-filter');
  if (mf) {
    mf.onchange = e => {
      state.mediaFilter = e.target.value;
      render();
    };
  }

  const btnMediaRefresh = document.getElementById('btn-media-refresh');
  if (btnMediaRefresh) {
    btnMediaRefresh.onclick = async () => {
      btnMediaRefresh.textContent = 'Syncing...';
      await loadAllData();
      render();
      toast('Media library refreshed from Supabase');
    };
  }

  // Project Actions
  document.querySelectorAll('[data-add-project]').forEach(b => {
    b.onclick = () => projectModal(null);
  });

  document.querySelectorAll('[data-edit-project]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.editProject;
      const proj = state.data.projects.find(p => String(p.id) === String(id));
      if (proj) projectModal(proj);
    };
  });

  document.querySelectorAll('[data-view-project]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.viewProject;
      const proj = state.data.projects.find(p => String(p.id) === String(id));
      if (!proj) return;
      const images = (proj.images?.length ? proj.images : [proj.featuredImage || '../assets/project-1.svg']).filter(Boolean);
      getModalRoot().innerHTML = `
        <div class="modal-backdrop" data-close-modal>
          <div class="modal modal-wide project-preview-modal">
            <div class="modal-head">
              <div><div class="eyebrow">Project Preview · ${images.length} image${images.length === 1 ? '' : 's'}</div><h2>${escapeHtml(proj.name)}</h2></div>
              <button class="icon-btn close-modal" data-close-modal>×</button>
            </div>
            <div class="modal-body">
              <div class="admin-project-viewer">
                <div class="admin-project-viewer-main"><img id="admin-project-preview-img" src="${escapeHtml(images[0])}" alt="${escapeHtml(proj.name)}"></div>
                <div class="admin-project-viewer-nav">
                  <button class="btn small" id="admin-project-prev">← Previous</button>
                  <span id="admin-project-count">1 / ${images.length}</span>
                  <button class="btn small" id="admin-project-next">Next →</button>
                </div>
                <div class="admin-project-preview-thumbs">
                  ${images.map((img,i)=>`<button type="button" class="admin-project-preview-thumb ${i===0?'active':''}" data-preview-index="${i}"><img src="${escapeHtml(img)}" alt="Image ${i+1}"></button>`).join('')}
                </div>
              </div>
              <div class="modal-info-box">
                <strong>${escapeHtml(proj.location || 'Location not set')}</strong>
                <span>${escapeHtml(proj.year || '—')} · ${escapeHtml(proj.status || 'Draft')}</span>
                <span>${escapeHtml(proj.description || 'No description provided.')}</span>
              </div>
            </div>
            <div class="modal-foot"><button class="btn" data-close-modal>Close</button><button class="btn primary" id="admin-project-edit-from-preview">Edit project</button></div>
          </div>
        </div>`;
      let index = 0;
      const imageEl = document.getElementById('admin-project-preview-img');
      const countEl = document.getElementById('admin-project-count');
      const thumbs = [...document.querySelectorAll('[data-preview-index]')];
      const paint = () => {
        imageEl.src = images[index]; countEl.textContent = `${index+1} / ${images.length}`;
        thumbs.forEach((t,i)=>t.classList.toggle('active',i===index));
      };
      document.getElementById('admin-project-prev').onclick = () => { index=(index-1+images.length)%images.length; paint(); };
      document.getElementById('admin-project-next').onclick = () => { index=(index+1)%images.length; paint(); };
      thumbs.forEach(t=>t.onclick=()=>{index=Number(t.dataset.previewIndex);paint();});
      document.getElementById('admin-project-edit-from-preview').onclick=()=>projectModal(proj);
    };
  });

  document.querySelectorAll('[data-delete-project]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.deleteProject;
      const proj = state.data.projects.find(p => String(p.id) === String(id));
      if (!proj) return;

      showConfirmModal({
        title: 'Delete Project',
        message: `Are you sure you want to permanently delete "${proj.name}"? This cannot be undone.`,
        confirmText: 'Yes, Delete Project',
        danger: true,
        onConfirm: async () => {
          const { error } = await deleteProject(id);
          if (error) {
            toast('Error deleting project: ' + error.message, 'error');
            return;
          }
          toast('Project deleted successfully');
          await loadAllData();
          render();
        }
      });
    };
  });

  // Homepage Hero Save
  initImageFieldEvents('hero-image', 'website');
  const btnSaveHero = document.getElementById('btn-save-hero');
  if (btnSaveHero) {
    btnSaveHero.onclick = async () => {
      btnSaveHero.disabled = true;
      btnSaveHero.textContent = 'Saving...';

      const payload = {
        title: document.getElementById('hero-title').value.trim(),
        eyebrow: document.getElementById('hero-eyebrow').value.trim(),
        lead: document.getElementById('hero-lead').value.trim(),
        imageUrl: document.getElementById('hero-image').value.trim()
      };

      const { error } = await updateSiteContent('homepage_hero', payload);
      btnSaveHero.disabled = false;
      btnSaveHero.textContent = 'Save changes';

      if (error) {
        toast('Error saving hero: ' + error.message, 'error');
        return;
      }

      toast('Homepage hero updated successfully');
      await loadAllData();
      render();
    };
  }

  // Homepage Control Center
  document.querySelectorAll('[data-home-edit]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.homeEdit;
      if (id === 'homepage_projects_intro') homepageProjectsModal();
      else homepageContentModal(id);
    };
  });
  const homePreview = document.querySelector('[data-home-preview]');
  if (homePreview) homePreview.onclick = () => window.open('../index.html', '_blank');

  document.querySelectorAll('[data-edit-section]').forEach(b => {
    b.onclick = () => sectionEditModal(b.dataset.editSection, b.dataset.sectionName);
  });

  // Services Actions
  document.querySelectorAll('[data-edit-service]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.editService;
      const s = state.data.services.find(item => String(item.id) === String(id));
      if (s) serviceModal(s);
    };
  });

  document.querySelectorAll('[data-delete-service]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.deleteService;
      showConfirmModal({
        title: 'Delete Service',
        message: 'Are you sure you want to permanently delete this service?',
        confirmText: 'Delete Service',
        onConfirm: async () => {
          const { error } = await deleteService(id);
          if (error) {
            toast('Error deleting service: ' + error.message, 'error');
            return;
          }
          toast('Service deleted');
          await loadAllData();
          render();
        }
      });
    };
  });

  // About Save & Image Field Initializers
  initImageFieldEvents('about-hero-image', 'website');
  initImageFieldEvents('about-cinema-image', 'website');

  const btnSaveAbout = document.getElementById('btn-save-about');
  if (btnSaveAbout) {
    btnSaveAbout.onclick = async () => {
      btnSaveAbout.disabled = true;
      btnSaveAbout.textContent = 'Saving all sections...';

      try {
        const heroTitle = document.getElementById('about-hero-title')?.value.trim() || '';
        const heroEyebrow = document.getElementById('about-hero-eyebrow')?.value.trim() || '';
        const heroLead = document.getElementById('about-hero-lead')?.value.trim() || '';
        const heroImage = document.getElementById('about-hero-image')?.value.trim() || '';

        const cinemaEyebrow = document.getElementById('about-cinema-eyebrow')?.value.trim() || '';
        const cinemaTitle = document.getElementById('about-cinema-title')?.value.trim() || '';
        const cinemaTagline = document.getElementById('about-cinema-tagline')?.value.trim() || '';
        const cinemaImage = document.getElementById('about-cinema-image')?.value.trim() || '';

        const introEyebrow = document.getElementById('about-intro-eyebrow')?.value.trim() || '';
        const introLead = document.getElementById('about-intro-lead')?.value.trim() || '';
        const introParasText = document.getElementById('about-intro-paras')?.value.trim() || '';
        const introParagraphs = introParasText
          ? introParasText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
          : [];

        const closingEyebrow = document.getElementById('about-closing-eyebrow')?.value.trim() || '';
        const closingTitle = document.getElementById('about-closing-title')?.value.trim() || '';

        const existingIntro = state.data.siteContent.find(c => c.id === 'about_intro');

        const [heroRes, cinemaRes, introRes, closeRes] = await Promise.all([
          updateSiteContent('about_hero', {
            title: heroTitle || 'Homes Done Thoughtfully.',
            eyebrow: heroEyebrow || 'About AKCO',
            lead: heroLead || 'Established 2005 · Dhaka · Residential Development',
            imageUrl: heroImage
          }),
          updateSiteContent('about_cinema', {
            title: cinemaTitle || 'Vision Statement',
            eyebrow: cinemaEyebrow || 'Vision',
            lead: cinemaTagline || 'Homes Done Thoughtfully',
            imageUrl: cinemaImage,
            extraData: {
              vision_eyebrow: cinemaEyebrow || 'Vision',
              tagline_eyebrow: 'Tagline',
              tagline: cinemaTagline || 'Homes Done Thoughtfully'
            }
          }),
          updateSiteContent('about_intro', {
            title: existingIntro?.title || 'A boutique residential developer based in Dhaka',
            eyebrow: introEyebrow || 'About AKCO',
            lead: introLead,
            extraData: {
              ...(existingIntro?.extraData || {}),
              paragraphs: introParagraphs
            }
          }),
          updateSiteContent('about_closing', {
            title: closingTitle || 'A quieter approach to building homes.',
            eyebrow: closingEyebrow || 'Homes Done Thoughtfully'
          })
        ]);

        const err = heroRes?.error || cinemaRes?.error || introRes?.error || closeRes?.error;
        btnSaveAbout.disabled = false;
        btnSaveAbout.textContent = 'Save all changes';

        if (err) {
          toast('Error saving About page: ' + err.message, 'error');
          return;
        }

        toast('About page and images updated successfully');
        await loadAllData();
        render();
      } catch (err) {
        btnSaveAbout.disabled = false;
        btnSaveAbout.textContent = 'Save all changes';
        toast('Error saving: ' + err.message, 'error');
      }
    };
  }

  // Legacy Actions — dedicated page controls
  const legacyHeroForm = document.getElementById('form-legacy-hero');
  if (legacyHeroForm) {
    initImageFieldEvents('legacy-hero-image', 'legacy');
    legacyHeroForm.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-legacy-hero');
      btn.disabled = true; btn.textContent = 'Saving...';
      const { data: savedLegacyHero, error } = await updateSiteContent('legacy_intro', {
        eyebrow: document.getElementById('legacy-hero-eyebrow')?.value.trim() || 'Management & Legacy',
        title: document.getElementById('legacy-hero-title')?.value.trim() || 'Built on values. Carried forward.',
        lead: document.getElementById('legacy-hero-lead')?.value.trim() || '',
        imageUrl: document.getElementById('legacy-hero-image')?.value.trim() || '',
        extraData: {
          ...(state.data.siteContent.find(c => c.id === 'legacy_intro')?.extraData || {}),
          heroEyebrow: document.getElementById('legacy-hero-eyebrow')?.value.trim() || '',
          heroTitle: document.getElementById('legacy-hero-title')?.value.trim() || '',
          heroLead: document.getElementById('legacy-hero-lead')?.value.trim() || ''
        }
      });
      btn.disabled = false; btn.textContent = 'Save hero';
      if (error) { toast('Error saving Legacy hero: ' + error.message, 'error'); return; }
      clearImageDraft('legacy-hero-image');
      if (savedLegacyHero) {
        const idx = state.data.siteContent.findIndex(c => c.id === 'legacy_intro');
        if (idx >= 0) state.data.siteContent[idx] = savedLegacyHero;
        else state.data.siteContent.push(savedLegacyHero);
      }
      toast('Legacy hero saved'); render();
    };
  }

  const legacyIntroForm = document.getElementById('form-legacy-intro');
  if (legacyIntroForm) {
    legacyIntroForm.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-legacy-intro');
      btn.disabled = true; btn.textContent = 'Saving...';
      const existing = state.data.siteContent.find(c => c.id === 'legacy_intro');
      const { error } = await updateSiteContent('legacy_intro', {
        ...(existing || {}),
        title: existing?.title || 'Built on values. Carried forward.',
        eyebrow: existing?.eyebrow || 'Management & Legacy',
        lead: existing?.lead || '',
        imageUrl: existing?.imageUrl || '',
        extraData: {
          ...(existing?.extraData || {}),
          introEyebrow: document.getElementById('legacy-intro-eyebrow')?.value.trim() || '',
          introTitle: document.getElementById('legacy-intro-title')?.value.trim() || '',
          introLead: document.getElementById('legacy-intro-lead')?.value.trim() || ''
        }
      });
      btn.disabled = false; btn.textContent = 'Save introduction';
      if (error) { toast('Error saving Legacy introduction: ' + error.message, 'error'); return; }
      toast('Legacy introduction saved'); await loadAllData(); render();
    };
  }

  const legacyTransitionForm = document.getElementById('form-legacy-transition');
  if (legacyTransitionForm) {
    legacyTransitionForm.onsubmit = async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn-save-legacy-transition');
      btn.disabled = true; btn.textContent = 'Saving...';
      const existing = state.data.legacyBlocks.find(b => b.blockType === 'transition');
      const payload = {
        blockType: 'transition',
        displayOrder: existing?.displayOrder ?? 4,
        eyebrow: document.getElementById('legacy-transition-eyebrow')?.value.trim() || 'Carrying It Forward',
        title: document.getElementById('legacy-transition-title')?.value.trim() || '',
        paragraphs: existing?.paragraphs || [],
        imageUrl: existing?.imageUrl || ''
      };
      const result = existing ? await updateLegacyBlock(existing.id, payload) : await createLegacyBlock(payload);
      btn.disabled = false; btn.textContent = 'Save transition';
      if (result.error) { toast('Error saving transition: ' + result.error.message, 'error'); return; }
      toast('Transition statement saved'); await loadAllData(); render();
    };
  }

  document.querySelectorAll('[data-edit-legacy]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.editLegacy;
      const blk = state.data.legacyBlocks.find(item => String(item.id) === String(id));
      if (blk) legacyBlockModal(blk);
    };
  });

  document.querySelectorAll('[data-delete-legacy]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.deleteLegacy;
      showConfirmModal({
        title: 'Delete Legacy Block',
        message: 'Are you sure you want to permanently delete this legacy block?',
        confirmText: 'Delete Block',
        onConfirm: async () => {
          const { error } = await deleteLegacyBlock(id);
          if (error) { toast('Error deleting block: ' + error.message, 'error'); return; }
          toast('Legacy block deleted'); await loadAllData(); render();
        }
      });
    };
  });

  // Team Actions
  document.querySelectorAll('[data-edit-member]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.editMember;
      const mem = state.data.team.find(item => String(item.id) === String(id));
      if (mem) teamMemberModal(mem);
    };
  });

  document.querySelectorAll('[data-delete-member]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.deleteMember;
      showConfirmModal({
        title: 'Delete Team Member',
        message: 'Are you sure you want to permanently delete this team member?',
        confirmText: 'Delete Member',
        onConfirm: async () => {
          const { error } = await deleteTeamMember(id);
          if (error) {
            toast('Error deleting member: ' + error.message, 'error');
            return;
          }
          toast('Team member deleted');
          await loadAllData();
          render();
        }
      });
    };
  });

  // Contact Details Save
  const btnSaveContact = document.getElementById('btn-save-contact');
  if (btnSaveContact) {
    btnSaveContact.onclick = async () => {
      btnSaveContact.disabled = true;
      btnSaveContact.textContent = 'Saving...';

      const payload = {
        address: document.getElementById('contact-address').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        contactIntro: document.getElementById('contact-intro').value.trim()
      };

      const { error } = await updateCompanySettings(payload);
      btnSaveContact.disabled = false;
      btnSaveContact.textContent = 'Save contact details';

      if (error) {
        toast('Error saving contact settings: ' + error.message, 'error');
        return;
      }

      toast('Contact details saved');
      await loadAllData();
      render();
    };
  }

  // Enquiry Actions
  document.querySelectorAll('[data-view-enquiry]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.viewEnquiry;
      const enq = state.data.enquiries.find(e => String(e.id) === String(id));
      if (enq) enquiryModal(enq);
    };
  });

  document.querySelectorAll('[data-delete-enquiry]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.deleteEnquiry;
      showConfirmModal({
        title: 'Delete Enquiry Record',
        message: 'Are you sure you want to delete this enquiry record?',
        confirmText: 'Delete Enquiry',
        onConfirm: async () => {
          const { error } = await deleteEnquiry(id);
          if (error) {
            toast('Error deleting enquiry: ' + error.message, 'error');
            return;
          }
          toast('Enquiry deleted');
          await loadAllData();
          render();
        }
      });
    };
  });

  // Social Actions
  document.querySelectorAll('[data-toggle-social]').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.toggleSocial;
      const link = state.data.socialLinks.find(l => String(l.id) === String(id));
      if (!link) return;

      const newStatus = !link.isActive;
      const { error } = await updateSocialLink(id, { isActive: newStatus });
      if (error) {
        toast('Error updating link: ' + error.message, 'error');
        return;
      }
      toast(`${link.platform} is now ${newStatus ? 'Active' : 'Inactive'}`);
      await loadAllData();
      render();
    };
  });

  document.querySelectorAll('[data-edit-social]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.editSocial;
      const link = state.data.socialLinks.find(l => String(l.id) === String(id));
      if (link) socialModal(link);
    };
  });

  document.querySelectorAll('[data-delete-social]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.deleteSocial;
      showConfirmModal({
        title: 'Delete Social Link',
        message: 'Are you sure you want to delete this social link?',
        confirmText: 'Delete Link',
        onConfirm: async () => {
          const { error } = await deleteSocialLink(id);
          if (error) {
            toast('Error deleting link: ' + error.message, 'error');
            return;
          }
          toast('Social link deleted');
          await loadAllData();
          render();
        }
      });
    };
  });

  // Media Actions
  document.querySelectorAll('[data-preview-media]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.previewMedia;
      const asset = state.data.media.find(m => String(m.id) === String(id));
      if (!asset) return;

      getModalRoot().innerHTML = `
        <div class="modal-backdrop" data-close-modal>
          <div class="modal">
            <div class="modal-head">
              <div>
                <div class="eyebrow">Media preview</div>
                <h2>${escapeHtml(asset.filename)}</h2>
              </div>
              <button class="icon-btn close-modal" data-close-modal>×</button>
            </div>
            <div class="modal-body">
              <div style="background:var(--paper-2); padding:20px; display:grid; place-items:center; min-height:280px; margin-bottom:16px;">
                <img src="${escapeHtml(asset.publicUrl)}" alt="" style="max-width:100%; max-height:400px; object-fit:contain;">
              </div>
              <div class="field-grid">
                <div class="field">
                  <label>Storage Path</label>
                  <input value="${escapeHtml(asset.storagePath)}" readonly>
                </div>
                <div class="field">
                  <label>Public URL</label>
                  <input value="${escapeHtml(asset.publicUrl)}" readonly>
                </div>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn" data-close-modal>Close</button>
            </div>
          </div>
        </div>
      `;
    };
  });

  document.querySelectorAll('[data-delete-media]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.deleteMedia;
      const path = b.dataset.path;
      showConfirmModal({
        title: 'Delete Media Asset',
        message: 'Are you sure you want to permanently delete this asset from storage and database?',
        confirmText: 'Delete Asset',
        onConfirm: async () => {
          const { error } = await deleteAsset(id, path);
          if (error) {
            toast('Error deleting media: ' + error.message, 'error');
            return;
          }
          toast('Media asset deleted');
          await loadAllData();
          render();
        }
      });
    };
  });

  // Settings: Site Settings Save
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.onclick = async () => {
      btnSaveSettings.disabled = true;
      btnSaveSettings.textContent = 'Saving...';

      const payload = {
        companyName: document.getElementById('settings-title').value.trim(),
        tagline: document.getElementById('settings-tagline').value.trim(),
        establishedYear: document.getElementById('settings-est').value.trim()
      };

      const { error } = await updateCompanySettings(payload);
      btnSaveSettings.disabled = false;
      btnSaveSettings.textContent = 'Save preferences';

      if (error) {
        toast('Error saving settings: ' + error.message, 'error');
        return;
      }

      toast('Website settings updated successfully');
      await loadAllData();
      render();
    };
  }

  // Settings: Password Change Form
  const pwdForm = document.getElementById('form-password-change');
  if (pwdForm) {
    pwdForm.onsubmit = async (e) => {
      e.preventDefault();
      const currentPwd = document.getElementById('pwd-current').value;
      const newPwd = document.getElementById('pwd-new').value;
      const confirmPwd = document.getElementById('pwd-confirm').value;
      const btn = document.getElementById('btn-update-pwd');

      if (newPwd !== confirmPwd) {
        toast('New password and confirmation do not match', 'error');
        return;
      }

      if (newPwd.length < 6) {
        toast('New password must be at least 6 characters long', 'error');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Updating Password...';

      const { error } = await changePassword(currentPwd, newPwd);
      btn.disabled = false;
      btn.textContent = 'Update Password';

      if (error) {
        toast(error.message || 'Password update failed', 'error');
        return;
      }

      toast('Password changed successfully! Keep your credentials secure.');
      pwdForm.reset();
    };
  }
}

// Global action handler
function handleAction(actionName, btnElement) {
  if (actionName === 'close-sidebar') {
    closeSidebar();
  } else if (actionName === 'open-sidebar') {
    openSidebar();
  } else if (actionName === 'preview') {
    window.open('../index.html', '_blank');
  } else if (actionName === 'toast-notify') {
    const unread = state.data.enquiries.filter(e => e.status === 'New').length;
    toast(`Notifications: ${unread} new contact enquiries.`);
  } else if (actionName === 'upload') {
    uploadMediaModal();
  } else if (actionName === 'add-service') {
    serviceModal(null);
  } else if (actionName === 'add-member') {
    teamMemberModal(null);
  } else if (actionName === 'add-legacy-block') {
    legacyBlockModal(null, btnElement?.dataset?.legacyType || 'story');
  } else if (actionName === 'add-social') {
    socialModal(null);
  } else if (actionName === 'edit-values') {
    const aboutValues = state.data.siteContent.find(c => c.id === 'about_values');
    const aboutIntro = state.data.siteContent.find(c => c.id === 'about_intro');
    const defaultVals = ['Thoughtful Design', 'Quality Over Quantity', 'Built for Living', 'Care in Every Detail', 'Trust & Responsibility', 'Calm, Considered Development'];
    
    let rawVals = aboutValues?.extraData?.values || aboutIntro?.extraData?.values || defaultVals;
    const valueTitles = Array.isArray(rawVals) ? rawVals.map(v => typeof v === 'object' ? (v.title || '') : v).filter(Boolean) : defaultVals;
    
    getModalRoot().innerHTML = `
      <div class="modal-backdrop" data-close-modal>
        <div class="modal">
          <div class="modal-head">
            <div>
              <div class="eyebrow">About Page</div>
              <h2>Edit Brand Values</h2>
            </div>
            <button class="icon-btn close-modal" data-close-modal>×</button>
          </div>
          <form id="form-values-edit">
            <div class="modal-body">
              <p class="note" style="margin-bottom:14px;">Enter each value title on a new line (6 values recommended):</p>
              <textarea id="val-textarea" style="min-height:160px;">${escapeHtml(valueTitles.join('\n'))}</textarea>
            </div>
            <div class="modal-foot">
              <button type="button" class="btn" data-close-modal>Cancel</button>
              <button type="submit" class="btn primary" id="btn-save-vals">Save values</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const vForm = document.getElementById('form-values-edit');
    if (vForm) {
      vForm.onsubmit = async (e) => {
        e.preventDefault();
        const text = document.getElementById('val-textarea').value.trim();
        const list = text.split('\n').map(x => x.trim()).filter(Boolean);

        // Keep descriptions if existing structured values, or convert strings
        const existingValues = Array.isArray(rawVals) ? rawVals : [];
        const structuredValues = list.map(title => {
          const matched = existingValues.find(v => (typeof v === 'object' && v.title === title) || v === title);
          if (matched && typeof matched === 'object') {
            return matched;
          }
          return { title, description: '' };
        });

        // Update about_values if it exists, and about_intro
        const updatePromises = [];
        if (aboutValues) {
          updatePromises.push(updateSiteContent('about_values', {
            extraData: { ...(aboutValues.extraData || {}), values: structuredValues }
          }));
        }
        if (aboutIntro) {
          updatePromises.push(updateSiteContent('about_intro', {
            extraData: { ...(aboutIntro.extraData || {}), values: list }
          }));
        }

        const results = await Promise.all(updatePromises);
        const err = results.find(r => r?.error)?.error;

        if (err) {
          toast('Error saving values: ' + err.message, 'error');
          return;
        }

        toast('Brand values saved');
        closeModal();
        await loadAllData();
        render();
      };
    }
  }
}

// =============================================================================
// Application Entrypoint
// =============================================================================
async function startApp() {
  try {
    // 1. Ensure client is initialized
    await ensureClientConfigured();

    // 2. Check local session (zero network latency)
    const { data: session } = await getSession();
    if (session && session.user && session.user.id) {
      const { data: adminRecord } = await checkAdminAuthorization(session.user.id);
      if (adminRecord && adminRecord.is_active) {
        state.user = session.user;
        state.adminProfile = adminRecord;
        await initAppShell();
        return;
      } else {
        await signOut();
      }
    }

    // 3. Render login view immediately
    renderLoginView();
  } catch (err) {
    console.error('Boot error:', err);
    renderLoginView();
  }
}

startApp();
