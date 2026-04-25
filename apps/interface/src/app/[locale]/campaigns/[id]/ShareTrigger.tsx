"use client";

import React, { useState } from "react";
import { Share2 } from "lucide-react";
import { ShareModal } from "@/components/ui/ShareModal";

interface Props {
  campaignId: string;
  campaignTitle: string;
}

export function ShareTrigger({ campaignId, campaignTitle }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition"
      >
        <Share2 size={16} />
        Share
      </button>
      {open && (
        <ShareModal
          campaignId={campaignId}
          campaignTitle={campaignTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
