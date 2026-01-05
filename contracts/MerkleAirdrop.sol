// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {GUAToken} from "./GUAToken.sol";

/**
 * @title MerkleAirdrop
 * @dev 基于 Merkle proof 的代币空投合约
 * @notice 用户可以通过提供有效的 Merkle proof 领取 GUA Token
 */
contract MerkleAirdrop is Ownable {
    /// @dev GUA Token 合约地址
    GUAToken public immutable guaToken;

    /// @dev 当前 Merkle root
    bytes32 public merkleRoot;

    /// @dev 记录已领取的地址
    uint256 public epoch;
    mapping(address => uint256) public claimedEpoch;

    /// @dev Root 更新事件
    event MerkleRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot);

    /// @dev 领取事件
    event Claimed(address indexed to, uint256 amount);

    /**
     * @dev 构造函数
     * @param _guaToken GUA Token 合约地址
     * @param _owner 合约所有者（管理员）
     */
    constructor(address _guaToken, address _owner) Ownable(_owner) {
        require(_guaToken != address(0), "MerkleAirdrop: invalid token address");
        require(_owner != address(0), "MerkleAirdrop: invalid owner address");

        guaToken = GUAToken(_guaToken);
    }

    /**
     * @dev 设置 Merkle root（仅管理员）
     * @param _merkleRoot 新的 Merkle root
     * @notice 支持多期空投，通过更新 root 实现
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        bytes32 oldRoot = merkleRoot;
        epoch += 1;
        merkleRoot = _merkleRoot;
        emit MerkleRootUpdated(oldRoot, _merkleRoot);
    }

    /**
     * @dev 领取代币
     * @param to 接收代币的地址
     * @param amount 领取的代币数量
     * @param proof Merkle proof
     * @notice 每个地址只能领取一次，即使 root 更新也无法重复领取
     */
    function claim(address to, uint256 amount, bytes32[] calldata proof) external {
        require(to != address(0), "MerkleAirdrop: invalid address");
        require(amount > 0, "MerkleAirdrop: invalid amount");
        require(merkleRoot != bytes32(0), "MerkleAirdrop: root not set");
        require(claimedEpoch[to] < epoch, "MerkleAirdrop: already claimed");

        // 构建 leaf：keccak256(abi.encodePacked(address, amount))
        bytes32 leaf = keccak256(abi.encodePacked(to, amount));

        // 验证 Merkle proof
        require(MerkleProof.verify(proof, merkleRoot, leaf), "MerkleAirdrop: invalid proof");

        // 标记为已领取
        claimedEpoch[to] = epoch;

        // Mint 代币到用户地址
        guaToken.mint(to, amount);

        // 发出事件
        emit Claimed(to, amount);
    }

    function claimed(address account) external view returns (bool) {
        return epoch > 0 && claimedEpoch[account] == epoch;
    }
}
