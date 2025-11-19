/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css} from 'lit';
import {customElement, state} from 'lit/decorators.js';

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  data: string | ArrayBuffer;
  timestamp: number;
}

@customElement('file-upload')
export class FileUpload extends LitElement {
  @state() private isDragging = false;
  @state() private uploadedFiles: UploadedFile[] = [];
  @state() private isProcessing = false;
  @state() private processingStatus = '';

  static styles = css`
    :host {
      display: block;
    }

    .upload-container {
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 1000;
    }

    .upload-button {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: 2px solid rgba(255, 255, 255, 0.2);
      color: white;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
    }

    .upload-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .upload-button:active {
      transform: translateY(-1px);
    }

    .drop-zone {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .drop-zone.active {
      opacity: 1;
      pointer-events: all;
    }

    .drop-zone.dragging {
      background: rgba(102, 126, 234, 0.2);
    }

    .drop-content {
      text-align: center;
      color: white;
      pointer-events: none;
    }

    .drop-icon {
      font-size: 80px;
      margin-bottom: 20px;
      filter: drop-shadow(0 0 20px rgba(102, 126, 234, 0.6));
    }

    .drop-text {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .drop-subtext {
      font-size: 16px;
      opacity: 0.7;
    }

    .file-input {
      display: none;
    }

    .file-list {
      position: fixed;
      bottom: 150px;
      right: 20px;
      max-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(15px);
      border-radius: 12px;
      padding: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 1000;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.2s ease;
    }

    .file-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .file-icon {
      font-size: 20px;
    }

    .file-info {
      flex: 1;
      min-width: 0;
    }

    .file-name {
      color: white;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-size {
      color: rgba(255, 255, 255, 0.5);
      font-size: 11px;
    }

    .file-remove {
      background: rgba(255, 59, 48, 0.2);
      border: 1px solid rgba(255, 59, 48, 0.4);
      color: #ff3b30;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .file-remove:hover {
      background: rgba(255, 59, 48, 0.4);
    }

    .processing-overlay {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(15px);
      border-radius: 16px;
      padding: 30px 40px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
      z-index: 10000;
    }

    .processing-spinner {
      font-size: 48px;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .processing-text {
      color: white;
      font-size: 16px;
      font-weight: 500;
      margin-top: 16px;
    }

    .supported-formats {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 8px;
    }
  `;

  private handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    this.isDragging = true;
  };

  private handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (e.target === this.shadowRoot?.querySelector('.drop-zone')) {
      this.isDragging = false;
    }
  };

  private handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  private handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    this.isDragging = false;

    const files = Array.from(e.dataTransfer?.files || []);
    await this.processFiles(files);
  };

  private handleFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    await this.processFiles(files);
    input.value = '';
  };

  private async processFiles(files: File[]) {
    this.isProcessing = true;
    
    for (const file of files) {
      this.processingStatus = `Processing ${file.name}...`;
      
      try {
        const uploadedFile = await this.readFile(file);
        this.uploadedFiles = [...this.uploadedFiles, uploadedFile];
        
        this.dispatchEvent(new CustomEvent('file-uploaded', {
          detail: { file: uploadedFile },
          bubbles: true,
          composed: true
        }));
        
        console.log('[FileUpload] File processed:', file.name, file.type);
      } catch (error) {
        console.error('[FileUpload] Failed to process file:', file.name, error);
      }
    }
    
    this.isProcessing = false;
    this.processingStatus = '';
  }

  private async readFile(file: File): Promise<UploadedFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type || this.detectFileType(file.name),
          size: file.size,
          data: reader.result as string | ArrayBuffer,
          timestamp: Date.now()
        });
      };
      
      reader.onerror = () => reject(reader.error);
      
      if (file.type.startsWith('image/') || 
          file.type.startsWith('video/') || 
          file.type.startsWith('audio/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  private detectFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mp3',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'pdf': 'application/pdf',
      'json': 'application/json',
      'csv': 'text/csv',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'xml': 'application/xml'
    };
    return typeMap[ext || ''] || 'application/octet-stream';
  }

  private getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('json')) return '📋';
    if (type.includes('csv')) return '📊';
    if (type.includes('text') || type.includes('markdown')) return '📝';
    if (type.includes('xml')) return '🔖';
    return '📎';
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private removeFile(index: number) {
    this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);
  }

  /**
   * Public method to open file picker (callable from parent components)
   */
  public openFilePicker() {
    const input = this.shadowRoot?.querySelector('.file-input') as HTMLInputElement;
    input?.click();
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('dragenter', this.handleDragEnter);
    document.addEventListener('dragleave', this.handleDragLeave);
    document.addEventListener('dragover', this.handleDragOver);
    document.addEventListener('drop', this.handleDrop);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('dragenter', this.handleDragEnter);
    document.removeEventListener('dragleave', this.handleDragLeave);
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('drop', this.handleDrop);
  }

  render() {
    return html`
      <div class="upload-container">
        <button class="upload-button" @click="${this.openFilePicker}" title="Upload Files">
          📎
        </button>
        
        <input
          type="file"
          class="file-input"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.json,.csv,.txt,.md,.xml"
          @change="${this.handleFileSelect}"
        />
      </div>

      <div class="drop-zone ${this.isDragging ? 'active dragging' : ''}">
        <div class="drop-content">
          <div class="drop-icon">📎</div>
          <div class="drop-text">Drop files here</div>
          <div class="drop-subtext">
            Images, Videos, Audio, PDFs, Text, JSON, CSV, XML
          </div>
        </div>
      </div>

      ${this.uploadedFiles.length > 0 ? html`
        <div class="file-list">
          ${this.uploadedFiles.map((file, index) => html`
            <div class="file-item">
              <span class="file-icon">${this.getFileIcon(file.type)}</span>
              <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-size">${this.formatFileSize(file.size)}</div>
              </div>
              <button class="file-remove" @click="${() => this.removeFile(index)}">
                ×
              </button>
            </div>
          `)}
        </div>
      ` : ''}

      ${this.isProcessing ? html`
        <div class="processing-overlay">
          <div class="processing-spinner">⚙️</div>
          <div class="processing-text">${this.processingStatus}</div>
        </div>
      ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'file-upload': FileUpload;
  }
}
