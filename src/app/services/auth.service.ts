import { Injectable, signal, inject } from '@angular/core';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { AppUser } from '../models/workspace.model';

export interface DemoUserPersona {
  uid: string;
  email: string;
  displayName: string;
  roleHint: string;
  avatarColor: string;
}

export const DEMO_PERSONAS: DemoUserPersona[] = [
  {
    uid: 'user-alice-owner-001',
    email: 'alice.lead@skypearl.io',
    displayName: 'Alice Chen (Owner)',
    roleHint: 'Workspace Owner - Full Access & Member Management',
    avatarColor: 'linear-gradient(135deg, #6366f1, #a855f7)'
  },
  {
    uid: 'user-bob-editor-002',
    email: 'bob.dev@skypearl.io',
    displayName: 'Bob Rivera (Editor)',
    roleHint: 'Editor - Can Create & Edit Shared Data',
    avatarColor: 'linear-gradient(135deg, #06b6d4, #3b82f6)'
  },
  {
    uid: 'user-charlie-viewer-003',
    email: 'charlie.audit@skypearl.io',
    displayName: 'Charlie Kim (Viewer)',
    roleHint: 'Viewer - Read Only Access to Workspace',
    avatarColor: 'linear-gradient(135deg, #10b981, #14b8a6)'
  }
];

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);

  public readonly currentUser = signal<AppUser | null>(null);
  public readonly authLoading = signal<boolean>(false);
  public readonly authError = signal<string | null>(null);

  constructor() {
    this.initAuthListener();
  }

  private initAuthListener(): void {
    if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
      onAuthStateChanged(this.firebaseService.auth, (user: FirebaseUser | null) => {
        if (user) {
          this.currentUser.set({
            uid: user.uid,
            email: user.email || 'user@skypearl.io',
            displayName: user.displayName || user.email?.split('@')[0] || 'Team Member',
            photoURL: user.photoURL || undefined
          });
        } else {
          this.currentUser.set(null);
        }
      });
    } else {
      // Default to Alice in demo mode for instant testing
      const savedUser = localStorage.getItem('skypearl_demo_user');
      if (savedUser) {
        try {
          this.currentUser.set(JSON.parse(savedUser));
          return;
        } catch {
          // fallback
        }
      }
      this.switchDemoUser(DEMO_PERSONAS[0]);
    }
  }

  public async loginWithEmail(email: string, pass: string): Promise<boolean> {
    this.authLoading.set(true);
    this.authError.set(null);

    try {
      if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
        const cred = await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
        this.currentUser.set({
          uid: cred.user.uid,
          email: cred.user.email || email,
          displayName: cred.user.displayName || email.split('@')[0],
          photoURL: cred.user.photoURL || undefined
        });
        return true;
      } else {
        // Demo login
        const persona = DEMO_PERSONAS.find(p => p.email.toLowerCase() === email.toLowerCase()) || {
          uid: 'user-custom-' + Date.now(),
          email,
          displayName: email.split('@')[0],
          roleHint: 'Custom User',
          avatarColor: 'linear-gradient(135deg, #ec4899, #8b5cf6)'
        };
        this.switchDemoUser(persona);
        return true;
      }
    } catch (err: any) {
      this.authError.set(err.message || 'Authentication failed. Please verify credentials.');
      return false;
    } finally {
      this.authLoading.set(false);
    }
  }

  public async registerWithEmail(email: string, pass: string, displayName: string): Promise<boolean> {
    this.authLoading.set(true);
    this.authError.set(null);

    try {
      if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
        const cred = await createUserWithEmailAndPassword(this.firebaseService.auth, email, pass);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
        this.currentUser.set({
          uid: cred.user.uid,
          email: cred.user.email || email,
          displayName: displayName || email.split('@')[0]
        });
        return true;
      } else {
        // Demo signup
        const newPersona: DemoUserPersona = {
          uid: 'user-' + Date.now(),
          email,
          displayName: displayName || email.split('@')[0],
          roleHint: 'Registered Member',
          avatarColor: 'linear-gradient(135deg, #f59e0b, #ef4444)'
        };
        this.switchDemoUser(newPersona);
        return true;
      }
    } catch (err: any) {
      this.authError.set(err.message || 'Registration failed.');
      return false;
    } finally {
      this.authLoading.set(false);
    }
  }

  public async loginWithGoogle(): Promise<boolean> {
    this.authLoading.set(true);
    this.authError.set(null);

    try {
      if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(this.firebaseService.auth, provider);
        this.currentUser.set({
          uid: cred.user.uid,
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'Google User',
          photoURL: cred.user.photoURL || undefined
        });
        return true;
      } else {
        // Demo google login
        this.switchDemoUser({
          uid: 'user-google-' + Date.now(),
          email: 'google.collaborator@gmail.com',
          displayName: 'Google Collaborator',
          roleHint: 'Signed in with Google',
          avatarColor: 'linear-gradient(135deg, #4285F4, #34A853)'
        });
        return true;
      }
    } catch (err: any) {
      this.authError.set(err.message || 'Google Sign-In failed.');
      return false;
    } finally {
      this.authLoading.set(false);
    }
  }

  public async logout(): Promise<void> {
    if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
      await signOut(this.firebaseService.auth);
    }
    this.currentUser.set(null);
    localStorage.removeItem('skypearl_demo_user');
  }

  public switchDemoUser(persona: DemoUserPersona): void {
    const user: AppUser = {
      uid: persona.uid,
      email: persona.email,
      displayName: persona.displayName,
      photoURL: undefined
    };
    this.currentUser.set(user);
    localStorage.setItem('skypearl_demo_user', JSON.stringify(user));
  }
}
