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
            <img src="logo.png" alt="SkyPearl Realty" class="gate-logo-img" />
          </div>
          <h2 class="gate-title">SkyPearl <span class="gold-text">Realty</span></h2>
          <p class="gate-subtitle">Chennai Property Management & Client CRM</p>
        </div>

        <!-- STATE 1: User is NOT signed in with Google -->
        @if (!authService.currentUser()) {
          <div class="auth-gate-state">
            <!-- Google One-Click Login -->
            <div class="google-section">
              <button 
                type="button" 
                class="btn-google" 
                (click)="loginWithGoogle()" 
                [disabled]="authService.authLoading()">
                <svg class="google-icon" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>
                  {{ authService.authLoading() ? 'Connecting with Google...' : 'Continue with Google' }}
                </span>
              </button>

              <button 
                type="button" 
                class="btn-redirect-subtle" 
                (click)="loginWithGoogleRedirect()" 
                [disabled]="authService.authLoading()"
                title="Sign in using direct browser redirect">
                <span>Direct redirect login →</span>
              </button>
            </div>

            <div class="gate-trust-footer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Encrypted Cloud Workspace</span>
            </div>
          </div>
        }

        <!-- STATE 2: Signed In with Google - Instant Entry -->
        @if (authService.currentUser(); as user) {
          <div class="welcome-gate-state">
            <!-- User Verified Profile Header -->
            <div class="user-card-welcome">
              @if (user.photoURL) {
                <img [src]="user.photoURL" [alt]="user.displayName" class="welcome-user-avatar" />
              } @else {
                <div class="welcome-user-initial">{{ (user.displayName || user.email || 'G').charAt(0) }}</div>
              }
              <div class="welcome-user-details">
                <span class="welcome-name">{{ user.displayName || 'Agent' }}</span>
                <span class="welcome-email">{{ user.email }}</span>
              </div>
            </div>

            <!-- Clean Agency Heading -->
            <div class="welcome-info-card">
              <h4 class="welcome-heading">{{ spaceService.space().name }}</h4>
              <p class="welcome-subtext">
                Chennai property inventory, buyers CRM & brokerage deals.
              </p>
            </div>

            <!-- Primary 1-Click Action -->
            <div class="welcome-action-block">
              <button 
                type="button" 
                class="btn-enter-workspace" 
                (click)="spaceService.joinAsTeamAgent()">
                <span>Enter Workspace</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>

            <!-- Personal Workspace Option -->
            <div class="personal-option-box text-center">
              <button type="button" class="btn-personal-link" (click)="spaceService.switchToPersonalMode()">
                Work in Personal Mode →
              </button>
            </div>

            <div class="signout-row">
              <button type="button" class="btn-link" (click)="authService.logout()">
                ← Sign in with a different account
              </button>
            </div>
          </div>
        }

        <!-- Error Banner -->
        @if (errorMessage()) {
          <div class="error-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div class="error-col">
              <span class="error-msg-text">{{ errorMessage() }}</span>
              <button type="button" class="btn-redirect-link" (click)="loginWithGoogleRedirect()">
                Try Direct Redirect Sign-In →
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .space-gate-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(10, 15, 26, 0.94);
      backdrop-filter: blur(16px);
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
      max-width: 420px;
      background: var(--bg-card);
      border: 1px solid rgba(203, 168, 107, 0.35);
      border-radius: 20px;
      padding: 34px 28px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(203, 168, 107, 0.12);
      color: var(--text-main);
    }

    .gate-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .brand-crest {
      width: 60px;
      height: 60px;
      margin: 0 auto 12px;
      border-radius: 16px;
      background: radial-gradient(circle at 30% 30%, #2a2215, #11141c);
      border: 1px solid rgba(203, 168, 107, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(203, 168, 107, 0.2);
    }

    .gate-logo-img {
      width: 42px;
      height: 42px;
      object-fit: contain;
    }

    .gate-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0 0 4px;
      color: var(--text-main);
    }

    .gate-subtitle {
      font-size: 0.82rem;
      color: var(--text-muted);
      margin: 0;
    }

    .gold-text {
      background: linear-gradient(135deg, #f5d77f, #cba86b, #b38b4d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .google-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
    }

    .btn-google {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      padding: 13px 20px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    }

    .btn-google:hover:not(:disabled) {
      background: #f8fafc;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
    }

    .btn-google:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-redirect-subtle {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.76rem;
      margin-top: 8px;
      cursor: pointer;
      width: 100%;
      text-align: center;
      padding: 4px;
      transition: color 0.15s ease;
    }

    .btn-redirect-subtle:hover {
      color: var(--gold);
      text-decoration: underline;
    }

    .gate-trust-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 22px;
      font-size: 0.74rem;
      color: var(--text-muted);
      letter-spacing: 0.02em;
    }

    /* Welcome State Styles for Non-Tech Users */
    .user-card-welcome {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .welcome-user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid var(--gold);
      object-fit: cover;
    }

    .welcome-user-initial {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
    }

    .welcome-user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .welcome-name {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-main);
    }

    .welcome-email {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .badge-verified {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      align-self: flex-start;
      margin-top: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .welcome-info-card {
      background: rgba(203, 168, 107, 0.08);
      border: 1px solid rgba(203, 168, 107, 0.25);
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 20px;
      text-align: center;
    }

    .welcome-heading {
      margin: 0 0 6px;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .welcome-subtext {
      margin: 0;
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.45;
    }

    .welcome-action-block {
      margin-bottom: 16px;
      text-align: center;
    }

    .btn-enter-workspace {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: linear-gradient(135deg, #f5d77f, #cba86b, #b38b4d);
      color: #1a150b;
      font-weight: 700;
      font-size: 1.05rem;
      padding: 14px 22px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(203, 168, 107, 0.35);
      transition: all 0.2s ease;
    }

    .btn-enter-workspace:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(203, 168, 107, 0.45);
      filter: brightness(1.05);
    }

    .action-note {
      font-size: 0.74rem;
      color: var(--text-muted);
      margin: 8px 0 0;
    }

    .signout-row {
      text-align: center;
      margin-top: 20px;
    }

    .btn-link {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.78rem;
      cursor: pointer;
    }

    .btn-link:hover {
      color: var(--gold);
      text-decoration: underline;
    }

    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 10px;
      padding: 10px 14px;
      color: #f87171;
      margin-top: 14px;
      font-size: 0.78rem;
    }

    .error-col {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .btn-redirect-link {
      background: none;
      border: none;
      padding: 0;
      color: #fca5a5;
      text-decoration: underline;
      font-size: 0.75rem;
      cursor: pointer;
      text-align: left;
    }

    /* Personal Mode Option */
    .personal-option-box {
      margin-top: 14px;
      padding-top: 10px;
    }

    .btn-personal-link {
      background: none;
      border: none;
      color: #60a5fa;
      font-size: 0.78rem;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.15s ease;
    }

    .btn-personal-link:hover {
      color: #93c5fd;
    }

    /* Mobile Responsive Optimizations */
    @media (max-width: 640px) {
      .space-gate-backdrop {
        padding: 10px;
      }
      .space-gate-card {
        padding: 24px 18px;
        max-width: 100%;
      }
      .gate-title {
        font-size: 1.35rem;
      }
      .btn-google {
        font-size: 0.88rem;
        padding: 11px 14px;
      }
    }
  `]
})
export class SpaceGateModalComponent {
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);

  public errorMessage = signal<string | null>(null);

  public async loginWithGoogle(): Promise<void> {
    this.errorMessage.set(null);
    const success = await this.spaceService.loginWithGoogle();
    if (!success) {
      this.errorMessage.set(this.authService.authError() || 'Google Sign-In was cancelled or encountered an error.');
    }
  }

  public async loginWithGoogleRedirect(): Promise<void> {
    this.errorMessage.set(null);
    await this.spaceService.loginWithGoogleRedirect();
  }
}
