import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ReactQueryProvider } from "@/context/ReactQueryProvider";
import { PageTransition } from "@/components/layout/PageTransition";
import { ComparisonProvider } from "@/context/ComparisonContext";
import { BookmarkProvider } from "@/context/BookmarkContext";

export const metadata: Metadata = {
  title: "Fund-My-Cause",
  description: "Decentralized crowdfunding on the Stellar network",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ThemeProvider>
          <ToastProvider>
            <NotificationProvider>
              <ComparisonProvider>
                <BookmarkProvider>
                  <WalletProvider>{children}</WalletProvider>
                </BookmarkProvider>
              </ComparisonProvider>
            </NotificationProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
