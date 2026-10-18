import { Injectable, signal, computed, inject } from '@angular/core';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import {
  Workspace,
  SharedItem,
  ActivityEntry,
  UserRole,
  ItemCategory,
  ItemPriority,
  ItemStatus
} from '../models/workspace.model';

const STORAGE_WORKSPACES = 'skypearl_workspaces_data';
const STORAGE_ITEMS = 'skypearl_items_data';
const STORAGE_ACTIVITIES = 'skypearl_activities_data';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);

  public readonly workspaces = signal<Workspace[]>([]);
  public readonly currentWorkspaceId = signal<string>('');
  public readonly sharedItems = signal<SharedItem[]>([]);
  public readonly activities = signal<ActivityEntry[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly notification = signal<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Active workspace object
  public readonly activeWorkspace = computed(() => {
    const id = this.currentWorkspaceId();
    return this.workspaces().find(w => w.id === id) || this.workspaces()[0] || null;
  });

  // Current user's role in the active workspace
  public readonly currentRole = computed<UserRole | null>(() => {
    const ws = this.activeWorkspace();
    const user = this.authService.currentUser();
    if (!ws || !user) return null;

    if (ws.ownerId === user.uid) return 'owner';
    return ws.members[user.uid]?.role || 'viewer';
  });

  // Role permissions
  public readonly canEdit = computed<boolean>(() => {
    const role = this.currentRole();
    return role === 'owner' || role === 'editor';
  });

  public readonly canManageMembers = computed<boolean>(() => {
    return this.currentRole() === 'owner';
  });

  private firestoreUnsubs: Unsubscribe[] = [];

  constructor() {
    this.initializeData();
  }

  private initializeData(): void {
    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      this.setupFirestoreListeners();
    } else {
      this.loadLocalOrSeedData();
    }
  }

  private loadLocalOrSeedData(): void {
    const savedWs = localStorage.getItem(STORAGE_WORKSPACES);
    const savedItems = localStorage.getItem(STORAGE_ITEMS);
    const savedActs = localStorage.getItem(STORAGE_ACTIVITIES);

    if (savedWs) {
      try {
        const parsedWs: Workspace[] = JSON.parse(savedWs);
        const parsedItems: SharedItem[] = savedItems ? JSON.parse(savedItems) : [];
        const parsedActs: ActivityEntry[] = savedActs ? JSON.parse(savedActs) : [];

        this.workspaces.set(parsedWs);
        this.sharedItems.set(parsedItems);
        this.activities.set(parsedActs);
        if (parsedWs.length > 0) {
          this.currentWorkspaceId.set(parsedWs[0].id);
        }
        return;
      } catch (err) {
        console.warn('Failed to parse local stored workspaces, reseeding...', err);
      }
    }

    this.workspaces.set([]);
    this.currentWorkspaceId.set('');
    this.sharedItems.set([]);
    this.activities.set([]);
    this.persistLocal();
    return;
  }

  private persistLocal(): void {
    localStorage.setItem(STORAGE_WORKSPACES, JSON.stringify(this.workspaces()));
    localStorage.setItem(STORAGE_ITEMS, JSON.stringify(this.sharedItems()));
    localStorage.setItem(STORAGE_ACTIVITIES, JSON.stringify(this.activities()));
  }

  private setupFirestoreListeners(): void {
    if (!this.firebaseService.firestore) return;

    // Clean up existing
    this.firestoreUnsubs.forEach(unsub => unsub());
    this.firestoreUnsubs = [];

    const db = this.firebaseService.firestore;
    const user = this.authService.currentUser();
    if (!user) return;

    // Listen to workspaces where user is in members
    try {
      const wsRef = collection(db, 'workspaces');
      const wsQuery = query(wsRef);

      const unsubWs = onSnapshot(wsQuery, (snapshot) => {
        const list: Workspace[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Workspace;
          data.id = docSnap.id;
          // Verify user has access
          if (data.members && (data.members[user.uid] || data.ownerId === user.uid)) {
            list.push(data);
          }
        });
        this.workspaces.set(list);
        if (list.length > 0 && !this.currentWorkspaceId()) {
          this.currentWorkspaceId.set(list[0].id);
        }
      });
      this.firestoreUnsubs.push(unsubWs);
    } catch (err) {
      console.error('Firestore listener error:', err);
    }
  }

  public selectWorkspace(workspaceId: string): void {
    this.currentWorkspaceId.set(workspaceId);
  }

  public createWorkspace(name: string, description: string): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const newWs: Workspace = {
      id: 'ws-' + Date.now(),
      name,
      description,
      ownerId: user.uid,
      ownerEmail: user.email,
      createdAt: Date.now(),
      color: '#6366f1',
      members: {
        [user.uid]: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'owner',
          joinedAt: Date.now()
        }
      }
    };

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const docRef = doc(this.firebaseService.firestore, 'workspaces', newWs.id);
      setDoc(docRef, newWs).catch(console.error);
    } else {
      this.workspaces.update(all => [newWs, ...all]);
      this.currentWorkspaceId.set(newWs.id);
      this.persistLocal();
    }

    this.logActivity('Created new shared workspace "' + name + '"', 'member_add');
    this.notify('Workspace created successfully!', 'success');
  }

  public inviteMember(email: string, role: UserRole, displayName?: string): boolean {
    const ws = this.activeWorkspace();
    const user = this.authService.currentUser();
    if (!ws || !user) return false;

    if (!this.canManageMembers()) {
      this.notify('Only the Workspace Owner can manage members.', 'error');
      return false;
    }

    const memberUid = 'user-' + email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const name = displayName || email.split('@')[0];

    const updatedMembers = {
      ...ws.members,
      [memberUid]: {
        uid: memberUid,
        email,
        displayName: name,
        role,
        joinedAt: Date.now()
      }
    };

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const docRef = doc(this.firebaseService.firestore, 'workspaces', ws.id);
      updateDoc(docRef, { members: updatedMembers }).catch(console.error);
    } else {
      this.workspaces.update(all =>
        all.map(w => w.id === ws.id ? { ...w, members: updatedMembers } : w)
      );
      this.persistLocal();
    }

    this.logActivity(`Added ${email} as ${role.toUpperCase()} to workspace`, 'member_add');
    this.notify(`Invited ${email} with ${role.toUpperCase()} role.`, 'success');
    return true;
  }

  public changeMemberRole(memberUid: string, newRole: UserRole): boolean {
    const ws = this.activeWorkspace();
    if (!ws || !this.canManageMembers()) {
      this.notify('Permission denied. Only Owner can modify roles.', 'error');
      return false;
    }

    const member = ws.members[memberUid];
    if (!member) return false;

    const updatedMembers = {
      ...ws.members,
      [memberUid]: {
        ...member,
        role: newRole
      }
    };

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const docRef = doc(this.firebaseService.firestore, 'workspaces', ws.id);
      updateDoc(docRef, { members: updatedMembers }).catch(console.error);
    } else {
      this.workspaces.update(all =>
        all.map(w => w.id === ws.id ? { ...w, members: updatedMembers } : w)
      );
      this.persistLocal();
    }

    this.logActivity(`Changed ${member.displayName}'s role to ${newRole.toUpperCase()}`, 'member_role_change');
    this.notify(`Role updated to ${newRole.toUpperCase()}`, 'info');
    return true;
  }

  public removeMember(memberUid: string): boolean {
    const ws = this.activeWorkspace();
    if (!ws || !this.canManageMembers()) {
      this.notify('Permission denied.', 'error');
      return false;
    }

    if (ws.ownerId === memberUid) {
      this.notify('The workspace owner cannot be removed.', 'error');
      return false;
    }

    const memberName = ws.members[memberUid]?.displayName || 'Member';
    const copy = { ...ws.members };
    delete copy[memberUid];

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const docRef = doc(this.firebaseService.firestore, 'workspaces', ws.id);
      updateDoc(docRef, { members: copy }).catch(console.error);
    } else {
      this.workspaces.update(all =>
        all.map(w => w.id === ws.id ? { ...w, members: copy } : w)
      );
      this.persistLocal();
    }

    this.logActivity(`Removed ${memberName} from workspace`, 'member_remove');
    this.notify(`Removed member from workspace`, 'info');
    return true;
  }

  public addItem(item: {
    title: string;
    content: string;
    category: ItemCategory;
    priority: ItemPriority;
    tags: string[];
  }): boolean {
    if (!this.canEdit()) {
      this.notify('You have Viewer permissions (Read Only). You cannot create items.', 'error');
      return false;
    }

    const ws = this.activeWorkspace();
    const user = this.authService.currentUser();
    if (!ws || !user) return false;

    const newItem: SharedItem = {
      id: 'item-' + Date.now(),
      workspaceId: ws.id,
      title: item.title,
      content: item.content,
      category: item.category,
      priority: item.priority,
      status: 'pending',
      tags: item.tags,
      createdByUid: user.uid,
      createdByEmail: user.email,
      createdByName: user.displayName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastUpdatedByName: user.displayName
    };

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const docRef = doc(this.firebaseService.firestore, 'items', newItem.id);
      setDoc(docRef, newItem).catch(console.error);
    } else {
      this.sharedItems.update(items => [newItem, ...items]);
      this.persistLocal();
    }

    this.logActivity(`Created ${item.category} "${item.title}"`, 'item_create');
    this.notify(`Shared ${item.category} added to team workspace!`, 'success');
    return true;
  }

  public updateItem(itemId: string, patch: Partial<SharedItem>): boolean {
    if (!this.canEdit()) {
      this.notify('Permission Denied: Viewer role is Read-Only.', 'error');
      return false;
    }

    const user = this.authService.currentUser();
    const updatedPatch = {
      ...patch,
      updatedAt: Date.now(),
      lastUpdatedByName: user?.displayName || 'Collaborator'
    };

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const docRef = doc(this.firebaseService.firestore, 'items', itemId);
      updateDoc(docRef, updatedPatch).catch(console.error);
    } else {
      this.sharedItems.update(items =>
        items.map(item => item.id === itemId ? { ...item, ...updatedPatch } : item)
      );
      this.persistLocal();
    }

    this.logActivity(`Updated item "${patch.title || itemId}"`, 'item_update');
    this.notify('Shared item updated in real-time!', 'info');
    return true;
  }

  public deleteItem(itemId: string): boolean {
    if (!this.canEdit()) {
      this.notify('Permission Denied: Viewer cannot delete shared items.', 'error');
      return false;
    }

    const target = this.sharedItems().find(i => i.id === itemId);
    const title = target?.title || 'item';

    if (this.firebaseService.firestore && !this.firebaseService.isDemoMode()) {
      const docRef = doc(this.firebaseService.firestore, 'items', itemId);
      deleteDoc(docRef).catch(console.error);
    } else {
      this.sharedItems.update(items => items.filter(i => i.id !== itemId));
      this.persistLocal();
    }

    this.logActivity(`Deleted item "${title}"`, 'item_delete');
    this.notify('Item removed from workspace', 'info');
    return true;
  }

  private logActivity(action: string, type: ActivityEntry['type']): void {
    const ws = this.activeWorkspace();
    const user = this.authService.currentUser();
    if (!ws || !user) return;

    const entry: ActivityEntry = {
      id: 'act-' + Date.now(),
      workspaceId: ws.id,
      userId: user.uid,
      userName: user.displayName,
      userEmail: user.email,
      action,
      timestamp: Date.now(),
      type
    };

    this.activities.update(acts => [entry, ...acts.slice(0, 49)]);
    localStorage.setItem(STORAGE_ACTIVITIES, JSON.stringify(this.activities()));
  }

  public notify(message: string, type: 'success' | 'info' | 'error'): void {
    this.notification.set({ message, type });
    setTimeout(() => {
      if (this.notification()?.message === message) {
        this.notification.set(null);
      }
    }, 4000);
  }
}
