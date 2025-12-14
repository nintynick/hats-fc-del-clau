import { type ClassValue, clsx } from "clsx";

// Truncate Ethereum address for display
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Format hat ID for display (they're very large numbers)
export function formatHatId(hatId: bigint): string {
  return `0x${hatId.toString(16).padStart(64, "0").slice(0, 16)}...`;
}

// Get the top hat (tree) ID from any hat ID
// In Hats Protocol, the top hat ID is the first 32 bits (4 bytes) of the hat ID
// The top hat for a tree has the form: treeId << 224
export function getTreeId(hatId: bigint): number {
  // Shift right by 224 bits to get the tree ID
  return Number(hatId >> 224n);
}

// Get the Hats App URL for a hat
export function getHatsAppUrl(hatId: bigint, chainId: number = 10): string {
  const treeId = getTreeId(hatId);
  return `https://app.hatsprotocol.xyz/trees/${chainId}/${treeId}`;
}

// Format ETH value
export function formatEth(wei: bigint, decimals = 4): string {
  const eth = Number(wei) / 1e18;
  return `${eth.toFixed(decimals)} ETH`;
}

// Simple class name utility
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Check if string is valid Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Check if string is valid hex bytes
export function isValidHexBytes(hex: string): boolean {
  return /^0x[a-fA-F0-9]*$/.test(hex) && hex.length % 2 === 0;
}

// Parse URL search params for contract address
export function getContractFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("contract");
}
