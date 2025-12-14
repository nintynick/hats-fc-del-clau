"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert } from "@/components/ui";

interface UpdateProfileProps {
  delegatorFid?: bigint;
  onSuccess?: () => void;
}

interface StoredSigner {
  signer_uuid: string;
  public_key: string;
  created_at: string;
}

type ProfileStatus = "idle" | "updating" | "success" | "error";

export function UpdateProfile({ delegatorFid, onSuccess }: UpdateProfileProps) {
  const [status, setStatus] = useState<ProfileStatus>("idle");
  const [signers, setSigners] = useState<StoredSigner[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<string>("");
  const [manualSignerUuid, setManualSignerUuid] = useState("");
  const [useManualSigner, setUseManualSigner] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [pfpUrl, setPfpUrl] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  const [error, setError] = useState<string | null>(null);

  // Load stored signers from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`signers_${delegatorFid?.toString()}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as StoredSigner[];
        setSigners(parsed);
        if (parsed.length > 0) {
          setSelectedSigner(parsed[0].signer_uuid);
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [delegatorFid]);

  const updateProfile = async () => {
    const signerUuid = (signers.length === 0 || useManualSigner) ? manualSignerUuid : selectedSigner;

    if (!signerUuid || !signerUuid.trim()) {
      setError("Please enter or select a signer UUID");
      return;
    }

    // Check if at least one field is filled
    if (!displayName && !bio && !pfpUrl && !profileUrl) {
      setError("Please fill in at least one field to update");
      return;
    }

    setStatus("updating");
    setError(null);

    try {
      const updatePayload: Record<string, string> = {
        signer_uuid: signerUuid,
      };

      if (displayName.trim()) updatePayload.display_name = displayName.trim();
      if (bio.trim()) updatePayload.bio = bio.trim();
      if (pfpUrl.trim()) updatePayload.pfp_url = pfpUrl.trim();
      if (profileUrl.trim()) updatePayload.url = profileUrl.trim();

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      setStatus("success");
      onSuccess?.();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
      setStatus("error");
    }
  };

  const resetState = () => {
    setStatus("idle");
    setError(null);
  };

  // Success state
  if (status === "success") {
    return (
      <Card variant="outline">
        <CardContent className="py-6">
          <Alert variant="success">
            <p>Profile updated successfully!</p>
            <p className="text-xs mt-1">
              Changes may take a few moments to propagate across Farcaster clients.
            </p>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button onClick={resetState} variant="ghost" className="flex-1">
              Update Again
            </Button>
            <Button
              onClick={() => window.open(`https://warpcast.com/~/profiles/${delegatorFid?.toString()}`, "_blank")}
              className="flex-1"
            >
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outline">
      <CardHeader>
        <CardTitle>Update Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="info">
          <p className="text-xs">
            Update the profile for FID {delegatorFid?.toString() || "?"}.
            Only fill in the fields you want to change.
          </p>
          <p className="text-xs mt-1 text-zinc-400">
            Note: Username (fname) changes require an on-chain signature from the contract and are not yet supported.
          </p>
        </Alert>

        {/* Signer selection */}
        {signers.length > 0 && !useManualSigner ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select Signer
            </label>
            <select
              value={selectedSigner}
              onChange={(e) => setSelectedSigner(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {signers.map((signer) => (
                <option key={signer.signer_uuid} value={signer.signer_uuid}>
                  {signer.signer_uuid.slice(0, 8)}... (added {new Date(signer.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setUseManualSigner(true)}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Enter signer UUID manually
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              label="Signer UUID"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={manualSignerUuid}
              onChange={(e) => setManualSignerUuid(e.target.value)}
              hint="The UUID from a signer you've added to this delegator"
            />
            {signers.length > 0 && (
              <button
                type="button"
                onClick={() => setUseManualSigner(false)}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Select from saved signers
              </button>
            )}
          </div>
        )}

        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4 space-y-4">
          <Input
            label="Display Name"
            placeholder="e.g. Shared Account"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            hint="The name shown on the profile"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about this account..."
              rows={3}
              maxLength={256}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 resize-none"
            />
            <p className="text-xs text-zinc-500 text-right">
              {bio.length}/256
            </p>
          </div>

          <Input
            label="Profile Picture URL"
            placeholder="https://example.com/image.png"
            value={pfpUrl}
            onChange={(e) => setPfpUrl(e.target.value)}
            hint="Direct link to an image file"
          />

          <Input
            label="Website URL"
            placeholder="https://example.com"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            hint="Link shown on profile"
          />
        </div>

        {/* Error */}
        {(status === "error" || error) && (
          <Alert variant="error">
            {error || "An error occurred"}
          </Alert>
        )}

        {/* Submit button */}
        <Button
          onClick={updateProfile}
          className="w-full"
          loading={status === "updating"}
          disabled={
            (signers.length === 0 || useManualSigner
              ? !manualSignerUuid.trim()
              : !selectedSigner) ||
            (!displayName && !bio && !pfpUrl && !profileUrl)
          }
        >
          {status === "updating" ? "Updating..." : "Update Profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
