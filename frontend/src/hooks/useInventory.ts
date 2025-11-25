import { useCallback, useEffect, useState } from 'react';
import { fetchVehicleInventory } from '../lib/inventory';
import type { VehicleInventoryRow } from '../types/vehicle';

interface UseInventoryState {
  rows: VehicleInventoryRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useInventory = (chainId?: number | null): UseInventoryState => {
  const [rows, setRows] = useState<VehicleInventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!chainId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchVehicleInventory(chainId);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    if (!chainId) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    void refresh();
  }, [chainId, refresh]);

  return { rows, loading, error, refresh };
};
