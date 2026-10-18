import { Component, ElementRef, ViewChild, inject, output, signal, OnDestroy } from '@angular/core';
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
            <div class="eyebrow-chip">THE HINDU CLASSIFIEDS AI OCR</div>
            <h2 class="modal-title">Newspaper Classifieds Reader</h2>
            <p class="modal-subtitle">
              Capture or upload real estate ads from The Hindu. AI automatically detects Buyer vs Seller and extracts all attributes.
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
                <span>Upload Photo / Clipping</span>
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

            <!-- MODE 1: LIVE CAMERA VIEW -->
            @if (activeInputMode() === 'camera') {
              <div class="camera-viewport-card glass-panel">
                @if (cameraError()) {
                  <div class="camera-error-box">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <h5>{{ cameraError() }}</h5>
                    <p>Make sure your browser has camera permission enabled, or choose the File Upload tab.</p>
                    <button class="btn btn-primary btn-sm mt-2" (click)="startCamera()">Retry Camera</button>
                  </div>
                } @else {
                  <div class="camera-stream-wrapper">
                    <video #videoElement autoplay playsinline muted></video>
                    <div class="scanner-reticle">
                      <div class="reticle-corner tl"></div>
                      <div class="reticle-corner tr"></div>
                      <div class="reticle-corner bl"></div>
                      <div class="reticle-corner br"></div>
                      <div class="reticle-guide-text">Align The Hindu classified column inside box</div>
                    </div>
                  </div>

                  <div class="camera-controls-bar">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="toggleFacingMode()" title="Switch Front/Rear Camera">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                      <span>Flip Camera</span>
                    </button>

                    <button type="button" class="btn btn-shutter" (click)="captureFromCamera()" title="Capture Newspaper Photo">
                      <span class="shutter-circle"></span>
                      <span>Capture & Read</span>
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
                  Drop a camera photo, e-paper screenshot, or WhatsApp clipping of the classified ad.<br>
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
                  <div class="scanning-placeholder-icon">📰</div>
                }
              </div>
              <h4 class="mt-3">Analyzing Newspaper Classified Print...</h4>
              <p class="text-muted text-sm">
                Enhancing newsprint contrast and running optical character recognition.
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
              
              <!-- 1. AI Detection Banner with Seller vs Buyer Switcher -->
              <div class="detection-alert-banner" [class.is-seller]="data.detectedType === 'seller'" [class.is-buyer]="data.detectedType === 'buyer'">
                <div class="detection-main">
                  <div class="detection-icon">
                    @if (data.detectedType === 'seller') {
                      <span>🏠</span>
                    } @else {
                      <span>👤</span>
                    }
                  </div>
                  <div>
                    <div class="detection-heading">
                      AI DETECTED AS: <strong>{{ data.detectedType === 'seller' ? 'SELLER (PROPERTY LISTING FOR SALE / RENT)' : 'BUYER (CLIENT REQUIREMENT / WANTED)' }}</strong>
                    </div>
                    <div class="detection-subtext">
                      Confidence Score: <strong>{{ data.confidenceScore }}%</strong> • {{ data.detectionReasons.slice(0, 3).join(', ') }}
                    </div>
                  </div>
                </div>

                <!-- Type Override Switcher -->
                <div class="type-override-pill">
                  <span class="override-label">Need to change?</span>
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

              <!-- 2. Original Classified Snippet & Raw Text Toggle -->
              <div class="source-snippet-card glass-panel">
                <div class="snippet-header">
                  <div class="snippet-title-row">
                    <span class="newspaper-badge">THE HINDU CLASSIFIEDS</span>
                    <span class="snippet-sub">Scanned & Parsed Classified Snippet</span>
                  </div>
                  <button type="button" class="btn-text-link" (click)="toggleRawText()">
                    {{ showRawText() ? 'Hide Raw Text ▲' : 'View Raw OCR Text ▼' }}
                  </button>
                </div>

                @if (selectedImageThumbnail()) {
                  <div class="clipping-thumb-row">
                    <img [src]="selectedImageThumbnail()" alt="Newspaper clipping thumbnail" class="clipping-thumb" />
                    <div class="clipping-note">
                      <strong>Newspaper Image Attached:</strong> This clipping will be saved as a verified photo proof for this record.
                    </div>
                  </div>
                }

                @if (showRawText()) {
                  <div class="raw-text-box">
                    <label class="form-hint">Raw Extracted Text:</label>
                    <textarea class="form-control raw-textarea" rows="3" [(ngModel)]="data.rawText" (blur)="reparseFromEditedText()"></textarea>
                    <span class="form-hint">You can edit the raw text above and click outside to re-parse.</span>
                  </div>
                }
              </div>

              <!-- 3. Structured Review & Confirmation Form -->
              <div class="review-form glass-panel p-4">
                <h4 class="form-section-heading">
                  Confirm Extracted Details (Editable Before Saving)
                </h4>

                <div class="form-row">
                  <div class="form-group flex-2">
                    <label class="form-label">Title *</label>
                    <input type="text" class="form-control" [(ngModel)]="data.title" />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label">Transaction</label>
                    <select class="form-control" [(ngModel)]="data.transactionType">
                      <option value="Sale">Sale (Outright)</option>
                      <option value="Rent">Rent / To Let</option>
                      <option value="Lease">Lease</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label">Chennai Locality *</label>
                    <select class="form-control" [(ngModel)]="data.locality">
                      @for (loc of localities; track loc) {
                        <option [value]="loc">{{ loc }}</option>
                      }
                    </select>
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Sub-Location / Landmark</label>
                    <input type="text" class="form-control" placeholder="e.g. Sholinganallur Junction" [(ngModel)]="data.subLocation" />
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Property Type</label>
                    <select class="form-control" [(ngModel)]="data.propertyType">
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
                    <select class="form-control" [(ngModel)]="data.bhk">
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
                    <input type="number" class="form-control" [(ngModel)]="data.builtUpAreaSqFt" />
                  </div>

                  @if (data.detectedType === 'seller') {
                    <div class="form-group flex-1">
                      <label class="form-label">UDS (sq.ft) ★</label>
                      <input type="number" class="form-control" placeholder="480" [(ngModel)]="data.udsSqFt" />
                    </div>
                  }

                  <div class="form-group flex-1">
                    <label class="form-label">Facing</label>
                    <select class="form-control" [(ngModel)]="data.facing">
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
                      <input type="number" class="form-control" [(ngModel)]="data.priceLakhs" />
                      <span class="price-conversion-tag">{{ formatLakhs(data.priceLakhs) }}</span>
                    </div>
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Contact Mobile Number *</label>
                    <input type="tel" class="form-control" [(ngModel)]="data.contactPhone" />
                  </div>

                  <div class="form-group flex-1">
                    <label class="form-label">Advertiser Name</label>
                    <input type="text" class="form-control" [(ngModel)]="data.contactName" />
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
                        <span class="feature-chip chip-gold">🏛 {{ data.approvalStatus }}</span>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- 4. Confirmation Action Buttons -->
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
      max-width: 860px;
      max-height: 90vh;
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
      max-height: calc(90vh - 100px);
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
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
      background: #000;
    }
    .camera-stream-wrapper {
      position: relative;
      width: 100%;
      height: 380px;
      background: #05080f;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .camera-stream-wrapper video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .scanner-reticle {
      position: absolute;
      inset: 40px;
      border: 1px dashed rgba(234, 179, 8, 0.4);
      border-radius: 8px;
      pointer-events: none;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 12px;
    }
    .reticle-corner {
      position: absolute;
      width: 20px;
      height: 20px;
      border-color: var(--gold);
      border-style: solid;
    }
    .reticle-corner.tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; }
    .reticle-corner.tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; }
    .reticle-corner.bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; }
    .reticle-corner.br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; }
    .reticle-guide-text {
      background: rgba(0, 0, 0, 0.7);
      color: var(--gold);
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
    }
    .camera-controls-bar {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-surface);
      border-top: 1px solid var(--border-subtle);
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
      box-shadow: 0 4px 14px rgba(234, 179, 8, 0.4);
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

    /* Samples */
    .samples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .sample-card {
      border-radius: 12px;
      padding: 16px;
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sample-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .sample-type-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .badge-seller { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .badge-buyer { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .sample-name { font-size: 13px; }
    .sample-snippet {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 12px;
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
      .camera-viewport {
        height: 240px;
      }
      .form-grid-2col {
        grid-template-columns: 1fr;
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
export class ClassifiedScannerModalComponent implements OnDestroy {
  public parserService = inject(ClassifiedParserService);
  public realtyService = inject(RealtyService);

  public close = output<void>();

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  public currentStage = signal<'capture' | 'confirm'>('capture');
  public activeInputMode = signal<'camera' | 'upload' | 'text'>('upload');
  public isProcessing = signal<boolean>(false);
  public ocrProgress = signal<number>(0);
  public isDragOver = signal<boolean>(false);
  public cameraError = signal<string | null>(null);

  public manualText = '';
  public selectedImageThumbnail = signal<string | null>(null);
  public parsedData = signal<ParsedClassified | null>(null);
  public showRawText = signal<boolean>(false);

  public localities = CHENNAI_LOCALITIES;

  private stream: MediaStream | null = null;
  private facingMode: 'environment' | 'user' = 'environment';

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

  public toggleFacingMode(): void {
    this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
    this.startCamera();
  }

  public stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  public captureFromCamera(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
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
      const dataUrl = event.target?.result as string;
      this.processImage(dataUrl);
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
        this.realtyService.notify('Could not detect clear text from clipping. Please check the image or paste text.', 'info');
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
      this.parsedData.set({
        ...cur,
        detectedType: type,
        title: type === 'seller'
          ? `${cur.bhk} BHK ${cur.propertyType} in ${cur.locality} (The Hindu Classified)`
          : `Buyer Requirement: ${cur.bhk} BHK ${cur.propertyType} in ${cur.locality}`
      });
    }
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
      notes: data.notes,
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
      notes: data.notes
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
