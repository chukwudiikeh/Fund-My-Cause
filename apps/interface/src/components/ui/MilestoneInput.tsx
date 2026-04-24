"use client";

import React from "react";
import { X, Plus } from "lucide-react";
import type { MilestoneInput } from "@/types/milestone";

interface Props {
  milestones: MilestoneInput[];
  onChange: (milestones: MilestoneInput[]) => void;
}

export function MilestoneInput({ milestones, onChange }: Props) {
  const addMilestone = () => {
    onChange([...milestones, { amount: "", description: "" }]);
  };

  const removeMilestone = (index: number) => {
    onChange(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Milestones (Optional)
        </label>
        <button
          type="button"
          onClick={addMilestone}
          className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
        >
          <Plus size={14} />
          Add Milestone
        </button>
      </div>

      {milestones.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No milestones added yet. Click "Add Milestone" to create one.
        </p>
      )}

      <div className="space-y-2">
        {milestones.map((milestone, index) => (
          <div
            key={index}
            className="flex gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="flex-1 space-y-2">
              <input
                type="number"
                placeholder="Amount (XLM)"
                value={milestone.amount}
                onChange={(e) => updateMilestone(index, "amount", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                min="0"
                step="0.01"
              />
              <input
                type="text"
                placeholder="Description (e.g., 'Launch MVP')"
                value={milestone.description}
                onChange={(e) => updateMilestone(index, "description", e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                maxLength={100}
              />
            </div>
            <button
              type="button"
              onClick={() => removeMilestone(index)}
              className="p-2 h-fit rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition"
              aria-label="Remove milestone"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
