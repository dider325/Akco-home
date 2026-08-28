/**
 * AKCO Real Estate Ltd. — Content Service Layer
 * Manages site_content, company_settings, social_links, services, team_members, and legacy_blocks.
 * Maps database snake_case columns cleanly to camelCase frontend contracts.
 */
import { getSupabase } from './supabaseClient.js';

// =============================================================================
// 1. Site Content
// =============================================================================
function mapSiteContentFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    eyebrow: row.eyebrow || '',
    title: row.title || '',
    lead: row.lead || '',
    body: row.body || '',
    imageUrl: row.image_url || '',
    extraData: row.extra_data || {},
    updatedAt: row.updated_at
  };
}

// LocalStorage Persistence Helpers for Site Content & Settings
const SITE_CONTENT_KEY = 'akco_db_site_content';

function getLocalSiteContent() {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return [
    { id: 'homepage_hero', title: 'Homes Done Thoughtfully.', eyebrow: 'Boutique Residential Developer · Dhaka', lead: 'Creating Homes. Building Trust.', imageUrl: 'assets/hero.svg' },
    { id: 'about_hero', title: 'Homes Done\nThoughtfully.', eyebrow: 'About AKCO', lead: 'Established 2005 · Dhaka · Residential Development', imageUrl: 'assets/hero.svg' },
    { id: 'about_cinema', title: 'To create homes that feel timeless and thoughtfully designed—bringing together comfort, beauty, and lasting value for families in Dhaka, through a quieter and more considered approach to development.', eyebrow: 'Vision', lead: 'Homes Done Thoughtfully', imageUrl: 'assets/story.svg', extraData: { tagline: 'Homes Done Thoughtfully' } },
    { id: 'about_intro', title: 'A boutique residential developer based in Dhaka', eyebrow: 'About AKCO', lead: 'AKCO Real Estate Limited is a boutique residential developer based in Dhaka, established in 2005. Over the years, we have developed a select number of projects, with a focus on quality, livability, and thoughtful design.', extraData: { paragraphs: ['Our approach is simple—we create homes with intention, where comfort, warmth, and thoughtful design come together to offer a more elevated way of living.', 'We design with an understanding of how families in Dhaka live, prioritizing flow and spaces that feel natural and easy to use every day.'] } },
    { id: 'about_closing', title: 'A quieter approach\nto building homes.', eyebrow: 'Homes Done Thoughtfully' }
  ];
}

function saveLocalSiteContent(items) {
  try {
    localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(items));
    const contentMap = Object.fromEntries(items.map(c => [c.id, c]));
    localStorage.setItem('akco_site_content_cache', JSON.stringify(contentMap));
  } catch(e) {
    console.warn('LocalStorage save warning:', e);
  }
}

export async function getSiteContent() {
  const localList = getLocalSiteContent();
  const client = getSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('site_content')
        .select('*')
        .order('id');

      if (!error && Array.isArray(data) && data.length) {
        const dbMapped = data.map(mapSiteContentFromDb);
        const merged = dbMapped.map(dbItem => {
          const localItem = localList.find(l => l.id === dbItem.id);
          if (localItem && localItem.imageUrl && localItem.imageUrl !== 'assets/hero.svg' && (!dbItem.imageUrl || dbItem.imageUrl === 'assets/hero.svg')) {
            return { ...dbItem, imageUrl: localItem.imageUrl };
          }
          return dbItem;
        });
        saveLocalSiteContent(merged);
        return { data: merged, error: null };
      }
    } catch (err) {}
  }
  return { data: localList, error: null };
}

export async function getSiteContentById(id) {
  const list = (await getSiteContent()).data || [];
  const item = list.find(c => c.id === id);
  return { data: item || null, error: null };
}

export async function updateSiteContent(id, contentData = {}) {
  const client = getSupabase();
  const localList = getLocalSiteContent();
  const idx = localList.findIndex(c => c.id === id);
  const existingLocal = idx >= 0 ? localList[idx] : null;

  if (client) {
    try {
      // Always merge with the existing DB row before writing. This is critical because
      // many image-only saves intentionally omit text fields, while site_content.title
      // is NOT NULL in the database.
      const { data: existingDb, error: fetchError } = await client
        .from('site_content')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const source = existingDb ? mapSiteContentFromDb(existingDb) : existingLocal;
      const title = contentData.title !== undefined
        ? String(contentData.title || '')
        : String(source?.title || id.replace(/_/g, ' '));

      if (!title.trim()) {
        throw new Error(`Cannot save site content "${id}": title is required.`);
      }

      const payload = {
        id,
        title,
        eyebrow: contentData.eyebrow !== undefined
          ? String(contentData.eyebrow || '')
          : String(source?.eyebrow || ''),
        lead: contentData.lead !== undefined
          ? String(contentData.lead || '')
          : String(source?.lead || ''),
        body: contentData.body !== undefined
          ? String(contentData.body || '')
          : String(source?.body || ''),
        image_url: contentData.imageUrl !== undefined
          ? String(contentData.imageUrl || '')
          : String(source?.imageUrl || ''),
        extra_data: contentData.extraData !== undefined
          ? (contentData.extraData || {})
          : (source?.extraData || {}),
        updated_at: new Date().toISOString()
      };

      const { data: saved, error: saveError } = await client
        .from('site_content')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (saveError) throw saveError;

      const dbItem = mapSiteContentFromDb(saved);
      const nextList = [...localList];
      if (idx >= 0) nextList[idx] = dbItem;
      else nextList.push(dbItem);
      saveLocalSiteContent(nextList);
      return { data: dbItem, error: null };
    } catch (err) {
      // Do NOT hide Supabase errors or pretend the write succeeded.
      console.error(`Failed to update site_content:${id}`, err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  // No configured Supabase client: local-only fallback for development.
  const updatedItem = {
    id,
    title: contentData.title !== undefined ? contentData.title : (existingLocal?.title || id.replace(/_/g, ' ')),
    eyebrow: contentData.eyebrow !== undefined ? contentData.eyebrow : (existingLocal?.eyebrow || ''),
    lead: contentData.lead !== undefined ? contentData.lead : (existingLocal?.lead || ''),
    body: contentData.body !== undefined ? contentData.body : (existingLocal?.body || ''),
    imageUrl: contentData.imageUrl !== undefined ? contentData.imageUrl : (existingLocal?.imageUrl || ''),
    extraData: contentData.extraData !== undefined ? contentData.extraData : (existingLocal?.extraData || {}),
    updatedAt: new Date().toISOString()
  };
  const nextList = [...localList];
  if (idx >= 0) nextList[idx] = updatedItem;
  else nextList.push(updatedItem);
  saveLocalSiteContent(nextList);
  return { data: updatedItem, error: null };
}

export async function getCompanySettings() {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { data, error } = await client
      .from('company_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) return { data: null, error };
    return { data: mapCompanySettingsFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateCompanySettings(settingsData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {};
    if (settingsData.companyName !== undefined) payload.company_name = settingsData.companyName;
    if (settingsData.tagline !== undefined) payload.tagline = settingsData.tagline;
    if (settingsData.establishedYear !== undefined) payload.established_year = settingsData.establishedYear;
    if (settingsData.address !== undefined) payload.address = settingsData.address;
    if (settingsData.phone !== undefined) payload.phone = settingsData.phone;
    if (settingsData.email !== undefined) payload.email = settingsData.email;
    if (settingsData.contactIntro !== undefined) payload.contact_intro = settingsData.contactIntro;

    const { data, error } = await client
      .from('company_settings')
      .upsert({ id: 'default', ...payload })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapCompanySettingsFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// =============================================================================
// 3. Services
// =============================================================================
function mapServiceFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || '',
    imageUrl: row.image_url || '',
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getServices() {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { data, error } = await client
      .from('services')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { data: null, error };
    return { data: (data || []).map(mapServiceFromDb), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createService(serviceData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {
      title: serviceData.title,
      description: serviceData.description || '',
      image_url: serviceData.imageUrl || '',
      display_order: serviceData.displayOrder ?? 0
    };

    const { data, error } = await client
      .from('services')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapServiceFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateService(id, serviceData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {};
    if (serviceData.title !== undefined) payload.title = serviceData.title;
    if (serviceData.description !== undefined) payload.description = serviceData.description;
    if (serviceData.imageUrl !== undefined) payload.image_url = serviceData.imageUrl;
    if (serviceData.displayOrder !== undefined) payload.display_order = serviceData.displayOrder;

    const { data, error } = await client
      .from('services')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapServiceFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteService(id) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { error } = await client
      .from('services')
      .delete()
      .eq('id', id);

    if (error) return { data: false, error };
    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err };
  }
}

// =============================================================================
// 4. Team Members
// =============================================================================
function mapTeamMemberFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    role: row.role || '',
    bioParagraphs: Array.isArray(row.bio_paragraphs) ? row.bio_paragraphs : [],
    imageUrl: row.image_url || '',
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const DEFAULT_TEAM_MEMBERS = [
  {
    name: 'Mehejabeen Z Khan',
    role: 'Managing Director',
    bioParagraphs: [
      'Mehejabeen Z Khan brings over 15 years of experience as a development professional, having worked extensively with international charities in a consulting capacity. She holds a Master of Social Sciences in Economics from the University of Dhaka.',
      'As Managing Director of AKCO Real Estate Limited, she leads the company with a strong sense of responsibility, continuity, and care—carrying forward its founding values while ensuring a steady and thoughtful approach to growth. Alongside her professional work, she remains actively involved in both local and international women’s advocacy initiatives.'
    ],
    imageUrl: 'assets/portrait-1.svg',
    displayOrder: 1
  },
  {
    name: 'Zarka Hasan Khan',
    role: 'Director',
    bioParagraphs: [
      'Zarka Hasan Khan holds a double major in Economics and Accounting from City, University of London, and a Master’s degree in Corporate Finance from Queen Mary University of London.',
      'As a Director at AKCO Real Estate Limited, she brings a modern, forward-looking perspective to the company, contributing to its evolving approach while remaining grounded in its core values of thoughtful design and long-term livability. She is actively involved in the strategic direction and brand development of the company.'
    ],
    imageUrl: 'assets/portrait-2.svg',
    displayOrder: 2
  },
  {
    name: 'Rayma Hasan Khan',
    role: 'Director',
    bioParagraphs: [
      'Rayma Hasan Khan is currently pursuing a degree in Architecture at BRAC University, Dhaka.',
      'With a strong interest in design and the built environment, she represents the next phase of the company’s journey, with a focus on integrating architectural thinking into AKCO’s future developments.'
    ],
    imageUrl: 'assets/portrait-3.svg',
    displayOrder: 3
  }
];

async function ensureDefaultTeamMembers(client, rows) {
  // The original website already shipped with three leadership profiles.
  // The first CMS build did not seed those records, so creating one new
  // member could accidentally replace all three public cards. On the first
  // authenticated CMS read, restore any missing original profiles once and
  // mark the migration as complete. After that, deletes remain authoritative.
  try {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session) return rows;

    const { data: markerRow } = await client
      .from('site_content')
      .select('extra_data')
      .eq('id', 'legacy_intro')
      .maybeSingle();

    const marker = markerRow?.extra_data || {};
    // v2 repairs databases that were marked initialized by the earlier migration
    // even though the original three profiles were never inserted. Once v2 is
    // complete, future deletes remain authoritative.
    const TEAM_MIGRATION_VERSION = 2;
    if (marker.teamMembersMigrationVersion >= TEAM_MIGRATION_VERSION) return rows;

    const existingNames = new Set((rows || []).map(r => String(r.name || '').trim().toLowerCase()));
    const missing = DEFAULT_TEAM_MEMBERS.filter(m => !existingNames.has(m.name.toLowerCase()));

    if (missing.length) {
      const { data: inserted } = await client
        .from('team_members')
        .insert(missing.map(m => ({
          name: m.name,
          role: m.role,
          bio_paragraphs: m.bioParagraphs,
          image_url: m.imageUrl,
          display_order: m.displayOrder
        })))
        .select();
      if (Array.isArray(inserted)) rows = [...(rows || []), ...inserted];
    }

    const mergedExtra = { ...marker, teamMembersInitialized: true, teamMembersMigrationVersion: TEAM_MIGRATION_VERSION };
    await client.from('site_content').upsert({
      id: 'legacy_intro',
      title: markerRow ? undefined : 'Built on values. Carried forward.',
      eyebrow: markerRow ? undefined : 'Management & Legacy',
      lead: markerRow ? undefined : 'A foundation of care, integrity and purpose — carried into the next generation of AKCO.',
      extra_data: mergedExtra
    }, { onConflict: 'id' });

    return rows;
  } catch (err) {
    // Migration is best-effort; never prevent the CMS from loading existing data.
    return rows;
  }
}

export async function getTeamMembers() {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { data, error } = await client
      .from('team_members')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { data: null, error };
    const rows = await ensureDefaultTeamMembers(client, data || []);
    rows.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    return { data: rows.map(mapTeamMemberFromDb), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createTeamMember(memberData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {
      name: memberData.name,
      role: memberData.role,
      bio_paragraphs: memberData.bioParagraphs || [],
      image_url: memberData.imageUrl || '',
      display_order: memberData.displayOrder ?? 0
    };

    const { data, error } = await client
      .from('team_members')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapTeamMemberFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateTeamMember(id, memberData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {};
    if (memberData.name !== undefined) payload.name = memberData.name;
    if (memberData.role !== undefined) payload.role = memberData.role;
    if (memberData.bioParagraphs !== undefined) payload.bio_paragraphs = memberData.bioParagraphs;
    if (memberData.imageUrl !== undefined) payload.image_url = memberData.imageUrl;
    if (memberData.displayOrder !== undefined) payload.display_order = memberData.displayOrder;

    const { data, error } = await client
      .from('team_members')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapTeamMemberFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteTeamMember(id) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { error } = await client
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) return { data: false, error };
    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err };
  }
}

// =============================================================================
// 5. Legacy Blocks
// =============================================================================
function mapLegacyBlockFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    blockType: row.block_type || 'story',
    eyebrow: row.eyebrow || '',
    title: row.title || '',
    paragraphs: Array.isArray(row.paragraphs) ? row.paragraphs : [],
    imageUrl: row.image_url || '',
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getLegacyBlocks() {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { data, error } = await client
      .from('legacy_blocks')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { data: null, error };
    return { data: (data || []).map(mapLegacyBlockFromDb), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createLegacyBlock(blockData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {
      block_type: blockData.blockType || 'story',
      eyebrow: blockData.eyebrow || '',
      title: blockData.title,
      paragraphs: blockData.paragraphs || [],
      image_url: blockData.imageUrl || '',
      display_order: blockData.displayOrder ?? 0
    };

    const { data, error } = await client
      .from('legacy_blocks')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapLegacyBlockFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateLegacyBlock(id, blockData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {};
    if (blockData.blockType !== undefined) payload.block_type = blockData.blockType;
    if (blockData.eyebrow !== undefined) payload.eyebrow = blockData.eyebrow;
    if (blockData.title !== undefined) payload.title = blockData.title;
    if (blockData.paragraphs !== undefined) payload.paragraphs = blockData.paragraphs;
    if (blockData.imageUrl !== undefined) payload.image_url = blockData.imageUrl;
    if (blockData.displayOrder !== undefined) payload.display_order = blockData.displayOrder;

    const { data, error } = await client
      .from('legacy_blocks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapLegacyBlockFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteLegacyBlock(id) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { error } = await client
      .from('legacy_blocks')
      .delete()
      .eq('id', id);

    if (error) return { data: false, error };
    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err };
  }
}

// =============================================================================
// 6. Social Links
// =============================================================================
function mapSocialLinkFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    platform: row.platform || '',
    url: row.url || '',
    isActive: Boolean(row.is_active),
    displayOrder: row.display_order ?? 0,
    updatedAt: row.updated_at
  };
}

export async function getSocialLinks(includeInactive = true) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    let query = client
      .from('social_links')
      .select('*')
      .order('display_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: (data || []).map(mapSocialLinkFromDb), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function createSocialLink(linkData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {
      platform: linkData.platform,
      url: linkData.url,
      is_active: linkData.isActive !== undefined ? linkData.isActive : true,
      display_order: linkData.displayOrder ?? 0
    };

    const { data, error } = await client
      .from('social_links')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapSocialLinkFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateSocialLink(id, linkData) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const payload = {};
    if (linkData.platform !== undefined) payload.platform = linkData.platform;
    if (linkData.url !== undefined) payload.url = linkData.url;
    if (linkData.isActive !== undefined) payload.is_active = linkData.isActive;
    if (linkData.displayOrder !== undefined) payload.display_order = linkData.displayOrder;

    const { data, error } = await client
      .from('social_links')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapSocialLinkFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteSocialLink(id) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { error } = await client
      .from('social_links')
      .delete()
      .eq('id', id);

    if (error) return { data: false, error };
    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err };
  }
}
