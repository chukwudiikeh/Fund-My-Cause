import { useState, useEffect, useCallback } from "react";
import { fetchCampaign, type CampaignData } from "@/lib/soroban";
import { isValidContractId } from "@/lib/validation";

interface UseCampaignResult {
  info: CampaignData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCampaign(contractId: string): UseCampaignResult {
  const [info, setInfo] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Validate contract ID format early
    if (!isValidContractId(contractId)) {
      if (!cancelled) {
        setError(`Invalid contract ID format: ${contractId}`);
        setLoading(false);
      }
      return;
    }

    fetchCampaign(contractId)
      .then((data) => { if (!cancelled) { setInfo(data); setLoading(false); } })
      .catch((e: unknown) => { if (!cancelled) { setError(e instanceof Error ? e.message : String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [contractId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { info, loading, error, refresh };
}
