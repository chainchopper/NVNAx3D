import { ragMemoryManager } from './memory/rag-memory-manager';
import { connectorHandlers } from './connector-handlers';
import type { MemoryType } from '../types/memory';

export interface CallNote {
  timestamp: string;
  speaker: 'user' | 'caller' | 'agent';
  content: string;
  tags: string[];
}

export interface CallSession {
  callSid: string;
  phoneNumber: string;
  startTime: string;
  endTime?: string;
  notes: CallNote[];
  transcription: string[];
  summary?: string;
  actionItems: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

class CallIntelligenceService {
  private activeSessions: Map<string, CallSession> = new Map();
  private completedSessions: Map<string, CallSession> = new Map();
  private autoSummarizeEnabled = true;
  
  startCallSession(callSid: string, phoneNumber: string): CallSession {
    const session: CallSession = {
      callSid,
      phoneNumber,
      startTime: new Date().toISOString(),
      notes: [],
      transcription: [],
      actionItems: [],
      sentiment: 'neutral'
    };
    
    this.activeSessions.set(callSid, session);
    console.log(`[CallIntelligence] Started session for call ${callSid}`);
    
    return session;
  }
  
  async addTranscription(callSid: string, text: string, speaker: 'user' | 'caller' | 'agent'): Promise<void> {
    const session = this.activeSessions.get(callSid);
    if (!session) {
      console.warn(`[CallIntelligence] No session found for ${callSid}`);
      return;
    }
    
    session.transcription.push(`[${speaker}]: ${text}`);
    
    const autoNote = await this.detectImportantPoint(text);
    if (autoNote) {
      this.addNote(callSid, autoNote.content, autoNote.tags, speaker);
    }
    
    const actionItem = this.detectActionItem(text);
    if (actionItem) {
      session.actionItems.push(actionItem);
    }
    
    this.updateSentiment(session, text);
  }
  
  addNote(callSid: string, content: string, tags: string[] = [], speaker: 'user' | 'caller' | 'agent' = 'user'): void {
    const session = this.activeSessions.get(callSid);
    if (!session) return;
    
    const note: CallNote = {
      timestamp: new Date().toISOString(),
      speaker,
      content,
      tags
    };
    
    session.notes.push(note);
    console.log(`[CallIntelligence] Note added to call ${callSid}: ${content.substring(0, 50)}...`);
  }
  
  async endCallSession(callSid: string): Promise<CallSession | null> {
    const session = this.activeSessions.get(callSid);
    if (!session) return null;
    
    session.endTime = new Date().toISOString();
    
    if (this.autoSummarizeEnabled) {
      session.summary = await this.generateSummary(session);
    }
    
    await this.storeInMemory(session);
    
    this.completedSessions.set(callSid, session);
    this.activeSessions.delete(callSid);
    
    console.log(`[CallIntelligence] Ended session for call ${callSid}, stored in memory`);
    
    return session;
  }
  
  private async detectImportantPoint(text: string): Promise<{ content: string; tags: string[] } | null> {
    const lower = text.toLowerCase();
    
    const importanceIndicators = [
      'important',
      'critical',
      'remember',
      'don\'t forget',
      'make sure',
      'deadline',
      'by tomorrow',
      'urgent'
    ];
    
    if (importanceIndicators.some(ind => lower.includes(ind))) {
      const tags = [];
      if (lower.includes('urgent') || lower.includes('critical')) tags.push('urgent');
      if (lower.includes('deadline') || lower.includes('tomorrow')) tags.push('time-sensitive');
      
      return { content: text, tags };
    }
    
    return null;
  }
  
  private detectActionItem(text: string): string | null {
    const lower = text.toLowerCase();
    
    const actionPatterns = [
      /(?:i will|i'll|i need to|i should) (.+)/i,
      /(?:you should|you need to|please) (.+)/i,
      /(?:let's|we should|we need to) (.+)/i,
      /(?:action item|todo|task):? (.+)/i
    ];
    
    for (const pattern of actionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  private updateSentiment(session: CallSession, text: string): void {
    const lower = text.toLowerCase();
    
    const positive = ['great', 'excellent', 'perfect', 'thank you', 'appreciate', 'wonderful'];
    const negative = ['problem', 'issue', 'concerned', 'worried', 'disappointed', 'frustrated'];
    
    const posCount = positive.filter(w => lower.includes(w)).length;
    const negCount = negative.filter(w => lower.includes(w)).length;
    
    if (posCount > negCount && posCount > 0) {
      session.sentiment = 'positive';
    } else if (negCount > posCount && negCount > 0) {
      session.sentiment = 'negative';
    }
  }
  
  private async generateSummary(session: CallSession): Promise<string> {
    const duration = session.endTime && session.startTime
      ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000 / 60)
      : 0;
    
    let summary = `Call Summary\n`;
    summary += `Phone: ${session.phoneNumber}\n`;
    summary += `Duration: ${duration} minutes\n`;
    summary += `Sentiment: ${session.sentiment}\n\n`;
    
    if (session.notes.length > 0) {
      summary += `Key Notes (${session.notes.length}):\n`;
      session.notes.forEach((note, i) => {
        summary += `${i + 1}. ${note.content}\n`;
      });
      summary += '\n';
    }
    
    if (session.actionItems.length > 0) {
      summary += `Action Items (${session.actionItems.length}):\n`;
      session.actionItems.forEach((item, i) => {
        summary += `${i + 1}. ${item}\n`;
      });
      summary += '\n';
    }
    
    if (session.transcription.length > 0) {
      summary += `Conversation Highlights:\n`;
      const highlights = session.transcription.slice(0, 5);
      highlights.forEach(line => {
        summary += `- ${line}\n`;
      });
    }
    
    return summary;
  }
  
  async sendSummary(callSid: string, method: 'email' | 'sms', recipient: string): Promise<boolean> {
    const session = this.activeSessions.get(callSid) || this.completedSessions.get(callSid);
    
    if (!session || !session.summary) {
      console.error(`[CallIntelligence] Cannot send summary - session or summary not found`);
      return false;
    }
    
    try {
      if (method === 'email') {
        const result = await connectorHandlers.sendGmailEmail({
          to: recipient,
          subject: `Call Summary - ${new Date(session.startTime).toLocaleDateString()}`,
          body: session.summary
        });
        
        if (result.success) {
          console.log(`[CallIntelligence] Email summary sent to ${recipient}`);
          return true;
        } else {
          console.error(`[CallIntelligence] Email send failed:`, result.error);
          return false;
        }
      } else if (method === 'sms') {
        const { telephonyManager } = await import('./telephony/telephony-manager');
        const provider = telephonyManager.getProvider();
        
        if (!provider) {
          console.error(`[CallIntelligence] Telephony not configured for SMS`);
          return false;
        }
        
        const truncatedSummary = session.summary.substring(0, 1500);
        const result = await provider.sendSMS(recipient, truncatedSummary);
        
        if (result.success) {
          console.log(`[CallIntelligence] SMS summary sent to ${recipient}`);
          return true;
        } else {
          console.error(`[CallIntelligence] SMS send failed:`, result.error);
          return false;
        }
      }
    } catch (error) {
      console.error(`[CallIntelligence] Failed to send summary:`, error);
      return false;
    }
    
    return false;
  }
  
  private async storeInMemory(session: CallSession): Promise<void> {
    const memoryContent = `Call with ${session.phoneNumber} at ${new Date(session.startTime).toLocaleString()}.\n\n${session.summary || 'No summary available.'}`;
    
    await ragMemoryManager.storeMemory(
      memoryContent,
      'conversations' as MemoryType,
      {
        callSid: session.callSid,
        phoneNumber: session.phoneNumber,
        duration: session.endTime ? 
          Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000) : 0,
        sentiment: session.sentiment,
        noteCount: session.notes.length,
        actionItemCount: session.actionItems.length
      }
    );
    
    for (const note of session.notes) {
      await ragMemoryManager.storeMemory(
        note.content,
        'notes' as MemoryType,
        {
          source: 'call',
          callSid: session.callSid,
          tags: note.tags,
          speaker: note.speaker
        }
      );
    }
    
    for (const item of session.actionItems) {
      await ragMemoryManager.storeMemory(
        item,
        'tasks' as MemoryType,
        {
          source: 'call',
          callSid: session.callSid,
          status: 'pending',
          priority: 'P3'
        }
      );
    }
  }
  
  getActiveSession(callSid: string): CallSession | undefined {
    return this.activeSessions.get(callSid);
  }
  
  getAllActiveSessions(): CallSession[] {
    return Array.from(this.activeSessions.values());
  }
  
  setAutoSummarize(enabled: boolean): void {
    this.autoSummarizeEnabled = enabled;
  }
}

export const callIntelligence = new CallIntelligenceService();
