"use client";

import { useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";

interface ChangeUsernameProps {
  fid: bigint;
  currentUsername?: string;
  onSuccess?: () => void;
}

type UsernameStatus = "idle" | "signing" | "submitting" | "success" | "error";

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

export function ChangeUsername({ fid, currentUsername, onSuccess }: ChangeUsernameProps) {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const changeUsername = async () => {
    if (!address) {
      setError("Please connect your wallet");
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

      // Sign the EIP-712 message
      const signature = await signTypedDataAsync({
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
  };

  // Success state
  if (status === "success") {
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Alert variant="success">
            <p>Username changed to @{newUsername}!</p>
            <p className="text-xs mt-1">
              Note: You also need to broadcast a UserDataAdd message to hubs for the change to fully propagate.
            </p>
          </Alert>
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
          loading={status === "signing" || status === "submitting"}
          disabled={!newUsername.trim() || !address}
        >
          {status === "signing"
            ? "Sign in Wallet..."
            : status === "submitting"
            ? "Submitting..."
            : "Change Username"}
        </Button>

        <p className="text-xs text-zinc-500 text-center">
          Connected: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
        </p>
      </CardContent>
    </Card>
  );
}
