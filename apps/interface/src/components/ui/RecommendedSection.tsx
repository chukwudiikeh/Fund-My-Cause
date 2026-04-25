"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { CampaignRow } from "@/components/ui/CampaignRow";
import { useRecommendedCampaigns } from "@/hooks/useRecommendations";
import { useBookmarks } from "@/context/BookmarkContext";
import { ALL_CAMPAIGNS } from "@/lib/campaigns";

export function RecommendedSection() {
  const { bookmarks } = useBookmarks();

  // Derive preferred categories from bookmarked campaigns
  const preferredCategories = Array.from(
    new Set(
      bookmarks
        .map((id) => ALL_CAMPAIGNS.find((c) => c.id === id)?.category)
        .filter(Boolean) as string[],
    ),
  );

  const { campaigns, reason } = useRecommendedCampaigns(preferredCategories, bookmarks);

  if (campaigns.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-400" />
          <h2 className="text-xl font-bold">Recommended for You</h2>
          <span className="text-xs text-gray-500 ml-1">— {reason}</span>
        </div>
        <Link href="/campaigns" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="bg-gray-900 rounded-2xl border border-gray-800 divide-y divide-gray-800">
        {campaigns.map((c) => (
          <CampaignRow key={c.id} campaign={c} />
        ))}
      </div>
    </section>
  );
}
