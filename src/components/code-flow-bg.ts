/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

interface CodeToken {
  text: string;
  type: 'keyword' | 'string' | 'comment' | 'function' | 'variable' | 'operator' | 'number';
}

interface CodeLine {
  tokens: CodeToken[];
  indent: number;
}

interface Column {
  lines: CodeLine[];
  yOffset: number;
  speed: number;
}

@customElement('code-flow-bg')
export class CodeFlowBg extends LitElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private columns: Column[] = [];
  private animationFrame: number | null = null;
  private numColumns = 6;
  private lineHeight = 24;
  private fontSize = 14;
  private columnWidth = 0;
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

  private codeSnippets: CodeLine[] = [
    {
      tokens: [
        { text: 'def', type: 'keyword' },
        { text: ' fibonacci', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'n', type: 'variable' },
        { text: '):', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'if', type: 'keyword' },
        { text: ' n ', type: 'variable' },
        { text: '<=', type: 'operator' },
        { text: ' 1', type: 'number' },
        { text: ':', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [
        { text: 'return', type: 'keyword' },
        { text: ' n', type: 'variable' },
      ],
      indent: 2,
    },
    {
      tokens: [
        { text: 'return', type: 'keyword' },
        { text: ' fibonacci', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'n', type: 'variable' },
        { text: '-', type: 'operator' },
        { text: '1', type: 'number' },
        { text: ') +', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [
        { text: 'fibonacci', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'n', type: 'variable' },
        { text: '-', type: 'operator' },
        { text: '2', type: 'number' },
        { text: ')', type: 'operator' },
      ],
      indent: 2,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [
        { text: 'const', type: 'keyword' },
        { text: ' sum ', type: 'variable' },
        { text: '=', type: 'operator' },
        { text: ' (', type: 'operator' },
        { text: 'a', type: 'variable' },
        { text: ', ', type: 'operator' },
        { text: 'b', type: 'variable' },
        { text: ') ', type: 'operator' },
        { text: '=>', type: 'keyword' },
        { text: ' a ', type: 'variable' },
        { text: '+', type: 'operator' },
        { text: ' b', type: 'variable' },
        { text: ';', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'const', type: 'keyword' },
        { text: ' result ', type: 'variable' },
        { text: '=', type: 'operator' },
        { text: ' sum', type: 'function' },
        { text: '(', type: 'operator' },
        { text: '5', type: 'number' },
        { text: ', ', type: 'operator' },
        { text: '3', type: 'number' },
        { text: ');', type: 'operator' },
      ],
      indent: 0,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [
        { text: 'fn', type: 'keyword' },
        { text: ' main', type: 'function' },
        { text: '() {', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'println!', type: 'function' },
        { text: '(', type: 'operator' },
        { text: '"Hello, World!"', type: 'string' },
        { text: ');', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [{ text: '}', type: 'operator' }],
      indent: 0,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [{ text: '// Calculate factorial', type: 'comment' }],
      indent: 0,
    },
    {
      tokens: [
        { text: 'function', type: 'keyword' },
        { text: ' factorial', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'n', type: 'variable' },
        { text: ') {', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'if', type: 'keyword' },
        { text: ' (', type: 'operator' },
        { text: 'n ', type: 'variable' },
        { text: '===', type: 'operator' },
        { text: ' 0', type: 'number' },
        { text: ') ', type: 'operator' },
        { text: 'return', type: 'keyword' },
        { text: ' 1', type: 'number' },
        { text: ';', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [
        { text: 'return', type: 'keyword' },
        { text: ' n ', type: 'variable' },
        { text: '*', type: 'operator' },
        { text: ' factorial', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'n ', type: 'variable' },
        { text: '-', type: 'operator' },
        { text: ' 1', type: 'number' },
        { text: ');', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [{ text: '}', type: 'operator' }],
      indent: 0,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [
        { text: 'for', type: 'keyword' },
        { text: ' i ', type: 'variable' },
        { text: 'in', type: 'keyword' },
        { text: ' range', type: 'function' },
        { text: '(', type: 'operator' },
        { text: '10', type: 'number' },
        { text: '):', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'print', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'i ', type: 'variable' },
        { text: '*', type: 'operator' },
        { text: ' 2', type: 'number' },
        { text: ')', type: 'operator' },
      ],
      indent: 1,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [
        { text: 'class', type: 'keyword' },
        { text: ' Person', type: 'function' },
        { text: ':', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'def', type: 'keyword' },
        { text: ' __init__', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'self', type: 'keyword' },
        { text: ', ', type: 'operator' },
        { text: 'name', type: 'variable' },
        { text: '):', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [
        { text: 'self', type: 'keyword' },
        { text: '.', type: 'operator' },
        { text: 'name ', type: 'variable' },
        { text: '=', type: 'operator' },
        { text: ' name', type: 'variable' },
      ],
      indent: 2,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [
        { text: 'let', type: 'keyword' },
        { text: ' arr ', type: 'variable' },
        { text: '=', type: 'operator' },
        { text: ' [', type: 'operator' },
        { text: '1', type: 'number' },
        { text: ', ', type: 'operator' },
        { text: '2', type: 'number' },
        { text: ', ', type: 'operator' },
        { text: '3', type: 'number' },
        { text: '];', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'arr', type: 'variable' },
        { text: '.', type: 'operator' },
        { text: 'map', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'x ', type: 'variable' },
        { text: '=>', type: 'keyword' },
        { text: ' x ', type: 'variable' },
        { text: '*', type: 'operator' },
        { text: ' 2', type: 'number' },
        { text: ');', type: 'operator' },
      ],
      indent: 0,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [
        { text: 'impl', type: 'keyword' },
        { text: ' Display ', type: 'function' },
        { text: 'for', type: 'keyword' },
        { text: ' Point {', type: 'function' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'fn', type: 'keyword' },
        { text: ' fmt', type: 'function' },
        { text: '(', type: 'operator' },
        { text: '&self', type: 'keyword' },
        { text: ') ', type: 'operator' },
        { text: '->', type: 'operator' },
        { text: ' Result {', type: 'function' },
      ],
      indent: 1,
    },
    {
      tokens: [
        { text: 'write!', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'f', type: 'variable' },
        { text: ', ', type: 'operator' },
        { text: '"({}, {})"', type: 'string' },
        { text: ')', type: 'operator' },
      ],
      indent: 2,
    },
    {
      tokens: [{ text: '}', type: 'operator' }],
      indent: 1,
    },
    {
      tokens: [{ text: '}', type: 'operator' }],
      indent: 0,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [{ text: '/* Binary search */', type: 'comment' }],
      indent: 0,
    },
    {
      tokens: [
        { text: 'async', type: 'keyword' },
        { text: ' function', type: 'keyword' },
        { text: ' fetchData', type: 'function' },
        { text: '() {', type: 'operator' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'const', type: 'keyword' },
        { text: ' response ', type: 'variable' },
        { text: '=', type: 'operator' },
        { text: ' await', type: 'keyword' },
        { text: ' fetch', type: 'function' },
        { text: '(', type: 'operator' },
        { text: '"/api"', type: 'string' },
        { text: ');', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [
        { text: 'return', type: 'keyword' },
        { text: ' response', type: 'variable' },
        { text: '.', type: 'operator' },
        { text: 'json', type: 'function' },
        { text: '();', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [{ text: '}', type: 'operator' }],
      indent: 0,
    },
    { tokens: [], indent: 0 },
    {
      tokens: [
        { text: 'match', type: 'keyword' },
        { text: ' result {', type: 'variable' },
      ],
      indent: 0,
    },
    {
      tokens: [
        { text: 'Ok', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'value', type: 'variable' },
        { text: ') ', type: 'operator' },
        { text: '=>', type: 'keyword' },
        { text: ' println!', type: 'function' },
        { text: '(', type: 'operator' },
        { text: '"Success"', type: 'string' },
        { text: '),', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [
        { text: 'Err', type: 'function' },
        { text: '(', type: 'operator' },
        { text: 'e', type: 'variable' },
        { text: ') ', type: 'operator' },
        { text: '=>', type: 'keyword' },
        { text: ' eprintln!', type: 'function' },
        { text: '(', type: 'operator' },
        { text: '"Error"', type: 'string' },
        { text: '),', type: 'operator' },
      ],
      indent: 1,
    },
    {
      tokens: [{ text: '}', type: 'operator' }],
      indent: 0,
    },
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setupCanvas();
    this.startAnimation();
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
      this.initializeColumns();

      window.addEventListener('resize', this.resizeHandler);
    });
  }

  private handleResize() {
    this.resizeCanvas();
    this.initializeColumns();
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.columnWidth = this.canvas.width / this.numColumns;
  }

  private initializeColumns() {
    this.columns = [];
    for (let i = 0; i < this.numColumns; i++) {
      const lines: CodeLine[] = [];
      const numLines = Math.floor(Math.random() * 10) + 20;

      for (let j = 0; j < numLines; j++) {
        lines.push(
          this.codeSnippets[
            Math.floor(Math.random() * this.codeSnippets.length)
          ]
        );
      }

      this.columns.push({
        lines,
        yOffset: -Math.random() * this.canvas.height,
        speed: 20 + Math.random() * 10,
      });
    }
  }

  private getTokenColor(type: CodeToken['type']): string {
    switch (type) {
      case 'keyword':
        return '#ff4500';
      case 'string':
        return '#32cd32';
      case 'comment':
        return '#808080';
      case 'function':
        return '#ffd700';
      case 'variable':
        return '#ffffff';
      case 'operator':
        return '#ffffff';
      case 'number':
        return '#87ceeb';
      default:
        return '#ffffff';
    }
  }

  private drawCodeLine(
    line: CodeLine,
    x: number,
    y: number,
    opacity: number
  ) {
    if (!this.ctx) return;

    let currentX = x + line.indent * 20;

    this.ctx.font = `${this.fontSize}px "Fira Code", "Consolas", monospace`;

    for (const token of line.tokens) {
      this.ctx.fillStyle = this.getTokenColor(token.type);
      this.ctx.globalAlpha = opacity;
      this.ctx.fillText(token.text, currentX, y);
      currentX += this.ctx.measureText(token.text).width;
    }

    this.ctx.globalAlpha = 1;
  }

  private calculateOpacity(y: number): number {
    const fadeZone = 200;

    if (y < fadeZone) {
      return Math.max(0, y / fadeZone);
    } else if (y > this.canvas.height - fadeZone) {
      return Math.max(0, (this.canvas.height - y) / fadeZone);
    }

    return 1;
  }

  private drawColumn(column: Column, columnIndex: number) {
    if (!this.ctx) return;

    const x = columnIndex * this.columnWidth + 20;
    let currentY = column.yOffset;

    for (const line of column.lines) {
      currentY += this.lineHeight;

      if (currentY < -this.lineHeight || currentY > this.canvas.height + this.lineHeight) {
        continue;
      }

      const opacity = this.calculateOpacity(currentY);
      this.drawCodeLine(line, x, currentY, opacity);
    }
  }

  private updateColumns(deltaTime: number) {
    for (const column of this.columns) {
      column.yOffset += (column.speed * deltaTime) / 1000;

      if (column.yOffset > this.canvas.height + this.lineHeight * 2) {
        column.yOffset = -column.lines.length * this.lineHeight;

        const newLines: CodeLine[] = [];
        const numLines = Math.floor(Math.random() * 10) + 20;
        for (let j = 0; j < numLines; j++) {
          newLines.push(
            this.codeSnippets[
              Math.floor(Math.random() * this.codeSnippets.length)
            ]
          );
        }
        column.lines = newLines;
      }
    }
  }

  private drawScene() {
    if (!this.ctx) return;

    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      this.canvas.height
    );
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#2a2a2a');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.columns.length; i++) {
      this.drawColumn(this.columns[i], i);
    }
  }

  private lastFrameTime = performance.now();

  private startAnimation() {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.updateColumns(deltaTime);
    this.drawScene();

    this.animationFrame = requestAnimationFrame(() => this.startAnimation());
  }

  render() {
    return html`<canvas></canvas>`;
  }
}
