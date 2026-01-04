// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {MerkleAirdrop} from "../contracts/MerkleAirdrop.sol";

/**
 * @title Deploy
 * @dev 部署脚本 - 用于部署 GUA Token 和 MerkleAirdrop 合约
 * @notice 使用方式: forge script script/Deploy.s.sol:Deploy --rpc-url <RPC_URL> --broadcast --verify
 */
contract Deploy is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 GUA Token
        GUAToken guaToken = new GUAToken();
        console.log("GUAToken deployed at:", address(guaToken));

        // 2. 部署 MerkleAirdrop
        MerkleAirdrop merkleAirdrop = new MerkleAirdrop(address(guaToken), deployer);
        console.log("MerkleAirdrop deployed at:", address(merkleAirdrop));

        // 3. 将 GUAToken 的 owner 转移给 MerkleAirdrop
        guaToken.transferOwnership(address(merkleAirdrop));
        console.log("GUAToken ownership transferred to MerkleAirdrop");

        // 4. 提示：需要设置 Merkle root
        console.log("Next steps:");
        console.log("1. Generate Merkle tree and root (off-chain)");
        console.log("2. Call merkleAirdrop.setMerkleRoot(root)");
        console.log("3. Users can start claiming");

        vm.stopBroadcast();
    }
}

