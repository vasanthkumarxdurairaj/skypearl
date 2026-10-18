import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtyService } from '../../services/realty.service';
import { 
  PropertyListing, 
  CHENNAI_LOCALITIES, 
  ChennaiLocality, 
  PropertyType, 
  TransactionType, 
  FurnishingStatus,
  ListingStatus 
} from '../../models/realty.model';

@Component({
  selector: 'app-property-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal-card property-modal-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <div>
            <div class="eyebrow-chip">SELLER INTAKE & INVENTORY</div>
            <h2 class="modal-title">{{ editingProperty() ? 'Edit Property Listing' : 'New Seller Listing (Inventory)' }}</h2>
            <p class="modal-subtitle">Comprehensive property specifications, Chennai infrastructure, UDS, and legal clearances</p>
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
            <span>Contact & Owner</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'pricing'" (click)="activeTab.set('pricing')">
            <span class="tab-step">02</span>
            <span>Location & Price</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'layout'" (click)="activeTab.set('layout')">
            <span class="tab-step">03</span>
            <span>Layout, UDS & Size</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'infra'" (click)="activeTab.set('infra')">
            <span class="tab-step">04</span>
            <span>Water, Flood & Infra</span>
          </button>
          <button type="button" class="tab-btn" [class.active]="activeTab() === 'legal'" (click)="activeTab.set('legal')">
            <span class="tab-step">05</span>
            <span>Legal, TNRERA & Docs</span>
          </button>
        </div>

        <!-- Duplicate Warning Alert -->
        @if (duplicateWarning()) {
          <div class="dup-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div class="dup-text">
              <strong>Potential Duplicate Detected:</strong> A property in {{ locality }} with {{ bhk }} BHK and approx {{ builtUpAreaSqFt }} sq.ft already exists (#{{ duplicateWarning()?.id }} - {{ duplicateWarning()?.title }}).
            </div>
          </div>
        }

        <!-- Tab Content -->
        <div class="modal-body-scroll">
          
          <!-- TAB 1: CONTACT & OWNER -->
          @if (activeTab() === 'contact') {
            <div class="tab-pane">
              <h4 class="form-section-heading">01 · Owner Contact & Follow-up Details</h4>
              
              <div class="form-row">
                <div class="form-group flex-2">
                  <label class="form-label">Listing Title *</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    placeholder="e.g. Prestige Courtyards 3 BHK Luxury High-Rise" 
                    [(ngModel)]="title" 
                    (blur)="checkDuplicate()" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Listing Status</label>
                  <select class="form-control" [(ngModel)]="listingStatus">
                    <option value="Available">Available / Active</option>
                    <option value="Under negotiation">Under Negotiation</option>
                    <option value="Sold / closed">Sold / Closed</option>
                    <option value="On hold">On Hold</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Owner Full Name *</label>
                  <input type="text" class="form-control" placeholder="Property Owner / Landlord Name" [(ngModel)]="ownerName" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Mobile Number (10-Digit) *</label>
                  <input type="tel" class="form-control" placeholder="+91 98401 22334" [(ngModel)]="ownerPhone" />
                  <span class="form-hint">Indian mobile; +91 accepted</span>
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Alternate Number</label>
                  <input type="tel" class="form-control" placeholder="Alternate phone" [(ngModel)]="ownerAltPhone" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Owner Email</label>
                  <input type="email" class="form-control" placeholder="owner@example.com" [(ngModel)]="ownerEmail" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Agreed Brokerage / Commission</label>
                  <input type="text" class="form-control" placeholder="e.g. 2% agreed / 1 month rent" [(ngModel)]="brokerageTerms" />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Best Site Visit Timing</label>
                  <input type="text" class="form-control" placeholder="e.g. Weekends after 11 AM" [(ngModel)]="siteVisitTiming" />
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: LOCATION & PRICING -->
          @if (activeTab() === 'pricing') {
            <div class="tab-pane">
              <h4 class="form-section-heading">02 · Property Category, Chennai Locality & Pricing</h4>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Property Type *</label>
                  <select class="form-control" [(ngModel)]="propertyType">
                    <option value="Apartment">Apartment</option>
                    <option value="Independent house">Independent House</option>
                    <option value="Villa">Villa</option>
                    <option value="Builder floor">Builder Floor</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Office">Office</option>
                    <option value="Shop">Shop</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Residential Plot">Residential Plot</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Transaction Type</label>
                  <select class="form-control" [(ngModel)]="transactionType">
                    <option value="Sale">Outright Sale</option>
                    <option value="Rent">Rental</option>
                    <option value="Lease">Commercial Lease</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Chennai Locality (38 Micro-Markets) *</label>
                  <select class="form-control" [(ngModel)]="locality" (change)="checkDuplicate()">
                    @for (loc of localities; track loc) {
                      <option [value]="loc">{{ loc }}</option>
                    }
                  </select>
                </div>

                <div class="form-group flex-2">
                  <label class="form-label">Area / Street / Gated Community Landmark</label>
                  <input type="text" class="form-control" placeholder="e.g. Near Sholinganallur Toll / Uthandi Beach Road" [(ngModel)]="subLocation" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">
                    {{ transactionType === 'Rent' ? 'Rent per Month (₹ Lakhs) *' : 'Quoted Price (₹ Lakhs) *' }}
                  </label>
                  <input type="number" class="form-control" placeholder="125" [(ngModel)]="priceLakhs" (blur)="checkDuplicate()" />
                  <span class="form-hint">{{ formatINRFromLakhs(priceLakhs) }}</span>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Price Basis</label>
                  <select class="form-control" [(ngModel)]="priceType">
                    <option value="Total price">Total Price</option>
                    <option value="Per sq.ft.">Per sq.ft.</option>
                    <option value="Negotiable">Negotiable</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Quoted Price Includes</label>
                  <select class="form-control" [(ngModel)]="priceInclusions">
                    <option value="All-in cost confirmed in writing">All-in cost confirmed in writing</option>
                    <option value="Base price only">Base price only</option>
                    <option value="Registration / statutory charges included">Registration / statutory charges included</option>
                    <option value="Parking / amenities included">Parking / amenities included</option>
                    <option value="Not confirmed">Not confirmed</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Price Negotiability</label>
                  <select class="form-control" [(ngModel)]="negotiability">
                    <option value="Negotiable">Negotiable</option>
                    <option value="Fixed price">Fixed price</option>
                    <option value="Open to offer">Open to offer</option>
                    <option value="Urgent sale">Urgent sale</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Monthly Maintenance (₹)</label>
                  <input type="number" class="form-control" placeholder="3500" [(ngModel)]="maintenanceMonthlyINR" />
                </div>
              </div>
            </div>
          }

          <!-- TAB 3: LAYOUT, SIZE & UDS -->
          @if (activeTab() === 'layout') {
            <div class="tab-pane">
              <h4 class="form-section-heading">03 · Layout, Size, Undivided Share (UDS) & Interior</h4>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Bedrooms (BHK)</label>
                  <select class="form-control" [(ngModel)]="bhk" (change)="checkDuplicate()">
                    <option [ngValue]="'1 RK'">1 RK</option>
                    <option [ngValue]="1">1 BHK</option>
                    <option [ngValue]="2">2 BHK</option>
                    <option [ngValue]="'2.5 BHK'">2.5 BHK</option>
                    <option [ngValue]="3">3 BHK</option>
                    <option [ngValue]="'3.5 BHK'">3.5 BHK</option>
                    <option [ngValue]="4">4 BHK</option>
                    <option [ngValue]="5">5 BHK</option>
                    <option [ngValue]="'6+ BHK'">6+ BHK</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Built-up Area (sq.ft) *</label>
                  <input type="number" class="form-control" placeholder="1450" [(ngModel)]="builtUpAreaSqFt" (blur)="checkDuplicate()" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Carpet Area (sq.ft)</label>
                  <input type="number" class="form-control" placeholder="1120" [(ngModel)]="carpetAreaSqFt" />
                </div>

                <div class="form-group flex-1 highlight-uds-box">
                  <label class="form-label">UDS (Undivided Share sq.ft) ★</label>
                  <input type="number" class="form-control" placeholder="480" [(ngModel)]="udsSqFt" />
                  <span class="form-hint">Crucial for Chennai apartment resale valuation</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Floor Number</label>
                  <input type="number" class="form-control" placeholder="3" [(ngModel)]="floorNumber" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Total Floors in Building</label>
                  <input type="number" class="form-control" placeholder="10" [(ngModel)]="totalFloors" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Floor Position Detail</label>
                  <select class="form-control" [(ngModel)]="floorPreferenceDetail">
                    <option value="Middle floors">Middle floors</option>
                    <option value="Ground / low floor">Ground / low floor</option>
                    <option value="High floor">High floor</option>
                    <option value="Top floor">Top floor</option>
                    <option value="No preference">No preference</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Facing</label>
                  <select class="form-control" [(ngModel)]="facing">
                    <option value="East">East</option>
                    <option value="North">North</option>
                    <option value="North-East">North-East</option>
                    <option value="South-East">South-East</option>
                    <option value="West">West</option>
                    <option value="South">South</option>
                    <option value="North-West">North-West</option>
                    <option value="South-West">South-West</option>
                    <option value="North & East corner">North & East corner</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Balconies</label>
                  <select class="form-control" [(ngModel)]="balconies">
                    <option value="1 balcony">1 balcony</option>
                    <option value="2 balconies">2 balconies</option>
                    <option value="3+ balconies">3+ balconies</option>
                    <option value="No balcony">No balcony</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Bathrooms</label>
                  <select class="form-control" [(ngModel)]="bathrooms">
                    <option value="1 bathroom">1 bathroom</option>
                    <option value="2 bathrooms">2 bathrooms</option>
                    <option value="3 bathrooms">3 bathrooms</option>
                    <option value="4+ bathrooms">4+ bathrooms</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Building Age</label>
                  <select class="form-control" [(ngModel)]="buildingAge">
                    <option value="New / under construction">New / under construction</option>
                    <option value="0–1 year">0–1 year</option>
                    <option value="2–5 years">2–5 years</option>
                    <option value="6–10 years">6–10 years</option>
                    <option value="11–15 years">11–15 years</option>
                    <option value="16–25 years">16–25 years</option>
                    <option value="25+ years">25+ years</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Furnishing</label>
                  <select class="form-control" [(ngModel)]="furnishing">
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Fully Furnished">Fully Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Lift Facility</label>
                  <select class="form-control" [(ngModel)]="liftFacility">
                    <option value="Required / available">Required / available</option>
                    <option value="Passenger + service lift">Passenger + service lift</option>
                    <option value="Stretcher lift">Stretcher lift</option>
                    <option value="Not required / unavailable">Not required / unavailable</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Car Parking Type</label>
                  <select class="form-control" [(ngModel)]="parkingType">
                    <option value="Covered car parking">Covered car parking</option>
                    <option value="Open car parking">Open car parking</option>
                    <option value="2 car parks">2 car parks</option>
                    <option value="Visitor parking">Visitor parking</option>
                    <option value="2-wheeler">2-wheeler only</option>
                    <option value="No parking">No parking</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Parking Count</label>
                  <select class="form-control" [(ngModel)]="parkingCountDetail">
                    <option value="1 car">1 car</option>
                    <option value="2 cars">2 cars</option>
                    <option value="3+ cars">3+ cars</option>
                    <option value="Covered / stilt">Covered / stilt</option>
                    <option value="Covered + visitor parking">Covered + visitor parking</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
            </div>
          }

          <!-- TAB 4: INFRASTRUCTURE, WATER & FLOOD SAFETY -->
          @if (activeTab() === 'infra') {
            <div class="tab-pane">
              <h4 class="form-section-heading">04 · Chennai Infrastructure, Water Source & Flood Resilience</h4>

              <div class="form-row">
                <div class="form-group flex-1 highlight-infra-box">
                  <label class="form-label">Water Source *</label>
                  <select class="form-control" [(ngModel)]="waterSource">
                    <option value="Metro + borewell">Metro + borewell (Best)</option>
                    <option value="Metro water">Metro water</option>
                    <option value="Borewell">Borewell</option>
                    <option value="Tanker dependent">Tanker dependent</option>
                    <option value="Common / packaged water">Common / packaged water</option>
                    <option value="Not verified">Not verified</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Drainage / Sewage System</label>
                  <select class="form-control" [(ngModel)]="drainage">
                    <option value="UGD / municipal sewer">UGD / Municipal Sewer</option>
                    <option value="Septic tank">Septic tank</option>
                    <option value="Both / mixed">Both / mixed</option>
                    <option value="Not verified">Not verified</option>
                  </select>
                </div>

                <div class="form-group flex-1 highlight-infra-box">
                  <label class="form-label">Waterlogging / Flood History *</label>
                  <select class="form-control" [(ngModel)]="floodHistory">
                    <option value="No known issue — verify locally">No known issue — verify locally</option>
                    <option value="Known waterlogging reported">Known waterlogging reported</option>
                    <option value="Flood-affected previously">Flood-affected previously</option>
                    <option value="Not checked">Not checked</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Power Backup</label>
                  <select class="form-control" [(ngModel)]="powerBackup">
                    <option value="Full backup">Full backup</option>
                    <option value="Common-area backup only">Common-area backup only</option>
                    <option value="No backup">No backup</option>
                    <option value="Not specified">Not specified</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Nearest Metro / Suburban Station (km)</label>
                  <input type="number" class="form-control" placeholder="1.2" [(ngModel)]="metroDistanceKm" />
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
                <label class="form-label">Amenities / Facilities Checklist</label>
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

              <div class="form-group mt-3">
                <label class="form-label">Photo URLs (Multi-Image Previews)</label>
                <div class="photos-input-row">
                  <input 
                    type="url" 
                    class="form-control flex-1" 
                    placeholder="Paste image URL (https://...)" 
                    [(ngModel)]="newPhotoUrl" 
                    (keydown.enter)="addPhoto()" />
                  <button type="button" class="btn btn-secondary" (click)="addPhoto()">Add Photo</button>
                </div>

                @if (photos.length > 0) {
                  <div class="photos-preview-strip">
                    @for (photo of photos; track photo; let idx = $index) {
                      <div class="photo-thumb-wrap">
                        <img [src]="photo" alt="Property thumbnail" />
                        <button type="button" class="btn-remove-photo" (click)="removePhoto(idx)" title="Remove">✕</button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB 5: LEGAL, APPROVALS & TNRERA -->
          @if (activeTab() === 'legal') {
            <div class="tab-pane">
              <h4 class="form-section-heading">05 · Legal Clearances, CMDA / DTCP, TNRERA & Due Diligence</h4>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Approval Status *</label>
                  <select class="form-control" [(ngModel)]="approvalStatus">
                    <option value="CMDA approved">CMDA approved</option>
                    <option value="DTCP approved">DTCP approved</option>
                    <option value="RERA registered">RERA registered</option>
                    <option value="Panchayat / local body">Panchayat / local body</option>
                    <option value="Unapproved">Unapproved</option>
                    <option value="Under process">Under process</option>
                    <option value="Not applicable">Not applicable</option>
                    <option value="Other / verify">Other / verify</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Planning Authority</label>
                  <select class="form-control" [(ngModel)]="approvalAuthority">
                    <option value="CMDA">CMDA</option>
                    <option value="DTCP">DTCP</option>
                    <option value="Greater Chennai Corporation / local body">Greater Chennai Corporation</option>
                    <option value="Other authority">Other authority</option>
                    <option value="Not verified">Not verified</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">TNRERA Registration No</label>
                  <input type="text" class="form-control" placeholder="e.g. TN/01/Building/0192/2019" [(ngModel)]="reraNumber" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Completion / Occupancy Certificate (OC)</label>
                  <select class="form-control" [(ngModel)]="occupancyCertificate">
                    <option value="Available">Available</option>
                    <option value="Not available">Not available</option>
                    <option value="Not applicable / under construction">Under construction</option>
                    <option value="Pending verification">Pending verification</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Patta Status</label>
                  <select class="form-control" [(ngModel)]="pattaStatus">
                    <option value="Patta available">Patta available</option>
                    <option value="Joint patta">Joint patta</option>
                    <option value="Parent documents available">Parent documents available</option>
                    <option value="Title verification pending">Title verification pending</option>
                    <option value="Dispute / issue reported">Dispute / issue reported</option>
                    <option value="Not applicable">Not applicable</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Title / Parent Documents</label>
                  <select class="form-control" [(ngModel)]="titleChainStatus">
                    <option value="Reviewed by lawyer">Reviewed by lawyer</option>
                    <option value="Documents received — not reviewed">Documents received — not reviewed</option>
                    <option value="Pending from owner">Pending from owner</option>
                    <option value="Issue / dispute flagged">Issue / dispute flagged</option>
                    <option value="Not applicable">Not applicable</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Encumbrance Certificate (EC)</label>
                  <select class="form-control" [(ngModel)]="encumbranceCertificate">
                    <option value="Verified clear">Verified clear</option>
                    <option value="Pending verification">Pending verification</option>
                    <option value="Issue found">Issue found</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Property Tax / Municipal Dues</label>
                  <select class="form-control" [(ngModel)]="propertyTaxStatus">
                    <option value="Receipts available, no known dues">Receipts available, no known dues</option>
                    <option value="Dues to be checked">Dues to be checked</option>
                    <option value="Outstanding dues reported">Outstanding dues reported</option>
                    <option value="Not applicable">Not applicable</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Bank Loan Eligibility</label>
                  <select class="form-control" [(ngModel)]="loanEligibility">
                    <option value="Bank loan possible (verify)">Bank loan possible (verify)</option>
                    <option value="Cash only / loan issue">Cash only / loan issue</option>
                    <option value="Under bank review">Under bank review</option>
                    <option value="Not applicable">Not applicable</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Possession / Availability</label>
                  <select class="form-control" [(ngModel)]="possessionTimeline">
                    <option value="Ready to occupy">Ready to occupy</option>
                    <option value="Under construction">Under construction</option>
                    <option value="Tenanted">Tenanted</option>
                    <option value="Owner occupied">Owner occupied</option>
                    <option value="Available later">Available later</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Current Tenancy</label>
                  <select class="form-control" [(ngModel)]="tenancyStatus">
                    <option value="Vacant possession">Vacant possession</option>
                    <option value="Owner occupied">Owner occupied</option>
                    <option value="Tenant occupied">Tenant occupied</option>
                    <option value="Possession after agreed date">Possession after agreed date</option>
                    <option value="Under construction">Under construction</option>
                  </select>
                </div>
              </div>

              <div class="form-group mt-2">
                <label class="form-label">Site Inspection, Flood & Local Risk Notes</label>
                <textarea 
                  class="form-control" 
                  rows="2" 
                  placeholder="Waterlogging history, approach road width, storm water drainage, surrounding construction, noise level..." 
                  [(ngModel)]="floodAndRiskNotes"></textarea>
              </div>

              <div class="form-group mt-2">
                <label class="form-label">Internal Brokerage Notes</label>
                <textarea 
                  class="form-control" 
                  rows="2" 
                  placeholder="Must-haves, seller flexibility, document gaps, who decides, follow-up context..." 
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
            @if (activeTab() !== 'legal') {
              <button type="button" class="btn btn-outline" (click)="nextTab()">Next Tab →</button>
            }
            <button type="button" class="btn btn-primary" (click)="save()">
              {{ editingProperty() ? 'Update Property Listing' : 'Save Property Listing' }}
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
    .property-modal-card {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      width: 100%;
      max-width: 920px;
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
      color: var(--gold);
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

    /* Modal Navigation Tabs */
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
      color: var(--gold);
      background: var(--gold-surface);
      border-color: var(--gold-border);
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
      color: var(--gold);
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
      border-color: var(--gold);
      box-shadow: 0 0 0 3px var(--border-focus);
    }
    .form-control::placeholder {
      color: var(--text-dim);
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
      background: var(--gold-surface);
      border-color: var(--gold-border);
      color: var(--gold);
      font-weight: 700;
    }
    .amenity-item input {
      accent-color: var(--gold);
    }

    .photos-input-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .photos-preview-strip {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 6px;
    }
    .photo-thumb-wrap {
      position: relative;
      width: 80px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .photo-thumb-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .btn-remove-photo {
      position: absolute;
      top: 3px;
      right: 3px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      border: 0;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      font-size: 10px;
      display: grid;
      place-items: center;
      cursor: pointer;
    }

    .dup-alert {
      margin: 12px 24px 0;
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.35);
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #b45309;
      font-size: 12px;
    }
    body.dark-theme .dup-alert {
      color: #fef08a;
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
      background: var(--primary);
      color: #fff;
      border: 0;
    }
    body.dark-theme .btn-primary {
      background: linear-gradient(135deg, #cba86b, #b28b4c);
      color: #0f172a;
    }
    .btn-primary:hover {
      filter: brightness(1.1);
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
  `]
})
export class PropertyModalComponent {
  public realtyService = inject(RealtyService);

  public editingProperty = input<PropertyListing | null>(null);
  public close = output<void>();

  public activeTab = signal<'contact' | 'pricing' | 'layout' | 'infra' | 'legal'>('contact');
  public duplicateWarning = signal<PropertyListing | null>(null);

  // Form Fields
  public title = '';
  public propertyType: PropertyType = 'Apartment';
  public transactionType: TransactionType = 'Sale';
  public locality: ChennaiLocality = 'OMR';
  public subLocation = '';
  public bhk: number | string = 2;
  public builtUpAreaSqFt: number = 1200;
  public carpetAreaSqFt: number = 936;
  public superBuiltUpAreaSqFt: number = 1200;
  public udsSqFt: number = 420;
  public priceLakhs: number = 95;
  public priceType: 'Total price' | 'Per sq.ft.' | 'Negotiable' = 'Total price';
  public priceInclusions: any = 'All-in cost confirmed in writing';
  public maintenanceMonthlyINR: number = 3500;
  public furnishing: FurnishingStatus = 'Semi-Furnished';
  public facing: any = 'East';
  public floorNumber: number | string = 3;
  public totalFloors: number = 10;
  public floorPreferenceDetail = 'Middle floors';
  public balconies = '1 balcony';
  public bathrooms = '2 bathrooms';
  public buildingAge = '2–5 years';
  public liftFacility = 'Required / available';
  public parkingType = 'Covered car parking';
  public parkingCountDetail = '1 car';
  public waterSource = 'Metro + borewell';
  public drainage = 'UGD / municipal sewer';
  public floodHistory = 'No known issue — verify locally';
  public powerBackup = 'Full backup';
  public metroDistanceKm = 1.5;
  public commutePriority = 'OMR / IT corridor';
  public approvalStatus = 'CMDA approved';
  public approvalAuthority = 'CMDA';
  public reraNumber = '';
  public occupancyCertificate = 'Available';
  public pattaStatus = 'Patta available';
  public titleChainStatus = 'Reviewed by lawyer';
  public encumbranceCertificate = 'Verified clear';
  public propertyTaxStatus = 'Receipts available, no known dues';
  public possessionTimeline = 'Ready to occupy';
  public tenancyStatus = 'Vacant possession';
  public loanEligibility = 'Bank loan possible (verify)';
  public negotiability = 'Negotiable';
  public brokerageTerms = '2% agreed';
  public siteVisitTiming = 'Weekends after 11 AM';
  public floodAndRiskNotes = '';
  public notes = '';
  public listingStatus: ListingStatus = 'Available';

  public ownerName = '';
  public ownerPhone = '';
  public ownerAltPhone = '';
  public ownerEmail = '';
  public photos: string[] = [];
  public newPhotoUrl = '';

  public localities = CHENNAI_LOCALITIES;

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

  public selectedAmenities: string[] = ['Security', 'Lift', 'Power backup', 'Covered car parking'];

  ngOnInit() {
    const edit = this.editingProperty();
    if (edit) {
      this.title = edit.title;
      this.propertyType = edit.propertyType;
      this.transactionType = edit.transactionType;
      this.locality = edit.locality;
      this.subLocation = edit.subLocation;
      this.bhk = edit.bhk;
      this.builtUpAreaSqFt = edit.builtUpAreaSqFt;
      this.carpetAreaSqFt = edit.carpetAreaSqFt || Math.round(edit.builtUpAreaSqFt * 0.78);
      this.superBuiltUpAreaSqFt = edit.superBuiltUpAreaSqFt || edit.builtUpAreaSqFt;
      this.udsSqFt = edit.udsSqFt || Math.round(edit.builtUpAreaSqFt * 0.35);
      this.priceLakhs = edit.priceLakhs;
      this.priceType = edit.priceType || 'Total price';
      this.priceInclusions = edit.priceInclusions || 'All-in cost confirmed in writing';
      this.maintenanceMonthlyINR = edit.maintenanceMonthlyINR;
      this.furnishing = edit.furnishing;
      this.facing = edit.facing;
      this.floorNumber = edit.floorNumber;
      this.totalFloors = edit.totalFloors;
      this.floorPreferenceDetail = edit.floorPreferenceDetail || 'Middle floors';
      this.balconies = edit.balconies || '1 balcony';
      this.bathrooms = edit.bathrooms || '2 bathrooms';
      this.buildingAge = edit.buildingAge || '2–5 years';
      this.liftFacility = edit.liftFacility || 'Required / available';
      this.parkingType = edit.parkingType || 'Covered car parking';
      this.parkingCountDetail = edit.parkingCountDetail || '1 car';
      this.waterSource = edit.waterSource || 'Metro + borewell';
      this.drainage = edit.drainage || 'UGD / municipal sewer';
      this.floodHistory = edit.floodHistory || 'No known issue — verify locally';
      this.powerBackup = edit.powerBackup || 'Full backup';
      this.metroDistanceKm = edit.metroDistanceKm || 1.5;
      this.commutePriority = edit.commutePriority || 'OMR / IT corridor';
      this.approvalStatus = edit.approvalStatus || 'CMDA approved';
      this.approvalAuthority = edit.approvalAuthority || 'CMDA';
      this.reraNumber = edit.reraNumber || '';
      this.occupancyCertificate = edit.occupancyCertificate || 'Available';
      this.pattaStatus = edit.pattaStatus || 'Patta available';
      this.titleChainStatus = edit.titleChainStatus || 'Reviewed by lawyer';
      this.encumbranceCertificate = edit.encumbranceCertificate || 'Verified clear';
      this.propertyTaxStatus = edit.propertyTaxStatus || 'Receipts available, no known dues';
      this.possessionTimeline = edit.possessionTimeline || 'Ready to occupy';
      this.tenancyStatus = edit.tenancyStatus || 'Vacant possession';
      this.loanEligibility = edit.loanEligibility || 'Bank loan possible (verify)';
      this.negotiability = edit.negotiability || 'Negotiable';
      this.brokerageTerms = edit.brokerageTerms || '2% agreed';
      this.siteVisitTiming = edit.siteVisitTiming || 'Weekends after 11 AM';
      this.floodAndRiskNotes = edit.floodAndRiskNotes || '';
      this.notes = edit.notes || '';
      this.listingStatus = edit.listingStatus;
      this.ownerName = edit.ownerName;
      this.ownerPhone = edit.ownerPhone;
      this.ownerAltPhone = edit.ownerAltPhone || '';
      this.ownerEmail = edit.ownerEmail || '';
      this.photos = [...(edit.photos || [])];
      this.selectedAmenities = [...(edit.amenities || [])];
    } else {
      this.photos = [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'
      ];
    }
  }

  public checkDuplicate(): void {
    const edit = this.editingProperty();
    const result = this.realtyService.checkDuplicateListing(
      this.locality,
      this.bhk,
      this.builtUpAreaSqFt,
      edit ? edit.id : undefined
    );
    this.duplicateWarning.set(result.isDuplicate ? result.matchedProperty || null : null);
  }

  public isAmenitySelected(amenity: string): boolean {
    return this.selectedAmenities.includes(amenity);
  }

  public toggleAmenity(amenity: string): void {
    if (this.isAmenitySelected(amenity)) {
      this.selectedAmenities = this.selectedAmenities.filter(a => a !== amenity);
    } else {
      this.selectedAmenities.push(amenity);
    }
  }

  public addPhoto(): void {
    if (!this.newPhotoUrl.trim()) return;
    this.photos.push(this.newPhotoUrl.trim());
    this.newPhotoUrl = '';
  }

  public removePhoto(index: number): void {
    this.photos.splice(index, 1);
  }

  public nextTab(): void {
    const tabs: ('contact' | 'pricing' | 'layout' | 'infra' | 'legal')[] = ['contact', 'pricing', 'layout', 'infra', 'legal'];
    const idx = tabs.indexOf(this.activeTab());
    if (idx < tabs.length - 1) this.activeTab.set(tabs[idx + 1]);
  }

  public prevTab(): void {
    const tabs: ('contact' | 'pricing' | 'layout' | 'infra' | 'legal')[] = ['contact', 'pricing', 'layout', 'infra', 'legal'];
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
    if (!this.title.trim()) {
      this.realtyService.notify('Please enter a listing title.', 'error');
      this.activeTab.set('contact');
      return;
    }
    if (!this.ownerName.trim() || !this.ownerPhone.trim()) {
      this.realtyService.notify('Please enter owner name and mobile number.', 'error');
      this.activeTab.set('contact');
      return;
    }

    const payload: Partial<PropertyListing> = {
      id: this.editingProperty()?.id,
      title: this.title.trim(),
      propertyType: this.propertyType,
      transactionType: this.transactionType,
      locality: this.locality,
      subLocation: this.subLocation.trim(),
      bhk: this.bhk,
      builtUpAreaSqFt: Number(this.builtUpAreaSqFt) || 1200,
      carpetAreaSqFt: Number(this.carpetAreaSqFt) || Math.round(Number(this.builtUpAreaSqFt) * 0.78),
      superBuiltUpAreaSqFt: Number(this.superBuiltUpAreaSqFt) || Number(this.builtUpAreaSqFt),
      udsSqFt: Number(this.udsSqFt) || Math.round(Number(this.builtUpAreaSqFt) * 0.35),
      priceLakhs: Number(this.priceLakhs) || 90,
      priceType: this.priceType,
      priceInclusions: this.priceInclusions,
      maintenanceMonthlyINR: Number(this.maintenanceMonthlyINR) || 0,
      furnishing: this.furnishing,
      facing: this.facing,
      floorNumber: this.floorNumber,
      totalFloors: Number(this.totalFloors) || 1,
      floorPreferenceDetail: this.floorPreferenceDetail,
      balconies: this.balconies,
      bathrooms: this.bathrooms,
      buildingAge: this.buildingAge,
      liftFacility: this.liftFacility,
      parkingType: this.parkingType,
      parkingCountDetail: this.parkingCountDetail,
      waterSource: this.waterSource,
      drainage: this.drainage,
      floodHistory: this.floodHistory,
      powerBackup: this.powerBackup,
      metroDistanceKm: Number(this.metroDistanceKm) || 0,
      commutePriority: this.commutePriority,
      amenities: this.selectedAmenities,
      approvalStatus: this.approvalStatus,
      approvalAuthority: this.approvalAuthority,
      reraNumber: this.reraNumber.trim(),
      occupancyCertificate: this.occupancyCertificate,
      pattaStatus: this.pattaStatus,
      titleChainStatus: this.titleChainStatus,
      encumbranceCertificate: this.encumbranceCertificate,
      propertyTaxStatus: this.propertyTaxStatus,
      possessionTimeline: this.possessionTimeline,
      tenancyStatus: this.tenancyStatus,
      loanEligibility: this.loanEligibility,
      negotiability: this.negotiability,
      brokerageTerms: this.brokerageTerms,
      siteVisitTiming: this.siteVisitTiming,
      floodAndRiskNotes: this.floodAndRiskNotes,
      notes: this.notes,
      listingStatus: this.listingStatus,
      ownerName: this.ownerName.trim(),
      ownerPhone: this.ownerPhone.trim(),
      ownerAltPhone: this.ownerAltPhone.trim(),
      ownerEmail: this.ownerEmail.trim(),
      photos: this.photos
    };

    this.realtyService.saveProperty(payload);
    this.close.emit();
  }
}
