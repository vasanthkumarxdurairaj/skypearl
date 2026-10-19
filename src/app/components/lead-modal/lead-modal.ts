import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtyService } from '../../services/realty.service';
import { 
  LeadCRM, 
  LeadType, 
  LeadStage, 
  LeadPriority, 
  LeadSource, 
  CHENNAI_LOCALITIES, 
  ChennaiLocality, 
  PropertyType,
  FurnishingStatus 
} from '../../models/realty.model';

@Component({
  selector: 'app-lead-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card lead-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <div class="eyebrow-chip">BUYER & CLIENT INTAKE</div>
            <h2 class="modal-title">{{ editingLead() ? 'Edit Customer Requirement' : 'New Buyer / Client Requirement' }}</h2>
            <p class="modal-subtitle">Capture exact Chennai buyer preferences, budget brackets, UDS needs, and funding readiness</p>
            @if (editingLead(); as l) {
              <div class="modal-audit-chip">
                <span>Added by <strong>{{ l.addedBy || l.assignedAgentName || 'Agent' }}</strong></span>
                @if (l.updatedBy && l.updatedBy !== l.addedBy) {
                  <span> • Last updated by <strong>{{ l.updatedBy }}</strong></span>
                }
              </div>
            }
          </div>
          <button class="btn-icon-close" (click)="close.emit()" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Section Navigation Tabs -->
        <div class="modal-tabs">
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'contact'" (click)="activeTab.set('contact')">
            <span class="tab-step">01</span>
            <span>Contact & Profile</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'locality'" (click)="activeTab.set('locality')">
            <span class="tab-step">02</span>
            <span>Localities & Budget</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'layout'" (click)="activeTab.set('layout')">
            <span class="tab-step">03</span>
            <span>Layout, UDS & Size</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'infra'" (click)="activeTab.set('infra')">
            <span class="tab-step">04</span>
            <span>Water & Flood Safety</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'qualification'" (click)="activeTab.set('qualification')">
            <span class="tab-step">05</span>
            <span>Funding & Timeline</span>
          </button>
        </div>

        <!-- Form Scroll Area -->
        <div class="modal-body-scroll">

          <!-- TAB 1: CONTACT & LEAD PROFILE -->
          @if (activeTab() === 'contact') {
            <div class="tab-pane">
              <h4 class="form-section-heading">01 · Client Contact & Relationship Profile</h4>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Client Full Name *</label>
                  <input type="text" class="form-control" placeholder="e.g. Senthil Nathan" [(ngModel)]="name" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Mobile Number *</label>
                  <input type="tel" class="form-control" placeholder="+91 98401 22334" [(ngModel)]="phone" />
                  <span class="form-hint">10-digit Indian mobile; +91 accepted</span>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Alternate Phone</label>
                  <input type="tel" class="form-control" placeholder="Alternate mobile / WhatsApp" [(ngModel)]="altPhone" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Email Address</label>
                  <input type="email" class="form-control" placeholder="client@company.com" [(ngModel)]="email" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Client Type</label>
                  <select class="form-control" [(ngModel)]="leadType">
                    <option value="Buyer">Buyer (Property Purchase)</option>
                    <option value="Tenant">Tenant (Rental Requirement)</option>
                    <option value="Seller">Seller (Property Owner)</option>
                    <option value="Landlord">Landlord (Rental Owner)</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Lead Source</label>
                  <select class="form-control" [(ngModel)]="source">
                    <option value="Website Form">Website Form</option>
                    <option value="Referral">Client Referral</option>
                    <option value="WhatsApp">WhatsApp Inquiry</option>
                    <option value="99acres">99acres Portal</option>
                    <option value="MagicBricks">MagicBricks Portal</option>
                    <option value="Walk-in">Walk-in Office</option>
                    <option value="Instagram/Facebook">Social Media Campaign</option>
                    <option value="Cold call">Cold Call</option>
                    <option value="Existing client">Existing Client</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Pipeline Stage</label>
                  <select class="form-control" [(ngModel)]="stage">
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Site Visit Scheduled">Site Visit Scheduled</option>
                    <option value="In Negotiation">In Negotiation</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Priority</label>
                  <select class="form-control" [(ngModel)]="priority">
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent (Deal Hot)</option>
                    <option value="Medium">Medium / Normal</option>
                    <option value="Low">Low / Long-term</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Next Follow-Up Date</label>
                  <input type="date" class="form-control" [(ngModel)]="followDateString" />
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: LOCALITY & BUDGET -->
          @if (activeTab() === 'locality') {
            <div class="tab-pane">
              <h4 class="form-section-heading">02 · Property Category, Chennai Micro-Markets & Budget Bracket</h4>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Preferred Property Type *</label>
                  <select class="form-control" [(ngModel)]="preferredPropertyType">
                    <option value="Apartment">Apartment</option>
                    <option value="Independent house">Independent House</option>
                    <option value="Villa">Villa</option>
                    <option value="Builder floor">Builder Floor</option>
                    <option value="Commercial">Commercial Office / Retail</option>
                    <option value="Residential Plot">Residential Plot</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Acquisition Purpose</label>
                  <select class="form-control" [(ngModel)]="purpose">
                    <option value="Self-use">Self-use / Primary Residence</option>
                    <option value="Investment">Investment / Capital Appreciation</option>
                    <option value="Rental income">Rental Income</option>
                    <option value="Commercial use">Commercial Use</option>
                    <option value="Development">Development</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <!-- Chennai Localities Multi-Select -->
              <div class="form-group mt-2">
                <div class="label-with-action">
                  <label class="form-label">Preferred Chennai Corridors & Localities (Multi-Select) *</label>
                  <button type="button" class="btn-link-action" (click)="toggleNewLocalityInput()">
                    {{ showNewLocalityInput() ? '✕ Cancel' : '+ Add New Area' }}
                  </button>
                </div>

                @if (showNewLocalityInput()) {
                  <div class="inline-add-location-box">
                    <input 
                      type="text" 
                      class="form-control" 
                      placeholder="Enter new locality / area (e.g. Urapakkam, Guduvanchery)" 
                      [(ngModel)]="newCustomLocalityName"
                      (keydown.enter)="saveCustomLocality($event)"
                      autofocus />
                    <div class="inline-add-actions">
                      <button type="button" class="btn btn-xs btn-primary" (click)="saveCustomLocality()">Save & Select</button>
                      <button type="button" class="btn btn-xs btn-secondary" (click)="toggleNewLocalityInput()">Cancel</button>
                    </div>
                  </div>
                }

                <div class="localities-chip-grid">
                  @for (loc of localities; track loc) {
                    <button 
                      type="button" 
                      class="locality-chip" 
                      [class.selected]="isLocalitySelected(loc)" 
                      (click)="toggleLocality(loc)">
                      <span>{{ loc }}</span>
                      @if (isLocalitySelected(loc)) {
                        <span class="chip-tick">✓</span>
                      }
                    </button>
                  }
                  <button 
                    type="button" 
                    class="locality-chip chip-add-new" 
                    (click)="toggleNewLocalityInput()">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span>Add New Area...</span>
                  </button>
                </div>
              </div>

              <div class="form-row mt-3">
                <div class="form-group flex-1">
                  <label class="form-label">Min Budget (₹ in Lakhs)</label>
                  <input type="number" class="form-control" placeholder="60" [(ngModel)]="budgetMinLakhs" />
                  <span class="form-hint">{{ formatINRFromLakhs(budgetMinLakhs) }}</span>
                </div>

                <div class="form-group flex-1 highlight-budget-box">
                  <label class="form-label">Max Budget (₹ in Lakhs) *</label>
                  <input type="number" class="form-control" placeholder="140" [(ngModel)]="budgetMaxLakhs" />
                  <span class="form-hint">{{ formatINRFromLakhs(budgetMaxLakhs) }}</span>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Pricing Basis</label>
                  <select class="form-control" [(ngModel)]="priceType">
                    <option value="Total price">Total Price</option>
                    <option value="Per sq.ft.">Per sq.ft.</option>
                    <option value="Negotiable">Negotiable</option>
                  </select>
                </div>
              </div>
            </div>
          }

          <!-- TAB 3: LAYOUT, SIZE & UDS -->
          @if (activeTab() === 'layout') {
            <div class="tab-pane">
              <h4 class="form-section-heading">03 · Layout, Size & Land Share (UDS) Requirements</h4>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Preferred BHK</label>
                  <select class="form-control" [(ngModel)]="preferredBhk">
                    <option [ngValue]="'1 RK'">1 RK</option>
                    <option [ngValue]="1">1 BHK</option>
                    <option [ngValue]="2">2 BHK</option>
                    <option [ngValue]="'2.5 BHK'">2.5 BHK</option>
                    <option [ngValue]="3">3 BHK</option>
                    <option [ngValue]="'3.5 BHK'">3.5 BHK</option>
                    <option [ngValue]="4">4 BHK</option>
                    <option [ngValue]="5">5+ BHK / Villa</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Preferred Facing</label>
                  <select class="form-control" [(ngModel)]="preferredFacing">
                    <option value="">No preference / not known</option>
                    <option value="North">North</option>
                    <option value="East">East</option>
                    <option value="North-East">North-East</option>
                    <option value="South-East">South-East</option>
                    <option value="West">West</option>
                    <option value="South">South</option>
                    <option value="North-West">North-West</option>
                    <option value="South-West">South-West</option>
                    <option value="North & East corner">North & East corner</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Floor Position Preference</label>
                  <select class="form-control" [(ngModel)]="preferredFloorDetail">
                    <option value="No preference">No preference</option>
                    <option value="Ground / low floor">Ground / low floor</option>
                    <option value="Middle floors">Middle floors</option>
                    <option value="High floor">High floor</option>
                    <option value="Top floor">Top floor</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Min Built-up Area (sq.ft)</label>
                  <input type="number" class="form-control" placeholder="1200" [(ngModel)]="minBuiltUpSqFt" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Min Carpet Area (sq.ft)</label>
                  <input type="number" class="form-control" placeholder="950" [(ngModel)]="minCarpetSqFt" />
                </div>

                <div class="form-group flex-1 highlight-uds-box">
                  <label class="form-label">Min UDS (Land Share sq.ft) ★</label>
                  <input type="number" class="form-control" placeholder="400" [(ngModel)]="minUdsSqFt" />
                  <span class="form-hint">Ensures high appreciation and land equity</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Balconies Requirement</label>
                  <select class="form-control" [(ngModel)]="requiredBalconies">
                    <option value="">No preference</option>
                    <option value="1 balcony">At least 1 balcony</option>
                    <option value="2 balconies">At least 2 balconies</option>
                    <option value="3+ balconies">3+ balconies</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Bathrooms</label>
                  <select class="form-control" [(ngModel)]="requiredBathrooms">
                    <option value="">No preference</option>
                    <option value="2 bathrooms">At least 2 bathrooms</option>
                    <option value="3 bathrooms">At least 3 bathrooms</option>
                    <option value="4+ bathrooms">4+ bathrooms</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Property Age</label>
                  <select class="form-control" [(ngModel)]="preferredAge">
                    <option value="">No preference</option>
                    <option value="Under construction">Under construction</option>
                    <option value="New / 0–1 year">New / 0–1 year</option>
                    <option value="1–5 years">1–5 years</option>
                    <option value="6–10 years">6–10 years</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Lift Requirement</label>
                  <select class="form-control" [(ngModel)]="liftRequired">
                    <option value="Required / available">Required / available</option>
                    <option value="Not required / unavailable">Not strictly required</option>
                    <option value="Passenger + service lift">Passenger + service lift</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Car Parking</label>
                  <select class="form-control" [(ngModel)]="parkingRequired">
                    <option value="Covered car parking">Covered car parking</option>
                    <option value="2 car parks">2 car parks</option>
                    <option value="Open car parking">Open car parking</option>
                    <option value="No preference / not known">No preference</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Furnishing Status</label>
                  <select class="form-control" [(ngModel)]="furnishingPreferred">
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Fully Furnished">Fully Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>
              </div>
            </div>
          }

          <!-- TAB 4: INFRASTRUCTURE, WATER & FLOOD SAFETY -->
          @if (activeTab() === 'infra') {
            <div class="tab-pane">
              <h4 class="form-section-heading">04 · Water Source, Drainage, Flood Resilience & Amenities</h4>

              <div class="form-row">
                <div class="form-group flex-1 highlight-infra-box">
                  <label class="form-label">Water Source Preference *</label>
                  <select class="form-control" [(ngModel)]="waterSourcePreference">
                    <option value="Metro + borewell">Metro + borewell (Preferred)</option>
                    <option value="Metro water">Metro water</option>
                    <option value="Borewell">Borewell</option>
                    <option value="Not specified">No specific preference</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Drainage System Preference</label>
                  <select class="form-control" [(ngModel)]="drainagePreference">
                    <option value="UGD / municipal sewer">UGD / Municipal Sewer</option>
                    <option value="Septic tank">Septic tank acceptable</option>
                    <option value="Not verified">No preference</option>
                  </select>
                </div>

                <div class="form-group flex-1 highlight-infra-box">
                  <label class="form-label">Waterlogging / Flood Tolerance *</label>
                  <select class="form-control" [(ngModel)]="floodPreference">
                    <option value="No known issue — verify locally">Must have NO waterlogging history</option>
                    <option value="Not checked">Standard verification</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Power Backup Requirement</label>
                  <select class="form-control" [(ngModel)]="powerBackupPreference">
                    <option value="Full backup">Full power backup</option>
                    <option value="Common-area backup only">Common-area backup only</option>
                    <option value="Not specified">Not specified</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Commute / Connectivity Driver</label>
                  <select class="form-control" [(ngModel)]="commutePriority">
                    <option value="OMR / IT corridor">OMR / IT corridor</option>
                    <option value="Metro access">Metro access</option>
                    <option value="GST Road / airport">GST Road / airport</option>
                    <option value="Schools & hospitals">Schools & hospitals</option>
                    <option value="Bus / suburban rail">Bus / suburban rail</option>
                    <option value="Quiet residential street">Quiet residential street</option>
                    <option value="No preference">No preference</option>
                  </select>
                </div>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Must-Have Amenities</label>
                <div class="amenities-grid">
                  @for (amen of availableAmenities; track amen) {
                    <label class="amenity-item" [class.selected]="isAmenitySelected(amen)">
                      <input 
                        type="checkbox" 
                        [checked]="isAmenitySelected(amen)" 
                        (change)="toggleAmenity(amen)" />
                      <span>{{ amen }}</span>
                    </label>
                  }
                </div>
              </div>
            </div>
          }

          <!-- TAB 5: QUALIFICATION & TIMELINE -->
          @if (activeTab() === 'qualification') {
            <div class="tab-pane">
              <h4 class="form-section-heading">05 · Funding Readiness, Legal Approvals & Decision Making</h4>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Buying / Renting Timeline *</label>
                  <select class="form-control" [(ngModel)]="timeline">
                    <option value="Immediate (0–30 days)">Immediate (0–30 days)</option>
                    <option value="1–3 months">1–3 months</option>
                    <option value="3–6 months">3–6 months</option>
                    <option value="6+ months">6+ months</option>
                    <option value="Just exploring">Just exploring</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Funding Readiness *</label>
                  <select class="form-control" [(ngModel)]="fundingReadiness">
                    <option value="Funds ready">Funds ready / Cash buyer</option>
                    <option value="Loan pre-approved">Bank loan pre-approved</option>
                    <option value="Loan needed">Bank loan required</option>
                    <option value="Property sale dependent">Dependent on selling another property</option>
                    <option value="Not applicable">Not applicable</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Decision Maker Status</label>
                  <select class="form-control" [(ngModel)]="decisionMakerConfirmed">
                    <option value="Yes">Yes, sole decision maker</option>
                    <option value="Family / partner involved">Family / partner involved</option>
                    <option value="Need to confirm">Need to confirm</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Legal Approval Preference</label>
                  <select class="form-control" [(ngModel)]="requiredApproval">
                    <option value="CMDA approved">CMDA approved</option>
                    <option value="DTCP approved">DTCP approved</option>
                    <option value="RERA registered">RERA registered</option>
                    <option value="Panchayat / local body">Panchayat / local body</option>
                    <option value="">Any approved layout</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Home Loan Pre-Eligibility</label>
                  <select class="form-control" [(ngModel)]="loanReadiness">
                    <option value="Bank loan possible (verify)">Eligible for bank financing</option>
                    <option value="Cash only / loan issue">Cash purchase only</option>
                    <option value="Under bank review">Under bank review</option>
                  </select>
                </div>
              </div>

              <div class="form-group mt-2">
                <label class="form-label">Specific Needs, Non-Negotiables & Context Notes</label>
                <textarea 
                  class="form-control" 
                  rows="3" 
                  placeholder="e.g. Needs high-floor flat away from main road noise, Vastu North/East entrance, near Chettinad Vidyashram school..." 
                  [(ngModel)]="notes"></textarea>
              </div>
            </div>
          }

        </div>

        <!-- Footer Actions -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="close.emit()">Cancel</button>
          <div class="tab-nav-actions">
            @if (activeTab() !== 'contact') {
              <button type="button" class="btn btn-outline" (click)="prevTab()">← Previous Tab</button>
            }
            @if (activeTab() !== 'qualification') {
              <button type="button" class="btn btn-outline" (click)="nextTab()">Next Tab →</button>
            }
            <button type="button" class="btn btn-primary" (click)="save()">
              {{ editingLead() ? 'Update Customer Requirement' : 'Save Customer Requirement' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 16, 26, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 16px;
      overflow-y: auto;
    }
    .lead-modal-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      width: 100%;
      max-width: 900px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-lg);
      animation: modalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      color: var(--text-main);
    }
    @keyframes modalIn {
      from { opacity: 0; transform: translateY(14px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .modal-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: var(--bg-card);
      border-top-left-radius: 18px;
      border-top-right-radius: 18px;
    }
    .eyebrow-chip {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: var(--accent-sky);
      margin-bottom: 4px;
    }
    .modal-title {
      font-size: 19px;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }
    .modal-subtitle {
      font-size: 12px;
      color: var(--text-muted);
      margin: 4px 0 0;
    }
    .btn-icon-close {
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      border-radius: 8px;
      padding: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s;
    }
    .btn-icon-close:hover {
      background: var(--bg-surface);
      color: var(--text-main);
      border-color: var(--border-hover);
    }

    .modal-tabs {
      display: flex;
      overflow-x: auto;
      gap: 6px;
      padding: 10px 24px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
    }
    .tab-btn {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--text-muted);
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: var(--text-main);
      background: var(--bg-card);
    }
    .tab-btn.active {
      color: var(--accent-sky);
      background: rgba(2, 132, 199, 0.1);
      border-color: rgba(2, 132, 199, 0.35);
      font-weight: 700;
    }
    .tab-step {
      font-size: 10px;
      font-weight: 800;
      opacity: 0.8;
    }

    .modal-body-scroll {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
      background: var(--bg-card);
    }
    .form-section-heading {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--accent-sky);
      margin: 0 0 16px;
      text-transform: uppercase;
    }
    .form-row {
      display: flex;
      gap: 14px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .flex-1 { flex: 1; min-width: 170px; }
    .flex-2 { flex: 2; min-width: 260px; }

    .form-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
    }
    .form-hint {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .form-control {
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: 9px;
      color: var(--text-main);
      padding: 9px 12px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-control:focus {
      border-color: var(--accent-sky);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);
    }
    .form-control::placeholder {
      color: var(--text-dim);
    }

    .highlight-budget-box {
      background: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.25);
      border-radius: 10px;
      padding: 8px 10px;
    }
    .highlight-uds-box {
      background: var(--gold-surface);
      border: 1px solid var(--gold-border);
      border-radius: 10px;
      padding: 8px 10px;
    }
    .highlight-infra-box {
      background: rgba(22, 163, 74, 0.08);
      border: 1px solid rgba(22, 163, 74, 0.25);
      border-radius: 10px;
      padding: 8px 10px;
    }

    .localities-chip-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
      gap: 7px;
      max-height: 190px;
      overflow-y: auto;
      padding: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
    }
    .locality-chip {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 7px;
      padding: 6px 10px;
      font-size: 11px;
      color: var(--text-secondary);
      text-align: left;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
    }
    .locality-chip:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
      color: var(--text-main);
    }
    .locality-chip.selected {
      background: rgba(2, 132, 199, 0.1);
      border-color: rgba(2, 132, 199, 0.4);
      color: var(--accent-sky);
      font-weight: 700;
    }
    .chip-tick {
      font-size: 10px;
      color: var(--accent-sky);
    }

    .amenities-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 8px;
    }
    .amenity-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      font-size: 12px;
      color: var(--text-secondary);
      transition: all 0.2s;
    }
    .amenity-item:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
      color: var(--text-main);
    }
    .amenity-item.selected {
      background: rgba(2, 132, 199, 0.12);
      border-color: rgba(2, 132, 199, 0.35);
      color: var(--accent-sky);
      font-weight: 700;
    }
    .amenity-item input {
      accent-color: var(--accent-sky);
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-card);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom-left-radius: 18px;
      border-bottom-right-radius: 18px;
    }
    .tab-nav-actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 9px 15px;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #fff;
      border: 0;
    }
    .btn-primary:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }
    .btn-secondary {
      background: var(--bg-surface);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
    }
    .btn-secondary:hover {
      background: var(--bg-card-hover);
      color: var(--text-main);
      border-color: var(--border-hover);
    }
    .btn-outline {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }
    .btn-outline:hover {
      background: var(--bg-surface);
      color: var(--text-main);
      border-color: var(--border-hover);
    }

    .locality-chip.chip-add-new {
      background: rgba(203, 168, 107, 0.08);
      border: 1px dashed var(--gold);
      color: var(--gold);
      font-weight: 700;
    }
    .locality-chip.chip-add-new:hover {
      background: rgba(203, 168, 107, 0.18);
      transform: translateY(-1px);
    }
    .label-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    .label-with-action .form-label {
      margin-bottom: 0;
    }
    .btn-link-action {
      background: none;
      border: none;
      padding: 0;
      color: var(--gold);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
      transition: opacity 0.15s;
    }
    .btn-link-action:hover {
      opacity: 0.8;
    }
    .inline-add-location-box {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 10px;
      background: var(--bg-surface);
      border: 1px dashed var(--gold);
      border-radius: 9px;
      margin-bottom: 10px;
      animation: fadeIn 0.2s ease-in-out;
    }
    .inline-add-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    .btn-xs {
      padding: 4px 9px;
      font-size: 11px;
      border-radius: 6px;
      cursor: pointer;
    }

    @media (max-width: 640px) {
      .modal-backdrop {
        padding: 6px;
        align-items: flex-end;
      }
      .lead-modal-card {
        max-height: 94vh;
        border-radius: 16px 16px 0 0;
      }
      .modal-header {
        padding: 14px 16px 10px;
      }
      .modal-title {
        font-size: 17px;
      }
      .modal-tabs {
        padding: 6px 10px;
        gap: 4px;
      }
      .tab-btn {
        padding: 6px 10px;
        font-size: 11px;
      }
      .modal-body-scroll {
        padding: 14px 14px;
      }
      .form-row {
        gap: 10px;
        margin-bottom: 10px;
      }
      .flex-1, .flex-2 {
        min-width: 100% !important;
        flex: 1 1 100% !important;
      }
      .localities-checkbox-grid {
        grid-template-columns: 1fr;
      }
      .amenities-grid {
        grid-template-columns: 1fr;
      }
      .modal-footer {
        padding: 12px 14px;
        flex-direction: column-reverse;
        gap: 8px;
      }
      .tab-nav-actions {
        width: 100%;
        justify-content: space-between;
      }
      .modal-footer > .btn {
        width: 100%;
        justify-content: center;
        padding: 10px;
      }
      .tab-nav-actions .btn {
        flex: 1;
        justify-content: center;
      }
    }
  `]
})
export class LeadModalComponent {
  public realtyService = inject(RealtyService);

  public editingLead = input<LeadCRM | null>(null);
  public close = output<void>();

  public activeTab = signal<'contact' | 'locality' | 'layout' | 'infra' | 'qualification'>('contact');

  // Contact
  public name = '';
  public phone = '';
  public altPhone = '';
  public email = '';
  public leadType: LeadType = 'Buyer';
  public stage: LeadStage = 'New';
  public priority: LeadPriority = 'Medium';
  public source: LeadSource = 'Website Form';
  public followDateString = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);

  // Category & Localities
  public preferredPropertyType: PropertyType = 'Apartment';
  public purpose = 'Self-use';
  public preferredLocalities: ChennaiLocality[] = ['OMR'];
  public budgetMinLakhs: number = 60;
  public budgetMaxLakhs: number = 140;
  public priceType = 'Total price';

  // Layout & UDS
  public preferredBhk: number | string = 2;
  public preferredFacing = '';
  public preferredFloorDetail = 'Middle floors';
  public minBuiltUpSqFt?: number;
  public minCarpetSqFt?: number;
  public minUdsSqFt?: number;
  public requiredBalconies = '';
  public requiredBathrooms = '';
  public preferredAge = '';
  public liftRequired = 'Required / available';
  public parkingRequired = 'Covered car parking';
  public furnishingPreferred: FurnishingStatus = 'Semi-Furnished';

  // Infra & Water
  public waterSourcePreference = 'Metro + borewell';
  public drainagePreference = 'UGD / municipal sewer';
  public floodPreference = 'No known issue — verify locally';
  public powerBackupPreference = 'Full backup';
  public commutePriority = 'OMR / IT corridor';
  public selectedAmenities: string[] = ['Power backup', 'Security', 'Lift'];

  // Qualification
  public timeline = '1–3 months';
  public fundingReadiness = 'Loan pre-approved';
  public decisionMakerConfirmed = 'Yes';
  public requiredApproval = 'CMDA approved';
  public loanReadiness = 'Bank loan possible (verify)';
  public notes = '';

  public showNewLocalityInput = signal<boolean>(false);
  public newCustomLocalityName = '';

  get localities() {
    return this.realtyService.localities();
  }

  public toggleNewLocalityInput(): void {
    this.showNewLocalityInput.update(v => !v);
    this.newCustomLocalityName = '';
  }

  public saveCustomLocality(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const trimmed = this.newCustomLocalityName.trim();
    if (!trimmed) return;
    this.realtyService.addLocation(trimmed);
    if (!this.preferredLocalities.includes(trimmed)) {
      this.preferredLocalities.push(trimmed);
    }
    this.showNewLocalityInput.set(false);
    this.newCustomLocalityName = '';
  }

  public availableAmenities = [
    'Lift',
    'Power backup',
    'Security',
    'CCTV',
    'Gym',
    'Swimming pool',
    'Children\'s play area',
    'Clubhouse',
    'Power / water connection',
    'Gated community',
    'Pet friendly',
    'Vastu preferred'
  ];

  ngOnInit() {
    const edit = this.editingLead();
    if (edit) {
      this.name = edit.name;
      this.phone = edit.phone;
      this.altPhone = edit.altPhone || '';
      this.email = edit.email;
      this.leadType = edit.leadType;
      this.stage = edit.stage;
      this.priority = edit.priority;
      this.source = edit.source;
      this.preferredPropertyType = edit.preferredPropertyType;
      this.purpose = edit.purpose || 'Self-use';
      this.preferredLocalities = [...(edit.preferredLocalities || ['OMR'])];
      this.budgetMinLakhs = edit.budgetMinLakhs;
      this.budgetMaxLakhs = edit.budgetMaxLakhs;
      this.priceType = edit.priceType || 'Total price';
      this.preferredBhk = edit.preferredBhk || 2;
      this.preferredFacing = edit.preferredFacing || '';
      this.preferredFloorDetail = edit.preferredFloorDetail || 'Middle floors';
      this.minBuiltUpSqFt = edit.minBuiltUpSqFt;
      this.minCarpetSqFt = edit.minCarpetSqFt;
      this.minUdsSqFt = edit.minUdsSqFt;
      this.requiredBalconies = edit.requiredBalconies || '';
      this.requiredBathrooms = edit.requiredBathrooms || '';
      this.preferredAge = edit.preferredAge || '';
      this.liftRequired = edit.liftRequired || 'Required / available';
      this.parkingRequired = edit.parkingRequired || 'Covered car parking';
      this.furnishingPreferred = edit.furnishingPreferred || 'Semi-Furnished';
      this.waterSourcePreference = edit.waterSourcePreference || 'Metro + borewell';
      this.drainagePreference = edit.drainagePreference || 'UGD / municipal sewer';
      this.floodPreference = edit.floodPreference || 'No known issue — verify locally';
      this.powerBackupPreference = edit.powerBackupPreference || 'Full backup';
      this.commutePriority = edit.commutePriority || 'OMR / IT corridor';
      this.selectedAmenities = [...(edit.amenitiesPreferred || ['Security', 'Lift'])];
      this.timeline = edit.timeline || '1–3 months';
      this.fundingReadiness = edit.fundingReadiness || 'Funds ready';
      this.decisionMakerConfirmed = edit.decisionMakerConfirmed || 'Yes';
      this.requiredApproval = edit.requiredApproval || 'CMDA approved';
      this.loanReadiness = edit.loanReadiness || 'Bank loan possible (verify)';
      this.notes = edit.notes || '';
      if (edit.nextFollowUpDate) {
        this.followDateString = new Date(edit.nextFollowUpDate).toISOString().slice(0, 10);
      }
    }
  }

  public isLocalitySelected(loc: ChennaiLocality): boolean {
    return this.preferredLocalities.includes(loc);
  }

  public toggleLocality(loc: ChennaiLocality): void {
    if (this.isLocalitySelected(loc)) {
      if (this.preferredLocalities.length > 1) {
        this.preferredLocalities = this.preferredLocalities.filter(l => l !== loc);
      }
    } else {
      this.preferredLocalities.push(loc);
    }
  }

  public isAmenitySelected(amen: string): boolean {
    return this.selectedAmenities.includes(amen);
  }

  public toggleAmenity(amen: string): void {
    if (this.isAmenitySelected(amen)) {
      this.selectedAmenities = this.selectedAmenities.filter(a => a !== amen);
    } else {
      this.selectedAmenities.push(amen);
    }
  }

  public nextTab(): void {
    const tabs: ('contact' | 'locality' | 'layout' | 'infra' | 'qualification')[] = ['contact', 'locality', 'layout', 'infra', 'qualification'];
    const idx = tabs.indexOf(this.activeTab());
    if (idx < tabs.length - 1) this.activeTab.set(tabs[idx + 1]);
  }

  public prevTab(): void {
    const tabs: ('contact' | 'locality' | 'layout' | 'infra' | 'qualification')[] = ['contact', 'locality', 'layout', 'infra', 'qualification'];
    const idx = tabs.indexOf(this.activeTab());
    if (idx > 0) this.activeTab.set(tabs[idx - 1]);
  }

  public formatINRFromLakhs(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Crores`;
    }
    return `₹${lakhs.toLocaleString('en-IN')} Lakhs`;
  }

  public save(): void {
    if (!this.name.trim() || !this.phone.trim()) {
      this.realtyService.notify('Please enter client name and mobile number.', 'error');
      this.activeTab.set('contact');
      return;
    }
    if (this.budgetMinLakhs && this.budgetMaxLakhs && Number(this.budgetMinLakhs) > Number(this.budgetMaxLakhs)) {
      this.realtyService.notify('Min budget cannot exceed max budget.', 'error');
      this.activeTab.set('locality');
      return;
    }

    const payload: Partial<LeadCRM> = {
      id: this.editingLead()?.id,
      name: this.name.trim(),
      phone: this.phone.trim(),
      altPhone: this.altPhone.trim(),
      email: this.email.trim(),
      leadType: this.leadType,
      stage: this.stage,
      priority: this.priority,
      source: this.source,
      preferredPropertyType: this.preferredPropertyType,
      purpose: this.purpose,
      preferredLocalities: this.preferredLocalities,
      budgetMinLakhs: Number(this.budgetMinLakhs) || 50,
      budgetMaxLakhs: Number(this.budgetMaxLakhs) || 100,
      priceType: this.priceType,
      preferredBhk: this.preferredBhk,
      preferredFacing: this.preferredFacing,
      preferredFloorDetail: this.preferredFloorDetail,
      minBuiltUpSqFt: this.minBuiltUpSqFt ? Number(this.minBuiltUpSqFt) : undefined,
      minCarpetSqFt: this.minCarpetSqFt ? Number(this.minCarpetSqFt) : undefined,
      minUdsSqFt: this.minUdsSqFt ? Number(this.minUdsSqFt) : undefined,
      requiredBalconies: this.requiredBalconies,
      requiredBathrooms: this.requiredBathrooms,
      preferredAge: this.preferredAge,
      liftRequired: this.liftRequired,
      parkingRequired: this.parkingRequired,
      furnishingPreferred: this.furnishingPreferred,
      waterSourcePreference: this.waterSourcePreference,
      drainagePreference: this.drainagePreference,
      floodPreference: this.floodPreference,
      powerBackupPreference: this.powerBackupPreference,
      commutePriority: this.commutePriority,
      amenitiesPreferred: this.selectedAmenities,
      timeline: this.timeline,
      fundingReadiness: this.fundingReadiness,
      decisionMakerConfirmed: this.decisionMakerConfirmed,
      requiredApproval: this.requiredApproval,
      loanReadiness: this.loanReadiness,
      notes: this.notes.trim(),
      nextFollowUpDate: this.followDateString ? new Date(this.followDateString + 'T00:00:00').getTime() : Date.now() + 86400000 * 2
    };

    this.realtyService.saveLead(payload);
    this.close.emit();
  }
}
