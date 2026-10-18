import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface SpaceMember {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'owner' | 'agent' | 'guest';
  joinedAt: number;
  lastActiveAt?: number;
  joinedVia: 'passcode' | 'invite' | 'google' | 'guest';
}

export interface AgencySpace {
  id: string;
  name: string;
  passcode: string;
  inviteCodes: string[];
  members: SpaceMember[];
}

const STORAGE_KEY_UNLOCKED = 'skypearl_space_unlocked';
const STORAGE_KEY_SPACE_SETTINGS = 'skypearl_space_settings';
const DEFAULT_PASSCODE = '2025';
const DEFAULT_INVITES = ['SKYPEARL-CHENNAI', 'AGENT-VIP-2025', 'CHENNAI-HQ'];

@Injectable({
  providedIn: 'root'
})
export class SpaceService {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);

  public readonly isUnlocked = signal<boolean>(false);
  public readonly showAccessModal = signal<boolean>(false);
  public readonly showSpaceSettingsModal = signal<boolean>(false);

  public readonly space = signal<AgencySpace>({
    id: 'space-chennai-hq',
    name: 'SkyPearl Realty Space (Chennai Central)',
    passcode: DEFAULT_PASSCODE,
    inviteCodes: [...DEFAULT_INVITES],
    members: []
  });

  public readonly verifiedMember = computed<SpaceMember | null>(() => {
    const user = this.authService.currentUser();
    if (user) {
      return {
        id: user.uid,
        name: user.displayName || 'Google User',
        email: user.email || 'user@skypearl.in',
        photoURL: user.photoURL,
        role: 'owner',
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
        joinedVia: 'google'
      };
    }
    return null;
  });

  constructor() {
    this.initSpace();

    // Auto-sync real Google sign-ins to space members
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.registerOrUpdateMember({
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Google User',
          email: user.email || 'user@skypearl.in',
          photoURL: user.photoURL,
          role: 'owner',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          joinedVia: 'google'
        });
      }
    });
  }

  private initSpace(): void {
    // 1. Load saved space settings & purge any legacy dummy accounts
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SPACE_SETTINGS);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.members && Array.isArray(parsed.members)) {
          parsed.members = parsed.members.filter((m: any) =>
            m.id !== 'member-01' &&
            m.email !== 'rajesh.kumar@skypearl.in' &&
            m.name !== 'Rajesh Kumar (Admin)'
          );
        }
        this.space.set(parsed);
      }
    } catch {}

    // 2. Check URL for automatic invite access (?invite=... or ?code=...)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get('invite') || params.get('code');
      if (inviteParam) {
        if (this.unlockWithInviteCode(inviteParam) || this.unlockWithPasscode(inviteParam)) {
          // clean url without refresh
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      }
    }

    // 3. Check unlocked state from session/storage
    const wasUnlocked = localStorage.getItem(STORAGE_KEY_UNLOCKED) === 'true';
    if (wasUnlocked) {
      this.isUnlocked.set(true);
    } else {
      // First visit: Show Space Access Gate
      this.isUnlocked.set(false);
      this.showAccessModal.set(true);
    }

    // 4. If Firestore connected, sync space settings in real-time
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
          this.space.set(remoteData);
          localStorage.setItem(STORAGE_KEY_SPACE_SETTINGS, JSON.stringify(remoteData));
        } else {
          // Push initial space data to cloud
          setDoc(spaceDocRef, this.space(), { merge: true }).catch(() => {});
        }
      }, () => {});
    } catch {}
  }

  public unlockWithPasscode(inputPasscode: string): boolean {
    const trimmed = inputPasscode.trim();
    if (!trimmed) return false;

    if (trimmed.toUpperCase() === this.space().passcode.toUpperCase() || trimmed === DEFAULT_PASSCODE) {
      this.grantAccess('passcode');
      return true;
    }
    return false;
  }

  public unlockWithInviteCode(inputCode: string): boolean {
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) return false;

    const matched = this.space().inviteCodes.some(c => c.toUpperCase() === cleanCode);
    if (matched) {
      this.grantAccess('invite');
      return true;
    }
    return false;
  }

  public async loginAndUnlockWithGoogle(): Promise<boolean> {
    const ok = await this.authService.loginWithGoogle();
    if (ok) {
      this.grantAccess('google');
      return true;
    }
    return false;
  }

  public unlockAsGuest(): void {
    this.grantAccess('guest');
  }

  public registerOrUpdateMember(member: SpaceMember): void {
    this.space.update(s => {
      const existing = s.members.find(m => m.id === member.id || m.email === member.email);
      const updatedList = [
        {
          ...member,
          lastActiveAt: Date.now(),
          joinedAt: existing ? existing.joinedAt : member.joinedAt
        },
        ...s.members.filter(m => m.id !== member.id && m.email !== member.email)
      ];
      return { ...s, members: updatedList };
    });
    this.saveSpace();
  }

  public removeMember(memberId: string): void {
    this.space.update(s => ({
      ...s,
      members: s.members.filter(m => m.id !== memberId)
    }));
    this.saveSpace();
  }

  private grantAccess(via: 'passcode' | 'invite' | 'google' | 'guest'): void {
    this.isUnlocked.set(true);
    this.showAccessModal.set(false);
    localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');

    const user = this.authService.currentUser();
    let name = 'Guest Visitor';
    let email = 'guest@skypearl.space';
    let role: 'owner' | 'agent' | 'guest' = 'guest';

    if (user && via === 'google') {
      name = user.displayName || user.email?.split('@')[0] || 'Google User';
      email = user.email || 'user@skypearl.in';
      role = 'owner';
    } else if (via === 'passcode') {
      name = 'Agency Member (Passcode)';
      email = 'chennai-agent@skypearl.space';
      role = 'agent';
    } else if (via === 'invite') {
      name = 'Invited Agent';
      email = 'invited.agent@skypearl.space';
      role = 'agent';
    }

    const member: SpaceMember = {
      id: user ? user.uid : `access-${via}-${Date.now().toString(36)}`,
      name,
      email,
      photoURL: user?.photoURL,
      role,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      joinedVia: via
    };

    this.registerOrUpdateMember(member);
  }

  public lockSpace(): void {
    this.isUnlocked.set(false);
    localStorage.removeItem(STORAGE_KEY_UNLOCKED);
    this.showAccessModal.set(true);
  }

  public generateNewInviteCode(): string {
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
    this.space.update(s => ({
      ...s,
      inviteCodes: s.inviteCodes.filter(c => c !== code)
    }));
    this.saveSpace();
  }

  public updatePasscode(newPasscode: string): void {
    const trimmed = newPasscode.trim();
    if (trimmed) {
      this.space.update(s => ({ ...s, passcode: trimmed }));
      this.saveSpace();
    }
  }

  public getInviteLink(code?: string): string {
    const selectedCode = code || this.space().inviteCodes[0] || 'SKYPEARL-CHENNAI';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(selectedCode)}`;
    }
    return `https://skypearl.netlify.app?invite=${encodeURIComponent(selectedCode)}`;
  }

  private saveSpace(): void {
    localStorage.setItem(STORAGE_KEY_SPACE_SETTINGS, JSON.stringify(this.space()));
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      try {
        const spaceDocRef = doc(this.firebaseService.firestore, 'settings', 'agencySpace');
        setDoc(spaceDocRef, this.space(), { merge: true }).catch(() => {});
      } catch {}
    }
  }
}
