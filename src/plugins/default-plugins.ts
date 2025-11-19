/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Plugin } from '../types/plugin-types';

/**
 * Default plugins shipped with Nirvana
 * These are auto-imported on first load
 */
export const DEFAULT_PLUGINS: Plugin[] = [
  {
    metadata: {
      id: 'system-monitor',
      name: 'System Monitor',
      description: 'Real-time system status, active PersonI, and performance metrics',
      author: 'Nirvana',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'dashboard',
      tags: ['system', 'monitoring', 'performance'],
    },
    component: {
      template: `
        <div class="system-monitor">
          <div class="monitor-header">
            <div class="status-indicator"></div>
            <h3>System Monitor</h3>
          </div>
          
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-label">Active PersonI</div>
              <div class="metric-value" id="active-personi">-</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Conversations</div>
              <div class="metric-value" id="conversation-count">0</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Memory Items</div>
              <div class="metric-value" id="memory-count">0</div>
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Active Plugins</div>
              <div class="metric-value" id="plugin-count">0</div>
            </div>
          </div>
          
          <div class="provider-status">
            <div class="provider-label">Model Provider</div>
            <div class="provider-name" id="provider-name">-</div>
          </div>
        </div>
      `,
      styles: `
        .system-monitor {
          padding: 16px;
          background: rgba(20, 20, 40, 0.95);
          border-radius: 12px;
          border: 1px solid rgba(100, 200, 255, 0.3);
          font-family: system-ui, sans-serif;
          color: white;
        }
        
        .monitor-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4caf50;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .monitor-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .metric-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .metric-card {
          background: rgba(0, 0, 0, 0.3);
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .metric-label {
          font-size: 11px;
          opacity: 0.7;
          margin-bottom: 4px;
        }
        
        .metric-value {
          font-size: 20px;
          font-weight: 700;
          color: #87ceeb;
        }
        
        .provider-status {
          background: rgba(33, 150, 243, 0.1);
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(33, 150, 243, 0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .provider-label {
          font-size: 12px;
          opacity: 0.8;
        }
        
        .provider-name {
          font-weight: 600;
          color: #64b5f6;
        }
      `,
      props: {},
      events: {},
    },
    enabled: true,
    autoLoad: false,
  },
  
  {
    metadata: {
      id: 'quick-notes',
      name: 'Quick Notes',
      description: 'Fast, ephemeral notepad for capturing thoughts and ideas',
      author: 'Nirvana',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'form',
      tags: ['notes', 'productivity', 'writing'],
    },
    component: {
      template: `
        <div class="quick-notes">
          <div class="notes-header">
            <h3>📝 Quick Notes</h3>
            <button class="clear-btn" id="clear-notes">Clear</button>
          </div>
          
          <textarea 
            class="notes-input" 
            id="notes-textarea"
            placeholder="Type your quick notes here...&#10;&#10;Perfect for:&#10;• Meeting notes&#10;• Ideas & thoughts&#10;• Quick reminders&#10;• Code snippets"
          ></textarea>
          
          <div class="notes-footer">
            <span class="char-count" id="char-count">0 characters</span>
            <span class="auto-save-indicator" id="save-status">Auto-saved</span>
          </div>
        </div>
      `,
      styles: `
        .quick-notes {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(20, 20, 40, 0.95);
          border-radius: 12px;
          border: 1px solid rgba(100, 200, 255, 0.3);
          overflow: hidden;
          font-family: system-ui, sans-serif;
          color: white;
        }
        
        .notes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .notes-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .clear-btn {
          padding: 6px 12px;
          background: rgba(244, 67, 54, 0.2);
          border: 1px solid rgba(244, 67, 54, 0.4);
          border-radius: 6px;
          color: #ff5252;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .clear-btn:hover {
          background: rgba(244, 67, 54, 0.3);
          border-color: rgba(244, 67, 54, 0.6);
        }
        
        .notes-input {
          flex: 1;
          padding: 16px;
          background: transparent;
          border: none;
          color: white;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.6;
          resize: none;
          outline: none;
        }
        
        .notes-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        
        .notes-footer {
          display: flex;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 11px;
          opacity: 0.7;
        }
        
        .auto-save-indicator {
          color: #4caf50;
        }
      `,
      props: {},
      events: {},
    },
    enabled: true,
    autoLoad: false,
  },
  
  {
    metadata: {
      id: 'crypto-ticker',
      name: 'Crypto Ticker',
      description: 'Live cryptocurrency prices and 24h changes',
      author: 'Nirvana',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'dashboard',
      tags: ['crypto', 'finance', 'market', 'real-time'],
    },
    component: {
      template: `
        <div class="crypto-ticker">
          <div class="ticker-header">
            <h3>₿ Crypto Ticker</h3>
            <div class="refresh-btn" id="refresh">↻</div>
          </div>
          
          <div class="crypto-list">
            <div class="crypto-item">
              <div class="crypto-info">
                <span class="crypto-symbol">BTC</span>
                <span class="crypto-name">Bitcoin</span>
              </div>
              <div class="crypto-data">
                <div class="crypto-price" id="btc-price">$--,---</div>
                <div class="crypto-change positive" id="btc-change">+0.00%</div>
              </div>
            </div>
            
            <div class="crypto-item">
              <div class="crypto-info">
                <span class="crypto-symbol">ETH</span>
                <span class="crypto-name">Ethereum</span>
              </div>
              <div class="crypto-data">
                <div class="crypto-price" id="eth-price">$--,---</div>
                <div class="crypto-change positive" id="eth-change">+0.00%</div>
              </div>
            </div>
            
            <div class="crypto-item">
              <div class="crypto-info">
                <span class="crypto-symbol">SOL</span>
                <span class="crypto-name">Solana</span>
              </div>
              <div class="crypto-data">
                <div class="crypto-price" id="sol-price">$---</div>
                <div class="crypto-change positive" id="sol-change">+0.00%</div>
              </div>
            </div>
          </div>
          
          <div class="ticker-footer">
            <span class="update-time" id="update-time">Updated: Never</span>
          </div>
        </div>
      `,
      styles: `
        .crypto-ticker {
          background: rgba(20, 20, 40, 0.95);
          border-radius: 12px;
          border: 1px solid rgba(255, 215, 0, 0.3);
          font-family: system-ui, sans-serif;
          color: white;
          overflow: hidden;
        }
        
        .ticker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: rgba(255, 215, 0, 0.1);
          border-bottom: 1px solid rgba(255, 215, 0, 0.2);
        }
        
        .ticker-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #ffd700;
        }
        
        .refresh-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 215, 0, 0.2);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 18px;
        }
        
        .refresh-btn:hover {
          background: rgba(255, 215, 0, 0.3);
          transform: rotate(180deg);
        }
        
        .crypto-list {
          padding: 8px;
        }
        
        .crypto-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          margin-bottom: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .crypto-item:last-child {
          margin-bottom: 0;
        }
        
        .crypto-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .crypto-symbol {
          font-weight: 700;
          font-size: 15px;
          color: #ffd700;
        }
        
        .crypto-name {
          font-size: 11px;
          opacity: 0.6;
        }
        
        .crypto-data {
          text-align: right;
        }
        
        .crypto-price {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        
        .crypto-change {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .crypto-change.positive {
          background: rgba(76, 175, 80, 0.2);
          color: #4caf50;
        }
        
        .crypto-change.negative {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
        }
        
        .ticker-footer {
          padding: 10px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
          font-size: 10px;
          opacity: 0.6;
        }
      `,
      props: {},
      events: {},
    },
    enabled: true,
    autoLoad: false,
  },
  
  {
    metadata: {
      id: 'memory-browser',
      name: 'Memory Browser',
      description: 'Browse and search your PersonI memory and RAG database',
      author: 'Nirvana',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'list',
      tags: ['memory', 'rag', 'search', 'database'],
    },
    component: {
      template: `
        <div class="memory-browser">
          <div class="browser-header">
            <h3>🧠 Memory Browser</h3>
          </div>
          
          <div class="search-box">
            <input 
              type="text" 
              class="search-input" 
              id="memory-search"
              placeholder="Search memories..."
            />
          </div>
          
          <div class="memory-list" id="memory-list">
            <div class="memory-empty">
              <div class="empty-icon">💭</div>
              <div>No memories found</div>
              <div class="empty-hint">Memories will appear here as you interact with PersonI</div>
            </div>
          </div>
          
          <div class="browser-footer">
            <button class="action-btn" id="clear-memories">Clear All</button>
            <button class="action-btn primary" id="refresh-memories">Refresh</button>
          </div>
        </div>
      `,
      styles: `
        .memory-browser {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: rgba(20, 20, 40, 0.95);
          border-radius: 12px;
          border: 1px solid rgba(156, 39, 176, 0.3);
          overflow: hidden;
          font-family: system-ui, sans-serif;
          color: white;
        }
        
        .browser-header {
          padding: 14px 16px;
          background: rgba(156, 39, 176, 0.2);
          border-bottom: 1px solid rgba(156, 39, 176, 0.3);
        }
        
        .browser-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #ba68c8;
        }
        
        .search-box {
          padding: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .search-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 14px;
        }
        
        .search-input:focus {
          outline: none;
          border-color: rgba(156, 39, 176, 0.5);
        }
        
        .memory-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }
        
        .memory-empty {
          text-align: center;
          padding: 40px 20px;
          opacity: 0.6;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        
        .empty-hint {
          font-size: 11px;
          margin-top: 8px;
          opacity: 0.7;
        }
        
        .browser-footer {
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          gap: 8px;
        }
        
        .action-btn {
          flex: 1;
          padding: 10px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .action-btn.primary {
          background: rgba(156, 39, 176, 0.3);
          border-color: rgba(156, 39, 176, 0.5);
          color: #ba68c8;
        }
        
        .action-btn.primary:hover {
          background: rgba(156, 39, 176, 0.4);
        }
      `,
      props: {},
      events: {},
    },
    enabled: true,
    autoLoad: false,
  },

  {
    metadata: {
      id: 'conversation-stats',
      name: 'Conversation Stats',
      description: 'Analytics and insights about your AI conversations',
      author: 'Nirvana',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: 'chart',
      tags: ['analytics', 'statistics', 'insights', 'conversation'],
    },
    component: {
      template: `
        <div class="conversation-stats">
          <div class="stats-header">
            <h3>📊 Conversation Stats</h3>
            <div class="timeframe-selector">
              <button class="timeframe-btn active" data-range="today">Today</button>
              <button class="timeframe-btn" data-range="week">Week</button>
              <button class="timeframe-btn" data-range="all">All</button>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card primary">
              <div class="stat-icon">💬</div>
              <div class="stat-content">
                <div class="stat-value" id="total-messages">0</div>
                <div class="stat-label">Total Messages</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">⏱️</div>
              <div class="stat-content">
                <div class="stat-value" id="avg-response">--ms</div>
                <div class="stat-label">Avg Response</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">🎯</div>
              <div class="stat-content">
                <div class="stat-value" id="function-calls">0</div>
                <div class="stat-label">Function Calls</div>
              </div>
            </div>
            
            <div class="stat-card">
              <div class="stat-icon">👁️</div>
              <div class="stat-content">
                <div class="stat-value" id="vision-requests">0</div>
                <div class="stat-label">Vision Requests</div>
              </div>
            </div>
          </div>
          
          <div class="insights-section">
            <div class="insights-title">Top Topics</div>
            <div class="topic-list">
              <div class="topic-item">
                <div class="topic-bar" style="width: 100%"></div>
                <span class="topic-label">General Chat</span>
                <span class="topic-count">42</span>
              </div>
              <div class="topic-item">
                <div class="topic-bar" style="width: 65%"></div>
                <span class="topic-label">Code Help</span>
                <span class="topic-count">27</span>
              </div>
              <div class="topic-item">
                <div class="topic-bar" style="width: 40%"></div>
                <span class="topic-label">Research</span>
                <span class="topic-count">16</span>
              </div>
            </div>
          </div>
        </div>
      `,
      styles: `
        .conversation-stats {
          background: rgba(20, 20, 40, 0.95);
          border-radius: 12px;
          border: 1px solid rgba(33, 150, 243, 0.3);
          font-family: system-ui, sans-serif;
          color: white;
          overflow: hidden;
        }
        
        .stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: rgba(33, 150, 243, 0.1);
          border-bottom: 1px solid rgba(33, 150, 243, 0.2);
        }
        
        .stats-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .timeframe-selector {
          display: flex;
          gap: 4px;
          background: rgba(0, 0, 0, 0.3);
          padding: 3px;
          border-radius: 6px;
        }
        
        .timeframe-btn {
          padding: 4px 10px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .timeframe-btn.active {
          background: rgba(33, 150, 243, 0.3);
          color: white;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 16px;
        }
        
        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.3);
          padding: 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-card.primary {
          grid-column: 1 / -1;
          background: rgba(33, 150, 243, 0.15);
          border-color: rgba(33, 150, 243, 0.3);
        }
        
        .stat-icon {
          font-size: 28px;
        }
        
        .stat-content {
          flex: 1;
        }
        
        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #64b5f6;
          line-height: 1.2;
        }
        
        .stat-label {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 2px;
        }
        
        .insights-section {
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .insights-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 12px;
          opacity: 0.9;
        }
        
        .topic-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .topic-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          font-size: 12px;
        }
        
        .topic-bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: rgba(33, 150, 243, 0.2);
          border-radius: 6px;
          transition: width 0.3s;
        }
        
        .topic-label {
          position: relative;
          flex: 1;
        }
        
        .topic-count {
          position: relative;
          font-weight: 600;
          color: #64b5f6;
        }
      `,
      props: {},
      events: {},
    },
    enabled: true,
    autoLoad: false,
  },
];
