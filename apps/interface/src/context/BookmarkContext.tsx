"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface BookmarkContextType {
  bookmarks: string[];
  toggle: (id: string) => void;
  isBookmarked: (id: string) => boolean;
}

const BookmarkContext = createContext<BookmarkContextType | null>(null);
const STORAGE_KEY = "fmc_bookmarks";

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setBookmarks(JSON.parse(stored));
    } catch {}
  }, []);

  const toggle = (id: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const isBookmarked = (id: string) => bookmarks.includes(id);

  return (
    <BookmarkContext.Provider value={{ bookmarks, toggle, isBookmarked }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarkProvider");
  return ctx;
}
