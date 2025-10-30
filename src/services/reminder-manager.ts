/**
 * Reminder Manager Service
 * Handles reminder CRUD operations, notifications, and natural language parsing
 */

import { ragMemoryManager } from './memory/rag-memory-manager';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  notificationTimes: number[]; // Minutes before due
  completed: boolean;
  createdBy: string;
  createdAt: Date;
  notified: boolean[];
}

const REMINDERS_STORAGE_KEY = 'nirvana-reminders';
const CHECK_INTERVAL = 60000; // Check every minute

export class ReminderManager {
  private reminders: Map<string, Reminder> = new Map();
  private checkTimer: number | null = null;
  private notificationCallback: ((message: string) => void) | null = null;

  constructor() {
    this.loadReminders();
  }

  private loadReminders(): void {
    try {
      const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.reminders = new Map(
          data.map((r: any) => [
            r.id,
            {
              ...r,
              dueDate: new Date(r.dueDate),
              createdAt: new Date(r.createdAt),
            },
          ])
        );
        console.log(`[ReminderManager] Loaded ${this.reminders.size} reminders`);
      }
    } catch (error) {
      console.error('[ReminderManager] Failed to load reminders:', error);
    }
  }

  private saveReminders(): void {
    try {
      const data = Array.from(this.reminders.values());
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[ReminderManager] Failed to save reminders:', error);
    }
  }

  async setReminder(
    title: string,
    dueDate: Date,
    notificationTimes: number[],
    description?: string,
    createdBy: string = 'System'
  ): Promise<string> {
    const id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const reminder: Reminder = {
      id,
      title,
      description,
      dueDate,
      notificationTimes: notificationTimes.sort((a, b) => b - a), // Sort desc
      completed: false,
      createdBy,
      createdAt: new Date(),
      notified: new Array(notificationTimes.length).fill(false),
    };

    this.reminders.set(id, reminder);
    this.saveReminders();

    // Store in RAG memory
    try {
      await ragMemoryManager.addMemory(
        `Reminder: ${title}${description ? ` - ${description}` : ''}. Due: ${dueDate.toLocaleString()}`,
        createdBy,
        'reminder',
        createdBy,
        7,
        {
          reminderId: id,
          dueDate: dueDate.toISOString(),
          completed: false,
        }
      );
    } catch (error) {
      console.error('[ReminderManager] Failed to store reminder in RAG:', error);
    }

    console.log(`[ReminderManager] Created reminder: ${title} (${id})`);
    return id;
  }

  listReminders(showCompleted: boolean = false): Reminder[] {
    const reminders = Array.from(this.reminders.values());
    
    if (!showCompleted) {
      return reminders.filter(r => !r.completed);
    }
    
    return reminders.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  getReminder(id: string): Reminder | null {
    return this.reminders.get(id) || null;
  }

  async completeReminder(id: string): Promise<boolean> {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      console.warn(`[ReminderManager] Reminder ${id} not found`);
      return false;
    }

    reminder.completed = true;
    this.saveReminders();

    // Update in RAG memory
    try {
      const memories = await ragMemoryManager.retrieveRelevantMemories(
        `Reminder ${id}`,
        { memoryType: 'reminder', limit: 1 }
      );

      if (memories.length > 0) {
        const memory = memories[0].memory;
        memory.metadata.completed = true;
        await ragMemoryManager.updateMemory(memory.id, memory);
      }
    } catch (error) {
      console.error('[ReminderManager] Failed to update reminder in RAG:', error);
    }

    console.log(`[ReminderManager] Completed reminder: ${id}`);
    return true;
  }

  async deleteReminder(id: string): Promise<boolean> {
    const deleted = this.reminders.delete(id);
    if (deleted) {
      this.saveReminders();
      console.log(`[ReminderManager] Deleted reminder: ${id}`);
    }
    return deleted;
  }

  startNotificationChecks(callback: (message: string) => void): void {
    this.notificationCallback = callback;

    if (this.checkTimer !== null) {
      clearInterval(this.checkTimer);
    }

    // Initial check
    this.checkReminders();

    // Check every minute
    this.checkTimer = window.setInterval(() => {
      this.checkReminders();
    }, CHECK_INTERVAL);

    console.log('[ReminderManager] Started notification checks');
  }

  stopNotificationChecks(): void {
    if (this.checkTimer !== null) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.notificationCallback = null;
    console.log('[ReminderManager] Stopped notification checks');
  }

  private checkReminders(): void {
    const now = new Date();

    for (const reminder of this.reminders.values()) {
      if (reminder.completed) continue;

      const timeUntilDue = reminder.dueDate.getTime() - now.getTime();
      const minutesUntilDue = Math.floor(timeUntilDue / 60000);

      // Check if reminder is overdue
      if (timeUntilDue < 0 && !reminder.notified.every(n => n)) {
        this.sendNotification(
          `Your reminder "${reminder.title}" is now overdue.`,
          reminder
        );
        reminder.notified = new Array(reminder.notificationTimes.length).fill(true);
        this.saveReminders();
        continue;
      }

      // Check notification times
      for (let i = 0; i < reminder.notificationTimes.length; i++) {
        const notifyAt = reminder.notificationTimes[i];
        
        if (reminder.notified[i]) continue;

        if (minutesUntilDue <= notifyAt && minutesUntilDue >= 0) {
          const timeDesc = this.formatTimeUntil(reminder.dueDate);
          this.sendNotification(
            `Reminder: ${reminder.title}. This is due ${timeDesc}.`,
            reminder
          );
          reminder.notified[i] = true;
          this.saveReminders();
        }
      }
    }
  }

  private sendNotification(message: string, reminder: Reminder): void {
    console.log(`[ReminderManager] Notification: ${message}`);

    // Speak notification via callback
    if (this.notificationCallback) {
      this.notificationCallback(message);
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('NIRVANA Reminder', {
        body: message,
        icon: '/favicon.ico',
        tag: reminder.id,
      });
    }

    // Dispatch event
    window.dispatchEvent(
      new CustomEvent('nirvana-reminder-notification', {
        detail: { message, reminder },
      })
    );
  }

  private formatTimeUntil(dueDate: Date): string {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return 'now';
  }

  async parseNaturalLanguage(
    input: string,
    aiCallback: (messages: any[]) => Promise<string>
  ): Promise<{ title: string; dueDate: Date; notificationTimes: number[]; description?: string } | null> {
    try {
      const systemPrompt = `You are a natural language parser for reminders. Extract reminder details from user input.

Return a JSON object with:
- title: Brief title for the reminder
- dueDate: ISO date string
- notificationTimes: Array of minutes before due to notify (e.g., [10, 60, 1440])
- description: Optional longer description

Examples:
- "Remind me to call mom tomorrow at 3pm" → {"title": "Call mom", "dueDate": "2025-10-31T15:00:00Z", "notificationTimes": [30, 60]}
- "Set a reminder for project deadline next Friday, notify me a day before" → {"title": "Project deadline", "dueDate": "2025-11-03T17:00:00Z", "notificationTimes": [1440]}
- "Remind me in 10 minutes to check the oven" → {"title": "Check the oven", "dueDate": "2025-10-30T...:10:00Z", "notificationTimes": [1]}

Current date/time: ${new Date().toISOString()}

Return ONLY the JSON object, no other text.`;

      const response = await aiCallback([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ]);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[ReminderManager] No JSON found in AI response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        title: parsed.title,
        dueDate: new Date(parsed.dueDate),
        notificationTimes: parsed.notificationTimes || [30, 60],
        description: parsed.description,
      };
    } catch (error) {
      console.error('[ReminderManager] Failed to parse natural language:', error);
      return null;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[ReminderManager] Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }
}

export const reminderManager = new ReminderManager();
