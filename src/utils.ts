/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // remove the data:audio/wav;base64, prefix
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Manages recording audio from a source node.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private sourceNode: AudioNode;

  constructor(sourceNode: AudioNode) {
    this.sourceNode = sourceNode;
  }

  start() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return;
    }
    // FIX: Cast context to AudioContext as createMediaStreamDestination is not on BaseAudioContext.
    const destination = (
      this.sourceNode.context as AudioContext
    ).createMediaStreamDestination();
    this.sourceNode.connect(destination);

    this.mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };

    this.audioChunks = [];
    this.mediaRecorder.start();
  }

  async stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {type: 'audio/webm'});
        this.sourceNode.disconnect();
        this.mediaRecorder = null;
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}

/**
 * A simple Voice Activity Detector (VAD).
 * Analyzes audio chunks and emits events when speech starts and stops.
 */
export class VoiceActivityDetector extends EventTarget {
  private speaking = false;
  private silenceTimeout: number | undefined;
  private readonly silenceDelay = 1000; // 1 second of silence to trigger 'speech_end'
  private readonly energyThreshold = 0.01; // Sensitivity for detecting speech

  process(pcmData: Float32Array) {
    const energy =
      pcmData.reduce((acc, val) => acc + val * val, 0) / pcmData.length;

    if (energy > this.energyThreshold) {
      if (!this.speaking) {
        this.speaking = true;
        this.dispatchEvent(new CustomEvent('speech_start'));
      }
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = window.setTimeout(() => {
        this.handleSilence();
      }, this.silenceDelay);
    }
  }

  private handleSilence() {
    if (this.speaking) {
      this.speaking = false;
      this.dispatchEvent(new CustomEvent('speech_end'));
    }
  }

  reset() {
    this.speaking = false;
    clearTimeout(this.silenceTimeout);
  }
}