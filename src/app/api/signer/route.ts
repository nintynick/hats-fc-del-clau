import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_API_URL = "https://api.neynar.com/v2/farcaster/signer";

export async function POST(request: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Neynar API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Create a new signer via Neynar
    const response = await fetch(NEYNAR_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NEYNAR_API_KEY,
      },
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
    console.error("Error creating signer:", error);
    return NextResponse.json(
      { error: "Failed to create signer" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Neynar API key not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const signerUuid = searchParams.get("signer_uuid");

  if (!signerUuid) {
    return NextResponse.json(
      { error: "signer_uuid is required" },
      { status: 400 }
    );
  }

  try {
    // Get signer status
    const response = await fetch(`${NEYNAR_API_URL}?signer_uuid=${signerUuid}`, {
      headers: {
        "x-api-key": NEYNAR_API_KEY,
      },
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
    console.error("Error fetching signer:", error);
    return NextResponse.json(
      { error: "Failed to fetch signer" },
      { status: 500 }
    );
  }
}
