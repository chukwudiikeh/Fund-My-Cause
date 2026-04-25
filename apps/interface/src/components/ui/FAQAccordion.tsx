"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { FAQ } from "@/types/campaign";

const COMMON_FAQS: FAQ[] = [
  {
    id: "common-1",
    question: "How will the funds be used?",
    answer: "Funds will be used directly for the campaign goals described above.",
  },
  {
    id: "common-2",
    question: "What happens if the goal isn't met?",
    answer:
      "If the funding goal is not reached by the deadline, all contributors can claim a full refund via the smart contract.",
  },
  {
    id: "common-3",
    question: "How do I contribute?",
    answer:
      "Connect your Freighter wallet and click the Contribute button. You can contribute any amount above the minimum.",
  },
  {
    id: "common-4",
    question: "Is this campaign audited?",
    answer:
      "The underlying smart contract has been reviewed. See the trust signals section for audit details.",
  },
];

interface FAQAccordionProps {
  faqs: FAQ[];
  showSearch?: boolean;
  showTemplates?: boolean;
  onAddTemplate?: (faq: FAQ) => void;
}

export function FAQAccordion({
  faqs,
  showSearch = true,
  showTemplates = false,
  onAddTemplate,
}: FAQAccordionProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(query.toLowerCase()) ||
          f.answer.toLowerCase().includes(query.toLowerCase()),
      )
    : faqs;

  if (faqs.length === 0 && !showTemplates) return null;

  return (
    <div className="space-y-3">
      {showSearch && faqs.length > 3 && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            placeholder="Search FAQs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {filtered.length === 0 && query && (
        <p className="text-sm text-gray-500">No FAQs match your search.</p>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.map((faq) => (
          <div key={faq.id}>
            <button
              onClick={() => setOpen(open === faq.id ? null : faq.id)}
              aria-expanded={open === faq.id}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
            >
              <span>{faq.question}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-gray-400 transition-transform ${open === faq.id ? "rotate-180" : ""}`}
              />
            </button>
            {open === faq.id && (
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {showTemplates && onAddTemplate && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Common templates
          </p>
          <div className="space-y-1">
            {COMMON_FAQS.filter((t) => !faqs.some((f) => f.id === t.id)).map(
              (t) => (
                <button
                  key={t.id}
                  onClick={() => onAddTemplate(t)}
                  className="w-full rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-left text-xs text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition"
                >
                  + {t.question}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
