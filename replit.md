# Nirvana - PersonI AI System

## Overview
Nirvana is an advanced AI companion system featuring multiple AI personas (PersonI - Personified Intelligence) with unique personalities, voices, and capabilities. The system integrates Google's Gemini AI for real-time audio interaction and immersive 3D visualizations. Its core purpose is to provide highly customizable and engaging AI companions, offering a modular and extensible platform for personalized AI experiences. The project aims to be local-first, multi-provider, and capable of integrating with various external services, positioning itself as a versatile personal AI ecosystem.

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

### Key Components
- **PersonI System**: Defines AI personas with unique personalities, voices, models, and visual styles. Each PersonI can have specific capabilities (vision, image generation, web search, tools, Multi-modal Conversational Pipeline - MCP). Includes a template system for custom PersonI creation.
- **3D Visualization**: WebGL-based animated 3D objects (Icosahedron, TorusKnot, Box) with texture mapping, idle animations, and audio-reactive visuals. PersonI have unique visual configurations and dynamic backgrounds.
- **Main Component**: Manages audio input/output, Gemini AI streaming, PersonI switching, and voice activity detection.
- **Connectors**: Extensible system for integrating external services like Google Drive, GitHub, and YouTube.
- **Model Provider System**: Allows configuration and integration of multiple AI providers (OpenAI, Google, custom endpoints like Ollama) and management of their respective models. PersonI can be assigned models from any verified provider.
- **Memory & RAG System**: Vector-based memory using ChromaDB (with localStorage fallback) and Gemini embedding model (text-embedding-004). Supports various memory types (conversations, notes, tasks) with semantic search, temporal queries, and speaker management.
- **User Profile System**: Stores user-specific information (name, pronouns, preferences) to provide context to PersonI.
- **Local Speech-to-Text (STT)**: Integration of browser-based Whisper models (@xenova/transformers) for on-device speech processing with IndexedDB caching and remote STT fallback.
- **Dynamic Backgrounds**: Persona-specific animated backgrounds (e.g., Game of Life for ADAM, Constellation map for ATHENA) with smooth transitions.
- **Enhanced Audio-Reactive Animations**: Dynamic visual feedback during listening and speaking modes, driven by audio frequencies and amplitude.
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
- **ChromaDB**: Planned for vector database integration in the RAG system.
- **raw.githubusercontent.com, HuggingFace CDN**: Allowed for content delivery.