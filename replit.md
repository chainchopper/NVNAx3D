# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system designed to provide highly customizable and engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a local-first, multi-provider platform, extensible with various external services, positioning itself as a versatile personal AI ecosystem with significant market potential.

## User Preferences
- **Graphics Preference**: WebGPU over WebGL (better performance)
- **Local-First**: Prefer on-device processing (Whisper for STT)
- **Flexibility**: Manual configuration of all endpoints and services
- **Not locked into Google's ecosystem**: Multi-provider support essential

## System Architecture

### Core Technologies
- **Framework**: Lit (Web Components)
- **Build Tool**: Vite
- **AI Provider**: Google Gemini API (@google/genai), with multi-provider support
- **3D Graphics**: Three.js (WebGL, planned WebGPU migration)
- **Language**: TypeScript
- **Backend**: Express.js (Node.js) for secure connector API proxy

### UI/UX Decisions
- **Minimalist Design Philosophy**: Clean, uncluttered interfaces.
- **Glass-morphism**: Consistent design across panels.
- **Intuitive settings**: Configuration for AI providers and PersonI capabilities.
- **Visual indicators**: Provider status, PersonI selection, detection stats.
- **Unique AI-generated avatars**: Liquid-themed avatars for each PersonI.
- **Comprehensive panels**: Notes, Tasks, Memory Management, User Profile.
- **Object Detection Overlay**: Green bounding boxes with class labels and confidence percentages.
- **Calendar Views**: Month, week, day, and agenda views with natural language quick-add.

### System Design Choices
- **PersonI System**: Defines AI personas with unique attributes, capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline), and a template system for custom creation. Includes a financial advisor PersonI, BILLY.
- **3D Visualization**: Animated 3D objects with dynamic backgrounds and audio-reactive visuals.
- **Connector Backend Proxy**: Secure Express.js server for external service integrations (e.g., Gmail, Google Calendar, GitHub, financial APIs), handling OAuth tokens.
- **Model Provider System**: Manages configuration and integration of multiple AI providers (OpenAI, Google, custom).
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model. Supports 17 memory types with semantic search and temporal queries.
- **Local Speech-to-Text (STT)**: Browser-based Whisper models (@xenova/transformers) with IndexedDB caching.
- **Enhanced Audio System**: SharedMicrophoneManager, audio recording, and real-time music detection.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation, including Camera-as-3D-Background, Vision-Enhanced Idle Speech, and an Environmental Observer Service. Features multi-format file upload with RAG integration.
- **Object Recognition System**: Real-time object detection using TensorFlow.js and COCO-SSD model (80 object classes).
- **Voice Command System**: Hands-free control with natural language commands for system functions.
- **Routine Automation System**: IF-THEN-THAT automation supporting time-based, event-driven, state monitoring, user actions, and vision detection triggers. Vision triggers support 'local' (TensorFlow.js), 'frigate', 'codeprojectai', and 'yolo' services.
- **Dual PersonI Manager**: Multi-AI collaboration system with four modes (collaborative, debate, teaching, single), managing turn-taking and conversation flow.
- **Calendar System**: Visual calendar component with natural language event creation and Google Calendar integration.
- **CSP Security Hardening**: Content Security Policy implemented.
- **Chatterbox-TTS Integration**: Custom TTS API support with configurable endpoint, voice synthesis, and voice cloning capabilities.
- **OAuth Security**: OAuth Vault V2 Backend for server-side token storage with PKCE + CSRF protection.

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

## Recent Development (November 1, 2025)
### Critical UX & Provider Flexibility Fixes
- **UI Controls Always Visible**: ✅ Removed opacity fade that was hiding controls - keyboard input, mic mute, and volume buttons now always accessible
- **Keyboard Text Input**: Text mode toggle button (⌨️) fully functional - click to type messages without using voice
- **Camera Toggle Fixed**: Camera button now properly requests permissions when clicked, not just on initial load
- **Multi-Provider Support**: ✅ System no longer forces Gemini provider - auto-updates PersonI to use first available model from any configured provider
  - Added `autoUpdatePersonIModels()` method that runs on startup
  - PersonI automatically adapt to OpenAI/Google/custom providers as configured
  - Clear provider status indicator (✓/⚠️) shows when models are missing
- **Mute Controls**: Mic mute button (🔇/🎤) and volume control (🔊) confirmed present and functional

### OpenAI TTS Integration (Earlier Nov 1)
- **Full OpenAI TTS Support**: ✅ PRODUCTION-READY via `/v1/audio/speech` endpoint
  - Supports all 6 OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
  - PersonI voiceName settings correctly applied for both Google and OpenAI providers
  - Added `generateSpeech()` method to OpenAIProvider class
  - Dual PersonI mode uses correct voice per slot (fixed critical bug)
- **Calendar Panel**: Added missing calendar-view component rendering with close event listener