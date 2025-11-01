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
### Latest Fixes (Current Session - Part 6) - IDLE SPEECH SYSTEM REFACTOR
- **100% LLM-GENERATED IDLE SPEECH**: ✅ ARCHITECT-APPROVED (No more preset prompts anywhere)
  - **Issue**: System had three conflicting idle speech systems (legacy preset prompts in index.tsx, environmental observer presets, idle-speech-manager)
  - **Legacy System Removed**: Deleted triggerIdlePrompt() and resetIdlePromptTimer() from index.tsx - no more hardcoded idle phrases
  - **Environmental Observer Speech Disabled**: Commented out preset speech generation - observer now only stores data
  - **Smart Contextual Generation**: Enhanced idle-speech-manager.ts with:
    - **User Profile Integration**: Uses actual user name from user-profile-manager (e.g., "Hey Sarah, it's nearly 5:30 PM...")
    - **Real-Time Clock**: Includes formatted current time in prompts (e.g., "It's 5:28 PM" in eastern time)
    - **Camera Change Detection**: SHA-256 hash comparison of camera frames - skips idle speech if camera feed unchanged (prevents repetitive comments about static scenes)
    - **Repeat Prevention**: Stores last 10 idle speeches, calculates 80% word similarity threshold, rejects similar responses
    - **Explicit Anti-Generic Rules**: System prompt forbids phrases like "is there anything I can help you with?" or "how can I assist you?"
  - **Single Source of Truth**: IdleSpeechManager is now the ONLY system generating idle responses - zero preset fallbacks
  - **Dual Return Type Support**: Fixed environmental-observer.ts and idle-speech-manager.ts to handle both string and {text, functionCalls} responses
  - **Results**: Every idle comment is unique, contextual, camera-aware, never repeats, uses user's name and current time, zero LSP errors

### Latest Fixes (Current Session - Part 5) - COMPLETE UI FADING SYSTEM
- **IMMERSIVE IDLE MODE**: ✅ ARCHITECT-APPROVED (Complete UI fade after 5 seconds of inactivity)
  - **Issue**: UI elements remained visible during idle periods, cluttering the immersive experience
  - **Complete Fade Implementation**: ALL UI elements now fade to opacity 0 after 5 seconds without mouse/touch interaction
  - **Elements That Fade**: PersonI carousel, text input bar, ui-controls wrapper, settings FAB, status text, financial dashboard toggle (BILLY only)
  - **What Remains Visible**: Only camera feed background (if enabled) and PersonI 3D visualization
  - **Pointer Events Management**: All faded UI sets pointer-events: none to prevent ghost interactions
  - **CSS Pattern**: .visible class controls opacity (0→1) with 0.5s ease-in-out transition for smooth fading
  - **Activity Detection**: handleUserActivity() sets 5-second timeout, resets on any mouse/touch event
  - **LLM-Generated Idle Speech**: Confirmed idle responses use active PersonI's provider via idle-speech-manager.ts (contextual, memory-aware, camera-vision-enhanced)
  - **Results**: Clean immersive experience - UI completely disappears during idle periods, instantly reappears on interaction

### Latest Fixes (Current Session - Part 4) - CRITICAL BUG FIXES
- **TEXT INPUT & FUNCTION CALL RESTORATION**: ✅ ARCHITECT-APPROVED (Complete system restoration after security refactor)
  - **Issue**: Text input not working - no LLM requests/responses after security refactor broke GoogleProvider
  - **Multi-Model PersonI Architecture**: Added PersoniModels interface supporting capability-specific model assignments (conversation, vision, embedding, functionCalling, imageGeneration, objectDetection, textToSpeech)
  - **getPersoniModel() Helper**: Backward-compatible model lookup system - tries models structure first, falls back to thinkingModel
  - **Backend Proxy Enhanced**: `/api/gemini/chat` now accepts systemInstruction and tools, returns both text and functionCalls
  - **GoogleProvider Fixed**: Filters system messages from contents, extracts systemInstruction, sends to backend properly, returns dual type (string | {text, functionCalls})
  - **processTranscript Updated**: Handles dual return type, processes functionCalls array to restore connector/tool execution
  - **BaseProvider Interface**: Updated sendMessage signature to support systemInstruction option and dual return type
  - **Duplicate UI Removed**: Removed standalone file-upload component obstructing other UI elements
  - **Results**: Text input working end-to-end, system prompts properly sent to Gemini, function calls execute correctly, zero LSP errors, clean browser console

### Latest Fixes (Current Session - Part 3)
- **SECURITY ARCHITECTURE - API Key Protection**: ✅ CRITICAL SECURITY FIX (Architect-Approved)
  - **Backend Gemini Proxy Endpoints**: Created `/api/gemini/chat` and `/api/gemini/embeddings` endpoints in server.js
  - **Zero Browser Exposure**: GEMINI_API_KEY now stored exclusively in backend environment (process.env), never exposed to browser
  - **Relative URL Architecture**: All backend calls use relative URLs (`/api/*`) leveraging Vite proxy configuration (works in all environments)
  - **GoogleProvider Secured**: Removed direct `@google/genai` client in browser, replaced with backend fetch calls
  - **EmbeddingGenerator Secured**: Removed direct API key usage, now proxies through backend
  - **Provider-Manager Fixed**: Updated all backend URL constructions to use relative URLs
  - **Environment Variables**: Backend requires `GEMINI_API_KEY` environment variable for Gemini API operations
  - **Results**: Browser console completely clean, no API key exposure, full end-to-end functionality preserved

### Latest Fixes (Current Session - Part 2)
- **Always-Active PersonI System**: ✅ CRITICAL ARCHITECTURAL FIX
  - PersonI is now **always active** from app startup (requirement: app does nothing without PersonI)
  - Auto-selects default PersonI on initialization (NIRVANA or last used)
  - Persists last active PersonI to localStorage for session continuity
  - Removed all conditional checks that assumed PersonI could be inactive
- **Text Input + File Upload UI**: ✅ Fixed placement and UX
  - Text input and file upload now **permanently positioned below PersonI carousel**
  - Both components fade in/out with carousel (clean fading UI design maintained)
  - Replaced modal overlay approach with inline, always-accessible input bar
  - File upload button integrated directly into input bar alongside text field
  - Enter key submits text input (no modifier keys needed)

### Latest Fixes (Current Session - Part 1)
- **PersonI Backgrounds Disabled**: ✅ All PersonI 3D sphere backgrounds temporarily disabled (5% opacity, 95% transparency) so camera feed is clearly visible
- **Google OAuth Token Optional**: ✅ Google connector access tokens now optional when using "Connect with Google" OAuth button - no manual token entry required

### Critical UX & Provider Flexibility Fixes
- **Fading UI Design**: Clean interface where controls (carousel, input bar, settings) fade out when user hasn't interacted with screen
- **PersonI Carousel**: Major feature - always fades in on mouse movement, allows switching between 6 PersonI (NIRVANA, ATHENA, ADAM, THEO, GHOST, BILLY)
- **Keyboard Text Input**: Text input bar with file upload below carousel - respects fading design
- **Camera Toggle Fixed**: Camera button now properly requests permissions when clicked, not just on initial load
- **Multi-Provider Support**: ✅ System no longer forces Gemini provider - auto-updates PersonI to use first available model from any configured provider
  - Added `autoUpdatePersonIModels()` method that runs on startup
  - PersonI automatically adapt to OpenAI/Google/custom providers as configured
  - Clear provider status indicator (✓/⚠️) shows when models are missing
- **Mute Controls**: Mic mute button (🔇/🎤) confirmed present and functional in ui-controls component

### OpenAI TTS Integration (Earlier Nov 1)
- **Full OpenAI TTS Support**: ✅ PRODUCTION-READY via `/v1/audio/speech` endpoint
  - Supports all 6 OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
  - PersonI voiceName settings correctly applied for both Google and OpenAI providers
  - Added `generateSpeech()` method to OpenAIProvider class
  - Dual PersonI mode uses correct voice per slot (fixed critical bug)
- **Calendar Panel**: Added missing calendar-view component rendering with close event listener