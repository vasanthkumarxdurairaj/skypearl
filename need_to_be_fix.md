# SkyPearl Spaces: Professional Backend & UI/UX Audit

Overall assessment: the biggest concern is not the Angular UI. It is whether the Spaces system actually enforces tenant isolation and access control at the database level. A polished workspace switcher cannot compensate for an insecure database. That's rather like putting a premium lock on a glass door.

I've reviewed both `SPACES_BACKEND.md` and `SPACES_FRONTEND.md`. The recommendations below distinguish documented implementation problems from architectural risks and improvements that still need validation against the actual source code.&#x20;

SPACES_BACKEND.md

SPACES_FRONTEND.md



## Executive risk summary

P0 · Critical: Firestore security

The documented security rules allow unrestricted reads and writes, including through a catch-all rule. If deployed as written, the claimed tenant isolation is not enforced.

P1 · High: Data integrity and scale

Invitations, memberships and requests depend on shared documents and arrays. Concurrent updates, conflicting invitations and growing documents are structural risks.

P1 · High: Onboarding and access flow

The default shared workspace, URL-based selection, and hidden workspace controls can cause confusion or expose the wrong context if authorization and loading are not properly sequenced.

P2 · Medium: Client experience

Workspace switching, team management, invitation recovery, error feedback and permission states need a more deliberate user journey.

## 1. Critical backend issues

### Issue 1: Firestore currently has no meaningful authorization boundary in the documented rules

P0 · Fix first

The backend guide explicitly defines rules equivalent to:

```
match /spaces/{spaceCode} {
  allow read, write: if true;
}

match /{document=**} {
  allow read, write: if true;
}
```

It also grants unrestricted access to properties, leads, site visits, invitations and user registries.&#x20;

SPACES_BACKEND.md



Why a real client would care: if these are the deployed rules, an unauthenticated or otherwise unauthorized client can potentially read, create, alter or delete data across workspaces. This can include CRM leads, property information, membership roles and invitations.

The `owner`, `admin` and `agent` distinctions in Angular do not protect database requests. Client-side checks are not a security boundary.

Firebase documents that Firestore rules are evaluated against client requests and should use authenticated identity and the intended authorization conditions.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://firebase.google.com\&sz=32)

Firebase

+1



Professional solution:

1. Replace the permissive rules immediately, after mapping the minimum legitimate access required by the app.
2. Remove the broad `allow read, write: if true` rules, including the catch-all grant. Firestore grants access when a matching `allow` expression succeeds; a stricter overlapping rule does not cancel a permissive grant.
3. Use Firebase Auth UID and active workspace membership to authorize every operation.
4. Define separate permissions for reading workspace metadata, editing listings, managing CRM records and administering members.
5. Test the new rules in the Firebase Emulator Suite before deployment.

Treat this as a production security review, not simply a cleanup task. Verify whether these rules are actually deployed and audit the database for unexpected changes before claiming the incident is resolved.

### Issue 2: Workspace membership is not properly separated from workspace metadata

The current design stores `members`, `allowedEmails` and `pendingRequests` as arrays on `/spaces/{spaceCode}`.&#x20;

SPACES_BACKEND.md



This is workable for a small prototype, but creates problems as teams grow.

| Problem                                         | Real consequence                                                          | Recommended fix                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Growing member arrays                           | Document grows and eventually encounters Firestore's 1 MiB document limit | Store each member in a subcollection                          |
| Multiple administrators updating the same array | Updates can conflict or overwrite changes                                 | Use individual member documents and transactions where needed |
| Last-active updates touching shared space data  | Unnecessary writes and contention on the same document                    | Store activity in the member record                           |
| Role updates mixed with workspace settings      | Harder to enforce least privilege                                         | Separate workspace metadata from membership administration    |

A better structure is:

```
spaces/{spaceId}
  name
  ownerUid
  createdAt
  status

spaces/{spaceId}/members/{uid}
  role
  status
  joinedAt
  invitedByUid
  lastActiveAt

spaces/{spaceId}/properties/{propertyId}
spaces/{spaceId}/leads/{leadId}
spaces/{spaceId}/siteVisits/{visitId}
spaces/{spaceId}/settings/{settingId}
```

This is not merely a database organization preference. It lets each member's access and status be checked independently.

### Issue 3: One invitation document per email cannot represent multiple pending invitations

The documented invitation structure uses `/user_invites/{email}` and stores a single `spaceCode`, role and invitation status.&#x20;

SPACES_BACKEND.md



Consider this realistic scenario:

- Agency A invites an agent.
- Agency B invites the same agent before the first invitation is accepted.
- Both invitations use the same email-keyed document.

The second write can overwrite the first invitation. That conflicts with the product's stated ability to work with multiple spaces.

Professional solution: give every invitation its own ID.

```
spaceInvites/{inviteId}
  spaceId
  emailNormalized
  role
  invitedByUid
  status
  createdAt
  expiresAt
  acceptedByUid
  acceptedAt
```

Implement invitations with explicit states: `pending`, `accepted`, `expired`, `revoked` and, where useful, `declined`.

Acceptance must verify the user's authenticated identity and the invitation's eligibility. Use server-side validation for role assignment, expiry, revocation and membership creation.

### Issue 4: Invitation creation and acceptance are vulnerable to partial updates

The documented invitation flow updates the workspace, invitation index and user-space registry as separate operations. The acceptance flow then updates membership and invitation status.&#x20;

SPACES_BACKEND.md



If one operation fails after another succeeds, the database could show conflicting states, such as an invitation marked pending even though membership was created.

Professional solution: implement a trusted invitation workflow that validates access and commits related updates atomically wherever the operation requires it. Firestore transactions and batched writes support atomic changes, with transactions appropriate where current document state must be checked before writing.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://firebase.google.com\&sz=32)

Firebase



The flow should be:

1. Owner submits the email and intended role.
2. Backend verifies the owner or administrator's permission.
3. Backend creates the invitation and records the audit event.
4. Invitee signs in with the intended account.
5. Backend validates the invitation and creates membership.
6. Invitation status is updated as part of the same logical operation.
7. Both workspaces and users receive the resulting real-time updates.

Do not treat a successful UI update as proof that all database writes succeeded.

### Issue 5: `user_spaces` can become a conflicting source of truth

The design uses `/user_spaces/{email}` with a `spaces` array and one `activeSpaceCode`.&#x20;

SPACES_BACKEND.md



Potential failures include:

- Two invitations update a user's space list at nearly the same time, and one update overwrites the other.
- A user switches spaces on one device while another device still shows a stale selection.
- The invitation registry, workspace membership and user-space list disagree about the user's access.

Professional solution: use Firebase UID as the user identity and keep the authoritative membership record under each workspace. A separate user-space index can accelerate the workspace selector, but it must be treated as a navigation index, not proof of authorization. Maintain that index through trusted server-side operations.

For the active workspace, choose and document one persistence policy: device-local preference or cross-device synchronized preference. Do not mix the two accidentally.

### Issue 6: Role checks exist in the frontend, but the database must enforce them

The frontend derives `isOwner`, `currentRole` and other permissions from workspace data.&#x20;

SPACES_FRONTEND.md



These signals are useful for rendering the correct buttons. They are not sufficient to secure operations.

Professional solution: define an explicit permission matrix and enforce it in Firestore rules or trusted backend functions.

| Operation                     | Owner                               | Admin             | Agent                              |
| ----------------------------- | ----------------------------------- | ----------------- | ---------------------------------- |
| Read workspace data           | Yes                                 | Yes               | Yes, for authorized workspace data |
| Create/edit listings          | Yes                                 | Yes               | Based on business policy           |
| Invite agents                 | Yes                                 | Yes, if permitted | No                                 |
| Promote another user to admin | Yes                                 | No, by default    | No                                 |
| Transfer or delete workspace  | Yes, with safeguards                | No                | No                                 |
| Revoke owner access           | Through explicit ownership transfer | No                | No                                 |

This table is a recommended starting policy, not an existing guarantee. Finalize the business rules before implementing them.

Also protect against removing the last owner, changing one's own role to escalate privileges, and revoking a member's access through an unauthorized client request.

### Issue 7: The serialization helper does not do what its description claims

The backend guide describes `cleanForFirestore()` as stripping `undefined` values, but its example replaces them with `null`:

```
JSON.parse(
  JSON.stringify(obj, (key, value) =>
    value === undefined ? null : value
  )
);
```

SPACES_BACKEND.md

That is a functional mismatch. For example, an absent optional property can become an explicit null value. The JSON round-trip can also convert dates to strings and alter other non-JSON data types.

Professional solution: use a targeted recursive sanitizer that omits unsupported `undefined` fields while preserving supported Firestore types. Add unit tests for nested objects, arrays, dates, timestamps and optional fields.

### Issue 8: The common workspace and personal workspace need explicit lifecycle rules

The guides describe automatically seeding a common agency space and falling back to `SKP-CHN-4829`. They also define personal mode using `personal-{uid}`, which is not documented as a distinct tenant type in the backend schema.&#x20;

SPACES_BACKEND.md

SPACES_FRONTEND.md

SPACES_FRONTEND.md



Why this matters: a new customer should not have to guess whether a workspace is private, shared with their agency, or shared with every user of the application. Synthetic personal-space IDs can also create inconsistencies if their provisioning and access rules differ from normal workspaces.

Professional solution: make personal and team workspaces explicit, with independent membership and authorization rules. New users should create or join a workspace, rather than being silently placed in a common agency workspace. If a genuine shared demo workspace is required, keep it separate and expose only intentionally public demo data.

### Issue 9: Some operational guarantees are stronger than the documentation proves

The guide calls property and lead deletion atomic, but only describes operations targeting individual documents. That alone does not establish that a workflow involving several documents commits atomically.&#x20;

SPACES_BACKEND.md



Professional solution: use a batch or transaction when a logical operation requires multiple document changes to succeed together. Add audit records for membership changes, invitations, role changes and deletions. Record the actor, target, action, timestamp and outcome without logging unnecessary sensitive information.

Firestore recommends avoiding excessive contention on single documents and documents a hard document-size limit of 1 MiB. Those constraints reinforce the need to split frequently updated membership data into separate documents.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://firebase.google.com\&sz=32)

Firebase

+2



## 2. UI flows that clients are likely to dislike

These issues concern usability and trust, not merely visual polish. Some are clear design concerns in the guides; the presence or absence of particular error states in the actual app still needs to be checked.

| Priority | Current flow or design                                                           | Why clients may dislike it                                                                                       | Professional solution                                                                                                      |
| -------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| High     | New users fall back to a common workspace                                        | It is unclear where private business data belongs                                                                | Provide explicit onboarding: accept invite, join a workspace, create an agency, or start a private workspace               |
| High     | Workspace access depends on a URL code or stored code before the space is loaded | Users can encounter loading confusion, and stale or unauthorized space selection can complicate state management | Resolve authentication, membership and access before attaching data listeners                                              |
| High     | Workspace switching is a code-entry action                                       | A code identifies a destination, but does not establish permission to enter it                                   | Show authorized workspaces first; offer a separate join-by-invitation flow                                                 |
| Medium   | Most workspace actions are inside the profile-avatar dropdown                    | Users must discover a hidden menu for switching workspaces and managing an entire team                           | Give workspace switching a dedicated, visible control and put administration in Team Settings                              |
| Medium   | The dropdown combines create, switch, copy-code, members and invitations         | Too many unrelated actions make the interface harder to scan                                                     | Separate navigation, workspace creation and team administration                                                            |
| Medium   | Invitation banner says “Zero Approval Needed” and “Instant Access”               | It can imply access is already granted even though the user must explicitly accept                               | State who invited the user, which workspace they are joining, which account is signed in and what happens after acceptance |
| Medium   | Personal mode and agency mode are presented as a toggle                          | Users may not understand which data other team members can see                                                   | Clearly label the workspace's privacy and sharing scope                                                                    |
| Medium   | Pending users and active users appear in the same directory workflow             | Invitations can be mistaken for completed memberships                                                            | Use distinct Pending, Active, Expired and Revoked statuses with relevant actions                                           |
| Medium   | Invitation and membership actions are primarily described as real-time updates   | Users need meaningful feedback when a request fails, is rejected or is still processing                          | Add success/error feedback, retry actions and clear loading and empty states                                               |
| Medium   | Role changes and revocation are available in the management panel                | Accidental removal or privilege changes can disrupt an agency                                                    | Add confirmation, permission explanations, protection for the last owner and an audit history                              |

The profile dropdown, invitation banner and settings modal are documented in the frontend guide.&#x20;

SPACES_FRONTEND.md



### The most important frontend bug risk: switching workspaces before access is resolved

Your initialization flow prioritizes a URL code, then local storage, then the common workspace, and synchronously sets the target space before receiving the Firestore snapshot.&#x20;

SPACES_FRONTEND.md



Your real-time synchronization then reacts to changes in authentication, access state, space code and personal/agency mode.&#x20;

SPACES_FRONTEND.md



That is a sensible reactive design in principle, but the sequence needs strict state management. A URL parameter and local-storage value are untrusted input, not proof of membership.

The production-safe flow is:

1\. Resolve identity

Wait for Firebase Auth to finish initializing

2\. Resolve intended workspace

Validate the invite, selected space or saved preference

3\. Check membership and permissions

Use trusted authorization, backed by Firestore rules

4\. Attach workspace listeners

Only after access is resolved; clear old state and guard against stale responses

5\. Render the workspace

Show data, permission errors, empty states or recovery actions

If access is revoked or the user switches spaces, unsubscribe from previous listeners, clear workspace-specific state and prevent late asynchronous results from repopulating the wrong workspace. Firestore rules must still reject unauthorized operations independently of this frontend behavior.

## 3. Recommended production architecture

The following is the design I would recommend for SkyPearl Spaces before expanding it to more real-estate agencies.

### A. Correct the Firestore schema

### Proposed data model

`spaces/{spaceId}`

Workspace metadata, owner UID, name and lifecycle status.

`members/{uid}`

Role, membership status, join date and activity. One document per member.

`properties/{propertyId}`

Listing data with appropriate create, update and delete permissions.

`leads/{leadId}`

CRM records with workspace-level isolation and role-based access.

`siteVisits/{visitId}`

Site visits, assigned agents and scheduling information.

`accessRequests/{requestId}` and `auditLogs/{eventId}`

Access requests and a history of security-sensitive changes.

Separate global collections

`spaceInvites/{inviteId}` stores individual invitations. `users/{uid}/spaceIndex/{spaceId}` can provide a user's workspace list, while `users/{uid}/preferences` stores the preferred workspace.

The distinction that matters most: membership documents determine authorization; the user-space index helps render the interface. An outdated index must never grant access.

### B. Use a trusted backend for sensitive operations

You can retain Angular and Firestore real-time listeners. Moving every read through an API is not necessary if Firestore rules enforce access correctly.

Use callable Cloud Functions or another trusted backend for security-sensitive operations such as:

- Creating a workspace and its initial owner membership.
- Sending invitations and assigning roles.
- Accepting invitations and updating membership.
- Approving or rejecting access requests.
- Revoking memberships and transferring workspace ownership.

The backend must verify the Firebase identity, membership, role and invitation state. Server-side Firebase Admin SDK operations bypass Firestore Security Rules, so the trusted code must enforce these checks itself.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://firebase.google.com\&sz=32)

Firebase

+1



### C. Correct the permission model

Define the rules around a few stable concepts:

- Authenticated user: the identity has been established through Firebase Authentication.
- Active member: the UID has a valid active membership in the target space.
- Workspace administrator: the active member has an explicitly authorized administrative role.
- Invitation recipient: the signed-in identity matches the intended invitation recipient and satisfies the invitation's validity conditions.

Do not let the browser independently decide whether someone is an owner based on a matching email string. Use UID as the canonical identity; use normalized email for invitation delivery and matching.

The rules must explicitly protect workspace metadata, properties, leads, site visits, member records and invitation records. Avoid broad catch-all grants.

## 4. Redesign the user journey

The customer-facing product should make three things immediately obvious: which workspace they are in, what data they can access, and what action they should take next.

## Proposed client flow

1\. Sign in and resolve access

Authenticate with Google. If invited, show the invitation and intended account. Otherwise, show the workspaces the user can actually access.

2\. Create, join or select

A new user can create an agency, accept an invitation, join through an authorized process or create a private workspace. Never silently join a shared team.

3\. Enter only after authorization

Verify membership, then attach the inventory and CRM listeners. Show an understandable error if access is denied.

4\. Manage the team in one place

Workspace Settings contains members, invitations, access requests, roles and audit history. The main navigation remains focused on daily work.

### Recommended navigation layout

SkyPearl Realty

Current workspace: Chennai Central

Workspace switcher

Shows workspace name, active status and the user's role. Search or enter an invitation code through a separate join action.

Team Settings

Members, pending invitations, access requests, role changes and revocation.

Profile menu

Account details, personal preferences and sign-out. Keep workspace administration out of this menu.

This is a conceptual layout, not a claim about the current rendered application.

For invitation acceptance, use clearer copy such as:

> You've been invited to Chennai Central
>
> Invited by: Workspace Owner Account: `teammate@gmail.com` Role: Agent
>
> Accept invitation

The interface should distinguish pre-approved by the owner from already joined. If the signed-in account differs from the invited email, provide an account-switching action instead of an ambiguous failure.

## 5. Implementation and release plan

Do these in priority order. Rebuilding the entire UI before correcting the security rules would be the wrong use of engineering time.

| Phase                  | Work                                                                                                           | Acceptance criteria                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| P0 · Security          | Verify deployed rules, remove public access grants, define authorization policy and audit the current database | Anonymous and unauthorized users cannot access private tenant data                  |
| P1 · Data integrity    | Move memberships and requests to subcollections; give invitations unique IDs; normalize identity handling      | Multiple invitations and concurrent membership changes do not overwrite one another |
| P1 · Trusted workflows | Implement secure workspace creation, invitations, acceptance, roles and revocation                             | Unauthorized role escalation and partial membership transitions fail safely         |
| P2 · Frontend          | Build explicit onboarding, workspace switching and consolidated team settings                                  | Users know their active workspace, permissions and next action                      |
| P2 · State management  | Gate listeners on authorization, cancel stale subscriptions and handle errors                                  | No previous-workspace data appears after switching or revocation                    |
| P3 · Reliability       | Add emulator tests, integration tests, observability and rollout checks                                        | Security, race conditions and failure recovery are verified before release          |

### Minimum test suite before production

These are release-blocking scenarios, not optional polish.

- Security: anonymous user reads or writes a property, lead, member or invite; all unauthorized attempts must fail.
- Tenant isolation: an agent in Workspace A attempts to read, modify or delete records in Workspace B; every unauthorized operation must fail.
- Invitation concurrency: the same email is invited to two different workspaces; both invitations must remain valid independently.
- Role escalation: an agent modifies their own role or attempts to grant themselves administrative access; the operation must fail.
- Authorization races: two administrators update different members simultaneously; one change must not silently overwrite the other.
- Space switching: switch A → B → A, refresh, open multiple tabs and use a stale URL. No wrong-space records should appear or be written.
- Revocation: revoke a member while the member has the workspace open. Subsequent database operations must fail, and the frontend must clear the protected workspace state.
- Failure recovery: simulate a failed invitation or network interruption. The UI must show a retryable state without falsely claiming membership was created.
- Lifecycle safeguards: expired invitations, revoked invitations and removal of the last owner must behave according to policy.

Use Firestore Emulator tests for rules and automated integration tests for the real invitation and switching flows.

## Final recommendation

The documented design has a reasonable foundation: Angular Signals, workspace-specific data paths and Firestore snapshot listeners can support a responsive multi-tenant application.&#x20;

SPACES_FRONTEND.md



The necessary change is to stop treating a workspace code, a frontend signal or an email-keyed registry as proof of permission.

Fix the security boundary first, make membership and invitation records independently authoritative second, and redesign onboarding and workspace switching third. That sequence reduces the risk of data exposure while giving clients a predictable, professional experience.