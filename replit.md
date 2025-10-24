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
- ✅ Provider management system (OpenAI, Google)
- ✅ Real API verification and model fetching from providers
- ✅ Provider-PersonI integration (assign models from verified providers)
- ✅ PersonI capabilities configuration (vision, image gen, web search, tools, MCP)
- ✅ Organized codebase structure with src/ directory
- ✅ App loads without requiring API keys (graceful fallback)

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
- **2025-10-24 (Session 6)**: Visual Enhancements & Custom Endpoint Fix
  - ✅ **Custom Endpoint Provider Fix** - OpenAI-compatible endpoints fully supported
    - Fixed model filtering to allow non-GPT models on custom endpoints
    - Added `providerId` and `providerType` tracking to ProviderConfig
    - Custom endpoints (LMstudio, Ollama, etc.) now properly show "configured" status
    - All models from custom endpoints are available for PersonI assignment
  - ✅ **Glow Idle Animation Improvements** - Smooth, glitch-free visuals
    - Decoupled point light intensity from emissive glow to prevent conflicts
    - Added smooth exponential interpolation (lerp) to prevent flickering
    - Reduced pulse amplitude and timing for gentler breathing effect
    - All transitions use smooth damping (0.05-0.2 lerp factors)
  - ✅ **Audio-Reactive Animations** - Dynamic visual feedback
    - **Listening Mode**: Green glow (#00ff00) when voice detected, intensity pulses with audio level
    - **Speaking Mode**: Dynamic geometry animations driven by audio frequencies
      - Twist: rotation based on mid-frequencies
      - Shake: position jitter based on bass frequencies
      - Scale pulse: 0-15% scaling based on amplitude
      - Shader integration passes frequency data to vertex shader
    - Smooth reset to neutral state when audio activity stops
  - ✅ **ADAM Matrix Code Redesign** - Authentic cyberpunk aesthetic
    - Digital rain with authentic Matrix characters (including Katakana: ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ)
    - 15 vertical code streams with random speeds and positions
    - Fade trail effect (brightness decreases down each stream)
    - Character mutation (2% chance per frame for dynamic feel)
    - Green gradient coloring (RGB 0-255 based on brightness)
    - 512x512 canvas texture updated every frame as emissive map
  
- **2025-10-24 (Session 5)**: Local Whisper STT Integration
  - ✅ **Browser-Based Speech Recognition** - No server required, runs 100% locally
    - Integrated @xenova/transformers with Whisper models (tiny.en, base, small)
    - Lazy loading with progress indicators during model download
    - IndexedDB caching for offline use after first load
    - Toggle enable/disable in Settings → Models → Speech-to-Text
    - Model size selection (75MB-466MB) with performance trade-offs
    - Disabled by default to prevent CDN/CORS issues, users opt-in when needed
  - ✅ **Remote STT Fallback** - Seamless provider integration
    - Falls back to Google Gemini or configured provider STT when local Whisper disabled
    - AudioContext lifecycle properly managed (prevents browser quota exhaustion)
    - Unified transcription pipeline regardless of STT source
  - ✅ **3D Visualization Fixes** - Removed spinning transparent backdrop plane
    - Cleaned up scene artifacts and visual glitches
    - Scene now only contains central PersonI object, lights, and particles
  
- **2025-10-24 (Session 4)**: Provider Runtime Integration & Visual Polish
  - ✅ **MAJOR**: PersonI now actually use their assigned providers for inference
    - Added provider instance caching with proper invalidation on config changes
    - Google providers use full STT/LLM/TTS pipeline
    - OpenAI/custom providers use text generation with graceful STT/TTS fallback
    - Provider instances reused efficiently, no expensive re-initialization
  - ✅ Visual improvements and user guidance
    - Onboarding message: "Welcome! Configure your AI providers..."
    - Provider status indicator (⚠️ warning / ✓ configured) near settings
    - User-friendly error messages with actionable guidance
    - Loading states throughout the app
  - ✅ **Avatar System** - Unique AI-generated avatars for each PersonI
    - 5 beautiful liquid-themed avatars matching each PersonI's personality
    - NIRVANA: Cyan/blue cosmic swirls, ATHENA: Purple/gold patterns
    - ADAM: Green tech matrix, THEO: Orange geometric, GHOST: Dark stealth
    - Circular avatar display in PersonI selection cards
  - ✅ **3D Visualization Fixes** - Fixed all graphical glitches and artifacts
    - Reduced god rays artifacts (samples 60→30, density 0.9→0.6)
    - Smoother lighting transitions (point lights slowed 50%, intensity reduced 50%)
    - Fixed material conflicts (transmission 1.0→0.3, proper state cleanup)
    - Improved SSAO quality (reduced halos/noise)
    - Fixed metallic surfaces (balanced metalness/roughness)
  - ✅ **Liquid Textures with PBR** - Integrated high-quality liquid materials
    - Water caustics with transmission and thickness
    - Lava with PBR maps (glossiness + specular for realistic flow)
    - Slime bubbles with translucency and glow
    - New textures available for PersonI customization
  - ✅ Fixed Vite configuration for Replit's dynamic hostnames
  - ✅ Production-ready provider system with architect approval
  
- **2025-10-24 (Session 3)**: Phase 1 Complete - Provider System & Capabilities
  - ✅ Completed full provider management system with real API verification
  - ✅ PersonI can now use models from any verified provider
  - ✅ Added comprehensive capabilities configuration (Vision 👁️, Image Gen 🎨, Web Search 🌐, Tools 🔧, MCP 🔌)
  - ✅ Automatic capability initialization for all PersonI (new and existing)
  - ✅ Model dropdown shows available models with capability icons
  - ✅ Graceful fallback when no providers configured with helpful user guidance
  - ✅ Fixed app loading issues (removed process.env, added proper env handling)
  - ✅ Added null checks for client operations throughout the app
  
- **2025-10-24 (Session 1)**: Initial Replit setup completed
  - Fixed index.html structure
  - Configured Vite for port 5000 with host allowance
  - Set up deployment configuration
  - Created project documentation
  - Built Models provider management system
