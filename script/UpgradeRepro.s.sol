// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import "forge-std/Script.sol";
import "../contracts/GUAToken.sol";

contract UpgradeRepro is Script {
    address constant TOKEN_PROXY = 0x13ce0501266fDfD25FdA8beFE8A92815D1a5Af08;
    address constant SAFE = 0x04CaA97d9C6fFBceBF0edd924f110Df28989FFcB;
    address constant NEW_IMPL = 0x5EbD7e115240Fe56A28D5BC2B197Efe22DaA9C8f;

    function run() public {
        // Fork Base Sepolia
        vm.createSelectFork("https://sepolia.base.org");

        console.log("--- Upgrade Reproduction ---");
        console.log("Proxy:", TOKEN_PROXY);
        console.log("New Impl:", NEW_IMPL);
        console.log("Safe (Admin):", SAFE);

        // Check if Safe really has admin role on the LIVE Proxy
        // We use low-level call to ensure we use the Proxy's logic, not our local V2 interface assumptions
        (bool success, bytes memory returnData) =
            TOKEN_PROXY.staticcall(abi.encodeWithSignature("hasRole(bytes32,address)", 0x00, SAFE));
        require(success, "Check role failed");
        bool hasRole = abi.decode(returnData, (bool));
        console.log("Safe has DEFAULT_ADMIN_ROLE (Live Query):", hasRole);

        // Start Prank as Safe
        vm.startPrank(SAFE);

        // Prepare data using local V2 artifact
        bytes memory initData = abi.encodeCall(GUAToken.initializeV2, ());
        console.log("InitData Selector:");
        console.logBytes(initData);

        // Execute Upgrade
        console.log("Executing upgradeToAndCall...");
        try GUAToken(payable(TOKEN_PROXY)).upgradeToAndCall(NEW_IMPL, initData) {
            console.log("SUCCESS: Upgrade simulation succeeded.");
        } catch Error(string memory reason) {
            console.log("FAILURE: Reverted with reason:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("FAILURE: Reverted with low-level data:");
            console.logBytes(lowLevelData);
        }

        vm.stopPrank();
    }
}
