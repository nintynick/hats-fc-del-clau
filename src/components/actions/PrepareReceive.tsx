"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";

interface PrepareReceiveProps {
  delegatorAddress: `0x${string}`;
  onSuccess?: () => void;
}

export function PrepareReceive({ delegatorAddress, onSuccess }: PrepareReceiveProps) {
  const [fidToReceive, setFidToReceive] = useState("");

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

    if (!fidToReceive || isNaN(Number(fidToReceive))) {
      return;
    }

    writeContract({
      address: delegatorAddress,
      abi: HATS_FARCASTER_DELEGATOR_ABI,
      functionName: "prepareToReceive",
      args: [BigInt(fidToReceive)],
    });
  };

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        Contract is now ready to receive FID {fidToReceive}! Transaction:{" "}
        {hash?.slice(0, 10)}...
      </Alert>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Prepare to Receive FID</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="FID to Receive"
            type="number"
            min="1"
            placeholder="12345"
            value={fidToReceive}
            onChange={(e) => setFidToReceive(e.target.value)}
            hint="The FID that will be transferred to this contract"
            error={
              fidToReceive && isNaN(Number(fidToReceive))
                ? "Must be a valid number"
                : undefined
            }
          />

          <Alert variant="info">
            <p className="text-xs">
              <strong>Note:</strong> This prepares the contract to receive an existing FID
              from another address. This only works if the contract does NOT already have an FID.
              After calling this, the FID owner can transfer it to this contract.
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
            disabled={!fidToReceive || isNaN(Number(fidToReceive))}
          >
            {isConfirming ? "Confirming..." : "Prepare to Receive"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
