import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealtyService } from '../../services/realty.service';
import { SpaceService, SpaceMember } from '../../services/space.service';
import { AuthService } from '../../services/auth.service';
import { AgentProfile, UserRole } from '../../models/realty.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar-container">
      <div class="nav-left">
        <div class="brand">
          <div class="brand-gem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div class="brand-text">
            <div class="brand-title">SkyPearl <span class="gold-text">Realty</span></div>
            <div class="brand-subtitle">CHENNAI PROPERTY INTELLIGENCE</div>
          </div>
        </div>

        <!-- Locality / City Pill -->
        <div class="city-pill">
          <span class="city-dot"></span>
          <span class="city-name">Chennai Corridor</span>
          <span class="city-badge">38 Localities</span>
        </div>

        <!-- Space & Invite Pill -->
        <button class="space-pill" (click)="spaceService.showSpaceSettingsModal.set(true)" title="Manage Space, Invites & Passcode">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <span class="space-name">Space: Chennai</span>
          <span class="space-badge">Passcode & Invites</span>
        </button>

        <!-- Cloud Database Status Pill -->
        <div class="cloud-pill" [class.cloud-connected]="realtyService.firebaseService.isConnected() && !realtyService.firebaseService.isDemoMode()">
          <span class="cloud-dot"></span>
          @if (realtyService.firebaseService.isConnected() && !realtyService.firebaseService.isDemoMode()) {
            <span class="cloud-text">Cloud DB: {{ realtyService.firebaseService.projectId() }}</span>
          } @else {
            <span class="cloud-text">Offline Local DB</span>
          }
        </div>
      </div>

      <div class="nav-right">
        <!-- Google User Profile / Login -->
        @if (authService.currentUser(); as user) {
          <div class="google-user-pill" (click)="spaceService.showSpaceSettingsModal.set(true)" title="Google Account & Space Settings">
            @if (user.photoURL) {
              <img [src]="user.photoURL" class="google-avatar-img" alt="Google" />
            } @else {
              <div class="google-avatar-fallback">{{ user.displayName.charAt(0) }}</div>
            }
            <div class="google-user-meta">
              <span class="google-name">{{ user.displayName }}</span>
              <span class="google-tag">Google</span>
            </div>
          </div>
        } @else {
          <button class="btn btn-google-nav btn-sm" (click)="spaceService.loginAndUnlockWithGoogle()" title="Sign in with Google">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google Login</span>
          </button>
        }
        <!-- Theme Toggle Button -->
        <button class="theme-toggle-btn" (click)="realtyService.toggleTheme()" [title]="realtyService.currentTheme() === 'light' ? 'Switch to Dark Mode' : 'Switch to White Theme'">
          @if (realtyService.currentTheme() === 'light') {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span>Dark Theme</span>
          } @else {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <span>White Theme</span>
          }
        </button>

        <!-- Scan The Hindu Newspaper Classifieds -->
        <button class="btn btn-gold btn-sm nav-scanner-btn" (click)="openClassifiedScanner.emit()" title="Scan or Upload The Hindu Newspaper Classified Ad">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          <span>Scan Hindu Ad</span>
        </button>

        <!-- Quick Action Buttons -->
        <button class="btn btn-secondary btn-sm" (click)="openVisitModal.emit()" title="Schedule Site Visit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Site Visit</span>
        </button>

        <button class="btn btn-gold btn-sm" (click)="openLeadModal.emit()" title="Add Lead to CRM">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
          <span>Add Buyer</span>
        </button>

        <button class="btn btn-primary btn-sm" (click)="openPropertyModal.emit()" title="List Property in Chennai">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add Property</span>
        </button>

        <!-- Real Logged In User / Session Persona & Accessed Space Members -->
        <div class="agent-menu-container">
          <button class="agent-pill" (click)="toggleAgentMenu()">
            @if (realtyService.activeAgent().photoURL) {
              <img [src]="realtyService.activeAgent().photoURL" [alt]="realtyService.activeAgent().name" class="avatar-img" />
            } @else {
              <div class="avatar" [style.background]="realtyService.activeAgent().avatarColor">
                {{ realtyService.activeAgent().name.charAt(0) }}
              </div>
            }
            <div class="agent-details">
              <span class="agent-name">{{ realtyService.activeAgent().name }}</span>
              <span class="agent-role-tag" [ngClass]="'role-' + realtyService.activeAgent().role">
                @if (realtyService.activeAgent().joinedVia === 'google') {
                  GOOGLE AUTH
                } @else if (realtyService.activeAgent().joinedVia === 'passcode') {
                  PASSCODE VERIFIED
                } @else if (realtyService.activeAgent().joinedVia === 'invite') {
                  INVITED MEMBER
                } @else {
                  GUEST USER
                }
              </span>
            </div>
            <svg class="chevron" [class.open]="showAgentMenu()" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          @if (showAgentMenu()) {
            <div class="agent-dropdown glass-panel">
              <div class="dropdown-header">
                <span class="dropdown-title">Active Account & Space Access</span>
                <span class="dropdown-desc">Live authenticated profile & team access directory</span>
              </div>

              <!-- Current User Profile Card -->
              <div class="current-user-card">
                <div class="current-user-main">
                  @if (realtyService.activeAgent().photoURL) {
                    <img [src]="realtyService.activeAgent().photoURL" [alt]="realtyService.activeAgent().name" class="avatar-card-img" />
                  } @else {
                    <div class="avatar-card" [style.background]="realtyService.activeAgent().avatarColor">
                      {{ realtyService.activeAgent().name.charAt(0) }}
                    </div>
                  }
                  <div class="current-user-meta">
                    <div class="current-name">{{ realtyService.activeAgent().name }}</div>
                    <div class="current-email">{{ realtyService.activeAgent().email }}</div>
                    <div class="current-tag-row">
                      <span class="badge" [ngClass]="'badge-' + realtyService.activeAgent().role">{{ realtyService.activeAgent().role | uppercase }}</span>
                      <span class="access-method-chip">Via {{ (realtyService.activeAgent().joinedVia || 'session') | uppercase }}</span>
                    </div>
                  </div>
                </div>

                <!-- Account Actions -->
                <div class="user-action-buttons">
                  @if (!authService.currentUser()) {
                    <button class="btn btn-xs btn-google-action" (click)="signInWithGoogle()">
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  } @else {
                    <button class="btn btn-xs btn-outline" (click)="signOutGoogle()">
                      <span>Sign out of Google</span>
                    </button>
                  }
                  <button class="btn btn-xs btn-outline" (click)="lockAndSwitch()">
                    <span>Lock / Switch Access</span>
                  </button>
                </div>
              </div>

              <!-- People Who Accessed This Space Section -->
              <div class="accessed-header">
                <span class="accessed-title">PEOPLE WHO ACCESSED ({{ spaceService.space().members.length }})</span>
                <span class="accessed-subtitle">Real authenticated accounts and sessions</span>
              </div>

              <div class="agent-list">
                @for (member of spaceService.space().members; track member.id) {
                  <button 
                    class="agent-item" 
                    [class.active]="realtyService.activeAgent().uid === member.id || realtyService.activeAgent().email === member.email"
                    (click)="selectMemberPersona(member)">
                    @if (member.photoURL) {
                      <img [src]="member.photoURL" [alt]="member.name" class="avatar-sm-img" />
                    } @else {
                      <div class="avatar-sm" [style.background]="member.role === 'owner' ? 'linear-gradient(135deg, #4285F4, #34A853)' : (member.role === 'guest' ? 'linear-gradient(135deg, #64748b, #94a3b8)' : 'linear-gradient(135deg, #10b981, #14b8a6)')">
                        {{ member.name.charAt(0) }}
                      </div>
                    }
                    <div class="agent-info">
                      <div class="agent-title-row">
                        <span class="agent-name-text">{{ member.name }}</span>
                        <span class="badge" [ngClass]="'badge-' + member.joinedVia">{{ member.joinedVia | uppercase }}</span>
                      </div>
                      <div class="agent-meta-text">
                        {{ member.email }} • Accessed {{ formatAccessTime(member.lastActiveAt || member.joinedAt) }}
                      </div>
                    </div>
                    @if (realtyService.activeAgent().uid === member.id || realtyService.activeAgent().email === member.email) {
                      <span class="active-dot" title="Active on this device">●</span>
                    }
                  </button>
                } @empty {
                  <div class="empty-accessed-note">
                    <span>Only your current session has accessed this space so far. Share invite code to collaborate with your team.</span>
                  </div>
                }
              </div>

              <div class="dropdown-footer">
                <button class="btn btn-xs btn-secondary w-full" (click)="copyInviteLink()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  <span>Share Space Invite Link</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-container {
      height: 62px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-secondary);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
      transition: background 0.25s, border-color 0.25s;
    }

    .nav-left, .nav-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
      text-decoration: none;
      cursor: pointer;
    }

    .brand-gem {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f2dfb5, #a98042);
      color: #162131;
      display: grid;
      place-items: center;
      box-shadow: 0 4px 12px rgba(203, 168, 107, 0.35);
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .brand-title {
      font-family: var(--font-sans);
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }

    .gold-text {
      color: #cba86b;
    }

    .brand-subtitle {
      font-size: 0.64rem;
      font-weight: 700;
      color: var(--text-dim);
      letter-spacing: 0.08em;
    }

    .city-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 4px 10px;
      font-size: 0.74rem;
      color: var(--text-secondary);
    }

    .city-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .city-name {
      font-weight: 600;
    }

    .city-badge {
      background: rgba(203, 168, 107, 0.15);
      color: var(--gold);
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      font-family: var(--font-mono);
    }

    .cloud-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 4px 10px;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-dim);
      transition: all 0.2s ease;
    }

    .cloud-pill.cloud-connected {
      border-color: rgba(16, 185, 129, 0.35);
      background: rgba(16, 185, 129, 0.08);
      color: #10b981;
    }

    .cloud-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .cloud-pill.cloud-connected .cloud-dot {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    /* Space & Invite Pill */
    .space-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 4px 10px;
      font-size: 0.73rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .space-pill:hover {
      border-color: var(--gold);
      background: var(--gold-surface);
      color: var(--gold);
    }

    .space-name {
      font-weight: 700;
    }

    .space-badge {
      background: rgba(203, 168, 107, 0.15);
      color: var(--gold);
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-full);
    }

    /* Google User Profile Pill */
    .google-user-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 3px 10px 3px 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .google-user-pill:hover {
      border-color: #4285F4;
      background: var(--bg-card);
    }

    .google-avatar-img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    .google-avatar-fallback {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #4285F4;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.72rem;
    }

    .google-user-meta {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .google-name {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-main);
      max-width: 105px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .google-tag {
      background: rgba(66, 133, 244, 0.12);
      color: #4285F4;
      font-size: 0.62rem;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: var(--radius-full);
    }

    .btn-google-nav {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-surface);
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 5px 12px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-google-nav:hover {
      background: var(--bg-card);
      border-color: #4285F4;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15);
    }

    /* Theme Toggle Button */
    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 6px 11px;
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .theme-toggle-btn:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
      color: var(--text-main);
      transform: translateY(-1px);
    }

    .agent-menu-container {
      position: relative;
    }

    .agent-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 4px 10px 4px 5px;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all 0.15s ease;
      color: var(--text-main);
    }

    .agent-pill:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
    }

    .avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.76rem;
    }

    .agent-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.2;
    }

    .agent-name {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .agent-role-tag {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .role-admin { color: #f59e0b; }
    .role-manager { color: #0284c7; }
    .role-agent { color: #16a34a; }

    .chevron {
      color: var(--text-dim);
      transition: transform 0.2s;
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    /* Agent Dropdown */
    .agent-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 320px;
      max-width: 90vw;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 12px;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      animation: dropDown 0.15s ease;
    }

    @keyframes dropDown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 10px;
    }

    .dropdown-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-main);
      display: block;
    }

    .dropdown-desc {
      font-size: 0.68rem;
      color: var(--text-dim);
    }

    .avatar-img {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    /* Current User Card */
    .current-user-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px;
      margin-bottom: 12px;
    }

    .current-user-main {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .avatar-card-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid var(--gold-accent);
    }

    .avatar-card {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.82rem;
      flex-shrink: 0;
    }

    .current-user-meta {
      flex: 1;
      overflow: hidden;
    }

    .current-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .current-email {
      font-size: 0.68rem;
      color: var(--text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .current-tag-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .access-method-chip {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(203, 168, 107, 0.15);
      color: var(--gold-accent);
      letter-spacing: 0.4px;
    }

    .user-action-buttons {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--border-subtle);
    }

    .btn-google-action {
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #d1d5db;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }

    .btn-google-action:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    /* Accessed Members Section */
    .accessed-header {
      display: flex;
      flex-direction: column;
      margin-bottom: 6px;
      padding-top: 4px;
    }

    .accessed-title {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--text-main);
    }

    .accessed-subtitle {
      font-size: 0.65rem;
      color: var(--text-dim);
    }

    .agent-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 220px;
      overflow-y: auto;
    }

    .agent-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: background 0.12s;
    }

    .agent-item:hover {
      background: var(--bg-surface);
    }

    .agent-item.active {
      background: rgba(203, 168, 107, 0.12);
      border-color: rgba(203, 168, 107, 0.35);
    }

    .avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.74rem;
      flex-shrink: 0;
    }

    .avatar-sm-img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .active-dot {
      color: #10b981;
      font-size: 0.75rem;
      margin-left: auto;
    }

    .empty-accessed-note {
      font-size: 0.7rem;
      color: var(--text-dim);
      padding: 8px 4px;
      text-align: center;
      line-height: 1.4;
    }

    .agent-info {
      flex: 1;
      overflow: hidden;
    }

    .agent-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .agent-name-text {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .agent-meta-text {
      font-size: 0.67rem;
      color: var(--text-dim);
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-google {
      background: rgba(66, 133, 244, 0.15);
      color: #3b82f6;
    }

    .badge-passcode {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .badge-invite {
      background: rgba(99, 102, 241, 0.15);
      color: #6366f1;
    }

    .badge-guest {
      background: rgba(100, 116, 139, 0.15);
      color: #64748b;
    }

    .dropdown-footer {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    /* Mobile Responsiveness for Top Navbar */
    @media (max-width: 768px) {
      .navbar-container {
        padding: 0 10px;
        gap: 6px;
        height: 56px;
      }

      .brand-sub,
      .city-pill,
      .passcode-tag {
        display: none !important;
      }

      .brand-title {
        font-size: 0.92rem;
      }

      .nav-right {
        gap: 5px;
      }

      .nav-right .btn-sm span,
      .theme-toggle-btn span {
        display: none !important;
      }

      .nav-right .btn-sm,
      .theme-toggle-btn {
        padding: 6px;
        min-width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
      }

      .agent-pill {
        padding: 4px;
        gap: 4px;
      }

      .agent-details {
        display: none;
      }

      .agent-dropdown {
        position: fixed;
        top: 58px;
        right: 8px;
        left: 8px;
        width: auto;
        max-width: calc(100vw - 16px);
      }
    }

    @media (max-width: 420px) {
      .brand-gem {
        width: 28px;
        height: 28px;
      }
      .brand-title {
        font-size: 0.85rem;
      }
      .nav-right {
        gap: 4px;
      }
      .nav-right .btn-sm,
      .theme-toggle-btn {
        min-width: 30px;
        height: 30px;
        padding: 5px;
      }
    }
  `]
})
export class NavbarComponent {
  public realtyService = inject(RealtyService);
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);

  public openPropertyModal = output<void>();
  public openLeadModal = output<void>();
  public openVisitModal = output<void>();
  public openClassifiedScanner = output<void>();

  public showAgentMenu = signal<boolean>(false);

  public toggleAgentMenu(): void {
    this.showAgentMenu.update(v => !v);
  }

  public async signInWithGoogle(): Promise<void> {
    const ok = await this.spaceService.loginAndUnlockWithGoogle();
    if (ok) {
      this.realtyService.notify('Signed in with Google successfully!', 'success');
      this.showAgentMenu.set(false);
    }
  }

  public async signOutGoogle(): Promise<void> {
    await this.authService.logout();
    this.realtyService.notify('Signed out of Google account.', 'info');
    this.showAgentMenu.set(false);
  }

  public lockAndSwitch(): void {
    this.spaceService.lockSpace();
    this.showAgentMenu.set(false);
  }

  public selectMemberPersona(member: SpaceMember): void {
    const role: UserRole = member.role === 'owner' ? 'admin' : (member.role === 'guest' ? 'guest' : 'agent');
    const agentProfile: AgentProfile = {
      uid: member.id,
      name: member.name,
      email: member.email,
      phone: '',
      role: role,
      avatarColor: member.role === 'owner' ? 'linear-gradient(135deg, #4285F4, #34A853)' : (member.role === 'guest' ? 'linear-gradient(135deg, #64748b, #94a3b8)' : 'linear-gradient(135deg, #10b981, #14b8a6)'),
      photoURL: member.photoURL,
      joinedVia: member.joinedVia,
      accessedAt: member.lastActiveAt || member.joinedAt,
      activeListingsCount: this.realtyService.properties().filter(p => p.addedBy === member.name).length,
      activeLeadsCount: this.realtyService.leads().filter(l => l.addedBy === member.name).length,
      closedSalesVolumeLakhs: 0,
      commissionEarnedLakhs: 0
    };
    this.realtyService.switchAgent(agentProfile);
    this.showAgentMenu.set(false);
  }

  public copyInviteLink(): void {
    const link = this.spaceService.getInviteLink();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        this.realtyService.notify('Space invite link copied to clipboard!', 'success');
      }).catch(() => {
        this.realtyService.notify(`Invite link: ${link}`, 'info');
      });
    } else {
      this.realtyService.notify(`Invite link: ${link}`, 'info');
    }
  }

  public formatAccessTime(timestamp?: number): string {
    if (!timestamp) return 'Recently';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
