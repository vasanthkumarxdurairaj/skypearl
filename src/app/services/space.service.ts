import { Injectable, signal, computed, inject } from '@angular/core';
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
    members: [
      {
        id: 'member-01',
        name: 'Rajesh Kumar (Admin)',
        email: 'rajesh.kumar@skypearl.in',
        role: 'owner',
        joinedAt: Date.now() - 86400000 * 30,
        joinedVia: 'passcode'
      }
    ]
  });

  public readonly verifiedMember = computed<SpaceMember | null>(() => {
    const user = this.authService.currentUser();
    if (user) {
      return {
        id: user.uid,
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: 'agent',
        joinedAt: Date.now(),
        joinedVia: 'google'
      };
    }
    return null;
  });

  constructor() {
    this.initSpace();
  }

  private initSpace(): void {
    // 1. Load saved space settings
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SPACE_SETTINGS);
      if (savedSettings) {
        this.space.set(JSON.parse(savedSettings));
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

  private grantAccess(via: 'passcode' | 'invite' | 'google' | 'guest'): void {
    this.isUnlocked.set(true);
    this.showAccessModal.set(false);
    localStorage.setItem(STORAGE_KEY_UNLOCKED, 'true');

    // Add member if logged in
    const user = this.authService.currentUser();
    const newMember: SpaceMember = {
      id: user ? user.uid : 'guest-' + Date.now().toString(36),
      name: user ? user.displayName : (via === 'guest' ? 'Guest Agent' : 'Verified Agent'),
      email: user ? user.email : 'agent@skypearl.in',
      photoURL: user?.photoURL,
      role: 'agent',
      joinedAt: Date.now(),
      joinedVia: via
    };

    this.space.update(s => ({
      ...s,
      members: [newMember, ...s.members.filter(m => m.email !== newMember.email)]
    }));

    this.saveSpace();
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
