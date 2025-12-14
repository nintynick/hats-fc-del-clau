"use client";

import { Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { formatHatId, getHatsAppUrl } from "@/lib/utils";

interface ViewHatWearersProps {
  ownerHat: bigint;
  casterHat: bigint;
}

export function ViewHatWearers({ ownerHat, casterHat }: ViewHatWearersProps) {
  // Note: Hats Protocol doesn't have an on-chain way to enumerate all wearers
  // You'd typically use The Graph or an indexer for this
  // For now, we just show the hat IDs and link to external tools

  const hatsAppUrl = getHatsAppUrl(ownerHat);

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Hat Wearers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="info">
          <p className="text-xs">
            View hat wearers on the Hats Protocol app. The owner hat grants full control,
            while the caster hat allows adding keys and casting.
          </p>
        </Alert>

        <div className="space-y-3">
          <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Owner Hat</span>
              <span className="inline-flex h-5 items-center rounded-full bg-violet-100 px-2 text-xs font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                Full Control
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mb-2">
              {formatHatId(ownerHat)}
            </p>
          </div>

          {casterHat > 0n && (
            <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Caster Hat</span>
                <span className="inline-flex h-5 items-center rounded-full bg-blue-100 px-2 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Add Keys & Cast
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mb-2">
                {formatHatId(casterHat)}
              </p>
            </div>
          )}
        </div>

        <a
          href={hatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-lg bg-violet-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-violet-700"
        >
          View Tree on Hats App →
        </a>
      </CardContent>
    </Card>
  );
}
