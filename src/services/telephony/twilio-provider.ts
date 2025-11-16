import { getBackendUrl } from '../../config/backend-url';
import type { TelephonyProvider, SMSMessage, VoiceCall, CallControls } from './telephony-provider';

export class TwilioProvider implements TelephonyProvider {
  readonly name = 'Twilio';
  readonly providerType = 'twilio';

  private mediaWebSocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private activeCallSid: string | null = null;
  private configured: boolean = false;

  async configure(credentials: Record<string, string>): Promise<boolean> {
    try {
      const response = await fetch(getBackendUrl('/api/telephony/configure'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'twilio',
          credentials
        }),
      });

      const data = await response.json();
      this.configured = data.success || false;
      
      if (!this.configured) {
        console.error('[Twilio Provider] Configuration failed:', data.error || 'Unknown error');
      }
      
      return this.configured;
    } catch (error) {
      console.error('[Twilio Provider] Configuration error:', error);
      this.configured = false;
      return false;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/twilio/sms/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Twilio Provider] SMS send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getSMSHistory(limit: number = 50): Promise<{ success: boolean; messages?: SMSMessage[]; error?: string }> {
    try {
      const response = await fetch(getBackendUrl(`/api/twilio/sms/history?limit=${limit}`));
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Twilio Provider] SMS history error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async makeCall(to: string, personaVoice?: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/twilio/voice/call'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, personaVoice }),
      });

      const data = await response.json();
      
      if (data.success && data.callSid) {
        this.activeCallSid = data.callSid;
      }
      
      return data;
    } catch (error) {
      console.error('[Twilio Provider] Make call error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getActiveCalls(): Promise<{ success: boolean; calls?: VoiceCall[]; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/twilio/voice/calls'));
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Twilio Provider] Get active calls error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateCallControls(callSid: string, controls: Partial<CallControls>): Promise<{ success: boolean; error?: string }> {
    try {
      const actions = [];
      
      if (controls.mute !== undefined) {
        actions.push({ action: 'mute', value: controls.mute });
      }
      if (controls.listen !== undefined) {
        actions.push({ action: 'listen', value: controls.listen });
      }
      if (controls.join !== undefined) {
        actions.push({ action: 'join', value: controls.join });
      }

      for (const { action, value } of actions) {
        const response = await fetch(getBackendUrl('/api/twilio/voice/controls'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callSid, action, value }),
        });

        const data = await response.json();
        if (!data.success) {
          return data;
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[Twilio Provider] Update call controls error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async hangupCall(callSid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(getBackendUrl('/api/twilio/voice/hangup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.disconnectMediaStream();
        this.activeCallSid = null;
      }
      
      return data;
    } catch (error) {
      console.error('[Twilio Provider] Hangup call error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async connectMediaStream(callSid: string): Promise<WebSocket | null> {
    if (this.mediaWebSocket && this.mediaWebSocket.readyState === WebSocket.OPEN) {
      return this.mediaWebSocket;
    }

    try {
      const wsUrl = getBackendUrl(`/api/twilio/voice/media/${callSid}`).replace(/^http/, 'ws');
      
      this.mediaWebSocket = new WebSocket(wsUrl);
      this.activeCallSid = callSid;

      this.mediaWebSocket.addEventListener('open', () => {
        console.log('[Twilio Provider] Media stream connected');
      });

      this.mediaWebSocket.addEventListener('message', (event) => {
        console.log('[Twilio Provider] Received media data');
      });

      this.mediaWebSocket.addEventListener('close', () => {
        console.log('[Twilio Provider] Media stream closed');
        this.mediaWebSocket = null;
      });

      this.mediaWebSocket.addEventListener('error', (error) => {
        console.error('[Twilio Provider] Media stream error:', error);
      });

      return this.mediaWebSocket;
    } catch (error) {
      console.error('[Twilio Provider] Connect media stream error:', error);
      return null;
    }
  }

  disconnectMediaStream(): void {
    if (this.mediaWebSocket) {
      this.mediaWebSocket.close();
      this.mediaWebSocket = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
