"use client";

import React, { useState, useMemo } from "react";
import {
  Code2,
  Copy,
  Check,
  Monitor,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { APP_BASE_URL } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

type Theme = "dark" | "light" | "auto";
type Size = "compact" | "standard" | "wide";

interface EmbedCodeGeneratorProps {
  campaignId: string;
  campaignTitle: string;
}

// ── Size dimensions ───────────────────────────────────────────────────────────

const SIZE_DIMS: Record<
  Size,
  { width: number; height: number; label: string }
> = {
  compact: { width: 320, height: 200, label: "Compact  320 × 200" },
  standard: { width: 380, height: 320, label: "Standard  380 × 320" },
  wide: { width: 480, height: 400, label: "Wide  480 × 400" },
};

// ── Accent presets ────────────────────────────────────────────────────────────

const ACCENT_PRESETS = [
  { label: "Indigo", value: "#6366f1" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Sky", value: "#0ea5e9" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToParam(hex: string): string {
  return hex.replace("#", "");
}

function buildEmbedUrl(
  campaignId: string,
  theme: Theme,
  size: Size,
  accent: string,
  hideImage: boolean,
): string {
  const params = new URLSearchParams({
    theme,
    size,
    accent: hexToParam(accent),
    ...(hideImage ? { hideImage: "1" } : {}),
  });
  return `${APP_BASE_URL}/embed/${campaignId}?${params.toString()}`;
}

function buildIframeCode(
  embedUrl: string,
  size: Size,
  campaignTitle: string,
): string {
  const { width, height } = SIZE_DIMS[size];
  return `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  style="border:none;border-radius:16px;overflow:hidden;"
  title="${campaignTitle} — Fund-My-Cause"
  loading="lazy"
  allow="payment"
></iframe>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EmbedCodeGenerator({
  campaignId,
  campaignTitle,
}: EmbedCodeGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [size, setSize] = useState<Size>("standard");
  const [accent, setAccent] = useState("#6366f1");
  const [customAccent, setCustomAccent] = useState("#6366f1");
  const [hideImage, setHideImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">(
    "desktop",
  );

  const embedUrl = useMemo(
    () => buildEmbedUrl(campaignId, theme, size, accent, hideImage),
    [campaignId, theme, size, accent, hideImage],
  );

  const iframeCode = useMemo(
    () => buildIframeCode(embedUrl, size, campaignTitle),
    [embedUrl, size, campaignTitle],
  );

  const { width, height } = SIZE_DIMS[size];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the textarea
    }
  };

  const handleAccentPreset = (hex: string) => {
    setAccent(hex);
    setCustomAccent(hex);
  };

  const handleCustomAccent = (hex: string) => {
    setCustomAccent(hex);
    setAccent(hex);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
          bg-gray-100 dark:bg-gray-800
          text-gray-700 dark:text-gray-300
          hover:bg-gray-200 dark:hover:bg-gray-700
          transition"
        aria-label="Get embed code for this campaign"
      >
        <Code2 size={15} />
        Embed Widget
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-indigo-500" aria-hidden="true" />
            <h2
              id="embed-modal-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Embed Widget
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close embed widget dialog"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800">
          {/* ── Left: Options ── */}
          <div className="px-6 py-5 space-y-5">
            {/* Theme */}
            <fieldset>
              <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Theme
              </legend>
              <div className="flex gap-2">
                {(["dark", "light", "auto"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    aria-pressed={theme === t}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition border ${
                      theme === t
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Size */}
            <fieldset>
              <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Size
              </legend>
              <div className="space-y-1.5">
                {(
                  Object.entries(SIZE_DIMS) as [
                    Size,
                    (typeof SIZE_DIMS)[Size],
                  ][]
                ).map(([s, cfg]) => (
                  <label
                    key={s}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${
                      size === s
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="embed-size"
                      value={s}
                      checked={size === s}
                      onChange={() => setSize(s)}
                      className="accent-indigo-600"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 capitalize font-medium">
                      {s}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {cfg.width} × {cfg.height}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Accent colour */}
            <fieldset>
              <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Accent Colour
              </legend>
              <div className="flex flex-wrap gap-2 mb-2">
                {ACCENT_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleAccentPreset(p.value)}
                    aria-label={`${p.label} accent`}
                    aria-pressed={accent === p.value}
                    className={`w-7 h-7 rounded-full border-2 transition ${
                      accent === p.value
                        ? "border-white scale-110 shadow-md"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: p.value }}
                  />
                ))}
                {/* Custom colour picker */}
                <label
                  className="w-7 h-7 rounded-full border-2 border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-gray-600 dark:hover:border-gray-400 transition overflow-hidden"
                  aria-label="Custom accent colour"
                  title="Custom colour"
                >
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => handleCustomAccent(e.target.value)}
                    className="opacity-0 absolute w-0 h-0"
                  />
                  <span className="text-[10px] text-gray-400">+</span>
                </label>
              </div>
              <p className="text-xs text-gray-400 font-mono">{accent}</p>
            </fieldset>

            {/* Hide image toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideImage}
                onChange={(e) => setHideImage(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Hide hero image
              </span>
            </label>
          </div>

          {/* ── Right: Preview + Code ── */}
          <div className="px-6 py-5 space-y-4">
            {/* Viewport toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Preview
              </span>
              <div
                role="group"
                aria-label="Preview viewport"
                className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800"
              >
                <button
                  type="button"
                  onClick={() => setPreviewViewport("desktop")}
                  aria-pressed={previewViewport === "desktop"}
                  aria-label="Desktop preview"
                  className={`p-1.5 rounded-md transition ${
                    previewViewport === "desktop"
                      ? "bg-white dark:bg-gray-700 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  }`}
                >
                  <Monitor size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport("mobile")}
                  aria-pressed={previewViewport === "mobile"}
                  aria-label="Mobile preview"
                  className={`p-1.5 rounded-md transition ${
                    previewViewport === "mobile"
                      ? "bg-white dark:bg-gray-700 shadow-sm"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  }`}
                >
                  <Smartphone size={13} />
                </button>
              </div>
            </div>

            {/* Live iframe preview */}
            <div
              className={`flex justify-center items-start overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 p-3 ${
                previewViewport === "mobile" ? "max-w-[200px] mx-auto" : ""
              }`}
            >
              <iframe
                key={embedUrl} // re-mount on URL change
                src={embedUrl}
                width={previewViewport === "mobile" ? 180 : width}
                height={
                  previewViewport === "mobile"
                    ? Math.round(height * 0.75)
                    : height
                }
                style={{
                  border: "none",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
                title="Widget preview"
                loading="lazy"
              />
            </div>

            {/* Open in new tab */}
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-500 hover:underline"
            >
              <ExternalLink size={11} />
              Open widget in new tab
            </a>

            {/* Code block */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Embed Code
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
                    bg-gray-100 dark:bg-gray-800
                    text-gray-600 dark:text-gray-400
                    hover:bg-gray-200 dark:hover:bg-gray-700
                    transition"
                  aria-label="Copy embed code"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-green-500" />
                      <span className="text-green-600 dark:text-green-400">
                        Copied!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre
                className="text-[11px] leading-relaxed font-mono bg-gray-950 dark:bg-black text-gray-300 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all select-all"
                aria-label="Iframe embed code"
              >
                {iframeCode}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
