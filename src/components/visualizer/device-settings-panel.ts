/**
 * Device Settings Panel
 * 
 * Configures device sensors, background services, priority, and inactivity settings
 * Settings are passed to PersonI awareness via system-context-service
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';

interface DeviceSettings {
  sensors: {
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
    proximity: boolean;
  };
  audio: {
    defaultMicrophone: string;
    inputVolume: number;
    echoCancel: boolean;
    noiseSuppression: boolean;
  };
  camera: {
    defaultCamera: string;
    resolution: string;
  };
  backgroundServices: {
    enabled: boolean;
    priority: 'low' | 'normal' | 'high';
    sleepAfterInactivity: boolean;
    inactivityTimeout: number; // minutes
  };
  idleMode: {
    enabled: boolean;
    role: 'security' | 'maintenance' | 'monitoring' | 'custom';
    customInstructions: string;
    enableVision: boolean;
    enableObjectRecognition: boolean;
    enableVoiceRecording: boolean;
    enableConnectors: boolean;
  };
}

@customElement('device-settings-panel')
export class DeviceSettingsPanel extends LitElement {
  @state() private settings: DeviceSettings = this.getDefaultSettings();
  @state() private availableMicrophones: MediaDeviceInfo[] = [];
  @state() private availableCameras: MediaDeviceInfo[] = [];

  private getDefaultSettings(): DeviceSettings {
    const stored = localStorage.getItem('nirvana_device_settings');
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      sensors: {
        accelerometer: false,
        gyroscope: false,
        magnetometer: false,
        proximity: false
      },
      audio: {
        defaultMicrophone: 'default',
        inputVolume: 80,
        echoCancel: true,
        noiseSuppression: true
      },
      camera: {
        defaultCamera: 'default',
        resolution: '720p'
      },
      backgroundServices: {
        enabled: true,
        priority: 'normal',
        sleepAfterInactivity: false,
        inactivityTimeout: 30
      },
      idleMode: {
        enabled: false,
        role: 'security',
        customInstructions: '',
        enableVision: true,
        enableObjectRecognition: true,
        enableVoiceRecording: false,
        enableConnectors: true
      }
    };
  }

  static override styles = css`
    :host {
      display: block;
      color: #fff;
      padding: 20px;
      overflow-y: auto;
      max-height: 100%;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #87CEFA;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(135, 206, 250, 0.2);
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .setting-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
    }

    .setting-description {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 4px;
    }

    .toggle-switch {
      position: relative;
      width: 48px;
      height: 24px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.3s ease;
    }

    .toggle-switch.active {
      background: rgba(76, 175, 80, 0.4);
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s ease;
    }

    .toggle-switch.active::after {
      transform: translateX(24px);
    }

    select, input[type="range"], input[type="number"], textarea {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }

    select:hover, input:hover, textarea:hover {
      border-color: rgba(135, 206, 250, 0.3);
      background: rgba(255, 255, 255, 0.08);
    }

    select:focus, input:focus, textarea:focus {
      border-color: rgba(135, 206, 250, 0.6);
      background: rgba(255, 255, 255, 0.1);
    }

    textarea {
      width: 100%;
      min-height: 80px;
      resize: vertical;
      font-family: inherit;
    }

    input[type="range"] {
      width: 150px;
    }

    .value-display {
      display: inline-block;
      min-width: 40px;
      text-align: right;
      margin-left: 8px;
      color: #87CEFA;
      font-weight: 600;
    }

    .warning-banner {
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 13px;
      color: rgba(255, 152, 0, 0.9);
    }

    .save-button {
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid rgba(76, 175, 80, 0.4);
      color: #4CAF50;
      padding: 10px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
      margin-top: 20px;
    }

    .save-button:hover {
      background: rgba(76, 175, 80, 0.3);
      border-color: rgba(76, 175, 80, 0.6);
    }
  `;

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this.loadDevices();
  }

  private async loadDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableMicrophones = devices.filter(d => d.kind === 'audioinput');
      this.availableCameras = devices.filter(d => d.kind === 'videoinput');
      this.requestUpdate();
    } catch (error) {
      console.error('[DeviceSettings] Failed to enumerate devices:', error);
    }
  }

  private saveSettings(): void {
    localStorage.setItem('nirvana_device_settings', JSON.stringify(this.settings));
    
    this.dispatchEvent(new CustomEvent('device-settings-changed', {
      detail: this.settings,
      bubbles: true,
      composed: true
    }));
  }

  private toggleSensor(sensor: keyof DeviceSettings['sensors']): void {
    this.settings.sensors[sensor] = !this.settings.sensors[sensor];
    this.saveSettings();
    this.requestUpdate();
  }

  private toggleIdleMode(): void {
    this.settings.idleMode.enabled = !this.settings.idleMode.enabled;
    this.saveSettings();
    this.requestUpdate();
  }

  override render() {
    return html`
      ${this.settings.idleMode.enabled ? html`
        <div class="warning-banner">
          ⚠️ Idle Mode Active - Device sensors and services will continue running when inactive
        </div>
      ` : ''}

      <!-- Sensors Section -->
      <div class="section">
        <div class="section-title">📡 Device Sensors</div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Accelerometer</div>
            <div class="setting-description">Track device movement and orientation</div>
          </div>
          <div class="toggle-switch ${this.settings.sensors.accelerometer ? 'active' : ''}"
               @click=${() => this.toggleSensor('accelerometer')}></div>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Gyroscope</div>
            <div class="setting-description">Measure rotation and angular velocity</div>
          </div>
          <div class="toggle-switch ${this.settings.sensors.gyroscope ? 'active' : ''}"
               @click=${() => this.toggleSensor('gyroscope')}></div>
        </div>
      </div>

      <!-- Audio Settings -->
      <div class="section">
        <div class="section-title">🎤 Audio Settings</div>
        
        <div class="setting-row">
          <div class="setting-label">Default Microphone</div>
          <select .value=${this.settings.audio.defaultMicrophone}
                  @change=${(e: Event) => {
                    this.settings.audio.defaultMicrophone = (e.target as HTMLSelectElement).value;
                    this.saveSettings();
                  }}>
            <option value="default">System Default</option>
            ${this.availableMicrophones.map(mic => html`
              <option value="${mic.deviceId}">${mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}</option>
            `)}
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-label">Input Volume</div>
          <div>
            <input type="range" min="0" max="100" .value=${this.settings.audio.inputVolume.toString()}
                   @input=${(e: Event) => {
                     this.settings.audio.inputVolume = parseInt((e.target as HTMLInputElement).value);
                     this.saveSettings();
                     this.requestUpdate();
                   }}>
            <span class="value-display">${this.settings.audio.inputVolume}%</span>
          </div>
        </div>
      </div>

      <!-- Camera Settings -->
      <div class="section">
        <div class="section-title">📷 Camera Settings</div>
        
        <div class="setting-row">
          <div class="setting-label">Default Camera</div>
          <select .value=${this.settings.camera.defaultCamera}
                  @change=${(e: Event) => {
                    this.settings.camera.defaultCamera = (e.target as HTMLSelectElement).value;
                    this.saveSettings();
                  }}>
            <option value="default">System Default</option>
            ${this.availableCameras.map(cam => html`
              <option value="${cam.deviceId}">${cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}</option>
            `)}
          </select>
        </div>

        <div class="setting-row">
          <div class="setting-label">Resolution</div>
          <select .value=${this.settings.camera.resolution}
                  @change=${(e: Event) => {
                    this.settings.camera.resolution = (e.target as HTMLSelectElement).value;
                    this.saveSettings();
                  }}>
            <option value="480p">480p (640×480)</option>
            <option value="720p">720p (1280×720)</option>
            <option value="1080p">1080p (1920×1080)</option>
          </select>
        </div>
      </div>

      <!-- Background Services -->
      <div class="section">
        <div class="section-title">⚙️ Background Services</div>
        
        <div class="setting-row">
          <div class="setting-label">Priority Level</div>
          <select .value=${this.settings.backgroundServices.priority}
                  @change=${(e: Event) => {
                    this.settings.backgroundServices.priority = (e.target as HTMLSelectElement).value as any;
                    this.saveSettings();
                  }}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">Sleep After Inactivity</div>
            <div class="setting-description">Pause services when idle (timeout: ${this.settings.backgroundServices.inactivityTimeout}min)</div>
          </div>
          <div class="toggle-switch ${this.settings.backgroundServices.sleepAfterInactivity ? 'active' : ''}"
               @click=${() => {
                 this.settings.backgroundServices.sleepAfterInactivity = !this.settings.backgroundServices.sleepAfterInactivity;
                 this.saveSettings();
                 this.requestUpdate();
               }}></div>
        </div>

        ${this.settings.backgroundServices.sleepAfterInactivity ? html`
          <div class="setting-row">
            <div class="setting-label">Inactivity Timeout (minutes)</div>
            <input type="number" min="1" max="120" .value=${this.settings.backgroundServices.inactivityTimeout.toString()}
                   @change=${(e: Event) => {
                     this.settings.backgroundServices.inactivityTimeout = parseInt((e.target as HTMLInputElement).value);
                     this.saveSettings();
                   }}>
          </div>
        ` : ''}
      </div>

      <!-- Idle Mode -->
      <div class="section">
        <div class="section-title">🌙 Idle Mode (Security/Monitoring)</div>
        
        <div class="setting-row">
          <div>
            <div class="setting-label">Enable Idle Mode</div>
            <div class="setting-description">Run autonomous tasks when inactive</div>
          </div>
          <div class="toggle-switch ${this.settings.idleMode.enabled ? 'active' : ''}"
               @click=${this.toggleIdleMode}></div>
        </div>

        ${this.settings.idleMode.enabled ? html`
          <div class="setting-row">
            <div class="setting-label">Idle Role</div>
            <select .value=${this.settings.idleMode.role}
                    @change=${(e: Event) => {
                      this.settings.idleMode.role = (e.target as HTMLSelectElement).value as any;
                      this.saveSettings();
                    }}>
              <option value="security">Security Monitoring</option>
              <option value="maintenance">Maintenance & Health Checks</option>
              <option value="monitoring">General Monitoring</option>
              <option value="custom">Custom Instructions</option>
            </select>
          </div>

          ${this.settings.idleMode.role === 'custom' ? html`
            <div class="setting-row">
              <div style="flex: 1;">
                <div class="setting-label">Custom Instructions</div>
                <textarea placeholder="Describe what PersonI should do when idle..."
                          .value=${this.settings.idleMode.customInstructions}
                          @input=${(e: Event) => {
                            this.settings.idleMode.customInstructions = (e.target as HTMLTextAreaElement).value;
                            this.saveSettings();
                          }}></textarea>
              </div>
            </div>
          ` : ''}

          <div class="setting-row">
            <div class="setting-label">Enable Vision</div>
            <div class="toggle-switch ${this.settings.idleMode.enableVision ? 'active' : ''}"
                 @click=${() => {
                   this.settings.idleMode.enableVision = !this.settings.idleMode.enableVision;
                   this.saveSettings();
                   this.requestUpdate();
                 }}></div>
          </div>

          <div class="setting-row">
            <div class="setting-label">Enable Object Recognition</div>
            <div class="toggle-switch ${this.settings.idleMode.enableObjectRecognition ? 'active' : ''}"
                 @click=${() => {
                   this.settings.idleMode.enableObjectRecognition = !this.settings.idleMode.enableObjectRecognition;
                   this.saveSettings();
                   this.requestUpdate();
                 }}></div>
          </div>
        ` : ''}
      </div>

      <button class="save-button" @click=${this.saveSettings}>
        💾 Save Device Settings
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'device-settings-panel': DeviceSettingsPanel;
  }
}
