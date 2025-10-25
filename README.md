# 🌌 NIRVANA - PersonI AI System

**Advanced multi-modal conversational AI interface with customizable PersonI entities**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Lit](https://img.shields.io/badge/Lit-3.0+-orange)](https://lit.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-Latest-green)](https://threejs.org/)

> View in AI Studio: https://ai.studio/apps/drive/1sFkOv5CZJYKFHCaC7T6iNLTF2zlIsoMF

---

## 🎯 Overview

NIRVANA is a real-time, multi-modal conversational AI platform featuring **PersonI** (Personified Intelligence) - customizable AI entities with unique personalities, voices, visual styles, and capabilities. Built with modern web technologies, NIRVANA provides an immersive 3D environment that reacts to conversations in real-time.

### Core Philosophy
- **Local-First**: On-device speech processing with Whisper
- **Multi-Provider**: Support for Google Gemini, OpenAI, Anthropic, xAI, Deepseek, and custom endpoints  
- **Privacy-Focused**: Your data stays with you
- **Extensible**: Plugin architecture for connectors and capabilities

---

## ✨ Key Features

### 🤖 Five Unique PersonI

1. **NIRVANA** 🌀 - *Your AI Orchestrator*
   - Specialty: General assistance, system coordination
   - Visual: Cyan/blue cosmic swirls, 24-hour color cycle
   - Voice: Balanced, welcoming

2. **ATHENA** 🦉 - *Muse for Wisdom & Creation*
   - Specialty: Creative direction, visual generation
   - Visual: Purple/orchid constellation map
   - Voice: Wise, contemplative

3. **ADAM** 💻 - *Your Development Partner*
   - Specialty: Coding, debugging, architecture
   - Visual: Green Matrix code (Conway's Game of Life)
   - Voice: Analytical, precise

4. **THEO** 🔧 - *Your AI Code Companion*
   - Specialty: Technical implementation, optimization
   - Visual: Orange lava with flowing code syntax
   - Voice: Technical, methodical

5. **GHOST** 👻 - *Your Guardian of Privacy*
   - Specialty: Privacy, security, stealth operations
   - Visual: Lavender static noise
   - Voice: Mysterious, protective

### 🎨 Immersive 3D Visualization

- **WebGL Rendering**: High-performance 3D graphics with Three.js
- **Dynamic Shapes**: Icosahedron, TorusKnot, Box geometries
- **PBR Materials**: Physically-based rendering with texture mapping
- **Transparency Effects**: Ethereal glass-like appearance (70-85% opacity)
- **Dramatic Idle Animations**:
  - Breathing effect (gentle scale pulse)
  - Floating motion (vertical sine wave)
  - Gentle rotation (multi-axis)
  - Energy pulse (emissive intensity)
- **Audio-Reactive**: FFT analysis (256 bins) drives real-time visual responses
- **500+ Particles**: Enhanced particle systems with color/size variation
- **Unique Backgrounds**: Each PersonI has a signature animated background

### 🧠 Advanced Memory & RAG System

- **Vector Memory**: ChromaDB integration with localStorage fallback
- **Semantic Search**: Gemini text-embedding-004 for intelligent retrieval
- **Memory Types**: Conversations, notes, tasks, reminders, preferences, facts
- **Speaker Management**: Track and tag different speakers
- **Contextual Retrieval**: Top 10 relevant memories (configurable)
- **Daily Grouping**: Timeline view of memory history

### 📝 Productivity Suite

**Notes System**:
- Full CRUD operations
- Importance ratings (1-10 scale, color-coded)
- Tag-based filtering
- Semantic search via RAG

**Task Management**:
- Priority levels (P1-P5, color-coded)
- Status tracking (todo, in_progress, done, cancelled)
- Due date tracking with overdue alerts
- Completion statistics dashboard

**Memory Browser**:
- Search across all memory types
- Type filters (conversations, notes, tasks, etc.)
- Delete individual memories
- Configurable RAG settings (threshold, max memories)

### 🎤 Speech & Audio

- **Local Whisper STT**: On-device speech-to-text (@xenova/transformers)
- **Browser Fallback**: SpeechRecognition API when Whisper unavailable
- **Multi-Provider TTS**: Gemini, OpenAI, or browser synthesis
- **Contextual Idle Speech**: LLM-generated observations based on RAG memory
  - Random intervals (2-5 minutes)
  - Context-aware comments
  - Remembers conversation history

### ⚙️ Multi-Provider AI Support

Supported Providers:
- ✅ Google Gemini (gemini-2.5-flash, gemini-2.5-pro)
- ✅ OpenAI (GPT-4, GPT-3.5-turbo)
- ✅ Anthropic (Claude models)
- ✅ xAI (Grok models)
- ✅ Deepseek
- ✅ Custom endpoints (Ollama, LMStudio, OpenAI-compatible)

Features:
- Real-time provider verification
- Per-PersonI model assignment
- Graceful fallback when providers unavailable
- Provider status indicator in UI

### 👤 User Profile System

- Personal information storage (name, pronouns, timezone)
- Custom context for AI awareness
- Preferences tracking
- Auto-injection into PersonI system prompts

---

## 🚀 Getting Started

### Prerequisites

```bash
Node.js 18+
npm package manager
```

### Installation

```bash
# Install dependencies
npm install

# Set GEMINI_API_KEY in .env.local (optional - multi-provider support available)
echo "GEMINI_API_KEY=your_key_here" > .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

### Configuration

1. **Add AI Provider Keys**:
   - Click Settings (gear icon, bottom right)
   - Select "Models"
   - Add your API keys for desired providers

2. **Select a PersonI**:
   - Choose from 5 default personas
   - Or create custom PersonI via "PersonI" panel

3. **Enable Features**:
   - Configure RAG memory settings in "Memory" panel
   - Create notes in "Notes" panel
   - Manage tasks in "Tasks" panel

---

## 🏗️ Architecture

### Technology Stack

- **Framework**: Lit (Web Components)
- **Build Tool**: Vite 6.2
- **3D Graphics**: Three.js + postprocessing
- **AI**: @google/genai, multi-provider support
- **Language**: TypeScript
- **Storage**: localStorage + ChromaDB (optional)
- **STT**: @xenova/transformers (Whisper)

### Project Structure

```
nirvana/
├── src/
│   ├── components/          # Lit components (panels, backgrounds)
│   ├── providers/           # AI provider integrations
│   ├── services/            # Core services (memory, profiles, etc.)
│   ├── types/               # TypeScript type definitions
│   ├── index.tsx            # Main application component
│   ├── visual-3d.ts         # 3D visualization engine
│   ├── personas.ts          # PersonI configurations
│   ├── analyser.ts          # Audio analysis utilities
│   └── utils.ts             # Helper functions
├── index.html               # Entry point
├── package.json             # Dependencies
└── vite.config.js           # Vite configuration
```

---

## 🎮 Usage

### Basic Conversation

1. Click the microphone button (or it auto-activates)
2. Speak your question or command
3. PersonI responds with voice and text
4. Visual 3D elements react to speech

### PersonI Switching

1. Open Settings → PersonI panel
2. Select a different PersonI
3. Current PersonI announces the handoff
4. New PersonI introduces themselves

### Notes & Tasks

**Creating a Note**:
1. Open Settings → Notes
2. Click "New Note"
3. Add title, content, tags, and importance
4. Note is searchable via RAG

**Creating a Task**:
1. Open Settings → Tasks
2. Click "New Task"
3. Set title, priority, due date, and status
4. Track progress with statistics

### Memory Management

1. Open Settings → Memory
2. **RAG Settings**:
   - Toggle enable/disable
   - Adjust similarity threshold (0.0-1.0)
   - Set max memories per query (1-50)
3. **Memory Browser**:
   - Search memories semantically
   - Filter by type
   - Delete individual memories

---

## 🔧 Configuration Options

### RAG Memory Configuration

```typescript
{
  enabled: true,              // Enable RAG system
  similarityThreshold: 0.6,   // Minimum similarity (0.0-1.0)
  maxMemories: 10            // Max memories per query
}
```

### Idle Speech Configuration

```typescript
{
  enabled: true,                  // Enable idle speech
  minIntervalMs: 120000,          // 2 minutes
  maxIntervalMs: 300000,          // 5 minutes
  memoriesToRetrieve: 8           // Memories for context
}
```

### PersonI Customization

Each PersonI can be customized with:
- Name, tagline, system instructions
- 3D shape (Icosahedron, TorusKnot, Box)
- Accent color
- Surface texture (lava, water, crystal, etc.)
- Idle animation (glow, particles, code, none)
- Assigned AI model and provider
- Enabled capabilities (vision, image gen, search, tools)

---

## 📊 Current Status

**Completion**: 39/60 core features (65%)

See [FEATURE_COMPARISON.md](FEATURE_COMPARISON.md) for detailed feature breakdown.

---

## 🛣️ Roadmap

### Phase 1: Core Enhancements (In Progress)
- ✅ Multi-provider support
- ✅ RAG memory system
- ✅ Notes & Tasks
- ✅ Idle speech

### Phase 2: Advanced Features
- 🔲 Dual PersonI loading (collaborate)
- 🔲 Voice profiling & speaker ID
- 🔲 Emotional tone analysis
- 🔲 Context window expansion
- 🔲 WebGPU migration

### Phase 3: Integrations
- 🔲 Gmail, Google Photos, Calendar
- 🔲 Music detection & lyrics
- 🔲 External connector framework
- 🔲 Custom TTS providers

### Phase 4: Platform Extensions
- 🔲 Tauri desktop app
- 🔲 Capacitor mobile app
- 🔲 Docker-orchestrated services
- 🔲 WebRTC swarm mode

---

## 🙏 Acknowledgments

- **Three.js** - 3D graphics library
- **Lit** - Web Components framework
- **Google Gemini** - AI capabilities
- **Hugging Face** - Whisper STT models
- **ChromaDB** - Vector database

---

**Built with ❤️ for the future of AI interaction**
