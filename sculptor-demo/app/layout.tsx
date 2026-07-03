import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sculptor — Adversarial Reading Engine",
  description:
    "Analyze articles with adversarial AI to find hidden assumptions and decision risks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
