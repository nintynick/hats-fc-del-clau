import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_REGISTER_URL = "https://api.neynar.com/v2/farcaster/signer/signed_key";

export async function POST(request: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Neynar API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { signer_uuid, app_fid, deadline, signature } = body;

    if (!signer_uuid || !app_fid || !deadline || !signature) {
      return NextResponse.json(
        { error: "Missing required fields: signer_uuid, app_fid, deadline, signature" },
        { status: 400 }
      );
    }

    // Register the signed key with Neynar
    const response = await fetch(NEYNAR_REGISTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        signer_uuid,
        app_fid,
        deadline,
        signature,
        sponsored_by_neynar: true, // Let Neynar sponsor the gas
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Neynar API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error registering signed key:", error);
    return NextResponse.json(
      { error: "Failed to register signed key" },
      { status: 500 }
    );
  }
}
