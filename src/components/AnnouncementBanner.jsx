// src/components/AnnouncementBanner.jsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/supabase';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const r = await apiFetch('GET', 'announcements?select=*&order=created_at.desc&limit=5');
        const data = Array.isArray(r.data) ? r.data : [];
        setAnnouncements(data);
        
        if (data.length > 0) {
          console.groupCollapsed('📢 [Announcements] Loaded successfully');
          console.log('📊 Count:', data.length);
          console.log('📋 Latest:', data[0]?.message?.substring(0, 50) + '...');
          console.groupEnd();
        }
      } catch (err) {
        console.error('Error loading announcements:', err);
      }
    };
    loadAnnouncements();
  }, []);

  // Don't show if no announcements or user dismissed
  if (announcements.length === 0 || dismissed) return null;

  // Get the latest announcement only
  const latest = announcements[0];

  return (
    <div className="announcement-banner">
      <div className="announcement-icon">📢</div>
      
      <div className="announcement-content">
        <div className="announcement-label">📣 Announcement</div>
        <div className="announcement-message">
          {latest.message.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {line}
              {index < latest.message.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
        <div className="announcement-date">
          {new Date(latest.created_at).toLocaleDateString()} at {new Date(latest.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
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
