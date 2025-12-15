"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";

interface ChangeUsernameProps {
  fid: bigint;
  delegatorFid?: bigint;
  currentUsername?: string;
  onSuccess?: () => void;
}

interface StoredSigner {
  signer_uuid: string;
  public_key: string;
  created_at: string;
}

type UsernameStatus = "idle" | "signing" | "submitting" | "broadcasting" | "success" | "error";

// EIP-712 domain for Fname Registry
const FNAME_DOMAIN = {
  name: "Farcaster name verification",
  version: "1",
  chainId: 1, // Mainnet for fname registry
  verifyingContract: "0xe3be01d99baa8db9905b33a3ca391238234b79d1" as const,
};

const FNAME_TYPES = {
  UserNameProof: [
    { name: "name", type: "string" },
    { name: "timestamp", type: "uint256" },
    { name: "owner", type: "address" },
  ],
} as const;

export function ChangeUsername({ fid, delegatorFid, currentUsername, onSuccess }: ChangeUsernameProps) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signers, setSigners] = useState<StoredSigner[]>([]);
  const [broadcastSkipped, setBroadcastSkipped] = useState(false);
  const [selectedSigner, setSelectedSigner] = useState<string>("");
  const [manualSignerUuid, setManualSignerUuid] = useState("");
  const [useManualSigner, setUseManualSigner] = useState(false);

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Load stored signers from localStorage (same key as Cast component)
  useEffect(() => {
    if (delegatorFid) {
      const stored = localStorage.getItem(`signers_${delegatorFid.toString()}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredSigner[];
          setSigners(parsed);
          if (parsed.length > 0) {
            setSelectedSigner(parsed[0].signer_uuid);
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [delegatorFid]);

  // Get the effective signer UUID (mirrors Cast component pattern)
  const getSignerUuid = () => {
    return (signers.length === 0 || useManualSigner) ? manualSignerUuid : selectedSigner;
  };

  const changeUsername = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }

    if (!walletClient) {
      setError("Wallet not connected");
      return;
    }

    if (!newUsername.trim()) {
      setError("Please enter a new username");
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9][a-z0-9-]{0,15}$/;
    if (!usernameRegex.test(newUsername)) {
      setError("Username must be 1-16 characters, lowercase letters, numbers, and hyphens. Cannot start with hyphen.");
      return;
    }

    setStatus("signing");
    setError(null);

    try {
      const timestamp = Math.floor(Date.now() / 1000);

      // Sign the EIP-712 message using walletClient directly
      const signature = await walletClient.signTypedData({
        domain: FNAME_DOMAIN,
        types: FNAME_TYPES,
        primaryType: "UserNameProof",
        message: {
          name: newUsername,
          timestamp: BigInt(timestamp),
          owner: address,
        },
      });

      setStatus("submitting");

      // Submit to Fname Registry API
      const response = await fetch("https://fnames.farcaster.xyz/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUsername,
          from: 0, // 0 for new registration or if not transferring from another fid
          to: Number(fid),
          fid: Number(fid),
          owner: address,
          timestamp,
          signature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "Failed to change username");
      }

      // Now broadcast the username update to hubs via Neynar
      const signerUuid = getSignerUuid();
      if (signerUuid && signerUuid.trim()) {
        setStatus("broadcasting");

        try {
          const broadcastResponse = await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signer_uuid: signerUuid,
              username: newUsername,
            }),
          });

          if (!broadcastResponse.ok) {
            // Don't fail the whole operation, just note that broadcast failed
            console.warn("Failed to broadcast username to hubs, but fname registry was updated");
            setBroadcastSkipped(true);
          }
        } catch (broadcastErr) {
          console.warn("Failed to broadcast username to hubs:", broadcastErr);
          setBroadcastSkipped(true);
        }
      } else {
        setBroadcastSkipped(true);
      }

      setStatus("success");
      onSuccess?.();
    } catch (err) {
      console.error("Error changing username:", err);
      setError(err instanceof Error ? err.message : "Failed to change username");
      setStatus("error");
    }
  };

  const resetState = () => {
    setStatus("idle");
    setError(null);
    setBroadcastSkipped(false);
  };

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  const broadcastToHubs = async (usernameTobroadcast: string) => {
    const signerUuid = getSignerUuid();

    if (!signerUuid || !signerUuid.trim()) {
      setBroadcastError("Please enter or select a signer UUID");
      return;
    }

    if (!usernameTobroadcast.trim()) {
      setBroadcastError("No username to broadcast");
      return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);
    setBroadcastSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_uuid: signerUuid,
          username: usernameTobroadcast,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to broadcast");
      }

      setBroadcastSkipped(false);
      setBroadcastSuccess(true);
    } catch (err) {
      console.error("Error broadcasting:", err);
      setBroadcastError(err instanceof Error ? err.message : "Failed to broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Signer selection component (mirrors Cast component pattern)
  const SignerSelector = () => (
    <>
      {signers.length > 0 && !useManualSigner ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Select Signer
          </label>
          <select
            value={selectedSigner}
            onChange={(e) => setSelectedSigner(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {signers.map((signer) => (
              <option key={signer.signer_uuid} value={signer.signer_uuid}>
                {signer.signer_uuid.slice(0, 8)}... (added {new Date(signer.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setUseManualSigner(true)}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Enter signer UUID manually
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            label="Signer UUID"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={manualSignerUuid}
            onChange={(e) => setManualSignerUuid(e.target.value)}
            hint="The UUID from Neynar when you created the signer"
          />
          {signers.length > 0 && (
            <button
              type="button"
              onClick={() => setUseManualSigner(false)}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Select from saved signers
            </button>
          )}
        </div>
      )}
    </>
  );

  // Success state
  if (status === "success") {
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Alert variant="success">
            <p>Username changed to @{newUsername}!</p>
            {broadcastSkipped ? (
              <p className="text-xs mt-1">
                Fname registered but broadcast to hubs was skipped.
                Use the button below to broadcast manually.
              </p>
            ) : (
              <p className="text-xs mt-1">
                Username has been registered and broadcast to Farcaster hubs.
              </p>
            )}
          </Alert>

          {/* Manual broadcast section */}
          {broadcastSkipped && (
            <div className="mt-4 space-y-3">
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <p className="text-sm font-medium mb-2">Broadcast to Hubs</p>

                <SignerSelector />

                {broadcastError && (
                  <Alert variant="error" className="mt-2">
                    {broadcastError}
                  </Alert>
                )}

                <Button
                  onClick={() => broadcastToHubs(newUsername)}
                  className="w-full mt-2"
                  loading={isBroadcasting}
                  disabled={
                    signers.length === 0 || useManualSigner
                      ? !manualSignerUuid.trim()
                      : !selectedSigner
                  }
                >
                  {isBroadcasting ? "Broadcasting..." : "Broadcast to Hubs"}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button onClick={resetState} variant="ghost" className="w-full">
              Change Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Change Username</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="warning">
          <p className="text-xs">
            This changes the username (fname) for FID {fid.toString()}.
            Your connected wallet must be the custody address of this FID.
          </p>
          <p className="text-xs mt-1">
            Note: Fnames can only be changed once every 28 days.
          </p>
        </Alert>

        {currentUsername && (
          <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
            <p className="text-xs text-zinc-500">Current username</p>
            <p className="font-mono">@{currentUsername}</p>
          </div>
        )}

        <Input
          label="New Username"
          placeholder="e.g. myaccount"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          hint="1-16 characters, lowercase letters, numbers, hyphens"
        />

        {/* Error */}
        {(status === "error" || error) && (
          <Alert variant="error">
            {error || "An error occurred"}
          </Alert>
        )}

        {/* Submit button */}
        <Button
          onClick={changeUsername}
          className="w-full"
          loading={status === "signing" || status === "submitting" || status === "broadcasting"}
          disabled={!newUsername.trim() || !address}
        >
          {status === "signing"
            ? "Sign in Wallet..."
            : status === "submitting"
            ? "Registering fname..."
            : status === "broadcasting"
            ? "Broadcasting to hubs..."
            : "Change Username"}
        </Button>

        <p className="text-xs text-zinc-500 text-center">
          Connected: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
        </p>

        {/* Broadcast existing username to hubs */}
        {currentUsername && (
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-4">
            <p className="text-sm font-medium mb-2">Broadcast Current Username to Hubs</p>
            <p className="text-xs text-zinc-500 mb-3">
              If your username (@{currentUsername}) isn&apos;t showing in Farcaster clients,
              broadcast it to the hubs.
            </p>

            <SignerSelector />

            {broadcastError && (
              <Alert variant="error" className="mt-2">
                {broadcastError}
              </Alert>
            )}

            {broadcastSuccess && (
              <Alert variant="success" className="mt-2">
                Username broadcast successfully!
              </Alert>
            )}

            <Button
              onClick={() => broadcastToHubs(currentUsername)}
              className="w-full mt-2"
              variant="secondary"
              loading={isBroadcasting}
              disabled={
                signers.length === 0 || useManualSigner
                  ? !manualSignerUuid.trim()
                  : !selectedSigner
              }
            >
              {isBroadcasting ? "Broadcasting..." : "Broadcast to Hubs"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
