"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";

interface CastProps {
  delegatorFid?: bigint;
  onSuccess?: () => void;
}

interface StoredSigner {
  signer_uuid: string;
  public_key: string;
  created_at: string;
}

type CastStatus = "idle" | "loading_signers" | "ready" | "posting" | "success" | "error";

export function Cast({ delegatorFid, onSuccess }: CastProps) {
  const [status, setStatus] = useState<CastStatus>("idle");
  const [signers, setSigners] = useState<StoredSigner[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<string>("");
  const [manualSignerUuid, setManualSignerUuid] = useState("");
  const [castText, setCastText] = useState("");
  const [channelId, setChannelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [castHash, setCastHash] = useState<string | null>(null);
  const [useManualSigner, setUseManualSigner] = useState(false);

  // Load stored signers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`signers_${delegatorFid?.toString()}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredSigner[];
        setSigners(parsed);
        if (parsed.length > 0) {
          setSelectedSigner(parsed[0].signer_uuid);
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [delegatorFid]);

  const postCast = async () => {
    // Use manual input if no saved signers OR if user switched to manual mode
    const signerUuid = (signers.length === 0 || useManualSigner) ? manualSignerUuid : selectedSigner;

    if (!signerUuid || !signerUuid.trim()) {
      setError("Please enter or select a signer UUID");
      return;
    }

    if (!castText.trim()) {
      setError("Please enter some text for your cast");
      return;
    }

    setStatus("posting");
    setError(null);

    try {
      const response = await fetch("/api/cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_uuid: signerUuid,
          text: castText,
          channel_id: channelId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to post cast");
      }

      const data = await response.json();
      setCastHash(data.cast?.hash || data.hash);
      setStatus("success");
      setCastText("");
      onSuccess?.();
    } catch (err) {
      console.error("Error posting cast:", err);
      setError(err instanceof Error ? err.message : "Failed to post cast");
      setStatus("error");
    }
  };

  const resetState = () => {
    setStatus("idle");
    setError(null);
    setCastHash(null);
  };

  // Success state
  if (status === "success") {
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Alert variant="success">
            <p>Cast posted successfully!</p>
            {castHash && (
              <p className="text-xs mt-1 font-mono">
                Hash: {castHash.slice(0, 16)}...
              </p>
            )}
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button onClick={resetState} variant="ghost" className="flex-1">
              Post Another
            </Button>
            {castHash && (
              <Button
                onClick={() => window.open(`https://warpcast.com/~/conversations/${castHash}`, "_blank")}
                className="flex-1"
              >
                View on Warpcast
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Cast from Shared Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="info">
          <p className="text-xs">
            Post a cast from FID {delegatorFid?.toString() || "?"} using a registered signer.
            You need a signer UUID from a key you've added to this delegator.
          </p>
        </Alert>

        {/* Signer selection */}
        {signers.length > 0 && !useManualSigner ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select Signer
            </label>
            <select
              value={selectedSigner}
              onChange={(e) => setSelectedSigner(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {signers.map((signer) => (
                <option key={signer.signer_uuid} value={signer.signer_uuid}>
                  {signer.signer_uuid.slice(0, 8)}... (added {new Date(signer.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setUseManualSigner(true)}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Enter signer UUID manually
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              label="Signer UUID"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={manualSignerUuid}
              onChange={(e) => setManualSignerUuid(e.target.value)}
              hint="The UUID from Neynar when you created the signer"
            />
            {signers.length > 0 && (
              <button
                type="button"
                onClick={() => setUseManualSigner(false)}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Select from saved signers
              </button>
            )}
          </div>
        )}

        {/* Cast text */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cast Text
          </label>
          <textarea
            value={castText}
            onChange={(e) => setCastText(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            maxLength={320}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 resize-none"
          />
          <p className="text-xs text-zinc-500 text-right">
            {castText.length}/320
          </p>
        </div>

        {/* Optional channel */}
        <Input
          label="Channel (optional)"
          placeholder="e.g. farcaster"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          hint="Post to a specific channel"
        />

        {/* Error */}
        {(status === "error" || error) && (
          <Alert variant="error">
            {error || "An error occurred"}
          </Alert>
        )}

        {/* Submit button */}
        <Button
          onClick={postCast}
          className="w-full"
          loading={status === "posting"}
          disabled={!castText.trim() || (signers.length === 0 ? !manualSignerUuid.trim() : (!selectedSigner && !manualSignerUuid.trim()))}
        >
          {status === "posting" ? "Posting..." : "Post Cast"}
        </Button>
      </CardContent>
    </Card>
  );
}
