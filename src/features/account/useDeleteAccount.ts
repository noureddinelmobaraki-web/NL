import { useState, useCallback } from 'react';
import { supabase }              from '../../config/supabase';
import { useAuth }               from '../../context/AuthContext';

export type DeleteAccountStatus =
  | 'idle'
  | 'deleting'
  | 'success'
  | 'error';

export function useDeleteAccount() {
  const { user }                    = useAuth();
  const [status, setStatus]         = useState<DeleteAccountStatus>('idle');
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setStatus('deleting');
    setErrorMsg(null);

    // 1. Call the SQL function — deletes all data + auth user
    const { error: rpcError } = await supabase.rpc('delete_user_account');

    if (rpcError) {
      setStatus('error');
      setErrorMsg(rpcError.message);
      return false;
    }

    // 2. Sign out locally (session is now invalid regardless)
    await supabase.auth.signOut();

    setStatus('success');
    return true;
  }, [user]);

  const reset = useCallback(() => {
    setStatus('idle');
    setErrorMsg(null);
  }, []);

  return { deleteAccount, status, errorMsg, reset };
}
