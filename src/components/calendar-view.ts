/**
 * Calendar View Component
 * Visual calendar with natural language event creation
 */

import { LitElement, html, css } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
  color?: string;
}

@customElement('calendar-view')
export class CalendarView extends LitElement {
  @property({ type: Boolean }) visible = false;
  
  @state() private currentDate = new Date();
  @state() private events: CalendarEvent[] = [];
  @state() private selectedDate: Date | null = null;
  @state() private view: 'month' | 'week' | 'day' | 'agenda' = 'month';
  @state() private newEventText = '';
  @state() private loading = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 900px;
      max-width: 95vw;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(20px);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .header {
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .header-top h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 8px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .view-controls {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .view-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 6px 12px;
      color: white;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .view-button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .view-button.active {
      background: rgba(66, 153, 225, 0.3);
      border-color: rgba(66, 153, 225, 0.6);
    }

    .nav-controls {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 12px;
    }

    .nav-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      padding: 8px 16px;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-button:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .current-month {
      flex: 1;
      text-align: center;
      font-size: 18px;
      font-weight: 600;
    }

    .quick-add {
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(66, 153, 225, 0.1);
    }

    .quick-add-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 10px 14px;
      color: white;
      font-size: 14px;
      font-family: inherit;
    }

    .quick-add-input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .quick-add-hint {
      margin-top: 6px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
    }

    .calendar-content {
      height: calc(100% - 200px);
      overflow-y: auto;
      padding: 16px;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 1px;
      background: rgba(255, 255, 255, 0.1);
    }

    .calendar-day-header {
      padding: 8px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      background: rgba(0, 0, 0, 0.3);
      color: rgba(255, 255, 255, 0.6);
    }

    .calendar-day {
      min-height: 100px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: background 0.2s;
    }

    .calendar-day:hover {
      background: rgba(66, 153, 225, 0.1);
    }

    .calendar-day.today {
      background: rgba(66, 153, 225, 0.2);
      border: 2px solid rgba(66, 153, 225, 0.5);
    }

    .calendar-day.other-month {
      opacity: 0.4;
    }

    .day-number {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .day-events {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .event-item {
      background: rgba(66, 153, 225, 0.4);
      border-left: 3px solid #4299e1;
      padding: 2px 4px;
      font-size: 10px;
      border-radius: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .agenda-view {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .agenda-day {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 12px;
    }

    .agenda-date {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #4299e1;
    }

    .agenda-event {
      background: rgba(0, 0, 0, 0.3);
      border-left: 4px solid #4299e1;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 4px;
    }

    .agenda-event-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .agenda-event-time {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 4px;
    }

    .agenda-event-location {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }
  `;

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close-calendar'));
  }

  private handleViewChange(view: 'month' | 'week' | 'day' | 'agenda') {
    this.view = view;
  }

  private handlePrevious() {
    const newDate = new Date(this.currentDate);
    if (this.view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (this.view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    this.currentDate = newDate;
  }

  private handleNext() {
    const newDate = new Date(this.currentDate);
    if (this.view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (this.view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    this.currentDate = newDate;
  }

  private handleToday() {
    this.currentDate = new Date();
  }

  private async handleQuickAdd(e: KeyboardEvent) {
    if (e.key === 'Enter' && this.newEventText.trim()) {
      this.loading = true;
      
      this.dispatchEvent(new CustomEvent('create-event', {
        detail: { naturalLanguage: this.newEventText },
        bubbles: true,
        composed: true
      }));
      
      this.newEventText = '';
      this.loading = false;
    }
  }

  private renderMonthView() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const isToday = 
        currentDate.getDate() === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();
      
      const isOtherMonth = currentDate.getMonth() !== month;
      
      const dayEvents = this.events.filter(event => 
        event.start.toDateString() === currentDate.toDateString()
      );
      
      days.push(html`
        <div class="calendar-day ${isToday ? 'today' : ''} ${isOtherMonth ? 'other-month' : ''}">
          <div class="day-number">${currentDate.getDate()}</div>
          <div class="day-events">
            ${dayEvents.map(event => html`
              <div class="event-item" title="${event.title}">
                ${event.title}
              </div>
            `)}
          </div>
        </div>
      `);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return html`
      <div class="calendar-grid">
        <div class="calendar-day-header">Sun</div>
        <div class="calendar-day-header">Mon</div>
        <div class="calendar-day-header">Tue</div>
        <div class="calendar-day-header">Wed</div>
        <div class="calendar-day-header">Thu</div>
        <div class="calendar-day-header">Fri</div>
        <div class="calendar-day-header">Sat</div>
        ${days}
      </div>
    `;
  }

  private renderAgendaView() {
    const upcomingEvents = this.events
      .filter(event => event.start >= new Date())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 20);
    
    const eventsByDate = new Map<string, CalendarEvent[]>();
    upcomingEvents.forEach(event => {
      const dateKey = event.start.toDateString();
      if (!eventsByDate.has(dateKey)) {
        eventsByDate.set(dateKey, []);
      }
      eventsByDate.get(dateKey)!.push(event);
    });
    
    return html`
      <div class="agenda-view">
        ${Array.from(eventsByDate.entries()).map(([date, events]) => html`
          <div class="agenda-day">
            <div class="agenda-date">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            ${events.map(event => html`
              <div class="agenda-event">
                <div class="agenda-event-title">${event.title}</div>
                <div class="agenda-event-time">
                  ${event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  ${event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                ${event.location ? html`
                  <div class="agenda-event-location">📍 ${event.location}</div>
                ` : ''}
              </div>
            `)}
          </div>
        `)}
        ${eventsByDate.size === 0 ? html`
          <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.5);">
            No upcoming events
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    const monthName = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    return html`
      <div class="header">
        <div class="header-top">
          <h2>📅 Calendar</h2>
          <button class="close-btn" @click="${this.handleClose}">✕</button>
        </div>
        
        <div class="view-controls">
          <button 
            class="view-button ${this.view === 'month' ? 'active' : ''}"
            @click="${() => this.handleViewChange('month')}"
          >Month</button>
          <button 
            class="view-button ${this.view === 'week' ? 'active' : ''}"
            @click="${() => this.handleViewChange('week')}"
          >Week</button>
          <button 
            class="view-button ${this.view === 'day' ? 'active' : ''}"
            @click="${() => this.handleViewChange('day')}"
          >Day</button>
          <button 
            class="view-button ${this.view === 'agenda' ? 'active' : ''}"
            @click="${() => this.handleViewChange('agenda')}"
          >Agenda</button>
        </div>
        
        <div class="nav-controls">
          <button class="nav-button" @click="${this.handlePrevious}">Previous</button>
          <div class="current-month">${monthName}</div>
          <button class="nav-button" @click="${this.handleNext}">Next</button>
          <button class="nav-button" @click="${this.handleToday}">Today</button>
        </div>
      </div>
      
      <div class="quick-add">
        <input 
          type="text"
          class="quick-add-input"
          placeholder="Quick add event (e.g., 'Meeting with John tomorrow at 2pm')"
          .value="${this.newEventText}"
          @input="${(e: any) => this.newEventText = e.target.value}"
          @keydown="${this.handleQuickAdd}"
          ?disabled="${this.loading}"
        />
        <div class="quick-add-hint">Press Enter to create event from natural language</div>
      </div>
      
      <div class="calendar-content">
        ${this.view === 'month' ? this.renderMonthView() : this.renderAgendaView()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'calendar-view': CalendarView;
  }
}
