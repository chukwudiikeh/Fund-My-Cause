"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_KEY = "fmc:campaign_draft";
const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds

export interface CampaignDraftData {
  contractId: string;
  token: string;
  title: string;
  description: string;
  goal: string;
  deadline: string;
  minContribution: string;
  imageUrl: string;
  feeAddress: string;
  feeBps: string;
  step: number;
}

export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseCampaignDraftReturn {
  /** Whether a saved draft exists in localStorage */
  hasDraft: boolean;
  /** Load the saved draft data (returns null if none) */
  loadDraft: () => CampaignDraftData | null;
  /** Manually save the current form data as a draft */
  saveDraft: (data: CampaignDraftData) => void;
  /** Clear the draft from localStorage (call after successful deploy) */
  clearDraft: () => void;
  /** Current save status for UI feedback */
  saveStatus: DraftSaveStatus;
  /** Timestamp of the last successful save */
  lastSaved: Date | null;
}

/**
 * Manages campaign draft persistence in localStorage.
 * Provides auto-save every 30 seconds and manual save capability.
 */
export function useCampaignDraft(
  currentData: CampaignDraftData,
): UseCampaignDraftReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentDataRef = useRef(currentData);

  // Keep ref in sync so the interval always has the latest data
  useEffect(() => {
    currentDataRef.current = currentData;
  }, [currentData]);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      setHasDraft(raw !== null);
    } catch {
      setHasDraft(false);
    }
  }, []);

  const saveDraft = useCallback((data: CampaignDraftData) => {
    setSaveStatus("saving");
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      setHasDraft(true);
      setLastSaved(new Date());
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const loadDraft = useCallback((): CampaignDraftData | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as CampaignDraftData;
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setLastSaved(null);
      setSaveStatus("idle");
    } catch {
      // non-critical
    }
  }, []);

  // Auto-save every 30 seconds — only when the form has meaningful content
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      const data = currentDataRef.current;
      const hasContent =
        data.title.trim() ||
        data.description.trim() ||
        data.goal.trim() ||
        data.contractId.trim();

      if (hasContent) {
        saveDraft(data);
      }
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveDraft]);

  // Reset "saved" status back to "idle" after 3 seconds
  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  return { hasDraft, loadDraft, saveDraft, clearDraft, saveStatus, lastSaved };
}
