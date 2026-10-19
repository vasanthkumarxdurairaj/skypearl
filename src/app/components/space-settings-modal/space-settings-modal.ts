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
              <img src="logo.png" alt="SkyPearl Build Real Estate" class="space-logo-img" />
            </div>
            <div>
              <h3 class="modal-title">Agency Space & Team Access</h3>
              <p class="modal-subtitle">{{ spaceService.space().name }}</p>
            </div>
          </div>
          <button class="btn-close" (click)="spaceService.showSpaceSettingsModal.set(false)" title="Close">✕</button>
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
                <span class="user-display-name">{{ authService.currentUser()?.displayName || 'Authenticated Google User' }}</span>
                @if (spaceService.isOwner()) {
                  <span class="badge-owner-crown">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>Creator & Owner</span>
                  </span>
                } @else {
                  <span class="badge-role">{{ (spaceService.currentRole() || 'agent') | uppercase }}</span>
                }
              </div>
              <div class="user-email">{{ authService.currentUser()?.email }}</div>
            </div>
            <button class="btn btn-xs btn-outline-danger btn-signout-top" (click)="logout()">Sign Out</button>
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
                Space Creator: <strong>{{ spaceService.space().ownerName || 'Agency Owner' }}</strong> ({{ spaceService.space().ownerEmail }}). Only the Owner can grant access to new team members.
              </span>
            </div>
          }

          <!-- PENDING ACCESS REQUESTS SECTION (Only visible to Owner) -->
          @if (spaceService.isOwner() && spaceService.space().pendingRequests.length > 0) {
            <div class="section-card highlight-card">
              <div class="section-header">
                <span class="section-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <span>Pending Access Requests ({{ spaceService.space().pendingRequests.length }})</span>
                </span>
                <span class="badge-pill warn">Owner Approval Required</span>
              </div>
              <p class="section-desc">Google accounts requesting access to your properties and client leads:</p>
              
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

          <!-- DIRECT EMAIL AUTHORIZATION FORM (Owner Only) -->
          @if (spaceService.isOwner()) {
            <div class="section-card">
              <div class="section-header">
                <span class="section-title">Grant Access by Google Email</span>
                <span class="badge-pill">Owner Authorization</span>
              </div>
              <p class="section-desc">Enter a team agent's Google email to authorize them. They will receive immediate access upon signing in.</p>
              
              <div class="invite-email-row">
                <input 
                  type="email" 
                  class="form-input flex-1" 
                  placeholder="agent.name@gmail.com" 
                  [(ngModel)]="newInviteEmail" 
                  (keyup.enter)="addEmailInvite()" />
                <button class="btn btn-gold btn-sm" (click)="addEmailInvite()">
                  + Grant Access
                </button>
              </div>

              @if (spaceService.space().allowedEmails.length > 0) {
                <div class="allowed-emails-wrap">
                  <span class="sub-label">Authorized Google Accounts:</span>
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
              <span class="section-title">Share Space Link</span>
              <span class="badge-pill">Link Access</span>
            </div>
            <p class="section-desc">Send this link to agents. When they sign in with Google, you can approve their account or pre-authorize their email above.</p>
            <div class="copy-input-row">
              <input type="text" class="form-input mono" [value]="inviteLink()" readonly />
              <button class="btn btn-gold btn-sm" (click)="copyInviteLink()">
                {{ copied() ? '✓ Copied!' : 'Copy Link' }}
              </button>
            </div>
          </div>

          <!-- PEOPLE WHO ACCESSED THIS SPACE (Active Members Directory) -->
          <div class="section-card">
            <div class="section-header">
              <span class="section-title">People Who Accessed ({{ spaceService.space().members.length }})</span>
              <span class="badge-pill">Active Directory</span>
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
                        @if (member.role === 'owner') {
                          <span class="badge-owner">OWNER</span>
                        } @else if (member.role === 'admin') {
                          <span class="badge-admin">ADMIN</span>
                        } @else {
                          <span class="badge-agent">AGENT</span>
                        }
                        <span class="joined-via-badge">{{ formatJoinedVia(member.joinedVia) }}</span>
                      </div>
                      <span class="member-email">{{ member.email }}</span>
                    </div>
                  </div>

                  <div class="member-right">
                    @if (spaceService.isOwner() && member.role !== 'owner') {
                      <div class="member-actions">
                        <select 
                          class="role-select" 
                          [value]="member.role" 
                          (change)="onRoleChange(member.id, $event)">
                          <option value="agent">Agent</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button class="btn btn-xs btn-outline-danger" (click)="spaceService.revokeMemberAccess(member.id)" title="Revoke member access">
                          Revoke
                        </button>
                      </div>
                    } @else {
                      <span class="member-activity">
                        {{ member.role === 'owner' ? 'Owner' : 'Active Member' }}
                      </span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="empty-members-note">
                  No active team members have logged in yet.
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" (click)="lockSpace()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Lock Space & Sign Out</span>
          </button>
          <button class="btn btn-primary btn-sm" (click)="spaceService.showSpaceSettingsModal.set(false)">
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
      background: rgba(10, 16, 26, 0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1200;
      padding: 16px;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-card {
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      border-radius: 18px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
      border: 1px solid var(--border-active);
      background: var(--bg-card);
      color: var(--text-main);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 14px;
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
      background: radial-gradient(circle at 30% 30%, #2a2215, #11141c);
      border: 1px solid rgba(203, 168, 107, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .space-logo-img {
      width: 28px;
      height: 28px;
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
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: var(--text-muted);
      padding: 6px 10px;
      cursor: pointer;
      font-size: 0.95rem;
    }

    .btn-close:hover {
      background: var(--bg-surface);
      color: var(--text-main);
    }

    .modal-scroll-body {
      overflow-y: auto;
      padding-right: 4px;
      margin: 16px 0;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: calc(90vh - 140px);
    }

    .user-status-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-hover);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 12px 14px;
      flex-wrap: wrap;
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
      min-width: 140px;
    }

    .user-name {
      font-weight: 600;
      font-size: 0.88rem;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .user-display-name {
      word-break: break-word;
    }

    .badge-owner-crown {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(203, 168, 107, 0.2);
      color: #e5c378;
      border: 1px solid rgba(203, 168, 107, 0.4);
      white-space: nowrap;
    }

    .badge-role {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      white-space: nowrap;
    }

    .user-email {
      font-size: 0.75rem;
      color: var(--text-muted);
      word-break: break-all;
    }

    .btn-signout-top {
      margin-left: auto;
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
      line-height: 1.45;
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
      gap: 8px;
      flex-wrap: wrap;
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
      white-space: nowrap;
    }

    .badge-pill.warn {
      background: rgba(245, 158, 11, 0.18);
      color: #f59e0b;
    }

    .section-desc {
      font-size: 0.76rem;
      color: var(--text-muted);
      margin: 0 0 12px;
      line-height: 1.4;
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
      flex-wrap: wrap;
    }

    .request-user {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 140px;
    }

    .avatar-sm-img {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .avatar-sm-initial {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4285F4, #34A853);
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
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
      word-break: break-all;
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
      padding: 0 2px;
    }

    .btn-del-tag:hover {
      color: #ef4444;
    }

    /* Links */
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
      flex-wrap: wrap;
    }

    .member-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 140px;
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
      flex-wrap: wrap;
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
      font-weight: 700;
    }

    .badge-admin {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.4);
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 700;
    }

    .badge-agent {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 700;
    }

    .joined-via-badge {
      font-size: 0.65rem;
      color: var(--text-muted);
      background: var(--bg-card);
      padding: 1px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .member-email {
      font-size: 0.72rem;
      color: var(--text-muted);
      word-break: break-all;
    }

    .member-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .role-select {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 3px 6px;
      font-size: 0.72rem;
      color: var(--text-main);
    }

    .member-activity {
      font-size: 0.72rem;
      color: var(--text-muted);
      white-space: nowrap;
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
      gap: 10px;
    }

    /* Mobile Responsive Optimizations */
    @media (max-width: 640px) {
      .modal-backdrop {
        padding: 8px 6px;
        align-items: center;
        justify-content: center;
        overflow-y: hidden;
      }
      .modal-card {
        width: 100% !important;
        max-width: 100% !important;
        height: calc(100dvh - 16px) !important;
        max-height: calc(100dvh - 16px) !important;
        border-radius: 16px !important;
        margin: auto !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 16px 14px !important;
        overflow: hidden !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45) !important;
      }
      .modal-header {
        flex-shrink: 0;
      }
      .modal-scroll-body {
        flex: 1 1 auto;
        min-height: 0;
        margin: 12px 0;
        gap: 14px;
        max-height: none;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }
      .form-input,
      .role-select {
        font-size: 16px !important;
        min-height: 46px;
      }
      .user-status-card {
        padding: 10px 12px;
        gap: 10px;
      }
      .btn-signout-top {
        width: 100%;
        margin-top: 6px;
        text-align: center;
        justify-content: center;
        min-height: 40px;
      }
      .request-item, .member-dir-item {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      .request-actions {
        width: 100%;
        justify-content: flex-end;
      }
      .request-actions .btn {
        flex: 1;
        justify-content: center;
        min-height: 42px;
      }
      .member-right {
        width: 100%;
      }
      .member-actions {
        width: 100%;
        justify-content: space-between;
      }
      .invite-email-row {
        flex-direction: column;
        gap: 8px;
      }
      .invite-email-row .btn {
        width: 100%;
        justify-content: center;
        min-height: 46px;
      }
      .copy-input-row {
        flex-direction: column;
        gap: 8px;
      }
      .copy-input-row .btn {
        width: 100%;
        justify-content: center;
        min-height: 46px;
      }
      .modal-footer {
        flex-shrink: 0;
        flex-direction: column-reverse;
        gap: 8px;
        padding-top: 12px;
        padding-bottom: env(safe-area-inset-bottom, 0px);
      }
      .modal-footer .btn {
        width: 100%;
        justify-content: center;
        padding: 12px;
        min-height: 46px;
        font-size: 14px;
        font-weight: 600;
      }
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

  public addEmailInvite(): void {
    if (this.newInviteEmail.trim()) {
      this.spaceService.grantEmailAccess(this.newInviteEmail.trim());
      this.newInviteEmail = '';
    }
  }

  public onRoleChange(memberId: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select && select.value) {
      this.spaceService.updateMemberRole(memberId, select.value as 'admin' | 'agent');
    }
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
      case 'creator': return 'Creator & Owner';
      case 'email_invite': return 'Authorized Email';
      case 'approved_request': return 'Owner Approved';
      default: return via || 'Google';
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
