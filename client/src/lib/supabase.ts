import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qouppyvbepiccepacxne.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdXBweXZiZXBpY2NlcGFjeG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDI1NDIsImV4cCI6MjA2MzUxODU0Mn0.uYvLjL7X4cP8Q3j0W7LWvEwsJTt6-8-34Xb0vkq-79E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

export async function signInWithGoogle() {
  try {
    console.log('[SUPABASE] Starting Google OAuth flow...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
      // Let Supabase handle the redirect automatically
    });

    if (error) {
      console.error('[SUPABASE] Error signing in with Google:', error);
      console.error('[SUPABASE] Error details:', {
        message: error.message,
        status: error.status
      });
      throw error;
    }

    console.log('[SUPABASE] OAuth initiation successful:', data);
    return data;
  } catch (error) {
    console.error('[SUPABASE] Caught exception during Google sign-in:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
}
