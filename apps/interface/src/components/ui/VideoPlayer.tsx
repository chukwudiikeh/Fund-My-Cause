"use client";

import React, { useState } from "react";
import { Play } from "lucide-react";

/** Parses a video URL and returns an embed URL or null if unsupported. */
export function getVideoEmbed(url: string): { type: "youtube" | "vimeo" | "direct"; embedUrl: string } | null {
  try {
    const u = new URL(url);

    // YouTube
    const ytMatch =
      u.hostname.includes("youtube.com")
        ? u.searchParams.get("v")
        : u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : null;
    if (ytMatch) {
      return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch}` };
    }

    // Vimeo
    const vimeoMatch = u.hostname.includes("vimeo.com") ? u.pathname.match(/\/(\d+)/)?.[1] : null;
    if (vimeoMatch) {
      return { type: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeoMatch}` };
    }

    // Direct video (mp4, webm, ogg)
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname)) {
      return { type: "direct", embedUrl: url };
    }
  } catch {}
  return null;
}

/** Returns a thumbnail URL for YouTube videos, null otherwise. */
export function getVideoThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    const ytId =
      u.hostname.includes("youtube.com")
        ? u.searchParams.get("v")
        : u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : null;
    if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  } catch {}
  return null;
}

interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const embed = getVideoEmbed(url);

  if (!embed) return null;

  if (embed.type === "direct") {
    return (
      <div className="w-full rounded-2xl overflow-hidden aspect-video bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={embed.embedUrl} controls className="w-full h-full" />
      </div>
    );
  }

  const thumbnail = embed.type === "youtube" ? getVideoThumbnail(url) : null;

  if (!playing && thumbnail) {
    return (
      <div
        className="relative w-full rounded-2xl overflow-hidden aspect-video bg-black cursor-pointer group"
        onClick={() => setPlaying(true)}
        role="button"
        aria-label="Play video"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setPlaying(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbnail} alt="Video thumbnail" className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play size={28} className="text-gray-900 ml-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden aspect-video bg-black">
      <iframe
        src={`${embed.embedUrl}?autoplay=1`}
        title="Campaign video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    </div>
  );
}
