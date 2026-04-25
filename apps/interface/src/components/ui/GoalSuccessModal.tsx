"use client";

import React from "react";
import { X, Trophy, Share2, Wallet, ArrowRight } from "lucide-react";

interface GoalSuccessModalProps {
  campaignTitle: string;
  totalRaisedXlm: number;
  onClose: () => void;
  onShare: () => void;
  onWithdraw: () => void;
  /** Whether the creator has already withdrawn funds */
  alreadyWithdrawn?: boolean;
}

export function GoalSuccessModal({
  campaignTitle,
  totalRaisedXlm,
  onClose,
  onShare,
  onWithdraw,
  alreadyWithdrawn = false,
}: GoalSuccessModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <Trophy size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Goal Reached! 🎉</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{campaignTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Amount raised */}
        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {totalRaisedXlm.toLocaleString()} XLM
          </p>
          <p className="text-sm text-green-700 dark:text-green-500 mt-1">raised in total</p>
        </div>

        {/* Next steps */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Next steps
          </p>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-bold text-indigo-600 dark:text-indigo-400">1</span>
              Share your success with supporters
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-bold text-indigo-600 dark:text-indigo-400">2</span>
              Withdraw funds to your wallet
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-bold text-indigo-600 dark:text-indigo-400">3</span>
              Deliver on your campaign promises
            </li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onShare}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition"
          >
            <Share2 size={15} /> Share Your Success
          </button>
          {!alreadyWithdrawn && (
            <button
              onClick={onWithdraw}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition"
            >
              <Wallet size={15} /> Withdraw Funds <ArrowRight size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-xl px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
