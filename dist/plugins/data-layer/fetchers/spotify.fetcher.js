/**
 * Spotify Data Fetcher
 *
 * Priority 2: "Music choices reveal mood in ways words often can't"
 *
 * Fetches recently played, currently playing, and audio features from Spotify API.
 * Rate limit: Hourly (via cache TTL)
 */
// ============================================================================
// Configuration
// ============================================================================
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
// ============================================================================
// Kids Music Detection
// ============================================================================
const KIDS_INDICATORS = [
    'disney',
    'frozen',
    'moana',
    'encanto',
    'cocomelon',
    'baby shark',
    'paw patrol',
    'peppa pig',
    'sesame street',
    'kids bop',
    'kidz bop',
    'lullaby',
    'nursery rhyme',
    'children',
    'raffi',
    'wiggles',
    'bluey',
];
function isKidsMusic(trackName, artistName) {
    const combined = `${trackName} ${artistName}`.toLowerCase();
    return KIDS_INDICATORS.some((indicator) => combined.includes(indicator));
}
// ============================================================================
// Fetcher Implementation
// ============================================================================
/**
 * Create a Spotify data fetcher
 *
 * @example
 * ```typescript
 * const fetcher = makeSpotifyFetcher({
 *   accessToken: await brainCreds.get('spotify_token'),
 *   debug: true,
 * });
 *
 * const data = await fetcher();
 * console.log(`Mood valence: ${data.audioFeatures.valence}`);
 * ```
 */
export function makeSpotifyFetcher(config) {
    const { accessToken, debug = false } = config;
    return async () => {
        if (debug) {
            console.log('[SpotifyFetcher] Fetching data from Spotify API...');
        }
        try {
            // Fetch all data types in parallel
            const [recentlyPlayedResponse, currentlyPlayingResponse, topArtistsResponse] = await Promise.all([
                fetch(`${SPOTIFY_API_BASE}/me/player/recently-played?limit=20`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
                fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
                fetch(`${SPOTIFY_API_BASE}/me/top/artists?limit=5&time_range=short_term`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }),
            ]);
            // Handle responses (some may be 204 No Content)
            const recentlyPlayed = recentlyPlayedResponse.ok
                ? (await recentlyPlayedResponse.json())
                : { items: [] };
            const currentlyPlaying = currentlyPlayingResponse.ok && currentlyPlayingResponse.status !== 204
                ? (await currentlyPlayingResponse.json())
                : null;
            const topArtists = topArtistsResponse.ok
                ? (await topArtistsResponse.json())
                : { items: [] };
            // Get audio features for recently played tracks
            const trackIds = recentlyPlayed.items
                .slice(0, 10)
                .map((item) => item.track.id)
                .join(',');
            let audioFeaturesData = [];
            if (trackIds) {
                const audioFeaturesResponse = await fetch(`${SPOTIFY_API_BASE}/audio-features?ids=${trackIds}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (audioFeaturesResponse.ok) {
                    const data = (await audioFeaturesResponse.json());
                    audioFeaturesData = data.audio_features.filter(Boolean);
                }
            }
            // Transform data
            const transformedRecentlyPlayed = transformRecentlyPlayed(recentlyPlayed.items);
            const transformedCurrentlyPlaying = transformCurrentlyPlaying(currentlyPlaying);
            const transformedTopArtists = transformTopArtists(topArtists.items);
            const aggregatedAudioFeatures = aggregateAudioFeatures(audioFeaturesData);
            const patterns = detectPatterns(recentlyPlayed.items, audioFeaturesData, topArtists.items);
            if (debug) {
                console.log(`[SpotifyFetcher] Valence: ${aggregatedAudioFeatures.valence.toFixed(2)}, ` +
                    `Energy: ${aggregatedAudioFeatures.energy.toFixed(2)}`);
            }
            return {
                recentlyPlayed: transformedRecentlyPlayed,
                currentlyPlaying: transformedCurrentlyPlaying,
                topArtists: transformedTopArtists,
                topTracks: transformedRecentlyPlayed.slice(0, 5).map((t) => ({
                    name: t.track,
                    artist: t.artist,
                })),
                audioFeatures: aggregatedAudioFeatures,
                patterns,
                fetchedAt: new Date(),
            };
        }
        catch (error) {
            if (debug) {
                console.error('[SpotifyFetcher] Error:', error);
            }
            throw error;
        }
    };
}
// ============================================================================
// Data Transformers
// ============================================================================
function transformRecentlyPlayed(items) {
    return items.map((item) => ({
        track: item.track.name,
        artist: item.track.artists.map((a) => a.name).join(', '),
        playedAt: new Date(item.played_at),
        duration: item.track.duration_ms,
    }));
}
function transformCurrentlyPlaying(data) {
    if (!data || !data.item) {
        return null;
    }
    return {
        track: data.item.name,
        artist: data.item.artists.map((a) => a.name).join(', '),
        album: data.item.album.name,
        isPlaying: data.is_playing,
    };
}
function transformTopArtists(items) {
    return items.map((artist) => ({
        name: artist.name,
        genres: artist.genres,
    }));
}
function aggregateAudioFeatures(features) {
    if (features.length === 0) {
        return {
            valence: 0.5, // Neutral defaults
            energy: 0.5,
            danceability: 0.5,
        };
    }
    const sum = features.reduce((acc, f) => ({
        valence: acc.valence + f.valence,
        energy: acc.energy + f.energy,
        danceability: acc.danceability + f.danceability,
    }), { valence: 0, energy: 0, danceability: 0 });
    return {
        valence: sum.valence / features.length,
        energy: sum.energy / features.length,
        danceability: sum.danceability / features.length,
    };
}
function detectPatterns(recentlyPlayed, audioFeatures, topArtists) {
    // Detect mood trend from valence
    let moodTrend = 'mixed';
    if (audioFeatures.length >= 3) {
        const avgValence = audioFeatures.reduce((sum, f) => sum + f.valence, 0) / audioFeatures.length;
        if (avgValence > 0.6)
            moodTrend = 'upbeat';
        else if (avgValence < 0.4)
            moodTrend = 'mellow';
    }
    // Detect listening time pattern
    const hours = recentlyPlayed.map((item) => new Date(item.played_at).getHours());
    const avgHour = hours.length > 0 ? hours.reduce((sum, h) => sum + h, 0) / hours.length : 12;
    let listeningTime = 'afternoon';
    if (avgHour >= 22 || avgHour < 4)
        listeningTime = 'late night';
    else if (avgHour >= 4 && avgHour < 9)
        listeningTime = 'early morning';
    else if (avgHour >= 9 && avgHour < 12)
        listeningTime = 'morning';
    else if (avgHour >= 17 && avgHour < 22)
        listeningTime = 'evening';
    // Detect genre shift from top artists
    const allGenres = topArtists.flatMap((a) => a.genres);
    const genreCounts = allGenres.reduce((acc, genre) => {
        acc[genre] = (acc[genre] || 0) + 1;
        return acc;
    }, {});
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];
    const genreShift = topGenre ? `more ${topGenre[0]} lately` : null;
    // Detect if listening to kids music
    const kidsCount = recentlyPlayed.filter((item) => isKidsMusic(item.track.name, item.track.artists[0]?.name || '')).length;
    const isKidsMusicActive = kidsCount > recentlyPlayed.length * 0.3;
    return {
        moodTrend,
        listeningTime,
        genreShift,
        isKidsMusic: isKidsMusicActive,
    };
}
// ============================================================================
// Mock Implementation for Development
// ============================================================================
/**
 * Create a mock Spotify fetcher for development/testing
 */
export function makeMockSpotifyFetcher(options) {
    return async () => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
            recentlyPlayed: [
                {
                    track: 'A Love Supreme',
                    artist: 'John Coltrane',
                    playedAt: new Date(),
                    duration: 300000,
                },
                {
                    track: 'Giant Steps',
                    artist: 'John Coltrane',
                    playedAt: new Date(Date.now() - 600000),
                    duration: 280000,
                },
            ],
            currentlyPlaying: options?.currentlyPlaying
                ? {
                    track: options.currentlyPlaying.track,
                    artist: options.currentlyPlaying.artist,
                    album: 'Mock Album',
                    isPlaying: true,
                }
                : null,
            topArtists: [
                { name: 'John Coltrane', genres: ['jazz', 'bebop'] },
                { name: 'Miles Davis', genres: ['jazz', 'modal jazz'] },
            ],
            topTracks: [
                { name: 'A Love Supreme', artist: 'John Coltrane' },
                { name: 'So What', artist: 'Miles Davis' },
            ],
            audioFeatures: {
                valence: options?.valence ?? 0.45,
                energy: 0.6,
                danceability: 0.3,
            },
            patterns: {
                moodTrend: options?.moodTrend ?? 'mixed',
                listeningTime: 'late night',
                genreShift: 'more jazz lately',
                isKidsMusic: options?.isKidsMusic ?? false,
            },
            fetchedAt: new Date(),
        };
    };
}
