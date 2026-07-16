import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Police & Citizen AI Copilot",
  description: "Complaint intake, sensor discrepancy detection, and human-confirmed dispatch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body text-ink-950 antialiased">{children}</body>
    </html>
  );
}
