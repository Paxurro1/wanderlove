import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const loadingRef = useRef(true);
  const sessionHandledRef = useRef(false); // Prevents double fetchProfile

  const setLoadingState = (val) => {
    loadingRef.current = val;
    setLoading(val);
  };

  useEffect(() => {
    // Detectamos sincrónicamente si la URL contiene el hash de recuperación
    // ANTES de que Supabase procese y limpie el hash.
    const isRecovery = window.location.hash.includes('type=recovery');

    // Safety timeout: If auth takes more than 10 seconds, force loading to false
    const timeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn('Auth: Safety timeout reached. Forcing loading=false');
        setLoadingState(false);
      }
    }, 5000);

    // Check active sessions and sets the user
    console.log('Auth: Checking session...');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth: Session response:', session ? 'User logged in' : 'No session');
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (isRecovery && currentUser) {
        // Redirigimos manualmente porque ya tenemos la sesión válida
        window.location.href = '/reset-password';
        return;
      }

      if (currentUser) {
        sessionHandledRef.current = true;
        fetchProfile(currentUser.id);
      } else {
        setLoadingState(false);
      }
    }).catch(err => {
      console.error('Auth: Session error:', err);
      setLoadingState(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    console.log('Auth: Setting up auth listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth: onAuthStateChange event:', event);
      
      if (event === 'PASSWORD_RECOVERY' || isRecovery) {
        if (window.location.pathname !== '/reset-password') {
          window.location.href = '/reset-password';
        }
        return;
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        // Only fetch profile if getSession didn't already handle it
        if (!sessionHandledRef.current) {
          await fetchProfile(currentUser.id);
        }
        sessionHandledRef.current = false; // reset for future events
      } else {
        setProfile(null);
        setLoadingState(false);
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
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (error) {
        console.error('Auth: Profile fetch error:', error);
        throw error;
      }
      console.log('Auth: Profile data:', data);
      setProfile(data);
    } catch (error) {
      console.error('Auth: Error fetching profile:', error.message);
      // Don't crash - just proceed without profile
    } finally {
      console.log('Auth: Loading finished');
      setLoadingState(false);
    }
  };

  const signOut = () => {
    console.log('Auth: signOut called (fire-and-forget)');
    // Clear state immediately without waiting for Supabase (fixes Chrome hanging)
    setUser(null);
    setProfile(null);
    // Also manually clear Supabase tokens from localStorage
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
      keys.forEach(k => localStorage.removeItem(k));
      console.log('Auth: localStorage cleared');
    } catch (e) {
      console.warn('Auth: could not clear localStorage', e);
    }
    // Tell Supabase to sign out in the background (don't await)
    supabase.auth.signOut().then(() => {
      console.log('Auth: Supabase signOut confirmed');
    }).catch(e => {
      console.warn('Auth: Supabase signOut failed (ok, state already cleared)', e);
    });
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
