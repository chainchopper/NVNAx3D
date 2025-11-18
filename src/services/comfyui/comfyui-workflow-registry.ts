import type { ComfyUIWorkflowConfig } from '../../types/comfyui';

class ComfyUIWorkflowRegistry {
  private workflows: Map<string, ComfyUIWorkflowConfig> = new Map();

  registerWorkflow(config: ComfyUIWorkflowConfig): void {
    this.workflows.set(config.id, config);
    this.persistWorkflows();
  }

  unregisterWorkflow(id: string): void {
    this.workflows.delete(id);
    this.persistWorkflows();
  }

  getWorkflow(id: string): ComfyUIWorkflowConfig | undefined {
    return this.workflows.get(id);
  }

  getWorkflowsByMediaType(mediaType: 'image' | 'video' | 'audio'): ComfyUIWorkflowConfig[] {
    return Array.from(this.workflows.values()).filter(w => w.mediaType === mediaType);
  }

  getAllWorkflows(): ComfyUIWorkflowConfig[] {
    return Array.from(this.workflows.values());
  }

  private persistWorkflows(): void {
    const data = Array.from(this.workflows.values());
    localStorage.setItem('comfyui_workflows', JSON.stringify(data));
  }

  loadWorkflows(): void {
    const stored = localStorage.getItem('comfyui_workflows');
    if (stored) {
      try {
        const data = JSON.parse(stored) as ComfyUIWorkflowConfig[];
        this.workflows.clear();
        data.forEach(workflow => {
          this.workflows.set(workflow.id, workflow);
        });
      } catch (error) {
        console.error('Failed to load ComfyUI workflows:', error);
      }
    }
  }
}

export const comfyUIWorkflowRegistry = new ComfyUIWorkflowRegistry();
