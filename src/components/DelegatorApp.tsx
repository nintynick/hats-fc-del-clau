"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useConnect, useReadContract } from "wagmi";
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
  TransferToContract,
  PrepareReceive,
  Cast,
  UpdateProfile,
  ChangeUsername,
  MintCasterHat,
  ViewHatWearers,
} from "./actions";
import { useFarcasterContext, useDelegatorContract, useHatsCheck } from "@/hooks";
import { truncateAddress } from "@/lib/utils";
import { ID_REGISTRY_ABI } from "@/lib/contracts";
import { FARCASTER_CONTRACTS } from "@/lib/constants";
import { ACTIONS, ACTION_GROUPS, type ActionType, type ActionGroup } from "@/types";

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

  // Fetch FID for connected wallet (for Change Username and Transfer to Contract actions)
  const { data: userFid } = useReadContract({
    address: FARCASTER_CONTRACTS.ID_REGISTRY,
    abi: ID_REGISTRY_ABI,
    functionName: "idOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
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
    const farcasterConnector = connectors.find(
      (c) => c.id === "farcasterMiniApp" || c.id === "farcaster"
    );
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  };

  const handleRefresh = () => {
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

  const getActionDisabledReason = (actionType: ActionType): string | null => {
    if (!delegatorInfo) return null;

    const action = ACTIONS.find(a => a.type === actionType);
    if (!action) return null;

    if (!canPerformAction(action.requiredPermission)) {
      return `${action.requiredPermission} only`;
    }

    // Actions that need the CONTRACT to have an FID
    if (["removeKey", "transferFid", "transferToWallet", "changeRecovery", "addKey", "cast", "updateProfile"].includes(actionType)) {
      if (!delegatorInfo.fid) return "needs FID";
    }

    // Transfer to Contract needs user's wallet to have an FID
    if (actionType === "transferToContract") {
      if (!userFid || userFid === 0n) return "needs FID in wallet";
    }

    // Change Username needs the USER'S WALLET to have an FID
    if (actionType === "changeUsername") {
      if (!userFid || userFid === 0n) return "needs FID in wallet";
    }

    // Register only works when contract has NO FID
    if (actionType === "register" && delegatorInfo.fid) {
      return "already registered";
    }

    // prepareReceive and transferToContract only work when contract has NO FID
    if ((actionType === "prepareReceive" || actionType === "transferToContract") && delegatorInfo.fid) {
      return "already has FID";
    }

    return null;
  };

  const getActionsByGroup = (group: ActionGroup) => {
    return ACTIONS.filter(action => action.group === group);
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

          {/* Action Selection - Grouped */}
          {delegatorInfo && permission !== "none" && !selectedAction && (
            <div className="space-y-4">
              {ACTION_GROUPS.map((group) => {
                const groupActions = getActionsByGroup(group.id);
                const hasEnabledActions = groupActions.some(
                  action => !getActionDisabledReason(action.type)
                );

                return (
                  <Card key={group.id}>
                    <CardContent>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                        {group.label}
                      </h3>
                      <div className="space-y-2">
                        {groupActions.map((action) => {
                          const disabledReason = getActionDisabledReason(action.type);
                          const disabled = !!disabledReason;

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
                                {disabledReason && (
                                  <span className="text-xs text-zinc-400">
                                    {disabledReason}
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
                );
              })}
            </div>
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
              {selectedAction === "transferToContract" && userFid && userFid > 0n && (
                <TransferToContract
                  delegatorAddress={contractAddress}
                  userFid={userFid}
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
              {selectedAction === "changeUsername" && userFid && userFid > 0n && delegatorInfo.fid && (
                <ChangeUsername
                  fid={userFid}
                  delegatorFid={delegatorInfo.fid}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "mintCasterHat" && (
                <MintCasterHat
                  casterHat={delegatorInfo.casterHat}
                  onSuccess={handleRefresh}
                />
              )}
              {selectedAction === "viewHatWearers" && (
                <ViewHatWearers
                  ownerHat={delegatorInfo.ownerHat}
                  casterHat={delegatorInfo.casterHat}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
