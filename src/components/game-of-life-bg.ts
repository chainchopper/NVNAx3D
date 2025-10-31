/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('game-of-life-bg')
export class GameOfLifeBg extends LitElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private grid: boolean[][] = [];
  private cellSize = 10;
  private rows = 0;
  private cols = 0;
  private animationFrame: number | null = null;
  private lastUpdateTime = 0;
  private updateInterval = 100;
  private resizeHandler: () => void;

  constructor() {
    super();
    this.resizeHandler = this.handleResize.bind(this);
  }

  static styles = css`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.setupCanvas();
    this.startGameLoop();
    
    // GAME OF LIFE PERSISTENCE - Load saved state
    this.loadGameState();
    
    // Save state every 60 seconds
    setInterval(() => {
      this.saveGameState();
    }, 60000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    window.removeEventListener('resize', this.resizeHandler);
  }

  private setupCanvas() {
    this.updateComplete.then(() => {
      this.canvas = this.renderRoot.querySelector('canvas')!;
      if (!this.canvas) return;

      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      this.ctx = ctx;

      this.resizeCanvas();
      this.initializeGrid();

      window.addEventListener('resize', this.resizeHandler);
    });
  }

  private handleResize() {
    this.resizeCanvas();
    this.initializeGrid();
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.rows = Math.floor(this.canvas.height / this.cellSize);
    this.cols = Math.floor(this.canvas.width / this.cellSize);
  }

  private initializeGrid() {
    // Check if we have saved state first
    const savedGrid = this.getSavedGrid();
    if (savedGrid && savedGrid.rows === this.rows && savedGrid.cols === this.cols) {
      this.grid = savedGrid.grid;
      console.log('[GameOfLife] Restored saved state');
      return;
    }
    
    // Otherwise initialize randomly with session ID influence
    const sessionId = localStorage.getItem('nirvana-session-id') || 'default';
    const sessionSeed = sessionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const density = 0.25 + (sessionSeed % 20) / 100; // 0.25-0.45 density based on session
    
    this.grid = Array(this.rows)
      .fill(null)
      .map(() => Array(this.cols).fill(false));

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        this.grid[i][j] = Math.random() < density;
      }
    }

    this.addGlider(5, 5);
    this.addGlider(15, 20);
    this.addGlider(30, 10);
  }
  
  private saveGameState() {
    try {
      const state = {
        grid: this.grid,
        rows: this.rows,
        cols: this.cols,
        timestamp: Date.now()
      };
      localStorage.setItem('nirvana-gol-state', JSON.stringify(state));
      console.log('[GameOfLife] State saved');
    } catch (error) {
      console.error('[GameOfLife] Failed to save state:', error);
    }
  }
  
  private loadGameState() {
    try {
      const saved = localStorage.getItem('nirvana-gol-state');
      if (saved) {
        const state = JSON.parse(saved);
        // Only use if less than 5 minutes old
        if (Date.now() - state.timestamp < 5 * 60 * 1000) {
          console.log('[GameOfLife] Found recent saved state');
        }
      }
    } catch (error) {
      console.error('[GameOfLife] Failed to load state:', error);
    }
  }
  
  private getSavedGrid() {
    try {
      const saved = localStorage.getItem('nirvana-gol-state');
      if (saved) {
        const state = JSON.parse(saved);
        // Only use if less than 5 minutes old
        if (Date.now() - state.timestamp < 5 * 60 * 1000) {
          return state;
        }
      }
    } catch (error) {
      console.error('[GameOfLife] Failed to get saved grid:', error);
    }
    return null;
  }

  private addGlider(row: number, col: number) {
    if (
      row + 2 < this.rows &&
      col + 2 < this.cols &&
      row >= 0 &&
      col >= 0
    ) {
      this.grid[row][col + 1] = true;
      this.grid[row + 1][col + 2] = true;
      this.grid[row + 2][col] = true;
      this.grid[row + 2][col + 1] = true;
      this.grid[row + 2][col + 2] = true;
    }
  }

  private countNeighbors(row: number, col: number): number {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;

        const newRow = (row + i + this.rows) % this.rows;
        const newCol = (col + j + this.cols) % this.cols;

        if (this.grid[newRow][newCol]) count++;
      }
    }
    return count;
  }

  private nextGeneration() {
    const newGrid = this.grid.map((row) => [...row]);

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const neighbors = this.countNeighbors(i, j);

        if (this.grid[i][j]) {
          newGrid[i][j] = neighbors === 2 || neighbors === 3;
        } else {
          newGrid[i][j] = neighbors === 3;
        }
      }
    }

    this.grid = newGrid;

    if (Math.random() < 0.01) {
      const randomRow = Math.floor(Math.random() * this.rows);
      const randomCol = Math.floor(Math.random() * this.cols);
      this.addGlider(randomRow, randomCol);
    }
  }

  private drawGrid() {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#00ff00';
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.grid[i][j]) {
          this.ctx.fillRect(
            j * this.cellSize,
            i * this.cellSize,
            this.cellSize - 1,
            this.cellSize - 1
          );
        }
      }
    }
  }

  private startGameLoop() {
    const currentTime = performance.now();

    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.drawGrid();
      this.nextGeneration();
      this.lastUpdateTime = currentTime;
    }

    this.animationFrame = requestAnimationFrame(() => this.startGameLoop());
  }

  render() {
    return html`<canvas></canvas>`;
  }
}
