import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { SpaceService } from './space.service';
import {
  PropertyListing,
  LeadCRM,
  SiteVisit,
  AgentProfile,
  ChennaiLocality,
  CHENNAI_LOCALITIES,
  PropertyType,
  TransactionType,
  ListingStatus,
  LeadStage,
  CompatibilityMatch
} from '../models/realty.model';

const STORAGE_KEY_PROPERTIES = 'skypearl_realty_properties_v2';
const STORAGE_KEY_LEADS = 'skypearl_realty_leads_v2';
const STORAGE_KEY_VISITS = 'skypearl_realty_visits_v2';
const STORAGE_KEY_ACTIVE_AGENT = 'skypearl_active_agent';
const STORAGE_KEY_CUSTOM_LOCALITIES = 'skypearl_custom_localities';
const STORAGE_KEY_DELETED_PROPERTIES = 'skypearl_deleted_properties';
const STORAGE_KEY_DELETED_LEADS = 'skypearl_deleted_leads';
const STORAGE_KEY_DELETED_VISITS = 'skypearl_deleted_visits';

export const UNAUTHENTICATED_AGENT_PROFILE: AgentProfile = {
  uid: 'auth-required',
  name: 'Sign In Required',
  email: '',
  phone: '',
  role: 'agent',
  avatarColor: 'linear-gradient(135deg, #475569, #334155)',
  joinedVia: 'google',
  accessedAt: Date.now(),
  activeListingsCount: 0,
  activeLeadsCount: 0,
  closedSalesVolumeLakhs: 0,
  commissionEarnedLakhs: 0
};


@Injectable({
  providedIn: 'root'
})
export class RealtyService {
  public firebaseService = inject(FirebaseService);
  public authService = inject(AuthService);
  public spaceService = inject(SpaceService);

  public readonly localities = signal<string[]>([...CHENNAI_LOCALITIES]);
  public readonly properties = signal<PropertyListing[]>([]);
  public readonly leads = signal<LeadCRM[]>([]);
  public readonly siteVisits = signal<SiteVisit[]>([]);
  public readonly activeAgent = signal<AgentProfile>(UNAUTHENTICATED_AGENT_PROFILE);
  public readonly notification = signal<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active view section in CRM
  public readonly activeView = signal<'dashboard' | 'properties' | 'leads' | 'connections' | 'visits' | 'hindu-classifieds'>('dashboard');

  // Theme Management (White/Light Theme & Dark Theme)
  public readonly currentTheme = signal<'light' | 'dark'>('light');

  public toggleTheme(): void {
    const next = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.currentTheme.set(theme);
    localStorage.setItem('skypearl_theme', theme);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(theme + '-theme');
      document.documentElement.setAttribute('data-theme', theme);
    }
    this.notify(`Switched to ${theme === 'light' ? 'Executive White' : 'Dark'} theme.`, 'info');
  }

  // Computed Permissions
  public readonly isAdmin = computed(() => this.activeAgent().role === 'admin');
  public readonly isManager = computed(() => this.activeAgent().role === 'manager' || this.activeAgent().role === 'admin');
  public readonly canManageTeam = computed(() => this.activeAgent().role === 'admin');
  public readonly canViewOwnerContacts = computed(() => this.activeAgent().role === 'admin' || this.activeAgent().role === 'manager');

  // KPI Metrics
  public readonly totalPropertiesCount = computed(() => this.properties().length);
  public readonly availablePropertiesCount = computed(() => 
    this.properties().filter(p => p.listingStatus === 'Available' || p.listingStatus === 'Active').length
  );
  public readonly totalLeadsCount = computed(() => this.leads().length);
  public readonly activePipelineCount = computed(() => 
    this.leads().filter(l => l.stage !== 'Closed Won' && l.stage !== 'Closed Lost').length
  );
  public readonly dealsWonCount = computed(() => 
    this.leads().filter(l => l.stage === 'Closed Won').length
  );
  public readonly totalPipelineValueLakhs = computed(() => 
    this.leads().reduce((sum, l) => sum + (l.budgetMaxLakhs || 0), 0)
  );
  public readonly totalCommissionEarnedINR = computed(() => 
    this.leads().reduce((sum, l) => sum + (l.collectedCommissionINR || 0), 0)
  );

  // All matches computed
  public readonly allCompatibilityMatches = computed(() => {
    return this.calculateAllMatches();
  });

  public readonly highMatchesCount = computed(() => {
    return this.allCompatibilityMatches().filter(m => m.score >= 60).length;
  });

  constructor() {
    this.initData();
    this.setupFirestoreSync();

    // Dynamically react to Google login or Space unlock changes
    effect(() => {
      const googleUser = this.authService.currentUser();
      const isUnlocked = this.spaceService.isUnlocked();

      untracked(() => {
        if (googleUser && isUnlocked) {
          const verified = this.spaceService.verifiedMember();
          const isOwner = this.spaceService.isOwner();
          const role = isOwner ? 'owner' : (verified?.role || 'agent');

          const curr = this.activeAgent();
          if (curr.uid === googleUser.uid && curr.role === role) {
            return; // Already set, prevent re-renders and re-saving
          }

          const googleAgent: AgentProfile = {
            uid: googleUser.uid,
            name: googleUser.displayName || googleUser.email?.split('@')[0] || 'Team Agent',
            email: googleUser.email || '',
            phone: '',
            role,
            avatarColor: isOwner ? 'linear-gradient(135deg, #d4af37, #b8860b)' : 'linear-gradient(135deg, #4285F4, #34A853)',
            photoURL: googleUser.photoURL,
            joinedVia: isOwner ? 'creator' : 'google',
            accessedAt: Date.now(),
            activeListingsCount: this.properties().filter(p => p.addedBy === (googleUser.displayName || googleUser.email)).length,
            activeLeadsCount: this.leads().filter(l => l.addedBy === (googleUser.displayName || googleUser.email)).length,
            closedSalesVolumeLakhs: 0,
            commissionEarnedLakhs: 0
          };
          this.activeAgent.set(googleAgent);
          localStorage.setItem(STORAGE_KEY_ACTIVE_AGENT, JSON.stringify(googleAgent));
        } else {
          if (this.activeAgent().uid !== UNAUTHENTICATED_AGENT_PROFILE.uid) {
            this.activeAgent.set(UNAUTHENTICATED_AGENT_PROFILE);
          }
        }
      });
    });
  }

  private getDeletedPropertyIds(): Set<string> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELETED_PROPERTIES);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  }

  private addDeletedPropertyId(id: string): void {
    const set = this.getDeletedPropertyIds();
    set.add(id);
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_PROPERTIES, JSON.stringify(Array.from(set)));
    } catch {}
  }

  private getDeletedLeadIds(): Set<string> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELETED_LEADS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  }

  private addDeletedLeadId(id: string): void {
    const set = this.getDeletedLeadIds();
    set.add(id);
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_LEADS, JSON.stringify(Array.from(set)));
    } catch {}
  }

  private getDeletedVisitIds(): Set<string> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELETED_VISITS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  }

  private addDeletedVisitId(id: string): void {
    const set = this.getDeletedVisitIds();
    set.add(id);
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_VISITS, JSON.stringify(Array.from(set)));
    } catch {}
  }

  private initData(): void {
    const savedTheme = (localStorage.getItem('skypearl_theme') as 'light' | 'dark') || 'light';
    this.currentTheme.set(savedTheme);
    if (typeof document !== 'undefined') {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(savedTheme + '-theme');
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const savedProps = localStorage.getItem(STORAGE_KEY_PROPERTIES);
    const savedLeads = localStorage.getItem(STORAGE_KEY_LEADS);
    const savedVisits = localStorage.getItem(STORAGE_KEY_VISITS);
    const savedAgent = localStorage.getItem(STORAGE_KEY_ACTIVE_AGENT);

    if (savedAgent) {
      try {
        const parsed = JSON.parse(savedAgent);
        if (parsed?.uid && parsed?.name && parsed.uid !== 'auth-required') {
          this.activeAgent.set(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_AGENT);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_AGENT);
      }
    }

    const deletedProps = this.getDeletedPropertyIds();
    try {
      const parsedProps = savedProps ? JSON.parse(savedProps) : [];
      this.properties.set(
        Array.isArray(parsedProps)
          ? parsedProps.filter((p: any) => p?.id && !this.isLegacyMockId(p.id) && !deletedProps.has(p.id))
          : []
      );
    } catch {
      this.properties.set([]);
    }

    const deletedLeads = this.getDeletedLeadIds();
    try {
      const parsedLeads = savedLeads ? JSON.parse(savedLeads) : [];
      this.leads.set(
        Array.isArray(parsedLeads)
          ? parsedLeads.filter((l: any) => l?.id && !this.isLegacyMockId(l.id) && !deletedLeads.has(l.id))
          : []
      );
    } catch {
      this.leads.set([]);
    }

    const deletedVisits = this.getDeletedVisitIds();
    try {
      const parsedVisits = savedVisits ? JSON.parse(savedVisits) : [];
      this.siteVisits.set(
        Array.isArray(parsedVisits)
          ? parsedVisits.filter((v: any) => v?.id && !this.isLegacyMockId(v.id) && !deletedVisits.has(v.id))
          : []
      );
    } catch {
      this.siteVisits.set([]);
    }

    // Load custom team localities from local storage
    try {
      const savedLocs = localStorage.getItem(STORAGE_KEY_CUSTOM_LOCALITIES);
      if (savedLocs) {
        const parsed = JSON.parse(savedLocs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = Array.from(new Set([...CHENNAI_LOCALITIES, ...parsed])).sort((a, b) => a.localeCompare(b));
          this.localities.set(merged);
        }
      }
    } catch {}

    this.saveData();
  }

  private saveData(): void {
    localStorage.setItem(STORAGE_KEY_PROPERTIES, JSON.stringify(this.properties()));
    localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(this.leads()));
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(this.siteVisits()));
    localStorage.setItem(STORAGE_KEY_ACTIVE_AGENT, JSON.stringify(this.activeAgent()));
  }

  private cleanForFirestore(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (key, value) => (value === undefined ? null : value)));
  }

  private isLegacyMockId(id: string): boolean {
    return id.startsWith('prop-omr-') || id.startsWith('prop-ecr-') || id.startsWith('prop-adyar-') || 
           id.startsWith('prop-annanagar-') || id.startsWith('prop-besant-') || id.startsWith('prop-velachery-') || 
           id.startsWith('prop-porur-') || ['lead-01', 'lead-02', 'lead-03', 'lead-04', 'lead-05', 'visit-01', 'visit-02'].includes(id);
  }

  private setupFirestoreSync(): void {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) return;
    const db = this.firebaseService.firestore;

    // 1. Properties Collection Listener
    try {
      const propCol = collection(db, 'properties');
      onSnapshot(propCol, snapshot => {
        const deletedIds = this.getDeletedPropertyIds();
        const currentLocal = this.properties();

        if (!snapshot.empty) {
          const remoteProps: PropertyListing[] = [];
          const remoteIdSet = new Set<string>();

          snapshot.forEach(docSnap => {
            const data = docSnap.data() as PropertyListing;
            const propId = docSnap.id || data?.id || '';
            if (propId && !this.isLegacyMockId(propId) && !deletedIds.has(propId)) {
              remoteProps.push(data);
              remoteIdSet.add(propId);
            }
          });

          // Merge: remote properties + any local properties that are not in remote and not deleted
          const localOnly = currentLocal.filter(p => p?.id && !remoteIdSet.has(p.id) && !deletedIds.has(p.id));
          const merged = [...remoteProps, ...localOnly];

          this.properties.set(merged);
          try {
            localStorage.setItem(STORAGE_KEY_PROPERTIES, JSON.stringify(merged));
          } catch {}

          // If there are local properties not yet on remote, sync them to Firestore
          if (localOnly.length > 0 && this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
            localOnly.forEach(p => {
              setDoc(doc(db, 'properties', p.id), this.cleanForFirestore(p), { merge: true }).catch(() => {});
            });
          }
        } else {
          // CRITICAL FIX: Remote collection is empty or offline snapshot. NEVER wipe local data!
          // Keep current local properties intact.
          if (currentLocal.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY_PROPERTIES, JSON.stringify(currentLocal));
            } catch {}
            if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
              currentLocal.forEach(p => {
                if (!deletedIds.has(p.id)) {
                  setDoc(doc(db, 'properties', p.id), this.cleanForFirestore(p), { merge: true }).catch(() => {});
                }
              });
            }
          }
        }
      }, err => {
        console.warn('Firestore properties sync notice (operating in resilient local-first mode):', err);
      });
    } catch (e) {
      console.warn('Firestore setup error:', e);
    }

    // 2. Leads Collection Listener
    try {
      const leadCol = collection(db, 'leads');
      onSnapshot(leadCol, snapshot => {
        const deletedIds = this.getDeletedLeadIds();
        const currentLocal = this.leads();

        if (!snapshot.empty) {
          const remoteLeads: LeadCRM[] = [];
          const remoteIdSet = new Set<string>();

          snapshot.forEach(docSnap => {
            const data = docSnap.data() as LeadCRM;
            const leadId = docSnap.id || data?.id || '';
            if (leadId && !this.isLegacyMockId(leadId) && !deletedIds.has(leadId)) {
              remoteLeads.push(data);
              remoteIdSet.add(leadId);
            }
          });

          const localOnly = currentLocal.filter(l => l?.id && !remoteIdSet.has(l.id) && !deletedIds.has(l.id));
          const merged = [...remoteLeads, ...localOnly];

          this.leads.set(merged);
          try {
            localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(merged));
          } catch {}

          if (localOnly.length > 0 && this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
            localOnly.forEach(l => {
              setDoc(doc(db, 'leads', l.id), this.cleanForFirestore(l), { merge: true }).catch(() => {});
            });
          }
        } else {
          // CRITICAL FIX: Remote leads empty or offline. NEVER wipe local leads!
          if (currentLocal.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(currentLocal));
            } catch {}
            if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
              currentLocal.forEach(l => {
                if (!deletedIds.has(l.id)) {
                  setDoc(doc(db, 'leads', l.id), this.cleanForFirestore(l), { merge: true }).catch(() => {});
                }
              });
            }
          }
        }
      }, err => {
        console.warn('Firestore leads sync notice (operating in resilient local-first mode):', err);
      });
    } catch (e) {
      console.warn('Firestore leads setup error:', e);
    }

    // 3. Site Visits Listener
    try {
      const visitCol = collection(db, 'siteVisits');
      onSnapshot(visitCol, snapshot => {
        const deletedIds = this.getDeletedVisitIds();
        const currentLocal = this.siteVisits();

        if (!snapshot.empty) {
          const remoteVisits: SiteVisit[] = [];
          const remoteIdSet = new Set<string>();

          snapshot.forEach(docSnap => {
            const data = docSnap.data() as SiteVisit;
            const visitId = docSnap.id || data?.id || '';
            if (visitId && !this.isLegacyMockId(visitId) && !deletedIds.has(visitId)) {
              remoteVisits.push(data);
              remoteIdSet.add(visitId);
            }
          });

          const localOnly = currentLocal.filter(v => v?.id && !remoteIdSet.has(v.id) && !deletedIds.has(v.id));
          const merged = [...remoteVisits, ...localOnly];

          this.siteVisits.set(merged);
          try {
            localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(merged));
          } catch {}

          if (localOnly.length > 0 && this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
            localOnly.forEach(v => {
              setDoc(doc(db, 'siteVisits', v.id), this.cleanForFirestore(v), { merge: true }).catch(() => {});
            });
          }
        } else {
          // CRITICAL FIX: Remote visits empty or offline. NEVER wipe local visits!
          if (currentLocal.length > 0) {
            try {
              localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(currentLocal));
            } catch {}
            if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
              currentLocal.forEach(v => {
                if (!deletedIds.has(v.id)) {
                  setDoc(doc(db, 'siteVisits', v.id), this.cleanForFirestore(v), { merge: true }).catch(() => {});
                }
              });
            }
          }
        }
      }, err => {
        console.warn('Firestore visits sync notice (operating in resilient local-first mode):', err);
      });
    } catch (e) {
      console.warn('Firestore visits setup error:', e);
    }

    // 4. Team Custom Locations Sync Listener
    try {
      const locDocRef = doc(db, 'settings', 'agencyLocations');
      onSnapshot(locDocRef, snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data['list']) && data['list'].length > 0) {
            const merged = Array.from(new Set([...CHENNAI_LOCALITIES, ...data['list']])).sort((a, b) => a.localeCompare(b));
            this.localities.set(merged);
            localStorage.setItem(STORAGE_KEY_CUSTOM_LOCALITIES, JSON.stringify(data['list']));
          }
        }
      }, err => {
        console.warn('Firestore locations sync notice (operating in resilient local-first mode):', err);
      });
    } catch (e) {
      console.warn('Firestore locations setup error:', e);
    }
  }

  // Add new location and sync to team
  public addLocation(name: string): boolean {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.length < 2) {
      this.notify('Please enter a valid location name.', 'error');
      return false;
    }

    const existing = this.localities().find(l => l.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      this.notify(`"${existing}" is already in the locations list.`, 'info');
      return true;
    }

    const updated = Array.from(new Set([...this.localities(), trimmed])).sort((a, b) => a.localeCompare(b));
    this.localities.set(updated);

    const customOnly = updated.filter(l => !CHENNAI_LOCALITIES.includes(l as any));
    localStorage.setItem(STORAGE_KEY_CUSTOM_LOCALITIES, JSON.stringify(customOnly));

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const db = this.firebaseService.firestore;
      setDoc(doc(db, 'settings', 'agencyLocations'), {
        list: customOnly,
        updatedAt: Date.now(),
        updatedBy: this.activeAgent().name
      }, { merge: true }).catch(err => {
        console.warn('Cloud location sync error:', err);
      });
    }

    this.notify(`Location "${trimmed}" added and shared with team!`, 'success');
    return true;
  }

  // Clear all data (Clean Slate utility)
  public clearAllData(): void {
    if (!confirm('Are you sure you want to completely clear all property listings, leads, and visits to start 100% fresh?')) {
      return;
    }
    this.properties().forEach(p => this.addDeletedPropertyId(p.id));
    this.leads().forEach(l => this.addDeletedLeadId(l.id));
    this.siteVisits().forEach(v => this.addDeletedVisitId(v.id));

    this.properties.set([]);
    this.leads.set([]);
    this.siteVisits.set([]);
    this.saveData();

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const db = this.firebaseService.firestore;
      this.properties().forEach(p => deleteDoc(doc(db, 'properties', p.id)).catch(() => {}));
      this.leads().forEach(l => deleteDoc(doc(db, 'leads', l.id)).catch(() => {}));
      this.siteVisits().forEach(v => deleteDoc(doc(db, 'siteVisits', v.id)).catch(() => {}));
    }
    this.notify('All inventory and leads cleared. Fresh clean slate ready!', 'info');
  }

  // Active agent switcher (Admin, Manager, Agent)
  public switchAgent(agent: AgentProfile): void {
    this.activeAgent.set(agent);
    localStorage.setItem(STORAGE_KEY_ACTIVE_AGENT, JSON.stringify(agent));
    this.notify(`Switched active agent persona to ${agent.name} (${agent.role.toUpperCase()})`, 'info');
  }

  // Duplicate Listing Detection
  public checkDuplicateListing(locality: ChennaiLocality, bhk: number | string, builtUpArea: number, excludeId?: string): { isDuplicate: boolean; matchedProperty?: PropertyListing } {
    const margin = 0.05; // 5% area variance
    const minArea = builtUpArea * (1 - margin);
    const maxArea = builtUpArea * (1 + margin);

    const match = this.properties().find(p => 
      p.id !== excludeId &&
      p.locality === locality &&
      String(p.bhk) === String(bhk) &&
      p.builtUpAreaSqFt >= minArea &&
      p.builtUpAreaSqFt <= maxArea
    );

    return {
      isDuplicate: !!match,
      matchedProperty: match
    };
  }

  // Save / Update Property Listing (Seller data)
  public saveProperty(propertyData: Partial<PropertyListing>): boolean {
    const existingId = propertyData.id;
    const actorName = this.activeAgent().name || 'Agent';
    const actorEmail = this.activeAgent().email || '';
    const now = Date.now();

    if (existingId) {
      this.properties.update(list => 
        list.map(p => p.id === existingId ? {
          ...p,
          ...propertyData,
          updatedBy: actorName,
          updatedByEmail: actorEmail,
          updatedAt: now
        } as PropertyListing : p)
      );
      this.saveData();
      const updated = this.properties().find(p => p.id === existingId);
      if (updated && this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
        setDoc(doc(this.firebaseService.firestore, 'properties', existingId), this.cleanForFirestore(updated), { merge: true }).catch(() => {});
      }
      this.notify('Property listing updated successfully!', 'success');
      return true;
    }

    // Check Duplicate
    const dupCheck = this.checkDuplicateListing(
      propertyData.locality || 'OMR',
      propertyData.bhk || 2,
      propertyData.builtUpAreaSqFt || 1200
    );

    const newProp: PropertyListing = {
      id: 'prop-' + now.toString(36),
      title: propertyData.title || `${propertyData.bhk || 2} BHK ${propertyData.propertyType || 'Apartment'} in ${propertyData.locality || 'Chennai'}`,
      propertyType: propertyData.propertyType || 'Apartment',
      transactionType: propertyData.transactionType || 'Sale',
      locality: propertyData.locality || 'OMR',
      subLocation: propertyData.subLocation || '',
      city: 'Chennai',
      bhk: propertyData.bhk || 2,
      builtUpAreaSqFt: propertyData.builtUpAreaSqFt || 1200,
      carpetAreaSqFt: propertyData.carpetAreaSqFt || Math.round((propertyData.builtUpAreaSqFt || 1200) * 0.78),
      superBuiltUpAreaSqFt: propertyData.superBuiltUpAreaSqFt || propertyData.builtUpAreaSqFt || 1200,
      udsSqFt: propertyData.udsSqFt || Math.round((propertyData.builtUpAreaSqFt || 1200) * 0.35),
      priceLakhs: propertyData.priceLakhs || 90,
      priceType: propertyData.priceType || 'Total price',
      priceInclusions: propertyData.priceInclusions || 'All-in cost confirmed in writing',
      maintenanceMonthlyINR: propertyData.maintenanceMonthlyINR || 3500,
      furnishing: propertyData.furnishing || 'Semi-Furnished',
      facing: propertyData.facing || 'East',
      floorNumber: propertyData.floorNumber || 3,
      totalFloors: propertyData.totalFloors || 10,
      floorPreferenceDetail: propertyData.floorPreferenceDetail || 'Middle floors',
      balconies: propertyData.balconies || '1 balcony',
      bathrooms: propertyData.bathrooms || '2 bathrooms',
      buildingAge: propertyData.buildingAge || '2–5 years',
      carParkingCount: propertyData.carParkingCount || 1,
      parkingType: propertyData.parkingType || 'Covered car parking',
      parkingCountDetail: propertyData.parkingCountDetail || '1 car',
      liftFacility: propertyData.liftFacility || 'Required / available',
      waterSource: propertyData.waterSource || 'Metro + borewell',
      drainage: propertyData.drainage || 'UGD / municipal sewer',
      floodHistory: propertyData.floodHistory || 'No known issue — verify locally',
      powerBackup: propertyData.powerBackup || 'Full backup',
      metroDistanceKm: propertyData.metroDistanceKm || 1.5,
      commutePriority: propertyData.commutePriority || 'Metro access',
      amenities: propertyData.amenities || ['Security', 'Covered Parking', 'Lift', 'Power Backup'],
      verificationStatus: propertyData.verificationStatus || 'Verified',
      approvalStatus: propertyData.approvalStatus || 'CMDA approved',
      approvalAuthority: propertyData.approvalAuthority || 'CMDA',
      reraNumber: propertyData.reraNumber || '',
      occupancyCertificate: propertyData.occupancyCertificate || 'Available',
      pattaStatus: propertyData.pattaStatus || 'Patta available',
      titleChainStatus: propertyData.titleChainStatus || 'Reviewed by lawyer',
      encumbranceCertificate: propertyData.encumbranceCertificate || 'Verified clear',
      propertyTaxStatus: propertyData.propertyTaxStatus || 'Receipts available, no known dues',
      possessionTimeline: propertyData.possessionTimeline || 'Ready to occupy',
      tenancyStatus: propertyData.tenancyStatus || 'Vacant possession',
      loanEligibility: propertyData.loanEligibility || 'Bank loan possible (verify)',
      negotiability: propertyData.negotiability || 'Negotiable',
      brokerageTerms: propertyData.brokerageTerms || '2% agreed',
      siteVisitTiming: propertyData.siteVisitTiming || 'Weekends after 11 AM',
      floodAndRiskNotes: propertyData.floodAndRiskNotes || '',
      notes: propertyData.notes || '',
      listingStatus: propertyData.listingStatus || 'Available',
      ownerName: propertyData.ownerName || '',
      ownerPhone: propertyData.ownerPhone || '',
      ownerAltPhone: propertyData.ownerAltPhone,
      ownerEmail: propertyData.ownerEmail,
      photos: propertyData.photos && propertyData.photos.length > 0 ? propertyData.photos : [],
      assignedAgentId: this.activeAgent().uid,
      assignedAgentName: actorName,
      addedBy: actorName,
      addedByEmail: actorEmail,
      addedAt: now,
      updatedBy: actorName,
      updatedByEmail: actorEmail,
      createdAt: now,
      updatedAt: now,
      isDuplicate: dupCheck.isDuplicate,
      duplicateOfId: dupCheck.matchedProperty?.id,
      viewCount: 1
    };

    if (dupCheck.isDuplicate) {
      this.notify(`Warning: Possible duplicate listing flagged against #${dupCheck.matchedProperty?.id}`, 'info');
    }

    this.properties.update(list => [newProp, ...list]);
    this.saveData();

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      setDoc(doc(this.firebaseService.firestore, 'properties', newProp.id), this.cleanForFirestore(newProp), { merge: true }).catch(() => {});
    }

    this.notify('Property listing added to SkyPearl Inventory!', 'success');
    return true;
  }

  public deleteProperty(id: string): void {
    if (!this.isAdmin() && !this.isManager()) {
      this.notify('Permission Denied. Only Admin or Manager can delete properties.', 'error');
      return;
    }
    this.addDeletedPropertyId(id);
    this.properties.update(list => list.filter(p => p.id !== id));
    this.saveData();

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      deleteDoc(doc(this.firebaseService.firestore, 'properties', id)).catch(() => {});
    }

    this.notify('Property listing deleted from inventory.', 'info');
  }

  // Save / Update Lead (Buyer / Client requirement)
  public saveLead(leadData: Partial<LeadCRM>): boolean {
    const existingId = leadData.id;
    const actorName = this.activeAgent().name || 'Agent';
    const actorEmail = this.activeAgent().email || '';
    const now = Date.now();

    if (existingId) {
      this.leads.update(list =>
        list.map(l => l.id === existingId ? {
          ...l,
          ...leadData,
          updatedBy: actorName,
          updatedByEmail: actorEmail,
          updatedAt: now
        } as LeadCRM : l)
      );
      this.saveData();
      const updated = this.leads().find(l => l.id === existingId);
      if (updated && this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
        setDoc(doc(this.firebaseService.firestore, 'leads', existingId), this.cleanForFirestore(updated), { merge: true }).catch(() => {});
      }
      this.notify('Customer requirement updated.', 'success');
      return true;
    }

    // Auto-calculate expected commission
    const dealVal = leadData.budgetMaxLakhs || 100;
    const isRental = leadData.leadType === 'Tenant';
    const commissionINR = isRental 
      ? Math.round(dealVal * 100000) 
      : Math.round(dealVal * 100000 * 0.02);

    const newLead: LeadCRM = {
      id: 'lead-' + now.toString(36),
      name: leadData.name || 'Client',
      phone: leadData.phone || '',
      altPhone: leadData.altPhone,
      email: leadData.email || '',
      leadType: leadData.leadType || 'Buyer',
      stage: leadData.stage || 'New',
      priority: leadData.priority || 'Medium',
      source: leadData.source || 'Website Form',
      assignedAgentId: this.activeAgent().uid,
      assignedAgentName: actorName,
      addedBy: actorName,
      addedByEmail: actorEmail,
      addedAt: now,
      updatedBy: actorName,
      updatedByEmail: actorEmail,
      createdAt: now,
      updatedAt: now,
      preferredLocalities: leadData.preferredLocalities && leadData.preferredLocalities.length > 0 ? leadData.preferredLocalities : ['OMR'],
      preferredPropertyType: leadData.preferredPropertyType || 'Apartment',
      preferredBhk: leadData.preferredBhk || 2,
      purpose: leadData.purpose || 'Self-use',
      budgetMinLakhs: leadData.budgetMinLakhs || 60,
      budgetMaxLakhs: leadData.budgetMaxLakhs || 120,
      priceType: leadData.priceType || 'Total price',
      preferredFacing: leadData.preferredFacing,
      preferredFloor: leadData.preferredFloor,
      preferredFloorDetail: leadData.preferredFloorDetail,
      minBuiltUpSqFt: leadData.minBuiltUpSqFt,
      minCarpetSqFt: leadData.minCarpetSqFt,
      minUdsSqFt: leadData.minUdsSqFt,
      requiredBalconies: leadData.requiredBalconies,
      requiredBathrooms: leadData.requiredBathrooms,
      preferredAge: leadData.preferredAge,
      liftRequired: leadData.liftRequired,
      parkingRequired: leadData.parkingRequired,
      parkingCountRequired: leadData.parkingCountRequired,
      furnishingPreferred: leadData.furnishingPreferred,
      waterSourcePreference: leadData.waterSourcePreference,
      drainagePreference: leadData.drainagePreference,
      floodPreference: leadData.floodPreference,
      powerBackupPreference: leadData.powerBackupPreference,
      commutePriority: leadData.commutePriority,
      amenitiesPreferred: leadData.amenitiesPreferred || [],
      requiredApproval: leadData.requiredApproval,
      loanReadiness: leadData.loanReadiness,
      timeline: leadData.timeline || '1–3 months',
      fundingReadiness: leadData.fundingReadiness || 'Funds ready',
      decisionMakerConfirmed: leadData.decisionMakerConfirmed || 'Yes',
      notes: leadData.notes || '',
      lastContactDate: now,
      nextFollowUpDate: leadData.nextFollowUpDate || (now + 86400000 * 2),
      matchedPropertyIds: [],
      dealValueLakhs: dealVal,
      expectedCommissionINR: commissionINR
    };

    // Calculate initial matches
    const matches = this.properties()
      .map(p => ({ property: p, score: this.calculateCompatibilityScore(newLead, p).score }))
      .filter(m => m.score >= 50);
    newLead.matchedPropertyIds = matches.map(m => m.property.id);

    this.leads.update(list => [newLead, ...list]);
    this.saveData();

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      setDoc(doc(this.firebaseService.firestore, 'leads', newLead.id), this.cleanForFirestore(newLead), { merge: true }).catch(() => {});
    }

    this.notify('New Client Lead added to SkyPearl CRM pipeline!', 'success');
    return true;
  }

  public deleteLead(id: string): void {
    if (!this.isAdmin() && !this.isManager()) {
      this.notify('Permission Denied. Only Admin or Manager can delete client records.', 'error');
      return;
    }
    this.addDeletedLeadId(id);
    this.leads.update(list => list.filter(l => l.id !== id));
    this.saveData();

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      deleteDoc(doc(this.firebaseService.firestore, 'leads', id)).catch(() => {});
    }

    this.notify('Client record deleted.', 'info');
  }

  public updateLeadStage(leadId: string, stage: LeadStage): void {
    this.leads.update(list =>
      list.map(l => {
        if (l.id === leadId) {
          const isWon = stage === 'Closed Won';
          return {
            ...l,
            stage,
            collectedCommissionINR: isWon ? (l.expectedCommissionINR || 0) : l.collectedCommissionINR,
            lastContactDate: Date.now()
          };
        }
        return l;
      })
    );
    this.saveData();

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const updated = this.leads().find(l => l.id === leadId);
      if (updated) {
        setDoc(doc(this.firebaseService.firestore, 'leads', leadId), this.cleanForFirestore(updated), { merge: true }).catch(() => {});
      }
    }

    this.notify(`Lead stage updated to ${stage}`, 'info');
  }

  // 16-Dimension Weighted Compatibility Engine (Identical to SkyPearl Realty OS Advanced algorithm)
  public calculateCompatibilityScore(buyer: LeadCRM, property: PropertyListing): { score: number; why: string[]; miss: string[] } {
    let score = 0;
    let max = 0;
    const why: string[] = [];
    const miss: string[] = [];

    const add = (label: string, weight: number, ok: boolean, known = true) => {
      if (!known) return;
      max += weight;
      if (ok) {
        score += weight;
        why.push(label);
      } else {
        miss.push(label);
      }
    };

    const same = (x: any, y: any) => !!x && !!y && String(x).toLowerCase().trim() === String(y).toLowerCase().trim();
    const nn = (x: any, y: any) => x != null && y != null && !isNaN(Number(x)) && !isNaN(Number(y));

    // 1. Property type (16 pts)
    const typeKnown = !!buyer.preferredPropertyType && !!property.propertyType;
    add('Property type', 16, same(buyer.preferredPropertyType, property.propertyType), typeKnown);

    // 2. Locality / micro-market (18 pts)
    const buyerLocalities = buyer.preferredLocalities || [];
    const localMatch = buyerLocalities.length === 0 || buyerLocalities.some(loc => 
      same(loc, property.locality) || 
      property.subLocation.toLowerCase().includes(loc.toLowerCase())
    );
    add('Locality / micro-market', 18, localMatch, buyerLocalities.length > 0);

    // 3. Budget (18 pts)
    const propPrice = property.priceLakhs;
    const maxB = buyer.budgetMaxLakhs;
    const minB = buyer.budgetMinLakhs;
    const budgetKnown = maxB != null && propPrice != null;
    const budgetOk = propPrice <= maxB * 1.05 && (!minB || propPrice >= minB * 0.85);
    add('Budget match', 18, budgetOk, budgetKnown);

    // 4. BHK (10 pts)
    const bhkKnown = !!buyer.preferredBhk && !!property.bhk;
    const bhkOk = String(buyer.preferredBhk) === String(property.bhk);
    add('BHK layout', 10, bhkOk, bhkKnown);

    // 5. Facing (5 pts)
    const facingKnown = !!buyer.preferredFacing && !!property.facing && buyer.preferredFacing !== 'No preference / not known';
    add('Facing', 5, same(buyer.preferredFacing, property.facing), facingKnown);

    // 6. Built-up area (7 pts)
    const builtKnown = nn(buyer.minBuiltUpSqFt, property.builtUpAreaSqFt);
    add('Built-up area', 7, property.builtUpAreaSqFt >= (buyer.minBuiltUpSqFt || 0) * 0.9, builtKnown);

    // 7. Carpet area (5 pts)
    const carpetKnown = nn(buyer.minCarpetSqFt, property.carpetAreaSqFt);
    add('Carpet area', 5, (property.carpetAreaSqFt || 0) >= (buyer.minCarpetSqFt || 0) * 0.9, carpetKnown);

    // 8. UDS (4 pts)
    const udsKnown = nn(buyer.minUdsSqFt, property.udsSqFt);
    add('UDS (Land share)', 4, (property.udsSqFt || 0) >= (buyer.minUdsSqFt || 0), udsKnown);

    // 9. Floor preference (4 pts)
    const floorPref = buyer.preferredFloorDetail || buyer.preferredFloor;
    const propFloorPref = property.floorPreferenceDetail || String(property.floorNumber);
    const floorKnown = !!floorPref && !!propFloorPref && floorPref !== 'No preference';
    add('Floor preference', 4, same(floorPref, propFloorPref), floorKnown);

    // 10. Lift (3 pts)
    const liftKnown = !!buyer.liftRequired && !!property.liftFacility && buyer.liftRequired !== 'No preference / not known';
    add('Lift facility', 3, same(buyer.liftRequired, property.liftFacility), liftKnown);

    // 11. Approval status (7 pts)
    const appKnown = !!buyer.requiredApproval && !!property.approvalStatus && buyer.requiredApproval !== 'Not verified';
    add('Approval (CMDA/DTCP/RERA)', 7, same(buyer.requiredApproval, property.approvalStatus), appKnown);

    // 12. Water source (3 pts)
    const waterKnown = !!buyer.waterSourcePreference && !!property.waterSource && buyer.waterSourcePreference !== 'Not specified';
    add('Water source (Metro/Borewell)', 3, same(buyer.waterSourcePreference, property.waterSource), waterKnown);

    // 13. Flood / waterlogging (4 pts)
    const floodKnown = !!buyer.floodPreference && !!property.floodHistory && buyer.floodPreference !== 'Not checked';
    add('Flood safety history', 4, same(buyer.floodPreference, property.floodHistory), floodKnown);

    // 14. Parking (3 pts)
    const parkKnown = !!buyer.parkingRequired && !!property.parkingType && buyer.parkingRequired !== 'No preference / not known';
    add('Car parking', 3, same(buyer.parkingRequired, property.parkingType), parkKnown);

    // 15. Amenities (4 pts)
    const buyerAmen = buyer.amenitiesPreferred || [];
    const propAmen = property.amenities || [];
    const amenKnown = buyerAmen.length > 0 && propAmen.length > 0;
    const matchedAmen = buyerAmen.filter(a => propAmen.includes(a));
    add('Amenities overlap', 4, matchedAmen.length > 0, amenKnown);

    // 16. Commute priority (3 pts)
    const commuteKnown = !!buyer.commutePriority && !!property.commutePriority && buyer.commutePriority !== 'No preference';
    add('Commute priority', 3, same(buyer.commutePriority, property.commutePriority), commuteKnown);

    const calculatedPercent = max > 0 ? Math.round((score / max) * 100) : 0;
    return {
      score: calculatedPercent,
      why,
      miss
    };
  }

  // Calculate all buyer <-> property connection pairs
  public calculateAllMatches(): CompatibilityMatch[] {
    const buyers = this.leads().filter(l => l.stage !== 'Closed Lost' && l.stage !== 'Closed Won');
    const availableProps = this.properties().filter(p => p.listingStatus === 'Available' || p.listingStatus === 'Active' || p.listingStatus === 'Under negotiation');
    const matches: CompatibilityMatch[] = [];

    buyers.forEach(buyer => {
      availableProps.forEach(property => {
        const result = this.calculateCompatibilityScore(buyer, property);
        if (result.score > 0) {
          matches.push({
            buyer,
            property,
            score: result.score,
            why: result.why,
            miss: result.miss
          });
        }
      });
    });

    return matches.sort((a, b) => b.score - a.score);
  }

  // Smart WhatsApp Message Generator
  public generateWhatsAppUrl(phone: string, text: string): string {
    let clean = phone.replace(/[^\d]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  }

  // Schedule Site Visit
  public scheduleVisit(visitData: Partial<SiteVisit>): boolean {
    const newVisit: SiteVisit = {
      id: 'visit-' + Date.now().toString(36),
      propertyId: visitData.propertyId || '',
      propertyTitle: visitData.propertyTitle || 'Property Visit',
      locality: visitData.locality || 'OMR',
      leadId: visitData.leadId || '',
      leadName: visitData.leadName || '',
      leadPhone: visitData.leadPhone || '',
      agentId: this.activeAgent().uid,
      agentName: this.activeAgent().name,
      scheduledTime: visitData.scheduledTime || (Date.now() + 86400000),
      status: 'Scheduled',
      feedbackNotes: visitData.feedbackNotes || '',
      interestLevel: visitData.interestLevel || 'Warm'
    };

    this.siteVisits.update(list => [newVisit, ...list]);
    
    // Automatically advance lead stage
    if (newVisit.leadId) {
      const lead = this.leads().find(l => l.id === newVisit.leadId);
      if (lead && (lead.stage === 'New' || lead.stage === 'Qualified' || lead.stage === 'Contacted')) {
        this.updateLeadStage(newVisit.leadId, 'Site Visit Scheduled');
      }
    }

    this.saveData();

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      setDoc(doc(this.firebaseService.firestore, 'siteVisits', newVisit.id), this.cleanForFirestore(newVisit), { merge: true }).catch(() => {});
    }

    this.notify('Site visit scheduled successfully!', 'success');
    return true;
  }

  // Comprehensive CSV Exports matching SkyPearl Realty OS Advanced
  public exportPropertiesToCSV(): void {
    const headers = [
      'ID', 'Title', 'Type', 'Transaction', 'Locality', 'Landmark', 'BHK', 
      'BuiltUp SqFt', 'Carpet SqFt', 'SuperBuiltUp SqFt', 'UDS SqFt',
      'Price Lakhs INR', 'Price Basis', 'Price Inclusions', 'Maintenance Monthly INR',
      'Facing', 'Floor', 'Total Floors', 'Balconies', 'Bathrooms', 'Building Age',
      'Parking Type', 'Parking Count', 'Lift', 'Water Source', 'Drainage',
      'Flood History', 'Power Backup', 'Metro Dist Km', 'Commute Priority',
      'Approval Status', 'Approval Authority', 'TNRERA No', 'OC Certificate',
      'Patta Status', 'Title Parent Docs', 'EC Status', 'Property Tax',
      'Possession Timeline', 'Tenancy Status', 'Loan Eligibility', 'Negotiability',
      'Brokerage', 'Visit Timing', 'Risk Notes', 'Status', 'Owner Name', 'Owner Phone', 'Assigned Agent'
    ];

    const rows = this.properties().map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.propertyType,
      p.transactionType,
      p.locality,
      `"${(p.subLocation || '').replace(/"/g, '""')}"`,
      p.bhk,
      p.builtUpAreaSqFt,
      p.carpetAreaSqFt || '',
      p.superBuiltUpAreaSqFt || '',
      p.udsSqFt || '',
      p.priceLakhs,
      p.priceType || 'Total price',
      p.priceInclusions || '',
      p.maintenanceMonthlyINR || '',
      p.facing,
      p.floorNumber,
      p.totalFloors,
      p.balconies || '',
      p.bathrooms || '',
      p.buildingAge || '',
      p.parkingType || '',
      p.parkingCountDetail || '',
      p.liftFacility || '',
      p.waterSource || '',
      p.drainage || '',
      p.floodHistory || '',
      p.powerBackup || '',
      p.metroDistanceKm || '',
      p.commutePriority || '',
      p.approvalStatus || '',
      p.approvalAuthority || '',
      p.reraNumber || '',
      p.occupancyCertificate || '',
      p.pattaStatus || '',
      p.titleChainStatus || '',
      p.encumbranceCertificate || '',
      p.propertyTaxStatus || '',
      p.possessionTimeline || '',
      p.tenancyStatus || '',
      p.loanEligibility || '',
      p.negotiability || '',
      p.brokerageTerms || '',
      `"${(p.siteVisitTiming || '').replace(/"/g, '""')}"`,
      `"${(p.floodAndRiskNotes || '').replace(/"/g, '""')}"`,
      p.listingStatus,
      `"${p.ownerName}"`,
      this.canViewOwnerContacts() ? `"${p.ownerPhone}"` : '"[RESTRICTED]"',
      `"${p.assignedAgentName}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadFile(csvContent, `skypearl_seller_inventory_${Date.now()}.csv`, 'text/csv');
    this.notify('Complete property inventory CSV exported successfully!', 'success');
  }

  public exportLeadsToCSV(): void {
    const headers = [
      'ID', 'Client Name', 'Phone', 'Alt Phone', 'Email', 'Type', 'Stage', 'Priority', 'Source',
      'Localities', 'Property Category', 'Preferred BHK', 'Purpose', 'Budget Min Lakhs', 'Budget Max Lakhs',
      'Preferred Facing', 'Min BuiltUp SqFt', 'Min UDS SqFt', 'Balconies', 'Bathrooms', 'Building Age',
      'Lift', 'Parking', 'Water Preference', 'Drainage Preference', 'Flood Preference',
      'Approval Required', 'Timeline', 'Funding Readiness', 'Decision Maker', 'Expected Commission INR', 'Agent'
    ];

    const rows = this.leads().map(l => [
      l.id,
      `"${l.name}"`,
      `"${l.phone}"`,
      `"${l.altPhone || ''}"`,
      `"${l.email}"`,
      l.leadType,
      l.stage,
      l.priority,
      l.source,
      `"${l.preferredLocalities.join('; ')}"`,
      l.preferredPropertyType,
      l.preferredBhk || '',
      l.purpose || '',
      l.budgetMinLakhs,
      l.budgetMaxLakhs,
      l.preferredFacing || '',
      l.minBuiltUpSqFt || '',
      l.minUdsSqFt || '',
      l.requiredBalconies || '',
      l.requiredBathrooms || '',
      l.preferredAge || '',
      l.liftRequired || '',
      l.parkingRequired || '',
      l.waterSourcePreference || '',
      l.drainagePreference || '',
      l.floodPreference || '',
      l.requiredApproval || '',
      l.timeline || '',
      l.fundingReadiness || '',
      l.decisionMakerConfirmed || '',
      l.expectedCommissionINR || 0,
      `"${l.assignedAgentName}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadFile(csvContent, `skypearl_buyers_crm_${Date.now()}.csv`, 'text/csv');
    this.notify('Complete buyers CRM CSV exported successfully!', 'success');
  }

  public exportMatchesToCSV(): void {
    const matches = this.calculateAllMatches();
    const headers = ['Buyer Name', 'Buyer Phone', 'Property Title', 'Property Locality', 'Property Price Lakhs', 'Seller Name', 'Seller Phone', 'Match Score %', 'Matched Criteria', 'Gaps To Verify'];
    const rows = matches.map(m => [
      `"${m.buyer.name}"`,
      `"${m.buyer.phone}"`,
      `"${m.property.title}"`,
      `"${m.property.locality}"`,
      m.property.priceLakhs,
      `"${m.property.ownerName}"`,
      this.canViewOwnerContacts() ? `"${m.property.ownerPhone}"` : '"[RESTRICTED]"',
      m.score,
      `"${m.why.join('; ')}"`,
      `"${m.miss.join('; ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    this.downloadFile(csvContent, `skypearl_compatibility_matches_${Date.now()}.csv`, 'text/csv');
    this.notify('Connections & matches CSV exported successfully!', 'success');
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public notify(message: string, type: 'success' | 'info' | 'error'): void {
    this.notification.set({ message, type });
    setTimeout(() => {
      if (this.notification()?.message === message) {
        this.notification.set(null);
      }
    }, 4500);
  }
}
