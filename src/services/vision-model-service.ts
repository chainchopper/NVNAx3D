/**
 * Vision Model Service
 * Handles image analysis using local vision-language models via OpenAI-compatible endpoints
 * Supports: Moondream, LLaVA, Qwen-VL via LM Studio, vLLM, Windows AI Dev Gallery
 */

export interface VisionModelConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  modelName: string;
  enabled: boolean;
}

export interface VisionAnalysisRequest {
  imageDataUrl: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface VisionAnalysisResponse {
  text: string;
  model: string;
  timestamp: number;
}

const VISION_CONFIG_KEY = 'nirvana_vision_models';

class VisionModelService extends EventTarget {
  private configs: Map<string, VisionModelConfig> = new Map();
  private activeConfigId: string | null = null;

  constructor() {
    super();
    this.loadConfigs();
  }

  private loadConfigs(): void {
    const saved = localStorage.getItem(VISION_CONFIG_KEY);
    if (saved) {
      try {
        const configs = JSON.parse(saved);
        this.configs = new Map(Object.entries(configs));
        console.log('[VisionModelService] Loaded configs:', this.configs.size);
      } catch (error) {
        console.error('[VisionModelService] Failed to load configs:', error);
      }
    }
  }

  private saveConfigs(): void {
    const obj = Object.fromEntries(this.configs);
    localStorage.setItem(VISION_CONFIG_KEY, JSON.stringify(obj));
    this.dispatchEvent(new CustomEvent('configs-changed'));
  }

  addConfig(config: VisionModelConfig): void {
    this.configs.set(config.id, config);
    this.saveConfigs();
    
    // Set as active if it's the first enabled config
    if (config.enabled && !this.activeConfigId) {
      this.activeConfigId = config.id;
    }
  }

  updateConfig(id: string, updates: Partial<VisionModelConfig>): void {
    const existing = this.configs.get(id);
    if (existing) {
      this.configs.set(id, { ...existing, ...updates });
      this.saveConfigs();
    }
  }

  removeConfig(id: string): void {
    this.configs.delete(id);
    if (this.activeConfigId === id) {
      this.activeConfigId = null;
    }
    this.saveConfigs();
  }

  getConfig(id: string): VisionModelConfig | undefined {
    return this.configs.get(id);
  }

  getAllConfigs(): VisionModelConfig[] {
    return Array.from(this.configs.values());
  }

  getActiveConfig(): VisionModelConfig | null {
    return this.activeConfigId ? this.configs.get(this.activeConfigId) || null : null;
  }

  setActiveConfig(id: string): void {
    if (this.configs.has(id)) {
      this.activeConfigId = id;
      this.saveConfigs();
    }
  }

  /**
   * Analyze an image using the active vision model
   */
  async analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResponse> {
    const config = this.getActiveConfig();
    if (!config) {
      throw new Error('No active vision model configured');
    }

    if (!config.enabled) {
      throw new Error(`Vision model "${config.name}" is not enabled`);
    }

    console.log(`[VisionModelService] Analyzing image with ${config.name}...`);

    try {
      // Normalize endpoint (add /v1 if missing for OpenAI-compatible servers)
      const endpoint = this.normalizeEndpoint(config.endpoint);
      const url = `${endpoint}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: config.modelName,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: request.prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: request.imageDataUrl
                  }
                }
              ]
            }
          ],
          max_tokens: request.maxTokens || 500,
          temperature: request.temperature || 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vision API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const resultText = data.choices?.[0]?.message?.content || '';

      console.log(`[VisionModelService] ✓ Analysis complete: ${resultText.substring(0, 100)}...`);

      return {
        text: resultText,
        model: config.modelName,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[VisionModelService] Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Capture frame from video element and convert to base64 data URL
   */
  captureFrameFromVideo(videoElement: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Normalize endpoint URL - add /v1 if missing for OpenAI-compatible servers
   */
  private normalizeEndpoint(endpoint: string): string {
    const url = endpoint.trim().replace(/\/$/, '');
    
    // If it already has /v1, return as-is
    if (url.endsWith('/v1')) {
      return url;
    }
    
    // Check if this looks like a base server URL (no path components)
    // Examples: http://localhost:1234 or http://localhost:8000
    const hasPathAfterPort = /:\d+\//.test(url);
    
    if (!hasPathAfterPort) {
      return `${url}/v1`;
    }
    
    return url;
  }

  /**
   * Test connection to vision model endpoint
   */
  async testConnection(config: VisionModelConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = this.normalizeEndpoint(config.endpoint);
      const url = `${endpoint}/models`;

      const response = await fetch(url, {
        method: 'GET',
        headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      const models = data.data || [];
      const modelFound = models.some((m: any) => m.id === config.modelName);

      if (!modelFound && models.length > 0) {
        return {
          success: false,
          error: `Model "${config.modelName}" not found. Available: ${models.map((m: any) => m.id).join(', ')}`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const visionModelService = new VisionModelService();
