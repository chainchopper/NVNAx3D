/**
 * Input Orchestrator
 * 
 * Coordinates mic/text/camera/upload inputs concurrently with intelligent queuing
 * Prevents system overload through priority queues and adaptive cooldowns
 */

export interface InputRequest {
  id: string;
  type: 'voice' | 'text' | 'camera' | 'upload' | 'sensor';
  priority: 'high' | 'medium' | 'low';
  data: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface InputResponse {
  requestId: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

export type InputHandler = (request: InputRequest) => Promise<InputResponse>;

interface QueuedInput {
  request: InputRequest;
  resolve: (response: InputResponse) => void;
  reject: (error: Error) => void;
  addedAt: number;
}

export interface OrchestratorConfig {
  maxConcurrent: number;        // Max parallel requests
  maxQueueSize: number;         // Max queued requests
  cooldownMs: number;           // Cooldown between batches
  priorityWeights: {
    high: number;
    medium: number;
    low: number;
  };
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxConcurrent: 3,
  maxQueueSize: 20,
  cooldownMs: 500,
  priorityWeights: {
    high: 10,
    medium: 5,
    low: 1
  }
};

export class InputOrchestrator {
  private static instance: InputOrchestrator;
  
  private config: OrchestratorConfig = DEFAULT_CONFIG;
  private queue: QueuedInput[] = [];
  private processing: Set<string> = new Set();
  private handler: InputHandler | null = null;
  private lastProcessTime = 0;
  private requestIdCounter = 0;
  
  // Stats
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    droppedRequests: 0,
    averageProcessingTime: 0
  };

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): InputOrchestrator {
    if (!InputOrchestrator.instance) {
      InputOrchestrator.instance = new InputOrchestrator();
    }
    return InputOrchestrator.instance;
  }

  private loadConfig(): void {
    const stored = localStorage.getItem('input-orchestrator-config');
    if (stored) {
      try {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      } catch (e) {
        console.warn('[InputOrchestrator] Failed to load config');
      }
    }
  }

  private saveConfig(): void {
    localStorage.setItem('input-orchestrator-config', JSON.stringify(this.config));
  }

  setHandler(handler: InputHandler): void {
    this.handler = handler;
  }

  updateConfig(updates: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  getStats() {
    return { ...this.stats, queueSize: this.queue.length, processing: this.processing.size };
  }

  /**
   * Submit an input request for processing
   */
  async submit(
    type: InputRequest['type'],
    data: any,
    priority: InputRequest['priority'] = 'medium',
    metadata?: Record<string, any>
  ): Promise<InputResponse> {
    const requestId = `${type}-${++this.requestIdCounter}-${Date.now()}`;
    
    const request: InputRequest = {
      id: requestId,
      type,
      priority,
      data,
      timestamp: Date.now(),
      metadata
    };

    this.stats.totalRequests++;

    // Check queue capacity
    if (this.queue.length >= this.config.maxQueueSize) {
      // Drop lowest priority request
      const dropped = this.dropLowestPriority();
      if (!dropped) {
        this.stats.droppedRequests++;
        throw new Error('Queue full, cannot accept new requests');
      }
    }

    return new Promise<InputResponse>((resolve, reject) => {
      this.queue.push({
        request,
        resolve,
        reject,
        addedAt: Date.now()
      });

      this.processQueue();
    });
  }

  private dropLowestPriority(): boolean {
    if (this.queue.length === 0) return false;

    // Sort by priority (lowest first)
    const sorted = [...this.queue].sort((a, b) => {
      const weightA = this.config.priorityWeights[a.request.priority];
      const weightB = this.config.priorityWeights[b.request.priority];
      return weightA - weightB;
    });

    const toDrop = sorted[0];
    const index = this.queue.indexOf(toDrop);
    if (index > -1) {
      this.queue.splice(index, 1);
      toDrop.reject(new Error('Request dropped due to queue capacity'));
      this.stats.droppedRequests++;
      console.log('[InputOrchestrator] Dropped request:', toDrop.request.id);
      return true;
    }

    return false;
  }

  private async processQueue(): Promise<void> {
    if (!this.handler) {
      console.warn('[InputOrchestrator] No handler registered');
      return;
    }

    // Check cooldown
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    if (timeSinceLastProcess < this.config.cooldownMs && this.processing.size > 0) {
      // Schedule retry after cooldown
      setTimeout(() => this.processQueue(), this.config.cooldownMs - timeSinceLastProcess);
      return;
    }

    // Process requests up to max concurrent
    while (this.queue.length > 0 && this.processing.size < this.config.maxConcurrent) {
      const item = this.getNextRequest();
      if (!item) break;

      this.processing.add(item.request.id);
      this.lastProcessTime = Date.now();

      // Process asynchronously
      this.processRequest(item).finally(() => {
        this.processing.delete(item.request.id);
        this.processQueue(); // Continue processing
      });
    }
  }

  private getNextRequest(): QueuedInput | null {
    if (this.queue.length === 0) return null;

    // Sort by priority (highest first), then by timestamp
    const sorted = [...this.queue].sort((a, b) => {
      const weightA = this.config.priorityWeights[a.request.priority];
      const weightB = this.config.priorityWeights[b.request.priority];
      
      if (weightA !== weightB) {
        return weightB - weightA; // Higher priority first
      }
      
      return a.addedAt - b.addedAt; // Earlier first
    });

    const next = sorted[0];
    const index = this.queue.indexOf(next);
    if (index > -1) {
      this.queue.splice(index, 1);
    }
    
    return next;
  }

  private async processRequest(item: QueuedInput): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('[InputOrchestrator] Processing:', item.request.id, item.request.type);
      
      const response = await this.handler!(item.request);
      const processingTime = Date.now() - startTime;
      
      response.processingTime = processingTime;
      
      // Update stats
      this.stats.successfulRequests++;
      this.updateAverageProcessingTime(processingTime);
      
      item.resolve(response);
    } catch (error) {
      console.error('[InputOrchestrator] Processing failed:', error);
      
      this.stats.failedRequests++;
      
      item.resolve({
        requestId: item.request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });
    }
  }

  private updateAverageProcessingTime(newTime: number): void {
    const total = this.stats.successfulRequests;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (total - 1) + newTime) / total;
  }

  clearQueue(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }

  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      droppedRequests: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Batch submit multiple requests with automatic priority adjustment
   */
  async submitBatch(
    requests: Array<{ type: InputRequest['type']; data: any; metadata?: Record<string, any> }>
  ): Promise<InputResponse[]> {
    const promises = requests.map((req, index) => {
      // First request gets high priority, others get medium
      const priority = index === 0 ? 'high' : 'medium';
      return this.submit(req.type, req.data, priority, req.metadata);
    });

    return Promise.all(promises);
  }
}
