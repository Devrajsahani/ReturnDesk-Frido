import type { Metadata } from "next";
import { IBM_Plex_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/ui/TopBar";
import { ToastProvider } from "@/components/ui/Toast";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReturnDesk",
  description: "Frido return & exchange desk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexSans.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-canvas text-ink font-sans antialiased">
        <ToastProvider>
          <TopBar />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
