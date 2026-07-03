import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sculptor Write",
  description: "Word-like AI writing environment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </SessionProvider>
      </body>
    </html>
  );
}
