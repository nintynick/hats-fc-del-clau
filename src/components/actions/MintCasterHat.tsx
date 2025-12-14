"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { isAddress } from "viem";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { HATS_ABI } from "@/lib/contracts";
import { HATS_CONTRACT } from "@/lib/constants";
import { formatHatId } from "@/lib/utils";

interface MintCasterHatProps {
  casterHat: bigint;
  onSuccess?: () => void;
}

export function MintCasterHat({ casterHat, onSuccess }: MintCasterHatProps) {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { address: userAddress } = useAccount();

  // Ensure casterHat is a bigint
  const hatId = typeof casterHat === "bigint" ? casterHat : BigInt(String(casterHat || "0"));

  // Check if user is admin of the caster hat (can mint it)
  const { data: isAdmin, isLoading: isLoadingAdmin } = useReadContract({
    address: HATS_CONTRACT,
    abi: HATS_ABI,
    functionName: "isAdminOfHat",
    args: userAddress && hatId > 0n ? [userAddress, hatId] : undefined,
    query: {
      enabled: !!userAddress && hatId > 0n,
    },
  });

  // Get hat info
  const { data: hatInfo, isLoading: isLoadingHatInfo } = useReadContract({
    address: HATS_CONTRACT,
    abi: HATS_ABI,
    functionName: "viewHat",
    args: hatId > 0n ? [hatId] : undefined,
    query: {
      enabled: hatId > 0n,
    },
  });

  // Check if recipient already wears the hat
  const { data: recipientWearsHat } = useReadContract({
    address: HATS_CONTRACT,
    abi: HATS_ABI,
    functionName: "isWearerOfHat",
    args: isAddress(recipientAddress) && hatId > 0n ? [recipientAddress as `0x${string}`, hatId] : undefined,
    query: {
      enabled: isAddress(recipientAddress) && hatId > 0n,
    },
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

  const handleMint = () => {
    if (!isAddress(recipientAddress)) {
      setError("Please enter a valid address");
      return;
    }

    if (recipientWearsHat) {
      setError("This address already wears the caster hat");
      return;
    }

    setError(null);

    writeContract({
      address: HATS_CONTRACT,
      abi: HATS_ABI,
      functionName: "mintHat",
      args: [hatId, recipientAddress as `0x${string}`],
    });
  };

  // Calculate supply info
  const currentSupply = hatInfo ? Number(hatInfo[2]) : 0;
  const maxSupply = hatInfo ? Number(hatInfo[1]) : 0;
  const atMaxSupply = maxSupply > 0 && currentSupply >= maxSupply;

  // If hatId is 0, show an error
  if (hatId === 0n) {
    return (
      <Card variant="outline">
        <CardHeader>
          <CardTitle>Mint Caster Hat</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <p>No caster hat configured for this delegator.</p>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (isSuccess) {
    onSuccess?.();
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Alert variant="success">
            <p>Caster hat minted successfully!</p>
            <p className="text-xs mt-1">
              {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)} can now add signer keys and cast.
            </p>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Mint Caster Hat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hat Info */}
        <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Hat ID</span>
            <span className="font-mono text-xs">{formatHatId(hatId)}</span>
          </div>
          {hatInfo && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Supply</span>
              <span className="font-mono text-xs">
                {currentSupply} / {maxSupply === 0 ? "unlimited" : maxSupply}
              </span>
            </div>
          )}
        </div>

        {/* Loading state */}
        {(isLoadingAdmin || isLoadingHatInfo) ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          </div>
        ) : !isAdmin ? (
          /* Not admin warning */
          <Alert variant="warning">
            <p>You are not an admin of this hat.</p>
            <p className="text-xs mt-1">
              Only admins (wearers of the parent hat) can mint the caster hat.
            </p>
          </Alert>
        ) : atMaxSupply ? (
          /* Max supply reached */
          <Alert variant="warning">
            <p>Maximum supply reached.</p>
            <p className="text-xs mt-1">
              This hat has reached its max supply of {maxSupply}.
            </p>
          </Alert>
        ) : (
          /* Mint form */
          <>
            <Input
              label="Recipient Address"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              hint="The address that will receive the caster hat"
              error={
                recipientAddress && !isAddress(recipientAddress)
                  ? "Invalid address"
                  : recipientWearsHat
                  ? "Already wears this hat"
                  : undefined
              }
            />

            <Alert variant="info">
              <p className="text-xs">
                Minting the caster hat to an address allows them to add signer keys
                and post casts from the shared account.
              </p>
            </Alert>
          </>
        )}

        {/* Error display */}
        {(error || writeError) && (
          <Alert variant="error">
            {error || writeError?.message?.slice(0, 100)}
          </Alert>
        )}

        {/* Mint button */}
        <Button
          onClick={handleMint}
          className="w-full"
          loading={isPending || isConfirming}
          disabled={
            !isAdmin ||
            !isAddress(recipientAddress) ||
            !!recipientWearsHat ||
            atMaxSupply ||
            isLoadingAdmin ||
            isLoadingHatInfo
          }
        >
          {isConfirming ? "Confirming..." : "Mint Caster Hat"}
        </Button>
      </CardContent>
    </Card>
  );
}
