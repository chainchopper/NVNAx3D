/**
 * Model Auto-Assignment Service
 * 
 * Intelligent heuristics for automatically assigning fetched models to the correct capability slots.
 * Supports Ollama, LM Studio, vLLM, and other OpenAI-compatible endpoints.
 * 
 * Based on community naming conventions:
 * - Chat: General purpose models (exclude specialized models)
 * - Vision: llava, vision, moondream, qwen-vl, pixtral, gpt-4-visual
 * - STT: whisper, stt, speech-to-text
 * - TTS: tts, voice, text-to-speech
 * - Embeddings: embed, embedding, vector, text-embedding
 * - Image Gen: flux, sd, stable-diffusion, imagen, dall-e
 * 
 * Naming patterns:
 * - Ollama: modelName:variant (e.g., llama3:8b, llava:13b-q4)
 * - LM Studio: Often mirrors HuggingFace (e.g., model-name-fp16, model-name-gguf)
 * - vLLM: Standard model IDs (e.g., meta-llama/Llama-2-7b-chat-hf)
 */

export interface ModelAssignmentHeuristics {
  chat: string[];
  vision: string[];
  stt: string[];
  tts: string[];
  embedding: string[];
  imageGeneration: string[];
}

export interface ModelAssignment {
  chat?: string;
  vision?: string;
  stt?: string;
  tts?: string;
  embedding?: string;
  imageGeneration?: string;
}

export class ModelAutoAssignmentService {
  /**
   * Heuristic patterns for identifying model capabilities
   */
  private static readonly HEURISTICS: ModelAssignmentHeuristics = {
    vision: [
      'llava', 'vision', 'moondream', 'qwen-vl', 'pixtral', 
      'gpt-4-visual', 'gpt-4v', 'gpt-4-turbo', 'claude-3',
      'bakllava', 'minicpm', 'cogvlm'
    ],
    
    stt: [
      'whisper', 'stt', 'speech-to-text', 'speech2text',
      'wav2vec', 'vosk'
    ],
    
    tts: [
      'tts', 'voice', 'text-to-speech', 'text2speech',
      'bark', 'tortoise', 'coqui'
    ],
    
    embedding: [
      'embed', 'embedding', 'vector', 'text-embedding',
      'bge-', 'gte-', 'e5-', 'instructor'
    ],
    
    imageGeneration: [
      'flux', 'sd', 'stable-diffusion', 'imagen', 'dall-e',
      'sdxl', 'midjourney', 'playground'
    ],
    
    chat: []
  };

  /**
   * Patterns to exclude from general chat models
   * NOTE: 'vision' NOT included - multimodal models like gpt-4-vision support both chat AND vision
   */
  private static readonly EXCLUDE_FROM_CHAT = [
    'whisper', 'tts', 'embed', 'embedding', 'vector', 'flux', 'sd', 'stable-diffusion',
    'dall-e', 'imagen', 'text-embedding', 'bge-', 'gte-', 'e5-'
  ];

  /**
   * Auto-assign models to capability slots using intelligent heuristics
   * 
   * @param modelIds - Array of model IDs from endpoint
   * @param currentAssignments - Existing assignments to preserve (optional)
   * @returns Recommended model assignments
   */
  static autoAssign(
    modelIds: string[], 
    currentAssignments?: Partial<ModelAssignment>
  ): ModelAssignment {
    const assignments: ModelAssignment = {};

    // CHAT: First non-specialized model (exclude audio/embedding/image-gen)
    assignments.chat = 
      currentAssignments?.chat || 
      this.findModel(modelIds, (m) => !this.isSpecialized(m)) ||
      modelIds[0] || 
      '';

    // VISION: Look for vision-specific keywords
    assignments.vision = 
      currentAssignments?.vision || 
      this.findModel(modelIds, this.HEURISTICS.vision) ||
      assignments.chat || // Fallback to chat (might be multimodal)
      '';

    // EMBEDDINGS: Look for embedding keywords
    assignments.embedding = 
      currentAssignments?.embedding || 
      this.findModel(modelIds, this.HEURISTICS.embedding) ||
      '';

    // STT: Look for Whisper or other speech-to-text models
    assignments.stt = 
      currentAssignments?.stt || 
      this.findModel(modelIds, this.HEURISTICS.stt) ||
      'whisper-1'; // Fallback to standard Whisper

    // TTS: Look for TTS keywords
    assignments.tts = 
      currentAssignments?.tts || 
      this.findModel(modelIds, this.HEURISTICS.tts) ||
      'tts-1'; // Fallback to standard TTS

    // IMAGE GENERATION: Look for image gen keywords
    assignments.imageGeneration = 
      currentAssignments?.imageGeneration || 
      this.findModel(modelIds, this.HEURISTICS.imageGeneration) ||
      '';

    return assignments;
  }

  /**
   * Infer capabilities for a single model based on naming conventions
   * NOTE: Capabilities are ADDITIVE - a model can support multiple capabilities
   * (e.g., gpt-4-vision supports both conversation AND vision)
   */
  static inferCapabilities(modelId: string): {
    conversation: boolean;
    vision: boolean;
    embedding: boolean;
    imageGeneration: boolean;
    stt: boolean;
    tts: boolean;
  } {
    const lower = modelId.toLowerCase();

    return {
      conversation: !this.isSpecialized(lower),
      vision: this.matches(lower, this.HEURISTICS.vision),
      embedding: this.matches(lower, this.HEURISTICS.embedding),
      imageGeneration: this.matches(lower, this.HEURISTICS.imageGeneration),
      stt: this.matches(lower, this.HEURISTICS.stt),
      tts: this.matches(lower, this.HEURISTICS.tts)
    };
  }

  /**
   * Check if model is specialized (not general conversation)
   */
  private static isSpecialized(modelId: string): boolean {
    const lower = modelId.toLowerCase();
    return this.EXCLUDE_FROM_CHAT.some(keyword => lower.includes(keyword));
  }

  /**
   * Find first model matching keywords or predicate
   */
  private static findModel(
    modelIds: string[], 
    keywordsOrPredicate: string[] | ((m: string) => boolean)
  ): string | undefined {
    if (typeof keywordsOrPredicate === 'function') {
      return modelIds.find(keywordsOrPredicate);
    }

    return modelIds.find(id => this.matches(id.toLowerCase(), keywordsOrPredicate));
  }

  /**
   * Check if model ID matches any of the keywords
   */
  private static matches(modelId: string, keywords: string[]): boolean {
    return keywords.some(keyword => modelId.includes(keyword));
  }

  /**
   * Detect provider type from model naming patterns
   */
  static detectProviderType(modelId: string): 'ollama' | 'lm-studio' | 'vllm' | 'openai' | 'unknown' {
    const lower = modelId.toLowerCase();

    // Ollama: Uses colon notation (e.g., llama3:8b, qwen:7b-q4)
    if (modelId.includes(':')) {
      return 'ollama';
    }

    // LM Studio: Often has -gguf, -fp16, -q4, -Q5 suffixes
    if (lower.includes('-gguf') || lower.includes('-fp16') || /-q\d/.test(lower)) {
      return 'lm-studio';
    }

    // vLLM: Usually uses HuggingFace format (org/model-name)
    if (modelId.includes('/') && !modelId.startsWith('http')) {
      return 'vllm';
    }

    // OpenAI: Standard model names
    if (lower.startsWith('gpt-') || lower.startsWith('text-') || lower === 'whisper-1') {
      return 'openai';
    }

    return 'unknown';
  }

  /**
   * Get human-readable capability summary
   */
  static getCapabilitySummary(modelId: string): string[] {
    const caps = this.inferCapabilities(modelId);
    const summary: string[] = [];

    if (caps.conversation) summary.push('Chat');
    if (caps.vision) summary.push('Vision');
    if (caps.embedding) summary.push('Embeddings');
    if (caps.imageGeneration) summary.push('Image Gen');
    if (caps.stt) summary.push('STT');
    if (caps.tts) summary.push('TTS');

    return summary.length > 0 ? summary : ['Unknown'];
  }
}
