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
  // Use the correct Replit domain for redirect
  const redirectUrl = 'https://4b71de30-8a27-4379-b480-289c67f4f12e-00-2j3mbafqorhvs.riker.replit.dev';
  
  console.log('Starting Google sign-in with redirect URL:', redirectUrl);
  console.log('Current window location:', window.location.href);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    }
  });

  if (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }

  console.log('OAuth response data:', data);
  return data;
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
