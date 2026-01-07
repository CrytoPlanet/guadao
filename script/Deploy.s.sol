// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {MerkleAirdrop} from "../contracts/MerkleAirdrop.sol";
import {TopicBountyEscrow} from "../contracts/TopicBountyEscrow.sol";

/**
 * @title Deploy
 * @dev 部署脚本 - 用于部署 GUA Token、MerkleAirdrop 与 TopicBountyEscrow 合约（可升级版本）
 * @notice 使用方式: forge script script/Deploy.s.sol:Deploy --rpc-url <RPC_URL> --broadcast --verify
 */
contract Deploy is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address owner = vm.envOr("OWNER_ADDRESS", deployer);
        address treasury = vm.envOr("TREASURY_ADDRESS", owner);

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 GUAToken Implementation
        GUAToken guaTokenImpl = new GUAToken();
        console.log("GUAToken Implementation deployed at:", address(guaTokenImpl));

        // 2. 部署 GUAToken Proxy
        // 注意：初始化时先将 Admin 设为 deployer，以便后续授予 Airdrop MINTER_ROLE
        bytes memory guaTokenData = abi.encodeCall(GUAToken.initialize, (deployer));
        ERC1967Proxy guaTokenProxy = new ERC1967Proxy(address(guaTokenImpl), guaTokenData);
        GUAToken guaToken = GUAToken(address(guaTokenProxy));
        console.log("GUAToken Proxy deployed at:", address(guaToken));

        // 3. 部署 MerkleAirdrop Implementation
        MerkleAirdrop merkleAirdropImpl = new MerkleAirdrop();
        console.log("MerkleAirdrop Implementation deployed at:", address(merkleAirdropImpl));

        // 4. 部署 MerkleAirdrop Proxy
        bytes memory airdropData = abi.encodeCall(MerkleAirdrop.initialize, (address(guaToken), owner));
        ERC1967Proxy merkleAirdropProxy = new ERC1967Proxy(address(merkleAirdropImpl), airdropData);
        MerkleAirdrop merkleAirdrop = MerkleAirdrop(address(merkleAirdropProxy));
        console.log("MerkleAirdrop Proxy deployed at:", address(merkleAirdrop));

        // 5. 授予 MerkleAirdrop MINTER_ROLE
        // 此时 deployer 拥有 DEFAULT_ADMIN_ROLE，可以授权
        guaToken.grantRole(guaToken.MINTER_ROLE(), address(merkleAirdrop));
        console.log("Granted MINTER_ROLE to MerkleAirdrop");

        // 6. 转移 GUAToken 的 Admin 权限给最终 Owner (如果 owner != deployer)
        if (owner != deployer) {
            guaToken.grantRole(guaToken.DEFAULT_ADMIN_ROLE(), owner);
            guaToken.renounceRole(guaToken.DEFAULT_ADMIN_ROLE(), deployer);
            console.log("Transferred GUAToken Admin to:", owner);
        }

        // 6. 部署 TopicBountyEscrow Implementation
        TopicBountyEscrow escrowImpl = new TopicBountyEscrow();
        console.log("TopicBountyEscrow Implementation deployed at:", address(escrowImpl));

        // 7. 部署 TopicBountyEscrow Proxy
        bytes memory escrowData = abi.encodeCall(TopicBountyEscrow.initialize, (address(guaToken), owner, treasury));
        ERC1967Proxy escrowProxy = new ERC1967Proxy(address(escrowImpl), escrowData);
        TopicBountyEscrow escrow = TopicBountyEscrow(address(escrowProxy));
        console.log("TopicBountyEscrow Proxy deployed at:", address(escrow));

        // 8. 提示：需要设置 Merkle root
        console.log("Next steps:");
        console.log("1. Generate Merkle tree and root (off-chain)");
        console.log("2. Call merkleAirdrop.setMerkleRoot(root)");
        console.log("3. Users can start claiming");
        console.log("Owner:", owner);
        console.log("Treasury:", treasury);

        vm.stopBroadcast();
    }
}
