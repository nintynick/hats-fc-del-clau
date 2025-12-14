import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Farcaster Delegator",
  description: "Manage shared Farcaster accounts with Hats Protocol",
  openGraph: {
    title: "Farcaster Delegator",
    description: "Manage shared Farcaster accounts with Hats Protocol",
    type: "website",
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/og-image.png`,
      button: {
        title: "Manage Delegator",
        action: {
          type: "launch_frame",
          name: "Farcaster Delegator",
          url: process.env.NEXT_PUBLIC_APP_URL || "",
          splashImageUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/splash.png`,
          splashBackgroundColor: "#8b5cf6",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
