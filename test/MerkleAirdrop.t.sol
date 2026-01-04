// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Test} from "forge-std/Test.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {GUAToken} from "../contracts/GUAToken.sol";
import {MerkleAirdrop} from "../contracts/MerkleAirdrop.sol";

contract MerkleAirdropTest is Test {
    GUAToken public guaToken;
    MerkleAirdrop public merkleAirdrop;

    address public owner;
    address public user1;
    address public user2;
    address public user3;
    address public nonOwner;

    // 测试数据
    address[] public addresses;
    uint256[] public amounts;
    bytes32 public merkleRoot;

    event MerkleRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot);
    event Claimed(address indexed to, uint256 amount);

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);
        nonOwner = address(0x999);

        // 部署 GUAToken
        guaToken = new GUAToken();

        // 部署 MerkleAirdrop
        merkleAirdrop = new MerkleAirdrop(address(guaToken), owner);

        // 将 GUAToken 的 owner 转移给 MerkleAirdrop
        guaToken.transferOwnership(address(merkleAirdrop));

        // 准备测试数据（用于多节点测试）
        addresses = new address[](3);
        amounts = new uint256[](3);

        addresses[0] = user1;
        amounts[0] = 1000 * 10 ** 18;

        addresses[1] = user2;
        amounts[1] = 2000 * 10 ** 18;

        addresses[2] = user3;
        amounts[2] = 1500 * 10 ** 18;

        // 使用单节点 root 进行基础测试（更可靠）
        // 对于单节点，root = leaf，proof 为空
        bytes32 leaf1 = getLeaf(user1, amounts[0]);
        merkleRoot = leaf1;

        // 设置 root
        merkleAirdrop.setMerkleRoot(merkleRoot);
    }

    // ============ 辅助函数：生成 Merkle Root 和 Proof ============

    /**
     * @dev 生成单个 leaf 的 root（用于单节点测试）
     * @notice 对于单节点，root = leaf，proof 为空数组
     */
    function getLeaf(address user, uint256 amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, amount));
    }

    /**
     * @dev 生成两个节点的 Merkle tree
     * @notice 用于测试多节点场景
     */
    function getTwoNodeRoot(bytes32 leaf1, bytes32 leaf2) internal pure returns (bytes32) {
        bytes32 left = leaf1 < leaf2 ? leaf1 : leaf2;
        bytes32 right = leaf1 < leaf2 ? leaf2 : leaf1;
        return keccak256(abi.encodePacked(left, right));
    }

    /**
     * @dev 生成两个节点的 proof
     */
    function getTwoNodeProof(bytes32 leaf, bytes32 otherLeaf) internal pure returns (bytes32[] memory) {
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = otherLeaf;
        return proof;
    }

    // ============ 测试：Root 管理 ============

    function test_OwnerCanSetMerkleRoot() public {
        bytes32 newRoot = keccak256("new root");

        vm.expectEmit(true, true, false, false);
        emit MerkleRootUpdated(merkleRoot, newRoot);

        merkleAirdrop.setMerkleRoot(newRoot);

        assertEq(merkleAirdrop.merkleRoot(), newRoot);
    }

    function test_NonOwnerCannotSetMerkleRoot() public {
        bytes32 newRoot = keccak256("new root");

        vm.prank(nonOwner);
        vm.expectRevert();
        merkleAirdrop.setMerkleRoot(newRoot);

        assertEq(merkleAirdrop.merkleRoot(), merkleRoot);
    }

    // ============ 测试：成功领取 ============

    function test_ClaimSuccess() public {
        uint256 amount = amounts[0];

        // 对于单节点 tree，root = leaf，proof 为空数组
        bytes32 leaf = getLeaf(user1, amount);
        bytes32 singleRoot = leaf;
        merkleAirdrop.setMerkleRoot(singleRoot);

        bytes32[] memory emptyProof = new bytes32[](0);

        vm.expectEmit(true, false, false, false);
        emit Claimed(user1, amount);

        merkleAirdrop.claim(user1, amount, emptyProof);

        assertEq(guaToken.balanceOf(user1), amount);
        assertTrue(merkleAirdrop.claimed(user1));
        assertEq(guaToken.totalSupply(), amount);
    }

    function test_ClaimSuccessWithTwoNodes() public {
        // 测试两个节点的 Merkle tree
        bytes32 leaf1 = getLeaf(user1, amounts[0]);
        bytes32 leaf2 = getLeaf(user2, amounts[1]);
        bytes32 root = getTwoNodeRoot(leaf1, leaf2);

        merkleAirdrop.setMerkleRoot(root);

        // user1 领取
        bytes32[] memory proof1 = getTwoNodeProof(leaf1, leaf2);
        merkleAirdrop.claim(user1, amounts[0], proof1);

        assertEq(guaToken.balanceOf(user1), amounts[0]);
        assertTrue(merkleAirdrop.claimed(user1));

        // user2 领取
        bytes32[] memory proof2 = getTwoNodeProof(leaf2, leaf1);
        merkleAirdrop.claim(user2, amounts[1], proof2);

        assertEq(guaToken.balanceOf(user2), amounts[1]);
        assertTrue(merkleAirdrop.claimed(user2));
        assertEq(guaToken.totalSupply(), amounts[0] + amounts[1]);
    }

    // ============ 测试：防重复领取 ============

    function test_DoubleClaimReverts() public {
        uint256 amount = amounts[0];
        bytes32 leaf = getLeaf(user1, amount);
        bytes32 singleRoot = leaf;
        merkleAirdrop.setMerkleRoot(singleRoot);

        bytes32[] memory emptyProof = new bytes32[](0);

        // 第一次领取成功
        merkleAirdrop.claim(user1, amount, emptyProof);
        assertEq(guaToken.balanceOf(user1), amount);

        // 第二次领取应该 revert
        vm.expectRevert("MerkleAirdrop: already claimed");
        merkleAirdrop.claim(user1, amount, emptyProof);

        // 余额不应该增加
        assertEq(guaToken.balanceOf(user1), amount);
    }

    // ============ 测试：错误 proof ============

    function test_InvalidProofReverts() public {
        uint256 amount = amounts[0];
        bytes32 leaf = getLeaf(user1, amount);
        bytes32 singleRoot = leaf;
        merkleAirdrop.setMerkleRoot(singleRoot);

        bytes32[] memory invalidProof = new bytes32[](1);
        invalidProof[0] = keccak256("invalid");

        vm.expectRevert("MerkleAirdrop: invalid proof");
        merkleAirdrop.claim(user1, amount, invalidProof);
    }

    function test_InvalidAmountReverts() public {
        uint256 correctAmount = amounts[0];
        uint256 wrongAmount = correctAmount + 1;
        bytes32 leaf = getLeaf(user1, correctAmount);
        bytes32 singleRoot = leaf;
        merkleAirdrop.setMerkleRoot(singleRoot);

        bytes32[] memory emptyProof = new bytes32[](0);

        vm.expectRevert("MerkleAirdrop: invalid proof");
        merkleAirdrop.claim(user1, wrongAmount, emptyProof);
    }

    function test_InvalidAddressReverts() public {
        uint256 amount = amounts[0];
        bytes32 leaf = getLeaf(user1, amount);
        bytes32 singleRoot = leaf;
        merkleAirdrop.setMerkleRoot(singleRoot);

        bytes32[] memory emptyProof = new bytes32[](0);

        vm.expectRevert("MerkleAirdrop: invalid proof");
        merkleAirdrop.claim(nonOwner, amount, emptyProof);
    }

    // ============ 测试：Root 更新 ============

    function test_RootUpdateAllowsNewClaims() public {
        // 第一个 root：user1 可以领取
        uint256 amount1 = amounts[0];
        bytes32 leaf1 = getLeaf(user1, amount1);
        bytes32 root1 = leaf1;
        merkleAirdrop.setMerkleRoot(root1);

        bytes32[] memory emptyProof = new bytes32[](0);
        merkleAirdrop.claim(user1, amount1, emptyProof);
        assertEq(guaToken.balanceOf(user1), amount1);
        assertTrue(merkleAirdrop.claimed(user1));

        // 更新 root：user2 可以领取（但 user1 已领取，不能重复）
        uint256 amount2 = amounts[1];
        bytes32 leaf2 = getLeaf(user2, amount2);
        bytes32 root2 = leaf2;
        merkleAirdrop.setMerkleRoot(root2);

        merkleAirdrop.claim(user2, amount2, emptyProof);

        assertEq(guaToken.balanceOf(user1), amount1);
        assertEq(guaToken.balanceOf(user2), amount2);
        assertTrue(merkleAirdrop.claimed(user1));
        assertTrue(merkleAirdrop.claimed(user2));
        assertEq(guaToken.totalSupply(), amount1 + amount2);
    }

    function test_OldRootProofInvalidAfterUpdate() public {
        // 设置第一个 root
        uint256 amount = amounts[0];
        bytes32 leaf = getLeaf(user1, amount);
        bytes32 root1 = leaf;
        merkleAirdrop.setMerkleRoot(root1);

        // 更新 root（不同的 root）
        bytes32 root2 = keccak256("new root");
        merkleAirdrop.setMerkleRoot(root2);

        // 旧 root 的 proof 应该失效
        bytes32[] memory emptyProof = new bytes32[](0);
        vm.expectRevert("MerkleAirdrop: invalid proof");
        merkleAirdrop.claim(user1, amount, emptyProof);
    }

    function test_AlreadyClaimedCannotClaimAgainEvenWithNewRoot() public {
        // user1 在第一个 root 领取
        uint256 amount1 = amounts[0];
        bytes32 leaf1 = getLeaf(user1, amount1);
        bytes32 root1 = leaf1;
        merkleAirdrop.setMerkleRoot(root1);

        bytes32[] memory emptyProof = new bytes32[](0);
        merkleAirdrop.claim(user1, amount1, emptyProof);

        // 更新 root，但 user1 已领取，不能再次领取
        uint256 amount2 = amounts[1];
        bytes32 leaf2 = getLeaf(user1, amount2); // 新 root 中 user1 也有额度
        bytes32 root2 = leaf2;
        merkleAirdrop.setMerkleRoot(root2);

        vm.expectRevert("MerkleAirdrop: already claimed");
        merkleAirdrop.claim(user1, amount2, emptyProof);
    }

    // ============ 测试：边界情况 ============

    function test_ClaimWithZeroAmountReverts() public {
        bytes32[] memory proof = new bytes32[](0);

        vm.expectRevert("MerkleAirdrop: invalid amount");
        merkleAirdrop.claim(user1, 0, proof);
    }

    function test_ClaimWithZeroAddressReverts() public {
        uint256 amount = amounts[0];
        bytes32[] memory proof = new bytes32[](0);

        vm.expectRevert("MerkleAirdrop: invalid address");
        merkleAirdrop.claim(address(0), amount, proof);
    }

    function test_ClaimBeforeRootSetReverts() public {
        // 部署新的 airdrop，不设置 root
        MerkleAirdrop newAirdrop = new MerkleAirdrop(address(guaToken), owner);
        // 注意：需要先将 GUAToken owner 转回，再转给新 airdrop
        // 但这里我们测试的是 root 未设置的情况
        // 实际上需要先转移 owner，但为了测试 root 未设置，我们直接测试

        // 创建一个新的 GUAToken 用于测试
        GUAToken newToken = new GUAToken();
        MerkleAirdrop newAirdrop2 = new MerkleAirdrop(address(newToken), owner);
        newToken.transferOwnership(address(newAirdrop2));

        uint256 amount = amounts[0];
        bytes32[] memory proof = new bytes32[](0);

        vm.expectRevert("MerkleAirdrop: root not set");
        newAirdrop2.claim(user1, amount, proof);
    }
}

