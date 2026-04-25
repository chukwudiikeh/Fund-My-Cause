"use client";

import React from "react";
import { PauseCircle } from "lucide-react";

interface PausedBannerProps {
  reason?: string;
}

export function PausedBanner({ reason }: PausedBannerProps) {
  return (
    <div
      role="status"
      aria-label="Campaign paused"
      className="flex items-start gap-3 rounded-2xl border border-slate-600 bg-slate-800/60 px-5 py-4"
    >
      <PauseCircle size={20} className="mt-0.5 shrink-0 text-slate-300" />
      <div>
        <p className="font-semibold text-slate-200">Campaign Paused</p>
        <p className="text-sm text-slate-400 mt-0.5">
          {reason
            ? reason
            : "This campaign has been temporarily paused by the creator. Contributions are disabled."}
        </p>
      </div>
    </div>
  );
}
