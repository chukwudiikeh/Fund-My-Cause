"use client";

import React, { useState } from "react";
import { Wallet, Rocket, LogOut, Loader2, Sun, Moon, Menu, X, Bell, AlertTriangle, Globe } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/NotificationContext";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";
import { WalletBalance } from "@/components/ui/WalletBalance";
import { NETWORK_NAME } from "@/lib/constants";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

function truncate(addr: string) {
  return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
}

function LanguageSelector() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Locale;
    // Replace the locale prefix in the current path
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join("/") || "/");
  };

  return (
    <div className="flex items-center gap-1">
      <Globe size={14} className="text-gray-400 shrink-0" aria-hidden="true" />
      <select
        value={locale}
        onChange={handleChange}
        aria-label="Select language"
        className="bg-transparent text-sm text-gray-300 hover:text-white focus:outline-none cursor-pointer"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-gray-900 text-white">
            {localeNames[l]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Navbar() {
  const { address, connect, disconnect, isConnecting, isAutoConnecting, error, networkMismatch, walletNetwork } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div>
    <nav aria-label="Main navigation" className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="flex items-center gap-2 font-bold text-lg">
        <Rocket className="text-indigo-500 dark:text-indigo-400" size={20} />
        <span className="hidden sm:inline">Fund-My-Cause</span>
      </div>

      {/* Desktop menu */}
      <div className="hidden md:flex items-center gap-3">
        {error && <span className="text-red-500 dark:text-red-400 text-sm">{error}</span>}
        {address ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500 dark:text-gray-400">{truncate(address)}</span>
              <WalletBalance address={address} />
            </div>
            <button
              onClick={disconnect}
              aria-label={t("disconnect")}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              <LogOut size={16} aria-hidden="true" /> {t("disconnect")}
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            aria-label={t("connectWallet")}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50"
          >
            {isConnecting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Wallet size={16} aria-hidden="true" />}
            {t("connectWallet")}
          </button>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label={t("notifications")}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          aria-label={t("toggleTheme")}
        >
          {theme === "dark" ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-indigo-600" />}
        </button>

        <LanguageSelector />
      </div>

      {/* Mobile menu button */}
      <div className="flex md:hidden items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label={t("notifications")}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <NotificationDropdown open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          aria-label={t("toggleTheme")}
        >
          {theme === "dark" ? <Sun size={18} className="text-yellow-500" aria-hidden="true" /> : <Moon size={18} className="text-indigo-600" aria-hidden="true" />}
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          aria-label={mobileMenuOpen ? t("closeMenu") : t("openMenu")}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 md:hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 py-4 space-y-4 z-50">
          {error && <span className="text-red-500 dark:text-red-400 text-sm" role="alert">{error}</span>}
          {address ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{truncate(address)}</span>
                <WalletBalance address={address} />
              </div>
              <button
                onClick={() => { disconnect(); setMobileMenuOpen(false); }}
                aria-label={t("disconnect")}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition w-full"
              >
                <LogOut size={16} aria-hidden="true" /> {t("disconnect")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { connect(); setMobileMenuOpen(false); }}
              disabled={isConnecting}
              aria-label={t("connectWallet")}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 w-full"
            >
              {isConnecting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Wallet size={16} aria-hidden="true" />}
              {t("connectWallet")}
            </button>
          )}
          <LanguageSelector />
        </div>
      )}
    </nav>
    {networkMismatch && walletNetwork && (
      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/40 border-b border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 text-sm">
        <AlertTriangle size={15} className="shrink-0" />
        <span dangerouslySetInnerHTML={{ __html: t("networkMismatch", { walletNetwork, appNetwork: NETWORK_NAME }).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
      </div>
    )}
    {isAutoConnecting && (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs">
        <Loader2 size={12} className="animate-spin" /> {t("restoringSession")}
      </div>
    )}
    </div>
  );
}
