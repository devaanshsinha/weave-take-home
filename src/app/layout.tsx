import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PostHog Engineering Impact Dashboard",
  description: "Single-page dashboard for identifying impactful engineers in PostHog/posthog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
