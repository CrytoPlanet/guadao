# Implementation Plan - Snapshot Execution Integration

## Options Analysis

### Option A: Custom Realitio (Deprecated)
- **Status**: Realitio v3 not officially on Base.
- **Action**: Deploy custom Realitio instance.
- **Pros**: Full control.
- **Cons**: No external arbitration (centralized to Owner/Safe).

### Option B: oSnap (Recommended)
- **Status**: UMA Oracle available on Base.
- **Action**: Use oSnap (Zodiac Reality + UMA Oracle).
- **Pros**: Decentralized arbitration via UMA DVM, industry standard.
- **Cons**: Need to locate UMA Base address.

## Goal Description
Integrate **oSnap** (Zodiac Reality + UMA) for robust off-chain voting execution.

## User Review Required
> [!TIP]  
> **oSnap Selection**: We recommend oSnap for better security and maintenance. This plan assumes approval to switch to oSnap.

## Proposed Changes

### Dependencies
- Install `@gnosis.pm/zodiac` (Reality Module)
- (No need for `@realitio/realitio-contracts` if using UMA)

### Contracts
#### [NEW] [DeployOSnap.s.sol](file:///c:/Users/Lemon/Documents/GitHub/guadao/script/DeployOSnap.s.sol)
- Deploys `RealityModuleEth` (Zodiac module)
- Configures it to use UMA Optimistic Oracle V3 on Base
- Sets up trust with Snapshot Space

### Documentation
#### [NEW] [OSnap_Setup.md](file:///c:/Users/Lemon/Documents/GitHub/guadao/docs/OSnap_Setup.md)
- Configuration guide for Snapshot Space (enabling oSnap plugin)

## Verification Plan
- `forge test`: Mock UMA oracle responses to test module execution.
