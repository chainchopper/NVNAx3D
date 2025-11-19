# Multi-Provider Image Generation Architecture

## Overview
Modular architecture for supporting multiple image/video generation providers with unified configuration interface, fallback chaining, and provider-specific settings.

## Supported Providers (Planned)
1. **ComfyUI** (Current) - Workflow-based, local/remote
2. **Google Gemini Imagen** - Imagen-3.0 models
3. **Stable Diffusion** - Automatic1111 WebUI API
4. **Google Veo** - Video generation
5. **OpenAI DALL-E** - DALL-E 3, DALL-E 2

## Architecture Components

### 1. Provider Interface (`ImageGenerationProvider`)
```typescript
interface ImageGenerationProvider {
  // Metadata
  id: string;
  name: string;
  capabilities: {
    supportsImage: boolean;
    supportsVideo: boolean;
    supportsAudio: boolean;
    maxResolution: { width: number; height: number };
    asyncOnly: boolean;
  };
  
  // Lifecycle
  initialize(config: ProviderConfig): Promise<void>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  generateAsset(request: GenerationRequest): Promise<GenerationResult>;
  cancelJob(jobId: string): Promise<void>;
  
  // Health
  getStatus(): ProviderStatus;
}
```

### 2. Unified Settings Schema (`ImageGenerationConfig`)
```typescript
interface ImageGenerationConfig {
  defaultProvider: string;  // Provider ID
  fallbackChain: string[];  // Ordered list of provider IDs
  providers: {
    [providerId: string]: ProviderConfig;
  };
}

interface ProviderConfig {
  enabled: boolean;
  credentials: Record<string, any>;  // Provider-specific
  settings: Record<string, any>;     // Provider-specific
}
```

### 3. Provider Adapters
Each provider has its own adapter implementing the `ImageGenerationProvider` interface:

- **ComfyUIProviderAdapter** - Wraps existing `comfyUIService`
- **GeminiImagenAdapter** - Integrates with Gemini API
- **StableDiffusionAdapter** - Connects to Automatic1111 WebUI
- **GoogleVeoAdapter** - Integrates Google Veo API
- **OpenAIAdapter** - DALL-E integration

### 4. Image Generation Orchestrator
**Responsibilities:**
- Request routing to appropriate provider
- Fallback chain execution if primary fails
- Provider capability checks
- Health status caching
- Queue management for async generation

```typescript
class ImageGenerationOrchestrator {
  async generate(request: GenerationRequest): Promise<GenerationResult> {
    // 1. Determine provider (default or specified)
    // 2. Capability check
    // 3. Route to provider
    // 4. If fails, try fallback chain
    // 5. Return result or error
  }
}
```

### 5. Settings Service (`ImageGenerationSettingsService`)
**Responsibilities:**
- Persist/load configuration from localStorage
- Validate provider configs
- Expose config updates to UI
- Handle credential encryption (future)

### 6. Unified UI Panel (`<image-generation-panel>`)
**Features:**
- Provider selector dropdown
- Dynamic configuration forms (provider-specific)
- Connection test buttons per provider
- Fallback chain configuration
- Default provider selection
- Import/export workflows (ComfyUI specific)

**UI Structure:**
```
┌─ Image Generation Panel ──────────────┐
│ ┌─ Provider Selector ──────────────┐  │
│ │ [Dropdown: ComfyUI ▼]            │  │
│ └──────────────────────────────────┘  │
│                                        │
│ ┌─ Provider Settings ──────────────┐  │
│ │ <Dynamic form based on provider>  │  │
│ │ - ComfyUI: Server URL, workflows  │  │
│ │ - Gemini: API Key, model select   │  │
│ │ - SD: WebUI URL, sampler, steps   │  │
│ └──────────────────────────────────┘  │
│                                        │
│ [Test Connection] [Save]               │
│                                        │
│ ┌─ Fallback Chain ─────────────────┐  │
│ │ 1. ComfyUI                         │  │
│ │ 2. Gemini Imagen                   │  │
│ │ 3. DALL-E 3                        │  │
│ │ [Edit]                             │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Provider-Specific Settings

### ComfyUI
- Base URL (local/remote)
- Auth token (optional)
- Workflow configurations (image, video, audio)
- Default workflows per media type

### Gemini Imagen
- API key
- Model selection (imagen-3.0-generate-001, etc.)
- Safety settings
- Aspect ratio preferences

### Stable Diffusion (Automatic1111)
- WebUI URL
- Sampling steps
- CFG scale
- Sampler (DPM++, Euler, etc.)
- Negative prompts
- Model checkpoint selection

### Google Veo
- API key
- Video duration (4s, 6s, 8s)
- Aspect ratio (16:9, 9:16)
- Resolution (720p, 1080p)

### OpenAI DALL-E
- API key
- Model (dall-e-3, dall-e-2)
- Size (1024x1024, 1792x1024, 1024x1792)
- Quality (standard, hd)
- Style (vivid, natural)

## Implementation Phases

### Phase 1: Foundation (Current)
- ✅ Rename ComfyUI to "Image Generation" in UI
- ✅ Document architecture plan
- ⏳ Create provider interface definitions

### Phase 2: Provider System
- Implement `ImageGenerationProvider` interface
- Create provider registry
- Build provider adapters (start with ComfyUI wrapper)
- Implement orchestrator

### Phase 3: Settings & Persistence
- Create `ImageGenerationSettingsService`
- Build unified config schema
- Implement localStorage persistence
- Add config migration

### Phase 4: UI Overhaul
- Replace `comfyui-settings-panel` with `image-generation-panel`
- Provider selector dropdown
- Dynamic settings forms
- Fallback chain configuration
- Connection testing UI

### Phase 5: Additional Providers
- Implement Gemini Imagen adapter
- Implement Stable Diffusion adapter
- Implement DALL-E adapter
- Implement Google Veo adapter

## Security Considerations
- API keys stored in localStorage (encrypt in future)
- CSP headers for remote provider URLs
- Input sanitization for all user-provided URLs
- Rate limiting for API calls
- Credential validation before storage

## Migration Strategy
- Existing ComfyUI configurations will be automatically migrated
- `comfyUIService` will be wrapped by `ComfyUIProviderAdapter`
- Old settings format converted to new schema
- Backward compatibility maintained for existing workflows

## Integration Points
- **Provider Manager**: Share credential storage patterns
- **Capability Guard**: Integrate provider availability checks
- **LLM Function Calling**: Expose image generation as tool
- **Memory System**: Store generation requests/results
