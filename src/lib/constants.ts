import { optimism } from "wagmi/chains";

// Farcaster Protocol Contracts (Optimism Mainnet)
export const FARCASTER_CONTRACTS = {
  ID_REGISTRY: "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b" as const,
  ID_GATEWAY: "0x00000000Fc25870C6eD6b6c7E41Fb078b7656f69" as const,
  KEY_REGISTRY: "0x00000000Fc1237824fb747aBDE0FF18990E59b7e" as const,
  KEY_GATEWAY: "0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B" as const,
  SIGNED_KEY_REQUEST_VALIDATOR:
    "0x00000000FC700472606ED4fA22623Acf62c60553" as const,
};

// Hats Protocol (same address on all chains)
export const HATS_CONTRACT = "0x3bc1A0Ad72417f2d411118085256fC53CBdDd137" as const;

// Supported chain
export const SUPPORTED_CHAIN = optimism;

// App metadata
export const APP_NAME = "Farcaster Delegator";
export const APP_DESCRIPTION = "Manage shared Farcaster accounts with Hats Protocol";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
