/**
 * AKCO Real Estate Ltd. — Supabase Browser Client
 * Initializes and exports the Supabase client using public URL and anon key.
 * Never expose the service_role key or private secrets here.
 *
 * Static-hosting compatible: the browser Supabase bundle is loaded globally
 * by the HTML entrypoints, so this service does not depend on Node/server
 * environment variables or a server-side /api/config endpoint.
 */
const createClient = (...args) => {
  const factory = globalThis?.supabase?.createClient;
  if (typeof factory !== 'function') {
    throw new Error('Supabase browser client bundle is not loaded');
  }
  return factory(...args);
};
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

  return null;
}

export const supabase = getSupabase();
