# Donmac eFootball Platform

A full-featured eFootball competition management platform.

## Quick Start

```bash
npm install
npm start        # Dev server at http://localhost:3000
npm run build    # Production build
```

## Project Structure

```
src/
├── services/
│   ├── supabase.js     # Supabase client + apiFetch helper
│   └── auth.js         # signIn, signUp, signOut, getProfile
├── context/
│   └── AuthContext.jsx # Global auth state provider
├── components/
│   └── Navbar.jsx      # Sticky navbar + notifications
├── pages/
│   ├── AuthPage.jsx    # Sign in / Sign up
│   ├── HomePage.jsx    # Dashboard with stats
│   ├── LeaguesPage.jsx # Standings, fixtures, zones
│   ├── EuropeanPage.jsx # CL / EL / Conference League
│   ├── CupsPage.jsx    # Knockout cups
│   ├── MatchSearchPage.jsx # Matchmaking queue
│   ├── ChatPage.jsx    # Direct messaging
│   ├── MyTeamPage.jsx  # Team management + result submission
│   ├── AdminPage.jsx   # Full admin panel
│   └── ProfilePage.jsx # Profile editing
├── App.jsx             # Page router
├── index.js            # Entry point
└── index.css           # Global eFootball styles
```

## Features
- Sign up / Sign in with Supabase Auth
- League standings with promotion/relegation zones
- European competitions (CL, EL, Conference)
- Cup competitions with knockout draws
- Random matchmaking queue
- Direct messaging between players
- Screenshot evidence for result submission
- Full admin panel: fixtures, results review, points, relegation, user management
