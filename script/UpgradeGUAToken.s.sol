// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {GUATokenV2} from "../contracts/GUATokenV2.sol";

/**
 * @title UpgradeGUAToken
 * @dev 升级 GUAToken 到 V2 (添加 ERC20Votes 支持)
 * @notice 使用方式: forge script script/UpgradeGUAToken.s.sol:UpgradeGUAToken --rpc-url <RPC_URL> --broadcast --verify
 *
 * 前提条件：
 * 1. GUAToken V1 已部署
 * 2. 调用者拥有 DEFAULT_ADMIN_ROLE
 *
 * 环境变量：
 * - PRIVATE_KEY: 管理员私钥
 * - GUA_TOKEN_PROXY: GUA Token 代理地址
 */
contract UpgradeGUAToken is Script {
    function setUp() public {}

    function run() public {
        uint256 adminPrivateKey = vm.envUint("PRIVATE_KEY");
        address guaTokenProxy = vm.envAddress("GUA_TOKEN_PROXY");

        vm.startBroadcast(adminPrivateKey);

        // 1. 部署新的 V2 实现
        GUATokenV2 newImpl = new GUATokenV2();
        console.log("GUATokenV2 Implementation deployed at:", address(newImpl));

        // 2. 升级代理到新实现
        // 注意：这里使用 upgradeToAndCall 同时调用 initializeV2
        GUATokenV2 token = GUATokenV2(guaTokenProxy);

        // 升级并初始化 V2
        bytes memory initData = abi.encodeCall(GUATokenV2.initializeV2, ());
        token.upgradeToAndCall(address(newImpl), initData);
        console.log("Upgraded GUAToken to V2");

        // 3. 验证升级成功
        console.log("");
        console.log("=== Upgrade Complete ===");
        console.log("Proxy address:", guaTokenProxy);
        console.log("New implementation:", address(newImpl));
        console.log("");
        console.log("Users can now delegate their voting power:");
        console.log("  token.delegate(yourAddress)");

        vm.stopBroadcast();
    }
}
