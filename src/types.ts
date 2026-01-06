/**
 * Zosia CLI Types
 * Dual-layer I/We architecture for AI companion
 */

export interface Association {
  type: 'HUNCH' | 'RECALL' | 'PULL' | 'SIGN' | 'preference' | 'teaching';
  intensity: 'strong' | 'medium' | 'faint';
  text: string;
  source?: 'pattern' | 'graphiti' | 'inference';
}

export interface GraphitiConfig {
  groupIds: {
    core: string;
    user: string;
    sessions: string;
    tasks: string;
  };
}

export interface WorkingMemory {
  lastTopic?: string;
  emotionalBaseline?: string;
  openLoops?: string[];
  continuityAnchor?: string;
}

export interface Mindstate {
  identityKernel: string;
  workingMemory: WorkingMemory;
  associations: Association[];
  situationSnapshot: string;
}

export interface Turn {
  turnId: string;
  userId: string;
  timestamp: Date;
  userMessage: string;
  response: string;
  mindstate: Mindstate;
  debug?: DebugInfo;
}

export interface DebugInfo {
  iLayer: {
    model: string;
    latencyMs: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  weLayer?: {
    activated: boolean;
    graphitiQueries?: number;
    associationsDistilled?: number;
    latencyMs?: number;
  };
  /** Context-first architecture: the brief assembled by We-Layer before I-Layer speaks */
  contextBrief?: {
    emotion: string;
    intent: string;
    depth: 'brief' | 'moderate' | 'deep';
    memoriesUsed: number;
    processingTimeMs: number;
  };
  mindstateVersion: number;
}

export interface ChatOptions {
  userId: string;
  debug?: boolean;
  stream?: boolean;
  /** Image attachments for vision models */
  images?: Array<{
    base64: string;
    mimeType: string;
    path: string;
    sizeBytes: number;
  }>;
}
