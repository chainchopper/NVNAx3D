# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system featuring multiple AI personas (PersonI - Personified Intelligence) with unique personalities, voices, and capabilities. The system integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. Its core purpose is to provide highly customizable and engaging AI companions, offering a modular and extensible platform for personalized AI experiences. The project aims to be local-first, multi-provider, and capable of integrating with various external services, positioning itself as a versatile personal AI ecosystem.

## Recent Changes (October 30, 2025)

### Environmental Memory System ✅
- **Memory Types Expanded**: 8 → 16 memory types for comprehensive environmental data capture
- **New Types**: audio_recording, camera_observation, email_summary, call_log, text_message, agent_task, system_status, voice_clone
- **Audio Recording Manager**: Created service for storing/retrieving voice recordings with metadata
  - Automatic duration calculation
  - Type categorization (user_voice, ai_voice, environment, phone_call)
  - Full RAG memory integration for context-aware recall
  - Semantic search across all audio data

### Chatterbox-TTS Integration ✅
- **Custom TTS API Support**: Configurable endpoint and optional API key
- **Voice Synthesis**: Text-to-speech with 100-entry cache for performance
- **Voice Cloning**: Upload audio samples to create custom voices
  - FormData upload for voice samples
  - Automatic storage in RAG memory with high importance (5/10)
  - Voice management UI with real-time updates
- **Configuration UI**: Full settings panel (chatterbox-settings component)
  - Endpoint configuration
  - Voice selection dropdown
  - Voice cloning interface with file upload
  - Save/load from localStorage
- **Memory Integration**: All synthesized audio and voice clones stored automatically in RAG memory
- **Services Created**:
  - `src/services/chatterbox-tts.ts`: Main TTS service
  - `src/services/audio-recording-manager.ts`: Audio storage manager
  - `src/components/chatterbox-settings.ts`: Configuration UI

### 3D Avatar Animations Enhanced ✅
- **Hourly Time Indication**: Jiggle animation triggers on hour changes
- **Shader Uniforms**: Updated across all animation modes (idle, listening, speaking, music)
- **Multi-axis Wobble**: Idle animations with smooth geometry deformation
- **Fixed Missing Uniforms**: inputData uniform properly initialized

### Security & Configuration ✅
- **CORS/CSP Configurable**: Environment-based configuration
  - `.env` variables: CORS_ALLOWED_ORIGINS, CSP_DIRECTIVES
  - Development defaults: * (permissive for testing)
  - Production defaults: Specific origins for security
  - Server-side header injection with smart fallbacks
- **HTML Comments**: CSP directives documented in index.html

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
- **PersonI System**: Defines AI personas with unique personalities, voices, models, and visual styles. Each PersonI can have specific capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline - MCP). Includes a template system for custom PersonI creation.
- **3D Visualization**: WebGL-based animated 3D objects (Icosahedron, TorusKnot, Box) with texture mapping, idle animations, and audio-reactive visuals. PersonI have unique visual configurations and dynamic backgrounds.
- **Main Component**: Manages audio input/output, Gemini AI streaming, PersonI switching, and voice activity detection.
- **Connector Backend Proxy (Task 073)**: Secure backend server architecture for external service integrations. Features include:
  - Express.js backend server (`server.js`) running on port 3001
  - Handles OAuth tokens and API keys server-side (never exposed to browser)
  - REST endpoints for connectors: Gmail, Google Calendar, GitHub, Linear, Notion, Slack
  - Frontend calls backend proxy via Vite dev proxy (`/api/*` → `http://localhost:3001`)
  - Proper error handling with setup instructions when tokens are missing
  - Environment variables: GOOGLE_ACCESS_TOKEN, NOTION_TOKEN, LINEAR_API_KEY, SLACK_BOT_TOKEN, GITHUB_TOKEN
  - Security: NO sensitive credentials in browser, all API calls made server-side
- **Model Provider System**: Allows configuration and integration of multiple AI providers (OpenAI, Google, custom endpoints like Ollama) and management of their respective models. PersonI can be assigned models from any verified provider.
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model (text-embedding-004). Supports various memory types (conversations, notes, tasks) with semantic search, temporal queries, and speaker management.
- **User Profile System**: Stores user-specific information (name, pronouns, preferences) to provide context to PersonI.
- **Local Speech-to-Text (STT)**: Integration of browser-based Whisper models (@xenova/transformers) for on-device speech processing with IndexedDB caching and remote STT fallback.
- **Enhanced Audio Recording System**: EnhancedAudioRecorder class with SharedMicrophoneManager enabling multiple concurrent audio consumers (STT, music detection, voice commands, reactive 3D) sharing a single microphone device. Features include configurable buffer sizes, multiple export formats (Blob WAV, AudioBuffer, raw PCM), VAD integration, and real-time audio analysis with event-driven architecture.
- **Music Detection System**: Real-time music vs speech classification using frequency distribution analysis (7 bands), temporal pattern recognition, spectral complexity measurement, and beat detection. Provides BPM estimation, automatic idle speech muting during music playback, and dramatic beat-synchronized 3D visual reactions with enhanced lighting and color shifting.
- **Song Identification System (Task 069)**: Soundhound-style song recognition with lyrics and album art. Features include:
  - Audio fingerprinting and song identification via AudD API (ACRCloud support planned)
  - Automatic capture after 7s of music detection using SharedMicrophoneManager
  - Fetches song metadata: title, artist, album, year, genre, album art
  - Lyrics fetching from Genius API with synchronized display support
  - Glass-morphism UI bubble displaying album art, song info, and scrolling lyrics
  - PersonI commentary generation using RAG memory to recognize previously heard songs
  - Stores identified songs in RAG memory with 'song_identification' type for future context
  - Configurable delay, API provider selection, and PersonI commentary toggle
- **Dynamic Backgrounds**: Persona-specific animated backgrounds (e.g., Game of Life for ADAM, Constellation map for ATHENA) with smooth transitions.
- **Enhanced Audio-Reactive Animations**: Dynamic visual feedback during listening and speaking modes, driven by audio frequencies and amplitude. Music mode features dramatic reactions with beat synchronization, full-spectrum frequency response, and multi-axis rotation.
- **Environmental Awareness Suite**: Real-time camera-based contextual observation and intelligent assistance system. Features include:
  - **Camera Manager Component**: Handles camera permissions, streaming, and frame capture with configurable quality/intervals
  - **Camera-as-3D-Background**: Live camera feed rendered as textured background plane behind 3D orb visualization
  - **Vision-Enhanced Idle Speech**: AI generates contextual idle prompts by analyzing live camera frames with multimodal vision models
  - **Environmental Observer Service**: Continuous monitoring system that captures frames at configurable intervals, analyzes environment using vision AI, stores observations in RAG memory, creates contextual notes, and triggers proactive assistance based on detected events (package delivery, safety concerns, user emotions, etc.)
  - **Reminders System**: Natural language reminder management with browser notifications, RAG memory storage, and AI function calling integration (set/list/complete/delete)
  - **Keyboard Input Mode**: Toggle between voice and text input with mode-aware UI controls
  - **Multimodal Provider Support**: BaseProvider and GoogleProvider updated to support ContentPart interface for text + inline image data in vision API calls
  - Integrated into main component (index.tsx) with event handlers, reminder function routing, and camera permission management
- **CSP Security Hardening**: Implemented Content Security Policy to allow necessary external resources while blocking unsafe-eval.

### UI/UX Decisions
- Intuitive settings for AI providers and PersonI capabilities.
- Visual indicators for provider status and PersonI selection.
- Unique AI-generated liquid-themed avatars for each PersonI.
- Comprehensive panels for Notes, Tasks, and Memory Management with semantic search, filtering, and visual cues (e.g., color-coded importance for notes, priority for tasks).
- User profile panel for personal data management.

## External Dependencies
- **Google Gemini API**: Primary AI provider for conversational AI and embeddings.
- **Three.js**: JavaScript 3D library for rendering PersonI visualizations.
- **Lit**: Web Components library for UI development.
- **Vite**: Build tool.
- **@google/genai**: Google Gemini API client library.
- **@xenova/transformers**: Used for local Whisper STT integration.
- **Express**: Backend server for secure connector API proxy.
- **CORS**: Cross-origin resource sharing for backend API.
- **ChromaDB**: Planned for vector database integration in the RAG system.
- **raw.githubusercontent.com, HuggingFace CDN**: Allowed for content delivery.