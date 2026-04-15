import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechYard Systems — AI Integration Portal",
  description: "Enterprise AI integrations for logistics, restaurant operations, and more. Powered by TechYard Systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen font-body antialiased">{children}</body>
    </html>
  );
}
