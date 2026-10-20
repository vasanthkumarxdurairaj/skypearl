import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';

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

  private isSyncingFromRemote = false;
  private unsubSpace?: () => void;

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
    if (!currentSpace.ownerEmail && !currentSpace.ownerUid) return true;
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

  // Space Invitation detection: Checks if the logged-in user has been invited by the Owner to this space
  public readonly pendingInvitation = computed<{
    spaceName: string;
    spaceCode: string;
    ownerName: string;
    ownerEmail: string;
  } | null>(() => {
    const user = this.authService.currentUser();
    if (!user || !user.email) return null;
    const currentSpace = this.space();
    const userEmail = user.email.toLowerCase();

    // Owner cannot invite themselves
    if (this.isOwner()) return null;

    // Check if user's email was added by the owner to allowedEmails
    const isAllowed = currentSpace.allowedEmails.some(e => e.toLowerCase() === userEmail);
    if (!isAllowed) return null;

    // Check if user is already an active member
    const isActiveMember = currentSpace.members.some(
      m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.status === 'active'
    );

    // If invited and not yet an active member:
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
        this.setupFirestoreSpaceSync();
        this.evaluateAccessForUser(user);
      });
    });
  }

  private initSpace(): void {
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
          // Fallback to legacy settings/agencySpace document if spaces/{code} not yet seeded
          const legacyRef = doc(db, 'settings', 'agencySpace');
          getDoc(legacyRef).then(legacySnap => {
            if (legacySnap.exists()) {
              const remoteData = legacySnap.data() as AgencySpace;
              if (remoteData) {
                this.applyRemoteSpace(remoteData, codeToSync);
              }
            } else {
              this.saveSpace();
            }
          }).catch(() => {});
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

      this.evaluateAccessForUser(this.authService.currentUser(), false);
    } finally {
      this.isSyncingFromRemote = false;
    }
  }

  public evaluateAccessForUser(user: any, allowRemoteWrite = true): void {
    if (!user) {
      // No Google login = Gate is presented
      if (this.isUnlocked()) this.isUnlocked.set(false);
      if (!this.showAccessModal()) this.showAccessModal.set(true);
      return;
    }

    const currentSpace = this.space();
    const userEmail = (user.email || '').toLowerCase();

    // 1. First user who logs in when no owner exists becomes Space Creator / Owner
    if (!currentSpace.ownerEmail && !currentSpace.ownerUid) {
      const ownerMember: SpaceMember = {
        id: user.uid,
        name: user.displayName || userEmail.split('@')[0] || 'Space Owner',
        email: user.email,
        photoURL: user.photoURL,
        role: 'owner',
        status: 'active',
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
        joinedVia: 'creator'
      };

      this.space.update(s => ({
        ...s,
        ownerUid: user.uid,
        ownerEmail: user.email,
        ownerName: user.displayName || userEmail.split('@')[0] || 'Space Owner',
        code: s.code || generateAutoSpaceCode(s.name),
        members: [ownerMember, ...s.members.filter(m => m.id !== user.uid && m.email?.toLowerCase() !== userEmail)]
      }));
      if (allowRemoteWrite && !this.isSyncingFromRemote) {
        this.saveSpace();
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 2. Is this user the Space Owner / Creator?
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
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 3. Is user already an approved active member in the directory?
    const existingMember = currentSpace.members.find(
      m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.status === 'active'
    );
    if (existingMember) {
      if (allowRemoteWrite && !this.isSyncingFromRemote) {
        this.updateMemberLastActive(user.uid);
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 4. Was this Google email directly pre-authorized or invited via link / code?
    let hasValidCodeParam = false;
    if (typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const codeInUrl = searchParams.get('code');
        if (codeInUrl && currentSpace.code && codeInUrl.trim().toUpperCase() === currentSpace.code.trim().toUpperCase()) {
          hasValidCodeParam = true;
        }
      } catch {}
    }
    const hasJoinParam = typeof window !== 'undefined' && 
      (window.location.search.includes('join') || window.location.search.includes('invite') || window.location.search.includes('space') || hasValidCodeParam);
    const isPreAuthorized = currentSpace.allowedEmails.some(e => e.toLowerCase() === userEmail);

    if (hasJoinParam || isPreAuthorized) {
      // Auto-admit directly into the team workspace!
      this.joinAsTeamAgent('agent');
      return;
    }

    // 5. User is signed in with Google, but not yet joined
    if (this.isUnlocked()) this.isUnlocked.set(false);
    if (!this.showAccessModal()) this.showAccessModal.set(true);
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
    this.isUnlocked.set(true);
    this.showAccessModal.set(false);
  }

  // Accept Space Invitation
  public acceptSpaceInvitation(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    const userEmail = (user.email || '').toLowerCase();
    const currentSpace = this.space();

    const newMember: SpaceMember = {
      id: user.uid,
      name: user.displayName || userEmail.split('@')[0],
      email: user.email || '',
      photoURL: user.photoURL,
      role: 'agent',
      status: 'active',
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      joinedVia: 'email_invite',
      invitedBy: currentSpace.ownerName || currentSpace.ownerEmail
    };

    this.space.update(s => ({
      ...s,
      members: [
        newMember,
        ...s.members.filter(m => m.id !== user.uid && m.email?.toLowerCase() !== userEmail)
      ],
      // Ensure email is in allowedEmails
      allowedEmails: s.allowedEmails.includes(userEmail) ? s.allowedEmails : [...s.allowedEmails, userEmail]
    }));

    this.saveSpace();
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

    // Check if code matches currently loaded space
    if (this.space().code && this.space().code.toUpperCase() === cleanCode) {
      this.joinAsTeamAgent('agent');
      return true;
    }

    // Attempt to load space from Firestore 'spaces' collection
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

    // Direct fallback
    this.space.update(s => ({ ...s, code: cleanCode }));
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
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/?join=true&code=${encodeURIComponent(code)}`;
    }
    return `https://skypearl.netlify.app/?join=true&code=${encodeURIComponent(code)}`;
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

        // 1. Save in dedicated spaces/{spaceCode} collection document
        setDoc(doc(db, 'spaces', spaceCode), cleaned, { merge: true }).catch(() => {});

        // 2. Also keep settings/agencySpace in sync
        const legacyRef = doc(db, 'settings', 'agencySpace');
        setDoc(legacyRef, cleaned, { merge: true }).catch((err) => {
          console.warn('Firestore space save warning:', err);
        });
      } catch (err) {
        console.warn('Firestore space save exception:', err);
      }
    }
  }
}
