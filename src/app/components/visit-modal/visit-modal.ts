import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtyService } from '../../services/realty.service';
import { SiteVisit } from '../../models/realty.model';

@Component({
  selector: 'app-visit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card visit-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <h2 class="modal-title">Schedule Property Site Visit</h2>
            <p class="modal-subtitle">Organize in-person client visits with assigned SkyPearl agents</p>
          </div>
          <button class="btn-icon-close" (click)="close.emit()" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">Select Property Listing *</label>
          <select class="form-control" [(ngModel)]="selectedPropertyId" (change)="onPropertySelect()">
            <option value="">-- Choose from available inventory --</option>
            @for (prop of realtyService.properties(); track prop.id) {
              <option [value]="prop.id">
                [{{ prop.locality }}] {{ prop.title }} (₹{{ prop.priceLakhs }} L)
              </option>
            }
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Select Client / Lead *</label>
          <select class="form-control" [(ngModel)]="selectedLeadId" (change)="onLeadSelect()">
            <option value="">-- Choose active client from CRM --</option>
            @for (lead of realtyService.leads(); track lead.id) {
              <option [value]="lead.id">
                {{ lead.name }} ({{ lead.leadType }} - Budget ₹{{ lead.budgetMaxLakhs }} L)
              </option>
            }
          </select>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label">Client Mobile</label>
            <input type="text" class="form-control" [(ngModel)]="leadPhone" />
          </div>

          <div class="form-group flex-1">
            <label class="form-label">Interest Level</label>
            <select class="form-control" [(ngModel)]="interestLevel">
              <option value="Hot">Hot (Ready to close)</option>
              <option value="Warm">Warm (Comparing options)</option>
              <option value="Cold">Cold (Early inquiry)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Visit Agenda & Meeting Notes</label>
          <textarea 
            class="form-control" 
            placeholder="e.g. Buyer visiting with architect and spouse to inspect kitchen ventilation and car parking."
            [(ngModel)]="feedbackNotes"></textarea>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <button class="btn btn-primary" (click)="onSchedule()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Confirm Visit</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .visit-modal-card {
      max-width: 560px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 2px;
      letter-spacing: -0.02em;
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
      margin-bottom: 12px;
    }

    .flex-1 {
      flex: 1;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
      margin-top: 16px;
    }

    @media (max-width: 640px) {
      .modal-backdrop {
        padding: 8px;
        align-items: flex-end;
      }
      .modal-card {
        max-width: 100% !important;
        border-radius: 16px 16px 0 0 !important;
        padding: 16px 14px !important;
      }
      .form-row {
        flex-direction: column;
        gap: 10px;
      }
      .modal-footer {
        flex-direction: column-reverse;
        gap: 8px;
      }
      .modal-footer .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class VisitModalComponent {
  public realtyService = inject(RealtyService);
  public close = output<void>();

  public selectedPropertyId = '';
  public selectedLeadId = '';
  public leadPhone = '';
  public interestLevel: 'Hot' | 'Warm' | 'Cold' = 'Hot';
  public feedbackNotes = '';

  public onPropertySelect(): void {
    // autofill
  }

  public onLeadSelect(): void {
    const lead = this.realtyService.leads().find(l => l.id === this.selectedLeadId);
    if (lead) {
      this.leadPhone = lead.phone;
    }
  }

  public onSchedule(): void {
    if (!this.selectedPropertyId || !this.selectedLeadId) {
      alert('Please select both a property and a client lead.');
      return;
    }

    const prop = this.realtyService.properties().find(p => p.id === this.selectedPropertyId);
    const lead = this.realtyService.leads().find(l => l.id === this.selectedLeadId);

    if (!prop || !lead) return;

    this.realtyService.scheduleVisit({
      propertyId: prop.id,
      propertyTitle: prop.title,
      locality: prop.locality,
      leadId: lead.id,
      leadName: lead.name,
      leadPhone: this.leadPhone || lead.phone,
      feedbackNotes: this.feedbackNotes,
      interestLevel: this.interestLevel
    });

    this.close.emit();
  }
}
