"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Download, Loader2 } from "lucide-react";
import {
  fetchTransactionHistory,
  type ContributionRecord,
} from "@/lib/soroban";
import {
  EmptyState,
  NoTransactionsIllustration,
} from "@/components/ui/EmptyState";
import { TransactionExportModal } from "@/components/ui/TransactionExportModal";
import type { ExportRecord } from "@/lib/exportTransactions";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  contractId: string;
  /** Optional campaign title used in export filenames and PDF header. */
  campaignTitle?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const network =
  process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet";
const STELLAR_EXPERT = `https://stellar.expert/explorer/${network}`;

/** Map a ContributionRecord from soroban.ts to the ExportRecord shape. */
function toExportRecord(
  r: ContributionRecord,
  contractId: string,
  campaignTitle: string,
): ExportRecord {
  return {
    txHash: r.txHash,
    contributor: r.contributor,
    amountXlm: r.amountXlm,
    timestamp: r.timestamp,
    campaignId: contractId,
    campaignTitle,
    status: "Confirmed",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionHistory({
  contractId,
  campaignTitle = "Campaign",
}: Props) {
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Fetch all records (limit 0) so the export has the full dataset
    fetchTransactionHistory(contractId, 0)
      .then((data) => {
        if (!cancelled) setRecords(data);
      })
      .catch(() => {
        if (!cancelled) setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const viewAllUrl = `${STELLAR_EXPERT}/contract/${contractId}`;
  const exportRecords = records.map((r) =>
    toExportRecord(r, contractId, campaignTitle),
  );

  // Show only the 10 most recent in the table; export uses the full set
  const displayRecords = records.slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Recent Contributions
        </h2>
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
          Recent Contributions
        </h2>
        <EmptyState
          illustration={<NoTransactionsIllustration />}
          title="No contributions yet"
          description="Be the first to pledge and help this campaign reach its goal."
        />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Recent Contributions
          </h2>

          <div className="flex items-center gap-3">
            {/* Export button */}
            <button
              onClick={() => setShowExport(true)}
              aria-label="Export transaction history"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-gray-100 dark:bg-gray-800
                text-gray-600 dark:text-gray-400
                hover:bg-gray-200 dark:hover:bg-gray-700
                hover:text-gray-900 dark:hover:text-white
                transition"
            >
              <Download size={13} />
              Export
            </button>

            {/* View all on Stellar Expert */}
            <a
              href={viewAllUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View all on Stellar Expert
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Contributor</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 text-right font-medium">Date</th>
                <th
                  className="px-4 py-2 text-right font-medium"
                  aria-label="View transaction link"
                >
                  <span className="sr-only">Link</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {displayRecords.map((r) => (
                <tr
                  key={r.txHash}
                  className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                    <span title={r.contributor}>{truncate(r.contributor)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white font-medium">
                    {r.amountXlm > 0
                      ? `${r.amountXlm.toLocaleString(undefined, { maximumFractionDigits: 7 })} XLM`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                    {formatDate(r.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`${STELLAR_EXPERT}/tx/${r.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View transaction on Stellar Expert"
                      className="inline-flex items-center text-indigo-500 hover:text-indigo-400"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* "Showing X of Y" note when there are more than 10 */}
        {records.length > 10 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
            Showing 10 of {records.length} contributions.{" "}
            <button
              onClick={() => setShowExport(true)}
              className="text-indigo-500 hover:underline"
            >
              Export all
            </button>
          </p>
        )}
      </div>

      {/* Export modal */}
      {showExport && (
        <TransactionExportModal
          records={exportRecords}
          campaignTitle={campaignTitle}
          campaignId={contractId}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
