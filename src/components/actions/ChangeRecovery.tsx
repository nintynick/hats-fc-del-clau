"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";
import { isValidAddress, truncateAddress } from "@/lib/utils";

interface ChangeRecoveryProps {
  delegatorAddress: `0x${string}`;
  currentRecovery: `0x${string}` | null;
  onSuccess?: () => void;
}

export function ChangeRecovery({
  delegatorAddress,
  currentRecovery,
  onSuccess,
}: ChangeRecoveryProps) {
  const [newRecovery, setNewRecovery] = useState("");

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

    if (!isValidAddress(newRecovery)) {
      return;
    }

    writeContract({
      address: delegatorAddress,
      abi: HATS_FARCASTER_DELEGATOR_ABI,
      functionName: "changeRecoveryAddress",
      args: [newRecovery as `0x${string}`],
    });
  };

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        Recovery address updated! Transaction: {hash?.slice(0, 10)}...
      </Alert>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Change Recovery Address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {currentRecovery && (
            <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Current Recovery</span>
                <span className="font-mono">{truncateAddress(currentRecovery)}</span>
              </div>
            </div>
          )}

          <Input
            label="New Recovery Address"
            placeholder="0x..."
            value={newRecovery}
            onChange={(e) => setNewRecovery(e.target.value)}
            hint="Address that will be able to recover the FID"
            error={
              newRecovery && !isValidAddress(newRecovery)
                ? "Invalid address"
                : undefined
            }
          />

          {writeError && (
            <Alert variant="error">
              {writeError.message.slice(0, 100)}...
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={isPending || isConfirming}
            disabled={!newRecovery || !isValidAddress(newRecovery)}
          >
            {isConfirming ? "Confirming..." : "Update Recovery"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
