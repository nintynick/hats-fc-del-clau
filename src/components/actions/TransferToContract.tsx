"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { encodePacked, keccak256, pad, toHex } from "viem";
import { Button, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { ID_REGISTRY_ABI } from "@/lib/contracts";
import { FARCASTER_CONTRACTS } from "@/lib/constants";

interface TransferToContractProps {
  delegatorAddress: `0x${string}`;
  userFid: bigint;
  onSuccess?: () => void;
}

// Full IdRegistry ABI for transfer function
const ID_REGISTRY_TRANSFER_ABI = [
  ...ID_REGISTRY_ABI,
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
      { name: "sig", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

// HatsFarcasterDelegator ABI - receivable is a mapping(uint256 fid => bool)
const DELEGATOR_RECEIVABLE_ABI = [
  {
    name: "receivable",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// TRANSFER_TYPEHASH from IdRegistry: keccak256("Transfer(uint256 fid,address to,uint256 nonce,uint256 deadline)")
const TRANSFER_TYPEHASH = keccak256(
  toHex("Transfer(uint256 fid,address to,uint256 nonce,uint256 deadline)")
);

export function TransferToContract({ delegatorAddress, userFid, onSuccess }: TransferToContractProps) {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // Check if contract is prepared to receive this specific FID
  const { data: isReceivable, isLoading: isLoadingReceivable } = useReadContract({
    address: delegatorAddress,
    abi: DELEGATOR_RECEIVABLE_ABI,
    functionName: "receivable",
    args: [userFid],
  });

  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleTransfer = () => {
    if (!isReceivable) {
      setError("Contract is not prepared to receive this FID");
      return;
    }

    setError(null);

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

    // Build the signature blob that FarcasterDelegator.isValidSignature expects:
    // - Bytes 0-64: dummy signature (65 bytes, can be anything when receivable[fid] = true)
    // - Bytes 65-96: TRANSFER_TYPEHASH (32 bytes)
    // - Bytes 97-128: fid (32 bytes, uint256)

    // 65 zero bytes for the dummy signature
    const dummySig = "0x" + "00".repeat(65);

    // TRANSFER_TYPEHASH is already 32 bytes (0x prefixed 64 hex chars)
    const typehash = TRANSFER_TYPEHASH.slice(2); // remove 0x

    // fid as 32 bytes (padded uint256)
    const fidHex = pad(toHex(userFid), { size: 32 }).slice(2); // remove 0x

    const sig = (dummySig + typehash + fidHex) as `0x${string}`;

    // Call IdRegistry.transfer from user's wallet
    writeContract({
      address: FARCASTER_CONTRACTS.ID_REGISTRY,
      abi: ID_REGISTRY_TRANSFER_ABI,
      functionName: "transfer",
      args: [delegatorAddress, deadline, sig],
    });
  };

  if (isSuccess) {
    onSuccess?.();
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Alert variant="success">
            <p>FID {userFid.toString()} transferred to contract!</p>
            <p className="text-xs mt-1">
              Transaction: {hash?.slice(0, 10)}...
            </p>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Transfer FID to Contract</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Your Wallet FID</span>
            <span className="font-mono">{userFid.toString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Destination</span>
            <span className="font-mono text-xs">{delegatorAddress.slice(0, 6)}...{delegatorAddress.slice(-4)}</span>
          </div>
        </div>

        {isLoadingReceivable ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          </div>
        ) : !isReceivable ? (
          <Alert variant="warning">
            <p>Contract is not prepared to receive FID {userFid.toString()}.</p>
            <p className="text-xs mt-1">
              First use "Prepare to Receive" with FID {userFid.toString()}, then come back here.
            </p>
          </Alert>
        ) : (
          <Alert variant="info">
            <p className="text-xs">
              Contract is ready to receive your FID. This will transfer ownership
              of FID {userFid.toString()} from your wallet to the delegator contract.
            </p>
          </Alert>
        )}

        {(error || writeError) && (
          <Alert variant="error">
            {error || writeError?.message.slice(0, 100)}
          </Alert>
        )}

        <Button
          onClick={handleTransfer}
          className="w-full"
          loading={isPending || isConfirming}
          disabled={!isReceivable || !address}
        >
          {isConfirming ? "Confirming..." : "Transfer FID to Contract"}
        </Button>
      </CardContent>
    </Card>
  );
}
