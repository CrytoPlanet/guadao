// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {GUAGovernor} from "../contracts/GUAGovernor.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract DeployBaseSepoliaGov is Script {
    // Base Sepolia Addresses
    address constant TOKEN_PROXY = 0x13ce0501266fDfD25FdA8beFE8A92815D1a5Af08;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address safeOwner = vm.envOr("OWNER_ADDRESS", deployer); // Gnosis Safe

        vm.startBroadcast(deployerPrivateKey);

        console.log("--- Deploying Base Sepolia Governance ---");
        console.log("Deployer:", deployer);
        console.log("SafeOwner:", safeOwner);

        // 1. Deploy GUAToken Implementation
        GUAToken tokenImpl = new GUAToken();
        console.log("GUAToken Implementation:", address(tokenImpl));

        // 2. Deploy Timelock
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0); // Anyone can execute

        TimelockController timelock = new TimelockController(
            2 days, // minDelay
            proposers,
            executors,
            deployer // admin (temporary)
        );
        console.log("TimelockController:", address(timelock));

        // 3. Deploy Governor
        GUAGovernor governor = new GUAGovernor(IVotes(TOKEN_PROXY), timelock);
        console.log("GUAGovernor:", address(governor));

        // 4. Setup Roles
        bytes32 PROPOSER_ROLE = timelock.PROPOSER_ROLE();
        bytes32 EXECUTOR_ROLE = timelock.EXECUTOR_ROLE();
        bytes32 CANCELLER_ROLE = timelock.CANCELLER_ROLE();
        bytes32 DEFAULT_ADMIN_ROLE = timelock.DEFAULT_ADMIN_ROLE();

        timelock.grantRole(PROPOSER_ROLE, address(governor));
        timelock.grantRole(EXECUTOR_ROLE, address(governor));
        timelock.grantRole(CANCELLER_ROLE, safeOwner); // Grant Safe cancel rights
        console.log("Granted roles to Governor and Safe");

        // Renounce Admin
        timelock.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        console.log("Renounced Timelock Admin");

        vm.stopBroadcast();

        // 5. Generate Safe Calldata for Token Upgrade
        string memory outputDir = "safe-calldata";
        vm.createDir(outputDir, true);

        bytes memory upgradeData = abi.encodeCall(GUAToken.initializeV2, ());
        bytes memory upgradeCall = abi.encodeCall(UUPSUpgradeable.upgradeToAndCall, (address(tokenImpl), upgradeData));

        string memory json = string.concat(
            '{"to":"',
            vm.toString(TOKEN_PROXY),
            '",',
            '"data":"',
            vm.toString(upgradeCall),
            '",',
            '"description":"Upgrade GUAToken to V2 (Enable Votes)"}'
        );
        vm.writeFile(string.concat(outputDir, "/upgrade_token_v2.json"), json);

        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("Timelock:", address(timelock));
        console.log("Governor:", address(governor));
        console.log("Check safe-calldata-gov/upgrade_token_v2.json for upgrade transaction.");
        console.log("");
    }
}
