"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useComparison } from "@/context/ComparisonContext";
import { ALL_CAMPAIGNS } from "@/lib/campaigns";
import { formatXlm } from "@/lib/price";
import { Share2, X, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ComparePage() {
  const { selected, clear, toggle } = useComparison();
  const router = useRouter();
  const t = useTranslations("compare");

  const campaigns = selected
    .map((id) => ALL_CAMPAIGNS.find((c) => c.id === id))
    .filter(Boolean) as typeof ALL_CAMPAIGNS;

  const handleShare = () => {
    const url = `${window.location.origin}/compare?ids=${selected.join(",")}`;
    navigator.clipboard.writeText(url).catch(() => {});
    alert(t("copiedToClipboard"));
  };

  if (campaigns.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <p className="text-gray-400 mb-4">{t("noSelection")}</p>
          <Link href="/campaigns" className="text-indigo-400 hover:text-indigo-300 underline">
            {t("browseCampaigns")}
          </Link>
        </div>
      </main>
    );
  }

  const rows: { label: string; render: (c: typeof ALL_CAMPAIGNS[0]) => React.ReactNode }[] = [
    { label: t("status"), render: (c) => c.status },
    { label: t("raised"), render: (c) => formatXlm(c.raised, null) },
    { label: t("goal"), render: (c) => formatXlm(c.goal, null) },
    {
      label: t("progress"),
      render: (c) => {
        const pct = c.goal > 0 ? (c.raised / c.goal) * 100 : 0;
        return (
          <div className="space-y-1">
            <ProgressBar progress={pct} />
            <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
    { label: t("deadline"), render: (c) => new Date(c.deadline).toLocaleDateString() },
    { label: t("contributors"), render: (c) => c.contributorCount ?? "—" },
    { label: t("token"), render: (c) => c.token },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <span className="text-sm text-gray-500">({campaigns.length} selected)</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm transition"
            >
              <Share2 size={14} /> {t("share")}
            </button>
            <button
              onClick={clear}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm transition"
            >
              <X size={14} /> {t("clear")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-32">{t("metric")}</th>
                {campaigns.map((c) => (
                  <th key={c.id} className="px-4 py-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-white">{c.title}</span>
                      <button
                        onClick={() => toggle(c.id)}
                        aria-label={t("removeFromComparison", { title: c.title })}
                        className="text-gray-600 hover:text-gray-300 transition flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-gray-900/40" : ""}>
                  <td className="px-4 py-3 text-gray-500 font-medium">{row.label}</td>
                  {campaigns.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-gray-200">
                      {row.render(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-600 mt-4">
          {t("selectHint")}{" "}
          <Link href="/campaigns" className="text-indigo-400 hover:underline">
            {t("browseCampaigns")}
          </Link>
        </p>
      </div>
    </main>
  );
}
