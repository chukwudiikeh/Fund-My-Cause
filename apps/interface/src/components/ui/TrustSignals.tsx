"use client";

import { BadgeCheck, History, Clock, Users, ShieldCheck, ExternalLink } from "lucide-react";
import type { TrustSignalData } from "@/types/campaign";

interface TrustSignalsProps {
  data: TrustSignalData;
}

export function TrustSignals({ data }: TrustSignalsProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold">Trust & Verification</h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <TrustRow
          icon={<BadgeCheck size={15} className={data.isVerified ? "text-indigo-500" : "text-gray-400"} />}
          label="Creator verified"
          value={data.isVerified ? "Verified" : "Not verified"}
          positive={data.isVerified}
        />
        <TrustRow
          icon={<History size={15} className="text-gray-400" />}
          label="Campaign history"
          value={`${data.campaignCount} campaign${data.campaignCount !== 1 ? "s" : ""} created`}
          positive={data.campaignCount > 0}
        />
        <TrustRow
          icon={<Clock size={15} className="text-gray-400" />}
          label="Account age"
          value={
            data.accountAgeDays >= 365
              ? `${Math.floor(data.accountAgeDays / 365)}y ${Math.floor((data.accountAgeDays % 365) / 30)}m`
              : data.accountAgeDays >= 30
              ? `${Math.floor(data.accountAgeDays / 30)} months`
              : `${data.accountAgeDays} days`
          }
          positive={data.accountAgeDays >= 30}
        />
        <TrustRow
          icon={<Users size={15} className="text-gray-400" />}
          label="Total backers"
          value={data.backerCount.toLocaleString()}
          positive={data.backerCount > 0}
        />
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className={data.isAudited ? "text-green-500" : "text-gray-400"} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Contract audit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${data.isAudited ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
              {data.isAudited ? "Audited" : "Not audited"}
            </span>
            {data.isAudited && data.auditUrl && (
              <a
                href={data.auditUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View audit report"
                className="text-indigo-500 hover:text-indigo-400 transition"
              >
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustRow({
  icon,
  label,
  value,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <span className={`text-sm font-medium ${positive ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
        {value}
      </span>
    </div>
  );
}
