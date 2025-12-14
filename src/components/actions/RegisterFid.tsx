"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI } from "@/lib/contracts";
import { useRegistrationPrice } from "@/hooks";
import { formatEth, isValidAddress } from "@/lib/utils";

interface RegisterFidProps {
  delegatorAddress: `0x${string}`;
  onSuccess?: () => void;
}

export function RegisterFid({ delegatorAddress, onSuccess }: RegisterFidProps) {
  const [recoveryAddress, setRecoveryAddress] = useState("");
  const [extraStorage, setExtraStorage] = useState("0");

  const { price, isLoading: isPriceLoading } = useRegistrationPrice(
    BigInt(extraStorage || "0")
  );

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
    status: writeStatus,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  });

  // Debug logging
  console.log("RegisterFid state:", { hash, isPending, isConfirming, isSuccess, writeStatus, writeError: writeError?.message, receiptError: receiptError?.message });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidAddress(recoveryAddress)) {
      return;
    }

    writeContract({
      address: delegatorAddress,
      abi: HATS_FARCASTER_DELEGATOR_ABI,
      functionName: "register",
      args: [recoveryAddress as `0x${string}`, BigInt(extraStorage || "0")],
      value: price ?? parseEther("0.001"), // Fallback if price query fails
    });
  };

  if (isSuccess) {
    onSuccess?.();
    return (
      <Alert variant="success">
        FID registered successfully! Transaction: {hash?.slice(0, 10)}...
      </Alert>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Register New FID</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Recovery Address"
            placeholder="0x..."
            value={recoveryAddress}
            onChange={(e) => setRecoveryAddress(e.target.value)}
            hint="Address that can recover the FID if custody is lost"
            error={
              recoveryAddress && !isValidAddress(recoveryAddress)
                ? "Invalid address"
                : undefined
            }
          />

          <Input
            label="Extra Storage Units"
            type="number"
            min="0"
            value={extraStorage}
            onChange={(e) => setExtraStorage(e.target.value)}
            hint="Additional storage units (optional)"
          />

          <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Registration Cost</span>
              <span className="font-medium">
                {isPriceLoading ? "Loading..." : price ? formatEth(price) : "~0.001 ETH"}
              </span>
            </div>
          </div>

          {writeError && (
            <Alert variant="error">
              {writeError.message.slice(0, 100)}...
            </Alert>
          )}

          {receiptError && (
            <Alert variant="error">
              Receipt error: {receiptError.message.slice(0, 100)}...
            </Alert>
          )}

          {hash && !isSuccess && (
            <Alert variant="info">
              <p className="text-xs">TX submitted: {hash.slice(0, 16)}...</p>
              <p className="text-xs mt-1">Waiting for confirmation...</p>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={isPending || isConfirming}
            disabled={!recoveryAddress || !isValidAddress(recoveryAddress)}
          >
            {isConfirming ? "Confirming..." : "Register FID"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
