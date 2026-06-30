// src/components/AnnouncementBanner.jsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/supabase';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const r = await apiFetch('GET', 'announcements?select=*&order=created_at.desc&limit=3');
        setAnnouncements(Array.isArray(r.data) ? r.data : []);
        console.log('📢 [Announcement] Loaded announcements:', r.data?.length || 0);
      } catch (err) {
        console.error('❌ [Announcement] Error loading:', err);
      }
    };
    loadAnnouncements();
  }, []);

  if (announcements.length === 0 || dismissed) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: '12px',
      margin: '8px 16px 16px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
      position: 'relative',
      animation: 'slideDown 0.4s ease-out'
    }}>
      <div style={{
        fontSize: '1.8rem',
        animation: 'pulse 2s infinite',
        flexShrink: 0
      }}>📢</div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: '#f0c040',
          fontWeight: 'bold',
          marginBottom: '2px'
        }}>
          📣 Announcement
        </div>
        <div style={{
          fontSize: '0.95rem',
          fontWeight: '500',
          wordBreak: 'break-word',
          lineHeight: '1.4'
        }}>
          {announcements[0]?.message}
        </div>
        {announcements.length > 1 && (
          <div style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.5)',
            marginTop: '4px'
          }}>
            +{announcements.length - 1} more announcement{announcements.length > 2 ? 's' : ''}
          </div>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '4px 10px',
          borderRadius: '6px',
          transition: 'background 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
      >
        ✕
      </button>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
