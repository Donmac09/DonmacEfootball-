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
        const data = Array.isArray(r.data) ? r.data : [];
        setAnnouncements(data);
        
        // Structured console logging for debugging
        if (data.length > 0) {
          console.groupCollapsed('📢 [Announcements] Loaded successfully');
          console.log('📊 Count:', data.length);
          console.log('📋 Latest:', data[0]?.message?.substring(0, 50) + '...');
          console.groupEnd();
        }
      } catch (err) {
        console.groupCollapsed('❌ [Announcements] Error loading');
        console.error('Error:', err);
        console.groupEnd();
      }
    };
    loadAnnouncements();
  }, []);

  // Don't show if no announcements or user dismissed
  if (announcements.length === 0 || dismissed) return null;

  return (
    <div className="announcement-banner">
      <div className="announcement-icon">📢</div>
      
      <div className="announcement-content">
        <div className="announcement-label">📣 Announcement</div>
        <div className="announcement-message">
          {announcements[0]?.message}
        </div>
        {announcements.length > 1 && (
          <div className="announcement-count">
            +{announcements.length - 1} more announcement{announcements.length > 2 ? 's' : ''}
          </div>
        )}
      </div>

      <button
        className="announcement-close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
      >
        ✕
      </button>
    </div>
  );
}
