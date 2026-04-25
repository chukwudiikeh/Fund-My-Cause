import { useMemo } from "react";
import type { Campaign } from "@/types/campaign";
import { ALL_CAMPAIGNS } from "@/lib/campaigns";

/**
 * Returns campaigns similar to the given one, ranked by:
 * 1. Same category (strong signal)
 * 2. Similar funding progress (within 30%)
 * Excludes the source campaign itself.
 */
export function useSimilarCampaigns(campaign: Campaign, limit = 3): Campaign[] {
  return useMemo(() => {
    const srcProgress = campaign.goal > 0 ? campaign.raised / campaign.goal : 0;
    return ALL_CAMPAIGNS
      .filter((c) => c.id !== campaign.id)
      .map((c) => {
        let score = 0;
        if (c.category && c.category === campaign.category) score += 3;
        const cProgress = c.goal > 0 ? c.raised / c.goal : 0;
        if (Math.abs(cProgress - srcProgress) < 0.3) score += 1;
        return { campaign: c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.campaign);
  }, [campaign, limit]);
}

/**
 * Returns recommended campaigns based on bookmarked/viewed category preferences.
 * Falls back to most-funded active campaigns when no preferences exist.
 */
export function useRecommendedCampaigns(
  preferredCategories: string[],
  excludeIds: string[] = [],
  limit = 3,
): { campaigns: Campaign[]; reason: string } {
  return useMemo(() => {
    const active = ALL_CAMPAIGNS.filter(
      (c) => !excludeIds.includes(c.id) && new Date(c.deadline) > new Date() && c.raised < c.goal,
    );

    if (preferredCategories.length > 0) {
      const byCategory = active
        .filter((c) => c.category && preferredCategories.includes(c.category))
        .sort((a, b) => b.raised / b.goal - a.raised / a.goal)
        .slice(0, limit);
      if (byCategory.length > 0) {
        return { campaigns: byCategory, reason: "Based on your interests" };
      }
    }

    // Fallback: most-funded active campaigns
    const fallback = active
      .sort((a, b) => b.raised / b.goal - a.raised / a.goal)
      .slice(0, limit);
    return { campaigns: fallback, reason: "Trending campaigns" };
  }, [preferredCategories, excludeIds, limit]);
}
