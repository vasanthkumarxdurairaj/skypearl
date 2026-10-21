import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { doc, setDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';

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

  // Active Workspace Mode: Allows user to manage the space and "go and back" between Agency Space and Personal Workspace
  public readonly activeSpaceMode = signal<'agency' | 'personal'>('agency');
  public readonly hasDismissedInvite = signal<boolean>(false);
  public readonly activeUserInvite = signal<{
    spaceCode: string;
    spaceName: string;
    ownerName?: string;
    ownerEmail?: string;
  } | null>(null);

  private isSyncingFromRemote = false;
  private unsubSpace?: () => void;
  private unsubUserInvite?: () => void;

  public readonly space = signal<AgencySpace>({
    id: 'space-chennai-hq',
    name: 'SkyPearl Realty Space (Chennai Central)',
    code: 'SKP-CHN-4829',
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
    if (!currentSpace.ownerEmail && !currentSpace.ownerUid) return false;
    const userEmail = (user.email || '').toLowerCase();
    const ownerEmail = (currentSpace.ownerEmail || '').toLowerCase();
    return (
      (!!user.email && userEmail === ownerEmail) ||
      (!!user.uid && user.uid === currentSpace.ownerUid) ||
      currentSpace.members.some(m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.role === 'owner')
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
        name: user.displayName || 'Space Owner',
        email: user.email || 'owner@skypearl.in',
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

  // Space Invitation detection: Checks if the logged-in user has been invited by the Owner to a space
  public readonly pendingInvitation = computed<{
    spaceName: string;
    spaceCode: string;
    ownerName: string;
    ownerEmail: string;
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
          ownerEmail: directInvite.ownerEmail || ''
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
        spaceCode: currentSpace.code || 'SKP-CHN-4829',
        ownerName: currentSpace.ownerName || currentSpace.ownerEmail || 'Space Owner',
        ownerEmail: currentSpace.ownerEmail || ''
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

    this.initSpace();

    // React to Google Authentication changes
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        this.setupUserInviteListener(user?.email || '');
        this.setupFirestoreSpaceSync();
        this.evaluateAccessForUser(user).catch(err => console.warn('evaluateAccess notice:', err));
      });
    });
  }

  private initSpace(): void {
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlCode = searchParams.get('code') || searchParams.get('space');
        if (urlCode) {
          const clean = urlCode.trim().toUpperCase();
          this.space.update(s => ({ ...s, code: clean }));
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('skypearl_active_space_code', clean);
          }
        }
      } catch {}
    }
    this.setupFirestoreSpaceSync();
  }

  public setupFirestoreSpaceSync(targetCode?: string): void {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) return;
    try {
      if (this.unsubSpace) {
        this.unsubSpace();
        this.unsubSpace = undefined;
      }
      const db = this.firebaseService.firestore;

      // 1. Resolve active space code: explicit targetCode > URL parameter > localStorage > in-memory fallback
      let codeToSync = (targetCode || '').trim().toUpperCase();
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
        codeToSync = (this.space().code || 'SKP-CHN-4829').toUpperCase();
      }

      // Check specific space document in 'spaces' collection
      const spaceDocRef = doc(db, 'spaces', codeToSync);

      this.unsubSpace = onSnapshot(spaceDocRef, snap => {
        if (snap.exists()) {
          const remoteData = snap.data() as AgencySpace;
          if (remoteData) {
            this.applyRemoteSpace(remoteData, codeToSync);
          }
        } else {
          // If this space code document does not exist yet in Firestore:
          // Keep the code in memory and seed it when the user logs in / creates it.
          // NEVER fall back to legacy settings/agencySpace to prevent borrowing stale test identities!
          const user = this.authService.currentUser();
          if (user && codeToSync !== 'SKP-CHN-4829') {
            const userEmail = (user.email || '').toLowerCase();
            this.space.update(curr => ({
              ...curr,
              code: codeToSync,
              ownerUid: curr.ownerUid || user.uid,
              ownerEmail: curr.ownerEmail || user.email || '',
              ownerName: curr.ownerName || user.displayName || userEmail.split('@')[0] || 'Space Owner'
            }));
            this.saveSpace();
          }
        }
      }, (err) => {
        console.warn('Firestore space sync notice:', err);
      });
    } catch (e) {
      console.warn('Firestore space sync error:', e);
    }
  }

  private applyRemoteSpace(remoteData: AgencySpace, activeCode: string): void {
    this.isSyncingFromRemote = true;
    try {
      const currentCode = remoteData.code || activeCode || this.space().code || generateAutoSpaceCode(remoteData.name || 'Chennai');
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
              ownerEmail: data['ownerEmail']
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

  public async checkForUserInvitations(userEmail: string): Promise<{ spaceCode: string; spaceName: string; ownerName?: string; ownerEmail?: string } | null> {
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
            ownerEmail: data['ownerEmail']
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

    // 2. Check if an owner directly authorized this user by Gmail
    const inviteInfo = await this.checkForUserInvitations(userEmail);
    if (inviteInfo && inviteInfo.spaceCode && (!urlCode || urlCode === inviteInfo.spaceCode)) {
      if (this.space().code.toUpperCase() !== inviteInfo.spaceCode.toUpperCase()) {
        await this.loadSpaceByCode(inviteInfo.spaceCode);
      }
    }

    const currentSpace = this.space();

    // 3. Is this user already the Space Owner / Creator of the currently loaded space?
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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skypearl_user_space_' + user.uid, currentSpace.code);
        localStorage.setItem('skypearl_active_space_code', currentSpace.code);
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 4. Is user already an active member in this space's directory?
    const existingMember = currentSpace.members.find(
      m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.status === 'active'
    );
    if (existingMember) {
      if (allowRemoteWrite && !this.isSyncingFromRemote) {
        this.updateMemberLastActive(user.uid);
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('skypearl_user_space_' + user.uid, currentSpace.code);
        localStorage.setItem('skypearl_active_space_code', currentSpace.code);
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 5. Was this Google email directly pre-authorized or invited by the Owner?
    // "if the owner add by gmail then no authorization need to be approve because owner only gave access the user show accept the invitation and use that space"
    const isPreAuthorizedByOwner = currentSpace.allowedEmails.some(e => e.toLowerCase() === userEmail) || (inviteInfo?.spaceCode === currentSpace.code);

    if (isPreAuthorizedByOwner) {
      const hasDirectJoinUrl = typeof window !== 'undefined' && 
        (window.location.search.includes('join') || window.location.search.includes('invite'));

      if (hasDirectJoinUrl) {
        // Direct invite link clicked = accept invitation and enter immediately!
        this.acceptSpaceInvitation();
        return;
      }

      // Present the official invitation card to the user so they can click "Accept Invitation & Enter Space"
      // NO OWNER APPROVAL REQUIRED because owner already authorized this Gmail!
      if (this.isUnlocked()) this.isUnlocked.set(false);
      if (!this.showAccessModal()) this.showAccessModal.set(true);
      return;
    }

    // 6. Did the user open a specific space code in URL?
    if (urlCode && urlCode !== currentSpace.code) {
      // User is visiting another space via code
      if (this.isUnlocked()) this.isUnlocked.set(false);
      if (!this.showAccessModal()) this.showAccessModal.set(true);
      return;
    }

    // 7. Check if user already has an existing space saved from previous login
    const savedUserSpace = typeof localStorage !== 'undefined' ? localStorage.getItem('skypearl_user_space_' + user.uid) : null;
    if (savedUserSpace && savedUserSpace !== currentSpace.code) {
      const switched = await this.loadSpaceByCode(savedUserSpace);
      if (switched) return;
    }

    // 8. BRAND NEW USER:
    // "check every new user is initially redirect to the new space only"
    // User is signed in with Google, has no invitation to any space, and is not an owner or member of any space.
    // Automatically create a new space for them as Owner and redirect them to it!
    const userName = user.displayName ? user.displayName.split(' ')[0] : 'My';
    const newSpaceName = `${userName}'s Agency Space`;
    this.createNewSpace(newSpaceName);
  }

  // 1-Click Join Agency Workspace for Non-Tech Team Members
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
    const invite = this.pendingInvitation();

    // If invitation is for another space, switch to that space first
    if (invite && invite.spaceCode && invite.spaceCode.toUpperCase() !== this.space().code.toUpperCase()) {
      await this.loadSpaceByCode(invite.spaceCode);
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
      // Remove from pendingRequests if previously submitted
      pendingRequests: s.pendingRequests.filter(r => r.uid !== user.uid && r.email?.toLowerCase() !== userEmail),
      // Ensure email is in allowedEmails
      allowedEmails: s.allowedEmails.some(e => e.toLowerCase() === userEmail) ? s.allowedEmails : [...s.allowedEmails, userEmail]
    }));

    this.saveSpace();

    // Clean up user_invites entry in Firestore
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        deleteDoc(doc(this.firebaseService.firestore, 'user_invites', userEmail)).catch(() => {});
      } catch {}
    }

    this.activeUserInvite.set(null);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skypearl_active_space_code', currentSpace.code);
      localStorage.setItem('skypearl_user_space_' + user.uid, currentSpace.code);
    }

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

  // Create Brand New Agency Space (Makes caller the Owner)
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

  public grantEmailAccess(email: string, _role: 'admin' | 'agent' = 'agent'): boolean {
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

    // Register cross-device invitation index in Firestore so the invited agent is auto-routed to this space
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const currentSpace = this.space();
        setDoc(doc(db, 'user_invites', cleanEmail), {
          spaceCode: currentSpace.code,
          spaceName: currentSpace.name,
          ownerEmail: currentSpace.ownerEmail,
          ownerName: currentSpace.ownerName,
          invitedAt: Date.now()
        }, { merge: true }).catch(err => console.warn('Could not set user_invites:', err));
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

    // Remove user_invites entry from Firestore
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        deleteDoc(doc(db, 'user_invites', cleanEmail)).catch(() => {});
      } catch {}
    }
  }

  public revokeMemberAccess(memberId: string): void {
    if (!this.isOwner()) return;
    this.space.update(s => {
      const target = s.members.find(m => m.id === memberId);
      const filteredMembers = s.members.filter(m => m.id !== memberId || m.role === 'owner');
      const filteredEmails = target ? s.allowedEmails.filter(e => e.toLowerCase() !== target.email.toLowerCase()) : s.allowedEmails;
      return {
        ...s,
        members: filteredMembers,
        allowedEmails: filteredEmails
      };
    });
    this.saveSpace();
  }

  public updateMemberRole(memberId: string, role: 'admin' | 'agent'): void {
    if (!this.isOwner()) return;
    this.space.update(s => ({
      ...s,
      members: s.members.map(m => (m.id === memberId && m.role !== 'owner' ? { ...m, role } : m))
    }));
    this.saveSpace();
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
  }

  public regenerateSpaceCode(): string {
    if (!this.isOwner()) return this.space().code;
    const newCode = generateAutoSpaceCode(this.space().name);
    this.space.update(s => ({
      ...s,
      code: newCode
    }));
    this.saveSpace();
    return newCode;
  }

  public getInviteLink(): string {
    const code = this.space().code || 'SKP-CHN-4829';
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
      const updatedList = [
        {
          ...member,
          lastActiveAt: Date.now(),
          joinedAt: existing ? existing.joinedAt : member.joinedAt
        },
        ...s.members.filter(m => m.id !== member.id && m.email?.toLowerCase() !== member.email?.toLowerCase())
      ];
      return { ...s, members: updatedList };
    });
    if (changed) {
      this.saveSpace();
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
    this.saveSpace();
  }

  private cleanForFirestore(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (_key, value) => (value === undefined ? null : value)));
  }

  private saveSpace(): void {
    if (this.isSyncingFromRemote) return;
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const db = this.firebaseService.firestore;
        const cleaned = this.cleanForFirestore(this.space());
        const spaceCode = (this.space().code || 'SKP-CHN-4829').toUpperCase();

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
