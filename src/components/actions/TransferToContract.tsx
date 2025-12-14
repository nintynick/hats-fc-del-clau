"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
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
  {
    name: "pendingRecoveryOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [{ name: "recovery", type: "address" }],
  },
] as const;

// HatsFarcasterDelegator ABI for getting the prepared signature
const DELEGATOR_RECEIVE_ABI = [
  {
    name: "receivable",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "fid", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "sig", type: "bytes" },
    ],
  },
] as const;

export function TransferToContract({ delegatorAddress, userFid, onSuccess }: TransferToContractProps) {
  const { address } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // Check if contract is prepared to receive this FID
  const { data: receivableData, isLoading: isLoadingReceivable } = useReadContract({
    address: delegatorAddress,
    abi: DELEGATOR_RECEIVE_ABI,
    functionName: "receivable",
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
    if (!receivableData) {
      setError("Contract is not prepared to receive any FID");
      return;
    }

    const [preparedFid, deadline, sig] = receivableData;

    if (preparedFid !== userFid) {
      setError(`Contract is prepared to receive FID ${preparedFid.toString()}, not your FID ${userFid.toString()}`);
      return;
    }

    if (deadline < BigInt(Math.floor(Date.now() / 1000))) {
      setError("The prepared signature has expired. Please run Prepare to Receive again.");
      return;
    }

    setError(null);

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

  const isPrepared = receivableData && receivableData[0] === userFid;
  const isExpired = receivableData && receivableData[1] < BigInt(Math.floor(Date.now() / 1000));
  const preparedForDifferentFid = receivableData && receivableData[0] !== userFid && receivableData[0] > 0n;

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
        ) : !receivableData || receivableData[0] === 0n ? (
          <Alert variant="warning">
            <p>Contract is not prepared to receive any FID.</p>
            <p className="text-xs mt-1">
              First use "Prepare to Receive" with FID {userFid.toString()}, then come back here.
            </p>
          </Alert>
        ) : preparedForDifferentFid ? (
          <Alert variant="warning">
            <p>Contract is prepared to receive FID {receivableData[0].toString()}, not your FID ({userFid.toString()}).</p>
            <p className="text-xs mt-1">
              Use "Prepare to Receive" with FID {userFid.toString()} first.
            </p>
          </Alert>
        ) : isExpired ? (
          <Alert variant="warning">
            <p>The prepared signature has expired.</p>
            <p className="text-xs mt-1">
              Run "Prepare to Receive" again to get a fresh signature.
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
          disabled={!isPrepared || isExpired || !address}
        >
          {isConfirming ? "Confirming..." : "Transfer FID to Contract"}
        </Button>
      </CardContent>
    </Card>
  );
}
