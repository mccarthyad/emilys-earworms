import React, { useState, useEffect } from 'react';
import { Music, Cloud, Clock, TrendingUp, PieChart, BarChart3, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const GENRE_COLORS = {
  'Pop': '#f6be00',
  'Rock': '#fb5607',
  'Hip Hop': '#8338ec',
  'R&B': '#ff006e',
  'Country': '#80ed99',
  'Electronic': '#00bbf9',
  'Dance': '#3a86ff',
  'Indie': '#ff9f1c',
  'Alternative': '#4361ee',
  'Jazz': '#b5179e',
  'Classical': '#2ec4b6',
  'Metal': '#6c757d',
  'Punk': '#e63946',
  'Folk': '#52b788',
  'Soul': '#f15bb5',
  'Reggae': '#06d6a0',
  'Blues': '#118ab2',
  'Latin': '#ef476f',
  'K-Pop': '#ff4d6d',
  'Other': '#6b7280',
  'Unknown': '#9ca3af'
};

const PIE_SLICE_COLORS = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ab',
  '#7f3c8d', '#11a579', '#3969ac', '#f2b701', '#e73f74',
  '#80ba5a', '#e68310', '#008695', '#cf1c90', '#f97b72'
];

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 'Dance', 
  'Indie', 'Alternative', 'Jazz', 'Classical', 'Metal', 'Punk', 
  'Folk', 'Soul', 'Reggae', 'Blues', 'Latin', 'K-Pop', 'Other'
];

const getGenreColor = (genreName, index = 0) => {
  return GENRE_COLORS[genreName] || PIE_SLICE_COLORS[index % PIE_SLICE_COLORS.length];
};

const capitalizeGenre = (genre) => {
  if (!genre) return 'Unknown';
  return genre
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getTimePeriod = (timestamp) => {
  const hour = new Date(timestamp).getHours();
  return hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
};

const toMonthKey = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

const formatMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

export default function EarwormsApp() {
  const [songs, setSongs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [dateTime, setDateTime] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [isSearching, setIsSearching] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [customGenre, setCustomGenre] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadSongs();
    getSpotifyToken();
  }, []);

  const getSpotifyToken = async () => {
    try {
      const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;

      console.log('[Spotify] client ID present:', !!clientId, '| secret present:', !!clientSecret);

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        },
        body: 'grant_type=client_credentials'
      });

      const data = await response.json();
      console.log('[Spotify] token response status:', response.status, '| data:', data);
      setSpotifyToken(data.access_token);
    } catch (error) {
      console.error('[Spotify] Error getting token:', error);
    }
  };

  useEffect(() => {
    const searchSongs = async () => {
      if (searchQuery.length > 2 && spotifyToken) {
        setIsSearching(true);
        try {
          const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
            {
              headers: {
                'Authorization': `Bearer ${spotifyToken}`
              }
            }
          );
          const data = await response.json();
          
          const songsWithArtistData = await Promise.all(
            data.tracks.items.map(async (track) => {
              const releaseYear = new Date(track.album.release_date).getFullYear();
              const durationSeconds = Math.round(track.duration_ms / 1000);
              const artistName = track.artists[0].name;
              const artistId = track.artists[0].id;
              
              let genres = ['Unknown'];
              try {
                const artistResponse = await fetch(
                  `https://api.spotify.com/v1/artists/${artistId}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${spotifyToken}`
                    }
                  }
                );
                const artistData = await artistResponse.json();
                if (artistData.genres && artistData.genres.length > 0) {
                  genres = artistData.genres.map(g => capitalizeGenre(g));
                }
              } catch (error) {
                console.error('Error fetching artist:', error);
              }
              
              return {
                title: track.name,
                artist: artistName,
                year: releaseYear,
                duration: durationSeconds,
                genre: capitalizeGenre(genres[0]) || 'Unknown',
                genres: genres,
                albumArt: track.album.images[0]?.url,
                popularity: track.popularity,
                spotifyId: track.id,
                artistId: artistId
              };
            })
          );
          
          setFilteredSongs(songsWithArtistData);
        } catch (error) {
          console.error('Error searching Spotify:', error);
          setFilteredSongs([]);
        }
        setIsSearching(false);
      } else {
        setFilteredSongs([]);
      }
    };

    const timeoutId = setTimeout(searchSongs, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, spotifyToken]);

  const loadSongs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/songs');
      if (response.ok) {
        const data = await response.json();
        const formattedSongs = data.map(song => ({
          id: Number(song.id),
          title: song.title,
          artist: song.artist,
          year: song.year,
          duration: song.duration,
          genre: song.genre,
          genres: song.genres,
          albumArt: song.album_art,
          popularity: song.popularity,
          spotifyId: song.spotify_id,
          artistId: song.artist_id,
          timestamp: song.timestamp,
          dateAdded: song.date_added
        }));
        setSongs(formattedSongs);
      }
    } catch (error) {
      console.error('Error loading songs:', error);
    }
    setIsLoading(false);
  };

  const saveSong = async (song) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(song)
      });
      
      if (response.ok) {
        await loadSongs();
      }
    } catch (error) {
      console.error('Error saving song:', error);
    }
    setIsSyncing(false);
  };

  const addSong = async () => {
    if (!selectedSong) return;

    const finalGenre = (selectedSong.genre === 'Unknown' && customGenre) 
      ? customGenre 
      : selectedSong.genre;

    const newEntry = {
      id: Date.now(),
      ...selectedSong,
      genre: finalGenre,
      timestamp: dateTime || new Date().toISOString(),
      dateAdded: new Date().toISOString()
    };

    await saveSong(newEntry);
    
    setShowForm(false);
    setSearchQuery('');
    setSelectedSong(null);
    setDateTime('');
    setCustomGenre('');
    setActiveView('dashboard');
  };

  const deleteSong = async (id) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/songs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id })
      });
      
      if (response.ok) {
        await loadSongs();
      }
    } catch (error) {
      console.error('Error deleting song:', error);
    }
    setIsSyncing(false);
  };

  const setNow = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    setDateTime(localDate.toISOString().slice(0, 16));
  };

  const genreData = songs.reduce((acc, song) => {
    acc[song.genre] = (acc[song.genre] || 0) + 1;
    return acc;
  }, {});

  const sortedGenreEntries = Object.entries(genreData).sort(([, a], [, b]) => b - a);
  const MAX_GENRE_SLICES = 7;
  const visibleGenreEntries = sortedGenreEntries.slice(0, MAX_GENRE_SLICES);
  const hiddenGenreTotal = sortedGenreEntries
    .slice(MAX_GENRE_SLICES)
    .reduce((sum, [, value]) => sum + value, 0);

  const genreChartData = [
    ...visibleGenreEntries.map(([name, value]) => ({ name, value })),
    ...(hiddenGenreTotal > 0 ? [{ name: 'Other', value: hiddenGenreTotal }] : [])
  ];

  const timeOfDayData = songs.reduce((acc, song) => {
    const period = getTimePeriod(song.timestamp);
    acc[period] = (acc[period] || 0) + 1;
    return acc;
  }, {});

  const timeChartData = ['Morning', 'Afternoon', 'Evening', 'Night'].map(period => ({
    period,
    count: timeOfDayData[period] || 0
  }));

  const artistFrequency = songs.reduce((acc, song) => {
    acc[song.artist] = (acc[song.artist] || 0) + 1;
    return acc;
  }, {});

  const topArtistsData = Object.entries(artistFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([artist, count]) => ({ artist, count }));

  const decadeData = songs.reduce((acc, song) => {
    const decade = Math.floor(song.year / 10) * 10;
    acc[decade] = (acc[decade] || 0) + 1;
    return acc;
  }, {});

  const decadeChartData = Object.entries(decadeData)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([decade, count]) => ({ decade: `${decade}s`, count }));

  const periodOrder = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const moodClockBuckets = songs.reduce((acc, song) => {
    const period = getTimePeriod(song.timestamp);
    const genre = song.genre || 'Unknown';
    if (!acc[period]) acc[period] = {};
    acc[period][genre] = (acc[period][genre] || 0) + 1;
    return acc;
  }, {});

  const moodClockData = periodOrder.map((period) => {
    const entries = Object.entries(moodClockBuckets[period] || {}).sort(([, a], [, b]) => b - a);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    if (entries.length === 0) {
      return { period, topGenre: 'No data', topCount: 0, topShare: 0 };
    }
    const [topGenre, topCount] = entries[0];
    return {
      period,
      topGenre,
      topCount,
      topShare: total > 0 ? Math.round((topCount / total) * 100) : 0
    };
  });

  const nostalgiaGaps = songs
    .map((song) => {
      const stuckYear = new Date(song.timestamp).getFullYear();
      if (!song.year || Number.isNaN(stuckYear)) return null;
      return stuckYear - song.year;
    })
    .filter((gap) => Number.isFinite(gap));
  const nostalgiaScore = nostalgiaGaps.length > 0
    ? Math.round((nostalgiaGaps.reduce((sum, gap) => sum + gap, 0) / nostalgiaGaps.length) * 10) / 10
    : 0;
  const hasNostalgiaData = nostalgiaGaps.length > 0;
  const nostalgiaLabel = hasNostalgiaData
    ? (nostalgiaScore >= 10 ? 'Deep cuts era' : nostalgiaScore >= 4 ? 'Throwback blend' : 'Mostly fresh tracks')
    : 'Not enough data yet';

  const songsByTimestamp = songs.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const seenArtists = new Set();
  const discoveryByMonth = songsByTimestamp.reduce((acc, song) => {
    const month = toMonthKey(song.timestamp);
    if (!month) return acc;

    if (!acc[month]) {
      acc[month] = { month, discovery: 0, comfort: 0 };
    }

    const artistName = song.artist || 'Unknown Artist';
    if (seenArtists.has(artistName)) {
      acc[month].comfort += 1;
    } else {
      acc[month].discovery += 1;
      seenArtists.add(artistName);
    }

    return acc;
  }, {});

  const discoveryComfortData = Object.values(discoveryByMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      ...row,
      label: formatMonthLabel(row.month)
    }));

  const popularityByMonth = songs.reduce((acc, song) => {
    const month = toMonthKey(song.timestamp);
    const popularity = Number(song.popularity);
    if (!month || !Number.isFinite(popularity) || popularity <= 0) return acc;

    if (!acc[month]) {
      acc[month] = { month, total: 0, count: 0 };
    }

    acc[month].total += popularity;
    acc[month].count += 1;
    return acc;
  }, {});

  const popularityDriftData = Object.values(popularityByMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      month: row.month,
      label: formatMonthLabel(row.month),
      popularity: Math.round((row.total / row.count) * 10) / 10
    }));

  const insightWindow = 8;
  const discoveryComfortWindow = discoveryComfortData.slice(-insightWindow);
  const popularityDriftWindow = popularityDriftData.slice(-insightWindow);

  const avgDuration = songs.length > 0 ? Math.round(songs.reduce((sum, s) => sum + s.duration, 0) / songs.length) : 0;
  const avgYear = songs.length > 0 ? Math.round(songs.reduce((sum, s) => sum + s.year, 0) / songs.length) : 0;
  const avgPopularity = songs.length > 0 ? Math.round(songs.reduce((sum, s) => sum + (s.popularity || 0), 0) / songs.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="bg-gray-800 shadow-lg sticky top-0 z-50 border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-xl">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Emily's Earworms
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-400">Songs stuck in her head</p>
                  {isSyncing && (
                    <div className="flex items-center gap-1 text-xs text-purple-400">
                      <Cloud className="w-3 h-3 animate-pulse" />
                      <span>Syncing...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Add Song
            </button>
          </div>
          
          <div className="flex gap-2 mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
                activeView === 'dashboard'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
                activeView === 'history'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              History
            </button>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in border border-gray-700">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-white">Add Earworm</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search Song
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by song or artist... (min 3 characters)"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
                />
                
                {isSearching && (
                  <div className="mt-2 text-center text-sm text-gray-400">
                    Searching Spotify...
                  </div>
                )}
                
                {!spotifyToken && searchQuery.length > 2 && (
                  <div className="mt-2 text-center text-sm text-amber-400">
                    Connecting to Spotify...
                  </div>
                )}
                
                {filteredSongs.length > 0 && (
                  <div className="mt-2 border border-gray-600 rounded-lg max-h-64 overflow-y-auto bg-gray-700">
                    {filteredSongs.map((song, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedSong(song);
                          setSearchQuery(`${song.title} - ${song.artist}`);
                          setFilteredSongs([]);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0 flex items-center gap-3"
                      >
                        {song.albumArt && (
                          <img src={song.albumArt} alt="" className="w-12 h-12 rounded" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-white">{song.title}</div>
                          <div className="text-sm text-gray-400">{song.artist} • {song.year}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSong && (
                <div className="mb-4 p-4 bg-purple-900 bg-opacity-50 rounded-lg border border-purple-700">
                  <div className="flex items-center gap-3 mb-2">
                    {selectedSong.albumArt && (
                      <img src={selectedSong.albumArt} alt="" className="w-16 h-16 rounded" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm text-gray-400 mb-1">Selected Song:</div>
                      <div className="font-semibold text-white">{selectedSong.title}</div>
                      <div className="text-sm text-gray-300">{selectedSong.artist}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {selectedSong.genre} • {selectedSong.year} • {Math.floor(selectedSong.duration / 60)}:{(selectedSong.duration % 60).toString().padStart(2, '0')}
                  </div>
                  
                  {selectedSong.genre === 'Unknown' && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Genre not found - please select one:
                      </label>
                      <select
                        value={customGenre}
                        onChange={(e) => setCustomGenre(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select a genre...</option>
                        {GENRE_OPTIONS.map(genre => (
                          <option key={genre} value={genre}>{genre}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  When did it get stuck?
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={setNow}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
                  >
                    Now
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setSearchQuery('');
                    setSelectedSong(null);
                    setDateTime('');
                    setCustomGenre('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addSong}
                  disabled={!selectedSong || (selectedSong.genre === 'Unknown' && !customGenre)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Add Earworm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Cloud className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-400">Loading from cloud...</p>
            </div>
          </div>
        ) : (
          <>
            {activeView === 'dashboard' && (
              <div className="space-y-6">
                {songs.length === 0 ? (
                  <div className="bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-gray-700">
                    <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No earworms yet!</h3>
                    <p className="text-gray-500">Start tracking songs</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-gray-800 rounded-xl shadow-lg p-4 transform hover:scale-105 transition-transform duration-300 border border-gray-700">
                        <div className="text-3xl font-bold text-purple-400">{songs.length}</div>
                        <div className="text-sm text-gray-400">Total Songs</div>
                      </div>
                      <div className="bg-gray-800 rounded-xl shadow-lg p-4 transform hover:scale-105 transition-transform duration-300 border border-gray-700">
                        <div className="text-3xl font-bold text-pink-400">{avgYear}</div>
                        <div className="text-sm text-gray-400">Avg Year</div>
                      </div>
                      <div className="bg-gray-800 rounded-xl shadow-lg p-4 transform hover:scale-105 transition-transform duration-300 border border-gray-700">
                        <div className="text-3xl font-bold text-blue-400">{Math.floor(avgDuration / 60)}:{(avgDuration % 60).toString().padStart(2, '0')}</div>
                        <div className="text-sm text-gray-400">Avg Length</div>
                      </div>
                      <div className="bg-gray-800 rounded-xl shadow-lg p-4 transform hover:scale-105 transition-transform duration-300 border border-gray-700">
                        <div className="text-3xl font-bold text-indigo-400">{Object.keys(genreData).length}</div>
                        <div className="text-sm text-gray-400">Genres</div>
                      </div>
                      <div className="bg-gray-800 rounded-xl shadow-lg p-4 transform hover:scale-105 transition-transform duration-300 border border-gray-700">
                        <div className="text-3xl font-bold text-amber-400">{avgPopularity}</div>
                        <div className="text-sm text-gray-400">Avg Popularity</div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <PieChart className="w-5 h-5 text-purple-400" />
                          Genre Distribution
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsPie>
                            <Pie
                              data={genreChartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={false}
                              innerRadius={45}
                              outerRadius={85}
                              paddingAngle={2}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {genreChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getGenreColor(entry.name, index)} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                              formatter={(value, name) => {
                                const percent = songs.length > 0 ? ((value / songs.length) * 100).toFixed(0) : 0;
                                return [`${value} songs (${percent}%)`, name];
                              }}
                            />
                          </RechartsPie>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          {genreChartData.map((entry, index) => {
                            const percent = songs.length > 0 ? Math.round((entry.value / songs.length) * 100) : 0;
                            return (
                              <div key={entry.name} className="flex items-center justify-between gap-3 text-gray-300">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: getGenreColor(entry.name, index) }}
                                  />
                                  <span className="truncate">{entry.name}</span>
                                </div>
                                <span className="text-gray-400 shrink-0">{percent}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <TrendingUp className="w-5 h-5 text-pink-400" />
                          Top Artists
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={topArtistsData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                              type="number"
                              stroke="#9ca3af"
                              allowDecimals={false}
                              tickFormatter={(value) => Math.round(value)}
                            />
                            <YAxis dataKey="artist" type="category" width={100} stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Bar dataKey="count" fill="#ec4899" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <Clock className="w-5 h-5 text-blue-400" />
                          Time of Day
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={timeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="period" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <BarChart3 className="w-5 h-5 text-indigo-400" />
                          By Decade
                        </h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={decadeChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="decade" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                            <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <Clock className="w-5 h-5 text-cyan-400" />
                          Mood Clock
                        </h3>
                        <div className="space-y-3">
                          {moodClockData.map((row) => (
                            <div key={row.period} className="flex items-center justify-between bg-gray-900 bg-opacity-60 rounded-lg px-3 py-2 border border-gray-700">
                              <div className="min-w-0">
                                <div className="text-xs text-gray-400">{row.period}</div>
                                <div className="text-sm text-white truncate">{row.topGenre}</div>
                              </div>
                              <div className="text-right shrink-0 pl-2">
                                <div className="text-sm font-semibold text-cyan-300">{row.topShare}%</div>
                                <div className="text-xs text-gray-500">{row.topCount} songs</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-4">Most common genre in each part of the day.</p>
                      </div>

                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <Music className="w-5 h-5 text-amber-400" />
                          Nostalgia Score
                        </h3>
                        <div className="text-4xl font-bold text-amber-300 mb-1">
                          {hasNostalgiaData ? `${nostalgiaScore}y` : '--'}
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{nostalgiaLabel}</p>
                        <p className="text-xs text-gray-400">
                          Average age of your earworms when they got stuck in your head.
                        </p>
                      </div>

                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <TrendingUp className="w-5 h-5 text-green-400" />
                          Discovery vs Comfort
                        </h3>
                        {discoveryComfortWindow.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={discoveryComfortWindow}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="label" stroke="#9ca3af" minTickGap={18} />
                              <YAxis stroke="#9ca3af" allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                formatter={(value, name) => [`${value} songs`, name === 'discovery' ? 'Discovery' : 'Comfort']}
                              />
                              <Legend />
                              <Bar dataKey="discovery" name="Discovery" stackId="artists" fill="#22c55e" radius={[6, 6, 0, 0]} />
                              <Bar dataKey="comfort" name="Comfort" stackId="artists" fill="#a855f7" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
                            Add more songs to unlock this trend.
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                          <BarChart3 className="w-5 h-5 text-amber-400" />
                          Popularity Drift
                        </h3>
                        {popularityDriftWindow.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={popularityDriftWindow}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="label" stroke="#9ca3af" minTickGap={18} />
                              <YAxis stroke="#9ca3af" domain={[0, 100]} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                                formatter={(value) => [`${value}`, 'Avg Popularity']}
                              />
                              <Line
                                type="monotone"
                                dataKey="popularity"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                dot={{ r: 3, fill: '#f59e0b' }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
                            Add songs with popularity data to unlock this trend.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeView === 'history' && (
              <div className="space-y-3">
                {songs.length === 0 ? (
                  <div className="bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-gray-700">
                    <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">No history yet!</h3>
                    <p className="text-gray-500">Songs you add will appear here</p>
                  </div>
                ) : (
                  songs.slice().reverse().map((song) => (
                    <div
                      key={song.id}
                      className="bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-all duration-300 border border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{song.title}</h4>
                          <p className="text-sm text-gray-400">{song.artist}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 bg-purple-900 text-purple-300 rounded-full text-xs border border-purple-700">
                              {song.genre}
                            </span>
                            <span className="px-2 py-1 bg-pink-900 text-pink-300 rounded-full text-xs border border-pink-700">
                              {song.year}
                            </span>
                            <span className="px-2 py-1 bg-blue-900 text-blue-300 rounded-full text-xs border border-blue-700">
                              {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(song.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteSong(song.id)}
                          className="text-red-400 hover:bg-red-900 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
