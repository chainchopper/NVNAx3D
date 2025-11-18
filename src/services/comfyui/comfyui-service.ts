import type {
  ComfyUISettings,
  ComfyUIJobRequest,
  ComfyUIJobStatus,
  ComfyUIQueueResponse,
  ComfyUIHistoryItem,
  ComfyUIOutput,
  ComfyUIMediaType
} from '../../types/comfyui';
import { comfyUIWorkflowRegistry } from './comfyui-workflow-registry';

class ComfyUIService {
  private settings: ComfyUISettings = {
    baseURL: '',
    enabled: false,
    defaultWorkflows: {}
  };

  private pollingIntervals: Map<string, number> = new Map();

  initialize(): void {
    this.loadSettings();
    comfyUIWorkflowRegistry.loadWorkflows();
  }

  updateSettings(settings: Partial<ComfyUISettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.persistSettings();
  }

  getSettings(): ComfyUISettings {
    return { ...this.settings };
  }

  isConfigured(): boolean {
    return this.settings.enabled && !!this.settings.baseURL;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.settings.baseURL) {
      return { success: false, error: 'No ComfyUI URL configured' };
    }

    try {
      const response = await fetch('/api/comfyui/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: this.settings.baseURL,
          authToken: this.settings.authToken
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async discoverWorkflows(): Promise<{ success: boolean; workflows?: any[]; error?: string }> {
    return {
      success: false,
      error: 'Workflow discovery requires ComfyUI Manager extension. Please import workflows manually.'
    };
  }

  async submitJob(request: ComfyUIJobRequest): Promise<{ success: boolean; promptId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'ComfyUI not configured' };
    }

    const workflow = comfyUIWorkflowRegistry.getWorkflow(request.workflowId);
    if (!workflow) {
      return { success: false, error: `Workflow ${request.workflowId} not found` };
    }

    try {
      const workflowData = this.injectInputs(workflow.workflowJSON, request.inputs);

      const response = await fetch('/api/comfyui/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: workflowData,
          baseURL: this.settings.baseURL,
          authToken: this.settings.authToken
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error };
      }

      const result: ComfyUIQueueResponse = await response.json();
      return { success: true, promptId: result.prompt_id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getJobStatus(promptId: string): Promise<ComfyUIJobStatus> {
    try {
      const params = new URLSearchParams({
        baseURL: this.settings.baseURL
      });
      if (this.settings.authToken) {
        params.set('authToken', this.settings.authToken);
      }

      const response = await fetch(`/api/comfyui/status/${promptId}?${params.toString()}`);
      
      if (!response.ok) {
        return {
          promptId,
          status: 'failed',
          error: 'Failed to fetch status'
        };
      }

      const result = await response.json();
      
      if (!result.success) {
        return {
          promptId,
          status: 'failed',
          error: result.error || 'Status check failed'
        };
      }

      let history = result.data || {};
      
      if (history[promptId]) {
        const item = history[promptId];
        const isCompleted = item.status?.completed;
        const hasFailed = item.status?.status_str === 'error';

        if (hasFailed) {
          return {
            promptId,
            status: 'failed',
            error: JSON.stringify(item.status.messages || 'Unknown error')
          };
        }

        if (!isCompleted) {
          return {
            promptId,
            status: 'running'
          };
        }

        const outputs = this.extractOutputs(item.outputs);
        return {
          promptId,
          status: 'completed',
          outputs
        };
      }
      
      return {
        promptId,
        status: 'queued'
      };
    } catch (error) {
      return {
        promptId,
        status: 'failed',
        error: (error as Error).message
      };
    }
  }

  async pollUntilComplete(
    promptId: string,
    onProgress?: (status: ComfyUIJobStatus) => void,
    maxAttempts = 60,
    intervalMs = 2000
  ): Promise<ComfyUIJobStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getJobStatus(promptId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    return {
      promptId,
      status: 'failed',
      error: 'Polling timeout exceeded'
    };
  }

  async generateMedia(
    mediaType: ComfyUIMediaType,
    prompt: string,
    workflowId?: string
  ): Promise<{ success: boolean; outputs?: ComfyUIOutput[]; error?: string }> {
    const targetWorkflowId = workflowId || this.settings.defaultWorkflows[mediaType];
    
    if (!targetWorkflowId) {
      return { success: false, error: `No workflow configured for ${mediaType} generation` };
    }

    const submitResult = await this.submitJob({
      workflowId: targetWorkflowId,
      inputs: { text: prompt }
    });

    if (!submitResult.success || !submitResult.promptId) {
      return { success: false, error: submitResult.error };
    }

    const finalStatus = await this.pollUntilComplete(submitResult.promptId);

    if (finalStatus.status === 'failed') {
      return { success: false, error: finalStatus.error };
    }

    return { success: true, outputs: finalStatus.outputs };
  }

  private injectInputs(workflow: any, inputs: Record<string, any>): any {
    const copy = JSON.parse(JSON.stringify(workflow));
    
    for (const [key, value] of Object.entries(inputs)) {
      for (const nodeId in copy) {
        const node = copy[nodeId];
        if (node.inputs && node.inputs[key] !== undefined) {
          node.inputs[key] = value;
        }
      }
    }

    return copy;
  }

  private extractOutputs(outputs: Record<string, any>): ComfyUIOutput[] {
    const results: ComfyUIOutput[] = [];
    const baseURL = encodeURIComponent(this.settings.baseURL);
    const authToken = this.settings.authToken ? `&authToken=${encodeURIComponent(this.settings.authToken)}` : '';

    for (const [nodeId, output] of Object.entries(outputs)) {
      if (output.images) {
        for (const img of output.images) {
          results.push({
            nodeId,
            type: 'image',
            filename: img.filename,
            subfolder: img.subfolder,
            url: `/api/comfyui/view?baseURL=${baseURL}&filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || '')}${authToken}`
          });
        }
      }

      if (output.videos) {
        for (const vid of output.videos) {
          results.push({
            nodeId,
            type: 'video',
            filename: vid.filename,
            subfolder: vid.subfolder,
            url: `/api/comfyui/view?baseURL=${baseURL}&filename=${encodeURIComponent(vid.filename)}&subfolder=${encodeURIComponent(vid.subfolder || '')}${authToken}`
          });
        }
      }

      if (output.audio) {
        for (const aud of output.audio) {
          results.push({
            nodeId,
            type: 'audio',
            filename: aud.filename,
            subfolder: aud.subfolder,
            url: `/api/comfyui/view?baseURL=${baseURL}&filename=${encodeURIComponent(aud.filename)}&subfolder=${encodeURIComponent(aud.subfolder || '')}${authToken}`
          });
        }
      }
    }

    return results;
  }

  private persistSettings(): void {
    localStorage.setItem('comfyui_settings', JSON.stringify(this.settings));
  }

  private loadSettings(): void {
    const stored = localStorage.getItem('comfyui_settings');
    if (stored) {
      try {
        this.settings = JSON.parse(stored);
      } catch (error) {
        console.error('Failed to load ComfyUI settings:', error);
      }
    }
  }
}

export const comfyUIService = new ComfyUIService();
