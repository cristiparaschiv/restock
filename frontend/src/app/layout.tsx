import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Restok - Recipes, Meal Planning, Grocery Lists",
  description: "Import recipes from your favorite websites, plan weekly meals, and generate smart shopping lists. Bilingual support for English and Romanian.",
  icons: {
    icon: "/restok_icon.png",
    apple: "/restok_icon.png",
  },
  openGraph: {
    title: "Restok - Recipes, Meal Planning, Grocery Lists",
    description: "Import recipes from your favorite websites, plan weekly meals, and generate smart shopping lists.",
    images: ["/restok_banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
