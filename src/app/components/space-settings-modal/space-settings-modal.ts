import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpaceService } from '../../services/space.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-space-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="spaceService.showSpaceSettingsModal.set(false)">
      <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="space-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <div>
              <h3 class="modal-title">Agency Space & Invites</h3>
              <p class="modal-subtitle">{{ spaceService.space().name }}</p>
            </div>
          </div>
          <button class="btn-close" (click)="spaceService.showSpaceSettingsModal.set(false)">✕</button>
        </div>

        <!-- Google User Banner (if logged in) -->
        <div class="user-status-card">
          <div class="user-avatar-wrap">
            @if (authService.currentUser()?.photoURL) {
              <img [src]="authService.currentUser()?.photoURL" class="user-photo" alt="Google Avatar" />
            } @else {
              <div class="avatar-fallback">
                {{ (authService.currentUser()?.displayName || 'G').charAt(0) }}
              </div>
            }
          </div>
          <div class="user-info">
            <div class="user-name">
              {{ authService.currentUser()?.displayName || 'Guest Agent Persona' }}
              @if (authService.currentUser()) {
                <span class="badge-google">Google Verified</span>
              }
            </div>
            <div class="user-email">{{ authService.currentUser()?.email || 'agent@skypearl.in' }}</div>
          </div>
          @if (authService.currentUser()) {
            <button class="btn btn-xs btn-outline-danger" (click)="logout()">Sign Out</button>
          } @else {
            <button class="btn btn-xs btn-primary" (click)="signInWithGoogle()">Sign in with Google</button>
          }
        </div>

        <!-- Shareable Direct Invite Link -->
        <div class="section-card">
          <div class="section-header">
            <span class="section-title">One-Click Shareable Invite Link</span>
            <span class="badge-pill">Direct Bypass</span>
          </div>
          <p class="section-desc">Send this link to agents or clients. Opening it automatically unlocks the space.</p>
          <div class="copy-input-row">
            <input type="text" class="form-input mono" [value]="inviteLink()" readonly />
            <button class="btn btn-gold btn-sm" (click)="copyInviteLink()">
              {{ copied() ? '✓ Copied!' : 'Copy Link' }}
            </button>
          </div>
        </div>

        <!-- Active Invite Codes (Self-Invite) -->
        <div class="section-card">
          <div class="section-header">
            <span class="section-title">Active Space Invite Codes</span>
            <button class="btn btn-xs btn-secondary" (click)="generateNewCode()">+ New Code</button>
          </div>
          <div class="tags-cloud">
            @for (code of spaceService.space().inviteCodes; track code) {
              <div class="invite-tag">
                <span class="tag-code">{{ code }}</span>
                <button class="btn-copy-tag" (click)="copyText(code)" title="Copy Code">📋</button>
                @if (spaceService.space().inviteCodes.length > 1) {
                  <button class="btn-del-tag" (click)="spaceService.removeInviteCode(code)" title="Revoke Code">✕</button>
                }
              </div>
            }
          </div>
        </div>

        <!-- Space Passcode Manager -->
        <div class="section-card">
          <div class="section-header">
            <span class="section-title">Agency Space Passcode</span>
          </div>
          <div class="passcode-edit-row">
            <input 
              type="text" 
              class="form-input" 
              [(ngModel)]="editablePasscode" 
              placeholder="Set agency passcode" />
            <button class="btn btn-secondary btn-sm" (click)="savePasscode()">Save Passcode</button>
          </div>
          <p class="section-desc">Current passcode: <strong>{{ spaceService.space().passcode }}</strong></p>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <button class="btn btn-danger btn-sm" (click)="lockSpace()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Lock Space</span>
          </button>
          <button class="btn btn-secondary btn-sm" (click)="spaceService.showSpaceSettingsModal.set(false)">
            Close
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(10, 15, 26, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-card {
      width: 100%;
      max-width: 520px;
      background: var(--bg-card);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-xl);
      padding: 24px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.45);
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 14px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .space-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--gold-surface);
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--gold-border);
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 800;
    }

    .modal-subtitle {
      font-size: 0.76rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.2rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }

    .user-status-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px;
    }

    .user-avatar-wrap {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }

    .user-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-fallback {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #cba86b, #b28b4c);
      color: #101b2a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.1rem;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-weight: 700;
      font-size: 0.88rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-google {
      background: rgba(66, 133, 244, 0.15);
      color: #4285F4;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
    }

    .user-email {
      font-size: 0.74rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .section-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .section-desc {
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .section-desc strong {
      color: var(--gold);
    }

    .badge-pill {
      background: var(--gold-surface);
      color: var(--gold);
      border: 1px solid var(--gold-border);
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--radius-full);
    }

    .copy-input-row, .passcode-edit-row {
      display: flex;
      gap: 8px;
    }

    .form-input {
      flex: 1;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 8px 12px;
      font-size: 0.82rem;
      color: var(--text-main);
    }

    .form-input.mono {
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }

    .tags-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .invite-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      padding: 4px 8px;
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--gold);
    }

    .btn-copy-tag, .btn-del-tag {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.7rem;
      padding: 1px;
      color: var(--text-dim);
    }

    .btn-del-tag:hover {
      color: #e11d48;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 14px;
      margin-top: 4px;
    }

    .btn-danger {
      background: #e11d48;
      color: #ffffff;
      border: none;
      border-radius: var(--radius-sm);
      padding: 7px 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }

    .btn-outline-danger {
      background: transparent;
      border: 1px solid rgba(225, 29, 72, 0.4);
      color: #e11d48;
      border-radius: var(--radius-sm);
      padding: 4px 8px;
      font-weight: 700;
      cursor: pointer;
    }
  `]
})
export class SpaceSettingsModalComponent {
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);

  public editablePasscode = this.spaceService.space().passcode;
  public copied = signal<boolean>(false);

  public inviteLink(): string {
    return this.spaceService.getInviteLink();
  }

  public copyInviteLink(): void {
    navigator.clipboard.writeText(this.inviteLink());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }

  public copyText(text: string): void {
    navigator.clipboard.writeText(text);
  }

  public generateNewCode(): void {
    this.spaceService.generateNewInviteCode();
  }

  public savePasscode(): void {
    this.spaceService.updatePasscode(this.editablePasscode);
  }

  public async signInWithGoogle(): Promise<void> {
    await this.spaceService.loginAndUnlockWithGoogle();
  }

  public async logout(): Promise<void> {
    await this.authService.logout();
  }

  public lockSpace(): void {
    this.spaceService.showSpaceSettingsModal.set(false);
    this.spaceService.lockSpace();
  }
}
