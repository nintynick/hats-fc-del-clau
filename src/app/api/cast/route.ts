import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_CAST_URL = "https://api.neynar.com/v2/farcaster/cast";

export async function POST(request: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Neynar API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { signer_uuid, text, embeds, parent, channel_id } = body;

    if (!signer_uuid) {
      return NextResponse.json(
        { error: "signer_uuid is required" },
        { status: 400 }
      );
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // Build the cast payload
    const castPayload: Record<string, unknown> = {
      signer_uuid,
      text: text.trim(),
    };

    // Optional: add embeds (URLs or cast IDs)
    if (embeds && Array.isArray(embeds) && embeds.length > 0) {
      castPayload.embeds = embeds;
    }

    // Optional: reply to a cast
    if (parent) {
      castPayload.parent = parent;
    }

    // Optional: post to a channel
    if (channel_id) {
      castPayload.channel_id = channel_id;
    }

    // Post the cast via Neynar
    const response = await fetch(NEYNAR_CAST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NEYNAR_API_KEY,
      },
      body: JSON.stringify(castPayload),
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
    console.error("Error posting cast:", error);
    return NextResponse.json(
      { error: "Failed to post cast" },
      { status: 500 }
    );
  }
}
