#!/usr/bin/env npx tsx
/**
 * Manual test script for context handoff
 *
 * This simulates a long conversation and triggers the handoff mechanism
 * to verify the LLM is called correctly.
 */

import {
  createHandoffSummary,
  getHandoffConfig,
  setHandoffThreshold,
  type ConversationContext,
} from '../src/context-handoff.js';

// Simulate a long conversation
const longConversation: ConversationContext = {
  messages: [
    { role: 'user', content: 'Hey Zosia, I\'ve been thinking about building a new project management tool.' },
    { role: 'assistant', content: 'That sounds exciting! Tell me more about what you\'re envisioning. What problems are you trying to solve that existing tools don\'t address well?' },
    { role: 'user', content: 'Well, the main thing is that most PM tools are designed for teams, but I work solo a lot. I need something that helps me stay motivated and see my progress across multiple personal projects.' },
    { role: 'assistant', content: 'I love that perspective. Solo developers often get overlooked by the big PM tools. The motivation aspect is really interesting - you want something that celebrates your wins and keeps you engaged, not just tracks tasks. What kind of projects are you usually working on?' },
    { role: 'user', content: 'Mostly side projects - apps, games, creative coding experiments. The problem is I start a lot of things and then lose steam. I want to see what I\'ve accomplished, not just what\'s left to do.' },
    { role: 'assistant', content: 'That resonates deeply. The "accomplishment feed" concept could be powerful - showing you screenshots, commits, milestones achieved rather than just a backlog of todos. It\'s about shifting from anxiety-driven development to celebration-driven development.' },
    { role: 'user', content: 'Exactly! And I want it to understand my projects deeply - like know what tech stack I\'m using, how far along I am, whether the tests are passing.' },
    { role: 'assistant', content: 'So a tool that actually analyzes your projects, not just stores metadata you enter. It could scan your repos, understand your architecture, track your quality metrics. That\'s much more valuable than manual status updates.' },
    { role: 'user', content: 'Yes! And maybe it could even give me suggestions like "Hey, you haven\'t touched Project X in a while, but you\'re 80% done - maybe finish it?"' },
    { role: 'assistant', content: 'That\'s brilliant - proactive motivation based on actual project state. It could notice patterns too, like "You tend to abandon projects in the middle - here\'s one that\'s close to done." The tool becomes a supportive companion, not just a tracker.' },
    { role: 'user', content: 'I\'m thinking of calling it PM Agent. It would be an Electron app so it can access my local filesystem and analyze projects.' },
    { role: 'assistant', content: 'PM Agent is a great name - it captures the autonomous, helpful nature of what you\'re building. Electron makes sense for the local access. You could have it running in the background, periodically scanning and updating project health scores.' },
    { role: 'user', content: 'Should I use SQLite for the database? I want it to be fast and not require any external services.' },
    { role: 'assistant', content: 'SQLite is perfect for this use case. It\'s embedded, fast, and handles the kind of structured data you\'ll have (projects, scans, metrics, todos) really well. Plus it\'s just a file, so backups and portability are trivial.' },
    { role: 'user', content: 'Great, I think I have a clear vision now. Thanks for helping me think through this!' },
    { role: 'assistant', content: 'You\'re welcome! I\'m genuinely excited about PM Agent. The focus on solo developer motivation and deep project understanding sets it apart. I\'d love to hear how it develops. Remember - you\'re building something that solves a real problem you face, and that\'s the best kind of project.' },
  ],
  currentEmotion: 'excited',
  currentTopic: 'building PM Agent - a solo developer project management tool',
  tokenCount: 3500, // Simulated token count
};

async function testHandoff() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CONTEXT HANDOFF TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Show current config
  const config = getHandoffConfig();
  console.log('📋 Current Handoff Config:');
  console.log(`   Enabled: ${config.enabled}`);
  console.log(`   Threshold: ${config.threshold}%`);
  console.log(`   Prompt: ${config.prompt.slice(0, 80)}...`);
  console.log('');

  // Show conversation stats
  console.log('💬 Simulated Conversation:');
  console.log(`   Messages: ${longConversation.messages.length}`);
  console.log(`   Emotion: ${longConversation.currentEmotion}`);
  console.log(`   Topic: ${longConversation.currentTopic}`);
  console.log(`   Token Count: ${longConversation.tokenCount}`);
  console.log('');

  console.log('🔄 Triggering handoff...\n');

  const startTime = Date.now();

  try {
    const result = await createHandoffSummary(longConversation);
    const elapsed = Date.now() - startTime;

    console.log('✅ Handoff Complete!\n');
    console.log('📝 Summary Generated:');
    console.log('─'.repeat(60));
    console.log(result.summary);
    console.log('─'.repeat(60));
    console.log('');
    console.log('📊 Results:');
    console.log(`   Tokens Saved: ${result.tokensSaved}`);
    console.log(`   Time: ${elapsed}ms`);
    console.log(`   Last Emotion: ${result.preservedContext.lastEmotion}`);
    console.log(`   Last Topic: ${result.preservedContext.lastTopic}`);
    console.log(`   Key Points: ${result.preservedContext.keyPoints.length}`);

    if (result.preservedContext.keyPoints.length > 0) {
      console.log('');
      console.log('🔑 Key Points Extracted:');
      result.preservedContext.keyPoints.forEach((point, i) => {
        console.log(`   ${i + 1}. ${point.slice(0, 60)}...`);
      });
    }

  } catch (error) {
    console.error('❌ Handoff Failed:', error);
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
}

testHandoff().catch(console.error);
