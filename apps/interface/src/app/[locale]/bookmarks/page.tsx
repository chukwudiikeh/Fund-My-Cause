"use client";

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { CampaignCard } from "@/components/ui/CampaignCard";
import { useBookmarks } from "@/context/BookmarkContext";
import { ALL_CAMPAIGNS } from "@/lib/campaigns";
import { Bookmark, Download, Upload, Bell } from "lucide-react";
import { useTranslations } from "next-intl";

function DeadlineAlert({ title, deadline }: { title: string; deadline: string }) {
  const t = useTranslations("bookmarks");
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (daysLeft > 3 || daysLeft < 0) return null;
  return (
    <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-800 rounded-xl px-4 py-2 text-sm text-amber-300">
      <Bell size={14} className="flex-shrink-0" />
      <span>{t("deadlineAlert", { title, days: daysLeft })}</span>
    </div>
  );
}

export default function BookmarksPage() {
  const { bookmarks, toggle } = useBookmarks();
  const t = useTranslations("bookmarks");

  const campaigns = bookmarks
    .map((id) => ALL_CAMPAIGNS.find((c) => c.id === id))
    .filter(Boolean) as typeof ALL_CAMPAIGNS;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fmc-bookmarks.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const ids: string[] = JSON.parse(ev.target?.result as string);
          if (Array.isArray(ids)) {
            ids.forEach((id) => {
              if (!bookmarks.includes(id)) toggle(id);
            });
          }
        } catch {}
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Bookmark size={22} className="text-indigo-400" />
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <span className="text-sm text-gray-500">({campaigns.length})</span>
          </div>
          {campaigns.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm transition"
              >
                <Download size={14} /> {t("export")}
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm transition"
              >
                <Upload size={14} /> {t("import")}
              </button>
            </div>
          )}
        </div>

        {campaigns.length > 0 && (
          <div className="space-y-2 mb-8">
            {campaigns.map((c) => (
              <DeadlineAlert key={c.id} title={c.title} deadline={c.deadline} />
            ))}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="text-center py-24">
            <Bookmark size={40} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-400 mb-2">{t("empty")}</p>
            <Link href="/campaigns" className="text-indigo-400 hover:text-indigo-300 underline text-sm">
              {t("browseCampaigns")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
