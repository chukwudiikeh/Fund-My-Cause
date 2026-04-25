"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Bookmark, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { formatXlm } from "@/lib/price";
import type { Campaign } from "@/types/campaign";
import { useComparison } from "@/context/ComparisonContext";
import { useBookmarks } from "@/context/BookmarkContext";

export interface CampaignCardProps {
  campaign: Campaign;
  onPledge?: (id: string) => void;
  /** Pass null when price fetch failed — USD amounts are hidden */
  xlmPrice?: number | null;
  /** Stagger index for slide-up animation on listing page */
  index?: number;
  /** Search query for highlighting matching text */
  query?: string;
}

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function StatusBadge({ status }: { status: "funded" | "ended" }) {
  return (
    <span
      className={cn(
        "absolute top-3 left-3 px-2 py-0.5 rounded-full text-xs font-semibold",
        status === "funded"
          ? "bg-green-500/90 text-white"
          : "bg-gray-700/90 text-gray-300"
      )}
    >
      {status === "funded" ? "Funded" : "Ended"}
    </span>
  );
}

export function CampaignCard({ campaign, onPledge, xlmPrice = null, index = 0, query }: CampaignCardProps) {
  const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;
  const isFunded = progress >= 100;
  const isEnded = !isFunded && new Date(campaign.deadline) < new Date();
  const isDisabled = isFunded || isEnded;

  const { toggle: toggleCompare, isSelected, selected } = useComparison();
  const { toggle: toggleBookmark, isBookmarked } = useBookmarks();
  const compared = isSelected(campaign.id);
  const bookmarked = isBookmarked(campaign.id);
  const compareDisabled = !compared && selected.length >= 4;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
      className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800"
    >
      <div className="relative">
        <div className="relative w-full h-48">
          <Image
            src={campaign.image}
            alt={`${campaign.title} - campaign header image`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        {isFunded && <StatusBadge status="funded" />}
        {isEnded && <StatusBadge status="ended" />}
        {/* Video indicator */}
        {campaign.videoUrl && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
            ▶ Video
          </span>
        )}
        {/* Bookmark button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleBookmark(campaign.id); }}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark campaign"}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-900/80 hover:bg-gray-800 transition"
        >
          <Bookmark size={15} className={cn(bookmarked ? "fill-indigo-400 text-indigo-400" : "text-gray-400")} />
        </button>
      </div>
      <div className="p-5 space-y-3">
        <h2 className="text-lg font-semibold"><Highlight text={campaign.title} query={query} /></h2>
        <p className="text-gray-400 text-sm line-clamp-2"><Highlight text={campaign.description} query={query} /></p>
        <ProgressBar progress={progress} />
        <div className="flex justify-between text-sm text-gray-400">
          <span>{formatXlm(campaign.raised, xlmPrice)} raised</span>
          <span>{formatXlm(campaign.goal, xlmPrice)} goal</span>
        </div>
        <CountdownTimer deadline={campaign.deadline} />
        {/* Compare checkbox */}
        <label className={cn("flex items-center gap-2 text-xs cursor-pointer select-none", compareDisabled && "opacity-40 cursor-not-allowed")}>
          <input
            type="checkbox"
            checked={compared}
            disabled={compareDisabled}
            onChange={() => toggleCompare(campaign.id)}
            className="accent-indigo-500 w-3.5 h-3.5"
          />
          <GitCompare size={12} className="text-gray-400" />
          <span className="text-gray-400">Compare</span>
        </label>
        <button
          className="w-full py-2 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          onClick={() => onPledge?.(campaign.id)}
          disabled={isDisabled}
          aria-label={
            isFunded
              ? `${campaign.title} — successfully funded`
              : isEnded
              ? `${campaign.title} — campaign ended`
              : `Pledge to ${campaign.title}`
          }
        >
          {isFunded ? "Successfully Funded" : isEnded ? "Campaign Ended" : "Pledge Now"}
        </button>
      </div>
    </motion.div>
  );
}
