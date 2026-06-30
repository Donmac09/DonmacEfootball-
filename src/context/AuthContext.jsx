import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sb, sessionStore } from '../services/supabase';
import { getProfile, signOut as authSignOut, signIn, signUp } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null);
      return null;
    }
    try {
      const p = await getProfile(uid);
      console.log('Profile loaded:', p); // Debug log
      setProfile(p);
      return p;
    } catch (e) {
      console.error('loadProfile error:', e);
      setProfile(null);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await getProfile(user.id);
      console.log('Refreshed profile:', p); // Debug log
      setProfile(p);
      return p;
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);

    sb.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        sessionStore.session = session;
        setUser(session.user);
        const prof = await getProfile(session.user.id);
        console.log('Session profile:', prof); // Debug log
        setProfile(prof);
      }
      setLoading(false);
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        sessionStore.session = session;
        setUser(session.user);
        const prof = await getProfile(session.user.id);
        console.log('Auth state change profile:', prof); // Debug log
        setProfile(prof);
      } else {
        sessionStore.session = null;
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignIn(email, password) {
    try {
      const data = await signIn(email, password);
      if (data?.user) {
        setUser(data.user);
        const prof = await getProfile(data.user.id);
        console.log('Sign in profile:', prof); // Debug log
        setProfile(prof);
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async function handleSignUp(email, password, username, whatsapp) {
    try {
      const data = await signUp(email, password, username, whatsapp);
      if (data?.user) {
        setUser(data.user);
        const prof = await getProfile(data.user.id);
        console.log('Sign up profile:', prof); // Debug log
        setProfile(prof);
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async function handleSignOut() {
    await authSignOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      handleSignIn,
      handleSignUp,
      handleSignOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
