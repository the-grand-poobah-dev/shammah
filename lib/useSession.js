'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canModerate, setCanModerate] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [ownedChurches, setOwnedChurches] = useState([]);

  const checkUserModeration = useCallback(async (userId, userProfile, userSession) => {
    if (!userId) {
      setCanModerate(false);
      setOwnedChurches([]);
      return;
    }
    const email = (userSession?.user?.email || '').toLowerCase();
    const isOwnerEmail = email.includes('juliusthandi') || email.includes('admin');
    const hasRole =
      isOwnerEmail ||
      userProfile?.role === 'platform_admin' ||
      userProfile?.role === 'church_admin' ||
      (userProfile?.badge_verified &&
        ['pastor', 'elder', 'deacon', 'reverend', 'bishop', 'apostle', 'chaplain', 'priest'].includes(userProfile?.badge));
    try {
      const { data: churches } = await supabase
        .from('churches')
        .select('id, name')
        .eq('created_by', userId);
      const isOwner = Boolean(churches && churches.length > 0);
      setOwnedChurches(churches || []);
      setCanModerate(hasRole || isOwner);
    } catch {
      setCanModerate(hasRole);
    }
  }, []);

  const loadProfile = useCallback(async (userSession) => {
    if (!userSession?.user?.id) {
      setProfile(null);
      setCanModerate(false);
      setOwnedChurches([]);
      return;
    }
    const userId = userSession.user.id;
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'display_name, role, church_id, badge, badge_verified, avatar_url, cover_url, about, location_label, onboarding_completed_at, display_name_changed_at'
      )
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      checkUserModeration(userId, data, userSession);
    } else {
      setProfile(null);
      checkUserModeration(userId, null, userSession);
    }
  }, [checkUserModeration]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        loadProfile(data.session);
      }
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!isMounted) return;
      setSession(s);
      setLoading(false);
      if (s) {
        loadProfile(s);
      } else {
        setProfile(null);
        setCanModerate(false);
        setOwnedChurches([]);
      }
    });

    return () => {
      isMounted = false;
      authSub?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    session,
    profile,
    loading,
    canModerate,
    adminMode,
    setAdminMode,
    ownedChurches,
    signOut,
  };
}

export default useSession;
