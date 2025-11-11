import { VisionContext, VisionInferenceConfig, DetectedObject } from '../types/vision';
import { CameraFrame } from '../components/camera-manager';
import { providerManager } from './provider-manager';
import { appStateService } from './app-state-service';

type VisionListener = (context: VisionContext | null) => void;

class CameraVisionService {
  private cachedVision: VisionContext | null = null;
  private listeners: VisionListener[] = [];
  private cocoModel: any = null;
  private isLoadingModel = false;
  private inferenceInProgress = false;

  constructor() {
    this.initializeTensorFlow();
  }

  private async initializeTensorFlow() {
    try {
      if (typeof window !== 'undefined') {
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        const tf = await import('@tensorflow/tfjs');
        
        await tf.ready();
        this.isLoadingModel = true;
        this.cocoModel = await cocoSsd.load();
        this.isLoadingModel = false;
        console.log('[CameraVisionService] COCO-SSD model loaded');
      }
    } catch (error) {
      console.error('[CameraVisionService] Failed to load TensorFlow models:', error);
      this.isLoadingModel = false;
    }
  }

  subscribe(listener: VisionListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.cachedVision));
  }

  async analyzeFrame(frame: CameraFrame, config?: VisionInferenceConfig): Promise<VisionContext> {
    if (this.inferenceInProgress) {
      console.warn('[CameraVisionService] Inference already in progress, skipping');
      return this.cachedVision || this.getEmptyContext();
    }

    this.inferenceInProgress = true;

    try {
      const modelType = config?.modelType || 'local';
      
      if (modelType === 'local') {
        return await this.analyzeWithLocal(frame);
      } else {
        return await this.analyzeWithAPI(frame, config?.apiModelId);
      }
    } finally {
      this.inferenceInProgress = false;
    }
  }

  private async analyzeWithLocal(frame: CameraFrame): Promise<VisionContext> {
    if (!this.cocoModel) {
      if (this.isLoadingModel) {
        console.warn('[CameraVisionService] Model still loading...');
        return this.getEmptyContext();
      }
      throw new Error('COCO-SSD model not loaded');
    }

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = frame.dataUrl;
      });

      const predictions = await this.cocoModel.detect(img);

      const objects: DetectedObject[] = predictions.map((pred: any) => ({
        class: pred.class,
        score: pred.score,
        bbox: pred.bbox as [number, number, number, number],
      }));

      const summary = this.generateSummary(objects);

      const context: VisionContext = {
        timestamp: Date.now(),
        objects,
        summary,
        frameDataUrl: frame.dataUrl,
        modelUsed: 'coco-ssd',
      };

      this.cachedVision = context;
      this.notifyListeners();

      return context;
    } catch (error) {
      console.error('[CameraVisionService] Local inference error:', error);
      return this.getEmptyContext();
    }
  }

  private async analyzeWithAPI(frame: CameraFrame, modelId?: string): Promise<VisionContext> {
    try {
      const activePersoni = appStateService.getActivePersoni();
      const visionModelId = modelId || activePersoni?.models?.vision;

      if (!visionModelId) {
        throw new Error('No vision model configured');
      }

      const provider = providerManager.getProviderInstanceByModelId(visionModelId);
      if (!provider) {
        throw new Error(`No provider found for vision model: ${visionModelId}`);
      }

      const base64Image = frame.dataUrl.split(',')[1];
      const mimeType = frame.dataUrl.split(';')[0].split(':')[1];

      const summary = await provider.sendMessage([
        {
          role: 'user',
          content: [
            {
              text: 'Analyze this image and describe what you see in detail. List all objects, people, activities, and context.',
            },
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ]);

      const context: VisionContext = {
        timestamp: Date.now(),
        objects: [],
        summary,
        frameDataUrl: frame.dataUrl,
        modelUsed: 'gemini-vision',
      };

      this.cachedVision = context;
      this.notifyListeners();

      return context;
    } catch (error) {
      console.error('[CameraVisionService] API inference error:', error);
      return this.getEmptyContext();
    }
  }

  private generateSummary(objects: DetectedObject[]): string {
    if (objects.length === 0) {
      return 'No objects detected in the camera view.';
    }

    const objectCounts = objects.reduce((acc, obj) => {
      acc[obj.class] = (acc[obj.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(objectCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cls, count]) => count > 1 ? `${count} ${cls}s` : `1 ${cls}`);

    return `I can see ${entries.join(', ')} in the camera view.`;
  }

  getCachedVision(freshnessMs = 30000): VisionContext | null {
    if (!this.cachedVision) return null;

    const age = Date.now() - this.cachedVision.timestamp;
    if (age > freshnessMs) {
      return null;
    }

    return this.cachedVision;
  }

  clearCache() {
    this.cachedVision = null;
    this.notifyListeners();
  }

  private getEmptyContext(): VisionContext {
    return {
      timestamp: Date.now(),
      objects: [],
      summary: 'Vision analysis unavailable',
      modelUsed: 'coco-ssd',
    };
  }

  isReady(): boolean {
    return this.cocoModel !== null && !this.isLoadingModel;
  }

  isInferring(): boolean {
    return this.inferenceInProgress;
  }
}

export const cameraVisionService = new CameraVisionService();
