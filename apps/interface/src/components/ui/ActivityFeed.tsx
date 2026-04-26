"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, Gift, Megaphone, Filter } from "lucide-react";
import { formatXLM, formatAddress } from "@/lib/format";

export type ActivityType = "contribution" | "milestone" | "update";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: number;
  /** For contributions */
  contributor?: string;
  amount?: bigint;
  /** For milestones */
  milestoneTitle?: string;
  milestonePercent?: number;
  /** For updates */
  updateText?: string;
}

interface Props {
  contractId: string;
  /** Provide activities externally (e.g. from parent) or leave undefined to use polling */
  activities?: ActivityItem[];
  /** Poll interval in ms; 0 = no polling. Default 30000 */
  pollInterval?: number;
  /** Called each poll cycle to fetch fresh activities */
  onFetch?: (contractId: string) => Promise<ActivityItem[]>;
}

const TYPE_LABELS: Record<ActivityType, string> = {
  contribution: "Contributions",
  milestone: "Milestones",
  update: "Updates",
};

function ActivityIcon({ type }: { type: ActivityType }) {
  if (type === "contribution")
    return <Gift size={15} className="text-indigo-400 shrink-0" aria-hidden />;
  if (type === "milestone")
    return <TrendingUp size={15} className="text-green-400 shrink-0" aria-hidden />;
  return <Megaphone size={15} className="text-yellow-400 shrink-0" aria-hidden />;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <li className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <ActivityIcon type={item.type} />
      <div className="flex-1 min-w-0">
        {item.type === "contribution" && (
          <p className="text-sm text-gray-800 dark:text-gray-200">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              {formatAddress(item.contributor ?? "")}
            </span>{" "}
            contributed{" "}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {formatXLM(item.amount ?? 0n)}
            </span>
          </p>
        )}
        {item.type === "milestone" && (
          <p className="text-sm text-gray-800 dark:text-gray-200">
            🎉 Milestone reached:{" "}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {item.milestoneTitle}
            </span>
            {item.milestonePercent !== undefined && (
              <span className="ml-1 text-xs text-gray-500">({item.milestonePercent}%)</span>
            )}
          </p>
        )}
        {item.type === "update" && (
          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
            {item.updateText}
          </p>
        )}
      </div>
      <span className="text-xs text-gray-400 shrink-0 tabular-nums">{timeAgo(item.timestamp)}</span>
    </li>
  );
}

export function ActivityFeed({
  contractId,
  activities: externalActivities,
  pollInterval = 30_000,
  onFetch,
}: Props) {
  const [items, setItems] = useState<ActivityItem[]>(externalActivities ?? []);
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  const fetchActivities = useCallback(async () => {
    if (!onFetch) return;
    setRefreshing(true);
    try {
      const fresh = await onFetch(contractId);
      setItems(fresh);
      setLastUpdated(Date.now());
    } catch {
      // silently ignore fetch errors
    } finally {
      setRefreshing(false);
    }
  }, [contractId, onFetch]);

  // Sync external activities when provided
  useEffect(() => {
    if (externalActivities) setItems(externalActivities);
  }, [externalActivities]);

  // Auto-polling
  useEffect(() => {
    if (!onFetch || pollInterval <= 0) return;
    fetchActivities();
    const id = setInterval(fetchActivities, pollInterval);
    return () => clearInterval(id);
  }, [fetchActivities, onFetch, pollInterval]);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <section aria-label="Campaign activity feed" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Activity</h2>
        <button
          onClick={fetchActivities}
          disabled={refreshing || !onFetch}
          aria-label="Refresh activity feed"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-500 transition disabled:opacity-40"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {lastUpdated && (
            <span className="hidden sm:inline">{timeAgo(lastUpdated)}</span>
          )}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Filter activities">
        <Filter size={13} className="text-gray-400 mr-1" aria-hidden />
        {(["all", "contribution", "milestone", "update"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            aria-pressed={filter === t}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === t
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {t === "all" ? "All" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No activity yet.</p>
      ) : (
        <ul className="rounded-xl border border-gray-100 bg-white px-4 dark:border-gray-800 dark:bg-gray-900/50">
          {filtered.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
