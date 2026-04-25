/**
 * Transaction history export utilities.
 * Supports CSV, Tax Report CSV, and PDF (browser print) formats.
 * No external dependencies — uses only browser-native APIs.
 */

export interface ExportRecord {
  txHash: string;
  contributor: string;
  amountXlm: number;
  timestamp: string; // ISO string
  campaignId: string;
  campaignTitle: string;
  status: string;
}

export interface DateRange {
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
}

// ── Filtering ─────────────────────────────────────────────────────────────────

/**
 * Filter records by an inclusive date range.
 * Empty from/to strings are treated as unbounded.
 */
export function filterByDateRange(
  records: ExportRecord[],
  range: DateRange,
): ExportRecord[] {
  const from = range.from ? new Date(range.from).getTime() : -Infinity;
  const to = range.to
    ? new Date(range.to + "T23:59:59.999Z").getTime()
    : Infinity;

  return records.filter((r) => {
    const ts = new Date(r.timestamp).getTime();
    return ts >= from && ts <= to;
  });
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCell(value: string | number): string {
  const str = String(value);
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  return lines.join("\r\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatIsoToLocal(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatIsoToLocalFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── CSV Export ────────────────────────────────────────────────────────────────

/**
 * Download transaction history as a standard CSV file.
 */
export function exportCsv(
  records: ExportRecord[],
  filename = "transactions.csv",
) {
  const headers = [
    "Date",
    "Time (UTC)",
    "Transaction Hash",
    "Contributor",
    "Campaign",
    "Campaign ID",
    "Amount (XLM)",
    "Status",
  ];

  const rows = records.map((r) => {
    const d = new Date(r.timestamp);
    return [
      d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      d.toISOString().slice(11, 19),
      r.txHash,
      r.contributor,
      r.campaignTitle,
      r.campaignId,
      r.amountXlm.toFixed(7),
      r.status,
    ];
  });

  downloadFile(buildCsv(headers, rows), filename, "text/csv;charset=utf-8;");
}

// ── Tax Report CSV ────────────────────────────────────────────────────────────

/**
 * Download a tax-oriented CSV with acquisition date, cost basis placeholder,
 * and disposal fields — compatible with common crypto tax tools.
 */
export function exportTaxReport(
  records: ExportRecord[],
  filename = "tax-report.csv",
) {
  const headers = [
    "Date Acquired",
    "Asset",
    "Amount",
    "Transaction Type",
    "Transaction Hash",
    "Wallet / Contributor",
    "Campaign",
    "Cost Basis (USD)",
    "Notes",
  ];

  const rows = records.map((r) => [
    formatIsoToLocal(r.timestamp),
    "XLM",
    r.amountXlm.toFixed(7),
    "Contribution",
    r.txHash,
    r.contributor,
    r.campaignTitle,
    "", // cost basis — user fills in
    `Campaign ID: ${r.campaignId}`,
  ]);

  downloadFile(buildCsv(headers, rows), filename, "text/csv;charset=utf-8;");
}

// ── PDF Export (browser print) ────────────────────────────────────────────────

/**
 * Open a print-ready HTML page in a new window so the user can save as PDF.
 * No external PDF library required — uses the browser's native print dialog.
 */
export function exportPdf(
  records: ExportRecord[],
  campaignTitle: string,
  campaignId: string,
) {
  const totalXlm = records.reduce((sum, r) => sum + r.amountXlm, 0);
  const generatedAt = new Date().toLocaleString();

  const tableRows = records
    .map(
      (r) => `
      <tr>
        <td>${formatIsoToLocalFull(r.timestamp)}</td>
        <td class="mono" title="${r.contributor}">${r.contributor.slice(0, 8)}…${r.contributor.slice(-4)}</td>
        <td class="right">${r.amountXlm.toFixed(7)} XLM</td>
        <td>${r.status}</td>
        <td class="mono hash"><a href="https://stellar.expert/explorer/testnet/tx/${r.txHash}" target="_blank">${r.txHash.slice(0, 12)}…</a></td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Transaction History — ${campaignTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 12px; color: #111; padding: 32px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #555; font-size: 11px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .right { text-align: right; }
    .mono { font-family: "Courier New", monospace; font-size: 10px; }
    .hash { font-size: 10px; }
    .summary { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; display: flex; gap: 32px; }
    .summary-item label { display: block; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-item span { font-size: 15px; font-weight: 600; }
    .disclaimer { margin-top: 24px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    a { color: #4f46e5; text-decoration: none; }
    @media print {
      body { padding: 16px; }
      a { color: #111; }
    }
  </style>
</head>
<body>
  <h1>Transaction History</h1>
  <p class="meta">
    Campaign: <strong>${campaignTitle}</strong> &nbsp;|&nbsp;
    Contract: <span class="mono">${campaignId}</span> &nbsp;|&nbsp;
    Generated: ${generatedAt}
  </p>

  <div class="summary">
    <div class="summary-item">
      <label>Total Transactions</label>
      <span>${records.length}</span>
    </div>
    <div class="summary-item">
      <label>Total Raised</label>
      <span>${totalXlm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} XLM</span>
    </div>
    <div class="summary-item">
      <label>Date Range</label>
      <span>${records.length > 0 ? `${formatIsoToLocal(records[records.length - 1].timestamp)} – ${formatIsoToLocal(records[0].timestamp)}` : "—"}</span>
    </div>
  </div>

  <br />

  <table>
    <thead>
      <tr>
        <th>Date &amp; Time</th>
        <th>Contributor</th>
        <th class="right">Amount</th>
        <th>Status</th>
        <th>Tx Hash</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px">No transactions in this range.</td></tr>'}
    </tbody>
  </table>

  <p class="disclaimer">
    This report is generated from on-chain data via the Stellar network. Amounts are in XLM (Lumens).
    Cost basis and fiat values are not included — consult a tax professional for reporting obligations.
  </p>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
