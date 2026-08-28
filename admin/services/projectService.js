/**
 * AKCO Real Estate Ltd. — Project Service Layer
 * Manages project records, images JSONB galleries, statuses, and ordering.
 * Normalizes between PostgreSQL snake_case and frontend Project contract.
 */
import { getSupabase } from './supabaseClient.js';

/**
 * Normalizes a database row to the frontend Project contract
 */
export function mapProjectFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    slug: row.slug || '',
    location: row.location || '',
    year: row.year || '',
    status: row.status || 'Draft',
    description: row.description || '',
    featuredImage: row.featured_image || '',
    images: Array.isArray(row.images) ? row.images : [],
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Normalizes frontend project data to database payload
 */
function mapProjectToDb(data) {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.location !== undefined) payload.location = data.location;
  if (data.year !== undefined) payload.year = data.year;
  if (data.status !== undefined) payload.status = data.status;
  if (data.description !== undefined) payload.description = data.description;
  if (data.featuredImage !== undefined) payload.featured_image = data.featuredImage;
  if (data.images !== undefined) payload.images = Array.isArray(data.images) ? data.images : [];
  if (data.displayOrder !== undefined) payload.display_order = data.displayOrder;
  return payload;
}

/**
 * Generates a URL slug from a project name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const PROJECTS_STORAGE_KEY = 'akco_db_projects';

function getLocalProjects() {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [
    { id: '1', name: 'Project Name One', location: 'Location placeholder', description: 'Approved project description will be added here.', status: 'Completed', year: '—', featuredImage: 'assets/project-1.svg', images: ['assets/project-1.svg'], displayOrder: 1 },
    { id: '2', name: 'Project Name Two', location: 'Location placeholder', description: 'Approved project description will be added here.', status: 'Ongoing', year: '—', featuredImage: 'assets/project-2.svg', images: ['assets/project-2.svg'], displayOrder: 2 },
    { id: '3', name: 'Project Name Three', location: 'Location placeholder', description: 'Approved project description will be added here.', status: 'Upcoming', year: '—', featuredImage: 'assets/project-3.svg', images: ['assets/project-3.svg'], displayOrder: 3 }
  ];
}

function saveLocalProjects(list) {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(list));
  } catch(e) {}
}

export async function getProjects(options = {}) {
  const client = getSupabase();
  if (client) {
    try {
      let query = client.from('projects').select('*');
      if (options.status && options.status !== 'All') {
        query = query.eq('status', options.status);
      }
      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,location.ilike.%${options.search}%`);
      }
      const orderColumn = options.orderBy === 'updated' ? 'updated_at' : 'display_order';
      const ascending = options.ascending !== undefined ? options.ascending : (options.orderBy !== 'updated');
      query = query.order(orderColumn, { ascending });

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length) {
        const mapped = data.map(mapProjectFromDb);
        saveLocalProjects(mapped);
        return { data: mapped, error: null };
      }
    } catch (err) {}
  }
  let local = getLocalProjects();
  if (options.status && options.status !== 'All') {
    local = local.filter(p => p.status === options.status);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    local = local.filter(p => (p.name && p.name.toLowerCase().includes(q)) || (p.location && p.location.toLowerCase().includes(q)));
  }
  return { data: local, error: null };
}

export async function getProject(id) {
  const projects = (await getProjects()).data || [];
  const project = projects.find(p => String(p.id) === String(id));
  return { data: project || null, error: null };
}

export async function getProjectBySlug(slug) {
  const projects = (await getProjects()).data || [];
  const project = projects.find(p => p.slug === slug);
  return { data: project || null, error: null };
}

export async function createProject(projectData) {
  const client = getSupabase();
  let dbCreated = null;

  if (client) {
    try {
      const payload = mapProjectToDb(projectData);
      if (!payload.slug && payload.name) {
        payload.slug = generateSlug(payload.name);
      }
      const { data, error } = await client
        .from('projects')
        .insert(payload)
        .select()
        .single();
      if (!error && data) {
        dbCreated = mapProjectFromDb(data);
      }
    } catch (err) {}
  }

  const projects = getLocalProjects();
  const newProject = dbCreated || {
    id: String(Date.now()),
    name: projectData.name || 'Untitled Project',
    slug: generateSlug(projectData.name || 'project'),
    location: projectData.location || '',
    year: projectData.year || '—',
    status: projectData.status || 'Draft',
    description: projectData.description || '',
    featuredImage: projectData.featuredImage || 'assets/project-1.svg',
    images: Array.isArray(projectData.images) ? projectData.images : [projectData.featuredImage || 'assets/project-1.svg'],
    displayOrder: projectData.displayOrder ?? (projects.length + 1),
    createdAt: new Date().toISOString()
  };

  projects.push(newProject);
  saveLocalProjects(projects);
  return { data: newProject, error: null };
}

export async function updateProject(id, projectData) {
  const client = getSupabase();
  let dbUpdated = null;

  if (client) {
    try {
      const payload = mapProjectToDb(projectData);
      const { data, error } = await client
        .from('projects')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        dbUpdated = mapProjectFromDb(data);
      }
    } catch (err) {}
  }

  const projects = getLocalProjects();
  const idx = projects.findIndex(p => String(p.id) === String(id));
  const updated = dbUpdated || {
    ...(idx >= 0 ? projects[idx] : {}),
    id,
    name: projectData.name !== undefined ? projectData.name : projects[idx]?.name,
    location: projectData.location !== undefined ? projectData.location : projects[idx]?.location,
    year: projectData.year !== undefined ? projectData.year : projects[idx]?.year,
    status: projectData.status !== undefined ? projectData.status : projects[idx]?.status,
    description: projectData.description !== undefined ? projectData.description : projects[idx]?.description,
    featuredImage: projectData.featuredImage !== undefined ? projectData.featuredImage : projects[idx]?.featuredImage,
    images: projectData.images !== undefined ? projectData.images : projects[idx]?.images,
    updatedAt: new Date().toISOString()
  };

  if (idx >= 0) {
    projects[idx] = updated;
  } else {
    projects.push(updated);
  }

  saveLocalProjects(projects);
  return { data: updated, error: null };
}

export async function deleteProject(id) {
  const client = getSupabase();
  if (client) {
    try {
      await client.from('projects').delete().eq('id', id);
    } catch (err) {}
  }

  const projects = getLocalProjects().filter(p => String(p.id) !== String(id));
  saveLocalProjects(projects);
  return { data: true, error: null };
}

export async function reorderProjects(orderedIds = []) {
  const client = getSupabase();
  if (client) {
    try {
      const updates = orderedIds.map((id, index) =>
        client
          .from('projects')
          .update({ display_order: index + 1 })
          .eq('id', id)
      );
      await Promise.all(updates);
    } catch (err) {}
  }

  const projects = getLocalProjects();
  orderedIds.forEach((id, index) => {
    const p = projects.find(item => String(item.id) === String(id));
    if (p) p.displayOrder = index + 1;
  });
  saveLocalProjects(projects);
  return { data: true, error: null };
}
