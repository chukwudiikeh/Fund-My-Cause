"use client";

import React, { useMemo } from "react";
import { Download, TrendingUp, Users, Target, Eye } from "lucide-react";
import { CampaignData } from "@/lib/soroban";

interface Props {
  campaigns: CampaignData[];
}

function stroopsToXlm(n: bigint) {
  return Number(n) / 10_000_000;
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
      <div className="p-2 rounded-xl bg-indigo-900/40 text-indigo-400">{icon}</div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// Minimal bar chart using divs — no external chart library needed
function ContributionBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 truncate text-gray-400 text-xs">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 w-16 text-right">{value.toLocaleString()} XLM</span>
    </div>
  );
}

export function AnalyticsDashboard({ campaigns }: Props) {
  const stats = useMemo(() => {
    const totalRaised = campaigns.reduce((s, c) => s + stroopsToXlm(c.totalRaised), 0);
    const totalGoal = campaigns.reduce((s, c) => s + stroopsToXlm(c.goal), 0);
    const active = campaigns.filter((c) => c.status === "Active").length;
    const successful = campaigns.filter((c) => c.status === "Successful").length;
    return { totalRaised, totalGoal, active, successful };
  }, [campaigns]);

  const maxRaised = useMemo(
    () => Math.max(...campaigns.map((c) => stroopsToXlm(c.totalRaised)), 1),
    [campaigns]
  );

  const exportCsv = () => {
    const header = "Title,Status,Raised (XLM),Goal (XLM),Deadline,Contract ID";
    const rows = campaigns.map((c) =>
      [
        `"${c.title.replace(/"/g, '""')}"`,
        c.status,
        stroopsToXlm(c.totalRaised).toFixed(2),
        stroopsToXlm(c.goal).toFixed(2),
        new Date(Number(c.deadline) * 1000).toISOString().split("T")[0],
        c.contractId,
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaigns-analytics.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <TrendingUp size={32} className="mx-auto mb-3 opacity-40" />
        <p>No campaign data to analyze yet.</p>
      </div>
    );
  }

  const conversionRate = stats.totalGoal > 0
    ? ((stats.totalRaised / stats.totalGoal) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Raised" value={`${stats.totalRaised.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM`} icon={<TrendingUp size={18} />} />
        <StatCard label="Active Campaigns" value={String(stats.active)} icon={<Eye size={18} />} />
        <StatCard label="Successful" value={String(stats.successful)} icon={<Target size={18} />} />
        <StatCard label="Avg. Conversion" value={`${conversionRate}%`} icon={<Users size={18} />} />
      </div>

      {/* Contribution timeline (per campaign bar chart) */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Raised per Campaign</h3>
        <div className="space-y-3">
          {campaigns.map((c) => (
            <ContributionBar
              key={c.contractId}
              label={c.title}
              value={stroopsToXlm(c.totalRaised)}
              max={maxRaised}
            />
          ))}
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Conversion Funnel</h3>
        <div className="flex flex-col gap-2">
          {[
            { label: "Campaigns Created", value: campaigns.length, pct: 100 },
            { label: "Active", value: stats.active, pct: campaigns.length > 0 ? (stats.active / campaigns.length) * 100 : 0 },
            { label: "Reached Goal", value: stats.successful, pct: campaigns.length > 0 ? (stats.successful / campaigns.length) * 100 : 0 },
          ].map((step) => (
            <div key={step.label} className="flex items-center gap-3 text-sm">
              <span className="w-36 text-gray-400 text-xs">{step.label}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-3 rounded-full transition-all"
                  style={{ width: `${step.pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right">{step.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>
    </div>
  );
}
