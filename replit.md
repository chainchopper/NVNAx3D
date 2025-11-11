# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system designed to provide highly customizable and engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a local-first, multi-provider platform, extensible with various external services, positioning itself as a versatile personal AI ecosystem with significant market potential.

## Recent Changes (November 11, 2025)
- **PersonI Settings Panel Restored**: Comprehensive `personi-settings-panel.ts` (865 lines) with full configuration UI including identity, model assignments (conversation, vision, embedding, function calling, image generation), voice selection, visual identity (shape, color, texture, animation), capabilities toggles (vision, MCP, tools, image gen, web search), and connector selection.
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