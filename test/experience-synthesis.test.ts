/**
 * Test role detection and experience synthesis integration
 *
 * NOTE: This file contains manual demonstration code below the test suite.
 * The vitest tests validate the core functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  synthesizeMindState,
  formatMindStateForPrompt,
  generateExperienceBridgePrompt,
  type ContextLayers,
} from '../src/experience-synthesizer.js';
import type {
  RoleDetectionResult,
  EmotionClassificationResult,
  MemoryRetrievalResult,
  IntentRecognitionResult,
} from '../src/unconscious-spawner.js';

describe('Experience Synthesis', () => {
  describe('synthesizeMindState', () => {
    it('should synthesize mind state from context layers', () => {
      const layers: ContextLayers = {
        roles: {
          type: 'role_detection',
          active_roles: [
            { role: 'Engineer', confidence: 0.9, markers_detected: ['technical terms'] },
          ],
          primary_role: 'Engineer',
          role_tensions: [],
          felt_texture: 'Technical focus shapes this moment.',
        },
        emotion: {
          type: 'emotion_classification',
          primary: 'focused',
          secondary: [],
          intensity: 0.7,
          signals: ['clear thinking'],
        },
        memory: null,
        intent: {
          type: 'intent_recognition',
          primary_intent: 'problem solving',
          sub_intents: [],
          confidence: 0.8,
          needs: ['technical guidance'],
        },
        experience: null,
      };

      const mindState = synthesizeMindState(layers);

      expect(mindState).toBeDefined();
      expect(mindState.primaryRole).toBe('Engineer');
      expect(mindState.activeRoles).toContain('Engineer');
      expect(mindState.emotionalTone.primary).toBe('focused');
    });

    it('should handle missing roles gracefully', () => {
      const layers: ContextLayers = {
        roles: null,
        emotion: {
          type: 'emotion_classification',
          primary: 'neutral',
          secondary: [],
          intensity: 0.5,
          signals: [],
        },
        memory: null,
        intent: null,
        experience: null,
      };

      const mindState = synthesizeMindState(layers);

      expect(mindState).toBeDefined();
      // When no roles, primaryRole is null
      expect(mindState.primaryRole).toBeNull();
      expect(mindState.activeRoles).toHaveLength(0);
    });
  });

  describe('generateExperienceBridgePrompt', () => {
    it('should generate a prompt from mind state', () => {
      const mindState = {
        primaryRole: 'Engineer',
        activeRoles: ['Engineer'],
        feltExperience: 'Technical focus is present.',
        emotionalTone: { primary: 'focused', intensity: 0.7 },
        associations: ['technical context surfaces'],
        tensions: [],
        innerState: {
          weather: 'clear and focused',
          space: 'organized workspace',
          sound: 'quiet concentration',
        },
        inferredNeeds: ['technical guidance', 'clarity'],
      };

      const prompt = generateExperienceBridgePrompt(mindState);

      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Manual demonstration code below (not part of vitest suite)
// ============================================================================

// Sample inputs to test role detection patterns
const TEST_INPUTS = [
  {
    name: 'Engineer mode - technical frustration',
    input: "Brain Garden's build is failing and I can't figure out why. The monorepo structure is getting complex.",
    expectedPrimaryRole: 'Engineer',
    expectedEmotion: 'frustration',
  },
  {
    name: 'Father mode - custody stress',
    input: "It's my week on and Jules has a school project due. I want to be present but I'm swamped with work.",
    expectedPrimaryRole: 'Father',
    expectedEmotion: 'guilt',
  },
  {
    name: 'Mixed roles - Engineer + Freelancer tension',
    input: "Got a potential client at $250/hr but Scala work is piling up. Not sure I can handle both.",
    expectedPrimaryRole: 'Freelancer',
    expectedTension: ['Engineer', 'Freelancer'],
  },
  {
    name: 'Divorced person - financial weight',
    input: "Dad's asking about the loan repayment timeline. $115K feels like a mountain.",
    expectedPrimaryRole: 'Divorced Person',
    expectedEmotion: 'stress',
  },
  {
    name: 'Musician mode - dormant creative',
    input: "Haven't touched the drums in weeks. Miss that meditative flow state.",
    expectedPrimaryRole: 'Musician',
    expectedEmotion: 'longing',
  },
];

// Mock role detection results for testing synthesis
function createMockRoleDetection(
  primaryRole: string,
  additionalRoles: string[] = [],
  tensions: Array<{ between: [string, string]; conflict: string }> = []
): RoleDetectionResult {
  const allRoles = [primaryRole, ...additionalRoles];
  return {
    type: 'role_detection',
    active_roles: allRoles.map((role, i) => ({
      role,
      confidence: 1 - i * 0.2,
      markers_detected: [`marker_for_${role.toLowerCase()}`],
    })),
    primary_role: primaryRole,
    role_tensions: tensions,
    felt_texture: `The ${primaryRole} presence shapes this moment.`,
  };
}

function createMockEmotion(
  primary: string,
  intensity: number = 0.6
): EmotionClassificationResult {
  return {
    type: 'emotion_classification',
    primary,
    secondary: [],
    intensity,
    signals: [`tone indicates ${primary}`],
  };
}

function createMockMemory(): MemoryRetrievalResult {
  return {
    type: 'memory_retrieval',
    associations: [
      {
        type: 'RECALL',
        intensity: 'medium',
        text: 'A thread from previous conversations surfaces...',
        source: 'graphiti',
      },
    ],
    synthesis: 'Previous context enriches this moment.',
  };
}

function createMockIntent(): IntentRecognitionResult {
  return {
    type: 'intent_recognition',
    primary_intent: 'seeking support',
    sub_intents: ['processing', 'connecting'],
    confidence: 0.8,
    needs: ['validation', 'perspective'],
  };
}

// Run tests
console.log('\n=== Experience Synthesis Tests ===\n');

for (const testCase of TEST_INPUTS) {
  console.log(`📋 Test: ${testCase.name}`);
  console.log(`   Input: "${testCase.input.slice(0, 60)}..."`);

  // Create mock context layers
  const layers: ContextLayers = {
    roles: createMockRoleDetection(
      testCase.expectedPrimaryRole,
      testCase.expectedTension ? [testCase.expectedTension[1]] : [],
      testCase.expectedTension
        ? [{ between: testCase.expectedTension as [string, string], conflict: 'Role tension detected' }]
        : []
    ),
    emotion: createMockEmotion(testCase.expectedEmotion || 'neutral', 0.7),
    memory: createMockMemory(),
    intent: createMockIntent(),
    experience: null,
  };

  // Synthesize mind state
  const mindState = synthesizeMindState(layers);

  console.log(`\n   ✅ MindState synthesized:`);
  console.log(`      Primary Role: ${mindState.primaryRole}`);
  console.log(`      Active Roles: ${mindState.activeRoles.join(', ')}`);
  console.log(`      Felt Experience: ${mindState.feltExperience}`);
  console.log(`      Emotional Tone: ${mindState.emotionalTone.primary} (${mindState.emotionalTone.intensity})`);

  if (mindState.tensions.length > 0) {
    console.log(`      Tensions: ${mindState.tensions.map((t) => `${t.between[0]} ↔ ${t.between[1]}`).join(', ')}`);
  }

  // Generate bridge prompt
  const bridgePrompt = generateExperienceBridgePrompt(mindState);
  console.log(`\n   📝 Bridge Prompt Preview (first 200 chars):`);
  console.log(`      ${bridgePrompt.slice(0, 200).replace(/\n/g, '\n      ')}...`);

  console.log('\n' + '─'.repeat(60) + '\n');
}

// Full bridge prompt example
console.log('\n=== Full Bridge Prompt Example (Engineer + Freelancer tension) ===\n');

const fullExampleLayers: ContextLayers = {
  roles: createMockRoleDetection('Engineer', ['Freelancer'], [
    { between: ['Engineer', 'Freelancer'], conflict: 'Day job depletes creative energy needed for side work.' },
  ]),
  emotion: createMockEmotion('frustration', 0.75),
  memory: createMockMemory(),
  intent: createMockIntent(),
  experience: null,
  temporal: {
    gapSinceLastSession: 2 * 24 * 60 * 60 * 1000, // 2 days
    isWeekOn: true,
    timeOfDay: 'evening',
  },
};

const fullMindState = synthesizeMindState(fullExampleLayers);
const fullBridgePrompt = generateExperienceBridgePrompt(fullMindState);

console.log(fullBridgePrompt);

console.log('\n=== Tests Complete ===\n');
