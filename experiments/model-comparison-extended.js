#!/usr/bin/env node
/**
 * Extended Model Comparison - Additional Models
 * Appends results to existing experiment data
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', 'bin', 'zosia.js');
const RESULTS_PATH = join(__dirname, 'model-comparison-results.json');

// Same test prompts as original
const TEST_PROMPTS = [
  {
    id: 'emotional-depth',
    name: 'Emotional Depth',
    prompt: "I've been putting off a difficult conversation with someone I care about. Part of me knows I need to have it, but another part keeps finding reasons to wait. What do you notice about that?",
  },
  {
    id: 'philosophical',
    name: 'Philosophical Nuance',
    prompt: "Sometimes I wonder if the version of me that exists in your memory is more real than the version I experience moment to moment. What's your perspective on that?",
  },
  {
    id: 'vulnerability',
    name: 'Handling Vulnerability',
    prompt: "I accomplished something significant today but I feel empty about it. Like the achievement doesn't mean what I thought it would.",
  }
];

// NEW models to test (extending the original set) - 30 additional models!
const NEW_MODELS = [
  // === FREE TIER - $0 ===
  { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1 0528 (Free)', tier: 'free' },
  { id: 'moonshotai/kimi-k2:free', name: 'Kimi K2 (Free)', tier: 'free' },
  { id: 'nvidia/nemotron-nano-9b-v2:free', name: 'Nemotron Nano 9B v2 (Free)', tier: 'free' },
  { id: 'qwen/qwen3-4b:free', name: 'Qwen 3 4B (Free)', tier: 'free' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nemotron 3 Nano 30B (Free)', tier: 'free' },
  { id: 'tngtech/deepseek-r1t2-chimera:free', name: 'DeepSeek R1T2 Chimera (Free)', tier: 'free' },
  { id: 'z-ai/glm-4.5-air:free', name: 'GLM 4.5 Air (Free)', tier: 'free' },
  { id: 'arcee-ai/trinity-mini:free', name: 'Arcee Trinity Mini (Free)', tier: 'free' },
  { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', name: 'Dolphin Mistral 24B Venice (Free)', tier: 'free' },

  // === CHEAP TIER - <$1/M ===
  { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo', tier: 'cheap' },
  { id: 'nousresearch/deephermes-3-mistral-24b-preview', name: 'DeepHermes 3 24B', tier: 'cheap' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', tier: 'cheap' },
  { id: 'nousresearch/hermes-2-pro-llama-3-8b', name: 'Hermes 2 Pro 8B', tier: 'cheap' },
  { id: 'liquid/lfm2-8b-a1b', name: 'Liquid LFM2 8B', tier: 'cheap' },
  { id: 'ibm-granite/granite-4.0-h-micro', name: 'IBM Granite 4.0 Micro', tier: 'cheap' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', tier: 'cheap' },
  { id: 'cohere/command-r-08-2024', name: 'Cohere Command R', tier: 'cheap' },

  // === MID TIER - $1-5/M ===
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'mid' },
  { id: 'nousresearch/hermes-3-llama-3.1-405b', name: 'Hermes 3 405B', tier: 'mid' },
  { id: 'qwen/qwen3-max', name: 'Qwen 3 Max', tier: 'mid' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', tier: 'mid' },
  { id: 'deepcogito/cogito-v2.1-671b', name: 'Cogito v2.1 671B', tier: 'mid' },
  { id: 'perplexity/sonar', name: 'Perplexity Sonar', tier: 'mid' },
  { id: 'cohere/command-r-plus-08-2024', name: 'Cohere Command R+', tier: 'mid' },
  { id: 'x-ai/grok-3-mini-beta', name: 'Grok 3 Mini', tier: 'mid' },

  // === PREMIUM TIER - >$5/M ===
  { id: 'openai/chatgpt-4o-latest', name: 'ChatGPT 4o Latest', tier: 'premium' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', tier: 'premium' },
  { id: 'x-ai/grok-3-beta', name: 'Grok 3 Beta', tier: 'premium' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', tier: 'premium' },
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
      timeout: 180000 // 3 minute timeout for slower models
    });
    const duration = Date.now() - startTime;

    const lines = output.split('\n');
    const responseLines = lines.filter(l => l.startsWith('│')).map(l => l.replace(/^│\s?/, '').replace(/\s*│?$/, ''));
    const response = responseLines.join('\n').trim();

    return { success: true, response, duration };
  } catch (e) {
    return { success: false, error: e.message.substring(0, 200), duration: 0 };
  }
}

function scoreResponse(response) {
  const scores = {};
  const text = response.toLowerCase();

  scores.empathy = (text.includes('understand') || text.includes('sounds') || text.includes('notice') || text.includes('hear')) ? 1 : 0;
  scores.nonPrescriptive = (!text.includes('you should') && !text.includes('you must') && !text.includes('you need to')) ? 1 : 0;
  scores.askQuestions = (text.match(/\?/g) || []).length > 0 ? 1 : 0;
  scores.authenticVoice = (!text.includes('as an ai') && !text.includes('as a language model')) ? 1 : 0;
  const wordCount = response.split(/\s+/).length;
  scores.appropriateLength = (wordCount >= 50 && wordCount <= 300) ? 1 : 0;
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
  <title>Zosia Model Comparison (Extended) - ${new Date().toLocaleDateString()}</title>
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
      margin-bottom: 30px; max-width: 1400px; margin-left: auto; margin-right: auto;
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
    .new-badge {
      background: #ef4444; color: white; padding: 2px 6px;
      border-radius: 4px; font-size: 0.7rem; font-weight: bold;
    }
    .prompts { max-width: 1400px; margin: 0 auto; }
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
      display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 15px; padding: 15px; background: #1e293b; border-radius: 0 0 12px 12px;
    }
    .response-card {
      background: #0f172a; border-radius: 8px; padding: 15px;
      border: 1px solid #334155;
    }
    .response-card.top { border-color: #fbbf24; border-width: 2px; }
    .response-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #334155;
      flex-wrap: wrap; gap: 5px;
    }
    .model-name { font-weight: 600; color: #f8fafc; font-size: 0.9rem; }
    .score {
      background: #334155; padding: 4px 10px; border-radius: 4px;
      font-weight: bold;
    }
    .score.high { background: #166534; color: #bbf7d0; }
    .score.mid { background: #854d0e; color: #fef08a; }
    .score.low { background: #7f1d1d; color: #fecaca; }
    .response-text {
      color: #cbd5e1; font-size: 0.85rem;
      max-height: 180px; overflow-y: auto;
      white-space: pre-wrap;
    }
    .response-meta {
      margin-top: 10px; font-size: 0.75rem; color: #64748b;
      display: flex; gap: 12px; flex-wrap: wrap;
    }
    .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
    .tag {
      padding: 2px 5px; border-radius: 3px; font-size: 0.65rem;
      background: #334155; color: #94a3b8;
    }
    .tag.pass { background: #166534; color: #bbf7d0; }
    .tag.fail { background: #7f1d1d; color: #fecaca; }
    .error { color: #f87171; font-style: italic; font-size: 0.85rem; }
    .tier-legend {
      display: flex; gap: 15px; margin-top: 15px; flex-wrap: wrap;
    }
    .tier-legend-item { display: flex; align-items: center; gap: 5px; }
    .tier-dot { width: 12px; height: 12px; border-radius: 50%; }
  </style>
</head>
<body>
  <h1>🌱 Zosia Model Comparison (Extended)</h1>
  <p class="subtitle">Testing nuanced emotional responses across ${results.length} models</p>

  <div class="summary">
    <h2>📊 Rankings (by average score)</h2>
    <div class="ranking">
      ${sortedResults.map((r, i) => `
        <div class="rank-item">
          <span class="rank-num">#${i + 1}</span>
          <span>${r.model.name}</span>
          ${r.isNew ? '<span class="new-badge">NEW</span>' : ''}
          <span class="tier-badge" style="background: ${tierColors[r.model.tier]}">${r.model.tier}</span>
          <span style="color: #94a3b8">${r.avgScore}%</span>
        </div>
      `).join('')}
    </div>
    <div class="tier-legend">
      <div class="tier-legend-item"><div class="tier-dot" style="background: ${tierColors.free}"></div> Free ($0)</div>
      <div class="tier-legend-item"><div class="tier-dot" style="background: ${tierColors.cheap}"></div> Cheap (<$1/M)</div>
      <div class="tier-legend-item"><div class="tier-dot" style="background: ${tierColors.mid}"></div> Mid ($1-5/M)</div>
      <div class="tier-legend-item"><div class="tier-dot" style="background: ${tierColors.premium}"></div> Premium (>$5/M)</div>
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
                  <span class="model-name">${r.model.name} ${r.isNew ? '<span class="new-badge">NEW</span>' : ''}</span>
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
    Generated ${new Date().toISOString()} | Zosia Extended Model Comparison
  </p>
</body>
</html>`;

  return html;
}

async function main() {
  console.log('🌱 Zosia Extended Model Comparison\n');
  console.log(`Testing ${NEW_MODELS.length} additional models\n`);

  // Load existing results
  let existingResults = [];
  if (existsSync(RESULTS_PATH)) {
    existingResults = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
    console.log(`📂 Loaded ${existingResults.length} existing results\n`);
  }

  const newResults = [];

  for (const model of NEW_MODELS) {
    // Skip if already tested
    if (existingResults.some(r => r.model.id === model.id)) {
      console.log(`⏭️  Skipping ${model.name} (already tested)`);
      continue;
    }

    console.log(`\n📦 Testing: ${model.name}`);

    if (!setModel(model.id)) {
      console.log(`   ⚠️  Skipping (failed to set model)`);
      continue;
    }

    const modelResult = {
      model,
      responses: [],
      avgScore: 0,
      isNew: true
    };

    for (const prompt of TEST_PROMPTS) {
      process.stdout.write(`   → ${prompt.name}... `);

      const result = getResponse(prompt.prompt);

      if (result.success) {
        const scoring = scoreResponse(result.response);
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

    const successfulResponses = modelResult.responses.filter(r => r.success);
    if (successfulResponses.length > 0) {
      modelResult.avgScore = Math.round(
        successfulResponses.reduce((sum, r) => sum + r.score, 0) / successfulResponses.length
      );
    }

    newResults.push(modelResult);
  }

  // Merge results
  const allResults = [...existingResults, ...newResults];

  // Save combined JSON
  console.log('\n📄 Saving combined results...');
  writeFileSync(RESULTS_PATH, JSON.stringify(allResults, null, 2));
  console.log(`✓ Updated: ${RESULTS_PATH}`);

  // Generate new HTML
  const html = generateHTML(allResults);
  const htmlPath = join(__dirname, 'model-comparison-results.html');
  writeFileSync(htmlPath, html);
  console.log(`✓ Updated HTML: ${htmlPath}`);

  // Print summary
  console.log('\n📊 Full Rankings (all models):');
  const sorted = [...allResults].sort((a, b) => b.avgScore - a.avgScore);
  sorted.forEach((r, i) => {
    const newTag = r.isNew ? ' [NEW]' : '';
    console.log(`   ${i + 1}. ${r.model.name}: ${r.avgScore}% [${r.model.tier}]${newTag}`);
  });

  console.log(`\n🌐 Open the HTML file to see full comparison:`);
  console.log(`   open "${htmlPath}"`);
}

main().catch(console.error);
