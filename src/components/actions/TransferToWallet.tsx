"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData, useReadContract } from "wagmi";
import { Button, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_FARCASTER_DELEGATOR_ABI, ID_REGISTRY_ABI } from "@/lib/contracts";
import { FARCASTER_CONTRACTS } from "@/lib/constants";

interface TransferToWalletProps {
  delegatorAddress: `0x${string}`;
  fid: bigint;
  onSuccess?: () => void;
}

// EIP-712 domain for IdRegistry
const ID_REGISTRY_DOMAIN = {
  name: "Farcaster IdRegistry",
  version: "1",
  chainId: 10, // Optimism
  verifyingContract: FARCASTER_CONTRACTS.ID_REGISTRY,
};

const TRANSFER_TYPES = {
  Transfer: [
    { name: "fid", type: "uint256" },
    { name: "to", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export function TransferToWallet({ delegatorAddress, fid, onSuccess }: TransferToWalletProps) {
  const [status, setStatus] = useState<"idle" | "signing" | "transferring" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<bigint>(BigInt(0));

  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  // Get the nonce for the receiving address from IdRegistry
  const { data: nonce } = useReadContract({
    address: FARCASTER_CONTRACTS.ID_REGISTRY,
    abi: [
      {
        name: "nonces",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    functionName: "nonces",
    args: address ? [address] : undefined,
  });

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

  // Handle write errors
  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
      setStatus("error");
    }
  }, [writeError]);

  // Handle success
  useEffect(() => {
    if (isSuccess) {
      setStatus("success");
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  const handleTransfer = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    if (nonce === undefined) {
      setError("Could not fetch nonce from IdRegistry");
      return;
    }

    setStatus("signing");
    setError(null);

    try {
      // Set deadline to 1 hour from now
      const newDeadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      setDeadline(newDeadline);

      // Sign the Transfer message as the recipient
      const sig = await signTypedDataAsync({
        domain: ID_REGISTRY_DOMAIN,
        types: TRANSFER_TYPES,
        primaryType: "Transfer",
        message: {
          fid: fid,
          to: address,
          nonce: nonce,
          deadline: newDeadline,
        },
      });

      setSignature(sig);
      setStatus("transferring");

      // Call the delegator's transferFid function
      writeContract({
        address: delegatorAddress,
        abi: HATS_FARCASTER_DELEGATOR_ABI,
        functionName: "transferFid",
        args: [address, newDeadline, sig as `0x${string}`],
      });
    } catch (err) {
      console.error("Error during transfer:", err);
      setError(err instanceof Error ? err.message : "Failed to sign transfer");
      setStatus("error");
    }
  };

  const resetState = () => {
    setStatus("idle");
    setError(null);
    setSignature(null);
    resetWrite();
  };

  if (status === "success") {
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Alert variant="success">
            <p>FID {fid.toString()} transferred to your wallet!</p>
            <p className="text-xs mt-1">Transaction: {hash?.slice(0, 16)}...</p>
          </Alert>
          <p className="text-xs text-zinc-500 mt-3">
            You now have custody of this FID. You can change the username or transfer it to another address.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Transfer FID to Your Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="info">
          <p className="text-xs">
            Transfer FID {fid.toString()} from the delegator contract to your connected wallet.
            This will make you the custody address of the FID.
          </p>
        </Alert>

        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">FID</span>
            <span className="font-mono font-medium">{fid.toString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">From (Delegator)</span>
            <span className="font-mono text-xs">{delegatorAddress.slice(0, 8)}...{delegatorAddress.slice(-6)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">To (Your Wallet)</span>
            <span className="font-mono text-xs">
              {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : "Not connected"}
            </span>
          </div>
        </div>

        <Alert variant="warning">
          <p className="text-xs">
            <strong>Note:</strong> After transferring, you'll have full custody of this FID.
            The delegator contract will no longer be able to use it until you transfer it back.
          </p>
        </Alert>

        {(status === "error" || error) && (
          <Alert variant="error">
            {error || "An error occurred"}
            <Button onClick={resetState} variant="ghost" size="sm" className="mt-2">
              Try Again
            </Button>
          </Alert>
        )}

        <Button
          onClick={handleTransfer}
          className="w-full"
          loading={status === "signing" || status === "transferring" || isPending || isConfirming}
          disabled={!address}
        >
          {status === "signing"
            ? "Sign in Wallet..."
            : status === "transferring" || isPending
            ? "Confirm Transaction..."
            : isConfirming
            ? "Confirming..."
            : "Transfer to My Wallet"}
        </Button>
      </CardContent>
    </Card>
  );
}
