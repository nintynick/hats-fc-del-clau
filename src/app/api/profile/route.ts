import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const NEYNAR_UPDATE_USER_URL = "https://api.neynar.com/v2/farcaster/user";

export async function PATCH(request: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "NEYNAR_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { signer_uuid, bio, pfp_url, username, display_name, url } = body;

    if (!signer_uuid) {
      return NextResponse.json(
        { error: "signer_uuid is required" },
        { status: 400 }
      );
    }

    // Build the update payload - only include fields that are provided
    const updatePayload: Record<string, string> = { signer_uuid };

    if (bio !== undefined) updatePayload.bio = bio;
    if (pfp_url !== undefined) updatePayload.pfp_url = pfp_url;
    if (username !== undefined) updatePayload.username = username;
    if (display_name !== undefined) updatePayload.display_name = display_name;
    if (url !== undefined) updatePayload.url = url;

    const response = await fetch(NEYNAR_UPDATE_USER_URL, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NEYNAR_API_KEY,
      },
      body: JSON.stringify(updatePayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Neynar API error:", data);
      return NextResponse.json(
        { error: data.message || "Failed to update profile" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
