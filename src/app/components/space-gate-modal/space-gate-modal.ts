import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpaceService } from '../../services/space.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-space-gate-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-gate-backdrop">
      <div class="space-gate-card glass-panel">
        <!-- Logo & Header -->
        <div class="gate-header">
          <div class="brand-crest">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <h2 class="gate-title">SkyPearl <span class="gold-text">Space</span></h2>
          <p class="gate-subtitle">Chennai Agency Property Intelligence • Private Space</p>
        </div>

        <!-- Google One-Click Login -->
        <div class="google-section">
          <button class="btn-google" (click)="loginWithGoogle()" [disabled]="authService.authLoading()">
            <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>
              {{ authService.authLoading() ? 'Authenticating...' : 'Continue with Google' }}
            </span>
          </button>
        </div>

        <div class="divider">
          <span>OR ENTER ACCESS CODE</span>
        </div>

        <!-- Mode Tabs: Passcode vs Invite Code -->
        <div class="gate-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab() === 'passcode'" 
            (click)="activeTab.set('passcode'); errorMessage.set(null)">
            Agency Passcode
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            [class.active]="activeTab() === 'invite'" 
            (click)="activeTab.set('invite'); errorMessage.set(null)">
            Invite Code
          </button>
        </div>

        <!-- Tab 1: Passcode -->
        @if (activeTab() === 'passcode') {
          <div class="input-group">
            <label class="input-label">Space Passcode</label>
            <div class="input-wrapper">
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                class="gate-input" 
                placeholder="Enter 4-digit agency passcode"
                [(ngModel)]="passcode" 
                (keyup.enter)="submitPasscode()" />
              <button type="button" class="btn-toggle-eye" (click)="showPassword.set(!showPassword())">
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            <p class="input-hint">Default space passcode: <strong>2025</strong></p>
            <button class="btn btn-gold btn-block mt-3" (click)="submitPasscode()">
              <span>Unlock Agency Space</span>
            </button>
          </div>
        }

        <!-- Tab 2: Invite Code -->
        @if (activeTab() === 'invite') {
          <div class="input-group">
            <label class="input-label">Team / Agent Invite Code</label>
            <input 
              type="text" 
              class="gate-input uppercase" 
              placeholder="e.g. SKYPEARL-CHENNAI"
              [(ngModel)]="inviteCode" 
              (keyup.enter)="submitInviteCode()" />
            <p class="input-hint">Valid codes: <strong>SKYPEARL-CHENNAI</strong>, <strong>AGENT-VIP-2025</strong></p>
            <button class="btn btn-gold btn-block mt-3" (click)="submitInviteCode()">
              <span>Join with Invite Code</span>
            </button>
          </div>
        }

        <!-- Error Feedback -->
        @if (errorMessage()) {
          <div class="error-banner">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Guest / Demo Bypass Link -->
        <div class="guest-bypass">
          <button type="button" class="btn-link" (click)="enterAsGuest()">
            Continue as Guest Agent (Demo Access) →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .space-gate-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(10, 15, 26, 0.88);
      backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.25s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .space-gate-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-card);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-xl);
      padding: 32px 28px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 40px rgba(203, 168, 107, 0.15);
      color: var(--text-main);
    }

    .gate-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .brand-crest {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: linear-gradient(135deg, #cba86b, #b28b4c);
      color: #101b2a;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 14px;
      box-shadow: 0 8px 20px rgba(178, 139, 76, 0.35);
    }

    .gate-title {
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }

    .gate-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .google-section {
      margin-bottom: 18px;
    }

    .btn-google {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      padding: 11px 16px;
      border-radius: var(--radius-md);
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      transition: all 0.2s ease;
    }

    .btn-google:hover {
      background: #f9fafb;
      border-color: #d1d5db;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      transform: translateY(-1px);
    }

    .btn-google:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0;
      color: var(--text-dim);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--border-subtle);
    }

    .divider span {
      padding: 0 10px;
    }

    .gate-tabs {
      display: flex;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 3px;
      margin-bottom: 18px;
    }

    .tab-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 0.8rem;
      font-weight: 700;
      border: none;
      background: transparent;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-btn.active {
      background: var(--bg-card);
      color: var(--gold);
      box-shadow: var(--shadow-sm);
    }

    .input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-label {
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .gate-input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: 0.95rem;
      color: var(--text-main);
      font-family: inherit;
      transition: all 0.2s ease;
    }

    .gate-input.uppercase {
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: var(--font-mono);
    }

    .gate-input:focus {
      outline: none;
      border-color: var(--gold);
      box-shadow: 0 0 0 3px var(--gold-glow);
    }

    .btn-toggle-eye {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text-dim);
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      padding: 4px 6px;
    }

    .input-hint {
      font-size: 0.72rem;
      color: var(--text-dim);
      margin-top: 4px;
    }

    .input-hint strong {
      color: var(--gold);
    }

    .btn-block {
      width: 100%;
      padding: 12px;
      font-size: 0.9rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
    }

    .error-banner {
      margin-top: 14px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      background: rgba(225, 29, 72, 0.12);
      border: 1px solid rgba(225, 29, 72, 0.3);
      color: #e11d48;
      font-size: 0.78rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .guest-bypass {
      text-align: center;
      margin-top: 22px;
      padding-top: 16px;
      border-top: 1px dashed var(--border-subtle);
    }

    .btn-link {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.2s;
    }

    .btn-link:hover {
      color: var(--gold);
    }

    @media (max-width: 480px) {
      .space-gate-card {
        padding: 22px 16px;
        border-radius: var(--radius-lg);
      }
      .gate-title {
        font-size: 1.25rem;
      }
      .brand-crest {
        width: 44px;
        height: 44px;
        margin-bottom: 10px;
      }
      .btn-google {
        font-size: 0.82rem;
        padding: 10px 12px;
      }
    }
  `]
})
export class SpaceGateModalComponent {
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);

  public activeTab = signal<'passcode' | 'invite'>('passcode');
  public passcode = '2025';
  public inviteCode = '';
  public showPassword = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  public async loginWithGoogle(): Promise<void> {
    this.errorMessage.set(null);
    const success = await this.spaceService.loginAndUnlockWithGoogle();
    if (!success) {
      this.errorMessage.set(this.authService.authError() || 'Google sign-in was cancelled or failed.');
    }
  }

  public submitPasscode(): void {
    this.errorMessage.set(null);
    const ok = this.spaceService.unlockWithPasscode(this.passcode);
    if (!ok) {
      this.errorMessage.set('Invalid Space Passcode. Try 2025 or request an invite code.');
    }
  }

  public submitInviteCode(): void {
    this.errorMessage.set(null);
    const ok = this.spaceService.unlockWithInviteCode(this.inviteCode);
    if (!ok) {
      this.errorMessage.set('Invalid or expired Invite Code. Try SKYPEARL-CHENNAI.');
    }
  }

  public enterAsGuest(): void {
    this.spaceService.unlockAsGuest();
  }
}
