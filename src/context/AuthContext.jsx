import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sb, sessionStore } from '../services/supabase';
import { getProfile, signOut as authSignOut } from '../services/auth';

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
      setProfile(p);
      return p;
    } catch (e) {
      console.error('loadProfile error:', e);
      setProfile(null);
      return null;
    }
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
        console.log('Session profile:', prof);
      }
      setLoading(false);
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        sessionStore.session = session;
        setUser(session.user);
        const prof = await getProfile(session.user.id);
        setProfile(prof);
        console.log('Auth state change profile:', prof);
      } else {
        sessionStore.session = null;
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
