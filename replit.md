# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system designed to provide highly customizable and engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a local-first, multi-provider platform, extensible with various external services, positioning itself as a versatile personal AI ecosystem with significant market potential. It focuses on offering a rich, interactive, and personalized AI experience, with autonomous, always-aware PersonI agents that reason, plan, learn, and suggest.

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
- **Settings UI**: Centered draggable FAB button opens radial menu with various icon buttons. All 11 panels (Models, PersonI, Connectors, Notes, Tasks, Memory, Routines, Plugins, Telephony, User Profile, Help) managed via settings-dock with multi-layer navigation.

### System Design Choices
- **PersonI System**: Manages AI personas with unique attributes and capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline), and a template system.
- **Agentic Intelligence Architecture**: PersonI use a Perception → Reasoning → Planning → Action pipeline for autonomous decision-making. Core services include PerceptionOrchestrator, PlannerService, and AgenticReasoningEngine. Includes 8 action types: telephony_call, telephony_sms, email_send, store_memory, create_task, calendar_event, web_search, routine_create.
- **Connector Backend Proxy**: Secure Express.js server for external service integrations with OAuth token handling and robust SSRF protection.
- **Model Provider System**: Configures and integrates multiple AI providers with flexible model selection.
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model, supporting 17 memory types with semantic search and temporal queries.
- **Local Speech-to-Text (STT)**: Browser-based Whisper models (@xenova/transformers) with IndexedDB caching.
- **Enhanced Audio System**: SharedMicrophoneManager, audio recording, real-time music detection, and full OpenAI TTS integration.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation, Vision-Enhanced Idle Speech, Environmental Observer Service, and multi-format file upload with RAG.
- **Object Recognition System**: Real-time object detection using TensorFlow.js and COCO-SSD model.
- **Voice Command System**: Hands-free control with natural language commands, routed through the agentic pipeline via an 'app_control' action type.
- **Routine Automation System**: IF-THEN-THAT automation supporting various triggers.
- **Dual PersonI Manager**: Multi-AI collaboration system with four modes: collaborative, debate, teaching, and single.
- **Call Intelligence System**: Real-time call transcription, automatic note-taking, action item detection, sentiment analysis, and post-call summarization with email/SMS delivery.
- **Context Suggestion Engine**: Pattern-based, memory-based, time-based, and activity-based suggestions for proactive assistance.
- **Calendar System**: Visual component with natural language event creation and Google Calendar integration.
- **Security**: CSP hardening, OAuth Vault V2 Backend with PKCE + CSRF protection.
- **Plugin System**: Dynamic UI plugin architecture with registry, sandbox, and persistence.

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
## Recent Changes (November 17, 2025)

### Voice Command System Implemented ✅
1. **CommandRouter Service** (`src/services/command-router.ts`)
   - 13 app control functions exposed via LLM function calling manifest
   - Functions: toggle_camera, toggle_camera_preview, toggle_object_detection, switch_personi, enable_dual_mode, open_panel, close_panel, toggle_rag, create_note, create_task, toggle_settings_menu, mute_microphone
   - Event-driven architecture using CustomEvents for decoupled execution
   - Full error handling with CommandResult interface

2. **Agentic Integration**
   - Added 'app_control' action type to AgenticReasoningEngine
   - Commands routed through agentic pipeline: Perception → Reasoning → Planning → Action
   - Voice/text commands now trigger app control actions automatically

3. **Event-Driven Execution**
   - VisualizerShell registers command event handlers in registerCommandHandlers()
   - Listens for 7 command types: camera controls, PersonI switching, dual mode, RAG toggle
   - State updates flow through CustomEvents maintaining clean separation of concerns

### Help Panel Enhanced with Visual Analytics ✅
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

### Critical UI/UX Fixes ✅
1. **Camera Controls & Object Detection Buttons Now Clickable**
   - Fixed pointer-events blocking issue in object-detection-overlay component
   - Removed pointer-events: none from :host to allow hit testing into shadow DOM
   - Set pointer-events: none on .overlay-container to allow clicks through empty space
   - Interactive elements (toggle button, stats panel) have pointer-events: auto

2. **Camera Background Full-Screen Display Fixed**
   - Changed camera-manager :host from position: relative to position: fixed
   - Camera now displays as full viewport background (100vw × 100vh) when enabled
   - Set z-index: 1 on camera background (below all other UI elements)
   - Added pointer-events: none to camera elements to allow clicks through to controls

3. **Z-Index Unified for All Interactive HUD Elements**
   - Raised all clickable icons/menus to z-index: 150 to prevent obstruction
   - Updated: camera-controls, object-detection-overlay, rag-toggle, ui-controls, persona-carousel-hud, music-detection-hud, dual-mode-controls-hud
   - All interactive elements guaranteed above 3D canvas (z:10) and below panels (z:200+)

4. **Icon Spacing Increased to 30px Minimum**
   - Camera controls: increased gap from 10px to 30px between buttons
   - Object detection toggle: moved from bottom 270px → 330px (38px clearance above camera controls)
   - Music detection HUD: moved from top 20px → 80px (60px clearance from top edge)
   - Dual mode controls: moved from top 90px → 110px (increased spacing below persona carousel)
   - All icons now have minimum 30px spacing preventing overlap and ensuring clickability
