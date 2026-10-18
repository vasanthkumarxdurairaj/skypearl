import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { UserRole, WorkspaceMember } from '../../models/workspace.model';

@Component({
  selector: 'app-members-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Shared Access & Collaborators</h2>
            <p class="modal-subtitle">
              Workspace: <strong>{{ workspaceService.activeWorkspace().name }}</strong>
            </p>
          </div>
          <button class="btn-icon-close" (click)="close.emit()" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Role Overview Banner -->
        <div class="role-matrix-box">
          <div class="matrix-item">
            <span class="badge badge-owner">Owner</span>
            <span class="matrix-desc">Full workspace control, member invites & settings</span>
          </div>
          <div class="matrix-item">
            <span class="badge badge-editor">Editor</span>
            <span class="matrix-desc">Can create, update, and edit all shared items</span>
          </div>
          <div class="matrix-item">
            <span class="badge badge-viewer">Viewer</span>
            <span class="matrix-desc">Read-only view for stakeholders & guests</span>
          </div>
        </div>

        <!-- Add Member Form (Only visible or enabled for Owner) -->
        @if (workspaceService.canManageMembers()) {
          <div class="invite-form-box">
            <h4 class="form-section-title">Invite New Collaborator</h4>
            <div class="invite-inputs">
              <input 
                type="email" 
                class="form-control flex-1" 
                placeholder="colleague@company.com" 
                [(ngModel)]="inviteEmail" />

              <select class="form-control role-select" [(ngModel)]="inviteRole">
                <option value="editor">Editor (Can Edit)</option>
                <option value="viewer">Viewer (Read Only)</option>
                <option value="owner">Co-Owner (Full Access)</option>
              </select>

              <button class="btn btn-primary" (click)="onInvite()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Invite
              </button>
            </div>
          </div>
        } @else {
          <div class="viewer-notice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>You have <strong>{{ workspaceService.currentRole() | uppercase }}</strong> access. Only Workspace Owners can invite or modify member roles.</span>
          </div>
        }

        <!-- Current Members List -->
        <div class="members-list-section">
          <h4 class="form-section-title">Current Members ({{ getMemberList().length }})</h4>

          <div class="members-list">
            @for (member of getMemberList(); track member.uid) {
              <div class="member-row">
                <div class="member-avatar" [style.background]="getMemberColor(member.role)">
                  {{ member.displayName.charAt(0).toUpperCase() }}
                </div>

                <div class="member-details">
                  <div class="member-name-row">
                    <span class="member-name">{{ member.displayName }}</span>
                    @if (member.uid === authService.currentUser()?.uid) {
                      <span class="you-badge">(You)</span>
                    }
                  </div>
                  <span class="member-email">{{ member.email }}</span>
                </div>

                <div class="member-actions">
                  @if (workspaceService.canManageMembers() && member.uid !== workspaceService.activeWorkspace().ownerId) {
                    <!-- Role Selector for Owner -->
                    <select 
                      class="form-control form-control-sm role-dropdown"
                      [ngModel]="member.role"
                      (ngModelChange)="onRoleChange(member.uid, $event)">
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button 
                      class="btn btn-danger btn-sm btn-icon" 
                      title="Remove Member" 
                      (click)="onRemove(member.uid)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  } @else {
                    <span class="badge" [ngClass]="'badge-' + member.role">
                      {{ member.role | uppercase }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Done</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .modal-title {
      font-size: 1.3rem;
      margin-bottom: 4px;
    }

    .modal-subtitle {
      font-size: 0.85rem;
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

    .btn-icon-close:hover {
      background: var(--bg-surface);
      color: var(--text-main);
      border-color: var(--border-hover);
    }

    .role-matrix-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .matrix-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .matrix-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .invite-form-box {
      background: rgba(99, 102, 241, 0.06);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 20px;
    }

    .form-section-title {
      font-size: 0.85rem;
      color: var(--text-main);
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .invite-inputs {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .flex-1 { flex: 1; min-width: 180px; }

    .role-select {
      width: 170px;
    }

    .viewer-notice {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-md);
      color: #15803d;
      font-size: 0.84rem;
      margin-bottom: 20px;
    }
    body.dark-theme .viewer-notice {
      color: #34d399;
    }

    .members-list-section {
      margin-bottom: 20px;
    }

    .members-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 250px;
      overflow-y: auto;
    }

    .member-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      transition: all 0.15s;
    }

    .member-row:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
    }

    .member-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .member-details {
      flex: 1;
      overflow: hidden;
    }

    .member-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .member-name {
      font-weight: 600;
      font-size: 0.88rem;
      color: var(--text-main);
    }

    .you-badge {
      font-size: 0.72rem;
      color: var(--primary);
      font-weight: 600;
    }

    .member-email {
      font-size: 0.76rem;
      color: var(--text-muted);
      display: block;
    }

    .member-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-dropdown {
      padding: 4px 8px;
      font-size: 0.78rem;
      width: 100px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
    }
  `]
})
export class MembersModalComponent {
  public workspaceService = inject(WorkspaceService);
  public authService = inject(AuthService);

  public close = output<void>();

  public inviteEmail = '';
  public inviteRole: UserRole = 'editor';

  public getMemberList(): WorkspaceMember[] {
    const ws = this.workspaceService.activeWorkspace();
    if (!ws || !ws.members) return [];
    return Object.values(ws.members);
  }

  public onInvite(): void {
    if (!this.inviteEmail.trim() || !this.inviteEmail.includes('@')) {
      this.workspaceService.notify('Please provide a valid email address.', 'error');
      return;
    }
    const success = this.workspaceService.inviteMember(this.inviteEmail.trim(), this.inviteRole);
    if (success) {
      this.inviteEmail = '';
    }
  }

  public onRoleChange(memberUid: string, newRole: UserRole): void {
    this.workspaceService.changeMemberRole(memberUid, newRole);
  }

  public onRemove(memberUid: string): void {
    if (confirm('Remove this collaborator from the workspace?')) {
      this.workspaceService.removeMember(memberUid);
    }
  }

  public getMemberColor(role: UserRole): string {
    if (role === 'owner') return 'linear-gradient(135deg, #f59e0b, #ec4899)';
    if (role === 'editor') return 'linear-gradient(135deg, #06b6d4, #3b82f6)';
    return 'linear-gradient(135deg, #10b981, #14b8a6)';
  }
}
