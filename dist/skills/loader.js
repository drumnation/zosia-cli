/**
 * Skill Loader
 *
 * Discovers and loads skills following the Open Agent Skills Standard.
 * Composes I-layer and We-layer prompts from enabled skills.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getSkillsConfig } from '../config.js';
const SKILLS_DIR = path.dirname(new URL(import.meta.url).pathname);
/**
 * Parse SKILL.md file with YAML frontmatter
 */
function parseSkillMd(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
        throw new Error('SKILL.md must have YAML frontmatter');
    }
    const frontmatter = yaml.load(frontmatterMatch[1]);
    const body = frontmatterMatch[2].trim();
    return { frontmatter, body };
}
/**
 * Discover all skills in the skills directory
 */
export async function discoverSkills() {
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    const skillDirs = entries
        .filter(e => e.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, e.name, 'SKILL.md')))
        .map(e => e.name);
    return skillDirs;
}
/**
 * Load a single skill by ID
 */
export async function loadSkill(skillId) {
    const skillDir = path.join(SKILLS_DIR, skillId);
    // Load SKILL.md
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) {
        console.warn(`Skill ${skillId} has no SKILL.md`);
        return null;
    }
    const skillMdContent = fs.readFileSync(skillMdPath, 'utf-8');
    const { frontmatter: manifest } = parseSkillMd(skillMdContent);
    // Load I-layer prompt (optional) - conscious.md is the clearer name
    const iLayerPath = path.join(skillDir, 'prompts', 'conscious.md');
    const iLayerPrompt = fs.existsSync(iLayerPath)
        ? fs.readFileSync(iLayerPath, 'utf-8')
        : undefined;
    // Load We-layer prompt (optional)
    const weLayerPath = path.join(skillDir, 'prompts', 'we-layer.md');
    const weLayerPrompt = fs.existsSync(weLayerPath)
        ? fs.readFileSync(weLayerPath, 'utf-8')
        : undefined;
    // Load felt vocabulary (optional)
    let feltVocabulary;
    const feltPath = path.join(skillDir, 'felt-vocabulary.ts');
    if (fs.existsSync(feltPath)) {
        try {
            const feltModule = await import(feltPath);
            // Look for named exports that match FeltVocabulary shape
            feltVocabulary = feltModule.default ||
                feltModule.feltVocabulary ||
                feltModule.temporalFeltVocabulary ||
                Object.values(feltModule).find(v => typeof v === 'object' && v !== null && 'subtle' in (Object.values(v)[0] || {}));
        }
        catch (e) {
            console.warn(`Could not load felt vocabulary for ${skillId}:`, e);
        }
    }
    return {
        id: skillId,
        manifest,
        iLayerPrompt,
        weLayerPrompt,
        feltVocabulary,
    };
}
/**
 * Check if a skill should be enabled based on manifest + user config
 */
function isSkillEnabled(skill) {
    const userConfig = getSkillsConfig();
    // User explicitly disabled → always disabled
    if (userConfig.disabled.includes(skill.id)) {
        return false;
    }
    // User explicitly enabled → always enabled
    if (userConfig.enabled.includes(skill.id)) {
        return true;
    }
    // Fall back to manifest default
    return skill.manifest.defaultEnabled;
}
/**
 * Load all enabled skills
 */
export async function loadEnabledSkills(enabledSkillIds) {
    const allSkillIds = await discoverSkills();
    // If explicit list provided, use that (for testing/debugging)
    const toLoad = enabledSkillIds ?? allSkillIds;
    const skills = [];
    for (const skillId of toLoad) {
        const skill = await loadSkill(skillId);
        if (skill) {
            // Check if it should be enabled (respects user config)
            if (enabledSkillIds || isSkillEnabled(skill)) {
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
    const skillMap = new Map(skills.map(s => [s.id, s]));
    const sorted = [];
    const visited = new Set();
    function visit(skill) {
        if (visited.has(skill.id))
            return;
        visited.add(skill.id);
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
 * Compose final prompts from enabled skills
 */
export async function composeSkillPrompts(baseILayerPrompt, baseWeLayerPrompt, enabledSkillIds) {
    const skills = await loadEnabledSkills(enabledSkillIds);
    // Compose I-layer prompt
    const iLayerFragments = skills
        .filter(s => s.iLayerPrompt)
        .map(s => `\n\n---\n\n## Skill: ${s.manifest.name}\n\n${s.iLayerPrompt}`);
    const iLayerPrompt = baseILayerPrompt + iLayerFragments.join('');
    // Compose We-layer prompt
    const weLayerFragments = skills
        .filter(s => s.weLayerPrompt)
        .map(s => `\n\n---\n\n## Skill: ${s.manifest.name}\n\n${s.weLayerPrompt}`);
    const weLayerPrompt = baseWeLayerPrompt + weLayerFragments.join('');
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
 * Get list of all available skills with their status
 */
export async function listSkills() {
    const skillIds = await discoverSkills();
    const userConfig = getSkillsConfig();
    const result = [];
    for (const skillId of skillIds) {
        const skill = await loadSkill(skillId);
        if (skill) {
            const enabled = isSkillEnabled(skill);
            const overridden = userConfig.enabled.includes(skill.id) ||
                userConfig.disabled.includes(skill.id);
            result.push({
                id: skill.id,
                name: skill.manifest.name,
                description: skill.manifest.description,
                enabled,
                defaultEnabled: skill.manifest.defaultEnabled,
                overridden,
                layers: skill.manifest.layers,
            });
        }
    }
    return result;
}
