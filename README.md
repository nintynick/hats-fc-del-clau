# Farcaster Delegator Miniapp

A Farcaster miniapp for managing shared Farcaster accounts using the [HatsFarcasterDelegator](https://github.com/Hats-Protocol/farcaster-delegator) smart contract and [Hats Protocol](https://www.hatsprotocol.xyz/).

## Overview

This miniapp allows teams to share control of a Farcaster account through role-based permissions:

- **Owner Hat Wearers**: Full control - register FIDs, add/remove keys, transfer ownership, manage recovery
- **Caster Hat Wearers**: Can add signer keys and post casts from the shared account

## Features

- Register a new Farcaster ID (FID) for the delegator contract
- Add and remove signer keys
- Transfer FID ownership
- Change recovery address
- Mint caster hats to team members
- View hat wearers via Hats Protocol app
- Post casts from the shared account

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web3**: Wagmi v3 + Viem
- **Farcaster**: @farcaster/miniapp-sdk
- **Signer Management**: Neynar API

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A deployed HatsFarcasterDelegator contract
- Neynar API key (for signer creation)

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# App URL (required for miniapp manifest)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Farcaster Account Association (from Warpcast developer tools)
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=

# Neynar API Key (for signer creation)
NEYNAR_API_KEY=

# App FID and Private Key (for signing key requests)
APP_FID=
APP_PRIVATE_KEY=
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

## Deploying a HatsFarcasterDelegator

Use the included deploy script to create a new delegator with proper hat hierarchy:

```bash
# Set your private key
export PRIVATE_KEY=0x...

# Run the deploy script
./scripts/deploy-delegator.sh
```

The script will:
1. Create a new Hats tree with Top Hat, Owner Hat, and Caster Hat
2. Deploy a HatsFarcasterDelegator via the HatsModuleFactory
3. Mint the Owner Hat to your specified address
4. Transfer the Top Hat to the final owner

### Hat Hierarchy

```
Top Hat (tree admin)
└── Owner Hat (full delegator control)
    └── Caster Hat (can add keys and cast)
```

## Contract Addresses (Optimism Mainnet)

| Contract | Address |
|----------|---------|
| Hats Protocol | `0x3bc1A0Ad72417f2d411118085256fC53CBdDd137` |
| HatsModuleFactory | `0x0a3f85fa597B6a967271286aA0724811acDF5CD9` |
| HatsFarcasterDelegator Implementation | `0xa947334c33dadca4bcbb396395ecfd66601bb38c` |
| Farcaster IdRegistry | `0x00000000Fc6c5F01Fc30151999387Bb99A9f489b` |
| Farcaster IdGateway | `0x00000000Fc25870C6eD6b6c7E41Fb078b7656f69` |
| Farcaster KeyRegistry | `0x00000000Fc1237824fb747aBDE0FF18990E59b7e` |
| Farcaster KeyGateway | `0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B` |

## Usage

### Via URL Parameter

Pass the delegator contract address as a URL parameter:

```
https://your-app.vercel.app?contract=0x...
```

### In Warpcast

1. Open the miniapp in Warpcast
2. Enter your HatsFarcasterDelegator contract address
3. Connect your wallet
4. If you wear an authorized hat, you'll see available actions

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main miniapp page
│   ├── providers.tsx           # Wagmi + QueryClient providers
│   └── api/
│       ├── signer/             # Neynar signer API routes
│       ├── cast/               # Cast submission API
│       └── profile/            # Profile update API
├── components/
│   ├── DelegatorApp.tsx        # Main app component
│   ├── ContractInput.tsx       # Contract address input
│   ├── ContractStatus.tsx      # Delegator info display
│   ├── actions/                # Action components
│   │   ├── RegisterFid.tsx
│   │   ├── AddKey.tsx
│   │   ├── RemoveKey.tsx
│   │   ├── TransferFid.tsx
│   │   ├── ChangeRecovery.tsx
│   │   ├── MintCasterHat.tsx
│   │   └── ...
│   └── ui/                     # Reusable UI components
├── hooks/
│   ├── useDelegatorContract.ts # Contract read hooks
│   ├── useHatsCheck.ts         # Hat permission checks
│   └── useFarcasterContext.ts  # SDK context wrapper
├── lib/
│   ├── contracts.ts            # Contract ABIs
│   ├── constants.ts            # Chain config, addresses
│   └── utils.ts                # Helper functions
└── types/
    └── index.ts                # TypeScript types
```

## License

MIT
