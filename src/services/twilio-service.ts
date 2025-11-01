/**
 * Twilio Service - Frontend Integration
 * 
 * Provides SMS and voice call capabilities with PersonI audio integration
 * - Send/receive SMS messages
 * - Make/receive voice calls
 * - Stream PersonI audio to caller
 * - User controls: mute, listen, join as 3rd party
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface SMSMessage {
  sid: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  body: string;
  timestamp: string;
  status: string;
}

export interface VoiceCall {
  sid: string;
  from: string;
  to: string;
  status: string;
  direction: 'inbound' | 'outbound';
  startTime: string;
  endTime?: string;
  duration?: string;
  personaVoice?: string;
  userMuted: boolean;
  userListening: boolean;
  userJoined?: boolean;
}

export interface CallControls {
  mute: boolean;
  listen: boolean;
  join: boolean;
}

class TwilioService {
  private backendUrl: string;
  private mediaWebSocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private activeCallSid: string | null = null;

  constructor(backendUrl: string = 'http://localhost:3001') {
    this.backendUrl = backendUrl;
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/twilio/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Twilio Service] SMS send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get SMS history
   */
  async getSMSHistory(limit: number = 50): Promise<{ success: boolean; messages?: SMSMessage[]; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/twilio/sms/history?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Twilio Service] SMS history error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Make outbound voice call
   */
  async makeCall(to: string, personaVoice?: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/twilio/voice/call`, {
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
      console.error('[Twilio Service] Call initiation error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get active calls
   */
  async getActiveCalls(): Promise<{ success: boolean; calls?: VoiceCall[]; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/twilio/voice/calls`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Twilio Service] Get calls error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update call controls (mute, listen, join)
   */
  async updateCallControls(callSid: string, action: 'mute' | 'listen' | 'join', value: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/twilio/voice/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid, action, value }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Twilio Service] Call control error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Hangup call
   */
  async hangupCall(callSid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/twilio/voice/hangup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid }),
      });

      const data = await response.json();
      
      if (data.success && this.activeCallSid === callSid) {
        this.activeCallSid = null;
        this.disconnectMediaStream();
      }

      return data;
    } catch (error) {
      console.error('[Twilio Service] Hangup error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Connect PersonI audio to Twilio media stream
   * This allows bidirectional audio: PersonI speaks to caller, caller speaks to PersonI
   */
  async connectPersonIAudio(callSid: string, audioStream: MediaStream): Promise<void> {
    const wsUrl = `${this.backendUrl.replace('http', 'ws')}/api/twilio/voice/media/${callSid}`;
    
    console.log('[Twilio Service] Connecting to media stream:', wsUrl);

    this.mediaWebSocket = new WebSocket(wsUrl);

    this.mediaWebSocket.onopen = () => {
      console.log('[Twilio Service] Media WebSocket connected');
      
      // Set up audio context for processing
      this.audioContext = new AudioContext({ sampleRate: 8000 });
      
      const source = this.audioContext.createMediaStreamSource(audioStream);
      const processor = this.audioContext.createScriptProcessor(256, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to mulaw (Twilio format)
        const mulawData = this.encodeToMulaw(inputData);
        
        if (this.mediaWebSocket?.readyState === WebSocket.OPEN) {
          this.mediaWebSocket.send(mulawData);
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
    };

    this.mediaWebSocket.onmessage = (event) => {
      // Receive audio from caller (for PersonI STT processing)
      console.log('[Twilio Service] Received audio from caller');
      // This can be sent to PersonI's STT system for processing
    };

    this.mediaWebSocket.onerror = (error) => {
      console.error('[Twilio Service] WebSocket error:', error);
    };

    this.mediaWebSocket.onclose = () => {
      console.log('[Twilio Service] Media WebSocket disconnected');
      this.disconnectMediaStream();
    };
  }

  /**
   * Disconnect media stream
   */
  private disconnectMediaStream(): void {
    if (this.mediaWebSocket) {
      this.mediaWebSocket.close();
      this.mediaWebSocket = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Encode audio to mulaw format (Twilio requirement)
   */
  private encodeToMulaw(samples: Float32Array): Uint8Array {
    const mulaw = new Uint8Array(samples.length);
    
    for (let i = 0; i < samples.length; i++) {
      let sample = Math.max(-1, Math.min(1, samples[i]));
      sample = sample * 32768;
      
      const sign = (sample < 0) ? 0x80 : 0x00;
      sample = Math.abs(sample);
      sample += 132;
      
      let exponent = 7;
      for (let exp = 0; exp < 8; exp++) {
        if (sample <= (33 << exp)) {
          exponent = exp;
          break;
        }
      }
      
      const mantissa = Math.floor((sample >> (exponent + 3)) & 0x0F);
      mulaw[i] = ~(sign | (exponent << 4) | mantissa);
    }
    
    return mulaw;
  }

  /**
   * Check if Twilio is configured
   */
  async isConfigured(): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/api/config/env`);
      const data = await response.json();
      return data.config?.twilioConfigured || false;
    } catch (error) {
      console.error('[Twilio Service] Config check error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const twilioService = new TwilioService();
