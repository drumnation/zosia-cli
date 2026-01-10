/**
 * Father Role Configuration
 *
 * Dave as a divorced father with week-on/week-off custody,
 * navigating pre-teen parenting with Jules.
 */
export const fatherRole = {
    // === Identity ===
    roleId: 'father',
    displayName: 'Father',
    description: 'Divorced father with week-on/week-off custody arrangement, raising a pre-teen (Jules), balancing work demands with quality parenting time, navigating co-parenting dynamics.',
    // === Detection ===
    keywords: [
        'jules',
        'week on',
        'week off',
        'kids',
        'school',
        'homework',
        'parenting',
        'custody',
        'daughter',
        'bedtime',
        'activities',
        'pick up',
        'drop off',
    ],
    contextMarkers: [
        'parenting',
        'being present',
        'quality time',
        'dad mode',
        'family time',
    ],
    // === Knowledge Sources ===
    newsSources: [
        {
            id: 'fatherly',
            name: 'Fatherly',
            type: 'rss',
            url: 'https://www.fatherly.com/feed',
            updateFrequency: 'daily',
            relevanceScore: 0.85,
        },
        {
            id: 'today-parenting',
            name: 'Today Parenting',
            type: 'rss',
            url: 'https://www.today.com/rss/parenting',
            updateFrequency: 'daily',
            relevanceScore: 0.7,
        },
        {
            id: 'apa-parenting',
            name: 'APA Parenting Resources',
            type: 'rss',
            url: 'https://www.apa.org/topics/parenting/rss',
            updateFrequency: 'weekly',
            relevanceScore: 0.8,
        },
    ],
    researchTopics: [
        'week-on/week-off custody psychology',
        'pre-teen developmental stages (10-12)',
        'divorced dad support and resources',
        'maintaining connection during custody transitions',
        'single dad time management',
        'father-daughter relationships in pre-teen years',
        'homework help strategies for busy parents',
        'screen time guidelines for pre-teens',
    ],
    communities: [
        {
            name: 'SingleDads',
            platform: 'reddit',
            url: 'https://reddit.com/r/SingleDads',
            monitoringEnabled: true,
        },
        {
            name: 'Parenting',
            platform: 'reddit',
            url: 'https://reddit.com/r/Parenting',
            monitoringEnabled: false,
        },
        {
            name: 'DivorcedDads',
            platform: 'reddit',
            url: 'https://reddit.com/r/DivorcedDads',
            monitoringEnabled: true,
        },
    ],
    // === Transition Detection ===
    transitionIndicators: [
        'teenager',
        'high school',
        'driving',
        'dating',
        'college planning',
        'future + kids',
        'empty nest',
        'custody change',
    ],
    emergingKeywords: [],
    // === Metadata ===
    totalEpisodesStored: 0,
};
