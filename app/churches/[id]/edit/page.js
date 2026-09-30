'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabaseClient';
import ChurchForm from '../../../components/ChurchForm';
import PageHeader from '../../../components/PageHeader';
import { CHURCH_FIELDS } from '../../../lib/churchConfig';
import { useSession } from '../../../lib/useSession';

export default function EditChurchPage() {
  const { id } = useParams();
  const { session, profile, loading } = useSession();
  const [church, setChurch] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    if (!session) return;
    supabase.from('churches').select(CHURCH_FIELDS).eq('id', id).maybeSingle().then(({ data }) => setChurch(data || null));
  }, [id, session?.user?.id]);

  const canEdit =
    church && session && (church.created_by === session.user.id || profile?.role === 'platform_admin');

  return (
    <div className="shell">
      <PageHeader title="Edit church" backHref={`/churches/${id}`} />
      <main className="feed">
        {(loading || (session && church === undefined)) && <p className="mut cx-loading">Loading…</p>}
        {!loading && !session && (
          <div className="empty-state">
            <h2>Please sign in</h2>
            <Link href="/" className="signin-btn">Go to sign in</Link>
          </div>
        )}
        {church === null && (
          <div className="empty-state">
            <h2>Church not found</h2>
            <Link href="/churches" className="signin-btn">Browse churches</Link>
          </div>
        )}
        {church && !canEdit && (
          <div className="empty-state">
            <h2>Only the church owner can edit this page</h2>
            <Link href={`/churches/${id}`} className="signin-btn">Back to the church</Link>
          </div>
        )}
        {canEdit && <ChurchForm session={session} profile={profile} church={church} />}
      </main>
    </div>
  );
}
