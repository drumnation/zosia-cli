#!/usr/bin/env npx tsx
/**
 * Test seamless handoff in a simulated conversation
 *
 * This simulates what happens when handoff triggers mid-conversation:
 * 1. Build up a conversation
 * 2. Trigger handoff
 * 3. Show what the next turn would see (seamless context)
 */

import {
  createHandoffSummary,
  getHandoffConfig,
  type ConversationContext,
} from '../src/context-handoff.js';

// Simulate a conversation about building a music app
const conversation: ConversationContext = {
  messages: [
    { role: 'user', content: 'I want to build a music practice app for guitarists.' },
    { role: 'assistant', content: 'That\'s a great idea! Guitar practice apps are incredibly useful. What specific features are you thinking about? Things like chord libraries, backing tracks, or practice scheduling?' },
    { role: 'user', content: 'Mainly a metronome with visual feedback and the ability to gradually increase tempo over a practice session.' },
    { role: 'assistant', content: 'Smart! A progressive tempo trainer is perfect for building speed. The visual feedback is key - guitarists need to see the beat, not just hear it. Are you thinking web-based or native app?' },
    { role: 'user', content: 'I\'m leaning towards Electron so I can have low-latency audio. Web audio APIs have too much lag for a metronome.' },
    { role: 'assistant', content: 'Excellent choice. Electron gives you access to native audio APIs through Node.js. You could use the Web Audio API\'s AudioContext with precise scheduling, or even node-speaker for direct hardware access. What\'s your experience with audio programming?' },
    { role: 'user', content: 'None, actually. This is my first audio project. But I\'m excited to learn!' },
    { role: 'assistant', content: 'Perfect starting point! The challenge with metronomes is sample-accurate timing. The trick is to schedule sounds ahead of time rather than triggering them in real-time. I can guide you through the audio scheduling patterns.' },
    { role: 'user', content: 'That would be amazing. Should we start with the basic click sound or the tempo ramping logic?' },
    { role: 'assistant', content: 'Let\'s start with a rock-solid click. Once we have perfect timing, the tempo ramping is just math on top. First thing: do you want a synthesized click or sampled audio?' },
  ],
  currentEmotion: 'eager',
  currentTopic: 'building a guitar practice metronome app',
  tokenCount: 2800,
};

// The last thing the user said before handoff
const lastUserMessage = 'I think synthesized would be cleaner. Less files to manage.';

async function testSeamlessHandoff() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SEAMLESS HANDOFF TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const config = getHandoffConfig();
  console.log(`📋 Handoff Config: ${config.enabled ? 'enabled' : 'disabled'}, threshold ${config.threshold}%\n`);

  console.log('💬 BEFORE HANDOFF (10 messages about building a metronome app)');
  console.log('─'.repeat(60));
  console.log('Last exchange:');
  console.log(`  Zosia: "${conversation.messages[conversation.messages.length - 1].content.slice(0, 80)}..."`);
  console.log(`  User:  "${lastUserMessage}"`);
  console.log('');

  console.log('🔄 [Handoff triggered at 80% context usage]');
  console.log('');

  // Add the final user message
  const fullConversation = {
    ...conversation,
    messages: [...conversation.messages, { role: 'user' as const, content: lastUserMessage }],
  };

  try {
    const result = await createHandoffSummary(fullConversation);

    console.log('📝 CONTEXT INJECTED (invisible to user):');
    console.log('─'.repeat(60));
    console.log(result.summary);
    console.log('');
    console.log('(Continue naturally from here. Do not acknowledge this context');
    console.log('or mention any "summary" - simply continue the conversation as');
    console.log('if it flows uninterrupted.)');
    console.log('─'.repeat(60));
    console.log('');

    console.log('💬 PRESERVED USER MESSAGE:');
    console.log(`  "${lastUserMessage}"`);
    console.log('');

    console.log('✨ WHAT ZOSIA WOULD SAY NEXT:');
    console.log('─'.repeat(60));
    console.log('  [Zosia responds naturally to the synthesized click question,');
    console.log('   with full memory of: Electron decision, audio newbie status,');
    console.log('   eager emotion, tempo ramping goals, scheduling patterns...]');
    console.log('─'.repeat(60));
    console.log('');

    console.log('📊 Handoff Stats:');
    console.log(`   Tokens saved: ${result.tokensSaved}`);
    console.log(`   Emotion preserved: ${result.preservedContext.lastEmotion}`);
    console.log(`   Topic preserved: ${result.preservedContext.lastTopic}`);

  } catch (error) {
    console.error('❌ Handoff failed:', error);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  The user sees: continuous conversation');
  console.log('  Zosia sees: rich context memory + last user message');
  console.log('  Result: seamless continuation, no "summary" acknowledged');
  console.log('═══════════════════════════════════════════════════════════════');
}

testSeamlessHandoff().catch(console.error);
