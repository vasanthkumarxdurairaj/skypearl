import { Component, Input, Output, EventEmitter, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadCRM, PropertyListing } from '../../models/realty.model';
import { EmailFollowupService, FollowUpTemplateType, EmailAutomationSettings } from '../../services/email-followup.service';
import { RealtyService } from '../../services/realty.service';

@Component({
  selector: 'app-followup-email-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick()">
      <div class="modal-card email-modal-card" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="modal-header">
          <div>
            <div class="eyebrow-chip">CLIENT FOLLOW-UP & EMAIL AUTOMATION</div>
            <h2 class="modal-title">Compose Follow-up Email</h2>
            <p class="modal-subtitle">
              Follow up with <strong>{{ lead.name }}</strong> ({{ lead.preferredPropertyType }} in {{ leadLocalities }})
            </p>
          </div>
          <button class="btn-icon-close" (click)="closeModal()" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body-scroll">

          <!-- Follow-up Due Notice if due -->
          @if (isFollowUpDue()) {
            <div class="due-alert-banner">
              <div class="due-icon">⏰</div>
              <div>
                <strong>Follow-up is Due Today!</strong>
                <p>Scheduled contact date reached. Re-engaging now maintains buyer momentum.</p>
              </div>
            </div>
          }

          <!-- Quick Template Selector -->
          <div class="form-group mb-3">
            <label class="form-label">Select Smart Template</label>
            <div class="template-chips-row">
              <button 
                type="button" 
                class="template-chip" 
                [class.active]="selectedTemplate === 'property_matches'" 
                (click)="applyTemplate('property_matches')">
                <span>🏠 Matching Properties</span>
              </button>
              <button 
                type="button" 
                class="template-chip" 
                [class.active]="selectedTemplate === 'site_visit'" 
                (click)="applyTemplate('site_visit')">
                <span>📅 Site Visit Schedule</span>
              </button>
              <button 
                type="button" 
                class="template-chip" 
                [class.active]="selectedTemplate === 'negotiation'" 
                (click)="applyTemplate('negotiation')">
                <span>🤝 Price & Negotiation</span>
              </button>
              <button 
                type="button" 
                class="template-chip" 
                [class.active]="selectedTemplate === 'check_in'" 
                (click)="applyTemplate('check_in')">
                <span>👋 General Check-in</span>
              </button>
            </div>
          </div>

          <!-- Recipient Fields -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="form-label">Recipient Name</label>
              <input type="text" class="form-control" [(ngModel)]="toName" (ngModelChange)="regenerateDraft()" />
            </div>

            <div class="form-group flex-1">
              <label class="form-label">
                Recipient Email *
                @if (!toEmail) {
                  <span class="text-danger text-xs">(Email required to dispatch)</span>
                }
              </label>
              <input 
                type="email" 
                class="form-control" 
                placeholder="client@gmail.com" 
                [(ngModel)]="toEmail" />
            </div>
          </div>

          <!-- Subject Line -->
          <div class="form-group mt-2">
            <label class="form-label">Email Subject</label>
            <input type="text" class="form-control font-semibold" [(ngModel)]="subject" />
          </div>

          <!-- Message Body -->
          <div class="form-group mt-2">
            <div class="body-header-row">
              <label class="form-label">Message Body</label>
              <span class="body-hint">Fully editable prior to sending</span>
            </div>
            <textarea 
              class="form-control email-textarea" 
              rows="9" 
              [(ngModel)]="messageBody"></textarea>
          </div>

          <!-- Next Follow-Up Reschedule -->
          <div class="reschedule-box glass-panel mt-3">
            <div class="reschedule-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>Reschedule Next Follow-Up After Sending:</span>
            </div>
            <div class="reschedule-pills">
              <button type="button" class="btn-reschedule" [class.selected]="rescheduleDays === 2" (click)="setReschedule(2)">+2 Days</button>
              <button type="button" class="btn-reschedule" [class.selected]="rescheduleDays === 5" (click)="setReschedule(5)">+5 Days</button>
              <button type="button" class="btn-reschedule" [class.selected]="rescheduleDays === 7" (click)="setReschedule(7)">+1 Week</button>
              <button type="button" class="btn-reschedule" [class.selected]="rescheduleDays === 14" (click)="setReschedule(14)">+2 Weeks</button>
            </div>
          </div>

          <!-- API Key Accordion / Instructions -->
          <div class="api-key-accordion mt-3">
            <button 
              type="button" 
              class="accordion-toggle-btn" 
              (click)="showSettingsPanel.set(!showSettingsPanel())">
              <div class="accordion-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span>Automated Email Dispatch Keys (EmailJS / Background Send)</span>
                @if (emailService.hasValidEmailJsKeys()) {
                  <span class="chip-status-active">Keys Configured ✓</span>
                } @else {
                  <span class="chip-status-none">Zero-Key Mode (1-Click)</span>
                }
              </div>
              <span class="accordion-arrow">{{ showSettingsPanel() ? '▲' : '▼' }}</span>
            </button>

            @if (showSettingsPanel()) {
              <div class="settings-content glass-panel p-3 mt-2">
                <div class="faq-callout">
                  <strong>Do you need an API Key?</strong>
                  <ul class="faq-list">
                    <li><strong>No key needed</strong> to use <em>1-Click Native Email</em>: Clicking "Send via Default Email App" opens Gmail/Outlook with the message already written!</li>
                    <li><strong>An API Key is needed</strong> ONLY if you want the app to send emails completely silently in the background without opening an email app.</li>
                    <li>You can get free keys on <a href="https://www.emailjs.com" target="_blank" rel="noopener">EmailJS.com</a> (200 free automated emails/month).</li>
                  </ul>
                </div>

                <div class="form-row mt-3">
                  <div class="form-group flex-1">
                    <label class="form-label text-xs">EmailJS Service ID</label>
                    <input type="text" class="form-control text-xs" placeholder="e.g. service_g492xkd" [(ngModel)]="settingsDraft.emailjsServiceId" />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label text-xs">EmailJS Template ID</label>
                    <input type="text" class="form-control text-xs" placeholder="e.g. template_9w348kx" [(ngModel)]="settingsDraft.emailjsTemplateId" />
                  </div>
                </div>

                <div class="form-row mt-2">
                  <div class="form-group flex-1">
                    <label class="form-label text-xs">EmailJS Public Key</label>
                    <input type="text" class="form-control text-xs" placeholder="e.g. pub_L81_39dfa..." [(ngModel)]="settingsDraft.emailjsPublicKey" />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label text-xs">Sender / Agency Reply-to</label>
                    <input type="email" class="form-control text-xs" placeholder="advisor@skypearl.in" [(ngModel)]="settingsDraft.senderEmail" />
                  </div>
                </div>

                <div class="settings-actions mt-3">
                  <button type="button" class="btn btn-sm btn-gold" (click)="saveSettings()">
                    <span>Save API Keys</span>
                  </button>
                  @if (saveSuccessMessage()) {
                    <span class="text-success text-xs font-semibold ml-2">✓ Keys saved successfully!</span>
                  }
                </div>
              </div>
            }
          </div>

        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="copyEmailText()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>{{ copied() ? 'Copied! ✓' : 'Copy Text' }}</span>
          </button>

          <!-- OPTION A: 1-Click Native Mail Client (Zero Keys Needed) -->
          <button 
            type="button" 
            class="btn btn-primary" 
            (click)="dispatchNativeMail()"
            title="Opens your default email app (Gmail/Outlook/Apple Mail) with pre-filled message">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>Send via Default Email App (1-Click)</span>
          </button>

          <!-- OPTION B: Background EmailJS Send (If keys configured) -->
          <button 
            type="button" 
            class="btn btn-gold" 
            [disabled]="emailService.isSending()"
            (click)="dispatchEmailJs()"
            title="Sends silently in background via EmailJS API">
            @if (emailService.isSending()) {
              <span class="spinner-sm"></span>
              <span>Sending...</span>
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span>Send Automatically (EmailJS)</span>
            }
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(4, 7, 18, 0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .email-modal-card {
      background: var(--surface-card, #0f172a);
      border: 1px solid var(--border-glow, rgba(212, 175, 55, 0.25));
      border-radius: 16px;
      width: 100%;
      max-width: 680px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 30px rgba(212, 175, 55, 0.1);
      overflow: hidden;
      animation: modalFadeIn 0.22s ease-out;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }

    .eyebrow-chip {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--primary-accent, #d4af37);
      background: rgba(212, 175, 55, 0.12);
      padding: 3px 8px;
      border-radius: 6px;
      margin-bottom: 6px;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary, #f8fafc);
      margin: 0;
    }

    .modal-subtitle {
      font-size: 0.82rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 4px;
      margin-bottom: 0;
    }

    .btn-icon-close {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted, #94a3b8);
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-icon-close:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
    }

    .modal-body-scroll {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
    }

    .due-alert-banner {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(212, 175, 55, 0.1));
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      color: var(--text-primary, #f8fafc);
      font-size: 0.85rem;
    }

    .due-icon {
      font-size: 1.4rem;
    }

    .due-alert-banner p {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: var(--text-muted, #cbd5e1);
    }

    .template-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }

    .template-chip {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 6px 12px;
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .template-chip:hover {
      background: rgba(212, 175, 55, 0.1);
      border-color: rgba(212, 175, 55, 0.3);
      color: var(--primary-accent, #d4af37);
    }

    .template-chip.active {
      background: rgba(212, 175, 55, 0.2);
      border-color: var(--primary-accent, #d4af37);
      color: var(--primary-accent, #d4af37);
      font-weight: 600;
    }

    .form-row {
      display: flex;
      gap: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .flex-1 { flex: 1; }

    .form-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary, #cbd5e1);
      margin-bottom: 5px;
    }

    .form-control {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      padding: 8px 12px;
      color: var(--text-primary, #f8fafc);
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .form-control:focus {
      border-color: var(--primary-accent, #d4af37);
      box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.15);
    }

    .body-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }

    .body-hint {
      font-size: 0.72rem;
      color: var(--text-muted, #94a3b8);
    }

    .email-textarea {
      font-family: inherit;
      line-height: 1.5;
      resize: vertical;
    }

    .reschedule-box {
      border-radius: 10px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .reschedule-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--text-secondary, #cbd5e1);
    }

    .reschedule-pills {
      display: flex;
      gap: 6px;
    }

    .btn-reschedule {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.74rem;
      color: var(--text-secondary, #cbd5e1);
      cursor: pointer;
      transition: all 0.18s ease;
    }

    .btn-reschedule.selected {
      background: var(--primary-accent, #d4af37);
      color: #040712;
      border-color: var(--primary-accent, #d4af37);
      font-weight: 600;
    }

    .api-key-accordion {
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      overflow: hidden;
    }

    .accordion-toggle-btn {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: none;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.8rem;
    }

    .accordion-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chip-status-active {
      font-size: 0.65rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .chip-status-none {
      font-size: 0.65rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted, #94a3b8);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .faq-callout {
      background: rgba(59, 130, 246, 0.08);
      border-left: 3px solid #3b82f6;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 0.76rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .faq-list {
      margin: 4px 0 0;
      padding-left: 18px;
      line-height: 1.45;
    }

    .faq-list a {
      color: #60a5fa;
      text-decoration: underline;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary, #f8fafc);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    .btn-primary {
      background: #3b82f6;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-gold {
      background: var(--primary-accent, #d4af37);
      color: #040712;
    }

    .btn-gold:hover {
      background: #e2c04f;
    }

    .btn-sm {
      padding: 6px 10px;
      font-size: 0.76rem;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(0, 0, 0, 0.2);
      border-top-color: #000;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .text-danger { color: #ef4444; }
    .text-success { color: #10b981; }
    .text-xs { font-size: 0.72rem; }
    .font-semibold { font-weight: 600; }
    .ml-2 { margin-left: 8px; }
  `]
})
export class FollowUpEmailModalComponent implements OnInit {
  @Input({ required: true }) lead!: LeadCRM;
  @Output() close = new EventEmitter<void>();

  public emailService = inject(EmailFollowupService);
  public realtyService = inject(RealtyService);

  public selectedTemplate: FollowUpTemplateType = 'property_matches';
  public toName = '';
  public toEmail = '';
  public subject = '';
  public messageBody = '';
  public rescheduleDays = 2;

  public showSettingsPanel = signal<boolean>(false);
  public saveSuccessMessage = signal<boolean>(false);
  public copied = signal<boolean>(false);

  public settingsDraft: EmailAutomationSettings = {
    provider: 'mailto',
    emailjsServiceId: '',
    emailjsTemplateId: '',
    emailjsPublicKey: '',
    senderName: 'SkyPearl Realty Advisors',
    senderEmail: 'chennai-realty@skypearl.space',
    autoLogFollowUp: true
  };

  get leadLocalities(): string {
    return this.lead.preferredLocalities && this.lead.preferredLocalities.length > 0
      ? this.lead.preferredLocalities.join(', ')
      : 'Chennai';
  }

  ngOnInit(): void {
    this.toName = this.lead.name || '';
    this.toEmail = this.lead.email || '';
    this.settingsDraft = { ...this.emailService.emailSettings() };
    this.applyTemplate('property_matches');
  }

  public isFollowUpDue(): boolean {
    if (!this.lead.nextFollowUpDate) return false;
    // Due today or earlier
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return this.lead.nextFollowUpDate <= endOfToday.getTime();
  }

  public setReschedule(days: number): void {
    this.rescheduleDays = days;
  }

  public applyTemplate(type: FollowUpTemplateType): void {
    this.selectedTemplate = type;
    const matchingProps = this.realtyService.properties()
      .filter(p => this.lead.preferredLocalities?.includes(p.locality));

    const draft = this.emailService.generateEmailDraft(
      type,
      { ...this.lead, name: this.toName, email: this.toEmail },
      matchingProps,
      this.realtyService.activeAgent().name || 'SkyPearl Realty Advisor'
    );

    this.subject = draft.subject;
    this.messageBody = draft.body;
  }

  public regenerateDraft(): void {
    this.applyTemplate(this.selectedTemplate);
  }

  public saveSettings(): void {
    this.emailService.saveSettings(this.settingsDraft);
    this.saveSuccessMessage.set(true);
    setTimeout(() => this.saveSuccessMessage.set(false), 3000);
    this.realtyService.notify('Email automation settings saved.', 'success');
  }

  public copyEmailText(): void {
    const fullText = `Subject: ${this.subject}\n\n${this.messageBody}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
      this.realtyService.notify('Email text copied to clipboard.', 'info');
    }
  }

  public dispatchNativeMail(): void {
    if (!this.toEmail) {
      this.realtyService.notify('Please provide a valid recipient email address.', 'error');
      return;
    }

    const ok = this.emailService.openNativeEmailClient(this.toEmail, this.subject, this.messageBody);
    if (ok) {
      this.commitFollowUpLog('Sent via default email client');
      this.realtyService.notify(`Opened email client for ${this.lead.name}. Follow-up scheduled!`, 'success');
      this.closeModal();
    }
  }

  public async dispatchEmailJs(): Promise<void> {
    if (!this.toEmail) {
      this.realtyService.notify('Please provide a valid recipient email address.', 'error');
      return;
    }

    if (!this.emailService.hasValidEmailJsKeys()) {
      this.showSettingsPanel.set(true);
      this.realtyService.notify('Please enter your EmailJS Public Key, Service ID, and Template ID first.', 'error');
      return;
    }

    const res = await this.emailService.sendViaEmailJs(
      this.toEmail,
      this.toName,
      this.subject,
      this.messageBody,
      this.realtyService.activeAgent().name
    );

    if (res.success) {
      this.commitFollowUpLog('Delivered via EmailJS automated dispatch');
      this.realtyService.notify(res.message, 'success');
      this.closeModal();
    } else {
      this.realtyService.notify(res.message, 'error');
    }
  }

  private commitFollowUpLog(actionNote: string): void {
    const now = Date.now();
    const nextDate = now + (this.rescheduleDays * 86400000);

    this.realtyService.leads.update(list =>
      list.map(l => {
        if (l.id === this.lead.id) {
          const updatedNotes = l.notes 
            ? `${l.notes}\n[${new Date().toLocaleDateString('en-IN')}] Follow-up email: ${actionNote}`
            : `[${new Date().toLocaleDateString('en-IN')}] Follow-up email: ${actionNote}`;
          return {
            ...l,
            email: this.toEmail || l.email,
            lastContactDate: now,
            nextFollowUpDate: nextDate,
            notes: updatedNotes,
            updatedAt: now,
            updatedBy: this.realtyService.activeAgent().name
          };
        }
        return l;
      })
    );
    this.realtyService.notify(`Next follow-up set for +${this.rescheduleDays} days.`, 'info');
  }

  public onBackdropClick(): void {
    this.closeModal();
  }

  public closeModal(): void {
    this.close.emit();
  }
}
