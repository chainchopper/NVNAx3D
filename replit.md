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