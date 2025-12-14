"use client";

import { Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";
import { truncateAddress, formatHatId } from "@/lib/utils";
import type { DelegatorInfo, UserPermissions } from "@/types";

interface ContractStatusProps {
  delegatorInfo: DelegatorInfo;
  permissions: UserPermissions;
  userAddress: `0x${string}` | undefined;
}

export function ContractStatus({
  delegatorInfo,
  permissions,
  userAddress,
}: ContractStatusProps) {
  const { address, ownerHat, casterHat, fid, recoveryAddress } = delegatorInfo;
  const { isOwner, isCaster, permission } = permissions;

  return (
    <div className="space-y-4">
      {/* Contract Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Address</span>
            <span className="font-mono text-sm">{truncateAddress(address)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">FID</span>
            <span className="font-mono text-sm">
              {fid ? fid.toString() : "Not registered"}
            </span>
          </div>

          {recoveryAddress && (
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Recovery</span>
              <span className="font-mono text-sm">
                {truncateAddress(recoveryAddress)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hats Info */}
      <Card>
        <CardHeader>
          <CardTitle>Hats Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-zinc-500 dark:text-zinc-400">Owner Hat</span>
            <span className="font-mono text-xs">{formatHatId(ownerHat)}</span>
          </div>

          {casterHat > 0n && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Caster Hat</span>
              <span className="font-mono text-xs">{formatHatId(casterHat)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Your Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {userAddress && (
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Connected</span>
              <span className="font-mono text-xs">{truncateAddress(userAddress)}</span>
            </div>
          )}
          {!userAddress ? (
            <Alert variant="warning">
              Connect your wallet to check permissions
            </Alert>
          ) : permission === "none" ? (
            <Alert variant="warning">
              <div className="space-y-2">
                <p>Your connected wallet doesn&apos;t wear any authorized hats.</p>
                <p className="text-xs">The Owner Hat must be minted to your Farcaster custody wallet address shown above.</p>
              </div>
            </Alert>
          ) : (
            <div className="space-y-2">
              {isOwner && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-full bg-violet-100 px-2 text-xs font-medium text-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                    Owner
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Full control
                  </span>
                </div>
              )}
              {isCaster && !isOwner && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-full bg-blue-100 px-2 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    Caster
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Can add keys
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
