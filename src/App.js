import React, { useState, useEffect } from 'react';
import { Music, Clock, TrendingUp, PieChart, BarChart3, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

const GENRE_OPTIONS = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Electronic', 'Dance', 
  'Indie', 'Alternative', 'Jazz', 'Classical', 'Metal', 'Punk', 
  'Folk', 'Soul', 'Reggae', 'Blues', 'Latin', 'K-Pop', 'Other'
];

const ARTISTS = [
  { name: 'Taylor Swift', sex: 'Female', birthYear: 1989 },
  { name: 'The Weeknd', sex: 'Male', birthYear: 1990 },
  { name: 'Billie Eilish', sex: 'Female', birthYear: 2001 },
  { name: 'Ed Sheeran', sex: 'Male', birthYear: 1991 },
  { name: 'Ariana Grande', sex: 'Female', birthYear: 1993 },
  { name: 'Drake', sex: 'Male', birthYear: 1986 },
  { name: 'Olivia Rodrigo', sex: 'Female', birthYear: 2003 },
  { name: 'Harry Styles', sex: 'Male', birthYear: 1994 },
  { name: 'Dua Lipa', sex: 'Female', birthYear: 1995 },
  { name: 'Post Malone', sex: 'Male', birthYear: 1995 }
];

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

  useEffect(() => {
    loadSongs();
    getSpotifyToken();
  }, []);

  const getSpotifyToken = async () => {
    try {
      const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
      const clientSecret = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
      
      console.log('Getting Spotify token...');
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
        },
        body: 'grant_type=client_credentials'
      });
      
      const data = await response.json();
      setSpotifyToken(data.access_token);
      console.log('Spotify token received!');
    } catch (error) {
      console.error('Error getting Spotify token:', error);
    }
  };

  useEffect(() => {
    const searchSongs = async () => {
      if (searchQuery.length > 2 && spotifyToken) {
        setIsSearching(true);
        try {
          console.log('Searching Spotify for:', searchQuery);
          
          const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
            {
              headers: {
                'Authorization': `Bearer ${spotifyToken}`
              }
            }
          );
          const data = await response.json();
          
          console.log('Spotify results:', data);
          
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
                  genres = artistData.genres;
                }
              } catch (error) {
                console.error('Error fetching artist:', error);
              }
              
              return {
                title: track.name,
                artist: artistName,
                year: releaseYear,
                duration: durationSeconds,
                genre: genres[0] || 'Unknown',
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

  const loadSongs = () => {
    try {
      const stored = localStorage.getItem('emilys-earworms');
      if (stored) {
        setSongs(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading songs:', error);
      setSongs([]);
    }
  };

  const saveSongs = (newSongs) => {
    try {
      localStorage.setItem('emilys-earworms', JSON.stringify(newSongs));
      setSongs(newSongs);
    } catch (error) {
      console.error('Error saving songs:', error);
    }
  };

  const addSong = () => {
    if (!selectedSong) return;

    // Use custom genre if provided and song genre is Unknown
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

    const updatedSongs = [...songs, newEntry];
    saveSongs(updatedSongs);
    
    setShowForm(false);
    setSearchQuery('');
    setSelectedSong(null);
    setDateTime('');
    setCustomGenre('');
    setActiveView('dashboard');
  };

  const deleteSong = (id) => {
    const updatedSongs = songs.filter(s => s.id !== id);
    saveSongs(updatedSongs);
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

  const genreChartData = Object.entries(genreData).map(([name, value]) => ({ name, value }));

  const timeOfDayData = songs.reduce((acc, song) => {
    const hour = new Date(song.timestamp).getHours();
    const period = hour < 6 ? 'Night' : hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
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
                <p className="text-sm text-gray-400">Songs stuck in her head</p>
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
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {songs.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-gray-700">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No earworms yet!</h3>
                <p className="text-gray-500">Start tracking songs that get stuck in Emily's head</p>
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
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {genreChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                      <TrendingUp className="w-5 h-5 text-pink-400" />
                      Top Artists
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topArtistsData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9ca3af" />
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
      </div>
    </div>
  );
}