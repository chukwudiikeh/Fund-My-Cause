"use client";

import React from "react";
import { Save, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { DraftSaveStatus } from "@/hooks/useCampaignDraft";

interface DraftIndicatorProps {
  saveStatus: DraftSaveStatus;
  lastSaved: Date | null;
  onSave: () => void;
}

/**
 * Shows the current draft save status and provides a manual save button.
 */
export function DraftIndicator({
  saveStatus,
  lastSaved,
  onSave,
}: DraftIndicatorProps) {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <span className="flex items-center gap-1.5 text-xs">
        {saveStatus === "saving" && (
          <>
            <Clock size={12} className="text-gray-400 animate-pulse" />
            <span className="text-gray-400">Saving…</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <CheckCircle2 size={12} className="text-green-500" />
            <span className="text-green-600 dark:text-green-400">
              Draft saved
            </span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <AlertCircle size={12} className="text-red-500" />
            <span className="text-red-500 dark:text-red-400">Save failed</span>
          </>
        )}
        {saveStatus === "idle" && lastSaved && (
          <>
            <CheckCircle2 size={12} className="text-gray-400" />
            <span className="text-gray-400">
              Saved at {formatTime(lastSaved)}
            </span>
          </>
        )}
      </span>

      {/* Manual save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={saveStatus === "saving"}
        aria-label="Save draft"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
          hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white
          disabled:opacity-50 transition"
      >
        <Save size={12} />
        Save draft
      </button>
    </div>
  );
}
