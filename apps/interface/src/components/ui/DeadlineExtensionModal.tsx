"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, X, Clock } from "lucide-react";

interface ExtensionRecord {
  date: string;
  newDeadline: string;
}

interface DeadlineExtensionModalProps {
  contractId: string;
  currentDeadline: string;
  onClose: () => void;
  onExtend: (contractId: string, newDeadlineTimestamp: number) => Promise<void>;
}

const EXTENSION_HISTORY_KEY = "fmc:deadline_extensions";

function getHistory(contractId: string): ExtensionRecord[] {
  try {
    const raw = localStorage.getItem(EXTENSION_HISTORY_KEY);
    if (!raw) return [];
    const map: Record<string, ExtensionRecord[]> = JSON.parse(raw);
    return map[contractId] ?? [];
  } catch {
    return [];
  }
}

function saveHistory(contractId: string, record: ExtensionRecord) {
  try {
    const raw = localStorage.getItem(EXTENSION_HISTORY_KEY);
    const map: Record<string, ExtensionRecord[]> = raw ? JSON.parse(raw) : {};
    map[contractId] = [record, ...(map[contractId] ?? [])].slice(0, 10);
    localStorage.setItem(EXTENSION_HISTORY_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function DeadlineExtensionModal({
  contractId,
  currentDeadline,
  onClose,
  onExtend,
}: DeadlineExtensionModalProps) {
  const minDate = new Date(Math.max(Date.now(), new Date(currentDeadline).getTime()) + 86_400_000)
    .toISOString()
    .split("T")[0];

  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<ExtensionRecord[]>([]);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    setHistory(getHistory(contractId));
    return () => {
      (triggerRef.current as HTMLElement | null)?.focus();
    };
  }, [contractId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const handleExtend = async () => {
    if (!newDate) {
      setErr("Please select a new deadline.");
      return;
    }
    const ts = new Date(newDate).getTime();
    if (ts <= new Date(currentDeadline).getTime()) {
      setErr("New deadline must be after the current deadline.");
      return;
    }
    if (ts <= Date.now()) {
      setErr("New deadline must be in the future.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onExtend(contractId, Math.floor(ts / 1000));
      const record: ExtensionRecord = {
        date: new Date().toISOString(),
        newDeadline: newDate,
      };
      saveHistory(contractId, record);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to extend deadline.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="extend-deadline-title"
        className="w-full max-w-md space-y-4 rounded-2xl border border-gray-700 bg-gray-900 p-6"
      >
        <div className="flex items-center justify-between">
          <h2 id="extend-deadline-title" className="flex items-center gap-2 text-lg font-semibold">
            <Clock size={18} className="text-indigo-400" />
            Extend Deadline
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <p className="mb-1 text-sm text-gray-400">
            Current deadline:{" "}
            <span className="text-white">
              {new Date(currentDeadline).toLocaleDateString()}
            </span>
          </p>
        </div>

        <div>
          <label htmlFor="new-deadline" className="mb-1 block text-sm text-gray-400">
            New deadline
          </label>
          <input
            id="new-deadline"
            type="date"
            min={minDate}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={inputCls}
          />
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleExtend}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Extend
          </button>
        </div>

        {history.length > 0 && (
          <div className="border-t border-gray-700 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Extension history
            </p>
            <ul className="space-y-1">
              {history.map((h, i) => (
                <li key={i} className="flex justify-between text-xs text-gray-400">
                  <span>{new Date(h.date).toLocaleDateString()}</span>
                  <span>→ {new Date(h.newDeadline).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
