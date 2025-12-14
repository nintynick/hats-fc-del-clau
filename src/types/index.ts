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
  | "changeRecovery"
  | "prepareReceive";

export interface ActionConfig {
  type: ActionType;
  label: string;
  description: string;
  requiredPermission: Permission;
}

export const ACTIONS: ActionConfig[] = [
  {
    type: "register",
    label: "Register FID",
    description: "Register a new Farcaster ID for this contract",
    requiredPermission: "owner",
  },
  {
    type: "addKey",
    label: "Add Key",
    description: "Add a signer key to enable casting",
    requiredPermission: "caster",
  },
  {
    type: "removeKey",
    label: "Remove Key",
    description: "Remove a signer key",
    requiredPermission: "owner",
  },
  {
    type: "transferFid",
    label: "Transfer FID",
    description: "Transfer FID ownership to another address",
    requiredPermission: "owner",
  },
  {
    type: "changeRecovery",
    label: "Change Recovery",
    description: "Update the recovery address",
    requiredPermission: "owner",
  },
  {
    type: "prepareReceive",
    label: "Prepare to Receive",
    description: "Prepare contract to receive an existing FID",
    requiredPermission: "owner",
  },
];
