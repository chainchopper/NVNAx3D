# Nirvana PersonI AI - Enhancement Roadmap

## 🔴 Immediate Fixes (This Week)

### 1. Vision AI Icon Click Issue
**Status**: In Progress  
**Priority**: CRITICAL  
**Problem**: Vision AI icon in circular menu wheel may not respond to clicks due to z-index/pointer-events conflicts  
**Solution**:
- Increase circular-menu-wheel z-index from 170 to 250
- Ensure menu-item z-index stays relative (local z-context)
- Add pointer-events: none to settings-dock overlay when not visible
- Test click handling across all screen sizes

**Files to Modify**:
- `src/components/visualizer/circular-menu-wheel.ts`
- `src/components/visualizer/settings-dock.ts`

---

### 2. Model Assignment Editability
**Status**: Pending  
**Priority**: HIGH  
**Problem**: Users need clear indication that auto-assigned models are fully editable  
**Solution**:
- Add visual indicator (🤖 icon) next to auto-assigned models in PersonI Settings
- Add "Auto-assigned" badge with edit button
- Include tooltip: "Click to change model - full customization available"
- Add model source metadata (auto-assigned vs. manually selected)

**Files to Modify**:
- `src/components/personi-settings-panel.ts`
- `src/services/provider-manager.ts` (add assignment metadata)

---

## 🟡 Short-Term Enhancements (1-2 Weeks)

### 3. Voice Profiling & Speaker Diarization
**Priority**: HIGH  
**Status**: Design Phase

**Architecture**:
```
┌─────────────────────────────────────────┐
│    Audio Stream (Microphone)            │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  Voice Activity Detection (VAD)         │
│  - Silero VAD or WebRTC VAD             │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  Speaker Diarization Engine              │
│  - Option 1: WebAssembly port of        │
│    pyannote-audio (if available)        │
│  - Option 2: Cloud API (Azure Speaker   │
│    Recognition, AWS Transcribe)         │
│  - Option 3: Local ML model via ONNX    │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  Voice Embedding Generator               │
│  - ECAPA-TDNN or SpeakerNet             │
│  - Extract 192-512 dim embeddings       │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  Voice Profile Database                  │
│  - IndexedDB storage                    │
│  - Schema: {                            │
│     id, name, embedding, encounters,    │
│     lastSeen, metadata                  │
│   }                                     │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  Speaker Identification                  │
│  - Cosine similarity matching           │
│  - Threshold-based recognition          │
│  - Unknown speaker tagging              │
└──────────────┬──────────────────────────┘
               ▼
┌─────────────────────────────────────────┐
│  Context-Aware Conversation              │
│  - "What did Sarah say yesterday?"      │
│  - Per-speaker memory queries           │
│  - Emotional tone analysis              │
└─────────────────────────────────────────┘
```

**Features**:
- Real-time speaker identification during conversations
- Voice profile enrichment (name, relationship, characteristics)
- Voice-driven memory queries: "What did Doug tell me yesterday?"
- Emotional tone analysis (valence & arousal from voice)
- Multi-speaker conversation transcription
- "Sounds like" voice matching feature

**Implementation Phases**:
1. **Phase 1 (Week 1)**: VAD integration + audio segmentation
2. **Phase 2 (Week 2)**: Voice embedding generation (ONNX model)
3. **Phase 3 (Week 3)**: Profile database + basic identification
4. **Phase 4 (Week 4)**: UI for profile management + voice queries

**Dependencies**:
- `@xenova/transformers` (already installed) - for local ML models
- `onnxruntime-web` - for voice embedding models
- New service: `VoiceProfiling Service`
- New RAG memory type: `voice_encounter`

---

### 4. Enhanced Model Customization UI
**Priority**: MEDIUM  
**Status**: Pending

**Features**:
- Model comparison view (side-by-side provider models)
- Per-capability model overrides
- Model performance metrics (latency, cost estimates)
- Favorite models quick-select
- Model compatibility warnings

---

## 🟢 Medium-Term Enhancements (1-2 Months)

### 5. Missing External Connectors
**Priority**: MEDIUM  

**Tier 1 - Communication (Weeks 5-6)**:
- ✅ Twilio (SMS, Voice) - Already implemented
- ✅ Gmail - Already implemented
- 🔲 SMTP (generic email sending)
- 🔲 Telegram Bot API
- 🔲 Discord Webhooks
- 🔲 WhatsApp Business API (limited)

**Tier 2 - Productivity (Weeks 7-8)**:
- 🔲 Todoist - Task management
- 🔲 Trello - Kanban boards
- 🔲 Notion - Notes and databases
- 🔲 Slack - Team messaging

**Tier 3 - Cloud Storage (Weeks 9-10)**:
- 🔲 Dropbox
- 🔲 OneDrive
- 🔲 Google Drive (expand current integration)
- 🔲 iCloud Drive

**Tier 4 - Social (Weeks 11-12)**:
- 🔲 Twitter/X API
- 🔲 LinkedIn API
- 🔲 Facebook Graph API
- 🔲 Instagram Basic Display API

**Tier 5 - System Access (Week 13)**:
- 🔲 SSH - Secure shell access
- 🔲 FTP/SFTP - File transfer

**Implementation Pattern** (for each connector):
```typescript
// src/services/connectors/[connector-name]-connector.ts
export class [ConnectorName]Connector {
  async authenticate(): Promise<void>
  async testConnection(): Promise<boolean>
  async [primaryAction](...): Promise<Result>
}
```

---

### 6. Plugin Card System
**Priority**: MEDIUM  
**Status**: Design Phase

**`.nirvana-card` Format**:
```json
{
  "version": "1.0.0",
  "metadata": {
    "id": "plugin-unique-id",
    "name": "Plugin Name",
    "description": "What this plugin does",
    "author": "Author Name",
    "version": "1.0.0",
    "tags": ["category", "feature"],
    "icon": "data:image/svg+xml;base64,...",
    "screenshots": ["data:image/..."],
    "homepage": "https://..."
  },
  "plugin": {
    "entrypoint": "main.js",
    "source": "// Base64 encoded JS bundle",
    "styles": "// Base64 encoded CSS",
    "manifest": {
      "permissions": ["storage", "network"],
      "apis": ["conversation", "memory", "rag"],
      "hooks": ["onLoad", "onMessage", "onPersoniChange"]
    }
  },
  "dependencies": {
    "nirvana-api": "^1.0.0",
    "other-plugin-id": "^1.2.0"
  },
  "signature": "cryptographic signature for verification"
}
```

**Features**:
- Export installed plugins to `.nirvana-card` files
- Import plugins via drag-and-drop or file picker
- Plugin marketplace/gallery system
- Versioning and automatic updates
- Dependency resolution
- Enhanced sandboxing (iframe + postMessage)
- Plugin API for third-party developers

**UI Components**:
- Plugin export wizard
- Plugin import validator
- Marketplace browser (curated + community)
- Plugin developer tools panel

---

### 7. Advanced MCP Enhancements
**Priority**: MEDIUM  
**Status**: Planning

**Features**:
- MCP server clustering for distributed execution
- MCP tool versioning and dependency resolution
- Cross-PersonI tool sharing and discovery
- MCP tool marketplace integration
- Advanced agent state persistence
- Agent collaboration protocols expansion

**Architecture**:
```
┌─────────────────────────────────┐
│   MCP Cluster Manager            │
│   - Load balancing              │
│   - Health monitoring           │
│   - Auto-scaling                │
└──────────┬──────────────────────┘
           ▼
┌─────────────────────────────────┐
│   MCP Tool Registry              │
│   - Version management          │
│   - Dependency resolution       │
│   - Capability indexing         │
└──────────┬──────────────────────┘
           ▼
┌─────────────────────────────────┐
│   MCP Marketplace                │
│   - Curated tools               │
│   - Community submissions       │
│   - Ratings & reviews           │
└─────────────────────────────────┘
```

---

## 🔵 Long-Term Vision (3-6 Months)

### 8. Smart Home Integration (Home Assistant Inspired)
**Priority**: MEDIUM-LOW  
**Status**: Research Phase

**Inspired Features** (from user's example):
- Vehicle integration (API-based, not JLR-specific)
  - Remote lock/unlock
  - Remote start/stop
  - Climate control
  - Honk & blink
- TV control (universal protocol support)
  - LG WebOS
  - Roku
  - Samsung Tizen
  - Android TV
  - Apple TV (HomeKit)
- Security & Monitoring
  - Face detection (already have COCO-SSD)
  - Intruder alerts (email + SMS already possible)
  - Audio recognition / unusual sound detection
  - Camera motion detection

**Architecture**:
```
┌────────────────────────────────────────┐
│    Smart Home Hub Service               │
│    - Device discovery                  │
│    - Protocol adapters                 │
│    - State management                  │
└──────────────┬─────────────────────────┘
               ▼
      ┌────────┴────────┐
      ▼                 ▼
┌──────────┐    ┌──────────────┐
│ Vehicle   │    │ Entertainment│
│ Connector │    │  Connector   │
└──────────┘    └──────────────┘
      ▼                 ▼
┌──────────┐    ┌──────────────┐
│ Climate   │    │   Security   │
│ Control   │    │   Monitor    │
└──────────┘    └──────────────┘
```

**Implementation Approach**:
- Generic device abstraction layer
- Plugin-based protocol adapters
- Voice-controlled automation
- Scene management ("movie mode", "leaving home")
- Integration with Routine system

---

### 9. Advanced AI Capabilities

**Context Window Expansion**:
- Sliding window summarization
- Hierarchical memory compression
- Multi-model memory routing

**"Thinking Mode"**:
- Extended reasoning chains
- Internal monologue visualization
- Chain-of-thought debugging

**Podcast-Style Conversations**:
- Natural back-and-forth between PersonI
- Topic-driven discussions
- Debate mode with opposing viewpoints
- Educational dialogues

**Memory Enhancements**:
- Memory summarization system
- Compress old memories automatically
- Importance scoring and prioritization

---

### 10. Visual Enhancements

**WebGPU Migration**:
- Migrate from WebGL to WebGPU for 3D rendering
- Better performance on modern browsers
- Advanced shader capabilities

**Advanced Post-Processing**:
- Bloom, depth of field, motion blur
- Customizable visual effects per PersonI

**Dynamic Avatar Textures**:
- Google Photos slideshow integration
- Live camera feed as texture
- Procedural shader effects
- Custom shader library

---

### 11. Platform Extensions

**Native Desktop App** (Tauri):
- Better system integration
- File system access
- Native notifications
- Background services

**Native Mobile App** (Capacitor):
- iOS and Android support
- Camera and sensors access
- Push notifications
- Offline mode

**WebRTC Swarm Mode**:
- Distributed coordination
- Peer-to-peer collaboration
- Multi-user sessions

**Production Hardening**:
- PostgreSQL for production data
- SQLite for local-first storage
- Full system backup/restore
- Migration tools
- Enhanced CSP with nonces/hashes

---

### 12. Database & Storage

**PostgreSQL Integration**:
- Production-ready relational database
- Advanced queries and joins
- Transaction support

**SQLite Local-First**:
- Embedded database for offline mode
- Fast local queries
- Sync to cloud when online

**Voice Profile Database**:
- Dedicated voice embedding storage
- Fast similarity search
- Speaker diarization history

**Export/Import**:
- Full system state export
- Selective data export (PersonI, memories, settings)
- Cross-device sync

---

## Implementation Priorities

### This Week:
1. ✅ Fix Vision AI icon click issue
2. ✅ Ensure model editability UI clarity
3. Start voice profiling architecture

### Next 2 Weeks:
1. Voice profiling Phase 1-2 (VAD + embeddings)
2. Enhanced model customization UI
3. Begin Tier 1 connectors (SMTP, Telegram, Discord)

### Month 2:
1. Voice profiling Phase 3-4 (profiles + UI)
2. Plugin card system implementation
3. Complete Tier 1-2 connectors
4. MCP enhancements begin

### Month 3-6:
1. Smart home integration
2. Advanced AI capabilities
3. Visual enhancements (WebGPU)
4. Native app development (Tauri/Capacitor)
5. Production database migration

---

## Success Metrics

**User Experience**:
- Zero-friction model configuration
- Sub-second UI response times
- Intuitive voice profiling
- Rich plugin ecosystem

**Technical Excellence**:
- >95% test coverage for new features
- <100ms average API response time
- Scalable architecture for 10K+ users
- Portable across platforms

**Community Growth**:
- 50+ community plugins
- Active developer ecosystem
- Comprehensive API documentation
- Regular feature releases

---

## Notes

- **Local-First Priority**: All features prioritize on-device processing with cloud fallback
- **Privacy by Design**: User data stays local unless explicitly opted-in to sync
- **Customization is Key**: Every auto-assigned feature must be manually configurable
- **No Replit Dependencies**: System remains fully portable and independent
- **Agentic Intelligence**: PersonI are proactive, always-aware agents, not passive responders
