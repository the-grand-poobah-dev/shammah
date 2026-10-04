# Shammah Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All unmapped paths under `/databases/{database}/documents/{document=**}` are strictly denied (`allow read, write: if false;`).
2. **Verified Authentication**: Every write (`create`, `update`, `delete`) requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates the path document ID via `isValidId(id)` (`size >= 1 && size <= 128 && matches('^[a-zA-Z0-9_\\-]+$')`).
4. **UserProfile (`/users/{userId}`)**:
   - `uid` must strictly equal `request.auth.uid` and `userId`.
   - No PII fields (`email`, `phone`, `address`) or RBAC fields (`role`, `isAdmin`) are permitted in the schema (`hasOnly(['uid', 'displayName', 'photoURL', 'churchName', 'createdAt', 'updatedAt'])`).
   - `createdAt` and `uid` are immutable on update.
5. **PrayerRequest (`/prayerRequests/{requestId}`)**:
   - `authorId` must strictly equal `request.auth.uid` on create and remain immutable on update.
   - `authorId` must reference an existing `/users/$(incoming().authorId)` document or be created by the verified owner.
   - Once `status == 'answered'` (terminal state), no further non-admin updates are permitted.
   - Tier 1 (Author/Admin) can update content/title/status; Tier 2 (Verified Fellowship Member) can only increment `prayedCount` by +1 (`affectedKeys().hasOnly(['prayedCount', 'updatedAt'])`).
6. **MinistryNote (`/ministryNotes/{noteId}`)**:
   - Strictly isolated private user notes: `get`, `list`, `create`, `update`, `delete` are restricted to `ownerId == request.auth.uid`.
   - `allow list` enforces `resource.data.ownerId == request.auth.uid`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Shadow Field Injection)**: Creating `/users/user_1` with `{ uid: 'user_1', displayName: 'Grace', isAdmin: true, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> `PERMISSION_DENIED`.
2. **Payload 2 (Identity Spoofing on Create)**: Creating `/prayerRequests/req_1` as `user_1` with `authorId: 'user_2'` -> `PERMISSION_DENIED`.
3. **Payload 3 (Unverified Email Spoof)**: Writing as `juliusthandi005@gmail.com` with `email_verified: false` -> `PERMISSION_DENIED`.
4. **Payload 4 (Path ID Poisoning)**: Creating `/prayerRequests/invalid$id!@#` -> `PERMISSION_DENIED`.
5. **Payload 5 (String Boundary Overflow / Denial of Wallet)**: Creating `/ministryNotes/note_1` with `body` of 10,000 chars (`> 5000`) -> `PERMISSION_DENIED`.
6. **Payload 6 (Timestamp Forgery)**: Creating `/prayerRequests/req_1` with a past client timestamp (`createdAt != request.time`) -> `PERMISSION_DENIED`.
7. **Payload 7 (Immortal Field Mutation)**: Updating `/prayerRequests/req_1` to change `authorId` or `createdAt` -> `PERMISSION_DENIED`.
8. **Payload 8 (Terminal State Bypass)**: Updating `/prayerRequests/req_1` when `existing().status == 'answered'` as non-admin -> `PERMISSION_DENIED`.
9. **Payload 9 (Tier-2 Privilege Escalation)**: Non-owner updating `title` alongside `prayedCount` on `/prayerRequests/req_1` -> `PERMISSION_DENIED`.
10. **Payload 10 (Value Poisoning on Update)**: Updating `prayedCount` with a string `'100'` instead of an integer -> `PERMISSION_DENIED`.
11. **Payload 11 (Cross-User Private Note Read)**: User `user_2` attempting `get` or `list` on `/ministryNotes` where `ownerId == 'user_1'` -> `PERMISSION_DENIED`.
12. **Payload 12 (Unmapped Collection Write)**: Writing to `/unmappedCollection/doc_1` -> `PERMISSION_DENIED`.
