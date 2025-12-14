"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect, useState, useCallback } from "react";

interface FarcasterContext {
  isReady: boolean;
  user: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  } | null;
}

export function useFarcasterContext() {
  const [context, setContext] = useState<FarcasterContext>({
    isReady: false,
    user: null,
  });

  const initialize = useCallback(async () => {
    try {
      // Get context from SDK
      const sdkContext = await sdk.context;

      if (sdkContext?.user) {
        setContext({
          isReady: true,
          user: {
            fid: sdkContext.user.fid,
            username: sdkContext.user.username,
            displayName: sdkContext.user.displayName,
            pfpUrl: sdkContext.user.pfpUrl,
          },
        });
      } else {
        setContext({ isReady: true, user: null });
      }

      // Signal that the app is ready
      await sdk.actions.ready();
    } catch (error) {
      console.error("Failed to initialize Farcaster SDK:", error);
      setContext({ isReady: true, user: null });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const openUrl = useCallback(async (url: string) => {
    try {
      await sdk.actions.openUrl(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
      // Fallback to window.open
      window.open(url, "_blank");
    }
  }, []);

  const close = useCallback(async () => {
    try {
      await sdk.actions.close();
    } catch (error) {
      console.error("Failed to close miniapp:", error);
    }
  }, []);

  return {
    ...context,
    openUrl,
    close,
  };
}
