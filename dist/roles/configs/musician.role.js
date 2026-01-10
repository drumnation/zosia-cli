/**
 * Musician Role Configuration
 *
 * Dave as a formally trained musician with diverse background:
 * music theory/composition degree, jazz drumset, tabla, piano, choir.
 * Currently drawn to prog metal/djent but rooted in broader musicianship.
 */
export const musicianRole = {
    // === Identity ===
    roleId: 'musician',
    displayName: 'Musician',
    description: 'Formally trained musician (music theory & composition degree) with multi-instrumental background: jazz drumset, tabla, piano, choir. Currently exploring prog metal/djent drumming, seeking creative flow states, exploring AI tools for composition.',
    // === Detection ===
    keywords: [
        'drums',
        'drumming',
        'djent',
        'music',
        'practice',
        'flow state',
        'rhythm',
        'band',
        'metal',
        'progressive',
        'polyrhythm',
        'groove',
        'kit',
        'sticks',
        'jazz',
        'tabla',
        'piano',
        'composition',
        'theory',
        'harmony',
        'choir',
        'singing',
        'improvisation',
        'taal',
        'raga',
    ],
    contextMarkers: [
        'playing',
        'practicing',
        'jamming',
        'creative',
        'musical',
        'rhythmic',
        'composing',
        'arranging',
        'improvising',
    ],
    // === Knowledge Sources ===
    newsSources: [
        {
            id: 'drummerworld-forum',
            name: 'Drummerworld Forum',
            type: 'rss',
            url: 'https://www.drummerworld.com/forums/external.php?type=RSS2',
            updateFrequency: 'weekly',
            relevanceScore: 0.8,
        },
        {
            id: 'moderndrummer',
            name: 'Modern Drummer',
            type: 'rss',
            url: 'https://www.moderndrummer.com/feed/',
            updateFrequency: 'weekly',
            relevanceScore: 0.85,
        },
        {
            id: 'metalsucks',
            name: 'MetalSucks',
            type: 'rss',
            url: 'https://www.metalsucks.net/feed/',
            updateFrequency: 'daily',
            relevanceScore: 0.6,
        },
    ],
    researchTopics: [
        'creative flow states in music',
        'music as meditation and stress relief',
        'jazz drumming vocabulary and comping',
        'tabla and Indian classical rhythm (taal systems)',
        'djent and progressive metal scene',
        'AI tools for composition (Suno, Udio)',
        'music theory in modern production',
        'maintaining musical identity with limited time',
        'multi-instrumentalist practice strategies',
        'adult musicians returning to practice',
        'improvisation techniques across genres',
    ],
    communities: [
        {
            name: 'Drums',
            platform: 'reddit',
            url: 'https://reddit.com/r/drums',
            monitoringEnabled: true,
        },
        {
            name: 'Jazz',
            platform: 'reddit',
            url: 'https://reddit.com/r/Jazz',
            monitoringEnabled: true,
        },
        {
            name: 'MusicTheory',
            platform: 'reddit',
            url: 'https://reddit.com/r/musictheory',
            monitoringEnabled: true,
        },
        {
            name: 'Djent',
            platform: 'reddit',
            url: 'https://reddit.com/r/Djent',
            monitoringEnabled: true,
        },
        {
            name: 'WeAreTheMusicMakers',
            platform: 'reddit',
            url: 'https://reddit.com/r/WeAreTheMusicMakers',
            monitoringEnabled: false,
        },
    ],
    // === Transition Detection ===
    transitionIndicators: [
        'performance',
        'gig',
        'recording',
        'collaboration',
        'band project',
        'teaching drums',
        'selling gear',
        'new instrument',
    ],
    emergingKeywords: [],
    // === Metadata ===
    totalEpisodesStored: 0,
};
