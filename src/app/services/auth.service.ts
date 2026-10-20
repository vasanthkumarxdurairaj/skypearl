import { Injectable, signal, inject } from '@angular/core';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { AppUser } from '../models/realty.model';
import { environment } from '../../environments/environment';

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

  private handleFirebaseUser(user: FirebaseUser): void {
    const appUser: AppUser = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Team Member',
      photoURL: user.photoURL || undefined
    };
    this.currentUser.set(appUser);
  }

  private listenerAttached = false;

  public initAuthListener(): void {
    if (this.listenerAttached) return;
    if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
      this.listenerAttached = true;
      // Check for redirect result if returned from Google OAuth redirect
      getRedirectResult(this.firebaseService.auth)
        .then((cred) => {
          if (cred?.user) {
            this.handleFirebaseUser(cred.user);
          }
        })
        .catch((err) => {
          console.warn('Firebase Redirect Sign-In info:', err);
        });

      onAuthStateChanged(this.firebaseService.auth, (user: FirebaseUser | null) => {
        if (user) {
          this.handleFirebaseUser(user);
        } else {
          this.currentUser.set(null);
        }
      });
    } else {
      this.currentUser.set(null);
    }
  }

  public async loginWithEmail(email: string, pass: string): Promise<boolean> {
    this.authLoading.set(true);
    this.authError.set(null);

    try {
      if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
        const cred = await signInWithEmailAndPassword(this.firebaseService.auth, email, pass);
        this.handleFirebaseUser(cred.user);
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
        return true;
      }
    } catch (err: any) {
      console.error('Email login error:', err);
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
        this.handleFirebaseUser(cred.user);
        return true;
      } else {
        const user: AppUser = {
          uid: 'user-' + Date.now().toString(36),
          email,
          displayName: displayName || email.split('@')[0]
        };
        this.currentUser.set(user);
        return true;
      }
    } catch (err: any) {
      console.error('Email registration error:', err);
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
      if (!this.firebaseService.auth) {
        if (environment?.firebase?.apiKey && environment.firebase.projectId) {
          this.firebaseService.initializeWithConfig(environment.firebase);
          this.initAuthListener();
        }
      }

      if (this.firebaseService.auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
          const cred = await signInWithPopup(this.firebaseService.auth, provider);
          if (cred?.user) {
            this.handleFirebaseUser(cred.user);
            return true;
          }
        } catch (popupErr: any) {
          console.error('Google Sign-In Popup Error:', popupErr);

          // If popup is blocked by browser or closed due to cross-origin restriction, fallback to redirect
          if (
            popupErr?.code === 'auth/popup-blocked' ||
            popupErr?.code === 'auth/cancelled-popup-request' ||
            popupErr?.message?.includes('popup')
          ) {
            console.log('Popup was blocked by browser. Falling back to signInWithRedirect...');
            await signInWithRedirect(this.firebaseService.auth, provider);
            return true;
          }
          throw popupErr;
        }
        return false;
      } else {
        const msg = 'Firebase Auth is not initialized. Please check network connection and Firebase configuration.';
        this.authError.set(msg);
        console.error(msg);
        return false;
      }
    } catch (err: any) {
      console.error('Firebase Google Sign-In Error:', err);
      const friendlyMessage = this.formatAuthErrorMessage(err);
      this.authError.set(friendlyMessage);
      return false;
    } finally {
      this.authLoading.set(false);
    }
  }

  public async loginWithGoogleRedirect(): Promise<void> {
    this.authLoading.set(true);
    this.authError.set(null);

    try {
      if (!this.firebaseService.auth && environment?.firebase?.apiKey) {
        this.firebaseService.initializeWithConfig(environment.firebase);
        this.initAuthListener();
      }

      if (this.firebaseService.auth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithRedirect(this.firebaseService.auth, provider);
      } else {
        this.authError.set('Firebase Auth is not initialized.');
        this.authLoading.set(false);
      }
    } catch (err: any) {
      console.error('Google Redirect Error:', err);
      this.authError.set(this.formatAuthErrorMessage(err));
      this.authLoading.set(false);
    }
  }

  private formatAuthErrorMessage(err: any): string {
    const code = err?.code || '';
    switch (code) {
      case 'auth/popup-blocked':
        return 'Browser blocked the Google sign-in window. Please allow popups or use Direct Redirect sign-in.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-In was cancelled. Please try again.';
      case 'auth/cancelled-popup-request':
        return 'A sign-in request was already in progress. Please try again.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for Google Sign-In. Please contact your workspace administrator.';
      case 'auth/operation-not-allowed':
        return 'Google Sign-In is currently unavailable. Please contact support.';
      case 'auth/network-request-failed':
        return 'Network connection error while connecting to Google. Please check your internet connection.';
      default:
        return err?.message || 'Google Sign-In failed. Please try again.';
    }
  }

  public async logout(): Promise<void> {
    if (this.firebaseService.auth && !this.firebaseService.isDemoMode()) {
      await signOut(this.firebaseService.auth);
    }
    this.currentUser.set(null);
  }
}
