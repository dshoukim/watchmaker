import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signInWithGoogle as supabaseSignIn, signOut as supabaseSignOut } from '@/lib/supabase';
import type { PublicUser as PublicUserType } from "@shared/schema";

interface AuthContextType {
  user: PublicUserType | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<PublicUserType | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const response = await fetch(`/api/auth/user/${session.user.id}`);
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          return userData;
        } else if (response.status === 404) {
          // User doesn't exist in database - create them (first-time sign-in)
          console.log('[AUTH] Creating new user profile...');
          
          const newUserData = {
            supabase_id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Unknown User',
            avatar: session.user.user_metadata?.avatar_url || null,
            preferences: {}
          };

          const createResponse = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newUserData),
          });

          if (createResponse.ok) {
            const createdUser = await createResponse.json();
            setUser(createdUser);
            return createdUser;
          } else {
            console.error('[AUTH] Failed to create user:', await createResponse.text());
            setUser(null);
            return null;
          }
        } else {
          console.error('[AUTH] Error fetching user:', response.status);
          setUser(null);
          return null;
        }
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('[AUTH] Error in refreshUser:', error);
      setUser(null);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await supabaseSignIn();
    } catch (error) {
      console.error('[AUTH] Error in signInWithGoogle:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabaseSignOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('[AUTH] Starting auth initialization...');
        
        // Check if we're in an OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const hasOAuthParams = hashParams.has('access_token') || hashParams.has('error') || urlParams.has('code');
        
        if (hasOAuthParams) {
          console.log('[AUTH] OAuth callback detected - manually processing...');
          
          // Give Supabase a moment to process the OAuth callback
          setTimeout(async () => {
            try {
              console.log('[AUTH] Attempting to refresh user after OAuth...');
              await refreshUser();
              console.log('[AUTH] OAuth user refresh completed');
              
              // Clean up the URL
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              console.error('[AUTH] Error processing OAuth callback:', error);
            }
          }, 1000);
        }
        
        console.log('[AUTH] Skipping getSession call, relying on auth state change listener');
        
        if (mounted) {
          console.log('[AUTH] Setting loading to false - auth state listener will handle session');
          setLoading(false);
        }
      } catch (error) {
        console.error('[AUTH] Error in auth initialization:', error);
        if (mounted) {
          console.log('[AUTH] Setting loading to false due to error');
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('[AUTH] Auth state change:', event, 'HasUser:', !!session?.user);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AUTH] SIGNED_IN event - calling refreshUser...');
        await refreshUser();
        console.log('[AUTH] SIGNED_IN refreshUser completed');
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('[AUTH] SIGNED_OUT event');
        setUser(null);
        setLoading(false);
      }
    });

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
