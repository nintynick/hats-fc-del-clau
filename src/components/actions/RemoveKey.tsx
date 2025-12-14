"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";
import { isValidHexBytes } from "@/lib/utils";

interface RemoveKeyProps {
  delegatorAddress: `0x${string}`;
  onSuccess?: () => void;
}

export function RemoveKey({ delegatorAddress, onSuccess }: RemoveKeyProps) {
  const [publicKey, setPublicKey] = useState("");

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

    writeContract({
      address: delegatorAddress,
      abi: HATS_FARCASTER_DELEGATOR_ABI,
      functionName: "removeKey",
      args: [publicKey as `0x${string}`],
    });
  };

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        Key removed successfully! Transaction: {hash?.slice(0, 10)}...
      </Alert>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Remove Signer Key</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Public Key to Remove"
            placeholder="0x..."
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            hint="The ed25519 public key to revoke"
            error={
              publicKey && !isValidHexBytes(publicKey)
                ? "Invalid hex bytes"
                : undefined
            }
          />

          <Alert variant="warning">
            <p className="text-xs">
              Removing a key will revoke casting permissions for anyone using
              this signer. This action cannot be undone.
            </p>
          </Alert>

          {writeError && (
            <Alert variant="error">
              {writeError.message.slice(0, 100)}...
            </Alert>
          )}

          <Button
            type="submit"
            variant="danger"
            className="w-full"
            loading={isPending || isConfirming}
            disabled={!publicKey || !isValidHexBytes(publicKey)}
          >
            {isConfirming ? "Confirming..." : "Remove Key"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
