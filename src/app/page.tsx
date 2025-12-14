"use client";

import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Farcaster SDK
const DelegatorApp = dynamic(
  () => import("@/components/DelegatorApp").then((mod) => mod.DelegatorApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto" />
          <p className="text-sm text-zinc-500">Loading Farcaster Delegator...</p>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  return <DelegatorApp />;
}
