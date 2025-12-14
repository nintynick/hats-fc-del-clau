"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { ContractInput } from "./ContractInput";
import { ContractStatus } from "./ContractStatus";
import { Button, Card, CardContent, Alert } from "@/components/ui";
import {
  RegisterFid,
  AddKey,
  RemoveKey,
  ChangeRecovery,
  TransferFid,
  TransferToWallet,
  PrepareReceive,
  Cast,
  UpdateProfile,
  ChangeUsername,
} from "./actions";
import { useFarcasterContext, useDelegatorContract, useHatsCheck } from "@/hooks";
import { truncateAddress } from "@/lib/utils";
import { ACTIONS, type ActionType } from "@/types";

export function DelegatorApp() {
  const [contractAddress, setContractAddress] = useState<`0x${string}` | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);

  const { isReady, user } = useFarcasterContext();
  const { address: userAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const { delegatorInfo, isLoading: isLoadingContract } = useDelegatorContract({
    address: contractAddress ?? undefined,
    enabled: !!contractAddress,
  });

  const { isOwner, isCaster, permission, isLoading: isLoadingPermissions } =
    useHatsCheck({
      userAddress,
      ownerHat: delegatorInfo?.ownerHat,
      casterHat: delegatorInfo?.casterHat,
      enabled: !!delegatorInfo && !!userAddress,
    });

  // Auto-connect wallet when contract is selected
  useEffect(() => {
    if (contractAddress && !isConnected) {
      const farcasterConnector = connectors.find(
        (c) => c.id === "farcasterMiniApp" || c.id === "farcaster"
      );
      if (farcasterConnector) {
        connect({ connector: farcasterConnector });
      }
    }
  }, [contractAddress, isConnected, connectors, connect]);

  const handleContractSubmit = useCallback((address: `0x${string}`) => {
    setContractAddress(address);
    setSelectedAction(null);
  }, []);

  const handleConnect = () => {
    // The official farcaster miniapp connector id is "farcasterMiniApp"
    const farcasterConnector = connectors.find(
      (c) => c.id === "farcasterMiniApp" || c.id === "farcaster"
    );
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  };

  const handleRefresh = () => {
    // Force refetch by resetting and re-setting address
    const addr = contractAddress;
    setContractAddress(null);
    setTimeout(() => setContractAddress(addr), 100);
    setSelectedAction(null);
  };

  const canPerformAction = (requiredPermission: string) => {
    if (requiredPermission === "owner") return isOwner;
    if (requiredPermission === "caster") return isOwner || isCaster;
    return false;
  };

  // Loading state
  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  // No contract selected
  if (!contractAddress) {
    return (
      <div className="miniapp-container">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Farcaster Delegator</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage shared Farcaster accounts with Hats Protocol
          </p>
        </div>

        {user && (
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
            {user.pfpUrl && (
              <img
                src={user.pfpUrl}
                alt={user.displayName || user.username}
                className="h-10 w-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{user.displayName || user.username}</p>
              <p className="text-sm text-zinc-500">@{user.username}</p>
            </div>
          </div>
        )}

        <ContractInput
          onSubmit={handleContractSubmit}
          isLoading={isLoadingContract}
        />
      </div>
    );
  }

  // Contract loaded
  return (
    <div className="miniapp-container space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Delegator</h1>
          <p className="text-xs text-zinc-500 font-mono">
            {truncateAddress(contractAddress, 6)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setContractAddress(null)}>
          Change
        </Button>
      </div>

      {/* Wallet Connection */}
      {!isConnected ? (
        <Card>
          <CardContent>
            <Alert variant="warning">
              <div className="space-y-2">
                <p>Connect your wallet to check permissions and perform actions.</p>
                <Button size="sm" onClick={handleConnect}>
                  Connect Wallet
                </Button>
              </div>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Loading state */}
          {(isLoadingContract || isLoadingPermissions) && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            </div>
          )}

          {/* Contract Status */}
          {delegatorInfo && !isLoadingContract && (
            <ContractStatus
              delegatorInfo={delegatorInfo}
              permissions={{ isOwner, isCaster, permission }}
              userAddress={userAddress}
            />
          )}

          {/* Action Selection */}
          {delegatorInfo && permission !== "none" && !selectedAction && (
            <Card>
              <CardContent>
                <h3 className="mb-3 font-semibold">Actions</h3>
                <div className="space-y-2">
                  {ACTIONS.map((action) => {
                    const canDo = canPerformAction(action.requiredPermission);
                    const needsFid =
                      ["removeKey", "transferFid", "transferToWallet", "changeRecovery", "addKey", "cast", "updateProfile", "changeUsername"].includes(
                        action.type
                      ) && !delegatorInfo.fid;
                    const hasFid =
                      action.type === "register" && delegatorInfo.fid;
                    // prepareReceive only works when contract has NO FID
                    const cantPrepare =
                      action.type === "prepareReceive" && delegatorInfo.fid;

                    const disabled = !canDo || needsFid || !!hasFid || !!cantPrepare;

                    return (
                      <button
                        key={action.type}
                        onClick={() => setSelectedAction(action.type)}
                        disabled={disabled}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          disabled
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-500"
                            : "border-zinc-200 hover:border-violet-300 hover:bg-violet-50 dark:border-zinc-700 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{action.label}</span>
                          {!canDo && (
                            <span className="text-xs text-zinc-400">
                              {action.requiredPermission} only
                            </span>
                          )}
                          {needsFid && (
                            <span className="text-xs text-zinc-400">
                              needs FID
                            </span>
                          )}
                          {hasFid && (
                            <span className="text-xs text-zinc-400">
                              already registered
                            </span>
                          )}
                          {cantPrepare && (
                            <span className="text-xs text-zinc-400">
                              already has FID
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {action.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Forms */}
          {selectedAction && delegatorInfo && (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAction(null)}
              >
                ← Back to actions
              </Button>

              {selectedAction === "register" && (
                <RegisterFid
                  delegatorAddress={contractAddress}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "addKey" && (
                <AddKey
                  delegatorAddress={contractAddress}
                  delegatorFid={delegatorInfo.fid ?? undefined}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "removeKey" && (
                <RemoveKey
                  delegatorAddress={contractAddress}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "changeRecovery" && (
                <ChangeRecovery
                  delegatorAddress={contractAddress}
                  currentRecovery={delegatorInfo.recoveryAddress}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "transferFid" && delegatorInfo.fid && (
                <TransferFid
                  delegatorAddress={contractAddress}
                  fid={delegatorInfo.fid}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "transferToWallet" && delegatorInfo.fid && (
                <TransferToWallet
                  delegatorAddress={contractAddress}
                  fid={delegatorInfo.fid}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "prepareReceive" && (
                <PrepareReceive
                  delegatorAddress={contractAddress}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "cast" && delegatorInfo.fid && (
                <Cast
                  delegatorFid={delegatorInfo.fid}
                />
              )}
              {selectedAction === "updateProfile" && delegatorInfo.fid && (
                <UpdateProfile
                  delegatorFid={delegatorInfo.fid}
                />
              )}
              {selectedAction === "changeUsername" && delegatorInfo.fid && (
                <ChangeUsername
                  fid={delegatorInfo.fid}
                  onSuccess={handleRefresh}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
