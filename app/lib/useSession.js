'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

// Small hook for the extra pages (categories, churches): who is signed in, and what is
// their profile? `loading` is true until we know. Also applies the saved light/dark theme.
export function useSession() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('shammah-theme');
    document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  async function reloadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, role, church_id, onboarding_completed_at')
      .eq('id', userId)
      .single();
    setProfile(data || null);
    return data || null;
  }

  useEffect(() => {
    if (session) reloadProfile(session.user.id);
    else setProfile(null);
  }, [session?.user?.id]);

  return { session, profile, setProfile, reloadProfile, loading: session === undefined };
}
