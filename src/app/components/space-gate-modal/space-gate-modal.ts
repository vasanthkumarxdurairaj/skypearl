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
      <div class="space-gate-portal glass-panel">
        
        <!-- LEFT SHOWCASE COLUMN: BRAND & VALUE PROP -->
        <aside class="portal-showcase">
          <div class="showcase-glow"></div>

          <div class="showcase-header">
            <div class="brand-crest">
              <img src="logo.png" alt="SkyPearl Realty" class="gate-logo-img" />
            </div>
            <div class="brand-tag-group">
              <span class="showcase-badge">SKYPEARL REALTY OS</span>
              <span class="showcase-edition">ENTERPRISE EDITION</span>
            </div>
          </div>

          <div class="showcase-body">
            <h1 class="showcase-title">
              Chennai's Elite <span class="gold-text">Property Intelligence</span> & Brokerage Operating System
            </h1>
            <p class="showcase-desc">
              High-velocity real estate operations platform powering property portfolios, buyer requirements, and collaborative agency spaces across premier Chennai micro-markets.
            </p>

            <div class="showcase-pillars">
              <div class="pillar-card">
                <div class="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                    <line x1="8" y1="2" x2="8" y2="18"></line>
                    <line x1="16" y1="6" x2="16" y2="22"></line>
                  </svg>
                </div>
                <div class="pillar-text">
                  <strong class="pillar-title">Chennai Micro-Market Network</strong>
                  <span class="pillar-subtitle">OMR IT Corridor, ECR Luxury, Anna Nagar, Adyar & Central Chennai</span>
                </div>
              </div>

              <div class="pillar-card">
                <div class="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="6" x2="12" y2="12"></line>
                    <line x1="12" y1="12" x2="16" y2="14"></line>
                  </svg>
                </div>
                <div class="pillar-text">
                  <strong class="pillar-title">16-Dimension Matching Algorithm</strong>
                  <span class="pillar-subtitle">Instant real-time compatibility scoring between buyers and live listings</span>
                </div>
              </div>

              <div class="pillar-card">
                <div class="pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div class="pillar-text">
                  <strong class="pillar-title">Collaborative Agency Spaces</strong>
                  <span class="pillar-subtitle">1-click WhatsApp onboarding, role-based security, and zero local data leakage</span>
                </div>
              </div>
            </div>
          </div>

          <div class="showcase-footer">
            <div class="trust-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>256-Bit SSL Encrypted</span>
            </div>
            <div class="trust-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
              <span>Real-Time Cloud Authoritative</span>
            </div>
            <div class="trust-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>Multi-Tenant Protected</span>
            </div>
          </div>
        </aside>

        <!-- RIGHT INTERACTION COLUMN: SIGN IN & SPACE SELECTION -->
        <main class="portal-auth">
          
          <!-- Auth Card Header -->
          <div class="auth-header">
            <div class="auth-eyebrow-row">
              <span class="auth-eyebrow">WORKSPACE GATEWAY</span>
              <span class="auth-live-dot"></span>
            </div>
            <h2 class="auth-title">
              @if (authService.currentUser()) {
                Welcome to Your Workspace
              } @else {
                Sign In to <span class="gold-text">SkyPearl Space</span>
              }
            </h2>
            <p class="auth-subtitle">
              @if (authService.currentUser()) {
                You are authenticated with Google. Access your team's real estate deals.
              } @else {
                One-click authentication to access your Chennai property portfolio & CRM.
              }
            </p>
          </div>

          <!-- ACTIVE AGENCY SPACE BADGE -->
          <div class="active-space-card">
            <div class="space-card-top">
              <div class="space-icon-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div class="space-card-details">
                <span class="space-eyebrow">CONNECTED AGENCY SPACE</span>
                <span class="space-name-text">{{ spaceService.space().name }}</span>
              </div>
            </div>

            <div class="space-code-row">
              <span class="code-label">SPACE CODE</span>
              <span class="code-badge-pill mono">{{ spaceService.space().code }}</span>
              <button type="button" class="btn-copy-code-action" (click)="copyActiveSpaceCode()" title="Copy workspace code">
                {{ codeCopied() ? '✓ Copied' : 'Copy Code' }}
              </button>
            </div>
          </div>

          <!-- ============================================== -->
          <!-- STATE 1: USER NOT SIGNED IN WITH GOOGLE       -->
          <!-- ============================================== -->
          @if (!authService.currentUser()) {
            <div class="auth-actions-group">
              
              <!-- Primary Google SSO Action -->
              <button 
                type="button" 
                class="btn-google-sso" 
                (click)="loginWithGoogle()" 
                [disabled]="authService.authLoading()">
                <svg class="google-icon" width="22" height="22" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>
                  {{ authService.authLoading() ? 'Connecting with Google...' : 'Continue with Google Account' }}
                </span>
              </button>

              <button 
                type="button" 
                class="btn-redirect-subtle" 
                (click)="loginWithGoogleRedirect()" 
                [disabled]="authService.authLoading()"
                title="Sign in using direct browser redirect if popup was blocked">
                <span>Popup blocked? Use direct browser redirect →</span>
              </button>

              <div class="auth-divider">
                <span>OR CONFIGURE WORKSPACE</span>
              </div>

              <!-- Workspace Navigation Options -->
              <div class="workspace-mode-switcher">
                <div class="mode-pills-row">
                  <button 
                    type="button" 
                    class="mode-pill-btn" 
                    [class.active]="showCodeInput()"
                    (click)="showCodeInput.set(true); showCreateSpace.set(false)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    <span>Enter Space Code</span>
                  </button>

                  <button 
                    type="button" 
                    class="mode-pill-btn" 
                    [class.active]="showCreateSpace()"
                    (click)="showCreateSpace.set(true); showCodeInput.set(false)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Create New Space</span>
                  </button>
                </div>

                <!-- Form: Enter Space Code -->
                @if (showCodeInput()) {
                  <div class="sub-form-panel">
                    <div class="sub-form-header">
                      <span>Enter agency space code provided by your broker</span>
                      <button type="button" class="btn-sub-close" (click)="showCodeInput.set(false)">✕</button>
                    </div>
                    <div class="sub-form-row">
                      <input 
                        type="text" 
                        [(ngModel)]="spaceCodeInput" 
                        placeholder="e.g. SKP-CHN-4829" 
                        class="form-control mono flex-1" 
                        (keyup.enter)="submitJoinCode()" />
                      <button type="button" class="btn btn-gold btn-sm" (click)="submitJoinCode()" [disabled]="!spaceCodeInput.trim()">
                        Connect
                      </button>
                    </div>
                    @if (joinError()) {
                      <p class="sub-form-error">{{ joinError() }}</p>
                    }
                  </div>
                }

                <!-- Form: Create New Space -->
                @if (showCreateSpace()) {
                  <div class="sub-form-panel">
                    <div class="sub-form-header">
                      <span>Name your real estate brokerage workspace</span>
                      <button type="button" class="btn-sub-close" (click)="showCreateSpace.set(false)">✕</button>
                    </div>
                    <div class="sub-form-row">
                      <input 
                        type="text" 
                        [(ngModel)]="newSpaceName" 
                        placeholder="e.g. Anna Nagar Realty Group" 
                        class="form-control flex-1" 
                        (keyup.enter)="submitCreateSpace()" />
                      <button type="button" class="btn btn-gold btn-sm" (click)="submitCreateSpace()" [disabled]="!newSpaceName.trim()">
                        Create Space
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Personal Workspace Alternative -->
              <div class="personal-workspace-footer">
                <button type="button" class="btn-personal-link" (click)="spaceService.switchToPersonalMode()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>Solo Agent? Continue in Personal Workspace Mode →</span>
                </button>
              </div>
            </div>
          }

          <!-- ============================================== -->
          <!-- STATE 2: USER IS AUTHENTICATED                -->
          <!-- ============================================== -->
          @if (authService.currentUser(); as user) {
            <div class="auth-welcome-group">
              
              <!-- Dignified Executive Agent Card -->
              <div class="executive-agent-card">
                <div class="agent-avatar-wrap">
                  @if (user.photoURL) {
                    <img [src]="user.photoURL" [alt]="user.displayName" class="agent-avatar-image" />
                  } @else {
                    <div class="agent-avatar-initial">{{ (user.displayName || user.email || 'A').charAt(0) }}</div>
                  }
                  <span class="verified-check" title="Google Verified">✓</span>
                </div>

                <div class="agent-meta">
                  <div class="agent-name-row">
                    <strong class="agent-display-name">{{ user.displayName || 'Authorized Broker' }}</strong>
                    <span class="agent-role-pill">AGENT ACCESS</span>
                  </div>
                  <span class="agent-email-text">{{ user.email }}</span>
                  <span class="agent-session-tag">Google Identity Verified</span>
                </div>
              </div>

              <!-- Grand 1-Click Launch Button -->
              <button 
                type="button" 
                class="btn-launch-workspace" 
                (click)="spaceService.joinAsTeamAgent()">
                <span>Enter Workspace</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>

              <!-- Space Code Options if Switching Space -->
              <div class="workspace-mode-switcher">
                <div class="mode-pills-row">
                  <button 
                    type="button" 
                    class="mode-pill-btn" 
                    [class.active]="showCodeInput()"
                    (click)="showCodeInput.set(true); showCreateSpace.set(false)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    <span>Switch Space Code</span>
                  </button>

                  <button 
                    type="button" 
                    class="mode-pill-btn" 
                    [class.active]="showCreateSpace()"
                    (click)="showCreateSpace.set(true); showCodeInput.set(false)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Create New Space</span>
                  </button>
                </div>

                @if (showCodeInput()) {
                  <div class="sub-form-panel">
                    <div class="sub-form-header">
                      <span>Enter agency space code</span>
                      <button type="button" class="btn-sub-close" (click)="showCodeInput.set(false)">✕</button>
                    </div>
                    <div class="sub-form-row">
                      <input 
                        type="text" 
                        [(ngModel)]="spaceCodeInput" 
                        placeholder="SKP-..." 
                        class="form-control mono flex-1" 
                        (keyup.enter)="submitJoinCode()" />
                      <button type="button" class="btn btn-gold btn-sm" (click)="submitJoinCode()" [disabled]="!spaceCodeInput.trim()">
                        Join
                      </button>
                    </div>
                    @if (joinError()) {
                      <p class="sub-form-error">{{ joinError() }}</p>
                    }
                  </div>
                }

                @if (showCreateSpace()) {
                  <div class="sub-form-panel">
                    <div class="sub-form-header">
                      <span>Create your agency workspace</span>
                      <button type="button" class="btn-sub-close" (click)="showCreateSpace.set(false)">✕</button>
                    </div>
                    <div class="sub-form-row">
                      <input 
                        type="text" 
                        [(ngModel)]="newSpaceName" 
                        placeholder="Space Name" 
                        class="form-control flex-1" 
                        (keyup.enter)="submitCreateSpace()" />
                      <button type="button" class="btn btn-gold btn-sm" (click)="submitCreateSpace()" [disabled]="!newSpaceName.trim()">
                        Create & Enter
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- Personal Mode Alternative -->
              <div class="personal-workspace-footer">
                <button type="button" class="btn-personal-link" (click)="spaceService.switchToPersonalMode()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>Work in Personal Workspace Mode →</span>
                </button>
              </div>

              <!-- Polished Sign Out / Switch Account Button -->
              <div class="signout-container">
                <button type="button" class="btn-signout-gate" (click)="authService.logout()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Sign out / Switch Google Account</span>
                </button>
              </div>
            </div>
          }

          <!-- Authentication Error Banner -->
          @if (errorMessage()) {
            <div class="auth-error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div class="error-col">
                <span class="error-msg-text">{{ errorMessage() }}</span>
                <button type="button" class="btn-redirect-link" (click)="loginWithGoogleRedirect()">
                  Try Direct Browser Redirect Sign-In →
                </button>
              </div>
            </div>
          }
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* Fullscreen Architectural Backdrop */
    .space-gate-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: radial-gradient(circle at 20% 20%, rgba(203, 168, 107, 0.12) 0%, transparent 45%),
                  radial-gradient(circle at 80% 80%, rgba(16, 27, 42, 0.95) 0%, #060a12 100%);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      overflow-y: auto;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Spacious Split-Screen Executive Portal Card */
    .space-gate-portal {
      width: 100%;
      max-width: 1040px;
      min-height: 620px;
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      background: var(--bg-card);
      border: 1px solid rgba(203, 168, 107, 0.35);
      border-radius: 24px;
      box-shadow: 0 40px 100px -25px rgba(0, 0, 0, 0.8),
                  0 0 60px rgba(203, 168, 107, 0.12);
      overflow: hidden;
      position: relative;
    }

    /* LEFT SHOWCASE COLUMN */
    .portal-showcase {
      background: linear-gradient(150deg, #0e1524 0%, #090e18 55%, #131722 100%);
      padding: 44px 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      border-right: 1px solid var(--border-subtle);
      overflow: hidden;
    }

    .showcase-glow {
      position: absolute;
      top: -120px;
      left: -120px;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(203, 168, 107, 0.22) 0%, transparent 70%);
      filter: blur(50px);
      pointer-events: none;
    }

    .showcase-header {
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
      z-index: 2;
    }

    .brand-crest {
      width: 54px;
      height: 54px;
      border-radius: 14px;
      background: radial-gradient(circle at 30% 30%, #2a2215, #11141c);
      border: 1px solid rgba(203, 168, 107, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(203, 168, 107, 0.2);
      flex-shrink: 0;
    }

    .gate-logo-img {
      width: 36px;
      height: 36px;
      object-fit: contain;
    }

    .brand-tag-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .showcase-badge {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: var(--gold);
      font-family: var(--font-mono, monospace);
    }

    .showcase-edition {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-dim);
    }

    .showcase-body {
      margin: 32px 0;
      position: relative;
      z-index: 2;
    }

    .showcase-title {
      font-size: 1.85rem;
      font-weight: 800;
      line-height: 1.25;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin: 0 0 14px;
    }

    .gold-text {
      background: linear-gradient(135deg, #f5d77f, #cba86b, #b38b4d);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .showcase-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.55;
      margin: 0 0 28px;
    }

    .showcase-pillars {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .pillar-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .pillar-card:hover {
      background: rgba(203, 168, 107, 0.06);
      border-color: rgba(203, 168, 107, 0.25);
      transform: translateX(4px);
    }

    .pillar-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(203, 168, 107, 0.12);
      border: 1px solid rgba(203, 168, 107, 0.3);
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pillar-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .pillar-title {
      font-size: 0.86rem;
      font-weight: 700;
      color: #ffffff;
    }

    .pillar-subtitle {
      font-size: 0.76rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .showcase-footer {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      position: relative;
      z-index: 2;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .trust-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-dim);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 999px;
      padding: 4px 10px;
    }

    /* RIGHT AUTH COLUMN */
    .portal-auth {
      padding: 44px 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: var(--bg-card);
      position: relative;
    }

    .auth-header {
      margin-bottom: 22px;
    }

    .auth-eyebrow-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .auth-eyebrow {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--gold);
      font-family: var(--font-mono, monospace);
    }

    .auth-live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .auth-title {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: var(--text-main);
      margin: 0 0 6px;
    }

    .auth-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.45;
    }

    /* Active Space Card */
    .active-space-card {
      background: var(--bg-surface);
      border: 1px solid rgba(203, 168, 107, 0.35);
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 22px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .space-card-top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }

    .space-icon-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(203, 168, 107, 0.15);
      border: 1px solid rgba(203, 168, 107, 0.35);
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .space-card-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      overflow: hidden;
    }

    .space-eyebrow {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: var(--gold);
    }

    .space-name-text {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .space-code-row {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 6px 12px;
    }

    .code-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .code-badge-pill {
      font-size: 1rem;
      font-weight: 800;
      color: var(--gold);
      letter-spacing: 0.06em;
      flex: 1;
    }

    .btn-copy-code-action {
      background: rgba(203, 168, 107, 0.15);
      border: 1px solid rgba(203, 168, 107, 0.35);
      color: var(--gold);
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 4px 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-copy-code-action:hover {
      background: var(--gold);
      color: #1a150b;
    }

    /* Google SSO Primary Button */
    .btn-google-sso {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      padding: 14px 22px;
      font-size: 0.98rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .btn-google-sso:hover:not(:disabled) {
      background: #f8fafc;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }

    .btn-google-sso:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-redirect-subtle {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.76rem;
      margin-top: 10px;
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

    .auth-divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0 16px;
    }

    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--border-subtle);
    }

    .auth-divider span {
      padding: 0 12px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-dim);
    }

    /* Workspace Mode Switcher */
    .workspace-mode-switcher {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .mode-pills-row {
      display: flex;
      gap: 10px;
    }

    .mode-pill-btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 9px 12px;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mode-pill-btn:hover {
      border-color: var(--gold);
      color: var(--text-main);
    }

    .mode-pill-btn.active {
      background: rgba(203, 168, 107, 0.15);
      border-color: var(--gold);
      color: var(--gold);
      font-weight: 700;
    }

    .sub-form-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 14px 16px;
      animation: fadeIn 0.2s ease;
    }

    .sub-form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .btn-sub-close {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 0.88rem;
      cursor: pointer;
    }

    .sub-form-row {
      display: flex;
      gap: 8px;
    }

    .sub-form-error {
      margin: 8px 0 0;
      font-size: 0.76rem;
      color: #ef4444;
    }

    /* Personal Workspace Mode */
    .personal-workspace-footer {
      margin-top: 18px;
      text-align: center;
    }

    .btn-personal-link {
      background: none;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-muted);
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-personal-link:hover {
      color: var(--gold);
      text-decoration: underline;
    }

    /* AUTHENTICATED WELCOME STATE */
    .executive-agent-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--bg-surface);
      border: 1px solid rgba(203, 168, 107, 0.35);
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 22px;
    }

    .agent-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .agent-avatar-image {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 2px solid var(--gold);
      object-fit: cover;
    }

    .agent-avatar-initial {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }

    .verified-check {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #10b981;
      color: white;
      font-size: 0.65rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid var(--bg-card);
    }

    .agent-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
      overflow: hidden;
    }

    .agent-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .agent-display-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .agent-role-pill {
      font-size: 0.64rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(203, 168, 107, 0.2);
      color: var(--gold);
      border: 1px solid rgba(203, 168, 107, 0.4);
    }

    .agent-email-text {
      font-size: 0.82rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .agent-session-tag {
      font-size: 0.72rem;
      color: #10b981;
      font-weight: 600;
    }

    /* Grand Workspace Launch Button */
    .btn-launch-workspace {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: linear-gradient(135deg, #f5d77f 0%, #cba86b 50%, #b38b4d 100%);
      color: #141007;
      font-weight: 800;
      font-size: 1.1rem;
      padding: 16px 24px;
      border: none;
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(203, 168, 107, 0.35);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      margin-bottom: 20px;
    }

    .btn-launch-workspace:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(203, 168, 107, 0.5);
      filter: brightness(1.06);
    }

    /* Refined Sign Out Button */
    .signout-container {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
      text-align: center;
    }

    .btn-signout-gate {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 8px 18px;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-signout-gate:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.35);
      color: #ef4444;
      transform: translateY(-1px);
    }

    /* Auth Error Banner */
    .auth-error-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 12px;
      padding: 12px 16px;
      color: #f87171;
      margin-top: 18px;
      font-size: 0.8rem;
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
      font-size: 0.76rem;
      cursor: pointer;
      text-align: left;
    }

    /* Responsive Breakdown */
    @media (max-width: 960px) {
      .space-gate-portal {
        grid-template-columns: 1fr;
        max-width: 520px;
      }
      .portal-showcase {
        padding: 28px 24px;
        border-right: none;
        border-bottom: 1px solid var(--border-subtle);
      }
      .showcase-title {
        font-size: 1.4rem;
      }
      .showcase-desc {
        display: none;
      }
      .showcase-pillars {
        display: none;
      }
      .portal-auth {
        padding: 32px 24px;
      }
    }

    @media (max-width: 480px) {
      .space-gate-backdrop {
        padding: 12px;
      }
      .portal-auth {
        padding: 24px 18px;
      }
      .auth-title {
        font-size: 1.35rem;
      }
      .btn-google-sso {
        font-size: 0.88rem;
        padding: 12px 16px;
      }
      .mode-pills-row {
        flex-direction: column;
      }
    }
  `]
})
export class SpaceGateModalComponent {
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);

  public errorMessage = signal<string | null>(null);
  public showCodeInput = signal<boolean>(false);
  public showCreateSpace = signal<boolean>(false);
  public spaceCodeInput = '';
  public newSpaceName = '';
  public joinError = signal<string | null>(null);
  public codeCopied = signal<boolean>(false);

  public copyActiveSpaceCode(): void {
    const code = this.spaceService.space().code || 'SKP-CHN-4829';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.codeCopied.set(true);
        setTimeout(() => this.codeCopied.set(false), 2000);
      });
    }
  }

  public async submitJoinCode(): Promise<void> {
    const code = this.spaceCodeInput.trim().toUpperCase();
    if (!code) return;
    this.joinError.set(null);
    const success = await this.spaceService.joinSpaceByCode(code);
    if (!success) {
      this.joinError.set(`Space code "${code}" could not be verified.`);
    }
  }

  public submitCreateSpace(): void {
    const name = this.newSpaceName.trim();
    if (!name) return;
    this.spaceService.createNewSpace(name);
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
