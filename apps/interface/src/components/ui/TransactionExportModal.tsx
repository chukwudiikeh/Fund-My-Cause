"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  Receipt,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  exportCsv,
  exportTaxReport,
  exportPdf,
  filterByDateRange,
  type ExportRecord,
  type DateRange,
} from "@/lib/exportTransactions";

// ── Types ─────────────────────────────────────────────────────────────────────

type ExportFormat = "csv" | "pdf" | "tax";

interface TransactionExportModalProps {
  records: ExportRecord[];
  campaignTitle: string;
  campaignId: string;
  onClose: () => void;
}

// ── Format options ────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "csv",
    label: "CSV",
    description: "Spreadsheet-ready. Date, amount, contributor, status.",
    icon: <FileSpreadsheet size={18} />,
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Print-ready report with summary. Opens browser print dialog.",
    icon: <FileText size={18} />,
  },
  {
    id: "tax",
    label: "Tax Report",
    description:
      "CSV formatted for crypto tax tools. Includes acquisition date and asset fields.",
    icon: <Receipt size={18} />,
  },
];

// ── Input helpers ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 " +
  "rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white " +
  "focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400";

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionExportModal({
  records,
  campaignTitle,
  campaignId,
  onClose,
}: TransactionExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [exporting, setExporting] = useState(false);

  const filteredRecords = useMemo(
    () => filterByDateRange(records, dateRange),
    [records, dateRange],
  );

  const slug = campaignTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 30);
  const dateTag = new Date().toISOString().slice(0, 10);

  const handleExport = async () => {
    if (filteredRecords.length === 0) return;
    setExporting(true);
    // Small delay so the button state renders before the (potentially blocking) export
    await new Promise((r) => setTimeout(r, 50));
    try {
      if (format === "csv") {
        exportCsv(filteredRecords, `${slug}-transactions-${dateTag}.csv`);
      } else if (format === "tax") {
        exportTaxReport(filteredRecords, `${slug}-tax-report-${dateTag}.csv`);
      } else {
        exportPdf(filteredRecords, campaignTitle, campaignId);
      }
    } finally {
      setExporting(false);
    }
  };

  const isEmpty = filteredRecords.length === 0;

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Download
              size={18}
              className="text-indigo-500"
              aria-hidden="true"
            />
            <h2
              id="export-modal-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Export Transactions
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close export modal"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Format selector */}
          <fieldset>
            <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Format
            </legend>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    format === opt.id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={opt.id}
                    checked={format === opt.id}
                    onChange={() => setFormat(opt.id)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span
                    className={`mt-0.5 ${format === opt.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}
                    aria-hidden="true"
                  >
                    {opt.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Date range filter */}
          <fieldset>
            <legend className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              <Calendar size={12} aria-hidden="true" />
              Date Range (optional)
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="export-from"
                  className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                >
                  From
                </label>
                <input
                  id="export-from"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, from: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  htmlFor="export-to"
                  className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
                >
                  To
                </label>
                <input
                  id="export-to"
                  type="date"
                  value={dateRange.to}
                  min={dateRange.from || undefined}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, to: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </div>
          </fieldset>

          {/* Record count summary */}
          <div
            className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
              isEmpty
                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}
            aria-live="polite"
          >
            <span>
              {isEmpty
                ? "No transactions match the selected date range."
                : `${filteredRecords.length} transaction${filteredRecords.length !== 1 ? "s" : ""} will be exported`}
            </span>
            {!isEmpty && (
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {filteredRecords
                  .reduce((s, r) => s + r.amountXlm, 0)
                  .toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                XLM total
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isEmpty || exporting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {exporting
              ? "Exporting…"
              : `Export ${FORMAT_OPTIONS.find((o) => o.id === format)?.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
