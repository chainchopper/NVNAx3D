# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system designed to provide highly customizable and engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a local-first, multi-provider platform, extensible with various external services, positioning itself as a versatile personal AI ecosystem with significant market potential. It focuses on offering a rich, interactive, and personalized AI experience.

## Agentic Intelligence System (November 2025)

**Implementation Status**: ✅ **PRODUCTION READY** - Complete agentic architecture fully integrated and operational.

### Core Services:
1. **PerceptionOrchestrator** (`src/services/agentic/perception-orchestrator.ts`) - LLM-powered intent/entity/sentiment extraction with heuristic fallback
2. **PlannerService** (`src/services/agentic/planner-service.ts`) - LLM planning with connector validation and template fallback
3. **AgenticReasoningEngine** (`src/services/agentic-reasoning-engine.ts`) - Perception → Reasoning → Planning → Action pipeline with 8 real action types
4. **CallIntelligence** (enhanced) - Real Gmail/Twilio summary delivery, session persistence
5. **ContextSuggestionEngine** - Pattern-based proactive suggestions
6. **RoutineExecutor** - Auto-initializes on app startup, loads and executes IF-THEN-THAT automation routines

### Action Types: telephony_call, telephony_sms, email_send, store_memory, create_task, calendar_event, web_search, routine_create

### Integration Status: ✅ **COMPLETE** - Wired into ConversationOrchestrator with standardized ActionExecutionResult interface, comprehensive error handling, and user-visible success/failure reporting.

## Recent Changes (November 17, 2025)

### Critical Fixes Deployed
1. **Camera System Restored** ✅
   - Re-wired VisualizerShell ↔ CameraManager bindings
   - All camera controls now functional: start/stop, preview toggle, switch camera
   - Video element properly connected to ObjectRecognitionService

2. **YOLO Object Detection Working** ✅
   - Lazy-loads TensorFlow.js COCO-SSD model on demand
   - Real-time object detection with bounding boxes and confidence scores
   - FPS counter and object statistics display
   - Detection results stored in RAG memory automatically

3. **Web Search Implementation** ✅
   - Created backend `/api/web-search` endpoint
   - Supports DuckDuckGo (free, no API key) and Brave Search API
   - Agentic reasoning engine now executes real web searches
   - Returns structured results with error handling

4. **UI Icon Layout Fixed** ✅
   - Object detection button repositioned from bottom: 160px → 270px
   - Eliminated overlap with camera controls stack
   - All 8 icon groups properly spaced (documented in /tmp/ui-icon-layout.md)
   - Spacing rules: Object detection (270px) → 18px gap → Camera controls (100-252px)

### Voice Command System Implemented ✅ (Nov 17, 2025)
1. **CommandRouter Service** (`src/services/command-router.ts`)
   - 13 app control functions exposed via LLM function calling manifest
   - Functions: toggle_camera, toggle_camera_preview, toggle_object_detection, switch_personi, enable_dual_mode, open_panel, close_panel, toggle_rag, create_note, create_task, toggle_settings_menu, mute_microphone
   - Event-driven architecture using CustomEvents for decoupled execution
   - Full error handling with CommandResult interface

2. **Agentic Integration**
   - Added 'app_control' action type to AgenticReasoningEngine
   - Commands routed through agentic pipeline: Perception → Reasoning → Planning → Action
   - Voice/text commands now trigger app control actions automatically
   - Example: "Turn on the camera" → app_control action → CommandRouter execution

3. **Event-Driven Execution**
   - VisualizerShell registers command event handlers in registerCommandHandlers()
   - Listens for 7 command types: camera controls, PersonI switching, dual mode, RAG toggle
   - State updates flow through CustomEvents maintaining clean separation of concerns

### Help Panel Enhanced with Visual Analytics ✅ (Nov 17, 2025)
1. **Mermaid.js Integration**
   - Service architecture diagrams showing full agentic pipeline
   - Interactive flowcharts with dark theme customization
   - Auto-rendering on section change with proper cleanup

2. **Chart.js Integration**
   - Action Types Distribution (doughnut chart) - 7 action types visualization
   - Pipeline Performance Metrics (line chart) - timing breakdown
   - Responsive charts with proper memory management and cleanup

3. **New Architecture Section**
   - Comprehensive technical overview with 2 Mermaid diagrams + 2 Chart.js charts
   - Documents all key services and their relationships
   - Navigation item added: 🏗️ Architecture
   - Full system architecture visibility for developers

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

### UI/UX Decisions
- **Design Philosophy**: Minimalist, glass-morphism, clean, and uncluttered interfaces.
- **Visuals**: AI-generated liquid-themed avatars, dynamic 3D objects with audio-reactive visuals, object detection overlays. The camera feed can be displayed as a 3D WebGL background.
- **Panels**: Comprehensive Notes, Tasks, Memory Management, User Profile, and Calendar views.
- **Usability**: Intuitive settings for AI providers and PersonI capabilities, visual indicators for system status, and distinct UI sections for OAuth and API tools in PersonI settings. Model selection dropdowns filter by appropriate capabilities.
- **Settings UI (Nov 2024)**: Centered 80px draggable FAB button (gear icon) opens radial menu with 60px icon buttons (32px SVG icons). All 11 panels (Models, PersonI, Connectors, Notes, Tasks, Memory, Routines, Plugins, Telephony, User Profile, Help) managed via settings-dock with multi-layer navigation. Help documentation fully accessible via dedicated menu icon.

### System Design Choices
- **PersonI System**: Manages AI personas with unique attributes, capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline), and a template system. Supports a financial advisor PersonI, BILLY. PersonI configurations support both legacy string model IDs and new `{ providerId, modelId }` format.
- **Agentic Intelligence Architecture**: PersonI use a Perception → Reasoning → Planning → Action pipeline for autonomous decision-making. Continuous learning from patterns, context-aware suggestions across all UI, and automatic routine generation from successful workflows.
- **Connector Backend Proxy**: Secure Express.js server for external service integrations with OAuth token handling, including robust SSRF protection for model proxy and custom provider discovery.
- **Codrops Audio Visualizer**: Separate `/visualizer` route with advanced shaders, 3D elements, GSAP animations, and interactive controls.
- **Twilio Integration**: Manual configuration via app Settings UI for SMS/voice calls.
- **Model Provider System**: Configures and integrates multiple AI providers (OpenAI, Google, custom) with flexible model selection for conversation, vision, embedding, function calling, and TTS, inferring capabilities from model names for custom providers. Model onboarding is entirely manual via the Settings UI.
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model, supporting 17 memory types with semantic search and temporal queries, initialized gracefully with error handling.
- **Local Speech-to-Text (STT)**: Browser-based Whisper models (@xenova/transformers) with IndexedDB caching and event-driven audio capture.
- **Enhanced Audio System**: SharedMicrophoneManager, audio recording, real-time music detection, and full OpenAI TTS integration.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation, including Camera-as-3D-Background, Vision-Enhanced Idle Speech, Environmental Observer Service, and multi-format file upload with RAG.
- **Object Recognition System**: Real-time object detection using TensorFlow.js and COCO-SSD model.
- **Voice Command System**: Hands-free control with natural language commands.
- **Routine Automation System**: IF-THEN-THAT automation supporting various triggers including time, events, state monitoring, user actions, and vision detection.
- **Dual PersonI Manager**: Multi-AI collaboration system with four modes: collaborative, debate, teaching, and single.
- **Call Intelligence System**: Real-time call transcription, automatic note-taking, action item detection, sentiment analysis, and post-call summarization with email/SMS delivery.
- **Context Suggestion Engine**: Pattern-based, memory-based, time-based, and activity-based suggestions across all interfaces for proactive assistance.
- **Agentic Reasoning Engine**: Full perception (intent/entity/sentiment extraction), reasoning (goal identification, prerequisite checking, multi-step planning), and action execution with confidence scoring.
- **Calendar System**: Visual component with natural language event creation and Google Calendar integration.
- **Security**: CSP hardening, OAuth Vault V2 Backend with PKCE + CSRF protection. Backend API fixes include missing endpoints and robust SSRF protection.
- **Plugin System**: Dynamic UI plugin architecture with registry, sandbox, and persistence.
- **LocalStorage Management**: Includes quota protection, warnings, and automatic cleanup.
- **Backend URL Management**: Centralized management using `getBackendUrl()` for CORS-safe requests and proper WebSocket URL conversion.
- **OAuth Integration**: Full Google OAuth with write permissions (gmail.send, gmail.modify, calendar.events) configured via Settings UI with popup flow.

## Infrastructure & Deployment

### Docker Compose Stack (Optional - Local Development)
Complete local-first infrastructure available via `docker-compose.yml`:
- **PostgreSQL** (port 5432) - Relational database
- **Milvus** (port 19530) - High-performance vector database
- **Qdrant** (port 6333) - Alternative vector database
- **Flowise** (port 3000) - LLM workflow orchestration UI
- **n8n** (port 5678) - Workflow automation platform
- **Jupyter** (port 8888) - Data science notebooks
- **Apache Tika** (port 9998) - Content extraction
- **MinIO** + **etcd** - Object storage and metadata

### Environment Configuration
All services configured via `.env` file (see `.env.example` template):
- **Setup Script**: `./scripts/setup-env.sh` - Interactive setup helper
- **Documentation**: `SETUP.md` - Complete configuration guide
- **Quick Reference**: `DOCKER_REFERENCE.md` - Docker commands

### Data Persistence
All data stored in `./data/` subdirectories for full portability and backup.

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
- **raw.githubusercontent.com, HuggingFace CDN**: Content delivery for models and assets.
- **Alpha Vantage API**: Real-time stock market data.
- **CoinGecko API**: Cryptocurrency market data.
- **Finnhub API**: Financial market news with sentiment analysis.
- **AudD API**: Song identification.
- **Genius API**: Song lyrics.
- **Twilio API**: SMS and voice calls.
- **Gmail API**: Email search and sending.
- **Google Calendar API**: Calendar integration.