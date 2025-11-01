# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system featuring multiple AI personas (PersonI - Personified Intelligence) with unique personalities, voices, and capabilities. It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The system's core purpose is to provide highly customizable and engaging AI companions, offering a modular and extensible platform for personalized AI experiences. The project aims to be local-first, multi-provider, and capable of integrating with various external services, positioning itself as a versatile personal AI ecosystem with significant market potential.

## User Preferences
- **Graphics Preference**: WebGPU over WebGL (better performance)
- **Local-First**: Prefer on-device processing (Whisper for STT)
- **Flexibility**: Manual configuration of all endpoints and services
- **Not locked into Google's ecosystem**: Multi-provider support essential

## System Architecture

### Core Technologies
- **Framework**: Lit (Web Components)
- **Build Tool**: Vite 6.2
- **AI Provider**: Google Gemini API (@google/genai), with multi-provider support
- **3D Graphics**: Three.js (WebGL, planned WebGPU migration)
- **Language**: TypeScript
- **Backend**: Express.js (Node.js) for secure connector API proxy

### Key Components
- **PersonI System**: Defines AI personas with unique personalities, voices, models, and visual styles, including specific capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline - MCP). Features a template system for custom PersonI creation and includes a financial advisor PersonI named BILLY with vision capabilities and financial connectors.
- **3D Visualization**: WebGL-based animated 3D objects with texture mapping, enhanced idle animations (8 modes), and audio-reactive visuals. PersonI have unique visual configurations and dynamic backgrounds.
- **Main Component**: Manages audio I/O, Gemini AI streaming, PersonI switching, and voice activity detection.
- **Connector Backend Proxy**: Secure Express.js server for external service integrations (e.g., Gmail, Google Calendar, GitHub, Linear, Notion, Slack, financial APIs), handling OAuth tokens and API keys server-side.
- **Model Provider System**: Manages configuration and integration of multiple AI providers (OpenAI, Google, custom endpoints) and their models.
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model. Supports 17 memory types (conversations, financial, files, etc.) with semantic search, temporal queries, and speaker management. Includes a RAG memory toggle for user control (minimalist brain emoji 🧠 design).
- **User Profile System**: Stores user-specific information for context.
- **Local Speech-to-Text (STT)**: Integration of browser-based Whisper models (@xenova/transformers) with IndexedDB caching.
- **Enhanced Audio System**: SharedMicrophoneManager for concurrent audio consumers, audio recording manager, and real-time music detection system with BPM estimation and beat-synchronized 3D visuals.
- **Song Identification System**: Soundhound-style song recognition via AudD API with lyrics (Genius API), UI display, and RAG memory integration.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation. Includes a Camera Manager component with minimalist controls (👁️ preview toggle, 📷 camera toggle), Camera-as-3D-Background, Vision-Enhanced Idle Speech (analyzing live camera frames), and an Environmental Observer Service for continuous monitoring and proactive assistance. Features a multi-format file upload system with RAG integration for analyzed content and metadata.
- **Object Recognition System**: Real-time object detection using TensorFlow.js and COCO-SSD model. Detects 80 object classes with confidence scores, bounding boxes, FPS tracking, and visual overlay with proper video scaling.
- **Voice Command System**: Hands-free control with 20+ natural language commands (PersonI switching, camera control, panel management, volume, object detection, notes/tasks, etc.). Pattern-based matching with parameter extraction and structured return values.
- **Routine Automation System**: IF-THEN-THAT automation supporting time-based, event-driven, state monitoring, user actions, and vision detection triggers. Vision triggers support 'local' (TensorFlow.js), 'frigate', 'codeprojectai', and 'yolo' services for object detection-based automation with configurable confidence thresholds.
- **Dual PersonI Manager**: Multi-AI collaboration system with 4 modes (collaborative, debate, teaching, single). Features turn management, conversation history, intelligent switching logic, and primary persona preservation.
- **Calendar System**: Visual calendar component with month/week/day/agenda views, natural language event creation ("Meeting with John tomorrow at 2pm"), and integration-ready Google Calendar backend support.
- **CSP Security Hardening**: Implemented Content Security Policy for secure content delivery.
- **Chatterbox-TTS Integration**: Custom TTS API support with configurable endpoint, voice synthesis, voice cloning capabilities, and a dedicated configuration UI.

### UI/UX Decisions
- **Minimalist Design Philosophy**: Clean, uncluttered interfaces with essential controls only
- **Camera Controls**: Minimalist 2-icon design (👁️ preview toggle, 📷 camera on/off) - no permission banners (browser handles natively)
- **RAG Toggle**: Compact brain emoji (🧠) design with memory count badge, clean top-left positioning
- **Glass-morphism**: Consistent design across panels (notes, tasks, memory, financial, calendar, object detection)
- **Intuitive settings**: AI providers and PersonI capabilities configuration
- **Visual indicators**: Provider status, PersonI selection, detection stats, FPS counters
- **Unique AI-generated avatars**: Liquid-themed avatars for each PersonI
- **Comprehensive panels**: Notes, Tasks, Memory Management with semantic search, filtering, visual cues
- **User profile panel**: Personal data management
- **Object Detection Overlay**: Green bounding boxes with class labels and confidence percentages
- **Calendar Views**: Month grid, week, day, and agenda views with natural language quick-add

## External Dependencies
- **Google Gemini API**: Primary AI provider for conversational AI and embeddings.
- **Three.js**: JavaScript 3D library for rendering PersonI visualizations.
- **Lit**: Web Components library for UI development.
- **Vite**: Build tool.
- **@google/genai**: Google Gemini API client library.
- **@xenova/transformers**: For local Whisper STT integration.
- **TensorFlow.js**: Machine learning framework for browser-based inference.
- **@tensorflow-models/coco-ssd**: Pre-trained object detection model (80 classes).
- **Express**: Backend server for secure connector API proxy.
- **CORS**: Cross-origin resource sharing for backend API.
- **ChromaDB**: For vector database integration in the RAG system.
- **raw.githubusercontent.com, HuggingFace CDN**: Allowed for content delivery.
- **Alpha Vantage API**: For real-time stock market data.
- **CoinGecko API**: For cryptocurrency market data (free tier, production-ready).
- **Finnhub API**: For financial market news with sentiment analysis.
- **AudD API**: For song identification.
- **Genius API**: For song lyrics.
- **Plaid/Yodlee (planned)**: For financial transaction and account data.

## Recent Development (November 1, 2025)
### UI/UX Fixes & Google OAuth Modal Implementation
- **Settings Menu & Controls Restoration**: Fixed obliterated settings access - settings FAB and UI controls now always visible (no auto-hide)
- **NIRVANA Geometry**: Confirmed using Icosahedron (not cube) - TorusKnot and Icosahedron only geometries in system
- **Google OAuth Modal UI**: Browser-based OAuth flow for Google connectors (Gmail, Calendar, Docs, Sheets)
  - "Connect with Google" button opens OAuth popup (600x700px centered)
  - Polls `/api/oauth/status` every 1s for completion
  - Auto-closes popup and saves verified config on success
  - Uses OAuth Vault V2 backend (`/api/oauth/initiate`, `/api/oauth/callback`)
  - Manual credential entry still available as fallback (OR divider)
- **Camera Auto-Request**: Auto-requests camera permissions on first load using Permissions API
  - Checks permission state: 'prompt' (auto-request), 'granted' (mark as ready), 'denied' (wait for manual)
  - Only requests if permission state is 'prompt' (not already decided)
  - Gracefully handles browsers without Permissions API
- **Connector Config LSP Fix**: Separated credential storage from ConnectorConfig type
  - Credentials stored in `localStorage` with key `connector_credentials_{connectorId}`
  - ConnectorConfig remains type-safe (id, name, configured, verified, lastVerified)

### OAuth Security & Plugin Sandbox Hardening (Earlier Nov 1)
- **DOMPurify Integration**: Battle-tested HTML sanitization for plugin system (replaced custom sanitizer)
- **OAuth Vault V2 Backend**: Server-side token storage with PKCE + CSRF protection
  - Backend endpoints: `/api/oauth/initiate`, `/api/oauth/callback`, `/api/oauth/status`, `/api/oauth/disconnect`, `/api/oauth/proxy`
  - State validation with 10-minute expiry
  - Provider-specific auth flows (Coinbase, Google)
  - ⚠️ **CRITICAL**: No user/session binding - any client can access all tokens (deferred for production auth layer)
- **Coinbase OAuth Integration**: Updated to use secure OAuth Vault V2 with backend-proxied API calls
- **CSP Camera Fix**: Added `media-src 'self' blob: mediastream:` for getUserMedia support
- **CSP Backend Communication**: Added `http://localhost:*` to connect-src for dev environment
- **WebSocket Real-Time Feeds**: Crypto price streams (CoinGecko polling), stock streams (planned Finnhub), connection pooling

## Recent Development (October 30, 2025)
### UI/UX Cleanup Sprint
- Simplified camera controls to minimalist 2-icon design (👁️ preview, 📷 camera)
- Removed redundant permission banner (browser handles natively)
- Redesigned RAG toggle to compact brain emoji (🧠) with memory count badge
- All UI changes preserve full functionality while reducing visual clutter

### Advanced Features Sprint
- **Object Recognition**: ✅ PRODUCTION-READY - TensorFlow.js COCO-SSD integration with 80-class detection, bounding boxes, confidence scores, FPS tracking, proper video scaling, RAG memory integration
- **Voice Commands**: ✅ PRODUCTION-READY - 20+ natural language commands with voice feedback for all actions (PersonI switching, camera, panels, volume, detection, notes, tasks, routines), routine name-to-ID lookup, error handling
- **Routine Vision Triggers**: ✅ PRODUCTION-READY - Local TensorFlow.js object detection integrated with routine automation system. Supports 'local' vision service alongside Frigate, CodeProject.AI, and YOLO. Automatic model initialization, proper error handling, configurable confidence thresholds.
- **BILLY Financial APIs**: ✅ PRODUCTION-READY - Real backend integration with Alpha Vantage (stocks), CoinGecko (crypto - no API key needed), and Finnhub (market news with sentiment). Backend-secured with caching, graceful mock data fallback, no API key exposure.
- **Dual PersonI**: 🔧 IN PROGRESS - Backend integration complete (state management, handler methods), UI controls pending, conversation routing pending
- **Calendar**: Component built with month/week/day/agenda views and natural language parsing, Google Calendar backend integration pending
- **Bug Fixes**: Bounding box scaling, parameter propagation, primary persona restoration, voice command async routine lookup, vision trigger initialization - all architect-reviewed and production-ready

### BILLY Financial Integration Status
- ✅ **Stock Data Service**: Alpha Vantage API with backend caching (requires ALPHA_VANTAGE_API_KEY secret)
- ✅ **Crypto Data Service**: CoinGecko free API - PRODUCTION READY (no API key needed, 30 calls/min)
- ✅ **Market News Service**: Finnhub API with sentiment analysis (requires FINNHUB_API_KEY secret)
- ✅ **Portfolio Manager**: Real-time tracking with backend persistence
- ✅ **Security**: All services secured on backend (server.js) - no frontend API key exposure
- ✅ **Fallback System**: Graceful fallback to mock data when API keys not configured
- ✅ **Backend Endpoints**: `/api/financial/stocks`, `/api/financial/crypto`, `/api/financial/news`
- ⏳ **Banking Integration**: Pending Plaid/Yodlee integration for real transactions and account balances

### Dual PersonI Integration Status
- ✅ Imported dualPersonIManager and DualMode types
- ✅ Added state variables: dualModeActive, dualModeType, secondaryPersoni, showDualControls
- ✅ Implemented handler methods: handleToggleDualMode(), handleDualModeTypeChange(), handleSecondaryPersonISelect()
- ⏳ TODO: Add UI controls (toggle button, mode selector, secondary PersonI picker)
- ⏳ TODO: Modify conversation routing to use dualPersonIManager.getActivePersonI()
- ⏳ TODO: Implement turn switching after each AI response
- ⏳ TODO: Visual indicators for active speaker in dual mode

### Routine Vision Triggers Integration Status
- ✅ **Vision Service Types**: Added 'local' service to routine-types.ts alongside frigate, codeprojectai, yolo
- ✅ **Local Detection Integration**: TensorFlow.js object detection service integrated with routine executor
- ✅ **Model Initialization**: Automatic idempotent initialization before detection (critical fix)
- ✅ **Object Mapping**: Detected objects mapped to routine trigger format (label, confidence)
- ✅ **Error Handling**: Proper video element validation and error logging
- ✅ **Configuration**: Supports minConfidence threshold, checkInterval polling, objectTypes filtering
- ✅ **Architecture Review**: Production-ready after architect review and initialization fix