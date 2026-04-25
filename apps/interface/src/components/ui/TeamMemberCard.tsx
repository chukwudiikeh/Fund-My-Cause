"use client";

import Image from "next/image";
import { ExternalLink, User } from "lucide-react";
import type { TeamMember } from "@/types/campaign";

interface TeamMemberCardProps {
  member: TeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {member.avatarUrl ? (
          <Image
            src={member.avatarUrl}
            alt={member.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User size={20} className="text-gray-400" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{member.name}</p>
          {member.profileUrl && (
            <a
              href={member.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name}'s profile`}
              className="shrink-0 text-gray-400 hover:text-indigo-500 transition"
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
        <p className="text-xs text-indigo-500 dark:text-indigo-400">{member.role}</p>
        {member.bio && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
            {member.bio}
          </p>
        )}
      </div>
    </div>
  );
}
