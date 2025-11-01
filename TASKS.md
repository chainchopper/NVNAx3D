# NIRVANA Development Tasks

## Critical Regressions (MUST FIX NOW)
- [ ] **App not listening to user input** - microphone/audio input broken
- [ ] **Webcam not working** - camera feed not displaying
- [ ] **Incoherent speech** - using preprogrammed responses instead of configured TTS endpoints
- [ ] **Voice consistency broken** - voices switching between PersonI instead of using configured voices
- [ ] **Spinning box on NIRVANA PersonI** - 3D visual bug persists
- [ ] **PersonI backgrounds too transparent** - 95% opacity makes spheres invisible, need balance with camera visibility

## UI/UX Fixes
- [x] Remove volume control (devices have this built-in)
- [ ] Fix keyboard input visibility on PersonI selection screen
- [ ] Restore proper PersonI 3D sphere visibility (not 5% opacity)
- [ ] Make camera feed work as background without breaking 3D visuals

## Core Features to Implement (from Pasted files)

### 1. Connector System Integration
- [ ] Implement actual OAuth flows for Google connectors (Gmail, Drive, Calendar, Docs, Sheets)
- [ ] Add GitHub connector with OAuth
- [ ] Add Twilio connector for SMS/voice (already has service, needs UI integration)
- [ ] Add YouTube connector
- [ ] Add Notion, Linear, Asana connectors
- [ ] Email service integration for routine automation
- [ ] Ensure connectors work as tools PersonI can actually use

### 2. Audio System Enhancements
- [ ] Shared microphone manager for STT, recording, reactive audio, voice commands
- [ ] Music detection and identification (like Soundhound)
- [ ] Display lyrics and album art during song playback
- [ ] Audio-reactive 3D visuals when music detected
- [ ] Fix echo cancellation so PersonI doesn't transcribe own voice

### 3. AI-Generated Idle Responses
- [ ] Replace preprogrammed idle prompts with dynamic AI-generated ones
- [ ] Use camera feed to generate context-aware observations
- [ ] Integrate with memory system for personalized idle speech

### 4. Camera & Environmental Awareness
- [ ] Fix camera feed as 3D background (currently broken)
- [ ] Environmental observer service with real-time object detection
- [ ] Vision-enhanced idle speech based on what PersonI sees
- [ ] File upload with RAG integration

### 5. Memory & RAG System
- [ ] Verify ChromaDB integration working (has localStorage fallback)
- [ ] Fix vector embeddings (embedding vs embeddings API inconsistency)
- [ ] Ensure 17 memory types work with semantic search
- [ ] Test temporal queries

### 6. Dual PersonI System
- [ ] Avatar mapping system with liquid-themed avatars
- [ ] Dual persona mode (primary + secondary collaboration)
- [ ] Persona routing based on capabilities
- [ ] Voice profiles per PersonI (ensure consistency)

### 7. Financial Features (BILLY PersonI)
- [ ] Market event monitoring for routine automation
- [ ] Trading integration (Coinbase)
- [ ] Plaid/Yodlee integration for real account data
- [ ] Portfolio analysis and budget tracking

### 8. Routine Automation
- [ ] Complete vision triggers (local TensorFlow, Frigate, CodeProjectAI, YOLO)
- [ ] Time-based triggers
- [ ] Event-driven triggers
- [ ] State monitoring triggers
- [ ] Email action integration

### 9. Provider System
- [ ] Fix provider verification logic (currently stubbed)
- [ ] Add Anthropic provider
- [ ] Add Cohere provider  
- [ ] Add local model support
- [ ] Ensure PersonI auto-update to use configured providers

### 10. Security & Infrastructure
- [ ] Verify encrypted vault functionality
- [ ] OAuth Vault V2 with PKCE + CSRF protection
- [ ] CSP hardening
- [ ] SonarQube CI integration (low priority)
- [ ] Helm chart for Kubernetes deployment (low priority)

### 11. Performance
- [ ] WebGPU migration from WebGL (user preference)
- [ ] Optimize 3D rendering

### 12. Documentation
- [ ] Keep replit.md updated with architecture changes
- [ ] Document connector usage
- [ ] Document PersonI creation/customization

## Recently Completed
- [x] OpenAI TTS integration via `/v1/audio/speech`
- [x] Multi-provider support (no longer locked to Gemini)
- [x] Google OAuth tokens optional for connectors
- [x] Dual PersonI voice consistency fix (claimed, needs verification)
- [x] Keyboard text input mode
- [x] UI controls refactored to separate component
- [x] Transcription log component created
- [x] Calendar system with natural language event creation
- [x] Chatterbox-TTS integration
- [x] Object detection overlay (TensorFlow.js COCO-SSD)
- [x] Voice command system
- [x] Local Whisper STT with IndexedDB caching

---
**Last Updated:** 2025-11-01
**Status:** Critical regressions blocking all functionality - prioritize fixes before new features
