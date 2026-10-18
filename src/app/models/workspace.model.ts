export type UserRole = 'owner' | 'editor' | 'viewer';

export interface WorkspaceMember {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  joinedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: number;
  members: Record<string, WorkspaceMember>;
  inviteCode?: string;
  category?: string;
  color?: string;
}

export type ItemCategory = 'document' | 'task' | 'note' | 'announcement';
export type ItemPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ItemStatus = 'pending' | 'in_progress' | 'completed';

export interface SharedItem {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  category: ItemCategory;
  priority: ItemPriority;
  status: ItemStatus;
  tags: string[];
  createdByUid: string;
  createdByEmail: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
  lastUpdatedByName?: string;
}

export interface ActivityEntry {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  timestamp: number;
  type: 'item_create' | 'item_update' | 'item_delete' | 'member_add' | 'member_role_change' | 'member_remove';
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAnonymous?: boolean;
}

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}
