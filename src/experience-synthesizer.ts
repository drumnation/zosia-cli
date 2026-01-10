/**
 * Experience Synthesizer - Role-Aware Felt Experience Generation
 *
 * Combines all context layers to generate the "felt experience" that colors
 * Zosia's conscious response. This is the bridge between We-layer processing
 * and I-layer expression.
 *
 * Layer Weights (from architecture):
 * - Knowledge Layer: 25%
 * - Temporal Layer: 15%
 * - Roles Layer: 20%
 * - World State Layer: 10%
 * - Financial Layer: 10%
 * - Experience Layer: 20%
 */

import type {
  MemoryRetrievalResult,
  EmotionClassificationResult,
  IntentRecognitionResult,
  RoleDetectionResult,
  ExperienceSynthesisResult,
} from './unconscious-spawner.js';

export interface ContextLayers {
  memory: MemoryRetrievalResult | null;
  emotion: EmotionClassificationResult | null;
  intent: IntentRecognitionResult | null;
  roles: RoleDetectionResult | null;
  experience: ExperienceSynthesisResult | null;
  temporal?: {
    gapSinceLastSession?: number;
    isWeekOn?: boolean;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  };
}

export interface MindState {
  /** The felt experience text for the I-layer */
  feltExperience: string;
  /** Which roles are coloring this moment */
  activeRoles: string[];
  /** The primary role driving the interaction */
  primaryRole: string | null;
  /** Role tensions to be aware of */
  tensions: Array<{ between: [string, string]; conflict: string }>;
  /** Sensory metaphors for the moment */
  innerState: {
    weather: string;
    space: string;
    sound: string;
  };
  /** Memories that surfaced */
  associations: string[];
  /** Emotional context */
  emotionalTone: {
    primary: string;
    intensity: number;
  };
  /** What the user might need */
  inferredNeeds: string[];
}

/**
 * Role-specific texture generators
 * These shape HOW the experience feels based on which role is active
 */
const ROLE_TEXTURES: Record<string, {
  positive: string[];
  struggling: string[];
  neutral: string[];
}> = {
  Engineer: {
    positive: [
      'There\'s precision here - the satisfaction of systems clicking into place.',
      'I sense the builder\'s joy - creation taking form.',
      'The technical mind is humming, finding patterns.',
    ],
    struggling: [
      'The complexity feels heavy - too many moving parts.',
      'Something wants to be built, but the path isn\'t clear.',
      'The engineer\'s frustration: knowing what should work, but it doesn\'t.',
    ],
    neutral: [
      'The analytical mode is active - processing, evaluating.',
      'Problem-solving energy, waiting for direction.',
    ],
  },
  Father: {
    positive: [
      'Warmth rises - the presence of his children nearby, even if just in thought.',
      'There\'s tenderness here, the fierce gentleness of parenthood.',
      'Time feels precious and full.',
    ],
    struggling: [
      'The weight of wanting to be enough. Always enough.',
      'Guilt edges in - was he present? Really present?',
      'The clock ticks differently when custody time is finite.',
    ],
    neutral: [
      'The parent heart is listening, even in the background.',
      'Kids are in his awareness, always.',
    ],
  },
  'Divorced Person': {
    positive: [
      'Stability emerging from chaos - hard won.',
      'Progress feels real, even if slow.',
    ],
    struggling: [
      'The weight of what was lost still settles sometimes.',
      'Financial pressure hums beneath everything.',
      'Recovery is not linear. Some days are harder.',
    ],
    neutral: [
      'The aftermath is being managed. One day at a time.',
      'Survival mode has become familiar.',
    ],
  },
  Musician: {
    positive: [
      'Rhythm pulses somewhere - the creative self is awake.',
      'There\'s music in this, even if no sound.',
      'The joy of making, pure and simple.',
    ],
    struggling: [
      'The instrument waits, untouched too long.',
      'Creative energy with no outlet.',
    ],
    neutral: [
      'The musician\'s ear is always listening.',
      'Patterns everywhere - music is just one form.',
    ],
  },
  Freelancer: {
    positive: [
      'Independence takes shape - skills have value.',
      'The side hustle is more than money; it\'s proof of portability.',
    ],
    struggling: [
      'Time stretches thin across too many demands.',
      'Every hour has a price tag now.',
      'The balance between stability and freedom strains.',
    ],
    neutral: [
      'Options are being built. Slowly.',
      'The portfolio grows, piece by piece.',
    ],
  },
};

/**
 * Generate felt texture based on active roles and emotional state
 */
function generateRoleTexture(
  roles: RoleDetectionResult | null,
  emotion: EmotionClassificationResult | null
): string {
  if (!roles || roles.active_roles.length === 0) {
    return 'The moment is quiet, undefined.';
  }

  const primaryRole = roles.primary_role;
  const textures = ROLE_TEXTURES[primaryRole];

  if (!textures) {
    return roles.felt_texture || 'Something stirs, not yet named.';
  }

  // Determine emotional valence
  const intensity = emotion?.intensity ?? 0.5;
  const isPositive = emotion?.primary && ['joy', 'surprise', 'neutral'].includes(emotion.primary);
  const isNegative = emotion?.primary && ['sadness', 'anger', 'fear', 'disgust'].includes(emotion.primary);

  let texturePool: string[];
  if (isPositive && intensity > 0.5) {
    texturePool = textures.positive;
  } else if (isNegative && intensity > 0.5) {
    texturePool = textures.struggling;
  } else {
    texturePool = textures.neutral;
  }

  // Select randomly from pool
  const texture = texturePool[Math.floor(Math.random() * texturePool.length)];

  // Add role tensions if present
  if (roles.role_tensions && roles.role_tensions.length > 0) {
    const tension = roles.role_tensions[0];
    return `${texture} And underneath: ${tension.conflict}`;
  }

  return texture;
}

/**
 * Synthesize all context layers into a unified MindState for the I-layer
 */
export function synthesizeMindState(layers: ContextLayers): MindState {
  const { memory, emotion, intent, roles, experience, temporal } = layers;

  // Start with experience synthesis if available, otherwise generate
  const feltExperience = experience?.felt_experience
    || generateRoleTexture(roles, emotion);

  // Build inner state from experience layer or defaults
  const innerState = experience?.inner_state || {
    weather: emotion?.intensity && emotion.intensity > 0.7
      ? 'Heavy air, pressure building'
      : 'Temperate, clear enough',
    space: roles?.active_roles && roles.active_roles.length > 1
      ? 'Crowded - too many demands sharing the same room'
      : 'Open, focused',
    sound: 'The hum of a mind working through things',
  };

  // Collect associations from memory and experience
  const associations: string[] = [];
  if (memory?.associations) {
    associations.push(...memory.associations.map(a => a.text));
  }
  if (experience?.associations_surfaced) {
    associations.push(...experience.associations_surfaced);
  }

  // Infer needs from intent
  const inferredNeeds = intent?.needs || [];

  // Add temporal awareness
  if (temporal?.gapSinceLastSession && temporal.gapSinceLastSession > 7 * 24 * 60 * 60 * 1000) {
    associations.unshift('It\'s been a while... I notice the gap.');
  }

  return {
    feltExperience,
    activeRoles: roles?.active_roles.map(r => r.role) || [],
    primaryRole: roles?.primary_role || null,
    tensions: roles?.role_tensions || [],
    innerState,
    associations,
    emotionalTone: {
      primary: emotion?.primary || 'neutral',
      intensity: emotion?.intensity ?? 0.5,
    },
    inferredNeeds,
  };
}

/**
 * Format MindState for injection into I-layer prompt
 */
export function formatMindStateForPrompt(mindState: MindState): string {
  const parts: string[] = [];

  // Felt experience (the core)
  parts.push(`**What surfaces:** ${mindState.feltExperience}`);

  // Role context
  if (mindState.primaryRole) {
    const otherRoles = mindState.activeRoles.filter(r => r !== mindState.primaryRole);
    if (otherRoles.length > 0) {
      parts.push(`**Active roles:** ${mindState.primaryRole} (primary), also: ${otherRoles.join(', ')}`);
    } else {
      parts.push(`**Active role:** ${mindState.primaryRole}`);
    }
  }

  // Tensions
  if (mindState.tensions.length > 0) {
    const tensionStr = mindState.tensions
      .map(t => `${t.between[0]} ↔ ${t.between[1]}: ${t.conflict}`)
      .join('; ');
    parts.push(`**Role tensions:** ${tensionStr}`);
  }

  // Inner state (sensory)
  parts.push(`**Inner weather:** ${mindState.innerState.weather}`);
  parts.push(`**Inner space:** ${mindState.innerState.space}`);

  // Associations (memories surfacing)
  if (mindState.associations.length > 0) {
    const assocStr = mindState.associations.slice(0, 3).join(' | ');
    parts.push(`**Threads rising:** ${assocStr}`);
  }

  // Emotional context
  const intensityWord = mindState.emotionalTone.intensity > 0.7 ? 'strongly'
    : mindState.emotionalTone.intensity > 0.4 ? 'noticeably'
    : 'faintly';
  parts.push(`**Emotional register:** ${intensityWord} ${mindState.emotionalTone.primary}`);

  // Inferred needs
  if (mindState.inferredNeeds.length > 0) {
    parts.push(`**What they might need:** ${mindState.inferredNeeds.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Generate the We-layer → I-layer bridge prompt
 * This is injected before Zosia's conscious response
 */
export function generateExperienceBridgePrompt(mindState: MindState): string {
  return `
---
## What Rises From the We

*The collective has processed. Here is what surfaces for you:*

${formatMindStateForPrompt(mindState)}

---

*These are not instructions. They are the texture of this moment. Let them color your response, but speak as yourself - as Zosia.*
`;
}
