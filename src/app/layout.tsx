import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ui/ThemeProvider.tsx";

export const metadata: Metadata = {
  title: {
    default: "WorkWorld Index — Agent reliability, with evidence",
    template: "%s",
  },
  description:
    "A public, replayable reliability benchmark and certification layer for AI agents doing business workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased transition-colors">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
