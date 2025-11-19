/**
 * Audio Feedback Service
 * Provides sound effects for UI interactions (swooshes, dings, clicks)
 */

export type SoundEffect = 'swoosh' | 'ding' | 'click' | 'close' | 'open' | 'success' | 'error';

class AudioFeedbackService {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3; // 30% volume by default

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    if (typeof window !== 'undefined') {
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        try {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          console.log('[AudioFeedback] Audio context initialized');
        } catch (error) {
          console.warn('[AudioFeedback] Failed to initialize audio context:', error);
        }
      }
    }
  }

  /**
   * Play a sound effect
   */
  async play(effect: SoundEffect) {
    if (!this.enabled || !this.audioContext) return;

    try {
      // Resume audio context if suspended (required by browser autoplay policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      switch (effect) {
        case 'swoosh':
          this.playSwoosh();
          break;
        case 'ding':
          this.playDing();
          break;
        case 'click':
          this.playClick();
          break;
        case 'close':
          this.playClose();
          break;
        case 'open':
          this.playOpen();
          break;
        case 'success':
          this.playSuccess();
          break;
        case 'error':
          this.playError();
          break;
      }
    } catch (error) {
      console.warn('[AudioFeedback] Error playing sound:', error);
    }
  }

  /**
   * Swoosh sound - for menu transitions, swipes
   */
  private playSwoosh() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  /**
   * Ding sound - for notifications, confirmations
   */
  private playDing() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(1000, now);
    
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(1500, now);

    gainNode.gain.setValueAtTime(this.volume * 0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + 0.3);
    oscillator2.stop(now + 0.3);
  }

  /**
   * Click sound - for button presses
   */
  private playClick() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(600, now);

    gainNode.gain.setValueAtTime(this.volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  /**
   * Close sound - for closing menus/panels
   */
  private playClose() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);

    gainNode.gain.setValueAtTime(this.volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * Open sound - for opening menus/panels
   */
  private playOpen() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * Success sound - for successful operations
   */
  private playSuccess() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C, E, G chord
    
    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      const delay = index * 0.08;
      gainNode.gain.setValueAtTime(0, now + delay);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.start(now + delay);
      oscillator.stop(now + delay + 0.3);
    });
  }

  /**
   * Error sound - for errors/failures
   */
  private playError() {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.linearRampToValueAtTime(180, now + 0.2);

    gainNode.gain.setValueAtTime(this.volume * 0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  /**
   * Enable/disable sound effects
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const audioFeedback = new AudioFeedbackService();
