import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { appStateService } from '../../services/app-state-service';

type HelpSection = 
  | 'overview' 
  | 'personi' 
  | 'agentic'
  | 'connectors' 
  | 'memory'
  | 'routines'
  | 'plugins'
  | 'call-intelligence'
  | 'context-suggestions'
  | 'calendar'
  | 'environmental-awareness'
  | 'privacy'
  | 'telephony'
  | 'voice-commands'
  | 'settings'
  | 'setup';

@customElement('help-panel')
export class HelpPanel extends LitElement {
  @state() private activeSection: HelpSection = 'overview';
  @state() private isSpeaking = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 850px;
      max-width: 95vw;
      background: rgba(20, 20, 30, 0.98);
      backdrop-filter: blur(20px);
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideIn 0.3s ease-out;
      display: flex;
      flex-direction: column;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .header {
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.2);
    }

    .header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 8px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .close-btn:hover {
      opacity: 1;
    }

    .main-container {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: 240px;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.1);
    }

    .nav-item {
      padding: 12px 20px;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-item.active {
      background: rgba(33, 150, 243, 0.2);
      border-left-color: #2196f3;
      font-weight: 600;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
    }

    .content h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .content h4 {
      margin-top: 24px;
      margin-bottom: 12px;
      font-size: 16px;
      color: #64b5f6;
    }

    .content p {
      line-height: 1.6;
      margin-bottom: 16px;
      opacity: 0.9;
    }

    .content ul, .content ol {
      line-height: 1.8;
      margin-bottom: 16px;
      padding-left: 24px;
    }

    .content li {
      margin-bottom: 8px;
    }

    .diagram {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    .diagram-title {
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 14px;
      color: #64b5f6;
    }

    .flow-diagram {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 13px;
    }

    .flow-box {
      padding: 10px 16px;
      background: rgba(33, 150, 243, 0.2);
      border: 1px solid rgba(33, 150, 243, 0.5);
      border-radius: 6px;
      font-weight: 500;
    }

    .flow-arrow {
      font-size: 18px;
      opacity: 0.6;
    }

    .code-block {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 16px;
      font-family: monospace;
      font-size: 13px;
      margin: 12px 0;
      overflow-x: auto;
    }

    .info-box {
      background: rgba(33, 150, 243, 0.1);
      border-left: 4px solid #2196f3;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
      font-size: 14px;
    }

    .warning-box {
      background: rgba(255, 152, 0, 0.1);
      border-left: 4px solid #ff9800;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
      font-size: 14px;
    }

    .tts-controls {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      gap: 12px;
    }

    .tts-btn {
      padding: 12px 20px;
      background: #2196f3;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tts-btn:hover {
      background: #1976d2;
    }

    .tts-btn.speaking {
      background: #f44336;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
    }

    .feature-card strong {
      display: block;
      margin-bottom: 6px;
      color: #64b5f6;
    }

    .connector-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin: 12px 0;
      font-size: 13px;
    }

    .connector-item {
      padding: 8px 12px;
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid rgba(76, 175, 80, 0.3);
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;

  private handleSectionClick(section: HelpSection): void {
    this.activeSection = section;
    this.isSpeaking = false;
  }

  private async handleReadAloud(): Promise<void> {
    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      return;
    }

    const contentEl = this.shadowRoot?.querySelector('.content');
    if (!contentEl) return;

    const text = contentEl.textContent || '';
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.isSpeaking = true;
    window.speechSynthesis.speak(utterance);
  }

  private handleClose(): void {
    if (this.isSpeaking) {
      window.speechSynthesis.cancel();
    }
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private renderOverview() {
    return html`
      <h3>🌌 Welcome to Nirvana</h3>
      <p>Nirvana is an advanced multi-modal conversational AI platform featuring <strong>PersonI</strong> (Personified Intelligence) - customizable AI entities with unique personalities, voices, and capabilities.</p>

      <h4>Core Philosophy</h4>
      <ul>
        <li><strong>Local-First</strong>: On-device speech processing with Whisper STT</li>
        <li><strong>Multi-Provider</strong>: Support for Google Gemini, OpenAI, Anthropic, xAI, Deepseek, and custom endpoints</li>
        <li><strong>Privacy-Focused</strong>: Your data stays with you - vector memory stored locally</li>
        <li><strong>Extensible</strong>: Plugin architecture for connectors and capabilities</li>
        <li><strong>Vendor-Agnostic</strong>: No lock-in to any specific AI provider or service</li>
      </ul>

      <div class="diagram">
        <div class="diagram-title">System Architecture Flow</div>
        <div class="flow-diagram">
          <div class="flow-box">User Input (Voice/Text)</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">PersonI Agent</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">RAG Memory Retrieval</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">AI Provider (Gemini/OpenAI/etc)</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Response + Actions</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">3D Visualization + TTS</div>
        </div>
      </div>

      <h4>Quick Start</h4>
      <ol>
        <li>Configure your AI provider in <strong>Settings → Models</strong></li>
        <li>Select a PersonI from <strong>Settings → PersonI</strong></li>
        <li>Click the microphone or type to start conversing</li>
        <li>PersonI will remember your conversations in RAG memory</li>
        <li>Access productivity features via the Settings menu (⚙️)</li>
      </ol>

      <div class="info-box">
        💡 <strong>Tip</strong>: Each section of this help system can be read aloud by your active PersonI using the "Read Aloud" button at the bottom right!
      </div>
    `;
  }

  private renderAgentic() {
    return html`
      <h3>🧠⚡ Agentic Intelligence System</h3>
      <p>PersonI are not passive responders - they are <strong>autonomous agents</strong> that perceive, reason, plan, learn, and act proactively. This is the core of Nirvana's agentic architecture.</p>

      <div class="diagram">
        <div class="diagram-title">Agentic Pipeline: Perception → Reasoning → Planning → Action</div>
        <div class="flow-diagram">
          <div class="flow-box">Perception</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Reasoning</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Planning</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Action Execution</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Memory Update</div>
        </div>
      </div>

      <h4>1. Perception Orchestrator</h4>
      <p>LLM-powered understanding of user intent with heuristic fallback:</p>
      <ul>
        <li><strong>Intent Extraction</strong>: What does the user want? (query_info, execute_action, create_content, etc.)</li>
        <li><strong>Entity Recognition</strong>: Extract key entities (dates, names, amounts, locations)</li>
        <li><strong>Sentiment Analysis</strong>: Emotional tone (positive, negative, neutral, urgent)</li>
        <li><strong>Confidence Scoring</strong>: How certain is the perception? (0.0-1.0)</li>
      </ul>

      <h4>2. Reasoning Engine</h4>
      <p>Multi-step reasoning with prerequisite checking:</p>
      <ul>
        <li><strong>Goal Identification</strong>: What needs to be accomplished?</li>
        <li><strong>Prerequisite Checking</strong>: Are required connectors configured? Is data available?</li>
        <li><strong>Multi-Step Planning</strong>: Break complex tasks into sequential steps</li>
        <li><strong>Context Awareness</strong>: Use RAG memory and user profile for personalized responses</li>
      </ul>

      <h4>3. Planner Service</h4>
      <p>LLM-based planning with connector validation:</p>
      <ul>
        <li><strong>Plan Generation</strong>: Creates step-by-step action plans</li>
        <li><strong>Connector Validation</strong>: Ensures required services are available</li>
        <li><strong>Template Fallback</strong>: Uses predefined templates for common tasks</li>
        <li><strong>Parameter Extraction</strong>: Intelligently extracts parameters from user requests</li>
      </ul>

      <h4>4. Action Execution (8 Action Types)</h4>
      <p>PersonI can execute real-world actions autonomously:</p>
      <div class="connector-list">
        <div class="connector-item">📞 telephony_call - Make voice calls</div>
        <div class="connector-item">💬 telephony_sms - Send SMS messages</div>
        <div class="connector-item">📧 email_send - Send emails via Gmail</div>
        <div class="connector-item">🧠 store_memory - Add facts to RAG</div>
        <div class="connector-item">✅ create_task - Create tasks with priorities</div>
        <div class="connector-item">📅 calendar_event - Schedule events</div>
        <div class="connector-item">🔍 web_search - Real-time information</div>
        <div class="connector-item">⚡ routine_create - Generate IF-THEN-THAT automations</div>
      </div>

      <h4>Continuous Learning</h4>
      <ul>
        <li><strong>Pattern Recognition</strong>: Identifies repeated workflows and suggests automations</li>
        <li><strong>Routine Generation</strong>: Automatically creates routines from successful action sequences</li>
        <li><strong>Memory Updates</strong>: All actions logged to RAG for future reference</li>
        <li><strong>Feedback Loop</strong>: Success/failure results improve future planning</li>
      </ul>

      <div class="code-block">
Example Agentic Workflow:
User: "Remind me to call mom tomorrow at 2pm"

PERCEPTION:
  Intent: execute_action (create_reminder)
  Entities: { person: "mom", time: "tomorrow 2pm", action: "call" }
  Sentiment: neutral
  Confidence: 0.92

REASONING:
  Goal: Create calendar reminder + store memory
  Prerequisites: Calendar access ✓, Memory system ✓
  Multi-step: [create_event, store_memory]

PLANNING:
  Step 1: calendar_event(title="Call mom", time="tomorrow 2pm")
  Step 2: store_memory(fact="User wants to call mom regularly")

ACTION EXECUTION:
  ✓ Calendar event created
  ✓ Memory stored
  → PersonI confirms: "I've scheduled a reminder to call 
     mom tomorrow at 2pm and I'll remember this for future suggestions."
      </div>

      <div class="info-box">
        💡 <strong>Always-On Autonomy</strong>: The agentic system runs continuously, monitoring patterns, generating proactive suggestions, and executing scheduled routines even when you're not actively chatting. PersonI are truly autonomous assistants!
      </div>
    `;
  }

  private renderPersonI() {
    return html`
      <h3>🤖 PersonI System</h3>
      <p>PersonI (Personified Intelligence) are customizable AI entities, each with unique personalities, capabilities, and visual representations.</p>

      <h4>Six Built-in PersonI</h4>
      <div class="feature-grid">
        <div class="feature-card">
          <strong>🌀 NIRVANA</strong>
          General orchestrator, 24-hour color cycle background, balanced voice
        </div>
        <div class="feature-card">
          <strong>🦉 ATHENA</strong>
          Creative direction, purple constellation map, wise voice
        </div>
        <div class="feature-card">
          <strong>💻 ADAM</strong>
          Development partner, green Matrix code (Conway's Game of Life), analytical voice
        </div>
        <div class="feature-card">
          <strong>🔧 THEO</strong>
          Technical implementation, orange lava with code syntax, methodical voice
        </div>
        <div class="feature-card">
          <strong>👻 GHOST</strong>
          Privacy guardian, lavender static noise, mysterious voice
        </div>
        <div class="feature-card">
          <strong>💰 BILLY</strong>
          Financial advisor, gold/green, professional voice, 8 financial tools
        </div>
      </div>

      <h4>PersonI Capabilities</h4>
      <p>Each PersonI can be configured with specific abilities:</p>
      <ul>
        <li><strong>Vision</strong>: Analyze images and camera feed</li>
        <li><strong>Image Generation</strong>: Create images based on descriptions</li>
        <li><strong>Web Search</strong>: Access real-time web information</li>
        <li><strong>Tools</strong>: Use external connectors (Gmail, Calendar, etc.)</li>
        <li><strong>MCP</strong>: Model Context Protocol for advanced agent orchestration</li>
        <li><strong>Audio I/O</strong>: Voice input and text-to-speech output</li>
      </ul>

      <h4>Dual PersonI Mode</h4>
      <p>Run two PersonI simultaneously for AI-to-AI collaboration:</p>
      <div class="feature-grid">
        <div class="feature-card">
          <strong>Collaborative Mode</strong>
          PersonI switch every turn, working together harmoniously
        </div>
        <div class="feature-card">
          <strong>Debate Mode</strong>
          PersonI argue different perspectives, switching every turn
        </div>
        <div class="feature-card">
          <strong>Teaching Mode</strong>
          One PersonI teaches, switches every 3rd turn for engagement
        </div>
        <div class="feature-card">
          <strong>Single Mode</strong>
          Traditional single-PersonI interaction
        </div>
      </div>

      <div class="info-box">
        💡 <strong>How PersonI Work</strong>: When you speak or type, the active PersonI processes your input using their assigned AI model, retrieves relevant context from RAG memory, executes any requested actions via connectors, and responds with voice and text. Their 3D avatar reacts to audio in real-time with custom animations and background visuals.
      </div>

      <h4>Creating Custom PersonI</h4>
      <p>You can create custom PersonI via Settings → PersonI → "New PersonI Template" or ask any active PersonI to create one for you. Customize:</p>
      <ul>
        <li>Name, tagline, and system instructions</li>
        <li>3D shape (Icosahedron, TorusKnot)</li>
        <li>Accent color and texture (lava, water, crystal, etc.)</li>
        <li>Idle animation (glow, particles, code, none)</li>
        <li>Voice selection (if using OpenAI TTS)</li>
        <li>Enabled capabilities and connectors</li>
        <li>Assigned AI provider and model</li>
      </ul>
    `;
  }

  private renderConnectors() {
    return html`
      <h3>🔌 External Service Connectors</h3>
      <p>Connectors allow PersonI to interact with external services and APIs. All 32 connectors are configured via the app's Settings UI - never through Replit's integration system.</p>

      <h4>Google Workspace (4 connectors)</h4>
      <div class="connector-list">
        <div class="connector-item">✅ Gmail - Search and read emails</div>
        <div class="connector-item">✅ Google Calendar - Event management</div>
        <div class="connector-item">✅ Google Docs - Document reading</div>
        <div class="connector-item">✅ Google Sheets - Spreadsheet access</div>
      </div>

      <h4>Project Management (8 connectors)</h4>
      <div class="connector-list">
        <div class="connector-item">✅ GitHub - Repos, PRs, issues</div>
        <div class="connector-item">✅ Notion - Pages and databases</div>
        <div class="connector-item">✅ Linear - Issue tracking</div>
        <div class="connector-item">✅ Jira - JQL issue search</div>
        <div class="connector-item">✅ Asana - Task management</div>
        <div class="connector-item">✅ Slack - Message sending</div>
        <div class="connector-item">✅ Outlook - Email and calendar</div>
        <div class="connector-item">✅ Confluence - Wiki search</div>
      </div>

      <h4>Smart Home & Vision (9 connectors)</h4>
      <div class="connector-list">
        <div class="connector-item">✅ Home Assistant - Device control</div>
        <div class="connector-item">✅ Frigate NVR - Camera events</div>
        <div class="connector-item">✅ CodeProject.AI - Object detection</div>
        <div class="connector-item">✅ YOLO - Object detection</div>
        <div class="connector-item">✅ Local TensorFlow.js - 80 object classes</div>
      </div>

      <h4>Financial APIs (8 connectors - BILLY PersonI)</h4>
      <div class="connector-list">
        <div class="connector-item">✅ Stock Quotes - Alpha Vantage</div>
        <div class="connector-item">✅ Crypto Prices - CoinGecko</div>
        <div class="connector-item">✅ Portfolio Analysis</div>
        <div class="connector-item">✅ Market News - Finnhub</div>
        <div class="connector-item">✅ Spending Analysis</div>
        <div class="connector-item">✅ Budget Creation</div>
        <div class="connector-item">✅ Account Balance</div>
        <div class="connector-item">✅ Transaction History</div>
      </div>

      <h4>Music & Entertainment (2 connectors)</h4>
      <div class="connector-list">
        <div class="connector-item">✅ AudD API - Song identification</div>
        <div class="connector-item">✅ Genius API - Lyrics retrieval</div>
      </div>

      <h4>How to Use Connectors</h4>
      <ol>
        <li>Enable connectors for a PersonI in <strong>Settings → PersonI → [Select PersonI] → Edit</strong></li>
        <li>Configure OAuth or API credentials in <strong>Settings → Connectors</strong></li>
        <li>Ask your PersonI to perform actions: "Check my Gmail", "What's on my calendar today?"</li>
        <li>PersonI will execute the connector and provide results</li>
      </ol>

      <div class="warning-box">
        ⚠️ <strong>Privacy Note</strong>: ALL connector credentials are stored securely in your browser's localStorage or via OAuth tokens managed by the backend. Nirvana never stores your API keys on external servers. For OAuth services, tokens are encrypted and stored backend-side with PKCE + CSRF protection.
      </div>
    `;
  }

  private renderMemory() {
    return html`
      <h3>🧠 Memory & RAG System</h3>
      <p>Nirvana uses a sophisticated RAG (Retrieval-Augmented Generation) system to give PersonI long-term memory and contextual awareness.</p>

      <div class="diagram">
        <div class="diagram-title">Memory Storage & Retrieval Flow</div>
        <div class="flow-diagram">
          <div class="flow-box">User Interaction</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Text Embedding (Gemini)</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Vector Storage (ChromaDB/localStorage)</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Semantic Search</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Top 10 Relevant Memories</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Injected into AI Context</div>
        </div>
      </div>

      <h4>17 Memory Types</h4>
      <p>The system tracks diverse memory types for comprehensive context:</p>
      <ul>
        <li><strong>conversations</strong> - Chat history with timestamp and speaker</li>
        <li><strong>notes</strong> - User-created notes with importance ratings (1-10)</li>
        <li><strong>tasks</strong> - To-do items with priorities (P1-P5) and due dates</li>
        <li><strong>reminders</strong> - Time-based alerts</li>
        <li><strong>preferences</strong> - User preferences learned over time</li>
        <li><strong>facts</strong> - Factual information PersonI should remember</li>
        <li><strong>camera_observation</strong> - What PersonI sees via camera</li>
        <li><strong>object_detection</strong> - Detected objects from TensorFlow.js</li>
        <li><strong>file_upload</strong> - Uploaded file content and metadata</li>
        <li><strong>routine</strong> - Automation routines (IF-THEN-THAT)</li>
        <li><strong>plugin</strong> - User-created or PersonI-generated UI plugins</li>
        <li><strong>connector_result</strong> - Results from external API calls</li>
        <li><strong>web_search_result</strong> - Cached web search results</li>
        <li><strong>image_generation</strong> - Generated image metadata</li>
        <li><strong>voice_profile</strong> - Speaker characteristics (future)</li>
        <li><strong>system</strong> - System-level metadata</li>
        <li><strong>music_detection</strong> - Identified songs and metadata</li>
      </ul>

      <h4>How RAG Works</h4>
      <ol>
        <li><strong>Storage</strong>: When you interact with Nirvana, text is embedded using Gemini's text-embedding-004 model into a 768-dimensional vector</li>
        <li><strong>Indexing</strong>: Vectors are stored in ChromaDB (if configured) or localStorage with cosine similarity fallback</li>
        <li><strong>Retrieval</strong>: When PersonI responds, they query memory semantically (not keyword search!)</li>
        <li><strong>Context Injection</strong>: Top 10 most relevant memories are injected into the AI's context window</li>
        <li><strong>Response</strong>: PersonI generates contextually-aware responses based on retrieved memories</li>
      </ol>

      <h4>Configuring RAG</h4>
      <p>Access RAG settings via <strong>Settings → Memory</strong>:</p>
      <ul>
        <li><strong>Enable/Disable</strong>: Toggle RAG system on/off</li>
        <li><strong>Similarity Threshold</strong>: 0.0-1.0 (default 0.6) - higher = stricter matches</li>
        <li><strong>Max Memories</strong>: 1-50 (default 10) - memories retrieved per query</li>
      </ul>

      <div class="info-box">
        💡 <strong>Privacy Guarantee</strong>: ALL memory vectors are stored locally in your browser (localStorage or IndexedDB for ChromaDB). Embeddings are generated by calling the Gemini API, but the vectors themselves never leave your device. Your memory data is completely private and portable.
      </div>

      <h4>Memory Browser</h4>
      <p>View, search, filter, and delete memories via <strong>Settings → Memory → Memory Browser</strong>. You can filter by memory type, search semantically, and manage all stored data.</p>
    `;
  }

  private renderRoutines() {
    return html`
      <h3>⚡ Routine Automation System</h3>
      <p>Routines are IF-THEN-THAT automations that let PersonI execute actions based on triggers and conditions.</p>

      <div class="diagram">
        <div class="diagram-title">Routine Execution Flow</div>
        <div class="flow-diagram">
          <div class="flow-box">Trigger Fires</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Check Conditions</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Execute Actions</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Log to Memory</div>
        </div>
      </div>

      <h4>Trigger Types</h4>
      <ul>
        <li><strong>Time-based</strong>: Schedule (cron-style), interval (every X minutes), time-of-day (daily at 9am)</li>
        <li><strong>Event-driven</strong>: PersonI switch, voice command, file upload, music detected</li>
        <li><strong>State monitoring</strong>: Smart home device state change, calendar event approaching</li>
        <li><strong>User action</strong>: Note created, task completed, specific voice command</li>
        <li><strong>Vision detection</strong>: Object detected via TensorFlow.js, Frigate camera event, motion detected</li>
      </ul>

      <h4>Condition Evaluation</h4>
      <p>Conditions are optional checks that must pass before actions execute:</p>
      <ul>
        <li><strong>Time conditions</strong>: Only between 9am-5pm, weekdays only, etc.</li>
        <li><strong>State conditions</strong>: Only if specific device is on/off</li>
        <li><strong>Weather conditions</strong>: Only if temperature above/below threshold</li>
        <li><strong>User presence</strong>: Only when user is detected on camera</li>
      </ul>

      <h4>Action Types</h4>
      <ul>
        <li><strong>Notify</strong>: Send notification, speak message via TTS</li>
        <li><strong>Connector</strong>: Call any enabled connector (send email, create calendar event, etc.)</li>
        <li><strong>Smart Home</strong>: Control Home Assistant devices</li>
        <li><strong>Create Memory</strong>: Add note, task, or fact to RAG</li>
        <li><strong>Switch PersonI</strong>: Change active PersonI</li>
        <li><strong>Custom</strong>: Execute PersonI-provided code (sandboxed)</li>
      </ul>

      <h4>Creating Routines</h4>
      <p>You can create routines in two ways:</p>
      <ol>
        <li><strong>Via Settings</strong>: Go to Settings → Routines → Create Routine</li>
        <li><strong>Ask PersonI</strong>: "Create a routine that reminds me to stand up every hour" - PersonI will create it for you!</li>
      </ol>

      <div class="code-block">
Example Routine:
"When I say 'goodnight', turn off all smart home lights 
and create a reminder to review my tasks tomorrow at 9am"

Trigger: Voice command detected ("goodnight")
Conditions: Time is between 8pm-12am
Actions:
  1. Control Home Assistant - turn off all lights
  2. Create reminder - "Review tasks" at 9am tomorrow
  3. Speak - "Goodnight! I've turned off the lights and 
     set your morning reminder."
      </div>

      <div class="info-box">
        💡 <strong>PersonI as Automation Assistants</strong>: Routines are stored in RAG memory, so PersonI can recall, modify, disable, or delete them on your request. Simply ask: "Show me all my routines" or "Disable the morning reminder routine."
      </div>
    `;
  }

  private renderCallIntelligence() {
    return html`
      <h3>📞🧠 Call Intelligence System</h3>
      <p>Real-time call transcription, automatic note-taking, action item detection, sentiment analysis, and post-call summarization with email/SMS delivery.</p>

      <div class="diagram">
        <div class="diagram-title">Call Intelligence Flow</div>
        <div class="flow-diagram">
          <div class="flow-box">Call Initiated</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Real-Time Transcription</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">AI Analysis (Topics/Actions/Sentiment)</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Live Note Generation</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Post-Call Summary</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Email/SMS Delivery</div>
        </div>
      </div>

      <h4>Real-Time Capabilities</h4>
      <ul>
        <li><strong>Live Transcription</strong>: Speech-to-text during active calls using Whisper or provider STT</li>
        <li><strong>Speaker Diarization</strong>: Distinguishes between caller and PersonI speech</li>
        <li><strong>Topic Extraction</strong>: Identifies key discussion points automatically</li>
        <li><strong>Action Item Detection</strong>: Recognizes commitments and to-dos in real-time</li>
        <li><strong>Sentiment Analysis</strong>: Tracks emotional tone throughout the conversation</li>
        <li><strong>Session Persistence</strong>: All call data stored for later review</li>
      </ul>

      <h4>Post-Call Processing</h4>
      <p>When a call ends, PersonI automatically:</p>
      <ol>
        <li><strong>Generates Summary</strong>: AI-powered call summary with key points</li>
        <li><strong>Extracts Actions</strong>: Converts action items into tasks with due dates</li>
        <li><strong>Sentiment Report</strong>: Overall call sentiment and mood tracking</li>
        <li><strong>Delivery Options</strong>:
          <ul>
            <li>Email summary via Gmail (if configured)</li>
            <li>SMS summary via Twilio (if configured)</li>
            <li>Store in RAG memory for future reference</li>
            <li>Add to Notes panel</li>
          </ul>
        </li>
      </ol>

      <h4>How to Use Call Intelligence</h4>
      <ol>
        <li>Enable telephony in <strong>Settings → Telephony</strong></li>
        <li>Configure Gmail and/or Twilio for summary delivery</li>
        <li>Initiate a call via the Voice Call panel</li>
        <li>Speak naturally - PersonI transcribes and analyzes in real-time</li>
        <li>After call ends, choose delivery method for summary</li>
      </ol>

      <div class="code-block">
Example Call Summary (sent via email/SMS):

📞 Call Summary - Nov 17, 2025, 2:15 PM
Duration: 8 minutes 34 seconds
Sentiment: Positive

Key Topics:
• Q1 budget planning
• Marketing campaign timeline
• Team hiring needs

Action Items:
✅ Send Q1 budget proposal by Friday
✅ Schedule follow-up meeting next Tuesday
✅ Review candidate resumes this week

Transcript highlights saved to Notes.
      </div>

      <div class="info-box">
        💡 <strong>Conference Call Support</strong>: Call Intelligence works with multi-party calls! PersonI can transcribe and analyze group conversations, identifying different speakers and tracking multi-threaded discussions.
      </div>
    `;
  }

  private renderContextSuggestions() {
    return html`
      <h3>💡 Context Suggestion Engine</h3>
      <p>Proactive, context-aware suggestions that appear across all interfaces based on patterns, time, activity, and memory.</p>

      <h4>Suggestion Types</h4>
      <div class="feature-grid">
        <div class="feature-card">
          <strong>Pattern-Based</strong>
          Learn from repeated workflows and suggest automations
        </div>
        <div class="feature-card">
          <strong>Memory-Based</strong>
          Surface relevant information from RAG memory
        </div>
        <div class="feature-card">
          <strong>Time-Based</strong>
          Contextual suggestions based on time of day/week
        </div>
        <div class="feature-card">
          <strong>Activity-Based</strong>
          Suggestions based on current user activity
        </div>
      </div>

      <h4>Where Suggestions Appear</h4>
      <ul>
        <li><strong>Main Chat Interface</strong>: Suggestions appear as clickable chips above the input</li>
        <li><strong>Notes Panel</strong>: Relevant notes suggested when creating new ones</li>
        <li><strong>Tasks Panel</strong>: Related tasks and recommended priorities</li>
        <li><strong>Calendar View</strong>: Optimal meeting times and event suggestions</li>
        <li><strong>Routine Builder</strong>: Automation patterns detected from user behavior</li>
      </ul>

      <h4>Example Suggestions</h4>
      <div class="code-block">
Morning (9am):
💡 "Review your tasks for today"
💡 "Check calendar for upcoming meetings"
💡 "Start your daily standup routine"

Detected Pattern:
💡 "You check email every morning at 10am - 
   would you like me to create a routine for that?"

Based on Current Activity (editing notes):
💡 "Related note from last week about this project"
💡 "Create a task from this note?"

Context-Aware (calendar event in 30 minutes):
💡 "Your meeting with Sarah starts in 30 minutes"
💡 "Would you like me to prepare discussion points?"
      </div>

      <h4>Customization</h4>
      <p>PersonI learn your preferences over time:</p>
      <ul>
        <li><strong>Ignore Suggestions</strong>: Dismissed suggestions won't reappear</li>
        <li><strong>Accept Suggestions</strong>: Reinforces pattern for future suggestions</li>
        <li><strong>Modify Suggestions</strong>: PersonI adapt based on your edits</li>
        <li><strong>Disable Categories</strong>: Turn off specific suggestion types</li>
      </ul>

      <div class="info-box">
        💡 <strong>Privacy-Preserving Intelligence</strong>: All suggestion patterns are generated locally using your RAG memory. No external analysis or tracking - just your PersonI understanding your workflow!
      </div>
    `;
  }

  private renderCalendar() {
    return html`
      <h3>📅 Calendar System</h3>
      <p>Visual calendar component with natural language event creation and full Google Calendar integration.</p>

      <h4>Features</h4>
      <ul>
        <li><strong>Monthly View</strong>: Clean, visual calendar interface</li>
        <li><strong>Event Display</strong>: Color-coded events with time indicators</li>
        <li><strong>Natural Language Creation</strong>: "Schedule lunch with Alex next Tuesday at noon"</li>
        <li><strong>Google Calendar Sync</strong>: Two-way sync with Google Calendar (OAuth required)</li>
        <li><strong>Quick Add</strong>: Click any date to create events instantly</li>
        <li><strong>Event Details</strong>: View full event information on click</li>
      </ul>

      <h4>Natural Language Examples</h4>
      <div class="code-block">
"Schedule a team meeting tomorrow at 2pm"
→ Creates event: Team Meeting, [Tomorrow] 2:00 PM

"Remind me to call the dentist next Monday"
→ Creates event: Call dentist, [Next Monday] 9:00 AM

"Set up weekly standup every Monday at 9am"
→ Creates recurring event: Weekly Standup, Every Monday 9:00 AM

"Block off next Friday afternoon for deep work"
→ Creates event: Deep Work, [Next Friday] 1:00 PM - 5:00 PM
      </div>

      <h4>Google Calendar Integration</h4>
      <ol>
        <li>Go to <strong>Settings → Connectors → Google OAuth</strong></li>
        <li>Click "Connect with Google" and authorize calendar access</li>
        <li>PersonI will now sync events with your Google Calendar</li>
        <li>Events created in Nirvana appear in Google Calendar (and vice versa)</li>
      </ol>

      <h4>Calendar Actions via PersonI</h4>
      <p>Ask your PersonI to manage your calendar:</p>
      <ul>
        <li>"What's on my calendar today?"</li>
        <li>"Cancel my 3pm meeting"</li>
        <li>"Move tomorrow's standup to 10am"</li>
        <li>"Find a free slot for a 1-hour meeting this week"</li>
        <li>"What meetings do I have with Sarah this month?"</li>
      </ul>

      <div class="info-box">
        💡 <strong>Agentic Calendar Management</strong>: PersonI can proactively suggest optimal meeting times based on your schedule, create events from email action items, and even reschedule conflicts automatically!
      </div>
    `;
  }

  private renderEnvironmentalAwareness() {
    return html`
      <h3>👁️ Environmental Awareness Suite</h3>
      <p>Real-time camera-based contextual observation, vision-enhanced idle speech, and environmental observer service.</p>

      <h4>Camera-as-3D-Background</h4>
      <ul>
        <li><strong>WebGL Integration</strong>: Live camera feed rendered as 3D background texture</li>
        <li><strong>Performance Optimized</strong>: Efficient frame capture without blocking UI</li>
        <li><strong>Privacy Controls</strong>: Toggle camera on/off with persistent permissions</li>
        <li><strong>Visual Feedback</strong>: Camera indicator shows active status</li>
      </ul>

      <h4>Vision-Enhanced Idle Speech</h4>
      <p>When PersonI are idle, they can observe their surroundings and make contextual comments:</p>
      <div class="code-block">
Examples of Vision-Enhanced Idle Speech:

"I notice you're in your home office - looking productive today!"

"Is that a new plant on your desk? Nice addition to the workspace."

"You seem focused - I'll stay quiet unless you need me."

"Based on what I see, it looks like late afternoon. 
Time for a break maybe?"
      </div>

      <h4>Environmental Observer Service</h4>
      <p>Continuous monitoring and analysis of camera feed:</p>
      <ul>
        <li><strong>Object Detection</strong>: TensorFlow.js COCO-SSD model detects 80 object classes</li>
        <li><strong>Motion Detection</strong>: Tracks movement and user presence</li>
        <li><strong>Scene Understanding</strong>: Identifies room type, lighting conditions</li>
        <li><strong>Context Storage</strong>: Observations stored in RAG memory</li>
      </ul>

      <h4>Object Detection Overlay</h4>
      <ul>
        <li><strong>Real-Time Bounding Boxes</strong>: Visual overlays on detected objects</li>
        <li><strong>Confidence Scores</strong>: Shows AI confidence percentage</li>
        <li><strong>Class Labels</strong>: Object names displayed on overlay</li>
        <li><strong>Adjustable Threshold</strong>: Filter detections by confidence level</li>
      </ul>

      <h4>Multi-Format File Upload with RAG</h4>
      <p>PersonI can analyze uploaded files and store insights in memory:</p>
      <ul>
        <li><strong>Images</strong>: Vision analysis with object detection and scene description</li>
        <li><strong>PDFs</strong>: Text extraction and semantic understanding</li>
        <li><strong>Documents</strong>: Content analysis and key point extraction</li>
        <li><strong>Code Files</strong>: Syntax highlighting and code review</li>
      </ul>

      <h4>Privacy & Control</h4>
      <ul>
        <li><strong>Explicit Permission</strong>: Camera requires user approval</li>
        <li><strong>Visual Indicators</strong>: Always shows when camera is active</li>
        <li><strong>On-Device Processing</strong>: Object detection runs locally (TensorFlow.js)</li>
        <li><strong>Opt-Out</strong>: Disable all vision features in Settings</li>
      </ul>

      <div class="warning-box">
        ⚠️ <strong>Privacy Guarantee</strong>: Your camera feed is NEVER uploaded to external servers unless you explicitly request vision analysis (e.g., "What do you see?"). All object detection runs locally in your browser using TensorFlow.js.
      </div>
    `;
  }

  private renderSetup() {
    return html`
      <h3>🚀 Setup & Installation</h3>
      <p>Nirvana is designed to be 100% standalone with NO cloud platform dependencies. Run it locally with full control.</p>

      <h4>Quick Start (Standalone Mode)</h4>
      <div class="code-block">
# 1. Copy environment template
cp .env.example .env

# 2. Add your AI provider API key to .env
# At minimum: GEMINI_API_KEY or OPENAI_API_KEY

# 3. Start the application
npm run dev          # Frontend (port 5000)
node server.js       # Backend (port 3001)
      </div>

      <h4>Full Stack with Docker Compose</h4>
      <p>Optional infrastructure for advanced features:</p>
      <div class="connector-list">
        <div class="connector-item">🐘 PostgreSQL - Relational database</div>
        <div class="connector-item">🔍 Milvus - High-performance vector DB</div>
        <div class="connector-item">📊 Qdrant - Alternative vector DB</div>
        <div class="connector-item">🌊 Flowise - LLM workflow orchestration</div>
        <div class="connector-item">🔧 n8n - Workflow automation platform</div>
        <div class="connector-item">📓 Jupyter - Data science notebooks</div>
        <div class="connector-item">📄 Apache Tika - Content extraction</div>
        <div class="connector-item">💾 MinIO + etcd - Object storage</div>
      </div>

      <div class="code-block">
# Launch all Docker services
docker-compose up -d

# Access UIs:
# Flowise:  http://localhost:3000 (admin/admin)
# n8n:      http://localhost:5678 (admin/admin)
# Jupyter:  http://localhost:8888 (token: nirvana)
# MinIO:    http://localhost:9001 (minioadmin/minioadmin)
      </div>

      <h4>Environment Configuration</h4>
      <p>All integrations configured via <code>.env</code> file (see <code>.env.example</code>):</p>
      <ul>
        <li><strong>Interactive Setup</strong>: Run <code>./scripts/setup-env.sh</code> for guided configuration</li>
        <li><strong>Documentation</strong>: See <code>SETUP.md</code> for complete instructions</li>
        <li><strong>Docker Reference</strong>: See <code>DOCKER_REFERENCE.md</code> for quick commands</li>
      </ul>

      <h4>Required Environment Variables</h4>
      <div class="code-block">
# At least ONE AI provider required
GEMINI_API_KEY=          # Google Gemini (recommended)
OPENAI_API_KEY=          # OpenAI GPT models

# OAuth for Gmail/Calendar (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/oauth/callback

# Telephony (optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# 20+ additional optional APIs (see .env.example)
      </div>

      <h4>Data Persistence</h4>
      <p>All data stored in <code>./data/</code> subdirectories:</p>
      <ul>
        <li><strong>Backup</strong>: Simply copy <code>./data/</code> directory</li>
        <li><strong>Portable</strong>: Move to any machine - no cloud dependencies</li>
        <li><strong>Version Control</strong>: Use git for code, backup <code>./data/</code> separately</li>
      </ul>

      <div class="info-box">
        💡 <strong>Zero Lock-In</strong>: Nirvana works on any machine (Linux, macOS, Windows). No Replit account required. No cloud subscriptions. You own your data and infrastructure completely.
      </div>

      <div class="warning-box">
        ⚠️ <strong>Security Best Practice</strong>: NEVER commit <code>.env</code> to version control. Use <code>.env.example</code> as a template and fill in your actual credentials locally.
      </div>
    `;
  }

  private renderPlugins() {
    return html`
      <h3>🧩 Plugin System</h3>
      <p>The plugin system lets you (or PersonI) create custom UI components that extend Nirvana's functionality.</p>

      <h4>Plugin Architecture</h4>
      <ul>
        <li><strong>Dynamic UI Generation</strong>: PersonI can create plugins via natural language</li>
        <li><strong>Registry</strong>: Centralized plugin registry with localStorage persistence</li>
        <li><strong>Sandbox</strong>: Secure execution environment</li>
        <li><strong>Categories</strong>: dashboard, chart, form, table, card, list, custom</li>
      </ul>

      <h4>Plugin Components</h4>
      <p>Each plugin consists of:</p>
      <ul>
        <li><strong>Metadata</strong>: ID, name, description, author, version, category, tags</li>
        <li><strong>Template</strong>: HTML structure using Lit template syntax</li>
        <li><strong>Styles</strong>: CSS for appearance</li>
        <li><strong>Props</strong>: Configurable parameters</li>
        <li><strong>Events</strong>: User interactions</li>
        <li><strong>Methods</strong>: JavaScript functions for behavior</li>
      </ul>

      <h4>Creating Plugins</h4>
      <p>Ask any PersonI to create a plugin for you:</p>
      <div class="code-block">
"Create a plugin that shows my top 5 most important notes 
in a card layout with color-coded importance levels"

PersonI will:
1. Design the plugin structure
2. Generate HTML/CSS/JS code
3. Register the plugin
4. Add an instance to your dashboard
      </div>

      <h4>Managing Plugins</h4>
      <p>Access plugin management via <strong>Settings → Plugins</strong>:</p>
      <ul>
        <li>View all registered plugins</li>
        <li>Create new plugin instances</li>
        <li>Configure plugin props (position, size, data sources)</li>
        <li>Delete plugins or instances</li>
      </ul>

      <div class="warning-box">
        ⚠️ <strong>Security Note</strong>: Plugins run in a sandboxed environment with limited access to Nirvana APIs. They cannot access your credentials, modify core system files, or execute arbitrary code outside the sandbox. However, only install plugins from trusted sources or created by your PersonI.
      </div>
    `;
  }

  private renderPrivacy() {
    return html`
      <h3>🔒 Privacy & Data Security</h3>
      <p>Nirvana is designed with privacy as a core principle. Your data stays with you.</p>

      <h4>Local-First Architecture</h4>
      <ul>
        <li><strong>Vector Memory</strong>: Stored in browser localStorage or IndexedDB (ChromaDB)</li>
        <li><strong>Notes & Tasks</strong>: Encrypted in localStorage</li>
        <li><strong>Routines & Plugins</strong>: Stored in RAG memory locally</li>
        <li><strong>User Profile</strong>: Browser-only storage, never sent to servers</li>
      </ul>

      <h4>What Leaves Your Device</h4>
      <p>Only the following data is sent to external services:</p>
      <ul>
        <li><strong>AI Provider APIs</strong>: Your conversation text, RAG context snippets, images (if using vision)</li>
        <li><strong>Embedding API (Gemini)</strong>: Text to be embedded into vectors (no vectors stored externally)</li>
        <li><strong>OAuth Services</strong>: Tokens managed by backend with PKCE + CSRF protection</li>
        <li><strong>Connector APIs</strong>: Only data you explicitly request (e.g., "search my email")</li>
      </ul>

      <h4>What NEVER Leaves Your Device</h4>
      <ul>
        <li>Memory vectors (embeddings)</li>
        <li>Full conversation history</li>
        <li>Notes, tasks, reminders content</li>
        <li>Plugin code and configurations</li>
        <li>Routine definitions</li>
        <li>User profile data</li>
        <li>Camera feed (unless explicitly sent for vision analysis)</li>
      </ul>

      <h4>Data Encryption</h4>
      <ul>
        <li><strong>In Transit</strong>: All API calls use HTTPS/TLS encryption</li>
        <li><strong>At Rest</strong>: OAuth tokens encrypted backend-side, other data in browser storage</li>
        <li><strong>No Cloud Storage</strong>: Nirvana does not maintain a cloud database of your data</li>
      </ul>

      <h4>Multi-Provider Support = No Lock-In</h4>
      <p>You can switch AI providers at any time. Your memory and data remain local regardless of which provider you use.</p>

      <div class="info-box">
        💡 <strong>Export Your Data</strong>: Use Settings → Memory → Memory Browser to view and export all your memories. You can also export notes and tasks as JSON files. Nirvana is fully portable - take your data anywhere!
      </div>

      <div class="warning-box">
        ⚠️ <strong>Important</strong>: While Nirvana stores data locally, the AI providers you use (Gemini, OpenAI, etc.) process your conversation text according to their privacy policies. Choose providers that respect privacy (e.g., OpenAI's API does not train on your data by default). For maximum privacy, use local models with Ollama/LMStudio.
      </div>
    `;
  }

  private renderTelephony() {
    return html`
      <h3>📞 Telephony Integration</h3>
      <p>Nirvana supports SMS and voice calls through a multi-provider telephony system designed to avoid vendor lock-in.</p>

      <h4>Supported Providers</h4>
      <div class="feature-grid">
        <div class="feature-card">
          <strong>Twilio</strong>
          Cloud-based SMS & Voice (Paid service)
        </div>
        <div class="feature-card">
          <strong>FreePBX</strong>
          Self-hosted SIP server (Free & open-source)
        </div>
      </div>

      <h4>SMS Features</h4>
      <ul>
        <li>Send and receive SMS messages</li>
        <li>Conversation thread UI with glass-morphic design</li>
        <li>Message history retrieval (last 50 messages)</li>
        <li>Real-time message display with auto-scroll</li>
      </ul>

      <h4>Voice Call Features</h4>
      <ul>
        <li>Make outbound voice calls</li>
        <li>Receive inbound calls (with webhook setup)</li>
        <li>Call controls: Mute, Listen, Join</li>
        <li>PersonI audio streaming to caller via WebSocket</li>
        <li>Bidirectional audio (PersonI ↔ Caller)</li>
        <li>Real-time call status and duration tracking</li>
      </ul>

      <h4>Configuration</h4>
      <p>Configure telephony via <strong>Settings → Telephony</strong>:</p>
      <ol>
        <li>Choose provider (Twilio or FreePBX)</li>
        <li>Enter credentials:
          <ul>
            <li><strong>Twilio</strong>: Account SID, Auth Token, Phone Number</li>
            <li><strong>FreePBX</strong>: SIP Endpoint, Username, Password</li>
          </ul>
        </li>
        <li>Enable telephony toggle</li>
        <li>Save configuration</li>
      </ol>

      <div class="diagram">
        <div class="diagram-title">Telephony Architecture</div>
        <div class="flow-diagram">
          <div class="flow-box">User Initiates SMS/Call</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Telephony Provider (Twilio/FreePBX)</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Backend API Proxy</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">Frontend UI (SMS/Voice Panel)</div>
          <div class="flow-arrow">→</div>
          <div class="flow-box">WebSocket for Media Streams</div>
        </div>
      </div>

      <div class="warning-box">
        ⚠️ <strong>No Vendor Lock-In</strong>: The telephony system uses a provider abstraction layer, allowing you to switch between Twilio and FreePBX (or add custom providers) without changing your application code. All configuration is done via the Settings UI - never through Replit's integration system.
      </div>
    `;
  }

  private renderVoiceCommands() {
    return html`
      <h3>🎙️ Voice Command System</h3>
      <p>Control Nirvana hands-free with natural language voice commands.</p>

      <h4>Available Commands</h4>
      <div class="feature-grid">
        <div class="feature-card">
          <strong>Wake Word</strong>
          "Hey Nirvana" - Activate voice listening
        </div>
        <div class="feature-card">
          <strong>PersonI Switching</strong>
          "Switch to ATHENA" - Change active PersonI
        </div>
        <div class="feature-card">
          <strong>Audio Controls</strong>
          "Mute" / "Unmute" - Toggle microphone
        </div>
        <div class="feature-card">
          <strong>Camera Controls</strong>
          "Turn camera on/off" - Control camera feed
        </div>
        <div class="feature-card">
          <strong>Panel Management</strong>
          "Open notes" / "Show tasks" - Open UI panels
        </div>
        <div class="feature-card">
          <strong>Object Detection</strong>
          "Start object detection" - Enable real-time detection
        </div>
        <div class="feature-card">
          <strong>RAG Memory</strong>
          "Enable memory" / "Disable RAG" - Toggle memory system
        </div>
        <div class="feature-card">
          <strong>Context Actions</strong>
          "Close all panels" - Close all open UI windows
        </div>
      </div>

      <h4>How Voice Commands Work</h4>
      <ol>
        <li><strong>Recognition</strong>: Uses browser's SpeechRecognition API or local Whisper STT</li>
        <li><strong>Pattern Matching</strong>: Matches your speech against regex patterns</li>
        <li><strong>Parameter Extraction</strong>: Extracts relevant info (e.g., PersonI name, panel type)</li>
        <li><strong>Action Execution</strong>: Triggers corresponding system action</li>
        <li><strong>Confirmation</strong>: PersonI confirms the action was completed</li>
      </ol>

      <div class="code-block">
Examples:
"Hey Nirvana, switch to ADAM"
→ Switches to ADAM PersonI

"Show me my tasks"
→ Opens Tasks panel

"Turn camera off"
→ Disables camera feed

"Close all panels"
→ Closes all open UI windows
      </div>

      <div class="info-box">
        💡 <strong>Custom Commands</strong>: PersonI can create custom voice commands for you via the Routine system. For example: "When I say 'start my day', open calendar, tasks, and notes panels."
      </div>
    `;
  }

  private renderSettings() {
    return html`
      <h3>⚙️ Settings & Configuration</h3>
      <p>Access all Nirvana settings via the Settings menu (gear icon, bottom right).</p>

      <h4>Settings Menu Structure</h4>
      <div class="feature-grid">
        <div class="feature-card">
          <strong>👤 User Profile</strong>
          Name, pronouns, timezone, custom context
        </div>
        <div class="feature-card">
          <strong>🤖 Models</strong>
          AI provider configuration (API keys)
        </div>
        <div class="feature-card">
          <strong>🎭 PersonI</strong>
          Create, edit, and manage PersonI
        </div>
        <div class="feature-card">
          <strong>🔌 Connectors</strong>
          Configure OAuth and API credentials
        </div>
        <div class="feature-card">
          <strong>📝 Notes</strong>
          Create and manage notes
        </div>
        <div class="feature-card">
          <strong>✅ Tasks</strong>
          Task management and tracking
        </div>
        <div class="feature-card">
          <strong>🧠 Memory</strong>
          RAG settings and memory browser
        </div>
        <div class="feature-card">
          <strong>⚡ Routines</strong>
          Automation routines
        </div>
        <div class="feature-card">
          <strong>🧩 Plugins</strong>
          Plugin management
        </div>
        <div class="feature-card">
          <strong>📞 Telephony</strong>
          SMS and voice call configuration
        </div>
      </div>

      <h4>PersonI Can Configure Settings For You</h4>
      <p>You don't need to navigate settings manually! Simply ask your active PersonI:</p>
      <div class="code-block">
"Add my Gmail account to connectors"
→ PersonI opens Connectors panel and guides you through OAuth flow

"Set my name to Alex and timezone to Pacific"
→ PersonI updates your user profile

"Create a new PersonI called SAGE focused on philosophy"
→ PersonI creates custom PersonI with appropriate settings

"Enable vision for ATHENA"
→ PersonI updates ATHENA's capabilities

"Set RAG similarity threshold to 0.7"
→ PersonI adjusts memory settings
      </div>

      <div class="info-box">
        💡 <strong>Conversational Configuration</strong>: One of Nirvana's most powerful features is that PersonI can configure ANY setting available in the app based on your natural language requests. They understand the entire settings structure and can make changes on your behalf while explaining what they're doing.
      </div>

      <h4>Advanced Settings</h4>
      <ul>
        <li><strong>Provider Verification</strong>: Real-time API connectivity checks</li>
        <li><strong>Model Selection</strong>: Per-PersonI model assignment with capability filtering</li>
        <li><strong>TTS Configuration</strong>: OpenAI voice selection (Alloy, Echo, Fable, Onyx, Nova, Shimmer)</li>
        <li><strong>Camera Permissions</strong>: Persistent across browser refreshes</li>
        <li><strong>Object Detection Threshold</strong>: Confidence level for object recognition</li>
      </ul>
    `;
  }

  render() {
    return html`
      <div class="header">
        <h2>❓ Nirvana Help & Documentation</h2>
        <button class="close-btn" @click=${this.handleClose}>×</button>
      </div>

      <div class="main-container">
        <div class="sidebar">
          <div class="nav-item ${this.activeSection === 'overview' ? 'active' : ''}" @click=${() => this.handleSectionClick('overview')}>
            🌌 Overview
          </div>
          <div class="nav-item ${this.activeSection === 'personi' ? 'active' : ''}" @click=${() => this.handleSectionClick('personi')}>
            🤖 PersonI System
          </div>
          <div class="nav-item ${this.activeSection === 'agentic' ? 'active' : ''}" @click=${() => this.handleSectionClick('agentic')}>
            🧠⚡ Agentic Intelligence
          </div>
          <div class="nav-item ${this.activeSection === 'connectors' ? 'active' : ''}" @click=${() => this.handleSectionClick('connectors')}>
            🔌 Connectors (32)
          </div>
          <div class="nav-item ${this.activeSection === 'memory' ? 'active' : ''}" @click=${() => this.handleSectionClick('memory')}>
            🧠 Memory & RAG
          </div>
          <div class="nav-item ${this.activeSection === 'routines' ? 'active' : ''}" @click=${() => this.handleSectionClick('routines')}>
            ⚡ Routines
          </div>
          <div class="nav-item ${this.activeSection === 'call-intelligence' ? 'active' : ''}" @click=${() => this.handleSectionClick('call-intelligence')}>
            📞🧠 Call Intelligence
          </div>
          <div class="nav-item ${this.activeSection === 'context-suggestions' ? 'active' : ''}" @click=${() => this.handleSectionClick('context-suggestions')}>
            💡 Context Suggestions
          </div>
          <div class="nav-item ${this.activeSection === 'calendar' ? 'active' : ''}" @click=${() => this.handleSectionClick('calendar')}>
            📅 Calendar
          </div>
          <div class="nav-item ${this.activeSection === 'environmental-awareness' ? 'active' : ''}" @click=${() => this.handleSectionClick('environmental-awareness')}>
            👁️ Environmental Awareness
          </div>
          <div class="nav-item ${this.activeSection === 'plugins' ? 'active' : ''}" @click=${() => this.handleSectionClick('plugins')}>
            🧩 Plugins
          </div>
          <div class="nav-item ${this.activeSection === 'telephony' ? 'active' : ''}" @click=${() => this.handleSectionClick('telephony')}>
            📞 Telephony
          </div>
          <div class="nav-item ${this.activeSection === 'voice-commands' ? 'active' : ''}" @click=${() => this.handleSectionClick('voice-commands')}>
            🎙️ Voice Commands
          </div>
          <div class="nav-item ${this.activeSection === 'privacy' ? 'active' : ''}" @click=${() => this.handleSectionClick('privacy')}>
            🔒 Privacy & Security
          </div>
          <div class="nav-item ${this.activeSection === 'settings' ? 'active' : ''}" @click=${() => this.handleSectionClick('settings')}>
            ⚙️ Settings
          </div>
          <div class="nav-item ${this.activeSection === 'setup' ? 'active' : ''}" @click=${() => this.handleSectionClick('setup')}>
            🚀 Setup & Installation
          </div>
        </div>

        <div class="content">
          ${this.activeSection === 'overview' ? this.renderOverview() : ''}
          ${this.activeSection === 'personi' ? this.renderPersonI() : ''}
          ${this.activeSection === 'agentic' ? this.renderAgentic() : ''}
          ${this.activeSection === 'connectors' ? this.renderConnectors() : ''}
          ${this.activeSection === 'memory' ? this.renderMemory() : ''}
          ${this.activeSection === 'routines' ? this.renderRoutines() : ''}
          ${this.activeSection === 'call-intelligence' ? this.renderCallIntelligence() : ''}
          ${this.activeSection === 'context-suggestions' ? this.renderContextSuggestions() : ''}
          ${this.activeSection === 'calendar' ? this.renderCalendar() : ''}
          ${this.activeSection === 'environmental-awareness' ? this.renderEnvironmentalAwareness() : ''}
          ${this.activeSection === 'plugins' ? this.renderPlugins() : ''}
          ${this.activeSection === 'telephony' ? this.renderTelephony() : ''}
          ${this.activeSection === 'voice-commands' ? this.renderVoiceCommands() : ''}
          ${this.activeSection === 'privacy' ? this.renderPrivacy() : ''}
          ${this.activeSection === 'settings' ? this.renderSettings() : ''}
          ${this.activeSection === 'setup' ? this.renderSetup() : ''}
        </div>
      </div>

      <div class="tts-controls">
        <button class="tts-btn ${this.isSpeaking ? 'speaking' : ''}" @click=${this.handleReadAloud}>
          ${this.isSpeaking ? '⏸️ Stop Reading' : '🔊 Read Aloud'}
        </button>
      </div>
    `;
  }
}
