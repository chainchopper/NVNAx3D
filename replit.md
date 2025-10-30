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
- **Yahoo Finance API**: For stock data.
- **CoinGecko API**: For cryptocurrency data.
- **AudD API**: For song identification.
- **Genius API**: For song lyrics.
- **Plaid/Yodlee (planned)**: For financial transaction and account data.
- **NewsAPI/Finnhub (planned)**: For financial news.

## Recent Development (October 30, 2025)
### UI/UX Cleanup Sprint
- Simplified camera controls to minimalist 2-icon design (👁️ preview, 📷 camera)
- Removed redundant permission banner (browser handles natively)
- Redesigned RAG toggle to compact brain emoji (🧠) with memory count badge
- All UI changes preserve full functionality while reducing visual clutter

### Advanced Features Sprint
- **Object Recognition**: ✅ PRODUCTION-READY - TensorFlow.js COCO-SSD integration with 80-class detection, bounding boxes, confidence scores, FPS tracking, proper video scaling, RAG memory integration
- **Voice Commands**: ✅ PRODUCTION-READY - 20+ natural language commands with voice feedback for all actions (PersonI switching, camera, panels, volume, detection, notes, tasks, routines), routine name-to-ID lookup, error handling
- **Dual PersonI**: 🔧 IN PROGRESS - Backend integration complete (state management, handler methods), UI controls pending, conversation routing pending
- **Calendar**: Component built with month/week/day/agenda views and natural language parsing, Google Calendar backend integration pending
- **Bug Fixes**: Bounding box scaling, parameter propagation, primary persona restoration, voice command async routine lookup - all architect-reviewed and production-ready

### Dual PersonI Integration Status
- ✅ Imported dualPersonIManager and DualMode types
- ✅ Added state variables: dualModeActive, dualModeType, secondaryPersoni, showDualControls
- ✅ Implemented handler methods: handleToggleDualMode(), handleDualModeTypeChange(), handleSecondaryPersonISelect()
- ⏳ TODO: Add UI controls (toggle button, mode selector, secondary PersonI picker)
- ⏳ TODO: Modify conversation routing to use dualPersonIManager.getActivePersonI()
- ⏳ TODO: Implement turn switching after each AI response
- ⏳ TODO: Visual indicators for active speaker in dual mode