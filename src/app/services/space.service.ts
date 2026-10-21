import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { doc, setDoc, onSnapshot, getDoc, deleteDoc, collection } from 'firebase/firestore';
import { sanitizeForFirestore } from '../utils/firestore-sanitizer';

export interface SpaceMember {
  id: string; // Google UID
  name: string; // Google displayName
  email: string; // Google email
  photoURL?: string;
  role: 'owner' | 'admin' | 'agent';
  status: 'active' | 'pending';
  joinedAt: number;
  lastActiveAt?: number;
  joinedVia: 'creator' | 'email_invite' | 'approved_request';
  invitedBy?: string;
}

export interface SpaceInvite {
  id: string; // ${spaceCode}_${cleanEmail}
  spaceCode: string;
  spaceName: string;
  email: string;
  role: 'admin' | 'agent';
  ownerName?: string;
  ownerEmail?: string;
  invitedByUid?: string;
  invitedByName?: string;
  invitedByEmail?: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  invitedAt: number;
  acceptedAt?: number;
}

export interface AccessRequest {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  requestedAt: number;
}

export interface AgencySpace {
  id: string;
  name: string;
  code: string; // Auto-generated Space Code (e.g. SKP-CHN-4829)
  ownerUid?: string;
  ownerEmail?: string;
  ownerName?: string;
  allowedEmails: string[];
  inviteCodes?: string[];
  members: SpaceMember[];
  pendingRequests: AccessRequest[];
}

export interface SpaceSummary {
  code: string;
  name: string;
  role: 'owner' | 'admin' | 'agent';
  ownerEmail?: string;
  ownerName?: string;
  memberCount?: number;
}

export const COMMON_AGENCY_SPACE_CODE = 'SKP-CHN-4829';
export const COMMON_AGENCY_SPACE_NAME = 'SkyPearl Realty Space (Chennai Central)';

export function generateAutoSpaceCode(spaceName: string = 'Chennai'): string {
  const letters = (spaceName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'CHN');
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `SKP-${letters}-${digits}`;
}

@Injectable({
  providedIn: 'root'
})
export class SpaceService {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);

  public readonly isUnlocked = signal<boolean>(false);
  public readonly showAccessModal = signal<boolean>(false);
  public readonly showSpaceSettingsModal = signal<boolean>(false);
  public readonly pendingRequestSent = signal<boolean>(false);
  public readonly isSpaceLoading = signal<boolean>(false);

  // Active Workspace Mode: Allows user to manage the space and "go and back" between Agency Space and Personal Workspace
  public readonly activeSpaceMode = signal<'agency' | 'personal'>('agency');
  public readonly hasDismissedInvite = signal<boolean>(false);
  public readonly activeUserInvite = signal<{
    spaceCode: string;
    spaceName: string;
    ownerName?: string;
    ownerEmail?: string;
    status?: string;
    role?: 'admin' | 'agent';
  } | null>(null);

  // User available spaces list for quick switching
  public readonly availableSpaces = signal<SpaceSummary[]>([
    {
      code: COMMON_AGENCY_SPACE_CODE,
      name: COMMON_AGENCY_SPACE_NAME,
      role: 'agent'
    }
  ]);

  private isSyncingFromRemote = false;
  private unsubSpace?: () => void;
  private unsubMembers?: () => void;
  private unsubUserInvite?: () => void;

  public readonly space = signal<AgencySpace>({
    id: 'space-chennai-hq',
    name: COMMON_AGENCY_SPACE_NAME,
    code: COMMON_AGENCY_SPACE_CODE,
    ownerUid: '',
    ownerEmail: '',
    ownerName: '',
    allowedEmails: [],
    members: [],
    pendingRequests: []
  });

  public readonly isOwner = computed<boolean>(() => {
    const user = this.authService.currentUser();
    const currentSpace = this.space();
    if (!user) return false;
    const userEmail = (user.email || '').toLowerCase();
    const ownerEmail = (currentSpace.ownerEmail || '').toLowerCase();

    return (
      (!!ownerEmail && userEmail === ownerEmail) ||
      (!!currentSpace.ownerUid && user.uid === currentSpace.ownerUid) ||
      currentSpace.members.some(
        m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.role === 'owner'
      )
    );
  });

  public readonly verifiedMember = computed<SpaceMember | null>(() => {
    const user = this.authService.currentUser();
    if (!user) return null;
    const currentSpace = this.space();
    const found = currentSpace.members.find(
      m => m.id === user.uid || (!!m.email && !!user.email && m.email.toLowerCase() === user.email.toLowerCase())
    );
    if (found) return found;

    if (this.isOwner()) {
      return {
        id: user.uid,
        name: user.displayName || currentSpace.ownerName || 'Space Owner',
        email: user.email || currentSpace.ownerEmail || 'owner@skypearl.in',
        photoURL: user.photoURL,
        role: 'owner',
        status: 'active',
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
        joinedVia: 'creator'
      };
    }
    return null;
  });

  public readonly currentRole = computed<'owner' | 'admin' | 'agent' | null>(() => {
    if (this.isOwner()) return 'owner';
    const m = this.verifiedMember();
    return m ? m.role : null;
  });

  // Emails pre-authorized by owner that have not yet completed first sign-in
  public readonly authorizedPendingEmails = computed<string[]>(() => {
    const currentSpace = this.space();
    const activeEmails = new Set(
      currentSpace.members
        .filter(m => !!m.email)
        .map(m => m.email.toLowerCase())
    );
    return (currentSpace.allowedEmails || []).filter(
      e => !!e && !activeEmails.has(e.toLowerCase())
    );
  });

  // Space Invitation detection: Checks if the logged-in user has been invited by the Owner to a space
  public readonly pendingInvitation = computed<{
    spaceName: string;
    spaceCode: string;
    ownerName: string;
    ownerEmail: string;
    role?: string;
  } | null>(() => {
    const user = this.authService.currentUser();
    if (!user || !user.email) return null;
    const userEmail = user.email.toLowerCase();
    const currentSpace = this.space();

    // 1. Check real-time cross-device invite from user_invites collection
    const directInvite = this.activeUserInvite();
    if (directInvite && directInvite.spaceCode) {
      const isAlreadyActiveInTarget = currentSpace.code.toUpperCase() === directInvite.spaceCode.toUpperCase() &&
        currentSpace.members.some(m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.status === 'active');
      if (!isAlreadyActiveInTarget) {
        return {
          spaceName: directInvite.spaceName || 'Agency Space',
          spaceCode: directInvite.spaceCode,
          ownerName: directInvite.ownerName || directInvite.ownerEmail || 'Space Owner',
          ownerEmail: directInvite.ownerEmail || '',
          role: directInvite.role || 'agent'
        };
      }
    }

    // 2. Check current active space allowedEmails
    if (this.isOwner()) return null;
    const isAllowed = currentSpace.allowedEmails.some(e => e.toLowerCase() === userEmail);
    if (!isAllowed) return null;

    const isActiveMember = currentSpace.members.some(
      m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.status === 'active'
    );
    if (!isActiveMember) {
      return {
        spaceName: currentSpace.name,
        spaceCode: currentSpace.code || COMMON_AGENCY_SPACE_CODE,
        ownerName: currentSpace.ownerName || currentSpace.ownerEmail || 'Space Owner',
        ownerEmail: currentSpace.ownerEmail || '',
        role: 'agent'
      };
    }
    return null;
  });

  constructor() {
    this.evaluateAccessForUser = this.evaluateAccessForUser.bind(this);
    this.loginWithGoogle = this.loginWithGoogle.bind(this);
    this.acceptSpaceInvitation = this.acceptSpaceInvitation.bind(this);
    this.dismissSpaceInvitation = this.dismissSpaceInvitation.bind(this);
    this.switchToPersonalMode = this.switchToPersonalMode.bind(this);
    this.returnToAgencySpace = this.returnToAgencySpace.bind(this);
    this.switchSpace = this.switchSpace.bind(this);

    this.initSpace();

    // React to Google Authentication changes
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        if (user?.email) {
          this.setupUserInviteListener(user.email);
          this.loadUserSpacesFromFirestore(user.email);
        }
        this.setupFirestoreSpaceSync();
        this.evaluateAccessForUser(user).catch(err => console.warn('evaluateAccess notice:', err));
      });
    });
  }

  private initSpace(): void {
    let initialCode = COMMON_AGENCY_SPACE_CODE;

    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlCode = searchParams.get('code') || searchParams.get('space');
        if (urlCode && urlCode.trim()) {
          initialCode = urlCode.trim().toUpperCase();
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('skypearl_active_space_code', initialCode);
          }
        } else if (typeof localStorage !== 'undefined') {
          const stored = localStorage.getItem('skypearl_active_space_code');
          if (stored && stored.trim()) {
            initialCode = stored.trim().toUpperCase();
          }
        }
      } catch {}
    }

    // Immediately update space code signal so it matches sync code from millisecond 0
    this.space.update(s => ({
      ...s,
      code: initialCode,
      name: initialCode === COMMON_AGENCY_SPACE_CODE ? COMMON_AGENCY_SPACE_NAME : s.name
    }));

    this.loadCachedAvailableSpaces();
    this.setupFirestoreSpaceSync(initialCode);
  }

  private loadCachedAvailableSpaces(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('skypearl_available_spaces');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure common space is always included
          if (!parsed.some(s => s.code?.toUpperCase() === COMMON_AGENCY_SPACE_CODE)) {
            parsed.unshift({
              code: COMMON_AGENCY_SPACE_CODE,
              name: COMMON_AGENCY_SPACE_NAME,
              role: 'agent'
            });
          }
          this.availableSpaces.set(parsed);
          return;
        }
      }
    } catch {}
  }

  public recordSpaceInAvailableList(spaceItem: SpaceSummary): void {
    this.availableSpaces.update(list => {
      const cleanCode = (spaceItem.code || '').trim().toUpperCase();
      if (!cleanCode) return list;

      const filtered = list.filter(s => s.code?.toUpperCase() !== cleanCode);
      const updated = [{ ...spaceItem, code: cleanCode }, ...filtered];

      // Always guarantee Common Agency Space exists in the list
      if (!updated.some(s => s.code?.toUpperCase() === COMMON_AGENCY_SPACE_CODE)) {
        updated.push({
          code: COMMON_AGENCY_SPACE_CODE,
          name: COMMON_AGENCY_SPACE_NAME,
          role: 'agent'
        });
      }

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('skypearl_available_spaces', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  }

  public async recordSpaceInUserRegistry(userEmail: string, spaceItem: SpaceSummary): Promise<void> {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) return;
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      const db = this.firebaseService.firestore;
      const userSpaceRef = doc(db, 'user_spaces', cleanEmail);
      const snap = await getDoc(userSpaceRef);
      let existingSpaces: SpaceSummary[] = [];

      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data['spaces'])) {
          existingSpaces = data['spaces'];
        }
      }

      const cleanCode = spaceItem.code.trim().toUpperCase();
      const filtered = existingSpaces.filter(s => s.code?.toUpperCase() !== cleanCode);
      const merged = [{ ...spaceItem, code: cleanCode }, ...filtered];

      await setDoc(userSpaceRef, {
        email: cleanEmail,
        activeSpaceCode: this.space().code,
        spaces: merged,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err) {
      console.warn('recordSpaceInUserRegistry error:', err);
    }
  }

  public async loadUserSpacesFromFirestore(userEmail: string): Promise<void> {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) return;
    const cleanEmail = (userEmail || '').trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      const db = this.firebaseService.firestore;
      const snap = await getDoc(doc(db, 'user_spaces', cleanEmail));
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data['spaces'])) {
          for (const s of data['spaces']) {
            if (s && s.code) {
              this.recordSpaceInAvailableList(s);
            }
          }
        }
      }
    } catch (err) {
      console.warn('loadUserSpacesFromFirestore error:', err);
    }
  }

  public setupFirestoreSpaceSync(targetCode?: string): void {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) return;
    try {
      if (this.unsubSpace) {
        this.unsubSpace();
        this.unsubSpace = undefined;
      }
      if (this.unsubMembers) {
        this.unsubMembers();
        this.unsubMembers = undefined;
      }
      const db = this.firebaseService.firestore;

      // 1. Resolve active space code: explicit targetCode > in-memory space code > URL parameter > localStorage > COMMON_AGENCY_SPACE_CODE
      let codeToSync = (targetCode || '').trim().toUpperCase();
      if (!codeToSync && this.space().code) {
        codeToSync = this.space().code.trim().toUpperCase();
      }
      if (!codeToSync && typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const urlCode = searchParams.get('code') || searchParams.get('space');
        if (urlCode) codeToSync = urlCode.trim().toUpperCase();
      }
      if (!codeToSync && typeof localStorage !== 'undefined') {
        const storedCode = localStorage.getItem('skypearl_active_space_code');
        if (storedCode) codeToSync = storedCode.trim().toUpperCase();
      }
      if (!codeToSync) {
        codeToSync = COMMON_AGENCY_SPACE_CODE;
      }

      this.isSpaceLoading.set(true);
      const spaceDocRef = doc(db, 'spaces', codeToSync);

      this.unsubSpace = onSnapshot(spaceDocRef, snap => {
        this.isSpaceLoading.set(false);
        if (snap.exists()) {
          const remoteData = snap.data() as AgencySpace;
          if (remoteData) {
            this.applyRemoteSpace(remoteData, codeToSync);
          }
        } else {
          // If document does not exist yet in Firestore:
          // Keep common space code persistent and seed it so it exists for all team members
          const user = this.authService.currentUser();
          const userEmail = (user?.email || '').toLowerCase();
          const isCommon = codeToSync === COMMON_AGENCY_SPACE_CODE;

          const seededMember: SpaceMember | null = user ? {
            id: user.uid,
            name: user.displayName || userEmail.split('@')[0] || 'Space Owner',
            email: user.email || '',
            photoURL: user.photoURL,
            role: 'owner',
            status: 'active',
            joinedAt: Date.now(),
            lastActiveAt: Date.now(),
            joinedVia: 'creator'
          } : null;

          const seededSpace: AgencySpace = {
            id: isCommon ? 'space-chennai-hq' : 'space-' + Date.now().toString(36),
            name: isCommon ? COMMON_AGENCY_SPACE_NAME : (this.space().name || 'Agency Space'),
            code: codeToSync,
            ownerUid: user?.uid || '',
            ownerEmail: user?.email || '',
            ownerName: user?.displayName || (userEmail ? userEmail.split('@')[0] : 'Space Owner'),
            allowedEmails: user?.email ? [userEmail] : [],
            members: seededMember ? [seededMember] : [],
            pendingRequests: []
          };

          this.space.set(seededSpace);
          this.saveSpace();

          // Authoritatively store initial creator in member subcollection
          if (user && seededMember) {
            setDoc(doc(db, 'spaces', codeToSync, 'members', user.uid), sanitizeForFirestore(seededMember), { merge: true }).catch(() => {});
          }
        }
      }, (err) => {
        this.isSpaceLoading.set(false);
        console.warn('Firestore space sync notice:', err);
      });

      // 2. Authoritatively synchronize subcollection: /spaces/{codeToSync}/members
      try {
        const membersColRef = collection(db, 'spaces', codeToSync, 'members');
        this.unsubMembers = onSnapshot(membersColRef, snap => {
          if (!snap.empty) {
            const subMembers: SpaceMember[] = [];
            snap.forEach(docSnap => {
              const m = docSnap.data() as SpaceMember;
              if (m && (m.id || docSnap.id)) {
                subMembers.push({
                  ...m,
                  id: m.id || docSnap.id
                });
              }
            });
            if (subMembers.length > 0) {
              this.space.update(s => {
                const mergedMap = new Map<string, SpaceMember>();
                for (const existing of s.members) {
                  mergedMap.set(existing.id, existing);
                }
                for (const sub of subMembers) {
                  mergedMap.set(sub.id, sub);
                }
                return {
                  ...s,
                  members: Array.from(mergedMap.values())
                };
              });
            }
          }
        }, err => {
          console.warn('Member subcollection listener notice:', err);
        });
      } catch (err) {
        console.warn('Member subcollection setup notice:', err);
      }
    } catch (e) {
      this.isSpaceLoading.set(false);
      console.warn('Firestore space sync error:', e);
    }
  }

  private applyRemoteSpace(remoteData: AgencySpace, activeCode: string): void {
    this.isSyncingFromRemote = true;
    try {
      const currentCode = (remoteData.code || activeCode || this.space().code || COMMON_AGENCY_SPACE_CODE).toUpperCase();
      this.space.update(curr => ({
        ...curr,
        id: remoteData.id || curr.id,
        name: remoteData.name || curr.name,
        code: currentCode,
        ownerUid: remoteData.ownerUid || curr.ownerUid,
        ownerEmail: remoteData.ownerEmail || curr.ownerEmail,
        ownerName: remoteData.ownerName || curr.ownerName,
        allowedEmails: Array.isArray(remoteData.allowedEmails) ? remoteData.allowedEmails : curr.allowedEmails,
        members: Array.isArray(remoteData.members) ? remoteData.members : curr.members,
        pendingRequests: Array.isArray(remoteData.pendingRequests) ? remoteData.pendingRequests : curr.pendingRequests
      }));

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skypearl_active_space_code', currentCode);
      }

      this.recordSpaceInAvailableList({
        code: currentCode,
        name: remoteData.name || this.space().name,
        role: this.currentRole() || 'agent',
        ownerEmail: remoteData.ownerEmail,
        memberCount: (remoteData.members || []).length
      });

      this.evaluateAccessForUser(this.authService.currentUser(), false).catch(() => {});
    } finally {
      this.isSyncingFromRemote = false;
    }
  }

  public setupUserInviteListener(email: string): void {
    if (this.unsubUserInvite) {
      this.unsubUserInvite();
      this.unsubUserInvite = undefined;
    }
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !this.firebaseService.firestore || this.firebaseService.isDemoMode()) {
      this.activeUserInvite.set(null);
      return;
    }
    try {
      const db = this.firebaseService.firestore;
      this.unsubUserInvite = onSnapshot(doc(db, 'user_invites', cleanEmail), snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data['spaceCode']) {
            this.activeUserInvite.set({
              spaceCode: data['spaceCode'],
              spaceName: data['spaceName'] || 'Agency Space',
              ownerName: data['ownerName'],
              ownerEmail: data['ownerEmail'],
              status: data['status'] || 'pending'
            });
            this.hasDismissedInvite.set(false);
            return;
          }
        }
        this.activeUserInvite.set(null);
      }, err => {
        console.warn('user_invites snapshot notice:', err);
      });
    } catch (e) {
      console.warn('setupUserInviteListener error:', e);
    }
  }

  public async checkForUserInvitations(userEmail: string): Promise<{ spaceCode: string; spaceName: string; ownerName?: string; ownerEmail?: string; status?: string } | null> {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) return null;
    try {
      const db = this.firebaseService.firestore;
      const cleanEmail = (userEmail || '').trim().toLowerCase();
      if (!cleanEmail) return null;
      const inviteSnap = await getDoc(doc(db, 'user_invites', cleanEmail));
      if (inviteSnap.exists()) {
        const data = inviteSnap.data();
        if (data && data['spaceCode']) {
          return {
            spaceCode: data['spaceCode'],
            spaceName: data['spaceName'] || 'Agency Space',
            ownerName: data['ownerName'],
            ownerEmail: data['ownerEmail'],
            status: data['status'] || 'pending'
          };
        }
      }
    } catch (err) {
      console.warn('Check user invites notice:', err);
    }
    return null;
  }

  public async loadSpaceByCode(code: string): Promise<boolean> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return false;

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skypearl_active_space_code', cleanCode);
    }
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('code', cleanCode);
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const snap = await getDoc(doc(db, 'spaces', cleanCode));
        if (snap.exists()) {
          const remoteData = snap.data() as AgencySpace;
          if (remoteData) {
            this.applyRemoteSpace(remoteData, cleanCode);
            this.setupFirestoreSpaceSync(cleanCode);
            return true;
          }
        }
      } catch (err) {
        console.warn('Error loading space by code:', err);
      }
    }

    this.space.update(s => ({ ...s, code: cleanCode }));
    this.setupFirestoreSpaceSync(cleanCode);
    return true;
  }

  public async evaluateAccessForUser(user: any, allowRemoteWrite = true): Promise<void> {
    if (!user) {
      // No Google login = Gate is presented
      if (this.isUnlocked()) this.isUnlocked.set(false);
      if (!this.showAccessModal()) this.showAccessModal.set(true);
      return;
    }

    const userEmail = (user.email || '').toLowerCase();

    // 1. Check if user opened a specific space code in URL
    let urlCode: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        urlCode = searchParams.get('code') || searchParams.get('space');
        if (urlCode) urlCode = urlCode.trim().toUpperCase();
      } catch {}
    }

    // 2. Load user's known spaces from user_spaces
    await this.loadUserSpacesFromFirestore(userEmail);

    // 3. Check if owner directly authorized this user by Gmail via user_invites
    const inviteInfo = await this.checkForUserInvitations(userEmail);
    if (inviteInfo && inviteInfo.spaceCode) {
      this.recordSpaceInAvailableList({
        code: inviteInfo.spaceCode,
        name: inviteInfo.spaceName || 'Agency Space',
        role: 'agent',
        ownerEmail: inviteInfo.ownerEmail
      });

      // If user came without explicit URL code, auto-route to invited space
      if (!urlCode && this.space().code.toUpperCase() !== inviteInfo.spaceCode.toUpperCase()) {
        await this.loadSpaceByCode(inviteInfo.spaceCode);
      }
    }

    const currentSpace = this.space();

    // 4. Is this user the Space Owner / Creator of the currently loaded space?
    if (
      (currentSpace.ownerEmail && currentSpace.ownerEmail.toLowerCase() === userEmail) ||
      (currentSpace.ownerUid && currentSpace.ownerUid === user.uid) ||
      currentSpace.members.some(m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.role === 'owner')
    ) {
      const isAlreadyRegisteredOwner = currentSpace.members.some(
        m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.role === 'owner'
      );
      if (!isAlreadyRegisteredOwner && allowRemoteWrite && !this.isSyncingFromRemote) {
        this.registerOrUpdateMember({
          id: user.uid,
          name: user.displayName || currentSpace.ownerName || userEmail.split('@')[0] || 'Space Owner',
          email: user.email,
          photoURL: user.photoURL,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          joinedVia: 'creator'
        });
      }

      this.recordSpaceInAvailableList({
        code: currentSpace.code,
        name: currentSpace.name,
        role: 'owner',
        ownerEmail: user.email
      });

      if (user.email) {
        this.recordSpaceInUserRegistry(user.email, {
          code: currentSpace.code,
          name: currentSpace.name,
          role: 'owner',
          ownerEmail: user.email
        });
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skypearl_user_space_' + user.uid, currentSpace.code);
        localStorage.setItem('skypearl_active_space_code', currentSpace.code);
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 5. Special handling for Common Agency Space (SKP-CHN-4829) with unassigned owner:
    // First user to claim or manage the common space becomes Owner
    if (currentSpace.code === COMMON_AGENCY_SPACE_CODE && !currentSpace.ownerEmail && !currentSpace.ownerUid) {
      if (allowRemoteWrite && !this.isSyncingFromRemote) {
        this.space.update(curr => ({
          ...curr,
          ownerUid: user.uid,
          ownerEmail: user.email || '',
          ownerName: user.displayName || userEmail.split('@')[0] || 'Space Owner',
          allowedEmails: curr.allowedEmails.includes(userEmail) ? curr.allowedEmails : [...curr.allowedEmails, userEmail]
        }));
        this.registerOrUpdateMember({
          id: user.uid,
          name: user.displayName || userEmail.split('@')[0] || 'Space Owner',
          email: user.email,
          photoURL: user.photoURL,
          role: 'owner',
          status: 'active',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          joinedVia: 'creator'
        });
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skypearl_user_space_' + user.uid, currentSpace.code);
        localStorage.setItem('skypearl_active_space_code', currentSpace.code);
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 6. Is user already an active member in this space's directory?
    const existingMember = currentSpace.members.find(
      m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.status === 'active'
    );
    if (existingMember) {
      if (allowRemoteWrite && !this.isSyncingFromRemote) {
        this.updateMemberLastActive(user.uid);
      }
      this.recordSpaceInAvailableList({
        code: currentSpace.code,
        name: currentSpace.name,
        role: existingMember.role,
        ownerEmail: currentSpace.ownerEmail
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skypearl_user_space_' + user.uid, currentSpace.code);
        localStorage.setItem('skypearl_active_space_code', currentSpace.code);
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 7. Was this Google email directly pre-authorized or invited by the Owner?
    // Owner authorized by email = immediate access, no approval required!
    const isPreAuthorizedByOwner = currentSpace.allowedEmails.some(e => e.toLowerCase() === userEmail) || (inviteInfo?.spaceCode === currentSpace.code);

    if (isPreAuthorizedByOwner) {
      // Auto-activate member so they join seamlessly
      this.acceptSpaceInvitation();
      return;
    }

    // 8. If this is the Common Agency Space, allow 1-click team join
    if (currentSpace.code === COMMON_AGENCY_SPACE_CODE) {
      this.joinAsTeamAgent('agent');
      return;
    }

    // 9. Visiting a private custom space where user is not yet authorized:
    // Present access modal for approval or code entry
    if (this.isUnlocked()) this.isUnlocked.set(false);
    if (!this.showAccessModal()) this.showAccessModal.set(true);
  }

  // 1-Click Join Agency Workspace for Team Members
  public joinAsTeamAgent(preferredRole: 'agent' | 'admin' = 'agent'): void {
    const user = this.authService.currentUser();
    if (!user) return;
    const userEmail = (user.email || '').toLowerCase();
    const isOwnerAccount = this.isOwner();
    const role: 'owner' | 'admin' | 'agent' = isOwnerAccount ? 'owner' : preferredRole;

    const newMember: SpaceMember = {
      id: user.uid,
      name: user.displayName || userEmail.split('@')[0] || 'Team Agent',
      email: user.email || '',
      photoURL: user.photoURL,
      role,
      status: 'active',
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      joinedVia: isOwnerAccount ? 'creator' : 'email_invite'
    };

    this.registerOrUpdateMember(newMember);

    this.recordSpaceInAvailableList({
      code: this.space().code,
      name: this.space().name,
      role,
      ownerEmail: this.space().ownerEmail
    });

    if (user.email) {
      this.recordSpaceInUserRegistry(user.email, {
        code: this.space().code,
        name: this.space().name,
        role,
        ownerEmail: this.space().ownerEmail
      });
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skypearl_user_space_' + user.uid, this.space().code);
      localStorage.setItem('skypearl_active_space_code', this.space().code);
    }
    this.isUnlocked.set(true);
    this.showAccessModal.set(false);
  }

  // Accept Space Invitation - Pre-Authorized by Owner (NO APPROVAL NEEDED)
  public async acceptSpaceInvitation(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;
    const userEmail = (user.email || '').toLowerCase();
    const invite = this.pendingInvitation() || this.activeUserInvite();

    // If invitation is for another space, switch to that space first
    const targetCode = (invite?.spaceCode || this.space().code || COMMON_AGENCY_SPACE_CODE).toUpperCase();
    if (targetCode !== this.space().code.toUpperCase()) {
      await this.loadSpaceByCode(targetCode);
    }

    const currentSpace = this.space();

    const newMember: SpaceMember = {
      id: user.uid,
      name: user.displayName || userEmail.split('@')[0],
      email: user.email || '',
      photoURL: user.photoURL,
      role: 'agent',
      status: 'active', // Active immediately, NO owner approval needed!
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      joinedVia: 'email_invite',
      invitedBy: invite?.ownerName || invite?.ownerEmail || currentSpace.ownerName || currentSpace.ownerEmail
    };

    this.space.update(s => ({
      ...s,
      members: [
        newMember,
        ...s.members.filter(m => m.id !== user.uid && m.email?.toLowerCase() !== userEmail)
      ],
      pendingRequests: s.pendingRequests.filter(r => r.uid !== user.uid && r.email?.toLowerCase() !== userEmail),
      allowedEmails: s.allowedEmails.some(e => e.toLowerCase() === userEmail) ? s.allowedEmails : [...s.allowedEmails, userEmail]
    }));

    this.saveSpace();

    // Mark invitation as accepted in Firestore (Both space_invites and legacy user_invites)
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const inviteId = `${currentSpace.code}_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

        // 1. Update space_invites unique record
        setDoc(doc(db, 'space_invites', inviteId), {
          status: 'accepted',
          acceptedAt: Date.now(),
          acceptedByUid: user.uid,
          acceptedByEmail: userEmail
        }, { merge: true }).catch(() => {});

        // 2. Update legacy user_invites
        setDoc(doc(db, 'user_invites', userEmail), {
          status: 'accepted',
          acceptedAt: Date.now(),
          spaceCode: currentSpace.code,
          spaceName: currentSpace.name
        }, { merge: true }).catch(() => {});

        // 3. Authoritative write to /spaces/{spaceCode}/members/{uid}
        setDoc(doc(db, 'spaces', currentSpace.code, 'members', user.uid), sanitizeForFirestore(newMember), { merge: true }).catch(() => {});

        this.recordSpaceInUserRegistry(userEmail, {
          code: currentSpace.code,
          name: currentSpace.name,
          role: 'agent',
          ownerEmail: currentSpace.ownerEmail
        });
      } catch {}
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skypearl_active_space_code', currentSpace.code);
      localStorage.setItem('skypearl_user_space_' + user.uid, currentSpace.code);
    }

    this.recordSpaceInAvailableList({
      code: currentSpace.code,
      name: currentSpace.name,
      role: 'agent',
      ownerEmail: currentSpace.ownerEmail
    });

    this.hasDismissedInvite.set(false);
    this.activeSpaceMode.set('agency');
    this.isUnlocked.set(true);
    this.showAccessModal.set(false);
  }

  // Dismiss Invitation Bar
  public dismissSpaceInvitation(): void {
    this.hasDismissedInvite.set(true);
  }

  // Workspace Switcher: Switch to personal view
  public switchToPersonalMode(): void {
    this.activeSpaceMode.set('personal');
    this.isUnlocked.set(true);
    this.showAccessModal.set(false);
  }

  // Workspace Switcher: Return to agency space
  public returnToAgencySpace(): void {
    this.activeSpaceMode.set('agency');
    this.evaluateAccessForUser(this.authService.currentUser(), false);
  }

  // Switch to any space cleanly by space code
  public async switchSpace(code: string): Promise<boolean> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return false;

    this.activeSpaceMode.set('agency');
    const ok = await this.loadSpaceByCode(cleanCode);
    if (ok) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skypearl_active_space_code', cleanCode);
      }
      const user = this.authService.currentUser();
      if (user?.email && this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
        try {
          const db = this.firebaseService.firestore;
          setDoc(doc(db, 'user_spaces', user.email.toLowerCase()), {
            activeSpaceCode: cleanCode,
            updatedAt: Date.now()
          }, { merge: true }).catch(() => {});
        } catch {}
      }
    }
    return ok;
  }

  // Create Brand New Agency Space (Explicit User Action Only)
  public createNewSpace(spaceName: string): AgencySpace {
    const user = this.authService.currentUser();
    const cleanName = (spaceName || '').trim() || 'SkyPearl Agency Space';
    const newCode = generateAutoSpaceCode(cleanName);
    const userEmail = (user?.email || '').toLowerCase();
    const userName = user?.displayName || userEmail.split('@')[0] || 'Space Owner';

    const ownerMember: SpaceMember = {
      id: user?.uid || 'owner-' + Date.now().toString(36),
      name: userName,
      email: user?.email || '',
      photoURL: user?.photoURL,
      role: 'owner',
      status: 'active',
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      joinedVia: 'creator'
    };

    const newSpace: AgencySpace = {
      id: 'space-' + Date.now().toString(36),
      name: cleanName,
      code: newCode,
      ownerUid: user?.uid || '',
      ownerEmail: user?.email || '',
      ownerName: userName,
      allowedEmails: user?.email ? [userEmail] : [],
      members: [ownerMember],
      pendingRequests: []
    };

    this.space.set(newSpace);
    this.saveSpace();

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skypearl_active_space_code', newCode);
      if (user?.uid) {
        localStorage.setItem('skypearl_user_space_' + user.uid, newCode);
      }
    }
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('code', newCode);
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }

    this.recordSpaceInAvailableList({
      code: newCode,
      name: cleanName,
      role: 'owner',
      ownerEmail: user?.email || ''
    });

    if (userEmail) {
      this.recordSpaceInUserRegistry(userEmail, {
        code: newCode,
        name: cleanName,
        role: 'owner',
        ownerEmail: user?.email || ''
      });
    }

    this.activeSpaceMode.set('agency');
    this.isUnlocked.set(true);
    this.showAccessModal.set(false);
    this.setupFirestoreSpaceSync(newCode);

    return newSpace;
  }

  // Join Space by Space Code (checks Firestore spaces/{cleanCode} and in-memory space)
  public async joinSpaceByCode(code: string): Promise<boolean> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return false;

    // 1. Persist active space code to localStorage & browser URL
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skypearl_active_space_code', cleanCode);
    }
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('code', cleanCode);
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }

    // 2. Check if code matches currently loaded space
    if (this.space().code && this.space().code.toUpperCase() === cleanCode) {
      this.joinAsTeamAgent('agent');
      return true;
    }

    // 3. Attempt to load space from Firestore 'spaces' collection
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const snap = await getDoc(doc(db, 'spaces', cleanCode));
        if (snap.exists()) {
          const remoteData = snap.data() as AgencySpace;
          if (remoteData) {
            this.applyRemoteSpace(remoteData, cleanCode);
            this.setupFirestoreSpaceSync(cleanCode);
            this.joinAsTeamAgent('agent');
            return true;
          }
        }
      } catch (err) {
        console.warn('Error joining space by code:', err);
      }
    }

    // 4. Fallback: Initialize with code and sync
    this.space.update(s => ({ ...s, code: cleanCode }));
    this.setupFirestoreSpaceSync(cleanCode);
    this.joinAsTeamAgent('agent');
    return true;
  }

  public async loginWithGoogle(): Promise<boolean> {
    const success = await this.authService.loginWithGoogle();
    if (success) {
      this.evaluateAccessForUser(this.authService.currentUser());
      return true;
    }
    return false;
  }

  public async loginAndUnlockWithGoogle(): Promise<boolean> {
    return this.loginWithGoogle();
  }

  public async loginWithGoogleRedirect(): Promise<void> {
    await this.authService.loginWithGoogleRedirect();
  }

  public requestAccessFromOwner(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const newReq: AccessRequest = {
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Agent Requester',
      email: user.email || '',
      photoURL: user.photoURL,
      requestedAt: Date.now()
    };

    this.space.update(s => ({
      ...s,
      pendingRequests: [
        newReq,
        ...s.pendingRequests.filter(r => r.uid !== user.uid && r.email.toLowerCase() !== (user.email || '').toLowerCase())
      ]
    }));
    this.saveSpace();
    this.pendingRequestSent.set(true);
  }

  public approveAccessRequest(req: AccessRequest, role: 'admin' | 'agent' = 'agent'): void {
    if (!this.isOwner()) return;

    const newMember: SpaceMember = {
      id: req.uid,
      name: req.name,
      email: req.email,
      photoURL: req.photoURL,
      role,
      status: 'active',
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      joinedVia: 'approved_request',
      invitedBy: this.space().ownerName || this.space().ownerEmail
    };

    this.space.update(s => ({
      ...s,
      members: [newMember, ...s.members.filter(m => m.id !== req.uid && m.email.toLowerCase() !== req.email.toLowerCase())],
      pendingRequests: s.pendingRequests.filter(r => r.uid !== req.uid && r.email.toLowerCase() !== req.email.toLowerCase()),
      allowedEmails: s.allowedEmails.includes(req.email.toLowerCase()) ? s.allowedEmails : [...s.allowedEmails, req.email.toLowerCase()]
    }));
    this.saveSpace();
  }

  public declineAccessRequest(reqUid: string): void {
    if (!this.isOwner()) return;
    this.space.update(s => ({
      ...s,
      pendingRequests: s.pendingRequests.filter(r => r.uid !== reqUid)
    }));
    this.saveSpace();
  }

  public grantEmailAccess(email: string, role: 'admin' | 'agent' = 'agent'): boolean {
    if (!this.isOwner()) return false;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return false;

    this.space.update(s => {
      const alreadyInList = s.allowedEmails.some(e => e.toLowerCase() === cleanEmail);
      const updatedAllowed = alreadyInList ? s.allowedEmails : [...s.allowedEmails, cleanEmail];
      return {
        ...s,
        allowedEmails: updatedAllowed
      };
    });
    this.saveSpace();

    // Register in Firestore:
    // 1. Unique /space_invites/{spaceCode_email}
    // 2. Backward-compatible /user_invites/{cleanEmail}
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const currentSpace = this.space();
        const user = this.authService.currentUser();
        const inviteId = `${currentSpace.code}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

        const invitePayload: SpaceInvite = {
          id: inviteId,
          spaceCode: currentSpace.code,
          spaceName: currentSpace.name,
          email: cleanEmail,
          role,
          ownerName: currentSpace.ownerName,
          ownerEmail: currentSpace.ownerEmail,
          invitedByUid: user?.uid,
          invitedByName: user?.displayName || currentSpace.ownerName || 'Space Owner',
          invitedByEmail: user?.email || currentSpace.ownerEmail || '',
          status: 'pending',
          invitedAt: Date.now()
        };

        // 1. Authoritative write to space_invites
        setDoc(doc(db, 'space_invites', inviteId), sanitizeForFirestore(invitePayload), { merge: true })
          .catch(err => console.warn('Could not set space_invites:', err));

        // 2. Backward-compatible write to user_invites
        setDoc(doc(db, 'user_invites', cleanEmail), {
          spaceCode: currentSpace.code,
          spaceName: currentSpace.name,
          ownerEmail: currentSpace.ownerEmail,
          ownerName: currentSpace.ownerName,
          invitedAt: Date.now(),
          status: 'pending',
          role
        }, { merge: true }).catch(err => console.warn('Could not set user_invites:', err));

        this.recordSpaceInUserRegistry(cleanEmail, {
          code: currentSpace.code,
          name: currentSpace.name,
          role,
          ownerEmail: currentSpace.ownerEmail
        });
      } catch (err) {
        console.warn('Could not index user invite:', err);
      }
    }

    return true;
  }

  public revokeEmailAccess(email: string): void {
    if (!this.isOwner()) return;
    const cleanEmail = email.trim().toLowerCase();
    this.space.update(s => ({
      ...s,
      allowedEmails: s.allowedEmails.filter(e => e.toLowerCase() !== cleanEmail),
      members: s.members.filter(m => m.email.toLowerCase() !== cleanEmail || m.role === 'owner')
    }));
    this.saveSpace();

    // Remove user_invites and space_invites entry from Firestore
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const currentSpace = this.space();
        deleteDoc(doc(db, 'user_invites', cleanEmail)).catch(() => {});
        const inviteId = `${currentSpace.code}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        deleteDoc(doc(db, 'space_invites', inviteId)).catch(() => {});
      } catch {}
    }
  }

  public revokeMemberAccess(memberId: string): { success: boolean; message?: string } {
    if (!this.isOwner()) {
      return { success: false, message: 'Only workspace owners can revoke access.' };
    }
    const currentSpace = this.space();
    const target = currentSpace.members.find(m => m.id === memberId);
    if (!target) {
      return { success: false, message: 'Member not found.' };
    }

    // Safeguard: Never allow revoking the last owner
    if (target.role === 'owner') {
      const ownerCount = currentSpace.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return { success: false, message: 'Cannot revoke the last owner of this workspace.' };
      }
    }

    this.space.update(s => {
      const filteredMembers = s.members.filter(m => m.id !== memberId || m.role === 'owner');
      const filteredEmails = target ? s.allowedEmails.filter(e => e.toLowerCase() !== target.email.toLowerCase()) : s.allowedEmails;
      return {
        ...s,
        members: filteredMembers,
        allowedEmails: filteredEmails
      };
    });
    this.saveSpace();

    // Delete from Firestore subcollection and invitation index
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const spaceCode = (currentSpace.code || COMMON_AGENCY_SPACE_CODE).toUpperCase();
        deleteDoc(doc(db, 'spaces', spaceCode, 'members', memberId)).catch(() => {});
        if (target.email) {
          const cleanEmail = target.email.toLowerCase();
          deleteDoc(doc(db, 'user_invites', cleanEmail)).catch(() => {});
          const inviteId = `${spaceCode}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
          deleteDoc(doc(db, 'space_invites', inviteId)).catch(() => {});
        }
      } catch {}
    }

    return { success: true };
  }

  public updateMemberRole(memberId: string, role: 'admin' | 'agent'): { success: boolean; message?: string } {
    if (!this.isOwner()) {
      return { success: false, message: 'Only workspace owners can modify roles.' };
    }
    const currentSpace = this.space();
    const target = currentSpace.members.find(m => m.id === memberId);
    if (!target) {
      return { success: false, message: 'Member not found.' };
    }

    // Safeguard: Never downgrade the last owner
    if (target.role === 'owner') {
      const ownerCount = currentSpace.members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) {
        return { success: false, message: 'Cannot downgrade the last owner of this workspace.' };
      }
    }

    this.space.update(s => ({
      ...s,
      members: s.members.map(m => (m.id === memberId && m.role !== 'owner' ? { ...m, role } : m))
    }));
    this.saveSpace();

    // Update in member subcollection
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const spaceCode = (currentSpace.code || COMMON_AGENCY_SPACE_CODE).toUpperCase();
        setDoc(doc(db, 'spaces', spaceCode, 'members', memberId), { role }, { merge: true }).catch(() => {});
      } catch {}
    }

    return { success: true };
  }

  public updateSpaceName(newName: string): void {
    if (!this.isOwner()) return;
    const clean = (newName || '').trim();
    if (!clean) return;
    this.space.update(s => ({
      ...s,
      name: clean
    }));
    this.saveSpace();

    this.recordSpaceInAvailableList({
      code: this.space().code,
      name: clean,
      role: 'owner',
      ownerEmail: this.space().ownerEmail
    });
  }

  public regenerateSpaceCode(): string {
    if (!this.isOwner()) return this.space().code;
    const newCode = generateAutoSpaceCode(this.space().name);
    this.space.update(s => ({
      ...s,
      code: newCode
    }));
    this.saveSpace();

    this.recordSpaceInAvailableList({
      code: newCode,
      name: this.space().name,
      role: 'owner',
      ownerEmail: this.space().ownerEmail
    });

    return newCode;
  }

  public getInviteLink(): string {
    const code = this.space().code || COMMON_AGENCY_SPACE_CODE;
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/?join=true&code=${encodeURIComponent(code)}`;
    }
    return `/?join=true&code=${encodeURIComponent(code)}`;
  }

  public getWhatsAppInviteUrl(): string {
    const link = this.getInviteLink();
    const text = `Vanakkam! Join our SkyPearl Realty team workspace to manage Chennai properties, verified buyer leads, and client site visits:\n${link}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  public lockSpace(): void {
    this.authService.logout();
    this.isUnlocked.set(false);
    this.showAccessModal.set(true);
  }

  private registerOrUpdateMember(member: SpaceMember): void {
    let changed = false;
    this.space.update(s => {
      const existing = s.members.find(m => m.id === member.id || m.email?.toLowerCase() === member.email?.toLowerCase());
      if (existing && existing.role === member.role && existing.status === member.status && existing.name === member.name) {
        return s; // No change, avoid re-saving
      }
      changed = true;
      const updatedMember: SpaceMember = {
        ...member,
        lastActiveAt: Date.now(),
        joinedAt: existing ? existing.joinedAt : member.joinedAt
      };
      const updatedList = [
        updatedMember,
        ...s.members.filter(m => m.id !== member.id && m.email?.toLowerCase() !== member.email?.toLowerCase())
      ];
      return { ...s, members: updatedList };
    });
    if (changed) {
      this.saveSpace();

      // Write to authoritative subcollection /spaces/{spaceCode}/members/{member.id}
      if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
        try {
          const db = this.firebaseService.firestore;
          const spaceCode = (this.space().code || COMMON_AGENCY_SPACE_CODE).toUpperCase();
          const target = this.space().members.find(m => m.id === member.id);
          if (target) {
            setDoc(doc(db, 'spaces', spaceCode, 'members', member.id), sanitizeForFirestore(target), { merge: true }).catch(() => {});
          }
        } catch {}
      }
    }
  }

  private updateMemberLastActive(uid: string): void {
    if (this.isSyncingFromRemote) return;
    const target = this.space().members.find(m => m.id === uid);
    // Throttle to at most once per 30 minutes to prevent continuous writes
    if (target && target.lastActiveAt && (Date.now() - target.lastActiveAt < 1800000)) {
      return;
    }
    this.space.update(s => ({
      ...s,
      members: s.members.map(m => (m.id === uid ? { ...m, lastActiveAt: Date.now() } : m))
    }));
    
    // Authoritatively write ONLY to member record in subcollection, preventing root document churn
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const spaceCode = (this.space().code || COMMON_AGENCY_SPACE_CODE).toUpperCase();
        setDoc(doc(db, 'spaces', spaceCode, 'members', uid), {
          lastActiveAt: Date.now()
        }, { merge: true }).catch(() => {});
      } catch {}
    }
  }

  private cleanForFirestore(obj: any): any {
    return sanitizeForFirestore(obj);
  }

  private saveSpace(): void {
    if (this.isSyncingFromRemote) return;
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const cleaned = this.cleanForFirestore(this.space());
        const spaceCode = (this.space().code || COMMON_AGENCY_SPACE_CODE).toUpperCase();

        // Save in dedicated spaces/{spaceCode} collection document
        setDoc(doc(db, 'spaces', spaceCode), cleaned, { merge: true }).catch((err) => {
          console.warn('Firestore space save notice:', err);
        });
      } catch (err) {
        console.warn('Firestore space save exception:', err);
      }
    }
  }
}
