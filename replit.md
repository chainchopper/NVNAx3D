# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system providing customizable, engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a local-first, multi-provider platform, extensible with various external services, offering a rich, interactive, and personalized AI experience with autonomous, always-aware PersonI agents that reason, plan, learn, and suggest.

## User Preferences
- **Graphics Preference**: WebGPU over WebGL (better performance)
- **Local-First**: Prefer on-device processing (Whisper for STT)
- **Flexibility**: Manual configuration of all endpoints and services
- **Not locked into Google's ecosystem**: Multi-provider support essential
- **CRITICAL: No Replit Dependency**: ALL integrations/connectors (Twilio, Gmail, etc.) MUST be configured via app Settings UI or .env files - NOT Replit's integration system. System must be fully portable and independent.
- **Agentic Intelligence**: PersonI should be always-aware, autonomous agents that reason, plan, learn, and suggest - not passive responders. Continuous data gathering, pattern recognition, and proactive assistance.
- **UI/UX Clarity**: Larger, more visible icons and controls; centered, draggable FAB button; clear visual hierarchy.

## System Architecture

### Core Technologies
- **Framework**: Lit (Web Components)
- **Build Tool**: Vite
- **AI Provider**: Google Gemini API (@google/genai), with multi-provider support
- **3D Graphics**: Three.js (planned WebGPU migration)
- **Language**: TypeScript
- **Backend**: Express.js (Node.js) for secure connector API proxy
- **Media Generation**: ComfyUI integration for image/video/audio workflows

### UI/UX Decisions
- **Design Philosophy**: Minimalist, glass-morphism, clean, and uncluttered interfaces.
- **Visuals**: AI-generated liquid-themed avatars, dynamic 3D objects with audio-reactive visuals, object detection overlays. Camera feeds are displayed as native video elements via a Background Manager.
- **Panels**: Comprehensive Notes, Tasks, Memory Management, User Profile, and Calendar views.
- **Usability**: Intuitive settings for AI providers and PersonI capabilities, visual indicators for system status, distinct UI sections for OAuth and API tools in PersonI settings. Model selection dropdowns filter by appropriate capabilities.
- **Settings UI**: Centered draggable FAB button. An always-visible circular menu wheel provides direct access to 12 panels (Models, PersonI, Connectors, Notes, Tasks, Memory, Routines, Plugins, ComfyUI, Telephony, Device, User Profile, Help) with sequential slide-in animation.
- **Camera Controls**: Left side (20px from left) circular menu with expandable radial submenu for Hide/Show Preview, Switch Camera (cycles through ALL detected cameras), Object Detection, and Snapshot actions. Auto-hides after 5 seconds of inactivity for clean UI.
- **Camera Preview**: Native HTML5 `<video>` element displaying real camera feed in a small glass-morphic box (320x240px) at bottom-left corner (z-index 200). Uses browser's native getUserMedia API, not 3D textures.
- **PersonI Carousel**: Bottom-center (horizontally centered, 330px wide) single-card carousel with uniform card heights (280px min-height) for quick PersonI switching with live updates.
- **Device Settings**: Dedicated panel for accelerometer, gyroscope, microphone/camera permissions, and background service configuration.
- **Music Detection**: Lightweight background service (MusicDetectionService) using SharedMicrophoneManager consumer registration. Pattern-based frequency analysis (1Hz) detects music vs. speech, stores events in RAG for context-aware suggestions.
- **Camera Multi-Device Support**: Full enumeration via `navigator.mediaDevices.enumerateDevices()`, sequential cycling through all video inputs with device ID selection and progress indicators (e.g., "camera 1/3").
- **UI Element Positioning**: RAG settings circular menu (top-right at 20px, z-index 150), UI controls (top-right at 80px with 16px gap, z-index 90). All controls non-overlapping with proper spacing hierarchy. Pointer-events architecture: overlay hosts use `pointer-events: none` with selective `pointer-events: auto` on interactive children to prevent click blocking.
- **Camera Feed Display**: Native HTML5 video element without horizontal mirroring (no scaleX transform) for natural user-facing camera view.
- **Tooltip Display**: Control button tooltips appear vertically above buttons (bottom: calc(100% + 12px)) with z-index 10001 for clear visibility without horizontal overlap.
- **RAG Settings Menu**: Top-right circular radial menu (replacing old brain icon) with double-click to toggle RAG on/off, single-click to expand/collapse. Four radial controls: Retrieval Context, Include History, Include Events, System Context. Uses button elements with glowing hover effects (no borders), auto-hides after 5s inactivity.
- **Tandem Input System**: Voice and text inputs work simultaneously without mode switching. Mic button always visible, keyboard button toggles text input box with smooth slide-in/out animation. File upload embedded in text input.
- **Camera-Aware 3D Visualization**: 3D brain visualization automatically scales to 60% and reduces opacity to 30% when camera is active, restoring to full size/opacity when camera is off. Smooth GSAP transitions.

### System Design Choices
- **PersonI System**: Manages AI personas with unique attributes, capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline), and a template system.
- **Agentic Intelligence Architecture**: PersonI utilize a Perception → Reasoning → Planning → Action pipeline. Core services include PerceptionOrchestrator, PlannerService, and AgenticReasoningEngine, supporting 8 action types (telephony_call, telephony_sms, email_send, store_memory, create_task, calendar_event, web_search, routine_create) and an 'app_control' action for voice commands.
- **CapabilityGuard Service**: Centralized mediator for ALL AI feature requests (conversation, vision, embedding, STT, TTS, function calling, image generation). Validates model references across three formats: legacy strings (`"gpt-4"`), composite identifiers (`"openai-1:::gpt-4"`), and objects (`{providerId?, modelId}`). Returns structured errors with automatic TTS guidance via Web Speech API fallback when capabilities unavailable. Ensures NO provider or model blocks functionality—system always provides voice instructions for configuration instead of silent failures. Supports graceful degradation with browser fallbacks for STT (Whisper) and TTS (Web Speech API). All PersonI model references use canonical composite format (`${providerId}:::${modelId}`) with automatic normalization from legacy formats (plain strings, objects).
- **System Context Service**: Provides complete AI awareness of all menu/panel states across model/provider changes. Aggregates notes, tasks, routines, memories, plugins, connectors, user profile, and available tools into every conversation. Uses smart caching (30s for full context, 60s for memory stats) and metadata-only Chroma queries for optimal performance. PersonI always has full visibility into system state.
- **Connector Backend Proxy**: Secure Express.js server for external service integrations with OAuth token handling.
- **Model Provider System**: Configures and integrates multiple AI providers with flexible model selection. OpenAI-compatible providers (Ollama, LM Studio, vLLM) automatically normalize endpoints by appending `/v1` path when missing, constructing proper paths for `/v1/chat/completions`, `/v1/models`, and `/v1/embeddings`. Supports RFC1918 private network detection (localhost, 127.0.0.1, 0.0.0.0, 192.168.*, 10.*, 172.16-31.*) enabling local servers to operate without API keys. Two-phase PersonI model migration: Phase 1 normalizes ALL legacy formats (plain strings, objects with/without providerId) to canonical composite format (`${providerId}:::${modelId}`); Phase 2 intelligently auto-assigns discovered models to PersonI by capability while preserving multi-provider configurations. ProviderManager handles all settings persistence and automatic model discovery with intelligent capability inference.
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model, supporting 17 memory types with semantic search and temporal queries. Optimized with metadata-only queries to avoid expensive document/embedding fetches.
- **Local Speech-to-Text (STT)**: Browser-based Whisper models (@xenova/transformers) with IndexedDB caching.
- **Enhanced Audio System**: SharedMicrophoneManager, audio recording, real-time music detection, and OpenAI TTS integration.
- **Turn Detection Service**: Intelligent conversation turn completion using VAD + Whisper content analysis. Analyzes partial transcriptions for punctuation, questions, and sentence completion patterns for more natural conversation flow compared to silence-only detection.
- **Vision AI System**: Local vision model support via VisionModelService for privacy-first visual analysis. Supports Moondream, LLaVA, Qwen-VL through user-configured endpoints (LM Studio, vLLM, Windows AI Dev Gallery). Persistent model selection, vision-panel UI for configuration, and LLM function calling integration via `analyze_camera_view` command with 5-second retry logic for camera initialization.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation with Vision-Enhanced Idle Speech. IdleSpeechManager integrates camera vision via captureFrame callbacks, enabling PersonI to describe visual context during idle moments. Environmental Observer Service and multi-format file upload with RAG.
- **Object Recognition System**: Real-time object detection using TensorFlow.js and COCO-SSD model.
- **Voice Command System**: Hands-free control with natural language commands routed through the agentic pipeline.
- **Routine Automation System**: IF-THEN-THAT automation supporting various triggers.
- **Dual PersonI Manager**: Multi-AI collaboration system with four modes: collaborative, debate, teaching, and single.
- **Call Intelligence System**: Real-time call transcription, automatic note-taking, action item detection, sentiment analysis, and post-call summarization.
- **Context Suggestion Engine**: Pattern-based, memory-based, time-based, and activity-based suggestions.
- **Calendar System**: Visual component with natural language event creation and Google Calendar integration.
- **Security**: CSP hardening, OAuth Vault V2 Backend with PKCE + CSRF protection.
- **Plugin System**: Dynamic UI plugin architecture with registry, sandbox, and persistence.
- **CommandRouter Service**: Handles 13 app control functions exposed via LLM function calling.
- **Background Manager**: Centralized full-viewport background content management for device camera feeds and external video sources.
- **ComfyUI Integration**: User-configurable endpoint for advanced image/video/audio generation workflows with REST API proxy, workflow registry, job submission, status polling, and asset retrieval.
- **Sensor Ingestion Service**: Continuous background data collection from camera, microphone, GPS, accelerometer, and gyroscope sensors. Configurable sampling intervals and policies. Feeds data to PerceptionOrchestrator and RAG backends with selective storage flags. GPS tracking via watchPosition API with high-accuracy positioning.
- **Capability-Aware Routing**: CapabilityResolver service routes requests to best-fit models based on capabilities (thinking, tools, vision, audio). Model registry with metadata for context windows, cost tiers, latency tiers. Preference-based scoring system favoring local models (Ollama, LM Studio, vLLM) with cloud fallback. Supports dynamic model registration and capability updates.
- **Input Orchestrator**: Intelligent coordination of concurrent mic/text/camera/upload inputs with priority queues (high/medium/low). Prevents system overload through adaptive cooldowns, max concurrent request limits, and queue capacity management. Stats tracking for throughput and performance monitoring. Automatic dropping of lowest-priority requests when at capacity.

## External Dependencies
- **Google Gemini API**: Conversational AI and embeddings.
- **Three.js**: 3D rendering.
- **Lit**: UI development.
- **Vite**: Build tool.
- **@google/genai**: Google Gemini API client library.
- **@xenova/transformers**: Local Whisper STT.
- **TensorFlow.js**: Machine learning for browser-based inference.
- **@tensorflow-models/coco-ssd**: Object detection model.
- **Express**: Backend server.
- **CORS**: Cross-origin resource sharing.
- **ChromaDB**: Vector database for RAG.
- **Alpha Vantage API**: Real-time stock market data.
- **CoinGecko API**: Cryptocurrency market data.
- **Finnhub API**: Financial market news.
- **AudD API**: Song identification.
- **Genius API**: Song lyrics.
- **Twilio API**: SMS and voice calls.
- **Gmail API**: Email search and sending.
- **Google Calendar API**: Calendar integration.