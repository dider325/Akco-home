/**
 * AKCO Real Estate Ltd. — Contact Enquiry Service Layer
 * Handles public submissions and admin inbox management for customer enquiries.
 */
import { getSupabase } from './supabaseClient.js';

function mapEnquiryFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    message: row.message || '',
    status: row.status || 'New',
    createdAt: row.created_at
  };
}

/**
 * Public function to submit a new enquiry from contact forms
 */
export async function submitEnquiry({ name, email, phone = '', message }) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  if (!name || !name.trim()) {
    return { data: null, error: new Error('Name is required') };
  }
  if (!email || !email.trim()) {
    return { data: null, error: new Error('Email is required') };
  }
  if (!message || !message.trim()) {
    return { data: null, error: new Error('Message is required') };
  }

  try {
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      message: message.trim(),
      status: 'New'
    };

    const { data, error } = await client
      .from('contact_enquiries')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapEnquiryFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Admin function to fetch enquiries with filtering
 */
export async function getEnquiries(options = {}) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    let query = client
      .from('contact_enquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (options.status && options.status !== 'All') {
      query = query.eq('status', options.status);
    }

    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,message.ilike.%${options.search}%`);
    }

    const { data, error } = await query;
    if (error) return { data: null, error };
    return { data: (data || []).map(mapEnquiryFromDb), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getEnquiry(id) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { data, error } = await client
      .from('contact_enquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return { data: null, error };
    return { data: mapEnquiryFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateEnquiryStatus(id, status) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  const validStatuses = ['New', 'Read', 'Archived'];
  if (!validStatuses.includes(status)) {
    return { data: null, error: new Error(`Invalid status: ${status}. Must be one of ${validStatuses.join(', ')}`) };
  }

  try {
    const { data, error } = await client
      .from('contact_enquiries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: mapEnquiryFromDb(data), error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteEnquiry(id) {
  const client = getSupabase();
  if (!client) return { data: null, error: new Error('Supabase client not configured') };

  try {
    const { error } = await client
      .from('contact_enquiries')
      .delete()
      .eq('id', id);

    if (error) return { data: false, error };
    return { data: true, error: null };
  } catch (err) {
    return { data: false, error: err };
  }
}
