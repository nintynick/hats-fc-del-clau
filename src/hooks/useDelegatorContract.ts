"use client";

import { useReadContract, useReadContracts } from "wagmi";
import {
  HATS_FARCASTER_DELEGATOR_ABI,
  ID_REGISTRY_ABI,
  ID_GATEWAY_ABI,
} from "@/lib/contracts";
import { FARCASTER_CONTRACTS } from "@/lib/constants";
import type { DelegatorInfo } from "@/types";

interface UseDelegatorContractOptions {
  address: `0x${string}` | undefined;
  enabled?: boolean;
}

export function useDelegatorContract({
  address,
  enabled = true,
}: UseDelegatorContractOptions) {
  // Read ownerHat and casterHat
  const { data: hatsData, isLoading: isLoadingHats } = useReadContracts({
    contracts: [
      {
        address,
        abi: HATS_FARCASTER_DELEGATOR_ABI,
        functionName: "ownerHat",
      },
      {
        address,
        abi: HATS_FARCASTER_DELEGATOR_ABI,
        functionName: "casterHat",
      },
    ],
    query: {
      enabled: enabled && !!address,
    },
  });

  const ownerHat = hatsData?.[0]?.result as bigint | undefined;
  const casterHat = hatsData?.[1]?.result as bigint | undefined;

  // Read fid from IdRegistry
  const { data: fid, isLoading: isLoadingFid } = useReadContract({
    address: FARCASTER_CONTRACTS.ID_REGISTRY,
    abi: ID_REGISTRY_ABI,
    functionName: "idOf",
    args: address ? [address] : undefined,
    query: {
      enabled: enabled && !!address,
    },
  });

  // Read recovery address if fid exists
  const { data: recoveryAddress, isLoading: isLoadingRecovery } =
    useReadContract({
      address: FARCASTER_CONTRACTS.ID_REGISTRY,
      abi: ID_REGISTRY_ABI,
      functionName: "recoveryOf",
      args: fid && fid > 0n ? [fid] : undefined,
      query: {
        enabled: enabled && !!fid && fid > 0n,
      },
    });

  const isLoading = isLoadingHats || isLoadingFid || isLoadingRecovery;

  const delegatorInfo: DelegatorInfo | null =
    address && ownerHat !== undefined
      ? {
          address,
          ownerHat: ownerHat,
          casterHat: casterHat ?? 0n,
          fid: fid && fid > 0n ? fid : null,
          recoveryAddress: recoveryAddress ?? null,
        }
      : null;

  return {
    delegatorInfo,
    isLoading,
    ownerHat,
    casterHat,
    fid,
    recoveryAddress,
  };
}

// Hook to get registration price
export function useRegistrationPrice(extraStorage: bigint = 0n) {
  const { data: price, isLoading } = useReadContract({
    address: FARCASTER_CONTRACTS.ID_GATEWAY,
    abi: ID_GATEWAY_ABI,
    functionName: "price",
    args: [extraStorage],
  });

  return { price, isLoading };
}
