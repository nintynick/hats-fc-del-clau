"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardContent, Alert } from "@/components/ui";
import { isValidAddress, getContractFromUrl } from "@/lib/utils";

interface ContractInputProps {
  onSubmit: (address: `0x${string}`) => void;
  isLoading?: boolean;
}

export function ContractInput({ onSubmit, isLoading }: ContractInputProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  // Check URL for contract address on mount
  useEffect(() => {
    const urlContract = getContractFromUrl();
    if (urlContract && isValidAddress(urlContract)) {
      setAddress(urlContract);
      onSubmit(urlContract as `0x${string}`);
    }
  }, [onSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!address) {
      setError("Please enter a contract address");
      return;
    }

    if (!isValidAddress(address)) {
      setError("Invalid Ethereum address");
      return;
    }

    onSubmit(address as `0x${string}`);
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 className="mb-2 text-lg font-semibold">
              Farcaster Delegator
            </h2>
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              Enter the address of a HatsFarcasterDelegator contract to manage.
            </p>
          </div>

          <Input
            label="Contract Address"
            placeholder="0x..."
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setError("");
            }}
            error={error}
            disabled={isLoading}
          />

          <Button
            type="submit"
            className="w-full"
            loading={isLoading}
            disabled={!address || isLoading}
          >
            Load Contract
          </Button>
        </form>

        <div className="mt-4">
          <Alert variant="info">
            <p className="text-xs">
              You can also pass a contract address via URL:
              <br />
              <code className="mt-1 block break-all rounded bg-blue-100 px-1 py-0.5 dark:bg-blue-900/40">
                ?contract=0x...
              </code>
            </p>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
