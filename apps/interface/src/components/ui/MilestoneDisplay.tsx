"use client";

import React from "react";
import { CheckCircle2, Circle, Bell } from "lucide-react";
import type { Milestone } from "@/types/milestone";
import { useNotifications } from "@/context/NotificationContext";

interface Props {
  milestones: Milestone[];
  currentAmount: number;
}

export function MilestoneDisplay({ milestones, currentAmount }: Props) {
  const { addNotification } = useNotifications();
  const sortedMilestones = [...milestones].sort((a, b) => a.amount - b.amount);

  React.useEffect(() => {
    // Notify when a milestone is reached
    const reachedMilestones = sortedMilestones.filter(
      m => m.reached && m.amount <= currentAmount
    );
    
    if (reachedMilestones.length > 0) {
      const latest = reachedMilestones[reachedMilestones.length - 1];
      addNotification({
        id: `milestone-${latest.id}`,
        type: "success",
        message: `Milestone reached: ${latest.description}`,
        timestamp: Date.now(),
      });
    }
  }, [currentAmount, sortedMilestones, addNotification]);

  if (milestones.length === 0) return null;

  return (
    <section aria-labelledby="milestones-heading" className="space-y-3">
      <h3 id="milestones-heading" className="text-base font-semibold text-gray-900 dark:text-white">
        Campaign Milestones
      </h3>
      
      <div className="space-y-2">
        {sortedMilestones.map((milestone, index) => {
          const isReached = currentAmount >= milestone.amount;
          const progress = Math.min((currentAmount / milestone.amount) * 100, 100);

          return (
            <div
              key={milestone.id}
              className={`p-4 rounded-xl border transition ${
                isReached
                  ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isReached ? (
                    <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <Circle size={20} className="text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {milestone.description}
                    </p>
                    <span className={`text-sm font-semibold ${
                      isReached 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {milestone.amount.toLocaleString()} XLM
                    </span>
                  </div>
                  
                  {!isReached && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {progress.toFixed(1)}% complete
                      </p>
                    </div>
                  )}

                  {isReached && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Bell size={12} />
                      <span>Milestone reached!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
