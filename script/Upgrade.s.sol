// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {UniversalAirdrop} from "../contracts/UniversalAirdrop.sol";
import {TopicBountyEscrow} from "../contracts/TopicBountyEscrow.sol";

contract UpgradeTestnet is Script {
    // Base Sepolia Addresses (From config.json)
    address constant TOKEN_PROXY = 0x13ce0501266fDfD25FdA8beFE8A92815D1a5Af08;
    address constant ESCROW_PROXY = 0x09ffd59910D17AA85598F362fcBeC05B35978319;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address owner = vm.envOr("OWNER_ADDRESS", deployer); // This should be the Safe Address

        console.log("Deployer:", deployer);
        console.log("Safe (Owner):", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy New TopicBountyEscrow Implementation
        console.log("--- Deploying New TopicBountyEscrow Implementation ---");
        TopicBountyEscrow newEscrowImpl = new TopicBountyEscrow();
        console.log("New Escrow Implementation:", address(newEscrowImpl));

        // Generate Payload for Safe: Upgrade Escrow
        bytes memory upgradeCall = abi.encodeCall(UUPSUpgradeable.upgradeToAndCall, (address(newEscrowImpl), ""));
        console.log("--- SAFE TX 1: Upgrade Escrow ---");
        console.log("To:", ESCROW_PROXY);
        console.log("Data (upgradeTo):");
        console.logBytes(upgradeCall);

        // 2. Deploy UniversalAirdrop
        console.log("--- Deploying UniversalAirdrop ---");
        UniversalAirdrop universalAirdrop;
        {
            UniversalAirdrop universalImpl = new UniversalAirdrop();
            console.log("UniversalAirdrop Impl:", address(universalImpl));

            // claimAmount: 10 GUA, maxSupply: 1M GUA
            // Initialize with SAFE as owner
            bytes memory initData =
                abi.encodeCall(UniversalAirdrop.initialize, (TOKEN_PROXY, owner, 10 * 1e18, 1000000 * 1e18));
            ERC1967Proxy proxy = new ERC1967Proxy(address(universalImpl), initData);
            universalAirdrop = UniversalAirdrop(address(proxy));
            console.log("UniversalAirdrop Proxy:", address(universalAirdrop));
        }

        // 3. Generate Payload for Safe: Grant Minter Role
        console.log("--- SAFE TX 2: Grant Minter Role ---");
        bytes memory grantRoleCall =
            abi.encodeCall(AccessControlUpgradeable.grantRole, (keccak256("MINTER_ROLE"), address(universalAirdrop)));
        console.log("To:", TOKEN_PROXY);
        console.log("Data (grantRole):");
        console.logBytes(grantRoleCall);

        vm.stopBroadcast();
    }
}
