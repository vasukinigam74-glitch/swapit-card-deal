import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSwapCredits() {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('swap_credits')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCredits(data?.swap_credits ?? 0);
    } catch (error) {
      console.error('Error fetching swap credits:', error);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Subscribe to realtime updates for the user's profile
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-credits-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'swap_credits' in payload.new) {
            setCredits(payload.new.swap_credits as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hasEnoughCredits = credits >= 1;

  const checkCredits = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase.rpc('has_swap_credits', {
      _user_id: user.id,
      _required: 1,
    });
    
    if (error) {
      console.error('Error checking credits:', error);
      return false;
    }
    
    return data ?? false;
  }, [user]);

  const deductCredit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data, error } = await supabase.rpc('deduct_swap_credit', {
      _user_id: user.id,
      _amount: 1,
    });
    
    if (error) {
      console.error('Error deducting credit:', error);
      return false;
    }
    
    if (data) {
      setCredits((prev) => Math.max(0, prev - 1));
    }
    
    return data ?? false;
  }, [user]);

  return {
    credits,
    loading,
    hasEnoughCredits,
    checkCredits,
    deductCredit,
    refetch: fetchCredits,
  };
}
