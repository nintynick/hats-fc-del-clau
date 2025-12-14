"use client";

import { useState, useEffect, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSignTypedData } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";
import { FARCASTER_CONTRACTS } from "@/lib/constants";
import { encodeAbiParameters } from "viem";

interface AddKeyProps {
  delegatorAddress: `0x${string}`;
  delegatorFid?: bigint;
  onSuccess?: () => void;
}

type SignerStatus = "idle" | "creating" | "pending_approval" | "approved" | "adding_key" | "error";

interface NeynarSigner {
  signer_uuid: string;
  public_key: string;
  status: string;
  signer_approval_url?: string;
  fid?: number;
}

// EIP-712 domain for SignedKeyRequest
const SIGNED_KEY_REQUEST_VALIDATOR = FARCASTER_CONTRACTS.SIGNED_KEY_REQUEST_VALIDATOR;

export function AddKey({ delegatorAddress, delegatorFid, onSuccess }: AddKeyProps) {
  const [status, setStatus] = useState<SignerStatus>("idle");
  const [signer, setSigner] = useState<NeynarSigner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualPublicKey, setManualPublicKey] = useState("");
  const [manualMetadata, setManualMetadata] = useState("");

  const { address } = useAccount();

  // For signing the key request
  const { signTypedDataAsync } = useSignTypedData();

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Poll for signer approval status
  useEffect(() => {
    if (status !== "pending_approval" || !signer?.signer_uuid) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/signer?signer_uuid=${signer.signer_uuid}`);
        const data = await response.json();

        if (data.status === "approved") {
          setSigner(data);
          setStatus("approved");
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Error polling signer status:", err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [status, signer?.signer_uuid]);

  // Create a new signer via Neynar
  const createSigner = async () => {
    setStatus("creating");
    setError(null);

    try {
      const response = await fetch("/api/signer", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create signer");
      }

      const data = await response.json();
      setSigner(data);

      // Now we need to register the signed key
      await registerSignedKey(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create signer");
      setStatus("error");
    }
  };

  // Register the signed key with Neynar (requires signing)
  const registerSignedKey = async (signerData: NeynarSigner) => {
    if (!address || !delegatorFid) {
      setError("Wallet not connected or delegator has no FID");
      setStatus("error");
      return;
    }

    try {
      // Deadline: 24 hours from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

      // Sign the key request using EIP-712
      const signature = await signTypedDataAsync({
        domain: {
          name: "Farcaster SignedKeyRequestValidator",
          version: "1",
          chainId: 10, // Optimism
          verifyingContract: SIGNED_KEY_REQUEST_VALIDATOR,
        },
        types: {
          SignedKeyRequest: [
            { name: "requestFid", type: "uint256" },
            { name: "key", type: "bytes" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "SignedKeyRequest",
        message: {
          requestFid: delegatorFid,
          key: signerData.public_key as `0x${string}`,
          deadline,
        },
      });

      // Register with Neynar
      const response = await fetch("/api/signer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_uuid: signerData.signer_uuid,
          app_fid: Number(delegatorFid),
          deadline: Number(deadline),
          signature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to register signed key");
      }

      const data = await response.json();
      setSigner(data);
      setStatus("pending_approval");
    } catch (err) {
      console.error("Error registering signed key:", err);
      setError(err instanceof Error ? err.message : "Failed to register signed key");
      setStatus("error");
    }
  };

  // Add the approved key to the delegator contract
  const addKeyToContract = useCallback(async () => {
    if (!signer?.public_key || !address || !delegatorFid) return;

    setStatus("adding_key");

    try {
      // Construct the SignedKeyRequestMetadata
      // This is the format expected by SignedKeyRequestValidator
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      // Sign the metadata
      const signature = await signTypedDataAsync({
        domain: {
          name: "Farcaster SignedKeyRequestValidator",
          version: "1",
          chainId: 10,
          verifyingContract: SIGNED_KEY_REQUEST_VALIDATOR,
        },
        types: {
          SignedKeyRequest: [
            { name: "requestFid", type: "uint256" },
            { name: "key", type: "bytes" },
            { name: "deadline", type: "uint256" },
          ],
        },
        primaryType: "SignedKeyRequest",
        message: {
          requestFid: delegatorFid,
          key: signer.public_key as `0x${string}`,
          deadline,
        },
      });

      // Encode the metadata struct
      const metadata = encodeAbiParameters(
        [
          { name: "requestFid", type: "uint256" },
          { name: "requestSigner", type: "address" },
          { name: "signature", type: "bytes" },
          { name: "deadline", type: "uint256" },
        ],
        [delegatorFid, address, signature, deadline]
      );

      // Call addKey on the delegator
      writeContract({
        address: delegatorAddress,
        abi: HATS_FARCASTER_DELEGATOR_ABI,
        functionName: "addKey",
        args: [
          1, // keyType: 1 = ed25519
          signer.public_key as `0x${string}`,
          1, // metadataType: 1 = SignedKeyRequest
          metadata,
        ],
      });
    } catch (err) {
      console.error("Error adding key to contract:", err);
      setError(err instanceof Error ? err.message : "Failed to add key");
      setStatus("error");
    }
  }, [signer, address, delegatorFid, delegatorAddress, signTypedDataAsync, writeContract]);

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

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        <p>Key added successfully!</p>
        <p className="text-xs mt-1">Transaction: {hash?.slice(0, 16)}...</p>
        {signer && (
          <p className="text-xs mt-1">
            You can now use this signer with Farcaster clients that support custom signers.
          </p>
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
                The key will be created via Neynar and added to the delegator contract.
              </p>
            </Alert>

            <Button onClick={createSigner} className="w-full">
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

        {/* Status: Pending Approval */}
        {status === "pending_approval" && signer && (
          <>
            <Alert variant="warning">
              <p className="text-xs">
                <strong>Action Required:</strong> Approve this signer in Warpcast to continue.
              </p>
            </Alert>

            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Public Key</span>
                <span className="font-mono text-xs truncate max-w-[150px]">
                  {signer.public_key?.slice(0, 10)}...
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Status</span>
                <span className="text-yellow-600 dark:text-yellow-400">Pending Approval</span>
              </div>
            </div>

            {signer.signer_approval_url && (
              <Button
                onClick={() => window.open(signer.signer_approval_url, "_blank")}
                className="w-full"
              >
                Open Warpcast to Approve
              </Button>
            )}

            <p className="text-xs text-zinc-500 text-center">
              Waiting for approval... This page will update automatically.
            </p>
          </>
        )}

        {/* Status: Approved - Ready to add to contract */}
        {status === "approved" && signer && (
          <>
            <Alert variant="success">
              <p className="text-xs">
                Signer approved! Now add it to the delegator contract.
              </p>
            </Alert>

            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Public Key</span>
                <span className="font-mono text-xs truncate max-w-[150px]">
                  {signer.public_key?.slice(0, 10)}...
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Status</span>
                <span className="text-green-600 dark:text-green-400">Approved</span>
              </div>
            </div>

            <Button
              onClick={addKeyToContract}
              className="w-full"
              loading={isPending || isConfirming}
            >
              {isConfirming ? "Confirming..." : "Add Key to Contract"}
            </Button>
          </>
        )}

        {/* Status: Adding Key */}
        {status === "adding_key" && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            <p className="text-sm text-zinc-500">Adding key to contract...</p>
          </div>
        )}

        {/* Error state */}
        {(status === "error" || error || writeError) && (
          <>
            <Alert variant="error">
              {error || writeError?.message?.slice(0, 150) || "An error occurred"}
            </Alert>
            <Button
              onClick={() => {
                setStatus("idle");
                setError(null);
                setSigner(null);
              }}
              variant="ghost"
              className="w-full"
            >
              Try Again
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
