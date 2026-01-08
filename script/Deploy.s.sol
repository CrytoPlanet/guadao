// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Script, console} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {MerkleAirdrop} from "../contracts/MerkleAirdrop.sol";
import {UniversalAirdrop} from "../contracts/UniversalAirdrop.sol";
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

        // 1. 部署 GUAToken
        GUAToken guaToken;
        {
            GUAToken guaTokenImpl = new GUAToken();
            console.log("GUAToken Implementation deployed at:", address(guaTokenImpl));

            // 注意：初始化时先将 Admin 设为 deployer，以便后续授予 Airdrop MINTER_ROLE
            bytes memory guaTokenData = abi.encodeCall(GUAToken.initialize, (deployer));
            ERC1967Proxy guaTokenProxy = new ERC1967Proxy(address(guaTokenImpl), guaTokenData);
            guaToken = GUAToken(address(guaTokenProxy));
            console.log("GUAToken Proxy deployed at:", address(guaToken));
        }

        // 3. 部署 MerkleAirdrop
        MerkleAirdrop merkleAirdrop;
        {
            MerkleAirdrop merkleAirdropImpl = new MerkleAirdrop();
            console.log("MerkleAirdrop Implementation deployed at:", address(merkleAirdropImpl));

            bytes memory airdropData = abi.encodeCall(MerkleAirdrop.initialize, (address(guaToken), owner));
            ERC1967Proxy merkleAirdropProxy = new ERC1967Proxy(address(merkleAirdropImpl), airdropData);
            merkleAirdrop = MerkleAirdrop(address(merkleAirdropProxy));
            console.log("MerkleAirdrop Proxy deployed at:", address(merkleAirdrop));
        }

        // 5. 授予 MerkleAirdrop MINTER_ROLE
        guaToken.grantRole(keccak256("MINTER_ROLE"), address(merkleAirdrop));
        console.log("Granted MINTER_ROLE to MerkleAirdrop");

        // 6. 部署 UniversalAirdrop
        UniversalAirdrop universalAirdrop;
        {
            UniversalAirdrop universalAirdropImpl = new UniversalAirdrop();
            console.log("UniversalAirdrop Implementation deployed at:", address(universalAirdropImpl));

            // claimAmount: 1000 GUA, maxSupply: 1,000,000 GUA
            bytes memory universalData =
                abi.encodeCall(UniversalAirdrop.initialize, (address(guaToken), owner, 1000 * 1e18, 1000000 * 1e18));
            ERC1967Proxy universalAirdropProxy = new ERC1967Proxy(address(universalAirdropImpl), universalData);
            universalAirdrop = UniversalAirdrop(address(universalAirdropProxy));
            console.log("UniversalAirdrop Proxy deployed at:", address(universalAirdrop));
        }

        // 8. 授予 UniversalAirdrop MINTER_ROLE
        guaToken.grantRole(keccak256("MINTER_ROLE"), address(universalAirdrop));
        console.log("Granted MINTER_ROLE to UniversalAirdrop");

        // 6. 转移 GUAToken 的 Admin 权限给最终 Owner
        if (owner != deployer) {
            guaToken.grantRole(0x00, owner);
            guaToken.renounceRole(0x00, deployer);
            console.log("Transferred GUAToken Admin to:", owner);
        }

        // 9. 部署 TopicBountyEscrow
        TopicBountyEscrow escrow;
        {
            TopicBountyEscrow escrowImpl = new TopicBountyEscrow();
            console.log("TopicBountyEscrow Implementation deployed at:", address(escrowImpl));

            bytes memory escrowData = abi.encodeCall(TopicBountyEscrow.initialize, (address(guaToken), owner, treasury));
            ERC1967Proxy escrowProxy = new ERC1967Proxy(address(escrowImpl), escrowData);
            escrow = TopicBountyEscrow(address(escrowProxy));
            console.log("TopicBountyEscrow Proxy deployed at:", address(escrow));
        }

        // 11. 提示：需要设置 Merkle root
        console.log("Next steps:");
        console.log("1. Generate Merkle tree and root (off-chain)");
        console.log("2. Call merkleAirdrop.setMerkleRoot(root)");
        console.log("3. Users can start claiming");
        console.log("Owner:", owner);
        console.log("Treasury:", treasury);

        vm.stopBroadcast();
    }
}
