# SkyPearl - Multi-User Collaborative Angular + Firebase App

## 1. Recommended Architecture for Sharing Data Between Multiple People

When multiple users need to access and collaborate on shared data, **never share a single username/password**. 

### Why Shared Single-Account Fails
- **Zero Accountability / Audit Trail**: You cannot track who created, edited, or deleted records.
- **Security Vulnerability**: If one person leaves the group, changing the password disrupts everyone.
- **Session Collisions**: Multiple simultaneous logins under the same Firebase Auth account can cause race conditions and token refresh collisions.

---

### The Recommended Solution: Individual Auth + Role-Based Team/Workspace Model (RBAC)

1. **Authentication**: Each user signs up and logs in with their own individual credentials (Firebase Auth via Email/Password or Google OAuth).
2. **Data Model (Cloud Firestore)**: Organize shared data under a **Workspace/Team** or use **Shared-Access Lists**.

#### Option A: Workspace / Team-Based Model (Best for Organizations & Teams)
Data is scoped inside a shared team/workspace:
```
/workspaces/{workspaceId}
  ├── name: "Marketing Team"
  ├── ownerId: "uid_abc123"
  ├── members: {
  │     "uid_abc123": "owner",
  │     "uid_xyz789": "editor",
  │     "uid_def456": "viewer"
  │   }
  │
  └── /projects/{projectId}
        ├── title: "Q3 Campaign"
        ├── createdBy: "uid_xyz789"
        └── status: "in-progress"
```

#### Option B: Google Drive / Document-Level Sharing (Best for Per-Item Collaboration)
Each item has a list of user IDs who have access:
```
/items/{itemId}
  ├── title: "Project Strategy"
  ├── ownerId: "uid_abc123"
  ├── sharedWith: ["uid_abc123", "uid_xyz789", "uid_def456"]
  └── roles: {
        "uid_xyz789": "editor",
        "uid_def456": "viewer"
      }
```

---

## 2. Firestore Security Rules Example

Enforce access control directly at the database level:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user is logged in
    function isAuthenticated() {
      return request.auth != null;
    }

    // Workspaces
    match /workspaces/{workspaceId} {
      allow read: if isAuthenticated() && request.auth.uid in resource.data.members;
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && resource.data.members[request.auth.uid] == 'owner';

      // Sub-collections inside the workspace
      match /{collectionPath}/{docId} {
        allow read: if isAuthenticated() && 
          request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members;
        allow write: if isAuthenticated() && 
          get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.members[request.auth.uid] in ['owner', 'editor'];
      }
    }
  }
}
```

---

## 3. Required Installations & Prerequisites

### 1. System Requirements
- **Node.js**: Installed (`v20.20.0` detected on your system). Ensure `C:\Program Files\nodejs` is in your Windows `PATH` environment variable.
- **npm**: Included with Node.js (`v10.8.2`).

### 2. Global CLI Tools
Open PowerShell and run:
```powershell
# 1. Install Angular CLI globally
npm install -g @angular/cli

# 2. Install Firebase Tools CLI globally
npm install -g firebase-tools
```

### 3. Creating & Configuring the Project
```powershell
# 1. Initialize Angular project (Standalone, routing enabled)
ng new skypearl-client --routing --style=css --standalone

# 2. Navigate into the app
cd skypearl-client

# 3. Add AngularFire & Firebase SDK
ng add @angular/fire
```

During `ng add @angular/fire`, it will prompt you to log into Firebase, select/create a Firebase project, and choose features:
- **Authentication** (for individual user logins)
- **Firestore** (for real-time shared multi-user database)
- **Hosting** (for deploying the Angular app)

---

## 4. Key Libraries
- `@angular/fire` & `firebase`: Official Angular bindings for Firebase Auth, Firestore real-time queries, and storage.
- `@angular/router`: For route guards (`canActivate: [AuthGuard]`) to protect authenticated pages.
- `@angular/forms` (ReactiveFormsModule): For clean login, registration, and invitation forms.
