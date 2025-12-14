"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";
import { isValidAddress } from "@/lib/utils";

interface TransferFidProps {
  delegatorAddress: `0x${string}`;
  fid: bigint;
  onSuccess?: () => void;
}

export function TransferFid({ delegatorAddress, fid, onSuccess }: TransferFidProps) {
  const [toAddress, setToAddress] = useState("");
  const [deadline, setDeadline] = useState("");
  const [signature, setSignature] = useState("");

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

    if (!isValidAddress(toAddress)) {
      return;
    }

    // Default deadline: 1 hour from now
    const deadlineValue = deadline
      ? BigInt(deadline)
      : BigInt(Math.floor(Date.now() / 1000) + 3600);

    writeContract({
      address: delegatorAddress,
      abi: HATS_FARCASTER_DELEGATOR_ABI,
      functionName: "transferFid",
      args: [
        toAddress as `0x${string}`,
        deadlineValue,
        (signature || "0x") as `0x${string}`,
      ],
    });
  };

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        FID transferred successfully! Transaction: {hash?.slice(0, 10)}...
      </Alert>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Transfer FID Ownership</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">FID to Transfer</span>
              <span className="font-mono font-medium">{fid.toString()}</span>
            </div>
          </div>

          <Input
            label="Recipient Address"
            placeholder="0x..."
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            hint="Address that will receive the FID"
            error={
              toAddress && !isValidAddress(toAddress)
                ? "Invalid address"
                : undefined
            }
          />

          <Input
            label="Deadline (Unix timestamp)"
            placeholder="Leave empty for 1 hour from now"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            hint="When the transfer authorization expires"
          />

          <Input
            label="Signature (Optional)"
            placeholder="0x..."
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            hint="EIP-712 signature for the transfer (if required)"
          />

          <Alert variant="warning">
            <p className="text-xs">
              <strong>Warning:</strong> This will permanently transfer ownership
              of the FID to the recipient. This action cannot be easily undone.
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
            disabled={!toAddress || !isValidAddress(toAddress)}
          >
            {isConfirming ? "Confirming..." : "Transfer FID"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
