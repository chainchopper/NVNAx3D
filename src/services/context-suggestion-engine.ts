import { agenticReasoningEngine } from './agentic-reasoning-engine';
import { ragMemoryManager } from './memory/rag-memory-manager';
import { userProfileManager } from './user-profile-manager';
import type { PersoniConfig } from '../personas';

export interface ContextSuggestion {
  id: string;
  type: 'action' | 'info' | 'routine' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  action?: {
    type: string;
    parameters: Record<string, any>;
  };
  reasoning: string;
  confidence: number;
}

class ContextSuggestionEngine {
  private suggestionHistory: Map<string, number> = new Map();
  private dismissedSuggestions: Set<string> = new Set();
  
  async generateSuggestions(context: {
    currentView?: string;
    activePersoni?: PersoniConfig;
    recentActivity?: string[];
    timeOfDay?: string;
  }): Promise<ContextSuggestion[]> {
    const suggestions: ContextSuggestion[] = [];
    
    const patternSuggestions = await this.getPatternBasedSuggestions();
    const memorySuggestions = await this.getMemoryBasedSuggestions();
    const timeSuggestions = this.getTimeBasedSuggestions(context.timeOfDay);
    const activitySuggestions = await this.getActivityBasedSuggestions(context.recentActivity);
    
    suggestions.push(...patternSuggestions);
    suggestions.push(...memorySuggestions);
    suggestions.push(...timeSuggestions);
    suggestions.push(...activitySuggestions);
    
    return suggestions
      .filter(s => !this.dismissedSuggestions.has(s.id))
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority] || b.confidence - a.confidence;
      })
      .slice(0, 5);
  }
  
  private async getPatternBasedSuggestions(): Promise<ContextSuggestion[]> {
    const patterns = agenticReasoningEngine.getPatternInsights();
    const suggestions: ContextSuggestion[] = [];
    
    for (const { pattern, frequency } of patterns.slice(0, 3)) {
      if (pattern.includes('call') && frequency > 5) {
        suggestions.push({
          id: `pattern-call-${Date.now()}`,
          type: 'routine',
          priority: 'medium',
          title: 'Create Call Routine',
          description: `You've made ${frequency} calls recently. Create a speed dial or call routine?`,
          action: {
            type: 'create_routine',
            parameters: {
              trigger: 'voice_command',
              action: 'initiate_call'
            }
          },
          reasoning: `Detected ${frequency} call interactions - automation could save time`,
          confidence: 0.8
        });
      }
      
      if (pattern.includes('note') && frequency > 7) {
        suggestions.push({
          id: `pattern-note-${Date.now()}`,
          type: 'optimization',
          priority: 'medium',
          title: 'Enable Auto-Summarization',
          description: `You create many notes. Enable automatic daily summaries?`,
          action: {
            type: 'enable_feature',
            parameters: {
              feature: 'auto_summarize_notes'
            }
          },
          reasoning: `${frequency} notes created - summaries could help with organization`,
          confidence: 0.75
        });
      }
    }
    
    return suggestions;
  }
  
  private async getMemoryBasedSuggestions(): Promise<ContextSuggestion[]> {
    const suggestions: ContextSuggestion[] = [];
    
    const incompleteTasks = await ragMemoryManager.queryMemories('status:pending priority:high', 3);
    
    if (incompleteTasks.length > 0) {
      suggestions.push({
        id: `memory-tasks-${Date.now()}`,
        type: 'action',
        priority: 'high',
        title: `${incompleteTasks.length} High-Priority Tasks Pending`,
        description: 'Review and address your urgent tasks',
        action: {
          type: 'open_panel',
          parameters: {
            panel: 'tasks',
            filter: 'priority:P1,P2'
          }
        },
        reasoning: 'High-priority tasks detected in memory requiring attention',
        confidence: 0.9
      });
    }
    
    const recentCalls = await ragMemoryManager.queryMemories('call', 2);
    
    if (recentCalls.length > 0) {
      const hasNotes = recentCalls.some(m => m.text.includes('note') || m.text.includes('action'));
      
      if (!hasNotes) {
        suggestions.push({
          id: `memory-call-followup-${Date.now()}`,
          type: 'info',
          priority: 'medium',
          title: 'Recent Calls Without Notes',
          description: 'Add notes or action items from your recent calls',
          action: {
            type: 'open_panel',
            parameters: {
              panel: 'notes'
            }
          },
          reasoning: 'Call history detected without associated notes',
          confidence: 0.7
        });
      }
    }
    
    return suggestions;
  }
  
  private getTimeBasedSuggestions(timeOfDay?: string): ContextSuggestion[] {
    const suggestions: ContextSuggestion[] = [];
    const hour = new Date().getHours();
    
    if (hour >= 9 && hour < 10 && !timeOfDay) {
      suggestions.push({
        id: `time-morning-${Date.now()}`,
        type: 'action',
        priority: 'medium',
        title: 'Morning Planning',
        description: 'Review your calendar and tasks for today',
        action: {
          type: 'open_panels',
          parameters: {
            panels: ['calendar', 'tasks']
          }
        },
        reasoning: 'Morning routine - optimal time for planning',
        confidence: 0.85
      });
    }
    
    if (hour >= 17 && hour < 18) {
      suggestions.push({
        id: `time-evening-${Date.now()}`,
        type: 'action',
        priority: 'low',
        title: 'End-of-Day Review',
        description: 'Review completed tasks and plan for tomorrow',
        action: {
          type: 'generate_summary',
          parameters: {
            scope: 'today',
            include: ['tasks', 'notes', 'calls']
          }
        },
        reasoning: 'Evening routine - good time to review and plan',
        confidence: 0.8
      });
    }
    
    return suggestions;
  }
  
  private async getActivityBasedSuggestions(recentActivity?: string[]): Promise<ContextSuggestion[]> {
    const suggestions: ContextSuggestion[] = [];
    
    if (!recentActivity || recentActivity.length === 0) {
      return suggestions;
    }
    
    const hasMultipleCalls = recentActivity.filter(a => a.includes('call')).length > 2;
    
    if (hasMultipleCalls) {
      suggestions.push({
        id: `activity-calls-${Date.now()}`,
        type: 'optimization',
        priority: 'medium',
        title: 'Optimize Call Workflow',
        description: 'Create a routine for frequent call patterns',
        action: {
          type: 'suggest_routine',
          parameters: {
            based_on: 'call_activity'
          }
        },
        reasoning: 'Multiple calls detected - workflow automation opportunity',
        confidence: 0.75
      });
    }
    
    const hasNotesAndCalls = recentActivity.some(a => a.includes('note')) && 
                             recentActivity.some(a => a.includes('call'));
    
    if (hasNotesAndCalls) {
      suggestions.push({
        id: `activity-call-notes-${Date.now()}`,
        type: 'routine',
        priority: 'high',
        title: 'Auto-Note During Calls',
        description: 'Enable automatic note-taking during calls with email summaries',
        action: {
          type: 'create_routine',
          parameters: {
            trigger: 'call_start',
            actions: ['enable_transcription', 'take_notes', 'email_summary_on_end']
          }
        },
        reasoning: 'Pattern: Notes after calls detected - automate this workflow',
        confidence: 0.85
      });
    }
    
    return suggestions;
  }
  
  dismissSuggestion(suggestionId: string): void {
    this.dismissedSuggestions.add(suggestionId);
  }
  
  acceptSuggestion(suggestionId: string): void {
    const count = this.suggestionHistory.get(suggestionId) || 0;
    this.suggestionHistory.set(suggestionId, count + 1);
  }
  
  getSuggestionStats(): { accepted: number; dismissed: number } {
    return {
      accepted: this.suggestionHistory.size,
      dismissed: this.dismissedSuggestions.size
    };
  }
}

export const contextSuggestionEngine = new ContextSuggestionEngine();
