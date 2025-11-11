export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface VisionContext {
  timestamp: number;
  objects: DetectedObject[];
  summary: string;
  frameDataUrl?: string;
  modelUsed: 'coco-ssd' | 'gemini-vision';
}

export interface VisionRequestOptions {
  includeVision?: boolean;
  freshness?: number;
  forceNewInference?: boolean;
}

export interface VisionInferenceConfig {
  modelType: 'local' | 'api';
  localModel?: 'coco-ssd' | 'mobilenet';
  apiModelId?: string;
  cacheTTL?: number;
}
