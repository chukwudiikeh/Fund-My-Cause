"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CampaignRow } from "@/components/ui/CampaignRow";
import { useSimilarCampaigns } from "@/hooks/useRecommendations";
import { ALL_CAMPAIGNS } from "@/lib/campaigns";
import type { Campaign } from "@/types/campaign";

interface SimilarCampaignsProps {
  campaignId: string;
}

export function SimilarCampaigns({ campaignId }: SimilarCampaignsProps) {
  const campaign = ALL_CAMPAIGNS.find((c) => c.id === campaignId);
  // For on-chain campaigns not in mock data, build a minimal Campaign object
  const source: Campaign = campaign ?? {
    id: campaignId,
    contractId: campaignId,
    title: "",
    description: "",
    creator: "",
    raised: 0,
    goal: 0,
    deadline: new Date().toISOString(),
    status: "Active",
    token: "XLM",
  };

  const similar = useSimilarCampaigns(source);

  if (similar.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Similar Campaigns</h3>
        <Link href="/campaigns" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition">
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
        {similar.map((c) => (
          <CampaignRow key={c.id} campaign={c} />
        ))}
      </div>
    </div>
  );
}
