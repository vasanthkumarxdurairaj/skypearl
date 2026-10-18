import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface SpaceMember {
  id: string; // Google UID
  name: string; // Google displayName
  email: string; // Google email
  photoURL?: string;
  role: 'owner' | 'admin' | 'agent';
  status: 'active' | 'pending';
  joinedAt: number;
  lastActiveAt?: number;
  joinedVia: 'creator' | 'email_invite' | 'invite_code' | 'approved_request';
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
  ownerUid?: string;
  ownerEmail?: string;
  ownerName?: string;
  allowedEmails: string[];
  inviteCodes: string[];
  members: SpaceMember[];
  pendingRequests: AccessRequest[];
}

const STORAGE_KEY_SPACE_SETTINGS = 'skypearl_space_settings_v2';
const DEFAULT_INVITES = ['SKYPEARL-CHENNAI', 'AGENT-VIP-2025'];

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
  public readonly pendingInviteFromUrl = signal<string | null>(null);
  private isSyncingFromRemote = false;

  public readonly space = signal<AgencySpace>({
    id: 'space-chennai-hq',
    name: 'SkyPearl Realty Space (Chennai Central)',
    ownerUid: '',
    ownerEmail: '',
    ownerName: '',
    allowedEmails: [],
    inviteCodes: [...DEFAULT_INVITES],
    members: [],
    pendingRequests: []
  });

  public readonly isOwner = computed<boolean>(() => {
    const user = this.authService.currentUser();
    const currentSpace = this.space();
    if (!user) return false;
    if (!currentSpace.ownerEmail && !currentSpace.ownerUid) return true;
    return (
      (!!user.email && user.email.toLowerCase() === (currentSpace.ownerEmail || '').toLowerCase()) ||
      (!!user.uid && user.uid === currentSpace.ownerUid)
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

  constructor() {
    this.initSpace();

    // React to Google Authentication changes
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        this.evaluateAccessForUser(user);
      });
    });
  }

  private initSpace(): void {
    // 1. Check URL for automatic invite access (?invite=... or ?code=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get('invite') || params.get('code');
      if (inviteParam) {
        this.pendingInviteFromUrl.set(inviteParam.trim().toUpperCase());
      }
    }

    // 2. Load saved space settings from local storage
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SPACE_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        this.space.set({
          id: parsed.id || 'space-chennai-hq',
          name: parsed.name || 'SkyPearl Realty Space (Chennai Central)',
          ownerUid: parsed.ownerUid || '',
          ownerEmail: parsed.ownerEmail || '',
          ownerName: parsed.ownerName || '',
          allowedEmails: Array.isArray(parsed.allowedEmails) ? parsed.allowedEmails : [],
          inviteCodes: Array.isArray(parsed.inviteCodes) && parsed.inviteCodes.length > 0 ? parsed.inviteCodes : [...DEFAULT_INVITES],
          members: Array.isArray(parsed.members) ? parsed.members : [],
          pendingRequests: Array.isArray(parsed.pendingRequests) ? parsed.pendingRequests : []
        });
      }
    } catch {}

    // 3. Setup real-time Firestore sync for team collaboration
    this.setupFirestoreSpaceSync();
  }

  private setupFirestoreSpaceSync(): void {
    if (!this.firebaseService.firestore || this.firebaseService.isDemoMode()) return;
    try {
      const db = this.firebaseService.firestore;
      const spaceDocRef = doc(db, 'settings', 'agencySpace');
      onSnapshot(spaceDocRef, snap => {
        if (snap.exists()) {
          const remoteData = snap.data() as AgencySpace;
          if (remoteData) {
            this.isSyncingFromRemote = true;
            try {
              this.space.update(curr => ({
                ...curr,
                name: remoteData.name || curr.name,
                ownerUid: remoteData.ownerUid || curr.ownerUid,
                ownerEmail: remoteData.ownerEmail || curr.ownerEmail,
                ownerName: remoteData.ownerName || curr.ownerName,
                allowedEmails: Array.isArray(remoteData.allowedEmails) ? remoteData.allowedEmails : curr.allowedEmails,
                inviteCodes: Array.isArray(remoteData.inviteCodes) && remoteData.inviteCodes.length > 0 ? remoteData.inviteCodes : curr.inviteCodes,
                members: Array.isArray(remoteData.members) ? remoteData.members : curr.members,
                pendingRequests: Array.isArray(remoteData.pendingRequests) ? remoteData.pendingRequests : curr.pendingRequests
              }));
              localStorage.setItem(STORAGE_KEY_SPACE_SETTINGS, JSON.stringify(this.space()));
              // Re-evaluate current user access in-memory WITHOUT writing back to Firestore
              this.evaluateAccessForUser(this.authService.currentUser(), false);
            } finally {
              this.isSyncingFromRemote = false;
            }
          }
        }
      }, (err) => {
        console.warn('Firestore space sync notice:', err);
      });
    } catch {}
  }

  public evaluateAccessForUser(user: any, allowRemoteWrite = true): void {
    if (!user) {
      // No Google login = No access to any data
      if (this.isUnlocked()) this.isUnlocked.set(false);
      if (!this.showAccessModal()) this.showAccessModal.set(true);
      return;
    }

    const currentSpace = this.space();
    const userEmail = (user.email || '').toLowerCase();

    // 1. First user who creates or logs in when no owner exists becomes Space Creator / Owner
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
      (currentSpace.ownerUid && currentSpace.ownerUid === user.uid)
    ) {
      const isAlreadyRegisteredOwner = currentSpace.members.some(
        m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.role === 'owner'
      );
      if (!isAlreadyRegisteredOwner && allowRemoteWrite && !this.isSyncingFromRemote) {
        this.registerOrUpdateMember({
          id: user.uid,
          name: user.displayName || currentSpace.ownerName || 'Space Owner',
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

    // 3. Check if user opened with an invite link (?invite=CODE)
    const pendingCode = this.pendingInviteFromUrl();
    if (pendingCode && currentSpace.inviteCodes.some(c => c.toUpperCase() === pendingCode.toUpperCase())) {
      if (allowRemoteWrite && !this.isSyncingFromRemote) {
        this.registerOrUpdateMember({
          id: user.uid,
          name: user.displayName || userEmail.split('@')[0],
          email: user.email,
          photoURL: user.photoURL,
          role: 'agent',
          status: 'active',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          joinedVia: 'invite_code',
          invitedBy: currentSpace.ownerName || currentSpace.ownerEmail
        });
        this.pendingInviteFromUrl.set(null);
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 4. Was this email pre-invited by the creator?
    const isPreInvited = currentSpace.allowedEmails.some(e => e.toLowerCase() === userEmail);
    if (isPreInvited) {
      const alreadyMember = currentSpace.members.some(
        m => (m.id === user.uid || (!!m.email && m.email.toLowerCase() === userEmail)) && m.status === 'active'
      );
      if (!alreadyMember && allowRemoteWrite && !this.isSyncingFromRemote) {
        this.registerOrUpdateMember({
          id: user.uid,
          name: user.displayName || userEmail.split('@')[0],
          email: user.email,
          photoURL: user.photoURL,
          role: 'agent',
          status: 'active',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          joinedVia: 'email_invite',
          invitedBy: currentSpace.ownerName || currentSpace.ownerEmail
        });
      }
      if (!this.isUnlocked()) this.isUnlocked.set(true);
      if (this.showAccessModal()) this.showAccessModal.set(false);
      return;
    }

    // 5. Is user already an approved active member?
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

    // 6. User is signed in with Google, but NOT invited / NOT approved yet!
    if (this.isUnlocked()) this.isUnlocked.set(false);
    if (!this.showAccessModal()) this.showAccessModal.set(true);
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

  public unlockWithInviteCode(inputCode: string): boolean {
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) return false;

    const matched = this.space().inviteCodes.some(c => c.toUpperCase() === cleanCode);
    if (matched) {
      const user = this.authService.currentUser();
      if (user) {
        this.registerOrUpdateMember({
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Team Member',
          email: user.email || '',
          photoURL: user.photoURL,
          role: 'agent',
          status: 'active',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          joinedVia: 'invite_code',
          invitedBy: this.space().ownerName || this.space().ownerEmail
        });
        this.isUnlocked.set(true);
        this.showAccessModal.set(false);
        return true;
      }
    }
    return false;
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

  public generateNewInviteCode(): string {
    if (!this.isOwner()) return '';
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `SKYPEARL-${rand}`;
    this.space.update(s => ({
      ...s,
      inviteCodes: [newCode, ...s.inviteCodes]
    }));
    this.saveSpace();
    return newCode;
  }

  public removeInviteCode(code: string): void {
    if (!this.isOwner()) return;
    this.space.update(s => ({
      ...s,
      inviteCodes: s.inviteCodes.filter(c => c !== code)
    }));
    this.saveSpace();
  }

  public getInviteLink(code?: string): string {
    const selectedCode = code || this.space().inviteCodes[0] || 'SKYPEARL-CHENNAI';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(selectedCode)}`;
    }
    return `https://skypearl.netlify.app?invite=${encodeURIComponent(selectedCode)}`;
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

  private saveSpace(): void {
    if (this.isSyncingFromRemote) return;
    localStorage.setItem(STORAGE_KEY_SPACE_SETTINGS, JSON.stringify(this.space()));
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const spaceDocRef = doc(this.firebaseService.firestore, 'settings', 'agencySpace');
        setDoc(spaceDocRef, this.space(), { merge: true }).catch(() => {});
      } catch {}
    }
  }
}
