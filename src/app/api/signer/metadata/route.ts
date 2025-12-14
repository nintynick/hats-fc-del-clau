import { NextRequest, NextResponse } from "next/server";
import { encodeAbiParameters, hexToBytes, bytesToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ViemLocalEip712Signer } from "@farcaster/hub-nodejs";

const APP_PRIVATE_KEY = process.env.APP_PRIVATE_KEY;
const APP_FID = process.env.APP_FID;

// GET endpoint to check configuration
export async function GET() {
  if (!APP_PRIVATE_KEY || !APP_FID) {
    return NextResponse.json({
      configured: false,
      appFid: APP_FID ? 'set' : 'missing',
      appPrivateKey: APP_PRIVATE_KEY ? 'set' : 'missing',
    });
  }

  try {
    // Clean key same as in POST
    let cleanKey = APP_PRIVATE_KEY.trim()
      .replace(/^["']|["']$/g, '')
      .replace(/\s/g, '');

    if (!cleanKey.startsWith('0x')) {
      cleanKey = `0x${cleanKey}`;
    }

    const account = privateKeyToAccount(cleanKey as `0x${string}`);

    return NextResponse.json({
      configured: true,
      appFid: APP_FID.trim(),
      signerAddress: account.address,
      note: "The signerAddress must be the custody address for appFid on Farcaster's IdRegistry"
    });
  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: error instanceof Error ? error.message : "Failed to derive account",
    });
  }
}


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

    // Clean and validate private key
    // Remove any quotes, whitespace, or newlines that might have been added when pasting
    let cleanKey = APP_PRIVATE_KEY.trim()
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\s/g, ''); // Remove any whitespace

    // Ensure 0x prefix
    if (!cleanKey.startsWith('0x')) {
      cleanKey = `0x${cleanKey}`;
    }

    // Validate it's the right length (0x + 64 hex chars = 66 chars)
    if (cleanKey.length !== 66) {
      return NextResponse.json(
        { error: `Invalid private key length: got ${cleanKey.length} chars, expected 66 (0x + 64 hex)` },
        { status: 500 }
      );
    }

    const privateKey = cleanKey as `0x${string}`;

    // Create account from private key
    const account = privateKeyToAccount(privateKey);

    // Create Farcaster EIP-712 signer
    const eip712Signer = new ViemLocalEip712Signer(account);

    // Deadline: 24 hours from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
    const requestFid = BigInt(APP_FID.trim());

    // Sign the key request using Farcaster's signer
    const signatureResult = await eip712Signer.signKeyRequest({
      requestFid,
      key: hexToBytes(publicKey as `0x${string}`),
      deadline,
    });

    if (signatureResult.isErr()) {
      return NextResponse.json(
        { error: `Failed to sign: ${signatureResult.error}` },
        { status: 500 }
      );
    }

    const signature = bytesToHex(signatureResult.value);

    // Encode the metadata struct for the contract as a tuple
    // SignedKeyRequestMetadata(uint256 requestFid, address requestSigner, bytes signature, uint256 deadline)
    const metadata = encodeAbiParameters(
      [
        {
          components: [
            { name: "requestFid", type: "uint256" },
            { name: "requestSigner", type: "address" },
            { name: "signature", type: "bytes" },
            { name: "deadline", type: "uint256" },
          ],
          type: "tuple",
        },
      ],
      [
        {
          requestFid,
          requestSigner: account.address,
          signature,
          deadline,
        },
      ]
    );

    return NextResponse.json({
      metadata,
      deadline: deadline.toString(),
      requestFid: requestFid.toString(),
      requestSigner: account.address,
      // Debug info
      debug: {
        signerAddress: account.address,
        publicKeyUsed: publicKey,
        keyLength: (publicKey as string).length,
      }
    });
  } catch (error) {
    console.error("Error generating metadata:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate metadata" },
      { status: 500 }
    );
  }
}
