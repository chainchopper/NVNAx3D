# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system offering customizable, engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a local-first, multi-provider platform, extensible with various external services, providing a rich, interactive, and personalized AI experience with autonomous, always-aware PersonI agents that reason, plan, learn, and suggest.

## Recent Changes (Nov 19, 2025)
- **Intelligent Model Auto-Assignment**: Created ModelAutoAssignmentService with comprehensive heuristics that automatically assigns fetched models to correct capability slots (chat, vision, STT, TTS, embeddings, image gen). Supports Ollama (:variant), LM Studio (-gguf/-fp16), vLLM (org/model) naming patterns. Capabilities are ADDITIVE - multimodal models like gpt-4-vision now correctly support both conversation AND vision. Fully integrated into ProviderManager.autoAssignModelsToPersonis() for automatic PersonI configuration when providers sync models.
- **Auto-Persistence Infrastructure**: Built StorageSyncService (debounced writes, dirty checking, cross-tab sync, quota awareness) and PersistentStateController (Lit ReactiveController mirroring React's useEffect pattern) - available for UI components to use for automatic settings persistence without save buttons.
- **Provider Type Detection**: ModelAutoAssignmentService.detectProviderType() identifies Ollama, LM Studio, vLLM, OpenAI from model naming patterns; getModelCapabilitySummary() provides human-readable capability lists for tooltips/guidance.

## Recent Changes (Nov 19, 2025 - Earlier)
- **localStorage Quota Management**: Implemented comprehensive storage quota monitoring system that tracks usage (currently 50%), automatically prunes old memories when reaching 85% capacity, with progressive emergency cleanup handlers (500→250→100→50→25 memories) preventing quota exceeded errors - fixes conversation blocking issues. See STORAGE_QUOTA_MANAGEMENT.md for full details.
- **PersonI Settings Panel Rewritten**: Complete panel overhaul with 6 clean sections (Identity, AI Models, Voice, Capabilities, Connectors, Plugins), removed irrelevant Visual Identity settings (shape/texture/animation), improved UI/UX, and fixed persistence with true localStorage round-trip verification
- **Persistence Fixed**: Implemented post-save verification that reads from localStorage, validates all fields (plugins, connectors, capabilities, models), rehydrates UI from storage data, and logs any data loss - ensuring reliable persistence across sessions
- **Vision AI Panel Fixed**: Added missing panel registration in settings-dock; now properly accessible from circular menu
- **Image Generation Rebranded**: Renamed "ComfyUI" to "Image Generation" across UI; documented multi-provider architecture plan supporting ComfyUI, Gemini Imagen, Stable Diffusion, DALL-E, and Google Veo (see ARCHITECTURE_IMAGE_GENERATION.md)
- **New Connectors Implemented**: Added SMTP, Telegram, Discord, WhatsApp with backend handlers, function declarations, and server routes - all using Settings UI configuration
- **Plugin Card System Complete**: Created .nirvana-card import/export format with PluginCardManager service, validation, versioning, and marketplace metadata support
- **PersonI Plugin Integration**: Added UI Plugins section to PersonI settings panel with toggle controls and persistent storage of enabled plugins per-PersonI
- **Default Plugins**: Created 5 pre-packaged plugins (System Monitor, Quick Notes, Crypto Ticker, Memory Browser, Conversation Stats) with auto-import on first launch

## User Preferences
- **Graphics Preference**: WebGPU over WebGL (better performance)
- **Local-First**: Prefer on-device processing (Whisper for STT)
- **Flexibility**: Manual configuration of all endpoints and services
- **Not locked into Google's ecosystem**: Multi-provider support essential
- **CRITICAL: No Replit Dependency**: ALL integrations/connectors (Twilio, Gmail, etc.) MUST be configured via app Settings UI or .env files - NOT Replit's integration system. System must be fully portable and independent.
- **Agentic Intelligence**: PersonI should be always-aware, autonomous agents that reason, plan, learn, and suggest - not passive responders. Continuous data gathering, pattern recognition, and proactive assistance.
- **UI/UX Clarity**: Larger, more visible icons and controls; centered, draggable FAB button; clear visual hierarchy.

## System Architecture

### UI/UX Decisions
The design philosophy is minimalist, glass-morphic, clean, and uncluttered. Visuals include AI-generated liquid-themed avatars and dynamic 3D objects with audio-reactive elements. The UI features comprehensive panels (Notes, Tasks, Memory, User Profile, Calendar), intuitive settings for AI providers and PersonI, and visual status indicators. A centered, draggable FAB button accesses a circular menu wheel providing access to 12 panels. Camera controls are on the left, and a native HTML5 `<video>` element displays the camera feed. A PersonI carousel allows quick switching between personas. The system includes dedicated device settings, a lightweight music detection service, and multi-device camera support. UI element positioning is carefully managed with proper z-index and `pointer-events` for optimal interaction. Tooltips appear vertically above buttons. A top-right circular RAG settings menu provides quick access to context controls. A tandem input system allows simultaneous voice and text input. The 3D brain visualization dynamically scales and adjusts opacity when the camera is active.

### System Design Choices
Nirvana utilizes a **PersonI System** for managing AI personas with unique attributes and capabilities. **Agentic Intelligence** follows a Perception → Reasoning → Planning → Action pipeline, supported by core services like PerceptionOrchestrator and PlannerService, enabling 8 action types and 'app_control'. The **CapabilityGuard Service** mediates all AI feature requests, ensuring graceful degradation and providing voice instructions for configuration issues. The **System Context Service** provides comprehensive AI awareness of system states, aggregating notes, tasks, memories, and tools into every conversation with smart caching. A **Connector Backend Proxy** (Express.js) handles secure external service integrations. The **Model Provider System** supports multiple AI providers with flexible model selection, automatic normalization of endpoints, and RFC1918 private network detection for local servers. It features a two-phase PersonI model migration for canonical model referencing and intelligent auto-assignment. **Memory & RAG System** uses ChromaDB (with localStorage fallback) and Gemini embeddings for vector-based semantic and temporal memory queries. **Local Speech-to-Text (STT)** is powered by browser-based Whisper models. An **Enhanced Audio System** includes microphone management, recording, real-time music detection, and OpenAI TTS. The **Turn Detection Service** intelligently completes conversation turns using VAD and Whisper analysis. The **Vision AI System** supports local vision models via user-configured endpoints (Moondream, LLaVA, Qwen-VL) and integrates with LLM function calling. The **Environmental Awareness Suite** provides real-time camera-based contextual observation and Vision-Enhanced Idle Speech. **Object Recognition** uses TensorFlow.js and COCO-SSD. A **Voice Command System** allows hands-free control. **Routine Automation** enables IF-THEN-THAT workflows. A **Dual PersonI Manager** facilitates multi-AI collaboration. **Call Intelligence** offers real-time transcription, note-taking, and sentiment analysis. A **Context Suggestion Engine** provides pattern, memory, time, and activity-based suggestions. A **Calendar System** integrates with Google Calendar. **Security** includes CSP hardening and OAuth Vault V2. A **Plugin System** allows dynamic UI plugins. The **CommandRouter Service** exposes app control functions via LLM calls. A **Background Manager** handles full-viewport background content. **ComfyUI Integration** provides advanced image/video/audio generation. The **Sensor Ingestion Service** continuously collects sensor data for PerceptionOrchestrator and RAG. The **Capability-Aware Routing** system routes requests to best-fit models based on capabilities and preferences, favoring local models. The **Input Orchestrator** manages concurrent inputs with priority queues and adaptive cooldowns.

## Default Plugins
Nirvana ships with 5 powerful pre-installed plugins:
1. **System Monitor** - Real-time system status, active PersonI, and performance metrics
2. **Quick Notes** - Fast, ephemeral notepad for capturing thoughts and ideas
3. **Crypto Ticker** - Live cryptocurrency prices (BTC, ETH, SOL) with 24h changes
4. **Memory Browser** - Browse and search PersonI memory and RAG database
5. **Conversation Stats** - Analytics and insights about AI conversations with topic tracking

These plugins are automatically imported on first app launch and can be enabled per-PersonI via Settings → UI Plugins.

## External Dependencies
- Google Gemini API
- Three.js
- Lit
- Vite
- @google/genai
- @xenova/transformers (for local Whisper STT)
- TensorFlow.js
- @tensorflow-models/coco-ssd
- Express
- ChromaDB
- Alpha Vantage API
- CoinGecko API
- Finnhub API
- AudD API
- Genius API
- Twilio API
- Gmail API
- Google Calendar API