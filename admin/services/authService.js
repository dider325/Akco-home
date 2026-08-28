/**
 * AKCO Real Estate Ltd. — Authentication Service
 * Manages Supabase Auth credentials, session states, and admin_users authorization checks.
 */
import { getSupabase } from './supabaseClient.js';

export async function signIn(email, password) {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return { data: null, error: authError };
    }

    if (!authData?.user) {
      return { data: null, error: new Error('No user returned from authentication') };
    }

    // Verify user authorization against the admin_users table
    const { data: adminRecord, error: adminError } = await client
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('id', authData.user.id)
      .single();

    if (adminError || !adminRecord) {
      // User is authenticated in Supabase Auth but not authorized in admin_users
      await client.auth.signOut();
      return {
        data: null,
        error: new Error('Access denied: User is not registered in the AKCO admin registry.')
      };
    }

    if (!adminRecord.is_active) {
      await client.auth.signOut();
      return {
        data: null,
        error: new Error('Access denied: Admin account is inactive.')
      };
    }

    return {
      data: {
        user: authData.user,
        session: authData.session,
        adminProfile: adminRecord
      },
      error: null
    };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function signOut() {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: null };
  }

  try {
    const { error } = await client.auth.signOut();
    return { data: true, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getSession() {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data, error } = await client.auth.getSession();
    return { data: data?.session || null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getCurrentUser() {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    const { data, error } = await client.auth.getUser();
    return { data: data?.user || null, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function checkAdminAuthorization(userId) {
  const client = getSupabase();
  if (!client || !userId) {
    return { data: null, error: new Error('Missing client or user ID') };
  }

  try {
    const { data, error } = await client
      .from('admin_users')
      .select('id, email, role, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export function onAuthStateChange(callback) {
  const client = getSupabase();
  if (!client) {
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
    let adminProfile = null;
    if (session?.user?.id) {
      const { data } = await client
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      adminProfile = data;
    }
    callback(event, session, adminProfile);
  });

  return subscription;
}

/**
 * Updates the user's password securely through Supabase Auth
 */
export async function changePassword(currentPassword, newPassword) {
  const client = getSupabase();
  if (!client) {
    return { data: null, error: new Error('Supabase client is not configured') };
  }

  try {
    if (!newPassword || newPassword.length < 6) {
      return { data: null, error: new Error('New password must be at least 6 characters long.') };
    }

    const { data: userRes, error: userError } = await client.auth.getUser();
    if (userError || !userRes?.user) {
      return { data: null, error: userError || new Error('No active authenticated session.') };
    }

    // If current password provided, verify it first
    if (currentPassword && userRes.user.email) {
      const { error: verifyError } = await client.auth.signInWithPassword({
        email: userRes.user.email,
        password: currentPassword
      });
      if (verifyError) {
        return { data: null, error: new Error('Current password verification failed. Please check your credentials.') };
      }
    }

    const { data, error } = await client.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { data: null, error };
    }

    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
