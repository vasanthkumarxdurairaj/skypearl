import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpaceService, AccessRequest, SpaceMember } from '../../services/space.service';
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
              <img src="logo.png" alt="SkyPearl Build Real Estate" class="space-logo-img" />
            </div>
            <div>
              <h3 class="modal-title">Agency Space & Team Access</h3>
              <p class="modal-subtitle">{{ spaceService.space().name }}</p>
            </div>
          </div>
          <button class="btn-close" (click)="spaceService.showSpaceSettingsModal.set(false)">✕</button>
        </div>

        <div class="modal-scroll-body">
          <!-- Space Owner & Current User Status Card -->
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
                {{ authService.currentUser()?.displayName || 'Authenticated Google User' }}
                @if (spaceService.isOwner()) {
                  <span class="badge-owner-crown">👑 Creator & Owner</span>
                } @else {
                  <span class="badge-role">{{ (spaceService.currentRole() || 'agent') | uppercase }}</span>
                }
              </div>
              <div class="user-email">{{ authService.currentUser()?.email }}</div>
            </div>
            <button class="btn btn-xs btn-outline-danger" (click)="logout()">Sign Out</button>
          </div>

          <!-- Space Ownership Info (if viewing user is not owner) -->
          @if (!spaceService.isOwner()) {
            <div class="owner-info-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>
                Space Creator: <strong>{{ spaceService.space().ownerName || 'Agency Owner' }}</strong> ({{ spaceService.space().ownerEmail }}). Only the creator can invite new members and manage access permissions.
              </span>
            </div>
          }

          <!-- PENDING ACCESS REQUESTS SECTION (Only visible to Owner) -->
          @if (spaceService.isOwner() && spaceService.space().pendingRequests.length > 0) {
            <div class="section-card highlight-card">
              <div class="section-header">
                <span class="section-title">
                  🔔 Pending Access Requests ({{ spaceService.space().pendingRequests.length }})
                </span>
                <span class="badge-pill warn">Action Required</span>
              </div>
              <p class="section-desc">Google users requesting access to view your listings and client leads:</p>
              
              <div class="requests-list">
                @for (req of spaceService.space().pendingRequests; track req.uid) {
                  <div class="request-item">
                    <div class="request-user">
                      @if (req.photoURL) {
                        <img [src]="req.photoURL" [alt]="req.name" class="avatar-sm-img" />
                      } @else {
                        <div class="avatar-sm-initial">{{ req.name.charAt(0) }}</div>
                      }
                      <div class="request-meta">
                        <span class="req-name">{{ req.name }}</span>
                        <span class="req-email">{{ req.email }}</span>
                        <span class="req-time">Requested {{ formatTimeAgo(req.requestedAt) }}</span>
                      </div>
                    </div>

                    <div class="request-actions">
                      <button class="btn btn-xs btn-gold" (click)="spaceService.approveAccessRequest(req, 'agent')">
                        ✓ Grant Access
                      </button>
                      <button class="btn btn-xs btn-outline-danger" (click)="spaceService.declineAccessRequest(req.uid)">
                        ✕ Decline
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- DIRECT EMAIL INVITATION FORM (Owner Only) -->
          @if (spaceService.isOwner()) {
            <div class="section-card">
              <div class="section-header">
                <span class="section-title">Give Access by Google Email</span>
                <span class="badge-pill">Direct Whitelist</span>
              </div>
              <p class="section-desc">Enter the Google email of a team agent. They will receive immediate access upon signing in.</p>
              
              <div class="invite-email-row">
                <input 
                  type="email" 
                  class="form-input flex-1" 
                  placeholder="agent.name@gmail.com" 
                  [(ngModel)]="newInviteEmail" 
                  (keyup.enter)="addEmailInvite()" />
                <button class="btn btn-gold btn-sm" (click)="addEmailInvite()">
                  + Give Access
                </button>
              </div>

              @if (spaceService.space().allowedEmails.length > 0) {
                <div class="allowed-emails-wrap">
                  <span class="sub-label">Pre-Authorized Google Accounts:</span>
                  <div class="email-tags-list">
                    @for (email of spaceService.space().allowedEmails; track email) {
                      <div class="email-tag">
                        <span>{{ email }}</span>
                        <button class="btn-del-tag" (click)="spaceService.revokeEmailAccess(email)" title="Revoke Access">✕</button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- SHAREABLE DIRECT INVITE LINK -->
          <div class="section-card">
            <div class="section-header">
              <span class="section-title">One-Click Shareable Invite Link</span>
              <span class="badge-pill">Link Access</span>
            </div>
            <p class="section-desc">Send this link to agents. Anyone opening it and logging in with Google will be admitted into the space.</p>
            <div class="copy-input-row">
              <input type="text" class="form-input mono" [value]="inviteLink()" readonly />
              <button class="btn btn-gold btn-sm" (click)="copyInviteLink()">
                {{ copied() ? '✓ Copied!' : 'Copy Link' }}
              </button>
            </div>
          </div>

          <!-- ACTIVE INVITE CODES (Self-Invite) -->
          <div class="section-card">
            <div class="section-header">
              <span class="section-title">Active Space Invite Codes</span>
              @if (spaceService.isOwner()) {
                <button class="btn btn-xs btn-secondary" (click)="generateNewCode()">+ New Code</button>
              }
            </div>
            <div class="tags-cloud">
              @for (code of spaceService.space().inviteCodes; track code) {
                <div class="invite-tag">
                  <span class="tag-code">{{ code }}</span>
                  <button class="btn-copy-tag" (click)="copyText(code)" title="Copy Code">📋</button>
                  @if (spaceService.isOwner() && spaceService.space().inviteCodes.length > 1) {
                    <button class="btn-del-tag" (click)="spaceService.removeInviteCode(code)" title="Revoke Code">✕</button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- PEOPLE WHO ACCESSED THIS SPACE (Active Members Directory) -->
          <div class="section-card">
            <div class="section-header">
              <span class="section-title">People Who Accessed ({{ spaceService.space().members.length }})</span>
              <span class="badge-pill">Live Directory</span>
            </div>
            <p class="section-desc">Real Google accounts tracking identity on every property and lead record:</p>

            <div class="members-directory-list">
              @for (member of spaceService.space().members; track member.id) {
                <div class="member-dir-item">
                  <div class="member-left">
                    @if (member.photoURL) {
                      <img [src]="member.photoURL" [alt]="member.name" class="avatar-sm-img" />
                    } @else {
                      <div class="avatar-sm-initial" [style.background]="member.role === 'owner' ? 'linear-gradient(135deg, #d4af37, #b8860b)' : 'linear-gradient(135deg, #4285F4, #34A853)'">
                        {{ member.name.charAt(0) }}
                      </div>
                    }
                    <div class="member-meta">
                      <div class="member-name-row">
                        <span class="member-name">{{ member.name }}</span>
                        <span class="badge" [ngClass]="'badge-' + member.role">{{ member.role | uppercase }}</span>
                        <span class="joined-via-badge">{{ formatJoinedVia(member.joinedVia) }}</span>
                      </div>
                      <span class="member-email">{{ member.email }}</span>
                      <span class="member-activity">Last active: {{ formatTimeAgo(member.lastActiveAt || member.joinedAt) }}</span>
                    </div>
                  </div>

                  @if (spaceService.isOwner() && member.role !== 'owner') {
                    <div class="member-right-actions">
                      <button class="btn btn-xs btn-outline-danger" (click)="spaceService.revokeMemberAccess(member.id)" title="Revoke Access">
                        Revoke
                      </button>
                    </div>
                  }
                </div>
              } @empty {
                <div class="empty-members-note">
                  No other accounts have accessed this space yet. Share the invite link above with your team.
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <button class="btn btn-danger btn-sm" (click)="lockSpace()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Lock Space & Sign Out</span>
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
      background: rgba(10, 15, 26, 0.78);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-card {
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      background: var(--bg-card);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-xl);
      padding: 24px;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 40px rgba(203, 168, 107, 0.12);
      color: var(--text-main);
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-subtle);
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
      background: radial-gradient(circle, #2a2215, #11141c);
      border: 1px solid rgba(203, 168, 107, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .space-logo-img {
      width: 30px;
      height: 30px;
      object-fit: contain;
    }

    .modal-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 2px 0 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px;
    }

    .btn-close:hover {
      color: var(--text-main);
    }

    .modal-scroll-body {
      overflow-y: auto;
      padding-right: 4px;
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .user-status-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px 14px;
    }

    .user-avatar-wrap {
      flex-shrink: 0;
    }

    .user-photo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1.5px solid #cba86b;
      object-fit: cover;
    }

    .avatar-fallback {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285F4, #34A853);
      color: white;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.88rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .badge-owner-crown {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(203, 168, 107, 0.2);
      color: #e5c378;
      border: 1px solid rgba(203, 168, 107, 0.4);
    }

    .badge-role {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .user-email {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .owner-info-notice {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .owner-info-notice strong {
      color: var(--text-main);
    }

    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 16px;
    }

    .section-card.highlight-card {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.04);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .section-title {
      font-weight: 600;
      font-size: 0.88rem;
    }

    .badge-pill {
      font-size: 0.68rem;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(203, 168, 107, 0.15);
      color: #cba86b;
      font-weight: 500;
    }

    .badge-pill.warn {
      background: rgba(245, 158, 11, 0.18);
      color: #f59e0b;
    }

    .section-desc {
      font-size: 0.76rem;
      color: var(--text-muted);
      margin: 0 0 12px;
    }

    /* Requests */
    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .request-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 10px 12px;
      gap: 12px;
    }

    .request-user {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar-sm-img {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-sm-initial {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285F4, #34A853);
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .request-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .req-name {
      font-weight: 600;
      font-size: 0.82rem;
    }

    .req-email {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .req-time {
      font-size: 0.68rem;
      color: #cba86b;
    }

    .request-actions {
      display: flex;
      gap: 6px;
    }

    /* Invite Email Form */
    .invite-email-row {
      display: flex;
      gap: 8px;
    }

    .allowed-emails-wrap {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
    }

    .sub-label {
      display: block;
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .email-tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .email-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 0.75rem;
    }

    .btn-del-tag {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.75rem;
    }

    .btn-del-tag:hover {
      color: #ef4444;
    }

    /* Links & Codes */
    .copy-input-row {
      display: flex;
      gap: 8px;
    }

    .form-input {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--text-main);
      font-size: 0.82rem;
      outline: none;
    }

    .form-input.mono {
      font-family: monospace;
      font-size: 0.75rem;
    }

    .tags-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .invite-tag {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-card);
      border: 1px solid rgba(203, 168, 107, 0.35);
      border-radius: 8px;
      padding: 5px 10px;
      font-family: monospace;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .tag-code {
      color: #e5c378;
    }

    .btn-copy-tag {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0;
    }

    /* Members Directory */
    .members-directory-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .member-dir-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 10px 12px;
      gap: 12px;
    }

    .member-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .member-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .member-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .member-name {
      font-weight: 600;
      font-size: 0.84rem;
    }

    .badge-owner {
      background: rgba(203, 168, 107, 0.2);
      color: #e5c378;
      border: 1px solid rgba(203, 168, 107, 0.4);
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .badge-admin {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.4);
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .badge-agent {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .joined-via-badge {
      font-size: 0.65rem;
      color: var(--text-muted);
      background: var(--bg-card);
      padding: 1px 6px;
      border-radius: 4px;
    }

    .member-email {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .member-activity {
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    .empty-members-note {
      font-size: 0.76rem;
      color: var(--text-muted);
      text-align: center;
      padding: 12px;
    }

    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
    }
  `]
})
export class SpaceSettingsModalComponent {
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);

  public newInviteEmail = '';
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

  public addEmailInvite(): void {
    if (this.newInviteEmail.trim()) {
      this.spaceService.grantEmailAccess(this.newInviteEmail.trim());
      this.newInviteEmail = '';
    }
  }

  public generateNewCode(): void {
    this.spaceService.generateNewInviteCode();
  }

  public async logout(): Promise<void> {
    await this.authService.logout();
    this.spaceService.showSpaceSettingsModal.set(false);
  }

  public lockSpace(): void {
    this.spaceService.showSpaceSettingsModal.set(false);
    this.spaceService.lockSpace();
  }

  public formatJoinedVia(via: string): string {
    switch (via) {
      case 'creator': return '👑 Creator';
      case 'email_invite': return '✉️ Invited Email';
      case 'invite_code': return '🎫 Invite Code';
      case 'approved_request': return '✓ Approved Request';
      default: return via;
    }
  }

  public formatTimeAgo(timestamp: number): string {
    if (!timestamp) return 'Recently';
    const diffMs = Date.now() - timestamp;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 2) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
