import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/app-header"; // Import AppHeader
import { Toaster } from "@/components/ui/toaster"; // Assuming you might want toasts for notifications

export const metadata: Metadata = {
  title: "Team Prioritization",
  description: "Cross-team project planning and prioritization tool",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen flex flex-col">
            <AppHeader /> {/* AppHeader is now part of the layout */}
            <main className="flex-1 container mx-auto p-4 md:p-6">
              {children}
            </main>
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
