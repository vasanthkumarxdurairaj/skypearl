import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Create Collaborative Workspace</h2>
            <p class="modal-subtitle">Share real-time data with team members across devices</p>
          </div>
          <button class="btn-icon-close" (click)="close.emit()" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Form -->
        <div class="form-group">
          <label class="form-label">Workspace Name *</label>
          <input 
            type="text" 
            class="form-control" 
            placeholder="e.g. Mobile App Dev, Marketing Squad" 
            [(ngModel)]="name" />
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea 
            class="form-control" 
            placeholder="What is this workspace used for? Who is collaborating?" 
            [(ngModel)]="description"></textarea>
        </div>

        <div class="notice-box">
          <svg class="notice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p class="notice-text">
            You will be assigned the <strong>Owner</strong> role for this workspace. You can invite team members as <strong>Editors</strong> or <strong>Viewers</strong> anytime.
          </p>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="onCreate()">Create Workspace</button>
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
      font-size: 1.25rem;
      margin-bottom: 2px;
    }

    .modal-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .btn-icon-close {
      background: transparent;
      border: 1px solid var(--border-subtle);
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

    .notice-box {
      display: flex;
      gap: 10px;
      padding: 12px 14px;
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: var(--radius-md);
      margin-bottom: 18px;
      font-size: 0.82rem;
      color: #3730a3;
    }

    body.dark-theme .notice-box {
      color: #c7d2fe;
    }

    .notice-icon {
      font-size: 1.1rem;
    }

    .notice-text {
      line-height: 1.4;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
    }
  `]
})
export class WorkspaceModalComponent {
  public workspaceService = inject(WorkspaceService);
  public close = output<void>();

  public name = '';
  public description = '';

  public onCreate(): void {
    if (!this.name.trim()) {
      alert('Please enter a workspace name.');
      return;
    }
    this.workspaceService.createWorkspace(this.name.trim(), this.description.trim());
    this.close.emit();
  }
}
