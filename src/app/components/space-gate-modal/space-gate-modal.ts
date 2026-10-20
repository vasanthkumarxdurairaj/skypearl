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
            <img src="logo.png" alt="SkyPearl Build Real Estate" class="gate-logo-img" />
          </div>
          <h2 class="gate-title">SkyPearl <span class="gold-text">Space</span></h2>
          <p class="gate-subtitle">Chennai Real Estate Agency • Private Workspace</p>
        </div>

        <!-- STATE 1: User is NOT signed in with Google -->
        @if (!authService.currentUser()) {
          <div class="auth-gate-state">
            <div class="security-notice">
              <svg class="lock-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <div>
                <strong>Google Authentication Required</strong>
                <p>Private real estate inventory, client contacts, and deals are protected. Sign in with Google to track your identity on every property and lead record.</p>
              </div>
            </div>

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
                  {{ authService.authLoading() ? 'Connecting with Google...' : 'Sign in with Google to Continue' }}
                </span>
              </button>

              <button 
                type="button" 
                class="btn-redirect-subtle" 
                (click)="loginWithGoogleRedirect()" 
                [disabled]="authService.authLoading()"
                title="If popup is blocked by your browser, sign in using direct redirect">
                <span>Popup blocked? Click here to sign in with Direct Redirect →</span>
              </button>
            </div>

            <div class="gate-trust-footer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Private Broker Access • Team Workspace • Secure</span>
            </div>
          </div>
        }

        <!-- STATE 2: Signed In with Google, but NOT approved yet by Owner -->
        @if (authService.currentUser(); as user) {
          <div class="pending-gate-state">
            <div class="user-card-pending">
              @if (user.photoURL) {
                <img [src]="user.photoURL" [alt]="user.displayName" class="pending-user-avatar" />
              } @else {
                <div class="pending-user-initial">{{ (user.displayName || user.email || 'G').charAt(0) }}</div>
              }
              <div class="pending-user-details">
                <span class="pending-name">{{ user.displayName || 'Google User' }}</span>
                <span class="pending-email">{{ user.email }}</span>
                <span class="badge-awaiting">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <span>Owner Approval Required</span>
                </span>
              </div>
            </div>

            <!-- If user has an invitation pending, show one-click Accept button -->
            @if (spaceService.pendingInvitation(); as invite) {
              <div class="invite-found-card">
                <div class="invite-found-badge">🎉 INVITATION READY</div>
                <h4 class="invite-found-title">You're Invited to Join {{ invite.spaceName }}</h4>
                <p class="invite-found-desc">Owner {{ invite.ownerName || invite.ownerEmail }} has authorized your Google account.</p>
                <div class="invite-code-preview">Space Code: <strong>{{ invite.spaceCode }}</strong></div>
                <button type="button" class="btn btn-gold btn-block btn-lg" (click)="spaceService.acceptSpaceInvitation()">
                  ✓ Accept Invitation & Enter Space
                </button>
              </div>
            } @else {
              <div class="pending-explanation">
                <p>
                  This space is private and managed by the Owner
                  <strong>{{ spaceService.space().ownerName || spaceService.space().ownerEmail || 'Space Owner' }}</strong>.
                  Access must be granted directly by the Owner or via Space Code.
                </p>
              </div>

              <!-- Request Access Action -->
              <div class="option-box text-center">
                @if (spaceService.pendingRequestSent() || isAlreadyRequested(user.uid, user.email)) {
                  <div class="request-sent-card">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <div>
                      <strong>Request Pending Owner Approval</strong>
                      <p>Your access request was delivered to the space Owner. You will be admitted as soon as the Owner approves your Google account.</p>
                    </div>
                  </div>
                } @else {
                  <button type="button" class="btn btn-gold btn-block btn-lg" (click)="spaceService.requestAccessFromOwner()">
                    <span>Request Access from Space Owner</span>
                  </button>
                  <p class="request-hint">Sends an instant access request directly to the Owner's dashboard.</p>
                }
              </div>

              <!-- Enter Space Auto Code -->
              <div class="code-entry-box">
                <div class="code-entry-label">Have an Agency Space Auto Code?</div>
                <div class="code-entry-row">
                  <input type="text" [(ngModel)]="spaceCodeInput" placeholder="e.g. SKP-CHN-4829" class="input-code" (keyup.enter)="submitSpaceCode()" />
                  <button type="button" class="btn btn-gold btn-sm" (click)="submitSpaceCode()" [disabled]="!spaceCodeInput.trim()">
                    Join
                  </button>
                </div>
                @if (codeError()) {
                  <span class="code-error-text">{{ codeError() }}</span>
                }
              </div>
            }

            <!-- Personal Workspace Option -->
            <div class="personal-option-box text-center">
              <button type="button" class="btn-personal-link" (click)="spaceService.switchToPersonalMode()">
                Or Continue in Personal Workspace Mode →
              </button>
            </div>

            <div class="signout-row">
              <button type="button" class="btn-link" (click)="authService.logout()">
                ← Sign in with a different Google account
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
                Try Direct Redirect Sign-In (no popup needed) →
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
      max-width: 470px;
      background: var(--bg-card);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-xl);
      padding: 34px 30px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 45px rgba(203, 168, 107, 0.16);
      color: var(--text-main);
    }

    .gate-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .brand-crest {
      width: 64px;
      height: 64px;
      margin: 0 auto 12px;
      border-radius: 16px;
      background: radial-gradient(circle at 30% 30%, #2a2215, #11141c);
      border: 1px solid rgba(203, 168, 107, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(203, 168, 107, 0.2);
    }

    .gate-logo-img {
      width: 46px;
      height: 46px;
      object-fit: contain;
    }

    .gate-title {
      font-size: 1.55rem;
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

    .security-notice {
      display: flex;
      gap: 12px;
      background: rgba(203, 168, 107, 0.08);
      border: 1px solid rgba(203, 168, 107, 0.25);
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 20px;
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .lock-icon {
      color: #cba86b;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .security-notice strong {
      display: block;
      color: #e5c378;
      margin-bottom: 3px;
      font-size: 0.85rem;
    }

    .security-notice p {
      margin: 0;
      color: var(--text-muted);
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
      padding: 13px 18px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
    }

    .btn-google:hover:not(:disabled) {
      background: #f8fafc;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    }

    .btn-google:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-redirect-subtle {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      margin-top: 10px;
      cursor: pointer;
      width: 100%;
      text-align: center;
      padding: 4px;
    }

    .btn-redirect-subtle:hover {
      color: var(--gold);
      text-decoration: underline;
    }

    .gate-trust-footer {
      text-align: center;
      margin-top: 20px;
      font-size: 0.72rem;
      color: var(--text-muted);
      letter-spacing: 0.02em;
    }

    /* Pending State Styles */
    .user-card-pending {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }

    .pending-user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid #cba86b;
      object-fit: cover;
    }

    .pending-user-initial {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285F4, #34A853);
      color: white;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }

    .pending-user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .pending-name {
      font-weight: 600;
      font-size: 0.92rem;
      color: var(--text-main);
    }

    .pending-email {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .badge-awaiting {
      align-self: flex-start;
      margin-top: 3px;
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .pending-explanation {
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.45;
      margin-bottom: 20px;
    }

    .pending-explanation strong {
      color: var(--text-main);
    }

    .option-box {
      margin-bottom: 16px;
    }

    .btn-block {
      width: 100%;
      display: block;
    }

    .request-sent-card {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .request-sent-card strong {
      color: #10b981;
      display: block;
      margin-bottom: 3px;
    }

    .request-sent-card p {
      margin: 0;
      color: var(--text-muted);
    }

    .request-hint {
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

    /* Invite Ready Card */
    .invite-found-card {
      background: linear-gradient(135deg, rgba(203, 168, 107, 0.15), rgba(20, 24, 34, 0.8));
      border: 1px solid var(--gold);
      border-radius: var(--radius-lg);
      padding: 18px 16px;
      margin-bottom: 16px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(203, 168, 107, 0.15);
    }

    .invite-found-badge {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--gold);
      background: rgba(203, 168, 107, 0.2);
      padding: 2px 8px;
      border-radius: var(--radius-full);
      margin-bottom: 8px;
    }

    .invite-found-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #fff;
      margin: 0 0 4px 0;
    }

    .invite-found-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0 0 10px 0;
    }

    .invite-code-preview {
      font-size: 0.8rem;
      color: var(--gold);
      font-family: var(--font-mono);
      margin-bottom: 14px;
    }

    /* Code Entry Box */
    .code-entry-box {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px dashed var(--border-subtle);
      text-align: left;
    }

    .code-entry-label {
      font-size: 0.73rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .code-entry-row {
      display: flex;
      gap: 8px;
    }

    .input-code {
      flex: 1;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      padding: 7px 12px;
      border-radius: var(--radius-md);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .input-code:focus {
      outline: none;
      border-color: var(--gold);
    }

    .code-error-text {
      display: block;
      color: #f87171;
      font-size: 0.72rem;
      margin-top: 5px;
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
      .user-card-pending {
        padding: 10px 12px;
      }
    }
  `]
})
export class SpaceGateModalComponent {
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);

  public errorMessage = signal<string | null>(null);
  public spaceCodeInput = '';
  public codeError = signal<string | null>(null);

  public isAlreadyRequested(uid: string, email?: string | null): boolean {
    const list = this.spaceService.space().pendingRequests;
    return list.some(r => r.uid === uid || (!!email && r.email.toLowerCase() === email.toLowerCase()));
  }

  public submitSpaceCode(): void {
    this.codeError.set(null);
    if (!this.spaceCodeInput.trim()) return;
    const ok = this.spaceService.joinSpaceByCode(this.spaceCodeInput);
    if (!ok) {
      this.codeError.set('Invalid Space Code. Please check with your Space Owner.');
    }
  }

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
