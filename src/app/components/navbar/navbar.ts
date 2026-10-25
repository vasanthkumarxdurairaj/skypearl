import { Component, inject, output, signal, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtyService } from '../../services/realty.service';
import { SpaceService } from '../../services/space.service';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <header class="navbar-container">
      <div class="nav-left">
        <div class="brand">
          <div class="brand-gem">
            <img src="logo.png" alt="SkyPearl Realty" class="brand-logo-img" />
          </div>
          <div class="brand-text">
            <div class="brand-title">SkyPearl <span class="gold-text">Realty</span></div>
            <div class="brand-subtitle">CHENNAI REAL ESTATE BROKERAGE</div>
          </div>
        </div>

        <!-- Locality / City Pill -->
        <div class="city-pill">
          <span class="city-dot"></span>
          <span class="city-name">Chennai Corridor</span>
          <span class="city-badge">{{ realtyService.localities().length }} Localities</span>
        </div>

        <!-- Workspace Switcher & Privacy Group (Dedicated Header Control) -->
        <div class="workspace-switcher-wrap">
          @if (spaceService.activeSpaceMode() === 'agency') {
            <div class="space-pill-group">
              <button 
                type="button"
                class="space-pill" 
                [class.active-switcher]="showWorkspaceSwitcher()"
                (click)="toggleWorkspaceSwitcher()" 
                title="Active Workspace: {{ spaceService.space().name }} • Click to Switch Workspace">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span class="space-name">Space:</span>
                <span class="space-badge mono">{{ spaceService.space().code }}</span>
                <svg class="chevron-mini" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>

              <button class="space-mode-btn" (click)="spaceService.switchToPersonalMode()" title="Switch to Private Personal Workspace">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span class="btn-text-desktop">Personal</span>
              </button>
            </div>
          } @else {
            <div class="space-pill-group personal-active">
              <button 
                type="button"
                class="space-pill personal" 
                [class.active-switcher]="showWorkspaceSwitcher()"
                (click)="toggleWorkspaceSwitcher()" 
                title="Personal Workspace • Click to switch to Team Space">
                <span class="personal-dot"></span>
                <span class="space-name">Solo Personal</span>
                <svg class="chevron-mini" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>

              <button class="space-mode-btn return-btn" (click)="spaceService.returnToAgencySpace()" title="Return to Agency Team Space">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                <span class="btn-text-desktop">Return to Team Space</span>
                <span class="btn-text-mobile">Team</span>
              </button>
            </div>
          }

          <!-- Dedicated Header Workspace Switcher Dropdown Menu -->
          @if (showWorkspaceSwitcher()) {
            <div class="workspace-dropdown glass-panel">
              <div class="ws-dropdown-header">
                <div class="ws-header-meta">
                  <span class="ws-eyebrow">WORKSPACE SWITCHER</span>
                  <div class="ws-privacy-pill" [class.personal]="spaceService.activeSpaceMode() === 'personal'">
                    <span class="privacy-dot"></span>
                    <span>{{ spaceService.activeSpaceMode() === 'agency' ? 'Shared Agency (Team Visible)' : 'Private Solo (Owner Only)' }}</span>
                  </div>
                </div>
                <div class="ws-current-row">
                  <span class="ws-current-name">{{ spaceService.space().name }}</span>
                  <span class="ws-current-role-badge">{{ (spaceService.currentRole() || 'AGENT') | uppercase }}</span>
                </div>
              </div>

              <!-- Available Workspaces List -->
              <div class="ws-list-section">
                <span class="ws-section-label">Accessible Workspaces</span>
                <div class="ws-items-scroll">
                  @for (sp of spaceService.availableSpaces(); track sp.code) {
                    <div 
                      class="ws-item" 
                      [class.is-active]="sp.code.toUpperCase() === spaceService.space().code.toUpperCase() && spaceService.activeSpaceMode() === 'agency'"
                      (click)="switchSpace(sp.code); showWorkspaceSwitcher.set(false)">
                      <div class="ws-item-left">
                        <div class="ws-item-icon">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        </div>
                        <div class="ws-item-meta">
                          <span class="ws-item-title">{{ sp.name }}</span>
                          <span class="ws-item-code mono">{{ sp.code }}</span>
                        </div>
                      </div>
                      <div class="ws-item-right">
                        @if (sp.code.toUpperCase() === spaceService.space().code.toUpperCase() && spaceService.activeSpaceMode() === 'agency') {
                          <span class="ws-active-tick">✓ Active</span>
                        } @else {
                          <span class="ws-role-tag">{{ sp.role | uppercase }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Switcher Quick Mode Toggle -->
              <div class="ws-mode-actions">
                @if (spaceService.activeSpaceMode() === 'agency') {
                  <button type="button" class="btn-ws-mode-action" (click)="spaceService.switchToPersonalMode(); showWorkspaceSwitcher.set(false)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>Switch to Personal Mode (Private Listings)</span>
                  </button>
                } @else {
                  <button type="button" class="btn-ws-mode-action" (click)="spaceService.returnToAgencySpace(); showWorkspaceSwitcher.set(false)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
                    <span>Return to Shared Team Space</span>
                  </button>
                }
              </div>

              <!-- Switcher Footer: Settings & Code Input -->
              <div class="ws-dropdown-footer">
                <button type="button" class="btn-open-settings" (click)="spaceService.showSpaceSettingsModal.set(true); showWorkspaceSwitcher.set(false)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span>Team Members & Workspace Settings</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>

      <div class="nav-right">

        <!-- Quick Action Buttons -->
        <button class="btn btn-gold btn-sm nav-btn-scanner" (click)="openScannerModal.emit()" title="Scan Newspaper Classified Ad via Camera OCR">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <span class="btn-text-desktop">Scan Ad (Camera)</span>
        </button>

        <button class="btn btn-secondary btn-sm nav-btn-secondary" (click)="openVisitModal.emit()" title="Schedule Site Visit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Site Visit</span>
        </button>

        <button class="btn btn-gold btn-sm nav-btn-buyer" (click)="openLeadModal.emit()" title="Add Lead to CRM">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
          <span>Add Buyer</span>
        </button>

        <button class="btn btn-primary btn-sm nav-btn-property" (click)="openPropertyModal.emit()" title="List Property in Chennai">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add Property</span>
        </button>

        <div class="nav-divider-v"></div>

        <!-- Simple Theme Toggle Logo / Icon Button (Near Profile) -->
        <button class="theme-icon-btn" (click)="realtyService.toggleTheme()" [title]="realtyService.currentTheme() === 'light' ? 'Switch to Dark Mode' : 'Switch to White Theme'">
          @if (realtyService.currentTheme() === 'light') {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          }
        </button>

        <!-- Right Profile: Single Circle Alone (Click of profile img instead of full name) -->
        <div class="profile-circle-container">
          <button 
            type="button"
            class="profile-circle-btn" 
            [class.is-owner]="realtyService.activeAgent().role === 'owner'"
            [class.open]="showAgentMenu()"
            (click)="toggleAgentMenu()" 
            [title]="authService.currentUser() ? (realtyService.activeAgent().name + ' (' + realtyService.activeAgent().role.toUpperCase() + ')') : 'Account & Space Settings'">
            @if (profilePhoto()) {
              <img [src]="profilePhoto()" [alt]="realtyService.activeAgent().name" class="profile-avatar-img" />
            } @else {
              <div class="profile-avatar-circle" [style.background]="realtyService.activeAgent().avatarColor">
                {{ (realtyService.activeAgent().name || 'G').charAt(0) }}
              </div>
            }
            @if (realtyService.activeAgent().role === 'owner') {
              <span class="owner-crown-dot" title="Space Creator & Owner">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
            }
          </button>

          @if (showAgentMenu()) {
            <div class="agent-dropdown glass-panel">
              <div class="dropdown-header">
                <span class="dropdown-title">Active Account & Workspace</span>
                <span class="dropdown-desc">Agent profile and agency workspace access</span>
              </div>

              <!-- Guest Sign In Prompt if not signed in -->
              @if (!authService.currentUser()) {
                <div class="guest-signin-box">
                  <button class="btn btn-google-nav btn-sm w-full" (click)="signInWithGoogle()">
                    <svg width="14" height="14" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Sign In with Google</span>
                  </button>
                </div>
              } @else {
                <!-- Current User Profile Card -->
                <div class="current-user-card">
                  <div class="current-user-main">
                    @if (profilePhoto()) {
                      <img [src]="profilePhoto()" [alt]="realtyService.activeAgent().name" class="avatar-card-img" />
                    } @else {
                      <div class="avatar-card" [style.background]="realtyService.activeAgent().avatarColor">
                        {{ realtyService.activeAgent().name.charAt(0) }}
                      </div>
                    }
                    <div class="current-user-meta">
                      <div class="current-name">{{ realtyService.activeAgent().name }}</div>
                      <div class="current-email">{{ realtyService.activeAgent().email }}</div>
                      <div class="current-tag-row">
                        <span class="badge" [ngClass]="'badge-' + realtyService.activeAgent().role">{{ realtyService.activeAgent().role | uppercase }}</span>
                        <span class="access-method-chip">Via {{ (realtyService.activeAgent().joinedVia || 'google') | uppercase }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Account Actions -->
                  <div class="user-action-buttons">
                    <button class="btn btn-xs btn-gold" (click)="openSpaceSettings()" title="Team members and permissions">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                      <span>Manage Team</span>
                    </button>
                    <button class="btn btn-xs btn-secondary" (click)="lockAndSwitch()" title="Lock space access on this device">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      <span>Lock Space</span>
                    </button>
                    <button class="btn btn-xs btn-outline-danger" (click)="signOutGoogle()" title="Sign out of your account">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>

                <!-- WORKSPACE & SPACE SWITCHER (Inside Profile Section) -->
                <div class="workspace-switcher-section">
                  <div class="switcher-header">
                    <div class="switcher-title-row">
                      <span class="switcher-title">ACTIVE WORKSPACE</span>
                      <span class="space-mode-pill" [class.personal]="spaceService.activeSpaceMode() === 'personal'">
                        {{ spaceService.activeSpaceMode() === 'personal' ? 'SOLO PRIVATE' : 'AGENCY TEAM' }}
                      </span>
                    </div>

                    <div class="current-space-box">
                      <div class="space-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                      </div>
                      <div class="current-space-meta">
                        <span class="space-name-text">{{ spaceService.activeSpaceMode() === 'personal' ? 'Personal Private Workspace' : spaceService.space().name }}</span>
                        <div class="space-code-row">
                          <span class="code-badge">{{ spaceService.space().code }}</span>
                          <button type="button" class="btn-copy-code" (click)="copySpaceCode()" title="Copy Space Code">
                            {{ spaceCodeCopied() ? '✓ Copied' : 'Copy' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Mode switch buttons -->
                  <div class="mode-toggle-bar">
                    <button 
                      type="button" 
                      class="mode-btn" 
                      [class.active]="spaceService.activeSpaceMode() === 'agency'"
                      (click)="spaceService.returnToAgencySpace()">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      <span>Common Space</span>
                    </button>
                    <button 
                      type="button" 
                      class="mode-btn" 
                      [class.active]="spaceService.activeSpaceMode() === 'personal'"
                      (click)="spaceService.switchToPersonalMode()">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <span>Personal Mode</span>
                    </button>
                  </div>

                  <!-- Available spaces list -->
                  <div class="switch-spaces-list">
                    <span class="switch-sub-title">SWITCH TO AVAILABLE SPACE</span>
                    @for (s of spaceService.availableSpaces(); track s.code) {
                      <button 
                        type="button" 
                        class="space-select-item" 
                        [class.is-current]="spaceService.activeSpaceMode() === 'agency' && spaceService.space().code.toUpperCase() === s.code.toUpperCase()"
                        (click)="switchSpace(s.code)">
                        <div class="space-item-left">
                          <span class="space-item-dot" [class.active]="spaceService.activeSpaceMode() === 'agency' && spaceService.space().code.toUpperCase() === s.code.toUpperCase()">●</span>
                          <div class="space-item-text">
                            <span class="space-item-name">{{ s.name }}</span>
                            <span class="space-item-code">{{ s.code }} • {{ s.role | uppercase }}</span>
                          </div>
                        </div>
                        @if (spaceService.activeSpaceMode() === 'agency' && spaceService.space().code.toUpperCase() === s.code.toUpperCase()) {
                          <span class="active-badge">Active</span>
                        } @else {
                          <span class="switch-arrow">Switch →</span>
                        }
                      </button>
                    }
                  </div>

                  <!-- Enter space code to switch directly -->
                  <div class="switch-code-box">
                    <input 
                      type="text" 
                      class="switch-code-input" 
                      placeholder="Enter Space Code (e.g. SKP-CHN-4829)" 
                      [(ngModel)]="targetSpaceCode" 
                      (keyup.enter)="handleSwitchByCode()" />
                    <button 
                      type="button" 
                      class="btn btn-xs btn-gold" 
                      (click)="handleSwitchByCode()"
                      [disabled]="!targetSpaceCode.trim()">
                      Switch
                    </button>
                  </div>

                  <!-- Create New Space Toggle -->
                  @if (!showCreateSpaceInline()) {
                    <div style="margin-top: 6px; text-align: right;">
                      <button type="button" class="btn-helper-link" style="font-size: 0.65rem;" (click)="showCreateSpaceInline.set(true)">
                        + Create New Agency Space
                      </button>
                    </div>
                  } @else {
                    <div class="inline-create-space">
                      <span class="switch-sub-title">CREATE NEW AGENCY SPACE</span>
                      <div class="switch-code-box">
                        <input 
                          type="text" 
                          class="switch-code-input" 
                          placeholder="Space Name (e.g. OMR Branch)" 
                          [(ngModel)]="newInlineSpaceName" 
                          (keyup.enter)="createSpaceFromProfile()" />
                        <button 
                          type="button" 
                          class="btn btn-xs btn-gold" 
                          (click)="createSpaceFromProfile()"
                          [disabled]="!newInlineSpaceName.trim()">
                          Create
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-xs btn-secondary" 
                          (click)="showCreateSpaceInline.set(false)">
                          ✕
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Workspace Members & Authorized Section -->
              <div class="accessed-header">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span class="accessed-title">TEAM & AUTHORIZED ({{ totalTeamCount() }})</span>
                  @if (spaceService.isOwner()) {
                    <button type="button" class="btn-helper-link" style="font-size: 0.62rem;" (click)="openSpaceSettings()">+ Add Member</button>
                  }
                </div>
                <span class="accessed-subtitle">Collaborators with access to this workspace</span>
              </div>

              <div class="agent-list">
                <!-- 1. Active registered members -->
                @for (member of spaceService.space().members; track member.id) {
                  <div 
                    class="agent-item" 
                    [class.active]="realtyService.activeAgent().uid === member.id || realtyService.activeAgent().email === member.email">
                    @if (member.photoURL) {
                      <img [src]="member.photoURL" [alt]="member.name" class="avatar-sm-img" />
                    } @else {
                      <div class="avatar-sm" [style.background]="member.role === 'owner' ? 'linear-gradient(135deg, #d4af37, #b8860b)' : 'linear-gradient(135deg, #4285F4, #34A853)'">
                        {{ member.name.charAt(0) }}
                      </div>
                    }
                    <div class="agent-info">
                      <div class="agent-title-row">
                        <span class="agent-name-text">{{ member.name }}</span>
                        <span class="badge" [ngClass]="'badge-' + member.role">{{ member.role | uppercase }}</span>
                      </div>
                      <div class="agent-meta-text">
                        {{ member.email }} • {{ formatJoinedVia(member.joinedVia) }} • {{ formatAccessTime(member.lastActiveAt || member.joinedAt) }}
                      </div>
                    </div>
                    @if (realtyService.activeAgent().uid === member.id || realtyService.activeAgent().email === member.email) {
                      <span class="active-dot" title="You (Active on this device)">●</span>
                    }
                  </div>
                }

                <!-- 2. Pre-Authorized Accounts Pending Sign-In -->
                @for (pendingEmail of spaceService.authorizedPendingEmails(); track pendingEmail) {
                  <div class="pending-auth-item">
                    <div class="pending-auth-left">
                      <div class="avatar-sm" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px dashed #f59e0b;">
                        ✉
                      </div>
                      <div class="pending-auth-meta">
                        <span class="pending-auth-email">{{ pendingEmail }}</span>
                        <span class="pending-status-pill">✓ AUTHORIZED • PENDING SIGN-IN</span>
                      </div>
                    </div>
                    @if (spaceService.isOwner()) {
                      <button type="button" class="btn btn-xs btn-outline-subtle" (click)="copyInviteLink()" title="Copy join link to share">
                        Copy Link
                      </button>
                    }
                  </div>
                }

                @if (spaceService.space().members.length === 0 && spaceService.authorizedPendingEmails().length === 0) {
                  <div class="empty-accessed-note">
                    <span>Only your current session has accessed this space so far. Share invite code to collaborate with your team.</span>
                  </div>
                }
              </div>

              <div class="dropdown-footer">
                <button class="btn btn-xs btn-secondary w-full" (click)="copyInviteLink()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  <span>Share Space Invite Link</span>
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-container {
      height: 62px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-secondary);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
      transition: background 0.25s, border-color 0.25s;
    }

    .nav-left, .nav-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
      text-decoration: none;
      cursor: pointer;
    }

    .brand-gem {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #000000;
      border: 1px solid rgba(203, 168, 107, 0.45);
      display: grid;
      place-items: center;
      box-shadow: 0 4px 14px rgba(203, 168, 107, 0.25);
      flex-shrink: 0;
      overflow: hidden;
      padding: 2px;
    }

    .brand-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .brand-title {
      font-family: var(--font-sans);
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }

    .gold-text {
      color: #cba86b;
    }

    .brand-subtitle {
      font-size: 0.64rem;
      font-weight: 700;
      color: var(--text-dim);
      letter-spacing: 0.08em;
    }

    .city-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 4px 10px;
      font-size: 0.74rem;
      color: var(--text-secondary);
    }

    .city-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .city-name {
      font-weight: 600;
    }

    .city-badge {
      background: rgba(203, 168, 107, 0.15);
      color: var(--gold);
      font-size: 0.68rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      font-family: var(--font-mono);
    }

    /* Space & Invite Pill */
    .space-pill-group {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 2px 4px 2px 2px;
      transition: all 0.2s ease;
    }

    .space-pill-group:hover {
      border-color: rgba(203, 168, 107, 0.4);
    }

    .space-pill-group.personal-active {
      border-color: rgba(59, 130, 246, 0.35);
      background: rgba(59, 130, 246, 0.05);
    }

    .space-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: none;
      padding: 3px 8px;
      font-size: 0.73rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .space-pill:hover {
      color: var(--gold);
    }

    .space-name {
      font-weight: 700;
    }

    .space-badge {
      background: rgba(203, 168, 107, 0.15);
      color: var(--gold);
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 7px;
      border-radius: var(--radius-full);
    }

    .space-mode-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      border: 1px solid rgba(203, 168, 107, 0.35);
      background: rgba(203, 168, 107, 0.12);
      color: var(--gold);
      font-size: 0.67rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .space-mode-btn:hover {
      background: rgba(203, 168, 107, 0.25);
      border-color: var(--gold);
      transform: translateY(-1px);
    }

    .space-mode-btn.return-btn {
      background: linear-gradient(135deg, #d4af37, #b8860b);
      color: #0b0f17;
      font-weight: 800;
      border: none;
      box-shadow: 0 2px 8px rgba(203, 168, 107, 0.3);
    }

    .space-mode-btn.return-btn:hover {
      background: linear-gradient(135deg, #dfbc4d, #c59317);
      color: #000;
      box-shadow: 0 4px 12px rgba(203, 168, 107, 0.5);
    }

    .personal-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #3b82f6;
      box-shadow: 0 0 6px #3b82f6;
    }

    .workspace-switcher-wrap {
      position: relative;
    }

    .chevron-mini {
      color: var(--text-muted);
      margin-left: 2px;
      transition: transform 0.2s ease;
    }

    .space-pill.active-switcher .chevron-mini {
      transform: rotate(180deg);
      color: var(--gold);
    }

    .workspace-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 320px;
      background: var(--bg-card);
      border: 1px solid var(--border-active);
      border-radius: var(--radius-lg);
      padding: 14px;
      z-index: 1100;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: fadeIn 0.15s ease-out;
    }

    .ws-dropdown-header {
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .ws-header-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .ws-eyebrow {
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      font-weight: 700;
    }

    .ws-privacy-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.62rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-full);
      background: rgba(34, 197, 94, 0.12);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .ws-privacy-pill.personal {
      background: rgba(59, 130, 246, 0.12);
      color: #3b82f6;
      border-color: rgba(59, 130, 246, 0.3);
    }

    .privacy-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .ws-current-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .ws-current-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ws-current-role-badge {
      font-size: 0.62rem;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(203, 168, 107, 0.2);
      color: var(--gold);
      border: 1px solid rgba(203, 168, 107, 0.4);
    }

    .ws-list-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .ws-section-label {
      font-size: 0.68rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .ws-items-scroll {
      display: flex;
      flex-direction: column;
      gap: 5px;
      max-height: 180px;
      overflow-y: auto;
    }

    .ws-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .ws-item:hover {
      background: var(--bg-hover);
      border-color: var(--border-active);
    }

    .ws-item.is-active {
      background: rgba(203, 168, 107, 0.12);
      border-color: var(--gold);
    }

    .ws-item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }

    .ws-item-icon {
      color: var(--gold);
      flex-shrink: 0;
    }

    .ws-item-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .ws-item-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ws-item-code {
      font-size: 0.65rem;
      color: var(--text-muted);
    }

    .ws-active-tick {
      font-size: 0.65rem;
      font-weight: 700;
      color: #22c55e;
    }

    .ws-role-tag {
      font-size: 0.6rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .ws-mode-actions {
      border-top: 1px solid var(--border-subtle);
      padding-top: 8px;
    }

    .btn-ws-mode-action {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 6px 10px;
      font-size: 0.72rem;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-ws-mode-action:hover {
      color: var(--text-main);
      background: var(--bg-hover);
      border-color: var(--border-active);
    }

    .ws-dropdown-footer {
      border-top: 1px solid var(--border-subtle);
      padding-top: 8px;
    }

    .btn-open-settings {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: linear-gradient(135deg, rgba(203, 168, 107, 0.15), rgba(203, 168, 107, 0.05));
      border: 1px solid rgba(203, 168, 107, 0.35);
      border-radius: var(--radius-md);
      padding: 7px 10px;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--gold);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-open-settings:hover {
      background: rgba(203, 168, 107, 0.25);
      border-color: var(--gold);
    }

    .btn-google-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      background: var(--bg-surface);
      color: var(--text-main);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 7px 12px;
      font-size: 0.76rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-google-nav:hover {
      background: var(--bg-card);
      border-color: #4285F4;
      box-shadow: 0 2px 8px rgba(66, 133, 244, 0.15);
    }

    .nav-divider-v {
      width: 1px;
      height: 22px;
      background: var(--border-subtle);
      margin: 0 3px;
    }

    /* Simple Theme Logo / Icon Button (Near Profile) */
    .theme-icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
      padding: 0;
    }

    .theme-icon-btn:hover {
      background: var(--bg-card-hover);
      border-color: var(--gold);
      color: var(--gold);
      transform: scale(1.05);
    }

    /* Right Profile: Single Circle Avatar Button */
    .profile-circle-container {
      position: relative;
    }

    .profile-circle-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      padding: 0;
      margin: 0;
      background: transparent;
      border: 2px solid var(--border-subtle);
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      outline: none;
      flex-shrink: 0;
    }

    .profile-circle-btn:hover,
    .profile-circle-btn.open {
      border-color: var(--gold);
      transform: scale(1.06);
      box-shadow: 0 0 12px rgba(203, 168, 107, 0.35);
    }

    .profile-circle-btn.is-owner {
      border-color: rgba(203, 168, 107, 0.85);
    }

    .profile-avatar-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .profile-avatar-circle {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.82rem;
    }

    .owner-crown-dot {
      position: absolute;
      bottom: -4px;
      right: -4px;
      font-size: 11px;
      line-height: 1;
      background: #11141c;
      border-radius: 50%;
      padding: 1px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    }

    .guest-signin-box {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .w-full {
      width: 100%;
    }

    /* Agent Dropdown */
    .agent-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 350px;
      max-width: 92vw;
      max-height: 85vh;
      overflow-y: auto;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 12px;
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      animation: dropDown 0.15s ease;
    }

    @keyframes dropDown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 10px;
    }

    .dropdown-title {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-main);
      display: block;
    }

    .dropdown-desc {
      font-size: 0.68rem;
      color: var(--text-dim);
    }

    .avatar-img {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    /* Current User Card */
    .current-user-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px;
      margin-bottom: 12px;
    }

    .current-user-main {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .avatar-card-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      border: 2px solid var(--gold-accent);
    }

    .avatar-card {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.82rem;
      flex-shrink: 0;
    }

    .current-user-meta {
      flex: 1;
      overflow: hidden;
    }

    .current-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .current-email {
      font-size: 0.68rem;
      color: var(--text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .current-tag-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .access-method-chip {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(203, 168, 107, 0.15);
      color: var(--gold-accent);
      letter-spacing: 0.4px;
    }

    .user-action-buttons {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--border-subtle);
    }

    .btn-google-action {
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #d1d5db;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: var(--radius-sm);
    }

    .btn-google-action:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }

    /* Space Switcher Section inside Profile Dropdown */
    .workspace-switcher-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 10px;
      margin-bottom: 12px;
    }

    .switcher-header {
      margin-bottom: 8px;
    }

    .switcher-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .switcher-title {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.6px;
      color: var(--text-dim);
      text-transform: uppercase;
    }

    .space-mode-pill {
      font-size: 0.6rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(203, 168, 107, 0.15);
      color: var(--gold-accent);
      letter-spacing: 0.3px;
    }

    .space-mode-pill.personal {
      background: rgba(100, 116, 139, 0.2);
      color: #94a3b8;
    }

    .current-space-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(203, 168, 107, 0.08);
      border: 1px solid rgba(203, 168, 107, 0.25);
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .space-icon {
      color: var(--gold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .current-space-meta {
      flex: 1;
      overflow: hidden;
    }

    .space-name-text {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-main);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .space-code-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }

    .code-badge {
      font-family: var(--font-mono, monospace);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.04em;
    }

    .btn-copy-code {
      font-size: 0.62rem;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-subtle);
      color: var(--text-dim);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-copy-code:hover {
      background: rgba(203, 168, 107, 0.2);
      color: var(--gold);
      border-color: var(--gold);
    }

    .mode-toggle-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 10px;
    }

    .mode-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      font-size: 0.68rem;
      font-weight: 600;
      padding: 5px 8px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      background: transparent;
      color: var(--text-dim);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mode-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
    }

    .mode-btn.active {
      background: rgba(203, 168, 107, 0.15);
      border-color: var(--gold);
      color: var(--gold);
      font-weight: 700;
    }

    .switch-spaces-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 8px;
      max-height: 140px;
      overflow-y: auto;
    }

    .switch-sub-title {
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--text-dim);
      text-transform: uppercase;
      margin-bottom: 2px;
      display: block;
    }

    .space-select-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      background: transparent;
      cursor: pointer;
      width: 100%;
      text-align: left;
      transition: all 0.12s ease;
    }

    .space-select-item:hover {
      background: rgba(203, 168, 107, 0.08);
      border-color: rgba(203, 168, 107, 0.4);
    }

    .space-select-item.is-current {
      background: rgba(203, 168, 107, 0.12);
      border-color: var(--gold);
    }

    .space-item-left {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      flex: 1;
    }

    .space-item-dot {
      font-size: 10px;
      color: var(--text-dim);
    }

    .space-item-dot.active {
      color: #10b981;
    }

    .space-item-text {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .space-item-name {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .space-item-code {
      font-family: var(--font-mono, monospace);
      font-size: 0.62rem;
      color: var(--text-dim);
    }

    .active-badge {
      font-size: 0.6rem;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      background: #10b981;
      color: #ffffff;
      flex-shrink: 0;
    }

    .switch-arrow {
      font-size: 0.65rem;
      color: var(--gold);
      font-weight: 600;
      flex-shrink: 0;
    }

    .switch-code-box {
      display: flex;
      gap: 5px;
      margin-top: 6px;
    }

    .switch-code-input {
      flex: 1;
      font-family: var(--font-mono, monospace);
      font-size: 0.72rem;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-main, #0b0e14);
      color: var(--text-main);
    }

    .switch-code-input:focus {
      border-color: var(--gold);
      outline: none;
    }

    .inline-create-space {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed var(--border-subtle);
    }

    .pending-auth-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 8px;
      border-radius: var(--radius-md);
      background: rgba(245, 158, 11, 0.06);
      border: 1px dashed rgba(245, 158, 11, 0.35);
      margin-bottom: 4px;
    }

    .pending-auth-left {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
      flex: 1;
    }

    .pending-auth-meta {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .pending-auth-email {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pending-status-pill {
      font-size: 0.58rem;
      font-weight: 700;
      color: #f59e0b;
      letter-spacing: 0.3px;
    }

    /* Accessed Members Section */
    .accessed-header {
      display: flex;
      flex-direction: column;
      margin-bottom: 6px;
      padding-top: 4px;
    }

    .accessed-title {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--text-main);
    }

    .accessed-subtitle {
      font-size: 0.65rem;
      color: var(--text-dim);
    }

    .agent-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 220px;
      overflow-y: auto;
    }

    .agent-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      text-align: left;
      width: 100%;
      transition: background 0.12s;
    }

    .agent-item:hover {
      background: var(--bg-surface);
    }

    .agent-item.active {
      background: rgba(203, 168, 107, 0.12);
      border-color: rgba(203, 168, 107, 0.35);
    }

    .avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.74rem;
      flex-shrink: 0;
    }

    .avatar-sm-img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .active-dot {
      color: #10b981;
      font-size: 0.75rem;
      margin-left: auto;
    }

    .empty-accessed-note {
      font-size: 0.7rem;
      color: var(--text-dim);
      padding: 8px 4px;
      text-align: center;
      line-height: 1.4;
    }

    .agent-info {
      flex: 1;
      overflow: hidden;
    }

    .agent-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .agent-name-text {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .agent-meta-text {
      font-size: 0.67rem;
      color: var(--text-dim);
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-google {
      background: rgba(66, 133, 244, 0.15);
      color: #3b82f6;
    }

    .badge-passcode {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .badge-invite {
      background: rgba(99, 102, 241, 0.15);
      color: #6366f1;
    }

    .badge-guest {
      background: rgba(100, 116, 139, 0.15);
      color: #64748b;
    }

    .dropdown-footer {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    .btn-text-mobile {
      display: none;
    }

    .btn-text-desktop {
      display: inline;
    }

    /* Mobile Responsiveness for Top Navbar */
    @media (max-width: 768px) {
      .navbar-container {
        padding: 0 10px;
        gap: 6px;
        height: 52px;
      }

      .brand-text,
      .brand-title,
      .brand-subtitle,
      .city-pill,
      .nav-divider-v,
      .nav-btn-secondary,
      .nav-btn-buyer,
      .passcode-tag {
        display: none !important;
      }

      .btn-text-desktop {
        display: none !important;
      }

      .btn-text-mobile {
        display: inline !important;
      }

      .nav-left {
        gap: 6px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .brand {
        gap: 0;
        flex-shrink: 0;
      }

      .brand-gem {
        width: 32px;
        height: 32px;
        border-radius: 8px;
      }

      /* Compact and perfectly proportioned space pills on mobile */
      .space-pill-group {
        padding: 2px 3px;
        gap: 2px;
        flex-shrink: 0;
      }

      .space-pill {
        padding: 2px 5px !important;
        font-size: 0.67rem !important;
        gap: 3px !important;
      }

      .space-pill .space-name {
        display: none !important;
      }

      .space-badge {
        font-size: 0.62rem !important;
        padding: 1px 4px !important;
      }

      .space-pill-group.personal-active .space-pill.personal {
        display: none !important;
      }

      .space-mode-btn {
        padding: 2px 6px !important;
        font-size: 0.67rem !important;
        height: 25px !important;
        line-height: 1 !important;
        white-space: nowrap !important;
      }

      .space-mode-btn.return-btn {
        padding: 2px 8px !important;
        font-size: 0.67rem !important;
        height: 25px !important;
        border-radius: var(--radius-full) !important;
        white-space: nowrap !important;
        gap: 3px !important;
        display: inline-flex !important;
        align-items: center !important;
        width: auto !important;
        min-width: unset !important;
        box-shadow: 0 2px 6px rgba(203, 168, 107, 0.3) !important;
      }

      .nav-right {
        gap: 5px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .nav-right .btn-sm span {
        display: none !important;
      }

      .nav-right .btn-sm {
        padding: 0;
        min-width: 32px;
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        flex-shrink: 0;
      }

      .theme-icon-btn,
      .profile-circle-btn {
        width: 32px;
        height: 32px;
      }

      .agent-dropdown {
        position: fixed;
        top: 56px;
        right: 8px;
        left: 8px;
        width: auto;
        max-width: calc(100vw - 16px);
      }
    }

    @media (max-width: 480px) {
      .brand-text,
      .brand-title,
      .brand-subtitle,
      .nav-btn-secondary {
        display: none !important;
      }
      .brand-gem {
        width: 32px;
        height: 32px;
      }
      .nav-right {
        gap: 3px;
      }
      .nav-right .btn-sm,
      .theme-icon-btn,
      .profile-circle-btn {
        min-width: 30px;
        width: 30px;
        height: 30px;
      }
    }
  `]
})
export class NavbarComponent {
  public realtyService = inject(RealtyService);
  public spaceService = inject(SpaceService);
  public authService = inject(AuthService);
  public firebaseService = inject(FirebaseService);

  public openPropertyModal = output<void>();
  public openLeadModal = output<void>();
  public openVisitModal = output<void>();
  public openScannerModal = output<void>();

  public showAgentMenu = signal<boolean>(false);
  public showWorkspaceSwitcher = signal<boolean>(false);
  public targetSpaceCode = '';
  public spaceCodeCopied = signal<boolean>(false);
  public showCreateSpaceInline = signal<boolean>(false);
  public newInlineSpaceName = '';

  public totalTeamCount = computed<number>(() => {
    return this.spaceService.space().members.length + this.spaceService.authorizedPendingEmails().length;
  });

  public profilePhoto(): string | undefined {
    return this.authService.currentUser()?.photoURL || this.realtyService.activeAgent().photoURL;
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-circle-container')) {
      this.showAgentMenu.set(false);
    }
    if (!target.closest('.workspace-switcher-wrap')) {
      this.showWorkspaceSwitcher.set(false);
    }
  }

  public toggleWorkspaceSwitcher(): void {
    this.showWorkspaceSwitcher.update(v => !v);
  }

  public toggleAgentMenu(): void {
    this.showAgentMenu.update(v => !v);
  }

  public copySpaceCode(): void {
    const code = this.spaceService.space().code || 'SKP-CHN-4829';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        this.spaceCodeCopied.set(true);
        setTimeout(() => this.spaceCodeCopied.set(false), 2000);
        this.realtyService.notify('Space code copied: ' + code, 'success');
      }).catch(() => {
        this.realtyService.notify('Space code: ' + code, 'info');
      });
    } else {
      this.realtyService.notify('Space code: ' + code, 'info');
    }
  }

  public async switchSpace(code: string): Promise<void> {
    const clean = (code || '').trim().toUpperCase();
    if (!clean) return;
    const ok = await this.spaceService.switchSpace(clean);
    if (ok) {
      this.realtyService.notify(`Switched to space ${clean}`, 'success');
      this.showAgentMenu.set(false);
    } else {
      this.realtyService.notify(`Failed to switch to space ${clean}`, 'error');
    }
  }

  public async handleSwitchByCode(): Promise<void> {
    const clean = (this.targetSpaceCode || '').trim().toUpperCase();
    if (!clean) return;
    await this.switchSpace(clean);
    this.targetSpaceCode = '';
  }

  public createSpaceFromProfile(): void {
    const cleanName = (this.newInlineSpaceName || '').trim();
    if (!cleanName) return;
    const newSpace = this.spaceService.createNewSpace(cleanName);
    this.realtyService.notify(`Created space "${newSpace.name}" (${newSpace.code})`, 'success');
    this.newInlineSpaceName = '';
    this.showCreateSpaceInline.set(false);
    this.showAgentMenu.set(false);
  }

  public async signInWithGoogle(): Promise<void> {
    const ok = await this.spaceService.loginWithGoogle();
    if (ok) {
      this.realtyService.notify('Signed in with Google successfully!', 'success');
      this.showAgentMenu.set(false);
    } else {
      const err = this.authService.authError();
      if (err) {
        this.realtyService.notify(err, 'error');
      }
    }
  }

  public async signOutGoogle(): Promise<void> {
    await this.authService.logout();
    this.realtyService.notify('Signed out successfully.', 'info');
    this.showAgentMenu.set(false);
  }

  public lockAndSwitch(): void {
    this.spaceService.lockSpace();
    this.showAgentMenu.set(false);
  }

  public goToSettings(): void {
    this.realtyService.activeView.set('settings');
    this.showAgentMenu.set(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  public openSpaceSettings(): void {
    this.goToSettings();
  }

  public formatJoinedVia(via: string): string {
    switch (via) {
      case 'creator': return 'Creator & Owner';
      case 'email_invite': return 'Authorized Email';
      case 'approved_request': return 'Owner Approved';
      default: return via || 'Google';
    }
  }

  public copyInviteLink(): void {
    const link = this.spaceService.getInviteLink();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        this.realtyService.notify('Space invite link copied to clipboard!', 'success');
      }).catch(() => {
        this.realtyService.notify(`Invite link: ${link}`, 'info');
      });
    } else {
      this.realtyService.notify(`Invite link: ${link}`, 'info');
    }
  }

  public formatAccessTime(timestamp?: number): string {
    if (!timestamp) return 'Recently';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
