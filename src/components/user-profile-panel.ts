/**
 * User Profile Panel Component
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { userProfileManager } from '../services/user-profile-manager';
import { UserProfile } from '../types/user-profile';

@customElement('user-profile-panel')
export class UserProfilePanel extends LitElement {
  @state() profile: UserProfile;
  @state() editedProfile: Partial<UserProfile> = {};
  @state() hasChanges = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 400px;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(20px);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      overflow-y: auto;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
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

    .content {
      padding: 24px;
    }

    .profile-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: bold;
      color: white;
      margin: 0 auto 24px;
      border: 3px solid rgba(255, 255, 255, 0.2);
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255, 255, 255, 0.6);
      margin-bottom: 16px;
    }

    .input-group {
      margin-bottom: 16px;
    }

    .input-group label {
      display: block;
      font-size: 14px;
      margin-bottom: 8px;
      color: rgba(255, 255, 255, 0.8);
    }

    .input-group input,
    .input-group select,
    .input-group textarea {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
      box-sizing: border-box;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .input-group input:focus,
    .input-group select:focus,
    .input-group textarea:focus {
      outline: none;
      border-color: #2196f3;
    }

    .input-group textarea {
      min-height: 100px;
      resize: vertical;
    }

    .input-group select option {
      background: #1a1a24;
      color: white;
    }

    .input-hint {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 4px;
    }

    .btn {
      padding: 12px 24px;
      border-radius: 6px;
      border: none;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-primary {
      background: #2196f3;
      color: white;
      width: 100%;
      margin-bottom: 8px;
    }

    .btn-primary:hover {
      background: #1976d2;
    }

    .btn-primary:disabled {
      background: rgba(33, 150, 243, 0.3);
      cursor: not-allowed;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      width: 100%;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .info-card {
      background: rgba(33, 150, 243, 0.1);
      border: 1px solid rgba(33, 150, 243, 0.3);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .info-card-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #64b5f6;
    }

    .info-card-text {
      font-size: 13px;
      opacity: 0.9;
      line-height: 1.5;
    }

    .required {
      color: #f44336;
      margin-left: 2px;
    }
  `;

  constructor() {
    super();
    this.profile = userProfileManager.getProfile();
    this.editedProfile = { ...this.profile };
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadProfile();
  }

  loadProfile() {
    this.profile = userProfileManager.getProfile();
    this.editedProfile = { ...this.profile };
    this.hasChanges = false;
  }

  handleInputChange(field: keyof UserProfile, value: any) {
    this.editedProfile = {
      ...this.editedProfile,
      [field]: value,
    };
    this.hasChanges = true;
    this.requestUpdate();
  }

  handlePreferenceChange(field: string, value: any) {
    this.editedProfile = {
      ...this.editedProfile,
      preferences: {
        ...this.editedProfile.preferences,
        [field]: value,
      },
    };
    this.hasChanges = true;
    this.requestUpdate();
  }

  handleSave() {
    if (!this.editedProfile.name || this.editedProfile.name.trim() === '') {
      alert('Name is required');
      return;
    }

    userProfileManager.updateProfile(this.editedProfile);
    this.hasChanges = false;
    this.loadProfile();
    
    this.dispatchEvent(new CustomEvent('profile-saved', {
      detail: this.profile,
    }));
  }

  handleCancel() {
    this.loadProfile();
  }

  handleClose() {
    if (this.hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        this.dispatchEvent(new CustomEvent('close'));
      }
    } else {
      this.dispatchEvent(new CustomEvent('close'));
    }
  }

  getInitials(): string {
    const name = this.editedProfile.name || this.profile.name || 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  render() {
    return html`
      <div class="header">
        <h2>User Profile</h2>
        <button class="close-btn" @click=${this.handleClose}>×</button>
      </div>

      <div class="content">
        <div class="profile-avatar">
          ${this.getInitials()}
        </div>

        <div class="info-card">
          <div class="info-card-title">📝 About Your Profile</div>
          <div class="info-card-text">
            This information helps PersonI assistants understand who they're talking to and provide more personalized responses.
          </div>
        </div>

        <div class="section">
          <div class="section-title">Basic Information</div>

          <div class="input-group">
            <label>Name <span class="required">*</span></label>
            <input
              type="text"
              .value=${this.editedProfile.name || ''}
              @input=${(e: Event) => this.handleInputChange('name', (e.target as HTMLInputElement).value)}
              placeholder="Enter your name"
            />
            <div class="input-hint">How PersonI should address you</div>
          </div>

          <div class="input-group">
            <label>Pronouns</label>
            <input
              type="text"
              .value=${this.editedProfile.pronouns || ''}
              @input=${(e: Event) => this.handleInputChange('pronouns', (e.target as HTMLInputElement).value)}
              placeholder="e.g., they/them, she/her, he/him"
            />
            <div class="input-hint">Optional - helps PersonI use correct pronouns</div>
          </div>

          <div class="input-group">
            <label>Timezone</label>
            <input
              type="text"
              .value=${this.editedProfile.timezone || ''}
              @input=${(e: Event) => this.handleInputChange('timezone', (e.target as HTMLInputElement).value)}
              placeholder="e.g., America/New_York, Europe/London"
            />
            <div class="input-hint">Optional - for time-aware features</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">About You</div>

          <div class="input-group">
            <label>Custom Context</label>
            <textarea
              .value=${this.editedProfile.customContext || ''}
              @input=${(e: Event) => this.handleInputChange('customContext', (e.target as HTMLInputElement).value)}
              placeholder="Tell PersonI about yourself... your interests, profession, or anything you'd like them to know"
            ></textarea>
            <div class="input-hint">
              This context is included in conversations to help PersonI understand you better
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Preferences</div>

          <div class="input-group">
            <label>Preferred PersonI</label>
            <select
              .value=${this.editedProfile.preferences?.preferredPersoni || ''}
              @change=${(e: Event) => this.handlePreferenceChange('preferredPersoni', (e.target as HTMLSelectElement).value)}
            >
              <option value="">None (use last selected)</option>
              <option value="NIRVANA">NIRVANA</option>
              <option value="ATHENA">ATHENA</option>
              <option value="ADAM">ADAM</option>
              <option value="THEO">THEO</option>
              <option value="GHOST">GHOST</option>
            </select>
            <div class="input-hint">Which PersonI to load by default</div>
          </div>
        </div>

        <div class="section">
          <button 
            class="btn btn-primary" 
            @click=${this.handleSave}
            ?disabled=${!this.hasChanges}
          >
            ${this.hasChanges ? 'Save Changes' : 'Saved'}
          </button>
          ${this.hasChanges ? html`
            <button class="btn btn-secondary" @click=${this.handleCancel}>
              Cancel
            </button>
          ` : ''}
        </div>

        <div style="font-size: 12px; opacity: 0.5; text-align: center;">
          Last updated: ${new Date(this.profile.updatedAt).toLocaleDateString()}
        </div>
      </div>
    `;
  }
}
