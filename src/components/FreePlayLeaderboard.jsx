import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sb, sessionStore, apiFetch, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function FreePlayLeaderboard() {
  const [data, setData] = useState([]);
  useEffect(() => {
    sb.from('free_play_leaderboard').select('*,users(username)').order('points', { ascending: false }).limit(10).then(({ data }) => setData(data || []));
  }, []);
  return React.createElement('div', { className: 'table-wrap' },
    React.createElement('table', null,
      React.createElement('thead', null, React.createElement('tr', null, ['#', 'Player', 'W', 'D', 'L', 'Pts'].map(h => React.createElement('th', { key: h }, h)))),
      React.createElement('tbody', null,
        data.length === 0 ? React.createElement('tr', null, React.createElement('td', { colSpan: 6, style: { textAlign: 'center', color: 'let(--muted)' } }, 'No data yet.'))
        : data.map((r, i) => React.createElement('tr', { key: r.id },
            React.createElement('td', { className: 'pos' }, i + 1),
            React.createElement('td', { className: 'team-name' }, r.users?.username || 'Player'),
            React.createElement('td', null, r.wins || 0),
            React.createElement('td', null, r.draws || 0),
            React.createElement('td', null, r.losses || 0),
            React.createElement('td', { className: 'pts' }, r.points || 0)
          ))
      )
    )
  );
}
