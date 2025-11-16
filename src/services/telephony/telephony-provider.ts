export interface TelephonyConfig {
  providerType: 'twilio' | 'freepbx' | 'custom';
  enabled: boolean;
  credentials: Record<string, string>;
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

export interface TelephonyProvider {
  readonly name: string;
  readonly providerType: string;

  configure(credentials: Record<string, string>): Promise<boolean>;
  isConfigured(): boolean;

  sendSMS(to: string, message: string): Promise<{ success: boolean; messageSid?: string; error?: string }>;
  getSMSHistory(limit?: number): Promise<{ success: boolean; messages?: SMSMessage[]; error?: string }>;
  
  makeCall(to: string, personaVoice?: string): Promise<{ success: boolean; callSid?: string; error?: string }>;
  getActiveCalls(): Promise<{ success: boolean; calls?: VoiceCall[]; error?: string }>;
  updateCallControls(callSid: string, controls: Partial<CallControls>): Promise<{ success: boolean; error?: string }>;
  hangupCall(callSid: string): Promise<{ success: boolean; error?: string }>;
  
  connectMediaStream?(callSid: string): Promise<WebSocket | null>;
  disconnectMediaStream?(): void;
}
