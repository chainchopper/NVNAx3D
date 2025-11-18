export type ComfyUIMediaType = 'image' | 'video' | 'audio';

export interface ComfyUIWorkflowConfig {
  id: string;
  name: string;
  mediaType: ComfyUIMediaType;
  description?: string;
  workflowJSON: any;
  requiredInputs: string[];
  outputNodes: string[];
}

export interface ComfyUISettings {
  baseURL: string;
  authToken?: string;
  defaultWorkflows: {
    image?: string;
    video?: string;
    audio?: string;
  };
  enabled: boolean;
}

export interface ComfyUIJobRequest {
  workflowId: string;
  inputs: Record<string, any>;
  priority?: number;
}

export interface ComfyUIJobStatus {
  promptId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  outputs?: ComfyUIOutput[];
}

export interface ComfyUIOutput {
  nodeId: string;
  type: ComfyUIMediaType;
  filename: string;
  url: string;
  subfolder?: string;
}

export interface ComfyUIQueueResponse {
  prompt_id: string;
  number: number;
}

export interface ComfyUIHistoryItem {
  prompt: any[];
  outputs: Record<string, {
    images?: Array<{ filename: string; subfolder: string; type: string }>;
    videos?: Array<{ filename: string; subfolder: string; type: string }>;
    audio?: Array<{ filename: string; subfolder: string; type: string }>;
  }>;
  status: {
    status_str: string;
    completed: boolean;
    messages?: any[];
  };
}
