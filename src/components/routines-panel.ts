/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { routineExecutor } from '../services/routine-executor';
import type { RoutineSummary, RoutineDetail, RoutineTrigger, RoutineCondition, RoutineAction } from '../types/routine-types';

type RoutinePanelMode = 'list' | 'create' | 'edit';

@customElement('routines-panel')
export class RoutinesPanel extends LitElement {
  @state() mode: RoutinePanelMode = 'list';
  @state() routines: RoutineSummary[] = [];
  @state() editingRoutine: RoutineDetail | null = null;
  @state() searchQuery = '';
  @state() filterTag = '';
  @state() loading = false;

  @state() formName = '';
  @state() formDescription = '';
  @state() formTriggerType: 'time' | 'event' | 'state_change' | 'user_action' | 'completion' = 'time';
  @state() formTriggerSchedule = 'every day';
  @state() formTags: string[] = [];
  @state() formActions: RoutineAction[] = [];
  @state() formConditions: RoutineCondition[] = [];

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .panel-content {
      height: 100%;
      overflow-y: auto;
      padding: 16px;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 8px;
    }

    .toolbar input {
      flex: 1;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: white;
    }

    .toolbar button {
      padding: 8px 16px;
      background: #87ceeb;
      color: #100c14;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .toolbar button:hover {
      background: #7ec8e3;
    }

    .routine-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .routine-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .routine-item:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(135, 206, 250, 0.5);
    }

    .routine-item.disabled {
      opacity: 0.5;
    }

    .routine-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .routine-name {
      font-weight: bold;
      font-size: 16px;
      color: #87ceeb;
    }

    .routine-actions {
      display: flex;
      gap: 8px;
    }

    .routine-actions button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    .routine-actions button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .routine-actions button.delete {
      color: #ff6b6b;
    }

    .routine-description {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      margin-bottom: 8px;
    }

    .routine-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    .routine-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .tag {
      background: rgba(135, 206, 250, 0.2);
      border: 1px solid rgba(135, 206, 250, 0.4);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 11px;
      color: #87ceeb;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: white;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 4px;
      color: white;
      box-sizing: border-box;
    }

    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }

    .action-list {
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
    }

    .action-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    .action-item button {
      background: none;
      border: none;
      color: #ff6b6b;
      cursor: pointer;
      padding: 4px 8px;
    }

    .form-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .form-actions button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .form-actions button.primary {
      background: #87ceeb;
      color: #100c14;
    }

    .form-actions button.secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .form-actions button:hover {
      opacity: 0.8;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: rgba(255, 255, 255, 0.5);
    }

    .empty-state-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadRoutines();
  }

  private async loadRoutines() {
    this.loading = true;
    try {
      const allRoutines = await routineExecutor.getRoutines();
      this.routines = allRoutines;
    } catch (error) {
      console.error('[RoutinesPanel] Error loading routines:', error);
    } finally {
      this.loading = false;
    }
  }

  private getFilteredRoutines(): RoutineSummary[] {
    let filtered = [...this.routines];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        routine =>
          routine.name.toLowerCase().includes(query) ||
          routine.description.toLowerCase().includes(query)
      );
    }

    if (this.filterTag) {
      filtered = filtered.filter(routine => routine.tags.includes(this.filterTag));
    }

    return filtered;
  }

  private handleCreateNew() {
    this.mode = 'create';
    this.resetForm();
  }

  private async handleEdit(routineId: string) {
    this.loading = true;
    try {
      const routine = await routineExecutor.getRoutineById(routineId);
      if (routine) {
        this.editingRoutine = routine;
        this.mode = 'edit';
        this.formName = routine.name;
        this.formDescription = routine.description;
        this.formTriggerType = routine.trigger.type;
        this.formTriggerSchedule = routine.trigger.config.schedule || 'every day';
        this.formTags = [...routine.tags];
        this.formActions = [...routine.actions];
        this.formConditions = [...routine.conditions];
      }
    } catch (error) {
      console.error('[RoutinesPanel] Error loading routine:', error);
    } finally {
      this.loading = false;
    }
  }

  private async handleToggle(routineId: string, event: Event) {
    event.stopPropagation();
    try {
      await routineExecutor.toggleRoutine(routineId);
      await this.loadRoutines();
    } catch (error) {
      console.error('[RoutinesPanel] Error toggling routine:', error);
    }
  }

  private async handleDelete(routineId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this routine?')) {
      try {
        await routineExecutor.deleteRoutine(routineId);
        await this.loadRoutines();
      } catch (error) {
        console.error('[RoutinesPanel] Error deleting routine:', error);
      }
    }
  }

  private async handleExecuteNow(routineId: string, event: Event) {
    event.stopPropagation();
    try {
      await routineExecutor.executeRoutine(routineId, true);
      alert('Routine executed successfully!');
      await this.loadRoutines();
    } catch (error: any) {
      console.error('[RoutinesPanel] Error executing routine:', error);
      alert(`Error executing routine: ${error.message}`);
    }
  }

  private resetForm() {
    this.formName = '';
    this.formDescription = '';
    this.formTriggerType = 'time';
    this.formTriggerSchedule = 'every day';
    this.formTags = [];
    this.formActions = [];
    this.formConditions = [];
    this.editingRoutine = null;
  }

  private handleAddAction() {
    const newAction: RoutineAction = {
      type: 'notification',
      parameters: { message: 'Routine executed' },
    };
    this.formActions = [...this.formActions, newAction];
  }

  private handleRemoveAction(index: number) {
    this.formActions = this.formActions.filter((_, i) => i !== index);
  }

  private async handleSave() {
    if (!this.formName.trim()) {
      alert('Please enter a routine name');
      return;
    }

    if (this.formActions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    const trigger: RoutineTrigger = {
      type: this.formTriggerType,
      config: {
        schedule: this.formTriggerType === 'time' ? this.formTriggerSchedule : undefined,
      },
    };

    try {
      if (this.mode === 'edit' && this.editingRoutine) {
        await routineExecutor.updateRoutine(this.editingRoutine.id, {
          name: this.formName,
          description: this.formDescription,
          trigger,
          conditions: this.formConditions,
          actions: this.formActions,
          tags: this.formTags,
        });
      } else {
        await routineExecutor.createRoutine({
          name: this.formName,
          description: this.formDescription,
          trigger,
          conditions: this.formConditions,
          actions: this.formActions,
          tags: this.formTags,
        });
      }

      this.mode = 'list';
      this.resetForm();
      await this.loadRoutines();
    } catch (error: any) {
      console.error('[RoutinesPanel] Error saving routine:', error);
      alert(`Error saving routine: ${error.message}`);
    }
  }

  private handleCancel() {
    this.mode = 'list';
    this.resetForm();
  }

  render() {
    if (this.mode === 'create' || this.mode === 'edit') {
      return this.renderForm();
    }

    return this.renderList();
  }

  private renderList() {
    const filteredRoutines = this.getFilteredRoutines();

    return html`
      <div class="panel-content">
        <div class="toolbar">
          <input
            type="text"
            placeholder="Search routines..."
            .value=${this.searchQuery}
            @input=${(e: Event) => (this.searchQuery = (e.target as HTMLInputElement).value)}
          />
          <button @click=${this.handleCreateNew}>+ New Routine</button>
        </div>

        ${filteredRoutines.length === 0
          ? html`
              <div class="empty-state">
                <div class="empty-state-icon">🤖</div>
                <div>No routines yet. Create your first automation!</div>
              </div>
            `
          : html`
              <ul class="routine-list">
                ${filteredRoutines.map(routine => this.renderRoutineItem(routine))}
              </ul>
            `}
      </div>
    `;
  }

  private renderRoutineItem(routine: RoutineSummary) {
    return html`
      <li class="routine-item ${routine.enabled ? '' : 'disabled'}" @click=${() => this.handleEdit(routine.id)}>
        <div class="routine-header">
          <div class="routine-name">${routine.name}</div>
          <div class="routine-actions">
            <button @click=${(e: Event) => this.handleToggle(routine.id, e)} title="Toggle enabled">
              ${routine.enabled ? '✓' : '○'}
            </button>
            <button @click=${(e: Event) => this.handleExecuteNow(routine.id, e)} title="Execute now">▶</button>
            <button class="delete" @click=${(e: Event) => this.handleDelete(routine.id, e)} title="Delete">×</button>
          </div>
        </div>
        <div class="routine-description">${routine.description}</div>
        <div class="routine-meta">
          <span>Executions: ${routine.executionCount}</span>
          ${routine.lastExecuted
            ? html`<span>Last: ${new Date(routine.lastExecuted).toLocaleString()}</span>`
            : html`<span>Never executed</span>`}
        </div>
        ${routine.tags.length > 0
          ? html`
              <div class="routine-tags">
                ${routine.tags.map(tag => html`<span class="tag">${tag}</span>`)}
              </div>
            `
          : ''}
      </li>
    `;
  }

  private renderForm() {
    return html`
      <div class="panel-content">
        <h3>${this.mode === 'edit' ? 'Edit Routine' : 'Create New Routine'}</h3>

        <div class="form-group">
          <label>Name</label>
          <input type="text" .value=${this.formName} @input=${(e: Event) => (this.formName = (e.target as HTMLInputElement).value)} />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea .value=${this.formDescription} @input=${(e: Event) => (this.formDescription = (e.target as HTMLTextAreaElement).value)}></textarea>
        </div>

        <div class="form-group">
          <label>Trigger Type</label>
          <select
            .value=${this.formTriggerType}
            @change=${(e: Event) => (this.formTriggerType = (e.target as HTMLSelectElement).value as any)}
          >
            <option value="time">Time-based</option>
            <option value="event">Event</option>
            <option value="state_change">State Change</option>
            <option value="user_action">User Action</option>
            <option value="completion">Task Completion</option>
          </select>
        </div>

        ${this.formTriggerType === 'time'
          ? html`
              <div class="form-group">
                <label>Schedule</label>
                <input
                  type="text"
                  .value=${this.formTriggerSchedule}
                  @input=${(e: Event) => (this.formTriggerSchedule = (e.target as HTMLInputElement).value)}
                  placeholder="e.g., every day, every 30 minutes, every hour"
                />
              </div>
            `
          : ''}

        <div class="form-group">
          <label>Actions</label>
          <div class="action-list">
            ${this.formActions.length === 0
              ? html`<div style="color: rgba(255,255,255,0.5); padding: 8px;">No actions yet</div>`
              : this.formActions.map((action, index) => this.renderActionItem(action, index))}
            <button @click=${this.handleAddAction} style="margin-top: 8px; padding: 8px;">+ Add Action</button>
          </div>
        </div>

        <div class="form-actions">
          <button class="secondary" @click=${this.handleCancel}>Cancel</button>
          <button class="primary" @click=${this.handleSave}>Save Routine</button>
        </div>
      </div>
    `;
  }

  private renderActionItem(action: RoutineAction, index: number) {
    return html`
      <div class="action-item">
        <div>
          <strong>${action.type}</strong>
          ${action.service ? html` - ${action.service}` : ''}
          ${action.method ? html` - ${action.method}` : ''}
        </div>
        <button @click=${() => this.handleRemoveAction(index)}>×</button>
      </div>
    `;
  }
}
