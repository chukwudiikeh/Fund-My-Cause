"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  Eye,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { DEFAULT_HERO_IMAGE } from "@/lib/constants";
import { formatAddress } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PreviewData {
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
  creatorAddress: string;
}

type ViewportMode = "desktop" | "mobile";

interface CampaignPreviewProps {
  data: PreviewData;
  onEdit: () => void;
  onDeploy: () => void;
  deployDisabled?: boolean;
  deployPending?: boolean;
}

// ── Disclaimer Banner ─────────────────────────────────────────────────────────

function PreviewDisclaimer() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 px-4 py-3 rounded-xl
        bg-amber-50 dark:bg-amber-950/40
        border border-amber-200 dark:border-amber-800"
    >
      <AlertTriangle
        size={16}
        className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <p className="text-sm text-amber-700 dark:text-amber-300">
        <span className="font-semibold">Preview mode</span> — this is how your
        campaign will appear to contributors. No data has been submitted to the
        blockchain yet.
      </p>
    </div>
  );
}

// ── Viewport Toggle ───────────────────────────────────────────────────────────

function ViewportToggle({
  mode,
  onChange,
}: {
  mode: ViewportMode;
  onChange: (m: ViewportMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Preview viewport"
      className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800"
    >
      <button
        type="button"
        onClick={() => onChange("desktop")}
        aria-pressed={mode === "desktop"}
        aria-label="Desktop preview"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
          mode === "desktop"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <Monitor size={13} />
        Desktop
      </button>
      <button
        type="button"
        onClick={() => onChange("mobile")}
        aria-pressed={mode === "mobile"}
        aria-label="Mobile preview"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
          mode === "mobile"
            ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <Smartphone size={13} />
        Mobile
      </button>
    </div>
  );
}

// ── Preview Content ───────────────────────────────────────────────────────────

function PreviewContent({ data }: { data: PreviewData }) {
  const goalNum = Number(data.goal) || 0;
  const deadlineIso = data.deadline
    ? new Date(data.deadline).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const heroSrc = data.imageUrl
    ? `https://ipfs.io/ipfs/${data.imageUrl}`
    : DEFAULT_HERO_IMAGE;

  return (
    <article aria-label="Campaign preview">
      {/* Hero image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroSrc}
        alt={data.title || "Campaign image"}
        className="w-full h-48 object-cover rounded-t-2xl"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = DEFAULT_HERO_IMAGE;
        }}
      />

      <div className="p-6 space-y-6">
        {/* Title + creator */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.title || (
              <span className="text-gray-400 italic">Untitled Campaign</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            by{" "}
            <span className="font-mono" title={data.creatorAddress}>
              {data.creatorAddress
                ? formatAddress(data.creatorAddress)
                : "your wallet"}
            </span>
          </p>
        </div>

        {/* Progress — always 0 for a draft */}
        <div className="space-y-2">
          <ProgressBar progress={0} />
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>0 XLM raised</span>
            <span>{goalNum.toLocaleString()} XLM goal</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              0
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Contributors</p>
          </div>
          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.minContribution || "1"} XLM
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Min. pledge</p>
          </div>
          <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-3">
            <CountdownTimer deadline={deadlineIso} />
            <p className="text-xs text-gray-500 mt-0.5">Remaining</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {data.description || (
            <span className="text-gray-400 italic">
              No description provided.
            </span>
          )}
        </p>

        {/* Platform fee note */}
        {data.feeAddress && data.feeBps && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Platform fee: {(Number(data.feeBps) / 100).toFixed(2)}% on
            withdrawal
          </p>
        )}

        {/* Pledge button — disabled in preview */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full py-3 rounded-xl font-medium bg-indigo-600 opacity-50 text-white cursor-not-allowed"
        >
          Pledge Now
        </button>
      </div>
    </article>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CampaignPreview({
  data,
  onEdit,
  onDeploy,
  deployDisabled = false,
  deployPending = false,
}: CampaignPreviewProps) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <PreviewDisclaimer />

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Eye size={15} aria-hidden="true" />
          <span>Campaign Preview</span>
        </div>
        <ViewportToggle mode={viewport} onChange={setViewport} />
      </div>

      {/* Preview frame */}
      <div
        className={`mx-auto transition-all duration-300 ${
          viewport === "mobile" ? "max-w-sm" : "max-w-3xl"
        }`}
      >
        <div
          className={`
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-700
            rounded-2xl overflow-hidden shadow-sm
            ${viewport === "mobile" ? "ring-4 ring-gray-300 dark:ring-gray-700" : ""}
          `}
        >
          {/* Mobile notch decoration */}
          {viewport === "mobile" && (
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-16 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
          )}
          <PreviewContent data={data} />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={deployPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
            text-gray-600 dark:text-gray-400
            hover:text-gray-900 dark:hover:text-white
            hover:bg-gray-100 dark:hover:bg-gray-800
            disabled:opacity-40
            transition"
        >
          <ArrowLeft size={15} />
          Edit Campaign
        </button>

        <button
          type="button"
          onClick={onDeploy}
          disabled={deployDisabled}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500
            px-6 py-2 rounded-xl text-sm font-medium text-white
            transition disabled:opacity-50"
        >
          {deployPending && <Loader2 size={15} className="animate-spin" />}
          {deployPending ? "Deploying..." : "Sign & Deploy"}
        </button>
      </div>
    </div>
  );
}
