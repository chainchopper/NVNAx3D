import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { chatterboxTTS, ChatterboxVoice } from '../services/chatterbox-tts';

@customElement('chatterbox-settings')
export class ChatterboxSettings extends LitElement {
  @state() endpoint = '';
  @state() apiKey = '';
  @state() voices: ChatterboxVoice[] = [];
  @state() selectedVoice = '';
  @state() isLoading = false;
  @state() cloneVoiceName = '';
  @state() audioFile: File | null = null;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadConfig();
  }

  async loadConfig() {
    await chatterboxTTS.loadConfig();
    const config = chatterboxTTS.getConfig();
    if (config) {
      this.endpoint = config.endpoint;
      this.selectedVoice = config.defaultVoice;
      this.voices = config.voices;
    }
  }

  async saveConfig() {
    this.isLoading = true;
    try {
      await chatterboxTTS.saveConfig({
        endpoint: this.endpoint,
        apiKey: this.apiKey || undefined,
        defaultVoice: this.selectedVoice,
        voices: this.voices,
      });
      
      this.voices = await chatterboxTTS.listVoices();
      
      this.dispatchEvent(new CustomEvent('config-saved', { detail: { success: true } }));
    } catch (error) {
      console.error('Failed to save Chatterbox config:', error);
      this.dispatchEvent(new CustomEvent('config-saved', { detail: { success: false, error } }));
    } finally {
      this.isLoading = false;
    }
  }

  async handleCloneVoice() {
    if (!this.audioFile || !this.cloneVoiceName) {
      alert('Please provide voice name and audio file');
      return;
    }

    this.isLoading = true;
    try {
      const clonedVoice = await chatterboxTTS.cloneVoice({
        voiceName: this.cloneVoiceName,
        audioData: this.audioFile,
        description: `Cloned voice for ${this.cloneVoiceName}`,
      });
      
      // Reassign to trigger reactivity
      this.voices = [...this.voices, clonedVoice];
      this.cloneVoiceName = '';
      this.audioFile = null;
      
      alert(`Voice "${clonedVoice.name}" cloned successfully!`);
    } catch (error) {
      console.error('Voice cloning failed:', error);
      alert('Voice cloning failed. See console for details.');
    } finally {
      this.isLoading = false;
    }
  }

  render() {
    return html`
      <div class="chatterbox-settings">
        <h3>Chatterbox TTS Configuration</h3>
        
        <div class="field">
          <label>API Endpoint URL</label>
          <input 
            type="text" 
            .value="${this.endpoint}"
            @input="${(e: Event) => this.endpoint = (e.target as HTMLInputElement).value}"
            placeholder="https://your-chatterbox-api.com"
          />
        </div>

        <div class="field">
          <label>API Key (Optional)</label>
          <input 
            type="password" 
            .value="${this.apiKey}"
            @input="${(e: Event) => this.apiKey = (e.target as HTMLInputElement).value}"
            placeholder="Optional API key"
          />
        </div>

        <div class="field">
          <label>Default Voice</label>
          <select .value="${this.selectedVoice}" @change="${(e: Event) => this.selectedVoice = (e.target as HTMLSelectElement).value}">
            <option value="">Select voice...</option>
            ${this.voices.map(v => html`
              <option value="${v.id}">${v.name} ${v.isCloned ? '(Cloned)' : ''}</option>
            `)}
          </select>
        </div>

        <button @click="${this.saveConfig}" ?disabled="${this.isLoading}">
          ${this.isLoading ? 'Saving...' : 'Save Configuration'}
        </button>

        <hr />

        <h4>Voice Cloning</h4>
        <div class="field">
          <label>Voice Name</label>
          <input 
            type="text" 
            .value="${this.cloneVoiceName}"
            @input="${(e: Event) => this.cloneVoiceName = (e.target as HTMLInputElement).value}"
            placeholder="My Voice"
          />
        </div>

        <div class="field">
          <label>Audio Sample (WAV recommended)</label>
          <input 
            type="file" 
            accept="audio/*"
            @change="${(e: Event) => this.audioFile = (e.target as HTMLInputElement).files?.[0] || null}"
          />
        </div>

        <button @click="${this.handleCloneVoice}" ?disabled="${this.isLoading || !this.audioFile || !this.cloneVoiceName}">
          ${this.isLoading ? 'Cloning...' : 'Clone Voice'}
        </button>
      </div>
    `;
  }

  static styles = css`
    .chatterbox-settings {
      padding: 20px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 10px;
    }

    h3, h4 {
      color: white;
      margin-top: 0;
    }

    .field {
      margin-bottom: 15px;
    }

    label {
      display: block;
      color: white;
      margin-bottom: 5px;
      font-size: 14px;
    }

    input, select {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 5px;
      color: white;
      font-size: 14px;
    }

    button {
      padding: 10px 20px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }

    button:hover:not(:disabled) {
      background: #45a049;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      margin: 20px 0;
    }
  `;
}
