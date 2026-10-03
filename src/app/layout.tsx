import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ui/ThemeProvider.tsx";

export const metadata: Metadata = {
  title: {
    default: "WorkWorld — Executable Professional-Work Simulations",
    template: "%s",
  },
  description:
    "Executable business operations apprenticeship simulations with inspectable state assessment evidence.",
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
