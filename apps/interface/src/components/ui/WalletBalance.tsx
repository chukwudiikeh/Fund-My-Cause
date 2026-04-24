"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useXlmBalance } from "@/hooks/useXlmBalance";
import { fetchXlmPrice } from "@/lib/price";

interface WalletBalanceProps {
  address: string;
  className?: string;
}

export function WalletBalance({ address, className = "" }: WalletBalanceProps) {
  const { balance, refresh } = useXlmBalance(address);
  const [xlmPrice, setXlmPrice] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [priceError, setPriceError] = useState(false);

  useEffect(() => {
    fetchXlmPrice()
      .then((price) => {
        setXlmPrice(price);
        setPriceError(price === null);
      })
      .catch(() => {
        setXlmPrice(null);
        setPriceError(true);
      });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refresh();
    try {
      const price = await fetchXlmPrice();
      setXlmPrice(price);
      setPriceError(price === null);
    } catch {
      setPriceError(true);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (balance === null) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 size={14} className="animate-spin text-gray-400" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  const xlmAmount = parseFloat(balance);
  const usdAmount = xlmPrice !== null ? xlmAmount * xlmPrice : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {xlmAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM
        </span>
        {usdAmount !== null && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ~${usdAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
          </span>
        )}
        {priceError && (
          <span className="text-xs text-gray-400 dark:text-gray-500">USD unavailable</span>
        )}
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Refresh balance"
        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
      >
        <RefreshCw
          size={14}
          className={`text-gray-600 dark:text-gray-300 ${isRefreshing ? "animate-spin" : ""}`}
        />
      </button>
    </div>
  );
}
