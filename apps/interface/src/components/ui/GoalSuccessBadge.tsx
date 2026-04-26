"use client";

import React from "react";
import { Trophy } from "lucide-react";

interface GoalSuccessBadgeProps {
  totalRaisedXlm: number;
}

export function GoalSuccessBadge({ totalRaisedXlm }: GoalSuccessBadgeProps) {
  return (
    <div
      role="status"
      aria-label="Campaign goal reached"
      className="flex items-center gap-3 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 dark:border-green-700 dark:bg-green-900/20"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/50">
        <Trophy size={18} className="text-green-600 dark:text-green-400" />
      </div>
      <div>
        <p className="font-semibold text-green-800 dark:text-green-300">Goal Reached! 🎉</p>
        <p className="text-sm text-green-700 dark:text-green-400">
          {totalRaisedXlm.toLocaleString()} XLM raised — fully funded
        </p>
      </div>
    </div>
  );
}
