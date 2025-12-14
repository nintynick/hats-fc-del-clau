"use client";

import { useReadContracts } from "wagmi";
import { HATS_ABI } from "@/lib/contracts";
import { HATS_CONTRACT } from "@/lib/constants";
import type { UserPermissions } from "@/types";

interface UseHatsCheckOptions {
  userAddress: `0x${string}` | undefined;
  ownerHat: bigint | undefined;
  casterHat: bigint | undefined;
  enabled?: boolean;
}

export function useHatsCheck({
  userAddress,
  ownerHat,
  casterHat,
  enabled = true,
}: UseHatsCheckOptions): UserPermissions & { isLoading: boolean } {
  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: HATS_CONTRACT,
        abi: HATS_ABI,
        functionName: "isWearerOfHat",
        args: userAddress && ownerHat ? [userAddress, ownerHat] : undefined,
      },
      {
        address: HATS_CONTRACT,
        abi: HATS_ABI,
        functionName: "isWearerOfHat",
        args: userAddress && casterHat ? [userAddress, casterHat] : undefined,
      },
    ],
    query: {
      enabled: enabled && !!userAddress && (!!ownerHat || !!casterHat),
    },
  });

  const isOwner = (data?.[0]?.result as boolean) ?? false;
  const isCaster = (data?.[1]?.result as boolean) ?? false;

  return {
    isOwner,
    isCaster,
    permission: isOwner ? "owner" : isCaster ? "caster" : "none",
    isLoading,
  };
}

// Hook to get hat details
export function useHatInfo(hatId: bigint | undefined) {
  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: HATS_CONTRACT,
        abi: HATS_ABI,
        functionName: "viewHat",
        args: hatId ? [hatId] : undefined,
      },
    ],
    query: {
      enabled: !!hatId,
    },
  });

  const hatInfo = data?.[0]?.result as
    | [string, number, number, string, string, string, number, boolean, boolean]
    | undefined;

  return {
    hatInfo: hatInfo
      ? {
          details: hatInfo[0],
          maxSupply: hatInfo[1],
          supply: hatInfo[2],
          eligibility: hatInfo[3],
          toggle: hatInfo[4],
          imageURI: hatInfo[5],
          numChildren: hatInfo[6],
          mutable: hatInfo[7],
          active: hatInfo[8],
        }
      : null,
    isLoading,
  };
}
