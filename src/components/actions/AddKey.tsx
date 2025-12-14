"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";

interface AddKeyProps {
  delegatorAddress: `0x${string}`;
  delegatorFid?: bigint;
  onSuccess?: () => void;
}

type SignerStatus = "idle" | "creating" | "ready" | "adding_key" | "error";

interface NeynarSigner {
  signer_uuid: string;
  public_key: string;
  status: string;
  signer_approval_url?: string;
}

export function AddKey({ delegatorAddress, delegatorFid, onSuccess }: AddKeyProps) {
  const [status, setStatus] = useState<SignerStatus>("idle");
  const [signer, setSigner] = useState<NeynarSigner | null>(null);
  const [metadata, setMetadata] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPublicKey, setManualPublicKey] = useState("");
  const [manualMetadata, setManualMetadata] = useState("");

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Create a new signer and get metadata
  const createSignerAndMetadata = async () => {
    setStatus("creating");
    setError(null);

    try {
      // Step 1: Create signer via Neynar
      const signerResponse = await fetch("/api/signer", {
        method: "POST",
      });

      if (!signerResponse.ok) {
        const data = await signerResponse.json();
        throw new Error(data.error || "Failed to create signer");
      }

      const signerData = await signerResponse.json();
      setSigner(signerData);

      // Step 2: Get signed metadata from server
      const metadataResponse = await fetch("/api/signer/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: signerData.public_key }),
      });

      if (!metadataResponse.ok) {
        const data = await metadataResponse.json();
        throw new Error(data.error || "Failed to generate metadata");
      }

      const metadataData = await metadataResponse.json();
      setMetadata(metadataData.metadata);
      setStatus("ready");
    } catch (err) {
      console.error("Error creating signer:", err);
      setError(err instanceof Error ? err.message : "Failed to create signer");
      setStatus("error");
    }
  };

  // Add the key to the delegator contract
  const addKeyToContract = async () => {
    if (!signer?.public_key || !metadata) return;

    setStatus("adding_key");

    try {
      writeContract({
        address: delegatorAddress,
        abi: HATS_FARCASTER_DELEGATOR_ABI,
        functionName: "addKey",
        args: [
          1, // keyType: 1 = ed25519
          signer.public_key as `0x${string}`,
          1, // metadataType: 1 = SignedKeyRequest
          metadata as `0x${string}`,
        ],
      });
    } catch (err) {
      console.error("Error adding key:", err);
      setError(err instanceof Error ? err.message : "Failed to add key");
      setStatus("error");
    }
  };

  // Watch for transaction errors
  useEffect(() => {
    if (writeError) {
      setStatus("error");
    }
  }, [writeError]);


  // Handle manual mode submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    writeContract({
      address: delegatorAddress,
      abi: HATS_FARCASTER_DELEGATOR_ABI,
      functionName: "addKey",
      args: [
        1, // keyType
        manualPublicKey as `0x${string}`,
        1, // metadataType
        (manualMetadata || "0x") as `0x${string}`,
      ],
    });
  };

  const resetState = () => {
    setStatus("idle");
    setError(null);
    setSigner(null);
    setMetadata(null);
    resetWrite();
  };

  // Save signer to localStorage when successful
  useEffect(() => {
    if (isSuccess && signer && delegatorFid) {
      const storageKey = `signers_${delegatorFid.toString()}`;
      const existing = localStorage.getItem(storageKey);
      let signers: Array<{ signer_uuid: string; public_key: string; created_at: string }> = [];

      if (existing) {
        try {
          signers = JSON.parse(existing);
        } catch {
          // Invalid JSON, start fresh
        }
      }

      // Add new signer if not already present
      if (!signers.find(s => s.signer_uuid === signer.signer_uuid)) {
        signers.push({
          signer_uuid: signer.signer_uuid,
          public_key: signer.public_key,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(storageKey, JSON.stringify(signers));
      }
    }
  }, [isSuccess, signer, delegatorFid]);

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        <p>Key added successfully!</p>
        <p className="text-xs mt-1">Transaction: {hash?.slice(0, 16)}...</p>
        {signer && (
          <>
            <p className="text-xs mt-2 font-mono bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
              Signer UUID: {signer.signer_uuid}
            </p>
            <p className="text-xs mt-2">
              This signer has been saved. You can now use it to cast from the shared account!
            </p>
          </>
        )}
      </Alert>
    );
  }

  // Manual mode UI
  if (manualMode) {
    return (
      <Card variant="outline">
        <CardHeader>
          <CardTitle>Add Signer Key (Manual)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Input
              label="Public Key"
              placeholder="0x..."
              value={manualPublicKey}
              onChange={(e) => setManualPublicKey(e.target.value)}
              hint="Ed25519 public key (32 bytes hex)"
            />

            <Input
              label="Metadata"
              placeholder="0x..."
              value={manualMetadata}
              onChange={(e) => setManualMetadata(e.target.value)}
              hint="ABI-encoded SignedKeyRequestMetadata"
            />

            {writeError && (
              <Alert variant="error">
                {writeError.message.slice(0, 150)}...
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setManualMode(false)}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={isPending || isConfirming}
                disabled={!manualPublicKey}
              >
                {isConfirming ? "Confirming..." : "Add Key"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Add Signer Key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status: Idle - Show start button */}
        {status === "idle" && (
          <>
            <Alert variant="info">
              <p className="text-xs">
                Create a new signer key to enable casting from this shared account.
                The signer will be created via Neynar and registered with the delegator contract.
              </p>
            </Alert>

            <Button onClick={createSignerAndMetadata} className="w-full">
              Create New Signer
            </Button>

            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="w-full text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Advanced: Add key manually
            </button>
          </>
        )}

        {/* Status: Creating */}
        {status === "creating" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <p className="text-sm text-zinc-500">Creating signer...</p>
          </div>
        )}

        {/* Status: Ready to add */}
        {status === "ready" && signer && (
          <>
            <Alert variant="success">
              <p className="text-xs">
                Signer created! Now add it to the delegator contract.
              </p>
            </Alert>

            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Public Key</span>
                <span className="font-mono text-xs truncate max-w-[150px]">
                  {signer.public_key?.slice(0, 10)}...{signer.public_key?.slice(-6)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Signer UUID</span>
                <span className="font-mono text-xs truncate max-w-[150px]">
                  {signer.signer_uuid?.slice(0, 8)}...
                </span>
              </div>
            </div>

            <Button
              onClick={addKeyToContract}
              className="w-full"
              loading={isPending || isConfirming}
            >
              {isPending ? "Confirm in Wallet..." : isConfirming ? "Confirming..." : "Add Key to Contract"}
            </Button>
          </>
        )}

        {/* Status: Adding Key (waiting for wallet or confirmation) */}
        {status === "adding_key" && !writeError && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <p className="text-sm text-zinc-500">
              {isPending ? "Confirm in wallet..." : isConfirming ? "Waiting for confirmation..." : "Processing..."}
            </p>
            {hash && (
              <p className="text-xs text-zinc-400 font-mono">
                Tx: {hash.slice(0, 10)}...{hash.slice(-8)}
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {(status === "error" || error || writeError) && (
          <>
            <Alert variant="error">
              {error || writeError?.message?.slice(0, 200) || "An error occurred"}
            </Alert>
            <Button onClick={resetState} variant="ghost" className="w-full">
              Try Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
