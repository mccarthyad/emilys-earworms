# Emily's Earworms

A tiny, mildly scientific app for tracking songs stuck in my girlfriend's head.

Instead of asking "wait, is this the third time this week?", we collect receipts: what song, when it got stuck, and what patterns show up over time.

## What It Does

- Search songs from Spotify and pull metadata (artist, year, duration, genre, popularity, album art).
- Log each earworm event with a timestamp.
- Save entries to a Neon Postgres database through serverless API routes.
- Show trend dashboards for:
  - Genre distribution
  - Most frequent artists
  - Time-of-day earworms
  - Songs by decade
- View full history and delete entries when needed.

## Tech Stack

- Frontend: React + Tailwind CSS + Recharts
- Icons: lucide-react
- Backend/API: Vercel serverless functions (`api/songs.js`, `api/health.js`)
- Database: Neon Postgres (`@neondatabase/serverless`)
- Music data source: Spotify Web API (Client Credentials flow)

## Environment Variables

Create a `.env` file in the project root:

```env
REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id
REACT_APP_SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
DATABASE_URL=your_neon_postgres_connection_string
```

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## API Endpoints

- `GET /api/health` -> simple health check
- `GET /api/songs` -> fetch all earworms
- `POST /api/songs` -> add an earworm entry
- `DELETE /api/songs` -> delete an entry by `id`

## Why This Exists

Because love is real, and so is hearing the same chorus 19 times before lunch.

This project turns that experience into charts, trends, and evidence.
