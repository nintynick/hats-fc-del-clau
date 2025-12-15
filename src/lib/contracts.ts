// HatsFarcasterDelegator ABI - key functions for the miniapp
export const HATS_FARCASTER_DELEGATOR_ABI = [
  // View functions
  {
    name: "ownerHat",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "hatId",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "idRegistry",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "idGateway",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "keyRegistry",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "keyGateway",
    type: "function",
    stateMutability: "pure",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "isValidSigner",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_typehash", type: "bytes32" },
      { name: "_signer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // Write functions
  {
    name: "register",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_recovery", type: "address" },
      { name: "_extraStorage", type: "uint256" },
    ],
    outputs: [
      { name: "fid", type: "uint256" },
      { name: "overpayment", type: "uint256" },
    ],
  },
  {
    name: "addKey",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_keyType", type: "uint32" },
      { name: "_key", type: "bytes" },
      { name: "_metadataType", type: "uint8" },
      { name: "_metadata", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "removeKey",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_key", type: "bytes" }],
    outputs: [],
  },
  {
    name: "transferFid",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_deadline", type: "uint256" },
      { name: "_sig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "changeRecoveryAddress",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_newRecovery", type: "address" }],
    outputs: [],
  },
  {
    name: "prepareToReceive",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_fid", type: "uint256" }],
    outputs: [],
  },
  // Events
  {
    name: "ReadyToReceive",
    type: "event",
    inputs: [{ name: "fid", type: "uint256", indexed: false }],
  },
] as const;

// Hats Protocol ABI - for checking hat wearer and minting
export const HATS_ABI = [
  {
    name: "isWearerOfHat",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_user", type: "address" },
      { name: "_hatId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "viewHat",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_hatId", type: "uint256" }],
    outputs: [
      { name: "details", type: "string" },
      { name: "maxSupply", type: "uint32" },
      { name: "supply", type: "uint32" },
      { name: "eligibility", type: "address" },
      { name: "toggle", type: "address" },
      { name: "imageURI", type: "string" },
      { name: "numChildren", type: "uint16" },
      { name: "mutable_", type: "bool" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "mintHat",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_hatId", type: "uint256" },
      { name: "_wearer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "transferHat",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_hatId", type: "uint256" },
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "isAdminOfHat",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_user", type: "address" },
      { name: "_hatId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getHatLevel",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_hatId", type: "uint256" }],
    outputs: [{ name: "", type: "uint32" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_wearer", type: "address" },
      { name: "_hatId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Farcaster IdRegistry ABI - for checking fid ownership
export const ID_REGISTRY_ABI = [
  {
    name: "idOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "fid", type: "uint256" }],
  },
  {
    name: "custodyOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [{ name: "custody", type: "address" }],
  },
  {
    name: "recoveryOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "fid", type: "uint256" }],
    outputs: [{ name: "recovery", type: "address" }],
  },
] as const;

// Farcaster IdGateway ABI - for registration price
export const ID_GATEWAY_ABI = [
  {
    name: "price",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "extraStorage", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Farcaster KeyRegistry ABI - for viewing keys
export const KEY_REGISTRY_ABI = [
  {
    name: "totalKeys",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "state", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "keysOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "state", type: "uint8" },
      { name: "startIdx", type: "uint256" },
      { name: "batchSize", type: "uint256" },
    ],
    outputs: [
      { name: "keys", type: "bytes[]" },
      { name: "keyTypes", type: "uint8[]" },
    ],
  },
  {
    name: "keyDataOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "key", type: "bytes" },
    ],
    outputs: [
      { name: "state", type: "uint8" },
      { name: "keyType", type: "uint32" },
    ],
  },
] as const;

// EIP-712 Typehashes used by FarcasterDelegator
export const TYPEHASHES = {
  REGISTER: "0x" as const, // IdGateway.REGISTER_TYPEHASH()
  ADD: "0x" as const, // KeyGateway.ADD_TYPEHASH()
  REMOVE: "0x" as const, // KeyRegistry.REMOVE_TYPEHASH()
  TRANSFER: "0x" as const, // IdRegistry.TRANSFER_TYPEHASH()
  CHANGE_RECOVERY_ADDRESS: "0x" as const, // IdRegistry.CHANGE_RECOVERY_ADDRESS_TYPEHASH()
  SIGNED_KEY_REQUEST: "0x" as const, // SignedKeyRequestValidator typehash
};
