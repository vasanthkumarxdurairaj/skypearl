import { Component, ElementRef, ViewChild, inject, output, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassifiedParserService, ParsedClassified } from '../../services/classified-parser.service';
import { RealtyService } from '../../services/realty.service';
import { CHENNAI_LOCALITIES, ChennaiLocality, PropertyType, TransactionType, LeadSource } from '../../models/realty.model';

@Component({
  selector: 'app-classified-scanner-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick()">
      <div class="modal-card scanner-modal-card" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="modal-header">
          <div>
            <div class="eyebrow-chip">THE HINDU CLASSIFIEDS SCANNER</div>
            <h2 class="modal-title">Newspaper Classifieds Reader</h2>
            <p class="modal-subtitle">
              Scan with live camera or paste classified ads. Auto-categorizes Buyer vs Seller, extracts attributes, and generates client-ready pitches.
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
          
          <!-- ============================================== -->
          <!-- STEP 1: CAPTURE / UPLOAD / PASTE VIEW         -->
          <!-- ============================================== -->
          @if (currentStage() === 'capture') {
            <!-- Mode Switcher -->
            <div class="scanner-mode-tabs">
              <button 
                type="button" 
                class="mode-tab-btn" 
                [class.active]="activeInputMode() === 'camera'" 
                (click)="switchInputMode('camera')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                <span>Live Camera</span>
              </button>

              <button 
                type="button" 
                class="mode-tab-btn" 
                [class.active]="activeInputMode() === 'upload'" 
                (click)="switchInputMode('upload')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <span>Upload Clipping</span>
              </button>

              <button 
                type="button" 
                class="mode-tab-btn" 
                [class.active]="activeInputMode() === 'text'" 
                (click)="switchInputMode('text')">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                <span>Paste Classified Text</span>
              </button>
            </div>

            <!-- MODE 1: LIVE CAMERA VIEW (DEFAULT) -->
            @if (activeInputMode() === 'camera') {
              <div class="camera-viewport-card glass-panel" [class.flash-active]="isShutterFlashing()">
                @if (cameraError()) {
                  <div class="camera-error-box">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <h5>{{ cameraError() }}</h5>
                    <p>Make sure your device has camera permissions enabled, or choose the File Upload tab below.</p>
                    <div class="mt-3 d-flex gap-2 justify-content-center">
                      <button class="btn btn-primary btn-sm" (click)="startCamera()">Retry Camera</button>
                      <button class="btn btn-secondary btn-sm" (click)="switchInputMode('upload')">Switch to File Upload</button>
                    </div>
                  </div>
                } @else {
                  <div class="camera-stream-wrapper" (click)="captureFromCamera()" title="Click to Capture">
                    <video #videoElement autoplay playsinline muted></video>
                    
                    <!-- Futuristic Laser Scanning Beam -->
                    <div class="camera-laser-sweep"></div>

                    <!-- Alignment Guide Reticle -->
                    <div class="scanner-reticle">
                      <div class="reticle-corner tl"></div>
                      <div class="reticle-corner tr"></div>
                      <div class="reticle-corner bl"></div>
                      <div class="reticle-corner br"></div>
                      <div class="reticle-guide-text">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
                        <span>Align camera over newspaper classified advertisement</span>
                      </div>
                    </div>

                    <!-- Shutter Flash Overlay -->
                    @if (isShutterFlashing()) {
                      <div class="shutter-flash-overlay"></div>
                    }
                  </div>

                  <div class="camera-controls-bar">
                    <div class="camera-aux-controls">
                      <button type="button" class="btn btn-secondary btn-sm" (click)="toggleFacingMode()" title="Switch Front/Rear Camera">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                        <span>Flip</span>
                      </button>

                      @if (isTorchSupported()) {
                        <button type="button" class="btn btn-secondary btn-sm" [class.btn-active-torch]="isTorchOn()" (click)="toggleTorch()" title="Toggle Camera Flashlight">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                          <span>{{ isTorchOn() ? 'Flash ON' : 'Flash' }}</span>
                        </button>
                      }
                    </div>

                    <button type="button" class="btn btn-shutter" (click)="captureFromCamera()" title="Capture Classified Clipping">
                      <span class="shutter-circle"></span>
                      <span>Capture & Read Ad</span>
                    </button>

                    <button type="button" class="btn btn-secondary btn-sm" (click)="switchInputMode('upload')">
                      <span>Upload File Instead</span>
                    </button>
                  </div>
                }
              </div>
            }

            <!-- MODE 2: FILE UPLOAD DROPZONE -->
            @if (activeInputMode() === 'upload') {
              <div 
                class="scanner-dropzone glass-panel"
                [class.drag-over]="isDragOver()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                (click)="fileInput.click()">
                <input 
                  #fileInput 
                  type="file" 
                  accept="image/*" 
                  (change)="onFileSelected($event)" 
                  style="display: none" />
                
                <div class="dropzone-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                    <path d="M12 12v9"></path>
                    <path d="m16 16-4-4-4 4"></path>
                  </svg>
                </div>
                <h4 class="dropzone-title">Upload The Hindu Newspaper Clipping</h4>
                <p class="dropzone-desc">
                  Drop a camera photo, e-paper screenshot, or clipping of the classified ad.<br>
                  JPG, PNG, WebP supported.
                </p>
                <button type="button" class="btn btn-gold btn-sm mt-3" (click)="$event.stopPropagation(); fileInput.click()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Choose Photo / Screenshot</span>
                </button>
              </div>
            }

            <!-- MODE 3: PASTE TEXT -->
            @if (activeInputMode() === 'text') {
              <div class="paste-text-card glass-panel p-4">
                <label class="form-label">Paste Classified Ad Text (The Hindu)</label>
                <textarea 
                  class="form-control" 
                  rows="6" 
                  placeholder="Paste the raw text of the classified ad here... (e.g. OMR Sholinganallur 3 BHK flat 1450 sqft CCP Lift CMDA appd 95L Ph: 98401 22334)" 
                  [(ngModel)]="manualText"></textarea>
                <div class="paste-actions mt-3">
                  <button type="button" class="btn btn-gold" [disabled]="!manualText.trim()" (click)="processText(manualText)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span>Analyze & Extract Ad</span>
                  </button>
                </div>
              </div>
            }
          }

          <!-- ============================================== -->
          <!-- OCR RECOGNITION PROGRESS INDICATOR            -->
          <!-- ============================================== -->
          @if (isProcessing()) {
            <div class="scanning-progress-panel glass-panel text-center p-5">
              <div class="scanner-laser-box">
                <div class="laser-beam"></div>
                @if (selectedImageThumbnail()) {
                  <img [src]="selectedImageThumbnail()" alt="Processing clipping" class="scanning-img-preview" />
                } @else {
                  <div class="scanning-placeholder-icon">
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.8"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
                  </div>
                }
              </div>
              <h4 class="mt-3">Analyzing Classified Newsprint...</h4>
              <p class="text-muted text-sm">
                Enhancing contrast, parsing Chennai corridors & generating professional real estate pitch.
              </p>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" [style.width.%]="ocrProgress()"></div>
              </div>
              <span class="progress-text">{{ ocrProgress() }}% Complete</span>
            </div>
          }

          <!-- ============================================== -->
          <!-- STEP 2: CONFIRMATION & REVIEW VIEW             -->
          <!-- ============================================== -->
          @if (currentStage() === 'confirm' && parsedData(); as data) {
            <div class="confirmation-container">
              
              <!-- 1. Category Detection Banner with Seller vs Buyer Switcher -->
              <div class="detection-alert-banner" [class.is-seller]="data.detectedType === 'seller'" [class.is-buyer]="data.detectedType === 'buyer'">
                <div class="detection-main">
                  <div class="detection-icon">
                    @if (data.detectedType === 'seller') {
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    } @else {
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                    }
                  </div>
                  <div>
                    <div class="detection-heading">
                      CATEGORY: <strong>{{ data.detectedType === 'seller' ? 'SELLER (PROPERTY LISTING FOR SALE / RENT)' : 'BUYER (CLIENT REQUIREMENT / WANTED)' }}</strong>
                    </div>
                    <div class="detection-subtext">
                      Classified keyword match • {{ data.detectionReasons.slice(0, 3).join(', ') }}
                    </div>
                  </div>
                </div>

                <!-- Type Override Switcher -->
                <div class="type-override-pill">
                  <span class="override-label">Change category:</span>
                  <button 
                    type="button" 
                    class="btn-toggle-type" 
                    [class.active]="data.detectedType === 'seller'"
                    (click)="setType('seller')">
                    Seller (Listing)
                  </button>
                  <button 
                    type="button" 
                    class="btn-toggle-type" 
                    [class.active]="data.detectedType === 'buyer'"
                    (click)="setType('buyer')">
                    Buyer (Requirement)
                  </button>
                </div>
              </div>

              <!-- 2. SMART PARAPHRASE CARD (PITCH & NARRATIVE) -->
              <div class="paraphrase-card glass-panel">
                <div class="paraphrase-header">
                  <div class="paraphrase-title-group">
                    <span class="paraphrase-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      <span>EXECUTIVE REAL ESTATE PITCH</span>
                    </span>
                    <span class="paraphrase-sub">Client-ready narrative description & WhatsApp marketing pitch</span>
                  </div>
                  <div class="paraphrase-actions">
                    <button 
                      type="button" 
                      class="btn-copy-pitch" 
                      (click)="copyParaphrasedPitch(data)"
                      [class.copied]="pitchCopied()">
                      @if (pitchCopied()) {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span>Copied!</span>
                      } @else {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        <span>Copy Pitch</span>
                      }
                    </button>
                    <button 
                      type="button" 
                      class="btn-refresh-pitch" 
                      (click)="regeneratePitch(data)" 
                      title="Update pitch from current form fields">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l6 5.67"/></svg>
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                <div class="paraphrase-body">
                  <textarea 
                    class="form-control paraphrase-textarea" 
                    rows="7" 
                    [(ngModel)]="data.paraphrasedPitch"
                    placeholder="Professional listing pitch will appear here..."></textarea>
                  <div class="paraphrase-footer-tip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>This pitch is automatically formatted for WhatsApp and client communication.</span>
                  </div>
                </div>
              </div>

              <!-- 3. Original Classified Snippet & Raw Text Toggle -->
              <div class="source-snippet-card glass-panel">
                <div class="snippet-header">
                  <div class="snippet-title-row">
                    <span class="newspaper-badge">THE HINDU CLASSIFIEDS</span>
                    <span class="snippet-sub">Original Extracted Newspaper Snippet</span>
                  </div>
                  <button type="button" class="btn-text-link" (click)="toggleRawText()">
                    {{ showRawText() ? 'Hide Raw Text ▲' : 'View Raw OCR Text ▼' }}
                  </button>
                </div>

                @if (selectedImageThumbnail()) {
                  <div class="clipping-thumb-row">
                    <img [src]="selectedImageThumbnail()" alt="Newspaper clipping thumbnail" class="clipping-thumb" />
                    <div class="clipping-note">
                      <strong>Newspaper Image Attached:</strong> This clipping will be saved as verified photo proof for this inventory record.
                    </div>
                  </div>
                }

                @if (showRawText()) {
                  <div class="raw-text-box">
                    <label class="form-hint">Raw Extracted Text:</label>
                    <textarea class="form-control raw-textarea" rows="3" [(ngModel)]="data.rawText" (blur)="reparseFromEditedText()"></textarea>
                    <span class="form-hint">Edit the raw text above and click outside to re-extract attributes.</span>
                  </div>
                }
              </div>

              <!-- 4. Structured Review & Confirmation Form -->
              <div class="review-form glass-panel p-4">
                <h4 class="form-section-heading">
                  Confirm Extracted Details (Editable Before Saving)
                </h4>

                <div class="form-row">
                  <div class="form-group flex-2">
                    <label class="form-label">Title *</label>
                    <input type="text" class="form-control" [(ngModel)]="data.title" (change)="regeneratePitch(data)" />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label">Transaction</label>
                    <select class="form-control" [(ngModel)]="data.transactionType" (change)="regeneratePitch(data)">
                      <option value="Sale">Sale (Outright)</option>
                      <option value="Rent">Rent / To Let</option>
                      <option value="Lease">Lease</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <div class="label-with-action">
                      <label class="form-label">Chennai Locality *</label>
                      <button type="button" class="btn-link-action" (click)="toggleNewLocalityInput()">
                        {{ showNewLocalityInput() ? '✕ Cancel' : '+ Add New' }}
                      </button>
                    </div>

                    @if (!showNewLocalityInput()) {
                      <select class="form-control" [(ngModel)]="data.locality" (change)="onLocalityChange($event); regeneratePitch(data)">
                        @for (loc of localities; track loc) {
                          <option [value]="loc">{{ loc }}</option>
                        }
                        <option value="__ADD_NEW__">+ Add New Location...</option>
                      </select>
                    } @else {
                      <div class="inline-add-location-box">
                        <input 
                          type="text" 
                          class="form-control" 
                          placeholder="Enter locality / corridor name" 
                          [(ngModel)]="newCustomLocalityName"
                          (keydown.enter)="saveCustomLocality($event)"
                          autofocus />
                        <div class="inline-add-actions">
                          <button type="button" class="btn btn-xs btn-primary" (click)="saveCustomLocality()">Save & Select</button>
                          <button type="button" class="btn btn-xs btn-secondary" (click)="toggleNewLocalityInput()">Cancel</button>
                        </div>
                      </div>
                    }
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Sub-Location / Landmark</label>
                    <input type="text" class="form-control" placeholder="e.g. Sholinganallur Junction" [(ngModel)]="data.subLocation" (change)="regeneratePitch(data)" />
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Property Type</label>
                    <select class="form-control" [(ngModel)]="data.propertyType" (change)="regeneratePitch(data)">
                      <option value="Apartment">Apartment</option>
                      <option value="Independent house">Independent house</option>
                      <option value="Villa">Villa</option>
                      <option value="Residential Plot">Residential Plot</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label">Bedrooms (BHK)</label>
                    <select class="form-control" [(ngModel)]="data.bhk" (change)="regeneratePitch(data)">
                      <option [ngValue]="1">1 BHK</option>
                      <option [ngValue]="2">2 BHK</option>
                      <option [ngValue]="3">3 BHK</option>
                      <option [ngValue]="4">4 BHK</option>
                      <option [ngValue]="5">5 BHK</option>
                      <option [ngValue]="'1 RK'">1 RK</option>
                    </select>
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Built-up Area (sq.ft)</label>
                    <input type="number" class="form-control" [(ngModel)]="data.builtUpAreaSqFt" (change)="regeneratePitch(data)" />
                  </div>

                  @if (data.detectedType === 'seller') {
                    <div class="form-group flex-1">
                      <label class="form-label">UDS (sq.ft) ★</label>
                      <input type="number" class="form-control" placeholder="480" [(ngModel)]="data.udsSqFt" (change)="regeneratePitch(data)" />
                    </div>
                  }

                  <div class="form-group flex-1">
                    <label class="form-label">Facing</label>
                    <select class="form-control" [(ngModel)]="data.facing" (change)="regeneratePitch(data)">
                      <option value="East">East</option>
                      <option value="North">North</option>
                      <option value="North-East">North-East</option>
                      <option value="South-East">South-East</option>
                      <option value="West">West</option>
                      <option value="South">South</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label">
                      {{ data.detectedType === 'seller' ? 'Asking Price (in Lakhs) *' : 'Maximum Budget (in Lakhs) *' }}
                    </label>
                    <div class="price-input-wrap">
                      <input type="number" class="form-control" [(ngModel)]="data.priceLakhs" (change)="onPriceChange(data)" />
                      <span class="price-conversion-tag">{{ formatLakhs(data.priceLakhs) }}</span>
                    </div>
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Contact Mobile Number *</label>
                    <input type="tel" class="form-control" [(ngModel)]="data.contactPhone" (change)="regeneratePitch(data)" />
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Advertiser Name</label>
                    <input type="text" class="form-control" [(ngModel)]="data.contactName" (change)="regeneratePitch(data)" />
                  </div>
                </div>

                @if (data.keyFeatures && data.keyFeatures.length > 0) {
                  <div class="form-group mt-2">
                    <label class="form-label">Detected Attributes & Clearances</label>
                    <div class="features-pill-row">
                      @for (feat of data.keyFeatures; track feat) {
                        <span class="feature-chip">✓ {{ feat }}</span>
                      }
                      @if (data.approvalStatus) {
                        <span class="feature-chip chip-gold">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          <span>{{ data.approvalStatus }}</span>
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- 5. Confirmation Action Buttons -->
              <div class="confirmation-actions-bar">
                <button type="button" class="btn btn-secondary" (click)="resetToCapture()">
                  ← Retake / Scan Another
                </button>

                <div class="confirm-buttons-group">
                  @if (data.detectedType === 'seller') {
                    <button type="button" class="btn btn-gold btn-lg" (click)="confirmAndSaveSeller(data)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      <span>✓ Confirm & Add to Property Inventory</span>
                    </button>
                  } @else {
                    <button type="button" class="btn btn-primary btn-lg" (click)="confirmAndSaveBuyer(data)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      <span>✓ Confirm & Add to Buyer CRM</span>
                    </button>
                  }
                </div>
              </div>

            </div>
          }

        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 16, 26, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: grid;
      place-items: center;
      z-index: 1100;
      padding: 16px;
    }
    .scanner-modal-card {
      width: 100%;
      max-width: 890px;
      max-height: 92vh;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      color: var(--text-main);
    }
    .modal-header {
      padding: 20px 24px 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-subtle);
    }
    .modal-title {
      font-size: 20px;
      font-weight: 800;
      margin: 4px 0 2px;
      color: var(--text-main);
    }
    .modal-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }
    .btn-icon-close {
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: var(--text-muted);
      padding: 6px;
      cursor: pointer;
    }
    .btn-icon-close:hover {
      background: var(--bg-surface);
      color: var(--text-main);
    }
    .modal-body-scroll {
      padding: 20px 24px;
      overflow-y: auto;
      max-height: calc(92vh - 100px);
    }

    /* Mode Tabs */
    .scanner-mode-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      background: var(--bg-surface);
      padding: 6px;
      border-radius: 10px;
      border: 1px solid var(--border-subtle);
      overflow-x: auto;
    }
    .mode-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 14px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .mode-tab-btn:hover {
      color: var(--text-main);
    }
    .mode-tab-btn.active {
      background: var(--bg-card);
      color: var(--gold);
      border-color: var(--gold-border);
      font-weight: 700;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    /* Camera Viewport */
    .camera-viewport-card {
      position: relative;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      background: #000;
      transition: box-shadow 0.2s;
    }
    .camera-stream-wrapper {
      position: relative;
      width: 100%;
      height: 400px;
      background: #05080f;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
    }
    .camera-stream-wrapper video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Animated Laser Scanner Sweep */
    .camera-laser-sweep {
      position: absolute;
      left: 8%;
      right: 8%;
      height: 3px;
      background: linear-gradient(90deg, transparent, #ef4444, #f59e0b, #ef4444, transparent);
      box-shadow: 0 0 14px #f59e0b, 0 0 6px #ef4444;
      animation: sweepLaser 2.2s ease-in-out infinite alternate;
      pointer-events: none;
      z-index: 5;
    }
    @keyframes sweepLaser {
      0% { top: 10%; opacity: 0.7; }
      50% { opacity: 1; }
      100% { top: 90%; opacity: 0.7; }
    }

    /* Reticle */
    .scanner-reticle {
      position: absolute;
      inset: 32px;
      border: 1px dashed rgba(234, 179, 8, 0.45);
      border-radius: 10px;
      pointer-events: none;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 12px;
      z-index: 4;
    }
    .reticle-corner {
      position: absolute;
      width: 22px;
      height: 22px;
      border-color: var(--gold);
      border-style: solid;
    }
    .reticle-corner.tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-top-left-radius: 8px; }
    .reticle-corner.tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-top-right-radius: 8px; }
    .reticle-corner.bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-bottom-left-radius: 8px; }
    .reticle-corner.br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-bottom-right-radius: 8px; }
    .reticle-guide-text {
      background: rgba(0, 0, 0, 0.75);
      color: var(--gold);
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 20px;
      backdrop-filter: blur(6px);
      letter-spacing: 0.2px;
    }

    /* Shutter Flash */
    .shutter-flash-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.85);
      pointer-events: none;
      z-index: 20;
      animation: flashFade 0.22s ease-out forwards;
    }
    @keyframes flashFade {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }

    .camera-controls-bar {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-surface);
      border-top: 1px solid var(--border-subtle);
      flex-wrap: wrap;
      gap: 10px;
    }
    .camera-aux-controls {
      display: flex;
      gap: 8px;
    }
    .btn-active-torch {
      background: var(--gold) !important;
      color: #0b111e !important;
      font-weight: 700 !important;
    }
    .btn-shutter {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--gold);
      color: #0b111e;
      border: 0;
      border-radius: 30px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(234, 179, 8, 0.4);
      transition: transform 0.15s, background-color 0.2s;
    }
    .btn-shutter:hover {
      transform: scale(1.03);
    }
    .shutter-circle {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #0b111e;
    }
    .camera-error-box {
      padding: 48px 24px;
      text-align: center;
      color: var(--text-muted);
    }
    .camera-error-box svg {
      color: #f87171;
      margin-bottom: 12px;
    }

    /* Dropzone */
    .scanner-dropzone {
      border: 2px dashed var(--gold-border);
      border-radius: 14px;
      padding: 48px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: rgba(234, 179, 8, 0.03);
    }
    .scanner-dropzone:hover,
    .scanner-dropzone.drag-over {
      border-color: var(--gold);
      background: rgba(234, 179, 8, 0.08);
      transform: translateY(-1px);
    }
    .dropzone-icon {
      color: var(--gold);
      margin-bottom: 12px;
    }
    .dropzone-title {
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 6px;
    }
    .dropzone-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }

    /* Scanning Progress */
    .scanning-progress-panel {
      border-radius: 14px;
    }
    .scanner-laser-box {
      position: relative;
      width: 160px;
      height: 120px;
      margin: 0 auto;
      border-radius: 10px;
      overflow: hidden;
      background: #000;
      border: 1px solid var(--gold-border);
    }
    .scanning-img-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.7;
    }
    .scanning-placeholder-icon {
      font-size: 48px;
      line-height: 120px;
    }
    .laser-beam {
      position: absolute;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #ef4444, #f59e0b, transparent);
      box-shadow: 0 0 10px #f59e0b;
      animation: scanLaser 1.5s ease-in-out infinite alternate;
      z-index: 2;
    }
    @keyframes scanLaser {
      0% { top: 0; }
      100% { top: 100%; }
    }
    .progress-bar-wrap {
      width: 240px;
      height: 6px;
      background: var(--bg-surface);
      border-radius: 10px;
      overflow: hidden;
      margin: 14px auto 6px;
      border: 1px solid var(--border-subtle);
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--gold);
      transition: width 0.3s;
    }
    .progress-text {
      font-size: 12px;
      font-weight: 700;
      color: var(--gold);
    }

    /* STEP 2: CONFIRMATION VIEW */
    .confirmation-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .detection-alert-banner {
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
      border: 1px solid;
    }
    .detection-alert-banner.is-seller {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.35);
    }
    .detection-alert-banner.is-buyer {
      background: rgba(59, 130, 246, 0.08);
      border-color: rgba(59, 130, 246, 0.35);
    }
    .detection-main {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .detection-icon {
      font-size: 28px;
    }
    .detection-heading {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-main);
    }
    .detection-heading strong {
      color: var(--gold);
    }
    .detection-subtext {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .type-override-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      padding: 4px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
    }
    .override-label {
      font-size: 11px;
      color: var(--text-muted);
      margin-left: 6px;
    }
    .btn-toggle-type {
      border: 0;
      background: transparent;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s;
    }
    .btn-toggle-type.active {
      background: var(--gold);
      color: #0d131f;
      font-weight: 800;
    }

    /* SMART PARAPHRASE CARD */
    .paraphrase-card {
      border-radius: 12px;
      border: 1px solid var(--gold-border);
      background: rgba(234, 179, 8, 0.03);
      padding: 16px 20px;
    }
    .paraphrase-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .paraphrase-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .paraphrase-badge {
      background: var(--gold);
      color: #0b111e;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.4px;
    }
    .paraphrase-sub {
      font-size: 12px;
      color: var(--text-muted);
    }
    .paraphrase-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .btn-copy-pitch {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-surface);
      color: var(--gold);
      border: 1px solid var(--gold-border);
      border-radius: 7px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-copy-pitch:hover {
      background: rgba(234, 179, 8, 0.12);
      border-color: var(--gold);
    }
    .btn-copy-pitch.copied {
      background: #10b981;
      color: #fff;
      border-color: #10b981;
    }
    .btn-refresh-pitch {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--bg-surface);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
      border-radius: 7px;
      padding: 6px 10px;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-refresh-pitch:hover {
      color: var(--text-main);
      background: var(--bg-card);
    }
    .paraphrase-textarea {
      font-family: inherit;
      font-size: 12.5px;
      line-height: 1.55;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
      border-radius: 8px;
      padding: 10px 12px;
      resize: vertical;
    }
    .paraphrase-footer-tip {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* Source Snippet */
    .source-snippet-card {
      border-radius: 12px;
      padding: 14px 18px;
      border: 1px solid var(--border-subtle);
    }
    .snippet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .newspaper-badge {
      background: rgba(234, 179, 8, 0.15);
      color: var(--gold);
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .snippet-sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-left: 8px;
    }
    .clipping-thumb-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
    }
    .clipping-thumb {
      width: 72px;
      height: 52px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--gold-border);
    }
    .clipping-note {
      font-size: 12px;
      color: var(--text-muted);
    }
    .raw-text-box {
      margin-top: 10px;
    }
    .raw-textarea {
      font-family: monospace;
      font-size: 12px;
    }

    /* Price Conversion */
    .price-input-wrap {
      position: relative;
    }
    .price-conversion-tag {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      font-weight: 700;
      color: var(--gold);
      background: var(--bg-surface);
      padding: 2px 6px;
      border-radius: 4px;
      pointer-events: none;
    }

    /* Feature Chips */
    .features-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 6px;
    }
    .feature-chip {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      color: var(--text-main);
    }
    .chip-gold {
      border-color: var(--gold-border);
      color: var(--gold);
      font-weight: 700;
    }

    /* Actions */
    .confirmation-actions-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 8px;
    }
    .confirm-buttons-group {
      display: flex;
      gap: 10px;
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
      .scanner-modal-card {
        max-height: 94vh;
        border-radius: 16px 16px 0 0;
      }
      .modal-header {
        padding: 14px 16px 10px;
      }
      .modal-title {
        font-size: 17px;
      }
      .modal-body-scroll {
        padding: 14px 14px;
      }
      .camera-stream-wrapper {
        height: 280px;
      }
      .form-row {
        flex-direction: column !important;
        gap: 10px !important;
        margin-bottom: 10px !important;
      }
      .flex-1, .flex-2 {
        min-width: 100% !important;
        flex: 1 1 100% !important;
      }
      .confirmation-actions-bar {
        flex-direction: column-reverse;
        gap: 8px;
      }
      .confirm-buttons-group {
        width: 100%;
        flex-direction: column;
      }
      .confirm-buttons-group .btn {
        width: 100%;
        justify-content: center;
        padding: 10px;
      }
      .confirmation-actions-bar > .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class ClassifiedScannerModalComponent implements OnInit, OnDestroy {
  public parserService = inject(ClassifiedParserService);
  public realtyService = inject(RealtyService);

  public close = output<void>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  public currentStage = signal<'capture' | 'confirm'>('capture');
  public activeInputMode = signal<'camera' | 'upload' | 'text'>('camera');
  public isProcessing = signal<boolean>(false);
  public ocrProgress = signal<number>(0);
  public isDragOver = signal<boolean>(false);
  public cameraError = signal<string | null>(null);

  public isShutterFlashing = signal<boolean>(false);
  public isTorchSupported = signal<boolean>(false);
  public isTorchOn = signal<boolean>(false);
  public pitchCopied = signal<boolean>(false);

  public manualText = '';
  public selectedImageThumbnail = signal<string | null>(null);
  public parsedData = signal<ParsedClassified | null>(null);
  public showRawText = signal<boolean>(false);

  public showNewLocalityInput = signal<boolean>(false);
  public newCustomLocalityName = '';

  private stream: MediaStream | null = null;
  private facingMode: 'environment' | 'user' = 'environment';

  ngOnInit(): void {
    if (this.activeInputMode() === 'camera') {
      this.startCamera();
    }
  }

  get localities() {
    return this.realtyService.localities();
  }

  public toggleNewLocalityInput(): void {
    this.showNewLocalityInput.update(v => !v);
    this.newCustomLocalityName = '';
  }

  public onLocalityChange(event: Event): void {
    const cur = this.parsedData();
    if (cur && cur.locality === '__ADD_NEW__') {
      this.showNewLocalityInput.set(true);
      this.newCustomLocalityName = '';
      cur.locality = this.localities[0] || 'OMR';
    }
  }

  public saveCustomLocality(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const trimmed = this.newCustomLocalityName.trim();
    if (!trimmed) return;
    this.realtyService.addLocation(trimmed);
    const cur = this.parsedData();
    if (cur) {
      cur.locality = trimmed;
      this.regeneratePitch(cur);
    }
    this.showNewLocalityInput.set(false);
    this.newCustomLocalityName = '';
  }

  public switchInputMode(mode: 'camera' | 'upload' | 'text'): void {
    this.activeInputMode.set(mode);
    if (mode === 'camera') {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  public async startCamera(): Promise<void> {
    this.cameraError.set(null);
    this.isTorchSupported.set(false);
    this.isTorchOn.set(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.cameraError.set('Camera is not supported on this browser device. Please upload a photo instead.');
      return;
    }

    try {
      this.stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this.stream = stream;

      // Check flashlight / torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as any;
      if (capabilities && capabilities.torch) {
        this.isTorchSupported.set(true);
      }

      setTimeout(() => {
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.warn('Camera error:', err);
      this.cameraError.set('Unable to access device camera. Please check camera permissions or upload an image file.');
    }
  }

  public async toggleTorch(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !this.isTorchOn();
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      this.isTorchOn.set(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  }

  public toggleFacingMode(): void {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.startCamera();
  }

  public stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isTorchOn.set(false);
  }

  public captureFromCamera(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    // Visual shutter flash effect
    this.isShutterFlashing.set(true);
    setTimeout(() => this.isShutterFlashing.set(false), 220);

    const canvas = document.createElement('canvas');
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;
    if (width > 1280) {
      height = Math.round((height * 1280) / width);
      width = 1280;
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    this.stopCamera();
    this.processImage(dataUrl);
  }

  public onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(true);
  }

  public onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
  }

  public onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragOver.set(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      this.handleFile(e.dataTransfer.files[0]);
    }
  }

  public onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
      input.value = '';
    }
  }

  private handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.realtyService.notify('Please select an image file of the newspaper classified.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          this.processImage(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          this.processImage(rawDataUrl);
        }
      };
      img.onerror = () => this.processImage(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  }

  public async processImage(dataUrl: string): Promise<void> {
    this.selectedImageThumbnail.set(dataUrl);
    this.isProcessing.set(true);
    this.ocrProgress.set(10);

    try {
      const text = await this.parserService.recognizeImage(dataUrl, pct => {
        this.ocrProgress.set(pct);
      });

      this.isProcessing.set(false);
      if (!text || text.trim().length < 10) {
        this.realtyService.notify('Could not detect clear text from clipping. Please check lighting or paste text.', 'info');
        this.manualText = text || '';
        this.activeInputMode.set('text');
        return;
      }

      this.parsedData.set(this.parserService.parseClassifiedText(text, dataUrl));
      this.currentStage.set('confirm');
    } catch (err) {
      console.error('OCR processing error:', err);
      this.isProcessing.set(false);
      this.realtyService.notify('OCR processing encountered an issue. You can paste the ad text directly.', 'info');
      this.activeInputMode.set('text');
    }
  }

  public processText(text: string): void {
    if (!text.trim()) return;
    this.isProcessing.set(true);
    this.ocrProgress.set(60);

    setTimeout(() => {
      this.isProcessing.set(false);
      this.parsedData.set(this.parserService.parseClassifiedText(text, this.selectedImageThumbnail() || undefined));
      this.currentStage.set('confirm');
    }, 400);
  }

  public setType(type: 'seller' | 'buyer'): void {
    const cur = this.parsedData();
    if (cur) {
      const updated: ParsedClassified = {
        ...cur,
        detectedType: type,
        contactName: type === 'seller' ? 'Classified Advertiser (The Hindu)' : 'Prospective Buyer (The Hindu)'
      };
      const { title, pitch } = this.parserService.generateParaphrase({
        detectedType: type,
        propertyType: updated.propertyType,
        transactionType: updated.transactionType,
        locality: updated.locality,
        subLocation: updated.subLocation,
        bhk: updated.bhk,
        builtUpAreaSqFt: updated.builtUpAreaSqFt,
        udsSqFt: updated.udsSqFt,
        priceDisplay: updated.priceDisplay,
        priceType: updated.priceType,
        contactName: updated.contactName,
        contactPhone: updated.contactPhone,
        facing: updated.facing,
        approvalStatus: updated.approvalStatus,
        keyFeatures: updated.keyFeatures,
        cleanText: updated.rawText
      });
      updated.title = title;
      updated.paraphrasedPitch = pitch;
      updated.notes = pitch;
      this.parsedData.set(updated);
    }
  }

  public onPriceChange(data: ParsedClassified): void {
    if (data.priceLakhs >= 100) {
      data.priceDisplay = `₹${(data.priceLakhs / 100).toFixed(2)} Cr`;
    } else {
      data.priceDisplay = `₹${data.priceLakhs} Lakhs`;
    }
    this.regeneratePitch(data);
  }

  public regeneratePitch(data: ParsedClassified): void {
    const { title, pitch } = this.parserService.generateParaphrase({
      detectedType: data.detectedType,
      propertyType: data.propertyType,
      transactionType: data.transactionType,
      locality: data.locality,
      subLocation: data.subLocation,
      bhk: data.bhk,
      builtUpAreaSqFt: data.builtUpAreaSqFt,
      udsSqFt: data.udsSqFt,
      priceDisplay: data.priceDisplay,
      priceType: data.priceType,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      facing: data.facing,
      approvalStatus: data.approvalStatus,
      keyFeatures: data.keyFeatures,
      cleanText: data.rawText
    });
    data.paraphrasedPitch = pitch;
    data.notes = pitch;
  }

  public copyParaphrasedPitch(data: ParsedClassified): void {
    const textToCopy = data.paraphrasedPitch || data.notes || data.title;
    if (!textToCopy) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        this.pitchCopied.set(true);
        setTimeout(() => this.pitchCopied.set(false), 2000);
      });
    } else {
      // Fallback
      const el = document.createElement('textarea');
      el.value = textToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.pitchCopied.set(true);
      setTimeout(() => this.pitchCopied.set(false), 2000);
    }
    this.realtyService.notify('Pitch copied! Ready to paste into WhatsApp.', 'success');
  }

  public toggleRawText(): void {
    this.showRawText.update(v => !v);
  }

  public reparseFromEditedText(): void {
    const cur = this.parsedData();
    if (cur && cur.rawText) {
      const reParsed = this.parserService.parseClassifiedText(cur.rawText, this.selectedImageThumbnail() || undefined);
      this.parsedData.set(reParsed);
    }
  }

  public resetToCapture(): void {
    this.currentStage.set('capture');
    this.parsedData.set(null);
    this.selectedImageThumbnail.set(null);
    if (this.activeInputMode() === 'camera') {
      this.startCamera();
    }
  }

  public confirmAndSaveSeller(data: ParsedClassified): void {
    const photos: string[] = [];
    if (this.selectedImageThumbnail()) {
      photos.push(this.selectedImageThumbnail()!);
    }

    const newListing = {
      title: data.title,
      propertyType: data.propertyType,
      transactionType: data.transactionType,
      locality: data.locality,
      subLocation: data.subLocation,
      bhk: data.bhk,
      builtUpAreaSqFt: data.builtUpAreaSqFt,
      udsSqFt: data.udsSqFt,
      priceLakhs: data.priceLakhs,
      priceType: data.priceType,
      facing: data.facing as any,
      approvalStatus: data.approvalStatus as any,
      amenities: data.keyFeatures,
      ownerName: data.contactName,
      ownerPhone: data.contactPhone,
      notes: data.paraphrasedPitch || data.notes,
      photos
    };

    const ok = this.realtyService.saveProperty(newListing);
    if (ok) {
      this.realtyService.notify('The Hindu Classified successfully added to Property Inventory!', 'success');
      this.closeModal();
    }
  }

  public confirmAndSaveBuyer(data: ParsedClassified): void {
    const budgetMin = Math.round(data.priceLakhs * 0.85);
    const budgetMax = data.priceLakhs;

    const newLead = {
      name: data.contactName,
      phone: data.contactPhone,
      leadType: 'Buyer' as const,
      preferredLocalities: [data.locality],
      preferredPropertyType: data.propertyType,
      preferredBhk: data.bhk,
      budgetMinLakhs: budgetMin,
      budgetMaxLakhs: budgetMax,
      minBuiltUpSqFt: data.builtUpAreaSqFt,
      source: 'The Hindu Classifieds' as LeadSource,
      notes: data.paraphrasedPitch || data.notes
    };

    const ok = this.realtyService.saveLead(newLead);
    if (ok) {
      this.realtyService.notify('The Hindu Classified Buyer Requirement saved to CRM Pipeline!', 'success');
      this.closeModal();
    }
  }

  public formatLakhs(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Cr`;
    }
    return `₹${lakhs} Lakhs`;
  }

  public onBackdropClick(): void {
    this.closeModal();
  }

  public closeModal(): void {
    this.stopCamera();
    this.close.emit();
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
