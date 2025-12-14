import { NextResponse } from "next/server";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const manifest = {
    accountAssociation: {
      // These need to be filled in with actual values when deploying
      // Generate via Warpcast developer tools
      header: process.env.FARCASTER_HEADER || "",
      payload: process.env.FARCASTER_PAYLOAD || "",
      signature: process.env.FARCASTER_SIGNATURE || "",
    },
    frame: {
      version: "1",
      name: "Farcaster Delegator",
      iconUrl: `${appUrl}/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/og-image.png`,
      buttonTitle: "Manage Delegator",
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#8b5cf6",
      webhookUrl: `${appUrl}/api/webhook`,
    },
  };

  return NextResponse.json(manifest);
}
