import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sb, sessionStore } from '../services/supabase';
import { getProfile, signOut as authSignOut, signIn, signUp } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid) => {
    const p = await getProfile(uid);
    setProfile(p);
    return p;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);

    sb.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        sessionStore.session = session;
        setUser(session.user);
        const prof = await getProfile(session.user.id);
        setProfile(prof);
      }
      setLoading(false);
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        sessionStore.session = session;
        setUser(session.user);
        const prof = await getProfile(session.user.id);
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
