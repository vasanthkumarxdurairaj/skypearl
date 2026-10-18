import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealtyService, CHENNAI_TEAM_AGENTS } from '../../services/realty.service';
import { AgentProfile } from '../../models/realty.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar-container">
      <div class="nav-left">
        <div class="brand">
          <div class="brand-gem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <div class="brand-text">
            <div class="brand-title">SkyPearl <span class="gold-text">Realty</span></div>
            <div class="brand-subtitle">CHENNAI PROPERTY INTELLIGENCE</div>
          </div>
        </div>

        <!-- Locality / City Pill -->
        <div class="city-pill">
          <span class="city-dot"></span>
          <span class="city-name">Chennai Corridor</span>
          <span class="city-badge">38 Localities</span>
        </div>

        <!-- Cloud Database Status Pill -->
        <div class="cloud-pill" [class.cloud-connected]="realtyService.firebaseService.isConnected() && !realtyService.firebaseService.isDemoMode()">
          <span class="cloud-dot"></span>
          @if (realtyService.firebaseService.isConnected() && !realtyService.firebaseService.isDemoMode()) {
            <span class="cloud-text">Cloud DB: {{ realtyService.firebaseService.projectId() }}</span>
          } @else {
            <span class="cloud-text">Offline Local DB</span>
          }
        </div>
      </div>

      <div class="nav-right">
        <!-- Theme Toggle Button -->
        <button class="theme-toggle-btn" (click)="realtyService.toggleTheme()" [title]="realtyService.currentTheme() === 'light' ? 'Switch to Dark Mode' : 'Switch to White Theme'">
          @if (realtyService.currentTheme() === 'light') {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span>Dark Theme</span>
          } @else {
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
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
            <span>White Theme</span>
          }
        </button>

        <!-- Quick Action Buttons -->
        <button class="btn btn-secondary btn-sm" (click)="openVisitModal.emit()" title="Schedule Site Visit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>Site Visit</span>
        </button>

        <button class="btn btn-gold btn-sm" (click)="openLeadModal.emit()" title="Add Lead to CRM">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="22" y1="11" x2="16" y2="11"></line>
          </svg>
          <span>Add Buyer</span>
        </button>

        <button class="btn btn-primary btn-sm" (click)="openPropertyModal.emit()" title="List Property in Chennai">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add Property</span>
        </button>

        <!-- Agent Role Persona Switcher -->
        <div class="agent-menu-container">
          <button class="agent-pill" (click)="toggleAgentMenu()">
            <div class="avatar" [style.background]="realtyService.activeAgent().avatarColor">
              {{ realtyService.activeAgent().name.charAt(0) }}
            </div>
            <div class="agent-details">
              <span class="agent-name">{{ realtyService.activeAgent().name }}</span>
              <span class="agent-role-tag" [ngClass]="'role-' + realtyService.activeAgent().role">
                {{ realtyService.activeAgent().role | uppercase }}
              </span>
            </div>
            <svg class="chevron" [class.open]="showAgentMenu()" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          @if (showAgentMenu()) {
            <div class="agent-dropdown glass-panel">
              <div class="dropdown-header">
                <span class="dropdown-title">Switch Employee Account</span>
                <span class="dropdown-desc">Simulate permissions for Principal Admin, Sales Manager & Agent</span>
              </div>

              <div class="agent-list">
                @for (agent of teamAgents; track agent.uid) {
                  <button 
                    class="agent-item" 
                    [class.active]="realtyService.activeAgent().uid === agent.uid"
                    (click)="selectAgent(agent)">
                    <div class="avatar-sm" [style.background]="agent.avatarColor">
                      {{ agent.name.charAt(0) }}
                    </div>
                    <div class="agent-info">
                      <div class="agent-title-row">
                        <span class="agent-name-text">{{ agent.name }}</span>
                        <span class="badge" [ngClass]="'badge-' + agent.role">{{ agent.role | uppercase }}</span>
                      </div>
                      <div class="agent-meta-text">{{ agent.phone }} • {{ agent.activeListingsCount }} listings</div>
                    </div>
                  </button>
                }
              </div>

              <div class="dropdown-footer">
                <div class="role-hint-box">
                  <strong>Admin:</strong> Full unmasked owner phone numbers & financials.<br>
                  <strong>Agent:</strong> Masked contacts to prevent unauthorized leakage.
                </div>
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
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: linear-gradient(135deg, #f2dfb5, #a98042);
      color: #162131;
      display: grid;
      place-items: center;
      box-shadow: 0 4px 12px rgba(203, 168, 107, 0.35);
      flex-shrink: 0;
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

    .cloud-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full);
      padding: 4px 10px;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-dim);
      transition: all 0.2s ease;
    }

    .cloud-pill.cloud-connected {
      border-color: rgba(16, 185, 129, 0.35);
      background: rgba(16, 185, 129, 0.08);
      color: #10b981;
    }

    .cloud-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .cloud-pill.cloud-connected .cloud-dot {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    /* Theme Toggle Button */
    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 6px 11px;
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .theme-toggle-btn:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
      color: var(--text-main);
      transform: translateY(-1px);
    }

    .agent-menu-container {
      position: relative;
    }

    .agent-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 4px 10px 4px 5px;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all 0.15s ease;
      color: var(--text-main);
    }

    .agent-pill:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-hover);
    }

    .avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 0.76rem;
    }

    .agent-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.2;
    }

    .agent-name {
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .agent-role-tag {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }

    .role-admin { color: #f59e0b; }
    .role-manager { color: #0284c7; }
    .role-agent { color: #16a34a; }

    .chevron {
      color: var(--text-dim);
      transition: transform 0.2s;
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    /* Agent Dropdown */
    .agent-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 310px;
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
      margin-bottom: 8px;
    }

    .dropdown-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-main);
      display: block;
    }

    .dropdown-desc {
      font-size: 0.68rem;
      color: var(--text-dim);
    }

    .agent-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
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
      font-size: 0.68rem;
      color: var(--text-dim);
      margin-top: 1px;
    }

    .dropdown-footer {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
    }

    .role-hint-box {
      font-size: 0.66rem;
      color: var(--text-dim);
      background: var(--bg-surface);
      padding: 6px 8px;
      border-radius: var(--radius-sm);
      line-height: 1.4;
    }
  `]
})
export class NavbarComponent {
  public realtyService = inject(RealtyService);

  public openPropertyModal = output<void>();
  public openLeadModal = output<void>();
  public openVisitModal = output<void>();

  public showAgentMenu = signal<boolean>(false);
  public teamAgents = CHENNAI_TEAM_AGENTS;

  public toggleAgentMenu(): void {
    this.showAgentMenu.update(v => !v);
  }

  public selectAgent(agent: AgentProfile): void {
    this.realtyService.switchAgent(agent);
    this.showAgentMenu.set(false);
  }
}
