import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signOut: () => {}
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: If auth takes more than 10 seconds, force loading to false
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth: Safety timeout reached. Forcing loading=false');
        setLoading(false);
      }
    }, 10000);

    // Check active sessions and sets the user
    console.log('Auth: Checking session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth: Session response:', session ? 'User logged in' : 'No session');
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error('Auth: Session error:', err);
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    console.log('Auth: Setting up auth listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: onAuthStateChange event:', event);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    console.log('Auth: Fetching profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Auth: Profile fetch error:', error);
        throw error;
      }
      console.log('Auth: Profile data:', data);
      setProfile(data);
    } catch (error) {
      console.error('Auth: Error fetching profile:', error.message);
    } finally {
      console.log('Auth: Loading finished');
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
