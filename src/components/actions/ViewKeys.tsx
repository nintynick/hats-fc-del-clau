"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { Card, CardHeader, CardTitle, CardContent, Alert, Button } from "@/components/ui";
import { KEY_REGISTRY_ABI } from "@/lib/contracts";
import { FARCASTER_CONTRACTS } from "@/lib/constants";

interface ViewKeysProps {
  fid: bigint;
}

// Key state: 1 = Added (active), 2 = Removed
const KEY_STATE_ADDED = 1;

export function ViewKeys({ fid }: ViewKeysProps) {
  const [keys, setKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // First get total number of keys
  const { data: totalKeys, isLoading: loadingTotal, error: totalError } = useReadContract({
    address: FARCASTER_CONTRACTS.KEY_REGISTRY,
    abi: KEY_REGISTRY_ABI,
    functionName: "totalKeys",
    args: [fid, KEY_STATE_ADDED],
  });

  // Then fetch the keys
  const { data: keysData, isLoading: loadingKeys, error: keysError, refetch } = useReadContract({
    address: FARCASTER_CONTRACTS.KEY_REGISTRY,
    abi: KEY_REGISTRY_ABI,
    functionName: "keysOf",
    args: [fid, KEY_STATE_ADDED, 0n, totalKeys || 100n],
    query: {
      enabled: totalKeys !== undefined && totalKeys > 0n,
    },
  });

  useEffect(() => {
    if (keysData) {
      const [keysList] = keysData as [readonly `0x${string}`[], readonly number[]];
      // Convert bytes to hex strings for display
      setKeys(keysList ? [...keysList] : []);
      setIsLoading(false);
    } else if (totalKeys === 0n) {
      setKeys([]);
      setIsLoading(false);
    }
  }, [keysData, totalKeys]);

  useEffect(() => {
    if (totalError || keysError) {
      setError(totalError?.message || keysError?.message || "Failed to fetch keys");
      setIsLoading(false);
    }
  }, [totalError, keysError]);

  const formatKey = (key: string) => {
    if (key.length <= 20) return key;
    return `${key.slice(0, 10)}...${key.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loadingTotal || loadingKeys || isLoading) {
    return (
      <Card variant="outline">
        <CardHeader>
          <CardTitle>View Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <span className="ml-2 text-sm text-zinc-500">Loading keys...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>View Keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="info">
          <p className="text-xs">
            Showing active signer keys for FID {fid.toString()}.
            These are the public keys authorized to sign messages on behalf of this FID.
          </p>
        </Alert>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {keys.length === 0 ? (
          <div className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-800 text-center">
            <p className="text-sm text-zinc-500">No active keys found for this FID.</p>
            <p className="text-xs text-zinc-400 mt-1">Use the Add Key action to add a signer.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {keys.length} Active Key{keys.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {keys.map((key, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500">Key {index + 1}</p>
                    <p className="font-mono text-sm truncate" title={key}>
                      {formatKey(key)}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(key)}
                    className="ml-2 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    title="Copy full key"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={() => refetch()}
          variant="ghost"
          className="w-full"
        >
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
