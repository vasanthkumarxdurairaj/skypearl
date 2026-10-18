import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirebaseConfigOptions } from '../models/workspace.model';
import { environment } from '../../environments/environment';

const STORAGE_KEY_FIREBASE_CONFIG = 'skypearl_firebase_config';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp | null = null;
  public auth: Auth | null = null;
  public firestore: Firestore | null = null;

  public readonly isConnected = signal<boolean>(false);
  public readonly isDemoMode = signal<boolean>(false);
  public readonly projectId = signal<string>('skypearl-217d7');
  public readonly currentConfig = signal<FirebaseConfigOptions | null>(null);

  constructor() {
    this.loadSavedConfig();
  }

  private loadSavedConfig(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (saved) {
        const config: FirebaseConfigOptions = JSON.parse(saved);
        if (config.apiKey && config.projectId) {
          this.initializeWithConfig(config);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved Firebase config:', err);
    }

    if (environment?.firebase?.apiKey && environment.firebase.projectId) {
      this.initializeWithConfig(environment.firebase);
      return;
    }

    // Default to interactive demo mode
    this.isDemoMode.set(true);
    this.isConnected.set(true);
  }

  public initializeWithConfig(config: FirebaseConfigOptions): boolean {
    try {
      if (getApps().length > 0) {
        // App already initialized
        this.app = getApps()[0];
      } else {
        this.app = initializeApp(config);
      }
      this.auth = getAuth(this.app);
      this.firestore = getFirestore(this.app);
      this.currentConfig.set(config);
      this.projectId.set(config.projectId);
      this.isConnected.set(true);
      this.isDemoMode.set(false);
      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
      return true;
    } catch (err) {
      console.error('Firebase initialization error:', err);
      return false;
    }
  }

  public disconnectFirebase(): void {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    this.app = null;
    this.auth = null;
    this.firestore = null;
    this.currentConfig.set(null);
    this.projectId.set('demo-skypearl-shared');
    this.isDemoMode.set(true);
    this.isConnected.set(true);
  }
}
