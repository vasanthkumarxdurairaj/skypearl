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

export const DEMO_PERSONAS: DemoUserPersona[] = [];

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
      // Local session check - purge any legacy mock personas
      const savedUser = localStorage.getItem('skypearl_demo_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (
            parsed &&
            parsed.email &&
            !parsed.email.includes('alice.lead') &&
            !parsed.email.includes('bob.dev') &&
            !parsed.email.includes('charlie.audit') &&
            !parsed.email.includes('google.collaborator')
          ) {
            this.currentUser.set(parsed);
            return;
          } else {
            localStorage.removeItem('skypearl_demo_user');
          }
        } catch {
          localStorage.removeItem('skypearl_demo_user');
        }
      }
      this.currentUser.set(null);
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
        const cleanName = email.split('@')[0];
        const user: AppUser = {
          uid: 'user-' + Date.now().toString(36),
          email,
          displayName: cleanName,
          photoURL: undefined
        };
        this.currentUser.set(user);
        localStorage.setItem('skypearl_demo_user', JSON.stringify(user));
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
        const user: AppUser = {
          uid: 'user-' + Date.now().toString(36),
          email,
          displayName: displayName || email.split('@')[0]
        };
        this.currentUser.set(user);
        localStorage.setItem('skypearl_demo_user', JSON.stringify(user));
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
      if (this.firebaseService.auth) {
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
        this.authError.set('Firebase Auth is not initialized. Please connect Firebase to use Google Sign-In.');
        return false;
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
