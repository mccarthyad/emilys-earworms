// app/api/songs/route.ts
import { NextResponse } from 'next/server';
import { neon, neonConfig } from '@neondatabase/serverless';

// Re-use connections across invocations
neonConfig.fetchConnectionCache = true;

const sql = neon(process.env.DATABASE_URL!);

// optional: tighten CORS origin to your frontend domain
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function ensureTable() {
  await sql/*sql*/`
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
      "timestamp" TIMESTAMPTZ,
      date_added TIMESTAMPTZ DEFAULT NOW()
    );
  `;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await sql/*sql*/`SELECT * FROM songs ORDER BY date_added DESC`;
    return NextResponse.json(rows, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const song = await req.json();

    await sql/*sql*/`
      INSERT INTO songs (
        id, title, artist, year, duration, genre, genres,
        album_art, popularity, spotify_id, artist_id, "timestamp"
      )
      VALUES (
        ${song.id}, ${song.title}, ${song.artist}, ${song.year},
        ${song.duration}, ${song.genre}, ${JSON.stringify(song.genres || [])}::jsonb,
        ${song.albumArt || ''}, ${song.popularity ?? 0}, ${song.spotifyId || ''},
        ${song.artistId || ''}, ${song.timestamp ? new Date(song.timestamp).toISOString() : null}
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    return NextResponse.json({ success: true }, { status: 201, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(req: Request) {
  try {
    await ensureTable();
    const { id } = await req.json();
    await sql/*sql*/`DELETE FROM songs WHERE id = ${id}`;
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }
}
