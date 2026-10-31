import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppProvider } from "../state/provider";
import { Shell } from "./Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vocab Learn — Học một chút, nhớ lâu hơn", template: "%s | Vocab Learn" },
  description: "Đọc để hiểu, tra trong ngữ cảnh và luyện từ vựng theo nhịp của bạn.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=pocket", sizes: "any" },
      { url: "/favicon.svg?v=pocket", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=pocket", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png?v=pocket", sizes: "180x180", type: "image/png" },
  },
  manifest: "/site.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#205840" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
