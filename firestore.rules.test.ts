/**
 * Firestore Security Rules Test Suite — "Dirty Dozen" Verification
 */
import { assertFails } from '@firebase/rules-unit-testing';

export async function runDirtyDozenTests(testEnv: any) {
  const aliceDb = testEnv.authenticatedContext('user_1', {
    email: 'alice@example.com',
    email_verified: true,
  }).firestore();

  const unverifiedAdminDb = testEnv.authenticatedContext('admin_spoof', {
    email: 'juliusthandi005@gmail.com',
    email_verified: false,
  }).firestore();

  // 1. Shadow Field Injection (isAdmin: true)
  await assertFails(
    aliceDb.collection('users').doc('user_1').set({
      uid: 'user_1',
      displayName: 'Alice',
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 2. Identity Spoofing on Create
  await assertFails(
    aliceDb.collection('prayerRequests').doc('req_1').set({
      authorId: 'user_2',
      authorName: 'Bob',
      title: 'Pray for peace',
      content: 'Need prayer',
      category: 'general',
      status: 'active',
      prayedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 3. Unverified Email Spoof
  await assertFails(
    unverifiedAdminDb.collection('users').doc('admin_spoof').set({
      uid: 'admin_spoof',
      displayName: 'Spoof',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 4. Path ID Poisoning
  await assertFails(
    aliceDb.collection('ministryNotes').doc('bad$id!').set({
      ownerId: 'user_1',
      title: 'Note',
      scriptureRef: 'John 3:16',
      body: 'For God so loved the world',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 5. String Boundary Overflow
  await assertFails(
    aliceDb.collection('ministryNotes').doc('note_1').set({
      ownerId: 'user_1',
      title: 'Note',
      scriptureRef: 'John 3:16',
      body: 'a'.repeat(5001),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // 12. Unmapped Collection Write
  await assertFails(
    aliceDb.collection('unmappedCollection').doc('doc_1').set({
      foo: 'bar',
    })
  );
}
