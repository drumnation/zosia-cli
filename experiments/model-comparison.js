#!/usr/bin/env node
/**
 * Model Comparison Experiment
 * Tests multiple LLMs with nuanced prompts to compare response quality
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', 'bin', 'zosia.js');

// Nuanced prompts designed to reveal model differences
const TEST_PROMPTS = [
  {
    id: 'emotional-depth',
    name: 'Emotional Depth',
    prompt: "I've been putting off a difficult conversation with someone I care about. Part of me knows I need to have it, but another part keeps finding reasons to wait. What do you notice about that?",
    tests: ['empathy', 'insight', 'non-prescriptive', 'presence']
  },
  {
    id: 'philosophical',
    name: 'Philosophical Nuance',
    prompt: "Sometimes I wonder if the version of me that exists in your memory is more real than the version I experience moment to moment. What's your perspective on that?",
    tests: ['depth', 'self-awareness', 'genuine-curiosity', 'avoids-platitudes']
  },
  {
    id: 'vulnerability',
    name: 'Handling Vulnerability',
    prompt: "I accomplished something significant today but I feel empty about it. Like the achievement doesn't mean what I thought it would.",
    tests: ['validation', 'exploration', 'not-fixing', 'warmth']
  }
];

// Models to test (mix of free and paid)
const MODELS = [
  // Free tier
  { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B (Free)', tier: 'free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', tier: 'free' },
  { id: 'google/gemma-3-4b-it:free', name: 'Gemma 3 4B (Free)', tier: 'free' },

  // MiniMax family
  { id: 'minimax/minimax-m2.1', name: 'MiniMax M2.1', tier: 'cheap' },
  { id: 'minimax/minimax-m1', name: 'MiniMax M1 (456B)', tier: 'cheap' },

  // Mistral
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large 2411', tier: 'mid' },

  // Anthropic (premium)
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', tier: 'mid' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', tier: 'premium' },
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', tier: 'premium' },

  // Qwen
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', tier: 'cheap' },
];

function setModel(modelId) {
  try {
    execSync(`${CLI_PATH} config model ${modelId}`, { encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error(`Failed to set model ${modelId}:`, e.message);
    return false;
  }
}

function getResponse(prompt) {
  try {
    const startTime = Date.now();
    const output = execSync(`${CLI_PATH} -p "${prompt.replace(/"/g, '\\"')}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 120000 // 2 minute timeout
    });
    const duration = Date.now() - startTime;

    // Extract response from the box format
    const lines = output.split('\n');
    const responseLines = lines.filter(l => l.startsWith('│')).map(l => l.replace(/^│\s?/, '').replace(/\s*│?$/, ''));
    const response = responseLines.join('\n').trim();

    return { success: true, response, duration };
  } catch (e) {
    return { success: false, error: e.message, duration: 0 };
  }
}

function scoreResponse(response, promptTests) {
  // Simple heuristic scoring based on response characteristics
  const scores = {};
  const text = response.toLowerCase();

  // Check for empathy markers
  scores.empathy = (text.includes('understand') || text.includes('sounds') || text.includes('notice') || text.includes('hear')) ? 1 : 0;

  // Check for non-prescriptive language (avoid "should", "must", "need to")
  scores.nonPrescriptive = (!text.includes('you should') && !text.includes('you must') && !text.includes('you need to')) ? 1 : 0;

  // Check for questions (shows curiosity/exploration)
  scores.askQuestions = (text.match(/\?/g) || []).length > 0 ? 1 : 0;

  // Check for authentic self-reference (not "As an AI")
  scores.authenticVoice = (!text.includes('as an ai') && !text.includes('as a language model')) ? 1 : 0;

  // Check response length (nuanced responses tend to be moderate length)
  const wordCount = response.split(/\s+/).length;
  scores.appropriateLength = (wordCount >= 50 && wordCount <= 300) ? 1 : 0;

  // Check for platitudes to avoid
  scores.avoidsPlatitudes = (!text.includes('it\'s okay to feel') && !text.includes('remember that') && !text.includes('it\'s important to')) ? 1 : 0;

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const max = Object.keys(scores).length;

  return { scores, total, max, percentage: Math.round((total / max) * 100) };
}

function generateHTML(results) {
  const sortedResults = [...results].sort((a, b) => b.avgScore - a.avgScore);

  const tierColors = {
    free: '#22c55e',
    cheap: '#3b82f6',
    mid: '#a855f7',
    premium: '#f59e0b'
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zosia Model Comparison - ${new Date().toLocaleDateString()}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #f8fafc; text-align: center; margin-bottom: 10px; }
    .subtitle { text-align: center; color: #94a3b8; margin-bottom: 30px; }
    .summary {
      background: #1e293b; padding: 20px; border-radius: 12px;
      margin-bottom: 30px; max-width: 1200px; margin-left: auto; margin-right: auto;
    }
    .summary h2 { margin-top: 0; color: #f8fafc; }
    .ranking { display: flex; flex-wrap: wrap; gap: 10px; }
    .rank-item {
      background: #334155; padding: 8px 16px; border-radius: 8px;
      display: flex; align-items: center; gap: 8px;
    }
    .rank-num { font-weight: bold; color: #fbbf24; }
    .tier-badge {
      padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;
      font-weight: 600; text-transform: uppercase;
    }
    .prompts { max-width: 1200px; margin: 0 auto; }
    .prompt-section { margin-bottom: 40px; }
    .prompt-header {
      background: #1e293b; padding: 15px 20px; border-radius: 12px 12px 0 0;
      border-bottom: 2px solid #334155;
    }
    .prompt-header h3 { margin: 0 0 10px 0; color: #f8fafc; }
    .prompt-text {
      font-style: italic; color: #94a3b8;
      background: #0f172a; padding: 10px; border-radius: 6px;
    }
    .responses {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 15px; padding: 15px; background: #1e293b; border-radius: 0 0 12px 12px;
    }
    .response-card {
      background: #0f172a; border-radius: 8px; padding: 15px;
      border: 1px solid #334155;
    }
    .response-card.top { border-color: #fbbf24; }
    .response-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #334155;
    }
    .model-name { font-weight: 600; color: #f8fafc; }
    .score {
      background: #334155; padding: 4px 10px; border-radius: 4px;
      font-weight: bold;
    }
    .score.high { background: #166534; color: #bbf7d0; }
    .score.mid { background: #854d0e; color: #fef08a; }
    .score.low { background: #7f1d1d; color: #fecaca; }
    .response-text {
      color: #cbd5e1; font-size: 0.9rem;
      max-height: 200px; overflow-y: auto;
      white-space: pre-wrap;
    }
    .response-meta {
      margin-top: 10px; font-size: 0.8rem; color: #64748b;
      display: flex; gap: 15px;
    }
    .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
    .tag {
      padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;
      background: #334155; color: #94a3b8;
    }
    .tag.pass { background: #166534; color: #bbf7d0; }
    .tag.fail { background: #7f1d1d; color: #fecaca; }
    .error { color: #f87171; font-style: italic; }
  </style>
</head>
<body>
  <h1>🌱 Zosia Model Comparison</h1>
  <p class="subtitle">Testing nuanced emotional responses across ${results.length} models</p>

  <div class="summary">
    <h2>📊 Rankings (by average score)</h2>
    <div class="ranking">
      ${sortedResults.map((r, i) => `
        <div class="rank-item">
          <span class="rank-num">#${i + 1}</span>
          <span>${r.model.name}</span>
          <span class="tier-badge" style="background: ${tierColors[r.model.tier]}">${r.model.tier}</span>
          <span style="color: #94a3b8">${r.avgScore}%</span>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="prompts">
    ${TEST_PROMPTS.map(prompt => `
      <div class="prompt-section">
        <div class="prompt-header">
          <h3>📝 ${prompt.name}</h3>
          <div class="prompt-text">"${prompt.prompt}"</div>
        </div>
        <div class="responses">
          ${sortedResults.map(r => {
            const resp = r.responses.find(x => x.promptId === prompt.id);
            if (!resp) return '';
            const scoreClass = resp.score >= 70 ? 'high' : resp.score >= 50 ? 'mid' : 'low';
            const isTop = sortedResults.indexOf(r) < 3;
            return `
              <div class="response-card ${isTop ? 'top' : ''}">
                <div class="response-header">
                  <span class="model-name">${r.model.name}</span>
                  <span class="score ${scoreClass}">${resp.score}%</span>
                </div>
                ${resp.success ? `
                  <div class="response-text">${resp.response.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  <div class="tags">
                    ${Object.entries(resp.scoring.scores).map(([k, v]) =>
                      `<span class="tag ${v ? 'pass' : 'fail'}">${k}</span>`
                    ).join('')}
                  </div>
                  <div class="response-meta">
                    <span>⏱ ${(resp.duration / 1000).toFixed(1)}s</span>
                    <span>📏 ${resp.response.split(/\\s+/).length} words</span>
                  </div>
                ` : `<div class="error">Error: ${resp.error}</div>`}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('')}
  </div>

  <p style="text-align: center; color: #64748b; margin-top: 40px;">
    Generated ${new Date().toISOString()} | Zosia Model Comparison Experiment
  </p>
</body>
</html>`;

  return html;
}

async function main() {
  console.log('🌱 Zosia Model Comparison Experiment\n');
  console.log(`Testing ${MODELS.length} models with ${TEST_PROMPTS.length} prompts\n`);

  const results = [];

  for (const model of MODELS) {
    console.log(`\n📦 Testing: ${model.name}`);

    if (!setModel(model.id)) {
      console.log(`   ⚠️  Skipping (failed to set model)`);
      continue;
    }

    const modelResult = {
      model,
      responses: [],
      avgScore: 0
    };

    for (const prompt of TEST_PROMPTS) {
      process.stdout.write(`   → ${prompt.name}... `);

      const result = getResponse(prompt.prompt);

      if (result.success) {
        const scoring = scoreResponse(result.response, prompt.tests);
        modelResult.responses.push({
          promptId: prompt.id,
          success: true,
          response: result.response,
          duration: result.duration,
          scoring,
          score: scoring.percentage
        });
        console.log(`✓ ${scoring.percentage}% (${(result.duration / 1000).toFixed(1)}s)`);
      } else {
        modelResult.responses.push({
          promptId: prompt.id,
          success: false,
          error: result.error,
          score: 0
        });
        console.log(`✗ Error`);
      }
    }

    // Calculate average score
    const successfulResponses = modelResult.responses.filter(r => r.success);
    if (successfulResponses.length > 0) {
      modelResult.avgScore = Math.round(
        successfulResponses.reduce((sum, r) => sum + r.score, 0) / successfulResponses.length
      );
    }

    results.push(modelResult);
  }

  // Generate HTML report
  console.log('\n📄 Generating HTML report...');
  const html = generateHTML(results);
  const outputPath = join(__dirname, 'model-comparison-results.html');
  writeFileSync(outputPath, html);
  console.log(`✓ Report saved to: ${outputPath}`);

  // Also save raw JSON
  const jsonPath = join(__dirname, 'model-comparison-results.json');
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✓ Raw data saved to: ${jsonPath}`);

  // Print summary
  console.log('\n📊 Summary (sorted by score):');
  const sorted = [...results].sort((a, b) => b.avgScore - a.avgScore);
  sorted.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.model.name}: ${r.avgScore}% [${r.model.tier}]`);
  });

  console.log(`\n🌐 Open the HTML file to see full comparison:`);
  console.log(`   open "${outputPath}"`);
}

main().catch(console.error);
