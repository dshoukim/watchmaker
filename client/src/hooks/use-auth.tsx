import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signInWithGoogle as supabaseSignIn, signOut as supabaseSignOut } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      await supabaseSignIn();
    } catch (error) {
      console.error('Error signing in:', error);
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
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          // Try to get existing user
          const response = await fetch(`/api/auth/user/${session.user.id}`);
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else if (response.status === 404) {
            // Create new user
            const newUserResponse = await apiRequest('POST', '/api/auth/signup', {
              supabaseId: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              avatar: session.user.user_metadata?.avatar_url,
              preferences: null
            });
            
            const newUser = await newUserResponse.json();
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error setting up user:', error);
        }
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          // Try to get existing user
          const response = await fetch(`/api/auth/user/${session.user.id}`);
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else if (response.status === 404) {
            // Create new user
            const newUserResponse = await apiRequest('POST', '/api/auth/signup', {
              supabaseId: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              avatar: session.user.user_metadata?.avatar_url,
              preferences: null
            });
            
            const newUser = await newUserResponse.json();
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error setting up user:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
