#!/bin/bash

# Deploy HatsFarcasterDelegator for testing
#
# Prerequisites:
# 1. Install foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup
# 2. Set your private key: export PRIVATE_KEY=0x...
# 3. Have ETH on Optimism for gas
#
# Contract Addresses (Optimism Mainnet):
HATS="0x3bc1A0Ad72417f2d411118085256fC53CBdDd137"
HATS_MODULE_FACTORY="0x0a3f85fa597B6a967271286aA0724811acDF5CD9"
HATS_FARCASTER_DELEGATOR_IMPL="0xa947334c33dadca4bcbb396395ecfd66601bb38c"

# Farcaster Protocol Contracts
ID_GATEWAY="0x00000000Fc25870C6eD6b6c7E41Fb078b7656f69"
ID_REGISTRY="0x00000000Fc6c5F01Fc30151999387Bb99A9f489b"
KEY_GATEWAY="0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B"
KEY_REGISTRY="0x00000000Fc1237824fb747aBDE0FF18990E59b7e"
SIGNED_KEY_REQUEST_VALIDATOR="0x00000000FC700472606ED4fA22623Acf62c60553"

RPC_URL="https://mainnet.optimism.io"

# Final owner address (Farcaster wallet) - will receive top hat at the end
FINAL_OWNER_ADDRESS="0x3D3233E8526486C1D0713780003B15d1654c9aa0"

echo "=== HatsFarcasterDelegator Deployment ==="
echo ""

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "ERROR: Please set PRIVATE_KEY environment variable"
    echo "export PRIVATE_KEY=0x..."
    exit 1
fi

# Get deployer address from private key
DEPLOYER_ADDRESS=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Deployer Address: $DEPLOYER_ADDRESS"
echo "Final Owner Address: $FINAL_OWNER_ADDRESS"
echo ""

echo "Step 1: Creating a new Hat Tree (Top Hat for deployer)..."
# mintTopHat(address _target, string _details, string _imageURI) returns (uint256 topHatId)
TOP_HAT_RESULT=$(cast send $HATS "mintTopHat(address,string,string)" \
    $DEPLOYER_ADDRESS \
    "Farcaster Delegator" \
    "" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json 2>&1)

if [ $? -ne 0 ]; then
    echo "Failed to mint top hat: $TOP_HAT_RESULT"
    exit 1
fi

TX_HASH=$(echo $TOP_HAT_RESULT | jq -r '.transactionHash')
echo "Top Hat TX: $TX_HASH"

# Get the top hat ID from logs - it's in the data field, first 32 bytes
TOP_HAT_ID=$(cast receipt $TX_HASH --rpc-url $RPC_URL --json | jq -r '.logs[0].data' | cut -c1-66)
echo "Top Hat ID: $TOP_HAT_ID"

echo ""
echo "Step 2: Creating Owner Hat (child of Top Hat)..."
# createHat(uint256 _admin, string _details, uint32 _maxSupply, address _eligibility, address _toggle, bool _mutable, string _imageURI) returns (uint256 hatId)
OWNER_HAT_RESULT=$(cast send $HATS "createHat(uint256,string,uint32,address,address,bool,string)" \
    $TOP_HAT_ID \
    "Delegator Owner" \
    2 \
    "0x0000000000000000000000000000000000004A75" \
    "0x0000000000000000000000000000000000004A75" \
    true \
    "" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json 2>&1)

if [ $? -ne 0 ]; then
    echo "Failed to create owner hat: $OWNER_HAT_RESULT"
    exit 1
fi

TX_HASH=$(echo $OWNER_HAT_RESULT | jq -r '.transactionHash')
echo "Owner Hat TX: $TX_HASH"
OWNER_HAT_ID=$(cast receipt $TX_HASH --rpc-url $RPC_URL --json | jq -r '.logs[0].data' | cut -c1-66)
echo "Owner Hat ID: $OWNER_HAT_ID"

echo ""
echo "Step 3: Creating Caster Hat (child of Owner Hat)..."
CASTER_HAT_RESULT=$(cast send $HATS "createHat(uint256,string,uint32,address,address,bool,string)" \
    $OWNER_HAT_ID \
    "Delegator Caster" \
    100 \
    "0x0000000000000000000000000000000000004A75" \
    "0x0000000000000000000000000000000000004A75" \
    true \
    "" \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json 2>&1)

if [ $? -ne 0 ]; then
    echo "Failed to create caster hat: $CASTER_HAT_RESULT"
    exit 1
fi

TX_HASH=$(echo $CASTER_HAT_RESULT | jq -r '.transactionHash')
echo "Caster Hat TX: $TX_HASH"
CASTER_HAT_ID=$(cast receipt $TX_HASH --rpc-url $RPC_URL --json | jq -r '.logs[0].data' | cut -c1-66)
echo "Caster Hat ID: $CASTER_HAT_ID"

echo ""
echo "Step 4: Minting Owner Hat to final owner..."
cast send $HATS "mintHat(uint256,address)" \
    $OWNER_HAT_ID \
    $FINAL_OWNER_ADDRESS \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

echo ""
echo "Step 5: Deploying HatsFarcasterDelegator via Factory..."

# Encode immutable args: ownerHat (uint256) + idGateway + idRegistry + keyGateway + keyRegistry + signedKeyRequestValidator
OTHER_ARGS=$(cast abi-encode "f(uint256,address,address,address,address,address)" \
    $OWNER_HAT_ID \
    $ID_GATEWAY \
    $ID_REGISTRY \
    $KEY_GATEWAY \
    $KEY_REGISTRY \
    $SIGNED_KEY_REQUEST_VALIDATOR)

# Remove 0x prefix for concatenation
OTHER_ARGS=${OTHER_ARGS:2}

# createHatsModule(address _implementation, uint256 _hatId, bytes _otherImmutableArgs, bytes _initData, uint256 _saltNonce)
DELEGATOR_RESULT=$(cast send $HATS_MODULE_FACTORY "createHatsModule(address,uint256,bytes,bytes,uint256)" \
    $HATS_FARCASTER_DELEGATOR_IMPL \
    $CASTER_HAT_ID \
    "0x${OTHER_ARGS}" \
    "0x" \
    $(date +%s) \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --json 2>&1)

if [ $? -ne 0 ]; then
    echo "Failed to deploy delegator: $DELEGATOR_RESULT"
    exit 1
fi

TX_HASH=$(echo $DELEGATOR_RESULT | jq -r '.transactionHash')
echo "Delegator Deployment TX: $TX_HASH"

# Get the deployed address from the HatsModuleFactory_ModuleDeployed event
DELEGATOR_ADDRESS=$(cast receipt $TX_HASH --rpc-url $RPC_URL --json | jq -r '.logs[-1].topics[1]' | cast --to-address)

echo ""
echo "Step 6: Transferring Top Hat to final owner..."
cast send $HATS "transferHat(uint256,address,address)" \
    $TOP_HAT_ID \
    $DEPLOYER_ADDRESS \
    $FINAL_OWNER_ADDRESS \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo ""
echo "Top Hat ID:      $TOP_HAT_ID"
echo "Owner Hat ID:    $OWNER_HAT_ID"
echo "Caster Hat ID:   $CASTER_HAT_ID"
echo "Delegator:       $DELEGATOR_ADDRESS"
echo ""
echo "Tree Structure:"
echo "  Top Hat (owned by $FINAL_OWNER_ADDRESS)"
echo "    └── Owner Hat (worn by $FINAL_OWNER_ADDRESS)"
echo "        └── Caster Hat (can be minted by Owner Hat wearer)"
echo ""
echo "Test your miniapp at:"
echo "https://hats-fc-del-clau.vercel.app?contract=$DELEGATOR_ADDRESS"
