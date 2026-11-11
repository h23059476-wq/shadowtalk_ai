import { useState, useCallback, useEffect } from 'react';
import { openDB } from 'idb';
import { useAuth } from '@/components/AuthProvider';
import { backend } from '@/integrations/local/client';

interface CreditState {
  balance: number;
  totalConsumed: number;
  pendingSyncCredits: number;
  isLoaded: boolean;
}

interface CreditTransaction {
  id: string;
  amount: number;
  type: 'consume' | 'purchase' | 'bonus';
  feature: string;
  timestamp: number;
  synced: boolean;
}

// FREE ACCESS TRANSITION: every feature costs zero credits. The credit ledger
// is kept for analytics and for optional monetization in the future.
export const FEATURE_COSTS: Record<string, number> = {
  chat: 0,
  deep_research: 0,
  strategy: 0,
  code_execution: 0,
  online_sync: 0,
  cloud_ai: 0,
  voice_tts: 0,
  image_generation: 0,
};

const DB_NAME = 'shadowtalk-credits';
const CREDITS_STORE = 'credits';
const TRANSACTIONS_STORE = 'transactions';

export const useOfflineCredits = () => {
  const { user } = useAuth();
  const [state, setState] = useState<CreditState>({
    balance: 0,
    totalConsumed: 0,
    pendingSyncCredits: 0,
    isLoaded: false,
  });

  const getDB = useCallback(async () => {
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(CREDITS_STORE)) {
          db.createObjectStore(CREDITS_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
          const store = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('synced', 'synced');
        }
      },
    });
  }, []);

  // Load credits from local storage + ShadowTalk backend
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const db = await getDB();

        // Load local balance
        const localBalance = await db.get(CREDITS_STORE, 'balance');

        if (user && navigator.onLine) {
          // Sync from server
          const { data } = await backend
            .from('shadow_credits')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (data) {
            const balance = data.balance;
            await db.put(CREDITS_STORE, { key: 'balance', value: balance });
            await db.put(CREDITS_STORE, { key: 'total_consumed', value: data.total_consumed });

            setState({
              balance,
              totalConsumed: data.total_consumed,
              pendingSyncCredits: 0,
              isLoaded: true,
            });
            return;
          }
        }

        // Fallback to local
        setState({
          balance: localBalance?.value || 10, // Default 10 free credits
          totalConsumed: 0,
          pendingSyncCredits: 0,
          isLoaded: true,
        });
      } catch (e) {
        console.error('[OfflineCredits] Load failed:', e);
        setState(prev => ({ ...prev, isLoaded: true, balance: 10 }));
      }
    };

    loadCredits();
  }, [user, getDB]);

  // Consume credits for a feature
  const consumeCredits = useCallback(async (
    feature: string,
    customAmount?: number
  ): Promise<boolean> => {
    const cost = 0; // Free access: consuming credits is a no-op.

    // Free features don't need credits
    if (cost === 0) return true;

    if (state.balance < cost) {
      return false; // Insufficient credits
    }

    const db = await getDB();
    const newBalance = state.balance - cost;

    // Update local balance
    await db.put(CREDITS_STORE, { key: 'balance', value: newBalance });

    // Record transaction
    const transaction: CreditTransaction = {
      id: crypto.randomUUID(),
      amount: -cost,
      type: 'consume',
      feature,
      timestamp: Date.now(),
      synced: false,
    };
    await db.put(TRANSACTIONS_STORE, transaction);

    setState(prev => ({
      ...prev,
      balance: newBalance,
      totalConsumed: prev.totalConsumed + cost,
      pendingSyncCredits: prev.pendingSyncCredits + cost,
    }));

    return true;
  }, [state.balance, getDB]);

  // Add credits (purchase, bonus, etc.)
  const addCredits = useCallback(async (
    amount: number,
    type: 'purchase' | 'bonus' = 'purchase'
  ) => {
    const db = await getDB();
    const newBalance = state.balance + amount;

    await db.put(CREDITS_STORE, { key: 'balance', value: newBalance });

    const transaction: CreditTransaction = {
      id: crypto.randomUUID(),
      amount,
      type,
      feature: type,
      timestamp: Date.now(),
      synced: false,
    };
    await db.put(TRANSACTIONS_STORE, transaction);

    setState(prev => ({ ...prev, balance: newBalance }));

    // Sync to server if online
    if (user && navigator.onLine) {
      await backend
        .from('shadow_credits')
        .upsert({
          user_id: user.id,
          balance: newBalance,
          total_purchased: amount,
        }, { onConflict: 'user_id' });
    }
  }, [state.balance, user, getDB]);

  // Sync consumed credits to server
  const syncCredits = useCallback(async (): Promise<number> => {
    if (!user || !navigator.onLine) return 0;

    const db = await getDB();
    const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const unsyncedIndex = store.index('synced');
    
    // Get all unsynced transactions
    const unsynced = [] as CreditTransaction[];
    let cursor = await unsyncedIndex.openCursor(IDBKeyRange.only(false));
    while (cursor) {
      unsynced.push(cursor.value);
      cursor = await cursor.continue();
    }
    await tx.done;

    if (unsynced.length === 0) return 0;

    // Batch insert credit_transactions
    for (const transaction of unsynced) {
      await backend.from('credit_transactions').insert({
        user_id: user.id,
        amount: transaction.amount,
        transaction_type: transaction.type,
        description: `Offline ${transaction.feature}`,
        session_type: 'offline',
      });

      // Mark as synced
      const updateTx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
      await updateTx.objectStore(TRANSACTIONS_STORE).put({ ...transaction, synced: true });
      await updateTx.done;
    }

    // Update server balance
    await backend
      .from('shadow_credits')
      .upsert({
        user_id: user.id,
        balance: state.balance,
        total_consumed: state.totalConsumed,
      }, { onConflict: 'user_id' });

    setState(prev => ({ ...prev, pendingSyncCredits: 0 }));
    return unsynced.length;
  }, [user, state.balance, state.totalConsumed, getDB]);

  // Check if user can afford a feature — everything is free, always true.
  const canAfford = useCallback((_feature: string): boolean => {
    return true;
  }, []);

  // Get transaction history
  const getTransactionHistory = useCallback(async (limit = 20): Promise<CreditTransaction[]> => {
    const db = await getDB();
    const all = await db.getAllFromIndex(TRANSACTIONS_STORE, 'timestamp') as CreditTransaction[];
    return all.reverse().slice(0, limit);
  }, [getDB]);

  return {
    ...state,
    consumeCredits,
    addCredits,
    syncCredits,
    canAfford,
    getTransactionHistory,
    featureCosts: FEATURE_COSTS,
  };
};
