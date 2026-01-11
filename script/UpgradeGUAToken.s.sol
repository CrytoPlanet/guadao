// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {GUAToken} from "../contracts/GUAToken.sol";

/**
 * @title UpgradeGUAToken
 * @dev 升级 GUAToken 到 V2 (添加 ERC20Votes 支持)
 * @notice 使用方式: forge script script/UpgradeGUAToken.s.sol:UpgradeGUAToken --rpc-url <RPC_URL> --broadcast
 *
 * 前提条件：
 * 1. GUAToken V1 已部署
 * 2. Gnosis Safe 是 DEFAULT_ADMIN_ROLE
 *
 * 环境变量：
 * - PRIVATE_KEY: 部署者私钥 (用于部署新实现，不需要 Admin 权限)
 *
 * 输出：
 * - 部署新的 V2 实现合约
 * - 在 safe-calldata/ 目录生成升级交易 calldata
 */
contract UpgradeGUAToken is Script {
    // Base Sepolia GUA Token Proxy (from config.json)
    address constant TOKEN_PROXY = 0x13ce0501266fDfD25FdA8beFE8A92815D1a5Af08;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Token Proxy:", TOKEN_PROXY);

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署新的 V2 实现
        console.log("--- Deploying GUAToken Implementation ---");
        GUAToken newImpl = new GUAToken();
        console.log("GUAToken Implementation:", address(newImpl));

        vm.stopBroadcast();

        // 2. 生成 Safe 升级 calldata
        bytes memory initData = abi.encodeCall(GUAToken.initializeV2, ());
        bytes memory upgradeCall = abi.encodeCall(UUPSUpgradeable.upgradeToAndCall, (address(newImpl), initData));

        console.log("");
        console.log("--- SAFE TX: Upgrade GUAToken to V2 ---");
        console.log("To:", TOKEN_PROXY);
        console.log("Data (upgradeToAndCall):");
        console.logBytes(upgradeCall);

        // 3. 保存 calldata 到文件
        string memory outputDir = "safe-calldata";
        vm.createDir(outputDir, true);

        string memory txJson = string.concat(
            '{"to":"',
            vm.toString(TOKEN_PROXY),
            '","value":"0","data":"',
            vm.toString(upgradeCall),
            '","description":"Upgrade GUAToken to V2 with ERC20Votes support"}'
        );
        vm.writeFile(string.concat(outputDir, "/upgrade_token_v2.json"), txJson);
        console.log("");
        console.log("Saved: safe-calldata/upgrade_token_v2.json");

        // 4. 打印后续步骤
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Open Gnosis Safe: https://app.safe.global");
        console.log("2. Go to Transaction Builder");
        console.log("3. Paste the calldata from safe-calldata/upgrade_token_v2.json");
        console.log("4. Execute the transaction");
        console.log("");
        console.log("After upgrade, users can delegate voting power:");
        console.log("  token.delegate(yourAddress)");
    }
}
