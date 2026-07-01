import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import LeaguesPage from './pages/LeaguesPage';
import EuropeanPage from './pages/EuropeanPage';
import CupsPage from './pages/CupsPage';
import MatchSearchPage from './pages/MatchSearchPage';
import ChatPage from './pages/ChatPage';
import MyTeamPage from './pages/MyTeamPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: 'linear-gradient(135deg,#ffd200,#00d4ff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.2rem', animation: 'logopulse 2s ease-in-out infinite',
        boxShadow: '0 0 32px rgba(255,210,0,0.5)',
      }}>⚽</div>
      <div style={{
        fontWeight: 900, fontSize: '1.4rem',
        background: 'linear-gradient(90deg,#ffd200,#00d4ff)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>DONMAC eFOOTBALL</div>
      <div className="spinner" />
    </div>
  );
}

function Shell() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [page, setPage] = useState('home');

  // ====== LOCAL STORAGE PERSISTENCE ======
  // Load saved page on mount
  useEffect(() => {
    const savedPage = localStorage.getItem('currentPage');
    if (savedPage) {
      setPage(savedPage);
    }
  }, []);

  // Save page when it changes
  useEffect(() => {
    localStorage.setItem('currentPage', page);
  }, [page]);

  if (loading) return <LoadingScreen />;

  if (!user) return <AuthPage />;

  const pageMap = {
    home:        <HomePage profile={profile} />,
    leagues:     <LeaguesPage />,
    europe:      <EuropeanPage />,
    cups:        <CupsPage />,
    matchmaking: <MatchSearchPage user={user} profile={profile} />,
    chat:        <ChatPage user={user} profile={profile} />,
    team:        <MyTeamPage user={user} profile={profile} />,
    admin:       <AdminPage user={user} profile={profile} />,
    profile:     <ProfilePage user={user} profile={profile} onProfileUpdate={refreshProfile} />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar page={page} setPage={setPage} />
      <main className="main">
        {pageMap[page] ?? <HomePage profile={profile} />}
      </main>
      <footer style={{
        textAlign: 'center', padding: '1rem',
        borderTop: '1px solid rgba(255,210,0,0.1)',
        fontSize: '.75rem', color: 'var(--muted)',
        marginBottom: 0,
      }}>
        ⚽ Donmac eFootball · Results require screenshot evidence · Managed by admins
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
