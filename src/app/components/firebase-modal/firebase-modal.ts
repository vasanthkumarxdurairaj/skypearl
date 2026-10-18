import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { FirebaseConfigOptions } from '../../models/workspace.model';

@Component({
  selector: 'app-firebase-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-icon-title">
            <div class="fb-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div>
              <h2 class="modal-title">Firebase Connection Config</h2>
              <p class="modal-subtitle">Connect live Google Firebase project or use interactive demo</p>
            </div>
          </div>
          <button class="btn-icon-close" (click)="close.emit()" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Connection Status -->
        <div class="status-box" [ngClass]="firebaseService.isDemoMode() ? 'status-demo' : 'status-live'">
          <div class="status-indicator">
            <span class="status-pulse"></span>
            <strong>Status:</strong>
            @if (firebaseService.isDemoMode()) {
              <span>Interactive Collaborative Demo (In-Memory + LocalStorage)</span>
            } @else {
              <span>Connected to Cloud Firebase (Project: {{ firebaseService.projectId() }})</span>
            }
          </div>
          @if (!firebaseService.isDemoMode()) {
            <button class="btn btn-secondary btn-sm" (click)="onDisconnect()">Disconnect Live</button>
          }
        </div>

        <!-- Instructions Accordion / Quick Guide -->
        <div class="quick-guide">
          <h4 class="guide-title">How to get your Firebase configuration:</h4>
          <ol class="guide-steps">
            <li>Open the <a href="https://console.firebase.google.com" target="_blank" rel="noopener">Firebase Console</a> and create or select a project.</li>
            <li>In <strong>Project Settings > General</strong>, scroll to <em>Your apps</em> and register a Web app (<code>&lt;/&gt;</code>).</li>
            <li>Copy the <code>firebaseConfig</code> object and paste the values below.</li>
            <li>In the Firebase Console, enable <strong>Authentication</strong> (Email/Password & Google) and <strong>Cloud Firestore</strong>.</li>
          </ol>
        </div>

        <!-- Credentials Form -->
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">API Key *</label>
            <input type="text" class="form-control" placeholder="Enter API key" [(ngModel)]="config.apiKey" />
          </div>

          <div class="form-group">
            <label class="form-label">Project ID *</label>
            <input type="text" class="form-control" placeholder="skypearl-prod-123" [(ngModel)]="config.projectId" />
          </div>

          <div class="form-group">
            <label class="form-label">Auth Domain</label>
            <input type="text" class="form-control" placeholder="skypearl.firebaseapp.com" [(ngModel)]="config.authDomain" />
          </div>

          <div class="form-group">
            <label class="form-label">Storage Bucket</label>
            <input type="text" class="form-control" placeholder="skypearl.appspot.com" [(ngModel)]="config.storageBucket" />
          </div>

          <div class="form-group">
            <label class="form-label">Messaging Sender ID</label>
            <input type="text" class="form-control" placeholder="1029384756" [(ngModel)]="config.messagingSenderId" />
          </div>

          <div class="form-group">
            <label class="form-label">App ID</label>
            <input type="text" class="form-control" placeholder="1:1029384756:web:abcd1234ef56" [(ngModel)]="config.appId" />
          </div>
        </div>

        <!-- JSON Quick Paste -->
        <div class="form-group">
          <label class="form-label">Or Paste full <code>firebaseConfig = {{ '{ ... }' }}</code> snippet:</label>
          <textarea 
            class="form-control json-box" 
            placeholder='const firebaseConfig = { apiKey: "...", projectId: "..." };' 
            [(ngModel)]="rawJsonInput"
            (input)="parseRawJson()"></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="onSave()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Connect & Save
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-icon-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .fb-icon {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .modal-title {
      font-size: 1.25rem;
      margin-bottom: 2px;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .btn-icon-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      transition: all 0.15s ease;
    }

    .status-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      font-size: 0.85rem;
    }

    .status-demo {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #b45309;
    }
    body.dark-theme .status-demo {
      color: #fcd34d;
    }

    .status-live {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #15803d;
    }
    body.dark-theme .status-live {
      color: #6ee7b7;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .quick-guide {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      margin-bottom: 20px;
    }

    .guide-title {
      font-size: 0.82rem;
      color: var(--text-main);
      margin-bottom: 8px;
    }

    .guide-steps {
      padding-left: 20px;
      font-size: 0.78rem;
      color: var(--text-muted);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .guide-steps a {
      color: var(--primary);
      text-decoration: underline;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .json-box {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      min-height: 70px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
      margin-top: 10px;
    }
  `]
})
export class FirebaseModalComponent {
  public firebaseService = inject(FirebaseService);
  public close = output<void>();

  public rawJsonInput = '';
  public config: FirebaseConfigOptions = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };

  constructor() {
    const current = this.firebaseService.currentConfig();
    if (current) {
      this.config = { ...current };
    }
  }

  public parseRawJson(): void {
    try {
      const match = this.rawJsonInput.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.apiKey) this.config.apiKey = parsed.apiKey;
        if (parsed.authDomain) this.config.authDomain = parsed.authDomain;
        if (parsed.projectId) this.config.projectId = parsed.projectId;
        if (parsed.storageBucket) this.config.storageBucket = parsed.storageBucket;
        if (parsed.messagingSenderId) this.config.messagingSenderId = parsed.messagingSenderId;
        if (parsed.appId) this.config.appId = parsed.appId;
      }
    } catch {
      // Ignored during partial typing
    }
  }

  public onSave(): void {
    if (!this.config.apiKey.trim() || !this.config.projectId.trim()) {
      alert('Please provide at least the API Key and Project ID.');
      return;
    }
    const success = this.firebaseService.initializeWithConfig(this.config);
    if (success) {
      alert('Connected to Firebase project: ' + this.config.projectId);
      this.close.emit();
    } else {
      alert('Failed to connect with the provided configuration. Please check the values.');
    }
  }

  public onDisconnect(): void {
    this.firebaseService.disconnectFirebase();
    this.config = {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  }
}
