/**
 * Object Recognition Service
 * Real-time object detection using TensorFlow.js and COCO-SSD
 */

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export interface DetectedObject {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface DetectionResult {
  objects: DetectedObject[];
  timestamp: number;
  fps: number;
}

export class ObjectRecognitionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private isInitialized = false;
  private isDetecting = false;
  private lastDetectionTime = 0;
  private frameCount = 0;
  private fpsStartTime = 0;
  private currentFps = 0;
  private detectionCallback: ((result: DetectionResult) => void) | null = null;
  private animationFrameId: number | null = null;
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('[ObjectRecognition] Loading COCO-SSD model...');
      this.model = await cocoSsd.load();
      this.isInitialized = true;
      this.fpsStartTime = performance.now();
      console.log('[ObjectRecognition] ✓ Model loaded successfully');
    } catch (error) {
      console.error('[ObjectRecognition] Failed to load model:', error);
      throw error;
    }
  }
  
  async detectObjects(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<DetectedObject[]> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Object recognition model not initialized');
    }
    
    try {
      const predictions = await this.model.detect(source);
      return predictions.map(pred => ({
        class: pred.class,
        score: pred.score,
        bbox: pred.bbox as [number, number, number, number]
      }));
    } catch (error) {
      console.error('[ObjectRecognition] Detection error:', error);
      return [];
    }
  }
  
  startContinuousDetection(
    videoElement: HTMLVideoElement,
    callback: (result: DetectionResult) => void,
    minInterval: number = 500
  ): void {
    if (!this.isInitialized || this.isDetecting) {
      return;
    }
    
    this.isDetecting = true;
    this.detectionCallback = callback;
    this.frameCount = 0;
    this.fpsStartTime = performance.now();
    
    const detect = async () => {
      if (!this.isDetecting || !this.model) return;
      
      const now = performance.now();
      if (now - this.lastDetectionTime < minInterval) {
        this.animationFrameId = requestAnimationFrame(detect);
        return;
      }
      
      this.lastDetectionTime = now;
      this.frameCount++;
      
      if (now - this.fpsStartTime >= 1000) {
        this.currentFps = this.frameCount;
        this.frameCount = 0;
        this.fpsStartTime = now;
      }
      
      const objects = await this.detectObjects(videoElement);
      
      if (this.detectionCallback) {
        this.detectionCallback({
          objects,
          timestamp: now,
          fps: this.currentFps
        });
      }
      
      this.animationFrameId = requestAnimationFrame(detect);
    };
    
    console.log('[ObjectRecognition] Started continuous detection');
    detect();
  }
  
  stopContinuousDetection(): void {
    this.isDetecting = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('[ObjectRecognition] Stopped continuous detection');
  }
  
  isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }
  
  getCurrentFPS(): number {
    return this.currentFps;
  }
}

export const objectRecognitionService = new ObjectRecognitionService();
