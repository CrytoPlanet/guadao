// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {GUAGovernor} from "../contracts/GUAGovernor.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @title DeployGovernor
 * @dev 部署 Governor 和 TimelockController 合约
 * @notice 使用方式: forge script script/DeployGovernor.s.sol:DeployGovernor --rpc-url <RPC_URL> --broadcast --verify
 *
 * 前提条件：
 * 1. GUAToken 已升级到支持 ERC20Votes
 * 2. 配置环境变量：
 *    - PRIVATE_KEY: 部署者私钥
 *    - GUA_TOKEN_ADDRESS: GUA Token 代理地址
 *    - SAFE_ADDRESS: Gnosis Safe 地址 (用作 Canceller)
 */
contract DeployGovernor is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address guaTokenAddress = vm.envAddress("GUA_TOKEN_ADDRESS");
        address safeAddress = vm.envAddress("SAFE_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 TimelockController
        // minDelay: 2 days
        // proposers: 稍后添加 Governor
        // executors: address(0) 表示任何人都可以执行
        // admin: deployer (稍后移除)
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](1);
        executors[0] = address(0); // 任何人都可以执行

        TimelockController timelock = new TimelockController(
            2 days, // minDelay
            proposers, // proposers (空，稍后添加 Governor)
            executors, // executors (任何人)
            deployer // admin (稍后移除)
        );
        console.log("TimelockController deployed at:", address(timelock));

        // 2. 部署 GUAGovernor
        GUAGovernor governor = new GUAGovernor(IVotes(guaTokenAddress), timelock);
        console.log("GUAGovernor deployed at:", address(governor));

        // 3. 配置 Timelock 角色
        // 授予 Governor PROPOSER_ROLE 和 EXECUTOR_ROLE
        bytes32 PROPOSER_ROLE = timelock.PROPOSER_ROLE();
        bytes32 EXECUTOR_ROLE = timelock.EXECUTOR_ROLE();
        bytes32 CANCELLER_ROLE = timelock.CANCELLER_ROLE();
        bytes32 DEFAULT_ADMIN_ROLE = timelock.DEFAULT_ADMIN_ROLE();

        timelock.grantRole(PROPOSER_ROLE, address(governor));
        console.log("Granted PROPOSER_ROLE to Governor");

        timelock.grantRole(EXECUTOR_ROLE, address(governor));
        console.log("Granted EXECUTOR_ROLE to Governor");

        // 授予 Safe CANCELLER_ROLE (紧急取消)
        timelock.grantRole(CANCELLER_ROLE, safeAddress);
        console.log("Granted CANCELLER_ROLE to Safe:", safeAddress);

        // 4. 移除 deployer 的 admin 权限
        timelock.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
        console.log("Renounced admin role from deployer");

        // 5. 提示后续步骤
        console.log("");
        console.log("=== Deployment Complete ===");
        console.log("TimelockController:", address(timelock));
        console.log("GUAGovernor:", address(governor));
        console.log("");
        console.log("Next steps:");
        console.log("1. Register DAO on Tally.xyz with Governor address");
        console.log("2. Update config.json with new addresses");
        console.log("3. Test creating a proposal");

        vm.stopBroadcast();
    }
}
