# NIRVANA AI Engineering Rules

This document defines the canonical tech choices and how to use them across the project. Follow these rules to keep the codebase simple, consistent, and maintainable.

## Tech Stack (5–10 bullets)
- TypeScript + Vite (ESM-only) for fast builds and modern browser targets
- Lit (Web Components) for UI; no React, no global state libraries
- Three.js (WebGL) for 3D rendering, with postprocessing for effects
- Web Audio API for input/output; custom analyser pipeline for FFT + levels
- Local Whisper STT via @xenova/transformers with IndexedDB/CDN caching
- AI provider abstraction (Google Gemini, OpenAI-compatible, custom) via ProviderFactory + providerManager
- RAG memory: ChromaDB (in-browser) when available, localStorage fallback otherwise
- Import maps + esm.sh CDN for web-native module delivery (configured in index.html)
- CSP locked down (no eval); remote calls limited to allowed origins
- Data saved locally (localStorage) for providers, user profile, preferences, and settings

---

## Rules by Area

### 1) UI & Component Architecture
- Use LitElement for all UI components; register with @customElement and encapsulate styles with Shadow DOM.
- Keep components small and focused; prefer composition over large monoliths.
- Do not introduce React, Tailwind, shadcn/ui, or other UI frameworks; stick to Lit + CSS.
- Style with component-scoped CSS; keep global CSS minimal (only layout/safety rules).
- Accessibility: add titles/labels, keyboard handlers, and sensible focus behavior.

### 2) 3D, Rendering, and Shaders
- Use three@^0.176 and postprocessing@^6 for all 3D and post FX.
- Keep WebGL as the production renderer; do not add WebGPU until the project explicitly green-lights it.
- Post FX pipeline via EffectComposer; prefer Bloom/SSAO/FXAA; GodRays is allowed in WebGL path only.
- Custom deformations/shaders: use onBeforeCompile with GLSL in WebGL; keep uniform updates tight and per-frame allocations zero.
- Dispose geometries/materials/textures and remove objects/listeners when replacing or unmounting.

### 3) Audio, STT, and TTS
- Microphone/Playback: Web Audio API (AudioContext, GainNodes, AnalyserNode); no third-party audio engines.
- STT: use localWhisperService (@xenova/transformers). If disabled or unavailable, use browser SpeechRecognition as a last-resort real-time fallback (no blob-based browser STT).
- TTS: prefer Google Gemini model “gemini-2.5-flash-preview-tts” when a verified provider is available; fallback to window.speechSynthesis for browser TTS.
- Voice activity detection uses the existing VoiceActivityDetector; integrate it rather than adding new VAD libs.

### 4) AI Providers & Messaging
- Never call model APIs directly from UI. Always go through:
  - ProviderFactory to create instances
  - BaseProvider subclasses (google/openai/custom)
  - providerManager for configuration, verification, and instances
- Add new providers by extending BaseProvider and wiring through providerManager; use fetch for OpenAI-compatible endpoints rather than heavy SDKs.
- Function calling/tools: use the existing Google GenAI function declaration pathway when available.

### 5) RAG Memory & Embeddings
- Use ragMemoryManager/enhancedRagMemoryManager for all memory operations (add/retrieve/update/delete).
- Embeddings: EmbeddingGenerator uses Google “text-embedding-004” when configured; otherwise use the built-in deterministic fallback. Do not introduce other embedding SDKs.
- If window.chroma is present, use ChromaDB; otherwise LocalMemoryFallback persists to localStorage.
- Memory types must be declared in src/types/memory.ts; don’t invent ad-hoc metadata without adding typed fields.

### 6) Storage, Settings, and Profile
- Persist user/provider/settings to localStorage using the existing services:
  - providerManager (providers/models)
  - userProfileManager (user metadata + system prompt context)
  - RAG config via RAG managers
- Do not add new storage backends unless discussed (e.g., IndexedDB wrappers); keep it local-first.

### 7) Networking & Security
- Respect the CSP in index.html. Do not add domains without updating CSP.
- Use fetch with ESM; avoid node-only APIs and dynamic eval.
- Keep API keys client-side only for local development workflows; ensure provider verification is explicit and opt-in.

### 8) Build, Modules, and Dependencies
- ESM only; imports must resolve via Vite or import maps (esm.sh).
- Prefer small, zero-dependency utilities; avoid heavyweight libraries where simple code suffices.
- Do not introduce transpiler-dependent features that break in the browser (e.g., CommonJS-only packages).

### 9) Performance & Lifecycle
- Use requestAnimationFrame for visual loops and keep per-frame allocations at zero.
- Unregister event listeners and cancel timers/RAF in disconnectedCallback.
- For Three.js, reuse materials/geometries when possible; batch updates; minimize texture churn.

### 10) Error Handling & Logging
- Let errors surface so we can fix them; don’t blanket catch unless you’re adding a user-facing message or must cleanup resources.
- Log with concise context, then recover by restoring idle state where appropriate.

---

## When You Add Something New

- New UI: create a Lit component under src/components, scoped CSS, keyboard accessible.
- New provider: extend BaseProvider, register via providerManager, expose models through getAvailableModels, and verify() with a real call.
- New memory type/metadata: update src/types/memory.ts, ensure RAG managers and panels understand it, and keep context formatting consistent.
- New 3D behavior: add to src/visual-3d.ts; keep the render loop clean; dispose resources; follow existing uniform patterns.
- New settings: persist through existing managers (providerManager, userProfileManager, rag managers), not ad hoc localStorage keys.

---

## Library Quick Reference (What to use for what)

- UI: Lit (lit, lit/decorators.js)
- 3D: three + postprocessing (WebGL only)
- Audio I/O: Web Audio API + Analyser (src/analyser.ts)
- STT: @xenova/transformers (localWhisperService) → fallback: SpeechRecognition
- TTS: @google/genai (gemini-2.5-flash-preview-tts) → fallback: window.speechSynthesis
- AI messaging: providerManager + ProviderFactory + BaseProvider subclasses
- RAG: ragMemoryManager / enhancedRagMemoryManager + EmbeddingGenerator + ChromaDB/local fallback
- Build & modules: Vite + ESM + import maps (esm.sh)
- Persistence: localStorage via existing service managers

Stay small. Stay fast. Stay consistent.