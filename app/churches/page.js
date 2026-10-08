'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import InstitutionsView from '../components/InstitutionsView';

export default function ChurchesDirectoryPage() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user?.id) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof) setProfile(prof);
          });
      }
    });
  }, []);

  return (
    <main className="shell">
      <div className="sticky-header">
        <header className="topbar">
          <div className="brand" style={{ gap: 10 }}>
            <Link
              href="/"
              className="action-btn"
              style={{ minHeight: 36, padding: '6px 10px', textDecoration: 'none' }}
              aria-label="Back to feed"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="brand-text-wrap">
              <h1 className="brand-mark" style={{ fontSize: '18px' }}>Churches &amp; Ministries</h1>
              <span className="brand-subtext">Directory &amp; Map Locator</span>
            </div>
          </div>
        </header>
      </div>

      <div className="feed">
        <InstitutionsView session={session} currentUser={profile} />
      </div>
    </main>
  );
}
