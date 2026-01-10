/**
 * Mind Skill Loader
 *
 * Composes I-layer and We-layer prompts from enabled mind skills.
 * This is where the modular mind architecture becomes runtime reality.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
const MIND_SKILLS_DIR = path.dirname(new URL(import.meta.url).pathname);
/**
 * Discover all mind skills in the mind-skills directory
 */
export async function discoverMindSkills() {
    const entries = fs.readdirSync(MIND_SKILLS_DIR, { withFileTypes: true });
    const skillDirs = entries
        .filter(e => e.isDirectory() && fs.existsSync(path.join(MIND_SKILLS_DIR, e.name, 'manifest.yaml')))
        .map(e => e.name);
    return skillDirs;
}
/**
 * Load a single mind skill by ID
 */
export async function loadMindSkill(skillId) {
    const skillDir = path.join(MIND_SKILLS_DIR, skillId);
    // Load manifest
    const manifestPath = path.join(skillDir, 'manifest.yaml');
    if (!fs.existsSync(manifestPath)) {
        console.warn(`Mind skill ${skillId} has no manifest.yaml`);
        return null;
    }
    const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = yaml.load(manifestRaw);
    // Load conscious prompt (optional)
    const consciousPath = path.join(skillDir, 'conscious.prompt.md');
    const consciousPrompt = fs.existsSync(consciousPath)
        ? fs.readFileSync(consciousPath, 'utf-8')
        : undefined;
    // Load subconscious prompt (optional)
    const subconsciousPath = path.join(skillDir, 'subconscious.prompt.md');
    const subconsciousPrompt = fs.existsSync(subconsciousPath)
        ? fs.readFileSync(subconsciousPath, 'utf-8')
        : undefined;
    // Load felt vocabulary (optional)
    let feltVocabulary;
    const feltPath = path.join(skillDir, 'felt-vocabulary.ts');
    if (fs.existsSync(feltPath)) {
        try {
            // Dynamic import for the vocabulary module
            const feltModule = await import(feltPath);
            feltVocabulary = feltModule.default || feltModule.feltVocabulary;
        }
        catch (e) {
            console.warn(`Could not load felt vocabulary for ${skillId}:`, e);
        }
    }
    return {
        manifest,
        consciousPrompt,
        subconsciousPrompt,
        feltVocabulary,
    };
}
/**
 * Load all enabled mind skills
 */
export async function loadEnabledMindSkills(enabledSkillIds) {
    const allSkillIds = await discoverMindSkills();
    // If no specific list, use all with defaultEnabled: true
    const toLoad = enabledSkillIds ?? allSkillIds;
    const skills = [];
    for (const skillId of toLoad) {
        const skill = await loadMindSkill(skillId);
        if (skill) {
            // Check if it should be enabled
            if (enabledSkillIds || skill.manifest.defaultEnabled) {
                skills.push(skill);
            }
        }
    }
    // Sort by dependencies (simple topological sort)
    return sortByDependencies(skills);
}
/**
 * Simple dependency sort
 */
function sortByDependencies(skills) {
    const skillMap = new Map(skills.map(s => [s.manifest.id, s]));
    const sorted = [];
    const visited = new Set();
    function visit(skill) {
        if (visited.has(skill.manifest.id))
            return;
        visited.add(skill.manifest.id);
        // Visit dependencies first
        for (const depId of skill.manifest.dependencies ?? []) {
            const dep = skillMap.get(depId);
            if (dep)
                visit(dep);
        }
        sorted.push(skill);
    }
    for (const skill of skills) {
        visit(skill);
    }
    return sorted;
}
/**
 * Compose final prompts from enabled mind skills
 */
export async function composeMindSkillPrompts(baseILayerPrompt, baseWeLayerPrompt, enabledSkillIds) {
    const skills = await loadEnabledMindSkills(enabledSkillIds);
    // Compose I-layer prompt
    const consciousFragments = skills
        .filter(s => s.consciousPrompt)
        .map(s => `\n\n---\n\n## Mind Skill: ${s.manifest.name}\n\n${s.consciousPrompt}`);
    const iLayerPrompt = baseILayerPrompt + consciousFragments.join('');
    // Compose We-layer prompt
    const subconsciousFragments = skills
        .filter(s => s.subconsciousPrompt)
        .map(s => `\n\n---\n\n## Mind Skill: ${s.manifest.name}\n\n${s.subconsciousPrompt}`);
    const weLayerPrompt = baseWeLayerPrompt + subconsciousFragments.join('');
    // Merge felt vocabularies
    const feltVocabulary = {};
    for (const skill of skills) {
        if (skill.feltVocabulary) {
            Object.assign(feltVocabulary, skill.feltVocabulary);
        }
    }
    return {
        iLayerPrompt,
        weLayerPrompt,
        feltVocabulary,
    };
}
/**
 * Get list of all available mind skills with their status
 */
export async function listMindSkills() {
    const skillIds = await discoverMindSkills();
    const result = [];
    for (const skillId of skillIds) {
        const skill = await loadMindSkill(skillId);
        if (skill) {
            result.push({
                id: skill.manifest.id,
                name: skill.manifest.name,
                description: skill.manifest.description,
                enabled: skill.manifest.defaultEnabled,
                layers: skill.manifest.layers,
            });
        }
    }
    return result;
}
