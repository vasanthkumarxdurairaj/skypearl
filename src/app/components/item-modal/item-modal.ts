import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace.service';
import { SharedItem, ItemCategory, ItemPriority } from '../../models/workspace.model';

@Component({
  selector: 'app-item-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h2 class="modal-title">{{ editingItem() ? 'Edit Shared Item' : 'New Shared Item' }}</h2>
            <p class="modal-subtitle">Sharing inside: <strong>{{ workspaceService.activeWorkspace().name }}</strong></p>
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
          <label class="form-label">Title *</label>
          <input 
            type="text" 
            class="form-control" 
            placeholder="e.g. Q3 Security Audit & Encryption Key Rotation" 
            [(ngModel)]="title" />
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Category</label>
            <select class="form-control" [(ngModel)]="category">
              <option value="document">Document</option>
              <option value="task">Task</option>
              <option value="note">Note</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Priority</label>
            <select class="form-control" [(ngModel)]="priority">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent Priority</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Tags (comma-separated)</label>
          <input 
            type="text" 
            class="form-control" 
            placeholder="Firebase, Security, Backend" 
            [(ngModel)]="tagsString" />
        </div>

        <div class="form-group">
          <label class="form-label">Details / Content *</label>
          <textarea 
            class="form-control content-area" 
            placeholder="Describe the shared document, task instructions, or notes..." 
            [(ngModel)]="content"></textarea>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="onSave()">
            {{ editingItem() ? 'Update Item' : 'Share with Team' }}
          </button>
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

    .form-row {
      display: flex;
      gap: 12px;
    }

    .flex-1 { flex: 1; }

    .content-area {
      min-height: 120px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid var(--border-subtle);
      margin-top: 10px;
    }
  `]
})
export class ItemModalComponent {
  public workspaceService = inject(WorkspaceService);
  public editingItem = input<SharedItem | null>(null);
  public close = output<void>();

  public title = '';
  public category: ItemCategory = 'task';
  public priority: ItemPriority = 'medium';
  public tagsString = '';
  public content = '';

  ngOnInit(): void {
    const item = this.editingItem();
    if (item) {
      this.title = item.title;
      this.category = item.category;
      this.priority = item.priority;
      this.tagsString = item.tags ? item.tags.join(', ') : '';
      this.content = item.content;
    }
  }

  public onSave(): void {
    if (!this.title.trim()) {
      alert('Please provide a title.');
      return;
    }

    const tags = this.tagsString
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const existing = this.editingItem();
    if (existing) {
      this.workspaceService.updateItem(existing.id, {
        title: this.title,
        category: this.category,
        priority: this.priority,
        tags,
        content: this.content
      });
    } else {
      this.workspaceService.addItem({
        title: this.title,
        category: this.category,
        priority: this.priority,
        tags,
        content: this.content
      });
    }

    this.close.emit();
  }
}
