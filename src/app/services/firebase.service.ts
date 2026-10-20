import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { FirebaseConfigOptions } from '../models/realty.model';
import { environment } from '../../environments/environment';

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
    this.initFirebase();
  }

  private initFirebase(): void {
    if (environment?.firebase?.apiKey && environment.firebase.projectId) {
      this.initializeWithConfig(environment.firebase);
      return;
    }

    // Default fallback
    this.isDemoMode.set(false);
    this.isConnected.set(false);
  }

  public initializeWithConfig(config: FirebaseConfigOptions): boolean {
    try {
      if (getApps().length > 0) {
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
      return true;
    } catch (err) {
      console.error('Firebase initialization error:', err);
      return false;
    }
  }

  public disconnectFirebase(): void {
    this.app = null;
    this.auth = null;
    this.firestore = null;
    this.currentConfig.set(null);
    this.projectId.set('skypearl-217d7');
    this.isDemoMode.set(false);
    this.isConnected.set(false);
  }
}
