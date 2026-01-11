// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {RealityModuleETH} from "@gnosis.pm/zodiac-module-reality/RealityModuleETH.sol";
import {RealitioV3} from "@gnosis.pm/zodiac-module-reality/interfaces/RealitioV3.sol";

// UMA Optimistic Oracle 接口 (简化)
interface IOptimisticOracleV3 {
    function defaultIdentifier() external view returns (bytes32);
}

/**
 * @title DeployOSnap
 * @dev 部署 Zodiac Reality Module 并配置为 oSnap (使用 UMA Oracle)
 */
contract DeployOSnap is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address safeAddress = vm.envAddress("SAFE_ADDRESS");

        address umaOracleAddress = vm.envOr("UMA_ORACLE_ADDRESS", address(0));
        require(umaOracleAddress != address(0), "UMA_ORACLE_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // 部署 RealityModuleETH
        // 参数说明:
        // _owner: Safe Address
        // _avatar: Safe Address
        // _target: Safe Address
        // _oracle: UMA Oracle Address (这里假设 UMA Oracle 兼容 RealitioV3 接口，或者使用 Adapter)
        // timeout: 86400 (24小时，给预言机回答的时间)
        // cooldown: 86400 (24小时，回答后的冷却期)
        // expiration: 0 (默认不因过期失效)
        // bond: 0 (UMA 自带 Bond 机制，这里设为 0)
        // templateId: 0 (UMA 使用的模板 ID，通常为 0 或特定值)
        // arbitrator: UMA DVM Address (通常与 Oracle 相同或关联)

        // 假设 UMA Oracle 同时也作为 Arbitrator (简化配置，实际请查阅 oSnap 文档)
        RealityModuleETH module = new RealityModuleETH(
            safeAddress, // _owner
            safeAddress, // _avatar
            safeAddress, // _target
            RealitioV3(umaOracleAddress), // _oracle
            86400, // timeout
            86400, // cooldown
            0, // expiration
            0, // bond
            0, // templateId
            umaOracleAddress // arbitrator
        );

        console.log("RealityModuleEth deployed at:", address(module));

        // 2. 提示后续操作
        console.log("");
        console.log("=== Setup Instructions ===");
        console.log("1. Go to Gnosis Safe > Apps > Zodiac (or Custom Transaction)");
        console.log("2. Enable Module:", address(module));
        console.log("3. Configure Snapshot Space to use oSnap plugin");
        console.log("   - Module Address:", address(module));
        console.log("   - Oracle Address:", umaOracleAddress);

        vm.stopBroadcast();
    }
}
