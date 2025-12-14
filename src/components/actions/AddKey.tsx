"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";
import { isValidHexBytes } from "@/lib/utils";

interface AddKeyProps {
  delegatorAddress: `0x${string}`;
  onSuccess?: () => void;
}

export function AddKey({ delegatorAddress, onSuccess }: AddKeyProps) {
  const [publicKey, setPublicKey] = useState("");
  const [metadata, setMetadata] = useState("");

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidHexBytes(publicKey)) {
      return;
    }

    // keyType 1 = ed25519 signing key
    // metadataType 1 = signed key request
    writeContract({
      address: delegatorAddress,
      abi: HATS_FARCASTER_DELEGATOR_ABI,
      functionName: "addKey",
      args: [
        1, // keyType
        publicKey as `0x${string}`,
        1, // metadataType
        (metadata || "0x") as `0x${string}`,
      ],
    });
  };

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        Key added successfully! Transaction: {hash?.slice(0, 10)}...
      </Alert>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Add Signer Key</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Public Key"
            placeholder="0x..."
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            hint="Ed25519 public key (32 bytes hex)"
            error={
              publicKey && !isValidHexBytes(publicKey)
                ? "Invalid hex bytes"
                : undefined
            }
          />

          <Input
            label="Metadata (Optional)"
            placeholder="0x..."
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            hint="Signed key request metadata from validator"
            error={
              metadata && !isValidHexBytes(metadata)
                ? "Invalid hex bytes"
                : undefined
            }
          />

          <Alert variant="info">
            <p className="text-xs">
              To add a key, you need the public key from a Farcaster signer
              (e.g., from Neynar or your own key generation).
            </p>
          </Alert>

          {writeError && (
            <Alert variant="error">
              {writeError.message.slice(0, 100)}...
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={isPending || isConfirming}
            disabled={!publicKey || !isValidHexBytes(publicKey)}
          >
            {isConfirming ? "Confirming..." : "Add Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
