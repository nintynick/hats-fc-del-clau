// Delegator types and action configurations
export type Permission = "owner" | "caster" | "none";

export interface DelegatorInfo {
  address: `0x${string}`;
  ownerHat: bigint;
  casterHat: bigint;
  fid: bigint | null;
  recoveryAddress: `0x${string}` | null;
}

export interface UserPermissions {
  isOwner: boolean;
  isCaster: boolean;
  permission: Permission;
}

export interface HatInfo {
  id: bigint;
  details: string;
  imageURI: string;
  active: boolean;
}

export type ActionType =
  | "register"
  | "addKey"
  | "removeKey"
  | "transferFid"
  | "transferToWallet"
  | "transferToContract"
  | "changeRecovery"
  | "prepareReceive"
  | "cast"
  | "updateProfile"
  | "changeUsername"
  | "mintCasterHat"
  | "viewHatWearers";

export type ActionGroup = "content" | "keys" | "ownership" | "account" | "hats";

export interface ActionConfig {
  type: ActionType;
  label: string;
  description: string;
  requiredPermission: Permission;
  group: ActionGroup;
}

export const ACTION_GROUPS: { id: ActionGroup; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "keys", label: "Signer Keys" },
  { id: "hats", label: "Hats Management" },
  { id: "ownership", label: "FID Ownership" },
  { id: "account", label: "Account Settings" },
];

export const ACTIONS: ActionConfig[] = [
  // Content group - things casters do regularly
  {
    type: "cast",
    label: "Cast",
    description: "Post a cast from the shared account",
    requiredPermission: "caster",
    group: "content",
  },
  {
    type: "updateProfile",
    label: "Update Profile",
    description: "Change display name, bio, or profile picture",
    requiredPermission: "caster",
    group: "content",
  },
  // Keys group - managing signer keys
  {
    type: "addKey",
    label: "Add Key",
    description: "Add a signer key to enable casting",
    requiredPermission: "caster",
    group: "keys",
  },
  {
    type: "removeKey",
    label: "Remove Key",
    description: "Remove a signer key",
    requiredPermission: "owner",
    group: "keys",
  },
  // Hats group - managing hat wearers
  {
    type: "mintCasterHat",
    label: "Mint Caster Hat",
    description: "Grant caster permissions to an address",
    requiredPermission: "owner",
    group: "hats",
  },
  {
    type: "viewHatWearers",
    label: "View Hat Wearers",
    description: "See who has owner and caster hats",
    requiredPermission: "caster",
    group: "hats",
  },
  // Ownership group - FID transfers
  {
    type: "register",
    label: "Register FID",
    description: "Register a new Farcaster ID for this contract",
    requiredPermission: "owner",
    group: "ownership",
  },
  {
    type: "prepareReceive",
    label: "Prepare to Receive",
    description: "Prepare contract to receive an existing FID",
    requiredPermission: "owner",
    group: "ownership",
  },
  {
    type: "transferToContract",
    label: "Transfer FID to Contract",
    description: "Transfer FID from your wallet to this contract",
    requiredPermission: "owner",
    group: "ownership",
  },
  {
    type: "transferToWallet",
    label: "Transfer to My Wallet",
    description: "Transfer FID from contract to your wallet",
    requiredPermission: "owner",
    group: "ownership",
  },
  {
    type: "transferFid",
    label: "Transfer FID",
    description: "Transfer FID to any address",
    requiredPermission: "owner",
    group: "ownership",
  },
  // Account settings group
  {
    type: "changeRecovery",
    label: "Change Recovery",
    description: "Update the recovery address",
    requiredPermission: "owner",
    group: "account",
  },
  {
    type: "changeUsername",
    label: "Change Username",
    description: "Change the @username (requires FID in wallet)",
    requiredPermission: "owner",
    group: "account",
  },
];
