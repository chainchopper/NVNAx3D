# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced, local-first AI companion system designed for highly customizable and engaging AI experiences through multiple AI personas (PersonI). It integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. The project aims to be a multi-provider platform, extensible with various external services, positioning itself as a versatile personal AI ecosystem with significant market potential. Key capabilities include multi-modal conversational pipelines, environmental awareness, object recognition, and routine automation.

## User Preferences
- **Graphics Preference**: WebGPU over WebGL (better performance)
- **Local-First**: Prefer on-device processing (Whisper for STT)
- **Flexibility**: Manual configuration of all endpoints and services
- **Not locked into Google's ecosystem**: Multi-provider support essential

## System Architecture

### UI/UX Decisions
- **Minimalist Design**: Clean, uncluttered interfaces with glass-morphism consistent across panels.
- **Intuitive Settings**: Configuration for AI providers and PersonI capabilities.
- **Visual Indicators**: Provider status, PersonI selection, detection stats.
- **Unique Avatars**: AI-generated liquid-themed avatars for each PersonI.
- **Comprehensive Panels**: Notes, Tasks, Memory Management, User Profile, and a Calendar with natural language quick-add.
- **Object Detection Overlay**: Green bounding boxes with class labels and confidence percentages.
- **Immersive Idle Mode**: UI elements fade out after 5 seconds of inactivity, leaving only the camera feed background and PersonI 3D visualization.
- **Fading UI Design**: Controls (carousel, input bar, settings) fade in/out with user interaction.
- **PersonI Carousel**: Allows switching between multiple PersonI.
- **Keyboard Text Input**: Permanently positioned below PersonI carousel with integrated file upload.

### System Design Choices
- **PersonI System**: Defines AI personas with unique attributes and capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline). Features a template system for custom creation and supports dedicated model assignments for conversation, vision, embedding, function calling, and TTS.
- **Multi-Model Architecture**: PersonI can be configured with specific models for different tasks, supporting various AI providers including local inference servers (LMStudio, vLLM, LocalAI).
- **3D Visualization**: Animated 3D objects with dynamic backgrounds and audio-reactive visuals.
- **Connector Backend Proxy**: Secure Express.js server for external service integrations (e.g., Gmail, Google Calendar, GitHub, financial APIs), handling OAuth tokens and securing API keys.
- **Model Provider System**: Manages configuration and integration of multiple AI providers (OpenAI, Google, custom).
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model, supporting 17 memory types with semantic search and temporal queries.
- **Local Speech-to-Text (STT)**: Browser-based Whisper models (@xenova/transformers) with IndexedDB caching.
- **Enhanced Audio System**: SharedMicrophoneManager, audio recording, and real-time music detection.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation, including Camera-as-3D-Background, Vision-Enhanced Idle Speech, and an Environmental Observer Service. Supports multi-format file upload with RAG integration.
- **Object Recognition System**: Real-time object detection using TensorFlow.js and COCO-SSD model.
- **Voice Command System**: Hands-free control with natural language commands.
- **Routine Automation System**: IF-THEN-THAT automation supporting time-based, event-driven, state monitoring, user actions, and vision detection triggers.
- **Dual PersonI Manager**: Multi-AI collaboration system with four modes (collaborative, debate, teaching, single).
- **Calendar System**: Visual component with natural language event creation and Google Calendar integration.
- **CSP Security Hardening**: Content Security Policy implemented.
- **Chatterbox-TTS Integration**: Custom TTS API support with configurable endpoint, voice synthesis, and voice cloning.
- **OAuth Security**: OAuth Vault V2 Backend for server-side token storage with PKCE + CSRF protection.
- **Always-Active PersonI System**: A PersonI is always active from app startup, defaulting to NIRVANA or the last used.
- **LLM-Generated Idle Speech**: All idle speech is now 100% LLM-generated, contextual, camera-aware, and avoids repetition.

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
- **ChromaDB**: Vector database for RAG.
- **Alpha Vantage API**: Real-time stock market data.
- **CoinGecko API**: Cryptocurrency market data.
- **Finnhub API**: Financial market news with sentiment analysis.
- **AudD API**: Song identification.
- **Genius API**: Song lyrics.
- **Plaid/Yodlee (planned)**: Financial transaction and account data.
- **LMStudio, vLLM, LocalAI**: For local AI model inference.

## Recent Development (November 1, 2025)
### Latest Fixes (Current Session - Part 8) - VERCEL BUILD & CAMERA PERSISTENCE
- **VERCEL BUILD OPTIMIZATION**: ✅ ARCHITECT-APPROVED (Production-ready deployment)
  - **Lazy Loading Implementation**: Removed static imports, converted to dynamic imports:
    - `reminder-manager`: Now lazy-loaded on firstUpdated() for notification system
    - `object-recognition`: Lazy-loaded only when object detection is enabled
    - Eliminates Vite dynamic import warnings completely
  - **Manual Code Splitting**: Optimized build with strategic chunking:
    - Before: 1 huge chunk (4,344 kB) causing 500 kB warnings
    - After: 11 optimized chunks with intelligent splitting:
      - `tensorflow.js` (1,863 kB) - Loads only for object detection
      - `transformers.js` (815 kB) - Loads only for Whisper STT
      - `three.js` (579 kB) - Loads for 3D visualization
      - `index.js` (589 kB) - Main app, reduced by 86%
      - `ai-providers.js`, `lit-framework.js` - Core dependencies
  - **Build Results**: Zero dynamic import warnings, optimized chunk sizes, Vercel-ready
- **CAMERA PERSISTENCE ACROSS SESSIONS**: ✅ ARCHITECT-APPROVED (Auto-initialization)
  - **Permissions API Integration**: Checks browser permission state on app startup
  - **localStorage State**: Saves camera enabled/disabled preference (nirvana-camera-enabled)
  - **Auto-Initialization Flow**:
    1. App checks permission state using `navigator.permissions.query()`
    2. Reads previous session state from localStorage
    3. Auto-requests camera stream if permission granted AND camera was enabled
    4. Automatically starts environmental observer if active PersonI has vision
  - **User Experience**: Camera "just works" across browser refreshes - no re-prompting needed
  - **Results**: Camera persists seamlessly, environmental observer auto-starts, zero LSP errors

### Latest Fixes (Current Session - Part 7) - MULTI-MODEL PERSONI & LOCAL AI SUPPORT
- **COMPLETE PERSONI MODEL CONFIGURATION**: ✅ ARCHITECT-APPROVED (Vision, Embed, TTS, Function-Calling models per PersonI)
  - **Multi-Model Architecture**: Enhanced PersonI configuration with dedicated model assignments for:
    - **Conversation Model**: Primary chat/thinking model (renamed from "thinking model")
    - **Vision Model**: Dedicated multimodal model (optional, falls back to conversation)
    - **Embedding Model**: RAG memory embeddings (optional, auto-detects from provider)
    - **Function Calling Model**: Tool/function execution (optional, uses conversation model)
    - **TTS Model**: Text-to-speech with full voice selection (Google voices, OpenAI voices, custom models)
  - **PersonI Edit UI**: Added comprehensive model configuration fields in PersonI editor:
    - Dropdowns for each model type populated from all configured providers
    - Voice selection with organized groups (Google/OpenAI/Custom)
    - Backward compatibility maintained with legacy thinkingModel field
  - **Local AI Support**: Full integration with LMStudio, vLLM, and LocalAI:
    - Custom endpoints show ALL models from `/v1/models` endpoint
    - Enhanced capability detection from model names (llava, pixtral, qwen, cogvlm, internvl for vision)
    - Function calling detection (mistral, llama-3, command, tools keywords)
    - Works with any OpenAI-compatible local inference server
  - **Environmental Observer Re-Enabled**: Observer now generates LLM-powered contextual speech:
    - Removed preset phrases, replaced with generateContextualSpeech() using active provider
    - Creates natural observations matching urgency/context (calm for general, alert for safety)
    - Integrates seamlessly with PersonI voice and RAG memory
  - **Backend Payload Fix**: Increased body-parser limit to 50MB for camera vision:
    - Fixes PayloadTooLargeError when sending base64-encoded camera frames
    - Supports large multimodal requests with images
  - **Results**: Complete multi-model PersonI system, local AI providers fully supported, environmental observer speaks naturally, zero LSP errors