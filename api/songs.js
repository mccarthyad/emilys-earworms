import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS songs (
        id BIGINT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        year INTEGER,
        duration INTEGER,
        genre TEXT,
        genres JSONB,
        album_art TEXT,
        popularity INTEGER,
        spotify_id TEXT,
        artist_id TEXT,
        timestamp TIMESTAMP,
        date_added TIMESTAMP DEFAULT NOW()
      )
    `;

    if (req.method === 'GET') {
      const { rows } = await sql`SELECT * FROM songs ORDER BY date_added DESC`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const song = req.body;
      await sql`
        INSERT INTO songs (
          id, title, artist, year, duration, genre, genres, 
          album_art, popularity, spotify_id, artist_id, timestamp
        ) VALUES (
          ${song.id}, ${song.title}, ${song.artist}, ${song.year}, 
          ${song.duration}, ${song.genre}, ${JSON.stringify(song.genres || [])},
          ${song.albumArt || ''}, ${song.popularity || 0}, ${song.spotifyId || ''}, 
          ${song.artistId || ''}, ${song.timestamp}
        )
      `;
      return res.status(201).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await sql`DELETE FROM songs WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: error.message });
  }
}