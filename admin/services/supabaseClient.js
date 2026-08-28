/**
 * AKCO Real Estate Ltd. — Supabase Browser Client
 * Initializes and exports the Supabase client using public URL and anon key.
 * Never expose the service_role key or private secrets here.
 */
import { createClient } from './supabase-bundle.js';

// Default configuration resolution
const getEnvConfig = () => {
  if (typeof window !== 'undefined' && window.SUPABASE_CONFIG) {
    return {
      url: window.SUPABASE_CONFIG.url || '',
      anonKey: window.SUPABASE_CONFIG.anonKey || ''
    };
  }

  // Check localStorage for runtime configuration override if set
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedUrl = window.localStorage.getItem('AKCO_SUPABASE_URL');
    const storedKey = window.localStorage.getItem('AKCO_SUPABASE_ANON_KEY');
    if (storedUrl && storedKey) {
      return { url: storedUrl, anonKey: storedKey };
    }
  }

  return {
    url: '',
    anonKey: ''
  };
};

let clientInstance = null;

export function isConfigured() {
  const config = getEnvConfig();
  return Boolean(config.url && config.anonKey);
}

export function getSupabase() {
  if (clientInstance) return clientInstance;

  const { url, anonKey } = getEnvConfig();

  if (url && anonKey) {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return clientInstance;
  }

  return null;
}

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error('Both SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('AKCO_SUPABASE_URL', url);
    window.localStorage.setItem('AKCO_SUPABASE_ANON_KEY', anonKey);
  }

  clientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return clientInstance;
}

export async function ensureClientConfigured() {
  if (clientInstance) return clientInstance;

  const current = getEnvConfig();
  if (current.url && current.anonKey) {
    return getSupabase();
  }

  // Static deployments (Vercel/Netlify) do not expose server environment
  // variables to browser JavaScript. The shared public config is therefore
  // the primary browser configuration source; keep the API fallback only for
  // older/local server setups that may still provide /api/config.
  try {
    const res = await fetch('/api/config', { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        return initSupabase(data.supabaseUrl, data.supabaseAnonKey);
      }
    }
  } catch {
    // Static hosting or an unavailable API is fine when public config exists.
  }

  return getSupabase();
}

export const supabase = getSupabase();
