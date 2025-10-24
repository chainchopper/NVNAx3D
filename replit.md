# Nirvana - PersonI AI System

## Project Overview
Nirvana is an advanced AI companion system featuring multiple AI personas (PersonI - Personified Intelligence) with unique personalities, voices, and capabilities. The system uses Google's Gemini AI with real-time audio interaction and immersive 3D visualizations.

## Current Status (October 24, 2025)
- ✅ Basic setup complete and running on Replit
- ✅ Vite dev server configured for port 5000
- ✅ Five default PersonI: NIRVANA, ATHENA, ADAM, THEO, GHOST
- ✅ 3D visualization system using Three.js (WebGL)
- ✅ Connector system for external services (Google Drive, GitHub, YouTube)
- ✅ Models menu added to settings (configure AI providers)
- ✅ Provider management system (OpenAI, Google, xAI, Anthropic, Deepseek, Custom)
- ✅ Organized codebase structure with src/ directory
- 🚧 Provider verification and model fetching (in progress)

## Architecture

### Core Technologies
- **Framework**: Lit (Web Components)
- **Build Tool**: Vite 6.2
- **AI Provider**: Google Gemini API (@google/genai)
- **3D Graphics**: Three.js with postprocessing effects
- **Language**: TypeScript

### Key Components
1. **PersonI System** (`personas.ts`)
   - Defines AI personas with unique personalities, voices, and visual styles
   - Each PersonI has: name, tagline, system instructions, voice, model, connectors, visuals
   - Template system for creating custom PersonI instances

2. **3D Visualization** (`visual-3d.ts`)
   - WebGL-based animated 3D objects
   - Dynamic shapes (Icosahedron, TorusKnot, Box)
   - Texture mapping and idle animations
   - Audio-reactive visuals

3. **Main Component** (`index.tsx`)
   - Handles audio input/output
   - Manages Gemini AI streaming
   - Coordinates PersonI switching
   - Voice activity detection

4. **Connectors**
   - External service integrations (Google Drive, GitHub, YouTube)
   - Extensible function declaration system

## Planned Enhancements

### Phase 1: Model Provider System
- Create "Models" menu for configuring AI providers
- Support multiple providers: OpenAI, Google, xAI, Anthropic, Deepseek, Custom
- Allow manual endpoint configuration (Ollama, OpenAI-compatible APIs)
- Decouple PersonI from specific providers

### Phase 2: Local-First Architecture
- Switch from WebGL to WebGPU for better performance
- Implement local Whisper for Speech-to-Text (on-device)
- Add local storage/database options
- Configure TTS providers (default browser, Chatterbox-TTS-API, etc.)

### Phase 3: Enhanced PersonI System
- Unique avatar images for each PersonI (maintaining liquid animation theme)
- Dual PersonI loading for collaboration
- Voice profiling and speaker identification
- Extended capabilities configuration (vision, image generation, web search, tools, MCP)

### Phase 4: Memory & RAG System
- ChromaDB integration with local storage fallback
- Gemini embedding model (text-embedding-004)
- Memory types: conversations, notes, context
- Daily memory grouping and speaker tagging
- Time awareness and contextual notifications

### Phase 5: UI/UX Polish
- Remove unused "reset session" functionality
- Time announcements with contextual information
- Proactive meeting/reminder notifications
- Notes feature as a memory type
- Improved settings organization

## Development Notes

### Running Locally
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

### Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key (will be replaced with multi-provider system)

## User Preferences
- **Graphics Preference**: WebGPU over WebGL (better performance)
- **Local-First**: Prefer on-device processing (Whisper for STT)
- **Flexibility**: Manual configuration of all endpoints and services
- **Not locked into Google's ecosystem**: Multi-provider support essential

## Recent Changes
- **2025-10-24**: Initial Replit setup completed
  - Fixed index.html structure
  - Configured Vite for port 5000 with host allowance
  - Set up deployment configuration
  - Created project documentation
