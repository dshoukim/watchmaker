# WatchTogether - Collaborative Movie Recommendation App

A swipe-based movie and TV show recommendation app for couples to find their next watch together.

## Features

- 🔐 Google OAuth authentication via Supabase
- 🎬 TMDB integration for real movie/TV data
- 👥 Room sharing with QR codes
- 📱 Swipe-based voting system
- ⚡ Real-time collaboration via WebSockets
- 🏆 Smart scoring and results

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

**Important:** Do not use the example keys below in production. Set your own values in a `.env` file.

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://qouppyvbepiccepacxne.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdXBweXZiZXBpY2NlcGFjeG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDI1NDIsImV4cCI6MjA2MzUxODU0Mn0.uYvLjL7X4cP8Q3j0W7LWvEwsJTt6-8-34Xb0vkq-79E

# Database (from Supabase)
DATABASE_URL=your_supabase_database_url_here

# TMDB API
TMDB_API_KEY=your-tmdb-api-key
TMDB_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkMjA4YTZjMWMyY2ZkY2ExNWViMDg2NWRiNDRmMzJmMiIsIm5iZiI6MTc0Nzk2MzQyNi4zNzc5OTk4LCJzdWIiOiI2ODJmY2UyMmMyMGFmOTg2ZTZiNmE1ZjciLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.RJrvP8EimCjRbnsK97-hNEqwx28jbB9qZVWe37cP3sM
```

### 3. Google OAuth Setup

1. **Google Cloud Console:**
   - Add `http://localhost:5000` to authorized redirect URIs
   - Add `https://qouppyvbepiccepacxne.supabase.co/auth/v1/callback`

2. **Supabase Dashboard:**
   - Go to Authentication > Providers
   - Enable Google provider
   - Add your Google Client ID and Client Secret

### 4. Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## How to Use

1. **Sign in** with your Google account
2. **Set up your profile** by rating movies/TV shows
3. **Create a room** or **join** with an 8-digit code
4. **Choose** movies or TV shows to browse
5. **Swipe to vote:**
   - Right/Heart: Like (+1)
   - Left/Thumbs down: Dislike (-1)
   - Up/Star: Love it (+2)
   - Down/Eye: Already seen (-2)
6. **See results** ranked by total score!

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Wouter
- **Backend:** Express.js, WebSockets
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth with Google OAuth
- **External API:** TMDB (The Movie Database)
- **UI Components:** shadcn/ui

## Project Structure

```
├── client/src/           # React frontend
├── server/               # Express backend
├── shared/               # Shared TypeScript types
└── components.json       # shadcn/ui config
```

Enjoy finding your next great watch together! 🎬