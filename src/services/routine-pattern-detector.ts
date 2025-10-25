/**
 * RoutinePatternDetector Service
 * Detects patterns in user behavior and suggests automation routines
 */

import { EnhancedRAGMemoryManager } from './memory/enhanced-rag-memory-manager';
import type { Memory, TaskStatus } from '../types/memory';
import type { RoutinePattern, RoutineTrigger, RoutineAction } from '../types/routine-types';

export interface PatternDetectionConfig {
  enabled: boolean;
  minOccurrences: number;
  confidenceThreshold: number;
  checkIntervalMs: number;
}

const DEFAULT_PATTERN_CONFIG: PatternDetectionConfig = {
  enabled: true,
  minOccurrences: 3,
  confidenceThreshold: 0.7,
  checkIntervalMs: 60 * 60 * 1000,
};

export class RoutinePatternDetector {
  private ragMemory: EnhancedRAGMemoryManager;
  private initialized = false;
  private config: PatternDetectionConfig = { ...DEFAULT_PATTERN_CONFIG };
  private detectionTimer: number | undefined;
  private onPatternDetectedCallback: ((pattern: RoutinePattern) => void) | null = null;

  constructor() {
    this.ragMemory = new EnhancedRAGMemoryManager();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[RoutinePatternDetector] Already initialized');
      return;
    }

    await this.ragMemory.initialize();
    
    if (this.config.enabled) {
      this.startPatternDetection();
    }
    
    this.initialized = true;
    console.log('[RoutinePatternDetector] Initialized successfully');
  }

  configure(newConfig: Partial<PatternDetectionConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };
    
    if (!wasEnabled && this.config.enabled && this.initialized) {
      this.startPatternDetection();
    } else if (wasEnabled && !this.config.enabled) {
      this.stopPatternDetection();
    }
    
    console.log('[RoutinePatternDetector] Configuration updated:', this.config);
  }

  getConfig(): PatternDetectionConfig {
    return { ...this.config };
  }

  onPatternDetected(callback: (pattern: RoutinePattern) => void): void {
    this.onPatternDetectedCallback = callback;
  }

  private startPatternDetection(): void {
    if (this.detectionTimer) {
      window.clearInterval(this.detectionTimer);
    }

    this.detectionTimer = window.setInterval(() => {
      this.detectPatterns().catch(error => {
        console.error('[RoutinePatternDetector] Error detecting patterns:', error);
      });
    }, this.config.checkIntervalMs);

    console.log(`[RoutinePatternDetector] Started pattern detection (interval: ${this.config.checkIntervalMs}ms)`);
  }

  private stopPatternDetection(): void {
    if (this.detectionTimer) {
      window.clearInterval(this.detectionTimer);
      this.detectionTimer = undefined;
      console.log('[RoutinePatternDetector] Stopped pattern detection');
    }
  }

  async detectPatterns(): Promise<RoutinePattern[]> {
    if (!this.initialized) {
      throw new Error('RoutinePatternDetector not initialized. Call initialize() first.');
    }

    console.log('[RoutinePatternDetector] Starting pattern detection...');

    const patterns: RoutinePattern[] = [];

    try {
      const temporalPatterns = await this.detectTemporalPatterns();
      patterns.push(...temporalPatterns);

      const sequentialPatterns = await this.detectSequentialPatterns();
      patterns.push(...sequentialPatterns);

      if (patterns.length > 0) {
        console.log(`[RoutinePatternDetector] Detected ${patterns.length} pattern(s)`);
        
        for (const pattern of patterns) {
          if (pattern.confidence >= this.config.confidenceThreshold && this.onPatternDetectedCallback) {
            this.onPatternDetectedCallback(pattern);
          }
        }
      }
    } catch (error) {
      console.error('[RoutinePatternDetector] Error during pattern detection:', error);
    }

    return patterns;
  }

  private async detectTemporalPatterns(): Promise<RoutinePattern[]> {
    const patterns: RoutinePattern[] = [];
    
    const tasks = await this.ragMemory.getTasks();
    const completedTasks = tasks.filter(task => task.metadata.taskStatus === 'completed');

    const tasksByHour = this.groupTasksByHour(completedTasks);

    for (const [hour, tasksInHour] of tasksByHour.entries()) {
      if (tasksInHour.length >= this.config.minOccurrences) {
        const taskTitles = tasksInHour.map(t => t.metadata.taskTitle || 'Unknown');
        const commonTitle = this.findMostCommonString(taskTitles);

        if (commonTitle) {
          const occurrences = taskTitles.filter(t => t === commonTitle).length;
          const confidence = occurrences / tasksInHour.length;

          if (confidence >= this.config.confidenceThreshold) {
            patterns.push({
              type: 'temporal',
              description: `You often complete tasks like "${commonTitle}" around ${hour}:00. Would you like to create a routine for this?`,
              occurrences,
              confidence,
              suggestedRoutine: {
                name: `Daily ${commonTitle}`,
                description: `Automatically remind or create task "${commonTitle}" at ${hour}:00`,
                enabled: true,
                executionCount: 0,
                trigger: {
                  type: 'time',
                  config: {
                    schedule: `every day at ${hour}:00`,
                  },
                } as RoutineTrigger,
                conditions: [],
                actions: [
                  {
                    type: 'notification',
                    parameters: {
                      message: `Time for: ${commonTitle}`,
                    },
                  },
                ] as RoutineAction[],
                tags: ['auto-detected', 'temporal'],
              },
            });
          }
        }
      }
    }

    return patterns;
  }

  private async detectSequentialPatterns(): Promise<RoutinePattern[]> {
    const patterns: RoutinePattern[] = [];
    
    const tasks = await this.ragMemory.getTasks();
    const completedTasks = tasks
      .filter(task => task.metadata.taskStatus === 'completed')
      .sort((a, b) => 
        new Date(a.metadata.completedAt || a.metadata.timestamp).getTime() - 
        new Date(b.metadata.completedAt || b.metadata.timestamp).getTime()
      );

    const sequences = this.findTaskSequences(completedTasks);

    for (const sequence of sequences) {
      if (sequence.occurrences >= this.config.minOccurrences) {
        const confidence = sequence.occurrences / completedTasks.length;

        if (confidence >= 0.3) {
          patterns.push({
            type: 'sequential',
            description: `You often complete tasks in this sequence: ${sequence.tasks.join(' → ')}. Would you like to create a routine for this workflow?`,
            occurrences: sequence.occurrences,
            confidence,
            suggestedRoutine: {
              name: `Workflow: ${sequence.tasks[0]} → ${sequence.tasks[sequence.tasks.length - 1]}`,
              description: `Automated workflow for: ${sequence.tasks.join(', ')}`,
              enabled: true,
              executionCount: 0,
              trigger: {
                type: 'completion',
                config: {
                  taskPattern: sequence.tasks[0],
                },
              } as RoutineTrigger,
              conditions: [],
              actions: sequence.tasks.slice(1).map(taskTitle => ({
                type: 'notification',
                parameters: {
                  message: `Next step: ${taskTitle}`,
                },
              })) as RoutineAction[],
              tags: ['auto-detected', 'sequential'],
            },
          });
        }
      }
    }

    return patterns;
  }

  private groupTasksByHour(tasks: Memory[]): Map<number, Memory[]> {
    const tasksByHour = new Map<number, Memory[]>();

    for (const task of tasks) {
      const completedAt = task.metadata.completedAt || task.metadata.timestamp;
      const hour = new Date(completedAt).getHours();

      if (!tasksByHour.has(hour)) {
        tasksByHour.set(hour, []);
      }

      tasksByHour.get(hour)!.push(task);
    }

    return tasksByHour;
  }

  private findMostCommonString(strings: string[]): string | null {
    const counts = new Map<string, number>();

    for (const str of strings) {
      counts.set(str, (counts.get(str) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon: string | null = null;

    for (const [str, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = str;
      }
    }

    return maxCount >= this.config.minOccurrences ? mostCommon : null;
  }

  private findTaskSequences(tasks: Memory[]): Array<{ tasks: string[]; occurrences: number }> {
    const sequences: Array<{ tasks: string[]; occurrences: number }> = [];
    
    const windowSize = 2;
    const sequenceCounts = new Map<string, number>();

    for (let i = 0; i <= tasks.length - windowSize; i++) {
      const sequence = tasks
        .slice(i, i + windowSize)
        .map(t => t.metadata.taskTitle || 'Unknown');
      
      const sequenceKey = sequence.join('→');
      sequenceCounts.set(sequenceKey, (sequenceCounts.get(sequenceKey) || 0) + 1);
    }

    for (const [sequenceKey, occurrences] of sequenceCounts.entries()) {
      if (occurrences >= this.config.minOccurrences) {
        sequences.push({
          tasks: sequenceKey.split('→'),
          occurrences,
        });
      }
    }

    return sequences;
  }

  async shutdown(): Promise<void> {
    this.stopPatternDetection();
    console.log('[RoutinePatternDetector] Shutdown complete');
  }
}

export const routinePatternDetector = new RoutinePatternDetector();
