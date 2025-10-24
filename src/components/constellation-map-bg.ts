/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

interface Star {
  x: number;
  y: number;
  radius: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface Constellation {
  stars: number[];
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  active: boolean;
}

@customElement('constellation-map-bg')
export class ConstellationMapBg extends LitElement {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private constellations: Constellation[] = [];
  private shootingStar: ShootingStar | null = null;
  private animationFrame: number | null = null;
  private frameCount = 0;
  private rotationAngle = 0;

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
    this.startAnimation();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private setupCanvas() {
    this.updateComplete.then(() => {
      this.canvas = this.renderRoot.querySelector('canvas')!;
      if (!this.canvas) return;

      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      this.ctx = ctx;

      this.resizeCanvas();
      this.generateStars();
      this.generateConstellations();

      window.addEventListener('resize', () => this.handleResize());
    });
  }

  private handleResize() {
    this.resizeCanvas();
    this.generateStars();
    this.generateConstellations();
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private generateStars() {
    this.stars = [];
    const starCount = 120;

    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private generateConstellations() {
    this.constellations = [];
    const maxDistance = 150;
    const visited = new Set<number>();

    for (let i = 0; i < this.stars.length; i++) {
      if (visited.has(i)) continue;

      const constellation: number[] = [i];
      visited.add(i);

      for (let j = i + 1; j < this.stars.length; j++) {
        if (visited.has(j)) continue;

        const star1 = this.stars[i];
        const star2 = this.stars[j];
        const distance = Math.sqrt(
          Math.pow(star1.x - star2.x, 2) + Math.pow(star1.y - star2.y, 2)
        );

        if (distance < maxDistance && constellation.length < 7) {
          constellation.push(j);
          visited.add(j);
        }
      }

      if (constellation.length >= 3) {
        this.constellations.push({
          stars: constellation,
          color: '#9932cc88',
        });
      }
    }
  }

  private createShootingStar() {
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;

    switch (side) {
      case 0:
        x = Math.random() * this.canvas.width;
        y = 0;
        vx = (Math.random() - 0.5) * 4;
        vy = Math.random() * 3 + 2;
        break;
      case 1:
        x = this.canvas.width;
        y = Math.random() * this.canvas.height;
        vx = -(Math.random() * 3 + 2);
        vy = (Math.random() - 0.5) * 4;
        break;
      case 2:
        x = Math.random() * this.canvas.width;
        y = this.canvas.height;
        vx = (Math.random() - 0.5) * 4;
        vy = -(Math.random() * 3 + 2);
        break;
      default:
        x = 0;
        y = Math.random() * this.canvas.height;
        vx = Math.random() * 3 + 2;
        vy = (Math.random() - 0.5) * 4;
        break;
    }

    this.shootingStar = {
      x,
      y,
      vx,
      vy,
      length: 30,
      opacity: 1,
      active: true,
    };
  }

  private updateShootingStar() {
    if (!this.shootingStar || !this.shootingStar.active) return;

    this.shootingStar.x += this.shootingStar.vx;
    this.shootingStar.y += this.shootingStar.vy;
    this.shootingStar.opacity -= 0.01;

    if (
      this.shootingStar.opacity <= 0 ||
      this.shootingStar.x < -100 ||
      this.shootingStar.x > this.canvas.width + 100 ||
      this.shootingStar.y < -100 ||
      this.shootingStar.y > this.canvas.height + 100
    ) {
      this.shootingStar.active = false;
      this.shootingStar = null;
    }
  }

  private drawShootingStar() {
    if (!this.shootingStar || !this.shootingStar.active) return;

    const { x, y, vx, vy, length, opacity } = this.shootingStar;

    const gradient = this.ctx.createLinearGradient(
      x,
      y,
      x - vx * length,
      y - vy * length
    );
    gradient.addColorStop(0, `rgba(255, 215, 0, ${opacity})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x - vx * length, y - vy * length);
    this.ctx.stroke();
  }

  private drawScene() {
    if (!this.ctx) return;

    this.ctx.fillStyle = '#2d1b4e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.rotate(this.rotationAngle);
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);

    this.ctx.strokeStyle = '#9932cc88';
    this.ctx.lineWidth = 1;

    for (const constellation of this.constellations) {
      for (let i = 0; i < constellation.stars.length - 1; i++) {
        const star1 = this.stars[constellation.stars[i]];
        const star2 = this.stars[constellation.stars[i + 1]];

        this.ctx.beginPath();
        this.ctx.moveTo(star1.x, star1.y);
        this.ctx.lineTo(star2.x, star2.y);
        this.ctx.stroke();
      }
    }

    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed;
      const alpha = 0.5 + 0.5 * Math.sin(star.twinklePhase);

      const gradient = this.ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        star.radius * 3
      );

      const color = star.brightness > 0.5 ? '255, 215, 0' : '255, 255, 255';
      gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(${color}, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();

    this.drawShootingStar();
  }

  private startAnimation() {
    this.frameCount++;

    if (this.frameCount % 200 === 0 && Math.random() < 0.5) {
      this.createShootingStar();
    }

    this.rotationAngle += 0.0001;

    this.updateShootingStar();
    this.drawScene();

    this.animationFrame = requestAnimationFrame(() => this.startAnimation());
  }

  render() {
    return html`<canvas></canvas>`;
  }
}
