import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, encodeAbiParameters, hexToBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { optimism } from "viem/chains";

const APP_PRIVATE_KEY = process.env.APP_PRIVATE_KEY;
const APP_FID = process.env.APP_FID;

// EIP-712 types for SignedKeyRequest
const SIGNED_KEY_REQUEST_TYPE = {
  SignedKeyRequest: [
    { name: "requestFid", type: "uint256" },
    { name: "key", type: "bytes" },
    { name: "deadline", type: "uint256" },
  ],
};

// SignedKeyRequestValidator domain
const DOMAIN = {
  name: "Farcaster SignedKeyRequestValidator",
  version: "1",
  chainId: 10,
  verifyingContract: "0x00000000FC700472606ED4fA22623Acf62c60553" as `0x${string}`,
};

export async function POST(request: NextRequest) {
  if (!APP_PRIVATE_KEY || !APP_FID) {
    return NextResponse.json(
      { error: `APP_PRIVATE_KEY and APP_FID must be configured. Got: FID=${APP_FID ? 'set' : 'missing'}, KEY=${APP_PRIVATE_KEY ? 'set' : 'missing'}` },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { publicKey } = body;

    if (!publicKey) {
      return NextResponse.json(
        { error: "publicKey is required" },
        { status: 400 }
      );
    }

    // Ensure private key has 0x prefix
    const privateKey = APP_PRIVATE_KEY.startsWith('0x')
      ? APP_PRIVATE_KEY as `0x${string}`
      : `0x${APP_PRIVATE_KEY}` as `0x${string}`;

    // Create account from private key
    const account = privateKeyToAccount(privateKey);

    // Create wallet client for signing
    const client = createWalletClient({
      account,
      chain: optimism,
      transport: http(),
    });

    // Deadline: 24 hours from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
    const requestFid = BigInt(APP_FID);

    // Sign the key request
    const signature = await client.signTypedData({
      domain: DOMAIN,
      types: SIGNED_KEY_REQUEST_TYPE,
      primaryType: "SignedKeyRequest",
      message: {
        requestFid,
        key: publicKey as `0x${string}`,
        deadline,
      },
    });

    // Encode the metadata struct for the contract
    // SignedKeyRequestMetadata(uint256 requestFid, address requestSigner, bytes signature, uint256 deadline)
    const metadata = encodeAbiParameters(
      [
        { name: "requestFid", type: "uint256" },
        { name: "requestSigner", type: "address" },
        { name: "signature", type: "bytes" },
        { name: "deadline", type: "uint256" },
      ],
      [requestFid, account.address, signature, deadline]
    );

    return NextResponse.json({
      metadata,
      deadline: deadline.toString(),
      requestFid: requestFid.toString(),
      requestSigner: account.address,
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate metadata" },
      { status: 500 }
    );
  }
}
