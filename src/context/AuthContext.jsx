import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sb, sessionStore } from '../services/supabase';
import { getProfile, signOut as authSignOut } from '../services/auth';

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

  // ── Create user profile in users table ──────────────────────────────
  const createUserProfile = useCallback(async (userId, email, username) => {
    try {
      const { data, error } = await sb
        .from('users')
        .insert([
          {
            id: userId,
            email: email,
            username: username || email?.split('@')[0] || 'User',
            role: 'player',
            is_blocked: false,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('Error creating user profile:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);

    sb.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout);
      if (session?.user) {
        sessionStore.session = session;
        setUser(session.user);
        
        // Try to load profile, if not exists, create it
        let prof = await getProfile(session.user.id);
        if (!prof) {
          prof = await createUserProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.username || session.user.email?.split('@')[0]
          );
        }
        setProfile(prof);
      }
      setLoading(false);
    }).catch(() => { clearTimeout(timeout); setLoading(false); });

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        sessionStore.session = session;
        setUser(session.user);
        
        let prof = await getProfile(session.user.id);
        if (!prof) {
          prof = await createUserProfile(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.username || session.user.email?.split('@')[0]
          );
        }
        setProfile(prof);
      } else {
        sessionStore.session = null;
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, createUserProfile]);

  async function handleSignIn(userData, profileData) {
    setUser(userData);
    setProfile(profileData || await getProfile(userData.id));
  }

  async function handleSignOut() {
    await authSignOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, handleSignIn, handleSignOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
