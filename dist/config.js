import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULT_CONSCIOUS_MODEL, validateOpenRouterKey, fetchOpenRouterModels, } from './model-service.js';
// Lazy import to avoid circular dependency
let resetEmbeddingServiceFn = null;
async function getResetEmbeddingService() {
    if (!resetEmbeddingServiceFn) {
        const { resetEmbeddingService } = await import('./embedding-client.js');
        resetEmbeddingServiceFn = resetEmbeddingService;
    }
    return resetEmbeddingServiceFn;
}
const CONFIG_DIR = path.join(os.homedir(), '.zosia');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
function debugLog(message) {
    if (process.env.ZOSIA_DEBUG) {
        console.log(`[CONFIG] ${message}`);
    }
}
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
        debugLog(`Created config directory: ${CONFIG_DIR}`);
    }
}
function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 10) {
        return 'sk-...';
    }
    return `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}
/**
 * Create default config with all fields initialized
 */
function createDefaultConfig() {
    return {
        // Embedding
        preferredEmbeddingProvider: 'jina',
        autoFallbackEnabled: true,
        // Conscious mind
        consciousMind: {
            model: DEFAULT_CONSCIOUS_MODEL,
            temperature: 0.8,
            maxTokens: 1024,
        },
        // Cost tracking
        costTracking: {
            enabled: true,
            totalEmbeddingTokens: 0,
            totalEmbeddingCostUsd: 0,
            embeddingsByProvider: {
                jina: { tokens: 0, cost: 0 },
                openai: { tokens: 0, cost: 0 },
            },
            totalLlmInputTokens: 0,
            totalLlmOutputTokens: 0,
            totalLlmCostUsd: 0,
            llmCostsByModel: {},
            lastReset: new Date().toISOString(),
            sessionCount: 0,
        },
    };
}
export function loadConfig() {
    const defaults = createDefaultConfig();
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            debugLog('Config file not found, returning defaults');
            return defaults;
        }
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const stored = JSON.parse(data);
        // Merge with defaults to ensure all fields exist
        const config = {
            ...defaults,
            ...stored,
            // Deep merge nested objects
            consciousMind: { ...defaults.consciousMind, ...stored.consciousMind },
            costTracking: {
                ...defaults.costTracking,
                ...stored.costTracking,
                embeddingsByProvider: {
                    ...defaults.costTracking.embeddingsByProvider,
                    ...stored.costTracking?.embeddingsByProvider,
                },
            },
        };
        debugLog(`Config loaded: provider=${config.preferredEmbeddingProvider}, model=${config.consciousMind.model}`);
        return config;
    }
    catch (error) {
        debugLog(`Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return defaults;
    }
}
export function saveConfig(config) {
    try {
        ensureConfigDir();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        debugLog('Config saved successfully');
    }
    catch (error) {
        debugLog(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}
export function getPreferredProvider() {
    const config = loadConfig();
    return config.preferredEmbeddingProvider;
}
export async function setPreferredProvider(provider) {
    const config = loadConfig();
    config.preferredEmbeddingProvider = provider;
    saveConfig(config);
    debugLog(`Preferred provider set to: ${provider}`);
    // Reset embedding service to pick up new config
    const resetFn = await getResetEmbeddingService();
    resetFn();
}
export async function validateOpenAIKey(apiKey) {
    try {
        debugLog('Validating OpenAI API key...');
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        if (response.ok) {
            debugLog('OpenAI API key is valid');
            return true;
        }
        else {
            const error = await response.json();
            debugLog(`OpenAI API key validation failed: ${error.error?.message || 'Unknown error'}`);
            return false;
        }
    }
    catch (error) {
        debugLog(`OpenAI API key validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return false;
    }
}
export async function setOpenAIKey(apiKey) {
    if (!apiKey.startsWith('sk-')) {
        debugLog('Invalid OpenAI API key format');
        return false;
    }
    const isValid = await validateOpenAIKey(apiKey);
    if (!isValid) {
        debugLog('OpenAI API key validation failed');
        return false;
    }
    const config = loadConfig();
    config.openaiApiKey = apiKey;
    config.openaiKeyValid = true;
    config.openaiKeyValidatedAt = new Date().toISOString();
    // If setting OpenAI key and provider is still jina, switch to openai
    if (config.preferredEmbeddingProvider === 'jina') {
        config.preferredEmbeddingProvider = 'openai';
    }
    saveConfig(config);
    debugLog(`OpenAI API key saved: ${maskApiKey(apiKey)}`);
    // Reset embedding service to pick up new config
    const resetFn = await getResetEmbeddingService();
    resetFn();
    return true;
}
export async function clearOpenAIKey() {
    const config = loadConfig();
    delete config.openaiApiKey;
    delete config.openaiKeyValid;
    delete config.openaiKeyValidatedAt;
    // If clearing OpenAI key and provider is openai, switch to jina
    if (config.preferredEmbeddingProvider === 'openai') {
        config.preferredEmbeddingProvider = 'jina';
    }
    saveConfig(config);
    debugLog('OpenAI API key cleared');
    // Reset embedding service to pick up new config
    const resetFn = await getResetEmbeddingService();
    resetFn();
}
export function getEmbeddingServiceConfig() {
    const config = loadConfig();
    return {
        preferredProvider: config.preferredEmbeddingProvider,
        fallbackOrder: ['jina', 'openai'],
        autoFallback: config.autoFallbackEnabled,
        providers: {
            jina: {
                type: 'jina',
                enabled: true,
                model: 'jina-embeddings-v3',
                dimensions: 1024,
                task: 'retrieval.passage',
                maxTokensPerRequest: 8192,
                rateLimitPerMinute: 500,
            },
            openai: {
                type: 'openai',
                enabled: !!config.openaiApiKey && config.openaiKeyValid === true,
                apiKey: config.openaiApiKey,
                model: 'text-embedding-3-small',
                dimensions: 1536,
                maxTokensPerRequest: 8191,
                rateLimitPerMinute: 3000,
            },
        },
    };
}
export function getConfigSummary() {
    const config = loadConfig();
    const hasOpenAIKey = !!config.openaiApiKey;
    const hasOpenRouterKey = !!config.openrouterApiKey;
    const openaiStatus = config.openaiKeyValid ? 'valid' : 'invalid';
    const openrouterStatus = config.openrouterKeyValid ? 'valid' : 'invalid';
    const lines = [
        '═══ Embedding ═══',
        `Provider: ${config.preferredEmbeddingProvider}`,
        `OpenAI Key: ${hasOpenAIKey ? `${maskApiKey(config.openaiApiKey)} (${openaiStatus})` : 'not set'}`,
        `Auto-fallback: ${config.autoFallbackEnabled ? 'enabled' : 'disabled'}`,
        '',
        '═══ Conscious Mind ═══',
        `OpenRouter Key: ${hasOpenRouterKey ? `${maskApiKey(config.openrouterApiKey)} (${openrouterStatus})` : 'using env'}`,
        `Model: ${config.consciousMind.model}`,
        `Temperature: ${config.consciousMind.temperature}`,
        `Max Tokens: ${config.consciousMind.maxTokens}`,
        '',
        '═══ Cost Tracking ═══',
        `Enabled: ${config.costTracking.enabled ? 'yes' : 'no'}`,
        `Embedding: ${config.costTracking.totalEmbeddingTokens.toLocaleString()} tokens ($${config.costTracking.totalEmbeddingCostUsd.toFixed(4)})`,
        `LLM: ${(config.costTracking.totalLlmInputTokens + config.costTracking.totalLlmOutputTokens).toLocaleString()} tokens ($${config.costTracking.totalLlmCostUsd.toFixed(4)})`,
        `Sessions: ${config.costTracking.sessionCount}`,
        `Last Reset: ${new Date(config.costTracking.lastReset).toLocaleDateString()}`,
    ];
    if (config.customPrompts?.conscious || config.customPrompts?.subconscious) {
        lines.push('');
        lines.push('═══ Custom Prompts ═══');
        if (config.customPrompts.conscious)
            lines.push('• Custom conscious prompt set');
        if (config.customPrompts.subconscious)
            lines.push('• Custom subconscious prompt set');
        if (config.customPrompts.identityKernel)
            lines.push('• Custom identity kernel set');
    }
    return lines.join('\n');
}
// ═══════════════════════════════════════════════════════════════════════════
// OpenRouter Key Management
// ═══════════════════════════════════════════════════════════════════════════
export async function setOpenRouterKey(apiKey) {
    if (!apiKey.startsWith('sk-or-')) {
        debugLog('Invalid OpenRouter API key format (should start with sk-or-)');
        return false;
    }
    const isValid = await validateOpenRouterKey(apiKey);
    if (!isValid) {
        debugLog('OpenRouter API key validation failed');
        return false;
    }
    const config = loadConfig();
    config.openrouterApiKey = apiKey;
    config.openrouterKeyValid = true;
    config.openrouterKeyValidatedAt = new Date().toISOString();
    saveConfig(config);
    debugLog(`OpenRouter API key saved: ${maskApiKey(apiKey)}`);
    return true;
}
export async function clearOpenRouterKey() {
    const config = loadConfig();
    delete config.openrouterApiKey;
    delete config.openrouterKeyValid;
    delete config.openrouterKeyValidatedAt;
    saveConfig(config);
    debugLog('OpenRouter API key cleared');
}
export function getOpenRouterKey() {
    const config = loadConfig();
    // Check config first, fall back to env
    return config.openrouterApiKey || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
}
// ═══════════════════════════════════════════════════════════════════════════
// Conscious Mind Model Selection
// ═══════════════════════════════════════════════════════════════════════════
export function getConsciousMindConfig() {
    const config = loadConfig();
    return config.consciousMind;
}
export async function setConsciousMindModel(model) {
    const config = loadConfig();
    config.consciousMind.model = model;
    saveConfig(config);
    debugLog(`Conscious mind model set to: ${model}`);
}
export async function setConsciousMindTemperature(temperature) {
    if (temperature < 0 || temperature > 2) {
        throw new Error('Temperature must be between 0 and 2');
    }
    const config = loadConfig();
    config.consciousMind.temperature = temperature;
    saveConfig(config);
    debugLog(`Conscious mind temperature set to: ${temperature}`);
}
export async function setConsciousMindMaxTokens(maxTokens) {
    if (maxTokens < 1 || maxTokens > 32000) {
        throw new Error('Max tokens must be between 1 and 32000');
    }
    const config = loadConfig();
    config.consciousMind.maxTokens = maxTokens;
    saveConfig(config);
    debugLog(`Conscious mind max tokens set to: ${maxTokens}`);
}
// ═══════════════════════════════════════════════════════════════════════════
// Custom Prompts
// ═══════════════════════════════════════════════════════════════════════════
export function getCustomPrompts() {
    const config = loadConfig();
    return config.customPrompts;
}
export async function setCustomPrompt(type, prompt) {
    const config = loadConfig();
    if (!config.customPrompts) {
        config.customPrompts = {};
    }
    config.customPrompts[type] = prompt;
    saveConfig(config);
    debugLog(`Custom ${type} prompt saved (${prompt.length} chars)`);
}
export async function clearCustomPrompt(type) {
    const config = loadConfig();
    if (config.customPrompts) {
        delete config.customPrompts[type];
        if (Object.keys(config.customPrompts).length === 0) {
            delete config.customPrompts;
        }
        saveConfig(config);
    }
    debugLog(`Custom ${type} prompt cleared`);
}
export async function clearAllCustomPrompts() {
    const config = loadConfig();
    delete config.customPrompts;
    saveConfig(config);
    debugLog('All custom prompts cleared');
}
// ═══════════════════════════════════════════════════════════════════════════
// Handoff Settings
// ═══════════════════════════════════════════════════════════════════════════
const DEFAULT_HANDOFF_THRESHOLD = 80;
export function getHandoffSettings() {
    const config = loadConfig();
    return config.handoffSettings ?? {
        threshold: DEFAULT_HANDOFF_THRESHOLD,
        enabled: true,
    };
}
export async function setHandoffPrompt(prompt) {
    const config = loadConfig();
    config.handoffSettings = {
        ...getHandoffSettings(),
        prompt,
    };
    saveConfig(config);
    debugLog(`Handoff prompt saved (${prompt.length} chars)`);
}
export async function clearHandoffPrompt() {
    const config = loadConfig();
    if (config.handoffSettings) {
        delete config.handoffSettings.prompt;
    }
    saveConfig(config);
    debugLog('Handoff prompt cleared (reset to default)');
}
export async function setHandoffThreshold(threshold) {
    if (threshold < 0 || threshold > 100) {
        throw new Error('Threshold must be between 0 and 100');
    }
    const config = loadConfig();
    config.handoffSettings = {
        ...getHandoffSettings(),
        threshold,
    };
    saveConfig(config);
    debugLog(`Handoff threshold set to: ${threshold}%`);
}
export async function setHandoffEnabled(enabled) {
    const config = loadConfig();
    config.handoffSettings = {
        ...getHandoffSettings(),
        enabled,
    };
    saveConfig(config);
    debugLog(`Handoff ${enabled ? 'enabled' : 'disabled'}`);
}
// ═══════════════════════════════════════════════════════════════════════════
// Cost Tracking
// ═══════════════════════════════════════════════════════════════════════════
export function getCostTracking() {
    const config = loadConfig();
    return config.costTracking;
}
export function setCostTrackingEnabled(enabled) {
    const config = loadConfig();
    config.costTracking.enabled = enabled;
    saveConfig(config);
    debugLog(`Cost tracking ${enabled ? 'enabled' : 'disabled'}`);
}
export function trackEmbeddingUsage(provider, tokens, cost) {
    const config = loadConfig();
    if (!config.costTracking.enabled)
        return;
    config.costTracking.totalEmbeddingTokens += tokens;
    config.costTracking.totalEmbeddingCostUsd += cost;
    config.costTracking.embeddingsByProvider[provider].tokens += tokens;
    config.costTracking.embeddingsByProvider[provider].cost += cost;
    saveConfig(config);
}
export function trackLlmUsage(model, inputTokens, outputTokens, cost) {
    const config = loadConfig();
    if (!config.costTracking.enabled)
        return;
    config.costTracking.totalLlmInputTokens += inputTokens;
    config.costTracking.totalLlmOutputTokens += outputTokens;
    config.costTracking.totalLlmCostUsd += cost;
    if (!config.costTracking.llmCostsByModel[model]) {
        config.costTracking.llmCostsByModel[model] = { inputTokens: 0, outputTokens: 0, cost: 0 };
    }
    config.costTracking.llmCostsByModel[model].inputTokens += inputTokens;
    config.costTracking.llmCostsByModel[model].outputTokens += outputTokens;
    config.costTracking.llmCostsByModel[model].cost += cost;
    saveConfig(config);
}
export function incrementSessionCount() {
    const config = loadConfig();
    config.costTracking.sessionCount += 1;
    saveConfig(config);
}
export function resetCostTracking() {
    const config = loadConfig();
    config.costTracking = {
        enabled: config.costTracking.enabled,
        totalEmbeddingTokens: 0,
        totalEmbeddingCostUsd: 0,
        embeddingsByProvider: {
            jina: { tokens: 0, cost: 0 },
            openai: { tokens: 0, cost: 0 },
        },
        totalLlmInputTokens: 0,
        totalLlmOutputTokens: 0,
        totalLlmCostUsd: 0,
        llmCostsByModel: {},
        lastReset: new Date().toISOString(),
        sessionCount: 0,
    };
    saveConfig(config);
    debugLog('Cost tracking reset');
}
// ═══════════════════════════════════════════════════════════════════════════
// Model Cache Management
// ═══════════════════════════════════════════════════════════════════════════
const MODEL_CACHE_TTL_HOURS = 24;
export async function getCachedModels() {
    const config = loadConfig();
    const cache = config.modelCache?.openrouter;
    if (cache) {
        const age = Date.now() - new Date(cache.fetchedAt).getTime();
        const ttlMs = (cache.ttlHours || MODEL_CACHE_TTL_HOURS) * 60 * 60 * 1000;
        if (age < ttlMs) {
            debugLog(`Using cached models (${cache.models.length} models, ${Math.round(age / 1000 / 60)} min old)`);
            return cache.models;
        }
    }
    // Cache expired or doesn't exist - fetch fresh
    const apiKey = getOpenRouterKey();
    const models = await fetchOpenRouterModels(apiKey, { debug: process.env.ZOSIA_DEBUG === 'true' });
    if (models.length > 0) {
        const newConfig = loadConfig();
        newConfig.modelCache = {
            ...newConfig.modelCache,
            openrouter: {
                models,
                fetchedAt: new Date().toISOString(),
                ttlHours: MODEL_CACHE_TTL_HOURS,
            },
        };
        saveConfig(newConfig);
        debugLog(`Model cache updated with ${models.length} models`);
    }
    return models;
}
export function clearModelCache() {
    const config = loadConfig();
    delete config.modelCache;
    saveConfig(config);
    debugLog('Model cache cleared');
}
// ═══════════════════════════════════════════════════════════════════════════
// Reset to Defaults
// ═══════════════════════════════════════════════════════════════════════════
export function resetToDefaults() {
    const defaults = createDefaultConfig();
    // Preserve API keys if they exist
    const config = loadConfig();
    if (config.openaiApiKey) {
        defaults.openaiApiKey = config.openaiApiKey;
        defaults.openaiKeyValid = config.openaiKeyValid;
        defaults.openaiKeyValidatedAt = config.openaiKeyValidatedAt;
    }
    if (config.openrouterApiKey) {
        defaults.openrouterApiKey = config.openrouterApiKey;
        defaults.openrouterKeyValid = config.openrouterKeyValid;
        defaults.openrouterKeyValidatedAt = config.openrouterKeyValidatedAt;
    }
    saveConfig(defaults);
    debugLog('Config reset to defaults (API keys preserved)');
    // Reset embedding service to pick up new config
    getResetEmbeddingService().then((fn) => fn());
}
