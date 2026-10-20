import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from './components/navbar/navbar';
import { PropertyModalComponent } from './components/property-modal/property-modal';
import { LeadModalComponent } from './components/lead-modal/lead-modal';
import { VisitModalComponent } from './components/visit-modal/visit-modal';
import { SpaceGateModalComponent } from './components/space-gate-modal/space-gate-modal';
import { SpaceSettingsModalComponent } from './components/space-settings-modal/space-settings-modal';
import { FollowUpEmailModalComponent } from './components/followup-email-modal/followup-email-modal';
import { SettingsComponent } from './components/settings/settings';
import { RealtyService } from './services/realty.service';
import { SpaceService } from './services/space.service';
import { 
  PropertyListing, 
  LeadCRM, 
  SiteVisit, 
  ChennaiLocality, 
  LeadStage
} from './models/realty.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    PropertyModalComponent,
    LeadModalComponent,
    VisitModalComponent,
    SpaceGateModalComponent,
    SpaceSettingsModalComponent,
    FollowUpEmailModalComponent,
    SettingsComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public realtyService = inject(RealtyService);
  public spaceService = inject(SpaceService);
  public Math = Math;

  // Modals & Drawers
  public showPropertyModal = signal<boolean>(false);
  public showLeadModal = signal<boolean>(false);
  public showVisitModal = signal<boolean>(false);
  public showClassifiedScannerModal = signal<boolean>(false);
  public showFollowUpEmailModal = signal<boolean>(false);
  public activeEmailLead = signal<LeadCRM | null>(null);
  public editingProperty = signal<PropertyListing | null>(null);
  public editingLead = signal<LeadCRM | null>(null);
  public propertyModalInitialTab = signal<'contact' | 'pricing' | 'layout' | 'infra' | 'photos' | 'legal'>('contact');
  
  // Matching Engine Drawer
  public activeMatchingLead = signal<LeadCRM | null>(null);

  // Property Filters
  public selectedLocality = signal<ChennaiLocality | 'All'>('All');
  public selectedPropertyType = signal<string>('All');
  public selectedTransaction = signal<string>('All');
  public selectedBhk = signal<number | string | 'All'>('All');
  public propertySearchQuery = signal<string>('');
  public propertyViewMode = signal<'grid' | 'table'>('grid');

  // Lead Filters
  public leadSearchQuery = signal<string>('');
  public selectedLeadStage = signal<LeadStage | 'All'>('All');
  public leadViewMode = signal<'kanban' | 'table'>('kanban');
  public filterOnlyDueFollowUps = signal<boolean>(false);

  public isAnyModalOpen = computed<boolean>(() => {
    return this.showPropertyModal() ||
      this.showLeadModal() ||
      this.showVisitModal() ||
      this.showFollowUpEmailModal() ||
      this.spaceService.showSpaceSettingsModal();
  });

  public clearLeadSearch(): void {
    this.leadSearchQuery.set('');
  }

  public clearPropertySearch(): void {
    this.propertySearchQuery.set('');
  }

  public dueFollowUpsCount = computed<number>(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return this.realtyService.leads().filter(l => l.nextFollowUpDate && l.nextFollowUpDate <= endOfToday.getTime()).length;
  });

  // Connections (Compatibility) Filters
  public selectedMatchBuyerId = signal<string>('All');
  public selectedMatchPropertyId = signal<string>('All');
  public selectedMatchThreshold = signal<number>(0);

  get localities() {
    return this.realtyService.localities();
  }
  public leadStages: LeadStage[] = [
    'New', 
    'Contacted',
    'Qualified', 
    'Site Visit Scheduled', 
    'In Negotiation', 
    'Closed Won', 
    'Closed Lost'
  ];

  // Filtered Properties Computation
  public filteredProperties = computed(() => {
    let list = this.realtyService.properties();

    // Locality
    const loc = this.selectedLocality();
    if (loc !== 'All') {
      list = list.filter(p => p.locality === loc);
    }

    // Type
    const type = this.selectedPropertyType();
    if (type !== 'All') {
      list = list.filter(p => p.propertyType === type);
    }

    // Transaction
    const trans = this.selectedTransaction();
    if (trans !== 'All') {
      list = list.filter(p => p.transactionType === trans);
    }

    // BHK
    const bhk = this.selectedBhk();
    if (bhk !== 'All') {
      list = list.filter(p => String(p.bhk) === String(bhk));
    }

    // Search query
    const q = this.propertySearchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.locality.toLowerCase().includes(q) ||
        p.subLocation.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q) ||
        (p.waterSource || '').toLowerCase().includes(q) ||
        (p.approvalStatus || '').toLowerCase().includes(q) ||
        p.amenities.some(a => a.toLowerCase().includes(q))
      );
    }

    return list;
  });

  // Filtered Leads Computation
  public filteredLeads = computed(() => {
    let list = this.realtyService.leads();

    const stage = this.selectedLeadStage();
    if (stage !== 'All') {
      list = list.filter(l => l.stage === stage);
    }

    if (this.filterOnlyDueFollowUps()) {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      list = list.filter(l => l.nextFollowUpDate && l.nextFollowUpDate <= endOfToday.getTime());
    }

    const q = this.leadSearchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.preferredLocalities.some(loc => loc.toLowerCase().includes(q)) ||
        l.notes.toLowerCase().includes(q)
      );
    }

    return list;
  });

  // Filtered Compatibility Matches
  public filteredCompatibilityMatches = computed(() => {
    let list = this.realtyService.allCompatibilityMatches();
    const buyerId = this.selectedMatchBuyerId();
    const propertyId = this.selectedMatchPropertyId();
    const minThreshold = this.selectedMatchThreshold();

    if (buyerId !== 'All') {
      list = list.filter(m => m.buyer.id === buyerId);
    }
    if (propertyId !== 'All') {
      list = list.filter(m => m.property.id === propertyId);
    }
    if (minThreshold > 0) {
      list = list.filter(m => m.score >= minThreshold);
    }

    return list;
  });

  // Matched Properties for Active Lead Drawer
  public matchedPropertiesForActiveLead = computed(() => {
    const lead = this.activeMatchingLead();
    if (!lead) return [];
    return this.realtyService.properties()
      .map(p => ({ property: p, match: this.realtyService.calculateCompatibilityScore(lead, p) }))
      .filter(item => item.match.score >= 50)
      .sort((a, b) => b.match.score - a.match.score);
  });

  // Navigation View Selection
  public setView(view: 'dashboard' | 'properties' | 'leads' | 'connections' | 'visits' | 'settings'): void {
    this.realtyService.activeView.set(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Property Actions
  public openAddProperty(): void {
    this.editingProperty.set(null);
    this.propertyModalInitialTab.set('contact');
    this.propertySearchQuery.set('');
    this.showPropertyModal.set(true);
  }

  public openEditProperty(p: PropertyListing, initialTab: 'contact' | 'pricing' | 'layout' | 'infra' | 'photos' | 'legal' = 'contact'): void {
    this.editingProperty.set(p);
    this.propertyModalInitialTab.set(initialTab);
    this.showPropertyModal.set(true);
  }

  public openAddPhotos(p: PropertyListing): void {
    this.openEditProperty(p, 'photos');
  }

  public deleteProperty(p: PropertyListing): void {
    if (confirm(`Remove property "${p.title}" from SkyPearl inventory?`)) {
      this.realtyService.deleteProperty(p.id);
    }
  }

  // Lead Actions
  public openAddLead(): void {
    this.editingLead.set(null);
    this.leadSearchQuery.set('');
    this.showLeadModal.set(true);
  }

  public openEditLead(lead: LeadCRM): void {
    this.editingLead.set(lead);
    this.showLeadModal.set(true);
  }

  public deleteLead(lead: LeadCRM): void {
    if (confirm(`Delete client record "${lead.name}"?`)) {
      this.realtyService.deleteLead(lead.id);
    }
  }

  public advanceStage(lead: LeadCRM, nextStage: LeadStage): void {
    this.realtyService.updateLeadStage(lead.id, nextStage);
  }

  public openMatchingDrawer(lead: LeadCRM): void {
    this.activeMatchingLead.set(lead);
  }

  public closeMatchingDrawer(): void {
    this.activeMatchingLead.set(null);
  }

  // Follow-Up Email Actions
  public openFollowUpEmailModal(lead: LeadCRM): void {
    this.activeEmailLead.set(lead);
    this.showFollowUpEmailModal.set(true);
  }

  public closeFollowUpEmailModal(): void {
    this.showFollowUpEmailModal.set(false);
    this.activeEmailLead.set(null);
  }

  public isLeadFollowUpDue(lead: LeadCRM): boolean {
    if (!lead.nextFollowUpDate) return false;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return lead.nextFollowUpDate <= endOfToday.getTime();
  }

  // Site Visit Actions
  public markVisitCompleted(visit: SiteVisit): void {
    this.realtyService.updateVisitStatus(visit.id, 'Completed');
  }

  public getLeadsByStage(stage: LeadStage): LeadCRM[] {
    return this.filteredLeads().filter(l => l.stage === stage);
  }

  public getStageBadgeClass(stage: LeadStage): string {
    switch (stage) {
      case 'New': return 'badge-new';
      case 'Contacted': return 'badge-contacted';
      case 'Qualified': return 'badge-qualified';
      case 'Site Visit Scheduled': return 'badge-scheduled';
      case 'In Negotiation': return 'badge-negotiation';
      case 'Closed Won': return 'badge-won';
      case 'Closed Lost': return 'badge-lost';
      default: return '';
    }
  }

  // Direct Communication Actions
  public openWhatsApp(phone: string, clientName: string, role: 'Buyer' | 'Owner', contextTitle?: string): void {
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    if (clean.length < 10) {
      this.realtyService.notify('Phone number is not valid for WhatsApp.', 'error');
      return;
    }

    const greeting = role === 'Buyer' 
      ? `Vanakkam ${clientName}, this is ${this.realtyService.activeAgent().name} from SkyPearl Realty Chennai. We have verified properties matching your requirements.` 
      : `Vanakkam ${clientName}, this is ${this.realtyService.activeAgent().name} from SkyPearl Realty regarding your listing ${contextTitle || 'in Chennai'}. We have qualified buyers interested.`;

    const url = `https://wa.me/${clean}?text=${encodeURIComponent(greeting)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  public copyToClipboard(text: string, label: string): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.realtyService.notify(`${label} copied to clipboard!`, 'info');
    }).catch(() => {
      this.realtyService.notify(text, 'info');
    });
  }

  public formatINR(num: number): string {
    return num.toLocaleString('en-IN');
  }

  public formatLakhs(lakhs: number): string {
    if (!lakhs) return '₹0';
    if (lakhs >= 100) {
      return `₹${(lakhs / 100).toFixed(2)} Cr`;
    }
    return `₹${lakhs.toLocaleString('en-IN')} L`;
  }

  public getTimeAgo(timestamp?: number): string {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  public viewClassifiedProperty(propId: string): void {
    const prop = this.realtyService.properties().find(p => p.id === propId);
    this.realtyService.activeView.set('properties');
    if (prop) {
      this.propertySearchQuery.set(propId);
      this.openEditProperty(prop);
    }
  }
}
