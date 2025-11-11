# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system designed to provide highly customizable and engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a local-first, multi-provider platform, extensible with various external services, positioning itself as a versatile personal AI ecosystem with significant market potential.

## Recent Changes (November 11, 2025)

### No Hardcoded Models & Camera Background (Latest)
- **Removed Hardcoded Model Auto-Configuration**: Eliminated automatic Gemini model injection when GEMINI_API_KEY is detected. Users now configure ALL models manually via Settings UI - no models are hardcoded or auto-added. This ensures users can choose ANY custom model without restrictions.
- **Fixed Custom Provider Discovery**: Removed duplicate `/api/models/proxy` endpoint that was causing JSON parse errors. The complete SSRF-protected implementation at line ~3863 in server.js is retained and working.
- **Live Camera Feed as Canvas Background**: Wired camera-manager's video element to visualizer-3d component with `cameraRenderMode='texture'`. Camera feed now displays as 3D WebGL background plane when camera is enabled.
- **Architecture Decision**: Model onboarding is now entirely manual via Settings UI - no automatic provider configuration based on environment variables.

### Backend API Fixes & SSRF Protection
- **Missing Endpoints Fixed**: Added `/api/config/env` (returns API key availability as booleans) and `/api/models/proxy` (custom provider model discovery with SSRF protection)
- **Critical SSRF Security Fix**: Model proxy now resolves DNS and validates ALL resolved IPs against private/reserved ranges (prevents DNS rebinding attacks, blocks malicious domains that resolve to 127.0.0.1 or RFC1918 addresses)
- **LocalStorage Quota Protection**: Added size monitoring, warns when provider data exceeds 100KB, implements automatic cleanup on QuotaExceededError, includes storage usage diagnostics tool
- **Provider Auto-Config Retry Logic**: Added exponential backoff retry mechanism (500ms, 1s, 2s) with max 3 attempts to handle backend startup timing
- **Improved Error Logging**: Provider manager errors now include message, stack trace, and raw error object for better debugging
- **Development vs Production**: Localhost/private IPs allowed in development mode only, strict blocking in production

### Gmail & Twilio Connector Integration
- **Gmail Tools**: Added complete Gmail integration to tool orchestrator with 2 new tools:
  - `search_gmail`: Search emails by query with configurable maxResults (no confirmation required)
  - `send_gmail`: Send emails with to/cc/bcc/subject/body (requires user confirmation)
- **Backend Gmail Endpoints**: Created `/api/connectors/gmail/send` endpoint with RFC 2822 email formatting, base64url encoding, OAuth token validation, and graceful error handling
- **Twilio Tools Enhanced**: Updated existing SMS/voice tools with E.164 phone format documentation, character limits (1600 for SMS), and improved parameter descriptions
- **Twilio Status Endpoint**: Added `GET /api/twilio/status` to check configuration state without triggering errors
- **Setup Documentation**: Created comprehensive CONNECTOR_SETUP_GUIDE.md with step-by-step Gmail OAuth and Twilio API setup instructions
- **Test Suite**: Built test-connectors.js for verifying connector integration and configuration status
- **Architecture Alignment**: All connectors use .env file configuration (no Replit integration dependency), require user confirmation for destructive actions, return consistent {success, data?, error?, requiresSetup?, setupInstructions?} format

### Model Capability System & Dropdown Filtering
- **Capability Flags**: Added `conversation`, `embedding`, `imageGeneration` boolean flags to ModelCapabilities interface
- **Capability-Based Filtering**: Each model dropdown in PersonI settings now filters by appropriate capability:
  - Conversation dropdown → models with `conversation: true`
  - Vision dropdown → models with `vision: true`
  - Embedding dropdown → models with `embedding: true`
  - Function Calling dropdown → models with `functionCalling: true`
  - Image Generation dropdown → models with `imageGeneration: true`
- **Automatic Capability Inference**: Custom provider discovery now infers capabilities from model names:
  - Embedding: `includes('embed') || includes('embedding')`
  - Image Gen: `includes('dall-e') || includes('imagen') || includes('stable-diffusion')`
  - Vision: `includes('vision') || includes('gpt-4') || includes('gemini') || includes('claude')`
  - Conversation: `!isEmbedding && !isImageGen`
- **Provider Updates**: Google and OpenAI providers now properly set all capability flags including new ones
- **Auto-Configuration Fix**: Gemini models auto-configured from environment now include all capability flags
- **Backward Compatibility**: PersonI configs support both legacy string model IDs and new `{ providerId, modelId }` format
- **Provider Manager APIs**: Added `getModelsByCapability()`, `getActiveProviders()`, `getProvidersByCapability()` for filtered model queries

### UI/UX Fixes & Custom Provider Discovery
- **Dropdown Styling Fix**: Model selection dropdowns now have dark backgrounds with white text for proper readability
- **Custom Provider Model Discovery**: Fixed Ollama/local LLM integration - models now automatically discovered when adding custom providers
  - Changed from `addCustomProvider()` to `addCustomProviderWithDiscovery()` flow
  - Shows "Discovering models..." loading state during model detection
  - Uses backend proxy with SSRF protection for secure endpoint discovery
  - Models now properly appear in PersonI settings after verification
- **Error Handling**: User feedback for failed custom provider additions

### PersonI Settings Persistence & Connector Categorization
- **Storage Key Centralization**: Created `src/constants/storage.ts` with shared localStorage keys (PERSONIS_KEY, USER_PROFILE_KEY, etc.) to prevent desync
- **PersonI Persistence Fix**: Added `appStateService.updatePersoni()` method that properly updates personis array and saves to localStorage
- **Connector Type Discriminator**: Added `type: 'oauth' | 'api_tool'` field to all 31 connectors in AVAILABLE_CONNECTORS
- **UI Separation**: PersonI Settings panel now shows two distinct sections:
  - **OAuth Connectors** (Gmail, GitHub, Calendar, etc.) with connection status badges
  - **API Tools & Commands** (Financial tools, web search, etc.) with configuration notes
- **Data Storage**: Both OAuth and API tools currently stored in `enabledConnectors` array (UI-only separation)
- **Backward Compatibility**: No breaking changes - existing PersonI configs continue working

### Voice Input Integration
- **Voice Input Service**: New `voice-input-service.ts` handles complete microphone → Whisper STT → text flow
  - MediaRecorder-based audio capture with automatic format conversion to Float32Array
  - Event-driven architecture (transcription, state-change, model-progress events)
  - States: idle, loading-model, ready, recording, processing, error
  - Lazy model loading (Whisper Tiny.en by default, ~75MB)
- **Speech-to-Text → Conversation**: Mic button now triggers voice recording → local Whisper transcription → conversation model inference
- **UI Status Indicators**: Recording state shows "Listening...", processing shows "Transcribing...", errors surfaced in status
- **Lifecycle Management**: Proper cleanup in disconnectedCallback to prevent memory leaks

### OAuth & Vision Integration
- **PersonI Settings Panel Restored**: Comprehensive `personi-settings-panel.ts` (865 lines) with full configuration UI including identity, model assignments (conversation, vision, embedding, function calling, image generation), voice selection, visual identity (shape, color, texture, animation), capabilities toggles (vision, MCP, tools, image gen, web search), and connector selection.
- **OAuth Connection Status**: Real-time badges in PersonI settings showing connector connection state (✓ Connected / OAuth Required)
- **Camera Vision Service**: Local TensorFlow.js COCO-SSD object detection with cached vision contexts
- **Custom Provider Support**: Add localhost/Ollama endpoints via backend proxy with SSRF protection
- **Model Configuration Wiring**: Models configured in models-panel are now properly wired to conversation-orchestrator via `getProviderInstanceByModelId()` which searches all providers for the specified model ID.
- **Backward Compatibility**: Legacy PersonI configs with provider IDs in `thinkingModel` field continue to work via automatic fallback detection in provider-manager.
- **TTS Panel Separation**: Text-to-Speech configuration moved to dedicated panel, accessible via radial menu, distinct from PersonI settings.
- **UI/UX Fixes**: Resolved overflow issues in settings-dock panels, all components now properly scroll within viewport constraints.

## User Preferences
- **Graphics Preference**: WebGPU over WebGL (better performance)
- **Local-First**: Prefer on-device processing (Whisper for STT)
- **Flexibility**: Manual configuration of all endpoints and services
- **Not locked into Google's ecosystem**: Multi-provider support essential
- **CRITICAL: No Replit Dependency**: ALL integrations/connectors (Twilio, Gmail, etc.) MUST be configured via app Settings UI or .env files - NOT Replit's integration system. System must be fully portable and independent.

## System Architecture

### Core Technologies
- **Framework**: Lit (Web Components)
- **Build Tool**: Vite
- **AI Provider**: Google Gemini API (@google/genai), with multi-provider support
- **3D Graphics**: Three.js (planned WebGPU migration)
- **Language**: TypeScript
- **Backend**: Express.js (Node.js) for secure connector API proxy

### UI/UX Decisions
- **Design Philosophy**: Minimalist, glass-morphism, clean, and uncluttered interfaces.
- **Visuals**: AI-generated liquid-themed avatars, dynamic 3D objects with audio-reactive visuals, object detection overlays.
- **Panels**: Comprehensive Notes, Tasks, Memory Management, User Profile, and Calendar views.
- **Usability**: Intuitive settings for AI providers and PersonI capabilities, visual indicators for system status.

### System Design Choices
- **PersonI System**: Manages AI personas with unique attributes, capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline), and a template system. Supports a financial advisor PersonI, BILLY.
- **Connector Backend Proxy**: Secure Express.js server for external service integrations (e.g., Gmail, Google Calendar, GitHub, financial APIs) with OAuth token handling.
- **Codrops Audio Visualizer**: Separate `/visualizer` route with Fresnel/noise shaders, dual-mesh sphere, particle field, GSAP entrance animations, orbital camera rotation, mouse parallax, draggable controls with auto-hide (5s inactivity timer).
- **Twilio Integration (Manual Configuration)**: SMS/voice calls will be configured via app Settings UI with manual credential entry (Account SID, Auth Token, Phone Numbers). NO Replit connector dependency - fully portable implementation.
- **Model Provider System**: Configures and integrates multiple AI providers (OpenAI, Google, custom) with flexible model selection for conversation, vision, embedding, function calling, and TTS.
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model, supporting 17 memory types with semantic search and temporal queries.
- **Local Speech-to-Text (STT)**: Browser-based Whisper models (@xenova/transformers) with IndexedDB caching.
- **Enhanced Audio System**: SharedMicrophoneManager, audio recording, real-time music detection, and full OpenAI TTS integration.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation, including Camera-as-3D-Background, Vision-Enhanced Idle Speech, Environmental Observer Service, and multi-format file upload with RAG.
- **Object Recognition System**: Real-time object detection using TensorFlow.js and COCO-SSD model (80 object classes).
- **Voice Command System**: Hands-free control with natural language commands.
- **Routine Automation System**: IF-THEN-THAT automation supporting time-based, event-driven, state monitoring, user actions, and vision detection triggers.
- **Dual PersonI Manager**: Multi-AI collaboration system with four modes: collaborative, debate, teaching, and single.
- **Calendar System**: Visual component with natural language event creation and Google Calendar integration.
- **Security**: CSP hardening, OAuth Vault V2 Backend with PKCE + CSRF protection.
- **Plugin System**: Dynamic UI plugin architecture with registry, sandbox, and persistence.

## External Dependencies
- **Google Gemini API**: Conversational AI and embeddings.
- **Three.js**: 3D rendering for PersonI visualizations.
- **Lit**: UI development.
- **Vite**: Build tool.
- **@google/genai**: Google Gemini API client library.
- **@xenova/transformers**: Local Whisper STT.
- **TensorFlow.js**: Machine learning for browser-based inference.
- **@tensorflow-models/coco-ssd**: Object detection model.
- **Express**: Backend server.
- **CORS**: Cross-origin resource sharing.
- **ChromaDB**: Vector database for RAG.
- **raw.githubusercontent.com, HuggingFace CDN**: Content delivery.
- **Alpha Vantage API**: Real-time stock market data.
- **CoinGecko API**: Cryptocurrency market data.
- **Finnhub API**: Financial market news with sentiment analysis.
- **AudD API**: Song identification.
- **Genius API**: Song lyrics.
- **Plaid/Yodlee (planned)**: Financial transaction and account data.