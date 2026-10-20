import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtyService } from '../../services/realty.service';
import { SpaceService, AccessRequest, SpaceMember } from '../../services/space.service';
import { AuthService } from '../../services/auth.service';
import { EmailFollowupService, EmailAutomationSettings } from '../../services/email-followup.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-workspace">
      <!-- Settings Header Banner -->
      <header class="settings-header glass-panel">
        <div class="header-main">
          <div class="header-badge-row">
            <span class="settings-tag">AGENCY CONFIGURATION</span>
            <span class="cloud-badge" [class.connected]="realtyService.isCloudConnected()">
              <span class="pulse-dot"></span>
              {{ realtyService.isCloudConnected() ? 'Cloud Synchronized' : 'Connecting Cloud...' }}
            </span>
          </div>
          <h1 class="settings-title">Agency Space & System Settings</h1>
          <p class="settings-desc">
            Manage your team access, Chennai micro-markets, automated follow-ups, and data exports.
          </p>
        </div>

        <!-- Quick Tabs Navigation -->
        <nav class="settings-subtabs">
          <button 
            type="button"
            class="subtab-btn" 
            [class.active]="activeTab() === 'team'"
            (click)="activeTab.set('team')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Team & Access</span>
            @if (spaceService.isOwner() && spaceService.space().pendingRequests.length > 0) {
              <span class="pill-count warn">{{ spaceService.space().pendingRequests.length }}</span>
            }
          </button>

          <button 
            type="button"
            class="subtab-btn" 
            [class.active]="activeTab() === 'data'"
            (click)="activeTab.set('data')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>Data & Exports</span>
          </button>

          <button 
            type="button"
            class="subtab-btn" 
            [class.active]="activeTab() === 'localities'"
            (click)="activeTab.set('localities')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
            <span>Chennai Corridors</span>
            <span class="pill-count">{{ realtyService.localities().length }}</span>
          </button>

          <button 
            type="button"
            class="subtab-btn" 
            [class.active]="activeTab() === 'email'"
            (click)="activeTab.set('email')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <span>Email Follow-up</span>
          </button>

          <button 
            type="button"
            class="subtab-btn" 
            [class.active]="activeTab() === 'danger'"
            (click)="activeTab.set('danger')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>Danger Zone</span>
          </button>
        </nav>
      </header>

      <!-- TAB 1: TEAM & ACCESS CONTROL (BROKER-FIRST & NON-TECH INTUITIVE) -->
      @if (activeTab() === 'team') {
        <div class="settings-grid">
          <!-- CARD 1 (FULL WIDTH): INVITE TEAM AGENTS & BROKERS -->
          <div class="card glass-panel full-width highlight-gold-card">
            <div class="card-head">
              <div class="card-title-group">
                <h3 class="card-title text-gold">Invite Team Agents & Brokers</h3>
                <span class="card-subtitle">1-click WhatsApp share & direct link for instant team onboarding</span>
              </div>
              <span class="badge-gold">✓ 1-Click Access</span>
            </div>

            <!-- Big 1-Click Action Buttons for Non-Tech Brokers -->
            <div class="invite-hero-actions">
              <button type="button" class="btn btn-whatsapp btn-hero" (click)="shareOnWhatsApp()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span>Share Invite on WhatsApp</span>
              </button>

              <button type="button" class="btn btn-gold btn-hero" (click)="copyInviteLink()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>{{ copiedLink() ? '✓ Join Link Copied!' : 'Copy Team Join Link' }}</span>
              </button>
            </div>

            <!-- Direct Join Link Box -->
            <div class="invite-link-row">
              <span class="invite-link-label">Direct Team Link:</span>
              <div class="invite-link-pill">
                <span class="invite-link-text">{{ inviteLink() }}</span>
              </div>
              <p class="invite-link-hint">
                💡 When agents open this link, they sign in to immediately join your agency workspace. No manual code needed.
              </p>
            </div>

            <!-- Pre-Authorize Agent by Email -->
            <div class="preauth-section">
              <span class="subhead">Pre-Authorize Agent by Email</span>
              <p class="hint">Enter an agent's email address to authorize them before they open the link.</p>
              <div class="email-input-row">
                <input 
                  type="email" 
                  class="form-control" 
                  placeholder="agent.chennai@gmail.com" 
                  [(ngModel)]="newPreAuthEmail" 
                  (keyup.enter)="addPreAuthEmail()" />
                <button class="btn btn-gold btn-sm" (click)="addPreAuthEmail()">
                  + Authorize Agent
                </button>
              </div>

              @if (spaceService.space().allowedEmails.length > 0) {
                <div class="email-chips-container">
                  <span class="chips-title">Pre-Authorized Agent Accounts:</span>
                  <div class="chips-wrap">
                    @for (email of spaceService.space().allowedEmails; track email) {
                      <div class="email-chip">
                        <span>{{ email }}</span>
                        <button type="button" class="chip-del" (click)="spaceService.revokeEmailAccess(email)" title="Revoke Authorization">✕</button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Pending Requests (Visible to Owner) -->
          @if (spaceService.isOwner() && spaceService.space().pendingRequests.length > 0) {
            <div class="card glass-panel full-width highlight-warn-card">
              <div class="card-head">
                <div class="card-title-group">
                  <h3 class="card-title text-gold">Pending Join Requests ({{ spaceService.space().pendingRequests.length }})</h3>
                  <span class="card-subtitle">Agents awaiting your approval to access properties & CRM</span>
                </div>
                <span class="badge-warn">Owner Decision Needed</span>
              </div>

              <div class="requests-stack">
                @for (req of spaceService.space().pendingRequests; track req.uid) {
                  <div class="request-card">
                    <div class="req-user-block">
                      @if (req.photoURL) {
                        <img [src]="req.photoURL" [alt]="req.name" class="avatar-img" />
                      } @else {
                        <div class="avatar-char">{{ req.name.charAt(0) }}</div>
                      }
                      <div class="req-text">
                        <span class="req-name">{{ req.name }}</span>
                        <span class="req-email">{{ req.email }}</span>
                        <span class="req-time">Requested {{ formatTimeAgo(req.requestedAt) }}</span>
                      </div>
                    </div>
                    <div class="req-btns">
                      <button class="btn btn-xs btn-gold" (click)="spaceService.approveAccessRequest(req, 'agent')">
                        ✓ Approve as Agent
                      </button>
                      <button class="btn btn-xs btn-secondary" (click)="spaceService.approveAccessRequest(req, 'admin')">
                        ✓ Approve as Admin
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

          <!-- Active Members Directory -->
          <div class="card glass-panel full-width">
            <div class="card-head">
              <div class="card-title-group">
                <h3 class="card-title">Active Team Members Directory ({{ spaceService.space().members.length }})</h3>
                <span class="card-subtitle">Active agents and brokers in your agency workspace</span>
              </div>
            </div>

            <div class="table-responsive">
              <table class="settings-table">
                <thead>
                  <tr>
                    <th>Member Profile</th>
                    <th>Email Address</th>
                    <th>Role in Space</th>
                    <th>Joined Via</th>
                    <th>Last Active</th>
                    @if (spaceService.isOwner()) {
                      <th>Actions</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (member of spaceService.space().members; track member.id) {
                    <tr>
                      <td>
                        <div class="member-cell">
                          @if (member.photoURL) {
                            <img [src]="member.photoURL" [alt]="member.name" class="avatar-sm" />
                          } @else {
                            <div class="avatar-sm fallback" [style.background]="member.role === 'owner' ? 'var(--gold)' : 'var(--primary)'">
                              {{ member.name.charAt(0) }}
                            </div>
                          }
                          <span class="member-name">{{ member.name }}</span>
                        </div>
                      </td>
                      <td class="email-text">{{ member.email }}</td>
                      <td>
                        @if (spaceService.isOwner() && member.role !== 'owner') {
                          <select 
                            class="role-select" 
                            [value]="member.role" 
                            (change)="onRoleChange(member.id, $event)">
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                          </select>
                        } @else {
                          <span class="badge" [ngClass]="'badge-' + member.role">{{ member.role | uppercase }}</span>
                        }
                      </td>
                      <td class="dim-text">{{ formatJoinedVia(member.joinedVia) }}</td>
                      <td class="dim-text">{{ formatTimeAgo(member.lastActiveAt || member.joinedAt) }}</td>
                      @if (spaceService.isOwner()) {
                        <td>
                          @if (member.role !== 'owner') {
                            <button class="btn btn-xs btn-outline-danger" (click)="spaceService.revokeMemberAccess(member.id)" title="Remove member access">
                              Revoke
                            </button>
                          } @else {
                            <span class="creator-tag">Primary Owner</span>
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Workspace Details & Personal Mode (Subtle at the bottom) -->
          <div class="card glass-panel full-width">
            <div class="card-head">
              <div class="card-title-group">
                <h3 class="card-title">Workspace Configuration</h3>
                <span class="card-subtitle">Agency workspace details and mode switcher</span>
              </div>
            </div>

            <div class="space-identity-box">
              <div class="identity-row">
                <span class="label">Space Name</span>
                <span class="val font-semibold">{{ spaceService.space().name }}</span>
              </div>
              <div class="identity-row">
                <span class="label">Space Code</span>
                <span class="val font-mono" style="font-weight: 700; color: var(--gold); letter-spacing: 0.06em;">{{ spaceService.space().code }}</span>
              </div>
              <div class="identity-row">
                <span class="label">Primary Owner</span>
                <span class="val">{{ spaceService.space().ownerName || 'Agency Owner' }} @if (spaceService.space().ownerEmail) { ({{ spaceService.space().ownerEmail }}) }</span>
              </div>
              <div class="identity-row">
                <span class="label">Your Role</span>
                <span class="role-pill" [class.owner]="spaceService.isOwner()">{{ (spaceService.currentRole() || 'agent') | uppercase }}</span>
              </div>
              <div class="identity-row">
                <span class="label">Active Workspace</span>
                <div class="val mode-control-row">
                  <span class="mode-status-tag" [class.personal]="spaceService.activeSpaceMode() === 'personal'">
                    {{ spaceService.activeSpaceMode() === 'agency' ? '🏢 Agency Shared Space' : '👤 Personal Workspace' }}
                  </span>
                  @if (spaceService.activeSpaceMode() === 'agency') {
                    <button type="button" class="btn btn-xs btn-outline-subtle" (click)="spaceService.switchToPersonalMode()" title="Work privately in personal workspace">
                      Switch to Personal Mode
                    </button>
                  } @else {
                    <button type="button" class="btn btn-xs btn-gold" (click)="spaceService.returnToAgencySpace()" title="Return to Agency Space">
                      ↩ Return to Agency Space
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB 2: DATA & CSV EXPORTS -->
      @if (activeTab() === 'data') {
        <div class="settings-grid">
          <div class="card glass-panel full-width">
            <div class="card-head">
              <div class="card-title-group">
                <h3 class="card-title">Data Exports & Spreadsheet Reports</h3>
                <span class="card-subtitle">Download clean CSV datasets for accounting, client presentations, or offline auditing</span>
              </div>
            </div>

            <div class="export-cards-grid">
              <!-- Export 1: Properties -->
              <div class="export-box">
                <div class="export-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </div>
                <div class="export-details">
                  <h4 class="export-title">Property Inventory Master CSV</h4>
                  <p class="export-desc">
                    All {{ realtyService.totalPropertiesCount() }} Chennai property listings including BHK, pricing lakhs, super built-up, carpet sqft, UDS, legal approvals (CMDA/RERA/Patta), owner phone, and assigned agent.
                  </p>
                  <button class="btn btn-gold btn-sm mt-3" (click)="realtyService.exportPropertiesToCSV()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Download Properties CSV</span>
                  </button>
                </div>
              </div>

              <!-- Export 2: Leads & Buyers -->
              <div class="export-box">
                <div class="export-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <div class="export-details">
                  <h4 class="export-title">Buyers & Clients CRM CSV</h4>
                  <p class="export-desc">
                    All {{ realtyService.totalLeadsCount() }} buyer & tenant requirements with preferred corridors, budget brackets, BHK layout, funding readiness, pipeline stage, and expected commissions.
                  </p>
                  <button class="btn btn-secondary btn-sm mt-3" (click)="realtyService.exportLeadsToCSV()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Download Buyers CRM CSV</span>
                  </button>
                </div>
              </div>

              <!-- Export 3: Compatibility Matches -->
              <div class="export-box">
                <div class="export-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line></svg>
                </div>
                <div class="export-details">
                  <h4 class="export-title">Client & Property Matches CSV</h4>
                  <p class="export-desc">
                    All {{ realtyService.allCompatibilityMatches().length }} matched buyer-property pairs with match percentage scores, satisfied criteria, and verification details.
                  </p>
                  <button class="btn btn-secondary btn-sm mt-3" (click)="realtyService.exportMatchesToCSV()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    <span>Download Matches CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB 3: CHENNAI CORRIDORS & LOCALITIES -->
      @if (activeTab() === 'localities') {
        <div class="settings-grid">
          <div class="card glass-panel full-width">
            <div class="card-head">
              <div class="card-title-group">
                <h3 class="card-title">Chennai Corridors & Micro-Market Management</h3>
                <span class="card-subtitle">Active geographic zones used across search filters, inventory tagging, and buyer preferences</span>
              </div>
              <span class="badge-gold">{{ realtyService.localities().length }} Total Locations</span>
            </div>

            <!-- Add Location Input -->
            <div class="locality-add-box">
              <span class="subhead">Add Custom Chennai Locality / Hub</span>
              <p class="hint">Location is saved to cloud and becomes instantly available in all property and buyer dropdowns.</p>
              <div class="loc-input-row">
                <input 
                  type="text" 
                  class="form-control flex-1" 
                  placeholder="e.g. Pallikaranai, Perungudi, Medavakkam, Thoraipakkam" 
                  [(ngModel)]="newLocalityName"
                  (keyup.enter)="handleAddLocality()" />
                <button class="btn btn-gold btn-sm" (click)="handleAddLocality()">
                  + Add Corridors
                </button>
              </div>
            </div>

            <!-- Locality Tags Grid -->
            <div class="locality-chips-cloud">
              @for (loc of realtyService.localities(); track loc) {
                <div class="loc-chip">
                  <span class="loc-pin">📍</span>
                  <span class="loc-name">{{ loc }}</span>
                  <span class="loc-count">{{ getPropertiesCountForLocality(loc) }} props</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB 4: EMAIL AUTOMATION -->
      @if (activeTab() === 'email') {
        <div class="settings-grid">
          <div class="card glass-panel full-width">
            <div class="card-head">
              <div class="card-title-group">
                <h3 class="card-title">Email Follow-Up Automation Settings</h3>
                <span class="card-subtitle">Automated brokerage follow-ups, client match emails, and meeting summaries</span>
              </div>
            </div>

            <div class="email-settings-form">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Email Dispatch Method</label>
                  <select class="form-control" [ngModel]="emailService.emailSettings().provider" (ngModelChange)="updateEmailProvider($event)">
                    <option value="mailto">Default Mail Client (Outlook / Apple Mail / Gmail Web)</option>
                    <option value="emailjs">EmailJS Cloud Gateway (Direct in-app dispatch)</option>
                  </select>
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Sender Display Name</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [ngModel]="emailService.emailSettings().senderName" 
                    (ngModelChange)="updateSenderName($event)" 
                    placeholder="SkyPearl Realty Advisors" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Sender Reply-To Email</label>
                  <input 
                    type="email" 
                    class="form-control" 
                    [ngModel]="emailService.emailSettings().senderEmail" 
                    (ngModelChange)="updateSenderEmail($event)" 
                    placeholder="chennai-realty@skypearl.space" />
                </div>
                <div class="form-group flex-1 flex-align-end">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      [checked]="emailService.emailSettings().autoLogFollowUp" 
                      (change)="toggleAutoLog($event)" />
                    <span>Auto-advance lead follow-up date upon sending email</span>
                  </label>
                </div>
              </div>

              @if (emailService.emailSettings().provider === 'emailjs') {
                <div class="emailjs-config-box">
                  <h4 class="subhead">EmailJS Cloud API Keys</h4>
                  <div class="form-row">
                    <div class="form-group flex-1">
                      <label class="form-label">Service ID</label>
                      <input 
                        type="text" 
                        class="form-control font-mono" 
                        [ngModel]="emailService.emailSettings().emailjsServiceId" 
                        (ngModelChange)="updateEmailJsField('emailjsServiceId', $event)" 
                        placeholder="service_xxxxx" />
                    </div>
                    <div class="form-group flex-1">
                      <label class="form-label">Template ID</label>
                      <input 
                        type="text" 
                        class="form-control font-mono" 
                        [ngModel]="emailService.emailSettings().emailjsTemplateId" 
                        (ngModelChange)="updateEmailJsField('emailjsTemplateId', $event)" 
                        placeholder="template_xxxxx" />
                    </div>
                    <div class="form-group flex-1">
                      <label class="form-label">Public Key</label>
                      <input 
                        type="password" 
                        class="form-control font-mono" 
                        [ngModel]="emailService.emailSettings().emailjsPublicKey" 
                        (ngModelChange)="updateEmailJsField('emailjsPublicKey', $event)" 
                        placeholder="user_xxxxx" />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB 6: DANGER ZONE -->
      @if (activeTab() === 'danger') {
        <div class="settings-grid">
          <div class="card glass-panel full-width danger-card">
            <div class="card-head">
              <div class="card-title-group">
                <h3 class="card-title text-danger">Danger Zone: System Clean Slate</h3>
                <span class="card-subtitle">Permanent operations reset for testing or agency re-initialization</span>
              </div>
              <span class="badge-danger">Restricted Action</span>
            </div>

            <div class="danger-body">
              <div class="danger-warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <div class="danger-text">
                  <strong>Warning: Irreversible Action</strong>
                  <p>
                    Clearing data deletes all properties ({{ realtyService.totalPropertiesCount() }}), CRM buyer leads ({{ realtyService.totalLeadsCount() }}), and site visits ({{ realtyService.siteVisits().length }}). This cannot be undone.
                  </p>
                </div>
              </div>

              <div class="danger-action-row">
                <button class="btn btn-outline-danger" (click)="realtyService.clearAllData()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Permanently Reset All Listings, Leads & Visits</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .settings-workspace {
      display: flex;
      flex-direction: column;
      gap: 22px;
      padding-bottom: 60px;
    }

    .settings-header {
      padding: 24px 28px 0;
      border-radius: var(--radius-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .settings-tag {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--gold);
      font-family: var(--font-mono);
    }

    .cloud-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .cloud-badge.connected {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      border-color: rgba(16, 185, 129, 0.25);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .settings-title {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-main);
      margin: 0 0 6px;
    }

    .settings-desc {
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin: 0 0 20px;
      max-width: 800px;
    }

    .settings-subtabs {
      display: flex;
      gap: 4px;
      border-top: 1px solid var(--border-subtle);
      overflow-x: auto;
      padding-top: 4px;
    }

    .subtab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .subtab-btn:hover {
      color: var(--text-main);
      background: var(--bg-hover);
    }

    .subtab-btn.active {
      color: var(--gold);
      border-bottom-color: var(--gold);
      font-weight: 700;
    }

    .pill-count {
      font-size: 0.68rem;
      font-weight: 700;
      background: var(--bg-subtle);
      color: var(--text-secondary);
      padding: 1px 7px;
      border-radius: var(--radius-full);
    }

    .pill-count.warn {
      background: #f59e0b;
      color: #000;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(440px, 1fr));
      gap: 20px;
    }

    .card {
      padding: 24px;
      border-radius: var(--radius-lg);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
    }

    .card.full-width {
      grid-column: 1 / -1;
    }

    .card.highlight-warn-card {
      border-color: rgba(212, 175, 55, 0.4);
      background: linear-gradient(180deg, rgba(212, 175, 55, 0.04), transparent);
    }

    .card.highlight-gold-card {
      border: 1px solid rgba(212, 175, 55, 0.45);
      background: linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(17, 24, 39, 0.4) 100%);
      box-shadow: 0 10px 30px -10px rgba(212, 175, 55, 0.15);
    }

    .invite-hero-actions {
      display: flex;
      gap: 16px;
      margin-bottom: 22px;
      flex-wrap: wrap;
    }

    .btn-hero {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 14px 24px;
      font-size: 1rem;
      font-weight: 700;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      min-width: 240px;
    }

    .btn-whatsapp {
      background: #25D366;
      color: #ffffff;
      border: none;
      box-shadow: 0 4px 16px rgba(37, 211, 102, 0.35);
    }

    .btn-whatsapp:hover {
      background: #20bd5a;
      transform: translateY(-2px);
      box-shadow: 0 6px 22px rgba(37, 211, 102, 0.45);
    }

    .invite-link-row {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      margin-bottom: 22px;
    }

    .invite-link-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--gold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 6px;
    }

    .invite-link-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      margin-bottom: 8px;
    }

    .invite-link-text {
      font-family: var(--font-mono);
      font-size: 0.88rem;
      color: var(--text-main);
      word-break: break-all;
    }

    .invite-link-hint {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    .preauth-section {
      padding-top: 18px;
      border-top: 1px solid var(--border-subtle);
    }

    .card.danger-card {
      border-color: rgba(239, 68, 68, 0.35);
      background: linear-gradient(180deg, rgba(239, 68, 68, 0.03), transparent);
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0 0 3px;
    }

    .card-subtitle {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .space-identity-box {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .identity-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.86rem;
    }

    .identity-row .label {
      color: var(--text-secondary);
    }

    .identity-row .val {
      color: var(--text-main);
    }

    .role-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: var(--primary-surface);
      color: var(--primary);
    }

    .role-pill.owner {
      background: rgba(212, 175, 55, 0.15);
      color: var(--gold);
    }

    .space-code-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .space-code-val {
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--gold);
      background: rgba(203, 168, 107, 0.12);
      border: 1px solid rgba(203, 168, 107, 0.3);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      letter-spacing: 0.05em;
    }

    .mode-control-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mode-status-tag {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .mode-status-tag.personal {
      color: #60a5fa;
    }

    .join-code-block {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--border-subtle);
      margin-bottom: 16px;
    }

    .subhead {
      display: block;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 4px;
    }

    .hint {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0 0 12px;
    }

    .copy-input-row,
    .email-input-row,
    .loc-input-row {
      display: flex;
      gap: 10px;
    }

    .input-mono {
      flex: 1;
      padding: 8px 12px;
      font-size: 0.82rem;
      font-family: var(--font-mono);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
    }

    .requests-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .request-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      gap: 14px;
      flex-wrap: wrap;
    }

    .req-user-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-img, .avatar-char {
      width: 38px;
      height: 38px;
      border-radius: 50%;
    }

    .avatar-char {
      background: var(--gold);
      color: #000;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .req-text {
      display: flex;
      flex-direction: column;
    }

    .req-name {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-main);
    }

    .req-email {
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .req-time {
      font-size: 0.72rem;
      color: var(--gold);
    }

    .req-btns {
      display: flex;
      gap: 6px;
    }

    .email-chips-container {
      margin-top: 16px;
    }

    .chips-title {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      display: block;
      margin-bottom: 8px;
    }

    .chips-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .email-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      color: var(--text-main);
    }

    .chip-del {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0;
    }

    .chip-del:hover {
      color: #ef4444;
    }

    /* Table styles */
    .table-responsive {
      overflow-x: auto;
    }

    .settings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .settings-table th {
      text-align: left;
      padding: 10px 14px;
      color: var(--text-secondary);
      font-weight: 600;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .settings-table td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
      vertical-align: middle;
    }

    .member-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
    }

    .avatar-sm.fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.78rem;
    }

    .member-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .email-text {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .dim-text {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }

    .role-select {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 0.8rem;
      color: var(--text-main);
    }

    .creator-tag {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--gold);
    }

    /* Export boxes */
    .export-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 18px;
    }

    .export-box {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      transition: all 0.2s ease;
    }

    .export-box:hover {
      border-color: var(--gold);
    }

    .export-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(212, 175, 55, 0.12);
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .export-title {
      font-size: 0.96rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0 0 6px;
    }

    .export-desc {
      font-size: 0.82rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin: 0;
    }

    /* Localities */
    .locality-add-box {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .locality-chips-cloud {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .loc-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 12px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      transition: all 0.2s ease;
    }

    .loc-chip:hover {
      border-color: var(--gold);
      background: var(--bg-hover);
    }

    .loc-pin {
      font-size: 0.85rem;
    }

    .loc-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .loc-count {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--gold);
      font-family: var(--font-mono);
      background: rgba(212, 175, 55, 0.1);
      padding: 1px 6px;
      border-radius: var(--radius-full);
    }

    /* Email automation */
    .email-settings-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.84rem;
      color: var(--text-main);
      cursor: pointer;
      margin-top: 24px;
    }

    .flex-align-end {
      align-self: flex-end;
    }

    .emailjs-config-box {
      margin-top: 10px;
      padding: 18px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }

    /* Danger body */
    .danger-body {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .danger-warning {
      display: flex;
      gap: 14px;
      padding: 16px 20px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: var(--radius-md);
    }

    .danger-text strong {
      display: block;
      color: #ef4444;
      font-size: 0.92rem;
      margin-bottom: 4px;
    }

    .danger-text p {
      font-size: 0.84rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.45;
    }

    .danger-action-row {
      display: flex;
      justify-content: flex-start;
    }

    @media (max-width: 768px) {
      .settings-workspace {
        padding: 0;
      }

      .settings-header {
        padding: 16px 14px;
        margin-bottom: 14px;
      }

      .settings-title {
        font-size: 1.22rem;
        line-height: 1.3;
        margin-bottom: 6px;
      }

      .settings-desc {
        font-size: 0.78rem;
        line-height: 1.45;
        margin-bottom: 14px;
      }

      .settings-subtabs {
        gap: 2px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }

      .settings-subtabs::-webkit-scrollbar {
        display: none;
      }

      .subtab-btn {
        padding: 9px 12px;
        font-size: 0.78rem;
        gap: 6px;
      }

      .settings-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .card {
        padding: 16px 14px;
      }

      .card-title {
        font-size: 1.05rem;
      }

      .card-subtitle {
        font-size: 0.74rem;
        line-height: 1.4;
      }

      .invite-hero-actions {
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
      }

      .btn-hero {
        width: 100%;
        min-width: 100%;
        font-size: 0.88rem;
        padding: 12px 16px;
      }

      .copy-input-row,
      .email-input-row,
      .loc-input-row {
        flex-direction: column;
        gap: 8px;
      }

      .copy-input-row .btn,
      .email-input-row .btn,
      .loc-input-row .btn {
        width: 100%;
        justify-content: center;
        min-height: 40px;
      }

      .invite-link-row {
        padding: 12px;
        margin-bottom: 16px;
      }

      .invite-link-text {
        font-size: 0.76rem;
      }

      .invite-link-hint {
        font-size: 0.74rem;
      }

      .request-card {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding: 12px;
      }

      .req-btns {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        width: 100%;
      }

      .req-btns .btn {
        flex: 1 1 calc(50% - 4px);
        justify-content: center;
        min-height: 36px;
      }

      .form-row {
        flex-direction: column;
      }

      .checkbox-label {
        margin-top: 4px;
      }

      .export-cards-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .export-box {
        flex-direction: column;
        padding: 14px;
      }
    }
  `]
})
export class SettingsComponent {
  public realtyService = inject(RealtyService);
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);
  public emailService = inject(EmailFollowupService);
  public firebaseService = inject(FirebaseService);

  public activeTab = signal<'team' | 'data' | 'localities' | 'email' | 'danger'>('team');
  public newPreAuthEmail = '';
  public newLocalityName = '';
  public copiedLink = signal<boolean>(false);
  public copiedCode = signal<boolean>(false);
  public spaceCodeToJoin = '';

  public inviteLink = computed(() => {
    return this.spaceService.getInviteLink();
  });

  public shareOnWhatsApp(): void {
    const url = this.spaceService.getWhatsAppInviteUrl();
    window.open(url, '_blank');
  }

  public copyInviteLink(): void {
    const url = this.inviteLink();
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        this.copiedLink.set(true);
        this.realtyService.notify('Team Join Link copied! Share this link with your agents on WhatsApp or email.', 'success');
        setTimeout(() => this.copiedLink.set(false), 2500);
      });
    }
  }

  public copySpaceCode(): void {
    const code = this.spaceService.space().code;
    if (!code) return;
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copiedCode.set(true);
        this.realtyService.notify('Space Auto Code copied to clipboard: ' + code, 'success');
        setTimeout(() => this.copiedCode.set(false), 2500);
      });
    }
  }

  public async joinByCode(): Promise<void> {
    const code = this.spaceCodeToJoin.trim();
    if (!code) return;
    const success = await this.spaceService.joinSpaceByCode(code);
    if (success) {
      this.realtyService.notify('Successfully joined space!', 'success');
      this.spaceCodeToJoin = '';
    } else {
      this.realtyService.notify('Invalid space code. Please check with your team owner.', 'error');
    }
  }

  public addPreAuthEmail(): void {
    const email = (this.newPreAuthEmail || '').trim();
    if (!email) return;
    const ok = this.spaceService.grantEmailAccess(email, 'agent');
    if (ok) {
      this.realtyService.notify(`Google email "${email}" pre-authorized!`, 'success');
      this.newPreAuthEmail = '';
    } else {
      this.realtyService.notify('Please provide a valid email address.', 'error');
    }
  }

  public onRoleChange(memberId: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const role = target.value as 'admin' | 'agent';
    this.spaceService.updateMemberRole(memberId, role);
    this.realtyService.notify(`Member role updated to ${role.toUpperCase()}`, 'info');
  }

  public async handleAddLocality(): Promise<void> {
    const name = (this.newLocalityName || '').trim();
    if (!name) return;
    const success = await this.realtyService.addLocation(name);
    if (success) {
      this.newLocalityName = '';
    }
  }

  public getPropertiesCountForLocality(loc: string): number {
    return this.realtyService.properties().filter(p => p.locality === loc).length;
  }

  public formatJoinedVia(joinedVia?: string): string {
    switch (joinedVia) {
      case 'creator': return 'Creator / Owner';
      case 'email_invite': return 'Pre-Authorized';
      case 'approved_request': return 'Approved Request';
      default: return 'Member';
    }
  }

  public formatTimeAgo(ts?: number): string {
    if (!ts) return 'Just now';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  public formatTimestamp(ts: number | null): string {
    if (!ts) return 'Active';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Email Config Handlers
  public updateEmailProvider(provider: 'emailjs' | 'mailto'): void {
    const curr = this.emailService.emailSettings();
    this.emailService.saveSettings({ ...curr, provider });
    this.realtyService.notify(`Email provider updated to ${provider}`, 'info');
  }

  public updateSenderName(name: string): void {
    const curr = this.emailService.emailSettings();
    this.emailService.saveSettings({ ...curr, senderName: name });
  }

  public updateSenderEmail(email: string): void {
    const curr = this.emailService.emailSettings();
    this.emailService.saveSettings({ ...curr, senderEmail: email });
  }

  public toggleAutoLog(event: Event): void {
    const input = event.target as HTMLInputElement;
    const curr = this.emailService.emailSettings();
    this.emailService.saveSettings({ ...curr, autoLogFollowUp: input.checked });
  }

  public updateEmailJsField(field: 'emailjsServiceId' | 'emailjsTemplateId' | 'emailjsPublicKey', value: string): void {
    const curr = this.emailService.emailSettings();
    this.emailService.saveSettings({ ...curr, [field]: value });
  }
}
