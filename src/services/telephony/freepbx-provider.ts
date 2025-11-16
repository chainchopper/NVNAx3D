import { getBackendUrl } from '../../config/backend-url';
import type { TelephonyProvider, SMSMessage, VoiceCall, CallControls } from './telephony-provider';

export class FreePBXProvider implements TelephonyProvider {
  readonly name = 'FreePBX';
  readonly providerType = 'freepbx';

  private sipEndpoint: string = '';
  private sipUsername: string = '';
  private sipPassword: string = '';
  private configured: boolean = false;

  async configure(credentials: Record<string, string>): Promise<boolean> {
    try {
      this.sipEndpoint = credentials.sipEndpoint || '';
      this.sipUsername = credentials.sipUsername || '';
      this.sipPassword = credentials.sipPassword || '';

      if (!this.sipEndpoint || !this.sipUsername || !this.sipPassword) {
        console.error('[FreePBX Provider] Missing required credentials');
        this.configured = false;
        return false;
      }

      const response = await fetch(getBackendUrl('/api/telephony/configure'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'freepbx',
          credentials: {
            sipEndpoint: this.sipEndpoint,
            sipUsername: this.sipUsername,
            sipPassword: this.sipPassword,
          }
        }),
      });

      const data = await response.json();
      this.configured = data.success || false;
      
      if (!this.configured) {
        console.error('[FreePBX Provider] Configuration failed:', data.error || 'Unknown error');
      }
      
      return this.configured;
    } catch (error) {
      console.error('[FreePBX Provider] Configuration error:', error);
      this.configured = false;
      return false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/freepbx/sms/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[FreePBX Provider] SMS send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getSMSHistory(limit: number = 50): Promise<{ success: boolean; messages?: SMSMessage[]; error?: string }> {
    try {
      const response = await fetch(getBackendUrl(`/api/freepbx/sms/history?limit=${limit}`));
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[FreePBX Provider] SMS history error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async makeCall(to: string, personaVoice?: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/freepbx/voice/call'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, personaVoice }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[FreePBX Provider] Make call error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getActiveCalls(): Promise<{ success: boolean; calls?: VoiceCall[]; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/freepbx/voice/calls'));
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[FreePBX Provider] Get active calls error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateCallControls(callSid: string, controls: Partial<CallControls>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/freepbx/voice/controls'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid, controls }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[FreePBX Provider] Update call controls error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangupCall(callSid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/freepbx/voice/hangup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[FreePBX Provider] Hangup call error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async connectMediaStream(callSid: string): Promise<WebSocket | null> {
    try {
      const wsUrl = getBackendUrl(`/api/freepbx/voice/media/${callSid}`).replace(/^http/, 'ws');
      const mediaWebSocket = new WebSocket(wsUrl);

      mediaWebSocket.addEventListener('open', () => {
        console.log('[FreePBX Provider] Media stream connected');
      });

      return mediaWebSocket;
    } catch (error) {
      console.error('[FreePBX Provider] Connect media stream error:', error);
      return null;
    }
  }

  disconnectMediaStream(): void {
    console.log('[FreePBX Provider] Media stream disconnected');
  }
}
